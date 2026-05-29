import { GetDriverForServiceUseCase } from "../../../../src/application/internal/get-driver-for-service.use-case.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { Phone } from "../../../../src/domain/shared/phone.js";
import { ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";
import { InMemoryDriverProfileRepository } from "../../fakes/in-memory-driver-profile-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const customers = new InMemoryCustomerProfileRepository();
  const drivers = new InMemoryDriverProfileRepository();
  return { customers, drivers, sut: new GetDriverForServiceUseCase(customers, drivers) };
}

describe("GetDriverForServiceUseCase", () => {
  it("returns merged customer + driver data", async () => {
    const { customers, drivers, sut } = makeSut();
    const c = CustomerProfile.create({ userId: USER_ID, displayName: "Bob", now: NOW });
    c.updateProfile({ displayName: undefined, phone: Phone.of("9991234"), now: NOW });
    await customers.save(c);
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "motorcycle", licensePlate: "ABC", now: NOW });
    await drivers.save(d);

    const result = await sut.execute({ userId: USER_ID });
    expect(result).toEqual({
      userId: USER_ID,
      displayName: "Bob",
      phone: "9991234",
      vehicleType: "motorcycle",
      licensePlate: "ABC",
      isAvailable: false,
      profileComplete: true,
    });
  });

  it("throws ProfileNotFoundError when driver row missing", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Bob", now: NOW }));
    await expect(sut.execute({ userId: USER_ID })).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ProfileNotFoundError when customer row missing (defensive)", async () => {
    const { drivers, sut } = makeSut();
    await drivers.save(DriverProfile.createIncomplete({ userId: USER_ID, now: NOW }));
    await expect(sut.execute({ userId: USER_ID })).rejects.toThrow(ProfileNotFoundError);
  });
});
