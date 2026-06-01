import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I10: DELETE /addresses/{id} 409 when default", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 409 default_address_in_use", async () => {
    const userId = uuidV7();
    const addressId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Alice", createdAt: new Date(), updatedAt: new Date() } });
    await fx.pg.prisma.address.create({ data: {
      id: addressId, userId, label: "Home", street: "x", city: "y", country: "PH",
      lat: "14.0", lng: "120.0", createdAt: new Date(),
    } });
    await fx.pg.prisma.customerProfile.update({ where: { userId }, data: { defaultAddressId: addressId } });

    const res = await request(fx.baseUrl)
      .delete(`/v1/users/me/addresses/${addressId}`)
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "customer")}`);

    expect(res.status).toBe(409);
    expect(res.body.type).toBe("urn:logistics:user:default_address_in_use");
  });
});
