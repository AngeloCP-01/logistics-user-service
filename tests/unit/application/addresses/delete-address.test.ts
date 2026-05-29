import { DeleteAddressUseCase } from "../../../../src/application/addresses/delete-address.use-case.js";
import { Address } from "../../../../src/domain/address/address.js";
import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { AddressNotFoundError, DefaultAddressInUseError } from "../../../../src/domain/shared/errors.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";
import { InMemoryCustomerProfileRepository } from "../../fakes/in-memory-customer-profile-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_A = UserId.of("11111111-1111-7111-8111-111111111111");
const USER_B = UserId.of("22222222-2222-7222-8222-222222222222");
const ADDRESS_ID = AddressId.of("33333333-3333-7333-8333-333333333333");

function makeSut() {
  const addresses = new InMemoryAddressRepository();
  const customers = new InMemoryCustomerProfileRepository();
  return { addresses, customers, sut: new DeleteAddressUseCase(addresses, customers) };
}

async function seedAddressFor(addresses: InMemoryAddressRepository, owner: UserId): Promise<void> {
  await addresses.save(Address.create({
    id: ADDRESS_ID, userId: owner, label: "Home",
    street: "x", city: "y", country: Country.of("PH"),
    coordinates: Coordinates.of(14, 120), now: NOW,
  }));
}

describe("DeleteAddressUseCase", () => {
  it("deletes the address", async () => {
    const { addresses, customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW }));
    await seedAddressFor(addresses, USER_A);

    await sut.execute({ userId: USER_A, id: ADDRESS_ID });
    expect(await addresses.byId(ADDRESS_ID)).toBeNull();
  });

  it("rejects when address is the customer's default", async () => {
    const { addresses, customers, sut } = makeSut();
    const c = CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW });
    c.setDefaultAddress(ADDRESS_ID, NOW);
    await customers.save(c);
    await seedAddressFor(addresses, USER_A);

    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID })).rejects.toThrow(DefaultAddressInUseError);
    expect(await addresses.byId(ADDRESS_ID)).not.toBeNull();
  });

  it("throws AddressNotFoundError when address belongs to another user", async () => {
    const { addresses, customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW }));
    await seedAddressFor(addresses, USER_B);

    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID })).rejects.toThrow(AddressNotFoundError);
  });

  it("throws AddressNotFoundError when address does not exist", async () => {
    const { customers, sut } = makeSut();
    await customers.save(CustomerProfile.create({ userId: USER_A, displayName: "Alice", now: NOW }));

    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID })).rejects.toThrow(AddressNotFoundError);
  });
});
