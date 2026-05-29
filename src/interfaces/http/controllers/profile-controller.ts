import type { Request, Response, NextFunction } from "express";
import { updateProfileSchema, setDefaultAddressSchema } from "../schemas.js";
import type { GetMyProfileUseCase } from "../../../application/profiles/get-my-profile.use-case.js";
import type { UpdateMyProfileUseCase } from "../../../application/profiles/update-my-profile.use-case.js";
import type { SetDefaultAddressUseCase } from "../../../application/addresses/set-default-address.use-case.js";
import { UserId } from "../../../domain/shared/user-id.js";
import { AddressId } from "../../../domain/shared/address-id.js";

export class ProfileController {
  constructor(
    private readonly getMyProfile: GetMyProfileUseCase,
    private readonly updateMyProfile: UpdateMyProfileUseCase,
    private readonly setDefaultAddress: SetDefaultAddressUseCase,
  ) {}

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const view = await this.getMyProfile.execute({ userId: UserId.of(req.userId!), role: req.role! });
      res.json(view);
    } catch (e) { next(e); }
  };

  patchMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = updateProfileSchema.parse(req.body);
      await this.updateMyProfile.execute({
        userId: UserId.of(req.userId!),
        displayName: body.displayName,
        phone: body.phone,
      });
      const view = await this.getMyProfile.execute({ userId: UserId.of(req.userId!), role: req.role! });
      res.json(view);
    } catch (e) { next(e); }
  };

  putDefaultAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = setDefaultAddressSchema.parse(req.body);
      await this.setDefaultAddress.execute({
        userId: UserId.of(req.userId!),
        addressId: AddressId.of(body.addressId),
      });
      const view = await this.getMyProfile.execute({ userId: UserId.of(req.userId!), role: req.role! });
      res.json(view);
    } catch (e) { next(e); }
  };
}
