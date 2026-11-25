/**
 * Draws a rolling value into an element: plain text while it rests (one text node, as cheap and
 * as crisp as any text), and a cell a character only while something rolls. A cell rolls on a
 * strip, its symbols top to bottom, moved on a spring (or posed by a look), its width easing to the next
 * symbol's on the same spring; a turn told to go elsewhere mid-way goes on at the speed it has.
 * Every roller on the page changes together, once a change: all write, all read (one layout for
 * the lot), all animate, so a table of numbers changing at once lays out once, not once a number.
 */

import { between, type Cell, cellsOf, graphemesOf, trendOf, type Way, wayOf } from "./cells.ts";
import { cssOf, type Direction, type Effect, isDeep, type Look, poseOf, SPEED } from "./looks.ts";
import { type Landing, pathAt, pushOf, RATE, type Spring, springFrames } from "./spring.ts";
import { ranksOf, type StaggerFrom, stepOf } from "./stagger.ts";
import { BLANK, turnOf } from "./turn.ts";

/** What a roller shows: text, a number, or a node (an icon, say) that rolls over as one. */
export type Value = string | number | Node;

export type Options = {
  /** Seconds a turn takes to come to rest, near enough: the spring's. 0.6 unless said. */
  duration?: number;
  /** 0 to 1: how far a turn goes past and comes back. 0 unless said. */
  bounce?: number;
  /** Seconds between one character starting and the next, left to right. 0.03 unless said. */
  stagger?: number;
  /**
   * What turns through its symbols rather than rolling over: each string a reel of symbols in
   * order, going round. Everything turns the value's way, as a split-flap board's flaps do: a
   * number's digits the way the number went, anything else forward. Digits alone unless said.
   */
  reels?: readonly string[];
  /** Which way everything turns: `auto` (the default) reads it from the value's numbers. */
  way?: Way | "auto";
  /** Whether to fade rather than move: `prefers-reduced-motion` unless said. */
  reducedMotion?: boolean;
  /**
   * How a symbol turns: `slide` (the default) on a flat strip, `drum` on a turning drum and
   * `cube` on a turning box, seen in perspective, `circle` rolling like a wheel, `square`
   * tipping over its edge, and `swap` in place, the old one giving way to the next.
   */
  look?: Look;
  /** Where a symbol goes as the value turns forward: `up` (the default), `down`, `left` or `right`. */
  direction?: Direction;
  /**
   * Laid over the look as a symbol leaves and comes, as far as it's gone: `fade`, `scale` (down,
   * never to nothing) and `blur`, or `motion`, a blur by how fast it goes, any of them together.
   * None unless said.
   */
  effects?: readonly Effect[];
  /** Where a change's characters start from: the `start` (the default), the `end` or the `center`. */
  staggerFrom?: StaggerFrom;
  /**
   * Tints the value a moment as its numbers go up or down, then lets it fade back to its own colour,
   * as a ticker does: `true` for green and red, or the colours to use.
   */
  trend?: boolean | { up?: string; down?: string };
  /** Called each time it comes to rest on a new value. */
  onSettle?: () => void;
  /** Rollers in a group stagger as one value, in the page's order, and settle together. */
  group?: Group;
};

/** Green and red a ticker's, darkened to read on white (4.5:1 and more). */
const TREND = { up: "#15803d", down: "#dc2626" };
/** Seconds a trend's tint holds and fades. */
const TREND_SECONDS = 1.1;

export const DIGITS = "0123456789";

/** How the text it draws is set: on one line, each character as wide alone as among the others. */
export const VISUAL = "display:inline-block;white-space:nowrap;font-kerning:none;font-variant-ligatures:none";
/** Read by assistive tech, never seen or copied. */
export const SPOKEN = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;user-select:none";

/** What a value says in words: its text, or a node's label. */
export function wordsOf(value: Value): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value instanceof Element) return (value.getAttribute("aria-label") ?? value.getAttribute("title") ?? value.textContent ?? "").trim();
  return value.textContent ?? "";
}

/** Marks a node's symbol (its markup), so no character is ever taken for one. */
const NODE = "\u0000";
/** How far a strip's window reaches past its line, to fade there (em). */
const FADE = 0.15;
/**
 * How far apart a strip's symbols are beyond their line (em): far enough that what hangs past its
 * own line (a g's tail, an accent, a line set tight) never shows in the fade once a turn lands.
 */
const GAP = 0.3;
/** How far it reaches past its cell at the sides, for a wider symbol passing through (em). */
const SIDE = 0.5;
/** Close enough, in steps of the strip and in em of width. */
const WITHIN = 0.002;
/**
 * The least a turn moves a frame as it lands, in CSS pixels: text moved by less goes in whole
 * pixels, a pixel and a pause, and a spring's tail read as a stutter (`springFrames`' `least`).
 */
const LEAST = 1;
/** Seconds a fade takes under reduced motion. */
const FADE_SECONDS = 0.18;

const CELL = "display:inline-block;position:relative;white-space:pre";
const WINDOW = `position:absolute;top:-${FADE}em;bottom:-${FADE}em;left:-${SIDE}em;right:-${SIDE}em;overflow:hidden;pointer-events:none;mask-image:linear-gradient(transparent,#000 ${FADE}em,#000 calc(100% - ${FADE}em),transparent);-webkit-mask-image:linear-gradient(transparent,#000 ${FADE}em,#000 calc(100% - ${FADE}em),transparent)`;
/**
 * A strip: a block a symbol, each a step tall, its symbol on a line of the text's own height at its
 * top, so it's drawn where the text draws it to the pixel, however the browser rounds a line's
 * leading (one line of text a step tall would put it half a pixel off at some sizes). It's as wide
 * as the window, past the cell on both sides: a letter a hair wider than its cell, as the browser
 * rounds a cell's width, overflowed a strip as wide as the cell and was set from its left, a
 * sixty-fourth of a pixel off centre and off the text.
 */
const STRIP = `position:absolute;top:${FADE}em;left:0;right:0;text-align:center`;
/**
 * A window for a look that turns across: as tall as a square tipping or a circle turning needs,
 * as wide as its cell and a fade, so what leaves never passes over its neighbours.
 */
const ACROSS = `position:absolute;top:-${2 * FADE}em;bottom:-${2 * FADE}em;left:-${FADE}em;right:-${FADE}em;overflow:hidden;pointer-events:none;mask-image:linear-gradient(to right,transparent,#000 ${FADE}em,#000 calc(100% - ${FADE}em),transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 ${FADE}em,#000 calc(100% - ${FADE}em),transparent)`;
/** A symbol in a look, placed as a strip's is at rest, moved by its pose. */
const POSED = "position:absolute;left:0;right:0;display:flex;justify-content:center;align-items:flex-start;white-space:pre";
/** How far a deep look's eye is, in steps: near enough to see the depth, far enough not to warp. */
const EYE = 4;
/** Measures the next symbol beside the one shown, taking no room. */
const MEASURER = "position:absolute;top:0;left:0;visibility:hidden;white-space:pre";
const RULER = "position:absolute;top:0;left:0;width:0;height:0;overflow:hidden;visibility:hidden";

type Motion = { animation: Animation; from: number; to: number; velocity: number; delay: number; spring: Spring; landing: Landing | null; ended: boolean; also?: Animation };

/** Stops a motion, and what plays beside it. */
function stop(motion: Motion | null) {
  motion?.animation.cancel();
  motion?.also?.cancel();
}

type CellState = Cell & {
  /** On its way out. */
  gone: boolean;
  /**
   * Its cell, once it turns. Until then it's drawn in a run of plain text with its neighbours that
   * don't turn either (`layOut`).
   */
  element: HTMLSpanElement | null;
  /** The symbol in the cell: what it shows at rest, and what holds its place (unseen) while it turns. */
  sizer: HTMLSpanElement | null;
  window: HTMLSpanElement | null;
  strip: HTMLSpanElement | null;
  /** The look its window is made for, and how far apart its symbols are going across (em). */
  kind: string | null;
  across: number;
  /** The next symbol, measured. */
  measurer: HTMLSpanElement | null;
  /** The strip's symbols while it turns; the one it shows when still. */
  symbols: string[];
  /** What it shows at rest, or is turning to. */
  symbol: string;
  /** What this change turns it to, if it does. */
  next: string | null;
  turn: Motion | null;
  widen: Motion | null;
  /** Its width at rest, or where it's going (em); NaN until measured. */
  width: number;
  /** Where this change takes its width (em). */
  target: number;
};

/** The value a look's symbols are posed from, sprung on the window and read by each symbol. */
const VALUE = "--roll-v";
let posing: boolean | undefined;
/**
 * Whether the browser can pose symbols from one sprung value: a registered property to animate, and
 * CSS's sine, cosine and rounding to work their poses out. Elsewhere every look slides up.
 */
function posesWork() {
  if (posing !== undefined) return posing;
  posing = false;
  if (typeof CSS === "undefined" || typeof CSS.registerProperty !== "function" || typeof CSS.supports !== "function") return false;
  if (!CSS.supports("transform", "rotate(calc(sin(30deg) * 1rad))") || !CSS.supports("width", "calc(round(down, 1.5, 1) * 1px)")) return false;
  for (const name of [VALUE, SPEED]) {
    try {
      CSS.registerProperty({ name, syntax: "<number>", inherits: true, initialValue: "0" });
    } catch {
      // Registered already, by another copy of Roll on the page: the same property.
    }
  }
  return (posing = true);
}

/** Whether the visitor asked for less motion. */
export const prefersReducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Where a motion is and how fast it's going, now. */
function where(motion: Motion) {
  const time = motion.animation.currentTime;
  const t = (typeof time === "number" ? time : Number(time ?? 0)) / 1000 - motion.delay;
  if (t < 0) return { value: motion.from, velocity: 0 };
  return pathAt(motion.spring, motion.from, motion.to, motion.velocity, motion.landing, t);
}

const made = new Map<string, HTMLSpanElement>();
/** A span in a style, copied from one made in it before: a copy shares the style already read. */
function span(style: string) {
  let model = made.get(style);
  if (!model) {
    model = document.createElement("span");
    model.style.cssText = style;
    made.set(style, model);
  }
  return model.cloneNode(false) as HTMLSpanElement;
}

let linear: boolean | undefined;
/** Whether the browser eases by CSS `linear()`, which plays a spring between two keyframes. */
const easesLinear = () => (linear ??= typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timing-function", "linear(0, 0.5, 1)"));

/**
 * Plays a spring's frames on an element: two keyframes and the spring as a `linear()` easing,
 * which the browser parses once, or a keyframe a frame where there's no `linear()`.
 */
function play(element: HTMLElement, frames: { values: number[]; duration: number }, keyframe: (value: number) => Keyframe, delay: number) {
  const from = frames.values[0];
  const to = frames.values.at(-1)!;
  const timing: KeyframeAnimationOptions = { duration: frames.duration * 1000, delay: delay * 1000, fill: "both" };
  if (easesLinear() && Math.abs(to - from) > 1e-9) {
    const easing = `linear(${frames.values.map((value) => +((value - from) / (to - from)).toFixed(4)).join(",")})`;
    return element.animate([keyframe(from), keyframe(to)], { ...timing, easing });
  }
  return element.animate(frames.values.map(keyframe), { ...timing, easing: "linear" });
}

/** Rollers waiting to change, all changed together in the next microtask. */
const queue = new Set<Engine>();

function flush() {
  const engines = [...queue];
  queue.clear();
  // Every roller writes, then every one reads, then every one animates: one layout for them all.
  const work = engines.filter((engine) => engine.begin());
  for (const engine of work) engine.read();
  // A group's rollers stagger as one value, in the page's order: each its slice of the ranks.
  const alone = work.filter((engine) => !engine.group);
  for (const engine of alone) engine.animate();
  const groups = new Set(work.map((engine) => engine.group).filter((group): group is Group => !!group));
  for (const group of groups) {
    const members = work
      .filter((engine) => engine.group === group)
      .sort((a, b) => (a.visual.compareDocumentPosition(b.visual) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    const counts = members.map((engine) => engine.fresh());
    const options = members[0].options();
    const ranks = ranksOf(counts.reduce((sum, n) => sum + n, 0), options.staggerFrom ?? "start");
    const step = stepOf(options.stagger ?? 0.03, ranks);
    let at = 0;
    members.forEach((engine, k) => {
      engine.animate(ranks.slice(at, at + counts[k]), step);
      at += counts[k];
    });
  }
}

/**
 * Rollers that move as one: a change to several in the same moment staggers across them all, in
 * the page's order, and `settled` waits for every one of them, counts included.
 */
export class Group {
  readonly members = new Set<Engine>();
  constructor(private onSettle?: () => void) {}
  /** What's called each time all its rollers have come to rest, from now on. */
  listen(onSettle: (() => void) | undefined) {
    this.onSettle = onSettle;
  }
  /** Resolves once every roller in it is at rest, its count, if any, done too. */
  get settled(): Promise<void> {
    return Promise.all([...this.members].map((engine) => (engine.waitsFor?.idle() ?? Promise.resolve()).then(() => engine.settled))).then(() => undefined);
  }
  /** One of its rollers came to rest, or its count ended: if all are at rest, it is. */
  rested() {
    if ([...this.members].every((engine) => engine.resting && !engine.waitsFor?.busy())) this.onSettle?.();
  }
}

/**
 * What else a roller waits for before it's at rest, as what drives it says: its count. A count
 * slowing to its end can hold one number for a few frames, and the engine rests between them.
 */
export type Waiting = {
  /** Whether it's still going. */
  busy(): boolean;
  /** Resolves once it isn't. */
  idle(): Promise<void>;
};

export class Engine {
  private shown: string;
  private next: string;
  private readonly nodes = new Map<string, Node>();
  private cells: Map<string, CellState> | null = null;
  private order: CellState[] = [];
  private ruler: HTMLSpanElement | null = null;
  private em = 0;
  private line = 0;
  private way: Way = "up";
  /** Which way this change's numbers went, for `trend`. */
  private trend: Way | null = null;
  private tint: Animation | null = null;
  private destroyed = false;
  /** Waiting for it to come to rest. */
  private waiting: (() => void)[] = [];
  readonly group: Group | null;
  /** What else its group waits for: set by the driver, for its count. */
  waitsFor: Waiting | null = null;

  constructor(
    readonly visual: HTMLElement,
    value: Value,
    readonly options: () => Options,
  ) {
    this.shown = this.next = this.idOf(value);
    this.group = options().group ?? null;
    this.group?.members.add(this);
    // A server may have drawn it already; otherwise it's drawn at rest.
    if (this.shown.startsWith(NODE) || visual.textContent !== this.shown || visual.children.length) this.rest();
  }

  /** Whether it's at rest: nothing turning, nothing waiting to. */
  get resting() {
    return this.destroyed || (!this.cells && !queue.has(this) && this.shown === this.next);
  }

  /** Resolves once it's at rest on the value it was last given. */
  get settled(): Promise<void> {
    if (this.resting) return Promise.resolve();
    return new Promise((resolve) => this.waiting.push(resolve));
  }

  /** The text it shows, or a node's markup. */
  get value() {
    return this.next;
  }

  set(value: Value) {
    if (this.destroyed) return;
    const id = this.idOf(value);
    if (id === this.next) return;
    this.next = id;
    if (!queue.size) queueMicrotask(flush);
    queue.add(this);
  }

  destroy() {
    this.destroyed = true;
    queue.delete(this);
    for (const cell of this.order) {
      stop(cell.turn);
      cell.widen?.animation.cancel();
    }
    this.tint?.cancel();
    this.shown = this.next;
    this.rest();
    this.group?.members.delete(this);
    this.ended(false);
  }

  /** At rest: whoever waited is told, and its group asked whether it's at rest too. */
  private ended(said: boolean) {
    const waiting = this.waiting;
    this.waiting = [];
    for (const resolve of waiting) resolve();
    if (!said) return;
    this.options().onSettle?.();
    this.group?.rested();
  }

  private idOf(value: Value): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    const id = NODE + (value instanceof Element ? value.outerHTML : (value.textContent ?? ""));
    if (!this.nodes.has(id)) this.nodes.set(id, value.cloneNode(true));
    return id;
  }

  private cellsFor(id: string): Cell[] {
    return id.startsWith(NODE) ? [{ key: "node", symbol: id, digit: false }] : cellsOf(id);
  }

  /** Puts a symbol into an element: text, or a copy of its node. */
  private fill(element: HTMLElement, symbol: string) {
    if (symbol === BLANK) element.replaceChildren();
    else if (symbol.startsWith(NODE)) element.replaceChildren(this.nodes.get(symbol)!.cloneNode(true));
    else element.textContent = symbol;
  }

  /** Back to plain text (or its node), nothing turning. */
  private rest() {
    this.cells = null;
    this.order = [];
    this.ruler = null;
    if (this.shown.startsWith(NODE)) this.fill(this.visual, this.shown);
    else this.visual.textContent = this.shown;
    // Forget the nodes no longer shown.
    for (const id of this.nodes.keys()) if (id !== this.shown && id !== this.next) this.nodes.delete(id);
  }

  /** A character as plain text, as it stands in a value at rest (a node is a cell from the start). */
  private plain(cell: Cell): CellState {
    const state: CellState = { ...cell, gone: false, element: null, sizer: null, window: null, strip: null, kind: null, across: 0, measurer: null, symbols: [cell.symbol], symbol: cell.symbol, next: null, turn: null, widen: null, width: NaN, target: 0 };
    if (cell.symbol.startsWith(NODE)) this.cellOf(state);
    return state;
  }

  /** A character's cell, made the first time it turns (`layOut` puts it in its place): its width to be measured. */
  private cellOf(cell: CellState) {
    if (cell.element) return cell.element;
    const element = span(CELL);
    const sizer = document.createElement("span");
    this.fill(sizer, cell.symbol);
    element.append(sizer);
    cell.element = element;
    cell.sizer = sizer;
    cell.width = NaN;
    return element;
  }

  /**
   * The line as it should stand: each run of characters that don't turn as one text node, each
   * cell in its place, the ruler last. A run split into a node a character is placed by the browser
   * an eighth of a pixel off plain text, which showed as a flicker as a turn began and ended; one
   * node a run, and cells beside it, lay out exactly as plain text. Cells already in the line are
   * never moved: only the text between them is written.
   */
  private layOut() {
    const parts: (string | HTMLSpanElement)[] = [];
    let run = "";
    for (const cell of this.order) {
      if (!cell.element) run += cell.symbol;
      else {
        if (run) parts.push(run);
        run = "";
        parts.push(cell.element);
      }
    }
    if (run) parts.push(run);
    if (this.ruler) parts.push(this.ruler);
    const kept = new Set<Node>(parts.filter((part) => typeof part !== "string"));
    let at: ChildNode | null = this.visual.firstChild;
    const drop = () => {
      const next: ChildNode | null = at!.nextSibling;
      at!.remove();
      at = next;
    };
    for (const part of parts) {
      if (typeof part === "string") {
        while (at && at.nodeType !== Node.TEXT_NODE && !kept.has(at)) drop();
        if (at && at.nodeType === Node.TEXT_NODE) {
          if ((at as Text).data !== part) (at as Text).data = part;
          at = at.nextSibling;
        } else this.visual.insertBefore(document.createTextNode(part), at);
      } else {
        // What stands before it isn't there any more: text, or what the line held at rest.
        while (at && at !== part && (at.nodeType === Node.TEXT_NODE || !kept.has(at))) drop();
        if (at === part) at = at.nextSibling;
        else this.visual.insertBefore(part, at);
      }
    }
    while (at) drop();
  }

  /**
   * Writes: into cells, if it rests; then the new value's cells in their places, a cell new to the
   * line in with no width yet, each one changing given its next symbol to measure. Whether there's work.
   */
  begin() {
    if (this.destroyed || this.next === this.shown) return false;
    if (!this.cells) {
      // Plain text a character, a cell only for those that turn.
      this.cells = new Map();
      this.order = this.cellsFor(this.shown).map((cell) => {
        const state = this.plain(cell);
        this.cells!.set(cell.key, state);
        return state;
      });
      this.ruler = span(RULER);
      this.ruler.append(span("display:inline-block;width:10em"));
    }
    const before = this.shown;
    const after = this.next;
    const option = this.options().way ?? "auto";
    this.way = option !== "auto" ? option : before.startsWith(NODE) || after.startsWith(NODE) ? "up" : wayOf(before, after);
    this.trend = before.startsWith(NODE) || after.startsWith(NODE) ? null : trendOf(before, after);
    const cells = this.cells;
    // In order: a cell already in the line stays where it is, a new one goes in before the next.
    let at = 0;
    for (const change of between(this.cellsFor(before), this.cellsFor(after))) {
      let cell = cells.get(change.key);
      const next = change.gone ? BLANK : change.symbol;
      if (!cell) {
        // New to the line: drawn, to be measured, but taking no room until it turns in.
        cell = this.plain({ ...change, symbol: next });
        const element = this.cellOf(cell);
        element.style.width = "0";
        cell.sizer!.style.visibility = "hidden";
        cell.symbols = [BLANK];
        cell.symbol = BLANK;
        cell.width = 0;
        cells.set(change.key, cell);
        this.order.splice(at, 0, cell);
      } else if (next !== cell.symbol) {
        const element = this.cellOf(cell);
        if (next !== BLANK) {
          cell.measurer ??= span(MEASURER);
          this.fill(cell.measurer, next);
          element.append(cell.measurer);
        }
      }
      at = this.order.indexOf(cell) + 1;
      cell.digit = change.digit;
      cell.gone = change.gone;
      cell.next = next !== cell.symbol ? next : null;
    }
    this.layOut();
    this.shown = after;
    return true;
  }

  /** Reads: the em, the line, each still cell's width, and each changing cell's next. */
  read() {
    this.em = this.ruler!.firstElementChild!.getBoundingClientRect().width / 10;
    if (!(this.em > 0)) return;
    const em = this.em;
    const lined = this.order.find((cell) => cell.element && cell.symbol !== BLANK) ?? this.order.find((cell) => cell.element);
    if (lined) this.line = lined.element!.getBoundingClientRect().height / em;
    for (const cell of this.order) {
      if (!cell.sizer) continue;
      // The cell's own width, as the browser lays it out (rounded to its grid), not the letter's
      // advance: a turn starting from the advance stood a sixty-fourth of a pixel off, enough to
      // draw the letter a step of the sub-pixel grid away from the plain text it took over from.
      if (Number.isNaN(cell.width) && !cell.turn && !cell.widen) cell.width = (cell.element ?? cell.sizer).getBoundingClientRect().width / em;
      if (cell.next === null) continue;
      cell.target = cell.next === BLANK ? 0 : (cell.measurer ?? cell.sizer).getBoundingClientRect().width / em;
    }
  }

  /** How many of its cells start turning now, from still: the ones a stagger orders. */
  fresh() {
    return this.order.filter((cell) => cell.next !== null && !cell.turn && !cell.widen).length;
  }

  /**
   * Writes again: every changing cell turned, and widened, on its spring; a cell turning from still
   * after as many steps as its rank (its group's, or its own from `staggerFrom`).
   */
  animate(ranks?: number[], step?: number) {
    const options = this.options();
    const reduced = (options.reducedMotion ?? prefersReducedMotion()) || !(this.em > 0) || !(this.line > 0);
    const spring: Spring = { duration: options.duration ?? 0.6, bounce: options.bounce ?? 0 };
    // A reel's symbols are characters as a value's are: "♥️" is one.
    const reels = (options.reels ?? [DIGITS]).map((reel) => graphemesOf(reel));
    let look = options.look ?? "slide";
    let direction = options.direction ?? "up";
    let effects = options.effects ?? [];
    if ((look !== "slide" || direction !== "up" || effects.length) && !posesWork()) [look, direction, effects] = ["slide", "up", []];
    const changing = this.order.filter((cell) => cell.next !== null);
    ranks ??= ranksOf(this.fresh(), options.staggerFrom ?? "start");
    step ??= stepOf(options.stagger ?? 0.03, ranks);
    let fresh = 0;
    if (options.trend && this.trend) {
      const colours = typeof options.trend === "object" ? { ...TREND, ...options.trend } : TREND;
      const tint = colours[this.trend];
      // Held a moment, then back to its own colour: the last keyframe left out is the element's own.
      this.tint?.cancel();
      this.tint = this.visual.animate([{ color: tint }, { color: tint, offset: 0.15, easing: "ease-out" }], { duration: TREND_SECONDS * 1000 });
    }
    for (const cell of changing) {
      const next = cell.next!;
      cell.next = null;
      // Where its width is now: on its way somewhere, or still.
      const width = cell.widen ? where(cell.widen) : { value: Number.isNaN(cell.width) ? cell.target : cell.width, velocity: 0 };
      cell.measurer?.remove();
      cell.measurer = null;
      if (next !== BLANK) this.fill(cell.sizer!, next);
      cell.symbol = next;
      cell.width = cell.target;
      if (reduced) {
        this.fade(cell);
        continue;
      }
      const moving = !!(cell.turn || cell.widen);
      const delay = moving ? 0 : (ranks[fresh++] ?? 0) * step;
      this.turn(cell, spring, reels, delay, look, direction, effects, Math.max(width.value, cell.width));
      // Widths all at once, on one curve: the value's width then moves one way only, where widths
      // staggered as the turns are made it grow then shrink, and a centred word shook.
      this.widen(cell, width, spring, 0);
      cell.element!.style.width = "";
    }
    this.settle();
  }

  private turn(cell: CellState, spring: Spring, reels: string[][], delay: number, look: Look, direction: Direction, effects: readonly Effect[], wide: number) {
    // Still, a cell's strip is the one symbol it shows.
    const now = cell.turn ? where(cell.turn) : { value: 0, velocity: 0 };
    const at = Math.max(0, now.value);
    stop(cell.turn);
    const shown = cell.symbols[Math.min(cell.symbols.length - 1, Math.round(at))];
    const reel = reels.find((symbols) => symbols.includes(shown) && symbols.includes(cell.symbol)) ?? null;
    // Every symbol on a reel turns the value's way, never the shorter way: a word's letters going
    // some forward and some back read as a muddle, where a split-flap board's all go one way.
    const turn = turnOf({ symbols: cell.symbols, at }, cell.symbol, this.way, reel, false);
    // The strip of old, flat and upward, moved by `top`; any other look posed from one value.
    const strip = look === "slide" && direction === "up" && !effects.length;
    const across = direction === "left" || direction === "right";
    const kind = `${look} ${direction} ${effects.join(" ")}`;
    if (cell.window && cell.kind !== kind) {
      cell.window.remove();
      cell.window = cell.strip = null;
    }
    if (!cell.window) {
      cell.window = span(strip ? WINDOW : across ? ACROSS : WINDOW);
      cell.kind = kind;
      // Going across, symbols are a cell and its fade apart, the wider of where it's going and coming from.
      cell.across = Math.max(wide, 0.5) + 2 * FADE;
      if (strip) {
        cell.strip = span(STRIP);
        cell.window.append(cell.strip);
      }
      cell.element!.append(cell.window);
      cell.sizer!.style.visibility = "hidden";
    }
    const step = across ? cell.across : this.line + GAP;
    if (strip) {
      // The strip's symbols, a block a step tall each, each centred by flex: `text-align` centres
      // text alone, and a page's CSS often makes an icon a block (Tailwind does), which then stood at
      // the window's left edge, half an em off, until the turn ended.
      cell.strip!.replaceChildren(
        ...turn.symbols.map((symbol) => {
          const item = span(`display:flex;justify-content:center;align-items:flex-start;height:${step.toFixed(4)}em;white-space:pre`);
          this.fill(item, symbol);
          return item;
        }),
      );
    } else {
      // Each symbol where a strip's rests, `--p` steps past it, posed by the look: one style for all.
      const pose = cssOf(poseOf(look, direction, step, this.line, effects));
      const deep = isDeep(look);
      if (deep) cell.window.style.perspective = `${(EYE * step).toFixed(4)}em`;
      const top = across ? 2 * FADE : FADE;
      const style = `${POSED};top:${top}em;height:${this.line.toFixed(4)}em;transform:${pose.transform}${pose.opacity ? `;opacity:${pose.opacity}` : ""}${pose.filter ? `;filter:${pose.filter}` : ""}`;
      cell.window.replaceChildren(
        ...turn.symbols.map((symbol, index) => {
          const item = span(style);
          item.style.setProperty("--p", `calc(var(${VALUE}) - ${index})`);
          this.fill(item, symbol);
          return item;
        }),
      );
    }
    cell.symbols = turn.symbols;
    const velocity = now.velocity + pushOf(spring, turn.from, turn.to);
    // Never slower than a pixel a frame as it lands: `step` em a step, `em` pixels an em.
    const frames = springFrames(spring, turn.from, turn.to, velocity, WITHIN, (LEAST * RATE) / (step * this.em));
    // Moved by `top`, or posed from a value on the main thread, drawn in the page as the text beside
    // it is: a transform animation put the strip on a layer of its own, which the browser places on
    // whole device pixels, so a letter turning stood up to a pixel off the text and jumped as it was
    // handed back.
    const animation = strip
      ? play(cell.strip!, frames, (value) => ({ top: `${(FADE - value * step).toFixed(4)}em` }), delay)
      : play(cell.window!, frames, (value) => ({ [VALUE]: value.toFixed(5) }), delay);
    const motion: Motion = { animation, from: turn.from, to: turn.to, velocity, delay, spring, landing: frames.landing, ended: false };
    if (!strip && effects.includes("motion")) {
      // Its speed beside its value, frame by frame, for `motion` to blur by.
      const speeds = frames.values.map((_, k) => Math.abs(pathAt(spring, turn.from, turn.to, velocity, frames.landing, k / RATE).velocity));
      // Still while it waits its turn in a stagger, and still once it lands.
      speeds[0] = speeds[speeds.length - 1] = 0;
      motion.also = play(cell.window!, { values: speeds, duration: frames.duration }, (value) => ({ [SPEED]: value.toFixed(3) }), delay);
    }
    cell.turn = motion;
    animation.onfinish = () => {
      motion.ended = true;
      if (cell.turn === motion) this.done(cell);
    };
  }

  private widen(cell: CellState, now: { value: number; velocity: number }, spring: Spring, delay: number) {
    if ((!cell.widen || cell.widen.ended) && Math.abs(now.value - cell.width) < WITHIN) return;
    cell.widen?.animation.cancel();
    const velocity = now.velocity + pushOf(spring, now.value, cell.width);
    const frames = springFrames(spring, now.value, cell.width, velocity, WITHIN);
    const animation = play(cell.element!, frames, (value) => ({ width: `${Math.max(0, value).toFixed(6)}em` }), delay);
    const motion: Motion = { animation, from: now.value, to: cell.width, velocity, delay, spring, landing: frames.landing, ended: false };
    cell.widen = motion;
    animation.onfinish = () => {
      motion.ended = true;
      if (cell.widen === motion) this.done(cell);
    };
  }

  /** Under reduced motion: no turning, the new symbol faded in where it stands. */
  private fade(cell: CellState) {
    stop(cell.turn);
    cell.widen?.animation.cancel();
    cell.turn = cell.widen = null;
    cell.window?.remove();
    cell.window = cell.strip = null;
    cell.kind = null;
    cell.element!.style.width = "";
    cell.sizer!.style.visibility = "";
    cell.symbols = [cell.symbol];
    if (cell.gone) return this.done(cell);
    const animation = cell.sizer!.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_SECONDS * 1000, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
    const motion: Motion = { animation, from: 0, to: 0, velocity: 0, delay: 0, spring: { duration: 0, bounce: 0 }, landing: null, ended: false };
    cell.turn = motion;
    animation.onfinish = () => {
      motion.ended = true;
      if (cell.turn === motion) this.done(cell);
    };
  }

  /**
   * One of a cell's motions ended. Once both have, it rests: as it was drawn at their last frame,
   * its strip let go and its width its own, or gone. Until then each holds its last frame, so a
   * width that settles first never springs back while the strip still turns.
   */
  private done(cell: CellState) {
    if ((cell.turn && !cell.turn.ended) || (cell.widen && !cell.widen.ended)) return;
    cell.widen?.animation.cancel();
    cell.turn = cell.widen = null;
    if (cell.gone) {
      this.cells?.delete(cell.key);
      this.order = this.order.filter((other) => other !== cell);
      this.layOut();
    } else {
      cell.window?.remove();
      cell.window = cell.strip = null;
      cell.kind = null;
      if (cell.sizer) cell.sizer.style.visibility = "";
      cell.symbols = [cell.symbol];
    }
    this.settle();
  }

  /** Back to plain text once nothing moves, and nothing waits to. */
  private settle() {
    if (!this.cells || queue.has(this)) return;
    if (this.order.some((cell) => cell.turn || cell.widen)) return;
    this.rest();
    this.ended(true);
  }
}
