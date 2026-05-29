export type AddressId = string & { readonly __brand: "AddressId" };
export const AddressId = {
  of(value: string): AddressId {
    if (!/^[0-9a-f-]{36}$/i.test(value)) {
      throw new InvalidAddressIdError(value);
    }
    return value as AddressId;
  },
};

export class InvalidAddressIdError extends Error {
  constructor(value: string) {
    super(`Invalid address id: ${value}`);
    this.name = "InvalidAddressIdError";
  }
}
