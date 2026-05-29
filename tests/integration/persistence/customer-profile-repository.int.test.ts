import { startPgWithMigrations, stopPg, type PgFixture } from "../helpers/postgres-container.js";
import { PrismaCustomerProfileRepository } from "../../../src/infrastructure/persistence/prisma-customer-profile-repository.js";
import { PrismaDriverProfileRepository } from "../../../src/infrastructure/persistence/prisma-driver-profile-repository.js";
import { CustomerProfile } from "../../../src/domain/customer/customer-profile.js";
import { DriverProfile } from "../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../src/domain/shared/user-id.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

describe("Customer + Driver repos against real Postgres", () => {
  let fx: PgFixture;

  beforeAll(async () => { fx = await startPgWithMigrations(); }, 90000);
  afterAll(async () => { if (fx) await stopPg(fx); });
  beforeEach(async () => {
    await fx.prisma.driverProfile.deleteMany();
    await fx.prisma.address.deleteMany();
    await fx.prisma.customerProfile.deleteMany();
    await fx.prisma.processedEvent.deleteMany();
  });

  it("upserts customer + rehydrates", async () => {
    const repo = new PrismaCustomerProfileRepository(fx.prisma);
    await repo.upsert(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    const back = await repo.byUserId(USER_ID);
    expect(back?.displayName).toBe("Alice");
  });

  it("creates and deletes driver row", async () => {
    const customers = new PrismaCustomerProfileRepository(fx.prisma);
    const drivers = new PrismaDriverProfileRepository(fx.prisma);
    await customers.upsert(CustomerProfile.create({ userId: USER_ID, displayName: "Bob", now: NOW }));
    await drivers.upsert(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    expect(await drivers.byUserId(USER_ID)).not.toBeNull();
    await drivers.delete(USER_ID);
    expect(await drivers.byUserId(USER_ID)).toBeNull();
  });
});
