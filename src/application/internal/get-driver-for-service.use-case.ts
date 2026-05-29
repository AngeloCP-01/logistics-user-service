import type { CustomerProfileRepository } from "../ports/customer-profile-repository.js";
import type { DriverProfileRepository } from "../ports/driver-profile-repository.js";
import type { UserId } from "../../domain/shared/user-id.js";
import type { VehicleType } from "../../domain/driver/vehicle-type.js";
import { ProfileNotFoundError } from "../../domain/shared/errors.js";

export interface InternalDriverView {
  userId: UserId;
  displayName: string;
  phone: string | null;
  vehicleType: VehicleType | null;
  licensePlate: string | null;
  isAvailable: boolean;
  profileComplete: boolean;
}

export class GetDriverForServiceUseCase {
  constructor(
    private readonly customers: CustomerProfileRepository,
    private readonly drivers: DriverProfileRepository,
  ) {}

  async execute(args: { userId: UserId }): Promise<InternalDriverView> {
    const [customer, driver] = await Promise.all([
      this.customers.byUserId(args.userId),
      this.drivers.byUserId(args.userId),
    ]);
    if (!customer || !driver) throw new ProfileNotFoundError(args.userId);

    return {
      userId: customer.userId,
      displayName: customer.displayName,
      phone: customer.phone?.value ?? null,
      vehicleType: driver.vehicleType,
      licensePlate: driver.licensePlate,
      isAvailable: driver.isAvailable,
      profileComplete: driver.profileComplete,
    };
  }
}
