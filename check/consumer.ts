// The package as someone installing it uses it: typechecked against its published types (as
// NodeNext and as a bundler resolves them) and run, by check/run.sh. `roll` needs a page, so here
// it's typechecked only; the React component renders on a server.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { type Direction, DIGITS, type Effect, type Group, type Look, LOWERCASE, roll, rollGroup, type Roller, type RollOptions, type StaggerFrom, UPPERCASE, type Value, type Way } from "@cesarvenzac/roll";
import { optionsOf, RollText } from "@cesarvenzac/roll/element";
import { Roll, RollGroup, type RollProps } from "@cesarvenzac/roll/react";
import { roll as rollAction, type RollParams } from "@cesarvenzac/roll/svelte";
import { type RollBinding, vRoll } from "@cesarvenzac/roll/vue";

const way: Way | "auto" = "auto";
const options: RollOptions = { duration: 0.5, bounce: 0.1, stagger: 0.02, reels: [DIGITS, LOWERCASE, UPPERCASE], way, reducedMotion: false, look: "drum" satisfies Look, direction: "right" satisfies Direction, effects: ["fade", "blur", "motion"] satisfies Effect[], staggerFrom: "center" satisfies StaggerFrom, trend: { up: "green" }, count: 0.8, format: (n) => n.toFixed(2), onSettle: () => {}, label: "Price" };
const group: Group = rollGroup({ onSettle: () => {} });
export const start = (element: HTMLElement, value: Value): Roller => {
  const price = roll(element, value, options);
  price.set("€6.67", { label: "Price, €6.67", group });
  void price.settled.then(() => {});
  return price;
};
// The adapters, typechecked as Svelte and Vue would call them; the element's entry imports with no DOM.
export const action = (node: HTMLElement) => rollAction(node, { value: 8, count: true } satisfies RollParams).update({ value: 9 });
export const binding: RollBinding = { value: "€8", look: "cube" };
if (typeof vRoll.mounted !== "function" || typeof RollText !== "function" || typeof optionsOf !== "function") throw new Error("an adapter is missing");
if (typeof roll !== "function") throw new Error("roll isn't a function");

const props: RollProps = { value: "€6.67", className: "price" };
const markup = renderToStaticMarkup(createElement(Roll, props));
if (!markup.includes(`aria-hidden="true" style="display:inline-block;white-space:nowrap;font-kerning:none;font-variant-ligatures:none">€6.67</span>`)) throw new Error("Roll didn't draw its value as plain text");
if (!markup.startsWith(`<span class="price"`)) throw new Error("Roll lost its class");
const grouped = renderToStaticMarkup(createElement(RollGroup, null, createElement(Roll, { value: 1284, format: (n: number) => n.toLocaleString("en") })));
if (!grouped.includes(">1,284</span>")) throw new Error("Roll didn't draw a number as its format writes it");
const icon = renderToStaticMarkup(createElement(Roll, { value: createElement("svg", { viewBox: "0 0 24 24" }), label: "Copied" }));
if (!icon.includes("<svg") || !icon.includes(">Copied</span>")) throw new Error("Roll didn't draw its element with its label");

console.log(`${DIGITS.length} digits, ${LOWERCASE.length + UPPERCASE.length} letters; ${markup.length} characters drawn on a server`);
