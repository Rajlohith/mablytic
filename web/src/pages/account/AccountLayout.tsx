import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/account", label: "Your feed", end: true },
  { to: "/account/preferences", label: "Interests" },
  { to: "/account/security", label: "Password" },
];

export function AccountLayout() {
  return (
    <div>
      <nav aria-label="Account" className="mb-8 border-b border-rule">
        <ul className="flex gap-1 font-sans">
          {tabs.map((t) => (
            <li key={t.to}>
              <NavLink
                to={t.to}
                end={t.end ?? false}
                className={({ isActive }) =>
                  `block px-3 py-2 text-small ${isActive ? "border-b-2 border-ink font-semibold text-ink" : "text-muted hover:text-ink"}`
                }
              >
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
