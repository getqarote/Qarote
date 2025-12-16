import React, { useCallback, useEffect, useState } from "react";

import { User } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { logger } from "@/lib/logger";
import { setSentryUser } from "@/lib/sentry";

import { AuthContext, AuthContextType } from "./AuthContextDefinition";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);

        // Set Sentry user context when restoring auth
        setSentryUser({
          id: parsedUser.id,
          workspaceId: parsedUser.workspaceId,
          email: parsedUser.email,
        });
      } catch (error) {
        logger.error("Failed to parse stored user data:", error);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    // console.log("newUser", newUser);
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auth_token", newToken);
    localStorage.setItem("auth_user", JSON.stringify(newUser));

    // Set Sentry user context on login
    setSentryUser({
      id: newUser.id,
      workspaceId: newUser.workspaceId,
      email: newUser.email,
    });
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }, []);

  useEffect(() => {
    // Listen for 401 unauthorized events from API client
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [logout]);

  const updateUser = (newUser: User) => {
    setUser(newUser);
    // console.log("updateUser newUser", newUser);
    localStorage.setItem("auth_user", JSON.stringify(newUser));

    // Update Sentry user context
    setSentryUser({
      id: newUser.id,
      workspaceId: newUser.workspaceId,
      email: newUser.email,
    });
  };

  const refetchUser = useCallback(async () => {
    if (!token) return;

    try {
      // Get workspace from user's workspaceId or from workspace context
      const storedUser = localStorage.getItem("auth_user");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      const workspaceId = parsedUser?.workspaceId || parsedUser?.workspace?.id;

      if (!workspaceId) {
        logger.warn("Cannot refetch user: no workspace ID available");
        return;
      }

      const response = await apiClient.getProfile(workspaceId);
      const updatedUser = response.profile;
      // Ensure workspaceId is set from workspace object if not directly available
      updatedUser.workspaceId = updatedUser.workspace?.id;
      setUser(updatedUser);
      localStorage.setItem("auth_user", JSON.stringify(updatedUser));

      // Update Sentry user context
      setSentryUser({
        id: updatedUser.id,
        workspaceId: updatedUser.workspaceId,
        email: updatedUser.email,
      });
    } catch (error) {
      logger.error("Failed to refetch user data:", error);
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
