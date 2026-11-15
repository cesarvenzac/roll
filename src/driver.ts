/**
 * What every entry drives: the engine, and the counter that walks a number through the values
 * between when `count` asks it to. `roll()`, `<Roll>`, the element and the adapters all go through
 * one, so they can't behave differently.
 */

import { COUNT_SECONDS, Counter, decimalsOf, plainFormat, roundTo } from "./count.ts";
import { Engine, type Options, prefersReducedMotion, type Value } from "./engine.ts";

export type DriverOptions = Options & {
  /**
   * Counts a number through every value between the last and the next, as an odometer passing them
   * would: `true` for about a second, or the seconds to take. A number given as a number only.
   */
  count?: boolean | number;
  /** How a number given as a number is written: `toLocaleString`, a currency. As JavaScript writes it unless said. */
  format?: (value: number) => string;
};

/** A value as the engine takes it: a number written by `format`, anything else as it is. */
export function shownOf(value: Value, format?: (value: number) => string): Value {
  return typeof value === "number" ? (format ? format(value) : String(value)) : value;
}

export class Driver {
  readonly engine: Engine;
  private counter: Counter | null = null;
  private last: Value;

  constructor(
    visual: HTMLElement,
    value: Value,
    private readonly options: () => DriverOptions,
  ) {
    this.last = value;
    // The engine says it's at rest only when the count is too: a count slowing to its end can hold one
    // number for a few frames, and the engine would rest between them.
    this.engine = new Engine(visual, shownOf(value, options().format), () => ({ ...this.options(), onSettle: () => this.rested() }));
  }

  get settled(): Promise<void> {
    return (this.counter?.idle() ?? Promise.resolve()).then(() => this.engine.settled);
  }

  set(value: Value) {
    const options = this.options();
    const before = this.last;
    this.last = value;
    if (typeof value === "number" && typeof before === "number" && options.count) {
      const seconds = typeof options.count === "number" ? options.count : COUNT_SECONDS;
      // Every number on the way rounded as finely as the two ends are written, before it's formatted:
      // a format of the visitor's own (`toLocaleString`) would otherwise write 1,039.233.
      const decimals = Math.max(decimalsOf(before), decimalsOf(value));
      const written = options.format ?? plainFormat(decimals);
      const format = (n: number) => written(roundTo(n, decimals));
      const still = options.reducedMotion ?? prefersReducedMotion();
      this.counter ??= new Counter(before, (text) => this.engine.set(text), () => this.rested());
      return this.counter.to(value, seconds, format, still);
    }
    // The new value first, then the count let go: told it's done, the engine is already changing.
    this.engine.set(shownOf(value, options.format));
    this.counter?.stop();
  }

  /** At rest: only once the count, if any, is done too. */
  private rested() {
    if (this.counter?.counting || !this.engine.resting) return;
    this.options().onSettle?.();
  }

  destroy() {
    this.counter?.stop();
    this.engine.destroy();
  }
}
