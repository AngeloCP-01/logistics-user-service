import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";
import { makeEnvelope } from "../helpers/envelope.js";

describe("I8: role_changed out-of-order before user.registered", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("defensively creates the customer row when missing", async () => {
    const userId = uuidV7();
    await fx.publishEvent("user.role_changed", makeEnvelope("user.role_changed", {
      userId, oldRole: "customer", newRole: "driver",
      changedBy: uuidV7(), changedAt: new Date().toISOString(),
    }));

    await new Promise((r) => setTimeout(r, 500));
    expect(await fx.pg.prisma.customerProfile.findUnique({ where: { userId } })).not.toBeNull();
    expect(await fx.pg.prisma.driverProfile.findUnique({ where: { userId } })).not.toBeNull();
  });
});
