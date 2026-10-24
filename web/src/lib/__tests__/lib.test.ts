import { describe, expect, it } from "vitest";
import { categorySlug, isoToLocal, localToIso, safeHref, sortSections } from "@/lib/format";
import { isExpired } from "@/lib/session";
import { hasErrors, validateLogin, validateRegister, type RegisterForm } from "@/lib/validation";
import { inlineAdPositions } from "@/pages/ArticlePage";

const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.y`;

describe("format helpers", () => {
  it("builds stable section slugs", () => {
    expect(categorySlug("U.S.")).toBe("u-s");
    expect(categorySlug("Arts & Culture")).toBe("arts-culture");
  });
  it("only allows http(s) destinations", () => {
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
    expect(safeHref("")).toBeNull();
    expect(safeHref(null)).toBeNull();
  });
  it("orders sections editorially with unknown ones last", () => {
    const out = sortSections([{ name: "Zeta" }, { name: "Opinion" }, { name: "World" }]);
    expect(out.map((s) => s.name)).toEqual(["World", "Opinion", "Zeta"]);
  });
  it("round-trips datetime-local values", () => {
    expect(localToIso("")).toBeNull();
    const iso = localToIso("2026-10-22T09:30")!;
    expect(isoToLocal(iso)).toBe("2026-10-22T09:30");
  });
});

describe("session expiry", () => {
  it("detects expired and valid tokens", () => {
    expect(isExpired(jwt(Math.floor(Date.now() / 1000) - 60))).toBe(true);
    expect(isExpired(jwt(Math.floor(Date.now() / 1000) + 600))).toBe(false);
    expect(isExpired("garbage")).toBe(true);
  });
});

describe("inline ad positions", () => {
  it("puts none in short pieces and more in long ones", () => {
    expect(inlineAdPositions(3)).toEqual([]);
    expect(inlineAdPositions(6)).toEqual([2]);
    expect(inlineAdPositions(10)).toEqual([2, 6]);
    expect(inlineAdPositions(16)).toEqual([2, 6, 11]);
  });
});

describe("form validation", () => {
  const ok: RegisterForm = { username: "reader1", password: "secret1", confirm: "secret1", first_name: "A", last_name: "B", email: "a@b.co", gender: "female", age: "30", preferences: [] };
  it("accepts a valid registration", () => expect(hasErrors(validateRegister(ok))).toBe(false));
  it("flags each invalid field", () => {
    const e = validateRegister({ ...ok, username: "bad name!", email: "nope", password: "123", confirm: "x", age: "9", gender: "" });
    expect(Object.keys(e).sort()).toEqual(["age", "confirm", "email", "gender", "password", "username"]);
  });
  it("requires login fields", () => {
    expect(validateLogin("", "")).toEqual({ username: "Enter your username.", password: "Enter your password." });
    expect(hasErrors(validateLogin("a", "b"))).toBe(false);
  });
});
