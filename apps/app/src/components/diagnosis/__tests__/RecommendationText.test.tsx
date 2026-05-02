// @vitest-environment jsdom
/**
 * Component tests for `<RecommendationText>` — the inline parser that
 * promotes backtick-delimited segments to `<code>` with a copy button.
 *
 * Why these tests:
 *   - Backtick parsing is the only logic in the component. Off-by-one
 *     splits or a regex creeping in later would silently break copy
 *     buttons on every diagnosis card. A few targeted assertions pin
 *     the behaviour: even-index = text, odd-index = code, empty
 *     trailing odd-index renders nothing.
 *   - The copy button is conditional on `isClipboardAvailable()` —
 *     hides on hosts without clipboard access. We mock the helper to
 *     drive both branches.
 */

import { I18nextProvider } from "react-i18next";

import { render, screen } from "@testing-library/react";
import i18next from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockIsClipboardAvailable = vi.fn();
const mockCopyToClipboard = vi.fn();

vi.mock("@/lib/clipboard", () => ({
  isClipboardAvailable: mockIsClipboardAvailable,
  copyToClipboard: mockCopyToClipboard,
}));

const { RecommendationText } = await import("../RecommendationText");

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["diagnosis"],
  defaultNS: "diagnosis",
  resources: {
    en: {
      diagnosis: {
        card: { copyCommand: "Copy", copied: "Copied" },
      },
    },
  },
});

function renderWithI18n(node: React.ReactElement) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

beforeEach(() => {
  mockIsClipboardAvailable.mockReturnValue(true);
  mockCopyToClipboard.mockResolvedValue(true);
});

describe("RecommendationText", () => {
  it("renders plain text without backticks as a single span", () => {
    renderWithI18n(<RecommendationText text="Restart the consumer." />);
    expect(screen.getByText("Restart the consumer.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("promotes a single backtick-delimited segment to <code>", () => {
    renderWithI18n(
      <RecommendationText text="Run `rabbitmqctl list_alarms` now." />
    );
    const code = screen.getByText("rabbitmqctl list_alarms");
    expect(code.tagName.toLowerCase()).toBe("code");
  });

  it("renders one copy button per code segment", () => {
    renderWithI18n(
      <RecommendationText text="Run `cmd1` then `cmd2` to recover." />
    );
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("hides copy buttons when clipboard is unavailable", () => {
    mockIsClipboardAvailable.mockReturnValue(false);
    renderWithI18n(
      <RecommendationText text="Run `rabbitmqctl list_alarms`." />
    );
    expect(screen.queryByRole("button")).toBeNull();
    // The <code> still renders — operators can still see the command,
    // they just don't get a button.
    expect(screen.getByText("rabbitmqctl list_alarms")).toBeInTheDocument();
  });

  it("ignores empty trailing odd-index segment (unmatched backtick)", () => {
    renderWithI18n(<RecommendationText text="Foo `bar` baz `" />);
    // The unmatched trailing backtick produces an empty odd-index run
    // which the component skips. Only one copy button should render.
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
