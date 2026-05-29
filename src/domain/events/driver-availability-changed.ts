import type { UserId } from "../shared/user-id.js";

export class DriverAvailabilityChanged {
  readonly eventType = "driver.availability.changed";

  constructor(
    readonly userId: UserId,
    readonly isAvailable: boolean,
    readonly changedAt: Date,
  ) {}
}
