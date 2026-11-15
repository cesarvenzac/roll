/**
 * Roll in Vue, as a directive: nothing from Vue imported.
 *
 *   <script setup>
 *     import { vRoll } from "@cesarvenzac/roll/vue";
 *   </script>
 *
 *   <span v-roll="price"></span>
 *   <span v-roll="{ value: price, look: 'drum', trend: true }"></span>
 *
 * Give it an element of its own, with nothing inside for Vue to keep: Roll draws in it.
 */

import { roll, type Roller, type RollOptions, type Value } from "./index.ts";

/** What the directive takes: a value, or the value and any of Roll's options. */
export type RollBinding = Value | (RollOptions & { value: Value });

const rollers = new WeakMap<HTMLElement, Roller>();

const read = (binding: RollBinding): { value: Value; options: RollOptions } => {
  if (typeof binding === "object" && binding !== null && !(typeof Node !== "undefined" && binding instanceof Node)) {
    const { value, ...options } = binding as RollOptions & { value: Value };
    return { value, options };
  }
  return { value: binding as Value, options: {} };
};

export const vRoll = {
  mounted(element: HTMLElement, binding: { value: RollBinding }) {
    const { value, options } = read(binding.value);
    rollers.set(element, roll(element, value, options));
  },
  updated(element: HTMLElement, binding: { value: RollBinding }) {
    const { value, options } = read(binding.value);
    rollers.get(element)?.set(value, options);
  },
  beforeUnmount(element: HTMLElement) {
    rollers.get(element)?.destroy();
    rollers.delete(element);
  },
};
