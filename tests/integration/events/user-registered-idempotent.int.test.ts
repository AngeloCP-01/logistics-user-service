import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";
import { makeEnvelope } from "../helpers/envelope.js";

describe("I5: user.registered idempotency", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("ignores duplicate eventId", async () => {
    const userId = uuidV7();
    const eventId = uuidV7();
    const env = makeEnvelope("user.registered", { userId, email: "alice@example.com", role: "customer" }, eventId);
    await fx.publishEvent("user.registered", env);
    await new Promise((r) => setTimeout(r, 500));
    // Mutate display name to detect re-processing
    await fx.pg.prisma.customerProfile.update({ where: { userId }, data: { displayName: "Modified" } });

    await fx.publishEvent("user.registered", env);
    await new Promise((r) => setTimeout(r, 500));

    const row = await fx.pg.prisma.customerProfile.findUnique({ where: { userId } });
    expect(row?.displayName).toBe("Modified");

    const count = await fx.pg.prisma.processedEvent.count({ where: { eventId } });
    expect(count).toBe(1);
  });
});
