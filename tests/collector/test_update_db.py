"""Tests for the weekly event updater and its parsers.

Run: pytest
"""
import sqlite3

import pytest

from scripts.collector import update_db
from scripts.collector.build_db import load_fight_details, load_fighter, open_db
from scripts.collector.scrape_ufcstats import parse_event_listing, parse_event_page

LISTING_HTML = """
<table><tbody>
<tr class="b-statistics__table-row"><td></td></tr>
<tr class="b-statistics__table-row">
  <td class="b-statistics__table-col"><i>
    <a class="b-link" href="http://ufcstats.com/event-details/aaaa111122223333">UFC 999: Test vs. Rival</a>
    <span class="b-statistics__date">July 18, 2026</span>
  </i></td>
  <td class="b-statistics__table-col">Las Vegas, Nevada, USA</td>
</tr>
</tbody></table>
"""

EVENT_PAGE_HTML = """
<h2 class="b-content__title"><span class="b-content__title-highlight">UFC 999: Test vs. Rival</span></h2>
<ul>
  <li class="b-list__box-list-item">Date: July 18, 2026</li>
  <li class="b-list__box-list-item">Location: Las Vegas, Nevada, USA</li>
</ul>
<table><tbody>
<tr class="b-fight-details__table-row" data-link="http://ufcstats.com/fight-details/bbbbbbbbbbbbbbb9">
  <td><a href="http://ufcstats.com/fighter-details/aaaaaaaaaaaaaaaa">Test Fighter</a>
      <a href="http://ufcstats.com/fighter-details/dddddddddddddddd">New Guy</a></td>
</tr>
</tbody></table>
"""


def test_parse_event_listing():
    events = parse_event_listing(LISTING_HTML)
    assert events == [
        {
            "id": "aaaa111122223333",
            "url": "http://ufcstats.com/event-details/aaaa111122223333",
            "name": "UFC 999: Test vs. Rival",
            "date": "July 18, 2026",
            "location": "Las Vegas, Nevada, USA",
        }
    ]


def test_parse_event_page():
    page = parse_event_page(
        EVENT_PAGE_HTML, url="http://ufcstats.com/event-details/aaaa111122223333"
    )
    assert page["id"] == "aaaa111122223333"
    assert page["name"] == "UFC 999: Test vs. Rival"
    assert page["location"] == "Las Vegas, Nevada, USA"
    assert page["bouts"] == [
        {
            "fight_id": "bbbbbbbbbbbbbbb9",
            "fight_url": "http://ufcstats.com/fight-details/bbbbbbbbbbbbbbb9",
            "fighters": [
                {"id": "aaaaaaaaaaaaaaaa", "name": "Test Fighter"},
                {"id": "dddddddddddddddd", "name": "New Guy"},
            ],
        }
    ]


def test_norm_date():
    assert update_db._norm_date("July 18, 2026") == "Jul. 18, 2026"
    assert update_db._norm_date("Jul. 18, 2026") == "Jul. 18, 2026"  # already normal


def test_migration_adds_event_columns(tmp_path):
    path = tmp_path / "legacy.db"
    conn = sqlite3.connect(path)
    conn.execute(
        "CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "name TEXT UNIQUE NOT NULL, date TEXT)"
    )
    conn.execute("INSERT INTO events (name, date) VALUES ('Old Event', 'Jan. 01, 2020')")
    conn.commit()
    conn.close()

    conn = open_db(str(path))
    cols = {row[1] for row in conn.execute("PRAGMA table_info(events)")}
    assert {"ufcstats_id", "location", "url", "status"} <= cols
    row = conn.execute("SELECT * FROM events WHERE name = 'Old Event'").fetchone()
    assert row["status"] is None
    conn.close()


PROFILE = {
    "type": "fighter",
    "id": "aaaaaaaaaaaaaaaa",
    "url": "http://ufcstats.com/fighter-details/aaaaaaaaaaaaaaaa",
    "name": "Test Fighter",
    "wins": 1, "losses": 0, "draws": 0,
    "fights": [
        {
            "fight_url": "http://ufcstats.com/fight-details/bbbbbbbbbbbbbbb9",
            "result": "win", "opponent": "New Guy",
            "event": "UFC 999: Test vs. Rival", "date": "Jul. 18, 2026",
            "method": "KO/TKO", "method_detail": "", "round": "1", "time": "1:00",
            "kd": "1", "sig_str": "5", "td": "0", "sub_att": "0",
        }
    ],
}

DETAILS = {
    "type": "fight_details",
    "id": "bbbbbbbbbbbbbbb9",
    "event": "UFC 999: Test vs. Rival",
    "bout_type": "Lightweight Bout",
    "method": "KO/TKO", "end_round": 1, "end_time": "1:00",
    "fighters": [], "round_stats": [],
}

LISTED = {
    "id": "aaaa111122223333",
    "url": "http://ufcstats.com/event-details/aaaa111122223333",
    "name": "UFC 999: Test vs. Rival",
    "date": "July 18, 2026",
    "location": "Las Vegas, Nevada, USA",
}


def test_reconcile_marks_locally_complete_event(tmp_path, monkeypatch):
    conn = open_db(str(tmp_path / "ufc.db"))
    with conn:
        load_fighter(conn, PROFILE)
        load_fight_details(conn, DETAILS)

    def no_network(*args, **kwargs):
        raise AssertionError("network should not be touched")

    monkeypatch.setattr(update_db.scraper, "scrape_event", no_network)
    summary = update_db.reconcile(conn, session=None, listed_events=[LISTED], delay=0)
    assert summary["marked"] == 1 and summary["ingested"] == 0

    row = conn.execute("SELECT * FROM events WHERE name = ?", (LISTED["name"],)).fetchone()
    assert row["status"] == "completed"
    assert row["location"] == "Las Vegas, Nevada, USA"
    assert row["ufcstats_id"] == LISTED["id"]

    # Second run: skipped outright as already current.
    summary = update_db.reconcile(conn, session=None, listed_events=[LISTED], delay=0)
    assert summary["already_current"] == 1 and summary["marked"] == 0
    conn.close()


def test_reconcile_ingests_new_event(tmp_path, monkeypatch):
    conn = open_db(str(tmp_path / "ufc.db"))
    scraped: dict[str, list] = {"fighters": [], "fights": []}

    event_page = parse_event_page(
        EVENT_PAGE_HTML, url="http://ufcstats.com/event-details/aaaa111122223333"
    )
    monkeypatch.setattr(update_db.scraper, "scrape_event", lambda s, url: event_page)

    def fake_fighter(session, url):
        fid = url.rsplit("/", 1)[1]
        scraped["fighters"].append(fid)
        return {**PROFILE, "id": fid, "url": url,
                "name": "Test Fighter" if fid.startswith("a") else "New Guy"}

    def fake_fight(session, url):
        scraped["fights"].append(url.rsplit("/", 1)[1])
        return DETAILS

    monkeypatch.setattr(update_db.scraper, "scrape_fighter", fake_fighter)
    monkeypatch.setattr(update_db.scraper, "scrape_fight", fake_fight)

    summary = update_db.reconcile(conn, session=None, listed_events=[LISTED], delay=0)
    assert summary["ingested"] == 1
    assert sorted(scraped["fighters"]) == ["aaaaaaaaaaaaaaaa", "dddddddddddddddd"]
    assert scraped["fights"] == ["bbbbbbbbbbbbbbb9"]

    row = conn.execute("SELECT * FROM events WHERE name = ?", (LISTED["name"],)).fetchone()
    assert row["status"] == "completed"
    assert conn.execute("SELECT COUNT(*) FROM fight_details").fetchone()[0] == 1
    conn.close()

def test_cli_failed_event_returns_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(update_db.scraper, "make_session", lambda: None)
    monkeypatch.setattr(update_db.scraper, "list_completed_events", lambda session: [LISTED])
    def fail(*args):
        raise RuntimeError("simulated source failure")
    monkeypatch.setattr(update_db.scraper, "scrape_event", fail)
    assert update_db.main(["--db", str(tmp_path / "failed.db"), "--delay", "0"]) == 1


def test_new_history_pairing_fetches_real_missing_opponent(tmp_path, monkeypatch):
    import copy
    conn = open_db(str(tmp_path / "repair.db"))
    with conn:
        load_fighter(conn, PROFILE)
    details = copy.deepcopy(DETAILS)
    details["fighters"] = [{"id":"aaaaaaaaaaaaaaaa"}, {"id":"dddddddddddddddd"}]
    opponent = copy.deepcopy(PROFILE)
    opponent["id"] = "dddddddddddddddd"
    opponent["fights"][0]["result"] = "loss"
    monkeypatch.setattr(update_db.scraper,"scrape_fight",lambda *args:details)
    monkeypatch.setattr(update_db.scraper,"scrape_fighter",lambda *args:opponent)
    result = update_db.repair_perspectives(conn,None,delay=0)
    assert result == {"fights":1,"profiles":1,"requests":2}
    assert conn.execute("SELECT COUNT(*) FROM fights").fetchone()[0] == 2
    assert update_db.repair_perspectives(conn,None,delay=0)["requests"] == 0
    conn.close()


def test_history_pairing_stops_on_budget_or_wrong_source_identity(tmp_path,monkeypatch):
    import copy
    conn = open_db(str(tmp_path / "repair.db"))
    with conn:
        load_fighter(conn, PROFILE)
    details=copy.deepcopy(DETAILS)
    details["fighters"]=[{"id":"aaaaaaaaaaaaaaaa"},{"id":"dddddddddddddddd"}]
    monkeypatch.setattr(update_db.scraper,"scrape_fight",lambda *args:details)
    with pytest.raises(RuntimeError,match="limit"):
        update_db.repair_perspectives(conn,None,delay=0,max_requests=1)
    details["id"]="bad"
    with pytest.raises(RuntimeError,match="identity mismatch"):
        update_db.repair_perspectives(conn,None,delay=0)
    conn.close()
