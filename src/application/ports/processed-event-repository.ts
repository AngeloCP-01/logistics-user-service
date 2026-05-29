export interface ProcessedEventRepository {
  /** Returns true if newly recorded; false if the eventId was already present. */
  recordIfNew(eventId: string, eventType: string): Promise<boolean>;
}
