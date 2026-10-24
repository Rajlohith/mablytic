import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface FieldShellProps {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  id: string;
  children: ReactNode;
}

function FieldShell({ label, error, hint, id, children }: FieldShellProps) {
  return (
    <div className="font-sans">
      <label htmlFor={id} className="mb-1 block text-small font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-meta text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-meta text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  "w-full rounded border bg-white px-3 py-2 font-sans text-small text-ink placeholder:text-muted/70 disabled:bg-wash";
const ring = (error?: string) => (error ? "border-danger" : "border-rule hover:border-muted");

type Common = { label: string; error?: string | undefined; hint?: string | undefined };

export function TextField({ label, error, hint, className = "", ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
        className={`${control} ${ring(error)} ${className}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({ label, error, hint, className = "", ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
        className={`${control} ${ring(error)} ${className}`}
      />
    </FieldShell>
  );
}

export function SelectField({ label, error, hint, className = "", children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} id={id}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...rest}
        className={`${control} ${ring(error)} ${className}`}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function CheckboxField({ label, ...rest }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 font-sans text-small text-ink">
      <input id={id} type="checkbox" {...rest} className="h-4 w-4 rounded border-rule accent-ink" />
      {label}
    </label>
  );
}
