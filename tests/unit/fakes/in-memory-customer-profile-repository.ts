import type { CustomerProfileRepository } from "../../../src/application/ports/customer-profile-repository.js";
import type { CustomerProfile } from "../../../src/domain/customer/customer-profile.js";
import type { UserId } from "../../../src/domain/shared/user-id.js";

export class InMemoryCustomerProfileRepository implements CustomerProfileRepository {
  readonly rows = new Map<string, CustomerProfile>();

  async byUserId(userId: UserId): Promise<CustomerProfile | null> {
    return this.rows.get(userId) ?? null;
  }

  async upsert(profile: CustomerProfile): Promise<void> {
    this.rows.set(profile.userId, profile);
  }

  async save(profile: CustomerProfile): Promise<void> {
    this.rows.set(profile.userId, profile);
  }
}
