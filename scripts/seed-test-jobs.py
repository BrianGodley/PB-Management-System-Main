#!/usr/bin/env python3
"""
Seed 15 end-to-end test jobs on STAGING for exercising profit tracking.

Creates, per client "Test TesterN":
  1 estimate (sold) → 2 projects → 3 modules each, all different types
  1 job linked to that estimate
  6 work orders, each with a crew assigned
  6 schedule items linking crew + dates + work order (this is what lets hours
    resolve to a module)
  time entries for every crew member on every work day
  module_completion readings that advance unevenly, day by day

The 15 split 5 / 5 / 5 across finishing FASTER than estimate, ON estimate, and
OVER — so the resulting GLPA and GLPMDA span the full range.

STAGING ONLY. The project ref is asserted before anything is written.
Re-runnable: it deletes its own Test TesterN rows first, and touches nothing else.

Usage:  python3 scripts/seed-test-jobs.py [--wipe]
"""
import json
import math
import os
import random
import subprocess
import sys
import time
import uuid
from datetime import date, timedelta

STAGING = "fgyexksqinjczebtsuon"
PRODUCTION = "jjlnpywpmoukgwmwczbz"
TENANT = "c0751d17-5013-4245-a41b-81263f77c0b0"  # DemoScape

if STAGING == PRODUCTION:  # pragma: no cover - guard against a bad edit
    sys.exit("refusing to run: staging and production refs match")

TOKEN = open(os.path.expanduser("~/.supabase/access-token")).read().strip()
random.seed(20260904)  # deterministic, so a re-run reproduces the same jobs


def sql(query, project=STAGING):
    """One statement or many. Retries on the Management API's rate limiter."""
    if project == PRODUCTION:
        sys.exit("refusing to write to production")
    wait = 1.0
    for attempt in range(7):
        out = subprocess.run(
            ["curl", "-s", "-X", "POST",
             "-H", f"Authorization: Bearer {TOKEN}",
             "-H", "Content-Type: application/json",
             "--data-binary", json.dumps({"query": query}),
             f"https://api.supabase.com/v1/projects/{project}/database/query"],
            capture_output=True, text=True).stdout
        try:
            parsed = json.loads(out)
        except json.JSONDecodeError:
            sys.exit(f"unparseable response: {out[:400]}")
        if isinstance(parsed, dict) and parsed.get("message"):
            msg = parsed["message"]
            if "Too Many Requests" in msg or "Throttler" in msg:
                time.sleep(wait + random.random() * 0.4)
                wait *= 2
                continue
            sys.exit(f"SQL failed: {msg[:500]}\n\n{query[:400]}")
        return parsed
    sys.exit("gave up after repeated rate limiting")


def uid():
    """Generate ids locally so inserts never need RETURNING — which is what lets
    the whole seed go out as a handful of batched statements instead of ~500
    round trips, and stops the Management API throttling us."""
    return str(uuid.uuid4())


def q(v):
    """Quote a value for inline SQL."""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(round(v, 2))
    return "'" + str(v).replace("'", "''") + "'"


MODULE_TYPES = [
    "Concrete", "Paver", "Walls", "Columns", "Steps", "Drainage", "Irrigation",
    "Planting", "Lighting", "Artificial Turf", "Outdoor Kitchen", "Fire Pit",
    "Finishes", "Ground Treatments", "Hand Demo", "Skid Steer Demo",
    "Mini Skid Steer Demo", "Utilities", "Weed Abatement", "Pool",
]
CREW_TYPES = ["Masonry", "Demolition", "Paver", "Landscape", "Specialty"]
PROJECT_NAMES = ["Front Yard", "Back Yard", "Side Yard", "Pool Deck", "Driveway", "Entry Court"]

# name, man-day multiplier applied to the estimate, overtime hours per crew day
SCENARIOS = (
    [("faster", round(random.uniform(0.80, 0.92), 3), 0)] * 5
    + [("on estimate", round(random.uniform(0.99, 1.01), 3), 0)] * 5
    + [("over", round(random.uniform(1.15, 1.40), 3), random.choice([0, 1, 2]))] * 5
)


def wipe():
    """Remove everything this script created, and nothing else."""
    sql(f"""
    with c as (select id from public.clients
               where tenant_id = {q(TENANT)} and name like 'Test Tester%'
                 and name ~ '^Test Tester[0-9]+$'),
         j as (select id from public.jobs where client_id in (select id from c)),
         e as (select id from public.estimates where client_id in (select id from c))
    delete from public.time_entries where job_id in (select id from j);
    """)
    for stmt in [
        "delete from public.module_completion where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$'))" % q(TENANT),
        "delete from public.schedule_items where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$'))" % q(TENANT),
        "delete from public.work_orders where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$'))" % q(TENANT),
        "delete from public.jobs where client_id in (select id from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$')" % q(TENANT),
        "delete from public.estimates where client_id in (select id from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$')" % q(TENANT),
        "delete from public.clients where tenant_id = %s and name ~ '^Test Tester[0-9]+$'" % q(TENANT),
    ]:
        sql(stmt)


def crews_with_members():
    """Crews with their members as {id, name} — time_entries.employee_name is NOT NULL."""
    rows = sql(f"""
      select c.id, c.label,
             coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name',
                       trim(coalesce(e.first_name,'') || ' ' || coalesce(e.last_name,'')))
                      ) filter (where e.id is not null), '[]'::jsonb) members
      from public.crews c
      left join public.employees e
        on e.id in (c.crew_chief_id, c.journeyman_id, c.laborer_1_id,
                    c.laborer_2_id, c.laborer_3_id)
      where c.tenant_id = {q(TENANT)}
      group by c.id, c.label
      order by c.label;
    """)
    return [r for r in rows if r["members"]]


def workdays(start, count):
    """`count` weekdays from `start` inclusive."""
    out, d = [], start
    while len(out) < count:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def main():
    crews = crews_with_members()
    if not crews:
        sys.exit("no crews with members found on the DemoScape tenant")
    cfg = sql(f"""select avg_hourly_crew_rate h, labor_burden_pct b
                  from public.company_settings where tenant_id={q(TENANT)}""")[0]
    hourly, burden_pct = float(cfg["h"]), float(cfg["b"])

    wipe()
    print("cleared any previous Test TesterN data")

    # Everything is accumulated in memory with locally-generated ids, then written
    # as one batched statement per table. Nine round trips instead of ~500.
    rows = {k: [] for k in ("clients", "estimates", "projects", "modules", "jobs",
                            "work_orders", "schedule_items", "time_entries",
                            "completions")}
    summary = []

    for n in range(1, 16):
        scenario, multiplier, ot_per_day = SCENARIOS[n - 1]
        gpmd = random.choice([400, 425, 450, 475, 500, 525, 550])
        name = f"Test Tester{n}"
        client_id, estimate_id, job_id = uid(), uid(), uid()

        rows["clients"].append(
            f"({q(client_id)}, {q(name)}, 'Test', {q(f'Tester{n}')}, "
            f"{q(f'test.tester{n}@example.invalid')}, '555-01{n:02d}', 'active', "
            f"'individual', {q(TENANT)})")
        rows["estimates"].append(
            f"({q(estimate_id)}, {q(name + chr(32) + chr(8212) + ' Landscape Package')}, "
            f"{q(client_id)}, {q(name)}, 'sold', {q(TENANT)})")

        picked = random.sample(MODULE_TYPES, 6)
        job_md = job_glpe = job_price = 0.0
        modules = []

        for p in range(2):
            project_id = uid()
            rows["projects"].append(
                f"({q(project_id)}, {q(estimate_id)}, {q(PROJECT_NAMES[p])}, {p + 1}, "
                f"{gpmd}, 0.45, 0, {q(TENANT)})")

            for m in range(3):
                mtype = picked[p * 3 + m]
                module_id = uid()
                emd = round(random.uniform(3, 10), 1)
                glpe = round(emd * gpmd, 2)
                labor_cost = round(emd * 8 * hourly, 2)
                burden = round(labor_cost * burden_pct, 2)
                material = round(random.uniform(400, 7500), 2)
                sub_cost = round(random.uniform(1200, 6000), 2) if random.random() < 0.35 else 0.0
                sub_gp = round(sub_cost * 0.45, 2)
                commission = round((glpe + sub_gp) * 0.12, 2)
                price = round(labor_cost + burden + material + sub_cost + glpe + sub_gp + commission, 2)
                data = json.dumps({"gpmd": gpmd, "subGpMarkupRate": 0.45,
                                   "materialGpMarkupRate": 0,
                                   "calc": {"gp": glpe, "subGp": sub_gp,
                                            "commission": commission, "price": price,
                                            "laborCost": labor_cost, "burden": burden,
                                            "subCost": sub_cost,
                                            "totalHrs": round(emd * 8, 2)}})
                rows["modules"].append(
                    f"({q(module_id)}, {q(project_id)}, {q(mtype)}, {q(mtype)}, {emd}, "
                    f"{material}, {labor_cost}, {burden}, {glpe}, {sub_cost}, {price}, "
                    f"{q(data)}::jsonb, {q(TENANT)})")
                modules.append({"id": module_id, "type": mtype, "emd": emd, "glpe": glpe,
                                "project": PROJECT_NAMES[p], "material": material,
                                "sub_cost": sub_cost, "labor_cost": labor_cost,
                                "burden": burden, "price": price, "sub_gp": sub_gp})
                job_md += emd
                job_glpe += glpe
                job_price += price

        start_date = date.today() - timedelta(days=random.randint(30, 70))
        rows["jobs"].append(
            f"({q(job_id)}, {q(name + chr(32) + chr(8212) + ' Landscape Package')}, "
            f"{q(client_id)}, {q(name)}, {q(estimate_id)}, 'active', "
            f"{q(start_date - timedelta(days=14))}, {q(start_date)}, {q(start_date)}, "
            f"{round(job_md, 2)}, {round(job_glpe, 2)}, {gpmd}, {round(job_price, 2)}, "
            f"{round(sum(m['material'] for m in modules), 2)}, "
            f"{round(sum(m['sub_cost'] for m in modules), 2)}, "
            f"{q(f'{100 + n} Test Street')}, 'Los Angeles', 'CA', '90001', {q(TENANT)})")

        cursor = start_date
        actual_md_total = 0.0
        for mi, mod in enumerate(modules):
            crew = crews[(n + mi) % len(crews)]
            crew_size = len(crew["members"])
            actual_md = mod["emd"] * multiplier
            days = max(1, math.ceil(actual_md / crew_size))
            dates = workdays(cursor, days)
            cursor = dates[-1] + timedelta(days=1)
            wo_id = uid()
            actual_md_total += actual_md

            rows["work_orders"].append(
                f"({q(wo_id)}, {q(job_id)}, {q(mod['id'])}, {q(mod['project'])}, "
                f"{q(mod['type'])}, false, {mod['emd']}, {round(mod['emd'] * 8, 2)}, "
                f"{mod['material']}, {mod['sub_cost']}, {mod['labor_cost']}, {mod['burden']}, "
                f"{mod['price']}, 'complete', {q(random.choice(CREW_TYPES))}, "
                f"{q(crew['id'])}, {q(TENANT)})")
            rows["schedule_items"].append(
                f"({q(uid())}, {q(job_id)}, {q(mod['type'] + ' ' + chr(8212) + ' ' + mod['project'])}, "
                f"{q(crew['id'])}, {q(dates[0])}, {q(dates[-1])}, {len(dates)}, "
                f"array[{q(wo_id)}]::uuid[], 'crew', {q(TENANT)})")

            # A standard day is 07:00–15:00 = EIGHT hours. Using 16:00 made every
            # ordinary day 9h, i.e. 8 standard + 1 overtime, which quietly
            # inflated cost on every job and made even the fast ones look over.
            # The final day is shortened so the job's total man-days land on the
            # scenario's target instead of rounding up to whole crew-days.
            target_hours = actual_md * 8
            full_days = len(dates) - 1
            used = full_days * crew_size * (8 + ot_per_day)
            last_each = max(1.0, min(8.0, (target_hours - used) / crew_size))
            for i, d in enumerate(dates):
                last = i == len(dates) - 1
                hours = last_each if last else 8 + ot_per_day
                end_h = 7 + int(hours)
                end_m = int(round((hours - int(hours)) * 60))
                for emp in crew["members"]:
                    rows["time_entries"].append(
                        f"({q(uid())}, {q(job_id)}, {q(emp['id'])}, "
                        f"{q(emp['name'] or 'Crew Member')}, {q(d)}, '07:00:00', "
                        f"'{end_h:02d}:{end_m:02d}:00', 'manual', {q(TENANT)})")

            # Uneven daily progress, always landing on 100 the final day.
            steps = sorted(random.sample(range(8, 96), max(0, len(dates) - 1))) + [100]
            for d, value in zip(dates, steps):
                rows["completions"].append(
                    f"({q(uid())}, {q(job_id)}, {q(mod['id'])}, {q(d)}, {value}, {q(TENANT)})")

        summary.append({"n": n, "client": name, "scenario": scenario,
                        "multiplier": multiplier, "ot": ot_per_day, "gpmd": gpmd,
                        "job_id": job_id, "emd": round(job_md, 1),
                        "actual_md": round(actual_md_total, 1),
                        "glpe": round(job_glpe, 2)})

    # ── Write, parents before children ───────────────────────────────────────
    batches = [
        ("clients", "insert into public.clients (id, name, first_name, last_name, email, phone, status, client_type, tenant_id) values "),
        ("estimates", "insert into public.estimates (id, estimate_name, client_id, client_name, status, tenant_id) values "),
        ("projects", "insert into public.estimate_projects (id, estimate_id, project_name, sort_order, gpmd_override, sub_gp_markup_rate, material_gp_markup_rate, tenant_id) values "),
        ("modules", "insert into public.estimate_modules (id, project_id, module_type, module_name, man_days, material_cost, labor_cost, labor_burden, gross_profit, sub_cost, total_price, data, tenant_id) values "),
        ("jobs", "insert into public.jobs (id, name, client_id, client_name, estimate_id, status, sold_date, projected_start, actual_start, total_man_days, gross_profit, gpmd, total_price, material_cost, sub_cost, job_address, job_city, job_state, job_zip, tenant_id) values "),
        ("work_orders", "insert into public.work_orders (id, job_id, estimate_module_id, project_name, module_type, is_subcontractor, man_days, labor_hours, material_cost, sub_cost, labor_cost, labor_burden, total_price, status, crew_type, scheduled_crew_id, tenant_id) values "),
        ("schedule_items", "insert into public.schedule_items (id, job_id, title, crew_id, start_date, end_date, work_days, work_order_ids, scheduling_type, tenant_id) values "),
        ("time_entries", "insert into public.time_entries (id, job_id, employee_id, employee_name, date, time_in, time_out, source, tenant_id) values "),
        ("completions", "insert into public.module_completion (id, job_id, estimate_module_id, entry_date, completion_pct, tenant_id) values "),
    ]
    for key, prefix in batches:
        values = rows[key]
        # Chunked so a single statement never gets unreasonably large.
        for i in range(0, len(values), 400):
            sql(prefix + ",".join(values[i:i + 400]) + ";")
        print(f"  {key:16}{len(values):>6} rows")

    print()
    for s in summary:
        print(f"  {s['client']:16}{s['scenario']:12}x{s['multiplier']:<6}"
              f"gpmd ${s['gpmd']}  est {s['emd']:>5} MD  "
              f"actual {s['actual_md']:>5} MD  GLPE ${s['glpe']:,.0f}")
    print(f"\nseeded {len(summary)} jobs on staging (DemoScape)")
    return summary


if __name__ == "__main__":
    main()
