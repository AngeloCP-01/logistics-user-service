import type { AddressRepository } from "../../../src/application/ports/address-repository.js";
import type { Address } from "../../../src/domain/address/address.js";
import type { AddressId } from "../../../src/domain/shared/address-id.js";
import type { UserId } from "../../../src/domain/shared/user-id.js";

export class InMemoryAddressRepository implements AddressRepository {
  readonly rows = new Map<string, Address>();

  async byId(id: AddressId): Promise<Address | null> {
    return this.rows.get(id) ?? null;
  }

  async byUserId(userId: UserId): Promise<Address[]> {
    return [...this.rows.values()].filter((a) => a.userId === userId);
  }

  async save(address: Address): Promise<void> {
    this.rows.set(address.id, address);
  }

  async delete(id: AddressId): Promise<void> {
    this.rows.delete(id);
  }
}
