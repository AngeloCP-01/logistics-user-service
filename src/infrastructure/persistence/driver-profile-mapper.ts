import type { DriverProfile as Row, VehicleType as PrismaVehicleType } from "@prisma/client";
import { DriverProfile } from "../../domain/driver/driver-profile.js";
import { UserId } from "../../domain/shared/user-id.js";
import type { VehicleType } from "../../domain/driver/vehicle-type.js";

export const DriverProfileMapper = {
  toDomain(row: Row): DriverProfile {
    return DriverProfile.fromPersistence({
      userId: UserId.of(row.userId),
      vehicleType: row.vehicleType as VehicleType | null,
      licensePlate: row.licensePlate,
      isAvailable: row.isAvailable,
      profileComplete: row.profileComplete,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(p: DriverProfile): Row {
    return {
      userId: p.userId,
      vehicleType: p.vehicleType as PrismaVehicleType | null,
      licensePlate: p.licensePlate,
      isAvailable: p.isAvailable,
      profileComplete: p.profileComplete,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  },
};
