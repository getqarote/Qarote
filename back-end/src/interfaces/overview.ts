import { RabbitMQOverview } from "./rabbitmq";

/**
 * Warning information type for plan validation responses
 */
export type WarningInfo = {
  isOverLimit: boolean;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: string | null;
  warningShown: boolean | null;
};

export interface OverviewResponse {
  overview: RabbitMQOverview;
  warning?: WarningInfo;
}
