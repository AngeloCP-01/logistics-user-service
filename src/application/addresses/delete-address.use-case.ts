import type { AddressRepository } from "../ports/address-repository.js";
import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { UserId } from "../../domain/shared/user-id.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import { AddressNotFoundError, DefaultAddressInUseError, ProfileNotFoundError } from "../../domain/shared/errors.js";

export class DeleteAddressUseCase {
  constructor(
    private readonly addresses: AddressRepository,
    private readonly customers: CustomerProfileRepository,
  ) {}

  async execute(args: { userId: UserId; id: AddressId }): Promise<void> {
    const address = await this.addresses.byId(args.id);
    if (!address || address.userId !== args.userId) throw new AddressNotFoundError(args.id);

    const customer = await this.customers.byUserId(args.userId);
    if (!customer) throw new ProfileNotFoundError(args.userId);

    if (customer.defaultAddressId === args.id) {
      throw new DefaultAddressInUseError(args.id);
    }
    await this.addresses.delete(args.id);
  }
}
