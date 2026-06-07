#!/usr/bin/env python3
"""
BT Auto-Exporter
================

Logs into BuilderTrend via Playwright (reusing the same auth flow as
bt-photo-download.py) and downloads CSV exports for the configured
reports into scripts/bt-csv-inbox/. The inbox watcher
(bt-import-folder.py) then picks them up and feeds bt-import.py.

REPORTS is a registry of { report_key: ExportRecipe }. Each recipe
describes how to navigate to the report and trigger the export. Add a
new entry per report type once you've inspected BT's UI for that
report. Phase 1 ships with one wired-up report (jobsites_rollup); the
others are stubbed with a TODO so it's obvious what's outstanding.

Usage:
    python scripts/bt-auto-export.py                 # all enabled reports
    python scripts/bt-auto-export.py --only jobsites_rollup
    python scripts/bt-auto-export.py --headed        # show browser
    python scripts/bt-auto-export.py --list          # print the recipe table

Env (same .env as the photo downloader):
    BT_USER=...
    BT_PASS=...
"""

from __future__ import annotations

import argparse
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

try:
    from dotenv import load_dotenv
    from playwright.sync_api import (
        Page,
        TimeoutError as PWTimeout,
        sync_playwright,
    )
except ImportError:
    print(
        "Missing dependencies. Run:\n"
        "    pip install playwright requests python-dotenv\n"
        "    playwright install chromium"
    )
    sys.exit(1)

load_dotenv()

HERE = Path(__file__).resolve().parent
INBOX = HERE / "bt-csv-inbox"
LOG = HERE / "bt-auto-export.log"

BT_USER = os.getenv("BT_USER", "")
BT_PASS = os.getenv("BT_PASS", "")
BT_APP_BASE = os.getenv("BT_APP_URL", "https://buildertrend.net").rstrip("/")

NETWORK_TIMEOUT_MS = 45_000


def log(msg: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {msg}"
    print(line)
    try:
        with LOG.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass


# ── Login (re-uses the same flow as bt-photo-download.py) ──────────────────
def bt_login(page: Page) -> None:
    """Auth0 universal login → BT app."""
    page.goto(f"{BT_APP_BASE}/app/Login.aspx", timeout=NETWORK_TIMEOUT_MS)
    # The shared bt_login() in bt-photo-download.py is the source of truth;
    # importing it directly would couple the two scripts, so for now we
    # accept a tiny bit of duplication. If BT changes its login flow, fix
    # bt-photo-download.py first, then mirror the change here.
    page.wait_for_load_state("domcontentloaded")
    if "login.buildertrend.com" in (page.url or ""):
        try:
            page.fill("input[name='username']", BT_USER, timeout=NETWORK_TIMEOUT_MS)
            page.fill("input[name='password']", BT_PASS, timeout=NETWORK_TIMEOUT_MS)
            page.click("button[type='submit']", timeout=NETWORK_TIMEOUT_MS)
        except PWTimeout:
            raise RuntimeError("Login form selectors changed — update bt_login().")
    page.wait_for_url(lambda u: "/app/" in u and "Login" not in u, timeout=NETWORK_TIMEOUT_MS)
    log("Logged in.")


# ── Recipes ────────────────────────────────────────────────────────────────
@dataclass
class ExportRecipe:
    """One recipe per BT report type.

    enabled=False is the default for unwired reports so the scaffold ships
    in a runnable state — turn them on as you add the click flow.
    """
    key: str
    label: str
    filename_prefix: str  # how the saved CSV starts (suffixed with timestamp)
    enabled: bool = False
    run: Optional[Callable[[Page, Path], None]] = field(default=None, repr=False)


# ── Recipe: Jobsites Rollup (PHASE 1 — real implementation) ────────────────
def export_jobsites_rollup(page: Page, dest_dir: Path) -> None:
    """Download the Jobsites Rollup CSV.

    NOTE: BT's actual report URL and export-button selector vary by tenant.
    This implementation captures any CSV download fired from the Jobsites
    Rollup page. If selectors break, run with --headed to inspect, then
    update the locator below.
    """
    url = f"{BT_APP_BASE}/app/Reports/JobsitesRollup"
    log(f"  navigating to {url}")
    page.goto(url, timeout=NETWORK_TIMEOUT_MS, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle", timeout=NETWORK_TIMEOUT_MS)

    # Trigger the export. BT typically shows a "Export to CSV" or "Export"
    # button — try a few likely text matches in order.
    candidates = ["Export to CSV", "Export CSV", "Export", "Download CSV"]
    with page.expect_download(timeout=NETWORK_TIMEOUT_MS) as dl_info:
        for label in candidates:
            try:
                page.get_by_role("button", name=label, exact=False).first.click(
                    timeout=2_000,
                )
                break
            except PWTimeout:
                continue
        else:
            raise RuntimeError(
                "Could not find an Export button on Jobsites Rollup. "
                "Run with --headed to inspect, then update export_jobsites_rollup()."
            )
    download = dl_info.value
    suggested = download.suggested_filename or "jobsites-rollup.csv"
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_name = f"jobsites-rollup-{stamp}-{suggested}"
    out_path = dest_dir / out_name
    download.save_as(str(out_path))
    log(f"  saved {out_path.name}")


# ── Recipe: stubs for the other reports ───────────────────────────────────
def _stub(report_label: str) -> Callable[[Page, Path], None]:
    def run(page: Page, dest_dir: Path) -> None:
        raise RuntimeError(
            f"{report_label}: export recipe not wired up yet — see TODO in "
            "REPORTS. Inspect BT's UI for this report, then implement."
        )
    return run


REPORTS: dict[str, ExportRecipe] = {
    "jobsites_rollup": ExportRecipe(
        key="jobsites_rollup",
        label="Jobsites Rollup",
        filename_prefix="jobsites-rollup",
        enabled=True,
        run=export_jobsites_rollup,
    ),
    "schedule": ExportRecipe(
        key="schedule",
        label="Schedule",
        filename_prefix="schedule",
        enabled=False,
        run=_stub("Schedule"),
    ),
    "sales_rollup": ExportRecipe(
        key="sales_rollup",
        label="Sales Rollup",
        filename_prefix="sales-rollup",
        enabled=False,
        run=_stub("Sales Rollup"),
    ),
    "invoices_bills_pos": ExportRecipe(
        key="invoices_bills_pos",
        label="Invoices, Bills & POs",
        filename_prefix="invoices-bills-pos",
        enabled=False,
        run=_stub("Invoices, Bills & POs"),
    ),
    "qb_costs": ExportRecipe(
        key="qb_costs",
        label="QB Costs",
        filename_prefix="qb-costs",
        enabled=False,
        run=_stub("QB Costs"),
    ),
    "estimate_revised": ExportRecipe(
        key="estimate_revised",
        label="Estimate Revised",
        filename_prefix="estimate-revised",
        enabled=False,
        run=_stub("Estimate Revised"),
    ),
    "daily_logs": ExportRecipe(
        key="daily_logs",
        label="Daily Logs",
        filename_prefix="daily-logs",
        enabled=False,
        run=_stub("Daily Logs"),
    ),
}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", help="Run only this report key.")
    ap.add_argument("--headed", action="store_true",
                    help="Show the browser window (debugging).")
    ap.add_argument("--list", action="store_true",
                    help="Print the recipe table and exit.")
    args = ap.parse_args(argv)

    if args.list:
        for key, r in REPORTS.items():
            tag = "ENABLED" if r.enabled else "todo"
            print(f"  [{tag:8}] {key:24} {r.label}")
        return 0

    if not BT_USER or not BT_PASS:
        log("ERROR: BT_USER and BT_PASS must be set in .env.")
        return 1

    INBOX.mkdir(parents=True, exist_ok=True)

    if args.only:
        if args.only not in REPORTS:
            log(f"ERROR: unknown report '{args.only}'. Use --list to see options.")
            return 1
        targets = [REPORTS[args.only]]
    else:
        targets = [r for r in REPORTS.values() if r.enabled]

    if not targets:
        log("No enabled reports to export. Use --list to see what's available.")
        return 0

    log(f"Exporting {len(targets)} report(s): {[r.key for r in targets]}")

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=not args.headed)
        ctx = browser.new_context(accept_downloads=True)
        page = ctx.new_page()
        try:
            bt_login(page)
        except Exception as e:
            log(f"Login failed: {e}")
            browser.close()
            return 1

        ok = 0
        failed = 0
        for r in targets:
            log(f"→ {r.label}")
            try:
                if r.run is None:
                    raise RuntimeError(f"{r.label}: no run function")
                r.run(page, INBOX)
                ok += 1
            except Exception as e:
                log(f"  ✗ {e}")
                failed += 1

        browser.close()
        log(f"Done. {ok} exported, {failed} failed.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
