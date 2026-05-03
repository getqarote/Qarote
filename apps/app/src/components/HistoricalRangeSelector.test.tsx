// @vitest-environment jsdom
import { I18nextProvider } from "react-i18next";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { describe, expect, it, vi } from "vitest";

import {
  HistoricalRange,
  HistoricalRangeSelector,
} from "./HistoricalRangeSelector";

const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  ns: ["common"],
  defaultNS: "common",
  resources: {
    en: {
      common: {
        pro: "Pro",
        proPlanRequired: "Pro plan required",
      },
    },
  },
});

function renderSelector(props: {
  value?: HistoricalRange;
  maxRangeHours: number;
  onValueChange?: (v: HistoricalRange) => void;
}) {
  const onChange = props.onValueChange ?? vi.fn();
  return {
    onChange,
    ...render(
      <I18nextProvider i18n={i18n}>
        <HistoricalRangeSelector
          value={props.value ?? 6}
          maxRangeHours={props.maxRangeHours}
          onValueChange={onChange}
        />
      </I18nextProvider>
    ),
  };
}

describe("<HistoricalRangeSelector>", () => {
  it("FREE plan (max=6h): only the 6h option is selectable", async () => {
    const user = userEvent.setup();
    renderSelector({ maxRangeHours: 6 });

    await user.click(screen.getByRole("combobox"));

    // Each higher-tier option should be present (not hidden) but
    // disabled with the "Pro" badge — users see the upgrade surface
    // area. Assert via `aria-disabled` since that is what assistive
    // tech actually consumes.
    for (const label of ["24h", "3d", "7d", "30d"]) {
      const opt = screen.getByRole("option", { name: new RegExp(label) });
      expect(opt).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("option", { name: /6h/ })).not.toHaveAttribute(
      "aria-disabled"
    );
    // Four blocked options of the five total: 24h / 3d / 7d / 30d.
    expect(screen.getAllByText("Pro")).toHaveLength(4);
  });

  it("DEVELOPER plan (max=168h): unlocks up to 7d, 30d still blocked", async () => {
    const user = userEvent.setup();
    renderSelector({ maxRangeHours: 168 });

    await user.click(screen.getByRole("combobox"));

    for (const label of ["6h", "24h", "3d", "7d"]) {
      expect(
        screen.getByRole("option", { name: new RegExp(label) })
      ).not.toHaveAttribute("aria-disabled");
    }
    expect(screen.getByRole("option", { name: /30d/ })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(screen.getAllByText("Pro")).toHaveLength(1);
  });

  it("ENTERPRISE plan (max=720h): every option is selectable, no Pro badges", async () => {
    const user = userEvent.setup();
    renderSelector({ maxRangeHours: 720 });

    await user.click(screen.getByRole("combobox"));

    for (const label of ["6h", "24h", "3d", "7d", "30d"]) {
      expect(
        screen.getByRole("option", { name: new RegExp(label) })
      ).not.toHaveAttribute("aria-disabled");
    }
    expect(screen.queryAllByText("Pro")).toHaveLength(0);
  });

  it("clamps the value down when maxRangeHours drops below the current selection", () => {
    // Plan-downgrade scenario: user had 7d selected; their plan ratchets
    // back to FREE (max=6h). Without the effect-driven clamp, the trigger
    // would silently display an out-of-range selection.
    const onChange = vi.fn();
    const { rerender } = render(
      <I18nextProvider i18n={i18n}>
        <HistoricalRangeSelector
          value={168}
          maxRangeHours={168}
          onValueChange={onChange}
        />
      </I18nextProvider>
    );
    rerender(
      <I18nextProvider i18n={i18n}>
        <HistoricalRangeSelector
          value={168}
          maxRangeHours={6}
          onValueChange={onChange}
        />
      </I18nextProvider>
    );
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("invokes onValueChange when an enabled option is selected", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelector({ maxRangeHours: 168, value: 6 });

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: /7d/ }));

    expect(onChange).toHaveBeenCalledWith(168);
  });

  it("does not invoke onValueChange when a blocked option is clicked", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSelector({ maxRangeHours: 6, value: 6 });

    await user.click(screen.getByRole("combobox"));
    // Disabled SelectItem in shadcn shouldn't trigger onValueChange — and
    // even if it did, the component-internal guard (next > maxRangeHours)
    // would short-circuit. The combination protects the histogram query.
    await user.click(screen.getByRole("option", { name: /30d/ }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
