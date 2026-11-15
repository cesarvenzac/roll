/**
 * The order characters start in, and when: pure, no DOM. A change's characters start one after
 * another, from the start of the value, its end or its centre, never more than `STAGGER_MOST` from
 * the first to the last, however many there are.
 */

/** Where a change's characters start from. */
export type StaggerFrom = "start" | "end" | "center";

/** The longest the stagger may hold the last character back, in seconds. */
export const STAGGER_MOST = 0.24;

/**
 * Each of `count` characters' place in the order, from `from`: 0 starts first. From the centre, the
 * two middle characters of an even count start together, then the pair round them, and so on out.
 */
export function ranksOf(count: number, from: StaggerFrom): number[] {
  const ranks: number[] = [];
  const middle = (count - 1) / 2;
  for (let i = 0; i < count; i++) ranks.push(from === "end" ? count - 1 - i : from === "center" ? Math.floor(Math.abs(i - middle)) : i);
  return ranks;
}

/** Seconds between one rank and the next: `stagger`, or less, so the last starts within `STAGGER_MOST`. */
export function stepOf(stagger: number, ranks: readonly number[]): number {
  const last = ranks.reduce((most, rank) => Math.max(most, rank), 0);
  return last > 0 ? Math.min(Math.max(0, stagger), STAGGER_MOST / last) : 0;
}
