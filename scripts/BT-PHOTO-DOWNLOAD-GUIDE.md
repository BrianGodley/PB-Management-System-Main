# BT Daily-Log Photo Downloader — Guide

Companion to `scripts/bt-photo-download.py`. Pulls every photo attached to every BT daily log, uploads to Supabase Storage, and writes the URLs back onto each `daily_logs` row so the app can render them.

## One-time setup

### 1. Run the SQL migration
In **Supabase SQL Editor**, paste and run `supabase-add-daily-log-photo-urls.sql` (sibling of this file). It does three things:
- adds `photo_urls TEXT[]` to `daily_logs`
- creates the `bt-daily-log-photos` Storage bucket (public read)
- sets RLS so only the service role can write

### 2. Add env vars
Append to your `.env` (next to the existing Supabase ones):

```
BT_USER=brian@picturebuild.com
BT_PASS=********
# BT_BASE_URL=https://buildertrend.net   # leave commented for the default
```

### 3. Install Playwright
```powershell
pip install playwright requests python-dotenv
playwright install chromium
```

## Running

Default: process the next 20 un-finished BT jobs, then exit.
```powershell
python scripts/bt-photo-download.py
```

Other modes:
```powershell
python scripts/bt-photo-download.py --batch 10        # different batch size
python scripts/bt-photo-download.py --job <bt_job_id> # just one job
python scripts/bt-photo-download.py --headed          # see the browser
python scripts/bt-photo-download.py --reset           # forget checkpoint
```

The script is **resumable**. It writes `scripts/bt-photo-download.checkpoint.json` after every job; on the next run it skips jobs already in `done_jobs`. So you can:
- Run once to get the first 20 done.
- Re-run any time (a cron, a manual prompt) to take the next 20.
- Use `--reset` only if you want to re-pull from scratch.

## What it does per job

1. Opens BT's `DailyLog/DailyLogList.aspx?jobsiteID=<bt_job_id>` page.
2. Captures the JSON XHR responses BT's own UI makes while loading.
3. Walks the JSON for any URL ending in `.jpg/.jpeg/.png/.heic/.webp`, plus the closest sibling date field.
4. Downloads each photo using Playwright's request context (same auth cookies).
5. Uploads to `bt-daily-log-photos/<bt_job_id>/<YYYY-MM-DD>/<filename>`.
6. PATCHes the matching `daily_logs` row(s) for that job + date, appending the public URLs onto `photo_urls`. Duplicates are de-duped.

## When BT changes their HTML

The script isolates every BT-specific selector into a single block near the top of `bt-photo-download.py`. If a login or download stops working:

1. Run with `--headed` to watch the browser.
2. Inspect the form / network panel for the new selector or URL pattern.
3. Edit:
   - `BT_LOGIN_URL`, `BT_DAILYLOG_LIST_URL`
   - `LOGIN_USER_SELECTORS`, `LOGIN_PASS_SELECTORS`, `LOGIN_SUBMIT_SELECTORS`
   - `_PHOTO_RE` (image-URL regex) — only widen if BT starts serving a new extension.
   - `is_log_payload()` inside `fetch_daily_log_photos` if BT renames the endpoint.

Errors are captured into `checkpoint.json` under `errors[]` with timestamps — handy for re-running just the failures.

## Cron / automatic runs

Once you're happy with a batch, schedule the script to run every N hours via Windows Task Scheduler or a simple PowerShell loop. The checkpoint makes it a no-op after every BT job is captured.
