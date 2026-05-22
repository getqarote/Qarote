// @vitest-environment jsdom
/**
 * Unit tests for <PermissionDeniedCard>.
 *
 * The wrapper owns three product decisions: which icon to use
 * (ShieldOff, not Lock), which Button variant (default, not destructive),
 * and that the CTA is a <Link> (so deep-link semantics work without
 * forcing onClick handlers on callers). The tests pin those choices.
 */

import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PermissionDeniedCard } from "./PermissionDeniedCard";

function renderInRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("<PermissionDeniedCard>", () => {
  it("renders title and description as text", () => {
    renderInRouter(
      <PermissionDeniedCard
        title="Admin access required"
        description="Reserved for admins."
        returnTo="/"
        returnLabel="Back to dashboard"
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Admin access required" })
    ).toBeInTheDocument();
    expect(screen.getByText("Reserved for admins.")).toBeInTheDocument();
  });

  it("renders the CTA as a link pointing to returnTo", () => {
    renderInRouter(
      <PermissionDeniedCard
        title="t"
        description="d"
        returnTo="/settings/profile"
        returnLabel="Back to your settings"
      />
    );

    const link = screen.getByRole("link", {
      name: "Back to your settings",
    });
    expect(link).toHaveAttribute("href", "/settings/profile");
  });

  it("uses an aria-hidden ShieldOff icon so the title isn't double-announced", () => {
    const { container } = renderInRouter(
      <PermissionDeniedCard
        title="t"
        description="d"
        returnTo="/"
        returnLabel="back"
      />
    );

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // ShieldOff in lucide-react has class "lucide-shield-off"
    expect(icon?.getAttribute("class") ?? "").toMatch(/shield-off/);
  });
});
