/**
 * What a value is made of, and what stays the same from one value to the next. A number's digits
 * keep their place, as an odometer's do: the units stay the units, so 9 becoming 10 turns the 9 to
 * 0 while a 1 comes in on its left, and 9:59 becoming 10:00 keeps its colon where it is. Words keep
 * theirs letter by letter, as a split-flap board does. Pure: no DOM.
 */

/** Which way a value went: `up` when it grew (the next symbol comes from below), `down` when it shrank. */
export type Way = "up" | "down";

let segmenter: Intl.Segmenter | null | undefined;
/** Texts split lately: the same few ("€", " MB", ":") come round again and again. */
const split = new Map<string, readonly string[]>();

/**
 * A text's characters as a reader sees them: "é" written as an e and an accent, a flag or a family
 * of emoji are one each (`Intl.Segmenter`, or code points where there's none).
 */
export function graphemesOf(text: string): string[] {
  let symbols = split.get(text);
  if (!symbols) {
    // Plain ASCII needs no segmenter: one character a symbol.
    if (/^[\x20-\x7e]*$/.test(text)) symbols = text.split("");
    else {
      if (segmenter === undefined) segmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
      symbols = segmenter ? Array.from(segmenter.segment(text), (part) => part.segment) : Array.from(text);
    }
    if (split.size > 256) split.clear();
    split.set(text, symbols);
  }
  return [...symbols];
}

/**
 * A number in a value: digits, and more digits after one character that joins them (a point or a
 * comma, a colon as in 1:05:30, an apostrophe, the spaces languages group digits with). Anything
 * else, a slash or a word, sets two numbers apart: "3/12" is two.
 */
const NUMBER = /\d+(?:[.,:'’    ]\d+)*/g;

/**
 * Where a number's fraction begins: its last point or comma, unless that only groups thousands,
 * which it does when three digits follow and every other mark in the number is the same one
 * ("12,345", "1.234.567"; but "6.40", "1,234.5", "1 234,567", "1:05.3"). -1 when it has none.
 */
function markOf(number: string) {
  const marks = number.replace(/\d/g, "");
  const last = marks.at(-1);
  if (last !== "." && last !== ",") return -1;
  const at = number.lastIndexOf(last);
  return number.length - at - 1 !== 3 || [...marks].some((mark) => mark !== last) ? at : -1;
}

/** A character of a value (`symbol`, a grapheme), and what makes it the same one in the next value (`key`). */
export type Cell = { key: string; symbol: string; digit: boolean };

/**
 * A value's characters, each with its place: a digit of a number's whole part by how many digits
 * stand to its right (`n0d0`, the units of the first number), the marks that group them by the
 * same, its fraction's from the mark on (`n0f0`, the tenths), what comes before the first number
 * from its end (so a sign that comes and goes leaves the currency beside the number be), what
 * comes after each number from its start, and a value with no number letter by letter.
 */
export function cellsOf(value: string): Cell[] {
  const cells: Cell[] = [];
  const text = (from: number, to: number, key: (k: number, count: number) => string) => {
    const symbols = graphemesOf(value.slice(from, to));
    symbols.forEach((symbol, k) => cells.push({ key: key(k, symbols.length), symbol, digit: false }));
  };
  let n = 0;
  let end = 0;
  for (const found of value.matchAll(NUMBER)) {
    const start = found.index;
    const number = found[0];
    if (n === 0) text(0, start, (k, count) => `p${count - k - 1}`);
    else text(end, start, (k) => `t${n - 1}.${k}`);
    const mark = markOf(number);
    const whole = mark < 0 ? number : number.slice(0, mark);
    const wholeCells: Cell[] = [];
    let place = 0;
    for (let k = whole.length - 1; k >= 0; k--) {
      const symbol = whole[k];
      const digit = symbol >= "0" && symbol <= "9";
      wholeCells.push({ key: digit ? `n${n}d${place++}` : `n${n}j${place}`, symbol, digit });
    }
    cells.push(...wholeCells.reverse());
    if (mark >= 0) {
      cells.push({ key: `n${n}m`, symbol: number[mark], digit: false });
      [...number.slice(mark + 1)].forEach((symbol, k) => cells.push({ key: `n${n}f${k}`, symbol, digit: true }));
    }
    end = start + number.length;
    n++;
  }
  // With no number, letter by letter from the start, as a split-flap board's.
  if (n === 0) text(0, value.length, (k) => `s${k}`);
  else text(end, value.length, (k) => `t${n - 1}.${k}`);
  return cells;
}

/** A cell while a value changes: `gone` on its way out, `fresh` on its way in. */
export type Change = Cell & { gone: boolean; fresh: boolean };

/**
 * What's drawn as `before` becomes `after`: `after`'s cells, the ones `before` didn't have fresh,
 * and `before`'s that `after` hasn't gone, each where it stood (before the next one that stays), so
 * a digit that goes leaves from its place: the 1 of 1,234 on the left as it becomes 999, the .67 of
 * €6.67 after the 8 as it becomes €8.
 */
export function cellsBetween(before: string, after: string): Change[] {
  return between(cellsOf(before), cellsOf(after));
}

/** `cellsBetween` for any two lists of cells. */
export function between(was: readonly Cell[], now: readonly Cell[]): Change[] {
  const stays = new Set(now.map((cell) => cell.key));
  const had = new Set(was.map((cell) => cell.key));
  // The cells that go, by the key of the next one that stays (the last ones by none).
  const goingBefore = new Map<string, Cell[]>();
  let going: Cell[] = [];
  for (const cell of was) {
    if (!stays.has(cell.key)) going.push(cell);
    else if (going.length) {
      goingBefore.set(cell.key, going);
      going = [];
    }
  }
  const gone = (cell: Cell): Change => ({ ...cell, gone: true, fresh: false });
  return [...now.flatMap((cell) => [...(goingBefore.get(cell.key) ?? []).map(gone), { ...cell, gone: false, fresh: !had.has(cell.key) }]), ...going.map(gone)];
}

/** A number as it compares: its sign, its whole part's digits with no zeros ahead, and its fraction's. */
function sizeOf(value: string, found: RegExpExecArray) {
  const number = found[0];
  const mark = markOf(number);
  const whole = (mark < 0 ? number : number.slice(0, mark)).replace(/\D/g, "").replace(/^0+/, "");
  const fraction = mark < 0 ? "" : number.slice(mark + 1);
  // A minus right before it, unless it joins two numbers (2026-11-15).
  const before = value.slice(Math.max(0, found.index - 2), found.index);
  const negative = /(?:^|[^\p{L}\p{N}])[-−]$/u.test(before) && (whole !== "" || /[1-9]/.test(fraction));
  return { negative, whole, fraction };
}

/** Whether `a` is less than `b` (below 0), the same (0) or more. */
function compare(a: ReturnType<typeof sizeOf>, b: ReturnType<typeof sizeOf>) {
  if (a.negative !== b.negative) return a.negative ? -1 : 1;
  let order = 0;
  if (a.whole.length !== b.whole.length) order = a.whole.length - b.whole.length;
  else if (a.whole !== b.whole) order = a.whole < b.whole ? -1 : 1;
  else {
    const length = Math.max(a.fraction.length, b.fraction.length);
    const [f, g] = [a.fraction.padEnd(length, "0"), b.fraction.padEnd(length, "0")];
    order = f === g ? 0 : f < g ? -1 : 1;
  }
  return a.negative ? -order : order;
}

/**
 * Which way a value went, read from its numbers in turn: "€8" to "€6.40" is down, "9:59" to
 * "10:00" up, "3/12" to "4/12" up, "−3°" to "−5°" down. Up when it can't be told.
 */
export function wayOf(before: string, after: string): Way {
  const from = [...before.matchAll(NUMBER)].map((found) => sizeOf(before, found));
  const to = [...after.matchAll(NUMBER)].map((found) => sizeOf(after, found));
  for (let k = 0; k < Math.min(from.length, to.length); k++) {
    const order = compare(to[k], from[k]);
    if (order !== 0) return order < 0 ? "down" : "up";
  }
  return "up";
}
