import type { UserId } from "../shared/user-id.js";
import type { Phone } from "../shared/phone.js";
import type { AddressId } from "../shared/address-id.js";
import { InvariantViolationError } from "../shared/errors.js";

export interface CustomerProfileSnapshot {
  userId: UserId;
  displayName: string;
  phone: Phone | null;
  defaultAddressId: AddressId | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CustomerProfile {
  private constructor(
    readonly userId: UserId,
    private _displayName: string,
    private _phone: Phone | null,
    private _defaultAddressId: AddressId | null,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: { userId: UserId; displayName: string; now: Date }): CustomerProfile {
    CustomerProfile.assertDisplayName(args.displayName);
    return new CustomerProfile(
      args.userId,
      args.displayName,
      null,
      null,
      args.now,
      args.now,
    );
  }

  static fromPersistence(snap: CustomerProfileSnapshot): CustomerProfile {
    return new CustomerProfile(
      snap.userId,
      snap.displayName,
      snap.phone,
      snap.defaultAddressId,
      snap.createdAt,
      snap.updatedAt,
    );
  }

  get displayName(): string { return this._displayName; }
  get phone(): Phone | null { return this._phone; }
  get defaultAddressId(): AddressId | null { return this._defaultAddressId; }
  get updatedAt(): Date { return this._updatedAt; }

  updateProfile(args: { displayName: string | undefined; phone: Phone | null | undefined; now: Date }): void {
    if (args.displayName !== undefined) {
      CustomerProfile.assertDisplayName(args.displayName);
      this._displayName = args.displayName;
    }
    if (args.phone !== undefined) {
      this._phone = args.phone;
    }
    this._updatedAt = args.now;
  }

  setDefaultAddress(addressId: AddressId | null, now: Date): void {
    this._defaultAddressId = addressId;
    this._updatedAt = now;
  }

  private static assertDisplayName(value: string): void {
    if (value.length < 1 || value.length > 80) {
      throw new InvariantViolationError(`display_name length must be 1..80, got ${value.length}`);
    }
  }
}
