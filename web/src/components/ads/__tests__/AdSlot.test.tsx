import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AdSlot } from "@/components/ads/AdSlot";
import { AuthProvider } from "@/context/AuthContext";
import type { Ad } from "@/types";

const ad: Ad = {
  id: 1, title: "A better cup", content: "Small-lot beans.", category: "food", variant: "A", image_url: "/art/ads/x.svg",
  advertiser: "Harrow Roasters", destination_url: "https://example.com/x", placement: "feed", status: "active",
  start_date: null, end_date: null, campaign_id: null,
};
const wrap = (ui: React.ReactElement) => render(<MemoryRouter><AuthProvider>{ui}</AuthProvider></MemoryRouter>);

describe("AdSlot", () => {
  it.each(["feed", "sidebar", "inline", "banner"] as const)("labels the %s layout 'Advertisement'", (layout) => {
    const { container } = wrap(<AdSlot ad={ad} layout={layout} />);
    expect(screen.getByText("Advertisement")).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain("sponsor");
  });

  it("links out safely in a new tab", () => {
    wrap(<AdSlot ad={ad} layout="feed" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://example.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("never renders a javascript: destination as a link", () => {
    wrap(<AdSlot ad={{ ...ad, destination_url: "javascript:alert(1)" }} layout="feed" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("A better cup")).toBeInTheDocument();
  });

  it("is not clickable without a destination", () => {
    wrap(<AdSlot ad={{ ...ad, destination_url: "" }} layout="inline" />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows a labelled fallback when no ad is available", () => {
    wrap(<AdSlot ad={null} layout="sidebar" />);
    expect(screen.getByText("Advertisement")).toBeInTheDocument();
    expect(screen.getByText(/No advertisement is available/)).toBeInTheDocument();
  });

  it("renders nothing for a repeating slot with no ad", () => {
    const { container } = wrap(<AdSlot ad={null} layout="feed" quiet />);
    expect(container.querySelector("[data-ad-layout]")).toBeNull();
  });
});
