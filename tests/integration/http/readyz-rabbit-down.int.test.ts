import request from "supertest";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I17: /readyz 503 when RabbitMQ is down", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });

  it("returns 200 when RabbitMQ is up", async () => {
    const res = await request(fx.baseUrl).get("/readyz");
    expect(res.status).toBe(200);
  });

  it("returns 503 after RabbitMQ container is stopped", async () => {
    await fx.rabbit.container.stop();

    // give the channel a moment to emit 'close'
    await new Promise((r) => setTimeout(r, 500));

    const res = await request(fx.baseUrl).get("/readyz");
    expect(res.status).toBe(503);
    expect(res.headers["content-type"]).toMatch(/problem\+json/);
  }, 30000);
});
