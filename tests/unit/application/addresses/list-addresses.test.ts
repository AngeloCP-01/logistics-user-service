import { ListAddressesUseCase } from "../../../../src/application/addresses/list-addresses.use-case.js";
import { Address } from "../../../../src/domain/address/address.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_A = UserId.of("11111111-1111-7111-8111-111111111111");
const USER_B = UserId.of("22222222-2222-7222-8222-222222222222");

function makeSut() {
  const addresses = new InMemoryAddressRepository();
  return { addresses, sut: new ListAddressesUseCase(addresses) };
}

function makeAddress(id: string, userId: UserId, label: string): Address {
  return Address.create({
    id: AddressId.of(id),
    userId,
    label,
    street: "x", city: "y", country: Country.of("PH"),
    coordinates: Coordinates.of(14, 120), now: NOW,
  });
}

describe("ListAddressesUseCase", () => {
  it("returns only the caller's addresses", async () => {
    const { addresses, sut } = makeSut();
    await addresses.save(makeAddress("11111111-1111-7111-8111-111111111111", USER_A, "Home"));
    await addresses.save(makeAddress("33333333-3333-7333-8333-333333333333", USER_A, "Work"));
    await addresses.save(makeAddress("44444444-4444-7444-8444-444444444444", USER_B, "Stranger"));

    const result = await sut.execute({ userId: USER_A });
    expect(result.items).toHaveLength(2);
    expect(result.items.map((a) => a.label).sort()).toEqual(["Home", "Work"]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns empty list when caller has no addresses", async () => {
    const { sut } = makeSut();
    const result = await sut.execute({ userId: USER_A });
    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
