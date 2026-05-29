import { CreateAddressUseCase } from "../../../../src/application/addresses/create-address.use-case.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";
import { FixedClock } from "../../fakes/fixed-clock.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

function makeSut() {
  const customers = new InMemoryCustomerProfileRepository();
  const addresses = new InMemoryAddressRepository();
  const clock = new FixedClock(NOW);
  let nextId = 1;
  const idGen = () => {
    const id = String(nextId++).padStart(8, "0") + "-1111-7111-8111-111111111111";
    return id;
  };
  return { customers, addresses, clock, sut: new CreateAddressUseCase(customers, addresses, clock, idGen) };
}

describe("CreateAddressUseCase", () => {
  it("creates an address for an existing customer", async () => {
    const { customers, addresses, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));

    const result = await sut.execute({
      userId: USER_ID,
      label: "Home", street: "123 Main", city: "Manila",
      country: "PH", lat: 14.5995, lng: 120.9842,
    });

    expect(result.label).toBe("Home");
    expect(result.userId).toBe(USER_ID);
    expect((await addresses.byUserId(USER_ID))).toHaveLength(1);
  });

  it("throws ProfileNotFoundError when caller has no customer row", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({
      userId: USER_ID,
      label: "Home", street: "x", city: "y",
      country: "PH", lat: 14, lng: 120,
    })).rejects.toThrow(ProfileNotFoundError);
  });

  it("normalizes country to uppercase", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    const result = await sut.execute({
      userId: USER_ID, label: "Home", street: "x", city: "y",
      country: "ph", lat: 14, lng: 120,
    });
    expect(result.country.value).toBe("PH");
  });

  it("rejects out-of-range coordinates", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW }));
    await expect(sut.execute({
      userId: USER_ID, label: "Home", street: "x", city: "y",
      country: "PH", lat: 91, lng: 0,
    })).rejects.toThrow();
  });
});
