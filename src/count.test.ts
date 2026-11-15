import { describe, expect, it } from "vitest";

import { countAt, decimalsOf, plainFormat, roundTo } from "./count.ts";

const SPRING = { duration: 1, bounce: 0 };

describe("decimalsOf", () => {
  it("reads as many decimals as the number is written with", () => {
    expect(decimalsOf(8)).toBe(0);
    expect(decimalsOf(6.67)).toBe(2);
    expect(decimalsOf(-0.5)).toBe(1);
    expect(decimalsOf(1e-7)).toBe(7);
    expect(decimalsOf(Number.NaN)).toBe(0);
  });
});

describe("roundTo", () => {
  it("hands a format whole numbers for a count of whole numbers", () => {
    expect(roundTo(1039.233, 0)).toBe(1039);
    expect(roundTo(6.6749, 2)).toBe(6.67);
    expect(roundTo(1039.233, 0).toLocaleString("en")).toBe("1,039");
  });
});

describe("plainFormat", () => {
  it("writes every number on the way as the target is written", () => {
    expect(plainFormat(2)(3.14159)).toBe("3.14");
    expect(plainFormat(0)(1283.6)).toBe("1284");
  });
});

describe("countAt", () => {
  it("starts where it was and lands exactly on the target", () => {
    expect(countAt(SPRING, 0, 1284, 0, 0).value).toBe(0);
    const end = countAt(SPRING, 0, 1284, 0, 5);
    expect(end.value).toBe(1284);
    expect(end.done).toBe(true);
  });

  it("passes every value between on the way, one way only", () => {
    let last = -Infinity;
    for (let t = 0; t <= 2; t += 1 / 60) {
      const { value } = countAt(SPRING, 0, 1284, 0, t);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
    expect(countAt(SPRING, 0, 1284, 0, 0.3).value).toBeGreaterThan(300);
  });

  it("counts down as well as up, and goes on at the speed it had", () => {
    expect(countAt(SPRING, 100, 0, 0, 0.5).value).toBeLessThan(100);
    // Sent somewhere new mid-count, it keeps going at the speed it had: no stall.
    const mid = countAt(SPRING, 0, 1000, 0, 0.2);
    const next = countAt(SPRING, mid.value, 2000, mid.velocity, 0);
    expect(next.value).toBeCloseTo(mid.value, 9);
    expect(next.velocity).toBeCloseTo(mid.velocity, 6);
  });

  it("has nothing to do when it's there", () => {
    expect(countAt(SPRING, 5, 5, 0, 0)).toEqual({ value: 5, velocity: 0, done: true });
  });
});
