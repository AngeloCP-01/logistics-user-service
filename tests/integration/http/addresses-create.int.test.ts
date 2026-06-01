import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I9: POST /v1/users/me/addresses", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("creates an address and returns 201 with Location header", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Alice", createdAt: new Date(), updatedAt: new Date() } });

    const res = await request(fx.baseUrl)
      .post("/v1/users/me/addresses")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "customer")}`)
      .send({ label: "Home", street: "1 Main", city: "Manila", country: "PH", lat: 14.5995, lng: 120.9842 });

    expect(res.status).toBe(201);
    expect(res.headers.location).toMatch(/^\/v1\/users\/me\/addresses\//);
    expect(res.body.label).toBe("Home");
  });

  it("returns 400 on bad coordinates", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Alice", createdAt: new Date(), updatedAt: new Date() } });

    const res = await request(fx.baseUrl)
      .post("/v1/users/me/addresses")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "customer")}`)
      .send({ label: "Home", street: "1 Main", city: "Manila", country: "PH", lat: 999, lng: 120 });

    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/problem\+json/);
  });
});
