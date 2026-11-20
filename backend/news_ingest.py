"""Live news ingestion from FREE sources only.

Sources
-------
* RSS / Atom feeds (BBC News, NPR, The Guardian, Ars Technica, The Verge, NASA,
  ESPN, Grist). No key needed, so the site always has real news.
* The Guardian Open Platform API (free developer key, non-commercial use).
  Enabled when ``GUARDIAN_API_KEY`` is set.
* The New York Times Top Stories API (free key). Enabled when ``NYT_API_KEY``
  is set.

What is stored
--------------
Only what publishers expose for syndication: headline, summary, a short
excerpt, image URL, byline and the link to the original story. Full article
text is never copied; each story page links readers back to the publisher.

Run it
------
* Automatically: ``start_background_refresh()`` is called on app start-up and
  refreshes every ``NEWS_REFRESH_MINUTES`` (default 60).
* Manually: ``python news_ingest.py`` (from ``backend/``) or the admin
  endpoint ``POST /admin/news/refresh``.

Environment (all optional)
--------------------------
GUARDIAN_API_KEY, NYT_API_KEY      free API keys
NEWS_AUTO_REFRESH=0                disable the background refresher
NEWS_REFRESH_MINUTES=60            refresh interval (min 10)
NEWS_MAX_AGE_DAYS=14               ignore items older than this
NEWS_KEEP_PER_CATEGORY=60          newest feed articles kept per section
NEWS_REMOVE_DEMO=1                 delete fictional demo articles once real
                                   news has been stored
"""

from __future__ import annotations

import hashlib
import html
import logging
import os
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import feedparser
import httpx
import models
from database import SessionLocal
from sqlalchemy import desc

log = logging.getLogger("mablytic.news")

CATEGORIES = (
    "World", "U.S.", "Politics", "Business", "Technology", "Science", "Health",
    "Climate", "Sports", "Education", "Arts", "Opinion", "Travel",
)

USER_AGENT = "MablyticNewsReader/1.0 (+https://mablytic.web.app; educational demo)"
HTTP_TIMEOUT = 12.0
MAX_RESPONSE_BYTES = 6_000_000
MAX_PER_FEED = 12
SUMMARY_MAX_CHARS = 300
EXCERPT_MAX_CHARS = 700

# (category, source name, feed URL)
RSS_FEEDS: list[tuple[str, str, str]] = [
    # World
    ("World", "BBC News", "https://feeds.bbci.co.uk/news/world/rss.xml"),
    ("World", "NPR", "https://feeds.npr.org/1004/rss.xml"),
    ("World", "The Guardian", "https://www.theguardian.com/world/rss"),
    # U.S.
    ("U.S.", "NPR", "https://feeds.npr.org/1003/rss.xml"),
    ("U.S.", "BBC News", "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml"),
    ("U.S.", "The Guardian", "https://www.theguardian.com/us-news/rss"),
    # Politics
    ("Politics", "NPR", "https://feeds.npr.org/1014/rss.xml"),
    ("Politics", "BBC News", "https://feeds.bbci.co.uk/news/politics/rss.xml"),
    ("Politics", "The Guardian", "https://www.theguardian.com/us-news/us-politics/rss"),
    # Business
    ("Business", "BBC News", "https://feeds.bbci.co.uk/news/business/rss.xml"),
    ("Business", "NPR", "https://feeds.npr.org/1017/rss.xml"),
    ("Business", "The Guardian", "https://www.theguardian.com/business/rss"),
    # Technology
    ("Technology", "BBC News", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    ("Technology", "NPR", "https://feeds.npr.org/1019/rss.xml"),
    ("Technology", "Ars Technica", "https://feeds.arstechnica.com/arstechnica/index"),
    ("Technology", "The Verge", "https://www.theverge.com/rss/index.xml"),
    ("Technology", "The Guardian", "https://www.theguardian.com/technology/rss"),
    # Science
    ("Science", "BBC News", "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"),
    ("Science", "NPR", "https://feeds.npr.org/1007/rss.xml"),
    ("Science", "NASA", "https://www.nasa.gov/feed/"),
    ("Science", "The Guardian", "https://www.theguardian.com/science/rss"),
    # Health
    ("Health", "BBC News", "https://feeds.bbci.co.uk/news/health/rss.xml"),
    ("Health", "NPR", "https://feeds.npr.org/1128/rss.xml"),
    ("Health", "The Guardian", "https://www.theguardian.com/society/health/rss"),
    # Climate
    ("Climate", "The Guardian", "https://www.theguardian.com/environment/climate-crisis/rss"),
    ("Climate", "Grist", "https://grist.org/feed/"),
    # Sports
    ("Sports", "BBC Sport", "https://feeds.bbci.co.uk/sport/rss.xml"),
    ("Sports", "ESPN", "https://www.espn.com/espn/rss/news"),
    ("Sports", "The Guardian", "https://www.theguardian.com/sport/rss"),
    # Education
    ("Education", "BBC News", "https://feeds.bbci.co.uk/news/education/rss.xml"),
    ("Education", "NPR", "https://feeds.npr.org/1013/rss.xml"),
    ("Education", "The Guardian", "https://www.theguardian.com/education/rss"),
    # Arts
    ("Arts", "BBC News", "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"),
    ("Arts", "NPR", "https://feeds.npr.org/1008/rss.xml"),
    ("Arts", "The Guardian", "https://www.theguardian.com/culture/rss"),
    # Opinion
    ("Opinion", "The Guardian", "https://www.theguardian.com/commentisfree/rss"),
    # Travel
    ("Travel", "The Guardian", "https://www.theguardian.com/travel/rss"),
]

GUARDIAN_URL = "https://content.guardianapis.com/search"
# (category, extra query params). Section/tag ids are Guardian's own.
GUARDIAN_SEARCHES: list[tuple[str, dict[str, str]]] = [
    ("World", {"section": "world"}),
    ("U.S.", {"section": "us-news"}),
    ("Politics", {"tag": "us-news/us-politics"}),
    ("Business", {"section": "business"}),
    ("Technology", {"section": "technology"}),
    ("Science", {"section": "science"}),
    ("Health", {"tag": "society/health"}),
    ("Climate", {"tag": "environment/climate-crisis"}),
    ("Sports", {"section": "sport"}),
    ("Education", {"section": "education"}),
    ("Arts", {"section": "culture"}),
    ("Opinion", {"section": "commentisfree"}),
    ("Travel", {"section": "travel"}),
]

NYT_URL = "https://api.nytimes.com/svc/topstories/v2/{section}.json"
# category -> NYT Top Stories section
NYT_SECTIONS: list[tuple[str, str]] = [
    ("World", "world"),
    ("U.S.", "us"),
    ("Politics", "politics"),
    ("Business", "business"),
    ("Technology", "technology"),
    ("Science", "science"),
    ("Health", "health"),
    ("Sports", "sports"),
    ("Arts", "arts"),
    ("Opinion", "opinion"),
    ("Travel", "travel"),
]


# ── Settings (read at call time so tests can override them) ──────────────────


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.environ.get(name, default)))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return max(0.0, float(os.environ.get(name, default)))
    except (TypeError, ValueError):
        return default


def _env_flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return raw.strip().lower() not in ("0", "false", "no", "off")


def guardian_key() -> str:
    return os.environ.get("GUARDIAN_API_KEY", "").strip()


def nyt_key() -> str:
    return os.environ.get("NYT_API_KEY", "").strip()


# ── Data model ───────────────────────────────────────────────────────────────


@dataclass
class NewsItem:
    category: str
    title: str
    url: str
    source: str
    summary: str
    published: datetime
    body: str = ""
    author: str = ""
    image_url: str = ""
    image_alt: str = ""


# ── Text and URL helpers ─────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"[ \t\r\f\v\u00a0]+")
_BREAK_RE = re.compile(r"(?i)<br\s*/?>|</p>|</div>|</li>")
_TRAILING_JUNK_RE = re.compile(
    r"\s*(?:continue reading\.{0,3}|read more(?: »)?|\[(?:…|\.\.\.|&#8230;)\])\s*$", re.I
)
_JUNK_PARAGRAPH_RE = re.compile(
    r"^(?:continue reading\.{0,3}|read more.*|the post .* appeared first on .*|"
    r"advertisement|related:?.*|photo:.*|image:.*)$",
    re.I,
)
_TRACKING_PREFIXES = ("utm_", "at_", "ns_", "cmp", "ocid", "taid")
_TRACKING_KEYS = {"partner", "emc", "smid", "ftag", "ref", "campaign_id", "referringsource", "fbclid", "gclid"}


def clean_text(raw: str | None) -> str:
    """HTML -> plain text, one paragraph per line."""
    if not raw:
        return ""
    text = _BREAK_RE.sub("\n", raw)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text)
    lines = []
    for line in text.split("\n"):
        line = _WS_RE.sub(" ", line).strip()
        line = _TRAILING_JUNK_RE.sub("", line).strip()
        if line and not _JUNK_PARAGRAPH_RE.match(line):
            lines.append(line)
    return "\n".join(lines)


def _one_line(raw: str | None) -> str:
    return " ".join(clean_text(raw).split())


def _truncate(text: str, limit: int) -> str:
    """Cut at a sentence end when one is reasonably close, else at a word."""
    if len(text) <= limit:
        return text
    window = text[:limit]
    sentence_end = max(window.rfind(". "), window.rfind("? "), window.rfind("! "))
    if sentence_end >= limit * 0.55:
        return window[: sentence_end + 1]
    cut = window.rsplit(" ", 1)[0] if " " in window else window
    return cut.rstrip(" ,;:-–—") + "…"


def make_summary(text: str) -> str:
    first = text.split("\n", 1)[0] if text else ""
    return _truncate(first, SUMMARY_MAX_CHARS)


def make_body(full_text: str, summary: str) -> str:
    """A short excerpt (never the full story): paragraphs after the summary."""
    paragraphs = [p for p in full_text.split("\n") if p]
    if paragraphs and len(paragraphs[0]) <= SUMMARY_MAX_CHARS and paragraphs[0] == summary:
        paragraphs = paragraphs[1:]
    elif paragraphs and summary.endswith("…"):
        pass  # summary was cut from the first paragraph: keep it for the excerpt
    out: list[str] = []
    used = 0
    for p in paragraphs:
        room = EXCERPT_MAX_CHARS - used
        if room <= 80 and out:
            break
        if len(p) > room:
            out.append(_truncate(p, max(room, 120)))
            break
        out.append(p)
        used += len(p)
    return "\n\n".join(out)


def normalize_url(url: str | None) -> str:
    """Canonical https URL without tracking parameters (used for de-duplication)."""
    if not url:
        return ""
    parts = urlparse(url.strip())
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return ""
    query = [
        (k, v)
        for k, v in parse_qsl(parts.query, keep_blank_values=True)
        if not k.lower().startswith(_TRACKING_PREFIXES) and k.lower() not in _TRACKING_KEYS
    ]
    path = parts.path.rstrip("/") or "/"
    return urlunparse(("https", parts.netloc.lower(), path, "", urlencode(query), ""))


def slugify(title: str) -> str:
    out = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return out[:80].strip("-") or "story"


def make_slug(title: str, url: str) -> str:
    return f"{slugify(title)}-{hashlib.sha1(url.encode()).hexdigest()[:8]}"


_BBC_IMG_RE = re.compile(r"(ichef\.bbci\.co\.uk/(?:ace/)?(?:ws/)?standard/)\d+(/)")


def clean_image_url(url: str | None) -> str:
    if not url:
        return ""
    url = url.strip()
    if url.startswith("//"):
        url = "https:" + url
    if url.startswith("http://"):
        url = "https://" + url[len("http://"):]
    if not url.startswith("https://") or len(url) > 1000:
        return ""
    # BBC feeds ship 240px thumbnails; their image host serves 800px too.
    return _BBC_IMG_RE.sub(r"\g<1>800\g<2>", url)


def _to_int(value) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _safe_err(exc: Exception) -> str:
    """Error text that can never contain a URL (API keys travel in query strings)."""
    if isinstance(exc, httpx.HTTPStatusError):
        return f"HTTP {exc.response.status_code}"
    if isinstance(exc, httpx.TimeoutException):
        return "timeout"
    return type(exc).__name__ + (f": {exc}" if isinstance(exc, ValueError) else "")


# ── Fetching ─────────────────────────────────────────────────────────────────


def _get(client: httpx.Client, url: str, params: dict | None = None) -> httpx.Response:
    resp = client.get(url, params=params)
    resp.raise_for_status()
    if len(resp.content) > MAX_RESPONSE_BYTES:
        raise ValueError("response too large")
    return resp


def _entry_time(entry, now: datetime) -> datetime:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        try:
            when = datetime(*parsed[:6], tzinfo=UTC)
        except (TypeError, ValueError):
            return now
        return min(when, now)  # never publish "in the future"
    return now


def _pick_image(entry) -> str:
    candidates: list[tuple[int, str]] = []
    for m in entry.get("media_content") or []:
        url = m.get("url")
        kind = (m.get("medium") or "").lower()
        mime = (m.get("type") or "").lower()
        if url and (kind == "image" or mime.startswith("image/") or re.search(r"\.(?:jpe?g|png|webp)(?:\?|$)", url, re.I)):
            candidates.append((_to_int(m.get("width")), url))
    for m in entry.get("media_thumbnail") or []:
        if m.get("url"):
            candidates.append((_to_int(m.get("width")), m["url"]))
    for enc in entry.get("enclosures") or []:
        if (enc.get("type") or "").lower().startswith("image/"):
            candidates.append((0, enc.get("href") or enc.get("url") or ""))
    if candidates:
        for _, url in sorted(candidates, key=lambda c: c[0], reverse=True):
            cleaned = clean_image_url(url)
            if cleaned:
                return cleaned
    blob = (entry.get("summary") or "") + " ".join(c.get("value", "") for c in entry.get("content") or [])
    found = re.search(r"""<img[^>]+src=["']([^"']+)""", blob, re.I)
    return clean_image_url(found.group(1)) if found else ""


def _entry_author(entry) -> str:
    name = entry.get("author") or ""
    if not name and entry.get("authors"):
        name = entry["authors"][0].get("name", "")
    name = _one_line(name)
    paren = re.search(r"\(([^)]+)\)", name)  # "mail@x.com (Jane Doe)"
    if "@" in name and paren:
        name = paren.group(1)
    return "" if "@" in name else name[:120]


def entry_to_item(entry, category: str, source: str, now: datetime) -> NewsItem | None:
    title = _one_line(entry.get("title"))
    url = normalize_url(entry.get("link"))
    if not title or not url:
        return None
    published = _entry_time(entry, now)
    if published < now - timedelta(days=_env_int("NEWS_MAX_AGE_DAYS", 14)):
        return None

    desc_text = clean_text(entry.get("summary") or entry.get("description"))
    content_html = max((c.get("value", "") for c in entry.get("content") or []), key=len, default="")
    content_text = clean_text(content_html)
    lead = desc_text or content_text
    summary = make_summary(lead)
    longer = content_text if len(content_text) > len(desc_text) else desc_text
    return NewsItem(
        category=category,
        title=title[:300],
        url=url,
        source=source,
        summary=summary,
        body=make_body(longer, summary),
        author=_entry_author(entry),
        image_url=_pick_image(entry),
        published=published,
    )


def fetch_rss(client: httpx.Client, category: str, source: str, url: str, now: datetime):
    resp = _get(client, url)
    parsed = feedparser.parse(resp.content)
    if not parsed.entries:
        raise ValueError("feed has no entries")
    items = [i for e in parsed.entries[: MAX_PER_FEED * 3] if (i := entry_to_item(e, category, source, now))]
    items.sort(key=lambda i: i.published, reverse=True)
    return items[:MAX_PER_FEED], []


def _parse_iso(value: str | None, now: datetime) -> datetime:
    if not value:
        return now
    try:
        when = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return now
    if when.tzinfo is None:
        when = when.replace(tzinfo=UTC)
    return min(when.astimezone(UTC), now)


def fetch_guardian(client: httpx.Client, key: str, now: datetime):
    items: list[NewsItem] = []
    errors: list[str] = []
    cutoff = now - timedelta(days=_env_int("NEWS_MAX_AGE_DAYS", 14))
    for n, (category, extra) in enumerate(GUARDIAN_SEARCHES):
        if n:
            time.sleep(_env_float("GUARDIAN_CALL_SPACING", 1.0))
        params = {
            "api-key": key,
            "page-size": MAX_PER_FEED,
            "order-by": "newest",
            "show-fields": "trailText,byline,thumbnail",
            **extra,
        }
        try:
            results = _get(client, GUARDIAN_URL, params).json()["response"]["results"]
        except Exception as exc:  # one bad section must not sink the rest
            errors.append(f"{category}: {_safe_err(exc)}")
            continue
        for r in results:
            fields = r.get("fields") or {}
            title = _one_line(r.get("webTitle"))
            url = normalize_url(r.get("webUrl"))
            published = _parse_iso(r.get("webPublicationDate"), now)
            if not title or not url or published < cutoff:
                continue
            summary = make_summary(clean_text(fields.get("trailText")))
            items.append(
                NewsItem(
                    category=category, title=title[:300], url=url, source="The Guardian",
                    summary=summary, published=published,
                    author=_one_line(fields.get("byline"))[:120],
                    image_url=clean_image_url(fields.get("thumbnail")),
                )
            )
    return items, errors


def fetch_nyt(client: httpx.Client, key: str, now: datetime):
    items: list[NewsItem] = []
    errors: list[str] = []
    cutoff = now - timedelta(days=_env_int("NEWS_MAX_AGE_DAYS", 14))
    for n, (category, section) in enumerate(NYT_SECTIONS):
        if n:
            time.sleep(_env_float("NYT_CALL_SPACING", 12.5))  # free tier: 5 calls/minute
        try:
            results = _get(client, NYT_URL.format(section=section), {"api-key": key}).json().get("results") or []
        except httpx.HTTPStatusError as exc:
            errors.append(f"{category}: {_safe_err(exc)}")
            if exc.response.status_code == 429:
                break  # rate limited: stop, try again next run
            continue
        except Exception as exc:
            errors.append(f"{category}: {_safe_err(exc)}")
            continue
        for r in results[:MAX_PER_FEED]:
            title = _one_line(r.get("title"))
            url = normalize_url(r.get("url"))
            published = _parse_iso(r.get("published_date"), now)
            if not title or not url or published < cutoff:
                continue
            media = [m for m in r.get("multimedia") or [] if (m.get("type") or "image") == "image" and m.get("url")]
            best = max(media, key=lambda m: _to_int(m.get("width")), default=None)
            author = re.sub(r"^by\s+", "", _one_line(r.get("byline")), flags=re.I)
            items.append(
                NewsItem(
                    category=category, title=title[:300], url=url, source="The New York Times",
                    summary=make_summary(clean_text(r.get("abstract"))), published=published,
                    author=author[:120],
                    image_url=clean_image_url(best["url"]) if best else "",
                    image_alt=_one_line(best.get("caption"))[:300] if best else "",
                )
            )
    return items, errors


def _merge(a: NewsItem, b: NewsItem) -> NewsItem:
    """Same story from two sources: keep the first, fill its gaps from the second."""
    a.image_url = a.image_url or b.image_url
    a.image_alt = a.image_alt or b.image_alt
    a.author = a.author or b.author
    if len(b.summary) > len(a.summary):
        a.summary = b.summary
    a.body = a.body or b.body
    return a


def collect_items(now: datetime | None = None) -> tuple[list[NewsItem], dict]:
    """Fetch every configured source concurrently. Failures are isolated per source."""
    now = now or datetime.now(UTC)
    report: dict[str, dict] = {}
    gathered: list[NewsItem] = []
    headers = {"User-Agent": USER_AGENT, "Accept": "application/rss+xml, application/atom+xml, application/xml, application/json;q=0.9, */*;q=0.5"}

    with httpx.Client(headers=headers, timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        with ThreadPoolExecutor(max_workers=10, thread_name_prefix="news") as pool:
            futures = {}
            for category, source, url in RSS_FEEDS:
                futures[pool.submit(fetch_rss, client, category, source, url, now)] = f"rss · {source} · {category}"
            if guardian_key():
                futures[pool.submit(fetch_guardian, client, guardian_key(), now)] = "api · The Guardian"
            if nyt_key():
                futures[pool.submit(fetch_nyt, client, nyt_key(), now)] = "api · The New York Times"
            for fut in as_completed(futures):
                label = futures[fut]
                try:
                    items, errors = fut.result()
                except Exception as exc:
                    report[label] = {"ok": False, "items": 0, "error": _safe_err(exc)}
                    log.warning("news source failed: %s (%s)", label, _safe_err(exc))
                    continue
                gathered.extend(items)
                report[label] = {"ok": not errors or bool(items), "items": len(items)}
                if errors:
                    report[label]["errors"] = errors

    merged: dict[str, NewsItem] = {}
    for item in gathered:  # RSS first, then APIs: APIs fill gaps, RSS wins ties
        existing = merged.get(item.url)
        merged[item.url] = _merge(existing, item) if existing else item
    return list(merged.values()), report


# ── Storage ──────────────────────────────────────────────────────────────────


def store_items(db, items: list[NewsItem]) -> int:
    """Insert items not stored yet (matched on canonical URL). Returns the count added."""
    ext = models.Article
    seen_urls = {u for (u,) in db.query(ext.source_url).filter(ext.is_external.is_(True)).all()}
    seen_slugs = {s for (s,) in db.query(ext.slug).all()}
    added = 0
    for item in sorted(items, key=lambda i: i.published):  # oldest first -> newest gets the highest id
        if item.category not in CATEGORIES or item.url in seen_urls:
            continue
        slug = make_slug(item.title, item.url)
        if slug in seen_slugs:
            continue
        words = len(f"{item.summary} {item.body}".split())
        db.add(
            ext(
                slug=slug,
                title=item.title,
                summary=item.summary,
                body=item.body,
                category=item.category,
                author=item.author or item.source,
                image_url=item.image_url,
                image_alt=item.image_alt or item.title,
                image_credit=f"Image: {item.source}" if item.image_url else "",
                read_minutes=max(1, round(words / 200)),
                is_featured=False,
                is_demo=False,
                is_external=True,
                status="published",
                source_name=item.source,
                source_url=item.url,
                published_at=item.published,
            )
        )
        seen_urls.add(item.url)
        seen_slugs.add(slug)
        added += 1
    db.flush()
    return added


def refresh_featured(db) -> None:
    """Feature the newest illustrated story of each section (feed articles only)."""
    ext = models.Article
    base = db.query(ext).filter(ext.is_external.is_(True))
    base.filter(ext.is_featured.is_(True)).update({"is_featured": False}, synchronize_session=False)
    for category in CATEGORIES:
        top = (
            base.filter(ext.status == "published", ext.category == category, ext.image_url != "")
            .order_by(desc(ext.published_at), desc(ext.id))
            .first()
        )
        if top:
            top.is_featured = True
    db.flush()


def prune(db) -> int:
    """Keep only the newest NEWS_KEEP_PER_CATEGORY feed articles per section."""
    ext = models.Article
    keep = _env_int("NEWS_KEEP_PER_CATEGORY", 60, minimum=10)
    removed = 0
    for category in CATEGORIES:
        stale = (
            db.query(ext.id)
            .filter(ext.is_external.is_(True), ext.category == category)
            .order_by(desc(ext.published_at), desc(ext.id))
            .offset(keep)
            .all()
        )
        ids = [i for (i,) in stale]
        if ids:
            removed += db.query(ext).filter(ext.id.in_(ids)).delete(synchronize_session=False)
    return removed


MIN_REAL_ARTICLES_BEFORE_DEMO_REMOVAL = 10


def remove_demo(db) -> int:
    """Delete the fictional demo articles once enough real ones exist."""
    if not _env_flag("NEWS_REMOVE_DEMO", True):
        return 0
    ext = models.Article
    real = db.query(ext).filter(ext.is_external.is_(True), ext.status == "published").count()
    if real < MIN_REAL_ARTICLES_BEFORE_DEMO_REMOVAL:
        return 0  # feeds unreachable: don't leave the site empty
    return db.query(ext).filter(ext.is_demo.is_(True)).delete(synchronize_session=False)


# ── Orchestration, status, scheduling ────────────────────────────────────────

_run_lock = threading.Lock()
_status_lock = threading.Lock()
_STATUS: dict = {"running": False, "last_started": None, "last_finished": None, "last_summary": None, "sources": {}}


def _set_status(**changes) -> None:
    with _status_lock:
        _STATUS.update(changes)


def get_status() -> dict:
    with _status_lock:
        snapshot = dict(_STATUS)
    snapshot["configured"] = {"guardian_api": bool(guardian_key()), "nyt_api": bool(nyt_key()), "rss_feeds": len(RSS_FEEDS)}
    snapshot["auto_refresh"] = _env_flag("NEWS_AUTO_REFRESH", True)
    snapshot["interval_minutes"] = _env_int("NEWS_REFRESH_MINUTES", 60, minimum=10)
    return snapshot


def run_ingest(session_factory=SessionLocal, collect=collect_items) -> dict:
    """One full refresh: fetch -> store -> feature -> prune -> drop demo content."""
    if not _run_lock.acquire(blocking=False):
        return {"skipped": "a refresh is already running"}
    started = datetime.now(UTC)
    _set_status(running=True, last_started=started.isoformat())
    t0 = time.monotonic()
    db = session_factory()
    try:
        items, report = collect()
        added = store_items(db, items)
        refresh_featured(db)
        pruned = prune(db)
        demo_removed = remove_demo(db)
        db.commit()
        summary = {
            "fetched": len(items),
            "added": added,
            "pruned": pruned,
            "demo_removed": demo_removed,
            "sources_ok": sum(1 for r in report.values() if r["ok"]),
            "sources_failed": sum(1 for r in report.values() if not r["ok"]),
            "seconds": round(time.monotonic() - t0, 1),
        }
        _set_status(last_summary=summary, sources=report)
        log.info("news refresh: %s", summary)
        return summary
    except Exception:
        db.rollback()
        log.exception("news refresh failed")
        _set_status(last_summary={"error": "refresh failed; see server log"})
        raise
    finally:
        db.close()
        _set_status(running=False, last_finished=datetime.now(UTC).isoformat())
        _run_lock.release()


def trigger_refresh_async() -> bool:
    """Start a refresh in the background. False if one is already running."""
    if _run_lock.locked():
        return False

    def _job():
        try:
            run_ingest()
        except Exception:
            pass  # already logged

    threading.Thread(target=_job, name="news-refresh-now", daemon=True).start()
    return True


def _loop() -> None:
    time.sleep(2)  # let the app finish starting
    while True:
        try:
            run_ingest()
        except Exception:
            pass  # already logged; try again next interval
        time.sleep(_env_int("NEWS_REFRESH_MINUTES", 60, minimum=10) * 60)


_loop_started = False


def start_background_refresh() -> bool:
    """Start the refresher thread once per process. No-op when NEWS_AUTO_REFRESH=0."""
    global _loop_started
    if _loop_started or not _env_flag("NEWS_AUTO_REFRESH", True):
        return False
    _loop_started = True
    threading.Thread(target=_loop, name="news-refresher", daemon=True).start()
    return True


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    import json

    from database import engine
    from migrations import ensure_schema

    models.Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    result = run_ingest()
    print(json.dumps({"summary": result, "sources": get_status()["sources"]}, indent=2, default=str))
    sys.exit(0)
