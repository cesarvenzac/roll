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
 * Where a turn stops following its spring and comes the rest of the way in a straight line: from
 * `at` seconds on, from `value`, at `speed` a second (signed), until it's home.
 */
export type Landing = { at: number; value: number; speed: number };

/**
 * The spring from `from` to `to` frame by frame, until it rests within `within` of `to` (and
 * slower than that a frame): the values, the last exactly `to`, and how long they take in seconds.
 *
 * With `least` (a second), it never crawls in slower than that: once it's heading home slower than
 * `least`, and would get there no sooner on its own, it comes the rest of the way at `least`
 * (`landing`). Text moved by less than a pixel a frame moves in whole pixels, so a spring's long
 * tail, a pixel and a wait and a pixel and a longer wait, read as a stutter as it landed; at a
 * pixel a frame it lands as evenly as it moved. Before its landing it's the spring, exactly.
 */
export function springFrames(spring: Spring, from: number, to: number, velocity: number, within: number, least = 0): { values: number[]; duration: number; landing: Landing | null } {
  const values: number[] = [];
  const most = 10 * RATE;
  for (let frame = 0; frame < most; frame++) {
    const t = frame / RATE;
    const now = springAt(spring, from, to, velocity, t);
    if (frame > 0 && Math.abs(now.value - to) < within && Math.abs(now.velocity) < within * RATE) break;
    if (frame > 0 && least > 0 && landsNow(spring, from, to, velocity, t, now, least)) {
      const landing: Landing = { at: t, value: now.value, speed: Math.sign(to - now.value) * least };
      const step = landing.speed / RATE;
      // A pixel a frame, the last step what's left, a pixel at most.
      for (let value = now.value; (to - value) * step > 0; value += step) values.push(value);
      values.push(to);
      return { values, duration: (values.length - 1) / RATE, landing };
    }
    values.push(now.value);
  }
  values.push(to);
  return { values, duration: (values.length - 1) / RATE, landing: null };
}

/**
 * Whether a spring `t` seconds in (`now`) should come the rest of the way at `least`: heading home
 * (or still), slower than `least`, and getting there at `least` no later than it would come within
 * a frame's worth of `least` of it on its own. Turning back from a long way past, it's still a while
 * from home and speeds up again: that's left to the spring.
 */
function landsNow(spring: Spring, from: number, to: number, velocity: number, t: number, now: { value: number; velocity: number }, least: number) {
  const left = to - now.value;
  if (now.velocity * left < 0 || Math.abs(now.velocity) > least) return false;
  const near = least / RATE;
  for (let frame = 1; frame <= 10 * RATE; frame++) {
    if (Math.abs(springAt(spring, from, to, velocity, t + frame / RATE).value - to) < near) return Math.abs(left) / least <= frame / RATE;
  }
  return true;
}

/** Where a turn is `t` seconds in, and how fast it's going: on its spring, then from its landing straight home. */
export function pathAt(spring: Spring, from: number, to: number, velocity: number, landing: Landing | null, t: number): { value: number; velocity: number } {
  if (!landing || t < landing.at) return springAt(spring, from, to, velocity, t);
  const value = landing.value + landing.speed * (t - landing.at);
  if ((to - value) * landing.speed <= 0) return { value: to, velocity: 0 };
  return { value, velocity: landing.speed };
}
