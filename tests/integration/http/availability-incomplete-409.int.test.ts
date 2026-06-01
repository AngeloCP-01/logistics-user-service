import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I13: PUT /me/availability 409 when profile incomplete", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 409 driver_profile_incomplete", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Bob", createdAt: new Date(), updatedAt: new Date() } });
    await fx.pg.prisma.driverProfile.create({ data: { userId, isAvailable: false, profileComplete: false, createdAt: new Date(), updatedAt: new Date() } });

    const res = await request(fx.baseUrl)
      .put("/v1/users/me/availability")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "driver")}`)
      .send({ available: true });

    expect(res.status).toBe(409);
    expect(res.body.type).toBe("urn:logistics:user:driver_profile_incomplete");
  });
});
