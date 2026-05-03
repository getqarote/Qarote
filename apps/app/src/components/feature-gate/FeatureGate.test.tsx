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
