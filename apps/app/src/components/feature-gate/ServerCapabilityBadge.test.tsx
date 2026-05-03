// @vitest-environment jsdom
import { I18nextProvider } from "react-i18next";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCapabilities } from "@/hooks/queries/useCapabilities";

import { ServerCapabilityBadge } from "./ServerCapabilityBadge";

vi.mock("@/hooks/queries/useCapabilities", () => ({
  useCapabilities: vi.fn(),
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
        badge: {
          loading: "Loading capabilities",
          pending: "Pending",
          unknownVersion: "Unknown version",
          summary: "{{version}} · {{count}}/{{total}} ready",
          featureReady: "ready",
          featureUnavailable: "unavailable",
        },
        features: {
          message_tracing: "Message Tracing",
          message_spy: "Message Spy",
        },
      },
    },
  },
});

function renderBadge(serverId = "srv-1") {
  return render(
    <I18nextProvider i18n={i18n}>
      <ServerCapabilityBadge serverId={serverId} />
    </I18nextProvider>
  );
}

const SNAPSHOT = { hasFirehoseExchange: true };
const FEATURE_READINESS = [
  { feature: "message_tracing", ready: true },
  { feature: "message_spy", ready: false },
];

describe("<ServerCapabilityBadge>", () => {
  beforeEach(() => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);
  });

  it("shows a loading badge while the query is in flight", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useCapabilities>);

    renderBadge();
    // Badge renders as a span with `aria-label`. Testing Library
    // excludes the `generic` role from default queries, so query by
    // accessible name instead.
    expect(screen.getByLabelText("Loading capabilities")).toBeInTheDocument();
  });

  it("renders nothing when the query has no data (error / 404)", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: undefined,
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    const { container } = renderBadge();
    expect(container.firstChild).toBeNull();
  });

  it("shows a Pending badge when snapshot has never run", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: {
        version: null,
        productName: null,
        snapshot: null,
        featureReadiness: [],
      },
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    renderBadge();
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("shows version-only chip when featureReadiness is empty", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: {
        version: "3.12.10",
        productName: "RabbitMQ",
        snapshot: SNAPSHOT,
        featureReadiness: [],
      },
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    renderBadge();
    expect(screen.getByText("RabbitMQ 3.12.10")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a summary badge with feature count", () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: {
        version: "3.12.10",
        productName: "RabbitMQ",
        snapshot: SNAPSHOT,
        featureReadiness: FEATURE_READINESS,
      },
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    renderBadge();
    // 1 of 2 features ready
    expect(
      screen.getByRole("button", { name: "RabbitMQ 3.12.10 · 1/2 ready" })
    ).toBeInTheDocument();
  });

  it("opens popover with per-feature readiness on click", async () => {
    vi.mocked(useCapabilities).mockReturnValue({
      data: {
        version: "3.12.10",
        productName: "RabbitMQ",
        snapshot: SNAPSHOT,
        featureReadiness: FEATURE_READINESS,
      },
      isLoading: false,
    } as ReturnType<typeof useCapabilities>);

    const user = userEvent.setup();
    renderBadge();

    await user.click(screen.getByRole("button", { name: /ready/ }));

    // Popover header shows the version line
    expect(screen.getByText("RabbitMQ 3.12.10")).toBeInTheDocument();
    // Both features are listed
    expect(screen.getByText("Message Tracing")).toBeInTheDocument();
    expect(screen.getByText("Message Spy")).toBeInTheDocument();
    // SR-only status text
    expect(screen.getByText("ready")).toBeInTheDocument();
    expect(screen.getByText("unavailable")).toBeInTheDocument();
  });
});
