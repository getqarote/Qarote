import React, { useCallback, useEffect, useState } from "react";

import { User } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { setSentryUser } from "@/lib/sentry";
import { trpc } from "@/lib/trpc/client";

import { AuthContext, AuthContextType } from "./AuthContextDefinition";

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const utils = trpc.useUtils();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session.data?.user) {
          // Fetch enriched user data via tRPC (includes subscription, workspace, etc.)
          try {
            const response = await utils.auth.session.getSession.fetch();
            const enrichedUser = response.user;
            enrichedUser.workspaceId = enrichedUser.workspace?.id;
            setUser(enrichedUser);

            setSentryUser({
              id: enrichedUser.id,
              workspaceId: enrichedUser.workspaceId,
              email: enrichedUser.email,
            });
          } catch {
            // tRPC call failed but we have a valid session — use basic user data
            logger.warn("Failed to fetch enriched session, using basic data");
          }
        }
      } catch (error) {
        logger.error("Failed to check session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [utils]);

  const login = useCallback((newUser: User) => {
    setUser(newUser);

    setSentryUser({
      id: newUser.id,
      workspaceId: newUser.workspaceId,
      email: newUser.email,
    });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      logger.error("Failed to sign out:", error);
    }
    setUser(null);
  }, []);

  useEffect(() => {
    // Listen for 401 unauthorized events from tRPC link
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const updateUser = useCallback((newUser: User) => {
    setUser(newUser);

    setSentryUser({
      id: newUser.id,
      workspaceId: newUser.workspaceId,
      email: newUser.email,
    });
  }, []);

  const refetchUser = useCallback(async () => {
    try {
      const response = await utils.auth.session.getSession.fetch();
      const updatedUser = response.user;
      updatedUser.workspaceId = updatedUser.workspace?.id;
      setUser(updatedUser);

      setSentryUser({
        id: updatedUser.id,
        workspaceId: updatedUser.workspaceId,
        email: updatedUser.email,
      });
    } catch (error) {
      logger.error("Failed to refetch user data:", error);
    }
  }, [utils]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
    refetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
