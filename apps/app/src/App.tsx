import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { queryClient } from "@/lib/queryClient";
import { SentryErrorBoundary, withSentryProfiling } from "@/lib/sentry";
import { TRPCProvider } from "@/lib/trpc/provider";

import { Layout } from "@/components/Layout";
import { PageLoader } from "@/components/PageLoader";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PublicRoute } from "@/components/PublicRoute";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TawkTo } from "@/components/TawkTo";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "@/contexts/AuthContext";
import { ServerProvider } from "@/contexts/ServerContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { VHostProvider } from "@/contexts/VHostContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Queues = lazy(() => import("./pages/Queues"));
const QueueDetail = lazy(() => import("./pages/QueueDetail"));
const Connections = lazy(() => import("./pages/Connections"));
const Exchanges = lazy(() => import("./pages/Exchanges"));
const Nodes = lazy(() => import("./pages/Nodes"));
const VHosts = lazy(() => import("./pages/VHostsPage"));
const VHostDetails = lazy(() => import("./pages/VHostDetailsPage"));
const Users = lazy(() => import("./pages/UsersPage"));
const UserDetails = lazy(() => import("./pages/UserDetailsPage"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Profile = lazy(() => import("./pages/Profile"));
const Plans = lazy(() => import("./pages/Plans"));
const Billing = lazy(() => import("./pages/Billing"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("./pages/PaymentCancelled"));
const TermsOfService = lazy(() => import("./pages/public/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/public/PrivacyPolicy"));
const HelpSupport = lazy(() => import("./pages/HelpSupport"));
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const Workspace = lazy(() => import("./pages/Workspace"));
const NotFound = lazy(() => import("./pages/NotFound"));

const AppCore = () => (
  <TRPCProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <UserProvider>
            <WorkspaceProvider>
              <ServerProvider>
                <VHostProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <BrowserRouter
                      future={{
                        v7_startTransition: true,
                        v7_relativeSplatPath: true,
                      }}
                    >
                      <TawkTo />
                      <ScrollToTop />
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
                          <Route
                            path="/verify-email"
                            element={<VerifyEmail />}
                          />
                          <Route
                            path="/terms-of-service"
                            element={<TermsOfService />}
                          />
                          <Route
                            path="/privacy-policy"
                            element={<PrivacyPolicy />}
                          />
                          <Route
                            path="/forgot-password"
                            element={
                              <PublicRoute>
                                <ForgotPassword />
                              </PublicRoute>
                            }
                          />
                          <Route
                            path="/reset-password"
                            element={
                              <PublicRoute>
                                <ResetPassword />
                              </PublicRoute>
                            }
                          />
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
                            path="/workspace"
                            element={
                              <ProtectedRoute>
                                <Workspace />
                              </ProtectedRoute>
                            }
                          />
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
                            path="/vhosts"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <VHosts />
                                </Layout>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/vhosts/:vhostName"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <VHostDetails />
                                </Layout>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/users"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <Users />
                                </Layout>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/users/:username"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <UserDetails />
                                </Layout>
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
                            path="/billing"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <Billing />
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
                            path="/help"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <HelpSupport />
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
                </VHostProvider>
              </ServerProvider>
            </WorkspaceProvider>
          </UserProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </TRPCProvider>
);

// Wrap the app with Sentry error boundary and profiling
const App = withSentryProfiling(
  SentryErrorBoundary(AppCore, {
    fallback: ({ resetError }) => (
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
