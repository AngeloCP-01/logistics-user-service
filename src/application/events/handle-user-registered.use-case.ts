import type { UnitOfWork } from "../ports/unit-of-work.js";
import type { Clock } from "../ports/clock.js";
import { CustomerProfile } from "../../domain/customer/customer-profile.js";
import { DriverProfile } from "../../domain/driver/driver-profile.js";
import { UserId } from "../../domain/shared/user-id.js";

export interface UserRegisteredEnvelope {
  eventId: string;
  correlationId: string;
}

export interface UserRegisteredData {
  userId: string;
  email: string;
  role: "customer" | "driver";
}

export class HandleUserRegisteredUseCase {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(args: { envelope: UserRegisteredEnvelope; data: UserRegisteredData }): Promise<void> {
    await this.uow.run(async (repos) => {
      const fresh = await repos.processedEvents.recordIfNew(args.envelope.eventId, "user.registered");
      if (!fresh) return;

      const userId = UserId.of(args.data.userId);
      const existing = await repos.customers.byUserId(userId);
      if (!existing) {
        const displayName = args.data.email.split("@")[0] || "User";
        const customer = CustomerProfile.create({ userId, displayName, now: this.clock.now() });
        await repos.customers.upsert(customer);
      }

      if (args.data.role === "driver") {
        const existingDriver = await repos.drivers.byUserId(userId);
        if (!existingDriver) {
          const driver = DriverProfile.createIncomplete({ userId, now: this.clock.now() });
          await repos.drivers.upsert(driver);
        }
      }
    });
  }
}
