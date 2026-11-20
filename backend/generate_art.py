"""Generate original, license-free SVG artwork for the demo ad creatives.

News articles use the publishers' own images (see news_ingest.py).

    python generate_art.py            # writes ../web/public/art/ads/*.svg

Deterministic (seeded by slug), no network, no third-party assets. Article
images are text-free flat illustrations; ad creatives carry the advertiser name
and headline. The "Advertisement" label is added by the UI, not baked in.
"""

import hashlib
import html
import math
import random
import textwrap
from pathlib import Path

from demo_content import LEGACY_ADS, NEW_ADS, slugify

OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "art"

# (background, shape colors...) per category — muted editorial palettes.
PALETTES = {
    "World": ("#dfe8ef", "#1f4e79", "#e0a458", "#8fb3cf", "#2d3a45"),
    "U.S.": ("#f1e7da", "#a63d2f", "#1d3557", "#e6b17e", "#6c757d"),
    "Politics": ("#e8e6f0", "#3d348b", "#e63946", "#a9a3cf", "#222"),
    "Business": ("#e6efe6", "#2f6f4f", "#d9a441", "#9ec5a8", "#26332b"),
    "Technology": ("#e3eef5", "#0b6e99", "#f26b5b", "#8ec9e0", "#14232e"),
    "Science": ("#efe6f3", "#6b3fa0", "#2bb3a3", "#c2a5dc", "#1d1530"),
    "Health": ("#f6e6e4", "#c8553d", "#588b8b", "#f0b8ad", "#2b2b2b"),
    "Climate": ("#e4f0e8", "#2d6a4f", "#f4a259", "#95d5b2", "#1b2e24"),
    "Sports": ("#fbeadb", "#e76f51", "#264653", "#f4c095", "#1f1f1f"),
    "Education": ("#fff1d6", "#2a6f97", "#e07a1f", "#a9d6e5", "#24303a"),
    "Arts": ("#f9e4ee", "#c2185b", "#3949ab", "#f3a6c8", "#2a1f2d"),
    "Opinion": ("#ece8e1", "#222222", "#b5432a", "#bdb5a6", "#3a3a3a"),
    "Travel": ("#e0f0f2", "#00798c", "#edae49", "#8ecae6", "#1b2f33"),
}
AD_PALETTES = {  # by ad category -> reuse the closest editorial palette
    "tech": "Technology", "gaming": "Science", "fitness": "Sports", "health": "Health",
    "food": "Business", "travel": "Travel", "sports": "U.S.", "books": "Arts", "education": "Education",
}


def _rng(key: str) -> random.Random:
    return random.Random(int(hashlib.sha256(key.encode()).hexdigest(), 16))


def _shapes(r: random.Random, w: int, h: int, colors: tuple[str, ...]) -> str:
    bg, c1, c2, c3, c4 = colors
    parts = [f'<rect width="{w}" height="{h}" fill="{bg}"/>']
    kind = r.randrange(4)
    if kind == 0:  # sun over rolling bands
        cx, cy, rad = r.randint(w // 4, 3 * w // 4), r.randint(h // 5, h // 2), r.randint(h // 7, h // 4)
        parts.append(f'<circle cx="{cx}" cy="{cy}" r="{rad}" fill="{c2}"/>')
        for i, col in enumerate((c3, c1, c4)):
            y = h * (0.55 + 0.14 * i)
            amp = r.randint(20, 60)
            d = f"M0 {y} " + " ".join(
                f"Q {w*(k+0.5)/4:.0f} {y + (amp if k % 2 else -amp):.0f} {w*(k+1)/4:.0f} {y:.0f}" for k in range(4)
            ) + f" L{w} {h} L0 {h} Z"
            parts.append(f'<path d="{d}" fill="{col}"/>')
    elif kind == 1:  # tiled blocks
        n = r.randint(4, 6)
        cw, ch = w / n, h / 3
        for ix in range(n):
            for iy in range(3):
                col = r.choice((c1, c2, c3, c3, bg))
                parts.append(f'<rect x="{ix*cw:.0f}" y="{iy*ch:.0f}" width="{cw+1:.0f}" height="{ch+1:.0f}" fill="{col}"/>')
        parts.append(f'<circle cx="{r.randint(w//5,4*w//5)}" cy="{r.randint(h//4,3*h//4)}" r="{h//5}" fill="{bg}" opacity=".92"/>')
    elif kind == 2:  # overlapping circles
        for _ in range(r.randint(5, 8)):
            col = r.choice((c1, c2, c3, c4))
            parts.append(f'<circle cx="{r.randint(0,w)}" cy="{r.randint(0,h)}" r="{r.randint(h//8,h//3)}" fill="{col}" opacity="{r.choice((.85,.9,1))}"/>')
    else:  # diagonal stripes + arch
        for i in range(-3, 12):
            x = i * w / 8
            parts.append(f'<polygon points="{x:.0f},0 {x+w/10:.0f},0 {x+w/10-h*0.4:.0f},{h} {x-h*0.4:.0f},{h}" fill="{c3 if i%2 else bg}"/>')
        ax, aw = r.randint(w // 6, w // 2), r.randint(w // 4, w // 3)
        parts.append(f'<path d="M{ax} {h} V{h*0.55:.0f} A{aw/2:.0f} {aw/2:.0f} 0 0 1 {ax+aw} {h*0.55:.0f} V{h} Z" fill="{c1}"/>')
        parts.append(f'<circle cx="{ax+aw/2:.0f}" cy="{h*0.45:.0f}" r="{aw/6:.0f}" fill="{c2}"/>')
    # grain-free accent: a thin ink line
    parts.append(f'<rect x="0" y="{h-8}" width="{w}" height="8" fill="{c4}" opacity=".85"/>')
    return "\n".join(parts)


def ad_svg(title: str, advertiser: str, category: str) -> str:
    w, h = 1200, 628
    colors = PALETTES[AD_PALETTES.get(category, "Business")]
    r = _rng("ad:" + title)
    body = _shapes(r, w, h, colors)
    ink = colors[4]
    lines = textwrap.wrap(title, 22)[:3]
    text = "".join(
        f'<text x="64" y="{300 + i*76}" font-family="Georgia, \'Times New Roman\', serif" font-size="64" font-weight="700" fill="{ink}">{html.escape(l)}</text>'
        for i, l in enumerate(lines)
    )
    label = (advertiser or "").strip()
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" role="img" '
        f'aria-label="{html.escape(title, quote=True)}" preserveAspectRatio="xMidYMid slice">{body}'
        f'<rect x="32" y="190" width="{w-64}" height="{60 + len(lines)*76 + 40}" fill="#fff" opacity=".86"/>'
        f'<text x="64" y="244" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="{ink}" letter-spacing="1">{html.escape(label)}</text>'
        f'{text}</svg>'
    )


def main() -> None:
    (OUT / "ads").mkdir(parents=True, exist_ok=True)
    n_ad = 0
    for a in LEGACY_ADS:
        (OUT / "ads" / f"{slugify(a['title'])}.svg").write_text(ad_svg(a["title"], "", a["category"]), encoding="utf-8")
        n_ad += 1
    for title, advertiser, cat, *_ in NEW_ADS:
        (OUT / "ads" / f"{slugify(title)}.svg").write_text(ad_svg(title, advertiser, cat), encoding="utf-8")
        n_ad += 1
    print(f"wrote {n_ad} ad creatives to {OUT}")


if __name__ == "__main__":
    main()
