import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/toaster";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import AccountSettings from "@/pages/AccountSettings";
import Downloads from "@/pages/Downloads";
import LicenseManagement from "@/pages/LicenseManagement";
import LicensePurchase from "@/pages/LicensePurchase";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
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
  );
};

export default App;
