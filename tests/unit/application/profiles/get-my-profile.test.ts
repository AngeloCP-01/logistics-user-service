import { GetMyProfileUseCase } from "../../../../src/application/profiles/get-my-profile.use-case.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";
import { InMemoryDriverProfileRepository } from "../../fakes/in-memory-driver-profile-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const customers = new InMemoryCustomerProfileRepository();
  const drivers = new InMemoryDriverProfileRepository();
  return { customers, drivers, sut: new GetMyProfileUseCase(customers, drivers) };
}

describe("GetMyProfileUseCase", () => {
  it("returns synthesized response for admin without DB lookup", async () => {
    const { sut } = makeSut();
    const result = await sut.execute({ userId: USER_ID, role: "admin" });
    expect(result).toEqual({
      userId: USER_ID,
      role: "admin",
      displayName: "Admin",
      phone: null,
      defaultAddressId: null,
      driver: null,
    });
  });

  it("returns customer profile when role is customer", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    const result = await sut.execute({ userId: USER_ID, role: "customer" });
    expect(result.role).toBe("customer");
    expect(result.displayName).toBe("Alice");
    expect(result.driver).toBeNull();
  });

  it("returns customer + driver attrs when role is driver", async () => {
    const { customers, drivers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Bob", now: NOW }));
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    const result = await sut.execute({ userId: USER_ID, role: "driver" });
    expect(result.role).toBe("driver");
    expect(result.displayName).toBe("Bob");
    expect(result.driver).toEqual({
      vehicleType: null,
      licensePlate: null,
      isAvailable: false,
      profileComplete: false,
    });
  });

  it("throws ProfileNotFoundError for customer without row", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ userId: USER_ID, role: "customer" })).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ProfileNotFoundError for driver without customer row", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    await expect(sut.execute({ userId: USER_ID, role: "driver" })).rejects.toThrow(ProfileNotFoundError);
  });

  it("returns customer-shape driver=null when driver row missing (defensive)", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Carol", now: NOW }));
    const result = await sut.execute({ userId: USER_ID, role: "driver" });
    expect(result.driver).toBeNull();
  });
});
