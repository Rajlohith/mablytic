import { Link } from "react-router-dom";
import { categorySlug } from "@/lib/format";

export function SectionHeader({ name, count }: { name: string; count?: number }) {
  return (
    <div className="flex items-baseline justify-between border-t border-ink pt-2">
      <h2 className="font-sans text-lg font-bold text-ink">
        <Link to={`/section/${categorySlug(name)}`} className="hover:underline">{name}</Link>
      </h2>
      <Link to={`/section/${categorySlug(name)}`} className="font-sans text-small text-muted hover:text-ink hover:underline">
        {count !== undefined ? `All ${count} stories` : "More"}
      </Link>
    </div>
  );
}
