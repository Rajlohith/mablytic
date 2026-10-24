import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adminApi } from "@/api/services";
import { Card, PageHeader } from "@/components/admin/AdminUI";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/ui/fields";
import { ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { SECTION_ORDER } from "@/lib/format";
import type { ArticleInput } from "@/types";

const EMPTY: ArticleInput = { title: "", summary: "", body: "", category: "World", author: "", image_url: "", image_alt: "", image_credit: "", read_minutes: 4, is_featured: false, status: "draft" };

export default function ArticleFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  useDocumentTitle(editing ? "Edit article" : "New article");
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<ArticleInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof ArticleInput, string>>>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { error, loading, reload } = useAsync(async (signal) => {
    if (!editing) return null;
    const a = await adminApi.article(Number(id), signal);
    setForm({ title: a.title, summary: a.summary, body: a.body, category: a.category, author: a.author, image_url: a.image_url, image_alt: a.image_alt, image_credit: a.image_credit, read_minutes: a.read_minutes, is_featured: a.is_featured, status: a.status });
    return a;
  }, [id]);

  const set = <K extends keyof ArticleInput>(k: K, v: ArticleInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!form.title.trim()) v.title = "Enter a headline.";
    if (!form.summary.trim()) v.summary = "Enter a summary.";
    if (!form.body.trim()) v.body = "Enter the article text.";
    if (!Number.isInteger(form.read_minutes) || form.read_minutes < 1 || form.read_minutes > 120) v.read_minutes = "Enter 1–120 minutes.";
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      if (editing) await adminApi.updateArticle(Number(id), form); else await adminApi.createArticle(form);
      toast.success(editing ? "Article saved." : "Article created.");
      navigate("/console/articles");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save the article.");
    } finally { setBusy(false); }
  };

  if (loading) return <LoadingBlock label="Loading article" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div>
      <PageHeader title={editing ? "Edit article" : "New article"} description="Separate paragraphs with a blank line."
        actions={<ButtonLink to="/console/articles" variant="secondary">Back to list</ButtonLink>} />
      <form onSubmit={(e) => void submit(e)} noValidate className="max-w-3xl space-y-5">
        <Card title="Story">
          <div className="space-y-4">
            <TextField label="Headline" value={form.title} onChange={(e) => set("title", e.target.value)} error={errors.title} />
            <TextAreaField label="Summary" rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} error={errors.summary} />
            <TextAreaField label="Body" rows={14} value={form.body} onChange={(e) => set("body", e.target.value)} error={errors.body} />
          </div>
        </Card>
        <Card title="Details">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Section" value={form.category} onChange={(e) => set("category", e.target.value)}>
              {SECTION_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value as ArticleInput["status"])}>
              <option value="draft">Draft</option><option value="published">Published</option>
            </SelectField>
            <TextField label="Author" value={form.author} onChange={(e) => set("author", e.target.value)} />
            <TextField label="Reading time (minutes)" inputMode="numeric" value={String(form.read_minutes)} onChange={(e) => set("read_minutes", Number(e.target.value) || 0)} error={errors.read_minutes} />
            <TextField label="Image" value={form.image_url} onChange={(e) => set("image_url", e.target.value)} hint="http(s) address or a /path." />
            <TextField label="Image description (alt text)" value={form.image_alt} onChange={(e) => set("image_alt", e.target.value)} />
            <TextField label="Image credit" value={form.image_credit} onChange={(e) => set("image_credit", e.target.value)} />
            <div className="self-end"><CheckboxField label="Feature on the front page" checked={form.is_featured} onChange={(e) => set("is_featured", e.target.checked)} /></div>
          </div>
        </Card>
        {formError && <p role="alert" className="font-sans text-small text-danger">{formError}</p>}
        <div className="flex gap-2"><Button type="submit" loading={busy}>{editing ? "Save changes" : "Create article"}</Button><ButtonLink to="/console/articles" variant="secondary">Cancel</ButtonLink></div>
      </form>
    </div>
  );
}
