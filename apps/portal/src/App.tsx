import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";

import { queryClient } from "@/lib/queryClient";
import { TRPCProvider } from "@/lib/trpc/provider";

import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import LicenseManagement from "@/pages/LicenseManagement";
import LicensePurchase from "@/pages/LicensePurchase";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import VerifyEmail from "@/pages/VerifyEmail";

function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return null;
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("loading")}</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <TRPCProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              {/* Redirect old routes for backward compatibility */}
              <Route
                path="/login"
                element={<Navigate to="/auth/sign-in" replace />}
              />
              <Route path="/auth/sign-in" element={<Login />} />
              <Route path="/auth/sign-up" element={<SignUp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route
                path="/privacy-policy"
                element={
                  <ExternalRedirect to="https://qarote.io/privacy-policy/" />
                }
              />
              <Route
                path="/terms-of-service"
                element={
                  <ExternalRedirect to="https://qarote.io/terms-of-service/" />
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/licenses" replace />} />
                <Route path="licenses" element={<LicenseManagement />} />
                <Route path="purchase" element={<LicensePurchase />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
};

export default App;
