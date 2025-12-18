import type { ConsumerResponse } from "@/types/api";
import type { RabbitMQConsumer } from "@/types/rabbitmq";

/**
 * Mapper for transforming RabbitMQConsumer to ConsumerResponse
 */
export class ConsumerMapper {
  /**
   * Map a single RabbitMQConsumer to ConsumerResponse
   */
  static toApiResponse(consumer: RabbitMQConsumer): ConsumerResponse {
    return {
      consumer_tag: consumer.consumer_tag,
      channel_details: consumer.channel_details,
      queue: consumer.queue,
      ack_required: consumer.ack_required,
      exclusive: consumer.exclusive,
      prefetch_count: consumer.prefetch_count,
      arguments: consumer.arguments,
    };
  }

  /**
   * Map an array of RabbitMQConsumer to ConsumerResponse[]
   */
  static toApiResponseArray(consumers: RabbitMQConsumer[]): ConsumerResponse[] {
    return consumers.map(this.toApiResponse);
  }
}
