import type { EventPublisher } from "../../../src/application/ports/event-publisher.js";
import type { DriverAvailabilityChanged } from "../../../src/domain/events/driver-availability-changed.js";

export class SpyEventPublisher implements EventPublisher {
  readonly availability: { event: DriverAvailabilityChanged; correlationId: string }[] = [];

  async publishDriverAvailabilityChanged(
    event: DriverAvailabilityChanged,
    correlationId: string,
  ): Promise<void> {
    this.availability.push({ event, correlationId });
  }
}
