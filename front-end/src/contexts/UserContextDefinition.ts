import { createContext } from "react";
import type { CurrentPlanResponse, User } from "@/lib/api";
import { UserPlan } from "@/types/plans";

interface UserContextType {
  user: User;
  isLoading: boolean;
  planData: CurrentPlanResponse | null;
  planError: string | null;
  refetchPlan: () => Promise<void>;
  userPlan: UserPlan;
  // Convenience getters for common plan operations
  canAddServer: boolean;
  canAddQueue: boolean;
  canSendMessages: boolean;
  canAddExchange: boolean;
  canAddVirtualHost: boolean;
  canAddRabbitMQUser: boolean;
  canManageQueues: boolean;
  canConfigureAlerts: boolean;
  canCreateWorkspace: boolean;
  approachingLimits: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined
);

export type { UserContextType };
