import amqp from "amqplib";
import { startRabbit, stopRabbit, type RabbitFixture } from "../helpers/rabbitmq-container.js";
import { connect, LOGISTICS_EXCHANGE } from "../../../src/infrastructure/messaging/rabbitmq-connection.js";
import { RabbitMqEventPublisher } from "../../../src/infrastructure/messaging/rabbitmq-event-publisher.js";
import { DriverAvailabilityChanged } from "../../../src/domain/events/driver-availability-changed.js";
import { UserId } from "../../../src/domain/shared/user-id.js";

describe("RabbitMqEventPublisher", () => {
  let fx: RabbitFixture;

  beforeAll(async () => { fx = await startRabbit(); }, 90000);
  afterAll(async () => { if (fx) await stopRabbit(fx); });

  it("publishes driver.availability.changed onto the topic exchange", async () => {
    const { connection, channel } = await connect(fx.url);
    const publisher = new RabbitMqEventPublisher(channel);

    // Set up a consumer to catch the published message
    const probeConn = await amqp.connect(fx.url);
    const probeCh = await probeConn.createChannel();
    await probeCh.assertExchange(LOGISTICS_EXCHANGE, "topic", { durable: true });
    const q = await probeCh.assertQueue("", { exclusive: true, autoDelete: true });
    await probeCh.bindQueue(q.queue, LOGISTICS_EXCHANGE, "driver.availability.changed");

    const received: unknown[] = [];
    await probeCh.consume(q.queue, (msg) => {
      if (msg) { received.push(JSON.parse(msg.content.toString())); probeCh.ack(msg); }
    }, { noAck: false });

    await publisher.publishDriverAvailabilityChanged(
      new DriverAvailabilityChanged(UserId.of("11111111-1111-7111-8111-111111111111"), true, new Date("2026-05-29T01:00:00Z")),
      "rid-1",
    );

    await new Promise((r) => setTimeout(r, 250));
    expect(received).toHaveLength(1);
    expect((received[0] as { eventType: string }).eventType).toBe("driver.availability.changed");
    expect((received[0] as { data: { isAvailable: boolean } }).data.isAvailable).toBe(true);

    await probeCh.close();
    await probeConn.close();
    await channel.close();
    await connection.close();
  }, 60000);
});
