export type UserId = string & { readonly __brand: "UserId" };
export const UserId = {
  of(value: string): UserId {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new InvalidUserIdError(value);
    }
    return value as UserId;
  },
};

export class InvalidUserIdError extends Error {
  constructor(value: string) {
    super(`Invalid user id: ${value}`);
    this.name = "InvalidUserIdError";
  }
}
