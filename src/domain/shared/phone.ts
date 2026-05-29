export class InvalidPhoneError extends Error {
  constructor(value: string) {
    super(`Invalid phone: ${value}`);
    this.name = "InvalidPhoneError";
  }
}

export class Phone {
  private constructor(readonly value: string) {}

  static of(raw: string): Phone {
    const trimmed = raw.trim();
    if (trimmed.length < 7 || trimmed.length > 20) {
      throw new InvalidPhoneError(raw);
    }
    return new Phone(trimmed);
  }

  equals(other: Phone): boolean {
    return this.value === other.value;
  }
}
