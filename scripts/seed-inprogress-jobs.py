#!/usr/bin/env python3
"""
Seed 5 IN-PROGRESS jobs on STAGING — "Test Active1" … "Test Active5".

Unlike the Test TesterN set (all finished, all 100%), these are deliberately
unfinished so completion percentages can be typed in by hand and the numbers
watched moving:

  · work runs from ~2 weeks ago up to TODAY, so the grid opens on live data
    rather than needing the week navigator
  · modules are staged — the first are finished, the middle ones part-done, the
    last untouched at 0% — which is what a real job looks like mid-flight
  · one job has every module part-done at once, for the overlapping case
  · timeclock entries stop at today, so labour cost is real but incomplete

Nothing is at 100% overall. Type a percentage into any cell and the Gross Profit
Produced card, the day's gain and the Job total row all move.

STAGING ONLY. Re-runnable; scoped to ^Test Active[0-9]+$ and touches nothing else.
Usage:  python3 scripts/seed-inprogress-jobs.py
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
PATTERN = "^Test Active[0-9]+$"

if STAGING == PRODUCTION:
    sys.exit("refusing to run: staging and production refs match")

TOKEN = open(os.path.expanduser("~/.supabase/access-token")).read().strip()
random.seed(4090904)


def sql(query, project=STAGING):
    if project == PRODUCTION:
        sys.exit("refusing to write to production")
    wait = 1.0
    for _ in range(7):
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
    return str(uuid.uuid4())


def q(v):
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(round(v, 2))
    return "'" + str(v).replace("'", "''") + "'"


MODULE_TYPES = ["Concrete", "Paver", "Walls", "Columns", "Steps", "Drainage",
                "Irrigation", "Planting", "Lighting", "Artificial Turf",
                "Outdoor Kitchen", "Fire Pit", "Finishes", "Ground Treatments",
                "Hand Demo", "Skid Steer Demo", "Utilities", "Weed Abatement"]
CREW_TYPES = ["Masonry", "Demolition", "Paver", "Landscape", "Specialty"]
PROJECT_NAMES = ["Front Yard", "Back Yard"]

# Per job: how far along each of the 6 modules is. None = never started, so no
# reading at all rather than a stored zero.
# shape name, per-module completion (None = never started), labour efficiency.
# Efficiency multiplies the man-days a module SHOULD have used at its current
# completion: under 1.0 is running lean, over 1.0 is running long.
SHAPES = [
    ("sequential, two done", [100, 100, 55, None, None, None], 0.92),
    ("just started",         [40, None, None, None, None, None], 1.00),
    ("all overlapping",      [35, 50, 20, 45, 15, 30], 1.18),
    ("nearly finished",      [100, 100, 100, 100, 85, 60], 0.88),
    ("stalled mid-job",      [100, 70, 70, None, None, None], 1.30),
]


def wipe():
    for stmt in [
        f"delete from public.time_entries where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)}))",
        f"delete from public.module_completion where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)}))",
        f"delete from public.schedule_items where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)}))",
        f"delete from public.work_orders where job_id in (select id from public.jobs where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)}))",
        f"delete from public.jobs where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)})",
        f"delete from public.estimates where client_id in (select id from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)})",
        f"delete from public.clients where tenant_id = {q(TENANT)} and name ~ {q(PATTERN)}",
    ]:
        sql(stmt)


def crews_with_members():
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
      group by c.id, c.label order by c.label;""")
    return [r for r in rows if r["members"]]


def workdays_between(start, end):
    out, d = [], start
    while d <= end:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def main():
    crews = crews_with_members()
    if not crews:
        sys.exit("no crews with members on the DemoScape tenant")
    cfg = sql(f"""select avg_hourly_crew_rate h, labor_burden_pct b
                  from public.company_settings where tenant_id={q(TENANT)}""")[0]
    hourly, burden_pct = float(cfg["h"]), float(cfg["b"])

    wipe()
    print("cleared any previous Test ActiveN data")

    rows = {k: [] for k in ("clients", "estimates", "projects", "modules", "jobs",
                            "work_orders", "schedule_items", "time_entries",
                            "completions")}
    summary = []
    today = date.today()

    for n, (shape_name, shape, efficiency) in enumerate(SHAPES, start=1):
        gpmd = random.choice([425, 450, 475, 500, 525])
        name = f"Test Active{n}"
        client_id, estimate_id, job_id = uid(), uid(), uid()

        rows["clients"].append(
            f"({q(client_id)}, {q(name)}, 'Test', {q(f'Active{n}')}, "
            f"{q(f'test.active{n}@example.invalid')}, '555-02{n:02d}', 'active', "
            f"'individual', {q(TENANT)})")
        rows["estimates"].append(
            f"({q(estimate_id)}, {q(name + ' — In Progress')}, {q(client_id)}, "
            f"{q(name)}, 'sold', {q(TENANT)})")

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
                emd = round(random.uniform(4, 9), 1)
                glpe = round(emd * gpmd, 2)
                labor_cost = round(emd * 8 * hourly, 2)
                burden = round(labor_cost * burden_pct, 2)
                material = round(random.uniform(600, 6000), 2)
                sub_cost = round(random.uniform(1500, 5000), 2) if random.random() < 0.3 else 0.0
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
                                "burden": burden, "price": price})
                job_md += emd
                job_glpe += glpe
                job_price += price

        start = today - timedelta(days=16)
        rows["jobs"].append(
            f"({q(job_id)}, {q(name + ' — In Progress')}, {q(client_id)}, {q(name)}, "
            f"{q(estimate_id)}, 'active', {q(start - timedelta(days=10))}, {q(start)}, "
            f"{q(start)}, {round(job_md, 2)}, {round(job_glpe, 2)}, {gpmd}, "
            f"{round(job_price, 2)}, {round(sum(m['material'] for m in modules), 2)}, "
            f"{round(sum(m['sub_cost'] for m in modules), 2)}, "
            f"{q(f'{200 + n} Active Way')}, 'Los Angeles', 'CA', '90002', {q(TENANT)})")

        cursor = start
        for mi, mod in enumerate(modules):
            pct = shape[mi]
            crew = crews[(n * 2 + mi) % len(crews)]
            crew_size = len(crew["members"])
            span = max(1, math.ceil(mod["emd"] / crew_size))

            if shape_name == "all overlapping":
                # Every module runs across the same window, which is what makes
                # several rows advance on the same day.
                dates = workdays_between(start, today)[:span]
            else:
                dates = workdays_between(cursor, today)[:span]
                if dates:
                    cursor = dates[-1] + timedelta(days=1)
            if not dates:
                dates = [today]

            wo_id = uid()
            rows["work_orders"].append(
                f"({q(wo_id)}, {q(job_id)}, {q(mod['id'])}, {q(mod['project'])}, "
                f"{q(mod['type'])}, false, {mod['emd']}, {round(mod['emd'] * 8, 2)}, "
                f"{mod['material']}, {mod['sub_cost']}, {mod['labor_cost']}, {mod['burden']}, "
                f"{mod['price']}, {q('complete' if pct == 100 else 'in_progress')}, "
                f"{q(random.choice(CREW_TYPES))}, {q(crew['id'])}, {q(TENANT)})")
            rows["schedule_items"].append(
                f"({q(uid())}, {q(job_id)}, {q(mod['type'] + ' — ' + mod['project'])}, "
                f"{q(crew['id'])}, {q(dates[0])}, {q(dates[-1])}, {len(dates)}, "
                f"array[{q(wo_id)}]::uuid[], 'crew', {q(TENANT)})")

            # A module nobody has started has no hours and no readings.
            if pct is None:
                continue

            # Man-days burned so far = the share of the module that is done,
            # times the estimate, times how efficiently this job is running.
            target_hours = mod["emd"] * 8 * (pct / 100.0) * efficiency
            per_person_day = target_hours / (crew_size * len(dates))
            per_person_day = max(1.0, min(10.0, per_person_day))
            end_h = 7 + int(per_person_day)
            end_m = int(round((per_person_day - int(per_person_day)) * 60))
            if end_m == 60:
                end_h, end_m = end_h + 1, 0
            for d in dates:
                for emp in crew["members"]:
                    rows["time_entries"].append(
                        f"({q(uid())}, {q(job_id)}, {q(emp['id'])}, "
                        f"{q(emp['name'] or 'Crew Member')}, {q(d)}, '07:00:00', "
                        f"'{end_h:02d}:{end_m:02d}:00', 'manual', {q(TENANT)})")

            # Readings climb unevenly and stop at the module's current position,
            # leaving the last day(s) free to type into.
            steps = sorted(random.sample(range(5, max(6, pct)), max(0, len(dates) - 1)))
            steps = [s for s in steps if s < pct] + [pct]
            for d, value in zip(dates, steps):
                rows["completions"].append(
                    f"({q(uid())}, {q(job_id)}, {q(mod['id'])}, {q(d)}, {value}, {q(TENANT)})")

        done = [p for p in shape if p == 100]
        started = [p for p in shape if p is not None]
        summary.append({"name": name, "shape": shape_name, "gpmd": gpmd,
                        "emd": round(job_md, 1), "glpe": round(job_glpe, 2),
                        "done": len(done), "started": len(started)})

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
        if not values:
            continue
        for i in range(0, len(values), 400):
            sql(prefix + ",".join(values[i:i + 400]) + ";")
        print(f"  {key:16}{len(values):>6} rows")

    print()
    for s in summary:
        print(f"  {s['name']:15}{s['shape']:22}gpmd ${s['gpmd']}  {s['emd']:>5} MD  "
              f"GLPE ${s['glpe']:>9,.0f}   {s['done']}/6 done, {s['started']}/6 started")
    print(f"\nseeded {len(summary)} in-progress jobs on staging (DemoScape)")


if __name__ == "__main__":
    main()
