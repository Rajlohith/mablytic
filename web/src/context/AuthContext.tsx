import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/api/services";
import { ApiError, setUnauthorizedHandler } from "@/api/client";
import { clearSession, readSession, writeSession, type StoredSession } from "@/lib/session";
import type { SessionUser } from "@/types";

interface AuthState {
  user: SessionUser | null;
  /** True once the stored session has been confirmed by the server this load. */
  verified: boolean;
  /** True while the initial server check is running. */
  checking: boolean;
  /** Set when a request failed with 401 and the session was dropped. */
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<SessionUser>;
  logout: () => void;
  /** Re-fetch the profile (e.g. after changing preferences). */
  refresh: () => Promise<void>;
  /** Retry the server check after a network failure. */
  recheck: () => void;
  dismissExpired: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState<boolean>(() => readSession() !== null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [nonce, setNonce] = useState(0);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setVerified(false);
  }, []);

  // Any authenticated request that comes back 401 ends the session.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      setSessionExpired(true);
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // The role in localStorage is only a hint. Ask the server who we are, so
  // editing localStorage can never unlock admin UI (the API enforces it too).
  useEffect(() => {
    const stored = readSession();
    if (!stored) {
      setChecking(false);
      return;
    }
    const ctrl = new AbortController();
    setChecking(true);
    authApi
      .me(ctrl.signal)
      .then((me) => {
        const fresh: StoredSession = {
          token: stored.token,
          user: {
            id: me.id, username: me.username, first_name: me.first_name,
            last_name: me.last_name, is_admin: me.is_admin, preferences: me.preferences,
          },
        };
        writeSession(fresh);
        setSession(fresh);
        setVerified(true);
      })
      .catch((err: unknown) => {
        if ((err as Error).name === "AbortError") return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          logout();
        }
        // Network error: keep the session, but leave `verified` false.
      })
      .finally(() => setChecking(false));
    return () => ctrl.abort();
  }, [nonce, logout]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const user: SessionUser = {
      id: res.id, username: res.username, first_name: res.first_name,
      last_name: res.last_name, is_admin: res.is_admin, preferences: res.preferences,
    };
    const next = { token: res.access_token, user };
    writeSession(next);
    setSession(next);
    setVerified(true); // the server just authenticated us
    setChecking(false);
    setSessionExpired(false);
    return user;
  }, []);

  const refresh = useCallback(async () => {
    const stored = readSession();
    if (!stored) return;
    const me = await authApi.me();
    const next: StoredSession = {
      token: stored.token,
      user: { id: me.id, username: me.username, first_name: me.first_name, last_name: me.last_name, is_admin: me.is_admin, preferences: me.preferences },
    };
    writeSession(next);
    setSession(next);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      verified,
      checking,
      sessionExpired,
      login,
      logout,
      refresh,
      recheck: () => setNonce((n) => n + 1),
      dismissExpired: () => setSessionExpired(false),
    }),
    [session, verified, checking, sessionExpired, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Where a signed-in user belongs. */
export function homeFor(user: SessionUser): string {
  return user.is_admin ? "/console" : "/account";
}
