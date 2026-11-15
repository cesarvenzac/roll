import { describe, expect, it } from "vitest";

import { ranksOf, STAGGER_MOST, stepOf } from "./stagger.ts";

describe("ranksOf", () => {
  it("starts from the start, the end or the centre", () => {
    expect(ranksOf(5, "start")).toEqual([0, 1, 2, 3, 4]);
    expect(ranksOf(5, "end")).toEqual([4, 3, 2, 1, 0]);
    expect(ranksOf(5, "center")).toEqual([2, 1, 0, 1, 2]);
  });

  it("starts an even count's two middle characters together", () => {
    expect(ranksOf(4, "center")).toEqual([1, 0, 0, 1]);
    expect(ranksOf(1, "center")).toEqual([0]);
    expect(ranksOf(0, "start")).toEqual([]);
  });
});

describe("stepOf", () => {
  it("keeps the stagger asked for while the last starts in time", () => {
    expect(stepOf(0.03, ranksOf(4, "start"))).toBe(0.03);
  });

  it("tightens it so the last never starts later than STAGGER_MOST", () => {
    const ranks = ranksOf(41, "start");
    expect(stepOf(0.03, ranks) * 40).toBeCloseTo(STAGGER_MOST, 9);
    // From the centre the last is half as far: room for twice the step.
    expect(stepOf(0.03, ranksOf(41, "center")) * 20).toBeCloseTo(STAGGER_MOST, 9);
  });

  it("needs no step for one character, and never a negative one", () => {
    expect(stepOf(0.03, [0])).toBe(0);
    expect(stepOf(-1, ranksOf(3, "start"))).toBe(0);
  });
});
