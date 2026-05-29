import jwt from "jsonwebtoken";
const { sign } = jwt;
import { ServiceJwtVerifier, InvalidServiceJwtError } from "../../../src/infrastructure/auth/service-jwt-verifier.js";

const SECRET = "b".repeat(32);

describe("ServiceJwtVerifier", () => {
  it("returns caller on valid token", () => {
    const v = new ServiceJwtVerifier(SECRET, "user-service");
    const token = sign({ sub: "svc:dispatch-service", aud: "user-service" }, SECRET, { algorithm: "HS256", expiresIn: "5m" });
    const claims = v.verify(token);
    expect(claims.caller).toBe("dispatch-service");
  });

  it("rejects when audience does not match", () => {
    const v = new ServiceJwtVerifier(SECRET, "user-service");
    const token = sign({ sub: "svc:dispatch-service", aud: "order-service" }, SECRET, { algorithm: "HS256", expiresIn: "5m" });
    expect(() => v.verify(token)).toThrow(InvalidServiceJwtError);
  });

  it("rejects user-shaped sub", () => {
    const v = new ServiceJwtVerifier(SECRET, "user-service");
    const token = sign({ sub: "11111111-1111-7111-8111-111111111111", aud: "user-service" }, SECRET, { algorithm: "HS256", expiresIn: "5m" });
    expect(() => v.verify(token)).toThrow(InvalidServiceJwtError);
  });

  it("rejects wrong secret", () => {
    const v = new ServiceJwtVerifier(SECRET, "user-service");
    const token = sign({ sub: "svc:dispatch-service", aud: "user-service" }, "z".repeat(32), { algorithm: "HS256", expiresIn: "5m" });
    expect(() => v.verify(token)).toThrow(InvalidServiceJwtError);
  });

  it("rejects expired token", () => {
    const v = new ServiceJwtVerifier(SECRET, "user-service");
    const token = sign({ sub: "svc:dispatch-service", aud: "user-service" }, SECRET, { algorithm: "HS256", expiresIn: "-1s" });
    expect(() => v.verify(token)).toThrow(InvalidServiceJwtError);
  });
});
