import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I19: PATCH /me 403 for admin", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });

  it("returns 403 when role=admin", async () => {
    const userId = uuidV7();

    const res = await request(fx.baseUrl)
      .patch("/v1/users/me")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "admin")}`)
      .send({ displayName: "Should Not Apply" });

    expect(res.status).toBe(403);
    expect(res.body.type).toBe("urn:logistics:user:role_required");
  });
});
