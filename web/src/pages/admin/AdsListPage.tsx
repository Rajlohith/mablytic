import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/api/services";
import { FilterBar, PageHeader, StatusBadge, TableShell, td, th } from "@/components/admin/AdminUI";
import { ButtonLink, Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate } from "@/lib/format";
import { PREFERENCE_OPTIONS, type Ad } from "@/types";

const PAGE_SIZE = 10;

export default function AdsListPage() {
  useDocumentTitle("Advertisements");
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync(async (signal) => {
    const [ads, campaigns] = await Promise.all([adminApi.ads(signal), adminApi.campaigns(signal)]);
    return { ads, campaigns };
  }, []);
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [placement, setPlacement] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);

  const campaignName = useMemo(() => new Map((data?.campaigns ?? []).map((c) => [c.id, c.name])), [data]);
  const filtered = useMemo(() => {
    const s = dq.trim().toLowerCase();
    return (data?.ads ?? []).filter(
      (a) =>
        (!s || `${a.title} ${a.advertiser ?? ""} ${a.content}`.toLowerCase().includes(s)) &&
        (!status || (a.status ?? "active") === status) &&
        (!category || a.category === category) &&
        (!placement || (a.placement ?? "any") === placement),
    );
  }, [data, dq, status, category, placement]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const patch = (ad: Ad) => setData((d) => (d ? { ...d, ads: d.ads.map((x) => (x.id === ad.id ? ad : x)) } : d));

  const toggle = async (ad: Ad) => {
    const next = (ad.status ?? "active") === "active" ? "paused" : "active";
    try {
      patch(await adminApi.updateAd(ad.id, { status: next }));
      toast.success(next === "active" ? `“${ad.title}” is now active.` : `“${ad.title}” paused.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the status.");
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteAd(toDelete.id);
      setData((d) => (d ? { ...d, ads: d.ads.filter((x) => x.id !== toDelete.id) } : d));
      toast.success(`Deleted “${toDelete.title}”.`);
      setToDelete(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the advertisement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Advertisements" description="Search, filter and control every advertisement creative."
        actions={<ButtonLink to="/console/ads/new">New advertisement</ButtonLink>} />
      <FilterBar>
        <div className="w-64"><TextField label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Title, advertiser or copy" /></div>
        <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="draft">Draft</option>
        </SelectField>
        <SelectField label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All</option>{PREFERENCE_OPTIONS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
        </SelectField>
        <SelectField label="Placement" value={placement} onChange={(e) => { setPlacement(e.target.value); setPage(1); }}>
          <option value="">All</option>{["any", "feed", "sidebar", "inline", "banner"].map((p) => <option key={p} value={p}>{p}</option>)}
        </SelectField>
      </FilterBar>

      {loading && <LoadingBlock label="Loading advertisements" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && filtered.length === 0 && (
        <EmptyState title="No advertisements match" action={<Button variant="secondary" onClick={() => { setQ(""); setStatus(""); setCategory(""); setPlacement(""); }}>Clear filters</Button>}>
          Adjust your filters or create a new advertisement.
        </EmptyState>
      )}
      {data && filtered.length > 0 && (
        <>
          <TableShell caption="Advertisements">
            <thead><tr>
              <th className={th}>Creative</th><th className={th}>Category</th><th className={th}>Placement</th>
              <th className={th}>Campaign</th><th className={th}>Schedule</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <div className="flex items-start gap-3">
                      {a.image_url && <img src={a.image_url} alt="" className="h-12 w-20 shrink-0 object-cover" loading="lazy" />}
                      <div className="min-w-0">
                        <Link className="font-semibold text-ink underline" to={`/console/ads/${a.id}/edit`}>{a.title}</Link>
                        <p className="text-meta text-muted">{a.advertiser || "No advertiser"} · Variant {a.variant}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${td} capitalize`}>{a.category}</td>
                  <td className={`${td} capitalize`}>{a.placement ?? "any"}</td>
                  <td className={td}>{a.campaign_id ? (campaignName.get(a.campaign_id) ?? `#${a.campaign_id}`) : "—"}</td>
                  <td className={td}>{a.start_date || a.end_date ? `${formatDate(a.start_date, { month: "short", day: "numeric" }) || "Now"} – ${formatDate(a.end_date, { month: "short", day: "numeric" }) || "Open"}` : "Always on"}</td>
                  <td className={td}><StatusBadge status={a.status} /></td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => void toggle(a)}>{(a.status ?? "active") === "active" ? "Pause" : "Activate"}</Button>
                      <ButtonLink size="sm" variant="ghost" to={`/console/ads/${a.id}/edit`}>Edit</ButtonLink>
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(a)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="mt-4"><Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} /></div>
        </>
      )}

      <ConfirmDialog open={toDelete !== null} title="Delete this advertisement?" confirmLabel="Delete advertisement" danger busy={busy}
        message={<>“{toDelete?.title}” and its recorded views and clicks will be permanently deleted. This can't be undone.</>}
        onConfirm={() => void confirmDelete()} onCancel={() => setToDelete(null)} />
    </div>
  );
}
