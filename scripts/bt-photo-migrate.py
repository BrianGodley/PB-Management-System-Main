#!/usr/bin/env python3
"""
One-time migration: move BT photos from the temporary bt-daily-log-photos
bucket into the app's daily-log-photos bucket and create daily_log_photos
rows so the React app renders them.

Reads `daily_logs.photo_urls` (populated by the first run of
bt-photo-download.py before the bucket was unified). For each URL:

  1. Download bytes from bt-daily-log-photos (Supabase server-to-server).
  2. Upload to daily-log-photos at {daily_logs.id}/{uuid}.{ext}.
  3. Insert a daily_log_photos row pointing to the new path.
  4. Clear the URL from daily_logs.photo_urls.

Idempotent — re-running skips entries already migrated (no row inserted if
one with the same log_id + file_name exists).

Usage:
    python scripts/bt-photo-migrate.py                   # everything
    python scripts/bt-photo-migrate.py --job 35259913    # one bt_job_id
    python scripts/bt-photo-migrate.py --dry-run         # report, no writes
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
import uuid
from pathlib import Path
from urllib.parse import unquote

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    print("Missing dependencies. Run: pip install requests python-dotenv")
    sys.exit(1)

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OLD_BUCKET = "bt-daily-log-photos"
NEW_BUCKET = "daily-log-photos"

if not (SUPABASE_URL and SERVICE_KEY):
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env")
    sys.exit(1)

H = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
}
H_JSON = {**H, "Content-Type": "application/json"}


def list_bucket_paths(prefix: str) -> list[str]:
    """Walk every file under bt-daily-log-photos/{prefix}/... recursively.
    Supabase Storage list returns one folder level at a time, so we BFS."""
    out: list[str] = []
    queue = [prefix.rstrip("/")]
    while queue:
        folder = queue.pop(0)
        offset = 0
        while True:
            r = requests.post(
                f"{SUPABASE_URL}/storage/v1/object/list/{OLD_BUCKET}",
                headers={**H_JSON},
                json={
                    "prefix": folder,
                    "limit": 1000,
                    "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                },
                timeout=30,
            )
            r.raise_for_status()
            items = r.json() or []
            if not items:
                break
            for it in items:
                name = it.get("name")
                if not name:
                    continue
                full = f"{folder}/{name}" if folder else name
                # Folders have id == None in Supabase Storage list.
                if it.get("id") is None:
                    queue.append(full)
                else:
                    out.append(full)
            if len(items) < 1000:
                break
            offset += 1000
    return out


def find_log_row(job_uuid: str, date_str: str) -> dict | None:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/daily_logs",
        headers=H,
        params={
            "job_id": f"eq.{job_uuid}",
            "date": f"eq.{date_str}",
            "select": "id",
            "limit": 1,
        },
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def get_job_by_bt_id(bt_job_id: str) -> dict | None:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/jobs",
        headers=H,
        params={
            "bt_job_id": f"eq.{bt_job_id}",
            "select": "id,bt_job_id,name",
            "limit": 1,
        },
        timeout=15,
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def get_all_bt_jobs() -> list[dict]:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/jobs",
        headers=H,
        params={
            "bt_job_id": "not.is.null",
            "select": "id,bt_job_id,name",
        },
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def already_migrated(log_id: str, file_name: str) -> bool:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/daily_log_photos",
        headers=H,
        params={
            "log_id": f"eq.{log_id}",
            "file_name": f"eq.{file_name}",
            "select": "id",
        },
        timeout=15,
    )
    r.raise_for_status()
    return bool(r.json())


def parse_old_path(public_url: str) -> str | None:
    """Strip the public-URL prefix; return the path inside bt-daily-log-photos."""
    prefix = f"{SUPABASE_URL}/storage/v1/object/public/{OLD_BUCKET}/"
    if not public_url.startswith(prefix):
        return None
    return unquote(public_url[len(prefix):])


def download_from_old(old_path: str) -> tuple[bytes, str] | None:
    url = f"{SUPABASE_URL}/storage/v1/object/{OLD_BUCKET}/{old_path}"
    r = requests.get(url, headers=H, timeout=120)
    if r.status_code != 200:
        return None
    return r.content, r.headers.get("Content-Type", "image/jpeg")


def upload_to_new(new_path: str, blob: bytes, ctype: str) -> bool:
    url = f"{SUPABASE_URL}/storage/v1/object/{NEW_BUCKET}/{new_path}"
    r = requests.post(
        url,
        headers={**H, "Content-Type": ctype, "x-upsert": "true"},
        data=blob,
        timeout=120,
    )
    return r.status_code in (200, 201)


def insert_dlp_row(log_id: str, path: str, file_name: str, ctype: str) -> bool:
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/daily_log_photos",
        headers={**H_JSON, "Prefer": "return=minimal"},
        json={
            "log_id": log_id,
            "storage_path": path,
            "file_name": file_name,
            "mime_type": ctype,
        },
        timeout=30,
    )
    return r.ok


def clear_photo_urls(log_id: str) -> None:
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/daily_logs",
        headers=H_JSON,
        params={"id": f"eq.{log_id}"},
        json={"photo_urls": []},
        timeout=30,
    )


def migrate_one_job(job: dict, dry: bool) -> tuple[int, int, int]:
    """Walk every file in bt-daily-log-photos/{bt_job_id}/... and migrate
    each one based on its on-bucket path. Match the daily_logs row by
    (job_id, date) parsed from the path."""
    paths = list_bucket_paths(str(job["bt_job_id"]))
    moved = skipped = failed = unmatched = 0
    log_cache: dict[str, dict | None] = {}
    for p in paths:
        # Expected: {bt_job_id}/{YYYY-MM-DD or undated}/{filename}
        parts = p.split("/")
        if len(parts) < 3:
            unmatched += 1
            continue
        date_str = parts[1]
        file_name = parts[-1]
        # Some legacy photos sit under "undated"; skip them, we can't
        # match to a daily_logs row.
        if date_str == "undated":
            unmatched += 1
            continue
        cache_key = f"{job['id']}|{date_str}"
        if cache_key not in log_cache:
            log_cache[cache_key] = find_log_row(job["id"], date_str)
        log_row = log_cache[cache_key]
        if not log_row:
            unmatched += 1
            continue
        if already_migrated(log_row["id"], file_name):
            skipped += 1
            continue
        if dry:
            moved += 1
            continue
        dl = download_from_old(p)
        if dl is None:
            failed += 1
            continue
        blob, ctype = dl
        ext = file_name.rsplit(".", 1)[-1].lower() or "jpg"
        new_path = f"{log_row['id']}/{uuid.uuid4()}.{ext}"
        if not upload_to_new(new_path, blob, ctype):
            failed += 1
            continue
        if not insert_dlp_row(log_row["id"], new_path, file_name, ctype):
            failed += 1
            continue
        moved += 1
    return moved, skipped, failed + unmatched


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--job", dest="bt_job_id", default=None,
                    help="Only migrate photos for this bt_job_id.")
    ap.add_argument("--dry-run", action="store_true",
                    help="Report what would be migrated; don't write.")
    ap.add_argument("--count", action="store_true",
                    help="Just walk the bucket and print file count(s); "
                         "no Supabase reads of daily_logs.")
    args = ap.parse_args(argv)

    # --count mode: walk the bt-daily-log-photos bucket and report totals.
    if args.count:
        if args.bt_job_id:
            paths = list_bucket_paths(args.bt_job_id)
            print(f"bt_job_id={args.bt_job_id}: {len(paths)} file(s)")
        else:
            paths = list_bucket_paths("")
            # Aggregate by top-level folder (= bt_job_id)
            by_job: dict[str, int] = {}
            for p in paths:
                top = p.split("/", 1)[0]
                by_job[top] = by_job.get(top, 0) + 1
            for top, n in sorted(by_job.items(), key=lambda x: -x[1])[:20]:
                print(f"  {top}: {n}")
            print(f"TOTAL: {len(paths)} file(s) across {len(by_job)} bt_job_id folder(s)")
        return 0

    if args.bt_job_id:
        job = get_job_by_bt_id(args.bt_job_id)
        if not job:
            print(f"No jobs row has bt_job_id = {args.bt_job_id}")
            return 1
        jobs = [job]
    else:
        jobs = get_all_bt_jobs()
        print(f"jobs with bt_job_id: {len(jobs)}")

    total_moved = total_skipped = total_failed = 0
    for j in jobs:
        moved, skipped, failed = migrate_one_job(j, args.dry_run)
        if moved or skipped or failed:
            print(
                f"  {j.get('name') or j['bt_job_id']} "
                f"(bt_job_id={j['bt_job_id']}): "
                f"moved={moved} skipped={skipped} failed={failed}"
            )
        total_moved += moved
        total_skipped += skipped
        total_failed += failed
    label = "would migrate" if args.dry_run else "migrated"
    print(
        f"\nTOTAL {label}: {total_moved}  "
        f"already-done: {total_skipped}  "
        f"failed+unmatched: {total_failed}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
