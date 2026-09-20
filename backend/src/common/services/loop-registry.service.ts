import { Injectable } from '@nestjs/common';

/**
 * P97 (D-97-3) — bootstrap-time registry of the live in-memory `setInterval`
 * loops actually started in THIS process.
 *
 * Before P97 the boot self-check counted loops from a static
 * `KNOWN_IN_MEMORY_LOOPS` array (always 5, for every role — accurate only while
 * `AppModule` was untouched in P96). Once Plans 06/07 drain-gate the 5 loops
 * behind `isBackgroundRole()`, the true count is role-dependent (0 under web,
 * 5 under worker/mono). Each loop calls {@link register} when it starts, and the
 * self-check reads {@link size} — a live, role-accurate count.
 *
 * Registration is idempotent (Set) so a double-`register` (e.g. re-bootstrap in a
 * test) never inflates the count.
 */
@Injectable()
export class LoopRegistryService {
  private readonly loops = new Set<string>();

  /** Record that a named in-memory loop started in this process (idempotent). */
  register(name: string): void {
    this.loops.add(name);
  }

  /** The number of distinct loops registered in this process. */
  get size(): number {
    return this.loops.size;
  }
}
