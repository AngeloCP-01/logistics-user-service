import type { CustomerProfileRepository } from "./customer-profile-repository.js";
import type { DriverProfileRepository } from "./driver-profile-repository.js";
import type { AddressRepository } from "./address-repository.js";
import type { ProcessedEventRepository } from "./processed-event-repository.js";

export interface TransactionalRepos {
  customers: CustomerProfileRepository;
  drivers: DriverProfileRepository;
  addresses: AddressRepository;
  processedEvents: ProcessedEventRepository;
}

export interface UnitOfWork {
  run<T>(work: (repos: TransactionalRepos) => Promise<T>): Promise<T>;
}
