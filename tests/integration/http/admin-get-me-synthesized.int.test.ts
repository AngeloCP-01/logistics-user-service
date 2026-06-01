import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I18: GET /me for admin returns synthesized response without DB lookup", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 200 with role=admin synthesized payload", async () => {
    const userId = uuidV7();

    const pre = await fx.pg.prisma.customerProfile.findUnique({ where: { userId } });
    expect(pre).toBeNull();

    const res = await request(fx.baseUrl)
      .get("/v1/users/me")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "admin")}`);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("admin");
    expect(res.body.displayName).toBe("Admin");
    expect(res.body.driver).toBeNull();
  });
});
