import { useState, type FormEvent } from "react";
import { authApi } from "@/api/services";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/fields";
import { useToast } from "@/context/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** Shared by the reader account and the admin settings page. */
export function ChangePasswordForm() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (!current) v.current = "Enter your current password.";
    if (next.length < 6) v.next = "Use at least 6 characters.";
    if (confirm !== next) v.confirm = "Passwords don't match.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await authApi.changePassword(current, next);
      toast.success("Password updated.");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't update your password.";
      if (/current/i.test(msg)) setErrors({ current: msg });
      else toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} noValidate className="max-w-sm space-y-4">
      <TextField label="Current password" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} error={errors.current} />
      <TextField label="New password" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} error={errors.next} hint="At least 6 characters." />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
      <Button type="submit" loading={busy}>Update password</Button>
    </form>
  );
}

export default function SecurityPage() {
  useDocumentTitle("Password");
  return (
    <div>
      <h1 className="font-headline text-3xl font-bold text-ink">Password</h1>
      <p className="mb-6 mt-2 font-sans text-small text-muted">Choose a new password for your account.</p>
      <ChangePasswordForm />
    </div>
  );
}
