import { WorkspacePlan } from "@prisma/client";
import { RabbitMQQueue } from "./rabbitmq";

export interface QueueLimitWarning {
  isOverLimit: true;
  message: string;
  currentQueueCount: number;
  queueCountAtConnect: number | null;
  upgradeRecommendation: string;
  recommendedPlan: WorkspacePlan | null;
  warningShown: boolean | null;
}

export interface QueuesResponse {
  queues: RabbitMQQueue[];
  warning?: QueueLimitWarning;
}

export interface SingleQueueResponse {
  queue: RabbitMQQueue;
}

export interface QueueConsumersResponse {
  success: true;
  consumers: any[]; // TODO: Define proper consumer interface when available
  totalConsumers: number;
  queueName: string;
}

export interface QueueCreationResponse {
  success: true;
  message: string;
  queue: any; // TODO: Define proper queue creation result interface
}

export interface QueuePurgeResponse {
  success: true;
  message: string;
  purged: number;
}
