import { Navigate, Outlet, useLocation } from "react-router-dom";
import { homeFor, useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingBlock } from "@/components/ui/feedback";

/** Signed-in readers only. Admins are sent to their own console. */
export function RequireUser() {
  const { user, checking } = useAuth();
  const loc = useLocation();
  if (checking) return <LoadingBlock label="Checking your session" className="py-32" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.is_admin) return <Navigate to="/console" replace />;
  return <Outlet />;
}

/**
 * Admins only. The role must be confirmed by the server this session
 * (`verified`), so a doctored localStorage entry never renders admin UI —
 * and every admin API call is independently enforced by the backend.
 */
export function RequireAdmin() {
  const { user, verified, checking, recheck, logout } = useAuth();
  const loc = useLocation();
  if (checking) return <LoadingBlock label="Verifying administrator access" className="py-32" />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (!verified) {
    return (
      <div className="py-24">
        <ErrorState
          title="Couldn't verify your access"
          message="We couldn't reach the server to confirm your administrator role."
          onRetry={recheck}
        />
        <div className="mt-3 text-center">
          <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
        </div>
      </div>
    );
  }
  if (!user.is_admin) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

/** Login/register pages bounce already-signed-in people to their home. */
export function GuestOnly() {
  const { user, checking } = useAuth();
  if (checking) return <LoadingBlock className="py-32" />;
  if (user) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
