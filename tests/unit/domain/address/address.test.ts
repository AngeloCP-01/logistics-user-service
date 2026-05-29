import { Address } from "../../../../src/domain/address/address.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";
import { Country } from "../../../../src/domain/shared/country.js";
import { Coordinates } from "../../../../src/domain/shared/coordinates.js";
import { InvariantViolationError } from "../../../../src/domain/shared/errors.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");
const ADDRESS_ID = AddressId.of("22222222-2222-7222-8222-222222222222");
const PH = Country.of("PH");
const MANILA = Coordinates.of(14.5995, 120.9842);

describe("Address", () => {
  it("creates with all fields", () => {
    const a = Address.create({
      id: ADDRESS_ID,
      userId: USER_ID,
      label: "Home",
      street: "123 Rizal Ave",
      city: "Manila",
      country: PH,
      coordinates: MANILA,
      now: NOW,
    });
    expect(a.id).toBe(ADDRESS_ID);
    expect(a.label).toBe("Home");
    expect(a.coordinates.lat).toBe(14.5995);
  });

  it("rejects empty label", () => {
    expect(() => Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "", street: "x", city: "y", country: PH, coordinates: MANILA, now: NOW,
    })).toThrow(InvariantViolationError);
  });

  it("rejects label longer than 40 chars", () => {
    expect(() => Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "a".repeat(41), street: "x", city: "y", country: PH, coordinates: MANILA, now: NOW,
    })).toThrow(InvariantViolationError);
  });

  it("rejects empty street", () => {
    expect(() => Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home", street: "", city: "y", country: PH, coordinates: MANILA, now: NOW,
    })).toThrow(InvariantViolationError);
  });

  it("rejects street longer than 200 chars", () => {
    expect(() => Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home", street: "s".repeat(201), city: "y", country: PH, coordinates: MANILA, now: NOW,
    })).toThrow(InvariantViolationError);
  });

  it("rejects empty city", () => {
    expect(() => Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home", street: "x", city: "", country: PH, coordinates: MANILA, now: NOW,
    })).toThrow(InvariantViolationError);
  });

  it("updates label", () => {
    const a = Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home", street: "x", city: "y", country: PH, coordinates: MANILA, now: NOW,
    });
    a.update({ label: "Office", street: undefined, city: undefined, country: undefined, coordinates: undefined });
    expect(a.label).toBe("Office");
  });

  it("updates coordinates", () => {
    const a = Address.create({
      id: ADDRESS_ID, userId: USER_ID, label: "Home", street: "x", city: "y", country: PH, coordinates: MANILA, now: NOW,
    });
    const cebu = Coordinates.of(10.3157, 123.8854);
    a.update({ label: undefined, street: undefined, city: undefined, country: undefined, coordinates: cebu });
    expect(a.coordinates.lat).toBe(10.3157);
  });

  it("rehydrates from persistence", () => {
    const a = Address.fromPersistence({
      id: ADDRESS_ID,
      userId: USER_ID,
      label: "Persisted",
      street: "x",
      city: "y",
      country: PH,
      coordinates: MANILA,
      createdAt: NOW,
    });
    expect(a.label).toBe("Persisted");
  });
});
