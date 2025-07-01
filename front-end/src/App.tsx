import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ServerProvider } from "@/contexts/ServerContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PublicRoute from "@/components/PublicRoute";
import { PageLoader } from "@/components/PageLoader";
import { ConsentBanner } from "@/components/PrivacyNotice";
import { Layout } from "@/components/Layout";
import { SentryErrorBoundary, withSentryProfiling } from "@/lib/sentry";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Queues = lazy(() => import("./pages/Queues"));
const QueueDetail = lazy(() => import("./pages/QueueDetail"));
const Messages = lazy(() => import("./pages/Messages"));
const Connections = lazy(() => import("./pages/Connections"));
const Exchanges = lazy(() => import("./pages/Exchanges"));
const Channels = lazy(() => import("./pages/Channels"));
const Nodes = lazy(() => import("./pages/Nodes"));
const Routing = lazy(() => import("./pages/Routing"));
const Logs = lazy(() => import("./pages/Logs"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Profile = lazy(() => import("./pages/Profile"));
const Plans = lazy(() => import("./pages/Plans"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const PrivacySettings = lazy(() => import("./pages/PrivacySettings"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const AppCore = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <WorkspaceProvider>
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
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route
                    path="/invite/:token"
                    element={
                      <PublicRoute>
                        <AcceptInvitation />
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
                    path="/nodes"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Nodes />
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
                    path="/plans"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <Plans />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment/success"
                    element={
                      <ProtectedRoute>
                        <PaymentSuccess />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/payment/cancelled"
                    element={
                      <ProtectedRoute>
                        <PaymentCancelled />
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
                  <Route
                    path="/help"
                    element={
                      <ProtectedRoute>
                        <Layout>
                          <HelpSupport />
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminDashboard />
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
      </WorkspaceProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Wrap the app with Sentry error boundary and profiling
const App = withSentryProfiling(
  SentryErrorBoundary(AppCore, {
    fallback: ({ error, resetError }) => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">
            Something went wrong
          </h1>
          <p className="text-muted-foreground">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    ),
    showDialog: false,
  })
);

export default App;
