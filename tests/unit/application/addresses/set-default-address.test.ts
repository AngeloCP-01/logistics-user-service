import { SetDefaultAddressUseCase } from "../../../../src/application/addresses/set-default-address.use-case.js";
import { Address } from "../../../../src/domain/address/address.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { AddressNotFoundError, ProfileNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";
import { FixedClock } from "../../fakes/fixed-clock.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_A = UserId.of("11111111-1111-7111-8111-111111111111");
const USER_B = UserId.of("22222222-2222-7222-8222-222222222222");
const ADDRESS_ID = AddressId.of("33333333-3333-7333-8333-333333333333");

function makeSut() {
  const addresses = new InMemoryAddressRepository();
  const customers = new InMemoryCustomerProfileRepository();
  const clock = new FixedClock(NOW);
  return { addresses, customers, clock, sut: new SetDefaultAddressUseCase(customers, addresses, clock) };
}

describe("SetDefaultAddressUseCase", () => {
  it("sets the default", async () => {
    const { addresses, customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW }));
    await addresses.save(Address.create({
      id: ADDRESS_ID, userId: USER_A, label: "Home",
      street: "x", city: "y", country: Country.of("PH"),
      coordinates: Coordinates.of(14, 120), now: NOW,
    }));

    const result = await sut.execute({ userId: USER_A, addressId: ADDRESS_ID });
    expect(result.defaultAddressId).toBe(ADDRESS_ID);
  });

  it("throws AddressNotFoundError when address belongs to another user", async () => {
    const { addresses, customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW }));
    await addresses.save(Address.create({
      id: ADDRESS_ID, userId: USER_B, label: "Home",
      street: "x", city: "y", country: Country.of("PH"),
      coordinates: Coordinates.of(14, 120), now: NOW,
    }));

    await expect(sut.execute({ userId: USER_A, addressId: ADDRESS_ID })).rejects.toThrow(AddressNotFoundError);
  });

  it("throws ProfileNotFoundError when caller has no customer row", async () => {
    const { addresses, sut } = makeSut();
    await addresses.save(Address.create({
      id: ADDRESS_ID, userId: USER_A, label: "Home",
      street: "x", city: "y", country: Country.of("PH"),
      coordinates: Coordinates.of(14, 120), now: NOW,
    }));
    await expect(sut.execute({ userId: USER_A, addressId: ADDRESS_ID })).rejects.toThrow(ProfileNotFoundError);
  });
});
