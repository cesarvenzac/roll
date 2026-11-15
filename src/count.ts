/**
 * Counting: a number going from one value to the next through every value between, on a spring,
 * each frame's number written as the last will be and rolled. The pure parts are tested; `Counter`
 * plays them on the page's frames.
 */

import { type Spring, springAt } from "./spring.ts";

/** How many decimals a number is written with, as JavaScript writes it: 6.67 has 2, 8 none. */
export function decimalsOf(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(Math.abs(value));
  const exponent = text.match(/e-(\d+)$/);
  if (exponent) return Math.min(20, Number(exponent[1]) + (text.split("e")[0].split(".")[1]?.length ?? 0));
  return text.split(".")[1]?.length ?? 0;
}

/** `value` rounded to `decimals` places, as a number: what a count hands a format. */
export const roundTo = (value: number, decimals: number) => Number(value.toFixed(decimals));

/** Writes the numbers a count passes through as its target is written: as many decimals, no more. */
export const plainFormat =
  (decimals: number) =>
  (value: number): string =>
    value.toFixed(decimals);

/** Where a count is `t` seconds in, and how fast it goes (units a second). */
export function countAt(spring: Spring, from: number, to: number, velocity: number, t: number) {
  if (from === to) return { value: to, velocity: 0, done: true };
  // The spring runs from 0 to 1; its speed is the count's, as a share of the way.
  const share = springAt(spring, 0, 1, velocity / (to - from), t);
  const done = t >= spring.duration * 2 && Math.abs(share.value - 1) < 1e-4 && Math.abs(share.velocity) < 1e-3;
  return { value: done ? to : from + (to - from) * share.value, velocity: share.velocity * (to - from), done };
}

/** How long counting takes, unless said: long enough to see the numbers pass, short enough to wait for. */
export const COUNT_SECONDS = 1;

/**
 * Counts on the page's frames: `to` sets where it goes, from wherever it is, at the speed it has;
 * each frame's number goes to `write` as text. Where there are no frames, or it shouldn't move, it
 * writes the target at once.
 */
export class Counter {
  private at: number;
  private speed = 0;
  private from = 0;
  private target: number;
  private started = 0;
  private frame = 0;
  private launch = 0;
  private waiting: (() => void)[] = [];

  constructor(
    value: number,
    private readonly write: (text: string) => void,
    private readonly done?: () => void,
  ) {
    this.at = this.target = value;
  }

  /** Whether it's counting now. */
  get counting() {
    return this.frame !== 0;
  }

  /** Resolves once it's not counting. */
  idle(): Promise<void> {
    return this.frame ? new Promise((resolve) => this.waiting.push(resolve)) : Promise.resolve();
  }

  /** Counts to `value` over `seconds`, written by `format`; at once if `still`. */
  to(value: number, seconds: number, format: (value: number) => string, still: boolean) {
    if (value === this.target && !this.frame) return this.write(format(value));
    this.target = value;
    if (still || typeof requestAnimationFrame !== "function" || !(seconds > 0)) {
      // Written before it says it's done, so whoever's told finds the new value there.
      const was = this.frame;
      if (was) cancelAnimationFrame(was);
      this.frame = 0;
      this.at = value;
      this.speed = 0;
      this.write(format(value));
      if (was) this.finish();
      return;
    }
    if (this.frame) cancelAnimationFrame(this.frame);
    this.from = this.at;
    this.launch = this.speed;
    this.started = performance.now();
    const spring: Spring = { duration: seconds, bounce: 0 };
    const tick = (now: number) => {
      const step = countAt(spring, this.from, this.target, this.launch, Math.max(0, now - this.started) / 1000);
      this.at = step.value;
      this.speed = step.velocity;
      this.write(format(step.done ? this.target : step.value));
      this.frame = step.done ? 0 : requestAnimationFrame(tick);
      if (step.done) {
        this.speed = 0;
        this.finish();
      }
    };
    this.frame = requestAnimationFrame(tick);
  }

  stop() {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.finish();
  }

  private finish() {
    const waiting = this.waiting;
    this.waiting = [];
    for (const resolve of waiting) resolve();
    this.done?.();
  }
}
