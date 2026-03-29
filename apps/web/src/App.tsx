import { lazy, Suspense, useEffect } from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router";

import { LocaleWrapper } from "@/components/LocaleWrapper";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Index from "./pages/Index";

const Changelog = lazy(() => import("./pages/Changelog"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const TawkTo = lazy(() =>
  import("@/components/TawkTo").then((m) => ({ default: m.TawkTo }))
);

const queryClient = new QueryClient();

const App = () => {
  // Track page views for analytics
  useEffect(() => {
    // Send page view to Google Analytics when the app loads
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={null}>
              <Routes>
                {/* English routes at root (no prefix, backward compatible) */}
                <Route path="/" element={<Index />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/changelog" element={<Changelog />} />

                {/* Localized routes: /:locale/ prefix (e.g., /fr/, /es/, /zh/) */}
                <Route path="/:locale" element={<LocaleWrapper />}>
                  <Route index element={<Index />} />
                  <Route path="privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="terms-of-service" element={<TermsOfService />} />
                  <Route path="changelog" element={<Changelog />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <TawkTo />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
