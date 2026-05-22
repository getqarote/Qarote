// @vitest-environment jsdom
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useCapabilities,
  useRecheckCapabilities,
} from "@/hooks/queries/useCapabilities";
import { useFeatureGate } from "@/hooks/queries/useFeatureGate";
import { useWorkspace } from "@/hooks/ui/useWorkspace";

import { FeatureGate } from "./FeatureGate";

vi.mock("@/hooks/queries/useFeatureGate", () => ({
  useFeatureGate: vi.fn(),
}));
vi.mock("@/hooks/queries/useCapabilities", () => ({
  useCapabilities: vi.fn(),
  useRecheckCapabilities: vi.fn(),
}));
vi.mock("@/hooks/ui/useWorkspace", () => ({
  useWorkspace: vi.fn(),
}));

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["gate"],
  defaultNS: "gate",
  resources: {
    en: {
      gate: {
        loadingGate: "Loading feature…",
        title: {
          license: "License required",
          plan: "Upgrade your plan",
          capability: "Not available on this broker",
        },
        capability: {
          unknown: "Cannot verify compatibility.",
          recheck: "Re-check",
          recheckIn: "Re-check in {{seconds}}s",
          warmupAdvisory: "Diagnosis warming up — results may be sparse.",
          tracing: { pluginMissing: "Plugin missing.", enablePlugin: "Enable" },
        },
        license: {
          featureRequiresLicense: "{{feature}} requires a license.",
          cta: { activate: "Activate license" },
        },
        plan: {
          featureRequiresUpgrade: "{{feature}} needs a paid plan.",
          cta: { upgrade: "Upgrade" },
        },
        remediation: { runOnBroker: "Run:", copy: "Copy" },
        fallback: { tryAlternative: "Try {{alternative}} instead" },
        features: { message_tracing: "Message Tracing" },
        lastChecked: "Last checked {{relative}}",
        checkedJustNow: "just now",
        dismissAdvisory: "Dismiss notice",
      },
    },
  },
});

function renderGate(children = <p>gated content</p>) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <FeatureGate feature="message_tracing" serverId="srv-1">
          {children}
        </FeatureGate>
      </MemoryRouter>
    </I18nextProvider>
  );
}

const OK_RESULT = { kind: "ok" as const };
const CAPS_DATA = {
  version: "3.12.10",
  productName: "RabbitMQ",
  // Fixed timestamp keeps the test deterministic — no `Date.now()`
  // moving target across runs. Two minutes before a stable wall clock
  // is well past the FeatureGateCard recheck cooldown for the cases
  // that exercise the footer.
  capabilitiesAt: "2026-05-02T10:00:00Z",
  snapshot: { hasFirehoseExchange: true },
  featureReadiness: [],
};

describe("<FeatureGate>", () => {
  beforeEach(() => {
    vi.mocked(useWorkspace).mockReturnValue({
      workspace: { id: "ws-1" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useWorkspace>);

    vi.mocked(useFeatureGate).mockReturnValue({
      result: OK_RESULT,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    vi.mocked(useCapabilities).mockReturnValue({
      data: CAPS_DATA,
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    vi.mocked(useRecheckCapabilities).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRecheckCapabilities>);
  });

  it("renders the loading fallback while the gate query is in flight", () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText("Loading feature…")).toBeInTheDocument();
    expect(screen.queryByText("gated content")).toBeNull();
  });

  it("renders a custom loadingFallback when provided", () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <FeatureGate
            feature="message_tracing"
            serverId="srv-1"
            loadingFallback={<p>custom skeleton</p>}
          >
            <p>gated content</p>
          </FeatureGate>
        </MemoryRouter>
      </I18nextProvider>
    );
    expect(screen.getByText("custom skeleton")).toBeInTheDocument();
  });

  it("renders children when the gate result is ok", () => {
    renderGate();
    expect(screen.getByText("gated content")).toBeInTheDocument();
  });

  it("renders children when the gate result is preview", () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: {
        kind: "preview",
        previewCount: 5,
        blockedBy: "plan",
        upgrade: { ctaKey: "plan.cta.upgrade", ctaUrl: "/billing" },
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.getByText("gated content")).toBeInTheDocument();
  });

  it("renders the advisory banner above children when the gate is degraded", () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: {
        kind: "degraded",
        feature: "message_tracing",
        reasonKey: "capability.warmupAdvisory",
        reasonParams: undefined,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderGate();
    const banner = screen.getByText(
      "Diagnosis warming up — results may be sparse."
    );
    // The banner element itself carries `role="status"` so the advisory
    // is announced by assistive tech as a polite live region.
    expect(banner.closest('[role="status"]')).not.toBeNull();
    // Children still render alongside the banner
    expect(screen.getByText("gated content")).toBeInTheDocument();
  });

  it("renders FeatureGateCard instead of children when the gate is blocked", () => {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: {
        kind: "blocked",
        blockedBy: "capability",
        feature: "message_tracing",
        reasonKey: "capability.tracing.pluginMissing",
        reasonParams: undefined,
        remediation: undefined,
        upgrade: undefined,
        fallback: undefined,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderGate();
    expect(screen.queryByText("gated content")).toBeNull();
    // FeatureGateCard always renders a labelled region
    expect(
      screen.getByRole("region", { name: "Not available on this broker" })
    ).toBeInTheDocument();
  });

  it("waits for capabilities before rendering a capability block", () => {
    // Gate has resolved to blocked-by-capability, but the capability
    // snapshot is still loading. Without this branch the card would
    // flash with `null` version and reflow once capabilities settle.
    vi.mocked(useFeatureGate).mockReturnValue({
      result: {
        kind: "blocked",
        blockedBy: "capability",
        feature: "message_tracing",
        reasonKey: "capability.tracing.pluginMissing",
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    vi.mocked(useCapabilities).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCapabilities>);

    renderGate();
    expect(screen.getByText("Loading feature…")).toBeInTheDocument();
    expect(screen.queryByRole("region")).toBeNull();
  });
});

describe("<FeatureGate> — degraded advisory dismissal", () => {
  // Each test owns its own localStorage spy lifecycle to avoid leaking
  // state across cases. The component reads localStorage on mount via a
  // lazy useState initializer AND resyncs on dismissalKey changes via a
  // useEffect — the cases below pin both paths down.
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.mocked(useWorkspace).mockReturnValue({
      workspace: { id: "ws-1" },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as ReturnType<typeof useWorkspace>);

    vi.mocked(useCapabilities).mockReturnValue({
      data: CAPS_DATA,
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    vi.mocked(useRecheckCapabilities).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useRecheckCapabilities>);
  });

  function mockDegradedGate(reasonKey: string) {
    vi.mocked(useFeatureGate).mockReturnValue({
      result: {
        kind: "degraded",
        feature: "message_tracing",
        reasonKey,
        reasonParams: undefined,
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
  }

  it("shows the banner with no persisted dismissal (default state)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    mockDegradedGate("capability.warmupAdvisory");

    renderGate();

    expect(
      screen.getByText("Diagnosis warming up — results may be sparse.")
    ).toBeInTheDocument();
  });

  it("hides the banner when localStorage has the matching dismissal key set to '1'", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) =>
      key === "qarote.gate.degraded.dismissed:capability.warmupAdvisory"
        ? "1"
        : null
    );
    mockDegradedGate("capability.warmupAdvisory");

    renderGate();

    // Banner copy is absent because the dismissal latch is on.
    expect(
      screen.queryByText("Diagnosis warming up — results may be sparse.")
    ).toBeNull();
    // Children still render so the rest of the page is unaffected.
    expect(screen.getByText("gated content")).toBeInTheDocument();
  });

  it("resyncs the dismissed flag when the gate result swaps in a different reasonKey", () => {
    // Persisted dismissal exists ONLY for reasonA; switching to reasonB
    // must read the new key (missing in storage) and re-show the banner.
    vi.spyOn(Storage.prototype, "getItem").mockImplementation((key) =>
      key === "qarote.gate.degraded.dismissed:reasonA" ? "1" : null
    );

    mockDegradedGate("reasonA");
    const { rerender } = renderGate();

    // reasonA is dismissed — banner not present. (reasonA's translation
    // resolves to its key string under i18next-fallback semantics.)
    expect(screen.queryByText("reasonA")).toBeNull();

    // Swap the gate result to reasonB; the useEffect-resync must flip
    // advisoryDismissed back to false because reasonB has no flag.
    mockDegradedGate("reasonB");
    rerender(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <FeatureGate feature="message_tracing" serverId="srv-1">
            <p>gated content</p>
          </FeatureGate>
        </MemoryRouter>
      </I18nextProvider>
    );

    // Banner for reasonB is now visible.
    expect(screen.getByText("reasonB")).toBeInTheDocument();
  });

  it("falls back to showing the banner when localStorage throws (quota / private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError: storage unavailable");
    });
    mockDegradedGate("capability.warmupAdvisory");

    // The component must not crash and must default to non-dismissed.
    expect(() => renderGate()).not.toThrow();
    expect(
      screen.getByText("Diagnosis warming up — results may be sparse.")
    ).toBeInTheDocument();
  });
});
