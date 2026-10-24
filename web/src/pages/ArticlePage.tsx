import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { articlesApi } from "@/api/services";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard, ArticleImage } from "@/components/news/ArticleCard";
import { DemoNotice } from "@/components/news/DemoNotice";
import { buttonClass } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useAdPool } from "@/hooks/useAdPool";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { categorySlug, formatDate } from "@/lib/format";

/** Paragraph indexes (0-based, after which) inline ads appear — only in long articles. */
export function inlineAdPositions(paragraphCount: number): number[] {
  if (paragraphCount < 5) return [];
  const positions = [2];
  if (paragraphCount >= 9) positions.push(6);
  if (paragraphCount >= 14) positions.push(11);
  return positions;
}

export default function ArticlePage() {
  const { slug = "" } = useParams();
  const pool = useAdPool({ inline: 3, sidebar: 2, banner: 1 }, `article-${slug}`);
  const { data, error, loading, reload } = useAsync(
    async (signal) => {
      const [article, related] = await Promise.all([
        articlesApi.get(slug, signal),
        articlesApi.related(slug, 4, signal).catch(() => []),
      ]);
      return { article, related };
    },
    [slug],
  );

  useDocumentTitle(data?.article.title ?? "Article");

  if (loading) return <LoadingBlock label="Loading article" />;
  if (error) {
    const notFound = error.toLowerCase().includes("not found");
    return notFound ? (
      <EmptyState title="We couldn't find that article" action={<Link to="/" className={buttonClass("secondary")}>Back to the front page</Link>}>
        It may have been moved or unpublished.
      </EmptyState>
    ) : (
      <ErrorState message={error} onRetry={reload} />
    );
  }
  if (!data) return null;

  const { article: a, related } = data;
  const paragraphs = a.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const adAfter = inlineAdPositions(paragraphs.length);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:gap-12">
      <article className="mx-auto w-full max-w-reading lg:mx-0 lg:justify-self-end">
        <header>
          <Link to={`/section/${categorySlug(a.category)}`} className="font-sans text-meta font-bold uppercase tracking-wider text-ink hover:underline">
            {a.category}
          </Link>
          <h1 className="mt-3 font-headline text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">{a.title}</h1>
          <p className="mt-4 font-serif text-xl leading-snug text-muted">{a.summary}</p>
          <div className="mt-5 border-y border-rule py-3 font-sans text-small">
            <p className="font-semibold text-ink">By {a.author}</p>
            <p className="text-muted">
              Published {formatDate(a.published_at)} · {a.read_minutes} min read
            </p>
          </div>
        </header>

        {a.image_url && (
          <div className="mt-6 -mx-4 sm:mx-0">
            <ArticleImage article={a} ratio="aspect-[3/2]" eager credit />
          </div>
        )}

        {a.is_demo && <div className="mt-6"><DemoNotice /></div>}

        <div className="prose-article mt-8">
          {paragraphs.map((p, i) => (
            <Fragment key={i}>
              <p>{p}</p>
              {adAfter.includes(i) && (
                <AdSlot ad={pool.get("inline", adAfter.indexOf(i))} layout="inline" quiet={adAfter.indexOf(i) > 0} loading={pool.loading} />
              )}
            </Fragment>
          ))}
        </div>
      </article>

      <aside aria-label="Sidebar" className="lg:pt-2">
        <div className="space-y-8 lg:sticky lg:top-16">
          <AdSlot ad={pool.get("sidebar", 0)} layout="sidebar" loading={pool.loading} />
          <AdSlot ad={pool.get("sidebar", 1)} layout="sidebar" quiet loading={pool.loading} />
        </div>
      </aside>

      {related.length > 0 && (
        <section aria-labelledby="related-h" className="lg:col-span-2">
          <AdSlot ad={pool.get("banner", 0)} layout="banner" loading={pool.loading} className="mb-10" />
          <div className="border-t border-ink pt-2">
            <h2 id="related-h" className="font-sans text-lg font-bold text-ink">More in {a.category}</h2>
          </div>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <ArticleCard key={r.id} article={r} variant="stacked" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

