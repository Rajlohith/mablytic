import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/services";
import { homeFor, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/fields";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { hasErrors, validateRegister, type FieldErrors, type RegisterField, type RegisterForm } from "@/lib/validation";
import { PREFERENCE_OPTIONS } from "@/types";

export function AuthShell({ title, children, footer }: { title: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-6">
      <h1 className="font-headline text-4xl font-bold text-ink">{title}</h1>
      <div className="mt-6 border-t border-ink pt-6">{children}</div>
      <p className="mt-6 font-sans text-small text-muted">{footer}</p>
    </div>
  );
}

const EMPTY: RegisterForm = {
  username: "", password: "", confirm: "", first_name: "", last_name: "", email: "", gender: "", age: "", preferences: [],
};

export default function RegisterPage() {
  useDocumentTitle("Create an account");
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RegisterField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof RegisterForm>(k: K, v: RegisterForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: Exclude<RegisterField, "preferences">) => ({
    value: form[k], onChange: (e: { target: { value: string } }) => set(k, e.target.value), error: errors[k],
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = validateRegister(form);
    setErrors(v);
    setFormError(null);
    if (hasErrors(v)) return;
    setBusy(true);
    try {
      await authApi.register({
        username: form.username.trim(), password: form.password, first_name: form.first_name.trim(),
        last_name: form.last_name.trim(), email: form.email.trim(), gender: form.gender,
        age: Number(form.age), preferences: form.preferences.join(","),
      });
      const user = await login(form.username.trim(), form.password);
      navigate(homeFor(user), { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't create your account.";
      // Surface duplicate-username/email next to the field when we can tell.
      if (/username/i.test(msg)) setErrors({ username: msg });
      else if (/email/i.test(msg)) setErrors({ email: msg });
      else setFormError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Create an account" footer={<>Already registered? <Link className="font-semibold text-ink underline" to="/login">Log in</Link></>}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" autoComplete="given-name" {...text("first_name")} />
          <TextField label="Last name" autoComplete="family-name" {...text("last_name")} />
        </div>
        <TextField label="Username" autoComplete="username" hint="Letters and numbers only." {...text("username")} />
        <TextField label="Email" type="email" autoComplete="email" {...text("email")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Password" type="password" autoComplete="new-password" hint="At least 6 characters." {...text("password")} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" {...text("confirm")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Age" inputMode="numeric" {...text("age")} />
          <SelectField label="Gender" {...text("gender")}>
            <option value="">Choose…</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non-binary">Non-binary</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </SelectField>
        </div>
        <fieldset>
          <legend className="mb-1 font-sans text-small font-semibold text-ink">Interests</legend>
          <p className="mb-2 font-sans text-meta text-muted">We use these to personalize your feed and the advertisements you see. You can change them any time.</p>
          <div className="flex flex-wrap gap-2">
            {PREFERENCE_OPTIONS.map((p) => {
              const on = form.preferences.includes(p);
              return (
                <label key={p} className={`cursor-pointer rounded-full border px-3 py-1 font-sans text-small capitalize ${on ? "border-ink bg-ink text-white" : "border-rule text-body hover:border-ink"}`}>
                  <input type="checkbox" className="sr-only" checked={on}
                    onChange={() => set("preferences", on ? form.preferences.filter((x) => x !== p) : [...form.preferences, p])} />
                  {p}
                </label>
              );
            })}
          </div>
        </fieldset>
        {formError && <p role="alert" className="font-sans text-small text-danger">{formError}</p>}
        <Button type="submit" loading={busy} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
