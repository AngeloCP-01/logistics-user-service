import request from "supertest";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I2: graceful shutdown", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });

  it("returns 503 from /readyz once setShuttingDown is invoked", async () => {
    const before = await request(fx.baseUrl).get("/readyz");
    expect(before.status).toBe(200);
    fx.setShuttingDown();
    const after = await request(fx.baseUrl).get("/readyz");
    expect(after.status).toBe(503);
  });
});
