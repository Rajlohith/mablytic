import { useState, type FormEvent } from "react";
import { adminApi } from "@/api/services";
import { PageHeader, StatusBadge, TableShell, td, th } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/fields";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate, formatMoney, formatNumber, formatPercent, isoToLocal, localToIso } from "@/lib/format";
import type { Campaign, CampaignStatus } from "@/types";

interface Form { name: string; status: CampaignStatus; budget: string; start: string; end: string }
const EMPTY: Form = { name: "", status: "active", budget: "", start: "", end: "" };

export default function CampaignsPage() {
  useDocumentTitle("Campaigns");
  const toast = useToast();
  const { data, error, loading, reload } = useAsync((s) => adminApi.campaigns(s), []);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<Campaign | null>(null);

  const open = (c: Campaign | "new") => {
    setErrors({});
    setForm(c === "new" ? EMPTY : { name: c.name, status: c.status, budget: c.budget?.toString() ?? "", start: isoToLocal(c.start_date), end: isoToLocal(c.end_date) });
    setEditing(c);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!form.name.trim()) v.name = "Enter a campaign name.";
    if (form.budget && (Number.isNaN(Number(form.budget)) || Number(form.budget) < 0)) v.budget = "Enter a positive amount.";
    if (form.start && form.end && new Date(form.end) < new Date(form.start)) v.end = "The end must be after the start.";
    setErrors(v);
    if (Object.keys(v).length) return;
    const body = { name: form.name.trim(), status: form.status, budget: form.budget ? Number(form.budget) : null, start_date: localToIso(form.start), end_date: localToIso(form.end) };
    setBusy(true);
    try {
      if (editing === "new") await adminApi.createCampaign(body);
      else if (editing) await adminApi.updateCampaign(editing.id, body);
      toast.success(editing === "new" ? "Campaign created." : "Campaign saved.");
      setEditing(null);
      reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't save the campaign.";
      if (/name/i.test(msg)) setErrors({ name: msg }); else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteCampaign(toDelete.id);
      toast.success(`Deleted “${toDelete.name}”. Its advertisements were kept.`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the campaign.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Campaigns" description="Group advertisements, set a schedule and budget, and pause everything in one click."
        actions={<Button onClick={() => open("new")}>New campaign</Button>} />
      {loading && <LoadingBlock label="Loading campaigns" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No campaigns yet" action={<Button onClick={() => open("new")}>Create a campaign</Button>} />}
      {data && data.length > 0 && (
        <TableShell caption="Campaigns">
          <thead><tr>
            <th className={th}>Campaign</th><th className={th}>Status</th><th className={th}>Schedule</th><th className={th}>Budget</th>
            <th className={th}>Ads</th><th className={th}>Views</th><th className={th}>Clicks</th><th className={th}>CTR</th><th className={th}><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id}>
                <td className={`${td} font-semibold text-ink`}>{c.name}</td>
                <td className={td}><StatusBadge status={c.status} /></td>
                <td className={td}>{c.start_date || c.end_date ? `${formatDate(c.start_date, { month: "short", day: "numeric" }) || "Now"} – ${formatDate(c.end_date, { month: "short", day: "numeric" }) || "Open"}` : "Always on"}</td>
                <td className={td}>{formatMoney(c.budget)}</td><td className={td}>{c.ad_count}</td>
                <td className={td}>{formatNumber(c.views)}</td><td className={td}>{formatNumber(c.clicks)}</td><td className={td}>{formatPercent(c.ctr)}</td>
                <td className={td}><div className="flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => open(c)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(c)}>Delete</Button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
      <p className="mt-3 font-sans text-meta text-muted">Budget is recorded for planning. Spend isn't metered or enforced by the ad server.</p>

      <Modal open={editing !== null} title={editing === "new" ? "New campaign" : "Edit campaign"} onClose={() => setEditing(null)}>
        <form onSubmit={(e) => void save(e)} noValidate className="space-y-3">
          <TextField label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CampaignStatus })}>
            {["active", "paused", "draft", "ended"].map((s) => <option key={s} value={s}>{s}</option>)}
          </SelectField>
          <TextField label="Budget (USD)" inputMode="decimal" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} error={errors.budget} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Starts" type="datetime-local" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            <TextField label="Ends" type="datetime-local" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} error={errors.end} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
            <Button type="submit" loading={busy}>Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={toDelete !== null} title="Delete this campaign?" confirmLabel="Delete campaign" danger busy={busy}
        message={<>“{toDelete?.name}” will be removed. Its {toDelete?.ad_count ?? 0} advertisement(s) are kept but no longer belong to a campaign.</>}
        onConfirm={() => void remove()} onCancel={() => setToDelete(null)} />
    </div>
  );
}
