import type { DriverProfileRepository } from "../ports/driver-profile-repository.js";
import type { Clock } from "../ports/clock.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import { DriverAvailabilityChanged } from "../../domain/events/driver-availability-changed.js";
import type { UserId } from "../../domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../domain/shared/errors.js";
import type { DriverProfile } from "../../domain/driver/driver-profile.js";

export class SetAvailabilityUseCase {
  constructor(
    private readonly drivers: DriverProfileRepository,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(args: { userId: UserId; available: boolean; correlationId: string }): Promise<DriverProfile> {
    const profile = await this.drivers.byUserId(args.userId);
    if (!profile) throw new ProfileNotFoundError(args.userId);

    const now = this.clock.now();
    const changed = profile.setAvailable(args.available, now);
    if (!changed) return profile;

    await this.drivers.save(profile);
    await this.events.publishDriverAvailabilityChanged(
      new DriverAvailabilityChanged(profile.userId, profile.isAvailable, now),
      args.correlationId,
    );
    return profile;
  }
}
