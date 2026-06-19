# Edge-Function Tenancy Audit & Remediation

Edge functions connect with the **service-role key**, which **bypasses RLS**. After Stage B
(`tenant_id` NOT NULL + auto-fill trigger), the trigger fills `tenant_id` from `auth_tenant_id()` —
but service-role calls have **no user context**, so `auth_tenant_id()` is null and any **INSERT** into a
tenant-scoped table fails the NOT NULL constraint. This breaks the function for **every** tenant
(including Picture Build) at cutover. Therefore: every function that inserts/relocates tenant-scoped
rows must resolve the tenant and stamp `tenant_id` explicitly.

`UPDATE … WHERE id = …` is safe for setting tenant_id (the row already has it). But there are **two**
failure modes, not one:
1. **INSERT/UPSERT into a tenant-scoped table** → must set `tenant_id` explicitly, or the NOT NULL
   constraint fails.
2. **READS that expect a single row or should be tenant-bound** → service-role sees ALL tenants' rows,
   so `company_settings … maybeSingle()` THROWS on >1 tenant, and an unscoped `employees`/`contacts`
   read leaks/acts across tenants. Every such read needs `.eq('tenant_id', tenantId)`.

So the pass is: resolve the tenant (from the caller's JWT, or from the data for cron/portal), then
scope **both reads and writes**. The definitive list of tenant-scoped tables comes from
`supabase-rls-audit.sql` (#3); confirm against its output before finalizing each function.

> Example done: **invoice-comment** — tenant resolved from the job (`job.tenant_id`, caller is a
> portal client), `daily_logs` insert stamped, and the `company_settings` + `employees` reads scoped
> to that tenant (they previously would have thrown / emailed across all tenants).

Helper: `_shared/tenant.ts` → `getCaller(req, admin)` returns `{ userId, tenantId }` from the request
JWT. Use for **user-invoked** functions. **Cron/webhook** functions have no JWT and need a different
strategy (loop tenants, or map an external id → tenant).

## Classification

| Function | Invoked by | Writes (insert/upsert) | Tenant-scoped? | Action |
|---|---|---|---|---|
| **invoice-comment** | user | `daily_logs` insert | yes | **FIX (user):** getCaller → `tenant_id` on insert |
| **helcim-charge-saved** | user | `job_invoice_payments` insert | yes | **FIX (user)** |
| **agent-chat** | user | `agent_conversations/_messages/_attachments/_tool_calls` | yes | **FIX (user):** stamp on each insert |
| **ghl-test-connection** | user | log insert | maybe | FIX (user) if scoped |
| **drive-sync** | user (long-running) | `drive_sync_jobs/_queue/_files`, `pbs_drives` | yes | **FIX (user→threaded):** resolve at start, persist on job, read back in later steps |
| **ghl-sync-contacts** | user **or** cron | `contacts` insert, `ghl_sync_log` | yes | **FIX:** if user-invoked use getCaller; if cron, per-tenant loop |
| **ghl-push-contacts** | user **or** cron | `ghl_sync_log`, state updates | logs maybe | FIX same as above |
| **process-stat-reminders** | **cron** | `stat_reminder_log` upsert | yes | **FIX (cron):** derive tenant_id from the stat/employee row being processed |
| **qbwc** | QuickBooks Web Connector (ticket auth, **webhook-like**) | many `qb_*` upserts | yes | **FIX (webhook):** map QB connection → tenant; stamp from the connection's tenant_id |
| geocode-jobs | cron/user | `jobs` **update** only | — | safe (update, not insert) |
| helcim-checkout | user | updates only (+ customer code) | — | safe |
| helcim-connect-webhook | webhook | `tenant_payment_connections` update | — | safe (update; table keyed by tenant already) |
| delete-user | admin | sets `created_by = null` (update) | — | safe |
| send-email / send-sms / geocode-address / optimize-route / assign-supervisors / reset-user-password | user | no tenant-scoped insert | — | safe (verify) |

## Fix recipe — user-invoked

```ts
import { getCaller } from '../_shared/tenant.ts'
const { userId, tenantId } = await getCaller(req, admin)
if (!tenantId) return json(401, { error: 'No tenant for caller' })
// every insert into a tenant-scoped table:
await admin.from('daily_logs').insert({ ...row, tenant_id: tenantId })
// every read you want scoped:
await admin.from('jobs').select('*').eq('tenant_id', tenantId)
```

## Fix recipe — cron (no caller)

Derive the tenant from the data, not the request:
- **process-stat-reminders:** the `statistic_values`/`employees` row you're acting on already has
  `tenant_id`; carry it onto the `stat_reminder_log` upsert.
- **qbwc:** the QB connection/session row maps to one tenant; stamp `tenant_id` from it.
- **ghl cron:** iterate tenants that have a GHL connection; scope each pass by that tenant_id.

## Status
- [x] Audit + plan (this doc)
- [x] **invoice-comment** — tenant from job; insert stamped + reads scoped
- [x] **helcim-charge-saved** — tenant from invoice; payment insert stamped
- [x] **agent-chat** — tenantId resolved from caller; all 4 agent_* inserts stamped (threaded through getOrCreateConversation / saveMessage / persistMessageAttachments / logToolCall / runAgenticLoop)
- [x] **drive-sync** — tenant resolved from caller at job start, persisted on the job row, read back on continue passes; all inserts (jobs/queue/files/pbs_drives) stamped + dedup reads scoped
- [x] **process-stat-reminders** (cron) — tenant derived from each statistic; stat_reminder_log upsert stamped
- [x] **ghl-sync-contacts** — single connection's tenant; 4 contact dedup reads scoped, contacts insert + sync_log inserts stamped
- [x] **ghl-push-contacts** — contact reads scoped to connection tenant; sync_log insert stamped
- [x] **ghl-test-connection** — connection row created with the admin's tenant_id (the source every other GHL fn reads back)
- [ ] **qbwc** — REMAINING. QuickBooks Web Connector, ticket auth (no JWT). Needs a focused pass.

### qbwc plan (the one remaining)
Tenant comes from the QB **session/connection**, not a caller. Approach:
1. Find the qbwc session/connection table the ticket maps to (e.g. `qb_sessions` / `qb_connection`)
   — it's tenant-scoped after Stage A, so it has `tenant_id`.
2. On each request, resolve `tenantId` from that row (via the ticket).
3. Stamp every `qb_*` upsert/insert with `tenant_id` and scope every `qb_*` read with `.eq('tenant_id', tenantId)`.
It's a PB-only integration (single QB connection), so like GHL the tenant is effectively fixed —
but the qb_* inserts WILL hit NOT NULL at cutover if PB uses QuickBooks, so it must be done before
cutover if QB is in use. Large file (~994 lines) → handle as its own task with staging testing.

## Net status: 8 of 9 inserter functions fixed. **qbwc DEFERRED** — QuickBooks sync is not
## currently in use at Picture Build, so qbwc never runs and is NOT a cutover blocker. Fix it
## (per the plan above) only if/when QB is turned on for any tenant.
## Deploy all fixed functions to staging (`supabase functions deploy <name>`) and test with PB +
## a second tenant before cutover. (User: batch-testing on staging once everything's done.)

### Remaining notes
- The 3 done are the high-use **user-invoked** inserters. The 5 remaining split into:
  long-running user (drive-sync), cron (process-stat-reminders), webhook (qbwc), and
  integration (ghl-*). The cron/webhook ones derive tenant from the **data**, not a JWT.
- **Deploy the 3 fixed functions to staging and test** (`supabase functions deploy <name>`) with PB +
  a second test tenant before cutover; then tackle the remaining 5.

**Confirm the tenant-scoped table set against `supabase-rls-audit.sql` output before finalizing**, and
test each fixed function on staging (with PB + a second test tenant) before cutover.
