import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Wordmark } from "./Wordmark";

const NAV = [
  { to: "/console", label: "Overview", end: true },
  { to: "/console/ads", label: "Advertisements" },
  { to: "/console/campaigns", label: "Campaigns" },
  { to: "/console/articles", label: "Articles" },
  { to: "/console/users", label: "Users" },
  { to: "/console/targeting", label: "Audience targeting" },
  { to: "/console/analytics", label: "Analytics & reports" },
  { to: "/console/settings", label: "Settings" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const links = (
    <ul className="space-y-0.5 font-sans">
      {NAV.map((n) => (
        <li key={n.to}>
          <NavLink
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-small ${isActive ? "bg-ink font-semibold text-white" : "text-body hover:bg-wash"}`
            }
          >
            {n.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-white md:grid md:grid-cols-[15rem_1fr]">
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:p-2 focus:font-sans">
        Skip to main content
      </a>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-rule px-4 py-3 md:hidden">
        <Wordmark size="sm" />
        <Button variant="secondary" size="sm" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((o) => !o)}>
          Menu
        </Button>
      </div>

      <aside
        id="admin-nav"
        className={`${open ? "block" : "hidden"} border-b border-rule bg-white p-4 md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto md:border-b-0 md:border-r`}
      >
        <div className="mb-6 hidden md:block">
          <Wordmark size="sm" />
          <p className="mt-1 font-sans text-meta text-muted">Administration</p>
        </div>
        <nav aria-label="Administration">{links}</nav>
        <div className="mt-6 border-t border-rule pt-4 font-sans text-small">
          <p className="truncate text-muted">Signed in as <span className="font-semibold text-ink">{user?.username}</span></p>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>View site</Button>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/login"); }}>Sign out</Button>
          </div>
        </div>
      </aside>

      <main id="admin-main" tabIndex={-1} className="min-w-0 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
