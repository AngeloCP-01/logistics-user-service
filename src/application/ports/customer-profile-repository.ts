import type { CustomerProfile } from "../../domain/customer/customer-profile.js";
import type { UserId } from "../../domain/shared/user-id.js";

export interface CustomerProfileRepository {
  byUserId(userId: UserId): Promise<CustomerProfile | null>;
  upsert(profile: CustomerProfile): Promise<void>;
  save(profile: CustomerProfile): Promise<void>;
}
