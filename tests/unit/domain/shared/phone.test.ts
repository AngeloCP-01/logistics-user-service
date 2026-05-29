import { Phone } from "../../../../src/domain/shared/phone.js";
import { InvalidPhoneError } from "../../../../src/domain/shared/phone.js";

describe("Phone", () => {
  it("accepts a 7-character value", () => {
    expect(Phone.of("1234567").value).toBe("1234567");
  });

  it("accepts a 20-character value", () => {
    const v = "+".repeat(1) + "1".repeat(19);
    expect(Phone.of(v).value).toBe(v);
  });

  it("rejects values shorter than 7 chars", () => {
    expect(() => Phone.of("123")).toThrow(InvalidPhoneError);
  });

  it("rejects values longer than 20 chars", () => {
    expect(() => Phone.of("1".repeat(21))).toThrow(InvalidPhoneError);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(Phone.of("  1234567  ").value).toBe("1234567");
  });

  it("treats empty after trim as invalid", () => {
    expect(() => Phone.of("   ")).toThrow(InvalidPhoneError);
  });

  it("equals by value", () => {
    expect(Phone.of("1234567").equals(Phone.of("1234567"))).toBe(true);
    expect(Phone.of("1234567").equals(Phone.of("9999999"))).toBe(false);
  });
});
