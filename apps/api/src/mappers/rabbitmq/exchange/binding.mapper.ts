import type { RabbitMQBinding } from "@/core/rabbitmq/rabbitmq.interfaces";

import type { BindingResponse } from "./exchange.interfaces";

/**
 * Mapper for transforming RabbitMQBinding to BindingResponse
 */
export class BindingMapper {
  /**
   * Map a single RabbitMQBinding to BindingResponse
   */
  static toApiResponse(binding: RabbitMQBinding): BindingResponse {
    return {
      source: binding.source,
      vhost: binding.vhost,
      destination: binding.destination,
      destination_type: binding.destination_type,
      routing_key: binding.routing_key,
      arguments: binding.arguments,
      properties_key: binding.properties_key,
    };
  }

  /**
   * Map an array of RabbitMQBinding to BindingResponse[]
   */
  static toApiResponseArray(bindings: RabbitMQBinding[]): BindingResponse[] {
    return bindings.map(this.toApiResponse);
  }
}

