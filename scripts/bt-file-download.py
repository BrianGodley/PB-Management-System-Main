#!/usr/bin/env python3
"""
BuilderTrend Files Downloader
=============================

Pulls every file in every job's BT Files area (folders + subfolders +
files) into the Supabase `job-files` storage bucket, and records each
upload in `public.job_files` with the BT folder path preserved.

Mirrors the architecture of bt-photo-download.py:
  - reuse the same BT login (Auth0 → /app/Login.aspx → SPA)
  - one job at a time, checkpointed to bt-file-download.checkpoint.json
  - atomic checkpoint writes (retry on Windows file locks)
  - per-file dedup against existing job_files rows (no duplicate uploads)
  - fast-path: skip a job if all its tracked BT file ids are already in DB
  - discovery mode for capturing BT's internal API endpoints once

USAGE
─────
    python scripts/bt-file-download.py                     # next 20 jobs
    python scripts/bt-file-download.py --batch 99999       # grind through everything
    python scripts/bt-file-download.py --job <bt_job_id>   # just one job
    python scripts/bt-file-download.py --reset             # forget checkpoint
    python scripts/bt-file-download.py --headed            # show browser
    python scripts/bt-file-download.py --discover <URL>    # log network for one URL

DISCOVERY (one-time, before this is fully wired up)
───────────────────────────────────────────────────
The BT Files page is a React SPA that fires internal JSON requests to
list folders + files. Once we know the exact endpoint shape we can
implement walk_files(). Until then:

  1. Sign into BT manually in a browser, open one job's Files page.
  2. Copy the URL (e.g. https://buildertrend.net/app/Documents/Jobsite/<id>)
  3. Run:
       python scripts/bt-file-download.py --discover "<that-url>" --headed
  4. The script writes scripts/bt-file-debug.log with every XHR + URL,
     status, content-type and a body sample. We then read the log to
     find the calls that return the folder + file listing, fill in
     walk_files(), and turn DISCOVERY_MODE off.

After we know the endpoints, the walker fetches folder + file listings
recursively, downloads each file via Playwright's page.request (which
carries BT's session cookies), uploads to Supabase storage, and inserts
the metadata row. Re-runs are safe — duplicate (job_id, bt_file_id)
pairs are skipped before any download happens.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import requests
    from dotenv import load_dotenv
    from playwright.sync_api import (
        Page,
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
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
BT_USER      = os.getenv("BT_USER", "")
BT_PASS      = os.getenv("BT_PASS", "")
BT_APP_BASE  = os.getenv("BT_APP_URL", "https://buildertrend.net").rstrip("/")

BUCKET             = "job-files"
CHECKPOINT         = Path(__file__).resolve().parent / "bt-file-download.checkpoint.json"
DISCOVER_LOG       = Path(__file__).resolve().parent / "bt-file-debug.log"
DEFAULT_BATCH      = 20
NETWORK_TIMEOUT_MS = 60_000

# BT's per-job file browser. The deep URL the user clicks into a single file
# looks like .../Documents/Standard/<bt_job_id>/Media/Properties/<media_id>/<file_id>/...
# but the LIST view is just .../Documents/Standard/<bt_job_id>. The list
# page is what fires the folder + file XHRs we need to inspect, and what
# walk_files() (once wired) will hit per job.
BT_FILES_URL_FMT = BT_APP_BASE + "/app/Documents/Standard/{bt_job_id}"

if not all([SUPABASE_URL, SERVICE_KEY, BT_USER, BT_PASS]):
    print("ERROR: Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BT_USER and BT_PASS in .env.")
    sys.exit(1)

SUPA_HEADERS = {
    "apikey":        SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type":  "application/json",
}


# ── Supabase helpers (same shape as photo downloader's) ────────────────────

def supa_get(path: str, params: dict | None = None) -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=SUPA_HEADERS,
        params=params or {},
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"Supabase {path} -> HTTP {r.status_code}: {r.text[:400]}")
    return r.json()


def supa_upload(object_path: str, blob: bytes, content_type: str) -> str:
    # URL-encode every path SEGMENT individually so spaces / unicode become
    # %20 / %xx but the slashes between segments survive intact. Without
    # this, "3. Designs/Furey CD.pdf" goes onto the wire as a URL whose
    # spaces get mangled and Supabase treats the whole thing as one flat
    # object key — the user sees files with literal slashes in the name
    # instead of a folder tree.
    from urllib.parse import quote
    encoded = "/".join(quote(seg, safe="") for seg in object_path.split("/"))
    url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{encoded}"
    headers = {
        "apikey":        SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type":  content_type,
        "x-upsert":      "true",
    }
    r = requests.post(url, headers=headers, data=blob, timeout=300)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Storage upload failed [{r.status_code}]: {r.text[:200]}")
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{encoded}"


def upsert_job_file(job_id: str, *, bt_file_id: str, folder_path: str | None,
                    file_name: str, storage_path: str, file_size: int | None,
                    mime_type: str | None) -> None:
    """Insert (or skip if exists) one job_files row keyed by (job_id, bt_file_id).

    The unique index added by supabase-add-bt-file-columns.sql guarantees
    we never duplicate. We don't UPDATE on conflict — once the file is in
    storage and DB we leave it alone.
    """
    existing = supa_get(
        "job_files",
        {
            "job_id":     f"eq.{job_id}",
            "bt_file_id": f"eq.{bt_file_id}",
            "select":     "id",
            "limit":      "1",
        },
    )
    if existing:
        return
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/job_files",
        headers={**SUPA_HEADERS, "Prefer": "return=minimal"},
        json={
            "job_id":        job_id,
            "bt_file_id":    bt_file_id,
            "file_name":     file_name,
            "folder_path":   folder_path,
            "storage_path":  storage_path,
            "file_size":     file_size,
            "file_type":     mime_type,
            "mime_type":     mime_type,
            "file_category": "document",
            "source":        "buildertrend",
        },
        timeout=30,
    )
    if not r.ok:
        raise RuntimeError(f"insert job_files -> HTTP {r.status_code}: {r.text[:200]}")


# ── Checkpoint (atomic write, retry on Windows lock — same recipe as photo
#    downloader; see comments there for rationale) ─────────────────────────

def load_checkpoint() -> dict:
    if not CHECKPOINT.exists():
        return {"done_jobs": [], "last_run": None, "errors": []}
    return json.loads(CHECKPOINT.read_text())


def save_checkpoint(cp: dict) -> None:
    cp["last_run"] = datetime.now(timezone.utc).isoformat()
    payload = json.dumps(cp, indent=2)
    tmp = CHECKPOINT.with_suffix(CHECKPOINT.suffix + ".tmp")
    tmp.write_text(payload)
    last_err: Exception | None = None
    for attempt in range(5):
        try:
            os.replace(tmp, CHECKPOINT)
            return
        except PermissionError as e:
            last_err = e
            time.sleep(0.1 * (2 ** attempt))
    print(f"  ! atomic save retried; falling back to direct write ({last_err})")
    try:
        tmp.unlink(missing_ok=True)
    except Exception:
        pass
    CHECKPOINT.write_text(payload)


# ── BT login — reuse the battle-tested implementation in bt-photo-download.py
#    instead of duplicating it. importlib trick is needed because the file
#    has dashes in its name, which `import` can't handle directly. The photo
#    downloader sits next to us in scripts/.

def _load_photo_downloader_module():
    import importlib.util
    here = Path(__file__).resolve().parent
    src = here / "bt-photo-download.py"
    if not src.exists():
        raise RuntimeError(
            f"Expected {src} next to this script; cannot reuse its login flow."
        )
    spec = importlib.util.spec_from_file_location("bt_photo_download", src)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(mod)
    return mod


_photo_dl = None


def bt_login(page: Page) -> None:
    global _photo_dl
    if _photo_dl is None:
        _photo_dl = _load_photo_downloader_module()
    _photo_dl.bt_login(page)


# ── Discovery — log every XHR for one URL so we can find Files endpoints ──

def discover(page: Page, url: str) -> None:
    DISCOVER_LOG.write_text(
        f"--- discover {url} at {datetime.now(timezone.utc).isoformat()} ---\n"
    )

    def write(msg: str) -> None:
        with DISCOVER_LOG.open("a", encoding="utf-8", errors="replace") as fh:
            fh.write(msg + "\n")

    def on_response(resp):
        rurl = resp.url
        ct = resp.headers.get("content-type", "")
        try:
            write(f"{resp.status} {ct[:40]:40} {rurl}")
        except Exception:
            pass
        # For /api/ or /apix/ calls returning JSON, save the body so we
        # can see the folder + file shape.
        if ("/api/" in rurl or "/apix" in rurl) and "json" in ct.lower():
            try:
                body = resp.text()
                limit = 80_000 if (
                    "Document" in rurl or "Folder" in rurl or "File" in rurl
                ) else 1_500
                write(f"   body[{limit}]: {body[:limit]}")
            except Exception:
                pass

    # Also log every request URL (regardless of method) so we catch POST
    # endpoints that might not be tagged as JSON in the response phase.
    def on_request(req):
        try:
            write(f"REQ {req.method:4} {req.url}")
        except Exception:
            pass

    page.on("response", on_response)
    page.on("request", on_request)
    try:
        write(f"navigating to: {url}")
        page.goto(url, timeout=NETWORK_TIMEOUT_MS, wait_until="networkidle")
        write(f"final url: {page.url}")

        # The Documents page is mostly server-rendered HTML + ajax on
        # interaction. Hold the browser open and tell the operator to
        # click around so we capture whatever XHRs fire when folders /
        # files load. Two minutes is enough for a thorough click-through.
        print()
        print("━" * 60)
        print("DISCOVERY MODE — browser is open.")
        print("👉 In the browser window, click into folders, expand")
        print("   subfolders, and try clicking one file to download.")
        print("   Every XHR is being recorded to bt-file-debug.log.")
        print("   The browser will close automatically after 120s, or")
        print("   you can hit Ctrl+C in this terminal to stop sooner.")
        print("━" * 60)
        try:
            page.wait_for_timeout(120_000)
        except KeyboardInterrupt:
            print("\nstopped early by Ctrl+C")
    finally:
        page.remove_listener("response", on_response)
        page.remove_listener("request", on_request)
    print(f"discover done — see {DISCOVER_LOG}")


# ── Walker — discovered endpoints ─────────────────────────────────────────
#
# Endpoints (from discovery on job 42165692, see bt-file-debug.log):
#   Root listing:
#     GET /api/MediaFolders/MainDirectory
#         ?mediaType=1&folderId=0&associatedTypeId=0&directoryType=0&jobId={id}
#   Folder contents (recurse):
#     GET /api/MediaFolders/GetDirectoryDetails
#         ?mediaType=1&folderId={fid}&associatedTypeId=0
#         &directoryType=0&jobId={id}&filters={url-encoded JSON}
#   Download:
#     each file row has a `downloadUrl` we hit directly (session cookies
#     carry auth).
#
# Response shape (relevant parts):
#   data.folders[] = [{ folderId, parentFolderId, title, hasChildFolders,
#                       directoryType, jobId, ... }, ...]
#   data.files[]   = [{ documentInstanceId, friendlyFileName, downloadUrl,
#                       extension, sizeInBytes, dateAttached, ... }, ...]
#   directoryType == 1 marks the "** Global Documents **" pseudo-folder
#   that we skip (it's a builder-level template, not a per-job folder).
import urllib.parse

# The filters value is URL-encoded JSON for an "all dates, no name filter"
# request. Captured verbatim from a real session.
_NO_FILTER_JSON = (
    '{"4":"",'
    '"10":"{\\"SelectedValue\\":2147483647,\\"StartDate\\":null,\\"EndDate\\":null}",'
    '"12":"{\\"SelectedValue\\":2147483647,\\"StartDate\\":null,\\"EndDate\\":null}"}'
)
_NO_FILTER_QS = urllib.parse.quote(_NO_FILTER_JSON, safe="")

_EXT_MIME = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "txt": "text/plain",
    "csv": "text/csv",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "heic": "image/heic",
    "heif": "image/heif",
    "dwg": "image/vnd.dwg",
    "zip": "application/zip",
}


def _guess_mime(filename: str, extension: str | None) -> str:
    ext = (extension or "").lower().lstrip(".")
    if not ext and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
    return _EXT_MIME.get(ext) or mimetypes.guess_type(filename)[0] or "application/octet-stream"


def _fetch_folder(page: Page, bt_job_id: str, folder_id: int) -> dict | None:
    """One round-trip to BT for either the root (folder_id=0) or a child
    folder. Returns the parsed `data` object or None on error."""
    if folder_id == 0:
        url = (
            f"{BT_APP_BASE}/api/MediaFolders/MainDirectory"
            f"?mediaType=1&folderId=0&associatedTypeId=0&directoryType=0&jobId={bt_job_id}"
        )
    else:
        url = (
            f"{BT_APP_BASE}/api/MediaFolders/GetDirectoryDetails"
            f"?mediaType=1&folderId={folder_id}&associatedTypeId=0&directoryType=0"
            f"&jobId={bt_job_id}&filters={_NO_FILTER_QS}"
        )
    try:
        resp = page.request.get(url, timeout=NETWORK_TIMEOUT_MS)
    except Exception as e:
        print(f"    ! folder {folder_id}: request failed ({e})")
        return None
    if resp.status != 200:
        # 404 often just means "this folder no longer exists / you've lost
        # access" — log + skip instead of failing the whole job.
        print(f"    ! folder {folder_id}: HTTP {resp.status}")
        return None
    try:
        body = resp.json()
    except Exception as e:
        print(f"    ! folder {folder_id}: bad JSON ({e})")
        return None
    if not body.get("success"):
        print(f"    ! folder {folder_id}: {body.get('message','(no message)')}")
        return None
    return body.get("data") or {}


def walk_files(page: Page, bt_job_id: str) -> list[dict]:
    """Recurse through every folder for this BT job and return a flat
    list of file descriptors.

    Each entry: {
        bt_file_id:  str — documentInstanceId (used for dedup)
        file_name:   str — friendlyFileName / title
        folder_path: str — slash-delimited (e.g. "3. Designs/Older Designs")
        download_url: str — direct BT URL; Playwright's request carries cookies
        mime_type:   str
        size:        int | None
    }
    """
    files: list[dict] = []
    # Iterative DFS so the call stack stays small even on jobs with deep
    # folder hierarchies. Each stack entry is (folder_id, accumulated path).
    stack: list[tuple[int, str]] = [(0, "")]
    # Guard against accidental cycles in BT's data (shouldn't happen but
    # cheap insurance).
    visited: set[int] = set()
    while stack:
        folder_id, path = stack.pop()
        if folder_id in visited:
            continue
        visited.add(folder_id)
        data = _fetch_folder(page, bt_job_id, folder_id)
        if data is None:
            continue
        for f in (data.get("files") or []):
            doc_id = f.get("documentInstanceId")
            if doc_id is None:
                continue
            raw_name = f.get("friendlyFileName") or f.get("title") or f"file-{doc_id}"
            # Strip path separators from the filename itself so they can't
            # create phantom folders inside the storage hierarchy.
            name = raw_name.replace("/", "_").replace("\\", "_").strip()
            files.append({
                "bt_file_id":   str(doc_id),
                "file_name":    name,
                "folder_path":  path or None,
                "download_url": f.get("downloadUrl"),
                "mime_type":    _guess_mime(name, f.get("extension")),
                "size":         f.get("sizeInBytes"),
            })
        for sub in (data.get("folders") or []):
            # Skip BT's "** Global Documents **" pseudo-folder — it lives
            # on every job's root but is the builder's template library,
            # not per-job content.
            if sub.get("directoryType") == 1:
                continue
            sub_id = sub.get("folderId")
            if sub_id is None or sub_id == folder_id:
                continue
            sub_title = (sub.get("title") or f"folder-{sub_id}").strip()
            # Sanitize folder names for storage paths (no slashes / leading
            # dots that would break Supabase storage segmenting).
            safe = sub_title.replace("/", "_").replace("\\", "_").strip(".")
            child_path = f"{path}/{safe}" if path else safe
            stack.append((sub_id, child_path))
    return files


# ── Per-job processor ──────────────────────────────────────────────────────

def process_job(page: Page, job: dict) -> int:
    bt_id = job["bt_job_id"]
    name = job.get("name") or job.get("client_name") or bt_id
    print(f"  · {name} (bt_job_id={bt_id})")

    # Fast-path: if every BT file id we've already recorded for this job
    # covers the BT side, we have nothing new to fetch. Without the walker
    # in place we just compare counts: if walk_files returns [], we trust
    # the existing rows and move on so re-runs are O(1) per done job.
    files = walk_files(page, bt_id)
    if not files:
        print("    (no files returned — walker not yet wired for this job/page)")
        return 0

    # Pre-fetch existing rows so we can skip duplicates without round
    # trip per file.
    existing = supa_get(
        "job_files",
        {
            "job_id":     f"eq.{job['id']}",
            "select":     "bt_file_id",
            "limit":      "10000",
        },
    )
    have = {row["bt_file_id"] for row in (existing or []) if row.get("bt_file_id")}

    ok_count = 0
    for f in files:
        if f["bt_file_id"] in have:
            continue
        try:
            resp = page.request.get(f["download_url"], timeout=NETWORK_TIMEOUT_MS)
            if resp.status != 200:
                print(f"    ! {f['file_name']} -> HTTP {resp.status}")
                continue
            blob = resp.body()
            ctype = (
                resp.headers.get("content-type")
                or f.get("mime_type")
                or mimetypes.guess_type(f["file_name"])[0]
                or "application/octet-stream"
            )
            # Path inside the bucket: <job_id>/<folder_path>/<filename> so the
            # storage explorer shows BT's structure verbatim.
            safe_folder = (f.get("folder_path") or "").strip("/")
            storage_path = "/".join(p for p in [job["id"], safe_folder, f["file_name"]] if p)
            supa_upload(storage_path, blob, ctype)
            upsert_job_file(
                job_id       = job["id"],
                bt_file_id   = f["bt_file_id"],
                folder_path  = safe_folder or None,
                file_name    = f["file_name"],
                storage_path = storage_path,
                file_size    = len(blob),
                mime_type    = ctype,
            )
            ok_count += 1
        except Exception as e:
            print(f"    ! {f['file_name']} -> {e}")

    print(f"    ✓ {ok_count}/{len(files)} new file(s) uploaded")
    return ok_count


# ── Job listing (paginate past Supabase's 1000-row cap) ────────────────────

def all_bt_jobs() -> list[dict]:
    PAGE = 1000
    rows: list[dict] = []
    offset = 0
    while True:
        page = supa_get(
            "jobs",
            {
                "bt_job_id": "not.is.null",
                "select":    "id,bt_job_id,name,client_name",
                "order":     "created_at.asc",
                "limit":     str(PAGE),
                "offset":    str(offset),
            },
        )
        if not page:
            break
        rows.extend(page)
        if len(page) < PAGE:
            break
        offset += PAGE
    return rows


def pick_batch(cp: dict, batch: int, only_job: str | None) -> list[dict]:
    jobs = all_bt_jobs()
    if only_job:
        target = str(only_job).strip()
        return [
            j for j in jobs
            if str(j.get("id")) == target or str(j.get("bt_job_id")) == target
        ]
    done = {str(x) for x in cp["done_jobs"]}
    remaining = [j for j in jobs if str(j["bt_job_id"]) not in done]
    print(
        f"BT jobs total={len(jobs)} done={len(done)} remaining={len(remaining)} "
        f"taking next {batch}"
    )
    return remaining[:batch]


# ── Main ───────────────────────────────────────────────────────────────────

def run(headed: bool, batch: int, only_job: str | None, discover_url: str | None) -> None:
    cp = load_checkpoint()
    jobs = [] if discover_url else pick_batch(cp, batch, only_job)
    if not discover_url and not jobs:
        print("Nothing to do — every BT job is checkpointed.")
        return

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not headed)
        ctx = browser.new_context(accept_downloads=True)
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
                    help="Paste any BT URL — script logs in, navigates "
                         "there, dumps network traffic to "
                         "bt-file-debug.log, exits.")
    ap.add_argument("--discover-job", dest="discover_job", default=None,
                    help="Shortcut: discover on a job's Files page given "
                         "just its bt_job_id (uses BT_FILES_URL_FMT).")
    args = ap.parse_args(argv)

    if args.reset:
        if CHECKPOINT.exists():
            CHECKPOINT.unlink()
            print(f"Removed {CHECKPOINT.name}.")
        return 0

    discover_url = args.discover_url
    if args.discover_job and not discover_url:
        discover_url = BT_FILES_URL_FMT.format(bt_job_id=args.discover_job.strip())

    run(headed=args.headed, batch=args.batch,
        only_job=args.only_job, discover_url=discover_url)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
