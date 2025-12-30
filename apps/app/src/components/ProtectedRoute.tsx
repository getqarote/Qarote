import React from "react";
import { Navigate, useLocation } from "react-router-dom";

import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContextDefinition";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-page">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          <p className="text-orange-600/80 text-sm">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated, preserving the current location
  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" state={{ from: location }} replace />;
  }

  // Render the protected content with email verification banner
  return <>{children}</>;
};
