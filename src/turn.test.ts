import { describe, expect, it } from "vitest";

import { BLANK, turnOf } from "./turn.ts";

const DIGITS = [..."0123456789"];
const LETTERS = [..."abcdefghijklmnopqrstuvwxyz"];
const still = (symbol: string) => ({ symbols: [symbol], at: 0 });

describe("turnOf, along a reel", () => {
  it("turns a number's digit forward through the wrap counting up", () => {
    expect(turnOf(still("7"), "0", "up", DIGITS, false)).toEqual({ symbols: ["7", "8", "9", "0"], from: 0, to: 3 });
    expect(turnOf(still("2"), "5", "up", DIGITS, false)).toEqual({ symbols: ["2", "3", "4", "5"], from: 0, to: 3 });
  });

  it("turns it back through the wrap counting down", () => {
    expect(turnOf(still("0"), "9", "down", DIGITS, false)).toEqual({ symbols: ["9", "0"], from: 1, to: 0 });
    expect(turnOf(still("5"), "7", "down", DIGITS, false)).toEqual({ symbols: ["7", "8", "9", "0", "1", "2", "3", "4", "5"], from: 8, to: 0 });
  });

  it("takes the shorter way round when it's told to", () => {
    expect(turnOf(still("n"), "e", "up", LETTERS, true)).toEqual({ symbols: [..."efghijklmn"], from: 9, to: 0 });
    expect(turnOf(still("y"), "b", "down", LETTERS, true)).toEqual({ symbols: ["y", "z", "a", "b"], from: 0, to: 3 });
  });

  it("stays put on what it shows", () => {
    expect(turnOf(still("4"), "4", "up", DIGITS, false)).toEqual({ symbols: ["4"], from: 0, to: 0 });
  });

  it("goes on from the middle of a turn, the way the number goes", () => {
    const turning = { symbols: ["7", "8", "9", "0"], at: 1.5 };
    expect(turnOf(turning, "3", "up", DIGITS, false)).toEqual({ symbols: ["8", "9", "0", "1", "2", "3"], from: 0.5, to: 5 });
    expect(turnOf(turning, "5", "down", DIGITS, false)).toEqual({ symbols: ["5", "6", "7", "8", "9"], from: 3.5, to: 0 });
  });

  it("goes straight back to a symbol it half shows", () => {
    expect(turnOf({ symbols: ["7", "8", "9", "0"], at: 1.5 }, "8", "up", DIGITS, false)).toEqual({ symbols: ["8", "9"], from: 0.5, to: 0 });
    expect(turnOf({ symbols: ["7", "8"], at: 0.2 }, "7", "up", DIGITS, false)).toEqual({ symbols: ["7", "8"], from: 0.2, to: 0 });
  });

  it("lays out no more than a lap, and lands on the symbol asked for", () => {
    for (let tenths = 0; tenths < 30; tenths++) {
      const strip = { symbols: ["4", "5", "6", "7"], at: tenths / 10 };
      for (const target of DIGITS) {
        for (const way of ["up", "down"] as const) {
          for (const shortest of [false, true]) {
            const turn = turnOf(strip, target, way, DIGITS, shortest);
            expect(turn.symbols.length).toBeLessThanOrEqual(DIGITS.length + 1);
            expect(turn.symbols[Math.round(turn.to)]).toBe(target);
            expect(Number.isInteger(turn.to)).toBe(true);
            // Where it starts shows what the strip showed.
            const shown = strip.symbols[Math.floor(strip.at + 1e-9)];
            expect(turn.symbols[Math.floor(turn.from + 1e-9)]).toBe(shown);
            expect(Math.abs(turn.to - turn.from)).toBeLessThanOrEqual(DIGITS.length);
          }
        }
      }
    }
  });
});

describe("turnOf, rolling over", () => {
  it("rolls what it shows out and the next in, from below going up", () => {
    expect(turnOf(still("a"), "b", "up", null, true)).toEqual({ symbols: ["a", "b"], from: 0, to: 1 });
    expect(turnOf(still("a"), "b", "down", null, true)).toEqual({ symbols: ["b", "a"], from: 1, to: 0 });
  });

  it("rolls over between symbols on no reel together", () => {
    expect(turnOf(still("a"), "7", "up", DIGITS, false)).toEqual({ symbols: ["a", "7"], from: 0, to: 1 });
  });

  it("comes in from nothing and goes to nothing", () => {
    expect(turnOf(still(BLANK), "5", "up", DIGITS, false)).toEqual({ symbols: [BLANK, "5"], from: 0, to: 1 });
    expect(turnOf(still("5"), BLANK, "up", DIGITS, false)).toEqual({ symbols: ["5", BLANK], from: 0, to: 1 });
    expect(turnOf(still("5"), BLANK, "down", DIGITS, false)).toEqual({ symbols: [BLANK, "5"], from: 1, to: 0 });
  });

  it("goes on through what's coming in when told to go somewhere new mid-way", () => {
    expect(turnOf({ symbols: ["a", "b"], at: 0.4 }, "c", "up", null, true)).toEqual({ symbols: ["a", "b", "c"], from: 0.4, to: 2 });
    expect(turnOf({ symbols: ["a", "b"], at: 0.4 }, "a", "up", null, true)).toEqual({ symbols: ["a", "b"], from: 0.4, to: 0 });
  });

  it("rolls over from a strip that isn't a stretch of the reel", () => {
    // Coming in from nothing, then asked for another digit: not along the reel, since half of it shows nothing.
    expect(turnOf({ symbols: [BLANK, "5"], at: 0.5 }, "6", "up", DIGITS, false)).toEqual({ symbols: [BLANK, "5", "6"], from: 0.5, to: 2 });
  });
});
