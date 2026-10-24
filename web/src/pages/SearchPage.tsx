import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { articlesApi } from "@/api/services";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard } from "@/components/news/ArticleCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { useAdPool } from "@/hooks/useAdPool";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const PAGE_SIZE = 10;

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  useDocumentTitle(q ? `Search: ${q}` : "Search");
  const pool = useAdPool({ banner: 1, sidebar: 1 }, `search-${q}-${page}`);

  const { data, error, loading, reload } = useAsync(
    (signal) => (q ? articlesApi.list({ q, page, page_size: PAGE_SIZE }, signal) : Promise.resolve(null)),
    [q, page],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setParams(text.trim() ? { q: text.trim() } : {});
  };

  return (
    <div>
      <h1 className="font-headline text-4xl font-bold text-ink">Search</h1>
      <form role="search" onSubmit={submit} className="mt-4 flex max-w-xl gap-2">
        <label htmlFor="search-q" className="sr-only">Search articles</label>
        <input id="search-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search headlines and summaries"
          className="flex-1 rounded border border-rule px-3 py-2 font-sans text-small" />
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-0">
        <div className="lg:border-r lg:border-rule lg:pr-8">
          {!q && <EmptyState title="Search the news">Enter a word or phrase to find articles.</EmptyState>}
          {q && loading && <LoadingBlock label="Searching" />}
          {q && error && <ErrorState message={error} onRetry={reload} />}
          {q && data && data.items.length === 0 && (
            <EmptyState title={`No results for “${q}”`}>Try a different or shorter search term.</EmptyState>
          )}
          {q && data && data.items.length > 0 && (
            <>
              <h2 className="font-sans text-small font-normal text-muted">{data.total} result{data.total === 1 ? "" : "s"}</h2>
              <div className="divide-y divide-rule">
                {data.items.map((a, i) => (
                  <div key={a.id}>
                    <ArticleCard article={a} variant="list" />
                    {i === 3 && <div className="pb-6"><AdSlot ad={pool.get("banner", 0)} layout="banner" loading={pool.loading} /></div>}
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={(p) => setParams({ q, page: String(p) })} />
              </div>
            </>
          )}
        </div>
        <aside aria-label="Sidebar" className="lg:pl-8">
          <AdSlot ad={pool.get("sidebar", 0)} layout="sidebar" loading={pool.loading} />
        </aside>
      </div>
    </div>
  );
}
