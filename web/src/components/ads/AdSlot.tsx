import { useEffect, useRef } from "react";
import { adsApi } from "@/api/services";
import { useAuth } from "@/context/AuthContext";
import { safeHref } from "@/lib/format";
import type { Ad } from "@/types";

export type AdLayout = "feed" | "sidebar" | "inline" | "banner";

interface Props {
  ad: Ad | null;
  layout: AdLayout;
  loading?: boolean;
  className?: string;
  /** Repeating slots render nothing when no ad is left (the first slot keeps the fallback). */
  quiet?: boolean;
  /** Optional one-line explanation shown under the label (e.g. why this ad was chosen). */
  note?: string | undefined;
}

// Impressions/clicks are recorded once per ad per page load, signed-in readers only
// (the backend's interaction log is keyed by user).
const viewed = new Set<number>();
export function resetAdTracking(): void {
  viewed.clear();
}

const label = (
  <p className="font-sans text-meta font-semibold uppercase tracking-wider text-muted">Advertisement</p>
);

const shell: Record<AdLayout, string> = {
  feed: "border-y border-rule bg-wash px-4 py-4 md:px-6",
  sidebar: "border-y border-rule bg-wash px-4 py-4",
  inline: "my-10 border-y border-rule bg-wash px-4 py-4 md:px-6",
  banner: "border-y border-rule bg-wash px-4 py-4 md:px-6",
};

export function AdSlot({ ad, layout, loading, className = "", quiet, note }: Props) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement | null>(null);
  const userId = user && !user.is_admin ? user.id : null;

  // Record a view when at least half the creative is on screen.
  useEffect(() => {
    if (!ad || userId === null || viewed.has(ad.id) || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !viewed.has(ad.id)) {
          viewed.add(ad.id);
          adsApi.logInteraction(userId, ad.id, "view").catch(() => viewed.delete(ad.id));
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ad, userId]);

  const wrap = (children: React.ReactNode, aria = "Advertisement") => (
    // A labelled group, not a landmark: a page can hold a dozen ads, and a dozen
    // identically named landmarks would clutter screen-reader navigation.
    <div ref={ref as React.RefObject<HTMLDivElement>} role="group" aria-label={aria} data-ad-layout={layout} className={`${shell[layout]} ${className}`}>
      {label}
      {note && ad && <p className="mt-0.5 font-sans text-meta text-muted">{note}</p>}
      {children}
    </div>
  );

  if (loading) {
    return wrap(
      <div aria-hidden className="mt-3 flex animate-pulse gap-4">
        <div className="aspect-[16/9] w-1/2 bg-rule/60" />
        <div className="flex-1 space-y-2"><div className="h-4 w-3/4 bg-rule/60" /><div className="h-3 w-full bg-rule/60" /></div>
      </div>,
    );
  }

  if (!ad && quiet) return null;

  if (!ad) {
    // Fallback when the backend has nothing deliverable for this slot.
    return wrap(
      <p className="mt-2 font-sans text-small text-muted">No advertisement is available in this space right now.</p>,
    );
  }

  const href = safeHref(ad.destination_url);
  const onClick = () => {
    if (userId !== null) adsApi.logInteraction(userId, ad.id, "click").catch(() => undefined);
  };

  const image = ad.image_url ? (
    <img
      src={ad.image_url}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover"
      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
    />
  ) : null;

  const text = (
    <div className="min-w-0 font-sans">
      {ad.advertiser && <p className="text-meta font-semibold text-muted">{ad.advertiser}</p>}
      {/* Not a heading: ads shouldn't appear in (or break) the page outline. */}
      <p data-ad-title className="mt-0.5 text-lg font-bold leading-snug text-ink">{ad.title}</p>
      <p className="mt-1 text-small text-body">{ad.content}</p>
      {href && (
        <span className="mt-3 inline-block rounded border border-ink px-3 py-1.5 text-small font-semibold text-ink group-hover:bg-ink group-hover:text-white">
          Learn more
        </span>
      )}
    </div>
  );

  const frame: Record<AdLayout, string> = {
    feed: "mt-3 grid items-center gap-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
    sidebar: "mt-3 space-y-3",
    inline: "mt-3 grid items-center gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
    banner: "mt-3 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
  };
  const imgBox: Record<AdLayout, string> = {
    feed: "aspect-[16/9] md:order-first",
    sidebar: "aspect-[16/9]",
    inline: "aspect-[4/3]",
    banner: "aspect-[1200/400] md:order-last",
  };

  const body = (
    <div className={frame[layout]}>
      {image && <div className={`${imgBox[layout]} overflow-hidden bg-rule/50`}>{image}</div>}
      {text}
    </div>
  );

  return wrap(
    href ? (
      <a
        href={href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        onClick={onClick}
        onAuxClick={onClick}
        className="group block"
        aria-label={`${ad.title}${ad.advertiser ? `, ${ad.advertiser}` : ""} (advertisement, opens in a new tab)`}
      >
        {body}
      </a>
    ) : (
      body
    ),
    "Advertisement",
  );
}
