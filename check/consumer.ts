// The package as someone installing it uses it: typechecked against its published types (as
// NodeNext and as a bundler resolves them) and run, by check/run.sh. `roll` needs a page, so here
// it's typechecked only; the React component renders on a server.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DIGITS, LOWERCASE, roll, type Roller, type RollOptions, UPPERCASE, type Value, type Way } from "@cesarvenzac/roll";
import { Roll, type RollProps } from "@cesarvenzac/roll/react";

const way: Way | "auto" = "auto";
const options: RollOptions = { duration: 0.5, bounce: 0.1, stagger: 0.02, reels: [DIGITS, LOWERCASE, UPPERCASE], way, reducedMotion: false, label: "Price" };
export const start = (element: HTMLElement, value: Value): Roller => {
  const price = roll(element, value, options);
  price.set("€6.67", { label: "Price, €6.67" });
  return price;
};
if (typeof roll !== "function") throw new Error("roll isn't a function");

const props: RollProps = { value: "€6.67", className: "price" };
const markup = renderToStaticMarkup(createElement(Roll, props));
if (!markup.includes(`aria-hidden="true" style="display:inline-block;white-space:nowrap;font-kerning:none;font-variant-ligatures:none">€6.67</span>`)) throw new Error("Roll didn't draw its value as plain text");
if (!markup.startsWith(`<span class="price"`)) throw new Error("Roll lost its class");
const icon = renderToStaticMarkup(createElement(Roll, { value: createElement("svg", { viewBox: "0 0 24 24" }), label: "Copied" }));
if (!icon.includes("<svg") || !icon.includes(">Copied</span>")) throw new Error("Roll didn't draw its element with its label");

console.log(`${DIGITS.length} digits, ${LOWERCASE.length + UPPERCASE.length} letters; ${markup.length} characters drawn on a server`);
