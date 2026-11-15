/**
 * `<roll-text>`: Roll as an element, for any page or framework. Importing this entry defines it:
 *
 *   import "@cesarvenzac/roll/element";
 *
 *   <roll-text value="€8" look="drum" trend></roll-text>
 *   document.querySelector("roll-text").value = "€6.67";
 *
 * Its options are attributes (`look`, `direction`, `effects="fade blur"`, `stagger-from`, `trend`,
 * `count`, `tabular`, `duration`…); `value` is an attribute or a property (a number counts with
 * `count`), and `options` a property for what an attribute can't say (`format`, `group`,
 * `onSettle`). Text written inside it before it's defined (a server's) is taken up as it is.
 */

import { roll, type Roller, type RollOptions, type Value } from "./index.ts";

/** The attributes it reads, as options. */
const ATTRIBUTES = ["value", "label", "look", "direction", "effects", "duration", "bounce", "stagger", "stagger-from", "way", "trend", "count", "tabular", "reduced-motion", "reels"];

const numberOf = (text: string | null) => (text === null || text.trim() === "" || Number.isNaN(Number(text)) ? undefined : Number(text));
/** A switch: there and not "false". */
const on = (element: Element, name: string) => element.hasAttribute(name) && element.getAttribute(name) !== "false";

/** What its attributes say, as options. */
export function optionsOf(element: Element): RollOptions {
  const read = (name: string) => element.getAttribute(name) ?? undefined;
  const list = (name: string) => read(name)?.split(/\s+/).filter(Boolean);
  const count = read("count");
  return {
    label: read("label"),
    look: read("look") as RollOptions["look"],
    direction: read("direction") as RollOptions["direction"],
    effects: list("effects") as RollOptions["effects"],
    duration: numberOf(element.getAttribute("duration")),
    bounce: numberOf(element.getAttribute("bounce")),
    stagger: numberOf(element.getAttribute("stagger")),
    staggerFrom: read("stagger-from") as RollOptions["staggerFrom"],
    way: read("way") as RollOptions["way"],
    reels: list("reels"),
    trend: on(element, "trend") || undefined,
    count: count === undefined ? undefined : (numberOf(count) ?? on(element, "count")),
    reducedMotion: element.hasAttribute("reduced-motion") ? on(element, "reduced-motion") : undefined,
    tabular: element.hasAttribute("tabular") ? on(element, "tabular") : undefined,
  };
}

// A class to extend where there's no DOM (a server importing it), so the entry imports anywhere.
const Base = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

export class RollText extends Base {
  static observedAttributes = ATTRIBUTES;
  private roller: Roller | null = null;
  private current: Value | null = null;
  private extra: RollOptions = {};

  /** What it shows, or is rolling to: text, a number or a node. */
  get value(): Value {
    return this.current ?? this.getAttribute("value") ?? "";
  }
  set value(value: Value) {
    this.current = value;
    this.roller?.set(value, this.all());
  }

  /** Options an attribute can't say: `format`, `group`, `onSettle`. Attributes win where both say. */
  get options(): RollOptions {
    return this.extra;
  }
  set options(options: RollOptions) {
    this.extra = options;
    this.roller?.set(this.value, this.all());
  }

  /** Resolves once it's at rest on the value it was last given. */
  get settled(): Promise<void> {
    return this.roller?.settled ?? Promise.resolve();
  }

  private all(): RollOptions {
    const read = optionsOf(this);
    const said = Object.fromEntries(Object.entries(read).filter(([, value]) => value !== undefined));
    return { ...this.extra, ...said };
  }

  connectedCallback() {
    // Its text before it's drawn, as a server wrote it, unless a value says otherwise: once Roll
    // draws in it, its text is the drawing and what's read aloud.
    if (this.current === null && !this.hasAttribute("value")) this.current = this.textContent ?? "";
    this.roller ??= roll(this, this.value, this.all());
  }

  disconnectedCallback() {
    this.roller?.destroy();
    this.roller = null;
  }

  attributeChangedCallback(name: string) {
    if (!this.roller) return;
    if (name === "value") this.current = null;
    this.roller.set(this.value, this.all());
  }
}

if (typeof customElements !== "undefined" && !customElements.get("roll-text")) customElements.define("roll-text", RollText);

declare global {
  interface HTMLElementTagNameMap {
    "roll-text": RollText;
  }
}
