import { useState } from "react";
import { authApi } from "@/api/services";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { PREFERENCE_OPTIONS } from "@/types";

export default function PreferencesPage() {
  useDocumentTitle("Your interests");
  const { user, refresh } = useAuth();
  const toast = useToast();
  const initial = (user?.preferences ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const [selected, setSelected] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const dirty = [...selected].sort().join() !== [...initial].sort().join();

  const save = async () => {
    setBusy(true);
    try {
      await authApi.updatePreferences(selected.join(","));
      await refresh();
      toast.success("Interests saved. Your feed will update.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save your interests.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl">
      <h1 className="font-headline text-3xl font-bold text-ink">Your interests</h1>
      <p className="mt-2 font-sans text-small text-muted">
        These choose which stories appear in your feed and which advertisements are likely to be relevant to you.
      </p>
      <fieldset className="mt-6">
        <legend className="sr-only">Interests</legend>
        <div className="flex flex-wrap gap-2">
          {PREFERENCE_OPTIONS.map((p) => {
            const on = selected.includes(p);
            return (
              <label key={p} className={`cursor-pointer rounded-full border px-4 py-1.5 font-sans text-small capitalize ${on ? "border-ink bg-ink text-white" : "border-rule text-body hover:border-ink"}`}>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setSelected(on ? selected.filter((x) => x !== p) : [...selected, p])} />
                {p}
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => void save()} loading={busy} disabled={!dirty}>Save interests</Button>
        {dirty && <Button variant="ghost" onClick={() => setSelected(initial)}>Reset</Button>}
      </div>
    </div>
  );
}
