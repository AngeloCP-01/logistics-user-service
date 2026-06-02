import type { PrismaClient, Prisma } from "@prisma/client";
import type { AddressRepository } from "../../application/ports/address-repository.js";
import type { Address } from "../../domain/address/address.js";
import { AddressMapper } from "./address-mapper.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import type { UserId } from "../../domain/shared/user-id.js";

type Tx = PrismaClient | Prisma.TransactionClient;

export class PrismaAddressRepository implements AddressRepository {
  constructor(private readonly db: Tx) {}

  async byId(id: AddressId): Promise<Address | null> {
    const row = await this.db.address.findUnique({ where: { id } });
    return row ? AddressMapper.toDomain(row) : null;
  }

  async byUserId(userId: UserId): Promise<Address[]> {
    const rows = await this.db.address.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
    return rows.map(AddressMapper.toDomain);
  }

  async save(a: Address): Promise<void> {
    const data = AddressMapper.toPersistence(a);
    await this.db.address.upsert({
      where: { id: data.id },
      create: data,
      update: {
        label: data.label, street: data.street, city: data.city,
        country: data.country, lat: data.lat, lng: data.lng,
      },
    });
  }

  async delete(id: AddressId): Promise<void> {
    await this.db.address.delete({ where: { id } });
  }
}
