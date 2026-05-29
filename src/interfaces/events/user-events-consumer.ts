import type { Channel } from "amqplib";
import type { Logger } from "pino";
import type { HandleUserRegisteredUseCase } from "../../application/events/handle-user-registered.use-case.js";
import type { HandleUserRoleChangedUseCase } from "../../application/events/handle-user-role-changed.use-case.js";
import { LOGISTICS_EXCHANGE } from "../../infrastructure/messaging/rabbitmq-connection.js";

export const USER_EVENTS_QUEUE = "user-service.user-events";

export interface ConsumerDeps {
  channel: Channel;
  logger: Logger;
  handleRegistered: HandleUserRegisteredUseCase;
  handleRoleChanged: HandleUserRoleChangedUseCase;
}

export async function startUserEventsConsumer(deps: ConsumerDeps): Promise<{ stop: () => Promise<void> }> {
  const { channel, logger } = deps;
  await channel.assertQueue(USER_EVENTS_QUEUE, { durable: true, deadLetterExchange: "", deadLetterRoutingKey: `${USER_EVENTS_QUEUE}.dlq` });
  await channel.assertQueue(`${USER_EVENTS_QUEUE}.dlq`, { durable: true });
  await channel.bindQueue(USER_EVENTS_QUEUE, LOGISTICS_EXCHANGE, "user.registered");
  await channel.bindQueue(USER_EVENTS_QUEUE, LOGISTICS_EXCHANGE, "user.role_changed");
  await channel.prefetch(8);

  const { consumerTag } = await channel.consume(USER_EVENTS_QUEUE, async (msg) => {
    if (!msg) return;
    let envelope: { eventId: string; eventType: string; correlationId: string; data: unknown };
    try {
      envelope = JSON.parse(msg.content.toString());
    } catch {
      logger.warn({ event: "consumer_message_invalid_json" }, "discarding malformed message");
      channel.nack(msg, false, false);
      return;
    }

    try {
      if (envelope.eventType === "user.registered") {
        await deps.handleRegistered.execute({
          envelope: { eventId: envelope.eventId, correlationId: envelope.correlationId },
          data: envelope.data as Parameters<typeof deps.handleRegistered.execute>[0]["data"],
        });
      } else if (envelope.eventType === "user.role_changed") {
        await deps.handleRoleChanged.execute({
          envelope: { eventId: envelope.eventId, correlationId: envelope.correlationId },
          data: envelope.data as Parameters<typeof deps.handleRoleChanged.execute>[0]["data"],
        });
      } else {
        logger.debug({ event: "consumer_message_skipped_unknown", eventType: envelope.eventType }, "ignoring");
      }
      channel.ack(msg);
    } catch (err) {
      const headers = msg.properties.headers ?? {};
      const attempts = (headers["x-attempt"] as number | undefined) ?? 0;
      if (attempts >= 3) {
        logger.error({ event: "consumer_message_dlq", err, eventId: envelope.eventId }, "max retries reached");
        channel.nack(msg, false, false); // routes to DLQ via queue dead-letter config
      } else {
        logger.warn({ event: "consumer_message_retry", err, attempts: attempts + 1, eventId: envelope.eventId }, "retrying");
        channel.nack(msg, false, true);
      }
    }
  });

  return {
    stop: async () => {
      await channel.cancel(consumerTag);
    },
  };
}
