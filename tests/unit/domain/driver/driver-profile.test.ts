import { DriverProfile } from "../../../../src/domain/driver/driver-profile.js";
import { UserId } from "../../../../src/domain/shared/user-id.js";
import { DriverProfileIncompleteError } from "../../../../src/domain/shared/errors.js";

const NOW = new Date("2026-05-29T00:00:00Z");
const USER_ID = UserId.of("11111111-1111-7111-8111-111111111111");

describe("DriverProfile", () => {
  it("creates incomplete", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    expect(d.userId).toBe(USER_ID);
    expect(d.vehicleType).toBeNull();
    expect(d.licensePlate).toBeNull();
    expect(d.isAvailable).toBe(false);
    expect(d.profileComplete).toBe(false);
  });

  it("becomes complete when both fields are set", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "motorcycle", licensePlate: "ABC-1234", now: NOW });
    expect(d.profileComplete).toBe(true);
  });

  it("remains incomplete when only vehicle type is set", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "car", licensePlate: undefined, now: NOW });
    expect(d.vehicleType).toBe("car");
    expect(d.licensePlate).toBeNull();
    expect(d.profileComplete).toBe(false);
  });

  it("remains incomplete when only license plate is set", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: undefined, licensePlate: "XYZ-9999", now: NOW });
    expect(d.licensePlate).toBe("XYZ-9999");
    expect(d.profileComplete).toBe(false);
  });

  it("rejects setAvailable(true) when incomplete", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    expect(() => d.setAvailable(true, NOW)).toThrow(DriverProfileIncompleteError);
  });

  it("allows setAvailable(false) even when incomplete", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    expect(() => d.setAvailable(false, NOW)).not.toThrow();
    expect(d.isAvailable).toBe(false);
  });

  it("allows setAvailable(true) when complete", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "motorcycle", licensePlate: "ABC", now: NOW });
    d.setAvailable(true, NOW);
    expect(d.isAvailable).toBe(true);
  });

  it("setAvailable returns whether the value actually changed", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    d.updateAttributes({ vehicleType: "car", licensePlate: "AAA", now: NOW });
    expect(d.setAvailable(true, NOW)).toBe(true);
    expect(d.setAvailable(true, NOW)).toBe(false);
    expect(d.setAvailable(false, NOW)).toBe(true);
  });

  it("rejects empty license plate", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    expect(() => d.updateAttributes({ vehicleType: undefined, licensePlate: "", now: NOW })).toThrow();
  });

  it("rejects license plate longer than 20 chars", () => {
    const d = DriverProfile.createIncomplete({ userId: USER_ID, now: NOW });
    expect(() =>
      d.updateAttributes({ vehicleType: undefined, licensePlate: "a".repeat(21), now: NOW }),
    ).toThrow();
  });

  it("rehydrates from persistence", () => {
    const d = DriverProfile.fromPersistence({
      userId: USER_ID,
      vehicleType: "van",
      licensePlate: "VAN-001",
      isAvailable: true,
      profileComplete: true,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(d.vehicleType).toBe("van");
    expect(d.licensePlate).toBe("VAN-001");
    expect(d.isAvailable).toBe(true);
  });
});
