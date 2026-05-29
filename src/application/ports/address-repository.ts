import type { Address } from "../../domain/address/address.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import type { UserId } from "../../domain/shared/user-id.js";

export interface AddressRepository {
  byId(id: AddressId): Promise<Address | null>;
  byUserId(userId: UserId): Promise<Address[]>;
  save(address: Address): Promise<void>;
  delete(id: AddressId): Promise<void>;
}
