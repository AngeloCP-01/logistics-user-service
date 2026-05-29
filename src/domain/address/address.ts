import type { UserId } from "../shared/user-id.js";
import type { AddressId } from "../shared/address-id.js";
import type { Country } from "../shared/country.js";
import type { Coordinates } from "../shared/coordinates.js";
import { InvariantViolationError } from "../shared/errors.js";

export interface AddressSnapshot {
  id: AddressId;
  userId: UserId;
  label: string;
  street: string;
  city: string;
  country: Country;
  coordinates: Coordinates;
  createdAt: Date;
}

export class Address {
  private constructor(
    readonly id: AddressId,
    readonly userId: UserId,
    private _label: string,
    private _street: string,
    private _city: string,
    private _country: Country,
    private _coordinates: Coordinates,
    readonly createdAt: Date,
  ) {}

  static create(args: {
    id: AddressId;
    userId: UserId;
    label: string;
    street: string;
    city: string;
    country: Country;
    coordinates: Coordinates;
    now: Date;
  }): Address {
    Address.assertLabel(args.label);
    Address.assertStreet(args.street);
    Address.assertCity(args.city);
    return new Address(
      args.id,
      args.userId,
      args.label,
      args.street,
      args.city,
      args.country,
      args.coordinates,
      args.now,
    );
  }

  static fromPersistence(snap: AddressSnapshot): Address {
    return new Address(
      snap.id,
      snap.userId,
      snap.label,
      snap.street,
      snap.city,
      snap.country,
      snap.coordinates,
      snap.createdAt,
    );
  }

  get label(): string { return this._label; }
  get street(): string { return this._street; }
  get city(): string { return this._city; }
  get country(): Country { return this._country; }
  get coordinates(): Coordinates { return this._coordinates; }

  update(args: {
    label: string | undefined;
    street: string | undefined;
    city: string | undefined;
    country: Country | undefined;
    coordinates: Coordinates | undefined;
  }): void {
    if (args.label !== undefined) { Address.assertLabel(args.label); this._label = args.label; }
    if (args.street !== undefined) { Address.assertStreet(args.street); this._street = args.street; }
    if (args.city !== undefined) { Address.assertCity(args.city); this._city = args.city; }
    if (args.country !== undefined) { this._country = args.country; }
    if (args.coordinates !== undefined) { this._coordinates = args.coordinates; }
  }

  private static assertLabel(v: string): void {
    if (v.length < 1 || v.length > 40) throw new InvariantViolationError(`label length must be 1..40, got ${v.length}`);
  }
  private static assertStreet(v: string): void {
    if (v.length < 1 || v.length > 200) throw new InvariantViolationError(`street length must be 1..200, got ${v.length}`);
  }
  private static assertCity(v: string): void {
    if (v.length < 1 || v.length > 80) throw new InvariantViolationError(`city length must be 1..80, got ${v.length}`);
  }
}
