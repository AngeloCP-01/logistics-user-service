import { Coordinates, InvalidCoordinatesError } from "../../../../src/domain/shared/coordinates.js";

describe("Coordinates", () => {
  it("accepts valid lat/lng", () => {
    const c = Coordinates.of(14.5995, 120.9842);
    expect(c.lat).toBe(14.5995);
    expect(c.lng).toBe(120.9842);
  });

  it("accepts boundary values", () => {
    expect(() => Coordinates.of(90, 180)).not.toThrow();
    expect(() => Coordinates.of(-90, -180)).not.toThrow();
  });

  it("rejects lat > 90", () => {
    expect(() => Coordinates.of(91, 0)).toThrow(InvalidCoordinatesError);
  });

  it("rejects lat < -90", () => {
    expect(() => Coordinates.of(-91, 0)).toThrow(InvalidCoordinatesError);
  });

  it("rejects lng > 180", () => {
    expect(() => Coordinates.of(0, 181)).toThrow(InvalidCoordinatesError);
  });

  it("rejects lng < -180", () => {
    expect(() => Coordinates.of(0, -181)).toThrow(InvalidCoordinatesError);
  });

  it("rejects NaN", () => {
    expect(() => Coordinates.of(NaN, 0)).toThrow(InvalidCoordinatesError);
    expect(() => Coordinates.of(0, NaN)).toThrow(InvalidCoordinatesError);
  });
});
