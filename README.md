# PitchXI

Ball-by-ball cricket analysis for the IPL, WPL and India's men's and women's T20Is, with auction records and news.

- **Match data:** [Cricsheet](https://cricsheet.org), rebuilt four times a day by GitHub Actions.
- **Auctions:** `data/auction/sold.csv`, one row per sale with its source URL. Add new auctions here.
- **News:** headlines from Google News RSS, linked to each publisher.
- **Checks:** `tests/` covers the metric rules. `pipeline/build.py` stops the deploy if an integrity check fails, so the last good site stays live.

Run on a computer: double-click `start_windows.bat`, or run `./start_mac.sh`. The first run downloads the data. Opening `web/index.html` directly will not work.

Independent project, not affiliated with the IPL, WPL or BCCI.
