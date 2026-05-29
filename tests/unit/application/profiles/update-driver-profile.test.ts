import { UpdateDriverProfileUseCase } from "../../../../src/application/profiles/update-driver-profile.use-case.js";
import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryDriverProfileRepository } from "../../fakes/in-memory-driver-profile-repository.js";
import { FixedClock } from "../../fakes/fixed-clock.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const drivers = new InMemoryDriverProfileRepository();
  const clock = new FixedClock(NOW);
  return { drivers, clock, sut: new UpdateDriverProfileUseCase(drivers, clock) };
}

describe("UpdateDriverProfileUseCase", () => {
  it("sets vehicle type and license plate; profile becomes complete", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    const result = await sut.execute({
      userId: USER_ID,
      vehicleType: "motorcycle",
      licensePlate: "ABC-1234",
    });
    expect(result.vehicleType).toBe("motorcycle");
    expect(result.profileComplete).toBe(true);
  });

  it("rejects invalid vehicle type", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    await expect(sut.execute({ userId: USER_ID, vehicleType: "spaceship", licensePlate: undefined })).rejects.toThrow();
  });

  it("throws ProfileNotFoundError when driver row missing", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ userId: USER_ID, vehicleType: "car", licensePlate: "AAA" })).rejects.toThrow(ProfileNotFoundError);
  });

  it("does not auto-flip availability to true when becoming complete", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    const result = await sut.execute({
      userId: USER_ID,
      vehicleType: "car",
      licensePlate: "AAA-1",
    });
    expect(result.isAvailable).toBe(false);
  });
});
