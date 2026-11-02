import json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path
R = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(R / "tests"), str(R / "pipeline")]
import build, make_fixture, news
class T(unittest.TestCase):
    @classmethod
    def setUpClass(c):
        c.t = Path(tempfile.mkdtemp()); make_fixture.main(c.t / "src")
        subprocess.check_call([sys.executable, str(R / "pipeline/build.py"), "--source", str(c.t / "src"), "--demo", "--out", str(c.t / "o")], stdout=subprocess.DEVNULL)
        c.p = {p["n"]: i for i, p in enumerate(json.load(open(c.t / "o/men/players.json")))}
        c.r = json.load(open(c.t / "o/men/rows.json"))["rows"]
    @classmethod
    def tearDownClass(c): shutil.rmtree(c.t)
    def row(s, n, comp="IPL", ph=0): return next(r for r in s.r if r[0] == s.p[n] and r[1] == comp and r[3] == ph)
    def test_batting(s):
        r = s.row("A One")  # 4, wide, 1 off no-ball, 1, 6 = 12 runs off 4 balls: wide excluded, no-ball counted
        s.assertEqual((r[5], r[6]), (12, 4))
        s.assertEqual(r[10], 1)  # run out is a dismissal
    def test_non_boundary_four(s):
        r = s.row("B Two"); s.assertEqual(r[5], 10); s.assertEqual(r[7], 0); s.assertEqual(r[8], 1)
    def test_retired_hurt_not_out(s):
        s.assertEqual(s.row("C Three")[10], 0)
    def test_bowling(s):
        r = s.row("D Four")  # 7 legal balls: wide and no-ball excluded. Byes not charged.
        i = 11
        s.assertEqual(r[i + 1], 7)
        s.assertEqual(r[i + 2], 4 + 1 + 2 + 6 + 4 + 0 + 0 + 6)
        s.assertEqual(r[i + 3], 1)  # caught counts; retired hurt does not
    def test_run_out_not_credited(s): s.assertEqual(s.row("E Five")[14], 0)
    def test_super_over_excluded(s): s.assertEqual(s.row("A One", ph=3)[5], 6)
    def test_alias(s):
        m = json.load(open(s.t / "o/men/matches.json")); s.assertTrue(any("Delhi Capitals" in x["teams"] for x in m))
    def test_india_filter(s):
        m = json.load(open(s.t / "o/men/matches.json")); s.assertEqual(sum(x["comp"] == "IND" for x in m), 1)
    def test_phases(s):
        s.assertEqual([build.phase(o) for o in (0, 5, 6, 14, 15, 19)], [1, 1, 2, 2, 3, 3])
    def test_link_refuses_ambiguous(s):
        r = [{"player": "Rahul Sharma"}, {"player": "Rohit Sharma"}, {"player": "Virat Kohli"}]
        build.link_auction(r, {"1": "R Sharma", "2": "RG Sharma", "3": "V Kohli"})
        s.assertIsNone(r[0]["pid"]); s.assertIsNone(r[1]["pid"]); s.assertEqual(r[2]["pid"], "3")
    def test_link_uses_team(s):
        r = [{"player": "Cameron Green", "league": "IPL", "season": 2024, "team": "RCB"}]
        build.link_auction(r, {"1": "C Green", "2": "CJ Green"}, {("1", "IPL", 2024, "Royal Challengers Bengaluru")})
        s.assertEqual(r[0]["pid"], "1")
    def test_scorecard(s):
        m = json.loads((s.t / "o/men/m/1.json").read_text()); i = m["inn"][0]
        a = next(b for b in i["bat"] if b["n"] == "A One"); t = next(b for b in i["bat"] if b["n"] == "B Two")
        s.assertEqual((a["r"], a["b"], a["how"]), (12, 4, "run out"))
        s.assertTrue(t["how"].startswith("c "))
        s.assertEqual(sum(b["r"] for b in i["bat"]) + i["extras"], i["runs"])
        s.assertEqual(sum(w["r"] for w in i["bowl"]) + 2, i["runs"])  # 2 byes are not charged
        s.assertEqual(len(m["inn"]), 2)  # super over excluded
        s.assertEqual([b["n"] for b in i["bowl"]][0], "D Four")
    def test_news(s):
        from datetime import datetime, timezone
        x = b'<rss><channel><item><title>Big story - Site</title><source>Site</source><link>http://x</link><pubDate>Mon, 02 Nov 2026 01:00:00 GMT</pubDate></item></channel></rss>'
        i = news.parse(x, "IPL", datetime(2026, 11, 2, tzinfo=timezone.utc)); s.assertEqual(i[0]["title"], "Big story")
unittest.main()
