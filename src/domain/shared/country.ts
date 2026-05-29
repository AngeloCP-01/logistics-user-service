export class InvalidCountryError extends Error {
  constructor(value: string) {
    super(`Invalid country code: ${value}`);
    this.name = "InvalidCountryError";
  }
}

export class Country {
  private constructor(readonly value: string) {}

  static of(raw: string): Country {
    if (!/^[A-Za-z]{2}$/.test(raw)) {
      throw new InvalidCountryError(raw);
    }
    return new Country(raw.toUpperCase());
  }

  equals(other: Country): boolean {
    return this.value === other.value;
  }
}
