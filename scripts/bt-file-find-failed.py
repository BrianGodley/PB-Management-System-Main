#!/usr/bin/env python3
"""Find every bt_job_id whose import had at least one skipped file.

Reads scripts/bt-file-runner.log and prints one bt_job_id per line for
any job block that contains either:
  - a line beginning with `    !` (per-file error), OR
  - a `✓ N/M new file(s) uploaded` summary where N < M.

Pipe the output to scripts/jobs_to_rebuild.txt, then re-run those
jobs with:

    python scripts/bt-file-download.py --rebuild-list scripts/jobs_to_rebuild.txt
"""
import re
from pathlib import Path

LOG = Path(__file__).resolve().parent / "bt-file-runner.log"

# Tolerate a few cases of cp1252-mojibake of the bullet/check chars too.
JOB_RE = re.compile(
    r"^\s*[·‧•\xc2]\s+.*\(bt_job_id=(\d+)\)\s*$"
)
ERR_RE = re.compile(r"^\s*!\s")
DONE_RE = re.compile(
    r"^\s*[✓\xe2]\s*\W*\s*(\d+)/(\d+)\s+new file\(s\) uploaded"
)


def main() -> int:
    if not LOG.exists():
        print(f"# log not found: {LOG}", flush=True)
        return 1

    failed_ids: list[str] = []
    seen: set[str] = set()
    current_job: str | None = None
    current_has_err = False
    current_uploaded = None  # (got, want)

    def flush():
        nonlocal current_job, current_has_err, current_uploaded
        if current_job is None:
            return
        bad = current_has_err
        if current_uploaded is not None:
            got, want = current_uploaded
            if got < want:
                bad = True
        if bad and current_job not in seen:
            seen.add(current_job)
            failed_ids.append(current_job)
        current_job = None
        current_has_err = False
        current_uploaded = None

    for raw in LOG.read_text(encoding="utf-8", errors="replace").splitlines():
        m = JOB_RE.match(raw)
        if m:
            flush()
            current_job = m.group(1)
            continue
        if current_job is None:
            continue
        if ERR_RE.match(raw):
            current_has_err = True
            continue
        d = DONE_RE.match(raw)
        if d:
            current_uploaded = (int(d.group(1)), int(d.group(2)))
            continue
    flush()

    for jid in failed_ids:
        print(jid)
    print(f"# {len(failed_ids)} job(s) need rebuild", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
