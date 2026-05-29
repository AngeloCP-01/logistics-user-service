import http from "node:http";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./infrastructure/logger.js";
import { createPrismaClient } from "./infrastructure/persistence/prisma-client.js";
import { PrismaUnitOfWork } from "./infrastructure/persistence/prisma-unit-of-work.js";
import { PrismaCustomerProfileRepository } from "./infrastructure/persistence/prisma-customer-profile-repository.js";
import { PrismaDriverProfileRepository } from "./infrastructure/persistence/prisma-driver-profile-repository.js";
import { PrismaAddressRepository } from "./infrastructure/persistence/prisma-address-repository.js";
import { SystemClock } from "./infrastructure/clock/system-clock.js";
import { connect } from "./infrastructure/messaging/rabbitmq-connection.js";
import { RabbitMqEventPublisher } from "./infrastructure/messaging/rabbitmq-event-publisher.js";
import { UserJwtVerifier } from "./infrastructure/auth/user-jwt-verifier.js";
import { ServiceJwtVerifier } from "./infrastructure/auth/service-jwt-verifier.js";
import { v7 as uuidV7 } from "uuid";

import { GetMyProfileUseCase } from "./application/profiles/get-my-profile.use-case.js";
import { UpdateMyProfileUseCase } from "./application/profiles/update-my-profile.use-case.js";
import { UpdateDriverProfileUseCase } from "./application/profiles/update-driver-profile.use-case.js";
import { SetAvailabilityUseCase } from "./application/profiles/set-availability.use-case.js";
import { ListAddressesUseCase } from "./application/addresses/list-addresses.use-case.js";
import { CreateAddressUseCase } from "./application/addresses/create-address.use-case.js";
import { UpdateAddressUseCase } from "./application/addresses/update-address.use-case.js";
import { DeleteAddressUseCase } from "./application/addresses/delete-address.use-case.js";
import { SetDefaultAddressUseCase } from "./application/addresses/set-default-address.use-case.js";
import { GetDriverForServiceUseCase } from "./application/internal/get-driver-for-service.use-case.js";
import { GetAddressForServiceUseCase } from "./application/internal/get-address-for-service.use-case.js";
import { HandleUserRegisteredUseCase } from "./application/events/handle-user-registered.use-case.js";
import { HandleUserRoleChangedUseCase } from "./application/events/handle-user-role-changed.use-case.js";

import { ProfileController } from "./interfaces/http/controllers/profile-controller.js";
import { AddressController } from "./interfaces/http/controllers/address-controller.js";
import { DriverController } from "./interfaces/http/controllers/driver-controller.js";
import { InternalController } from "./interfaces/http/controllers/internal-controller.js";
import { HealthController } from "./interfaces/http/controllers/health-controller.js";
import { startUserEventsConsumer } from "./interfaces/events/user-events-consumer.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  if (process.argv[2] === "--healthcheck") {
    console.log(JSON.stringify({ ok: true, service: "user-service" }));
    process.exit(0);
  }

  const env = loadEnv();
  const logger = createLogger(env);

  const prisma = createPrismaClient(env);
  await prisma.$connect();

  const { connection: amqpConn, channel: amqpCh } = await connect(env.RABBITMQ_URL);
  const eventPublisher = new RabbitMqEventPublisher(amqpCh);

  const clock = new SystemClock();
  const uow = new PrismaUnitOfWork(prisma);
  const customers = new PrismaCustomerProfileRepository(prisma);
  const drivers = new PrismaDriverProfileRepository(prisma);
  const addresses = new PrismaAddressRepository(prisma);

  const getMyProfile = new GetMyProfileUseCase(customers, drivers);
  const updateMyProfile = new UpdateMyProfileUseCase(customers, clock);
  const updateDriverProfile = new UpdateDriverProfileUseCase(drivers, clock);
  const setAvailability = new SetAvailabilityUseCase(drivers, clock, eventPublisher);
  const listAddresses = new ListAddressesUseCase(addresses);
  const createAddress = new CreateAddressUseCase(customers, addresses, clock, () => uuidV7());
  const updateAddress = new UpdateAddressUseCase(addresses);
  const deleteAddress = new DeleteAddressUseCase(addresses, customers);
  const setDefaultAddress = new SetDefaultAddressUseCase(customers, addresses, clock);
  const getDriverForService = new GetDriverForServiceUseCase(customers, drivers);
  const getAddressForService = new GetAddressForServiceUseCase(addresses);
  const handleRegistered = new HandleUserRegisteredUseCase(uow, clock);
  const handleRoleChanged = new HandleUserRoleChangedUseCase(uow, clock, eventPublisher);

  let shuttingDown = false;
  let activeChannel: typeof amqpCh | null = amqpCh;

  amqpCh.on("close", () => { activeChannel = null; });

  const health = new HealthController(prisma, () => activeChannel, () => shuttingDown);
  const profiles = new ProfileController(getMyProfile, updateMyProfile, setDefaultAddress);
  const addressCtl = new AddressController(listAddresses, createAddress, updateAddress, deleteAddress);
  const driverCtl = new DriverController(getMyProfile, updateDriverProfile, setAvailability);
  const internalCtl = new InternalController(getDriverForService, getAddressForService);

  const userJwt = new UserJwtVerifier(env.USER_JWT_SECRET);
  const serviceJwt = new ServiceJwtVerifier(env.USER_SERVICE_JWT_SECRET, "user-service");

  const app = createApp({
    logger,
    userJwt, serviceJwt,
    profiles, addresses: addressCtl, drivers: driverCtl, internal: internalCtl, health,
  });

  const consumer = await startUserEventsConsumer({
    channel: amqpCh,
    logger,
    handleRegistered,
    handleRoleChanged,
  });

  const server = http.createServer(app);
  server.listen(env.PORT, () => logger.info({ event: "listening", port: env.PORT }));

  async function shutdown(signal: string): Promise<void> {
    logger.info({ event: "shutdown_started", signal });
    shuttingDown = true;
    try {
      await consumer.stop();
      activeChannel = null;
      await amqpCh.close().catch(() => undefined);
      await amqpConn.close().catch(() => undefined);
    } catch (e) { logger.warn({ event: "shutdown_amqp_close_failed", err: e }); }

    server.close(async (err) => {
      if (err) logger.warn({ event: "shutdown_http_close_error", err });
      try { await prisma.$disconnect(); } catch { /* ignore */ }
      logger.info({ event: "shutdown_complete" });
      process.exit(0);
    });
    setTimeout(() => { logger.warn({ event: "shutdown_forced_timeout" }); process.exit(1); }, 10000).unref();
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(JSON.stringify({ level: "error", event: "boot_failed", err: String(err) }));
  process.exit(1);
});
