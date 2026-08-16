import type { SupportedLocale } from "@qarote/i18n";

import { IslandProvider } from "@/components/IslandProvider";
import FooterSection from "@/components/landing/FooterSection";

interface FooterIslandProps {
  locale?: string;
  resources?: Record<string, Record<string, unknown>>;
}

/**
 * Island wrapper for the shared marketing {@link FooterSection} so non-landing
 * pages (blog, etc.) can render the same footer. Supplies the i18n context the
 * footer's `useTranslation("landing")` needs.
 */
export default function FooterIsland({
  locale = "en",
  resources,
}: FooterIslandProps) {
  return (
    <IslandProvider locale={locale} resources={resources}>
      <FooterSection currentLocale={locale as SupportedLocale} />
    </IslandProvider>
  );
}
