import type { Request, Response, NextFunction } from "express";
import { uuidParamSchema } from "../schemas.js";
import { addressToDto } from "../response-mappers.js";
import type { GetDriverForServiceUseCase } from "../../../application/internal/get-driver-for-service.use-case.js";
import type { GetAddressForServiceUseCase } from "../../../application/internal/get-address-for-service.use-case.js";
import { UserId } from "../../../domain/shared/user-id.js";
import { AddressId } from "../../../domain/shared/address-id.js";

export class InternalController {
  constructor(
    private readonly drv: GetDriverForServiceUseCase,
    private readonly addr: GetAddressForServiceUseCase,
  ) {}

  getDriver = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = UserId.of(uuidParamSchema.parse(req.params.userId));
      const result = await this.drv.execute({ userId });
      res.json(result);
    } catch (e) { next(e); }
  };

  getAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = AddressId.of(uuidParamSchema.parse(req.params.addressId));
      const result = await this.addr.execute({ id });
      res.json(addressToDto(result));
    } catch (e) { next(e); }
  };
}
