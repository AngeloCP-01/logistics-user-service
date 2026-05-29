import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { AddressRepository } from "../ports/address-repository.js";
import type { Clock } from "../ports/clock.js";
import { Address } from "../../domain/address/address.js";
import { AddressId } from "../../domain/shared/address-id.js";
import { Country } from "../../domain/shared/country.js";
import { Coordinates } from "../../domain/shared/coordinates.js";
import type { UserId } from "../../domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../domain/shared/errors.js";

export type IdGenerator = () => string;

export class CreateAddressUseCase {
  constructor(
    private readonly customers: CustomerProfileRepository,
    private readonly addresses: AddressRepository,
    private readonly clock: Clock,
    private readonly idGen: IdGenerator,
  ) {}

  async execute(args: {
    userId: UserId;
    label: string; street: string; city: string;
    country: string; lat: number; lng: number;
  }): Promise<Address> {
    const customer = await this.customers.byUserId(args.userId);
    if (!customer) throw new ProfileNotFoundError(args.userId);

    const address = Address.create({
      id: AddressId.of(this.idGen()),
      userId: args.userId,
      label: args.label,
      street: args.street,
      city: args.city,
      country: Country.of(args.country),
      coordinates: Coordinates.of(args.lat, args.lng),
      now: this.clock.now(),
    });
    await this.addresses.save(address);
    return address;
  }
}
