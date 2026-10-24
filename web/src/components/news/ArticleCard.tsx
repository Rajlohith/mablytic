import { Link } from "react-router-dom";
import { categorySlug, formatDate } from "@/lib/format";
import type { ArticleCard as Card } from "@/types";

export const articlePath = (a: Pick<Card, "slug">) => `/article/${a.slug}`;

interface ImgProps {
  article: Card;
  ratio?: string;
  eager?: boolean;
  credit?: boolean;
  className?: string;
}

export function ArticleImage({ article, ratio = "aspect-[3/2]", eager, credit, className = "" }: ImgProps) {
  if (!article.image_url) return <div aria-hidden className={`${ratio} bg-wash ${className}`} />;
  return (
    <figure className={className}>
      <div className={`${ratio} overflow-hidden bg-wash`}>
        <img
          src={article.image_url}
          alt={article.image_alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
      {credit && article.image_credit && (
        <figcaption className="mt-1.5 text-right font-sans text-meta text-muted">{article.image_credit}</figcaption>
      )}
    </figure>
  );
}

const Meta = ({ a, showCategory }: { a: Card; showCategory?: boolean }) => (
  <p className="mt-1.5 font-sans text-meta uppercase tracking-wide text-muted">
    {showCategory && (
      <>
        <span className="font-semibold text-ink">{a.category}</span>
        <span aria-hidden> · </span>
      </>
    )}
    {a.read_minutes} min read
  </p>
);

const Title = ({ a, className }: { a: Card; className: string }) => (
  <h3 className={`font-headline text-ink ${className}`}>
    <Link to={articlePath(a)} className="hover:underline decoration-1 underline-offset-2">
      {a.title}
    </Link>
  </h3>
);

export type CardVariant = "lead" | "stacked" | "compact" | "row" | "list";

interface Props {
  article: Card;
  variant?: CardVariant;
  showCategory?: boolean;
  eager?: boolean;
}

/** One article card in several editorial arrangements. */
export function ArticleCard({ article: a, variant = "stacked", showCategory, eager }: Props) {
  switch (variant) {
    case "lead":
      return (
        <article className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:items-start">
          <div className="order-2 lg:order-1">
            <Link to={`/section/${categorySlug(a.category)}`} className="font-sans text-meta font-bold uppercase tracking-wider text-ink hover:underline">
              {a.category}
            </Link>
            <Title a={a} className="mt-2 text-3xl font-bold leading-[1.12] sm:text-4xl" />
            <p className="mt-3 font-serif text-deck text-muted">{a.summary}</p>
            <Meta a={a} />
          </div>
          <ArticleImage article={a} ratio="aspect-[3/2]" eager credit className="order-1 lg:order-2" />
        </article>
      );
    case "row":
      return (
        <article className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <div>
            {showCategory && <p className="font-sans text-meta font-bold uppercase tracking-wider text-ink">{a.category}</p>}
            <Title a={a} className="text-lg font-bold leading-snug" />
            <Meta a={a} />
          </div>
          <ArticleImage article={a} ratio="aspect-square" />
        </article>
      );
    case "compact":
      return (
        <article>
          {showCategory && <p className="font-sans text-meta font-bold uppercase tracking-wider text-muted">{a.category}</p>}
          <Title a={a} className="text-lg font-bold leading-snug" />
          <Meta a={a} />
        </article>
      );
    case "list":
      return (
        <article className="grid gap-4 py-6 sm:grid-cols-[8rem_minmax(0,1fr)_12rem] sm:gap-6">
          <p className="hidden font-sans text-small text-muted sm:block">{formatDate(a.published_at, { month: "short", day: "numeric", year: "numeric" })}</p>
          <div>
            <p className="font-sans text-meta font-bold uppercase tracking-wider text-ink">{a.category}</p>
            <Title a={a} className="mt-1 text-2xl font-bold leading-tight" />
            <p className="mt-2 font-serif text-deck text-muted">{a.summary}</p>
            <p className="mt-2 font-sans text-meta uppercase text-muted">By {a.author} · {a.read_minutes} min read</p>
          </div>
          <ArticleImage article={a} ratio="aspect-[4/3]" className="sm:order-last" />
        </article>
      );
    default:
      return (
        <article>
          <ArticleImage article={a} eager={eager ?? false} />
          <Title a={a} className="mt-3 text-xl font-bold leading-snug" />
          <p className="mt-1.5 font-serif text-small text-muted">{a.summary}</p>
          <Meta a={a} showCategory={showCategory ?? false} />
        </article>
      );
  }
}
