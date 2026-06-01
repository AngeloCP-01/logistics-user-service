import amqp from "amqplib";
import { v7 as uuidV7 } from "uuid";
import { bootstrap, type IntegrationFixture } from "../helpers/bootstrap.js";
import { makeEnvelope } from "../helpers/envelope.js";

describe("I7: user.role_changed driver→customer publishes availability=false", () => {
  let fx: IntegrationFixture;
  beforeAll(async () => { fx = await bootstrap({ startConsumer: true }); }, 120000);
  afterAll(async () => { if (fx) await fx.stop(); });
  beforeEach(async () => { await fx.prismaResetAll(); });

  it("publishes a final availability=false event when demoting an available driver", async () => {
    const userId = uuidV7();
    // Seed an available driver directly in the DB
    await fx.pg.prisma.customerProfile.create({ data: { userId, displayName: "Bob", createdAt: new Date(), updatedAt: new Date() } });
    await fx.pg.prisma.driverProfile.create({ data: { userId, vehicleType: "motorcycle", licensePlate: "ABC", isAvailable: true, profileComplete: true, createdAt: new Date(), updatedAt: new Date() } });

    // Subscribe to the broker probe queue
    const probeConn = await amqp.connect(fx.rabbit.url);
    const probeCh = await probeConn.createChannel();
    await probeCh.assertExchange("logistics.events", "topic", { durable: true });
    const q = await probeCh.assertQueue("", { exclusive: true, autoDelete: true });
    await probeCh.bindQueue(q.queue, "logistics.events", "driver.availability.changed");
    const received: unknown[] = [];
    await probeCh.consume(q.queue, (msg) => {
      if (msg) { received.push(JSON.parse(msg.content.toString())); probeCh.ack(msg); }
    });

    await fx.publishEvent("user.role_changed", makeEnvelope("user.role_changed", {
      userId, oldRole: "driver", newRole: "customer",
      changedBy: uuidV7(), changedAt: new Date().toISOString(),
    }));

    await new Promise((r) => setTimeout(r, 800));
    expect(received).toHaveLength(1);
    expect((received[0] as { data: { isAvailable: boolean } }).data.isAvailable).toBe(false);
    expect(await fx.pg.prisma.driverProfile.findUnique({ where: { userId } })).toBeNull();

    await probeCh.close();
    await probeConn.close();
  });
});
