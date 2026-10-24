import { useMemo, useState } from "react";
import { adminApi } from "@/api/services";
import { PageHeader, StatCard, TableShell, td, th } from "@/components/admin/AdminUI";
import { TrendChart } from "@/components/admin/TrendChart";
import { SelectField } from "@/components/ui/fields";
import { Card } from "@/components/admin/AdminUI";
import { ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatNumber, formatPercent } from "@/lib/format";

export default function AnalyticsPage() {
  useDocumentTitle("Analytics & reports");
  const [days, setDays] = useState(14);
  const { data, error, loading, reload } = useAsync(async (signal) => {
    const [rows, overview, history] = await Promise.all([adminApi.analytics(signal), adminApi.overview(signal), adminApi.history(25, signal)]);
    return { rows, overview, history };
  }, []);
  const trend = useMemo(() => (data ? data.overview.daily.slice(-days) : []), [data, days]);

  if (loading) return <LoadingBlock label="Loading analytics" />;
  if (error || !data) return <ErrorState message={error ?? "No data."} onRetry={reload} />;
  const t = data.overview.totals;

  // A/B comparison from per-ad numbers.
  const variant = (v: string) => {
    const r = data.rows.filter((x) => x.variant === v);
    const views = r.reduce((s, x) => s + x.views, 0), clicks = r.reduce((s, x) => s + x.clicks, 0);
    return { views, clicks, ctr: views ? (clicks / views) * 100 : 0 };
  };
  const a = variant("A"), b = variant("B");
  const csv = () => {
    const lines = ["ad_id,title,category,variant,views,clicks,ctr_percentage", ...data.rows.map((r) => [r.ad_id, `"${r.title.replace(/"/g, '""')}"`, r.category, r.variant, r.views, r.clicks, r.ctr_percentage].join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const el = document.createElement("a"); el.href = url; el.download = "mablytic-ad-report.csv"; el.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Analytics & reports" description="Impressions, clicks and click-through rate from recorded reader interactions."
        actions={<button type="button" onClick={csv} className="rounded border border-ink px-3 py-1.5 font-sans text-small font-semibold hover:bg-wash">Download CSV</button>} />
      <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCard label="Impressions" value={formatNumber(t.views)} /><StatCard label="Clicks" value={formatNumber(t.clicks)} />
        <StatCard label="CTR" value={formatPercent(t.ctr)} /><StatCard label="Ads with data" value={`${data.rows.filter((r) => r.views > 0).length} / ${data.rows.length}`} />
      </dl>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Trend" action={<div className="w-32"><SelectField label="Range" value={String(days)} onChange={(e) => setDays(Number(e.target.value))}><option value="7">7 days</option><option value="14">14 days</option></SelectField></div>}>
          {t.views === 0 ? <p className="font-sans text-small text-muted">No interactions recorded yet. Signed-in readers generate impressions and clicks.</p> : <TrendChart data={trend} />}
        </Card>
        <Card title="A/B variants">
          <TableShell caption="A/B variant comparison">
            <thead><tr><th className={th}>Variant</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>CTR</th></tr></thead>
            <tbody>
              {[["A", a], ["B", b]].map(([name, v]) => { const x = v as typeof a; return <tr key={name as string}><td className={td}>{name as string}</td><td className={td}>{formatNumber(x.views)}</td><td className={td}>{formatNumber(x.clicks)}</td><td className={td}>{formatPercent(x.ctr)}</td></tr>; })}
            </tbody>
          </TableShell>
        </Card>
      </div>

      <div className="mt-6"><Card title="Per-advertisement performance">
        <TableShell caption="Per-advertisement performance">
          <thead><tr><th className={th}>Advertisement</th><th className={th}>Category</th><th className={th}>Variant</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>CTR</th></tr></thead>
          <tbody>
            {data.rows.map((r) => <tr key={r.ad_id}><td className={td}>{r.title}</td><td className={`${td} capitalize`}>{r.category}</td><td className={td}>{r.variant}</td><td className={td}>{formatNumber(r.views)}</td><td className={td}>{formatNumber(r.clicks)}</td><td className={td}>{formatPercent(r.ctr_percentage)}</td></tr>)}
          </tbody>
        </TableShell>
      </Card></div>
      <p className="mt-3 font-sans text-meta text-muted">Anonymous visitors see advertisements, but their views and clicks aren't recorded because the interaction log is per user.</p>
    </div>
  );
}
