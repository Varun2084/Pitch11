"""Synthetic Cricsheet-format matches for tests only. Never published."""
import json, sys, zipfile
from pathlib import Path
REG = {"A One": "aaaaaaa1", "B Two": "aaaaaaa2", "C Three": "aaaaaaa3", "D Four": "aaaaaaa4", "E Five": "aaaaaaa5", "F Six": "aaaaaaa6"}
def d(bat, bowl, r=0, ex=None, nb4=False, wk=None, ns="B Two"):
    e = ex or {}
    x = {"batter": bat, "bowler": bowl, "non_striker": ns, "runs": {"batter": r, "extras": sum(e.values()), "total": r + sum(e.values())}}
    if e: x["extras"] = e
    if nb4: x["runs"]["non_boundary"] = True
    if wk: x["wickets"] = wk
    return x
def match(date, gender, a, b, comp):
    i1 = {"team": a, "overs": [
        {"over": 0, "deliveries": [d("A One", "D Four", 4), d("A One", "D Four", 0, {"wides": 1}), d("A One", "D Four", 1, {"noballs": 1}), d("B Two", "D Four", 0, {"byes": 2}, ns="A One"),
                                   d("B Two", "D Four", 6, ns="A One"), d("B Two", "D Four", 4, nb4=True, ns="A One"), d("B Two", "D Four", 0, wk=[{"player_out": "B Two", "kind": "caught"}], ns="A One")]},
        {"over": 6, "deliveries": [d("A One", "E Five", 1), d("C Three", "E Five", 0, wk=[{"player_out": "A One", "kind": "run out"}], ns="A One"), d("C Three", "E Five", 2, ns="A One")]},
        {"over": 16, "deliveries": [d("C Three", "D Four", 0, wk=[{"player_out": "C Three", "kind": "retired hurt"}], ns="A One"), d("A One", "D Four", 6, ns="C Three")]}]}
    i2 = {"team": b, "target": {"overs": 20, "runs": 27}, "overs": [{"over": 0, "deliveries": [d("D Four", "A One", 30 and 6, ns="E Five"), d("D Four", "A One", 1, ns="E Five")]}]}
    so = {"team": a, "super_over": True, "overs": [{"over": 0, "deliveries": [d("A One", "D Four", 6)]}]}
    return {"info": {"dates": [date], "gender": gender, "match_type": "T20", "venue": "Test Ground, Rewa", "teams": [a, b], "event": {"name": comp},
                     "outcome": {"winner": a, "by": {"runs": 19}}, "players": {a: ["A One", "B Two", "C Three"], b: ["D Four", "E Five", "F Six"]}, "registry": {"people": REG}}, "innings": [i1, i2, so]}
def main(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    feeds = {"ipl_male_json.zip": [("1", match("2025-04-01", "male", "Mumbai Indians", "Delhi Daredevils", "IPL"))],
             "t20s_male_json.zip": [("2", match("2025-05-01", "male", "India", "Australia", "T20I")), ("3", match("2025-05-02", "male", "England", "Australia", "T20I"))],
             "wpl_female_json.zip": [("4", match("2026-02-01", "female", "UP Warriorz", "Gujarat Giants", "WPL"))],
             "t20s_female_json.zip": [("5", match("2026-03-01", "female", "India", "England", "T20I"))]}
    for f, ms in feeds.items():
        with zipfile.ZipFile(out / f, "w") as z:
            for i, m in ms: z.writestr(i + ".json", json.dumps(m))
if __name__ == "__main__": main(sys.argv[1])
