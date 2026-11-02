"""Scraper for ufcstats.com fighter listings.

This first stage fetches a letter's fighter-listing page and extracts every
fighter *profile* link. The profile link pattern is:

    http://ufcstats.com/fighter-details/<16-hex-id>

The site sits behind a lightweight SHA-256 proof-of-work wall: the first request
to any page returns a challenge that computes sha256("<nonce>:<n>") until the hex
digest starts with N zeros, POSTs the winning `n` to /__c to earn a clearance
cookie, then reloads. We replicate that here so a plain requests.Session can read
real pages. Solve once per session; the cookie is reused for later requests.

Usage:
    python -m scripts.collector.scrape_ufcstats --char a
    python -m scripts.collector.scrape_ufcstats --all --out data/knowledge_base/fighter_links.jsonl
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from dataclasses import asdict, dataclass

import requests
from bs4 import BeautifulSoup

BASE = "http://ufcstats.com"
LISTING_URL = BASE + "/statistics/fighters?char={char}&page=all"
EVENTS_COMPLETED_URL = BASE + "/statistics/events/completed"
FIGHTER_URL = BASE + "/fighter-details/{id}"
CLEARANCE_ENDPOINT = BASE + "/__c"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ufcchatbot-scraper"

CHALLENGE_MARKER = "Checking your browser"
NONCE_RE = re.compile(r'nonce="([0-9a-f]+)"')
ZEROS_RE = re.compile(r"Array\((\d+)\+1\)")
FIGHTER_ID_RE = re.compile(r"/fighter-details/([0-9a-f]+)")
FIGHT_ID_RE = re.compile(r"/fight-details/([0-9a-f]+)")
EVENT_ID_RE = re.compile(r"/event-details/([0-9a-f]+)")
RECORD_RE = re.compile(r"(\d+)-(\d+)-(\d+)(?:\s*\((\d+)\s*NC\))?")
OF_RE = re.compile(r"(\d+)\s+of\s+(\d+)")
MMSS_RE = re.compile(r"^(\d+):(\d{2})$")

REQUEST_DELAY_S = 1.0  # be polite between requests

# Maps the profile's info-list labels to snake_case record keys.
INFO_KEY_MAP = {
    "Height": "height",
    "Weight": "weight",
    "Reach": "reach",
    "STANCE": "stance",
    "DOB": "dob",
    "SLpM": "slpm",           # significant strikes landed per minute
    "Str. Acc.": "str_acc",   # striking accuracy
    "SApM": "sapm",           # significant strikes absorbed per minute
    "Str. Def": "str_def",    # striking defense
    "TD Avg.": "td_avg",      # takedowns per 15 min
    "TD Acc.": "td_acc",
    "TD Def.": "td_def",
    "Sub. Avg.": "sub_avg",   # submission attempts per 15 min
}


@dataclass
class FighterLink:
    id: str
    url: str
    first_name: str
    last_name: str
    nickname: str

    @property
    def full_name(self) -> str:
        return " ".join(p for p in (self.first_name, self.last_name) if p).strip()


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def _solve_challenge(html: str) -> tuple[str, int] | None:
    """Return (nonce, n) solving the proof-of-work, or None if not a challenge."""
    if CHALLENGE_MARKER not in html:
        return None
    nonce_match = NONCE_RE.search(html)
    zeros_match = ZEROS_RE.search(html)
    if not nonce_match or not zeros_match:
        raise RuntimeError("Challenge page changed; cannot parse nonce/difficulty.")
    nonce = nonce_match.group(1)
    target = "0" * int(zeros_match.group(1))
    n = 0
    while not hashlib.sha256(f"{nonce}:{n}".encode()).hexdigest().startswith(target):
        n += 1
    return nonce, n


def fetch(session: requests.Session, url: str, max_retries: int = 2) -> str:
    """GET a page, transparently clearing the proof-of-work wall if present."""
    for _ in range(max_retries + 1):
        resp = session.get(url, timeout=30)
        resp.raise_for_status()
        solved = _solve_challenge(resp.text)
        if solved is None:
            return resp.text
        nonce, n = solved
        session.post(
            CLEARANCE_ENDPOINT,
            data={"nonce": nonce, "n": n},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        # Cookie now set; loop re-fetches the real page.
    raise RuntimeError(f"Still challenged after {max_retries} retries: {url}")


def parse_fighter_links(html: str) -> list[FighterLink]:
    """Extract deduped fighter profile links (with names) from a listing page."""
    soup = BeautifulSoup(html, "html.parser")
    by_id: dict[str, FighterLink] = {}
    for row in soup.select("tr.b-statistics__table-row"):
        cells = row.select("td")
        if len(cells) < 3:
            continue  # header/spacer rows
        links = row.select("a.b-link")
        if not links:
            continue
        href = links[0].get("href", "")
        id_match = FIGHTER_ID_RE.search(href)
        if not id_match:
            continue
        fid = id_match.group(1)
        # Columns 0,1,2 = first name, last name, nickname (any may be blank).
        first = cells[0].get_text(strip=True)
        last = cells[1].get_text(strip=True)
        nick = cells[2].get_text(strip=True)
        by_id[fid] = FighterLink(
            id=fid,
            url=f"{BASE}/fighter-details/{fid}",
            first_name=first,
            last_name=last,
            nickname=nick,
        )
    return list(by_id.values())


def list_fighters(session: requests.Session, char: str) -> list[FighterLink]:
    html = fetch(session, LISTING_URL.format(char=char))
    return parse_fighter_links(html)


def _text(node) -> str:
    return node.get_text(strip=True) if node else ""


def _parse_info_list(soup: BeautifulSoup) -> dict:
    """Read the bio + career-stat items (Height, Reach, SLpM, ...) into a dict."""
    out: dict[str, str] = {}
    for li in soup.select("li.b-list__box-list-item"):
        title = li.select_one(".b-list__box-item-title")
        if not title:
            continue
        label = _text(title).rstrip(":")
        value = li.get_text(" ", strip=True)[len(_text(title)):].strip()
        key = INFO_KEY_MAP.get(label)
        if key and value and value != "--":
            out[key] = value
    return out


def _parse_record(text: str) -> dict:
    """'Record: 22-6-0 (1 NC)' -> {wins, losses, draws, no_contests}."""
    m = RECORD_RE.search(text or "")
    if not m:
        return {}
    wins, losses, draws, nc = m.groups()
    rec = {"wins": int(wins), "losses": int(losses), "draws": int(draws)}
    if nc:
        rec["no_contests"] = int(nc)
    return rec


def parse_fight_history(soup: BeautifulSoup) -> list[dict]:
    """Extract each completed bout, including its fight-details link.

    Column order per row: result, [self, opp], KD, STR, TD, SUB, [event, date],
    [method, detail], round, time. Upcoming/preview rows have no data-link and
    are skipped.
    """
    fights: list[dict] = []
    for row in soup.select("tr.b-fight-details__table-row"):
        link = row.get("data-link", "")
        if "fight-details" not in link:
            continue
        cols = row.select("td.b-fight-details__table-col")
        if len(cols) < 10:
            continue

        def pair(i: int) -> list[str]:
            return [_text(p) for p in cols[i].select("p")]

        names = pair(1)
        kd, strikes, td, sub = pair(2), pair(3), pair(4), pair(5)
        event = pair(6)
        method = pair(7)
        fights.append(
            {
                "fight_url": link,
                "result": _text(cols[0].select_one("p")),
                "opponent": names[1] if len(names) > 1 else "",
                "event": event[0] if event else "",
                "date": event[1] if len(event) > 1 else "",
                "method": method[0] if method else "",
                "method_detail": method[1] if len(method) > 1 else "",
                "round": _text(cols[8].select_one("p")),
                "time": _text(cols[9].select_one("p")),
                "kd": kd[0] if kd else "",
                "sig_str": strikes[0] if strikes else "",
                "td": td[0] if td else "",
                "sub_att": sub[0] if sub else "",
            }
        )
    return fights


def parse_fighter_profile(html: str, url: str = "") -> dict:
    """Parse a fighter-details page into a record matching the JSONL card format."""
    soup = BeautifulSoup(html, "html.parser")
    name = _text(soup.select_one("span.b-content__title-highlight"))
    nickname = _text(soup.select_one("p.b-content__Nickname"))
    record_text = _text(soup.select_one("span.b-content__title-record"))

    fid_match = FIGHTER_ID_RE.search(url)
    profile = {
        "type": "fighter",
        "id": fid_match.group(1) if fid_match else "",
        "url": url,
        "name": name,
        "nickname": nickname or None,
    }
    profile.update(_parse_record(record_text))
    profile.update(_parse_info_list(soup))
    profile["fights"] = parse_fight_history(soup)
    return profile


def scrape_fighter(session: requests.Session, url: str) -> dict:
    return parse_fighter_profile(fetch(session, url), url=url)


def _to_int(text: str) -> int | None:
    try:
        return int(text)
    except (TypeError, ValueError):
        return None


def _of(text: str) -> tuple[int | None, int | None]:
    """'48 of 91' -> (48, 91)."""
    m = OF_RE.search(text or "")
    return (int(m.group(1)), int(m.group(2))) if m else (None, None)


def _mmss_to_seconds(text: str) -> int | None:
    m = MMSS_RE.match((text or "").strip())
    return int(m.group(1)) * 60 + int(m.group(2)) if m else None


def _classify_stat_tables(soup: BeautifulSoup) -> dict:
    """Map the fight-details tables by their thead signature.

    Totals tables lead with 'Fighter, KD, ...'; significant-strike tables with
    'Fighter, Sig. str...'. Per-round variants append 'Round N' header cells.
    Old fights may lack some or all tables — missing ones map to None.
    """
    out = {"totals": None, "totals_rounds": None, "sig": None, "sig_rounds": None}
    for table in soup.select("table"):
        heads = [_text(th) for th in table.select("thead th")]
        if len(heads) < 2 or heads[0] != "Fighter":
            continue
        per_round = any(h.startswith("Round") for h in heads)
        if heads[1] == "KD":
            out["totals_rounds" if per_round else "totals"] = table
        elif heads[1].startswith("Sig"):
            out["sig_rounds" if per_round else "sig"] = table
    return out


def _cell_pairs(row) -> list[list[str]]:
    """A stats row's cells, each as [fighter_a_text, fighter_b_text]."""
    return [[_text(p) for p in td.select("p")] for td in row.select("td")]


def _fighter_stats(tcells: list, scells: list | None, i: int) -> dict:
    """Build one fighter's stat dict from a totals row (+ optional sig row).

    Totals columns: 0 fighter, 1 KD, 2 sig str, 3 sig %, 4 total str, 5 TD,
    6 TD %, 7 sub att, 8 rev, 9 ctrl. Sig columns: 0 fighter, 1 sig str,
    2 sig %, 3 head, 4 body, 5 leg, 6 distance, 7 clinch, 8 ground.
    """
    sig_l, sig_a = _of(tcells[2][i])
    tot_l, tot_a = _of(tcells[4][i])
    td_l, td_a = _of(tcells[5][i])
    stats = {
        "kd": _to_int(tcells[1][i]),
        "sig_landed": sig_l, "sig_attempted": sig_a,
        "total_landed": tot_l, "total_attempted": tot_a,
        "td_landed": td_l, "td_attempted": td_a,
        "sub_att": _to_int(tcells[7][i]),
        "reversals": _to_int(tcells[8][i]),
        "ctrl_seconds": _mmss_to_seconds(tcells[9][i]),
    }
    if scells:
        for key, idx in (("head", 3), ("body", 4), ("leg", 5),
                         ("distance", 6), ("clinch", 7), ("ground", 8)):
            landed, attempted = _of(scells[idx][i])
            stats[f"{key}_landed"] = landed
            stats[f"{key}_attempted"] = attempted
    return stats


def parse_fight_details(html: str, url: str = "") -> dict:
    """Parse a fight-details page: bout metadata + per-fighter stats.

    `round_stats` holds one dict per (fighter, round); round 0 is the
    fight-level totals row. Early fights without stat tables still yield the
    metadata with an empty round_stats list.
    """
    soup = BeautifulSoup(html, "html.parser")
    fid_match = FIGHT_ID_RE.search(url)

    fighters = []
    for person in soup.select("div.b-fight-details__person"):
        link = person.select_one("a.b-fight-details__person-link")
        id_match = FIGHTER_ID_RE.search(link.get("href", "") if link else "")
        fighters.append(
            {
                "id": id_match.group(1) if id_match else "",
                "name": _text(link),
                "result": _text(person.select_one("i.b-fight-details__person-status")),
            }
        )

    meta: dict[str, str] = {}
    for item in soup.select("i.b-fight-details__text-item_first, i.b-fight-details__text-item"):
        label_node = item.select_one("i.b-fight-details__label")
        if not label_node:
            continue
        label = _text(label_node).rstrip(":")
        meta[label] = item.get_text(" ", strip=True)[len(_text(label_node)):].strip()
    for p in soup.select("p.b-fight-details__text"):
        text = " ".join(p.get_text(" ", strip=True).split())
        if text.startswith("Details:"):
            meta["Details"] = text[len("Details:"):].strip()

    tables = _classify_stat_tables(soup)
    round_stats: list[dict] = []

    def add_rows(tcells, scells, round_no):
        for i, fighter in enumerate(fighters[:2]):
            round_stats.append(
                {"fighter_id": fighter["id"], "round": round_no,
                 **_fighter_stats(tcells, scells, i)}
            )

    if tables["totals"]:
        totals_rows = [_cell_pairs(r) for r in tables["totals"].select("tbody tr")]
        sig_rows = ([_cell_pairs(r) for r in tables["sig"].select("tbody tr")]
                    if tables["sig"] else [])
        if totals_rows:
            add_rows(totals_rows[0], sig_rows[0] if sig_rows else None, 0)
    if tables["totals_rounds"]:
        totals_rows = [_cell_pairs(r) for r in tables["totals_rounds"].select("tbody tr")]
        sig_rows = ([_cell_pairs(r) for r in tables["sig_rounds"].select("tbody tr")]
                    if tables["sig_rounds"] else [])
        for round_no, tcells in enumerate(totals_rows, 1):
            scells = sig_rows[round_no - 1] if len(sig_rows) >= round_no else None
            add_rows(tcells, scells, round_no)

    return {
        "type": "fight_details",
        "id": fid_match.group(1) if fid_match else "",
        "url": url,
        "event": _text(soup.select_one("h2.b-content__title a"))
        or _text(soup.select_one("h2.b-content__title")),
        "bout_type": _text(soup.select_one("i.b-fight-details__fight-title")),
        "method": meta.get("Method"),
        "end_round": _to_int(meta.get("Round")),
        "end_time": meta.get("Time"),
        "time_format": meta.get("Time format"),
        "referee": meta.get("Referee"),
        "details": meta.get("Details"),
        "fighters": fighters,
        "round_stats": round_stats,
    }


def scrape_fight(session: requests.Session, url: str) -> dict:
    return parse_fight_details(fetch(session, url), url=url)


def parse_event_listing(html: str) -> list[dict]:
    """Rows of a statistics/events listing page: id, url, name, date, location."""
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []
    for row in soup.select("tr.b-statistics__table-row"):
        link = row.select_one("a.b-link")
        if not link:
            continue
        id_match = EVENT_ID_RE.search(link.get("href", ""))
        if not id_match:
            continue
        cells = row.select("td")
        out.append(
            {
                "id": id_match.group(1),
                "url": link.get("href"),
                "name": _text(link),
                "date": _text(row.select_one("span.b-statistics__date")),
                "location": _text(cells[1]) if len(cells) > 1 else "",
            }
        )
    return out


def list_completed_events(session: requests.Session) -> list[dict]:
    """Most recent completed events, newest first (~25, spanning months)."""
    return parse_event_listing(fetch(session, EVENTS_COMPLETED_URL))


def parse_event_page(html: str, url: str = "") -> dict:
    """An event-details page: meta plus every bout's fight id and fighters."""
    soup = BeautifulSoup(html, "html.parser")
    id_match = EVENT_ID_RE.search(url)

    info: dict[str, str] = {}
    for li in soup.select("li.b-list__box-list-item"):
        text = " ".join(li.get_text(" ", strip=True).split())
        if ":" in text:
            key, value = text.split(":", 1)
            info[key.strip()] = value.strip()

    bouts: list[dict] = []
    for row in soup.select("tr.b-fight-details__table-row"):
        fight_match = FIGHT_ID_RE.search(row.get("data-link", ""))
        if not fight_match:
            continue
        fighters = []
        for a in row.select("a"):
            fighter_match = FIGHTER_ID_RE.search(a.get("href", ""))
            if fighter_match:
                fighters.append({"id": fighter_match.group(1), "name": _text(a)})
        bouts.append(
            {
                "fight_id": fight_match.group(1),
                "fight_url": row.get("data-link", ""),
                "fighters": fighters,
            }
        )

    return {
        "id": id_match.group(1) if id_match else "",
        "url": url,
        "name": _text(soup.select_one("span.b-content__title-highlight")),
        "date": info.get("Date", ""),
        "location": info.get("Location", ""),
        "bouts": bouts,
    }


def scrape_event(session: requests.Session, url: str) -> dict:
    return parse_event_page(fetch(session, url), url=url)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scrape ufcstats fighter profile links.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--char", help="Single starting letter, e.g. 'a'.")
    group.add_argument("--all", action="store_true", help="All letters a-z.")
    group.add_argument("--fighter", help="A fighter-details URL (or 16-hex id) to scrape.")
    parser.add_argument("--out", help="Write results as JSONL to this path.")
    args = parser.parse_args(argv)

    if args.fighter:
        session = make_session()
        url = args.fighter
        if not url.startswith("http"):
            url = FIGHTER_URL.format(id=url)
        profile = scrape_fighter(session, url)
        text = json.dumps(profile, ensure_ascii=False, indent=2)
        if args.out:
            with open(args.out, "w", encoding="utf-8") as fh:
                fh.write(json.dumps(profile, ensure_ascii=False) + "\n")
            print(f"Wrote profile for {profile['name']} to {args.out}", file=sys.stderr)
        else:
            print(text)
        return 0

    chars = [chr(c) for c in range(ord("a"), ord("z") + 1)] if args.all else [args.char.lower()]
    session = make_session()

    results: list[FighterLink] = []
    for i, char in enumerate(chars):
        fighters = list_fighters(session, char)
        results.extend(fighters)
        print(f"[{char}] {len(fighters)} fighters", file=sys.stderr)
        if i < len(chars) - 1:
            time.sleep(REQUEST_DELAY_S)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            for f in results:
                fh.write(json.dumps(asdict(f), ensure_ascii=False) + "\n")
        print(f"Wrote {len(results)} links to {args.out}", file=sys.stderr)
    else:
        for f in results:
            print(f"{f.url}\t{f.full_name}" + (f" ({f.nickname})" if f.nickname else ""))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
