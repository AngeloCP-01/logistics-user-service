import http, { type Server } from "node:http";
import jwt from "jsonwebtoken";
const { sign } = jwt;
import { v7 as uuidV7 } from "uuid";
import pino from "pino";
import { startPgWithMigrations, stopPg, type PgFixture } from "./postgres-container.js";
import { startRabbit, stopRabbit, type RabbitFixture } from "./rabbitmq-container.js";
import { createPrismaClient } from "../../../src/infrastructure/persistence/prisma-client.js";
import { connect } from "../../../src/infrastructure/messaging/rabbitmq-connection.js";
import { PrismaUnitOfWork } from "../../../src/infrastructure/persistence/prisma-unit-of-work.js";
import { PrismaCustomerProfileRepository } from "../../../src/infrastructure/persistence/prisma-customer-profile-repository.js";
import { PrismaDriverProfileRepository } from "../../../src/infrastructure/persistence/prisma-driver-profile-repository.js";
import { PrismaAddressRepository } from "../../../src/infrastructure/persistence/prisma-address-repository.js";
import { RabbitMqEventPublisher } from "../../../src/infrastructure/messaging/rabbitmq-event-publisher.js";
import { SystemClock } from "../../../src/infrastructure/clock/system-clock.js";
import { UserJwtVerifier } from "../../../src/infrastructure/auth/user-jwt-verifier.js";
import { ServiceJwtVerifier } from "../../../src/infrastructure/auth/service-jwt-verifier.js";
import { GetMyProfileUseCase } from "../../../src/application/profiles/get-my-profile.use-case.js";
import { UpdateMyProfileUseCase } from "../../../src/application/profiles/update-my-profile.use-case.js";
import { UpdateDriverProfileUseCase } from "../../../src/application/profiles/update-driver-profile.use-case.js";
import { SetAvailabilityUseCase } from "../../../src/application/profiles/set-availability.use-case.js";
import { ListAddressesUseCase } from "../../../src/application/addresses/list-addresses.use-case.js";
import { CreateAddressUseCase } from "../../../src/application/addresses/create-address.use-case.js";
import { UpdateAddressUseCase } from "../../../src/application/addresses/update-address.use-case.js";
import { DeleteAddressUseCase } from "../../../src/application/addresses/delete-address.use-case.js";
import { SetDefaultAddressUseCase } from "../../../src/application/addresses/set-default-address.use-case.js";
import { GetDriverForServiceUseCase } from "../../../src/application/internal/get-driver-for-service.use-case.js";
import { GetAddressForServiceUseCase } from "../../../src/application/internal/get-address-for-service.use-case.js";
import { HandleUserRegisteredUseCase } from "../../../src/application/events/handle-user-registered.use-case.js";
import { HandleUserRoleChangedUseCase } from "../../../src/application/events/handle-user-role-changed.use-case.js";
import { ProfileController } from "../../../src/interfaces/http/controllers/profile-controller.js";
import { AddressController } from "../../../src/interfaces/http/controllers/address-controller.js";
import { DriverController } from "../../../src/interfaces/http/controllers/driver-controller.js";
import { InternalController } from "../../../src/interfaces/http/controllers/internal-controller.js";
import { HealthController } from "../../../src/interfaces/http/controllers/health-controller.js";
import { startUserEventsConsumer } from "../../../src/interfaces/events/user-events-consumer.js";
import { createApp } from "../../../src/app.js";

const USER_SECRET = "u".repeat(40);
const SERVICE_SECRET = "s".repeat(40);

export interface IntegrationFixture {
  pg: PgFixture;
  rabbit: RabbitFixture;
  server: Server;
  port: number;
  baseUrl: string;
  stop: () => Promise<void>;
  setShuttingDown: () => void;
  signUserJwt: (userId: string, role: "customer" | "driver" | "admin") => string;
  signServiceJwt: (caller: string) => string;
  publishEvent: (routingKey: string, envelope: unknown) => Promise<void>;
  prismaResetAll: () => Promise<void>;
}

export async function bootstrap(opts?: { startConsumer?: boolean }): Promise<IntegrationFixture> {
  const pg = await startPgWithMigrations();
  const rabbit = await startRabbit();

  const env = {
    NODE_ENV: "test" as const,
    PORT: 0,
    LOG_LEVEL: "warn" as const,
    LOG_SERVICE_NAME: "user-service-test",
    USER_DB_URL: pg.url,
    USER_JWT_SECRET: USER_SECRET,
    USER_SERVICE_JWT_SECRET: SERVICE_SECRET,
    RABBITMQ_URL: rabbit.url,
  };

  const logger = pino({ level: env.LOG_LEVEL });
  const prisma = createPrismaClient(env);
  await prisma.$connect();

  const { connection: amqpConn, channel: amqpCh } = await connect(env.RABBITMQ_URL);
  let activeChannel: typeof amqpCh | null = amqpCh;
  amqpCh.on("close", () => { activeChannel = null; });
  const publisher = new RabbitMqEventPublisher(amqpCh);
  const clock = new SystemClock();
  const uow = new PrismaUnitOfWork(prisma);
  const customers = new PrismaCustomerProfileRepository(prisma);
  const drivers = new PrismaDriverProfileRepository(prisma);
  const addresses = new PrismaAddressRepository(prisma);

  const profiles = new ProfileController(
    new GetMyProfileUseCase(customers, drivers),
    new UpdateMyProfileUseCase(customers, clock),
    new SetDefaultAddressUseCase(customers, addresses, clock),
  );
  const addressCtl = new AddressController(
    new ListAddressesUseCase(addresses),
    new CreateAddressUseCase(customers, addresses, clock, () => uuidV7()),
    new UpdateAddressUseCase(addresses),
    new DeleteAddressUseCase(addresses, customers),
  );
  const driverCtl = new DriverController(
    new GetMyProfileUseCase(customers, drivers),
    new UpdateDriverProfileUseCase(drivers, clock),
    new SetAvailabilityUseCase(drivers, clock, publisher),
  );
  const internalCtl = new InternalController(
    new GetDriverForServiceUseCase(customers, drivers),
    new GetAddressForServiceUseCase(addresses),
  );

  let shuttingDown = false;
  const health = new HealthController(prisma, () => activeChannel, () => shuttingDown);

  const userJwt = new UserJwtVerifier(USER_SECRET);
  const serviceJwt = new ServiceJwtVerifier(SERVICE_SECRET, "user-service");

  const handleRegistered = new HandleUserRegisteredUseCase(uow, clock);
  const handleRoleChanged = new HandleUserRoleChangedUseCase(uow, clock, publisher);

  let consumer: { stop: () => Promise<void> } | null = null;
  if (opts?.startConsumer ?? true) {
    consumer = await startUserEventsConsumer({ channel: amqpCh, logger, handleRegistered, handleRoleChanged });
  }

  const app = createApp({
    logger, userJwt, serviceJwt,
    profiles, addresses: addressCtl, drivers: driverCtl, internal: internalCtl, health,
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    pg, rabbit, server, port,
    baseUrl: `http://127.0.0.1:${port}`,
    stop: async () => {
      shuttingDown = true;
      try { if (consumer) await consumer.stop(); } catch { /* ignore */ }
      await new Promise<void>((resolve) => server.close(() => resolve()));
      try { await amqpCh.close(); } catch { /* ignore */ }
      try { await amqpConn.close(); } catch { /* ignore */ }
      await prisma.$disconnect();
      await stopRabbit(rabbit);
      await stopPg(pg);
    },
    setShuttingDown: () => { shuttingDown = true; },
    signUserJwt: (userId, role) => sign({ sub: userId, role }, USER_SECRET, { algorithm: "HS256", expiresIn: "5m" }),
    signServiceJwt: (caller) => sign({ sub: `svc:${caller}`, aud: "user-service" }, SERVICE_SECRET, { algorithm: "HS256", expiresIn: "5m" }),
    publishEvent: async (routingKey, envelope) => {
      amqpCh.publish("logistics.events", routingKey, Buffer.from(JSON.stringify(envelope)), { contentType: "application/json", persistent: true });
    },
    prismaResetAll: async () => {
      await pg.prisma.processedEvent.deleteMany();
      await pg.prisma.address.deleteMany();
      await pg.prisma.driverProfile.deleteMany();
      await pg.prisma.customerProfile.deleteMany();
    },
  };
}
