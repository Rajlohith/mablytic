// @vitest-environment-options {"url": "http://localhost:8000/"}
/**
 * Automated accessibility scan (axe-core) of key pages against a live backend:
 *   INTEGRATION=1 npm test
 * jsdom has no layout engine, so axe's color-contrast rule can't run here; check contrast in a browser.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "@/App";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const run = process.env.INTEGRATION ? describe : describe.skip;

const mount = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider>
    </MemoryRouter>,
  );

async function scan(container: HTMLElement) {
  const res = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return res.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.html.slice(0, 110)).join(" | ")}`);
}

async function logIn(u: string, p: string) {
  const user = userEvent.setup();
  mount("/login");
  await user.type(await screen.findByLabelText("Username"), u);
  await user.type(screen.getByLabelText("Password"), p);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

run("accessibility (axe)", () => {
  it("homepage", async () => {
    const { container } = mount("/");
    await waitFor(() => expect(container.querySelectorAll("[data-ad-layout] [data-ad-title]").length).toBeGreaterThanOrEqual(8), { timeout: 15000 });
    expect(await scan(container)).toEqual([]);
  }, 40000);

  it("article, section, search and auth pages", async () => {
    const list = (await (await fetch("http://localhost:8000/articles?page_size=1")).json()) as { items: { slug: string; title: string }[] };
    for (const path of [`/article/${list.items[0]!.slug}`, "/section/world", "/search?q=rail", "/login", "/register"]) {
      const { container, unmount } = mount(path);
      await waitFor(() => expect(container.querySelector("h1")).not.toBeNull(), { timeout: 15000 });
      await new Promise((r) => setTimeout(r, 400));
      expect(await scan(container), path).toEqual([]);
      unmount();
    }
  }, 60000);

  it("reader feed", async () => {
    await logIn("alice", "Tech12");
    await screen.findByText(/Good to see you/, {}, { timeout: 15000 });
    await screen.findAllByText(/Matched to your interest/, {}, { timeout: 15000 });
    expect(await scan(document.body)).toEqual([]);
  }, 40000);

  it("admin overview, ads list and ad form", async () => {
    await logIn("admin", "Admin123");
    await screen.findByRole("heading", { name: "Overview" }, { timeout: 15000 });
    await screen.findByRole("heading", { name: "Top advertisements" });
    expect(await scan(document.body), "overview").toEqual([]);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "Advertisements" })[0]!);
    await screen.findByRole("table", { name: "Advertisements" }, { timeout: 15000 });
    expect(await scan(document.body), "ads list").toEqual([]);
    await user.click(screen.getAllByRole("link", { name: "New advertisement" })[0]!);
    await screen.findByRole("button", { name: "Create advertisement" });
    expect(await scan(document.body), "ad form").toEqual([]);
  }, 60000);
});
