"""Offline tests for news_ingest (no network: HTTP is served by httpx.MockTransport).

    cd backend && python -m pytest test_news_ingest.py -q
"""

import json
import os
import tempfile
import unittest
from datetime import UTC, datetime, timedelta
from unittest import mock

_tmp = tempfile.mkdtemp()
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_tmp}/unused.db")
os.environ["NEWS_AUTO_REFRESH"] = "0"
os.environ["GUARDIAN_CALL_SPACING"] = "0"
os.environ["NYT_CALL_SPACING"] = "0"

import feedparser  # noqa: E402
import httpx  # noqa: E402
import models  # noqa: E402
import news_ingest as ni  # noqa: E402
from migrations import ensure_schema  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

REAL_CLIENT = httpx.Client
NOW = datetime(2026, 11, 20, 12, 0, tzinfo=UTC)


def rfc822(dt: datetime) -> str:
    return dt.strftime("%a, %d %b %Y %H:%M:%S GMT")


def bbc_feed(n=3, hours_ago=2) -> str:
    items = "".join(
        f"""<item>
  <title>BBC story {i}</title>
  <description>Short BBC summary number {i}.</description>
  <link>https://www.bbc.com/news/articles/c{i}abc?at_medium=RSS&amp;at_campaign=rss</link>
  <guid isPermaLink="false">https://www.bbc.com/news/articles/c{i}abc#0</guid>
  <pubDate>{rfc822(NOW - timedelta(hours=hours_ago + i))}</pubDate>
  <media:thumbnail width="240" height="135" url="https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/{i}/image.jpg"/>
</item>"""
        for i in range(n)
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0"><channel><title>BBC</title>{items}</channel></rss>"""


GUARDIAN_FEED = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" version="2.0"><channel>
<title>Guardian</title>
<item>
  <title>A long read about harbours</title>
  <link>https://www.theguardian.com/world/2026/nov/20/harbours</link>
  <description>&lt;p&gt;The lead paragraph about harbours and tides.&lt;/p&gt;&lt;p&gt;Second paragraph with more detail.&lt;/p&gt;&lt;p&gt;Continue reading...&lt;/p&gt;</description>
  <pubDate>{rfc822(NOW - timedelta(hours=1))}</pubDate>
  <dc:creator>Jane Reporter</dc:creator>
  <media:content width="140" url="https://i.guim.co.uk/img/a.jpg?width=140&amp;s=aaa"/>
  <media:content width="460" url="https://i.guim.co.uk/img/a.jpg?width=460&amp;s=bbb"/>
</item></channel></rss>"""

LONG_TEXT = " ".join(f"Sentence number {i} of a very long story that must never be copied in full." for i in range(60))
NPR_FEED = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/" version="2.0"><channel>
<title>NPR</title>
<item>
  <title>NPR long story</title>
  <link>https://www.npr.org/2026/11/20/1/long-story?utm_source=rss&amp;utm_medium=feed</link>
  <description>NPR teaser sentence.</description>
  <content:encoded>&lt;p&gt;NPR teaser sentence.&lt;/p&gt;&lt;p&gt;{LONG_TEXT}&lt;/p&gt;&lt;p&gt;{LONG_TEXT}&lt;/p&gt;</content:encoded>
  <pubDate>{rfc822(NOW - timedelta(hours=3))}</pubDate>
</item>
<item>
  <title>Ancient story</title>
  <link>https://www.npr.org/2026/01/01/old</link>
  <description>Too old.</description>
  <pubDate>{rfc822(NOW - timedelta(days=60))}</pubDate>
</item>
<item>
  <title>Story from the future</title>
  <link>https://www.npr.org/2026/11/21/future</link>
  <description>Clock skew.</description>
  <pubDate>{rfc822(NOW + timedelta(days=2))}</pubDate>
</item></channel></rss>"""

ATOM_FEED = f"""<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Verge</title>
<entry><title>An Atom entry</title><link rel="alternate" href="https://www.theverge.com/2026/11/20/atom"/>
<published>{(NOW - timedelta(hours=5)).isoformat()}</published>
<author><name>Verge Writer</name></author>
<content type="html">&lt;p&gt;Atom body text.&lt;/p&gt;&lt;img src="//cdn.vox-cdn.com/uploads/pic.jpg"/&gt;</content></entry></feed>"""


def make_db():
    eng = create_engine(f"sqlite:///{tempfile.mkdtemp()}/news.db")
    models.Base.metadata.create_all(bind=eng)
    return sessionmaker(bind=eng, autoflush=False)


def mock_client_factory(handler):
    def factory(**kwargs):
        kwargs.pop("transport", None)
        return REAL_CLIENT(transport=httpx.MockTransport(handler), **kwargs)

    return factory


class TextHelpers(unittest.TestCase):
    def test_clean_text_and_boilerplate(self):
        raw = "<p>Hello &amp; <b>welcome</b></p><p>Continue reading...</p><p>Second   line</p>"
        self.assertEqual(ni.clean_text(raw), "Hello & welcome\nSecond line")
        self.assertEqual(ni.clean_text(None), "")

    def test_truncate_prefers_sentence_end(self):
        text = "First sentence is here. " * 30
        cut = ni._truncate(text, 100)
        self.assertLessEqual(len(cut), 101)
        self.assertTrue(cut.endswith("."))
        self.assertTrue(ni._truncate("word " * 100, 50).endswith("…"))

    def test_normalize_url(self):
        self.assertEqual(
            ni.normalize_url("http://www.BBC.com/news/articles/c1/?at_medium=RSS&utm_source=x&id=7"),
            "https://www.bbc.com/news/articles/c1?id=7",
        )
        self.assertEqual(ni.normalize_url("javascript:alert(1)"), "")
        self.assertEqual(ni.normalize_url(""), "")

    def test_image_url_rules(self):
        self.assertEqual(ni.clean_image_url("//cdn.x.com/a.jpg"), "https://cdn.x.com/a.jpg")
        self.assertEqual(ni.clean_image_url("http://cdn.x.com/a.jpg"), "https://cdn.x.com/a.jpg")
        self.assertEqual(ni.clean_image_url("data:image/png;base64,AAAA"), "")
        self.assertIn("/standard/800/", ni.clean_image_url("https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/1/i.jpg"))
        # Signed CDN URLs must be left untouched.
        signed = "https://i.guim.co.uk/img/a.jpg?width=460&s=bbb"
        self.assertEqual(ni.clean_image_url(signed), signed)

    def test_slug_is_stable_and_unique_per_url(self):
        a = ni.make_slug("Same Title!", "https://a.com/1")
        b = ni.make_slug("Same Title!", "https://a.com/2")
        self.assertNotEqual(a, b)
        self.assertEqual(a, ni.make_slug("Same Title!", "https://a.com/1"))
        self.assertTrue(a.startswith("same-title-"))


class FeedParsing(unittest.TestCase):
    def items(self, xml, category="World", source="Test"):
        parsed = feedparser.parse(xml.encode())
        return [i for e in parsed.entries if (i := ni.entry_to_item(e, category, source, NOW))]

    def test_bbc_style(self):
        items = self.items(bbc_feed())
        self.assertEqual(len(items), 3)
        first = items[0]
        self.assertEqual(first.url, "https://www.bbc.com/news/articles/c0abc")  # tracking stripped
        self.assertEqual(first.summary, "Short BBC summary number 0.")
        self.assertEqual(first.body, "")  # nothing beyond the summary: no duplicate paragraph
        self.assertIn("/standard/800/", first.image_url)

    def test_guardian_style_author_image_and_excerpt(self):
        (item,) = self.items(GUARDIAN_FEED)
        self.assertEqual(item.author, "Jane Reporter")
        self.assertIn("width=460", item.image_url)  # largest supplied size, URL unchanged
        self.assertEqual(item.summary, "The lead paragraph about harbours and tides.")
        self.assertEqual(item.body, "Second paragraph with more detail.")  # 'Continue reading' dropped

    def test_never_copies_full_text(self):
        items = {i.title: i for i in self.items(NPR_FEED)}
        story = items["NPR long story"]
        self.assertEqual(story.summary, "NPR teaser sentence.")
        self.assertLessEqual(len(story.body), ni.EXCERPT_MAX_CHARS + 5)
        self.assertLess(len(story.body), len(LONG_TEXT))
        self.assertNotIn("utm_", story.url)

    def test_old_items_skipped_and_future_dates_clamped(self):
        items = {i.title: i for i in self.items(NPR_FEED)}
        self.assertNotIn("Ancient story", items)
        self.assertLessEqual(items["Story from the future"].published, NOW)

    def test_atom_entry(self):
        (item,) = self.items(ATOM_FEED, "Technology", "The Verge")
        self.assertEqual(item.author, "Verge Writer")
        self.assertEqual(item.image_url, "https://cdn.vox-cdn.com/uploads/pic.jpg")  # first <img>, https
        self.assertEqual(item.summary, "Atom body text.")


class ApiAdapters(unittest.TestCase):
    def test_guardian_adapter(self):
        seen = []

        def handler(req: httpx.Request):
            seen.append(dict(req.url.params))
            if req.url.params.get("section") == "sport":
                return httpx.Response(500)
            payload = {"response": {"results": [{
                "webTitle": "Guardian API story", "webUrl": "https://www.theguardian.com/x/y?CMP=share",
                "webPublicationDate": (NOW - timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "fields": {"trailText": "<strong>Trail</strong> text.", "byline": "Sam Writer",
                           "thumbnail": "https://media.guim.co.uk/t.jpg"},
            }]}}
            return httpx.Response(200, json=payload)

        with REAL_CLIENT(transport=httpx.MockTransport(handler)) as client:
            items, errors = ni.fetch_guardian(client, "SECRET-KEY", NOW)
        self.assertEqual(len(items), len(ni.GUARDIAN_SEARCHES) - 1)
        self.assertEqual(items[0].summary, "Trail text.")
        self.assertEqual(items[0].author, "Sam Writer")
        self.assertEqual(items[0].url, "https://www.theguardian.com/x/y?CMP=share".split("?")[0])
        self.assertEqual(errors, ["Sports: HTTP 500"])
        self.assertTrue(all("SECRET-KEY" not in e for e in errors))
        self.assertEqual(seen[0]["api-key"], "SECRET-KEY")

    def test_nyt_adapter_and_rate_limit_stop(self):
        calls = []

        def handler(req: httpx.Request):
            calls.append(req.url.path)
            if len(calls) == 3:
                return httpx.Response(429)
            return httpx.Response(200, json={"results": [{
                "title": "NYT story", "abstract": "An abstract.", "url": "https://www.nytimes.com/2026/11/20/a.html",
                "byline": "By Pat Doe", "published_date": (NOW - timedelta(hours=4)).isoformat(),
                "multimedia": [{"type": "image", "url": "https://static01.nyt.com/small.jpg", "width": 100},
                               {"type": "image", "url": "https://static01.nyt.com/big.jpg", "width": 2000, "caption": "A caption"}],
            }]})

        with REAL_CLIENT(transport=httpx.MockTransport(handler)) as client:
            items, errors = ni.fetch_nyt(client, "K", NOW)
        self.assertEqual(len(calls), 3)  # stopped after the 429
        self.assertEqual(errors, ["Politics: HTTP 429"])
        self.assertEqual(items[0].author, "Pat Doe")
        self.assertEqual(items[0].image_url, "https://static01.nyt.com/big.jpg")
        self.assertEqual(items[0].image_alt, "A caption")


class EndToEnd(unittest.TestCase):
    def setUp(self):
        self.Session = make_db()
        self.feeds = [
            ("World", "BBC News", "https://feeds.example/bbc.xml"),
            ("Technology", "The Verge", "https://feeds.example/verge.xml"),
            ("Sports", "Broken", "https://feeds.example/broken.xml"),
        ]

        def handler(req: httpx.Request):
            host_path = str(req.url)
            if host_path.endswith("bbc.xml"):
                return httpx.Response(200, content=bbc_feed(n=12).encode())
            if host_path.endswith("verge.xml"):
                return httpx.Response(200, content=ATOM_FEED.encode())
            return httpx.Response(503)

        self.patches = [
            mock.patch.object(ni, "RSS_FEEDS", self.feeds),
            mock.patch.object(ni.httpx, "Client", side_effect=mock_client_factory(handler)),
            mock.patch.object(ni, "datetime", wraps=datetime),
            mock.patch.dict(os.environ, {"GUARDIAN_API_KEY": "", "NYT_API_KEY": ""}),
        ]
        for p in self.patches:
            p.start()
        ni.datetime.now = lambda tz=None: NOW  # fixed clock for the run

    def tearDown(self):
        for p in self.patches:
            p.stop()

    def add_demo(self, db, n=3):
        for i in range(n):
            db.add(models.Article(slug=f"demo-{i}", title=f"Fictional {i}", category="World", is_demo=True,
                                  status="published", published_at=NOW))
        db.commit()

    def count(self, **flt):
        db = self.Session()
        try:
            return db.query(models.Article).filter_by(**flt).count()
        finally:
            db.close()

    def test_run_stores_reports_and_dedupes(self):
        summary = ni.run_ingest(session_factory=self.Session)
        self.assertEqual(summary["added"], ni.MAX_PER_FEED + 1)  # 12 BBC (capped) + 1 Atom
        self.assertEqual((summary["sources_ok"], summary["sources_failed"]), (2, 1))
        self.assertEqual(self.count(is_external=True), 13)

        status = ni.get_status()
        broken = next(v for k, v in status["sources"].items() if "Broken" in k)
        self.assertEqual(broken["error"], "HTTP 503")
        self.assertFalse(status["running"])
        self.assertNotIn("api_key", json.dumps(status).lower().replace("guardian_api", "").replace("nyt_api", ""))

        again = ni.run_ingest(session_factory=self.Session)
        self.assertEqual(again["added"], 0)  # same URLs -> no duplicates
        self.assertEqual(self.count(is_external=True), 13)

        db = self.Session()
        try:
            art = db.query(models.Article).filter_by(source_name="BBC News").first()
            self.assertEqual(art.status, "published")
            self.assertFalse(art.is_demo)
            self.assertEqual(art.image_credit, "Image: BBC News")
            self.assertEqual(art.author, "BBC News")  # no byline in the feed -> publisher
            featured = db.query(models.Article).filter_by(is_featured=True).all()
            self.assertEqual({a.category for a in featured}, {"World", "Technology"})
        finally:
            db.close()

    def test_demo_articles_replaced_only_when_enough_real_news(self):
        db = self.Session()
        self.add_demo(db)
        db.close()
        with mock.patch.object(ni, "RSS_FEEDS", [self.feeds[1], self.feeds[2]]):
            ni.run_ingest(session_factory=self.Session)  # only 1 real article -> keep demo content
        self.assertEqual(self.count(is_demo=True), 3)

        summary = ni.run_ingest(session_factory=self.Session)  # 13 real articles -> demo removed
        self.assertEqual(summary["demo_removed"], 3)
        self.assertEqual(self.count(is_demo=True), 0)

    def test_admin_written_articles_survive(self):
        db = self.Session()
        db.add(models.Article(slug="mine", title="Mine", category="World", status="published", published_at=NOW))
        db.commit()
        db.close()
        ni.run_ingest(session_factory=self.Session)
        self.assertEqual(self.count(slug="mine"), 1)

    def test_prune_keeps_newest_per_section(self):
        with mock.patch.dict(os.environ, {"NEWS_KEEP_PER_CATEGORY": "10"}):
            summary = ni.run_ingest(session_factory=self.Session)
        self.assertEqual(summary["pruned"], 2)  # 12 World items -> keep 10
        db = self.Session()
        try:
            kept = db.query(models.Article).filter_by(category="World").count()
            self.assertEqual(kept, 10)
            oldest_kept = db.query(models.Article).filter_by(category="World").order_by(models.Article.published_at).first()
            self.assertEqual(oldest_kept.title, "BBC story 9")
        finally:
            db.close()

    def test_second_concurrent_run_is_skipped(self):
        with ni._run_lock:
            self.assertEqual(ni.run_ingest(session_factory=self.Session), {"skipped": "a refresh is already running"})
            self.assertFalse(ni.trigger_refresh_async())


class Migration(unittest.TestCase):
    def test_adds_columns_to_a_pre_existing_articles_table(self):
        eng = create_engine(f"sqlite:///{tempfile.mkdtemp()}/old.db")
        with eng.begin() as c:
            c.execute(text("CREATE TABLE articles (id INTEGER PRIMARY KEY, slug VARCHAR, title VARCHAR, category VARCHAR, is_demo BOOLEAN)"))
            c.execute(text("INSERT INTO articles (slug, title, category, is_demo) VALUES ('a', 'Old demo', 'World', 1)"))
        added = ensure_schema(eng)
        self.assertEqual(sorted(a for a in added if a.startswith("articles.")),
                         ["articles.is_external", "articles.source_name", "articles.source_url"])
        with eng.connect() as c:
            row = c.execute(text("SELECT is_external, source_name, source_url FROM articles")).one()
        self.assertEqual((row[0], row[1], row[2]), (0, "", ""))
        self.assertEqual(ensure_schema(eng), [])  # idempotent


if __name__ == "__main__":
    unittest.main()
