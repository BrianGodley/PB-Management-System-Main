#!/usr/bin/env python3
"""Find bt_job_ids whose import had at least one Payload-too-large (413) error.

These are typically jobs with walkthrough videos or compressed plan-set
PDFs bigger than the Supabase Storage bucket's file_size_limit.

Pipe the output to scripts/jobs_413.txt, then (after raising the bucket
limit) re-run those jobs with:

    python scripts/bt-file-download.py --rebuild-list scripts/jobs_413.txt
"""
import re
from pathlib import Path

LOG = Path(__file__).resolve().parent / "bt-file-runner.log"

JOB_RE = re.compile(
    r"^\s*[·‧•\xc2]\s+.*\(bt_job_id=(\d+)\)\s*$"
)
P413_RE = re.compile(r"Payload too large", re.IGNORECASE)


def main() -> int:
    if not LOG.exists():
        print(f"# log not found: {LOG}", flush=True)
        return 1

    ids: list[str] = []
    seen: set[str] = set()
    current_job: str | None = None
    current_has_413 = False

    def flush():
        nonlocal current_job, current_has_413
        if current_job and current_has_413 and current_job not in seen:
            seen.add(current_job)
            ids.append(current_job)
        current_job = None
        current_has_413 = False

    for raw in LOG.read_text(encoding="utf-8", errors="replace").splitlines():
        m = JOB_RE.match(raw)
        if m:
            flush()
            current_job = m.group(1)
            continue
        if current_job is None:
            continue
        if P413_RE.search(raw):
            current_has_413 = True
    flush()

    for jid in ids:
        print(jid)
    print(f"# {len(ids)} job(s) with 413 (Payload too large) errors", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
