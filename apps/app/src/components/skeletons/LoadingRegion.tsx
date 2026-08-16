import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface LoadingRegionProps {
  children: ReactNode;
}

/**
 * a11y wrapper for skeleton surfaces. Marks the region `aria-busy` and exposes
 * a polite live status with a single visually-hidden "Loading…" announcement
 * (`common:srLoading`) so assistive tech reports the wait without sighted users
 * seeing duplicate text. The decorative skeleton shapes inside carry their own
 * `aria-hidden`, so the region announces exactly once. Mirrors the prototype
 * `SkLoading`.
 */
export function LoadingRegion({ children }: LoadingRegionProps) {
  const { t } = useTranslation("common");
  return (
    <div aria-busy="true" role="status" aria-live="polite">
      <span className="sr-only">{t("srLoading")}</span>
      {children}
    </div>
  );
}
