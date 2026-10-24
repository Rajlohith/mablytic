import { Card, PageHeader } from "@/components/admin/AdminUI";
import { useAuth } from "@/context/AuthContext";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { API_BASE } from "@/api/client";
import { ChangePasswordForm } from "@/pages/account/SecurityPage";

export default function SettingsPage() {
  useDocumentTitle("Settings");
  const { user } = useAuth();
  return (
    <div>
      <PageHeader title="Settings" description="Your administrator account." />
      <div className="grid max-w-4xl gap-6 md:grid-cols-2">
        <Card title="Account">
          <dl className="space-y-2 font-sans text-small">
            <div><dt className="text-muted">Name</dt><dd className="text-ink">{user?.first_name} {user?.last_name}</dd></div>
            <div><dt className="text-muted">Username</dt><dd className="text-ink">{user?.username}</dd></div>
            <div><dt className="text-muted">Role</dt><dd className="text-ink">Administrator</dd></div>
            <div><dt className="text-muted">API</dt><dd className="text-ink">{API_BASE || "Same origin"}</dd></div>
          </dl>
          <p className="mt-4 font-sans text-meta text-muted">Delivery rules, the Gemini API key and database settings are configured on the server through environment variables, not from this screen.</p>
        </Card>
        <Card title="Change password"><ChangePasswordForm /></Card>
      </div>
    </div>
  );
}
