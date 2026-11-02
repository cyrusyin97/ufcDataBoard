"""Build the SQLite fighter database from ufcstats.com.

Reuses the scraping utilities in scripts/scrape_ufcstats.py: lists fighter
profile links (one letter or all a-z), scrapes each profile, and loads the
result into three tables:

    fighters           one row per fighter profile (bio + career stats)
    events             one row per unique event name seen in fight histories
    fights             one row per (fight, fighter) perspective, linked to both
    fight_details      one row per fight (referee, judges, bout type, ...)
    fight_round_stats  one row per (fight, fighter, round); round 0 = totals

Re-runs upsert: fighters/fights replace on their stable ufcstats ids, events
dedupe on name. Fighters already in the DB are skipped (resume-friendly —
a full scrape interrupted halfway continues where it left off; pass
--refresh to re-scrape them instead). Each fighter commits in its own
transaction, so an interrupt never loses completed work.

Usage:
    python -m scripts.collector.build_db --char a --limit 10   # small sample
    python -m scripts.collector.build_db --all --estimate      # count + projected runtime, no profile scraping
    python -m scripts.collector.build_db --all                 # full fighter scrape (hours; resumable)
    python -m scripts.collector.build_db --fight-details       # per-round stats for fights already in the DB
"""
from __future__ import annotations

import argparse
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from .scrape_ufcstats import (
    FIGHT_ID_RE,
    REQUEST_DELAY_S,
    list_fighters,
    make_session,
    scrape_fight,
    scrape_fighter,
)

DEFAULT_DB = "work/collector/ufc.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS fighters (
    id           TEXT PRIMARY KEY,
    url          TEXT,
    name         TEXT NOT NULL,
    nickname     TEXT,
    wins         INTEGER,
    losses       INTEGER,
    draws        INTEGER,
    no_contests  INTEGER,
    height       TEXT,
    weight       TEXT,
    reach        TEXT,
    stance       TEXT,
    dob          TEXT,
    slpm         TEXT,
    str_acc      TEXT,
    sapm         TEXT,
    str_def      TEXT,
    td_avg       TEXT,
    td_acc       TEXT,
    td_def       TEXT,
    sub_avg      TEXT,
    scraped_at   TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT UNIQUE NOT NULL,
    date         TEXT,
    ufcstats_id  TEXT,
    location     TEXT,
    url          TEXT,
    status       TEXT
);

CREATE TABLE IF NOT EXISTS fights (
    id             TEXT NOT NULL,
    fighter_id     TEXT NOT NULL REFERENCES fighters(id),
    event_id       INTEGER REFERENCES events(id),
    opponent       TEXT,
    result         TEXT,
    method         TEXT,
    method_detail  TEXT,
    round          INTEGER,
    time           TEXT,
    kd             INTEGER,
    sig_str        INTEGER,
    td             INTEGER,
    sub_att        INTEGER,
    fight_url      TEXT,
    PRIMARY KEY (id, fighter_id)
);

CREATE TABLE IF NOT EXISTS fight_details (
    id           TEXT PRIMARY KEY,
    url          TEXT,
    event        TEXT,
    bout_type    TEXT,
    method       TEXT,
    end_round    INTEGER,
    end_time     TEXT,
    time_format  TEXT,
    referee      TEXT,
    details      TEXT,
    scraped_at   TEXT
);

-- One row per (fight, fighter, round); round 0 holds the fight-level totals.
CREATE TABLE IF NOT EXISTS fight_round_stats (
    fight_id            TEXT NOT NULL REFERENCES fight_details(id),
    fighter_id          TEXT NOT NULL,
    round               INTEGER NOT NULL,
    kd                  INTEGER,
    sig_landed          INTEGER,
    sig_attempted       INTEGER,
    total_landed        INTEGER,
    total_attempted     INTEGER,
    td_landed           INTEGER,
    td_attempted        INTEGER,
    sub_att             INTEGER,
    reversals           INTEGER,
    ctrl_seconds        INTEGER,
    head_landed         INTEGER,
    head_attempted      INTEGER,
    body_landed         INTEGER,
    body_attempted      INTEGER,
    leg_landed          INTEGER,
    leg_attempted       INTEGER,
    distance_landed     INTEGER,
    distance_attempted  INTEGER,
    clinch_landed       INTEGER,
    clinch_attempted    INTEGER,
    ground_landed       INTEGER,
    ground_attempted    INTEGER,
    PRIMARY KEY (fight_id, fighter_id, round)
);

CREATE INDEX IF NOT EXISTS idx_fighters_name ON fighters(name);
CREATE INDEX IF NOT EXISTS idx_fights_event  ON fights(event_id);
CREATE INDEX IF NOT EXISTS idx_round_stats_fighter ON fight_round_stats(fighter_id);
"""

ROUND_STAT_COLUMNS = (
    "kd", "sig_landed", "sig_attempted", "total_landed", "total_attempted",
    "td_landed", "td_attempted", "sub_att", "reversals", "ctrl_seconds",
    "head_landed", "head_attempted", "body_landed", "body_attempted",
    "leg_landed", "leg_attempted", "distance_landed", "distance_attempted",
    "clinch_landed", "clinch_attempted", "ground_landed", "ground_attempted",
)

FIGHTER_COLUMNS = (
    "id", "url", "name", "nickname", "wins", "losses", "draws", "no_contests",
    "height", "weight", "reach", "stance", "dob", "slpm", "str_acc", "sapm",
    "str_def", "td_avg", "td_acc", "td_def", "sub_avg",
)


BOUTS_VIEW = """
CREATE VIEW bouts AS
SELECT
    a.id                AS fight_id,
    a.event_id,
    a.fighter_id        AS fighter1_id,
    fa.name             AS fighter1_name,
    b.fighter_id        AS fighter2_id,
    fb.name             AS fighter2_name,
    a.result            AS fighter1_result,
    b.result            AS fighter2_result,
    CASE WHEN a.result = 'win' THEN a.fighter_id
         WHEN b.result = 'win' THEN b.fighter_id END AS winner_id,
    a.method, a.method_detail, a.round, a.time,
    a.kd  AS fighter1_kd,      b.kd  AS fighter2_kd,
    a.sig_str AS fighter1_sig_str, b.sig_str AS fighter2_sig_str,
    a.td  AS fighter1_td,      b.td  AS fighter2_td,
    a.sub_att AS fighter1_sub_att, b.sub_att AS fighter2_sub_att
FROM fights a
JOIN fights b ON b.id = a.id AND a.fighter_id < b.fighter_id
LEFT JOIN fighters fa ON fa.id = a.fighter_id
LEFT JOIN fighters fb ON fb.id = b.fighter_id
"""


def _migrate(conn: sqlite3.Connection) -> None:
    """Additive migrations for DBs created before newer columns existed."""
    event_cols = {row[1] for row in conn.execute("PRAGMA table_info(events)")}
    for col in ("ufcstats_id", "location", "url", "status"):
        if col not in event_cols:
            conn.execute(f"ALTER TABLE events ADD COLUMN {col} TEXT")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_events_ufcstats_id ON events(ufcstats_id)"
    )
    # Bout-grain view over the two perspective rows. Dropped and recreated on
    # every open so definition changes propagate to existing DBs.
    conn.execute("DROP VIEW IF EXISTS bouts")
    conn.execute(BOUTS_VIEW)


def open_db(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    _migrate(conn)
    conn.commit()
    return conn


def _int(value: str) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def upsert_event(conn: sqlite3.Connection, name: str, date: str) -> int | None:
    if not name:
        return None
    conn.execute(
        "INSERT INTO events (name, date) VALUES (?, ?) "
        "ON CONFLICT(name) DO UPDATE SET date = COALESCE(excluded.date, date)",
        (name, date or None),
    )
    row = conn.execute("SELECT id FROM events WHERE name = ?", (name,)).fetchone()
    return row[0]


def load_fighter(conn: sqlite3.Connection, profile: dict) -> int:
    """Insert one scraped profile (fighter + its events + fights). Returns fight count."""
    values = [profile.get(col) for col in FIGHTER_COLUMNS]
    values.append(datetime.now(timezone.utc).isoformat(timespec="seconds"))
    placeholders = ", ".join("?" * (len(FIGHTER_COLUMNS) + 1))
    conn.execute(
        f"INSERT OR REPLACE INTO fighters ({', '.join(FIGHTER_COLUMNS)}, scraped_at) "
        f"VALUES ({placeholders})",
        values,
    )

    fights = profile.get("fights", [])
    for fight in fights:
        id_match = FIGHT_ID_RE.search(fight.get("fight_url", ""))
        if not id_match:
            continue
        event_id = upsert_event(conn, fight.get("event", ""), fight.get("date", ""))
        conn.execute(
            "INSERT OR REPLACE INTO fights "
            "(id, fighter_id, event_id, opponent, result, method, method_detail, "
            " round, time, kd, sig_str, td, sub_att, fight_url) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                id_match.group(1),
                profile["id"],
                event_id,
                fight.get("opponent"),
                fight.get("result"),
                fight.get("method"),
                fight.get("method_detail"),
                _int(fight.get("round")),
                fight.get("time"),
                _int(fight.get("kd")),
                _int(fight.get("sig_str")),
                _int(fight.get("td")),
                _int(fight.get("sub_att")),
                fight.get("fight_url"),
            ),
        )
    return len(fights)


def load_fight_details(conn: sqlite3.Connection, details: dict) -> int:
    """Insert one parsed fight-details page. Returns round-stat row count."""
    conn.execute(
        "INSERT OR REPLACE INTO fight_details "
        "(id, url, event, bout_type, method, end_round, end_time, time_format, "
        " referee, details, scraped_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            details["id"],
            details.get("url"),
            details.get("event"),
            details.get("bout_type"),
            details.get("method"),
            details.get("end_round"),
            details.get("end_time"),
            details.get("time_format"),
            details.get("referee"),
            details.get("details"),
            datetime.now(timezone.utc).isoformat(timespec="seconds"),
        ),
    )
    placeholders = ", ".join("?" * (len(ROUND_STAT_COLUMNS) + 3))
    for rs in details.get("round_stats", []):
        conn.execute(
            f"INSERT OR REPLACE INTO fight_round_stats "
            f"(fight_id, fighter_id, round, {', '.join(ROUND_STAT_COLUMNS)}) "
            f"VALUES ({placeholders})",
            [details["id"], rs["fighter_id"], rs["round"]]
            + [rs.get(col) for col in ROUND_STAT_COLUMNS],
        )
    return len(details.get("round_stats", []))


AVG_FETCH_S = 0.6  # rough per-request network+parse time, for --estimate


def _collect_links(session, chars: list[str], delay: float) -> list:
    """List fighter links for each letter, deduped by fighter id."""
    links = []
    for i, char in enumerate(chars):
        fighters = list_fighters(session, char)
        links.extend(fighters)
        print(f"[{char}] {len(fighters)} fighters listed", file=sys.stderr)
        if i < len(chars) - 1:
            time.sleep(delay)
    seen: set[str] = set()
    return [l for l in links if not (l.id in seen or seen.add(l.id))]


def _run_scrape(conn, session, urls, delay, scrape_one, load_one, describe) -> list:
    """Fetch+load each URL with one retry; commit per item; return failures."""
    failures: list[tuple[str, str]] = []
    for i, url in enumerate(urls):
        time.sleep(delay)
        try:
            parsed = scrape_one(session, url)
        except Exception:
            time.sleep(5)  # brief back-off, then one retry
            try:
                parsed = scrape_one(session, url)
            except Exception as exc:
                failures.append((url, str(exc)))
                print(f"  [{i + 1}/{len(urls)}] FAILED {url}: {exc}", file=sys.stderr)
                continue
        with conn:
            count = load_one(conn, parsed)
        if len(urls) <= 30 or (i + 1) % 25 == 0 or i + 1 == len(urls):
            print(f"  [{i + 1}/{len(urls)}] {describe(parsed, count)}", file=sys.stderr)
    return failures


def _print_estimate(listed: int, todo: int, extra_requests: int, delay: float, what: str) -> None:
    secs = todo * (delay + AVG_FETCH_S)
    print(f"{listed} {what} found, {listed - todo} already in DB or over --limit, {todo} to scrape.")
    print(
        f"Estimated: {extra_requests + todo} HTTP requests, "
        f"~{secs / 3600:.1f} h at {delay}s delay + ~{AVG_FETCH_S}s/fetch."
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scrape ufcstats into a SQLite database.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--char", help="Single listing letter to pull fighters from.")
    group.add_argument("--all", action="store_true", help="All letters a-z (full fighter scrape).")
    group.add_argument(
        "--fight-details", action="store_true",
        help="Scrape per-round stats for fights already in the DB (run after a fighter scrape).",
    )
    parser.add_argument("--limit", type=int, help="Max pages to scrape (default: no limit).")
    parser.add_argument("--db", default=DEFAULT_DB, help=f"SQLite path (default {DEFAULT_DB}).")
    parser.add_argument(
        "--delay", type=float, default=REQUEST_DELAY_S,
        help=f"Seconds between requests (default {REQUEST_DELAY_S}; be polite).",
    )
    parser.add_argument(
        "--estimate", action="store_true",
        help="Only count pending work and project runtime; scrape no stat pages.",
    )
    parser.add_argument(
        "--refresh", action="store_true",
        help="Re-scrape items already in the DB (default: skip them).",
    )
    args = parser.parse_args(argv)

    session = make_session()
    conn = open_db(args.db)
    try:
        if args.fight_details:
            rows = conn.execute(
                "SELECT DISTINCT id, fight_url FROM fights WHERE fight_url != ''"
            ).fetchall()
            done: set[str] = (
                set() if args.refresh
                else {r[0] for r in conn.execute("SELECT id FROM fight_details")}
            )
            urls = [url for fid, url in rows if fid not in done]
            if args.limit is not None:
                urls = urls[: args.limit]
            if args.estimate:
                _print_estimate(len(rows), len(urls), 0, args.delay, "fights in DB")
                return 0
            print(f"Scraping {len(urls)} fight-details pages into {args.db}", file=sys.stderr)
            failures = _run_scrape(
                conn, session, urls, args.delay, scrape_fight, load_fight_details,
                lambda d, n: f"{d['event']} — {d.get('method')} ({n} stat rows)",
            )
        else:
            chars = (
                [chr(c) for c in range(ord("a"), ord("z") + 1)]
                if args.all else [args.char.lower()]
            )
            links = _collect_links(session, chars, args.delay)
            existing: set[str] = (
                set() if args.refresh
                else {row[0] for row in conn.execute("SELECT id FROM fighters")}
            )
            todo = [l for l in links if l.id not in existing]
            if args.limit is not None:
                todo = todo[: args.limit]
            if args.estimate:
                _print_estimate(len(links), len(todo), len(chars), args.delay, "fighters listed")
                return 0
            print(f"Scraping {len(todo)} fighter profiles into {args.db}", file=sys.stderr)
            failures = _run_scrape(
                conn, session, [l.url for l in todo], args.delay, scrape_fighter, load_fighter,
                lambda p, n: f"{p['name']}: {n} fights",
            )
        counts = {
            table: conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("fighters", "events", "fights", "fight_details", "fight_round_stats")
        }
    finally:
        conn.close()

    print(f"Done. {args.db}: " + ", ".join(f"{n} {t}" for t, n in counts.items()))
    if failures:
        print(f"{len(failures)} pages failed (re-run to retry — they were skipped):")
        for url, err in failures:
            print(f"  {url}  {err}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
