import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { categorySlug } from "@/lib/format";
import { useSections } from "@/hooks/useSections";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const { user } = useAuth();
  const { data: sections } = useSections();
  return (
    <footer className="mt-16 border-t-2 border-double border-ink">
      <div className="mx-auto max-w-page px-4 py-8 sm:px-6">
        <Wordmark size="sm" />
        <nav aria-label="Footer sections" className="mt-4">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 font-sans text-small">
            {(sections ?? []).map((s) => (
              <li key={s.name}>
                <Link className="text-body hover:underline" to={`/section/${categorySlug(s.name)}`}>{s.name}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-4 font-sans text-small">
          <li><Link className="text-body hover:underline" to="/">Home</Link></li>
          <li><Link className="text-body hover:underline" to="/search">Search</Link></li>
          {user ? (
            <li><Link className="text-body hover:underline" to={user.is_admin ? "/console" : "/account"}>{user.is_admin ? "Console" : "My feed"}</Link></li>
          ) : (
            <>
              <li><Link className="text-body hover:underline" to="/login">Log in</Link></li>
              <li><Link className="text-body hover:underline" to="/register">Register</Link></li>
            </>
          )}
        </ul>
        <p className="mt-4 font-sans text-meta text-muted">
          © {new Date().getFullYear()} Mablytic. Headlines, summaries and images come from publishers' public RSS feeds and
          free news APIs (BBC News, NPR, The Guardian, The New York Times and others). Each story links to the original.
        </p>
      </div>
    </footer>
  );
}
