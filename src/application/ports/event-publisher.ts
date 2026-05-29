import type { DriverAvailabilityChanged } from "../../domain/events/driver-availability-changed.js";

export interface EventPublisher {
  publishDriverAvailabilityChanged(event: DriverAvailabilityChanged, correlationId: string): Promise<void>;
}
