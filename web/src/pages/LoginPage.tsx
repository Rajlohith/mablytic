import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/fields";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { hasErrors, validateLogin } from "@/lib/validation";
import { AuthShell } from "./RegisterPage";

export default function LoginPage() {
  useDocumentTitle("Log in");
  const { login, sessionExpired, dismissExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<ReturnType<typeof validateLogin>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateLogin(username, password);
    setErrors(v);
    setFormError(null);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      const user = await login(username.trim(), password);
      dismissExpired();
      // Honor the page they were headed to only if their role may open it.
      const target = from && (user.is_admin ? from.startsWith("/console") || !from.startsWith("/account") : !from.startsWith("/console")) ? from : homeFor(user);
      navigate(target, { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't sign you in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Log in" footer={<>New to Mablytic? <Link className="font-semibold text-ink underline" to="/register">Create an account</Link></>}>
      {sessionExpired && (
        <p role="status" className="mb-4 rounded border border-rule bg-wash px-3 py-2 font-sans text-small text-body">
          Your session ended. Log in again to continue.
        </p>
      )}
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
        <TextField label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} error={errors.username} />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        {formError && <p role="alert" className="font-sans text-small text-danger">{formError}</p>}
        <Button type="submit" loading={busy} className="w-full">Log in</Button>
      </form>
    </AuthShell>
  );
}
