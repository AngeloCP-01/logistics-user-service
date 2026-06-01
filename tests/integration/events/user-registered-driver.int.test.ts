import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";
import { makeEnvelope } from "../helpers/envelope.js";

async function waitForRow<T>(fetch: () => Promise<T | null>, timeoutMs = 5000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const row = await fetch();
    if (row) return row;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("row never appeared");
}

describe("I4: user.registered consumer (driver)", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("creates customer + incomplete driver row when role=driver", async () => {
    const userId = uuidV7();
    const env = makeEnvelope("user.registered", { userId, email: "bob@example.com", role: "driver" });
    await fx.publishEvent("user.registered", env);

    await waitForRow(() => fx.pg.prisma.customerProfile.findUnique({ where: { userId } }));
    const driver = await waitForRow(() => fx.pg.prisma.driverProfile.findUnique({ where: { userId } }));
    expect(driver.profileComplete).toBe(false);
    expect(driver.isAvailable).toBe(false);
  });
});
