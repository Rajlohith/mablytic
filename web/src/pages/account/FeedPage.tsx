import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { articlesApi } from "@/api/services";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard } from "@/components/news/ArticleCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useAuth } from "@/context/AuthContext";
import { useAdPool } from "@/hooks/useAdPool";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { Ad, ArticleCard as Card } from "@/types";

const PAGE = 12;

export default function FeedPage() {
  useDocumentTitle("Your feed");
  const { user } = useAuth();
  const prefs = (user?.preferences ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const pool = useAdPool({ banner: 1, sidebar: 3, feed: 4 }, "account-feed");

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
      const res = await articlesApi.forYou({ page: next, page_size: PAGE });
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p.id === n.id))]);
      setTotal(res.total);
      setPage(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load your feed.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const why = (ad: Ad | null): string | undefined =>
    ad && prefs.includes(ad.category.toLowerCase()) ? `Matched to your interest in ${ad.category}` : undefined;

  const [top, ...rest] = items;
  const recs = rest.slice(0, 3);
  const more = rest.slice(3);
  const done = total !== null && items.length >= total;

  return (
    <div>
      <header className="border-b border-ink pb-3">
        <h1 className="font-headline text-4xl font-bold text-ink">Good to see you, {user?.first_name || user?.username}</h1>
        <p className="mt-1 font-sans text-small text-muted">
          {prefs.length > 0 ? (
            <>Stories picked for your interests: <span className="capitalize text-ink">{prefs.join(", ")}</span>. <Link className="underline" to="/account/preferences">Change interests</Link></>
          ) : (
            <>Showing the latest stories. <Link className="underline" to="/account/preferences">Choose your interests</Link> to personalize this page.</>
          )}
        </p>
      </header>

      {err && <div className="mt-8"><ErrorState message={err} onRetry={() => void loadMore()} /></div>}
      {items.length === 0 && busy && <LoadingBlock label="Building your feed" />}
      {items.length === 0 && !busy && !err && (
        <EmptyState title="Nothing here yet" action={<Link to="/" className="font-sans text-small underline">Browse the front page</Link>}>
          We couldn't find stories matching your interests.
        </EmptyState>
      )}

      {top && (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-0">
          <div className="lg:border-r lg:border-rule lg:pr-8">
            <section aria-labelledby="rec-h">
              <h2 id="rec-h" className="sr-only">Recommended for you</h2>
              <ArticleCard article={top} variant="lead" />
              {recs.length > 0 && (
                <div className="mt-8 grid gap-6 border-t border-rule pt-6 sm:grid-cols-3">
                  {recs.map((a) => <ArticleCard key={a.id} article={a} variant="stacked" showCategory />)}
                </div>
              )}
            </section>

            <AdSlot ad={pool.get("banner", 0)} layout="banner" note={why(pool.get("banner", 0))} loading={pool.loading} className="my-10" />

            {more.length > 0 && (
              <section aria-labelledby="more-h">
                <div className="border-t border-ink pt-2"><h2 id="more-h" className="font-sans text-lg font-bold text-ink">More for you</h2></div>
                <div className="divide-y divide-rule">
                  {more.map((a, i) => (
                    <Fragment key={a.id}>
                      <ArticleCard article={a} variant="list" />
                      {(i + 1) % 4 === 0 && (
                        <div className="py-6">
                          <AdSlot ad={pool.get("feed", (i + 1) / 4 - 1)} layout="feed" note={why(pool.get("feed", (i + 1) / 4 - 1))} quiet loading={pool.loading} />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 text-center">
              {!done && items.length > 0 && <Button variant="secondary" loading={busy} onClick={() => void loadMore()}>Load more stories</Button>}
              {done && <p className="font-sans text-small text-muted">That's everything for your interests right now.</p>}
            </div>
          </div>

          <aside aria-label="Sidebar" className="lg:pl-8">
            <div className="space-y-8 lg:sticky lg:top-16">
              {[0, 1, 2].map((n) => (
                <AdSlot key={n} ad={pool.get("sidebar", n)} layout="sidebar" note={why(pool.get("sidebar", n))} quiet={n > 0} loading={pool.loading} />
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
