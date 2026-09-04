#!/usr/bin/env python3
"""
Seed two crew-assignment scenarios on STAGING.

Both jobs carry the same five modules:
    Concrete · Walls · Outdoor Kitchen   → Masonry, one crew
    Irrigation · Planting                → Landscape, a second crew

  "Test Scenario1 — Sequential"  the masonry crew works its three modules one
      after another, and the landscape crew works its two in parallel with them.
      This is the ordinary case: every hour belongs to exactly one module.

  "Test Scenario2 — Overlapping"  the masonry crew is scheduled on Concrete and
      Walls on the SAME days. The timeclock cannot say which of the two a given
      hour went to, so the engine splits evenly and flags the row apportioned.
      This is the case worth looking at — the split is an assumption, not a
      measurement.

Crews are picked for the work: the masonry modules go to a crew rated 4 in
Masonry, the landscape modules to one rated 4 in Landscape.

STAGING ONLY. Re-runnable; scoped to ^Test Scenario[0-9]+ and touches nothing else.
Usage:  python3 scripts/seed-scenario-jobs.py
"""
import json
import os
import subprocess
import sys
import time
import uuid
from datetime import date, timedelta

STAGING = "fgyexksqinjczebtsuon"
PRODUCTION = "jjlnpywpmoukgwmwczbz"
TENANT = "c0751d17-5013-4245-a41b-81263f77c0b0"
PATTERN = "^Test Scenario[0-9]+"

if STAGING == PRODUCTION:
    sys.exit("refusing to run: staging and production refs match")
TOKEN = open(os.path.expanduser("~/.supabase/access-token")).read().strip()


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
            sys.exit(f"unparseable response: {out[:300]}")
        if isinstance(parsed, dict) and parsed.get("message"):
            if "Too Many Requests" in parsed["message"] or "Throttler" in parsed["message"]:
                time.sleep(wait); wait *= 2; continue
            sys.exit(f"SQL failed: {parsed['message'][:400]}\n\n{query[:300]}")
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


# module, crew type, estimated man days
MODULES = [
    ("Concrete", "Masonry", 6.0),
    ("Walls", "Masonry", 9.0),
    ("Outdoor Kitchen", "Masonry", 7.5),
    ("Irrigation", "Landscape", 4.5),
    ("Planting", "Landscape", 5.0),
]
GPMD = 475


def wipe():
    for t in ("time_entries", "module_completion", "schedule_items", "work_orders"):
        sql(f"delete from public.{t} where job_id in (select id from public.jobs where client_id "
            f"in (select id from public.clients where tenant_id={q(TENANT)} and name ~ {q(PATTERN)}))")
    sql(f"delete from public.jobs where client_id in (select id from public.clients "
        f"where tenant_id={q(TENANT)} and name ~ {q(PATTERN)})")
    sql(f"delete from public.estimates where client_id in (select id from public.clients "
        f"where tenant_id={q(TENANT)} and name ~ {q(PATTERN)})")
    sql(f"delete from public.clients where tenant_id={q(TENANT)} and name ~ {q(PATTERN)}")


def best_crew(skill):
    """The crew rated highest in `skill`, with its members."""
    rows = sql(f"""
      select c.id, c.label,
             (select (s->>'level')::int from jsonb_array_elements(c.skills) s
               where s->>'type' = {q(skill)}) lvl,
             coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'name',
                 trim(coalesce(e.first_name,'') || ' ' || coalesce(e.last_name,''))))
                 filter (where e.id is not null), '[]'::jsonb) members
      from public.crews c
      left join public.employees e
        on e.id in (c.crew_chief_id, c.journeyman_id, c.laborer_1_id,
                    c.laborer_2_id, c.laborer_3_id)
      where c.tenant_id = {q(TENANT)}
      group by c.id, c.label, c.skills
      order by lvl desc nulls last, c.label
      limit 1;""")
    return rows[0]


def workdays(start, count):
    out, d = [], start
    while len(out) < count:
        if d.weekday() < 5:
            out.append(d)
        d += timedelta(days=1)
    return out


def main():
    cfg = sql(f"""select avg_hourly_crew_rate h, labor_burden_pct b
                  from public.company_settings where tenant_id={q(TENANT)}""")[0]
    hourly, burden_pct = float(cfg["h"]), float(cfg["b"])
    masonry, landscape = best_crew("Masonry"), best_crew("Landscape")
    print(f"  masonry work  → Crew {masonry['label']} (level {masonry['lvl']}), "
          f"{len(masonry['members'])} people")
    print(f"  landscape work → Crew {landscape['label']} (level {landscape['lvl']}), "
          f"{len(landscape['members'])} people")

    wipe()
    rows = {k: [] for k in ("clients", "estimates", "projects", "modules", "jobs",
                            "work_orders", "schedule_items", "time_entries", "completions")}

    for scenario in ("Sequential", "Overlapping"):
        name = f"Test Scenario{1 if scenario == 'Sequential' else 2}"
        client_id, estimate_id, job_id, project_id = uid(), uid(), uid(), uid()
        rows["clients"].append(
            f"({q(client_id)}, {q(name)}, 'Test', {q('Scenario' + scenario)}, "
            f"{q(name.lower().replace(' ', '') + '@example.invalid')}, '555-0300', 'active', "
            f"'individual', {q(TENANT)})")
        rows["estimates"].append(
            f"({q(estimate_id)}, {q(name + ' — ' + scenario)}, {q(client_id)}, {q(name)}, "
            f"'sold', {q(TENANT)})")
        rows["projects"].append(
            f"({q(project_id)}, {q(estimate_id)}, 'Back Yard', 1, {GPMD}, 0.45, 0, {q(TENANT)})")

        start = date.today() - timedelta(days=21)
        job_md = job_glpe = job_price = 0.0
        built = []
        for mtype, crew_type, emd in MODULES:
            module_id = uid()
            glpe = round(emd * GPMD, 2)
            labor_cost = round(emd * 8 * hourly, 2)
            burden = round(labor_cost * burden_pct, 2)
            material = round(emd * 420, 2)
            commission = round(glpe * 0.12, 2)
            price = round(labor_cost + burden + material + glpe + commission, 2)
            data = json.dumps({"gpmd": GPMD, "subGpMarkupRate": 0.45, "materialGpMarkupRate": 0,
                               "calc": {"gp": glpe, "subGp": 0, "commission": commission,
                                        "price": price, "laborCost": labor_cost,
                                        "burden": burden, "subCost": 0,
                                        "totalHrs": round(emd * 8, 2)}})
            rows["modules"].append(
                f"({q(module_id)}, {q(project_id)}, {q(mtype)}, {q(mtype)}, {emd}, {material}, "
                f"{labor_cost}, {burden}, {glpe}, 0, {price}, {q(data)}::jsonb, {q(TENANT)})")
            built.append({"id": module_id, "type": mtype, "crew_type": crew_type,
                          "emd": emd, "glpe": glpe, "material": material,
                          "labor_cost": labor_cost, "burden": burden, "price": price})
            job_md += emd; job_glpe += glpe; job_price += price

        rows["jobs"].append(
            f"({q(job_id)}, {q(name + ' — ' + scenario)}, {q(client_id)}, {q(name)}, "
            f"{q(estimate_id)}, 'active', {q(start - timedelta(days=7))}, {q(start)}, "
            f"{q(start)}, {round(job_md,2)}, {round(job_glpe,2)}, {GPMD}, {round(job_price,2)}, "
            f"{round(sum(m['material'] for m in built),2)}, 0, '300 Scenario Way', "
            f"'Los Angeles', 'CA', '90003', {q(TENANT)})")

        # Each crew walks its own modules from the same start date, so the two
        # crews run in parallel with each other — which is the real-world shape.
        cursor = {"Masonry": start, "Landscape": start}
        worked = {}
        for mod in built:
            crew = masonry if mod["crew_type"] == "Masonry" else landscape
            size = len(crew["members"])
            days = max(1, round(mod["emd"] / size))

            if scenario == "Overlapping" and mod["type"] in ("Concrete", "Walls"):
                # Both booked on the same window: the clock cannot tell them apart.
                dates = workdays(start, days)
            else:
                dates = workdays(cursor[mod["crew_type"]], days)
                cursor[mod["crew_type"]] = dates[-1] + timedelta(days=1)

            wo_id = uid()
            rows["work_orders"].append(
                f"({q(wo_id)}, {q(job_id)}, {q(mod['id'])}, 'Back Yard', {q(mod['type'])}, false, "
                f"{mod['emd']}, {round(mod['emd']*8,2)}, {mod['material']}, 0, {mod['labor_cost']}, "
                f"{mod['burden']}, {mod['price']}, 'complete', {q(mod['crew_type'])}, "
                f"{q(crew['id'])}, {q(TENANT)})")
            rows["schedule_items"].append(
                f"({q(uid())}, {q(job_id)}, {q(mod['type'] + ' — Back Yard')}, {q(crew['id'])}, "
                f"{q(dates[0])}, {q(dates[-1])}, {len(dates)}, array[{q(wo_id)}]::uuid[], "
                f"'crew', {q(TENANT)})")

            # Days worked are collected per CREW, not per module. A person
            # clocks one day however many modules they touched — writing an
            # entry per module would invent a second and third shift for the
            # same hours, which is what the overlap case is meant to test.
            for d in dates:
                worked.setdefault(crew["id"], {"crew": crew, "days": set()})["days"].add(d)

            steps = [round(100 * (i + 1) / len(dates)) for i in range(len(dates))]
            for d, value in zip(dates, steps):
                rows["completions"].append(
                    f"({q(uid())}, {q(job_id)}, {q(mod['id'])}, {q(d)}, {value}, {q(TENANT)})")

        # One shift per person per day the crew was on site.
        for entry in worked.values():
            for d in sorted(entry["days"]):
                for emp in entry["crew"]["members"]:
                    rows["time_entries"].append(
                        f"({q(uid())}, {q(job_id)}, {q(emp['id'])}, "
                        f"{q(emp['name'] or 'Crew Member')}, {q(d)}, '07:00:00', '15:00:00', "
                        f"'manual', {q(TENANT)})")

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
        if not rows[key]:
            continue
        for i in range(0, len(rows[key]), 400):
            sql(prefix + ",".join(rows[key][i:i + 400]) + ";")
        print(f"  {key:16}{len(rows[key]):>5} rows")
    print("\nseeded Test Scenario1 (sequential) and Test Scenario2 (overlapping)")


if __name__ == "__main__":
    main()
