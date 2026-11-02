#!/usr/bin/env python3
"""Prints a build summary into the run log so each refresh can be reviewed."""
import collections, json, sys
from pathlib import Path
d = Path(sys.argv[1] if len(sys.argv) > 1 else "web/data")
L = lambda n: json.loads((d / n).read_text(encoding="utf-8"))
m = L("meta.json")
print("BUILT", m["built"], "demo", m["demo"], "failed", m["checks_failed"])
print("SOURCES", [(s["comp"], s["gender"], s["matches"]) for s in m["sources"]])
print("FILES", sum(1 for f in d.rglob("*") if f.is_file()), "MB", round(sum(f.stat().st_size for f in d.rglob("*") if f.is_file()) / 1e6, 1))
a = L("auction.json")["sold"]
print("LINKED", sorted(collections.Counter(f'{x["league"]} {x["season"]} {"linked" if x["pid"] else "unlinked"}' for x in a).items()))
print("UNLINKED", sorted({x["player"] for x in a if not x["pid"]}))
for g in ("men", "women"):
    p, r = L(g + "/players.json"), L(g + "/rows.json")["rows"]
    t, w = collections.Counter(), collections.Counter()
    for x in r:
        if x[3] == 0:
            t[(x[1], x[0])] += x[5]; w[(x[1], x[0])] += x[14]
    for lab, c in (("runs", t), ("wkts", w)):
        print(g, lab, [(k[0], p[k[1]]["n"], v) for k, v in c.most_common(5)])
    print(g, "latest", [(q["date"], q["comp"], q["teams"], q["winner"]) for q in L(g + "/matches.json")[:2]])
n = L("news.json")
print("NEWS", n["at"], len(n["men"]), len(n["women"]), n["men"][:1], n["women"][:1])
