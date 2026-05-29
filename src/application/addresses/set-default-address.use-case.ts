import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { AddressRepository } from "../ports/address-repository.js";
import type { Clock } from "../ports/clock.js";
import type { CustomerProfile } from "../../domain/customer/customer-profile.js";
import type { UserId } from "../../domain/shared/user-id.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import { AddressNotFoundError, ProfileNotFoundError } from "../../domain/shared/errors.js";

export class SetDefaultAddressUseCase {
  constructor(
    private readonly customers: CustomerProfileRepository,
    private readonly addresses: AddressRepository,
    private readonly clock: Clock,
  ) {}

  async execute(args: { userId: UserId; addressId: AddressId }): Promise<CustomerProfile> {
    const address = await this.addresses.byId(args.addressId);
    if (!address || address.userId !== args.userId) throw new AddressNotFoundError(args.addressId);

    const customer = await this.customers.byUserId(args.userId);
    if (!customer) throw new ProfileNotFoundError(args.userId);

    customer.setDefaultAddress(args.addressId, this.clock.now());
    await this.customers.save(customer);
    return customer;
  }
}
