import { adminApi } from "@/api/services";
import { Card, PageHeader, TableShell, td, th } from "@/components/admin/AdminUI";
import { ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatNumber, formatPercent } from "@/lib/format";

export default function TargetingPage() {
  useDocumentTitle("Audience targeting");
  const { data, error, loading, reload } = useAsync((s) => adminApi.targeting(s), []);
  if (loading) return <LoadingBlock label="Loading targeting" />;
  if (error || !data) return <ErrorState message={error ?? "No data."} onRetry={reload} />;

  return (
    <div>
      <PageHeader title="Audience targeting" description="What the recommendation engine can target, and how each audience is performing." />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card title="Supported criteria">
          <ul className="list-disc space-y-1 pl-5 font-sans text-small text-body">{data.criteria.supported.map((c) => <li key={c}>{c}</li>)}</ul>
        </Card>
        <Card title="Not supported">
          <ul className="list-disc space-y-1 pl-5 font-sans text-small text-body">{data.criteria.not_supported.map((c) => <li key={c}>{c}</li>)}</ul>
          <p className="mt-3 font-sans text-meta text-muted">Age and gender are collected at registration but aren't used by ad delivery.</p>
        </Card>
      </div>
      <TableShell caption="Interest audiences">
        <thead><tr><th className={th}>Interest</th><th className={th}>Also drives news sections</th><th className={th}>Readers</th><th className={th}>Ads (live / total)</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>CTR</th></tr></thead>
        <tbody>
          {data.categories.map((c) => (
            <tr key={c.category}>
              <td className={`${td} font-semibold capitalize text-ink`}>{c.category}</td>
              <td className={td}>{c.news_categories.join(", ")}</td>
              <td className={td}>{formatNumber(c.users)}</td>
              <td className={td}>{c.active_ads} / {c.ads}</td>
              <td className={td}>{formatNumber(c.views)}</td><td className={td}>{formatNumber(c.clicks)}</td><td className={td}>{formatPercent(c.ctr)}</td>
            </tr>
          ))}
        </tbody>
      </TableShell>
      <p className="mt-3 font-sans text-meta text-muted">An audience with readers but no live ads receives untargeted advertisements instead.</p>
    </div>
  );
}
