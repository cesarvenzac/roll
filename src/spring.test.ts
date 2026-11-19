import { describe, expect, it } from "vitest";

import { pathAt, pushOf, RATE, springAt, springFrames } from "./spring.ts";

const SMOOTH = { duration: 0.6, bounce: 0 };
const BOUNCY = { duration: 0.6, bounce: 0.3 };

describe("springAt", () => {
  it("starts where it's told, at the speed it's told", () => {
    expect(springAt(SMOOTH, 3, 10, 5, 0)).toEqual({ value: 3, velocity: 5 });
  });

  it("gives its speed exactly", () => {
    for (const spring of [SMOOTH, BOUNCY]) {
      for (const t of [0.05, 0.2, 0.5]) {
        const h = 1e-6;
        const slope = (springAt(spring, 0, 1, 2, t + h).value - springAt(spring, 0, 1, 2, t - h).value) / (2 * h);
        expect(springAt(spring, 0, 1, 2, t).velocity).toBeCloseTo(slope, 4);
      }
    }
  });

  it("goes on unbroken when started again from where it is, as fast as it's going", () => {
    for (const spring of [SMOOTH, BOUNCY]) {
      const mid = springAt(spring, 0, 4, 0, 0.12);
      for (const t of [0.05, 0.3, 0.9]) {
        expect(springAt(spring, mid.value, 4, mid.velocity, t).value).toBeCloseTo(springAt(spring, 0, 4, 0, 0.12 + t).value, 9);
      }
    }
  });

  it("never goes past without a bounce, and does with one", () => {
    const past = (spring: typeof SMOOTH) => Math.max(...Array.from({ length: 120 }, (_, k) => springAt(spring, 0, 1, 0, k / RATE).value));
    expect(past(SMOOTH)).toBeLessThanOrEqual(1);
    expect(past(BOUNCY)).toBeGreaterThan(1.005);
  });
});

describe("pushOf", () => {
  it("makes a spring from still an ease-out: full speed at once, then slowing exactly exponentially", () => {
    const omega = (2 * Math.PI) / SMOOTH.duration;
    for (const t of [0, 0.05, 0.2, 0.5]) {
      expect(springAt(SMOOTH, 2, 10, pushOf(SMOOTH, 2, 10), t).value).toBeCloseTo(10 - 8 * Math.exp(-omega * t), 9);
    }
  });

  it("brings a turn sent back against its speed home as soon as a fresh one, near enough", () => {
    const fresh = springFrames(SMOOTH, 0, 1, pushOf(SMOOTH, 0, 1), 0.002).duration;
    const back = springFrames(SMOOTH, 0.6, 0, 4 + pushOf(SMOOTH, 0.6, 0), 0.002).duration;
    expect(back).toBeLessThan(fresh + 0.15);
  });
});

describe("springFrames", () => {
  it("plays from the start to exactly the end, at RATE a second", () => {
    const { values, duration } = springFrames(SMOOTH, 2, 9, 0, 0.002);
    expect(values[0]).toBe(2);
    expect(values.at(-1)).toBe(9);
    expect(duration).toBeCloseTo((values.length - 1) / RATE, 9);
    expect(duration).toBeGreaterThan(0.3);
    expect(duration).toBeLessThan(1.2);
  });

  it("moves a long turn as fast as a short one, near enough, then rests a moment later", () => {
    const nearly = (distance: number) => springFrames(SMOOTH, 0, distance, 0, 0.002).values.findIndex((value) => value >= 0.95 * distance);
    expect(nearly(9)).toBe(nearly(1));
    const short = springFrames(SMOOTH, 0, 1, 0, 0.002).duration;
    const long = springFrames(SMOOTH, 0, 9, 0, 0.002).duration;
    expect(long - short).toBeLessThan(0.3);
  });

  it("moves on at once from a standstill, and keeps moving when already on its way", () => {
    const fresh = springFrames(SMOOTH, 0, 1, 0, 0.002).values;
    expect(fresh[1]).toBeGreaterThan(0);
    // Sent back while going the other way: it carries on a little before it turns.
    const back = springFrames(SMOOTH, 0.5, 0, 4, 0.002).values;
    expect(back[1]).toBeGreaterThan(0.5);
    expect(back.at(-1)).toBe(0);
  });
});

describe("springFrames' landing", () => {
  // In pixels: a turn 144 px long that never lands slower than a pixel a frame.
  const LEAST = RATE;
  const turn = (spring = SMOOTH, from = 0, to = 144) => ({ spring, from, to, velocity: pushOf(spring, from, to) });

  it("is the spring, exactly, until it lands", () => {
    const { spring, from, to, velocity } = turn();
    const { values, landing } = springFrames(spring, from, to, velocity, 0.002, LEAST);
    expect(landing).not.toBeNull();
    for (let k = 0; k / RATE < landing!.at; k++) expect(values[k]).toBe(springAt(spring, from, to, velocity, k / RATE).value);
  });

  it("comes the rest of the way at a pixel a frame, exactly onto its end", () => {
    const { spring, from, to, velocity } = turn();
    const { values, landing } = springFrames(spring, from, to, velocity, 0.002, LEAST);
    const first = Math.round(landing!.at * RATE);
    expect(values[first]).toBe(landing!.value);
    for (let k = first + 1; k < values.length - 1; k++) expect(values[k] - values[k - 1]).toBeCloseTo(1, 9);
    expect(values.at(-1)! - values.at(-2)!).toBeGreaterThan(0);
    expect(values.at(-1)! - values.at(-2)!).toBeLessThanOrEqual(1 + 1e-9);
    expect(values.at(-1)).toBe(to);
  });

  it("takes over without a jolt: the spring was just slowing through a pixel a frame", () => {
    for (const [from, to] of [
      [0, 144],
      [144, 0],
      [0, 30],
    ]) {
      const { spring, velocity } = turn(SMOOTH, from, to);
      const { landing } = springFrames(spring, from, to, velocity, 0.002, LEAST);
      const speed = Math.abs(springAt(spring, from, to, velocity, landing!.at).velocity);
      expect(speed).toBeLessThanOrEqual(LEAST);
      expect(speed).toBeGreaterThan(LEAST * 0.8);
      expect(Math.sign(landing!.speed)).toBe(Math.sign(to - from));
    }
  });

  it("lands sooner than the spring's crawl would, and never slower than a pixel a frame", () => {
    const { spring, from, to, velocity } = turn();
    const crawl = springFrames(spring, from, to, velocity, 0.002);
    const landed = springFrames(spring, from, to, velocity, 0.002, LEAST);
    expect(crawl.landing).toBeNull();
    expect(landed.duration).toBeLessThan(crawl.duration - 0.1);
    // From its landing on, a pixel a frame; before it, the spring, faster.
    const first = Math.round(landed.landing!.at * RATE);
    const steps = landed.values.slice(1).map((value, k) => value - landed.values[k]);
    expect(Math.min(...steps.slice(first, -1))).toBeGreaterThan(1 - 1e-9);
    expect(Math.min(...steps.slice(0, first - 1))).toBeGreaterThan(1);
  });

  it("leaves a bounce its whole swing past the end before it lands", () => {
    const { spring, from, to, velocity } = turn({ duration: 0.6, bounce: 0.6 }, 0, 1000);
    const past = Math.max(...springFrames(spring, from, to, velocity, 0.002).values);
    const landed = springFrames(spring, from, to, velocity, 0.002, LEAST);
    expect(past - to).toBeGreaterThan(50);
    expect(Math.max(...landed.values)).toBe(past);
    expect(landed.values.at(-1)).toBe(to);
  });

  it("says where it is at any moment as its frames have it, and stops at its end", () => {
    const { spring, from, to, velocity } = turn();
    const { values, landing, duration } = springFrames(spring, from, to, velocity, 0.002, LEAST);
    for (let k = 0; k < values.length - 1; k++) expect(pathAt(spring, from, to, velocity, landing, k / RATE).value).toBeCloseTo(values[k], 9);
    expect(pathAt(spring, from, to, velocity, landing, landing!.at + 1e-3).velocity).toBe(landing!.speed);
    expect(pathAt(spring, from, to, velocity, landing, duration + 1)).toEqual({ value: to, velocity: 0 });
    // Without a landing, it's the spring.
    expect(pathAt(spring, from, to, velocity, null, 0.2)).toEqual(springAt(spring, from, to, velocity, 0.2));
  });
});
