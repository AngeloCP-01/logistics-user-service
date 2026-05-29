import type { Request, Response, NextFunction } from "express";
import { updateDriverSchema, setAvailabilitySchema } from "../schemas.js";
import type { GetMyProfileUseCase } from "../../../application/profiles/get-my-profile.use-case.js";
import type { UpdateDriverProfileUseCase } from "../../../application/profiles/update-driver-profile.use-case.js";
import type { SetAvailabilityUseCase } from "../../../application/profiles/set-availability.use-case.js";
import { UserId } from "../../../domain/shared/user-id.js";

export class DriverController {
  constructor(
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly upd: UpdateDriverProfileUseCase,
    private readonly setAvail: SetAvailabilityUseCase,
  ) {}

  patch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = updateDriverSchema.parse(req.body);
      await this.upd.execute({ userId: UserId.of(req.userId!), vehicleType: body.vehicleType, licensePlate: body.licensePlate });
      const view = await this.getMyProfile.execute({ userId: UserId.of(req.userId!), role: req.role! });
      res.json(view);
    } catch (e) { next(e); }
  };

  putAvailability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = setAvailabilitySchema.parse(req.body);
      await this.setAvail.execute({
        userId: UserId.of(req.userId!),
        available: body.available,
        correlationId: req.requestId!,
      });
      const view = await this.getMyProfile.execute({ userId: UserId.of(req.userId!), role: req.role! });
      res.json(view);
    } catch (e) { next(e); }
  };
}
