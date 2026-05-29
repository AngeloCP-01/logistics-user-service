import { UpdateAddressUseCase } from "../../../../src/application/addresses/update-address.use-case.js";
import { Address } from "../../../../src/domain/address/address.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { AddressNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_A = UserId.of("11111111-1111-7111-8111-111111111111");
const USER_B = UserId.of("22222222-2222-7222-8222-222222222222");
const ADDRESS_ID = AddressId.of("33333333-3333-7333-8333-333333333333");

function makeSut() {
  const addresses = new InMemoryAddressRepository();
  return { addresses, sut: new UpdateAddressUseCase(addresses) };
}

async function seedAddress(addresses: InMemoryAddressRepository, owner: UserId): Promise<void> {
  await addresses.save(Address.create({
    id: ADDRESS_ID, userId: owner, label: "Home",
    street: "x", city: "y", country: Country.of("PH"),
    coordinates: Coordinates.of(14, 120), now: NOW,
  }));
}

describe("UpdateAddressUseCase", () => {
  it("updates label", async () => {
    const { addresses, sut } = makeSut();
    await seedAddress(addresses, USER_A);
    const result = await sut.execute({ userId: USER_A, id: ADDRESS_ID, label: "Office", street: undefined, city: undefined, country: undefined, lat: undefined, lng: undefined });
    expect(result.label).toBe("Office");
  });

  it("throws AddressNotFoundError when id is not owned by caller", async () => {
    const { addresses, sut } = makeSut();
    await seedAddress(addresses, USER_B);
    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID, label: "Office", street: undefined, city: undefined, country: undefined, lat: undefined, lng: undefined })).rejects.toThrow(AddressNotFoundError);
  });

  it("throws AddressNotFoundError when id does not exist", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID, label: "Office", street: undefined, city: undefined, country: undefined, lat: undefined, lng: undefined })).rejects.toThrow(AddressNotFoundError);
  });

  it("requires both lat and lng together (or neither)", async () => {
    const { addresses, sut } = makeSut();
    await seedAddress(addresses, USER_A);
    await expect(sut.execute({ userId: USER_A, id: ADDRESS_ID, label: undefined, street: undefined, city: undefined, country: undefined, lat: 15, lng: undefined })).rejects.toThrow();
  });
});
