import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { getI18n } from "@/lib/i18n-client";

import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

/**
 * Shared provider wrapper for React islands in Astro pages.
 * Provides i18next, React Query, and Radix Tooltip context.
 *
 * When `resources` are provided (serialized from Astro build-time),
 * i18n initializes synchronously — no flash of translation keys.
 */
export function IslandProvider({
  locale = "en",
  resources,
  children,
}: {
  locale?: string;
  resources?: Record<string, Record<string, unknown>>;
  children: React.ReactNode;
}) {
  const i18n = getI18n(locale, resources);

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense>{children}</Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
