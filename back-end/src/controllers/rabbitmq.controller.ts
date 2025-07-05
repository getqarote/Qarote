import { Hono } from "hono";
import { authenticate } from "@/core/auth";
import overviewController from "./rabbitmq/overview.controller";
import queuesController from "./rabbitmq/queues.controller";
import messagesController from "./rabbitmq/messages.controller";
import metricsController from "./rabbitmq/metrics.controller";
import infrastructureController from "./rabbitmq/infrastructure.controller";
import memoryController from "./rabbitmq/memory.controller";
import adminController from "./rabbitmq/admin.controller";
import { planValidationMiddleware } from "@/middlewares/plan-validation";

const rabbitmqController = new Hono();

// All RabbitMQ routes require authentication
rabbitmqController.use("*", authenticate);
adminController.use("*", planValidationMiddleware());

// Mount all the sub-controllers directly
rabbitmqController.route("/", overviewController);
rabbitmqController.route("/", queuesController);
rabbitmqController.route("/", messagesController);
rabbitmqController.route("/", metricsController);
rabbitmqController.route("/", infrastructureController);
rabbitmqController.route("/", memoryController);
rabbitmqController.route("/", adminController);

export default rabbitmqController;
