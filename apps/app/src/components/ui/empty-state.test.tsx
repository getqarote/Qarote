// @vitest-environment jsdom
/**
 * Unit tests for the EmptyState primitive.
 *
 * Contract verified:
 *   - Required slots (icon, title) always render.
 *   - Optional slots (description, action) render only when passed.
 *   - className passthrough merges with the default classes.
 *   - The icon is `aria-hidden` so it doesn't double-announce the title.
 */

import { render, screen } from "@testing-library/react";
import { ShieldOff } from "lucide-react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("<EmptyState>", () => {
  it("renders icon and title with required props only", () => {
    const { container } = render(
      <EmptyState icon={ShieldOff} title="Admin access required" />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Admin access required" })
    ).toBeInTheDocument();

    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        icon={ShieldOff}
        title="Admin access required"
        description="You'll need an admin to grant you access."
      />
    );

    expect(
      screen.getByText("You'll need an admin to grant you access.")
    ).toBeInTheDocument();
  });

  it("renders action slot when provided", () => {
    render(
      <EmptyState
        icon={ShieldOff}
        title="Admin access required"
        action={<button type="button">Back to dashboard</button>}
      />
    );

    expect(
      screen.getByRole("button", { name: "Back to dashboard" })
    ).toBeInTheDocument();
  });

  it("merges custom className with default classes", () => {
    const { container } = render(
      <EmptyState icon={ShieldOff} title="Title" className="custom-marker" />
    );

    const card = container.firstElementChild;
    expect(card?.className).toContain("custom-marker");
    expect(card?.className).toContain("mx-auto");
  });
});
