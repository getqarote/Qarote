import React, { useCallback, useEffect, useReducer, useRef } from "react";

import { User } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { logger } from "@/lib/logger";
import { setSentryUser } from "@/lib/sentry";
import { trpc } from "@/lib/trpc/client";

import { AuthContext, AuthContextType } from "./AuthContextDefinition";

interface AuthProviderProps {
  children: React.ReactNode;
}

type AuthState = { user: User | null; isLoading: boolean };
type AuthAction =
  | { type: "SET_USER"; user: User }
  | { type: "CLEAR_USER" }
  | { type: "LOADED" };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_USER":
      return { user: action.user, isLoading: false };
    case "CLEAR_USER":
      return { user: null, isLoading: false };
    case "LOADED":
      return { ...state, isLoading: false };
  }
}

function syncSentryUser(user: User | null) {
  setSentryUser(
    user
      ? { id: user.id, workspaceId: user.workspaceId, email: user.email }
      : null
  );
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [{ user, isLoading }, dispatch] = useReducer(authReducer, {
    user: null,
    isLoading: true,
  });
  const utils = trpc.useUtils();
  // Track whether initial session check is complete to prevent the global
  // unauthorized handler from clearing auth state during the check (race condition).
  const initialCheckDone = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession();
        if (session.data?.user) {
          // Fetch enriched user data via tRPC (includes subscription, workspace, etc.)
          try {
            const response = await utils.auth.session.getSession.fetch();
            const enrichedUser = {
              ...response.user,
              workspaceId: response.user.workspace?.id,
            };
            dispatch({ type: "SET_USER", user: enrichedUser });
            syncSentryUser(enrichedUser);
          } catch {
            // tRPC call failed but we have a valid session — use basic user data
            logger.warn("Failed to fetch enriched session, using basic data");
            const baUser = session.data.user;
            const basicUser = {
              id: baUser.id,
              email: baUser.email,
              name: baUser.name || "",
            } as User;
            dispatch({ type: "SET_USER", user: basicUser });
            syncSentryUser(basicUser);
          }
        } else {
          dispatch({ type: "LOADED" });
        }
      } catch (error) {
        logger.error("Failed to check session:", error);
        dispatch({ type: "LOADED" });
      } finally {
        initialCheckDone.current = true;
      }
    };

    checkSession();
  }, [utils]);

  const login = useCallback((newUser: User) => {
    dispatch({ type: "SET_USER", user: newUser });
    syncSentryUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      logger.error("Failed to sign out:", error);
    }
    dispatch({ type: "CLEAR_USER" });
    syncSentryUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      // Skip during initial session check — the checkSession catch block handles
      // UNAUTHORIZED errors gracefully (falls back to basic user data).
      // Without this guard, the unauthorizedLink fires CLEAR_USER before the
      // catch can recover, causing a premature redirect to sign-in.
      if (!initialCheckDone.current) return;

      dispatch({ type: "CLEAR_USER" });
      syncSentryUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  const updateUser = useCallback((newUser: User) => {
    dispatch({ type: "SET_USER", user: newUser });
    syncSentryUser(newUser);
  }, []);

  const refetchUser = useCallback(async () => {
    try {
      const response = await utils.auth.session.getSession.fetch();
      const updatedUser = {
        ...response.user,
        workspaceId: response.user.workspace?.id,
      };
      dispatch({ type: "SET_USER", user: updatedUser });
      syncSentryUser(updatedUser);
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
