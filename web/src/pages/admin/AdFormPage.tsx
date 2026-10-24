import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "@/api/services";
import { Card, PageHeader } from "@/components/admin/AdminUI";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { isoToLocal, localToIso } from "@/lib/format";
import { PREFERENCE_OPTIONS, type Ad, type AdInput, type AdPlacement, type AdStatus, type Campaign } from "@/types";

interface FormState {
  title: string; advertiser: string; content: string; category: string; variant: "A" | "B";
  destination_url: string; image_url: string; placement: AdPlacement; status: AdStatus;
  campaign_id: string; start: string; end: string;
}

const EMPTY: FormState = {
  title: "", advertiser: "", content: "", category: "tech", variant: "A", destination_url: "", image_url: "",
  placement: "any", status: "active", campaign_id: "", start: "", end: "",
};

const fromAd = (a: Ad): FormState => ({
  title: a.title, advertiser: a.advertiser ?? "", content: a.content, category: a.category, variant: a.variant,
  destination_url: a.destination_url ?? "", image_url: a.image_url ?? "", placement: a.placement ?? "any",
  status: a.status ?? "active", campaign_id: a.campaign_id ? String(a.campaign_id) : "",
  start: isoToLocal(a.start_date), end: isoToLocal(a.end_date),
});

const isUrl = (v: string, allowPath: boolean) => {
  if (allowPath && v.startsWith("/") && !v.startsWith("//")) return true;
  try { const u = new URL(v); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
};

type Errors = Partial<Record<keyof FormState, string>>;

export function validateAd(f: FormState): Errors {
  const e: Errors = {};
  if (!f.title.trim()) e.title = "Enter a headline.";
  if (!f.content.trim()) e.content = "Enter the advertisement copy.";
  if (f.destination_url && !isUrl(f.destination_url, false)) e.destination_url = "Use a full http(s) address, like https://example.com.";
  if (f.image_url && !isUrl(f.image_url, true)) e.image_url = "Use an http(s) address or a path starting with /.";
  if (f.start && f.end && new Date(f.end) < new Date(f.start)) e.end = "The end must be after the start.";
  return e;
}

export default function AdFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const adId = Number(id);
  useDocumentTitle(editing ? "Edit advertisement" : "New advertisement");
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ai, setAi] = useState({ product: "", audience: "General readers", tone: "Clear and friendly", key_points: "" });
  const [aiBusy, setAiBusy] = useState(false);

  const { data, error, loading, reload } = useAsync<{ campaigns: Campaign[]; ad: Ad | null }>(async (signal) => {
    const campaigns = await adminApi.campaigns(signal);
    const ad = editing ? await adminApi.ad(adId, signal) : null;
    if (ad) setForm(fromAd(ad));
    return { campaigns, ad };
  }, [id]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateAd(form);
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    const body: AdInput = {
      title: form.title.trim(), content: form.content.trim(), category: form.category, variant: form.variant,
      image_url: form.image_url.trim(), advertiser: form.advertiser.trim(), destination_url: form.destination_url.trim(),
      placement: form.placement, status: form.status, start_date: localToIso(form.start), end_date: localToIso(form.end),
      campaign_id: form.campaign_id ? Number(form.campaign_id) : null,
    };
    setBusy(true);
    try {
      if (editing) {
        const clear = !body.start_date && !body.end_date;
        await adminApi.updateAd(adId, { ...body, clear_schedule: clear });
        toast.success("Advertisement saved.");
      } else {
        await adminApi.createAd(body);
        toast.success("Advertisement created.");
      }
      navigate("/console/ads");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save the advertisement.");
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!ai.product.trim()) { toast.error("Describe the product first."); return; }
    setAiBusy(true);
    try {
      const out = (await adminApi.generateAdCopy({ product: ai.product, category: form.category, audience: ai.audience, tone: ai.tone, key_points: ai.key_points, variant: form.variant })) as { title?: string; content?: string; call_to_action?: string };
      setForm((f) => ({ ...f, title: out.title ?? f.title, content: [out.content, out.call_to_action].filter(Boolean).join("\n\n") || f.content }));
      toast.success("Copy drafted. Review it before saving.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate copy.");
    } finally {
      setAiBusy(false);
    }
  };

  if (loading) return <LoadingBlock label="Loading" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const previewAd: Ad = {
    id: 0, title: form.title || "Headline appears here", content: form.content || "Advertisement copy appears here.",
    category: form.category, variant: form.variant, image_url: form.image_url || null, advertiser: form.advertiser || null,
    destination_url: form.destination_url || null, placement: form.placement, status: form.status, start_date: null, end_date: null, campaign_id: null,
  };

  return (
    <div>
      <PageHeader title={editing ? "Edit advertisement" : "New advertisement"} description="Creative, destination, placement and schedule."
        actions={<ButtonLink to="/console/ads" variant="secondary">Back to list</ButtonLink>} />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form onSubmit={(e) => void submit(e)} noValidate className="space-y-5">
          <Card title="Creative">
            <div className="space-y-4">
              <TextField label="Headline" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} />
              <TextField label="Advertiser" value={form.advertiser} onChange={(e) => set("advertiser", e.target.value)} />
              <TextAreaField label="Copy" rows={4} value={form.content} onChange={(e) => set("content", e.target.value)} error={errors.content} />
              <TextField label="Image" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} error={errors.image_url} hint="An http(s) address, or a path such as /art/ads/example.svg." />
              <TextField label="Destination URL" value={form.destination_url} onChange={(e) => set("destination_url", e.target.value)} error={errors.destination_url} hint="Where readers go when they click. Leave empty for a non-clickable advertisement." />
            </div>
          </Card>
          <Card title="Delivery">
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField label="Category" value={form.category} onChange={(e) => set("category", e.target.value)} hint="Matched against reader interests.">
                {PREFERENCE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </SelectField>
              <SelectField label="Variant (A/B test)" value={form.variant} onChange={(e) => set("variant", e.target.value as "A" | "B")}>
                <option value="A">A</option><option value="B">B</option>
              </SelectField>
              <SelectField label="Placement" value={form.placement} onChange={(e) => set("placement", e.target.value as AdPlacement)} hint="“any” fits every position.">
                {["any", "feed", "sidebar", "inline", "banner"].map((p) => <option key={p} value={p}>{p}</option>)}
              </SelectField>
              <SelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value as AdStatus)}>
                <option value="active">Active</option><option value="paused">Paused</option><option value="draft">Draft</option>
              </SelectField>
              <SelectField label="Campaign" value={form.campaign_id} onChange={(e) => set("campaign_id", e.target.value)}>
                <option value="">None</option>
                {(data?.campaigns ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SelectField>
              <div />
              <TextField label="Starts" type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} hint="Empty = starts immediately." />
              <TextField label="Ends" type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} error={errors.end} hint="Empty = no end date." />
            </div>
          </Card>
          {formError && <p role="alert" className="font-sans text-small text-danger">{formError}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={busy}>{editing ? "Save changes" : "Create advertisement"}</Button>
            <ButtonLink to="/console/ads" variant="secondary">Cancel</ButtonLink>
          </div>
        </form>

        <div className="space-y-5">
          <Card title="Preview"><AdSlot ad={previewAd} layout="feed" /></Card>
          <Card title="Draft copy with AI">
            <div className="space-y-3">
              <TextField label="Product or offer" value={ai.product} onChange={(e) => setAi({ ...ai, product: e.target.value })} />
              <TextField label="Key points" value={ai.key_points} onChange={(e) => setAi({ ...ai, key_points: e.target.value })} hint="Only facts you want mentioned." />
              <Button variant="secondary" loading={aiBusy} onClick={() => void generate()}>Draft copy</Button>
              <p className="font-sans text-meta text-muted">Needs a Gemini API key configured on the server. Always review the draft.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
