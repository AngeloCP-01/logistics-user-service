import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { DriverProfileRepository } from "../ports/driver-profile-repository.js";
import type { UserId } from "../../domain/shared/user-id.js";
import type { AddressId } from "../../domain/shared/address-id.js";
import type { VehicleType } from "../../domain/driver/vehicle-type.js";
import { ProfileNotFoundError } from "../../domain/shared/errors.js";

export type Role = "customer" | "driver" | "admin";

export interface MyProfileView {
  userId: UserId;
  role: Role;
  displayName: string;
  phone: string | null;
  defaultAddressId: AddressId | null;
  driver: {
    vehicleType: VehicleType | null;
    licensePlate: string | null;
    isAvailable: boolean;
    profileComplete: boolean;
  } | null;
}

export class GetMyProfileUseCase {
  constructor(
    private readonly customers: CustomerProfileRepository,
    private readonly drivers: DriverProfileRepository,
  ) {}

  async execute(args: { userId: UserId; role: Role }): Promise<MyProfileView> {
    if (args.role === "admin") {
      return {
        userId: args.userId,
        role: "admin",
        displayName: "Admin",
        phone: null,
        defaultAddressId: null,
        driver: null,
      };
    }

    const customer = await this.customers.byUserId(args.userId);
    if (!customer) {
      throw new ProfileNotFoundError(args.userId);
    }

    let driverSlice: MyProfileView["driver"] = null;
    if (args.role === "driver") {
      const driver = await this.drivers.byUserId(args.userId);
      if (driver) {
        driverSlice = {
          vehicleType: driver.vehicleType,
          licensePlate: driver.licensePlate,
          isAvailable: driver.isAvailable,
          profileComplete: driver.profileComplete,
        };
      }
    }

    return {
      userId: customer.userId,
      role: args.role,
      displayName: customer.displayName,
      phone: customer.phone?.value ?? null,
      defaultAddressId: customer.defaultAddressId,
      driver: driverSlice,
    };
  }
}
