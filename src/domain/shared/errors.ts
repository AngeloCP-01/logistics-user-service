export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  readonly code = "not_found";
  readonly status = 404;
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
  }
}

export class ValidationError extends DomainError {
  readonly code = "validation_failed";
  readonly status = 400;
  constructor(public readonly errors: { field: string; message: string }[]) {
    super("Validation failed");
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "unauthorized";
  readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "forbidden";
  readonly status = 403;
  constructor(message = "Forbidden") {
    super(message);
  }
}

export class ConflictError extends DomainError {
  readonly code = "conflict";
  readonly status = 409;
}

// Service-specific
export class ProfileNotFoundError extends NotFoundError {
  constructor(userId: string) {
    super("customer_profile", userId);
  }
}

export class AddressNotFoundError extends NotFoundError {
  constructor(addressId: string) {
    super("address", addressId);
  }
}

export class DriverProfileIncompleteError extends DomainError {
  readonly code = "driver_profile_incomplete";
  readonly status = 409;
  constructor() {
    super("Driver profile must have vehicleType and licensePlate before availability can be set");
  }
}

export class DefaultAddressInUseError extends DomainError {
  readonly code = "default_address_in_use";
  readonly status = 409;
  constructor(addressId: string) {
    super(`Address ${addressId} is currently the default; change default before deleting`);
  }
}

export class RoleRequiredError extends DomainError {
  readonly code = "role_required";
  readonly status = 403;
  constructor(requiredRole: string, actualRole: string) {
    super(`Endpoint requires role ${requiredRole}; caller is ${actualRole}`);
  }
}

export class InvariantViolationError extends DomainError {
  readonly code = "invariant_violation";
  readonly status = 500;
}
