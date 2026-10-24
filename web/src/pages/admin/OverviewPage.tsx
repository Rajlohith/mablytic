import { Link } from "react-router-dom";
import { adminApi } from "@/api/services";
import { Card, PageHeader, StatCard, StatusBadge, TableShell, td, th } from "@/components/admin/AdminUI";
import { TrendChart } from "@/components/admin/TrendChart";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";

export default function OverviewPage() {
  useDocumentTitle("Overview");
  const { data, error, loading, reload } = useAsync(
    async (signal) => {
      const [overview, history] = await Promise.all([adminApi.overview(signal), adminApi.history(8, signal)]);
      return { overview, history };
    },
    [],
  );

  if (loading) return <LoadingBlock label="Loading overview" />;
  if (error || !data) return <ErrorState message={error ?? "No data."} onRetry={reload} />;
  const { overview: o, history } = data;
  const t = o.totals;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Key metrics, recent activity and campaign performance."
        actions={<ButtonLink to="/console/ads/new">New advertisement</ButtonLink>}
      />

      <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCard label="Impressions" value={formatNumber(t.views)} />
        <StatCard label="Clicks" value={formatNumber(t.clicks)} />
        <StatCard label="Click-through rate" value={formatPercent(t.ctr)} />
        <StatCard label="Readers" value={formatNumber(t.users)} sub={`${t.admins} admin${t.admins === 1 ? "" : "s"}`} />
        <StatCard label="Live advertisements" value={`${t.active_ads} / ${t.ads}`} sub="Deliverable now / total" />
        <StatCard label="Active campaigns" value={`${t.active_campaigns} / ${t.campaigns}`} />
        <StatCard label="Published articles" value={`${t.published_articles} / ${t.articles}`} />
        <div className="border-t border-ink pt-2 font-sans">
          <dt className="text-small text-muted">System status</dt>
          <dd className="mt-1 flex items-center gap-2 text-ink">
            <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${o.system.database === "ok" ? "bg-ok" : "bg-danger"}`} />
            Database {o.system.database === "ok" ? "connected" : "unavailable"}
          </dd>
        </div>
      </dl>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title={`Views and clicks, last ${o.daily.length} days`}>
          {t.views === 0 ? (
            <EmptyState title="No impressions yet">Impressions are recorded when signed-in readers view advertisements.</EmptyState>
          ) : (
            <TrendChart data={o.daily} />
          )}
        </Card>
        <Card title="Top advertisements" action={<Link className="font-sans text-small underline" to="/console/analytics">Full report</Link>}>
          <TableShell caption="Top advertisements by clicks">
            <thead><tr><th className={th}>Advertisement</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>CTR</th></tr></thead>
            <tbody>
              {o.top_ads.map((a) => (
                <tr key={a.ad_id}>
                  <td className={td}><Link className="underline" to={`/console/ads/${a.ad_id}/edit`}>{a.title}</Link></td>
                  <td className={td}>{formatNumber(a.views)}</td><td className={td}>{formatNumber(a.clicks)}</td><td className={td}>{formatPercent(a.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Campaign performance" action={<Link className="font-sans text-small underline" to="/console/campaigns">Manage</Link>}>
          {o.campaigns.length === 0 ? (
            <EmptyState title="No campaigns yet" action={<ButtonLink to="/console/campaigns" variant="secondary">Create a campaign</ButtonLink>} />
          ) : (
            <TableShell caption="Campaign performance">
              <thead><tr><th className={th}>Campaign</th><th className={th}>Status</th><th className={th}>Ads</th><th className={th}>CTR</th><th className={th}>Budget</th></tr></thead>
              <tbody>
                {o.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.name}</td><td className={td}><StatusBadge status={c.status} /></td>
                    <td className={td}>{c.ad_count}</td><td className={td}>{formatPercent(c.ctr)}</td><td className={td}>{formatMoney(c.budget)}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          )}
        </Card>
        <Card title="Recent activity">
          {history.length === 0 ? (
            <p className="font-sans text-small text-muted">No interactions recorded yet.</p>
          ) : (
            <ul className="divide-y divide-rule font-sans text-small">
              {history.map((h) => (
                <li key={h.log_id} className="flex justify-between gap-3 py-2">
                  <span><span className="font-semibold text-ink">{h.username}</span> {h.type === "click" ? "clicked" : "viewed"} “{h.ad_title}”</span>
                  <span className="shrink-0 text-muted">{h.timestamp.slice(5, 16)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
