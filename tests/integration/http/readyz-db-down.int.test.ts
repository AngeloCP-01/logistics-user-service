import request from "supertest";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I1: /readyz 503 when DB is down", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });

  it("returns 200 when both checks pass", async () => {
    const res = await request(fx.baseUrl).get("/readyz");
    expect(res.status).toBe(200);
  });

  it("returns 503 when Postgres is stopped", async () => {
    await fx.pg.container.stop();
    const res = await request(fx.baseUrl).get("/readyz");
    expect(res.status).toBe(503);
    expect(res.headers["content-type"]).toMatch(/problem\+json/);
  }, 30000);
});
