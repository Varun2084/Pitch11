#!/usr/bin/env python3
"""PitchXI data build. Standard library only.

  python pipeline/build.py --out web/data            download Cricsheet, build, verify
  python pipeline/build.py --source DIR --demo       build from local zips (tests only)

A failed check exits non-zero, so the deploy job stops and the last good site stays live.
"""
import argparse, csv, hashlib, io, json, re, shutil, statistics, sys, time, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://cricsheet.org/downloads/"
# zip file, competition code, gender, India-only filter
FEEDS = {
    "men": [("ipl_male_json.zip", "IPL", "male", False), ("t20s_male_json.zip", "IND", "male", True)],
    "women": [("wpl_female_json.zip", "WPL", "female", False), ("t20s_female_json.zip", "IND", "female", True)],
}
BOWLER_WICKETS = {"bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"}
NOT_DISMISSED = {"retired hurt", "retired not out"}
TEAM_ALIAS = {
    "Delhi Daredevils": "Delhi Capitals", "Kings XI Punjab": "Punjab Kings",
    "Royal Challengers Bangalore": "Royal Challengers Bengaluru",
    "Rising Pune Supergiants": "Rising Pune Supergiant",
}
VENUE_ALIAS = {
    "Feroz Shah Kotla": "Arun Jaitley Stadium", "Sardar Patel Stadium": "Narendra Modi Stadium",
    "M Chinnaswamy Stadium": "M Chinnaswamy Stadium", "MChinnaswamy Stadium": "M Chinnaswamy Stadium",
    "Punjab Cricket Association Stadium": "Punjab Cricket Association IS Bindra Stadium",
    "Punjab Cricket Association Is Bindra Stadium": "Punjab Cricket Association IS Bindra Stadium",
    "Dr DY Patil Sports Academy": "DY Patil Stadium", "Dr. DY Patil Sports Academy": "DY Patil Stadium",
    "Rajiv Gandhi International Cricket Stadium": "Rajiv Gandhi International Stadium",
}


def team(name):
    return TEAM_ALIAS.get(name, name)


def venue(name):
    v = (name or "Unknown").split(",")[0].strip().replace(".", "")
    return VENUE_ALIAS.get(v, v)


def phase(over):
    return 1 if over < 6 else 2 if over < 15 else 3


def balls_faced(d):
    return 0 if "wides" in d.get("extras", {}) else 1


def legal(d):
    e = d.get("extras", {})
    return 0 if "wides" in e or "noballs" in e else 1


def bowler_runs(d):
    """Runs charged to the bowler: bat runs plus wides and no-balls, never byes, leg-byes or penalties."""
    e = d.get("extras", {})
    return d["runs"]["batter"] + e.get("wides", 0) + e.get("noballs", 0)


def new_bat():
    return [0] * 7  # innings, runs, balls, fours, sixes, dots, outs


def new_bowl():
    return [0] * 6  # innings, legal balls, runs, wickets, dots, boundaries conceded


class Book:
    """Everything aggregated for one gender."""

    def __init__(self):
        self.names, self.last_team, self.last_date = {}, {}, {}
        self.bat, self.bowl = defaultdict(new_bat), defaultdict(new_bowl)  # (pid, comp, year, phase)
        self.seen = set()
        self.apps = defaultdict(set)  # (pid, comp, year) -> match ids
        self.high = defaultdict(int)  # (pid, comp)
        self.vs = defaultdict(lambda: [0, 0, 0, 0, 0, 9999, 0])  # (bat, bowl, comp): balls, runs, outs, dots, bdry, y0, y1
        self.pv = defaultdict(lambda: [0] * 7)  # (pid, comp, venue): inn, runs, balls, outs, legal, conceded, wkts
        self.log = defaultdict(list)  # pid -> innings log
        self.matches, self.venues = [], defaultdict(list)
        self.deliveries = 0
        self.india = set()

    def parse(self, mid, m, comp):
        info = m["info"]
        date = info["dates"][0]
        year = int(date[:4])
        reg = info.get("registry", {}).get("people", {})
        ven = venue(info.get("venue"))
        teams = [team(t) for t in info["teams"]]
        outcome = info.get("outcome", {})
        method = outcome.get("method")
        rec = {"id": mid, "date": date, "comp": comp, "year": year, "teams": teams, "venue": ven,
               "event": info.get("event", {}).get("name", ""), "winner": team(outcome.get("winner") or outcome.get("eliminator") or ""),
               "result": outcome.get("result", ""), "by": outcome.get("by", {}), "method": method or "",
               "stage": str(info.get("event", {}).get("stage", "") or ""), "inn": []}
        for side, players in info.get("players", {}).items():
            for n in players:
                pid = reg.get(n)
                if not pid:
                    continue
                self.apps[(pid, comp, year)].add(mid)
                self.names[pid] = n
                if date >= self.last_date.get(pid, ""):
                    self.last_date[pid] = date
                    self.last_team[pid] = team(side)
                if comp == "IND" and side == "India":
                    self.india.add(pid)
        for idx, inn in enumerate(i for i in m["innings"] if not i.get("super_over")):
            ik = (mid, idx)
            runs = wkts = lb = 0
            pbat, pbowl = defaultdict(lambda: [0, 0, 0]), defaultdict(lambda: [0, 0, 0])
            for ov in inn.get("overs", []):
                ph = phase(ov["over"])
                for d in ov["deliveries"]:
                    self.deliveries += 1
                    bat_id, bowl_id = reg.get(d["batter"]), reg.get(d["bowler"])
                    br, bf = d["runs"]["batter"], balls_faced(d)
                    runs += d["runs"]["total"]
                    lb += legal(d)
                    pbat[bat_id][0] += br
                    pbat[bat_id][1] += bf
                    for p in (ph, 0):
                        r = self.bat[(bat_id, comp, year, p)]
                        if (ik, bat_id, p, "b") not in self.seen:
                            self.seen.add((ik, bat_id, p, "b"))
                            r[0] += 1
                        r[1] += br
                        r[2] += bf
                        r[3] += 1 if br == 4 and not d["runs"].get("non_boundary") else 0
                        r[4] += 1 if br == 6 else 0
                        r[5] += 1 if bf and br == 0 else 0
                        b = self.bowl[(bowl_id, comp, year, p)]
                        if (ik, bowl_id, p, "w") not in self.seen:
                            self.seen.add((ik, bowl_id, p, "w"))
                            b[0] += 1
                        b[1] += legal(d)
                        b[2] += bowler_runs(d)
                        b[4] += 1 if legal(d) and d["runs"]["total"] == 0 else 0
                        b[5] += 1 if br in (4, 6) and not d["runs"].get("non_boundary") else 0
                    pbowl[bowl_id][0] += legal(d)
                    pbowl[bowl_id][1] += bowler_runs(d)
                    v = self.vs[(bat_id, bowl_id, comp)]
                    v[0] += bf
                    v[1] += br
                    v[3] += 1 if bf and br == 0 else 0
                    v[4] += 1 if br in (4, 6) and not d["runs"].get("non_boundary") else 0
                    v[5], v[6] = min(v[5], year), max(v[6], year)
                    for w in d.get("wickets", []):
                        kind = w["kind"]
                        out = reg.get(w["player_out"])
                        if kind not in NOT_DISMISSED:
                            wkts += 1
                            for p in (ph, 0):
                                self.bat[(out, comp, year, p)][6] += 1
                            pbat[out][2] += 1
                        if kind in BOWLER_WICKETS:
                            for p in (ph, 0):
                                self.bowl[(bowl_id, comp, year, p)][3] += 1
                            pbowl[bowl_id][2] += 1
                            if out == bat_id:
                                v[2] += 1
            for pid, (r, b, o) in pbat.items():
                self.high[(pid, comp)] = max(self.high[(pid, comp)], r)
                pv = self.pv[(pid, comp, ven)]
                pv[0] += 1; pv[1] += r; pv[2] += b; pv[3] += o
                self.log[pid].append([date, comp, teams[1] if team(inn["team"]) == teams[0] else teams[0], "bat", r, b, o])
            for pid, (l, r, w) in pbowl.items():
                pv = self.pv[(pid, comp, ven)]
                pv[4] += l; pv[5] += r; pv[6] += w
                self.log[pid].append([date, comp, team(inn["team"]), "bowl", w, r, l])
            target = inn.get("target", {})
            rec["inn"].append({"team": team(inn["team"]), "runs": runs, "wkts": wkts, "balls": lb, "tovers": target.get("overs")})
        self.matches.append(rec)
        short = any(i.get("tovers") and i["tovers"] < 20 for i in rec["inn"])
        if rec["inn"] and not method and not short and rec["result"] != "no result":
            self.venues[(comp, ven)].append(rec)


def norm(s):
    return re.sub(r"[^a-z ]", "", s.lower().replace("-", " ")).strip()


def link_auction(rows, names):
    """Cricsheet stores 'V Kohli'; auctions print 'Virat Kohli'. Link only when exactly one player fits.
    Overrides in data/auction/player_links.csv win. Anything unsure stays unlinked rather than guessed."""
    index = defaultdict(list)
    for pid, n in names.items():
        parts = norm(n).split()
        if parts:
            index[parts[-1]].append((pid, parts[:-1], norm(n)))
    overrides = {}
    path = ROOT / "data/auction/player_links.csv"
    if path.exists():
        overrides = {r["player"]: r["person_id"] for r in csv.DictReader(path.open(encoding="utf-8"))}
    for r in rows:
        p = r["player"]
        if p in overrides:
            r["pid"], r["link"] = overrides[p], "checked"
            continue
        w = norm(p).split()
        hits = [c for c in index.get(w[-1], []) if c[2] == norm(p)]
        if not hits:
            hits = [c for c in index.get(w[-1], []) if c[1] and all(i[0] == w[0][0] for i in c[1][0][:1])]
        r["pid"], r["link"] = (hits[0][0], "name") if len(hits) == 1 else (None, "")


def auction(men, women):
    rows = list(csv.DictReader((ROOT / "data/auction/sold.csv").open(encoding="utf-8")))
    out = []
    for r in rows:
        r["season"] = int(r["season"]); r["price_cr"] = float(r["price_cr"]); r["rtm"] = r["rtm"] == "1"
        r["base_cr"] = float(r["base_cr"]) if r["base_cr"] else None
        out.append(r)
    for lg, bk in (("IPL", men), ("WPL", women)):
        sub = [r for r in out if r["league"] == lg]
        link_auction(sub, bk.names)
        for r in sub:
            b = bk.bat.get((r["pid"], lg, r["season"], 0)); w = bk.bowl.get((r["pid"], lg, r["season"], 0))
            m = len(bk.apps.get((r["pid"], lg, r["season"]), ()))
            r["after"] = {"m": m, "runs": b[1], "balls": b[2], "outs": b[6]} if b else {"m": m}
            if w:
                r["after"].update(legal=w[1], conceded=w[2], wkts=w[3])
    return out, list(csv.DictReader((ROOT / "data/auction/events.csv").open(encoding="utf-8")))


def write(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")


def export(bk, out):
    pids = sorted(bk.names, key=lambda p: bk.names[p])
    ix = {p: i for i, p in enumerate(pids)}
    comps = sorted({c for (_, c, _) in bk.apps})
    players = []
    for p in pids:
        m = defaultdict(int)
        for (q, c, y), s in bk.apps.items():
            if q == p:
                m[c] += len(s)
        players.append({"id": p, "n": bk.names[p], "t": bk.last_team.get(p, ""), "d": bk.last_date.get(p, ""),
                        "m": dict(m), "hs": {c: bk.high[(p, c)] for c in comps if (p, c) in bk.high}, "in": p in bk.india})
    keys = sorted(set(bk.bat) | set(bk.bowl), key=lambda k: (k[1], k[2], k[0] or "", k[3]))
    rows = [[ix[k[0]], k[1], k[2], k[3]] + bk.bat.get(k, new_bat()) + bk.bowl.get(k, new_bowl()) for k in keys if k[0] in ix]
    apps = [[ix[p], c, y, len(s)] for (p, c, y), s in bk.apps.items() if p in ix]
    write(out / "players.json", players)
    write(out / "rows.json", {"rows": rows, "apps": apps})
    by_p = defaultdict(lambda: {"bat": [], "bowl": [], "venues": [], "log": []})
    for (b, w, c), v in bk.vs.items():
        if b in ix and w in ix:
            by_p[b]["bat"].append([c, ix[w]] + v)
            by_p[w]["bowl"].append([c, ix[b]] + v)
    for (p, c, ve), v in bk.pv.items():
        by_p[p]["venues"].append([c, ve] + v)
    for p, lg in bk.log.items():
        by_p[p]["log"] = sorted(lg, key=lambda x: x[0], reverse=True)[:24]
    pdir = out / "p"
    for p in pids:
        write(pdir / f"{p}.json", by_p[p])
    bk.matches.sort(key=lambda r: (r["date"], r["id"]), reverse=True)
    write(out / "matches.json", bk.matches[:60])
    venues = []
    for (c, v), ms in bk.venues.items():
        firsts = [m["inn"][0]["runs"] for m in ms]
        chase = [m for m in ms if len(m["inn"]) > 1 and m["winner"]]
        seasons = defaultdict(list)
        for m in ms:
            seasons[m["year"]].append(m["inn"][0]["runs"])
        venues.append({"v": v, "c": c, "n": len(ms), "med": statistics.median(firsts), "lo": min(firsts), "hi": max(firsts),
                       "cn": len(chase), "cw": sum(m["winner"] == m["inn"][1]["team"] for m in chase),
                       "s": {y: [len(s), statistics.median(s)] for y, s in sorted(seasons.items())}, "last": max(m["date"] for m in ms)})
    write(out / "venues.json", sorted(venues, key=lambda x: -x["n"]))
    return {"comps": comps, "players": len(pids), "matches": len(bk.matches), "deliveries": bk.deliveries,
            "latest": bk.matches[0]["date"] if bk.matches else None, "first": bk.matches[-1]["date"] if bk.matches else None}


def verify(men, women, demo):
    """Integrity checks. Any failure stops the deploy."""
    problems = []
    for label, bk in (("men", men), ("women", women)):
        for (p, c, y, ph), r in bk.bat.items():
            if ph == 0:
                parts = [bk.bat.get((p, c, y, i), new_bat()) for i in (1, 2, 3)]
                if sum(x[1] for x in parts) != r[1] or sum(x[2] for x in parts) != r[2]:
                    problems.append(f"{label}: phase split does not add up for {p} {c} {y}")
        for (p, c, y, ph), r in bk.bowl.items():
            if ph == 0:
                parts = [bk.bowl.get((p, c, y, i), new_bowl()) for i in (1, 2, 3)]
                if sum(x[1] for x in parts) != r[1] or sum(x[3] for x in parts) != r[3]:
                    problems.append(f"{label}: bowling phase split does not add up for {p} {c} {y}")
        ids = [m["id"] for m in bk.matches]
        if len(ids) != len(set(ids)):
            problems.append(f"{label}: duplicate match ids")
    if not demo:
        checks = {"IPL": (men, 1200), "WPL": (women, 60)}
        for c, (bk, need) in checks.items():
            if sum(m["comp"] == c for m in bk.matches) < need:
                problems.append(f"{c}: fewer than {need} matches, source looks truncated")
        kohli = [p for p, n in men.names.items() if n == "V Kohli"]
        r = men.bat.get((kohli[0], "IPL", 2016, 0)) if len(kohli) == 1 else None
        if not r or r[1] != 973 or r[2] != 640:
            problems.append(f"Kohli IPL 2016 reference failed: {r}")
    return problems


def fetch(name, source):
    if source:
        return Path(source, name).read_bytes(), f"local:{name}"
    req = urllib.request.Request(BASE + name, headers={"User-Agent": "PitchXI-data-build"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return r.read(), BASE + name
        except Exception as e:
            print(f"retry {name}: {e}", file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    raise SystemExit(f"could not download {name}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="web/data")
    ap.add_argument("--source")
    ap.add_argument("--demo", action="store_true")
    a = ap.parse_args()
    out = Path(a.out)
    shutil.rmtree(out / "men", ignore_errors=True); shutil.rmtree(out / "women", ignore_errors=True)
    books, sources = {"men": Book(), "women": Book()}, []
    for g, feeds in FEEDS.items():
        seen = set()
        for fn, comp, gender, india in feeds:
            raw, url = fetch(fn, a.source)
            n = 0
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                for name in sorted(x for x in z.namelist() if x.endswith(".json")):
                    m = json.loads(z.read(name))
                    i = m["info"]
                    if i.get("gender") != gender or i.get("match_type") not in ("T20", "IT20"):
                        continue
                    if india and "India" not in i["teams"]:
                        continue
                    mid = name.rsplit("/", 1)[-1][:-5]
                    if mid in seen:
                        continue
                    seen.add(mid)
                    books[g].parse(mid, m, comp)
                    n += 1
            sources.append({"url": url, "sha256": hashlib.sha256(raw).hexdigest(), "matches": n, "comp": comp, "gender": gender})
    problems = verify(books["men"], books["women"], a.demo)
    summary = {g: export(books[g], out / g) for g in books}
    sold, events = auction(books["men"], books["women"])
    write(out / "auction.json", {"sold": sold, "events": events})
    write(out / "meta.json", {"built": datetime.now(timezone.utc).isoformat(timespec="minutes"), "demo": a.demo,
                              "sources": sources, "summary": summary, "checks_failed": problems})
    print(json.dumps(summary, indent=1, ensure_ascii=True))
    if problems:
        print("\n".join(problems[:30]), file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
