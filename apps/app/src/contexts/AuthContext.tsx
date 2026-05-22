import React, { useCallback, useEffect, useReducer, useRef } from "react";

import {
  identify as identifyAnalytics,
  resetIdentity,
  setSuperProperties,
  setWorkspaceGroup,
} from "@/lib/analytics";
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

function syncAnalyticsUser(user: User): void {
  setSuperProperties({ workspace_id: user.workspaceId ?? undefined });
  // We deliberately omit `planTier` — the SPA doesn't have it on the typed
  // `User` shape (only the API-side mapper holds the subscription plan). The
  // backend already `$set`s the real plan tier on identify; reasserting "free"
  // here would misclassify paid users.
  identifyAnalytics({
    id: user.id,
    email: user.email,
    workspaceId: user.workspaceId ?? undefined,
    signupAt: user.createdAt,
  });
  if (user.workspaceId) {
    setWorkspaceGroup(user.workspaceId);
  }
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
  // Avoid re-firing identify on every TanStack Query refetch (the user object
  // gets a fresh reference but the same identity).
  const lastIdentifyKey = useRef<string | null>(null);

  const identifyIfChanged = useCallback((u: User) => {
    const key = `${u.id}|${u.email}|${u.workspaceId ?? ""}`;
    if (lastIdentifyKey.current === key) return;
    lastIdentifyKey.current = key;
    syncAnalyticsUser(u);
  }, []);

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
            identifyIfChanged(enrichedUser);
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
            identifyIfChanged(basicUser);
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
  }, [utils, identifyIfChanged]);

  const login = useCallback(
    (newUser: User) => {
      dispatch({ type: "SET_USER", user: newUser });
      syncSentryUser(newUser);
      identifyIfChanged(newUser);
    },
    [identifyIfChanged]
  );

  const logout = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      logger.error("Failed to sign out:", error);
    }
    dispatch({ type: "CLEAR_USER" });
    syncSentryUser(null);
    resetIdentity();
    lastIdentifyKey.current = null;
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

  const updateUser = useCallback(
    (newUser: User) => {
      dispatch({ type: "SET_USER", user: newUser });
      syncSentryUser(newUser);
      identifyIfChanged(newUser);
    },
    [identifyIfChanged]
  );

  const refetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await utils.auth.session.getSession.fetch();
      const updatedUser = {
        ...response.user,
        workspaceId: response.user.workspace?.id,
      };
      dispatch({ type: "SET_USER", user: updatedUser });
      syncSentryUser(updatedUser);
      return updatedUser;
    } catch (error) {
      logger.error("Failed to refetch user data:", error);
      throw error;
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
