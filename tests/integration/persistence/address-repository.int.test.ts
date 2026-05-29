import { startPgWithMigrations, stopPg, type PgFixture } from "../helpers/postgres-container.js";
import { PrismaCustomerProfileRepository } from "../../../src/infrastructure/persistence/prisma-customer-profile-repository.js";
import { PrismaAddressRepository } from "../../../src/infrastructure/persistence/prisma-address-repository.js";
import { CustomerProfile } from "../../../src/domain/customer/customer-profile.js";
import { Address } from "../../../src/domain/address/address.js";
import { UserId } from "../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../src/domain/shared/address-id.js";
import { Country } from "../../../src/domain/shared/country.js";
import { Coordinates } from "../../../src/domain/shared/coordinates.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");
const ADDRESS_ID = AddressId.of("33333333-3333-7333-8333-333333333333");

describe("Address repo against real Postgres", () => {
  let fx: PgFixture;

  beforeAll(async () => { fx = await startPgWithMigrations(); }, 90000);
  afterAll(async () => { if (fx) await stopPg(fx); });
  beforeEach(async () => {
    await fx.prisma.address.deleteMany();
    await fx.prisma.customerProfile.deleteMany();
  });

  it("saves + lists addresses for a user", async () => {
    const customers = new PrismaCustomerProfileRepository(fx.prisma);
    const repo = new PrismaAddressRepository(fx.prisma);
    await customers.upsert(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await repo.save(Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home",
      street: "1 Main St", city: "Manila", country: Country.of("PH"),
      coordinates: Coordinates.of(14.5995, 120.9842), now: NOW,
    }));
    const back = await repo.byUserId(USER_ID);
    expect(back).toHaveLength(1);
    expect(back[0]!.coordinates.lat).toBeCloseTo(14.5995, 4);
  });

  it("cascades address delete when customer is deleted (FK CASCADE)", async () => {
    const customers = new PrismaCustomerProfileRepository(fx.prisma);
    const repo = new PrismaAddressRepository(fx.prisma);
    await customers.upsert(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await repo.save(Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home",
      street: "x", city: "y", country: Country.of("PH"),
      coordinates: Coordinates.of(14, 120), now: NOW,
    }));
    await fx.prisma.customerProfile.delete({ where: { userId: USER_ID } });
    expect(await repo.byId(ADDRESS_ID)).toBeNull();
  });
});
