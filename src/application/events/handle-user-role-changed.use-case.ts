import type { UnitOfWork } from "../ports/unit-of-work.js";
import type { Clock } from "../ports/clock.js";
import type { EventPublisher } from "../ports/event-publisher.js";
import { CustomerProfile } from "../../domain/customer/customer-profile.js";
import { DriverProfile } from "../../domain/driver/driver-profile.js";
import { DriverAvailabilityChanged } from "../../domain/events/driver-availability-changed.js";
import { UserId } from "../../domain/shared/user-id.js";

export interface UserRoleChangedEnvelope {
  eventId: string;
  correlationId: string;
}

export interface UserRoleChangedData {
  userId: string;
  oldRole: "customer" | "driver" | "admin";
  newRole: "customer" | "driver" | "admin";
  changedBy: string;
  changedAt: string;
}

export class HandleUserRoleChangedUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
    private readonly events: EventPublisher,
  ) {}

  async execute(args: { envelope: UserRoleChangedEnvelope; data: UserRoleChangedData }): Promise<void> {
    type Pending = DriverAvailabilityChanged | null;
    const pending = await this.uow.run<Pending>(async (repos) => {
      const fresh = await repos.processedEvents.recordIfNew(args.envelope.eventId, "user.role_changed");
      if (!fresh) return null;

      const userId = UserId.of(args.data.userId);

      let customer = await repos.customers.byUserId(userId);
      if (!customer) {
        customer = CustomerProfile.create({ userId, displayName: "User", now: this.clock.now() });
        await repos.customers.upsert(customer);
      }

      const existingDriver = await repos.drivers.byUserId(userId);
      if (args.data.newRole === "driver" && !existingDriver) {
        const driver = DriverProfile.createIncomplete({ userId, now: this.clock.now() });
        await repos.drivers.upsert(driver);
        return null;
      }

      if (args.data.newRole !== "driver" && existingDriver) {
        const wasAvailable = existingDriver.isAvailable;
        await repos.drivers.delete(userId);
        if (wasAvailable) {
          return new DriverAvailabilityChanged(userId, false, this.clock.now());
        }
      }
      return null;
    });

    if (pending) {
      await this.events.publishDriverAvailabilityChanged(pending, args.envelope.correlationId);
    }
  }
}
