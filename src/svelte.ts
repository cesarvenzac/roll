/**
 * Roll in Svelte, as an action: no component to compile, nothing from Svelte imported.
 *
 *   <script>
 *     import { roll } from "@cesarvenzac/roll/svelte";
 *   </script>
 *
 *   <span use:roll={{ value: price, look: "drum", trend: true }}></span>
 *
 * The element's text is taken up as it is, so a server's `{price}` inside it doesn't move.
 */

import { roll as rollCore, type RollOptions, type Value } from "./index.ts";

/** What the action takes: the value, and any of Roll's options. */
export type RollParams = RollOptions & { value: Value };

export function roll(node: HTMLElement, params: RollParams) {
  const { value, ...options } = params;
  const roller = rollCore(node, value, options);
  return {
    update(next: RollParams) {
      const { value, ...options } = next;
      roller.set(value, options);
    },
    destroy() {
      roller.destroy();
    },
  };
}
