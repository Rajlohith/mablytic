import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "@/context/AuthContext";
import { useSections } from "@/hooks/useSections";
import { categorySlug } from "@/lib/format";
import { buttonClass } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

const today = () =>
  new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export function Header() {
  const { user, logout } = useAuth();
  const { data: sections } = useSections();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setSearchOpen(false), [location.pathname]);
  useEffect(() => {
    if (searchOpen) input.current?.focus();
  }, [searchOpen]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2 focus:font-sans">
        Skip to main content
      </a>

      <div className="mx-auto max-w-page px-4 pt-3 sm:px-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex items-center gap-3 font-sans text-small">
            <button
              type="button"
              onClick={() => setSearchOpen((o) => !o)}
              aria-expanded={searchOpen}
              aria-controls="site-search"
              aria-label="Search"
              className="rounded p-2 text-ink hover:bg-wash"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </button>
            <span className="hidden text-muted lg:inline">{today()}</span>
          </div>

          <div className="py-1 text-center">
            <Wordmark />
          </div>

          <div className="flex items-center justify-end gap-2 font-sans">
            {user ? (
              <>
                <Link to={homeFor(user)} className={buttonClass("secondary", "sm")}>
                  {user.is_admin ? "Console" : "My feed"}
                </Link>
                <button type="button" onClick={() => { logout(); navigate("/"); }} className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className={buttonClass("ghost", "sm")}>Log in</Link>
                <Link to="/register" className={buttonClass("primary", "sm", "hidden xs:inline-flex")}>Register</Link>
              </>
            )}
          </div>
        </div>

        {searchOpen && (
          <form id="site-search" role="search" onSubmit={submit} className="mt-3 flex gap-2">
            <label htmlFor="q" className="sr-only">Search articles</label>
            <input
              id="q" ref={input} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search articles"
              className="flex-1 rounded border border-rule px-3 py-2 font-sans text-small"
            />
            <button type="submit" className={buttonClass("primary", "md")}>Search</button>
          </form>
        )}
        <p className="mt-1 hidden font-sans text-small text-muted sm:block lg:hidden">{today()}</p>
      </div>

      <nav aria-label="Sections" className="sticky top-0 z-30 mt-3 border-y-2 border-double border-ink bg-white/95 shadow-sm backdrop-blur">
        <ul className="mx-auto flex max-w-page gap-1 overflow-x-auto px-2 font-sans sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <li>
            <NavLink to="/" end className={({ isActive }) => navItem(isActive)}>Home</NavLink>
          </li>
          {(sections ?? []).map((s) => (
            <li key={s.name}>
              <NavLink to={`/section/${categorySlug(s.name)}`} className={({ isActive }) => navItem(isActive)}>
                {s.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

const navItem = (active: boolean) =>
  `block whitespace-nowrap px-3 py-3 text-[0.95rem] ${active ? "border-b-2 border-ink font-semibold text-ink" : "text-body hover:text-ink"}`;
