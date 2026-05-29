import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { Clock } from "../ports/clock.js";
import type { CustomerProfile } from "../../domain/customer/customer-profile.js";
import { Phone } from "../../domain/shared/phone.js";
import type { UserId } from "../../domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../domain/shared/errors.js";

export class UpdateMyProfileUseCase {
  constructor(
    private readonly customers: CustomerProfileRepository,
    private readonly clock: Clock,
  ) {}

  async execute(args: {
    userId: UserId;
    displayName: string | undefined;
    phone: string | null | undefined;
  }): Promise<CustomerProfile> {
    const profile = await this.customers.byUserId(args.userId);
    if (!profile) throw new ProfileNotFoundError(args.userId);

    const phone =
      args.phone === undefined ? undefined :
      args.phone === null ? null :
      Phone.of(args.phone);

    profile.updateProfile({ displayName: args.displayName, phone, now: this.clock.now() });
    await this.customers.save(profile);
    return profile;
  }
}
