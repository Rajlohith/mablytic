import { Fragment, useEffect, useState } from "react";
import { articlesApi } from "@/api/services";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard } from "@/components/news/ArticleCard";
import { SectionHeader } from "@/components/news/SectionHeader";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingBlock, SkeletonCard } from "@/components/ui/feedback";
import { useAdPool } from "@/hooks/useAdPool";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { sortSections } from "@/lib/format";
import type { ArticleCard as Card, SectionGroup } from "@/types";

const AD_COUNTS = { banner: 4, sidebar: 4, feed: 9 } as const;
const LATEST_PAGE = 12;

export default function HomePage() {
  useDocumentTitle(null);
  const pool = useAdPool(AD_COUNTS, "home");
  const { data, error, loading, reload } = useAsync(async (signal) => {
    const [featured, sections] = await Promise.all([
      articlesApi.list({ featured: true, page_size: 9 }, signal),
      articlesApi.sections(5, signal),
    ]);
    return { featured: featured.items, sections: sortSections(sections) };
  }, []);

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <HomeSkeleton />;

  const [lead, second, third, ...topRest] = data.featured;
  const grid = topRest.slice(0, 3);
  const leadIds = new Set(data.featured.slice(0, 6).map((a) => a.id));
  const sections = data.sections.map((s) => ({ ...s, items: s.items.filter((i) => !leadIds.has(i.id)) })).filter((s) => s.items.length >= 3);

  return (
    <div className="space-y-12">
      <h1 className="sr-only">Mablytic: today's news</h1>
      {/* ── Lead package ───────────────────────────────────────────────── */}
      <section aria-labelledby="top-h" className="grid gap-8 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-0">
        <h2 id="top-h" className="sr-only">Top stories</h2>
        <div className="lg:border-r lg:border-rule lg:pr-8">
          {lead && <ArticleCard article={lead} variant="lead" />}
        </div>
        <div className="space-y-6 lg:pl-8">
          {second && <ArticleCard article={second} variant="stacked" showCategory />}
          <AdSlot ad={pool.get("sidebar", 0)} layout="sidebar" loading={pool.loading} />
          {third && <ArticleCard article={third} variant="row" showCategory />}
        </div>
      </section>

      <AdSlot ad={pool.get("banner", 0)} layout="banner" loading={pool.loading} />

      {grid.length > 0 && (
        <section aria-labelledby="more-top-h" className="grid gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-rule">
          <h2 id="more-top-h" className="sr-only">More top stories</h2>
          {grid.map((a) => (
            <div key={a.id} className="sm:px-6 sm:first:pl-0 sm:last:pr-0">
              <ArticleCard article={a} variant="stacked" showCategory />
            </div>
          ))}
        </section>
      )}

      <AdSlot ad={pool.get("feed", 0)} layout="feed" loading={pool.loading} />

      {/* ── Section grids, varied by position, with ads between groups ─── */}
      {sections.map((s, i) => (
        <Fragment key={s.name}>
          <SectionBlock section={s} index={i} />
          {i % 2 === 1 && i < sections.length - 1 && (
            i % 4 === 1 ? (
              <AdSlot ad={pool.get("banner", 1 + Math.floor(i / 4))} layout="banner" quiet loading={pool.loading} />
            ) : (
              <AdSlot ad={pool.get("feed", 1 + Math.floor(i / 4))} layout="feed" quiet loading={pool.loading} />
            )
          )}
        </Fragment>
      ))}

      <LatestFeed
        ads={{
          sidebar: [pool.get("sidebar", 1), pool.get("sidebar", 2), pool.get("sidebar", 3)],
          feed: [3, 4, 5, 6, 7, 8].map((n) => pool.get("feed", n)),
        }}
        adsLoading={pool.loading}
      />
    </div>
  );
}

/** Alternates between a five-up image grid and a lead-plus-rows arrangement. */
function SectionBlock({ section, index }: { section: SectionGroup; index: number }) {
  const [first, ...rest] = section.items;
  if (!first) return null;

  if (section.name === "Opinion") {
    return (
      <section aria-labelledby={`sec-${index}`}>
        <SectionHeader name={section.name} count={section.count} />
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-rule">
          {section.items.slice(0, 4).map((a) => (
            <div key={a.id} className="lg:px-5 lg:first:pl-0 lg:last:pr-0">
              <p className="mb-1 font-sans text-meta font-semibold uppercase tracking-wide text-muted">{a.author}</p>
              <ArticleCard article={a} variant="compact" />
              <p className="mt-2 font-serif text-small text-muted">{a.summary}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (index % 2 === 0) {
    return (
      <section>
        <SectionHeader name={section.name} count={section.count} />
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0 lg:divide-x lg:divide-rule">
          {section.items.slice(0, 5).map((a) => (
            <div key={a.id} className="lg:px-4 lg:first:pl-0 lg:last:pr-0">
              <ArticleCard article={a} variant="stacked" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader name={section.name} count={section.count} />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-0">
        <div className="lg:border-r lg:border-rule lg:pr-8">
          <ArticleCard article={first} variant="lead" />
        </div>
        <div className="divide-y divide-rule lg:pl-8">
          {rest.slice(0, 3).map((a) => (
            <div key={a.id} className="py-4 first:pt-0 last:pb-0">
              <ArticleCard article={a} variant="row" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface LatestAds {
  sidebar: (import("@/types").Ad | null)[];
  feed: (import("@/types").Ad | null)[];
}

function LatestFeed({ ads, adsLoading }: { ads: LatestAds; adsLoading: boolean }) {
  const [items, setItems] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadMore = async () => {
    setBusy(true);
    setErr(null);
    try {
      const next = page + 1;
      const res = await articlesApi.list({ page: next, page_size: LATEST_PAGE });
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setTotal(res.total);
      setPage(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load more stories.");
    } finally {
      setBusy(false);
    }
  };

  // First page loads on mount via the same handler (ids are de-duplicated,
  // so a StrictMode double-invoke in development is harmless).
  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = total !== null && items.length >= total;

  return (
    <section aria-labelledby="latest-h" className="grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-0">
      <div className="lg:border-r lg:border-rule lg:pr-8">
        <div className="border-t border-ink pt-2">
          <h2 id="latest-h" className="font-sans text-lg font-bold text-ink">Latest news</h2>
        </div>
        <div className="divide-y divide-rule">
          {items.map((a, i) => (
            <Fragment key={a.id}>
              <ArticleCard article={a} variant="list" />
              {(i + 1) % 4 === 0 && (
                <div className="py-6">
                  <AdSlot ad={ads.feed[(i + 1) / 4 - 1] ?? null} layout="feed" quiet loading={adsLoading} />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        {items.length === 0 && busy && <LoadingBlock label="Loading stories" />}
        {err && <ErrorState message={err} onRetry={() => void loadMore()} />}
        <div className="mt-6 text-center">
          {!done && items.length > 0 && (
            <Button variant="secondary" loading={busy} onClick={() => void loadMore()}>
              Load more stories
            </Button>
          )}
          {done && <p className="font-sans text-small text-muted">You've reached the end of the latest stories.</p>}
        </div>
      </div>
      <aside aria-label="Sidebar" className="space-y-8 lg:pl-8">
        <div className="lg:sticky lg:top-16 space-y-8">
          <AdSlot ad={ads.sidebar[0] ?? null} layout="sidebar" loading={adsLoading} />
          <AdSlot ad={ads.sidebar[1] ?? null} layout="sidebar" quiet loading={adsLoading} />
          <AdSlot ad={ads.sidebar[2] ?? null} layout="sidebar" quiet loading={adsLoading} />
        </div>
      </aside>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading the front page">
      <div className="grid gap-8 lg:grid-cols-[8fr_4fr]">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );
}
