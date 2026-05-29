import { Router } from "express";
import type { UserJwtVerifier } from "../../infrastructure/auth/user-jwt-verifier.js";
import type { ServiceJwtVerifier } from "../../infrastructure/auth/service-jwt-verifier.js";
import { userAuth } from "./middleware/user-auth.js";
import { serviceAuth } from "./middleware/service-auth.js";
import { requireRole, rejectRole } from "./middleware/role-guard.js";
import type { ProfileController } from "./controllers/profile-controller.js";
import type { AddressController } from "./controllers/address-controller.js";
import type { DriverController } from "./controllers/driver-controller.js";
import type { InternalController } from "./controllers/internal-controller.js";
import type { HealthController } from "./controllers/health-controller.js";

export interface RouteDeps {
  userJwt: UserJwtVerifier;
  serviceJwt: ServiceJwtVerifier;
  profiles: ProfileController;
  addresses: AddressController;
  drivers: DriverController;
  internal: InternalController;
  health: HealthController;
}

export function buildRoutes(deps: RouteDeps): Router {
  const r = Router();

  r.get("/healthz", deps.health.liveness);
  r.get("/readyz", deps.health.readiness);

  // Public — require user JWT
  const pub = Router();
  pub.use(userAuth(deps.userJwt));

  pub.get("/me", deps.profiles.getMe);
  pub.patch("/me", rejectRole(["admin"]), deps.profiles.patchMe);
  pub.put("/me/default-address", rejectRole(["admin"]), deps.profiles.putDefaultAddress);

  pub.get("/me/addresses", rejectRole(["admin"]), deps.addresses.list_);
  pub.post("/me/addresses", rejectRole(["admin"]), deps.addresses.post);
  pub.patch("/me/addresses/:id", rejectRole(["admin"]), deps.addresses.patch);
  pub.delete("/me/addresses/:id", rejectRole(["admin"]), deps.addresses.delete_);

  pub.patch("/me/driver", requireRole(["driver"]), deps.drivers.patch);
  pub.put("/me/availability", requireRole(["driver"]), deps.drivers.putAvailability);

  r.use("/v1/users", pub);

  // Internal — require service JWT
  const internal = Router();
  internal.use(serviceAuth(deps.serviceJwt));
  internal.get("/drivers/:userId", deps.internal.getDriver);
  internal.get("/addresses/:addressId", deps.internal.getAddress);
  r.use("/v1/users/internal", internal);

  return r;
}
