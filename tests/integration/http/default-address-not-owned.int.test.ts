import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I11: PUT /default-address 404 when not owned", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 404 when caller doesn't own the address", async () => {
    const me = uuidV7();
    const other = uuidV7();
    const addressId = uuidV7();
    await fx.pg.prisma.customerProfile.createMany({ data: [
      { userId: me, displayName: "Me", createdAt: new Date(), updatedAt: new Date() },
      { userId: other, displayName: "Other", createdAt: new Date(), updatedAt: new Date() },
    ] });
    await fx.pg.prisma.address.create({ data: {
      id: addressId, userId: other, label: "Home", street: "x", city: "y", country: "PH",
      lat: "14.0", lng: "120.0", createdAt: new Date(),
    } });

    const res = await request(fx.baseUrl)
      .put("/v1/users/me/default-address")
      .set("Authorization", `Bearer ${fx.signUserJwt(me, "customer")}`)
      .send({ addressId });

    expect(res.status).toBe(404);
  });
});
