import type { DriverProfileRepository } from "../../../src/application/ports/driver-profile-repository.js";
import type { DriverProfile } from "../../../src/domain/driver/driver-profile.js";
import type { UserId } from "../../../src/domain/shared/user-id.js";

export class InMemoryDriverProfileRepository implements DriverProfileRepository {
  readonly rows = new Map<string, DriverProfile>();

  async byUserId(userId: UserId): Promise<DriverProfile | null> {
    return this.rows.get(userId) ?? null;
  }

  async upsert(profile: DriverProfile): Promise<void> {
    this.rows.set(profile.userId, profile);
  }

  async save(profile: DriverProfile): Promise<void> {
    this.rows.set(profile.userId, profile);
  }

  async delete(userId: UserId): Promise<void> {
    this.rows.delete(userId);
  }
}
