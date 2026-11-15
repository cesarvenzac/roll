/**
 * Text that rolls as it changes. A number's digits turn as an odometer's do, each keeping its
 * place, forward as it counts up and back as it counts down; letters, signs and icons roll over;
 * a character that comes or goes rolls in or out where it stands. Give it the value as you'd
 * write it, formatted however you like:
 *
 *   import { roll } from "@cesarvenzac/roll";
 *
 *   const price = roll(document.querySelector(".price"), "€8");
 *   price.set("€6.67");
 *
 * The React component is `@cesarvenzac/roll/react`.
 */

import { Driver, type DriverOptions, shownOf } from "./driver.ts";
import { Group, SPOKEN, type Value, VISUAL, wordsOf } from "./engine.ts";

export type { Way } from "./cells.ts";
export type { Direction, Effect, Look } from "./looks.ts";
export type { StaggerFrom } from "./stagger.ts";
export { DIGITS } from "./engine.ts";
export type { Group, Value };
/** Everything a roller takes but its label. */
export type Options = DriverOptions;

/** The letters a to z, for `reels`: a word's letters then turn through the alphabet, as a split-flap board's. */
export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
/** The letters A to Z, for `reels`. */
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type RollOptions = DriverOptions & {
  /** What assistive tech reads: the value's own words unless said (a node's `aria-label`). */
  label?: string;
};

/** An element showing a value, rolling to the next when told. */
export type Roller = {
  /** Roll to `value`; options given here hold from now on. */
  set(value: Value, options?: RollOptions): void;
  /** What it shows, or is rolling to. */
  readonly value: Value;
  /** Resolves once it's at rest on the value it was last given: its turns, and its count, done. */
  readonly settled: Promise<void>;
  /** Stop: what it shows stays, as plain text, and `set` does nothing more. */
  destroy(): void;
};

/**
 * Rollers that move as one: give it to each as `group`. A change to several of them in the same
 * moment staggers across them all in the page's order, and `settled` waits for every one.
 * `onSettle` is called each time they've all come to rest.
 */
export function rollGroup(options: { onSettle?: () => void } = {}): Group {
  return new Group(options.onSettle);
}

/**
 * Makes `element` show `value`, and roll to the next value given to `set`. What was in it is
 * replaced; it reads as the value's words to assistive tech.
 */
export function roll(element: HTMLElement, value: Value, options: RollOptions = {}): Roller {
  let current = options;
  let last = value;
  const visual = document.createElement("span");
  visual.setAttribute("aria-hidden", "true");
  visual.style.cssText = VISUAL;
  const spoken = document.createElement("span");
  spoken.style.cssText = SPOKEN;
  const say = () => (spoken.textContent = current.label ?? wordsOf(shownOf(last, current.format)));
  element.replaceChildren(visual, spoken);
  const engine = new Driver(visual, value, () => current);
  let destroyed = false;
  say();
  return {
    set(next, options) {
      if (destroyed) return;
      if (options) current = { ...current, ...options };
      last = next;
      engine.set(next);
      say();
    },
    get value() {
      return last;
    },
    get settled() {
      return engine.settled;
    },
    destroy() {
      destroyed = true;
      engine.destroy();
    },
  };
}
