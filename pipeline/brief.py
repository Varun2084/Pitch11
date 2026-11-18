#!/usr/bin/env python3
"""RR IPL 2027 auction brief: finisher and seam candidates from the released pool, IPL 2025-26.
Writes web/data/brief_rr.json and prints the tables to the run log."""
import csv, json, re, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
D = Path(sys.argv[1] if len(sys.argv) > 1 else "web/data")
FULL = dict(CSK="Chennai Super Kings", DC="Delhi Capitals", GT="Gujarat Titans", KKR="Kolkata Knight Riders", LSG="Lucknow Super Giants",
            MI="Mumbai Indians", PBKS="Punjab Kings", RR="Rajasthan Royals", RCB="Royal Challengers Bengaluru", SRH="Sunrisers Hyderabad")
YEARS = (2025, 2026)
CONTEXT = {"team": "Rajasthan Royals", "purse_cr": 27.05, "slots": 6, "indian": 3, "overseas": 3, "as_of": "2026-11-17", "auction": "2026-12-16",
           "sources": ["https://www.rajasthanroyals.com/latest-news/ipl-2027-rr-players-retention-list-retained-released",
                       "https://www.wisden.com/series/ipl-2027/cricket-news/ipl-2027-retention-list-full-list-retained-released", "Cricbuzz retention graphics, 17 Nov 2026"]}
OVERSEAS = {"Matthew Short", "Matt Henry", "Zak Foulkes", "Spencer Johnson", "Pathum Nissanka", "Ben Duckett", "Dushmantha Chameera",
            "Mitchell Starc", "Luke Wood", "Blessing Muzarabani", "Matheesha Pathirana", "Mustafizur Rahman", "Rachin Ravindra",
            "Matthew Breetzke", "Anrich Nortje", "Wanindu Hasaranga", "Trent Boult", "Allah Ghazanfar", "Keshav Maharaj", "Lockie Ferguson",
            "Mitch Owen", "Adam Milne", "Kwena Maphaka", "Shimron Hetmyer", "Jacob Bethell", "Travis Head", "Kamindu Mendis", "Gerald Coetzee",
            "Jofra Archer", "Nandre Burger", "Donovan Ferreira", "Dasun Shanaka"}
K = "inn runs balls f4 f6 dots outs binn legal conc wk bdot bb".split()
players = json.loads((D / "men/players.json").read_text(encoding="utf-8"))
rows = json.loads((D / "men/rows.json").read_text(encoding="utf-8"))["rows"]
norm = lambda s: re.sub(r"[^a-z ]", "", s.lower().replace("-", " ")).split()
ALIAS = {"Yudhvir Charak": "Singh", "Aman Rao Perala": "Rao", "Wanindu Hasaranga": "de Silva", "Kamindu Mendis": "Mendis"}
CSNAME = {"Dasun Shanaka": "MD Shanaka", "Vaibhav Sooryavanshi": "V Suryavanshi"}  # checked by hand


def find(name, team=None):
    if name in CSNAME:
        hit = [i for i, p in enumerate(players) if p["n"] == CSNAME[name]]
        return hit[0] if len(hit) == 1 else None
    w = norm(name); last = norm(ALIAS.get(name, w[-1]))[-1]
    c = [i for i, p in enumerate(players) if norm(p["n"]) and norm(p["n"])[-1] == last and p["m"].get("IPL")]
    exact = [i for i in c if norm(players[i]["n"]) == w]
    if len(exact) == 1: return exact[0]
    ini = [i for i in c if norm(players[i]["n"])[0][0] == w[0][0]]
    if len(ini) > 1 and team: ini = [i for i in ini if players[i]["t"] == FULL.get(team)] or ini
    if len(ini) > 1: ini = [i for i in ini if players[i]["d"] >= "2025"] or ini
    return ini[0] if len(ini) == 1 else None


def agg(i, ph):
    s = dict.fromkeys(K, 0)
    for r in rows:
        if (i is None or r[0] == i) and r[1] == "IPL" and r[2] in YEARS and r[3] == ph:
            for k, v in zip(K, r[4:]): s[k] += v
    return s


def bat(s): return {"balls": s["balls"], "runs": s["runs"], "sr": round(100 * s["runs"] / s["balls"], 1) if s["balls"] else None,
                    "bdry": round(100 * (s["f4"] + s["f6"]) / s["balls"], 1) if s["balls"] else None, "outs": s["outs"],
                    "bpd": round(s["balls"] / s["outs"], 1) if s["outs"] else None}
def bowl(s): return {"legal": s["legal"], "econ": round(6 * s["conc"] / s["legal"], 2) if s["legal"] else None, "wk": s["wk"],
                     "dot": round(100 * s["bdot"] / s["legal"], 1) if s["legal"] else None}


def card(name, team=None):
    i = find(name, team)
    if i is None: return {"player": name, "team": team, "linked": False}
    p = players[i]
    return {"player": name, "team": team, "id": p["id"], "cs": p["n"], "linked": True, "overseas": name in OVERSEAS,
            "bat_all": bat(agg(i, 0)), "bat_death": bat(agg(i, 3)), "bowl_all": bowl(agg(i, 0)), "bowl_pp": bowl(agg(i, 1)), "bowl_death": bowl(agg(i, 3))}


league = {"bat_death": bat(agg(None, 3)), "bat_all": bat(agg(None, 0)), "bowl_pp": bowl(agg(None, 1)), "bowl_death": bowl(agg(None, 3))}
pool = [card(r["player"], r["team"]) for r in csv.DictReader((ROOT / "data/auction/released_2027.csv").open(encoding="utf-8"))]
squad = [card(r["player"]) | {"role": r["role"], "price_cr": float(r["price_cr"]), "overseas": r["overseas"] == "1", "how": r["how"]} for r in csv.DictReader((ROOT / "data/auction/rr_squad_2027.csv").open(encoding="utf-8"))]
fin = sorted([c for c in pool if c["linked"] and c["bat_death"]["balls"] >= 30], key=lambda c: -c["bat_death"]["sr"])
seam = sorted([c for c in pool if c["linked"] and c["bowl_death"]["legal"] + c["bowl_pp"]["legal"] >= 90], key=lambda c: (c["bowl_pp"]["econ"] or 99) + (c["bowl_death"]["econ"] or 99))
rr_out = [card(r["player"], "RR") for r in csv.DictReader((ROOT / "data/auction/released_2027.csv").open(encoding="utf-8")) if r["team"] == "RR"]
out = {"context": CONTEXT, "rr_released": rr_out, "years": YEARS, "league": league, "squad": squad, "finishers": fin, "seamers": seam, "unlinked": [c["player"] for c in pool + squad if not c["linked"]]}
(D / "brief_rr.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
print("LEAGUE", json.dumps(league))
print("UNLINKED", out["unlinked"])
print("SQUAD death batting:")
for c in squad:
    if c["linked"]: print(f'  SQ {c["player"]:22} {c["cs"]:18} death {c["bat_death"]}  all {c["bat_all"]}  ppbowl {c["bowl_pp"]} deathbowl {c["bowl_death"]}')
print("FINISHERS (death balls >= 30):")
for c in fin: print(f'  FN {c["player"]:22} {c["team"]:5} {c["cs"]:18} os={c["overseas"]} death {c["bat_death"]} all {c["bat_all"]}')
print("SEAMERS:")
for c in seam: print(f'  SM {c["player"]:22} {c["team"]:5} {c["cs"]:18} os={c["overseas"]} pp {c["bowl_pp"]} death {c["bowl_death"]} all {c["bowl_all"]}')
