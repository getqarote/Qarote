import { lazy, Suspense, useEffect, useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Index loaded eagerly as it's the main landing page
import Index from "./pages/Index";

// Lazy load secondary pages for better initial load performance
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));

// Lazy load TawkTo to not block initial render
const TawkTo = lazy(() =>
  import("@/components/TawkTo").then((mod) => ({ default: mod.TawkTo }))
);

// Deferred component that waits for browser idle time
const DeferredTawkTo = () => {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Wait for browser to be idle, then delay further to prioritize LCP
    const loadTawkTo = () => {
      setTimeout(() => setShouldLoad(true), 3000); // 3s delay after idle
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(loadTawkTo, { timeout: 5000 });
    } else {
      // Fallback for Safari
      setTimeout(loadTawkTo, 2000);
    }
  }, []);

  if (!shouldLoad) return null;

  return (
    <Suspense fallback={null}>
      <TawkTo />
    </Suspense>
  );
};

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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route
                path="/privacy-policy"
                element={
                  <Suspense fallback={null}>
                    <PrivacyPolicy />
                  </Suspense>
                }
              />
              <Route
                path="/terms-of-service"
                element={
                  <Suspense fallback={null}>
                    <TermsOfService />
                  </Suspense>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route
                path="*"
                element={
                  <Suspense fallback={null}>
                    <NotFound />
                  </Suspense>
                }
              />
            </Routes>
            {/* TawkTo deferred to not impact LCP - loads after 3s idle */}
            <DeferredTawkTo />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
