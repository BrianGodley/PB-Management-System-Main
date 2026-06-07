#!/usr/bin/env python3
"""
BT CSV Inbox Watcher
====================

Scan scripts/bt-csv-inbox/ for fresh BT CSV exports and run
bt-import.py on each. On success the file moves to
scripts/bt-csv-inbox/processed/<YYYY-MM-DD>/. On failure it's left in
place so the next run retries it; the error is appended to
scripts/bt-import-folder.log.

Designed to be run unattended (the nightly scheduled task chains this
before the photo downloader). Safe to run by hand too.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
INBOX = HERE / "bt-csv-inbox"
PROCESSED = INBOX / "processed"
LOG = HERE / "bt-import-folder.log"
IMPORTER = HERE / "bt-import.py"


def log(msg: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    try:
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


def main() -> int:
    if not INBOX.exists():
        log(f"Inbox folder missing — creating {INBOX}")
        INBOX.mkdir(parents=True, exist_ok=True)
        PROCESSED.mkdir(parents=True, exist_ok=True)
    if not IMPORTER.exists():
        log(f"ERROR: {IMPORTER} not found — cannot import.")
        return 1

    csvs = sorted(INBOX.glob("*.csv"))
    if not csvs:
        log("No CSVs in inbox — nothing to do.")
        return 0

    log(f"Found {len(csvs)} CSV(s): {[p.name for p in csvs]}")
    ok_count = 0
    fail_count = 0
    for csv_path in csvs:
        log(f"→ {csv_path.name}")
        try:
            result = subprocess.run(
                [sys.executable, str(IMPORTER), str(csv_path)],
                capture_output=True,
                text=True,
                timeout=15 * 60,  # 15 min hard cap per file
            )
        except subprocess.TimeoutExpired:
            log(f"  ✗ timed out after 15 min — leaving in inbox to retry")
            fail_count += 1
            continue
        except Exception as e:
            log(f"  ✗ launch failed: {e}")
            fail_count += 1
            continue

        # Echo the importer's stdout/stderr into our log so the nightly
        # log captures everything in one place.
        if result.stdout:
            log("  stdout: " + result.stdout.strip().splitlines()[-1])
        if result.returncode != 0:
            log(f"  ✗ importer exited {result.returncode}")
            if result.stderr:
                log(f"  stderr: {result.stderr.strip()[-300:]}")
            fail_count += 1
            continue

        # Success — move into processed/<YYYY-MM-DD>/
        date_dir = PROCESSED / datetime.now().strftime("%Y-%m-%d")
        date_dir.mkdir(parents=True, exist_ok=True)
        dest = date_dir / csv_path.name
        # If a file with the same name was already processed today, suffix
        # the new one so we don't overwrite history.
        if dest.exists():
            stem, suf = csv_path.stem, csv_path.suffix
            for i in range(1, 100):
                cand = date_dir / f"{stem}-{i}{suf}"
                if not cand.exists():
                    dest = cand
                    break
        shutil.move(str(csv_path), str(dest))
        log(f"  ✓ imported and moved to {dest.relative_to(HERE)}")
        ok_count += 1

    log(f"Done. {ok_count} imported, {fail_count} failed.")
    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
