import { GetAddressForServiceUseCase } from "../../../../src/application/internal/get-address-for-service.use-case.js";
import { Address } from "../../../../src/domain/address/address.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { AddressNotFoundError } from "../../../../src/domain/shared/errors.js";
import { InMemoryAddressRepository } from "../../fakes/in-memory-address-repository.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");
const ADDRESS_ID = AddressId.of("33333333-3333-7333-8333-333333333333");

function makeSut() {
  const addresses = new InMemoryAddressRepository();
  return { addresses, sut: new GetAddressForServiceUseCase(addresses) };
}

describe("GetAddressForServiceUseCase", () => {
  it("returns the address regardless of caller user-id (service trust)", async () => {
    const { addresses, sut } = makeSut();
    await addresses.save(Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home",
      street: "x", city: "y", country: Country.of("PH"),
      coordinates: Coordinates.of(14, 120), now: NOW,
    }));

    const result = await sut.execute({ id: ADDRESS_ID });
    expect(result.id).toBe(ADDRESS_ID);
    expect(result.userId).toBe(USER_ID);
  });

  it("throws AddressNotFoundError when missing", async () => {
    const { sut } = makeSut();
    await expect(sut.execute({ id: ADDRESS_ID })).rejects.toThrow(AddressNotFoundError);
  });
});
