import { useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "@/api/services";
import { FilterBar, PageHeader, StatusBadge, TableShell, td, th } from "@/components/admin/AdminUI";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDebounced } from "@/hooks/useDebounced";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate, SECTION_ORDER } from "@/lib/format";
import type { ArticleCard } from "@/types";

const PAGE_SIZE = 15;

export default function ArticlesPage() {
  useDocumentTitle("Articles");
  const toast = useToast();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ArticleCard | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useAsync(
    (s) => adminApi.articles({ q: dq, category, status, page, page_size: PAGE_SIZE }, s),
    [dq, category, status, page],
  );

  const setStatusOf = async (a: ArticleCard, next: "published" | "draft") => {
    try {
      await adminApi.updateArticle(a.id, { status: next });
      toast.success(next === "published" ? "Article published." : "Article moved to drafts.");
      reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't update the article."); }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await adminApi.deleteArticle(toDelete.id);
      toast.success("Article deleted.");
      setToDelete(null);
      reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't delete the article."); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Articles" description="Publish, edit and retire news articles." actions={<ButtonLink to="/console/articles/new">New article</ButtonLink>} />
      <FilterBar>
        <div className="w-64"><TextField label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Headline or summary" /></div>
        <SelectField label="Section" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
          <option value="">All</option>{SECTION_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
        </SelectField>
        <SelectField label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option><option value="published">Published</option><option value="draft">Draft</option>
        </SelectField>
      </FilterBar>
      {loading && !data && <LoadingBlock label="Loading articles" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && data.items.length === 0 && <EmptyState title="No articles match">Adjust the filters or write a new article.</EmptyState>}
      {data && data.items.length > 0 && (
        <>
          <TableShell caption="Articles">
            <thead><tr><th className={th}>Article</th><th className={th}>Section</th><th className={th}>Author</th><th className={th}>Published</th><th className={th}>Status</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className={td}>
                    <Link to={`/console/articles/${a.id}/edit`} className="font-semibold text-ink underline">{a.title}</Link>
                    {a.is_demo && <span className="ml-2 text-meta text-muted">(demo)</span>}
                  </td>
                  <td className={td}>{a.category}</td><td className={td}>{a.author}</td><td className={td}>{formatDate(a.published_at, { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className={td}><StatusBadge status={a.status} /></td>
                  <td className={td}><div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => void setStatusOf(a, a.status === "published" ? "draft" : "published")}>{a.status === "published" ? "Unpublish" : "Publish"}</Button>
                    <ButtonLink size="sm" variant="ghost" to={`/console/articles/${a.id}/edit`}>Edit</ButtonLink>
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToDelete(a)}>Delete</Button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </TableShell>
          <div className="mt-4"><Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} /></div>
        </>
      )}
      <ConfirmDialog open={toDelete !== null} title="Delete this article?" confirmLabel="Delete article" danger busy={busy}
        message={<>“{toDelete?.title}” will be permanently deleted.</>} onConfirm={() => void remove()} onCancel={() => setToDelete(null)} />
    </div>
  );
}
