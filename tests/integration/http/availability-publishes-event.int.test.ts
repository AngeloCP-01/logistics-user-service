import amqp from "amqplib";
import request from "supertest";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";

describe("I14: PUT /me/availability publishes event", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: false }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("publishes driver.availability.changed after DB commit", async () => {
    const userId = uuidV7();
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Bob", createdAt: new Date(), updatedAt: new Date() } });
    await fx.pg.prisma.driverProfile.create({ data: { userId, vehicleType: "motorcycle", licensePlate: "ABC", isAvailable: false, profileComplete: true, createdAt: new Date(), updatedAt: new Date() } });

    const probeConn = await amqp.connect(fx.rabbit.url);
    const probeCh = await probeConn.createChannel();
    await probeCh.assertExchange("logistics.events", "topic", { durable: true });
    const q = await probeCh.assertQueue("", { exclusive: true, autoDelete: true });
    await probeCh.bindQueue(q.queue, "logistics.events", "driver.availability.changed");
    const received: unknown[] = [];
    await probeCh.consume(q.queue, (msg) => { if (msg) { received.push(JSON.parse(msg.content.toString())); probeCh.ack(msg); } });

    const res = await request(fx.baseUrl)
      .put("/v1/users/me/availability")
      .set("Authorization", `Bearer ${fx.signUserJwt(userId, "driver")}`)
      .send({ available: true });
    expect(res.status).toBe(200);

    await new Promise((r) => setTimeout(r, 300));
    expect(received).toHaveLength(1);
    expect((received[0] as { data: { userId: string; isAvailable: boolean } }).data.userId).toBe(userId);
    expect((received[0] as { data: { isAvailable: boolean } }).data.isAvailable).toBe(true);

    const row = await fx.pg.prisma.driverProfile.findUnique({ where: { userId } });
    expect(row?.isAvailable).toBe(true);

    await probeCh.close();
    await probeConn.close();
  });
});
