import { v7 as uuidV7 } from "uuid";

export function makeEnvelope<T>(eventType: string, data: T, eventId = uuidV7()): {
  eventId: string; eventType: string; eventVersion: string;
  occurredAt: string; correlationId: string; producer: string; data: T;
} {
  return {
    eventId,
    eventType,
    eventVersion: "1.0.0",
    occurredAt: new Date().toISOString(),
    correlationId: `corr-${eventId.slice(0, 8)}`,
    producer: "auth-service",
    data,
  };
}
