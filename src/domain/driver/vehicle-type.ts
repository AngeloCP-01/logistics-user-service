export const VEHICLE_TYPES = ["motorcycle", "car", "van", "truck"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export function isVehicleType(value: unknown): value is VehicleType {
  return typeof value === "string" && (VEHICLE_TYPES as readonly string[]).includes(value);
}
