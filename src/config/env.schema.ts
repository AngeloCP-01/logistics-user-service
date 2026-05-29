import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    PORT: z.coerce.number().int().min(1).max(65535),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
    LOG_SERVICE_NAME: z.string().min(1),
    USER_DB_URL: z.string().url(),
    USER_JWT_SECRET: z.string().min(32),
    USER_SERVICE_JWT_SECRET: z.string().min(32),
    RABBITMQ_URL: z.string().url(),
  })
  .refine((env) => env.USER_JWT_SECRET !== env.USER_SERVICE_JWT_SECRET, {
    message: "USER_JWT_SECRET and USER_SERVICE_JWT_SECRET must be distinct values",
    path: ["USER_SERVICE_JWT_SECRET"],
  });

export type Env = z.infer<typeof envSchema>;
