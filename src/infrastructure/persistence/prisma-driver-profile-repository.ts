import type { PrismaClient, Prisma } from "@prisma/client";
import type { DriverProfileRepository } from "../../application/ports/driver-profile-repository.js";
import type { DriverProfile } from "../../domain/driver/driver-profile.js";
import { DriverProfileMapper } from "./driver-profile-mapper.js";
import type { UserId } from "../../domain/shared/user-id.js";

type Tx = PrismaClient | Prisma.TransactionClient;

export class PrismaDriverProfileRepository implements DriverProfileRepository {
  constructor(private readonly db: Tx) {}

  async byUserId(userId: UserId): Promise<DriverProfile | null> {
    const row = await this.db.driverProfile.findUnique({ where: { userId } });
    return row ? DriverProfileMapper.toDomain(row) : null;
  }

  async upsert(profile: DriverProfile): Promise<void> {
    const data = DriverProfileMapper.toPersistence(profile);
    await this.db.driverProfile.upsert({
      where: { userId: data.userId },
      create: data,
      update: {
        vehicleType: data.vehicleType,
        licensePlate: data.licensePlate,
        isAvailable: data.isAvailable,
        profileComplete: data.profileComplete,
        updatedAt: data.updatedAt,
      },
    });
  }

  async save(profile: DriverProfile): Promise<void> {
    const data = DriverProfileMapper.toPersistence(profile);
    await this.db.driverProfile.update({
      where: { userId: data.userId },
      data: {
        vehicleType: data.vehicleType,
        licensePlate: data.licensePlate,
        isAvailable: data.isAvailable,
        profileComplete: data.profileComplete,
        updatedAt: data.updatedAt,
      },
    });
  }

  async delete(userId: UserId): Promise<void> {
    await this.db.driverProfile.delete({ where: { userId } });
  }
}
