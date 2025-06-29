import { Hono } from "hono";
import overviewController from "./overview.controller";
import queuesController from "./queues.controller";
import messagesController from "./messages.controller";
import metricsController from "./metrics.controller";
import infrastructureController from "./infrastructure.controller";
import memoryController from "./memory.controller";
import adminController from "./admin.controller";

const rabbitmqController = new Hono();

// Mount all the sub-controllers
rabbitmqController.route("/", overviewController);
rabbitmqController.route("/", queuesController);
rabbitmqController.route("/", messagesController);
rabbitmqController.route("/", metricsController);
rabbitmqController.route("/", infrastructureController);
rabbitmqController.route("/", memoryController);
rabbitmqController.route("/", adminController);

export default rabbitmqController;
