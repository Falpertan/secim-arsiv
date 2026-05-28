#!/usr/bin/env python3
"""Anket kaynak taraması — Google News RSS ile firma/haber araması."""

from __future__ import annotations

import json
import re
import ssl
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT / "data" / "anket" / "bundle.json"
RESEARCH_PATH = ROOT / "data" / "anket" / "research-latest.json"

RESEARCH_KEYWORDS = re.compile(
    r"anket|seçim|secim|oy\s*oran|parti\s*oran|cumhurbaşkan|milletvekili|ittifak|yüzde|araştırma\s*sonuc",
    re.I,
)

CHANNEL_RULES = [
    (re.compile(r"youtube\.com|youtu\.be", re.I), "youtube"),
    (re.compile(r"twitter\.com|x\.com", re.I), "social_media"),
    (re.compile(r"haberturk|halktv|tv100|cnnturk|ntv|showtv|atv|trt", re.I), "tv"),
    (
        re.compile(r"sozcu|cumhuriyet|hurriyet|milliyet|sabah|diken|t24|bianet", re.I),
        "online_news",
    ),
]

FIRM_ALIASES = [
    ("ozkiraz", re.compile(r"özk[ıi]raz|ozkiraz|kemal özk", re.I)),
]

USER_AGENT = "SecimArsivi-AnketBot/1.0 (+https://secimarsivi.com)"


def load_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def detect_channel(url: str) -> str:
    for pattern, channel in CHANNEL_RULES:
        if pattern.search(url):
            return channel
    return "online_news"


def guess_firm(title: str, firms: list[dict[str, Any]], firm_id: str | None = None) -> dict[str, Any] | None:
    if firm_id:
        return next((f for f in firms if f["id"] == firm_id), None)
    lower = title.lower()
    for fid, pattern in FIRM_ALIASES:
        if pattern.search(lower):
            return next((f for f in firms if f["id"] == fid), None)
    for firm in firms:
        name = firm.get("name", "")
        if not name:
            continue
        if name.lower() in lower:
            return firm
        token = name.split()[0]
        if len(token) > 3 and token.lower() in lower:
            return firm
    return None


def fetch_rss(query: str, timeout: int = 25) -> str:
    rss_url = (
        "https://news.google.com/rss/search?q="
        + urllib.parse.quote(query)
        + "&hl=tr&gl=TR&ceid=TR:tr"
    )
    req = urllib.request.Request(rss_url, headers={"User-Agent": USER_AGENT})
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_rss_items(
    xml_text: str,
    since: date,
    firms: list[dict[str, Any]],
    firm_id: str | None,
    query: str,
) -> list[dict[str, Any]]:
    root = ET.fromstring(xml_text)
    items: list[dict[str, Any]] = []
    for item in root.findall(".//item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_raw = (item.findtext("pubDate") or "").strip()
        if not title or not link or not RESEARCH_KEYWORDS.search(title):
            continue
        pub_date: date | None = None
        if pub_raw:
            try:
                pub_dt = datetime.strptime(pub_raw, "%a, %d %b %Y %H:%M:%S %Z")
                pub_date = pub_dt.date()
            except ValueError:
                try:
                    pub_dt = datetime.strptime(pub_raw[:25], "%a, %d %b %Y %H:%M:%S")
                    pub_date = pub_dt.date()
                except ValueError:
                    pub_date = None
        if pub_date and pub_date < since:
            continue
        firm = guess_firm(title, firms, firm_id)
        items.append(
            {
                "title": title,
                "url": link,
                "publishedAt": pub_date.isoformat() if pub_date else None,
                "channel": detect_channel(link),
                "outlet": "Google News",
                "query": query,
                "source": "google_news_rss",
                "firmId": firm["id"] if firm else None,
                "firmName": firm["name"] if firm else None,
            }
        )
    return items


def build_queries(firms: list[dict[str, Any]]) -> list[tuple[str | None, str]]:
    queries: list[tuple[str | None, str]] = []
    seen: set[str] = set()
    priority = [
        "konda",
        "metropoll",
        "gezici",
        "genar",
        "mak",
        "optimar",
        "sonar",
        "orc",
        "veri",
        "area",
        "piar",
    ]
    by_id = {f["id"]: f for f in firms}
    for fid in priority:
        firm = by_id.get(fid)
        if not firm:
            continue
        token = firm["name"].split()[0]
        q = f'"{token}" anket'
        if q not in seen:
            queries.append((fid, q))
            seen.add(q)
    for firm in firms:
        token = firm["name"].split()[0]
        if len(token) <= 3:
            continue
        q = f'"{token}" anket'
        if q in seen or len(queries) >= 24:
            continue
        queries.append((firm["id"], q))
        seen.add(q)
    for q in ("seçim anketi Türkiye", "site:youtube.com seçim anketi Türkiye"):
        if q not in seen:
            queries.append((None, q))
            seen.add(q)
    return queries


def dedupe_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in sorted(items, key=lambda x: x.get("publishedAt") or "", reverse=True):
        key = re.sub(r"\?.*$", "", item.get("url", "")).lower()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def default_upcoming_election_id(bundle: dict[str, Any]) -> str | None:
    upcoming = bundle.get("upcomingElections") or []
    if not upcoming:
        return None
    today = date.today().isoformat()
    for el in upcoming:
        if el.get("date", "") >= today:
            return el["id"]
    return upcoming[0]["id"]


def url_key(url: str) -> str:
    return re.sub(r"\?.*$", "", url).lower()


def existing_poll_urls(bundle: dict[str, Any]) -> set[str]:
    urls: set[str] = set()
    for poll in (bundle.get("pollsUpcoming") or []) + (bundle.get("polls") or []):
        for pub in poll.get("publications") or []:
            href = pub.get("url") or pub.get("archiveUrl") or ""
            if href:
                urls.add(url_key(href))
    return urls


def item_to_poll_stub(item: dict[str, Any], election_id: str) -> dict[str, Any] | None:
    if not item.get("firmId"):
        return None
    pub_url = item.get("url") or ""
    slug = re.sub(r"[^a-z0-9]+", "-", pub_url.lower())[:48] or "kaynak"
    pub_date = item.get("publishedAt") or date.today().isoformat()
    return {
        "id": f"scan-{slug}",
        "electionId": election_id,
        "firmId": item["firmId"],
        "publishedDate": pub_date,
        "scope": "party",
        "predictions": [],
        "publications": [
            {
                "id": f"pub-{slug}",
                "channel": item.get("channel") or "online_news",
                "outlet": item.get("outlet") or "Web",
                "title": item.get("title") or "Anket haberi",
                "publishedAt": pub_date,
                "url": pub_url,
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Otomatik tarama",
        "notes": "Başlıktan otomatik eklendi; oranlar elle doğrulanmalı.",
        "_scanned": True,
    }


def run_research(days_back: int = 30, progress=None) -> dict[str, Any]:
    bundle = load_json(BUNDLE_PATH)
    firms = bundle.get("firms") or []
    since = date.today() - timedelta(days=days_back)
    queries = build_queries(firms)
    all_items: list[dict[str, Any]] = []

    for i, (firm_id, query) in enumerate(queries, start=1):
        if progress:
            progress(f"Tarama ({i}/{len(queries)}): {query}")
        try:
            xml = fetch_rss(query)
            all_items.extend(parse_rss_items(xml, since, firms, firm_id, query))
        except Exception as exc:  # noqa: BLE001 — tarama tek tek devam etsin
            if progress:
                progress(f"Atlandı ({query}): {exc}")

    items = dedupe_items(all_items)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    research = {
        "generatedAt": now,
        "periodFrom": since.isoformat(),
        "periodTo": date.today().isoformat(),
        "daysBack": days_back,
        "totalHits": len(items),
        "items": items,
        "mode": "python",
        "note": f"{len(items)} kaynak bulundu (Python taraması).",
    }
    save_json(RESEARCH_PATH, research)

    election_id = default_upcoming_election_id(bundle)
    known_urls = existing_poll_urls(bundle)
    new_polls: list[dict[str, Any]] = []
    if election_id:
        polls_upcoming = bundle.setdefault("pollsUpcoming", [])
        for item in items:
            href = item.get("url") or ""
            if not href or url_key(href) in known_urls:
                continue
            stub = item_to_poll_stub(item, election_id)
            if not stub:
                continue
            if any(p.get("id") == stub["id"] for p in polls_upcoming):
                continue
            polls_upcoming.append(stub)
            new_polls.append(stub)
            known_urls.add(url_key(href))

    bundle["researchLatest"] = research
    save_json(BUNDLE_PATH, bundle)

    return {
        **research,
        "newPolls": len(new_polls),
        "regenerated": True,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Anket RSS taraması — bundle.json günceller")
    parser.add_argument("--days", type=int, default=30, help="Kaç gün geriye taransın")
    args = parser.parse_args()

    def _progress(msg: str) -> None:
        print(msg)

    result = run_research(days_back=args.days, progress=_progress)
    print(f"Tamam: {result['totalHits']} kaynak, {result['newPolls']} yeni anket stub eklendi.")
