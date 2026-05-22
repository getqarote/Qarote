// @vitest-environment jsdom
/**
 * Unit tests for <RequireWorkspaceAdmin>.
 *
 * Pins the three-state contract that exists to kill the
 * redirect-while-loading regression:
 *   null   → loadingFallback, never the denied state or a redirect
 *   false  → deniedFallback OR redirectTo (precedence: redirect wins)
 *   true   → children render once
 */

import { MemoryRouter, Route, Routes, useLocation } from "react-router";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockReturn: boolean | null = null;

vi.mock("@/hooks/queries/useWorkspaceRole", () => ({
  useIsWorkspaceAdmin: () => mockReturn,
}));

import { RequireWorkspaceAdmin } from "./RequireWorkspaceAdmin";

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}</span>;
}

function renderGuard(props: {
  redirectTo?: string;
  deniedFallback?: React.ReactNode;
}) {
  return render(
    <MemoryRouter initialEntries={["/start"]}>
      <Routes>
        <Route
          path="/start"
          element={
            <>
              <LocationProbe />
              <RequireWorkspaceAdmin
                loadingFallback={<div data-testid="loading">L</div>}
                deniedFallback={props.deniedFallback}
                redirectTo={props.redirectTo}
              >
                <div data-testid="children">Allowed</div>
              </RequireWorkspaceAdmin>
            </>
          }
        />
        <Route
          path="/elsewhere"
          element={
            <>
              <LocationProbe />
              <div data-testid="elsewhere">Elsewhere</div>
            </>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("<RequireWorkspaceAdmin>", () => {
  it("renders loading fallback with aria-busy wrapper and an sr-only status live region while loading", () => {
    mockReturn = null;
    renderGuard({});

    // The visible skeleton is wrapped in aria-busy. The role=status
    // (implicit on <output>) is a sibling so the live region only
    // contains the textual loading label, avoiding spurious
    // re-announces when the skeleton subtree mutates.
    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(
      screen.getByTestId("loading").closest("[aria-busy='true']")
    ).not.toBeNull();

    const status = screen.getByRole("status");
    expect(status.tagName.toLowerCase()).toBe("output");
    expect(status.className).toContain("sr-only");

    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
  });

  it("renders nothing when denied with no fallback or redirect", () => {
    mockReturn = false;
    renderGuard({});

    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders deniedFallback when denied without redirectTo", () => {
    mockReturn = false;
    renderGuard({
      deniedFallback: <div data-testid="denied">Denied</div>,
    });

    expect(screen.getByTestId("denied")).toBeInTheDocument();
    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/start");
  });

  it("navigates with replace when denied with redirectTo", () => {
    mockReturn = false;
    renderGuard({ redirectTo: "/elsewhere" });

    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
    expect(screen.getByTestId("location").textContent).toBe("/elsewhere");
  });

  it("prefers redirectTo over deniedFallback (precedence rule)", () => {
    mockReturn = false;
    renderGuard({
      redirectTo: "/elsewhere",
      deniedFallback: <div data-testid="denied">Denied</div>,
    });

    expect(screen.getByTestId("elsewhere")).toBeInTheDocument();
    expect(screen.queryByTestId("denied")).not.toBeInTheDocument();
  });

  it("renders children when admin", () => {
    mockReturn = true;
    renderGuard({});

    expect(screen.getByTestId("children")).toBeInTheDocument();
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
  });
});
