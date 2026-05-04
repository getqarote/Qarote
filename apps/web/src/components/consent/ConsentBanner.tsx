import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { CONSENT_EVENT, shouldShowBanner, writeConsent } from "@/lib/consent";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

/** @public — mounted from BaseLayout.astro; knip cannot trace .astro imports */
export const ConsentBanner = ({
  privacyHref = "/privacy-policy/#cookies",
}: {
  privacyHref?: string;
}) => {
  const { t } = useTranslation("common");
  const [visible, setVisible] = useState(shouldShowBanner);
  const [leaving, setLeaving] = useState(false);
  const isDismissingRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onChange = () => setVisible(shouldShowBanner());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  // Clear any in-flight dismiss timer on unmount so writeConsent and
  // CONSENT_EVENT dispatch cannot fire after the component is gone.
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const dismiss = useCallback((accepted: boolean) => {
    if (isDismissingRef.current) return;
    isDismissingRef.current = true;
    setLeaving(true);
    dismissTimerRef.current = setTimeout(() => {
      dismissTimerRef.current = null;
      writeConsent(accepted);
      setVisible(false);
      setLeaving(false);
      isDismissingRef.current = false;
    }, 220);
  }, []);

  // Escape → reject (keyboard users, multi-tab incident scenario)
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="false"
      aria-label={t("consent.ariaLabel")}
      className={cn(
        "fixed bottom-0 left-0 z-50 p-4 sm:p-6",
        !leaving
          ? "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
          : "motion-safe:animate-out motion-safe:slide-out-to-bottom-4 motion-safe:duration-200 pointer-events-none"
      )}
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-lg sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1 text-sm text-muted-foreground">
            <h2 className="mb-2 text-sm font-semibold leading-snug text-foreground">
              {t("consent.title")}
            </h2>
            <p>
              {t("consent.description")}{" "}
              <a
                href={privacyHref}
                className="underline underline-offset-2 transition-colors hover:text-foreground"
              >
                {t("consent.learnMore")}
              </a>
              .
            </p>
          </div>
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              size="pillSm"
              onClick={() => dismiss(false)}
              type="button"
            >
              {t("consent.essentialOnly")}
            </Button>
            <Button
              variant="default"
              size="pillSm"
              onClick={() => dismiss(true)}
              type="button"
            >
              {t("consent.acceptAll")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
