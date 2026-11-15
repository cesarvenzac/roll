/**
 * The strip a cell turns on: its symbols top to bottom, and where it turns from and to (positions
 * down the strip; 1.5 is halfway between the second and the third). Counting up turns a strip up,
 * the next symbol coming from below, as an odometer's wheel does; counting down, the other way.
 * Pure: no DOM.
 */

import type { Way } from "./cells.ts";

/** A cell's strip and where it shows: `at` is a position down `symbols`, between two while it turns. */
export type Strip = { symbols: readonly string[]; at: number };

/** A turn: the strip to lay out, and the positions it turns from and to. */
export type Turn = { symbols: string[]; from: number; to: number };

/** Nothing: what a cell turns from as it comes, and to as it goes. */
export const BLANK = "";

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Within this of a position counts as on it. */
const ON = 1e-6;

/**
 * How a cell gets from where it is to `target`:
 *
 * - to a symbol it shows, or half shows, it turns straight there (back, if it must);
 * - along a reel the two are on (`reel`: digits, letters, any ordered symbols, going round), it
 *   turns through every symbol between: the way the number went for a number's digit (`shortest`
 *   false: 7 to 2 counting up is 8, 9, 0, 1, 2), else the shorter way round;
 * - otherwise it rolls over: what it shows leaves and `target` comes in, from below going up.
 *
 * From the middle of a turn, it goes on from where it is.
 */
export function turnOf(strip: Strip, target: string, way: Way, reel: readonly string[] | null, shortest: boolean): Turn {
  const last = strip.symbols.length - 1;
  const at = Math.min(Math.max(strip.at, 0), last);
  const lo = Math.floor(at + ON);
  const hi = Math.min(Math.max(lo, Math.ceil(at - ON)), last);
  const shown = strip.symbols.slice(lo, hi + 1);
  const from = at - lo;

  // A symbol it shows: straight there.
  const near = shown.indexOf(target);
  if (near >= 0) return { symbols: [...shown], from, to: near };

  // On a reel: where it is as a place on the reel, a fraction on from one symbol to the next.
  const n = reel?.length ?? 0;
  const first = reel ? reel.indexOf(shown[0]) : -1;
  const j = reel ? reel.indexOf(target) : -1;
  const continuous = shown.length === 1 || (first >= 0 && reel![mod(first + 1, n)] === shown[1]);
  if (reel && first >= 0 && j >= 0 && continuous) {
    const c = first + from;
    const ahead = mod(j - c, n);
    const steps = shortest ? (ahead <= n / 2 ? ahead : ahead - n) : way === "up" ? (ahead > n - 0.5 ? ahead - n : ahead) : ahead < 0.5 ? ahead : ahead - n;
    const start = Math.floor(Math.min(c, c + steps) + ON);
    const end = Math.ceil(Math.max(c, c + steps) - ON);
    const symbols: string[] = [];
    for (let k = start; k <= end; k++) symbols.push(reel[mod(k, n)]);
    // It lands on a symbol: a whole step, whatever the sums leave over.
    return { symbols, from: c - start, to: Math.round(c + steps - start) };
  }

  // Rolling over: in from below going up, from above going down.
  return way === "up" ? { symbols: [...shown, target], from, to: shown.length } : { symbols: [target, ...shown], from: from + 1, to: 0 };
}
