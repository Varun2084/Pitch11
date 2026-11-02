#!/usr/bin/env python3
"""Live matches from CricketData.org, written to live.json for the site to read.
The key is a GitHub secret and never reaches the page. Free plan: 100 hits a day."""
import argparse, json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://api.cricapi.com/v1/"
MAX_HITS = 85  # leave a margin under the daily limit


def call(path, **q):
    url = BASE + path + "?" + urllib.parse.urlencode(q)
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "PitchXI"}), timeout=30) as r:
        return json.load(r)


def match(m):
    return {"id": str(m.get("id", "")), "name": str(m.get("name", "")), "type": str(m.get("matchType", "")).upper(),
            "status": str(m.get("status", "")), "venue": str(m.get("venue", "")), "at": str(m.get("dateTimeGMT") or m.get("date") or ""),
            "teams": [str(t) for t in m.get("teams") or []],
            "score": [{"inn": str(s.get("inning", "")), "r": s.get("r"), "w": s.get("w"), "o": s.get("o")} for s in m.get("score") or []],
            "started": bool(m.get("matchStarted")), "ended": bool(m.get("matchEnded"))}


def card(d):
    return {"match": match(d), "innings": [{
        "inn": str(c.get("inning", "")),
        "bat": [{"n": (b.get("batsman") or {}).get("name", ""), "how": b.get("dismissal-text", ""), "r": b.get("r"), "b": b.get("b"), "f": b.get("4s"), "s": b.get("6s"), "sr": b.get("sr")} for b in c.get("batting") or []],
        "bowl": [{"n": (b.get("bowler") or {}).get("name", ""), "o": b.get("o"), "m": b.get("m"), "r": b.get("r"), "w": b.get("w"), "eco": b.get("eco")} for b in c.get("bowling") or []],
    } for c in d.get("scorecard") or []]}


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="live-out"); a = ap.parse_args()
    key = os.environ.get("LIVE_API_KEY")
    if not key:
        print("LIVE_API_KEY is not set, skipping")
        return
    try:
        j = call("currentMatches", apikey=key, offset=0)
    except Exception as e:
        print("live feed failed:", type(e).__name__, file=sys.stderr)  # never print the URL, it holds the key
        return
    if j.get("status") != "success":
        print("live feed refused:", j.get("reason", "unknown"), file=sys.stderr)
        return
    matches = [match(m) for m in j.get("data") or [] if m.get("id")]
    cards, hits = {}, int((j.get("info") or {}).get("hitsToday") or 0)
    for m in [m for m in matches if m["started"] and not m["ended"]][:1 if hits > 45 else 2]:
        if hits >= MAX_HITS:
            break
        try:
            r = call("match_scorecard", apikey=key, id=m["id"]); hits += 1
            if r.get("status") == "success":
                cards[m["id"]] = card(r.get("data") or {})
        except Exception as e:
            print("scorecard failed:", type(e).__name__, file=sys.stderr)
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    (out / "live.json").write_text(json.dumps({"at": datetime.now(timezone.utc).isoformat(timespec="minutes"), "hits": hits, "matches": matches, "cards": cards}, ensure_ascii=False), encoding="utf-8")
    print("matches", len(matches), "cards", len(cards), "hits", hits)


if __name__ == "__main__":
    main()
