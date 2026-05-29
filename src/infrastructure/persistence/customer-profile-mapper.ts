import type { CustomerProfile as Row } from "@prisma/client";
import { CustomerProfile } from "../../domain/customer/customer-profile.js";
import { UserId } from "../../domain/shared/user-id.js";
import { Phone } from "../../domain/shared/phone.js";
import { AddressId } from "../../domain/shared/address-id.js";

export const CustomerProfileMapper = {
  toDomain(row: Row): CustomerProfile {
    return CustomerProfile.fromPersistence({
      userId: UserId.of(row.userId),
      displayName: row.displayName,
      phone: row.phone ? Phone.of(row.phone) : null,
      defaultAddressId: row.defaultAddressId ? AddressId.of(row.defaultAddressId) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  },

  toPersistence(profile: CustomerProfile): Row {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      phone: profile.phone?.value ?? null,
      defaultAddressId: profile.defaultAddressId,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  },
};
