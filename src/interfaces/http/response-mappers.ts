import type { Address } from "../../domain/address/address.js";
import type { MyProfileView } from "../../application/profiles/get-my-profile.use-case.js";

export function addressToDto(a: Address): Record<string, unknown> {
  return {
    id: a.id,
    userId: a.userId,
    label: a.label,
    street: a.street,
    city: a.city,
    country: a.country.value,
    lat: a.coordinates.lat,
    lng: a.coordinates.lng,
  };
}

export function profileToDto(p: MyProfileView): Record<string, unknown> {
  return p as unknown as Record<string, unknown>;
}
