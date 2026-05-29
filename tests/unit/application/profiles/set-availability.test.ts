import { SetAvailabilityUseCase } from "../../../../src/application/profiles/set-availability.use-case.js";
import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { DriverProfileIncompleteError, ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryDriverProfileRepository } from "../../fakes/in-memory-driver-profile-repository.js";
import { FixedClock } from "../../fakes/fixed-clock.js";
import { SpyEventPublisher } from "../../fakes/spy-event-publisher.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const drivers = new InMemoryDriverProfileRepository();
  const clock = new FixedClock(NOW);
  const events = new SpyEventPublisher();
  return { drivers, clock, events, sut: new SetAvailabilityUseCase(drivers, clock, events) };
}

async function seedCompleteDriver(drivers: InMemoryDriverProfileRepository): Promise<void> {
  const p = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
  p.updateAttributes({ vehicleType: "motorcycle", licensePlate: "ABC-1234", now: NOW });
  await drivers.save(p);
}

describe("SetAvailabilityUseCase", () => {
  it("flips available to true and publishes event", async () => {
    const { drivers, events, sut } = makeSut();
    await seedCompleteDriver(drivers);

    const result = await sut.execute({ userId: USER_ID, available: true, correlationId: "rid-1" });
    expect(result.isAvailable).toBe(true);
    expect(events.availability).toHaveLength(1);
    expect(events.availability[0]!.event.isAvailable).toBe(true);
    expect(events.availability[0]!.correlationId).toBe("rid-1");
  });

  it("flips available to false and publishes event", async () => {
    const { drivers, events, sut } = makeSut();
    await seedCompleteDriver(drivers);
    await sut.execute({ userId: USER_ID, available: true, correlationId: "rid-1" });
    events.availability.length = 0;

    await sut.execute({ userId: USER_ID, available: false, correlationId: "rid-2" });
    expect(events.availability).toHaveLength(1);
    expect(events.availability[0]!.event.isAvailable).toBe(false);
  });

  it("is a no-op (no event published) when value is unchanged", async () => {
    const { drivers, events, sut } = makeSut();
    await seedCompleteDriver(drivers);
    await sut.execute({ userId: USER_ID, available: true, correlationId: "rid-1" });
    events.availability.length = 0;

    await sut.execute({ userId: USER_ID, available: true, correlationId: "rid-2" });
    expect(events.availability).toHaveLength(0);
  });

  it("throws DriverProfileIncompleteError when setting true on incomplete profile", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    await expect(sut.execute({ userId: USER_ID, available: true, correlationId: "rid-1" })).rejects.toThrow(DriverProfileIncompleteError);
  });

  it("throws ProfileNotFoundError when driver row missing", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ userId: USER_ID, available: true, correlationId: "rid-1" })).rejects.toThrow(ProfileNotFoundError);
  });
});
