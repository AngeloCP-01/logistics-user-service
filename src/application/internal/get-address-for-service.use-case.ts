import type { AddressRepository } from "../ports/address-repository.js";
import type { Address } from "../../domain/address/address.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import { AddressNotFoundError } from "../../domain/shared/errors.js";

export class GetAddressForServiceUseCase {
  constructor(private readonly addresses: AddressRepository) {}

  async execute(args: { id: AddressId }): Promise<Address> {
    const address = await this.addresses.byId(args.id);
    if (!address) throw new AddressNotFoundError(args.id);
    return address;
  }
}
