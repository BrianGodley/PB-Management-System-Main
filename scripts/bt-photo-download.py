#!/usr/bin/env python3
"""
BuilderTrend Daily-Log Photo Downloader
========================================

Pulls every photo attached to every daily log in BuilderTrend for every job
that has a `bt_job_id` set in Supabase, uploads each photo to the
`bt-daily-log-photos` Storage bucket, and writes the public URLs back onto
`daily_logs.photo_urls` so the app can render them.

Runs in *batch passes*: each pass picks the next N un-downloaded jobs
(default 20), processes them sequentially, writes a checkpoint, and exits.
Re-run the script to grab the next batch — safe to schedule on a cron.

──────────────────────────────────────────────────────────────────────────
Usage
──────
    python scripts/bt-photo-download.py                # next 20 jobs
    python scripts/bt-photo-download.py --batch 10     # next 10 jobs
    python scripts/bt-photo-download.py --job <id>     # just one job
    python scripts/bt-photo-download.py --reset        # forget checkpoint
    python scripts/bt-photo-download.py --headed       # show the browser

──────────────────────────────────────────────────────────────────────────
Env (add to your .env — they live next to bt-import.py's vars)
──────
    BT_USER=brian@picturebuild.com
    BT_PASS=********
    BT_BASE_URL=https://buildertrend.net          # leave blank for default
    SUPABASE_URL=...
    SUPABASE_SERVICE_ROLE_KEY=...

──────────────────────────────────────────────────────────────────────────
Setup
──────
    pip install playwright requests python-dotenv
    playwright install chromium

    Then run the SQL migration alongside this script
    (supabase-add-daily-log-photo-urls.sql).
"""

from __future__ import annotations

import argparse
import concurrent.futures
import uuid
import json
import mimetypes
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

try:
    import requests
    from dotenv import load_dotenv
    from playwright.sync_api import (
        Page,
        Playwright,
        TimeoutError as PWTimeout,
        sync_playwright,
    )
except ImportError:
    print(
        "Missing dependencies. Run:\n"
        "    pip install playwright requests python-dotenv\n"
        "    playwright install chromium"
    )
    sys.exit(1)

load_dotenv()

# ── Config ──────────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BT_USER = os.getenv("BT_USER", "")
BT_PASS = os.getenv("BT_PASS", "")
BT_BASE = os.getenv("BT_BASE_URL", "https://buildertrend.net").rstrip("/")

BUCKET = "daily-log-photos"  # merged with the app's existing photo system 2026-05-28
CHECKPOINT = Path(__file__).parent / "bt-photo-download.checkpoint.json"
DEFAULT_BATCH = 20
NETWORK_TIMEOUT_MS = 45_000

if not all([SUPABASE_URL, SERVICE_KEY, BT_USER, BT_PASS]):
    print(
        "ERROR: Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BT_USER and "
        "BT_PASS in .env."
    )
    sys.exit(1)

SUPA_HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

# ── Supabase helpers ────────────────────────────────────────────────────────

def supa_get(path: str, params: dict | None = None) -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=SUPA_HEADERS,
        params=params or {},
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(
            f"Supabase {path} -> HTTP {r.status_code}: {r.text[:400]}"
        )
    return r.json()


def supa_patch(path: str, where: dict, body: dict) -> None:
    params = {k: f"eq.{v}" for k, v in where.items()}
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=SUPA_HEADERS,
        params=params,
        json=body,
        timeout=30,
    )
    r.raise_for_status()


def supa_upload(object_path: str, blob: bytes, content_type: str) -> str:
    """Upload to the bucket; return the public URL."""
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_path}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }
    r = requests.post(url, headers=headers, data=blob, timeout=120)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Upload failed [{r.status_code}]: {r.text[:200]}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{object_path}"


# ── Checkpoint ──────────────────────────────────────────────────────────────

def load_checkpoint() -> dict:
    if not CHECKPOINT.exists():
        return {"done_jobs": [], "last_run": None, "errors": []}
    return json.loads(CHECKPOINT.read_text())


def save_checkpoint(cp: dict) -> None:
    cp["last_run"] = datetime.now(timezone.utc).isoformat()
    CHECKPOINT.write_text(json.dumps(cp, indent=2))


# ── BuilderTrend selectors (UPDATE WHEN BT CHANGES THEIR HTML) ──────────────
#
# These are the only places the script touches BT's UI. If BT redesigns
# their pages, only this section should need editing.
#
# Login is straightforward: a username field, a password field, a submit
# button. The daily-log pages are loaded by their internal API which we
# intercept via Playwright's `expect_response()` — we look for any response
# whose URL contains "DailyLog" and is JSON.
#

# BT uses Auth0's universal login (login.buildertrend.com) — we don't hit it
# directly; we go to the main app and let BT redirect us there. The Auth0
# form is a standard {username, password, Continue} pattern.
BT_LOGIN_URLS = [
    # BT uses Auth0 universal login at login.buildertrend.com. Visiting any of
    # these paths shows the {username, password, Continue} form; after auth,
    # Auth0 redirects to BT's actual app domain.
    f"{BT_BASE}/u/login" if BT_BASE else "https://login.buildertrend.com/u/login",
    f"{BT_BASE}/login" if BT_BASE else "https://login.buildertrend.com/login",
    f"{BT_BASE}/" if BT_BASE else "https://login.buildertrend.com/",
    "https://buildertrend.com/",
    "https://buildertrend.net/app/Login.aspx",
]
# Auth0 host where the credential form lives.
BT_AUTH_HOST = "login.buildertrend.com"
# After login Auth0 redirects to buildertrend.net/app/... — that's the
# real app host. BT_BASE is the auth host (login.buildertrend.com); we
# pin app URLs to the app host explicitly. Override via BT_APP_URL in
# .env if your tenant lives elsewhere.
BT_APP_BASE = os.getenv("BT_APP_URL", "https://buildertrend.net").rstrip("/")
# BT's React-era daily logs page is /app/DailyLogs (no per-job query
# param — the client-side app fetches all logs via an internal API and
# filters in-browser). We navigate there to capture what API it fires;
# the photo extractor then groups results by job_id from the response.
# {bt_job_id} is left as a template placeholder for compatibility — the
# current URL ignores it but we may want job-scoped routing later.
# BT's modern URL pattern for a single daily log is
#   /app/DailyLogView/{daily_log_id}/{job_id}/none
# but for the per-job list page we don't have the daily_log_id up front.
# Try the modern React route with the PascalCase JobsiteId param first;
# fall through to the legacy aspx if that 404s.
BT_DAILYLOG_LIST_URLS = [
    BT_APP_BASE + "/app/DailyLogs?JobsiteId={bt_job_id}",
    BT_APP_BASE + "/app/DailyLogs/Jobsite/{bt_job_id}",
    BT_APP_BASE + "/app/DailyLog/DailyLogList.aspx?jobsiteID={bt_job_id}",
]
# Kept as an alias for back-compat with older code paths in this file.
BT_DAILYLOG_LIST_URL = BT_DAILYLOG_LIST_URLS[0]

# Login selectors — modern BT first (React form), legacy WebForms last.
LOGIN_USER_SELECTORS = [
    "input[name='userName']",
    "input[name='username']",
    "input[name='email']",
    "input[type='email']",
    "input[autocomplete='username']",
    "input[id*='ser' i][type='text']",
    "input[name='ctl00$ContentPlaceHolder1$txtUsername']",
]
LOGIN_PASS_SELECTORS = [
    "input[name='password']",
    "input[type='password']",
    "input[autocomplete='current-password']",
    "input[name='ctl00$ContentPlaceHolder1$txtPassword']",
]
LOGIN_SUBMIT_SELECTORS = [
    "button[type='submit']",
    "input[type='submit']",
    "button:has-text('Sign In')",
    "button:has-text('Log In')",
    "button:has-text('Login')",
    "input[name='ctl00$ContentPlaceHolder1$btnLogin']",
]


def first_visible(page: Page, selectors: Iterable[str], timeout_ms: int = 8_000):
    """Return the first selector that resolves to a visible element."""
    deadline = time.monotonic() + timeout_ms / 1000
    last_err: Exception | None = None
    for sel in selectors:
        if time.monotonic() > deadline:
            break
        try:
            loc = page.locator(sel).first
            loc.wait_for(state="visible", timeout=1_500)
            return loc
        except PWTimeout as e:
            last_err = e
            continue
    raise PWTimeout(f"None of these selectors became visible: {list(selectors)}") from last_err


# ── BT scraping ─────────────────────────────────────────────────────────────

def _dump_login_debug(page: Page, where: str) -> None:
    """When login fails, dump the current URL, title and every visible
    input/button to console — plus a screenshot — so we can update the
    selectors without re-running blind."""
    out_dir = Path(__file__).parent
    shot = out_dir / "bt-login-debug.png"
    try:
        page.screenshot(path=str(shot), full_page=True)
    except Exception:
        pass
    print(f"  -- login debug ({where}) --")
    print(f"     url:   {page.url}")
    try:
        print(f"     title: {page.title()}")
    except Exception:
        pass
    try:
        # Up to 10 visible inputs and buttons so we can see what's on screen.
        for sel, label in (("input", "input"), ("button", "button")):
            for el in page.locator(f"{sel}:visible").all()[:10]:
                try:
                    name = el.get_attribute("name") or ""
                    typ = el.get_attribute("type") or ""
                    plh = el.get_attribute("placeholder") or ""
                    txt = (el.inner_text() or "").strip()[:40]
                    print(
                        f"     {label}: name={name!r} type={typ!r} "
                        f"placeholder={plh!r} text={txt!r}"
                    )
                except Exception:
                    pass
    except Exception as e:
        print(f"     (could not enumerate elements: {e})")
    print(f"     screenshot saved to: {shot}")


def bt_login(page: Page) -> None:
    last_err: Exception | None = None
    for url in BT_LOGIN_URLS:
        print(f"  → trying login URL: {url}")
        try:
            page.goto(url, timeout=NETWORK_TIMEOUT_MS, wait_until="domcontentloaded")
        except Exception as e:
            # Includes ERR_NAME_NOT_RESOLVED, ERR_CONNECTION_*, PWTimeout, etc.
            print(f"     could not load {url}: {e}")
            last_err = e
            continue
        # Quick reality check: does this page have a password field at all?
        try:
            page.locator("input[type='password']").first.wait_for(
                state="visible", timeout=4_000
            )
        except PWTimeout:
            print("     no password field on this page; trying next URL")
            continue
        # Fill + submit
        try:
            first_visible(page, LOGIN_USER_SELECTORS).fill(BT_USER)
            first_visible(page, LOGIN_PASS_SELECTORS).fill(BT_PASS)
            first_visible(page, LOGIN_SUBMIT_SELECTORS).click()
        except PWTimeout as e:
            print(f"     could not find a selector on this URL: {e}")
            last_err = e
            continue
        # Give BT a moment to redirect
        try:
            page.wait_for_load_state("networkidle", timeout=NETWORK_TIMEOUT_MS)
        except PWTimeout:
            pass
        # Success = we left the Auth0 host. Auth0 may bounce us through a
        # couple of redirect URLs before landing on app.buildertrend.com,
        # so retry the URL check for up to 15s.
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            cur = (page.url or "").lower()
            if BT_AUTH_HOST not in cur and "/u/login" not in cur:
                print(f"  → logged in (landed on {page.url})")
                return
            page.wait_for_timeout(500)
        print(f"     still on auth/login page after submit: {page.url}")
        last_err = RuntimeError(f"Stayed on {page.url} after submit")
    # All URLs failed — dump diagnostics.
    _dump_login_debug(page, where="all URLs failed")
    raise RuntimeError(
        "BT login failed on every candidate URL. See debug above. "
        "If the form is fine but the password is rejected, double-check "
        ".env. If the selectors look wrong, update LOGIN_*_SELECTORS at "
        f"the top of {Path(__file__).name}. Last error: {last_err}"
    )


def fetch_daily_log_photos(page: Page, bt_job_id: str) -> list[dict]:
    """For one BT job, return a list of {date, photo_url, filename} entries.

    Strategy: navigate to BT's Daily Log list page for the job. As the page
    loads it makes XHR calls to internal JSON endpoints — we capture those
    responses and walk them for `.jpg/.jpeg/.png/.heic` URLs. This is more
    robust than scraping the DOM because BT's HTML is heavily virtualized.

    DISCOVERY MODE: every response goes into scripts/bt-network-debug.log
    so we can see what BT actually fires (URL + status + content-type +
    first 200 bytes). Once we know the real endpoint names we can tighten
    is_log_payload() / the URL template.
    """
    url = BT_DAILYLOG_LIST_URL.format(bt_job_id=bt_job_id)
    captured: list[dict] = []
    log_path = Path(__file__).parent / "bt-network-debug.log"
    log_path.write_text(f"--- run for bt_job_id={bt_job_id} at {datetime.now(timezone.utc).isoformat()} ---\n")

    def log(msg: str) -> None:
        with log_path.open("a", encoding="utf-8", errors="replace") as fh:
            fh.write(msg + "\n")

    def is_log_payload(resp) -> bool:
        rurl = resp.url
        ct = resp.headers.get("content-type", "")
        # Loosened from "must contain DailyLog" to "any JSON response that
        # looks like it might carry photo URLs". walk_for_photos() filters
        # by regex anyway, so false positives just get ignored.
        return ("json" in ct.lower()) and resp.status == 200

    def on_response(resp):
        rurl = resp.url
        ct = resp.headers.get("content-type", "")
        # Log every response so we can see BT's wire traffic.
        try:
            log(f"{resp.status} {ct[:40]:40} {rurl}")
        except Exception:
            pass
        if not is_log_payload(resp):
            return
        try:
            data = resp.json()
        except Exception:
            return
        before = len(captured)
        walk_for_photos(data, captured)
        if len(captured) > before:
            log(f"  -> found {len(captured)-before} photo URL(s) in this response")

    page.on("response", on_response)
    try:
        log(f"navigating to: {url}")
        page.goto(url, timeout=NETWORK_TIMEOUT_MS, wait_until="networkidle")
        log(f"final url: {page.url}")
        try:
            log(f"page title: {page.title()}")
        except Exception:
            pass
    finally:
        page.remove_listener("response", on_response)
    print(f"    (network log written to {log_path.name})")

    # De-dup by URL
    seen: set[str] = set()
    out: list[dict] = []
    for p in captured:
        if p["photo_url"] in seen:
            continue
        seen.add(p["photo_url"])
        out.append(p)
    return out


_PHOTO_RE = re.compile(r"https?://[^\s\"']+\.(?:jpg|jpeg|png|heic|webp)", re.I)
_DATE_RE = re.compile(r"(\d{4}-\d{2}-\d{2})")


def walk_for_photos(node, out: list[dict], current_date: str | None = None):
    """Recursively scan a JSON blob for photo URLs.

    BT's daily-log API returns nested objects roughly like:
        { logs: [ { logDate: '2026-04-12', attachments: [ { url: ... } ] } ] }
    but field names change between BT releases — so instead of betting on a
    schema, we walk every node, track the most recent ISO date we've seen,
    and grab any URL that looks like an image.
    """
    if isinstance(node, dict):
        # Pick up a date from common field names
        for k in ("logDate", "date", "createdOn", "modifiedOn"):
            v = node.get(k)
            if isinstance(v, str):
                m = _DATE_RE.search(v)
                if m:
                    current_date = m.group(1)
                    break
        for v in node.values():
            walk_for_photos(v, out, current_date)
    elif isinstance(node, list):
        for v in node:
            walk_for_photos(v, out, current_date)
    elif isinstance(node, str):
        for m in _PHOTO_RE.finditer(node):
            url = m.group(0)
            fname = url.rsplit("/", 1)[-1].split("?")[0]
            out.append(
                {
                    "photo_url": url,
                    "filename": fname,
                    "date": current_date,
                }
            )


# ── BuilderTrend API helpers (discovered 2026-05-28) ───────────────────────
#
# Each daily log is served by:
#     GET /apix/v2/DailyLogs/{log_id}?jobId={job_id}
# returning JSON whose `images.files[]` array holds the photo metadata.
# Each photo entry includes a `downloadDocPath` — a fully-formed URL
# that, with our auth cookie, returns the original-resolution file.

def build_bt_session(ctx) -> requests.Session:
    """Mirror BT's Playwright auth cookies into a plain requests.Session,
    so worker threads can hit BT in parallel without going through
    Playwright's sync API (which is single-greenlet and explodes when
    called from a ThreadPoolExecutor worker).

    Sends Referer + Origin + a Chrome-matching User-Agent so BT serves
    actual image bytes instead of its /error HTML page (which was the
    failure mode on the first multithreaded run on 2026-05-28)."""
    s = requests.Session()
    s.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/148.0.7778.96 Safari/537.36"
        ),
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": f"{BT_APP_BASE}/app/DailyLogs",
        "Origin": BT_APP_BASE,
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
    })
    for c in ctx.cookies():
        try:
            s.cookies.set(
                c["name"], c["value"],
                domain=c.get("domain"), path=c.get("path") or "/",
            )
        except Exception:
            pass
    return s


def fetch_daily_log_json(page: Page, bt_log_id: int | str, bt_job_id: int | str) -> dict:
    url = f"{BT_APP_BASE}/apix/v2/DailyLogs/{bt_log_id}?jobId={bt_job_id}"
    resp = page.request.get(url, timeout=NETWORK_TIMEOUT_MS)
    if resp.status != 200:
        body = ""
        try:
            body = resp.text()[:200]
        except Exception:
            pass
        raise RuntimeError(f"BT /apix/v2/DailyLogs/{bt_log_id} -> HTTP {resp.status}: {body}")
    return resp.json() or {}


def extract_photos_from_log(log_json: dict) -> list[dict]:
    """Return [{file_id, filename, download_url}] for every photo on the log."""
    images = (log_json or {}).get("images") or {}
    files = images.get("files") or []
    out: list[dict] = []
    for f in files:
        if not f.get("isPhoto"):
            continue
        fid = f.get("id")
        title = f.get("title") or f"{fid}.{f.get('extension', 'jpg')}"
        # downloadDocPath gives the full-resolution download with
        # isAttachment=true. Fall back to previewDocPath if needed.
        url = f.get("downloadDocPath") or f.get("previewDocPath")
        if not (fid and url):
            continue
        out.append({"file_id": fid, "filename": title, "download_url": url})
    return out


def upsert_daily_log_photo(log_id: str, storage_path: str, file_name: str,
                            mime_type: str) -> None:
    """Insert a row into daily_log_photos if one with the same log_id +
    file_name doesn't already exist. Lets the script be re-run without
    creating duplicate rows in the app's photo system."""
    existing = supa_get(
        "daily_log_photos",
        {
            "log_id": f"eq.{log_id}",
            "file_name": f"eq.{file_name}",
            "select": "id",
        },
    )
    if existing:
        return
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/daily_log_photos",
        headers={**SUPA_HEADERS, "Prefer": "return=minimal"},
        json={
            "log_id": log_id,
            "storage_path": storage_path,
            "file_name": file_name,
            "mime_type": mime_type,
        },
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(
            f"insert daily_log_photos -> HTTP {r.status_code}: {r.text[:200]}"
        )


# ── Per-job processor ───────────────────────────────────────────────────────

def process_job(page: Page, job: dict) -> int:
    """Download all photos for every daily log on this job. Returns the
    photo count."""
    bt_id = job["bt_job_id"]
    name = job.get("name") or job.get("client_name") or bt_id
    print(f"  · {name} (bt_job_id={bt_id})")

    # Pull every daily_logs row for this job that has a bt_daily_log_id.
    # bt-import.py populated bt_daily_log_id when the CSV was loaded.
    logs = supa_get(
        "daily_logs",
        {
            "job_id": f"eq.{job['id']}",
            "bt_daily_log_id": "not.is.null",
            "select": "id,bt_daily_log_id,date",
            "order": "date.asc",
        },
    )
    if not logs:
        print("    (no daily logs with bt_daily_log_id)")
        return 0
    print(f"    {len(logs)} daily log(s) to scan")

    # Fast-path "already complete" check — one round-trip to Supabase.
    # If every daily log for this job already has at least one photo
    # recorded in daily_log_photos, the job was processed in a previous
    # run (just never reached `cp["done_jobs"].append(...)` — e.g. the
    # script was killed). Skip the (expensive) BT API + Playwright loop
    # and return 0 so the caller marks it done. This lets the next run
    # blow past these jobs instead of re-scanning them every single time.
    #
    # Trade-off: if BT had MORE photos for some log than we have on
    # record (e.g. supervisor added photos after our last download),
    # we'd miss the new ones. Re-running with --reset will catch them.
    log_ids = [lg["id"] for lg in logs]
    in_list = ",".join(f'"{lid}"' for lid in log_ids)
    existing = supa_get(
        "daily_log_photos",
        {
            "log_id": f"in.({in_list})",
            "select": "log_id",
        },
    )
    logs_with_photos = {row["log_id"] for row in (existing or [])}
    if logs_with_photos and all(lid in logs_with_photos for lid in log_ids):
        print(f"    ✓ already complete ({len(logs)} logs, all have photos) — skipping fetch")
        return 0

    total = 0
    for log_row in logs:
        bt_log_id = log_row["bt_daily_log_id"]
        log_date = log_row.get("date") or "undated"
        try:
            log_json = fetch_daily_log_json(page, bt_log_id, bt_id)
        except Exception as e:
            print(f"    ! log {bt_log_id}: {e}")
            continue
        photos = extract_photos_from_log(log_json)
        if not photos:
            continue

        # Skip photos already in daily_log_photos for this log so re-runs
        # don't redownload (saving bandwidth) and don't upload orphan
        # storage objects (since dedup happens AFTER upload). One round-trip
        # per log to fetch the set of existing filenames.
        existing_rows = supa_get(
            "daily_log_photos",
            {
                "log_id": f"eq.{log_row['id']}",
                "select": "file_name",
            },
        )
        existing_names = {r["file_name"] for r in (existing_rows or [])}
        before_skip = len(photos)
        photos = [p for p in photos if p["filename"] not in existing_names]
        skipped = before_skip - len(photos)
        if skipped:
            print(f"    ↻ skipping {skipped} already-uploaded photo(s)")

        # Sequential downloads via Playwright's page.request (which
        # carries BT's session cookies AND the Chrome client context BT's
        # bot detection expects). Multithreading was attempted but hit
        # greenlet errors AND BT started returning HTML /error pages —
        # not worth the complexity.
        ok_count = 0
        for p_ in photos:
            try:
                resp = page.request.get(
                    p_["download_url"], timeout=NETWORK_TIMEOUT_MS,
                )
                if resp.status != 200:
                    print(f"    ! {p_['filename']} -> HTTP {resp.status}")
                    continue
                blob = resp.body()
                # BT's CDN often serves HEIC/HEIF (and sometimes JPEG) with a
                # generic content-type of application/octet-stream, which used
                # to make the downloader skip thousands of valid photos. Trust
                # the file extension when the server's content-type is generic
                # or missing — Python's mimetypes module doesn't know HEIC, so
                # we maintain our own extension→MIME map and prefer it over
                # whatever the server claims for those formats.
                EXT_MIME = {
                    "jpg":  "image/jpeg",
                    "jpeg": "image/jpeg",
                    "png":  "image/png",
                    "gif":  "image/gif",
                    "webp": "image/webp",
                    "heic": "image/heic",
                    "heif": "image/heif",
                    "bmp":  "image/bmp",
                    "tif":  "image/tiff",
                    "tiff": "image/tiff",
                }
                ext = p_["filename"].rsplit(".", 1)[-1].lower() if "." in p_["filename"] else ""
                ext_mime = EXT_MIME.get(ext)
                server_ctype = (resp.headers.get("content-type") or "").lower()
                generic = (
                    not server_ctype
                    or server_ctype.startswith("application/octet-stream")
                    or server_ctype.startswith("binary/")
                )
                if ext_mime and generic:
                    ctype = ext_mime
                elif server_ctype:
                    ctype = server_ctype
                else:
                    ctype = ext_mime or mimetypes.guess_type(p_["filename"])[0] or "application/octet-stream"
                if not ctype.lower().startswith("image/"):
                    print(
                        f"    ! {p_['filename']} -> non-image content-type "
                        f"{ctype}"
                    )
                    continue
                storage_path = f"{log_row['id']}/{uuid.uuid4()}.{ext or 'jpg'}"
                supa_upload(storage_path, blob, ctype)
                upsert_daily_log_photo(
                    log_row["id"], storage_path, p_["filename"], ctype,
                )
                ok_count += 1
                total += 1
            except Exception as e:
                print(f"    ! {p_['filename']} -> {e}")
        print(f"    \u2192 log {bt_log_id} ({log_date}): "
              f"{ok_count}/{len(photos)} photo(s)")


    print(f"    uploaded {total} photo(s)")
    return total


def _legacy_process_job_unused(page: Page, job: dict) -> int:
    """The original page-scraping flow. Superseded by the API flow above
    on 2026-05-28; left here in case BT's /apix/v2/DailyLogs endpoint
    starts rejecting requests and we need to fall back. Not called."""
    by_date: dict[str, list[dict]] = {}
    for date, plist in by_date.items():
        uploaded_urls: list[str] = []
        # Append onto the matching daily_logs row(s) for this job + date.
        # The daily_logs table was imported with bt_job_id (via the jobs FK)
        # and log_date — we match on both.
        try:
            existing = supa_get(
                "daily_logs",
                {
                    "job_id": f"eq.{job['id']}",
                    "log_date": f"eq.{date}",
                    "select": "id,photo_urls",
                },
            )
            if not existing:
                print(f"    (no daily_logs row for {date} — skipping URL writeback)")
                continue
            for row in existing:
                prior = row.get("photo_urls") or []
                merged = list({*prior, *uploaded_urls})
                supa_patch(
                    "daily_logs", {"id": row["id"]}, {"photo_urls": merged}
                )
        except Exception as e:
            print(f"    ! writeback for {date} failed: {e}")

    print(f"    uploaded {total} photo(s)")
    return total


# ── Driver ──────────────────────────────────────────────────────────────────

def all_bt_jobs() -> list[dict]:
    """Pull every job that has a bt_job_id, oldest-first by created_at."""
    rows = supa_get(
        "jobs",
        {
            "bt_job_id": "not.is.null",
            "select": "id,bt_job_id,name,client_name",
            "order": "created_at.asc",
        },
    )
    return rows


def pick_batch(cp: dict, batch: int, only_job: str | None) -> list[dict]:
    jobs = all_bt_jobs()
    if only_job:
        target = str(only_job).strip()
        matches = [
            j for j in jobs
            if str(j.get("id")) == target or str(j.get("bt_job_id")) == target
        ]
        if not matches:
            print(
                f"No BT job matches --job {target!r}. "
                f"({len(jobs)} jobs have a bt_job_id in Supabase.)"
            )
        return matches
    done = {str(x) for x in cp["done_jobs"]}
    remaining = [j for j in jobs if str(j["bt_job_id"]) not in done]
    print(
        f"BT jobs total={len(jobs)} done={len(done)} remaining={len(remaining)} "
        f"taking next {batch}"
    )
    return remaining[:batch]


def discover(page: Page, url: str) -> None:
    """Navigate to an arbitrary BT URL, log every network response, and
    exit. Used to reverse-engineer BT's internal APIs — paste any
    DailyLogView / DailyLogs / etc. URL after `--discover`."""
    log_path = Path(__file__).parent / "bt-network-debug.log"
    log_path.write_text(
        f"--- discover {url} at {datetime.now(timezone.utc).isoformat()} ---\n"
    )

    def log(msg: str) -> None:
        with log_path.open("a", encoding="utf-8", errors="replace") as fh:
            fh.write(msg + "\n")

    def on_response(resp):
        rurl = resp.url
        ct = resp.headers.get("content-type", "")
        try:
            log(f"{resp.status} {ct[:40]:40} {rurl}")
        except Exception:
            pass
        # Mirror JSON bodies for /api/ or /apix/ calls — those are likely
        # the real internal endpoints.
        if ("/api/" in rurl or "/apix" in rurl) and "json" in ct.lower():
            try:
                body = resp.text()
                # For DailyLogs endpoints we want the FULL body so we can
                # see the file/photo structure. Other endpoints get 800
                # chars to keep the log readable.
                limit = 60_000 if "/DailyLogs/" in rurl else 800
                snippet = body[:limit].replace("\n", " ")
                log(f"   body[{limit}]: {snippet}")
            except Exception:
                pass

    page.on("response", on_response)
    try:
        log(f"navigating to: {url}")
        page.goto(url, timeout=NETWORK_TIMEOUT_MS, wait_until="networkidle")
        log(f"final url: {page.url}")
        # Give SPA navigations a chance to fire additional XHRs.
        page.wait_for_timeout(5000)
    finally:
        page.remove_listener("response", on_response)
    print(f"discover done — see {log_path}")


def run(headed: bool, batch: int, only_job: str | None, discover_url: str | None = None) -> None:
    cp = load_checkpoint()
    if discover_url:
        jobs = []  # discover mode skips per-job processing
    else:
        jobs = pick_batch(cp, batch, only_job)
        if not jobs:
            print("Nothing to do — every BT job is checkpointed.")
            return

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            bt_login(page)
            if discover_url:
                discover(page, discover_url)
                return
            for j in jobs:
                try:
                    process_job(page, j)
                    cp["done_jobs"].append(str(j["bt_job_id"]))
                    save_checkpoint(cp)
                except Exception as e:
                    msg = f"{j.get('name')} ({j['bt_job_id']}): {e}"
                    print(f"  ✗ FAILED — {msg}")
                    cp["errors"].append(
                        {"when": datetime.now(timezone.utc).isoformat(), "msg": msg}
                    )
                    save_checkpoint(cp)
        finally:
            ctx.close()
            browser.close()

    print("Done with this batch. Re-run to continue.")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--batch", type=int, default=DEFAULT_BATCH)
    ap.add_argument("--job", dest="only_job", default=None,
                    help="Process just one job by its UUID or bt_job_id.")
    ap.add_argument("--reset", action="store_true",
                    help="Delete the checkpoint and start over.")
    ap.add_argument("--headed", action="store_true",
                    help="Show the browser window (debugging).")
    ap.add_argument("--discover", dest="discover_url", default=None,
                    help="Paste any BT URL — script logs in, navigates there, "
                         "dumps network traffic to bt-network-debug.log, exits.")
    args = ap.parse_args(argv)

    if args.reset:
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
            print(f"Removed {CHECKPOINT.name}.")
        return 0

    run(headed=args.headed, batch=args.batch, only_job=args.only_job, discover_url=args.discover_url)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
            ctx.close()
            browser.close()

    print("Done with this batch. Re-run to continue.")


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--batch", type=int, default=DEFAULT_BATCH)
    ap.add_argument("--job", dest="only_job", default=None,
                    help="Process just one job by its UUID or bt_job_id.")
    ap.add_argument("--reset", action="store_true",
                    help="Delete the checkpoint and start over.")
    ap.add_argument("--headed", action="store_true",
                    help="Show the browser window (debugging).")
    ap.add_argument("--discover", dest="discover_url", default=None,
                    help="Paste any BT URL — script logs in, navigates there, "
                         "dumps network traffic to bt-network-debug.log, exits.")
    args = ap.parse_args(argv)

    if args.reset:
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
            print(f"Removed {CHECKPOINT.name}.")
        return 0

    run(headed=args.headed, batch=args.batch, only_job=args.only_job, discover_url=args.discover_url)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
