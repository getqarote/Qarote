// @vitest-environment jsdom
/**
 * Component tests for `<FeatureGateCard>` — the visual surface that
 * renders any blocked gate (capability / license / plan).
 *
 * Why these specific tests:
 *   - `<FeatureGateCard>` is the only render path users see when a gate
 *     blocks. Regressions here are user-visible.
 *   - The card does i18n lookup on the wire-shape `reasonKey` etc.
 *     A backend rename (e.g. `capability.tracing.pluginMissing` →
 *     `capability.tracing.firehoseMissing`) would silently render the
 *     raw key. Snapshot tests catch this — translated text in the
 *     output is the contract.
 *   - Capability blocks render a server-context footer with broker
 *     version + Re-check button. License/plan blocks should NOT.
 */

import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";

import type { GateErrorPayload } from "@/lib/feature-gate/types";

import { FeatureGateCard } from "./FeatureGateCard";

// ── Minimal i18n instance for tests ─────────────────────────────────
//
// We use a stub backend instead of the full createI18nInstance from
// @qarote/i18n/react — these tests verify the card consumes keys via
// the `gate` namespace, not the i18n loader plumbing. A flat resource
// dictionary keeps the test fixture readable.
const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["gate"],
  defaultNS: "gate",
  resources: {
    en: {
      gate: {
        title: {
          license: "License required",
          plan: "Upgrade your plan",
          capability: "Not available on this broker",
        },
        license: {
          featureRequiresLicense: "{{feature}} requires a license.",
          cta: { activate: "Activate license" },
        },
        plan: {
          featureRequiresUpgrade: "{{feature}} needs a paid plan.",
          cta: { upgrade: "Upgrade" },
        },
        capability: {
          unknown: "Cannot verify compatibility.",
          recheck: "Re-check",
          recheckIn: "Re-check in {{seconds}}s",
          tracing: {
            pluginMissing: "rabbitmq_tracing plugin is not enabled.",
            enablePlugin: "Enable plugin",
          },
        },
        remediation: {
          runOnBroker: "Run this on your broker:",
          copy: "Copy command",
        },
        fallback: { tryAlternative: "Try {{alternative}} instead" },
        features: { message_spy: "Message Spy" },
        lastChecked: "Last checked {{relative}}",
        checkedJustNow: "just now",
      },
    },
  },
});

function renderCard(props: Parameters<typeof FeatureGateCard>[0]) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <FeatureGateCard {...props} />
      </MemoryRouter>
    </I18nextProvider>
  );
}

const LICENSE_PAYLOAD: GateErrorPayload = {
  blockedBy: "license",
  feature: "alerting",
  reasonKey: "license.featureRequiresLicense",
  reasonParams: { feature: "alerting" },
  upgrade: { ctaKey: "license.cta.activate", ctaUrl: "/settings/license" },
};

const CAPABILITY_PAYLOAD: GateErrorPayload = {
  blockedBy: "capability",
  feature: "message_tracing",
  reasonKey: "capability.tracing.pluginMissing",
  remediation: {
    docsUrl: "/docs/features/tracing",
    ctaKey: "capability.tracing.enablePlugin",
    commands: ["rabbitmq-plugins enable rabbitmq_tracing"],
  },
  fallback: { feature: "message_spy" },
};

describe("<FeatureGateCard>", () => {
  it("renders the license title and reason for a license block", () => {
    renderCard({ payload: LICENSE_PAYLOAD });
    // Title comes from `title.license`; reason from the interpolated
    // i18n key. Both render through the `gate` namespace.
    expect(screen.getByText("License required")).toBeInTheDocument();
    expect(
      screen.getByText("alerting requires a license.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Activate license" })
    ).toBeInTheDocument();
  });

  it("renders capability title + remediation block + fallback CTA", () => {
    renderCard({ payload: CAPABILITY_PAYLOAD });
    expect(
      screen.getByText("Not available on this broker")
    ).toBeInTheDocument();
    expect(
      screen.getByText("rabbitmq_tracing plugin is not enabled.")
    ).toBeInTheDocument();
    // Command block surfaces verbatim (English-only — a deliberate
    // ADR-002 choice for shell commands).
    expect(
      screen.getByText("rabbitmq-plugins enable rabbitmq_tracing")
    ).toBeInTheDocument();
    // Fallback CTA names the alternative feature via i18n.
    expect(
      screen.getByRole("button", { name: "Try Message Spy instead" })
    ).toBeInTheDocument();
  });

  it("does NOT render the server footer for non-capability blocks", () => {
    renderCard({ payload: LICENSE_PAYLOAD });
    // Re-check button is server-footer-only — license blocks have no
    // broker context to surface.
    expect(screen.queryByRole("button", { name: /^Re-check/ })).toBeNull();
  });

  it("renders the server footer with version + Re-check for capability blocks", () => {
    renderCard({
      payload: CAPABILITY_PAYLOAD,
      serverContext: {
        version: "3.12.10",
        productName: "RabbitMQ",
        capabilitiesAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        onRecheck: () => {},
        isRechecking: false,
      },
    });
    // Version line composes as "RabbitMQ 3.12.10".
    expect(screen.getByText("RabbitMQ 3.12.10")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Re-check/ })
    ).toBeInTheDocument();
  });

  it("disables Re-check + shows the 'Re-check in Xs' label when within cooldown", () => {
    renderCard({
      payload: CAPABILITY_PAYLOAD,
      serverContext: {
        version: "3.12.10",
        productName: "RabbitMQ",
        // 10s ago — within the 60s cooldown window.
        capabilitiesAt: new Date(Date.now() - 10_000).toISOString(),
        onRecheck: () => {},
        isRechecking: false,
      },
    });
    // Lock down the exact format AND the disabled state — without the
    // strict regex, a regression that drops the seconds count would
    // still match `/Re-check in/` and pass.
    const button = screen.getByRole("button", { name: /^Re-check in \d+s$/ });
    expect(button).toBeDisabled();
  });

  it("invokes onRecheck when the button is clicked outside the cooldown", async () => {
    const user = userEvent.setup();
    const onRecheck = vi.fn();
    renderCard({
      payload: CAPABILITY_PAYLOAD,
      serverContext: {
        version: "3.12.10",
        productName: "RabbitMQ",
        // 2 min ago — past the 60s cooldown.
        capabilitiesAt: new Date(Date.now() - 120_000).toISOString(),
        onRecheck,
        isRechecking: false,
      },
    });
    await user.click(screen.getByRole("button", { name: "Re-check" }));
    expect(onRecheck).toHaveBeenCalledOnce();
  });

  it("uses role=region with an accessible name from the title", () => {
    renderCard({ payload: LICENSE_PAYLOAD });
    expect(
      screen.getByRole("region", { name: "License required" })
    ).toBeInTheDocument();
  });
});
