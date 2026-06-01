import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I12: PATCH /me/driver 403 for customer", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 403 when role=customer", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Alice", createdAt: new Date(), updatedAt: new Date() } });

    const res = await request(fx.baseUrl)
      .patch("/v1/users/me/driver")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "customer")}`)
      .send({ vehicleType: "motorcycle" });

    expect(res.status).toBe(403);
    expect(res.body.type).toBe("urn:logistics:user:role_required");
  });
});
