import type { AddressRepository } from "../ports/address-repository.js";
import { Country } from "../../domain/shared/country.js";
import { Coordinates } from "../../domain/shared/coordinates.js";
import type { Address } from "../../domain/address/address.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import type { UserId } from "../../domain/shared/user-id.js";
import { AddressNotFoundError, ValidationError } from "../../domain/shared/errors.js";

export class UpdateAddressUseCase {
  constructor(private readonly addresses: AddressRepository) {}

  async execute(args: {
    userId: UserId; id: AddressId;
    label: string | undefined;
    street: string | undefined;
    city: string | undefined;
    country: string | undefined;
    lat: number | undefined;
    lng: number | undefined;
  }): Promise<Address> {
    if ((args.lat === undefined) !== (args.lng === undefined)) {
      throw new ValidationError([{ field: "coordinates", message: "lat and lng must be provided together" }]);
    }
    const address = await this.addresses.byId(args.id);
    if (!address || address.userId !== args.userId) throw new AddressNotFoundError(args.id);

    address.update({
      label: args.label,
      street: args.street,
      city: args.city,
      country: args.country !== undefined ? Country.of(args.country) : undefined,
      coordinates: args.lat !== undefined && args.lng !== undefined ? Coordinates.of(args.lat, args.lng) : undefined,
    });
    await this.addresses.save(address);
    return address;
  }
}
