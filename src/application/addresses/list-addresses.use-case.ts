import type { AddressRepository } from "../ports/address-repository.js";
import type { Address } from "../../domain/address/address.js";
import type { UserId } from "../../domain/shared/user-id.js";

export class ListAddressesUseCase {
  constructor(private readonly addresses: AddressRepository) {}

  async execute(args: { userId: UserId }): Promise<{ items: Address[]; nextCursor: string | null }> {
    const items = await this.addresses.byUserId(args.userId);
    return { items, nextCursor: null };
  }
}
