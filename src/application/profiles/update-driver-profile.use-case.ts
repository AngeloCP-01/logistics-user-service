import type { DriverProfileRepository } from "../ports/driver-profile-repository.js";
import type { Clock } from "../ports/clock.js";
import type { DriverProfile } from "../../domain/driver/driver-profile.js";
import { isVehicleType, type VehicleType } from "../../domain/driver/vehicle-type.js";
import type { UserId } from "../../domain/shared/user-id.js";
import { ProfileNotFoundError, ValidationError } from "../../domain/shared/errors.js";

export class UpdateDriverProfileUseCase {
  constructor(
    private readonly drivers: DriverProfileRepository,
    private readonly clock: Clock,
  ) {}

  async execute(args: {
    userId: UserId;
    vehicleType: string | undefined;
    licensePlate: string | undefined;
  }): Promise<DriverProfile> {
    if (args.vehicleType !== undefined && !isVehicleType(args.vehicleType)) {
      throw new ValidationError([
        { field: "vehicleType", message: "must be one of motorcycle|car|van|truck" },
      ]);
    }
    const profile = await this.drivers.byUserId(args.userId);
    if (!profile) throw new ProfileNotFoundError(args.userId);

    profile.updateAttributes({
      vehicleType: args.vehicleType as VehicleType | undefined,
      licensePlate: args.licensePlate,
      now: this.clock.now(),
    });
    await this.drivers.save(profile);
    return profile;
  }
}
