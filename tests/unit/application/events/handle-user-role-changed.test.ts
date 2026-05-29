import { HandleUserRoleChangedUseCase } from "../../../../src/application/events/handle-user-role-changed.use-case.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { InMemoryUnitOfWork } from "../../fakes/in-memory-unit-of-work.js";
import { FixedClock } from "../../fakes/fixed-clock.js";
import { SpyEventPublisher } from "../../fakes/spy-event-publisher.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");
const EVENT_ID = "44444444-4444-7444-8444-444444444444";

function makeSut() {
  const uow = new InMemoryUnitOfWork();
  const clock = new FixedClock(NOW);
  const events = new SpyEventPublisher();
  return { uow, clock, events, sut: new HandleUserRoleChangedUseCase(uow, clock, events) };
}

describe("HandleUserRoleChangedUseCase", () => {
  it("creates driver row when customer -> driver", async () => {
    const { uow, sut } = makeSut();
    await uow.customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "customer", newRole: "driver", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(await uow.drivers.byUserId(USER_ID)).not.toBeNull();
  });

  it("deletes driver row when driver -> customer", async () => {
    const { uow, sut } = makeSut();
    await uow.customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await uow.drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "driver", newRole: "customer", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(await uow.drivers.byUserId(USER_ID)).toBeNull();
  });

  it("publishes final isAvailable=false when demoting an available driver", async () => {
    const { uow, events, sut } = makeSut();
    await uow.customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "motorcycle", licensePlate: "ABC", now: NOW });
    d.setAvailable(true, NOW);
    await uow.drivers.save(d);

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "driver", newRole: "customer", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(events.availability).toHaveLength(1);
    expect(events.availability[0]!.event.isAvailable).toBe(false);
    expect(events.availability[0]!.correlationId).toBe("rid-1");
  });

  it("does not publish when demoting an unavailable driver", async () => {
    const { uow, events, sut } = makeSut();
    await uow.customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await uow.drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "driver", newRole: "customer", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(events.availability).toHaveLength(0);
  });

  it("creates missing customer row defensively (out-of-order delivery)", async () => {
    const { uow, sut } = makeSut();
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "customer", newRole: "driver", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(await uow.customers.byUserId(USER_ID)).not.toBeNull();
    expect(await uow.drivers.byUserId(USER_ID)).not.toBeNull();
  });

  it("is idempotent on duplicate eventId", async () => {
    const { uow, events, sut } = makeSut();
    await uow.customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));

    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "customer", newRole: "driver", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    await sut.execute({
      envelope: { eventId: EVENT_ID, correlationId: "rid-1" },
      data: { userId: USER_ID, oldRole: "customer", newRole: "driver", changedBy: "admin-id", changedAt: NOW.toISOString() },
    });
    expect(events.availability).toHaveLength(0);
  });
});
