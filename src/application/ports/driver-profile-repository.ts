import type { DriverProfile } from "../../domain/driver/driver-profile.js";
import type { UserId } from "../../domain/shared/user-id.js";

export interface DriverProfileRepository {
  byUserId(userId: UserId): Promise<DriverProfile | null>;
  upsert(profile: DriverProfile): Promise<void>;
  save(profile: DriverProfile): Promise<void>;
  delete(userId: UserId): Promise<void>;
}
