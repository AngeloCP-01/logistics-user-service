import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I15: GET /v1/users/internal/drivers/{userId} requires service JWT", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("returns 401 without service authorization header", async () => {
    const userId = uuidV7();

    const res = await request(fx.baseUrl).get(`/v1/users/internal/drivers/${userId}`);

    expect(res.status).toBe(401);
  });

  it("returns 200 with valid service JWT", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({
      data: { userId, displayName: "Dana", phone: "1234567", createdAt: new Date(), updatedAt: new Date() },
    });
    await fx.pg.prisma.driverProfile.create({
      data: { userId, vehicleType: "motorcycle", licensePlate: "XYZ-123", isAvailable: true, profileComplete: true, createdAt: new Date(), updatedAt: new Date() },
    });

    const res = await request(fx.baseUrl)
      .get(`/v1/users/internal/drivers/${userId}`)
      .set("X-Service-Authorization", `Bearer ${fx.signServiceJwt("dispatch-service")}`);

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(userId);
    expect(res.body.displayName).toBe("Dana");
    expect(res.body.phone).toBe("1234567");
    expect(res.body.vehicleType).toBe("motorcycle");
    expect(res.body.licensePlate).toBe("XYZ-123");
    expect(res.body.isAvailable).toBe(true);
    expect(res.body.profileComplete).toBe(true);
  });
});
