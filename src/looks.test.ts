import { describe, expect, it } from "vitest";

import { BLUR_TO, CUBE_ANGLE, cssOf, DIRECTIONS, type Direction, DRUM_ANGLE, EFFECTS, isDeep, LOOKS, MOTION_MOST, motionBlur, poseAt, poseOf, SCALE_TO } from "./looks.ts";

const STEP = 1.5;
const LINE = 1.2;
const VECTORS: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("poseOf", () => {
  it("rests where the text does, for every look, direction and effect", () => {
    for (const look of LOOKS) {
      for (const direction of DIRECTIONS) {
        const at = poseAt(poseOf(look, direction, STEP, LINE, EFFECTS), 0);
        for (const key of ["x", "y", "z", "ax", "ay", "az", "blur"] as const) close(at[key], 0);
        close(at.scale, 1);
        close(at.opacity, 1);
      }
    }
  });

  it("moves without a jump, however far it has gone", () => {
    for (const look of LOOKS) {
      for (const direction of DIRECTIONS) {
        const pose = poseOf(look, direction, STEP, LINE, EFFECTS);
        for (let p = -2; p < 2; p += 0.05) {
          const a = poseAt(pose, p);
          const b = poseAt(pose, p + 1e-6);
          for (const key of ["x", "y", "z", "scale", "blur", "opacity"] as const) expect(Math.abs(a[key] - b[key])).toBeLessThan(1e-4);
        }
      }
    }
  });

  it("slides a step along its direction", () => {
    for (const direction of DIRECTIONS) {
      const [dx, dy] = VECTORS[direction];
      const gone = poseAt(poseOf("slide", direction, STEP, LINE), 1);
      close(gone.x, dx * STEP);
      close(gone.y, dy * STEP);
      const next = poseAt(poseOf("slide", direction, STEP, LINE), -1);
      close(next.x, -dx * STEP);
      close(next.y, -dy * STEP);
    }
  });

  it("rolls a circle along its direction without slipping, clockwise going right", () => {
    const right = poseAt(poseOf("circle", "right", STEP, LINE), 1);
    close(right.x, STEP);
    close(right.az, (STEP / (LINE / 2)) * (180 / Math.PI));
    const left = poseAt(poseOf("circle", "left", STEP, LINE), 1);
    close(left.x, -STEP);
    expect(left.az).toBeLessThan(0);
  });

  it("tips a square over its corner, a quarter turn a step, lifting as it goes", () => {
    for (const direction of DIRECTIONS) {
      const [dx, dy] = VECTORS[direction];
      const pose = poseOf("square", direction, STEP, LINE);
      for (const steps of [1, 2, -1]) {
        const at = poseAt(pose, steps);
        close(at.x, steps * STEP * dx);
        close(at.y, steps * STEP * dy);
        close(Math.abs(at.az), 90 * Math.abs(steps));
      }
      // Halfway over, its centre stands on the corner: lifted off its floor by (√2 - 1) of half a side.
      const half = poseAt(pose, 0.5);
      close(Math.hypot(half.x - (STEP / 2) * dx, half.y - (STEP / 2) * dy), (STEP / 2) * (Math.SQRT2 - 1));
    }
    expect(poseAt(poseOf("square", "right", STEP, LINE), 0.5).y).toBeLessThan(0);
    expect(poseAt(poseOf("square", "right", STEP, LINE), 0.5).az).toBeGreaterThan(0);
    expect(poseAt(poseOf("square", "left", STEP, LINE), 0.5).az).toBeLessThan(0);
  });

  it("turns a drum and a cube about their axis, the far edge going away", () => {
    for (const [look, angle] of [
      ["drum", DRUM_ANGLE],
      ["cube", CUBE_ANGLE],
    ] as const) {
      const radius = STEP / 2 / Math.tan(((angle / 2) * Math.PI) / 180);
      for (const direction of DIRECTIONS) {
        const [dx, dy] = VECTORS[direction];
        const pose = poseOf(look, direction, STEP, LINE);
        // Faces a step apart where they meet: a step's chord.
        const one = poseAt(pose, 1);
        close(Math.hypot(one.x, one.y, one.z), 2 * radius * Math.sin(((angle / 2) * Math.PI) / 180));
        close(one.x * dx + one.y * dy, radius * Math.sin((angle * Math.PI) / 180));
        expect(one.z).toBeLessThan(0);
        const tilt = dx === 0 ? one.ax : one.ay;
        close(Math.abs(tilt), angle);
        expect(Math.sign(tilt)).toBe(direction === "up" || direction === "right" ? 1 : -1);
      }
    }
    // A cube's face is gone once it faces away; a drum's is shaded as it turns.
    close(poseAt(poseOf("cube", "up", STEP, LINE), 1).opacity, 0);
    close(poseAt(poseOf("cube", "up", STEP, LINE), 1.5).opacity, 0);
    close(poseAt(poseOf("drum", "up", STEP, LINE), 1).opacity, Math.cos((DRUM_ANGLE * Math.PI) / 180));
  });

  it("never shows a face a whole turn round, over the one facing you", () => {
    // A day turning through the alphabet passes 17 letters: on a cube, every fourth faced you again.
    for (let p = -26; p <= 26; p += 0.25) {
      const cube = poseAt(poseOf("cube", "up", STEP, LINE), p);
      if (Math.abs(p) >= 1) close(cube.opacity, 0);
      const drum = poseAt(poseOf("drum", "right", STEP, LINE), p);
      if (Math.abs(p * DRUM_ANGLE) >= 90) close(drum.opacity, 0);
    }
  });

  it("fades, scales and blurs as far as a symbol is gone, the same coming as going", () => {
    for (const look of LOOKS) {
      for (const p of [1, -1, 3]) {
        const at = poseAt(poseOf(look, "up", STEP, LINE, EFFECTS), p);
        close(at.opacity, 0);
        close(at.scale, SCALE_TO);
        close(at.blur, BLUR_TO);
      }
      const half = poseAt(poseOf(look, "up", STEP, LINE, ["scale", "blur"]), -0.5);
      close(half.scale, 1 - (1 - SCALE_TO) / 2);
      close(half.blur, BLUR_TO / 2);
    }
    // Never scaled to nothing: a symbol that comes out of nowhere reads as a glitch.
    expect(SCALE_TO).toBeGreaterThanOrEqual(0.5);
  });

  it("swaps in place, crossfading", () => {
    const pose = poseOf("swap", "left", STEP, LINE);
    for (const p of [-0.5, 0.5]) {
      const at = poseAt(pose, p);
      close(at.x, 0);
      close(at.y, 0);
      close(at.opacity, 0.5);
    }
    // Faded once, whatever else says fade.
    close(poseAt(poseOf("swap", "up", STEP, LINE, ["fade"]), 0.5).opacity, 0.5);
  });
});

describe("cssOf", () => {
  it("writes a flat transform for the flat looks, and depth only for the deep ones", () => {
    for (const look of LOOKS) {
      for (const direction of DIRECTIONS) {
        const css = cssOf(poseOf(look, direction, STEP, LINE));
        if (look === "swap") expect(css.opacity).toContain("var(--p)");
        else expect(css.transform).toContain("var(--p)");
        expect(css.transform).not.toMatch(/NaN|Infinity|undefined/);
        expect(/translate3d|rotateX|rotateY/.test(css.transform)).toBe(isDeep(look));
        expect(css.opacity !== null).toBe(isDeep(look) || look === "swap");
        expect(css.filter).toBeNull();
      }
    }
  });

  it("writes each kind of CSS function the browser works out", () => {
    expect(cssOf(poseOf("slide", "up", STEP, LINE)).transform).toBe("translate(0, calc(var(--p) * 1.5 * -1 * 1em))");
    expect(cssOf(poseOf("square", "right", STEP, LINE)).transform).toContain("round(down, var(--p), 1)");
    expect(cssOf(poseOf("drum", "up", STEP, LINE)).transform).toContain("sin(var(--p) * 30 * 1deg)");
    const effects = cssOf(poseOf("slide", "up", STEP, LINE, ["fade", "scale", "blur"]));
    expect(effects.transform).toContain("scale(calc(");
    expect(effects.filter).toBe("blur(calc(min(max(var(--p), var(--p) * -1), 1) * 0.08 * 1em))");
    expect(effects.opacity).toContain("min(max(var(--p), var(--p) * -1), 1)");
  });

  it("blurs by speed with motion, never past its most, on top of blur by distance", () => {
    const css = cssOf(poseOf("slide", "up", STEP, LINE, ["motion"]));
    expect(css.filter).toBe("blur(calc((min(var(--roll-s) * 0.004, 0.12)) * 1em))");
    expect(cssOf(poseOf("slide", "up", STEP, LINE, ["blur", "motion"])).filter).toContain("1) * 0.08 + min(var(--roll-s)");
    expect(motionBlur(0)).toBe(0);
    expect(motionBlur(-10)).toBeCloseTo(0.04, 9);
    expect(motionBlur(1000)).toBe(MOTION_MOST);
  });
});
