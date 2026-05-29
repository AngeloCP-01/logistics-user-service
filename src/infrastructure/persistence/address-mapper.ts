import type { Address as Row, Prisma } from "@prisma/client";
import { Address } from "../../domain/address/address.js";
import { AddressId } from "../../domain/shared/address-id.js";
import { UserId } from "../../domain/shared/user-id.js";
import { Country } from "../../domain/shared/country.js";
import { Coordinates } from "../../domain/shared/coordinates.js";

export const AddressMapper = {
  toDomain(row: Row): Address {
    return Address.fromPersistence({
      id: AddressId.of(row.id),
      userId: UserId.of(row.userId),
      label: row.label,
      street: row.street,
      city: row.city,
      country: Country.of(row.country),
      coordinates: Coordinates.of(Number(row.lat), Number(row.lng)),
      createdAt: row.createdAt,
    });
  },

  toPersistence(a: Address): Row {
    return {
      id: a.id,
      userId: a.userId,
      label: a.label,
      street: a.street,
      city: a.city,
      country: a.country.value,
      lat: a.coordinates.lat as unknown as Prisma.Decimal,
      lng: a.coordinates.lng as unknown as Prisma.Decimal,
      createdAt: a.createdAt,
    };
  },
};
