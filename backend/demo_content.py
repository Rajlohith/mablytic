"""Demonstration content for development.

Every article here is FICTIONAL demonstration copy (places, organisations and
events are invented) and is stored with is_demo=True so the UI labels it. It is
not real news. Replace it by publishing real articles from the admin dashboard.
"""

import hashlib

# (category, title, summary, read_minutes, featured)
ARTICLES: list[tuple[str, str, str, int, bool]] = [
    # ── World ────────────────────────────────────────────────────────────────
    ("World", "Harbor Cities Along the Calloway Strait Agree to Share Flood Defenses", "Eight municipalities signed a pact to pool funds and engineers, ending a decade of competing seawall projects.", 6, True),
    ("World", "In the Valdera Highlands, a Rail Line Revives Towns the Highway Forgot", "A restored mountain railway is carrying students, farmers and, for the first time in years, tourists.", 7, False),
    ("World", "Delegates Leave Talks on the Meridian River With a Narrow Water-Sharing Deal", "The agreement sets seasonal limits on withdrawals but leaves the question of a new dam unresolved.", 5, False),
    ("World", "A Border Market Reopens, and Two Neighboring Towns Remember How to Trade", "Vendors on both sides describe cautious optimism after a long closure.", 4, False),
    ("World", "Election Observers Describe a Calm but Slow Count in Northern Estoria", "Officials say results will take several days because ballots are tallied by hand at each station.", 3, False),
    # ── U.S. ─────────────────────────────────────────────────────────────────
    ("U.S.", "Small Towns Compete for a Chance to Host the Region's New Rail Depot", "Mayors are offering land, tax breaks and, in one case, a marching band.", 6, True),
    ("U.S.", "As Libraries Extend Evening Hours, Teenagers Fill the Reading Rooms", "Branch managers say the surge began when study spaces got better lighting and a quiet no-phone zone.", 5, False),
    ("U.S.", "A County Fair Tests Whether Paper Tickets Can Compete With an App", "Organizers brought back the old booth after the new system crashed on opening day.", 4, False),
    ("U.S.", "Commuters in a Mid-Size City Face a Winter of Bus Route Changes", "Transit planners say fewer, more frequent lines should cut waits, but riders worry about long walks.", 5, False),
    ("U.S.", "Volunteer Firefighters Warn That Recruitment Is Falling Behind", "Departments in rural areas say training requirements and work schedules are keeping new members away.", 6, False),
    # ── Politics ─────────────────────────────────────────────────────────────
    ("Politics", "A Budget Standoff Narrows to Three Unresolved Line Items", "Negotiators said progress was real but that the remaining disagreements touch on defense, housing and transit.", 5, True),
    ("Politics", "What the Redistricting Proposal Would Change, Map by Map", "A guide to the draft boundaries, who would gain, and the legal questions ahead.", 8, False),
    ("Politics", "City Council Debates Whether to Let Residents Vote on a Stadium", "Supporters call it a civic opportunity; opponents point to maintenance costs.", 4, False),
    ("Politics", "A Primer on the New Campaign Finance Disclosure Rules", "The rules take effect next quarter and change how small donations are reported.", 6, False),
    ("Politics", "Governors Meet to Compare Notes on Emergency Preparedness", "The two-day session produced a shared checklist but no binding commitments.", 3, False),
    # ── Business ─────────────────────────────────────────────────────────────
    ("Business", "Regional Grocers Band Together to Buy Produce Directly From Farms", "The cooperative says shorter supply chains cut waste, though some farmers question the pricing model.", 6, True),
    ("Business", "A Century-Old Textile Mill Is Reborn as a Battery Component Plant", "The conversion kept the brick shell and the workforce's institutional memory.", 7, False),
    ("Business", "Why Small Manufacturers Are Rethinking Where They Hold Inventory", "After a year of delays, many are choosing to keep more parts on site.", 5, False),
    ("Business", "Freelance Rates Rose Last Year. The Gains Were Uneven.", "A survey found the largest increases among specialized technical work and the smallest in writing and design.", 4, False),
    ("Business", "A Family Bakery Chain Weighs Its First Outside Investors", "The founders say they want to grow without losing control of the recipes.", 5, False),
    # ── Technology ───────────────────────────────────────────────────────────
    ("Technology", "Open-Source Maintainers Ask Companies for Steadier Support", "Volunteers who keep widely used software running say sporadic donations are not enough.", 7, True),
    ("Technology", "How a Hospital Network Tested Voice Assistants for Nurses' Notes", "The pilot cut paperwork time but raised questions about accuracy and consent.", 6, False),
    ("Technology", "The Quiet Return of the Dedicated Music Player", "Sales of small, single-purpose devices are climbing among listeners tired of notifications.", 4, False),
    ("Technology", "Researchers Build a Low-Cost Sensor to Track Indoor Air Quality", "The open design uses off-the-shelf parts and costs less than a pair of movie tickets.", 5, False),
    ("Technology", "Schools Weigh Rules for Classroom Use of AI Writing Tools", "Teachers describe a patchwork of policies and a desire for clearer guidance.", 6, False),
    # ── Science ──────────────────────────────────────────────────────────────
    ("Science", "A Deep-Sea Survey Catalogs Dozens of Species Without Names", "Researchers say the most striking finds were small, pale and entirely at home in the dark.", 6, True),
    ("Science", "Astronomers Map a Faint Ring of Dust Around a Nearby Star", "The structure hints at planets too small or too distant to see directly.", 5, False),
    ("Science", "Why Honeybee Colonies Are Moving Their Hives Earlier in Spring", "Beekeepers and biologists are comparing notes on a pattern that has appeared across several regions.", 5, False),
    ("Science", "In a Quiet Lab, Physicists Chase a Stubborn Measurement", "The experiment has run for years; the team says patience is the main instrument.", 8, False),
    ("Science", "Fossil Footprints Offer a Rare Look at a Prehistoric Migration", "The tracks, preserved in hardened mud, suggest a herd moving together.", 4, False),
    # ── Health ───────────────────────────────────────────────────────────────
    ("Health", "Sleep Researchers Explain Why Afternoon Light Matters", "Studies suggest that time outdoors later in the day can influence how easily people fall asleep.", 5, True),
    ("Health", "What to Ask Your Pharmacist Before Combining Supplements", "Pharmacists describe the questions that catch the most problems.", 4, False),
    ("Health", "Clinics Try Longer Appointments for Patients With Several Conditions", "Early results show fewer emergency visits, though the model is costly to staff.", 6, False),
    ("Health", "A Walking Group for Older Adults Becomes a Neighborhood Fixture", "Organizers say the social part matters as much as the exercise.", 4, False),
    ("Health", "How Hospitals Are Redesigning Waiting Rooms to Reduce Stress", "Softer lighting, clearer signs and fewer screens are among the changes.", 5, False),
    # ── Climate ──────────────────────────────────────────────────────────────
    ("Climate", "Coastal Farmers Experiment With Salt-Tolerant Rice", "Trial plots near the estuary are producing modest yields in soil that once failed.", 6, True),
    ("Climate", "A City Plants Thousands of Trees. Keeping Them Alive Is the Hard Part.", "Officials say watering and neighborhood stewardship decide whether saplings survive.", 6, False),
    ("Climate", "How Utilities Are Preparing for Longer, Hotter Summers", "Engineers are adding storage and rethinking when demand peaks.", 5, False),
    ("Climate", "Wetland Restoration Gives a River Delta Room to Breathe", "Engineers removed levees and let the water spread; birds returned within a season.", 5, False),
    ("Climate", "Neighbors Turn a Vacant Lot Into a Rainwater Garden", "The project captures runoff that used to flood the street below.", 3, False),
    # ── Sports ───────────────────────────────────────────────────────────────
    ("Sports", "A Late Goal Sends the Underdogs Into the League Final", "The substitute scored in stoppage time, and the stadium took a full minute to settle.", 4, True),
    ("Sports", "How a Small College Built a Distance-Running Powerhouse", "The coach credits patient mileage, shared meals and a very hilly course.", 7, False),
    ("Sports", "Referees Test Wearable Cameras in Amateur Leagues", "Early feedback suggests players behave differently when they know the lens is on.", 5, False),
    ("Sports", "A Veteran Goalkeeper Announces Her Retirement After Twenty Seasons", "Teammates recalled her habit of running drills in the rain.", 4, False),
    ("Sports", "Youth Basketball Programs Struggle to Find Enough Coaches", "Organizers say background checks and training are worth it but slow to complete.", 5, False),
    # ── Education ────────────────────────────────────────────────────────────
    ("Education", "A District Moves Its Start Time Later. Here's What Happened.", "Attendance rose slightly; bus routes were the hardest piece to redraw.", 6, True),
    ("Education", "Community Colleges Expand Short Programs in Skilled Trades", "Enrollment is up, and employers are helping design the curriculum.", 5, False),
    ("Education", "Students Learn Statistics by Studying Their Own School Cafeteria", "The class collects data on waste, lines and favorite meals.", 4, False),
    ("Education", "A Rural School Shares One Science Teacher by Video With Three Others", "Students say the lessons work best when a local aide helps with labs.", 6, False),
    ("Education", "What Parents Should Know About the New Reading Curriculum", "A plain-language guide to what changes in the classroom and what stays the same.", 5, False),
    # ── Arts ─────────────────────────────────────────────────────────────────
    ("Arts", "A Small Museum's Quiet Exhibit on Everyday Objects Draws Long Lines", "Curators arranged ordinary tools and tableware by color and let the room do the talking.", 5, True),
    ("Arts", "A Debut Novel Follows Three Generations in One Apartment Building", "Critics praise its patience and attention to small domestic details.", 4, False),
    ("Arts", "The Orchestra Commissions Works From Composers Under Thirty", "The season's program leans toward the experimental, with a few familiar anchors.", 5, False),
    ("Arts", "A Street Mural Project Brightens a Neighborhood's Blank Walls", "Residents voted on the designs, and local students helped paint.", 4, False),
    ("Arts", "Why Independent Bookstores Are Adding Reading Rooms", "Owners say customers stay longer, and often buy more, when there is a place to sit.", 4, False),
    # ── Opinion ──────────────────────────────────────────────────────────────
    ("Opinion", "The Case for Boring Infrastructure", "The best public works are the ones nobody notices, and that is exactly why they struggle for funding.", 6, True),
    ("Opinion", "Let's Stop Calling Every Delay a Crisis", "Not every setback needs a headline; some just need a schedule and a little honesty.", 5, False),
    ("Opinion", "In Praise of the Neighborhood Hardware Store", "Where else can you ask a stranger how to fix a leak and actually get an answer?", 4, False),
    ("Opinion", "What We Lose When Every Meeting Becomes a Video Call", "Some conversations need a hallway, and hallways have gone missing.", 5, False),
    ("Opinion", "A Modest Proposal for Better Public Signage", "Clear signs cost little and save everyone time. Why are so many still confusing?", 4, False),
    # ── Travel ───────────────────────────────────────────────────────────────
    ("Travel", "Slow Trains Make a Comeback for Weekend Escapes", "Travelers are trading speed for window seats and a reason to put the phone down.", 6, True),
    ("Travel", "A Guide to Visiting Small Towns Without Overwhelming Them", "Locals suggest arriving midweek, shopping at neighborhood stores and leaving no trace.", 5, False),
    ("Travel", "How Airports Are Redesigning Security Lines to Move Faster", "New layouts separate travelers by how much they are carrying.", 4, False),
    ("Travel", "Mountain Huts Reopen for the Season With Booking Changes", "Operators say reservations are now required to keep crowds manageable.", 4, False),
    ("Travel", "A Ferry Route Reconnects Two Islands After a Long Hiatus", "Residents say the crossing will make visiting family much easier.", 3, False),
]

AUTHORS = [
    "Mablytic Demo Desk", "Ines Okafor-Lindqvist", "Tomas Brandt", "Priya Raman",
    "Dale Whitcombe", "Mara Eliades", "Jun Takahashi", "Rosalind Achebe",
]

CATEGORY_DESKS = {
    "World": "Global Desk", "U.S.": "National Desk", "Politics": "Politics Desk",
    "Business": "Business Desk", "Technology": "Technology Desk", "Science": "Science Desk",
    "Health": "Health Desk", "Climate": "Climate Desk", "Sports": "Sports Desk",
    "Education": "Education Desk", "Arts": "Culture Desk", "Opinion": "Opinion",
    "Travel": "Travel Desk",
}

_GENERIC = [
    "Those involved say the work began quietly, with a handful of meetings in borrowed rooms and a shared sense that the old approach was no longer working.",
    "\"We did not set out to change anything big,\" said one organizer, speaking on the condition that the group's name not be used. \"We just kept fixing the next small problem.\"",
    "Not everyone is convinced. Critics point out that early results can be misleading and that the real test will come once the initial enthusiasm has faded.",
    "The details matter. Participants described long stretches of routine, punctuated by a few moments when it became clear that something had shifted.",
    "Funding remains the central question. Supporters say modest, steady investment would go further than occasional large grants, which tend to arrive with strings attached.",
    "Looking ahead, those closest to the effort say they plan to publish what they have learned so others can adapt it, or avoid the same mistakes.",
    "Among residents, reactions ranged from enthusiasm to polite skepticism. Many said they would wait to see how it held up through a full year before forming a view.",
    "Experts who were not involved said the approach was plausible but cautioned against drawing broad conclusions from a single case.",
    "There is also a practical side. Schedules, budgets and paperwork all had to line up, and several people said that was the hardest part of the whole process.",
    "For now, the next step is a review in the coming months, after which the participants will decide whether to continue, adjust or stop.",
    "History offers some guidance. Similar efforts in other places have succeeded when they stayed small and local, and struggled when they tried to scale too quickly.",
    "A recurring theme in conversations was patience. Almost everyone said the changes they had hoped for took longer than expected, and mattered more than expected once they came.",
]

_BY_CATEGORY = {
    "World": ["Regional analysts note that cooperation of this kind tends to be fragile, resting as much on personal relationships as on written agreements.", "Local officials described the practical benefits first: shorter travel times, steadier prices and fewer disputes over who is responsible for what."],
    "U.S.": ["Town leaders say the decision will shape the community for decades, and they have asked residents to attend the next public hearing.", "Residents interviewed for this story said the change would affect their daily routines, from commutes to weekend errands."],
    "Politics": ["Aides on both sides said the remaining gaps were narrower than public statements suggested, though neither would predict a timeline.", "Procedural details, often overlooked, will decide the outcome: who votes first, what amendments are allowed and how long debate may run."],
    "Business": ["Owners said margins are thin and the margin for error thinner, so even small improvements in logistics can decide whether a business survives.", "Analysts who follow the sector said the model could spread if early customers stay, but warned that costs tend to rise as operations scale."],
    "Technology": ["Engineers involved said the hardest problems were not technical but social: agreeing on standards, documenting decisions and keeping contributors engaged.", "Users interviewed said they valued reliability over novelty, and would happily trade a few features for software that simply worked."],
    "Science": ["The team cautioned that the findings are preliminary and will be tested by independent groups before anyone draws firm conclusions.", "Several researchers said the most valuable outcome was not an answer but a better question, one that will guide the next round of fieldwork."],
    "Health": ["Clinicians stressed that individual circumstances vary and that readers with specific concerns should consult a qualified professional.", "Patients described the changes in practical terms: shorter waits, clearer instructions and a sense of being listened to."],
    "Climate": ["Engineers said adaptation is often unglamorous, a matter of drainage ditches, shade and maintenance rather than dramatic technology.", "Local residents said they noticed the difference first during heavy rain, when streets that used to flood stayed passable."],
    "Sports": ["Players said the atmosphere was unlike anything they had experienced, and that the noise made it hard to hear instructions from the bench.", "The coach praised the squad's discipline, saying the result was built on weeks of unglamorous preparation."],
    "Education": ["Teachers said the biggest change was not academic but logistical, from bus schedules to lunch periods, and that communication with families was essential.", "Students interviewed said they noticed the difference within weeks, though some wished they had been consulted earlier."],
    "Arts": ["Visitors lingered longer than expected, many returning for a second look, a rarity for an exhibit with no famous names attached.", "Critics said the work succeeds because it trusts its audience, leaving gaps that invite interpretation rather than filling every silence."],
    "Opinion": ["This is, admittedly, an unfashionable view. But the alternatives have been tried, and the results are in front of us.", "None of this requires a grand plan. It requires attention, a little humility and a willingness to do the dull work well."],
    "Travel": ["Locals said they welcome visitors who come with curiosity and patience, and who treat the place as someone's home rather than a backdrop.", "Operators advised booking early and traveling off-peak, when prices are lower and the crowds thinner."],
}


def slugify(title: str) -> str:
    out = "".join(c.lower() if c.isalnum() else "-" for c in title)
    return "-".join(p for p in out.split("-") if p)[:90]


def _h(slug: str, n: int) -> int:
    return int(hashlib.sha256(f"{slug}:{n}".encode()).hexdigest(), 16)


def build_body(slug: str, category: str, summary: str) -> str:
    """Deterministic multi-paragraph body so long-form pages have real length."""
    specific = _BY_CATEGORY.get(category, [])
    pool = _GENERIC[:] + specific
    ordered = sorted(range(len(pool)), key=lambda i: _h(slug, i))
    count = 7 + _h(slug, 99) % 3  # 7-9 paragraphs after the lead
    paragraphs = [summary] + [pool[i] for i in ordered[:count]]
    paragraphs.append(
        "This is demonstration content created for the Mablytic development dataset. "
        "The people, places and organizations described are fictional."
    )
    return "\n\n".join(paragraphs)


def article_rows() -> list[dict]:
    rows = []
    for idx, (cat, title, summary, mins, featured) in enumerate(ARTICLES):
        slug = slugify(title)
        rows.append(
            dict(
                slug=slug,
                title=title,
                summary=summary,
                body=build_body(slug, cat, summary),
                category=cat,
                author=AUTHORS[_h(slug, 7) % len(AUTHORS)] if cat != "Opinion" else AUTHORS[1 + _h(slug, 7) % (len(AUTHORS) - 1)],
                image_url=f"/art/articles/{slug}.svg",
                image_alt=f"Abstract illustration for \"{title}\"",
                image_credit="Mablytic demo illustration",
                read_minutes=mins,
                is_featured=featured,
                is_demo=True,
                status="published",
                _age_hours=idx * 5 + _h(slug, 3) % 4,  # staggered publish times
            )
        )
    return rows


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
