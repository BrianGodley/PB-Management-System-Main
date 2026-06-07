"""Print a one-line status of the BT photo downloader checkpoint.

When the script can reach Supabase (via the same env vars the downloader
uses), it also queries the total BT-linked job count and shows how many
are left to process.
"""
import json
import os
from pathlib import Path

cp_path = Path(__file__).parent / "bt-photo-download.checkpoint.json"
if not cp_path.exists():
    print("No checkpoint file yet -- script hasn't run, or all jobs are done.")
    raise SystemExit(0)

text = cp_path.read_text()
cp, _ = json.JSONDecoder().raw_decode(text)

done = cp.get("done_jobs", [])
errs = cp.get("errors", [])

total = None
try:
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    import requests
    url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    if url and key:
        r = requests.get(
            f"{url}/rest/v1/jobs",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Prefer": "count=exact",
                "Range-Unit": "items",
                "Range": "0-0",
            },
            params={"bt_job_id": "not.is.null", "select": "id"},
            timeout=15,
        )
        cr = r.headers.get("Content-Range", "")
        if "/" in cr:
            tail = cr.split("/", 1)[1].strip()
            if tail.isdigit():
                total = int(tail)
except Exception:
    pass

print(f"Jobs done: {len(done)}")
if total is not None:
    remaining = max(total - len(done), 0)
    pct = (len(done) / total * 100) if total else 0
    print(f"Total BT jobs in Supabase: {total}")
    print(f"Remaining: {remaining}  ({pct:.1f}% complete)")
else:
    print("(Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env to see remaining)")
print(f"Errors:    {len(errs)}")
print(f"Last run:  {cp.get('last_run', 'never')}")
if errs:
    print("\nMost recent errors:")
    for e in errs[-3:]:
        print(f"  {e.get('when', '?')[:19]}  {e.get('msg', '')[:120]}")
