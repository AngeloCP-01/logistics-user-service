import { loadEnv } from "../../../src/config/env.js";

const validEnv = {
  NODE_ENV: "production",
  PORT: "3001",
  LOG_LEVEL: "info",
  LOG_SERVICE_NAME: "user-service",
  USER_DB_URL: "postgresql://user:pass@host:5432/db",
  USER_JWT_SECRET: "a".repeat(32),
  USER_SERVICE_JWT_SECRET: "b".repeat(32),
  RABBITMQ_URL: "amqp://guest:guest@host:5672",
};

describe("loadEnv", () => {
  it("loads a valid env object", () => {
    const env = loadEnv(validEnv);
    expect(env.NODE_ENV).toBe("production");
    expect(env.PORT).toBe(3001);
    expect(env.LOG_LEVEL).toBe("info");
  });

  it("rejects missing USER_DB_URL", () => {
    const { USER_DB_URL, ...incomplete } = validEnv;
    expect(() => loadEnv(incomplete)).toThrow(/USER_DB_URL/);
  });

  it("rejects short USER_JWT_SECRET", () => {
    expect(() => loadEnv({ ...validEnv, USER_JWT_SECRET: "tooshort" })).toThrow(/USER_JWT_SECRET/);
  });

  it("rejects short USER_SERVICE_JWT_SECRET", () => {
    expect(() => loadEnv({ ...validEnv, USER_SERVICE_JWT_SECRET: "tooshort" })).toThrow(/USER_SERVICE_JWT_SECRET/);
  });

  it("rejects identical USER_JWT_SECRET and USER_SERVICE_JWT_SECRET", () => {
    const shared = "z".repeat(32);
    expect(() =>
      loadEnv({ ...validEnv, USER_JWT_SECRET: shared, USER_SERVICE_JWT_SECRET: shared }),
    ).toThrow(/distinct/i);
  });

  it("rejects invalid PORT", () => {
    expect(() => loadEnv({ ...validEnv, PORT: "not-a-number" })).toThrow(/PORT/);
  });

  it("rejects invalid LOG_LEVEL", () => {
    expect(() => loadEnv({ ...validEnv, LOG_LEVEL: "TRACE" })).toThrow(/LOG_LEVEL/);
  });

  it("rejects invalid NODE_ENV", () => {
    expect(() => loadEnv({ ...validEnv, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
