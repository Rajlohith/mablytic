import type { ReactNode } from "react";
import { Button } from "./Button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 font-sans text-small text-muted">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-rule border-t-ink" />
      <span>{label}…</span>
    </div>
  );
}

export function LoadingBlock({ label, className = "py-16" }: { label?: string; className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <Spinner label={label} />
    </div>
  );
}

export function ErrorState({ message, onRetry, title = "We couldn't load this" }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded border border-rule p-6 text-center font-sans">
      <h2 className="font-headline text-xl text-ink">{title}</h2>
      <p className="mt-2 text-small text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-14 text-center font-sans">
      <h2 className="font-headline text-xl text-ink">{title}</h2>
      {children && <p className="mt-2 text-small text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="aspect-[3/2] bg-wash" />
      <div className="mt-3 h-4 w-11/12 bg-wash" />
      <div className="mt-2 h-4 w-8/12 bg-wash" />
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "ok" | "warn" | "danger" }) {
  const tones = {
    neutral: "bg-wash text-body",
    ok: "bg-green-50 text-ok",
    warn: "bg-amber-50 text-amber-800",
    danger: "bg-red-50 text-danger",
  };
  return <span className={`inline-block rounded px-2 py-0.5 font-sans text-meta font-semibold ${tones[tone]}`}>{children}</span>;
}
