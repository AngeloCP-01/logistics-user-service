import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";
import { makeEnvelope } from "../helpers/envelope.js";

describe("I6: user.role_changed customer→driver", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("inserts driver row", async () => {
    const userId = uuidV7();
    await fx.publishEvent("user.registered", makeEnvelope("user.registered", { userId, email: "a@b.c", role: "customer" }));
    await new Promise((r) => setTimeout(r, 300));

    await fx.publishEvent("user.role_changed", makeEnvelope("user.role_changed", {
      userId, oldRole: "customer", newRole: "driver",
      changedBy: uuidV7(), changedAt: new Date().toISOString(),
    }));
    await new Promise((r) => setTimeout(r, 500));

    const driver = await fx.pg.prisma.driverProfile.findUnique({ where: { userId } });
    expect(driver).not.toBeNull();
  });
});
