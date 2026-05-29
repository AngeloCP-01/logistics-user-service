import type { ProcessedEventRepository } from "../../../src/application/ports/processed-event-repository.js";

export class InMemoryProcessedEventRepository implements ProcessedEventRepository {
  readonly seen = new Set<string>();

  async recordIfNew(eventId: string, _eventType: string): Promise<boolean> {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    return true;
  }
}
