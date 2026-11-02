"""Weekly incremental updater: upsert the latest completed events into SQLite.

The full scrape (build_db --all / --fight-details) is fighter-centric and
skips fighters already in the DB, so it never notices an existing fighter's
NEW fight. This updater is event-centric instead: the completed-events
listing is a date-ordered change feed (~25 newest events, spanning months).

Reconciliation, per listed event:
  - already marked completed in the DB          -> skip (no requests)
  - all its fights + details already ingested   -> just record the listing
    metadata (location, ufcstats id) and mark completed (no requests)
  - otherwise -> fetch the event page, re-scrape the profile of every fighter
    on the card (updates records and inserts the new fight rows; debut
    fighters appear automatically), scrape the missing fight-details pages,
    then mark completed.

Idempotent and self-healing: a typical week costs ~40-60 requests for one
event, a quiet week costs 1, and a missed month is caught on the next run
because the listing spans months. Failures leave the event un-marked, so
the next run retries it.

Usage:
    python -m scripts.collector.update_db                 # weekly run (also via CI cron)
    python -m scripts.collector.update_db --limit 5       # only consider the 5 newest
"""
from __future__ import annotations

import argparse
import re
import sqlite3
import sys
import time
from datetime import datetime

from . import scrape_ufcstats as scraper
from .build_db import DEFAULT_DB, load_fight_details, load_fighter, open_db


def _norm_date(text: str) -> str:
    """'July 18, 2026' (event pages) -> 'Jul. 18, 2026' (DB convention)."""
    try:
        dt = datetime.strptime(text.strip(), "%B %d, %Y")
    except ValueError:
        return text.strip()
    return f"{dt:%b}. {dt:%d}, {dt:%Y}"


def _event_row(conn: sqlite3.Connection, listed: dict) -> sqlite3.Row | None:
    row = conn.execute(
        "SELECT * FROM events WHERE ufcstats_id = ?", (listed["id"],)
    ).fetchone()
    if row is None:
        row = conn.execute(
            "SELECT * FROM events WHERE name = ?", (listed["name"],)
        ).fetchone()
    return row


def _missing_details(conn: sqlite3.Connection, fight_ids) -> list[str]:
    return [
        fid
        for fid in fight_ids
        if conn.execute("SELECT 1 FROM fight_details WHERE id = ?", (fid,)).fetchone()
        is None
    ]


def _mark_completed(conn: sqlite3.Connection, listed: dict) -> None:
    """Upsert the listing metadata onto the events row and mark it completed."""
    conn.execute(
        "INSERT INTO events (name, date) VALUES (?, ?) "
        "ON CONFLICT(name) DO NOTHING",
        (listed["name"], _norm_date(listed["date"])),
    )
    conn.execute(
        "UPDATE events SET ufcstats_id = ?, location = ?, url = ?, "
        "status = 'completed', date = ? WHERE name = ?",
        (
            listed["id"],
            listed["location"],
            listed["url"],
            _norm_date(listed["date"]),
            listed["name"],
        ),
    )


def ingest_event(conn: sqlite3.Connection, session, listed: dict, delay: float) -> dict:
    """Full ingest of one event: card fighters' profiles + missing fight details."""
    page = scraper.scrape_event(session, listed["url"])
    fight_ids = [b["fight_id"] for b in page["bouts"]]
    card_fighters = {f["id"]: f["name"] for b in page["bouts"] for f in b["fighters"]}

    counts = {"fighters": 0, "details": 0}
    for fighter_id in card_fighters:
        time.sleep(delay)
        profile = scraper.scrape_fighter(
            session, scraper.FIGHTER_URL.format(id=fighter_id)
        )
        with conn:
            load_fighter(conn, profile)
        counts["fighters"] += 1

    for fight_id in _missing_details(conn, fight_ids):
        time.sleep(delay)
        details = scraper.scrape_fight(
            session, f"{scraper.BASE}/fight-details/{fight_id}"
        )
        with conn:
            load_fight_details(conn, details)
        counts["details"] += 1

    with conn:
        _mark_completed(conn, listed)
    return counts


def reconcile(conn: sqlite3.Connection, session, listed_events: list[dict],
              delay: float = scraper.REQUEST_DELAY_S) -> dict:
    """Bring the DB up to date with the completed-events listing."""
    summary = {
        "checked": len(listed_events), "already_current": 0, "marked": 0,
        "ingested": 0, "fighters": 0, "details": 0, "failures": [],
    }
    for listed in listed_events:
        row = _event_row(conn, listed)
        if row is not None and row["status"] == "completed":
            summary["already_current"] += 1
            continue

        # Local completeness check: after a full scrape the DB already holds
        # every bout; if nothing is missing, marking it costs zero requests.
        known_fights = (
            [r["id"] for r in conn.execute(
                "SELECT id FROM fights WHERE event_id = ?", (row["id"],)
            )]
            if row is not None
            else []
        )
        if known_fights and not _missing_details(conn, set(known_fights)):
            with conn:
                _mark_completed(conn, listed)
            summary["marked"] += 1
            print(f"  marked current: {listed['name']}", file=sys.stderr)
            continue

        print(f"  ingesting: {listed['name']} ({listed['date']})", file=sys.stderr)
        try:
            counts = ingest_event(conn, session, listed, delay)
        except Exception as exc:  # noqa: BLE001 — keep going; retried next run
            summary["failures"].append((listed["name"], str(exc)))
            print(f"  FAILED {listed['name']}: {exc}", file=sys.stderr)
            continue
        summary["ingested"] += 1
        summary["fighters"] += counts["fighters"]
        summary["details"] += counts["details"]
    return summary


def repair_perspectives(conn, session, delay= scraper.REQUEST_DELAY_S, max_requests=64):
    """Close newly discovered histories using source IDs, with bounded requests.

    A debut fighter profile can introduce older DWCS bouts outside the completed
    UFC listing. Fetch the missing opponent's real profile; never synthesize it.
    """
    counts = {"fights": 0, "profiles": 0, "requests": 0}
    def request(fn, *args):
        if counts["requests"] >= max_requests:
            raise RuntimeError("History pairing request limit reached")
        time.sleep(delay)
        counts["requests"] += 1
        return fn(session, *args)
    while True:
        rows = conn.execute("SELECT id, COUNT(*) AS n FROM fights GROUP BY id HAVING COUNT(*) != 2").fetchall()
        if not rows:
            return counts
        for row in rows:
            fight_id = row["id"]
            current_count = conn.execute("SELECT COUNT(*) FROM fights WHERE id = ?", (fight_id,)).fetchone()[0]
            if current_count == 2:
                continue
            if current_count != 1:
                raise RuntimeError("Unexpected fight perspective count")
            details = request(scraper.scrape_fight, f"{scraper.BASE}/fight-details/{fight_id}")
            participants = {f["id"] for f in details.get("fighters", [])}
            known = {r[0] for r in conn.execute("SELECT fighter_id FROM fights WHERE id = ?", (fight_id,))}
            if details.get("id") != fight_id or len(participants) != 2 or not known < participants or any(not re.fullmatch("[a-f0-9]{16}", fid) for fid in participants):
                raise RuntimeError("Source fight identity mismatch during history pairing")
            for fid in participants - known:
                profile = request(scraper.scrape_fighter, scraper.FIGHTER_URL.format(id=fid))
                if profile.get("id") != fid:
                    raise RuntimeError("Source opponent identity mismatch")
                with conn:
                    load_fighter(conn, profile)
                counts["profiles"] += 1
            if conn.execute("SELECT COUNT(*) FROM fights WHERE id = ?", (fight_id,)).fetchone()[0] != 2:
                raise RuntimeError("Source profile did not close the fight pairing")
            with conn:
                load_fight_details(conn, details)
            counts["fights"] += 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Upsert the latest completed events.")
    parser.add_argument("--db", default=DEFAULT_DB, help=f"SQLite path (default {DEFAULT_DB}).")
    parser.add_argument(
        "--delay", type=float, default=scraper.REQUEST_DELAY_S,
        help="Seconds between requests.",
    )
    parser.add_argument("--limit", type=int, help="Only consider the N newest listed events.")
    parser.add_argument("--repair-limit", type=int, default=64, help="Maximum additional requests for history pairing")
    args = parser.parse_args(argv)
    if args.repair_limit < 1:
        parser.error("--repair-limit must be positive")

    session = scraper.make_session()
    listed = scraper.list_completed_events(session)
    if args.limit is not None:
        listed = listed[: args.limit]
    print(f"Listing: {len(listed)} recent completed events", file=sys.stderr)

    conn = open_db(args.db)
    try:
        summary = reconcile(conn, session, listed, args.delay)
        if not summary["failures"]:
            try:
                repaired = repair_perspectives(conn, session, args.delay, args.repair_limit)
                print(f"History pairing: {repaired}")
            except Exception as exc:
                summary["failures"].append(("history pairing", str(exc)))
    finally:
        conn.close()

    print(
        f"Checked {summary['checked']} events: {summary['already_current']} already "
        f"current, {summary['marked']} marked complete from local data, "
        f"{summary['ingested']} ingested ({summary['fighters']} fighter profiles, "
        f"{summary['details']} fight-detail pages)."
    )
    if summary["failures"]:
        print(f"{len(summary['failures'])} events failed (will retry next run):")
        for name, err in summary["failures"]:
            print(f"  {name}: {err}")
    return 1 if summary["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
