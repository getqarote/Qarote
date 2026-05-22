// @vitest-environment jsdom
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/contexts/VHostContextDefinition", () => ({
  useVHostContext: () => ({
    selectedVHost: "/",
    availableVHosts: [{ name: "/" }],
  }),
}));

vi.mock("@/hooks/queries/useRabbitMQ", () => ({
  useQueues: () => ({ data: { queues: [] } }),
  useExchanges: () => ({ data: { exchanges: [] } }),
}));

import { TracingFiltersBar } from "../TracingFiltersBar";

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["tracing"],
  defaultNS: "tracing",
  resources: {
    en: {
      tracing: {
        "filter.vhost": "Vhost",
        "filter.allVhosts": "All vhosts",
        "filter.queue": "Queue",
        "filter.allQueues": "All queues",
        "filter.exchange": "Exchange",
        "filter.allExchanges": "All exchanges",
        "filter.routingKey": "Routing Key",
        "filter.direction": "Direction",
        "filter.direction.all": "All",
        "filter.direction.publish": "Publish",
        "filter.direction.deliver": "Deliver",
        "filter.from": "From",
        "filter.to": "To",
        "filter.timeRangeLabel": "Time range",
        "filter.filterLabel": "Filter",
        "filter.clear": "Clear",
        "filter.rangeInverted": "From must be earlier than To.",
        "filter.rangeExceedsRetention":
          "Range starts before the {{days}}-day retention window — older events are not stored.",
      },
    },
  },
});

function renderBar(props: {
  from?: string;
  to?: string;
  showTimeRange?: boolean;
}) {
  return render(
    <MemoryRouter>
      <NuqsTestingAdapter>
        <I18nextProvider i18n={i18n}>
          <TracingFiltersBar
            serverId="srv-1"
            showTimeRange={props.showTimeRange ?? true}
            from={props.from}
            to={props.to}
            onFromChange={() => {}}
            onToChange={() => {}}
          />
        </I18nextProvider>
      </NuqsTestingAdapter>
    </MemoryRouter>
  );
}

describe("TracingFiltersBar — time range validation", () => {
  it("keeps the live region mounted but empty for a valid recent range", () => {
    // Always-mounted live region: NVDA + Firefox can miss announcements
    // when the live region appears in the DOM with content already in
    // it. So the <p role="status"> stays mounted at all times; only
    // its inner content toggles. For a valid range, the element exists
    // (sr-only, no AlertTriangle) and has no visible message.
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    renderBar({
      from: toLocalInput(oneHourAgo),
      to: toLocalInput(now),
    });
    const liveRegion = screen.getByRole("status");
    expect(liveRegion.id).toBe("tracing-range-error");
    expect(liveRegion.textContent ?? "").toBe("");
  });

  it("flags the range when From is later than To", () => {
    // Inverted range: even before the input's max guard, a typed-in
    // value can produce this state. The validator catches it at runtime.
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    renderBar({
      from: toLocalInput(now),
      to: toLocalInput(oneHourAgo),
    });
    const hint = screen.getByRole("status");
    expect(hint.textContent ?? "").toMatch(/From must be earlier than To/i);
  });

  it("warns when From falls before the retention window", () => {
    // 30 days ago — outside the 7-day retention window. Query is valid
    // but the older portion will return no results, so we surface that.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    renderBar({
      from: toLocalInput(thirtyDaysAgo),
      to: toLocalInput(now),
    });
    const hint = screen.getByRole("status");
    expect(hint.textContent ?? "").toMatch(/retention window/i);
    // Ensure the 7-day count is interpolated into the message so users
    // see the actual constraint, not a placeholder.
    expect(hint.textContent ?? "").toMatch(/7-day/);
  });

  it("prefers the inverted-range error when both conditions could fire", () => {
    // From 30 days ago AND to 31 days ago — both inverted and exceeds
    // retention. Inverted is the more actionable error (no rows would
    // ever return), so it takes priority.
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    renderBar({
      from: toLocalInput(thirtyDaysAgo),
      to: toLocalInput(thirtyOneDaysAgo),
    });
    const hint = screen.getByRole("status");
    expect(hint.textContent ?? "").toMatch(/From must be earlier than To/i);
    expect(hint.textContent ?? "").not.toMatch(/retention window/i);
  });
});

/** Format like a datetime-local input value: YYYY-MM-DDTHH:MM in local TZ. */
function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
