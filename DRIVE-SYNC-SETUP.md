# Hands-off Google Drive → PBS sync — setup

This runs the whole Drive→PBS copy on the server, on a nightly schedule, with no
browser open. You set it up once (~10–15 min), then forget it. It copies new and
changed files into PBS each night and skips everything unchanged.

There are four parts: **(A)** a Google service account, **(B)** Drive access for
that account, **(C)** Supabase secrets + deploy, **(D)** the nightly schedule.

---

## A. Create the service account (Google Cloud Console)

1. Go to **console.cloud.google.com** → pick the **same project** that owns your
   app's OAuth client (the Drive integration).
2. **APIs & Services → Library** → search **Google Drive API** → **Enable** (if not already).
3. **APIs & Services → Credentials → + Create credentials → Service account.**
   - Name: `pbs-drive-sync` → **Create and continue** → skip roles → **Done**.
4. Click the new service account → **Keys** tab → **Add key → Create new key → JSON**.
   A `.json` file downloads. **Keep it safe** — this is the credential.
5. On the service account's **Details** tab, copy its **Unique ID** (a long number)
   and its **email** (`pbs-drive-sync@<project>.iam.gserviceaccount.com`). You'll
   need both next.

---

## B. Give the service account access to your Shared Drives

Pick **one** of these:

### Option 1 — Domain-wide delegation (recommended; covers ALL Shared Drives at once)
You need Google **Workspace admin** (you are, since you manage picturebuild.com).

1. In the service account → **Details**, enable **"Enable Google Workspace
   Domain-wide Delegation"** (or note its **Client/Unique ID** from step A5).
2. Go to **admin.google.com → Security → Access and data control → API controls →
   Domain-wide delegation → Add new**.
3. **Client ID**: paste the service account's Unique ID.
   **OAuth scopes**: `https://www.googleapis.com/auth/drive.readonly`
4. **Authorize.**

This lets the sync impersonate **brian@picturebuild.com** and see every Shared
Drive you can see — nothing else to add when you create new drives.

### Option 2 — Add the service account to each Shared Drive (no admin needed)
For every Shared Drive: open it → **Manage members** → add the service-account
**email** (from A5) as **Viewer** (or Content manager). You must repeat this for
any new Shared Drive you create later. (If you use this option, leave
`GDRIVE_IMPERSONATE` empty in step C.)

---

## C. Supabase: secrets + deploy

Run these from the project folder (replace the JSON path and email):

```bash
cd "C:\Users\Brian\Desktop\Claude Files\landscape-job-tracker"

# 1) Store the service-account key (paste the whole JSON file's contents).
#    On Windows PowerShell:
supabase secrets set GDRIVE_SA_KEY="$(Get-Content -Raw 'C:\path\to\pbs-drive-sync-key.json')"
#    (If using Option 1 delegation, also set the user to impersonate.)
supabase secrets set GDRIVE_IMPERSONATE="brian@picturebuild.com"

# 2) Apply the SQL (or paste supabase-drive-sync.sql into the Supabase SQL editor).
# 3) Deploy the function.
supabase functions deploy drive-sync
```

If `supabase secrets set` with `Get-Content` gives you trouble on Windows, you can
instead set **GDRIVE_SA_KEY** and **GDRIVE_IMPERSONATE** by hand in the dashboard:
**Supabase → Project Settings → Edge Functions → Secrets**. Paste the entire JSON
(one value) for `GDRIVE_SA_KEY`.

### Test it once (manual kick)
From **Supabase → Edge Functions → drive-sync → Invoke**, or:

```bash
curl -X POST "https://jjlnpywpmoukgwmwczbz.supabase.co/functions/v1/drive-sync" ^
  -H "Authorization: Bearer <YOUR_SERVICE_ROLE_KEY>" ^
  -H "Content-Type: application/json" -d "{\"trigger\":\"manual\"}"
```

It returns immediately and keeps working in the background, chaining itself until
done. Watch progress in the SQL editor:

```sql
select status, message, files_copied, files_skipped, errors, updated_at
from drive_sync_jobs order by id desc limit 1;
```

---

## D. Schedule it nightly

In the Supabase SQL editor, enable the extensions and add the schedule (this is
the template at the bottom of `supabase-drive-sync.sql`):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'drive-sync-nightly',
  '0 9 * * *',                         -- 09:00 UTC ≈ 2am PT
  $$
    select net.http_post(
      url     := 'https://jjlnpywpmoukgwmwczbz.supabase.co/functions/v1/drive-sync',
      headers := jsonb_build_object(
                   'Content-Type','application/json',
                   'Authorization','Bearer <YOUR_SERVICE_ROLE_KEY>'
                 ),
      body    := jsonb_build_object('trigger','cron')
    );
  $$
);
```

Your **service-role key** is in **Supabase → Project Settings → API → service_role**.
Keep it secret — it only lives in this server-side schedule, never in the app.

To change the time, `select cron.unschedule('drive-sync-nightly');` then re-run with
a new cron expression. To stop syncing entirely, just unschedule it.

---

## Notes
- **What it copies:** all Shared Drives → matching PBS drive names, same folder
  structure. Google-native files (Docs/Sheets/Slides) are exported to PDF, exactly
  like the in-app tool.
- **Change detection:** it re-copies a file only when its Drive *modified time*
  changes; unchanged files are skipped (fast).
- **Deletions:** files deleted in Drive are **not** removed from PBS (safe by
  default). Tell me if you want true mirroring (delete-on-remove) later.
- **Very large native files** (>10 MB) can't be exported by Google and will show
  up in the `errors` count — they're rare; the rest still sync.
- The old in-app **⧉ Copy all → PBS** button still works for an on-demand manual
  run; this just makes it automatic and browser-free.
