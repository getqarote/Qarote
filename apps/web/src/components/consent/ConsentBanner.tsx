import { useEffect, useState } from "react";

import { CONSENT_EVENT, shouldShowBanner, writeConsent } from "@/lib/consent";

import { Button } from "@/components/ui/button";

/** @public — mounted from BaseLayout.astro; knip cannot trace .astro imports */
export const ConsentBanner = ({
  privacyHref = "/privacy-policy/#cookies",
}: {
  privacyHref?: string;
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowBanner());
    const onChange = () => setVisible(shouldShowBanner());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!visible) return null;

  const accept = () => {
    writeConsent(true);
    setVisible(false);
  };

  const reject = () => {
    writeConsent(false);
    setVisible(false);
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 sm:px-6 sm:pb-6 motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300"
    >
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-background p-5 shadow-lg sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex-1 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">
              We use tracking technologies
            </p>
            <p>
              We use PostHog (analytics + session replay), Google Tag Manager,
              and TawkTo (chat) to understand how Qarote is used and to provide
              support. Choose what you allow.{" "}
              <a
                href={privacyHref}
                className="underline underline-offset-2 hover:text-foreground"
              >
                Learn more
              </a>
              .
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="pillSm"
              onClick={reject}
              type="button"
            >
              Reject all
            </Button>
            <Button
              variant="outline"
              size="pillSm"
              onClick={accept}
              type="button"
            >
              Accept all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
