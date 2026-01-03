import type { RabbitMQExchange } from "@/core/rabbitmq/rabbitmq.interfaces";

import type { BindingResponse, ExchangeResponse } from "./exchange.interfaces";

/**
 * Mapper for transforming RabbitMQExchange to ExchangeResponse
 * Only includes fields actually used by the web
 */
export class ExchangeMapper {
  /**
   * Map a single RabbitMQExchange to ExchangeResponse
   * Note: bindings and bindingCount should be added separately if needed
   */
  static toApiResponse(
    exchange: RabbitMQExchange,
    bindings?: BindingResponse[]
  ): ExchangeResponse {
    return {
      name: exchange.name,
      vhost: exchange.vhost,
      type: exchange.type,
      durable: exchange.durable,
      auto_delete: exchange.auto_delete,
      internal: exchange.internal,
      arguments: exchange.arguments,
      policy: exchange.policy ?? null,
      user_who_performed_action: exchange.user_who_performed_action,
      message_stats: exchange.message_stats
        ? {
            publish_in: exchange.message_stats.publish_in,
            publish_out: exchange.message_stats.publish_out,
          }
        : undefined,
      bindingCount: bindings?.length ?? 0,
      bindings: bindings ?? [],
    };
  }

  /**
   * Map an array of RabbitMQExchange to ExchangeResponse[]
   */
  static toApiResponseArray(
    exchanges: RabbitMQExchange[],
    bindingsMap?: Map<string, BindingResponse[]>
  ): ExchangeResponse[] {
    return exchanges.map((exchange) => {
      const exchangeBindings =
        bindingsMap?.get(`${exchange.name}@${exchange.vhost}`) ?? [];
      return this.toApiResponse(exchange, exchangeBindings);
    });
  }
}
