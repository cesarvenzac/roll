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
  /**
   * Draws digits in tabular figures, each as wide as the next, so a value holds its width while it
   * changes: on while it counts, where its digits change every frame, unless said; off otherwise,
   * the font's own figures.
   */
  tabular?: boolean;
};

/** Whether a roller draws tabular figures: as said, else while it counts. */
export const tabularOf = (options: DriverOptions) => options.tabular ?? !!options.count;

/** A value as the engine takes it: a number written by `format`, anything else as it is. */
export function shownOf(value: Value, format?: (value: number) => string): Value {
  return typeof value === "number" ? (format ? format(value) : String(value)) : value;
}

export class Driver {
  readonly engine: Engine;
  private counter: Counter | null = null;
  private last: Value;
  private destroyed = false;

  constructor(
    visual: HTMLElement,
    value: Value,
    private readonly options: () => DriverOptions,
  ) {
    this.last = value;
    this.figures(visual, options());
    // The engine says it's at rest only when the count is too: a count slowing to its end can hold one
    // number for a few frames, and the engine would rest between them.
    this.engine = new Engine(visual, shownOf(value, options().format), () => ({ ...this.options(), onSettle: () => this.rested() }));
    // Its group waits for the count too, which the engine knows nothing of.
    this.engine.waitsFor = { busy: () => !!this.counter?.counting, idle: () => this.counter?.idle() ?? Promise.resolve() };
  }

  get settled(): Promise<void> {
    return (this.counter?.idle() ?? Promise.resolve()).then(() => this.engine.settled);
  }

  /** Tabular figures, or the font's own, on what's drawn (inherited by every cell and strip in it). */
  private figures(visual: HTMLElement, options: DriverOptions) {
    const tabular = tabularOf(options) ? "tabular-nums" : "";
    if (visual.style.fontVariantNumeric !== tabular) visual.style.fontVariantNumeric = tabular;
  }

  set(value: Value) {
    const options = this.options();
    this.figures(this.engine.visual, options);
    const before = this.last;
    this.last = value;
    if (typeof value === "number" && typeof before === "number" && options.count) {
      const seconds = typeof options.count === "number" ? options.count : COUNT_SECONDS;
      // Every number on the way rounded as the one it's going to is written, before it's formatted: a
      // format of the visitor's own (`toLocaleString`) would otherwise write 1,039.233, and 6.67 to 8
      // dropped its decimals only as it landed, plain numbers landing on "8.00".
      const decimals = decimalsOf(value);
      const written = options.format ?? plainFormat(decimals);
      const format = (n: number) => written(roundTo(n, decimals));
      const still = options.reducedMotion ?? prefersReducedMotion();
      this.counter ??= new Counter(before, (text) => this.engine.set(text), () => this.counted());
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

  /**
   * The count is done: at rest if the engine is too, and its group asked again, since the engine
   * may have come to rest already and won't again. Only from here: the engine's own rest asks the
   * group itself, and asked from both the group would hear it twice.
   */
  private counted() {
    this.rested();
    // Destroyed, it's leaving its group, and says nothing to it, as the engine doesn't.
    if (!this.destroyed) this.engine.group?.rested();
  }

  destroy() {
    this.destroyed = true;
    this.counter?.stop();
    this.engine.destroy();
  }
}
