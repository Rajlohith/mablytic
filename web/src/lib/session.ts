import type { SessionUser } from "@/types";

const KEY = "mablytic_session_v4";

export interface StoredSession {
  token: string;
  user: SessionUser;
}

export function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed.user?.id) return null;
    if (isExpired(parsed.token)) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

/** UX-only expiry check (the server is the authority on token validity). */
export function isExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return true;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 <= Date.now() : false;
  } catch {
    return true;
  }
}
