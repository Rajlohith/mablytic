"""Demonstration ad creatives and campaigns (fictional advertisers).

News articles are NOT defined here any more: they come from real RSS feeds and
free news APIs (see news_ingest.py).
"""

def slugify(title: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in title)
    return "-".join(p for p in out.split("-") if p)[:90]



# ── Advertisements (fictional advertisers) ───────────────────────────────────
# (title, advertiser, category, variant, placement, copy, cta color key)
NEW_ADS: list[tuple[str, str, str, str, str, str]] = [
    ("Wake up to a quieter mattress", "Lumen & Pine", "health", "A", "feed", "Cooling foam, a 100-night trial and free returns. Sleep on it for three months before you decide."),
    ("The 11-ounce trail shoe", "Fernbrook Outfitters", "fitness", "B", "sidebar", "Grippy, breathable and built for wet rock. Free shipping on your first pair."),
    ("Learn Portuguese in ten minutes a day", "Palavra Lab", "education", "A", "inline", "Short daily lessons with a real teacher on call. Try the first month free."),
    ("Flights to the islands from $129", "Skyvale Air", "travel", "B", "banner", "Fares to nine island destinations. Book by Friday and change your plans at no charge."),
    ("A better cup, every morning", "Harrow Roasters", "food", "A", "feed", "Small-lot beans roasted on Monday and shipped on Tuesday. Subscribe and save 20%."),
    ("Your next monitor is 4K and 27 inches", "Pixelforge", "tech", "A", "sidebar", "True color, USB-C charging and a stand that actually adjusts. 30-day returns."),
    ("Season tickets, now on the flexible plan", "Ironwood Rovers", "sports", "B", "feed", "Pick any 12 home matches and swap seats on game day. Plans start at $180."),
    ("Audiobooks that fit your commute", "Quillcast", "books", "A", "inline", "Thousands of titles, offline listening and a new recommendation every Friday."),
    ("Controllers for small hands and big plays", "Gridlock Gear", "gaming", "B", "sidebar", "Remappable buttons, hall-effect sticks and a two-year warranty."),
    ("Meal kits without the packaging pile", "Basil & Birch", "food", "B", "inline", "Reusable boxes, local produce and a pickup point near you."),
    ("A savings account that pays you to wait", "Northfield Credit Union", "education", "A", "banner", "High-yield savings with no minimum balance and no monthly fees. Member-owned."),
    ("Meditation, but make it practical", "Stillwater", "health", "B", "feed", "Five-minute sessions for stress, focus and sleep. Cancel any time."),
    ("Secure cloud storage for the whole household", "Vaultly", "tech", "B", "inline", "Encrypted by default, with simple sharing for families. 1 TB for $6 a month."),
    ("Weekend city breaks, handpicked", "Wanderline", "travel", "A", "sidebar", "Boutique stays, walking itineraries and local guides. Ask about winter rates."),
]

CAMPAIGNS = [
    ("Autumn Subscriptions", "active", 12000.0),
    ("Winter Travel Push", "active", 8500.0),
    ("Back-to-Learning", "paused", 4000.0),
]


# Original v3 ads, moved here unchanged so art generation needs no database.
LEGACY_ADS = [
    # Tech — A & B
    dict(title="MacBook Pro M5",          category="tech",      variant="A",
         content="Experience unprecedented power with the M5 chip. Up to 24-hour battery life and a stunning Liquid Retina XDR display. Starting at $1,999."),
    dict(title="iPhone 17 Pro",           category="tech",      variant="B",
         content="Revolutionary 5x optical zoom and an all-new titanium design. Pre-order now and get $100 off with trade-in."),
    # Gaming — A & B
    dict(title="PlayStation 6 — Pre-Order",  category="gaming", variant="A",
         content="Next-gen gaming begins this November. 8K resolution, 240fps, and true haptic feedback. Secure your console today."),
    dict(title="RTX 5090 Graphics Card",  category="gaming",    variant="B",
         content="Double the ray-tracing performance of its predecessor. AI-enhanced frame generation at 4K 144fps. Limited stock available."),
    # Fitness — A & B
    dict(title="FitPro Smartwatch Ultra", category="fitness",   variant="A",
         content="Clinical-grade heart-rate, sleep, and VO2 max tracking. 14-day battery. Waterproof to 100m. Free 3-month coaching plan included."),
    dict(title="Protein Max — Build Faster", category="fitness", variant="B",
         content="Scientifically formulated with 40g protein per serving and zero fillers. Trusted by Olympic athletes. Try your first batch for $9.99."),
    # Health — A & B
    dict(title="MyFitnessPal Premium",    category="health",    variant="A",
         content="Complete nutrition tracking, macro goals, and guided meal plans. 14-day free trial. No credit card required."),
    dict(title="MindWell — Calm in 10 Min", category="health",  variant="B",
         content="Reduce cortisol and improve sleep quality with 10-minute daily sessions. Join 5 million users already sleeping better."),
    # Food — A & B
    dict(title="HelloFresh — 50% Off First Box", category="food", variant="A",
         content="Chef-curated recipes with farm-fresh ingredients delivered to your door. Choose from 60+ weekly options. Cancel anytime."),
    dict(title="Starbucks Rewards Plus",  category="food",      variant="B",
         content="Earn 3× stars on every purchase and unlock free drinks faster. Birthday treat, early access to seasonal drinks, and more."),
    # Travel — A & B
    dict(title="Airbnb — Summer Deals 2026", category="travel", variant="A",
         content="Unique stays at up to 40% off this summer. Treehouse in Bali or cabin in the Alps — find your perfect escape."),
    dict(title="Emirates Business Class",  category="travel",   variant="B",
         content="Lie-flat beds, gourmet dining at 40,000 ft, and a private chauffeur to the airport. Book by June 30 for priority boarding."),
    # Sports — A & B
    dict(title="Nike Alphafly 3 — Race Day", category="sports", variant="A",
         content="Worn by sub-2-hour marathon runners. ZoomX foam + carbon plate for maximum energy return. Limited 2026 colorways now live."),
    dict(title="ESPN+ Annual Plan",        category="sports",   variant="B",
         content="Unlimited live sports, exclusive MLB, UFC, and NHL coverage plus original documentaries. Just $59.99/year — save 40%."),
    # Books — A & B
    dict(title="Kindle Unlimited — 3 Months Free", category="books", variant="A",
         content="Access over 4 million titles, magazines, and audiobooks on any device. No commitment — cancel at any time."),
    dict(title="Audible Premium Plus",     category="books",    variant="B",
         content="One credit per month for any audiobook plus unlimited access to the Plus Catalog. Start with a 30-day free trial."),
    # Education — A & B
    dict(title="Coursera Plus — Annual",   category="education", variant="A",
         content="7,000+ courses from Stanford, Google, and IBM. Earn a job-ready certificate in 3 months. First month free for new subscribers."),
    dict(title="MasterClass All-Access",   category="education", variant="B",
         content="Learn cooking with Gordon Ramsay, tennis with Serena Williams, and filmmaking with Spike Lee. 190+ instructors, one subscription."),
]
