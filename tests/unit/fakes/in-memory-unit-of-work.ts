import type { UnitOfWork, TransactionalRepos } from "../../../src/application/ports/unit-of-work.js";
import { InMemoryCustomerProfileRepository } from "./in-memory-customer-profile-repository.js";
import { InMemoryDriverProfileRepository } from "./in-memory-driver-profile-repository.js";
import { InMemoryAddressRepository } from "./in-memory-address-repository.js";
import { InMemoryProcessedEventRepository } from "./in-memory-processed-event-repository.js";

export class InMemoryUnitOfWork implements UnitOfWork {
  constructor(
    readonly customers = new InMemoryCustomerProfileRepository(),
    readonly drivers = new InMemoryDriverProfileRepository(),
    readonly addresses = new InMemoryAddressRepository(),
    readonly processedEvents = new InMemoryProcessedEventRepository(),
  ) {}

  async run<T>(work: (repos: TransactionalRepos) => Promise<T>): Promise<T> {
    return work({
      customers: this.customers,
      drivers: this.drivers,
      addresses: this.addresses,
      processedEvents: this.processedEvents,
    });
  }
}
