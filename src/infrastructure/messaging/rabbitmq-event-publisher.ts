import type { Channel } from "amqplib";
import { v7 as uuidV7 } from "uuid";
import type { EventPublisher } from "../../application/ports/event-publisher.js";
import type { DriverAvailabilityChanged } from "../../domain/events/driver-availability-changed.js";
import { LOGISTICS_EXCHANGE } from "./rabbitmq-connection.js";

export class RabbitMqEventPublisher implements EventPublisher {
  constructor(private readonly channel: Channel) {}

  async publishDriverAvailabilityChanged(event: DriverAvailabilityChanged, correlationId: string): Promise<void> {
    const envelope = {
      eventId: uuidV7(),
      eventType: event.eventType,
      eventVersion: "1.0.0",
      occurredAt: event.changedAt.toISOString(),
      correlationId,
      producer: "user-service",
      data: {
        userId: event.userId,
        isAvailable: event.isAvailable,
        changedAt: event.changedAt.toISOString(),
      },
    };
    const ok = this.channel.publish(
      LOGISTICS_EXCHANGE,
      event.eventType,
      Buffer.from(JSON.stringify(envelope)),
      { contentType: "application/json", persistent: true, messageId: envelope.eventId },
    );
    if (!ok) await new Promise((resolve) => this.channel.once("drain", resolve));
  }
}
