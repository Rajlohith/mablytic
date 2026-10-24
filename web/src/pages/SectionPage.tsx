import { Fragment } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { articlesApi } from "@/api/services";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard } from "@/components/news/ArticleCard";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { useAdPool } from "@/hooks/useAdPool";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { categorySlug } from "@/lib/format";
import { loadSections } from "@/hooks/useSections";

const PAGE_SIZE = 12;

export default function SectionPage() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const pool = useAdPool({ banner: 1, sidebar: 2, feed: 2 }, `section-${slug}-${page}`);

  const { data, error, loading, reload } = useAsync(async (signal) => {
    const sections = await loadSections();
    const section = sections.find((s) => categorySlug(s.name) === slug);
    if (!section) return { section: null, list: null };
    const list = await articlesApi.list({ category: section.name, page, page_size: PAGE_SIZE }, signal);
    return { section, list };
  }, [slug, page]);

  useDocumentTitle(data?.section?.name ?? "Section");

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading || !data) return <LoadingBlock label="Loading section" />;
  if (!data.section || !data.list) {
    return (
      <EmptyState title="That section doesn't exist" action={<Link to="/" className="font-sans text-small underline">Back to the front page</Link>}>
        Check the section name or pick one from the navigation above.
      </EmptyState>
    );
  }

  const { section, list } = data;
  const [first, ...rest] = list.items;

  return (
    <div>
      <header className="border-b border-ink pb-3">
        <h1 className="font-headline text-4xl font-bold text-ink sm:text-5xl">{section.name}</h1>
        <p className="mt-1 font-sans text-small text-muted">{section.count} stories</p>
      </header>

      {list.items.length === 0 ? (
        <EmptyState title="No stories on this page">Try an earlier page.</EmptyState>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] lg:gap-0">
          <div className="lg:border-r lg:border-rule lg:pr-8">
            <h2 className="sr-only">Stories in {section.name}</h2>
            {first && page === 1 && <ArticleCard article={first} variant="lead" />}
            <AdSlot ad={pool.get("banner", 0)} layout="banner" loading={pool.loading} className="my-10" />
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {(page === 1 ? rest : list.items).map((a, i) => (
                <Fragment key={a.id}>
                  <ArticleCard article={a} variant="stacked" />
                  {i === 3 && (
                    <div className="sm:col-span-2">
                      <AdSlot ad={pool.get("feed", 0)} layout="feed" quiet loading={pool.loading} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
            <div className="mt-10">
              <Pagination page={page} pageSize={PAGE_SIZE} total={list.total} onPage={(p) => setParams({ page: String(p) })} />
            </div>
          </div>
          <aside aria-label="Sidebar" className="lg:pl-8">
            <div className="space-y-8 lg:sticky lg:top-16">
              <AdSlot ad={pool.get("sidebar", 0)} layout="sidebar" loading={pool.loading} />
              <AdSlot ad={pool.get("sidebar", 1)} layout="sidebar" quiet loading={pool.loading} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
