import type { PrismaClient } from "@prisma/client";
import type { UnitOfWork, TransactionalRepos } from "../../application/ports/unit-of-work.js";
import { PrismaCustomerProfileRepository } from "./prisma-customer-profile-repository.js";
import { PrismaDriverProfileRepository } from "./prisma-driver-profile-repository.js";
import { PrismaAddressRepository } from "./prisma-address-repository.js";
import { PrismaProcessedEventRepository } from "./prisma-processed-event-repository.js";

export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(work: (repos: TransactionalRepos) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const repos: TransactionalRepos = {
        customers: new PrismaCustomerProfileRepository(tx),
        drivers: new PrismaDriverProfileRepository(tx),
        addresses: new PrismaAddressRepository(tx),
        processedEvents: new PrismaProcessedEventRepository(tx),
      };
      return work(repos);
    });
  }
}
