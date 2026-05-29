import { startPgWithMigrations, stopPg, type PgFixture } from "../helpers/postgres-container.js";
import { PrismaProcessedEventRepository } from "../../../src/infrastructure/persistence/prisma-processed-event-repository.js";

describe("ProcessedEvent repo against real Postgres", () => {
  let fx: PgFixture;
  beforeAll(async () => { fx = await startPgWithMigrations(); }, 90000);
  afterAll(async () => { if (fx) await stopPg(fx); });
  beforeEach(async () => { await fx.prisma.processedEvent.deleteMany(); });

  it("records new eventId once, returns false on duplicate", async () => {
    const repo = new PrismaProcessedEventRepository(fx.prisma);
    const id = "44444444-4444-7444-8444-444444444444";
    expect(await repo.recordIfNew(id, "user.registered")).toBe(true);
    expect(await repo.recordIfNew(id, "user.registered")).toBe(false);
  });
});
