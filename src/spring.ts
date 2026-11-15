/**
 * The spring everything moves on, so a turn told to go somewhere else mid-way goes on with the
 * speed it has rather than starting again from still. Set as Apple's are: `duration`, in seconds,
 * is how long it takes, near enough, and `bounce` how far it goes past and comes back (0, the
 * default, doesn't). Exact, on any clock: where it is and how fast it's going at any moment, and
 * the values to play it frame by frame. Pure: no DOM.
 */

export type Spring = {
  /** Seconds, near enough: its period, as SwiftUI's and Motion's springs say it. */
  duration: number;
  /** 0 to 1: how far past it goes and comes back. 0 stops dead on. */
  bounce: number;
};

/** Where a spring is (`value`) and how fast it's going (`velocity`, a second), `t` seconds after it left `from` at `velocity` for `to`. */
export function springAt({ duration, bounce }: Spring, from: number, to: number, velocity: number, t: number): { value: number; velocity: number } {
  if (t <= 0) return { value: from, velocity };
  const omega = (2 * Math.PI) / Math.max(duration, 0.01);
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.95);
  const d0 = from - to;
  if (zeta > 0.999) {
    // Critically damped.
    const e = Math.exp(-omega * t);
    const b = velocity + omega * d0;
    return { value: to + e * (d0 + b * t), velocity: e * (velocity - omega * t * b) };
  }
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * t);
  const b = (velocity + zeta * omega * d0) / damped;
  const cos = Math.cos(damped * t);
  const sin = Math.sin(damped * t);
  return {
    value: to + e * (d0 * cos + b * sin),
    velocity: e * (-zeta * omega * (d0 * cos + b * sin) + damped * (b * cos - d0 * sin)),
  };
}

/**
 * The push a turn leaves with: the speed that makes a spring from still an ease-out, leaving at
 * full speed and slowing into place (exactly exponentially, with no bounce), rather than creeping
 * off as a spring let go does. Added to the speed a turn already has when it's sent somewhere new,
 * so it goes on unbroken and still comes home as quickly.
 */
export function pushOf({ duration }: Spring, from: number, to: number) {
  return ((2 * Math.PI) / Math.max(duration, 0.01)) * (to - from);
}

/** Frames a second the values are sampled at: piecewise straight between them, a spring plays true. */
export const RATE = 60;

/**
 * The spring from `from` to `to` frame by frame, until it rests within `within` of `to` (and
 * slower than that a frame): the values, the last exactly `to`, and how long they take in seconds.
 */
export function springFrames(spring: Spring, from: number, to: number, velocity: number, within: number): { values: number[]; duration: number } {
  const values: number[] = [];
  const most = 10 * RATE;
  for (let frame = 0; frame < most; frame++) {
    const now = springAt(spring, from, to, velocity, frame / RATE);
    if (frame > 0 && Math.abs(now.value - to) < within && Math.abs(now.velocity) < within * RATE) break;
    values.push(now.value);
  }
  values.push(to);
  return { values, duration: (values.length - 1) / RATE };
}
