import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I16: internal endpoints reject user JWT", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });

  it("returns 401 when only a user JWT is supplied via Authorization", async () => {
    const userId = uuidV7();

    const res = await request(fx.baseUrl)
      .get(`/v1/users/internal/drivers/${userId}`)
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "driver")}`);

    expect(res.status).toBe(401);
  });
});
