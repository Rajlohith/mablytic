import { useMemo, useState } from "react";
import { adminApi } from "@/api/services";
import { FilterBar, PageHeader, StatusBadge, TableShell, td, th } from "@/components/admin/AdminUI";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/fields";
import { ConfirmDialog } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useAsync } from "@/hooks/useAsync";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDate } from "@/lib/format";
import type { User } from "@/types";

const PAGE_SIZE = 12;
type Pending = { user: User; action: "role" | "status" | "delete" };

export default function UsersPage() {
  useDocumentTitle("Users");
  const { user: me } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync((s) => adminApi.users(s), []);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data ?? []).filter((u) =>
      (!s || `${u.username} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase().includes(s)) &&
      (!role || (role === "admin") === u.is_admin) &&
      (!state || (state === "active") === (u.is_active !== false)));
  }, [data, q, role, state]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const apply = async () => {
    if (!pending) return;
    const { user: u, action } = pending;
    setBusy(true);
    try {
      if (action === "delete") {
        await adminApi.deleteUser(u.id);
        setData((d) => (d ? d.filter((x) => x.id !== u.id) : d));
        toast.success(`Deleted ${u.username}.`);
      } else {
        const updated = await adminApi.updateUser(u.id, action === "role" ? { is_admin: !u.is_admin } : { is_active: u.is_active === false });
        setData((d) => (d ? d.map((x) => (x.id === u.id ? updated : x)) : d));
        toast.success(action === "role" ? `${u.username} is now ${updated.is_admin ? "an administrator" : "a reader"}.` : `${u.username} ${updated.is_active === false ? "deactivated" : "reactivated"}.`);
      }
      setPending(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That change couldn't be saved.");
    } finally { setBusy(false); }
  };

  const copy: Record<Pending["action"], (u: User) => { title: string; body: string; label: string; danger: boolean }> = {
    role: (u) => ({ title: u.is_admin ? "Remove administrator role?" : "Make this user an administrator?", body: u.is_admin ? `${u.username} will lose access to the console.` : `${u.username} will be able to manage advertisements, users and articles.`, label: u.is_admin ? "Remove role" : "Grant role", danger: u.is_admin }),
    status: (u) => ({ title: u.is_active === false ? "Reactivate this account?" : "Deactivate this account?", body: u.is_active === false ? `${u.username} will be able to log in again.` : `${u.username} won't be able to log in until reactivated.`, label: u.is_active === false ? "Reactivate" : "Deactivate", danger: u.is_active !== false }),
    delete: (u) => ({ title: "Delete this user?", body: `${u.username} and their interaction history will be permanently deleted.`, label: "Delete user", danger: true }),
  };
  const dlg = pending ? copy[pending.action](pending.user) : null;

  return (
    <div>
      <PageHeader title="Users" description="Accounts, roles and access." />
      <FilterBar>
        <div className="w-64"><TextField label="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name, username or email" /></div>
        <SelectField label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}><option value="">All</option><option value="admin">Administrators</option><option value="reader">Readers</option></SelectField>
        <SelectField label="Account" value={state} onChange={(e) => { setState(e.target.value); setPage(1); }}><option value="">All</option><option value="active">Active</option><option value="inactive">Deactivated</option></SelectField>
      </FilterBar>
      {loading && <LoadingBlock label="Loading users" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && filtered.length === 0 && <EmptyState title="No users match">Adjust your search or filters.</EmptyState>}
      {data && filtered.length > 0 && (
        <>
          <TableShell caption="Users">
            <thead><tr><th className={th}>User</th><th className={th}>Interests</th><th className={th}>Role</th><th className={th}>Account</th><th className={th}>Joined</th><th className={th}><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const self = u.id === me?.id;
                return (
                  <tr key={u.id}>
                    <td className={td}><p className="font-semibold text-ink">{u.first_name} {u.last_name}</p><p className="text-meta text-muted">{u.username} · {u.email}</p></td>
                    <td className={`${td} capitalize`}>{u.preferences.split(",").filter(Boolean).join(", ") || "—"}</td>
                    <td className={td}>{u.is_admin ? "Administrator" : "Reader"}</td>
                    <td className={td}><StatusBadge status={u.is_active === false ? "ended" : "active"} /></td>
                    <td className={td}>{formatDate(u.created_at, { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className={td}><div className="flex gap-1">
                      <Button size="sm" variant="secondary" disabled={self} title={self ? "You can't change your own role" : undefined} onClick={() => setPending({ user: u, action: "role" })}>{u.is_admin ? "Make reader" : "Make admin"}</Button>
                      <Button size="sm" variant="ghost" disabled={self} onClick={() => setPending({ user: u, action: "status" })}>{u.is_active === false ? "Reactivate" : "Deactivate"}</Button>
                      <Button size="sm" variant="ghost" className="text-danger" disabled={self} onClick={() => setPending({ user: u, action: "delete" })}>Delete</Button>
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
          <div className="mt-4"><Pagination page={current} pageSize={PAGE_SIZE} total={filtered.length} onPage={setPage} /></div>
        </>
      )}
      <ConfirmDialog open={pending !== null && dlg !== null} title={dlg?.title ?? ""} confirmLabel={dlg?.label ?? "Confirm"} danger={dlg?.danger ?? false} busy={busy}
        message={dlg?.body} onConfirm={() => void apply()} onCancel={() => setPending(null)} />
    </div>
  );
}
