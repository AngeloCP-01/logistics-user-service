import type { PrismaClient, Prisma } from "@prisma/client";
import type { CustomerProfileRepository } from "../../application/ports/customer-profile-repository.js";
import type { CustomerProfile } from "../../domain/customer/customer-profile.js";
import { CustomerProfileMapper } from "./customer-profile-mapper.js";
import type { UserId } from "../../domain/shared/user-id.js";

type Tx = PrismaClient | Prisma.TransactionClient;

export class PrismaCustomerProfileRepository implements CustomerProfileRepository {
  constructor(private readonly db: Tx) {}

  async byUserId(userId: UserId): Promise<CustomerProfile | null> {
    const row = await this.db.customerProfile.findUnique({ where: { userId } });
    return row ? CustomerProfileMapper.toDomain(row) : null;
  }

  async upsert(profile: CustomerProfile): Promise<void> {
    const data = CustomerProfileMapper.toPersistence(profile);
    await this.db.customerProfile.upsert({
      where: { userId: data.userId },
      create: data,
      update: { displayName: data.displayName, phone: data.phone, defaultAddressId: data.defaultAddressId, updatedAt: data.updatedAt },
    });
  }

  async save(profile: CustomerProfile): Promise<void> {
    const data = CustomerProfileMapper.toPersistence(profile);
    await this.db.customerProfile.update({
      where: { userId: data.userId },
      data: { displayName: data.displayName, phone: data.phone, defaultAddressId: data.defaultAddressId, updatedAt: data.updatedAt },
    });
  }
}
