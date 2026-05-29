import { UpdateMyProfileUseCase } from "../../../../src/application/profiles/update-my-profile.use-case.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { Phone } from "../../../../src/domain/shared/phone.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";
import { FixedClock } from "../../fakes/fixed-clock.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const customers = new InMemoryCustomerProfileRepository();
  const clock = new FixedClock(NOW);
  return { customers, clock, sut: new UpdateMyProfileUseCase(customers, clock) };
}

describe("UpdateMyProfileUseCase", () => {
  it("updates display name", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await sut.execute({ userId: USER_ID, displayName: "Bob", phone: undefined });
    expect((await customers.byUserId(USER_ID))!.displayName).toBe("Bob");
  });

  it("updates phone", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await sut.execute({ userId: USER_ID, displayName: undefined, phone: "1234567" });
    expect((await customers.byUserId(USER_ID))!.phone?.value).toBe("1234567");
  });

  it("clears phone with null", async () => {
    const { customers, sut } = makeSut();
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    p.updateProfile({ displayName: undefined, phone: Phone.of("1234567"), now: NOW });
    await customers.save(p);
    await sut.execute({ userId: USER_ID, displayName: undefined, phone: null });
    expect((await customers.byUserId(USER_ID))!.phone).toBeNull();
  });

  it("throws ProfileNotFoundError when row missing", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ userId: USER_ID, displayName: "x", phone: undefined })).rejects.toThrow(ProfileNotFoundError);
  });

  it("returns the updated profile", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    const result = await sut.execute({ userId: USER_ID, displayName: "Bob", phone: "9999999" });
    expect(result.displayName).toBe("Bob");
    expect(result.phone?.value).toBe("9999999");
  });
});
