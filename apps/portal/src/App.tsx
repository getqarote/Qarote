import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { queryClient } from "@/lib/queryClient";
import { TRPCProvider } from "@/lib/trpc/provider";

import Layout from "@/components/Layout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import AccountSettings from "@/pages/AccountSettings";
import Downloads from "@/pages/Downloads";
import LicenseManagement from "@/pages/LicenseManagement";
import LicensePurchase from "@/pages/LicensePurchase";
import Login from "@/pages/Login";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import SignUp from "@/pages/SignUp";
import TermsOfService from "@/pages/TermsOfService";
import VerifyEmail from "@/pages/VerifyEmail";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
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
          <Sonner />
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <Routes>
              {/* Redirect old /login route to new /auth/sign-in for backward compatibility */}
              <Route
                path="/login"
                element={<Navigate to="/auth/sign-in" replace />}
              />
              <Route path="/auth/sign-in" element={<Login />} />
              <Route path="/auth/sign-up" element={<SignUp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
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
                <Route path="downloads" element={<Downloads />} />
                <Route path="settings" element={<AccountSettings />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </TRPCProvider>
  );
};

export default App;
