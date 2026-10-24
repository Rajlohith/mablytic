import type { ReactNode } from "react";
import { Badge } from "@/components/ui/feedback";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
      <div>
        <h1 className="font-headline text-3xl font-bold text-ink">{title}</h1>
        {description && <p className="mt-1 font-sans text-small text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-t border-ink pt-2 font-sans">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-1 font-headline text-3xl font-bold text-ink">{value}</dd>
      {sub && <dd className="text-meta text-muted">{sub}</dd>}
    </div>
  );
}

export const th = "whitespace-nowrap border-b border-ink px-3 py-2 text-left font-sans text-meta font-bold uppercase tracking-wide text-muted";
export const td = "border-b border-rule px-3 py-3 align-top font-sans text-small text-body";

export function TableShell({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

const TONES: Record<string, "ok" | "warn" | "neutral" | "danger"> = {
  active: "ok", published: "ok", paused: "warn", draft: "neutral", ended: "danger",
};
export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? "active";
  return <Badge tone={TONES[s] ?? "neutral"}>{s[0]?.toUpperCase()}{s.slice(1)}</Badge>;
}

export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>;
}

export function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded border border-rule p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-sans text-base font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
