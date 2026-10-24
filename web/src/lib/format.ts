export function formatDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", opts);
}

export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : formatDate(iso, { month: "short", day: "numeric" });
}

export const formatNumber = (n: number): string => n.toLocaleString("en-US");
export const formatPercent = (n: number): string => `${n.toFixed(2)}%`;
export const formatMoney = (n: number | null): string =>
  n === null ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "U.S." -> "u-s" — stable, URL-safe section slug. */
export const categorySlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Convert a datetime-local input value to an ISO string (or null). */
export function localToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** ISO string -> value for <input type="datetime-local">. */
export function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Only allow http(s) destinations to be rendered as links. */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Preferred section order for navigation; unknown categories follow alphabetically. */
export const SECTION_ORDER = [
  "World", "U.S.", "Politics", "Business", "Technology", "Science", "Health",
  "Climate", "Sports", "Education", "Arts", "Opinion", "Travel",
];

export function sortSections<T extends { name: string }>(cats: T[]): T[] {
  const rank = (n: string) => {
    const i = SECTION_ORDER.indexOf(n);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return [...cats].sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}
