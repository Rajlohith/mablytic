import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

const API = "http://127.0.0.1:8000";

// ── Palette ──────────────────────────────────────────────────────────────────
const CLR = {
  bg:      "#0a0c10",
  panel:   "#111318",
  border:  "#1e2230",
  accent:  "#00e5ff",
  accent2: "#ff6b35",
  muted:   "#4a5568",
  text:    "#e2e8f0",
  dim:     "#718096",
  green:   "#00d4a0",
  red:     "#ff4466",
};

// ── Tiny helpers ──────────────────────────────────────────────────────────────
const fmt = (n) => (n === undefined || n === null ? "—" : n);

function useFetch(url, deps = []) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!url) return;
    setLoading(true);
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(r.statusText); return r.json(); })
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, error, refetch };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => (
  <div style={{
    background: CLR.panel,
    border: `1px solid ${CLR.border}`,
    borderRadius: 12,
    padding: "20px 24px",
    ...style,
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{
    fontSize: 10,
    fontFamily: "'Space Mono', monospace",
    letterSpacing: "0.15em",
    color: CLR.dim,
    textTransform: "uppercase",
    marginBottom: 6,
  }}>
    {children}
  </div>
);

const Tag = ({ children, color = CLR.accent }) => (
  <span style={{
    fontFamily: "'Space Mono', monospace",
    fontSize: 10,
    background: color + "18",
    color,
    border: `1px solid ${color}40`,
    borderRadius: 4,
    padding: "2px 7px",
  }}>
    {children}
  </span>
);

const Pill = ({ type }) => {
  const isClick = type === "click";
  return (
    <span style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: 10,
      background: (isClick ? CLR.green : CLR.accent) + "18",
      color: isClick ? CLR.green : CLR.accent,
      border: `1px solid ${(isClick ? CLR.green : CLR.accent)}40`,
      borderRadius: 20,
      padding: "2px 10px",
    }}>
      {type}
    </span>
  );
};

const StatCard = ({ label, value, sub, accent = CLR.accent }) => (
  <Card>
    <Label>{label}</Label>
    <div style={{
      fontSize: 36,
      fontFamily: "'Space Mono', monospace",
      color: accent,
      lineHeight: 1,
      marginBottom: 4,
    }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 12, color: CLR.dim }}>{sub}</div>}
  </Card>
);

const Section = ({ title, children, action }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    }}>
      <h2 style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: 12,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: CLR.dim,
        margin: 0,
      }}>
        {title}
      </h2>
      {action}
    </div>
    {children}
  </div>
);

const Btn = ({ children, onClick, variant = "primary", style = {} }) => {
  const [hover, setHover] = useState(false);
  const base = {
    fontFamily: "'Space Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.08em",
    padding: "8px 18px",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s",
    ...style,
  };
  const styles = {
    primary: {
      background: hover ? CLR.accent : CLR.accent + "ee",
      color: "#000",
    },
    ghost: {
      background: hover ? CLR.border : "transparent",
      color: CLR.dim,
      border: `1px solid ${CLR.border}`,
    },
    danger: {
      background: hover ? CLR.red : CLR.red + "bb",
      color: "#fff",
    },
  };
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...styles[variant] }}
    >
      {children}
    </button>
  );
};

// ── Custom tooltip for bar chart ──────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{
        background: CLR.panel,
        border: `1px solid ${CLR.border}`,
        borderRadius: 8,
        padding: "12px 16px",
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
      }}>
        <div style={{ color: CLR.text, marginBottom: 6, fontWeight: "bold" }}>{d.title}</div>
        <div style={{ color: CLR.dim }}>Cat: <span style={{ color: CLR.accent2 }}>{d.category}</span></div>
        <div style={{ color: CLR.dim }}>Variant: <span style={{ color: CLR.accent }}>{d.variant}</span></div>
        <div style={{ color: CLR.dim }}>Views: {d.views}</div>
        <div style={{ color: CLR.dim }}>Clicks: {d.clicks}</div>
        <div style={{ color: CLR.green }}>CTR: {d.ctr_percentage}%</div>
      </div>
    );
  }
  return null;
};

// ── Views ─────────────────────────────────────────────────────────────────────

function Overview({ onRefresh }) {
  const { data: stats, loading: sL, refetch: rS } = useFetch(`${API}/admin/dashboard-stats`);
  const { data: analytics, loading: aL, refetch: rA } = useFetch(`${API}/admin/analytics`);

  const refresh = () => { rS(); rA(); onRefresh?.(); };

  const ctrBars = analytics
    ? analytics.map((a) => ({ ...a, ctr_percentage: a.ctr_percentage }))
    : [];

  const maxCtr = ctrBars.length ? Math.max(...ctrBars.map((d) => d.ctr_percentage)) : 0;

  return (
    <div>
      {/* Stat row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 16,
        marginBottom: 32,
      }}>
        {sL ? Array(5).fill(0).map((_, i) => <SkeletonCard key={i} />) : (
          <>
            <StatCard label="Total Users"  value={fmt(stats?.total_users)}  accent={CLR.accent} />
            <StatCard label="Total Ads"    value={fmt(stats?.total_ads)}    accent={CLR.accent2} />
            <StatCard label="Total Views"  value={fmt(stats?.total_views)}  accent={CLR.accent} />
            <StatCard label="Total Clicks" value={fmt(stats?.total_clicks)} accent={CLR.green} />
            <StatCard
              label="Global CTR"
              value={`${fmt(stats?.global_ctr)}%`}
              accent={CLR.green}
              sub="Clicks ÷ Views"
            />
          </>
        )}
      </div>

      {/* CTR Chart */}
      <Section
        title="Click-Through Rate — All Ads"
        action={<Btn variant="ghost" onClick={refresh}>↻ Refresh</Btn>}
      >
        <Card style={{ padding: "24px 8px 16px" }}>
          {aL ? <Loading /> : ctrBars.length === 0 ? <Empty msg="No analytics yet" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ctrBars} barSize={24} margin={{ left: 0, right: 24, top: 4, bottom: 60 }}>
                <CartesianGrid vertical={false} stroke={CLR.border} />
                <XAxis
                  dataKey="title"
                  tick={{ fill: CLR.dim, fontSize: 10, fontFamily: "'Space Mono', monospace" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: CLR.dim, fontSize: 10, fontFamily: "'Space Mono', monospace" }}
                  tickFormatter={(v) => `${v}%`}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: CLR.border }} />
                <Bar dataKey="ctr_percentage" radius={[4, 4, 0, 0]}>
                  {ctrBars.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.ctr_percentage === maxCtr ? CLR.green : CLR.accent}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>
    </div>
  );
}

function History() {
  const [limit, setLimit] = useState(20);
  const { data, loading, refetch } = useFetch(`${API}/admin/history?limit=${limit}`, [limit]);

  return (
    <Section
      title={`Interaction Log — last ${limit}`}
      action={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            style={{
              background: CLR.panel,
              border: `1px solid ${CLR.border}`,
              borderRadius: 6,
              color: CLR.dim,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} rows</option>)}
          </select>
          <Btn variant="ghost" onClick={refetch}>↻</Btn>
        </div>
      }
    >
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {loading ? <Loading /> : !data?.length ? <Empty msg="No interactions yet" /> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${CLR.border}` }}>
                  {["Time", "User Prefs", "Ad Title", "Variant", "Type"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px",
                      textAlign: "left",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      letterSpacing: "0.1em",
                      color: CLR.dim,
                      textTransform: "uppercase",
                      fontWeight: "normal",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: `1px solid ${CLR.border}`,
                      background: i % 2 === 0 ? "transparent" : CLR.bg + "80",
                    }}
                  >
                    <td style={td}><code style={{ color: CLR.dim, fontSize: 11 }}>{row.timestamp}</code></td>
                    <td style={td}><Tag color={CLR.accent2}>{row.user_prefs}</Tag></td>
                    <td style={{ ...td, color: CLR.text, maxWidth: 200 }}>{row.ad_title}</td>
                    <td style={td}><Tag>{row.variant || "N/A"}</Tag></td>
                    <td style={td}><Pill type={row.type} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  );
}

function Users() {
  const { data: users, loading, refetch } = useFetch(`${API}/admin/users`);
  const [selected, setSelected] = useState(null);
  const { data: ua, loading: uaL } = useFetch(
    selected ? `${API}/admin/analytics/user/${selected}` : null,
    [selected]
  );
  const [newPrefs, setNewPrefs] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const createPersona = async () => {
    if (!newPrefs.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: newPrefs }),
      });
      if (!r.ok) throw new Error(await r.text());
      setNewPrefs("");
      setMsg("✓ Persona created");
      refetch();
    } catch (e) { setMsg(`✗ ${e.message}`); }
    setCreating(false);
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div>
      {/* Create persona */}
      <Section title="Create Persona">
        <Card>
          <Label>Preferences (comma-separated)</Label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={newPrefs}
              onChange={(e) => setNewPrefs(e.target.value)}
              placeholder="tech, gaming, fitness"
              style={{
                flex: 1,
                background: CLR.bg,
                border: `1px solid ${CLR.border}`,
                borderRadius: 6,
                color: CLR.text,
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                padding: "9px 14px",
                outline: "none",
              }}
              onKeyDown={(e) => e.key === "Enter" && createPersona()}
            />
            <Btn onClick={createPersona} style={{ opacity: creating ? 0.6 : 1 }}>
              {creating ? "Creating…" : "+ Create"}
            </Btn>
          </div>
          {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith("✓") ? CLR.green : CLR.red }}>{msg}</div>}
        </Card>
      </Section>

      {/* User list + detail */}
      <Section
        title={`${users?.length ?? 0} Users`}
        action={<Btn variant="ghost" onClick={refetch}>↻</Btn>}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* List */}
          <Card style={{ padding: 0, overflow: "hidden", maxHeight: 420, overflowY: "auto" }}>
            {loading ? <Loading /> : !users?.length ? <Empty msg="No users yet" /> : users.map((u) => (
              <div
                key={u.id}
                onClick={() => setSelected(u.id === selected ? null : u.id)}
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${CLR.border}`,
                  cursor: "pointer",
                  background: selected === u.id ? CLR.accent + "10" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background 0.1s",
                }}
              >
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: CLR.accent + "20",
                  border: `1px solid ${CLR.accent}40`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: 10,
                  color: CLR.accent,
                  flexShrink: 0,
                }}>
                  {u.id}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: CLR.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.preferences}
                  </div>
                  <div style={{ fontSize: 10, color: CLR.dim }}>User #{u.id}</div>
                </div>
              </div>
            ))}
          </Card>

          {/* Detail */}
          <Card>
            {!selected ? (
              <Empty msg="Select a user to view analytics" />
            ) : uaL ? <Loading /> : ua ? (
              <div>
                <Label>User #{selected} Analytics</Label>
                <div style={{ fontSize: 13, color: CLR.text, marginBottom: 16 }}>
                  <Tag color={CLR.accent2}>{ua.preferences}</Tag>
                </div>
                {[
                  { label: "Views", value: ua.total_views, color: CLR.accent },
                  { label: "Clicks", value: ua.total_clicks, color: CLR.green },
                  { label: "CTR", value: `${ua.ctr}%`, color: CLR.green },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: `1px solid ${CLR.border}`,
                  }}>
                    <span style={{ color: CLR.dim, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{label}</span>
                    <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: "bold" }}>{value}</span>
                  </div>
                ))}
                <CtrBar value={ua.ctr} />
              </div>
            ) : <Empty msg="No data" />}
          </Card>
        </div>
      </Section>
    </div>
  );
}

function Ads() {
  const { data: ads, loading, refetch } = useFetch(`${API}/admin/ads`);
  const [selected, setSelected] = useState(null);
  const { data: aa, loading: aaL } = useFetch(
    selected ? `${API}/admin/analytics/ad/${selected}` : null,
    [selected]
  );

  return (
    <Section
      title={`${ads?.length ?? 0} Ads`}
      action={<Btn variant="ghost" onClick={refetch}>↻</Btn>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card style={{ padding: 0, overflow: "hidden", maxHeight: 500, overflowY: "auto" }}>
          {loading ? <Loading /> : !ads?.length ? <Empty msg="No ads yet" /> : ads.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a.id === selected ? null : a.id)}
              style={{
                padding: "14px 16px",
                borderBottom: `1px solid ${CLR.border}`,
                cursor: "pointer",
                background: selected === a.id ? CLR.accent2 + "10" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: CLR.text, fontWeight: 500 }}>{a.title}</div>
                <Tag>{a.variant || "—"}</Tag>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Tag color={CLR.accent2}>{a.category}</Tag>
                <span style={{ fontSize: 10, color: CLR.dim }}>ID: {a.id}</span>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          {!selected ? (
            <Empty msg="Select an ad to view performance" />
          ) : aaL ? <Loading /> : aa ? (
            <div>
              <Label>Ad #{selected} Performance</Label>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <Tag color={CLR.accent2}>{aa.category}</Tag>
                <Tag>{aa.variant}</Tag>
              </div>
              {[
                { label: "Views",  value: aa.total_views,  color: CLR.accent },
                { label: "Clicks", value: aa.total_clicks, color: CLR.green },
                { label: "CTR",    value: `${aa.ctr}%`,    color: CLR.green },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${CLR.border}`,
                }}>
                  <span style={{ color: CLR.dim, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{label}</span>
                  <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: "bold" }}>{value}</span>
                </div>
              ))}
              <CtrBar value={aa.ctr} />
            </div>
          ) : <Empty msg="No data" />}
        </Card>
      </div>
    </Section>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────
function CtrBar({ value }) {
  const pct = Math.min(value, 100);
  const color = pct > 10 ? CLR.green : pct > 3 ? CLR.accent : CLR.accent2;
  return (
    <div style={{ marginTop: 20 }}>
      <Label>CTR Visual</Label>
      <div style={{ background: CLR.bg, borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: 4,
          transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ marginTop: 4, fontSize: 10, color, fontFamily: "'Space Mono', monospace" }}>
        {value}%
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{
      padding: 32,
      textAlign: "center",
      color: CLR.dim,
      fontFamily: "'Space Mono', monospace",
      fontSize: 12,
      animation: "pulse 1s infinite",
    }}>
      loading…
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{
      padding: 40,
      textAlign: "center",
      color: CLR.muted,
      fontFamily: "'Space Mono', monospace",
      fontSize: 12,
    }}>
      {msg}
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <div style={{ height: 10, background: CLR.border, borderRadius: 4, width: "50%", marginBottom: 12 }} />
      <div style={{ height: 36, background: CLR.border, borderRadius: 4, width: "70%" }} />
    </Card>
  );
}

const td = {
  padding: "10px 16px",
  fontSize: 12,
  color: CLR.dim,
  fontFamily: "'Space Mono', monospace",
  whiteSpace: "nowrap",
};

// ── Nav ────────────────────────────────────────────────────────────────────────
const TABS = ["Overview", "History", "Users", "Ads"];

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState("Overview");
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{
      minHeight: "100vh",
      background: CLR.bg,
      color: CLR.text,
      fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${CLR.bg}; }
        ::-webkit-scrollbar-thumb { background: ${CLR.border}; border-radius: 3px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: CLR.panel,
        borderBottom: `1px solid ${CLR.border}`,
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        height: 56,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 13,
          color: CLR.accent,
          letterSpacing: "0.08em",
          marginRight: 40,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            width: 22,
            height: 22,
            background: CLR.accent,
            borderRadius: 4,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <span style={{ color: "#000", fontSize: 12 }}>▲</span>
          </span>
          AD ENGINE
        </div>

        {/* Tabs */}
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.08em",
              color: tab === t ? CLR.accent : CLR.dim,
              padding: "0 16px",
              height: 56,
              cursor: "pointer",
              borderBottom: tab === t ? `2px solid ${CLR.accent}` : "2px solid transparent",
              transition: "color 0.15s",
              textTransform: "uppercase",
            }}
          >
            {t}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: CLR.muted,
        }}>
          <span style={{ color: CLR.green }}>●</span> {API}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 32px" }}>
        {tab === "Overview" && <Overview onRefresh={() => setRefreshKey((k) => k + 1)} />}
        {tab === "History"  && <History key={refreshKey} />}
        {tab === "Users"    && <Users />}
        {tab === "Ads"      && <Ads />}
      </div>
    </div>
  );
}