// @vitest-environment jsdom
/**
 * Unit tests for <RequireOrgAdmin>.
 *
 * Same contract as <RequireWorkspaceAdmin>, but reads the org-scope
 * tri-state hook. We don't re-test every variant exhaustively — the
 * workspace sibling covers the precedence and a11y rules — but we
 * confirm each of the three branches resolves correctly through the
 * org hook, so a regression in `useIsOrgAdmin` wiring fails here too.
 */

import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockReturn: boolean | null = null;

vi.mock("@/hooks/queries/useOrganization", () => ({
  useIsOrgAdmin: () => mockReturn,
}));

import { RequireOrgAdmin } from "./RequireOrgAdmin";

function renderGuard() {
  return render(
    <MemoryRouter>
      <RequireOrgAdmin
        loadingFallback={<div data-testid="loading">L</div>}
        deniedFallback={<div data-testid="denied">D</div>}
      >
        <div data-testid="children">Allowed</div>
      </RequireOrgAdmin>
    </MemoryRouter>
  );
}

describe("<RequireOrgAdmin>", () => {
  it("renders loading fallback inside aria-busy wrapper with sr-only live region", () => {
    mockReturn = null;
    renderGuard();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(
      screen.getByTestId("loading").closest("[aria-busy='true']")
    ).not.toBeNull();
    expect(screen.getByRole("status").tagName.toLowerCase()).toBe("output");
  });

  it("renders deniedFallback when not admin", () => {
    mockReturn = false;
    renderGuard();
    expect(screen.getByTestId("denied")).toBeInTheDocument();
    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
  });

  it("renders children when admin", () => {
    mockReturn = true;
    renderGuard();
    expect(screen.getByTestId("children")).toBeInTheDocument();
  });
});
