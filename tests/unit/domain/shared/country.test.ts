import { Country, InvalidCountryError } from "../../../../src/domain/shared/country.js";

describe("Country", () => {
  it("accepts a 2-letter ISO code", () => {
    expect(Country.of("PH").value).toBe("PH");
  });

  it("uppercases input", () => {
    expect(Country.of("ph").value).toBe("PH");
  });

  it("rejects single character", () => {
    expect(() => Country.of("P")).toThrow(InvalidCountryError);
  });

  it("rejects three characters", () => {
    expect(() => Country.of("PHL")).toThrow(InvalidCountryError);
  });

  it("rejects non-alpha", () => {
    expect(() => Country.of("P1")).toThrow(InvalidCountryError);
  });
});
