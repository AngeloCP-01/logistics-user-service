import { CustomerProfile } from "../../../../src/domain/customer/customer-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { Phone } from "../../../../src/domain/shared/phone.js";
import { AddressId } from "../../../../src/domain/shared/address-id.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

describe("CustomerProfile", () => {
  it("creates with display name only", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    expect(p.userId).toBe(USER_ID);
    expect(p.displayName).toBe("Alice");
    expect(p.phone).toBeNull();
    expect(p.defaultAddressId).toBeNull();
  });

  it("updates display name and phone", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    const later = new Date("2026-05-30T00:00:00Z");
    p.updateProfile({ displayName: "Bob", phone: Phone.of("1234567"), now: later });
    expect(p.displayName).toBe("Bob");
    expect(p.phone?.value).toBe("1234567");
    expect(p.updatedAt).toEqual(later);
  });

  it("allows partial update (display name only)", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    p.updateProfile({ displayName: "Bob", phone: undefined, now: NOW });
    expect(p.displayName).toBe("Bob");
    expect(p.phone).toBeNull();
  });

  it("allows partial update (phone only)", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    p.updateProfile({ displayName: undefined, phone: Phone.of("9876543"), now: NOW });
    expect(p.displayName).toBe("Alice");
    expect(p.phone?.value).toBe("9876543");
  });

  it("clears phone when explicit null is passed", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    p.updateProfile({ displayName: undefined, phone: Phone.of("1234567"), now: NOW });
    p.updateProfile({ displayName: undefined, phone: null, now: NOW });
    expect(p.phone).toBeNull();
  });

  it("sets default address", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    const addressId = AddressId.of("22222222-2222-7222-8222-222222222222");
    p.setDefaultAddress(addressId, NOW);
    expect(p.defaultAddressId).toBe(addressId);
  });

  it("rejects empty display name on update", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    expect(() => p.updateProfile({ displayName: "", phone: undefined, now: NOW })).toThrow();
  });

  it("rejects display name longer than 80 chars", () => {
    const p = CustomerProfile.create({ userId: USER_ID, displayName: "Alice", now: NOW });
    expect(() => p.updateProfile({ displayName: "a".repeat(81), phone: undefined, now: NOW })).toThrow();
  });

  it("rehydrates from persistence", () => {
    const p = CustomerProfile.fromPersistence({
      userId: USER_ID,
      displayName: "Persisted",
      phone: Phone.of("5551234"),
      defaultAddressId: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(p.displayName).toBe("Persisted");
    expect(p.phone?.value).toBe("5551234");
  });
});
