/** Counts failures per key in a sliding window (in memory; the master server is a single process).
 *  Used for guesses that cannot be tied to one account, e.g. PIN-only logins from one machine. */
export class FailureLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  /** Milliseconds until `key` may try again, or 0 if it is not blocked. */
  blockedFor(key: string, now = Date.now()): number {
    const recent = this.recent(key, now);
    return recent.length >= this.max ? recent[0]! + this.windowMs - now : 0;
  }

  fail(key: string, now = Date.now()): void {
    this.hits.set(key, [...this.recent(key, now), now]);
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  clear(): void {
    this.hits.clear();
  }

  private recent(key: string, now: number): number[] {
    return (this.hits.get(key) ?? []).filter(t => t > now - this.windowMs);
  }
}
