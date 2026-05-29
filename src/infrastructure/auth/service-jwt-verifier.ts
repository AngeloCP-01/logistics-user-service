import jwt from "jsonwebtoken";
const { verify, JsonWebTokenError, TokenExpiredError } = jwt;

export class InvalidServiceJwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidServiceJwtError";
  }
}

export interface ServiceClaims {
  caller: string;
}

export class ServiceJwtVerifier {
  constructor(private readonly secret: string, private readonly expectedAudience: string) {}

  verify(token: string): ServiceClaims {
    let payload: unknown;
    try {
      payload = verify(token, this.secret, { algorithms: ["HS256"], audience: this.expectedAudience });
    } catch (e) {
      if (e instanceof TokenExpiredError) throw new InvalidServiceJwtError("token expired");
      if (e instanceof JsonWebTokenError) throw new InvalidServiceJwtError(`invalid token: ${e.message}`);
      throw new InvalidServiceJwtError("invalid token");
    }
    if (typeof payload !== "object" || payload === null) throw new InvalidServiceJwtError("payload not object");
    const p = payload as Record<string, unknown>;
    const sub = p.sub;
    if (typeof sub !== "string" || !sub.startsWith("svc:")) throw new InvalidServiceJwtError("sub must be svc:<caller>");
    return { caller: sub.slice("svc:".length) };
  }
}
