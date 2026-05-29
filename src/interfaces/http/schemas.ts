import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
  phone: z.union([z.string().min(7).max(20), z.null()]).optional(),
});

export const createAddressSchema = z.object({
  label: z.string().min(1).max(40),
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(80),
  country: z.string().length(2),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const updateAddressSchema = z.object({
  label: z.string().min(1).max(40).optional(),
  street: z.string().min(1).max(200).optional(),
  city: z.string().min(1).max(80).optional(),
  country: z.string().length(2).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const setDefaultAddressSchema = z.object({
  addressId: z.string().uuid(),
});

export const updateDriverSchema = z.object({
  vehicleType: z.enum(["motorcycle", "car", "van", "truck"]).optional(),
  licensePlate: z.string().min(1).max(20).optional(),
});

export const setAvailabilitySchema = z.object({
  available: z.boolean(),
});

export const uuidParamSchema = z.string().uuid();
