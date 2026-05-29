import type { Request, Response, NextFunction } from "express";
import { createAddressSchema, updateAddressSchema, uuidParamSchema } from "../schemas.js";
import { addressToDto } from "../response-mappers.js";
import type { ListAddressesUseCase } from "../../../application/addresses/list-addresses.use-case.js";
import type { CreateAddressUseCase } from "../../../application/addresses/create-address.use-case.js";
import type { UpdateAddressUseCase } from "../../../application/addresses/update-address.use-case.js";
import type { DeleteAddressUseCase } from "../../../application/addresses/delete-address.use-case.js";
import { UserId } from "../../../domain/shared/user-id.js";
import { AddressId } from "../../../domain/shared/address-id.js";

export class AddressController {
  constructor(
    private readonly list: ListAddressesUseCase,
    private readonly create: CreateAddressUseCase,
    private readonly upd: UpdateAddressUseCase,
    private readonly del: DeleteAddressUseCase,
  ) {}

  list_ = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.list.execute({ userId: UserId.of(req.userId!) });
      res.json({ items: result.items.map(addressToDto), nextCursor: result.nextCursor });
    } catch (e) { next(e); }
  };

  post = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createAddressSchema.parse(req.body);
      const result = await this.create.execute({ userId: UserId.of(req.userId!), ...body });
      res.status(201).setHeader("Location", `/v1/users/me/addresses/${result.id}`).json(addressToDto(result));
    } catch (e) { next(e); }
  };

  patch = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = AddressId.of(uuidParamSchema.parse(req.params.id));
      const body = updateAddressSchema.parse(req.body);
      const result = await this.upd.execute({
        userId: UserId.of(req.userId!),
        id,
        label: body.label,
        street: body.street,
        city: body.city,
        country: body.country,
        lat: body.lat,
        lng: body.lng,
      });
      res.json(addressToDto(result));
    } catch (e) { next(e); }
  };

  delete_ = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = AddressId.of(uuidParamSchema.parse(req.params.id));
      await this.del.execute({ userId: UserId.of(req.userId!), id });
      res.status(204).end();
    } catch (e) { next(e); }
  };
}
