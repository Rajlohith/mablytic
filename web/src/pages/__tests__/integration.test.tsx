// @vitest-environment-options {"url": "http://localhost:8000/"}
/**
 * End-to-end-ish tests: the real React app rendered in jsdom against a LIVE
 * Mablytic backend seeded with the demo data. Skipped unless one is running:
 *
 *   (backend)  cd backend && python -m uvicorn main:app --port 8000
 *   (web)      INTEGRATION=1 npm test
 *
 * Note: jsdom does not do layout, so this verifies behavior and content, not visuals.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

async function logIn(username: string, password: string) {
  const user = userEvent.setup();
  mount("/login");
  await user.type(await screen.findByLabelText("Username"), username);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

run("live backend", () => {
  it("homepage: news + many labelled advertisements, no sponsored wording", async () => {
    const { container } = mount("/");
    await waitFor(() => expect(container.querySelectorAll("article").length).toBeGreaterThan(30), { timeout: 15000 });
    // Wait for resolved creatives (loading skeletons also render <aside>s, but have no headline).
    const loaded = () => Array.from(container.querySelectorAll("[data-ad-layout]")).filter((a) => a.querySelector("[data-ad-title]"));
    await waitFor(() => expect(loaded().length).toBeGreaterThanOrEqual(8), { timeout: 15000 });
    const ads = loaded();
    expect(ads.every((a) => a.textContent?.includes("Advertisement"))).toBe(true);
    expect(new Set(ads.map((a) => a.querySelector("[data-ad-title]")?.textContent)).size).toBeGreaterThanOrEqual(8); // distinct creatives
    expect(new Set(ads.map((a) => a.getAttribute("data-ad-layout")))).toEqual(new Set(["banner", "sidebar", "feed"]));
    expect(container.textContent?.toLowerCase()).not.toMatch(/sponsored|paid post/);
    // News only: none of the unwanted NYT sections.
    expect(container.textContent).not.toMatch(/Wordle|Crossword|Cooking|Wirecutter/);
    // Navigation shows many categories.
    expect(within(screen.getByRole("navigation", { name: "Sections" })).getAllByRole("link").length).toBeGreaterThanOrEqual(12);
  }, 40000);

  it("article page: long-form body with inline advertisements", async () => {
    const list = (await (await fetch("http://localhost:8000/articles?page_size=1")).json()) as { items: { slug: string; title: string }[] };
    const first = list.items[0]!;
    const { container } = mount(`/article/${first.slug}`);
    expect(await screen.findByRole("heading", { level: 1, name: first.title }, { timeout: 15000 })).toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll("[data-ad-layout='inline']").length).toBeGreaterThanOrEqual(1), { timeout: 15000 });
    expect(container.querySelectorAll(".prose-article p").length).toBeGreaterThanOrEqual(8);
    expect(screen.getByText(/Demonstration content/)).toBeInTheDocument();
  }, 40000);

  it("unknown article shows a not-found state", async () => {
    mount("/article/does-not-exist");
    expect(await screen.findByText("We couldn't find that article", {}, { timeout: 15000 })).toBeInTheDocument();
  });

  it("search finds articles", async () => {
    mount("/search?q=rail");
    expect(await screen.findByText(/\d+ results?/, {}, { timeout: 15000 })).toBeInTheDocument();
  });

  it("registration validation and wrong-password errors are shown", async () => {
    const user = userEvent.setup();
    mount("/register");
    await user.click(await screen.findByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Enter your first name.")).toBeInTheDocument();
    expect(screen.getByText("Use at least 6 characters.", { selector: "p" })).toBeInTheDocument();
  });

  it("wrong password is rejected with the server's message", async () => {
    await logIn("alice", "wrong-password-1");
    expect(await screen.findByRole("alert", {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it("reader login lands on the personalized feed with matched ads", async () => {
    await logIn("alice", "Tech12");
    expect(await screen.findByText(/Good to see you, Alice/, {}, { timeout: 15000 })).toBeInTheDocument();
    // Personalized ads arrive after the skeleton; their note proves preference matching ran.
    const notes = await screen.findAllByText(/Matched to your interest in (tech|gaming)/i, {}, { timeout: 15000 });
    expect(notes.length).toBeGreaterThanOrEqual(1);
  }, 40000);

  it("admin login lands on the console overview", async () => {
    await logIn("admin", "Admin123");
    expect(await screen.findByRole("heading", { name: "Overview" }, { timeout: 15000 })).toBeInTheDocument();
    expect(await screen.findByText(/Live advertisements/)).toBeInTheDocument();
  }, 40000);

  it("admin ads list is filterable and ad form validates", async () => {
    await logIn("admin", "Admin123");
    await screen.findByRole("heading", { name: "Overview" }, { timeout: 15000 });
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("link", { name: "Advertisements" })[0]!);
    expect(await screen.findByRole("heading", { name: "Advertisements" }, { timeout: 15000 })).toBeInTheDocument();
    await screen.findByRole("table", { name: "Advertisements" }, { timeout: 15000 });
    const before = within(screen.getByRole("table", { name: "Advertisements" })).getAllByRole("row").length;
    expect(before).toBeGreaterThan(5); // 10 rows + header on page 1 of 32 ads
    await user.type(screen.getByLabelText("Search"), "mattress");
    const link = await screen.findByRole("link", { name: "Wake up to a quieter mattress" });
    expect(link).toBeInTheDocument();
    await waitFor(() => expect(within(screen.getByRole("table", { name: "Advertisements" })).getAllByRole("row").length).toBe(2));

    await user.click(screen.getAllByRole("link", { name: "New advertisement" })[0]!);
    await user.click(await screen.findByRole("button", { name: "Create advertisement" }));
    expect(await screen.findByText("Enter a headline.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Destination URL"), "javascript:alert(1)");
    await user.click(screen.getByRole("button", { name: "Create advertisement" }));
    expect(await screen.findByText(/full http\(s\) address/)).toBeInTheDocument();
  }, 60000);
});
