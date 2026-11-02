#!/usr/bin/env python3
"""Headlines from Google News RSS. Stores title, publisher, time and link only, and always links out."""
import argparse, json, re, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

Q = {
    "men": {"IPL": 'IPL 2027 cricket', "India": '"India" men cricket team BCCI', "Auction": 'IPL auction retention'},
    "women": {"WPL": 'WPL 2027 cricket', "India": 'India women cricket team', "Auction": 'WPL auction'},
}
DAYS = 21


def parse(xml, tag, now):
    items = []
    for it in ET.fromstring(xml).iter("item"):
        title = it.findtext("title", "")
        src = it.findtext("source", "") or ""
        if src and title.endswith(" - " + src):
            title = title[: -len(src) - 3]
        try:
            when = parsedate_to_datetime(it.findtext("pubDate", "")).astimezone(timezone.utc)
        except (TypeError, ValueError):
            continue
        if (now - when).days <= DAYS:
            items.append({"title": title, "source": src, "url": it.findtext("link", ""), "at": when.isoformat(timespec="minutes"), "tag": tag})
    return items


def dedupe(items):
    seen, out = set(), []
    for i in sorted(items, key=lambda x: x["at"], reverse=True):
        k = re.sub(r"[^a-z0-9]", "", i["title"].lower())[:60]
        if k not in seen:
            seen.add(k)
            out.append(i)
    return out[:60]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default="web/data"); a = ap.parse_args()
    now, res, got = datetime.now(timezone.utc), {}, 0
    for g, qs in Q.items():
        items = []
        for tag, q in qs.items():
            url = "https://news.google.com/rss/search?" + urllib.parse.urlencode({"q": q + " when:21d", "hl": "en-IN", "gl": "IN", "ceid": "IN:en"})
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 PitchXI"})
                items += parse(urllib.request.urlopen(req, timeout=30).read(), tag, now)
            except Exception as e:
                print(f"news feed failed ({g}/{tag}): {e}", file=sys.stderr)
            time.sleep(1)
        res[g] = dedupe(items)
        got += len(res[g])
    Path(a.out, "news.json").write_text(json.dumps({"at": now.isoformat(timespec="minutes"), "ok": got > 0, **res}, ensure_ascii=False), encoding="utf-8")
    print("news items", got)


if __name__ == "__main__":
    main()
