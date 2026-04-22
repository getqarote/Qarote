import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { queryClient } from "@/lib/queryClient";
import { SentryErrorBoundary, withSentryProfiling } from "@/lib/sentry";
import { TRPCProvider } from "@/lib/trpc/provider";

import { ConfusedRabbit } from "@/components/ConfusedRabbit";
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

import i18n from "@/i18n";

// Lazy load all pages
const Index = lazy(() => import("./pages/Index"));
const Queues = lazy(() => import("./pages/Queues"));
const QueueDetail = lazy(() => import("./pages/QueueDetail"));
const Channels = lazy(() => import("./pages/Channels"));
const Connections = lazy(() => import("./pages/Connections"));
const Exchanges = lazy(() => import("./pages/Exchanges"));
const Topology = lazy(() => import("./pages/Topology"));
const Nodes = lazy(() => import("./pages/Nodes"));
const VHosts = lazy(() => import("./pages/VHostsPage"));
const VHostDetails = lazy(() => import("./pages/VHostDetailsPage"));
const Users = lazy(() => import("./pages/UsersPage"));
const UserDetails = lazy(() => import("./pages/UserDetailsPage"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Settings = lazy(() => import("./pages/Settings"));
const ProfileSection = lazy(() =>
  import("./pages/settings/ProfileSection").then((m) => ({
    default: m.default,
  }))
);
const AppearanceSection = lazy(() =>
  import("./pages/settings/AppearanceSection").then((m) => ({
    default: m.default,
  }))
);
const WorkspaceSection = lazy(() =>
  import("./pages/settings/WorkspaceSection").then((m) => ({
    default: m.default,
  }))
);
const MembersSection = lazy(() =>
  import("./pages/settings/TeamSection").then((m) => ({
    default: m.default,
  }))
);
const LicenseSection = lazy(() =>
  import("./pages/settings/LicenseSection").then((m) => ({
    default: m.default,
  }))
);
const SSOSection = lazy(() =>
  import("./pages/settings/SSOSection").then((m) => ({
    default: m.default,
  }))
);
const SMTPSection = lazy(() =>
  import("./pages/settings/SMTPSection").then((m) => ({
    default: m.default,
  }))
);
const FeedbackSection = lazy(() =>
  import("./pages/settings/FeedbackSection").then((m) => ({
    default: m.default,
  }))
);
const OrganizationSection = lazy(() =>
  import("./pages/settings/OrganizationSection").then((m) => ({
    default: m.default,
  }))
);
const SubscriptionSection = lazy(() =>
  import("./pages/settings/SubscriptionSection").then((m) => ({
    default: m.default,
  }))
);
const Policies = lazy(() => import("./pages/Policies"));
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
const AcceptOrgInvitation = lazy(() => import("./pages/AcceptOrgInvitation"));
const SSOCallback = lazy(() => import("./pages/SSOCallback"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Definitions = lazy(() => import("./pages/Definitions"));
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
                    <BrowserRouter>
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
                            path="/auth/sso/callback"
                            element={<SSOCallback />}
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
                          {/* org-invite is NOT wrapped in PublicRoute because
                              PublicRoute redirects authenticated users to "/".
                              This page must work for both authenticated and
                              unauthenticated users (dual-mode acceptance). */}
                          <Route
                            path="/org-invite/:token"
                            element={<AcceptOrgInvitation />}
                          />

                          {/* Protected routes */}
                          <Route
                            path="/onboarding"
                            element={
                              <ProtectedRoute>
                                <Onboarding />
                              </ProtectedRoute>
                            }
                          />
                          {/* Legacy redirect: /workspace → /onboarding */}
                          <Route
                            path="/workspace"
                            element={
                              <ProtectedRoute>
                                <Navigate to="/onboarding" replace />
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
                            path="/policies"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <Policies />
                                </Layout>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/topology"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <Topology />
                                </Layout>
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/definitions"
                            element={
                              <ProtectedRoute>
                                <Layout>
                                  <Definitions />
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
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            }
                          >
                            <Route
                              index
                              element={
                                <Navigate to="/settings/profile" replace />
                              }
                            />
                            <Route
                              path="profile"
                              element={<ProfileSection />}
                            />
                            <Route
                              path="appearance"
                              element={<AppearanceSection />}
                            />
                            <Route
                              path="workspace"
                              element={<WorkspaceSection />}
                            />
                            <Route
                              path="members"
                              element={<MembersSection />}
                            />
                            {/* Redirects for old routes */}
                            <Route
                              path="plans"
                              element={
                                <Navigate to="/settings/subscription" replace />
                              }
                            />
                            <Route
                              path="team"
                              element={
                                <Navigate to="/settings/members" replace />
                              }
                            />
                            <Route
                              path="license"
                              element={<LicenseSection />}
                            />
                            <Route
                              path="organization"
                              element={<OrganizationSection />}
                            />
                            <Route
                              path="subscription"
                              element={<SubscriptionSection />}
                            />
                            <Route
                              path="subscription/billing"
                              element={<Billing />}
                            />
                            <Route
                              path="billing"
                              element={
                                <Navigate
                                  to="/settings/subscription/billing"
                                  replace
                                />
                              }
                            />
                            <Route path="sso" element={<SSOSection />} />
                            <Route path="smtp" element={<SMTPSection />} />
                            <Route
                              path="feedback"
                              element={<FeedbackSection />}
                            />
                          </Route>
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
                              <Navigate
                                to="/settings/subscription/billing"
                                replace
                              />
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

// Safe i18n helper for error boundary - falls back to English if i18n isn't ready
const t = (key: string, fallback: string) => {
  const result = i18n.t(key);
  const bareKey = key.includes(":") ? key.split(":")[1] : key;
  return result === key || result === bareKey ? fallback : result;
};

// Wrap the app with Sentry error boundary and profiling
const App = withSentryProfiling(
  SentryErrorBoundary(AppCore, {
    fallback: ({ resetError }) => (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <ConfusedRabbit />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">
              {t("common:error", "Error")}
            </h1>
            <p className="text-muted-foreground">
              {t(
                "common:errorDescription",
                "Something went wrong. Please try again."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={resetError}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("common:tryAgain", "Try again")}
          </button>
          <p className="text-sm text-muted-foreground/70">
            {t(
              "common:errorContactSupport",
              "If the problem persists, contact us at"
            )}{" "}
            <a
              href="mailto:support@qarote.io"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              support@qarote.io
            </a>
          </p>
        </div>
      </div>
    ),
    showDialog: false,
  })
);

export default App;
