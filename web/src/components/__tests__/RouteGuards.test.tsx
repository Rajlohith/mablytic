import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuestOnly, RequireAdmin, RequireUser } from "@/components/RouteGuards";
import { AuthProvider } from "@/context/AuthContext";
import { writeSession } from "@/lib/session";

const futureJwt = () => `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.y`;
const me = (is_admin: boolean) => ({ id: 7, username: "u", first_name: "U", last_name: "S", email: "u@x.co", gender: "", age: 30, preferences: "", is_admin, is_active: true, created_at: "" });

function seed(isAdminClaim: boolean) {
  writeSession({ token: futureJwt(), user: { id: 7, username: "u", first_name: "U", last_name: "S", is_admin: isAdminClaim, preferences: "" } });
}
function mockMe(is_admin: boolean | "network" | 401) {
  vi.stubGlobal("fetch", vi.fn(async () => {
    if (is_admin === "network") throw new TypeError("offline");
    if (is_admin === 401) return new Response(JSON.stringify({ detail: "bad token" }), { status: 401 });
    return new Response(JSON.stringify(me(is_admin)), { status: 200 });
  }));
}

const app = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <AuthProvider>
      <Routes>
        <Route element={<GuestOnly />}><Route path="/login" element={<p>login page</p>} /></Route>
        <Route element={<RequireUser />}><Route path="/account" element={<p>reader area</p>} /></Route>
        <Route element={<RequireAdmin />}><Route path="/console" element={<p>admin area</p>} /></Route>
        <Route path="/unauthorized" element={<p>denied</p>} />
      </Routes>
    </AuthProvider>
  </MemoryRouter>,
);

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe("route guards", () => {
  it("sends anonymous visitors to login", async () => {
    app("/console");
    expect(await screen.findByText("login page")).toBeInTheDocument();
  });

  it("does NOT trust a forged is_admin in localStorage", async () => {
    seed(true); // attacker edits storage to claim admin
    mockMe(false); // the server says they are an ordinary reader
    app("/console");
    expect(await screen.findByText("denied")).toBeInTheDocument();
    expect(screen.queryByText("admin area")).toBeNull();
  });

  it("lets a server-confirmed admin in", async () => {
    seed(false); // storage says reader, server says admin: server wins
    mockMe(true);
    app("/console");
    expect(await screen.findByText("admin area")).toBeInTheDocument();
  });

  it("never shows admin UI when the role can't be verified", async () => {
    seed(true);
    mockMe("network");
    app("/console");
    expect(await screen.findByText(/Couldn't verify your access/)).toBeInTheDocument();
    expect(screen.queryByText("admin area")).toBeNull();
  });

  it("drops an invalid session on 401 and requires login", async () => {
    seed(true);
    mockMe(401);
    app("/console");
    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(localStorage.getItem("mablytic_session_v4")).toBeNull();
  });

  it("keeps admins out of the reader area and readers out of the console", async () => {
    seed(true); mockMe(true);
    const a = app("/account");
    await waitFor(() => expect(screen.queryByText("reader area")).toBeNull());
    a.unmount();
    seed(false); mockMe(false);
    app("/console");
    expect(await screen.findByText("denied")).toBeInTheDocument();
  });

  it("bounces signed-in users away from the login page", async () => {
    seed(false); mockMe(false);
    app("/login");
    await waitFor(() => expect(screen.queryByText("login page")).toBeNull());
  });
});
