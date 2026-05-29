import type { RequestHandler } from "express";
import { UnauthorizedError } from "../../../domain/shared/errors.js";
import { InvalidServiceJwtError, type ServiceJwtVerifier } from "../../../infrastructure/auth/service-jwt-verifier.js";

export function serviceAuth(verifier: ServiceJwtVerifier): RequestHandler {
  return (req, _res, next) => {
    const header = req.header("x-service-authorization");
    if (!header || !header.startsWith("Bearer ")) return next(new UnauthorizedError("missing service bearer token"));
    const token = header.slice("Bearer ".length).trim();
    try {
      const claims = verifier.verify(token);
      req.serviceCaller = claims.caller;
      next();
    } catch (e) {
      if (e instanceof InvalidServiceJwtError) return next(new UnauthorizedError(e.message));
      next(e);
    }
  };
}
