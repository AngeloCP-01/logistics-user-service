import type { UserId } from "../shared/user-id.js";
import { DriverProfileIncompleteError, InvariantViolationError } from "../shared/errors.js";
import type { VehicleType } from "./vehicle-type.js";

export interface DriverProfileSnapshot {
  userId: UserId;
  vehicleType: VehicleType | null;
  licensePlate: string | null;
  isAvailable: boolean;
  profileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class DriverProfile {
  private constructor(
    readonly userId: UserId,
    private _vehicleType: VehicleType | null,
    private _licensePlate: string | null,
    private _isAvailable: boolean,
    private _profileComplete: boolean,
    readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static createIncomplete(args: { userId: UserId; now: Date }): DriverProfile {
    return new DriverProfile(args.userId, null, null, false, false, args.now, args.now);
  }

  static fromPersistence(snap: DriverProfileSnapshot): DriverProfile {
    return new DriverProfile(
      snap.userId,
      snap.vehicleType,
      snap.licensePlate,
      snap.isAvailable,
      snap.profileComplete,
      snap.createdAt,
      snap.updatedAt,
    );
  }

  get vehicleType(): VehicleType | null { return this._vehicleType; }
  get licensePlate(): string | null { return this._licensePlate; }
  get isAvailable(): boolean { return this._isAvailable; }
  get profileComplete(): boolean { return this._profileComplete; }
  get updatedAt(): Date { return this._updatedAt; }

  updateAttributes(args: {
    vehicleType: VehicleType | undefined;
    licensePlate: string | undefined;
    now: Date;
  }): void {
    if (args.vehicleType !== undefined) {
      this._vehicleType = args.vehicleType;
    }
    if (args.licensePlate !== undefined) {
      DriverProfile.assertLicensePlate(args.licensePlate);
      this._licensePlate = args.licensePlate;
    }
    this._profileComplete = this._vehicleType !== null && this._licensePlate !== null;
    if (!this._profileComplete && this._isAvailable) {
      this._isAvailable = false;
    }
    this._updatedAt = args.now;
  }

  setAvailable(value: boolean, now: Date): boolean {
    if (value && !this._profileComplete) {
      throw new DriverProfileIncompleteError();
    }
    if (this._isAvailable === value) {
      return false;
    }
    this._isAvailable = value;
    this._updatedAt = now;
    return true;
  }

  private static assertLicensePlate(value: string): void {
    if (value.length < 1 || value.length > 20) {
      throw new InvariantViolationError(`license_plate length must be 1..20, got ${value.length}`);
    }
  }
}
