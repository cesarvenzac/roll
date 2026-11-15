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

import { Engine, type Options, SPOKEN, type Value, VISUAL, wordsOf } from "./engine.ts";

export type { Way } from "./cells.ts";
export { DIGITS } from "./engine.ts";
export type { Options, Value };

/** The letters a to z, for `reels`: a word's letters then turn through the alphabet, as a split-flap board's. */
export const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
/** The letters A to Z, for `reels`. */
export const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export type RollOptions = Options & {
  /** What assistive tech reads: the value's own words unless said (a node's `aria-label`). */
  label?: string;
};

/** An element showing a value, rolling to the next when told. */
export type Roller = {
  /** Roll to `value`; options given here hold from now on. */
  set(value: Value, options?: RollOptions): void;
  /** What it shows, or is rolling to. */
  readonly value: Value;
  /** Stop: what it shows stays, as plain text, and `set` does nothing more. */
  destroy(): void;
};

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
  const say = () => (spoken.textContent = current.label ?? wordsOf(last));
  element.replaceChildren(visual, spoken);
  const engine = new Engine(visual, value, () => current);
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
    destroy() {
      destroyed = true;
      engine.destroy();
    },
  };
}
