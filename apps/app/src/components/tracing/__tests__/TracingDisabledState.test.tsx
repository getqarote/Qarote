// @vitest-environment jsdom
import { I18nextProvider } from "react-i18next";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { describe, expect, it } from "vitest";

import { TRACING_VS_SPY_DOCS_URL } from "@/lib/docsUrls";

import { TracingDisabledState } from "../TracingDisabledState";

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["tracing"],
  defaultNS: "tracing",
  resources: {
    en: {
      tracing: {
        "empty.firehose.title": "Tracing not enabled on this server",
        "empty.firehose.description":
          "Tracing turns on the RabbitMQ Firehose so Qarote captures every published and delivered message's metadata.",
        "empty.firehose.enable": "Enable Tracing",
        "empty.firehose.enabling": "Enabling…",
        "empty.firehose.enableError": "Failed to enable Tracing.",
        "empty.firehose.orManually": "Or run manually:",
        "empty.firehose.vhostStatus": "Virtual host status",
        "empty.firehose.statusActive": "Active",
        "empty.firehose.statusInactive": "Inactive",
        "empty.firehose.confirmTitle": "Enable RabbitMQ Firehose?",
        "empty.firehose.confirmDescription": "This activates the plugin.",
        "empty.firehose.confirmCancel": "Cancel",
        "empty.firehose.confirmProceed": "Enable Tracing",
        "docs.spyAlternativeIntro":
          "Need to inspect a single queue without enabling Tracing?",
        "docs.spyAlternativeLink": "Use Spy →",
        "docs.confirmDifferenceLink": "What's the difference with Spy?",
      },
    },
  },
});

function renderState() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TracingDisabledState
        vhosts={[{ name: "/", tracing: false }]}
        onEnable={async () => {}}
      />
    </I18nextProvider>
  );
}

describe("TracingDisabledState — docs links", () => {
  it("renders the Spy alternative link pointing to the docs page", () => {
    // Acceptance criterion from messages-ui-coherence.md A.6: users
    // who land here looking only to inspect one queue should be able
    // to pivot to Spy in one click without enabling Tracing globally.
    renderState();
    const spyLink = screen.getByRole("link", { name: /Use Spy/i });
    expect(spyLink.getAttribute("href")).toBe(TRACING_VS_SPY_DOCS_URL);
    expect(spyLink.getAttribute("target")).toBe("_blank");
    // The intro text must accompany the link so the call-to-action has
    // a question to motivate it.
    expect(
      screen.getByText(/Need to inspect a single queue/i)
    ).toBeInTheDocument();
  });

  it("renders the difference link inside the confirm dialog", async () => {
    renderState();
    // Radix mounts the dialog content into a portal only after the
    // trigger fires; userEvent processes the click + portal render in
    // one awaitable step, which a synchronous .click() does not.
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Enable Tracing/i }));
    const link = await screen.findByRole("link", {
      name: /What's the difference with Spy/i,
    });
    expect(link.getAttribute("href")).toBe(TRACING_VS_SPY_DOCS_URL);
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
