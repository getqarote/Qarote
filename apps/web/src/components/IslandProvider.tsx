import { Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import i18n from "@/lib/i18n-client";

import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

/**
 * Shared provider wrapper for React islands in Astro pages.
 * Provides i18next, React Query, and Radix Tooltip context.
 */
export function IslandProvider({
  locale = "en",
  children,
}: {
  locale?: string;
  children: React.ReactNode;
}) {
  // Sync i18n language with the page locale
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }

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
