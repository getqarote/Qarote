import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ServerProvider } from "@/contexts/ServerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import { PageLoader } from "@/components/PageLoader";
import { ConsentBanner } from "@/components/PrivacyNotice";
import { Layout } from "@/components/Layout";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Queues = lazy(() => import("./pages/Queues"));
const QueueDetail = lazy(() => import("./pages/QueueDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const Connections = lazy(() => import("./pages/Connections"));
const Exchanges = lazy(() => import("./pages/Exchanges"));
const Channels = lazy(() => import("./pages/Channels"));
const Routing = lazy(() => import("./pages/Routing"));
const Logs = lazy(() => import("./pages/Logs"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Profile = lazy(() => import("./pages/Profile"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ServerProvider>
        <TooltipProvider>
          <ConsentBanner />
          <Toaster />
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public authentication routes */}
                <Route
                  path="/auth/sign-in"
                  element={
                    <PublicRoute>
                      <SignIn />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/auth/sign-up"
                  element={
                    <PublicRoute>
                      <SignUp />
                    </PublicRoute>
                  }
                />

                {/* Protected routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Index />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/queues"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Queues />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/queues/:queueName"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <QueueDetail />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/messages"
                  element={
                    <ProtectedRoute>
                      <Messages />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/connections"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Connections />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/exchanges"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Exchanges />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/routing"
                  element={
                    <ProtectedRoute>
                      <Routing />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/channels"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Channels />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/logs"
                  element={
                    <ProtectedRoute>
                      <Logs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Alerts />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Profile />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/privacy-settings"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <PrivacySettings />
                      </Layout>
                    </ProtectedRoute>
                  }
                />

                {/* Protected 404 route - catches all other paths */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <NotFound />
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ServerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
