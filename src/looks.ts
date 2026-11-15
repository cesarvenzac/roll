/**
 * How a symbol turns: its looks, the directions they go and the effects laid over them, as geometry
 * written once. Each pose is a handful of expressions in `p`, how many steps a symbol is past where
 * it rests (0 at rest, 1 once it has gone, -1 while the next waits), which print themselves as CSS
 * for the browser to work out every frame from one sprung value, and evaluate themselves in
 * JavaScript for the tests: what's tested is what's drawn.
 */

/** How a symbol turns. */
export type Look = "slide" | "drum" | "cube" | "circle" | "square" | "swap";
/** Where a symbol goes as its value turns forward: `up` (the default) leaves upward, the next coming up from below. */
export type Direction = "up" | "down" | "left" | "right";
/**
 * What's laid over a look as a symbol leaves and comes: faded, scaled down or blurred as far as it's
 * gone, or blurred as fast as it goes (`motion`: a long spin smears, then lands sharp).
 */
export type Effect = "fade" | "scale" | "blur" | "motion";

export const LOOKS: readonly Look[] = ["slide", "drum", "cube", "circle", "square", "swap"];
export const DIRECTIONS: readonly Direction[] = ["up", "down", "left", "right"];
export const EFFECTS: readonly Effect[] = ["fade", "scale", "blur", "motion"];

/** An expression in `p`: its CSS, a number, and its value at a `p`. */
export type Expr = { css: string; at: (p: number) => number; zero?: boolean; one?: boolean };

const RAD = Math.PI / 180;
const text = (n: number) => String(+n.toFixed(4));
const num = (n: number): Expr => ({ css: text(n), at: () => n, zero: n === 0, one: n === 1 });
/** `p` itself: an item's own, set on it as `--p`. */
export const P: Expr = { css: "var(--p)", at: (p) => p };

const add = (...terms: Expr[]): Expr => {
  const kept = terms.filter((term) => !term.zero);
  if (!kept.length) return num(0);
  if (kept.length === 1) return kept[0];
  return { css: `(${kept.map((term) => term.css).join(" + ")})`, at: (p) => kept.reduce((sum, term) => sum + term.at(p), 0) };
};
const times = (a: Expr, n: number): Expr => {
  if (a.zero || n === 0) return num(0);
  if (n === 1) return a;
  return { css: `${a.css} * ${text(n)}`, at: (p) => a.at(p) * n };
};
const product = (a: Expr, b: Expr): Expr => {
  if (a.zero || b.zero) return num(0);
  if (a.one) return b;
  if (b.one) return a;
  return { css: `(${a.css}) * (${b.css})`, at: (p) => a.at(p) * b.at(p) };
};
/** Of an angle in degrees. */
const sin = (degrees: Expr): Expr => (degrees.zero ? num(0) : { css: `sin(${degrees.css} * 1deg)`, at: (p) => Math.sin(degrees.at(p) * RAD) });
const cos = (degrees: Expr): Expr => (degrees.zero ? num(1) : { css: `cos(${degrees.css} * 1deg)`, at: (p) => Math.cos(degrees.at(p) * RAD) });
const floor = (a: Expr): Expr => ({ css: `round(down, ${a.css}, 1)`, at: (p) => Math.floor(a.at(p)) });
const minus = (a: Expr, b: Expr): Expr => add(a, times(b, -1));
/** |a|, as `max()` writes it: CSS's own `abs()` came to Chrome only in 2025. */
const abs = (a: Expr): Expr => ({ css: `max(${a.css}, ${a.css} * -1)`, at: (p) => Math.abs(a.at(p)) });
const clamp01 = (a: Expr): Expr => ({ css: `clamp(0, ${a.css}, 1)`, at: (p) => Math.min(1, Math.max(0, a.at(p))) });
/** How far a symbol is from rest, as far as it shows: 0 at rest, 1 once gone, and no further. */
const away = (): Expr => ({ css: `min(${abs(P).css}, 1)`, at: (p) => Math.min(Math.abs(p), 1) });

/**
 * Where a symbol is and how it's turned, `p` steps past rest: moved by x, y and z (em, z toward the
 * viewer), turned about x, y and z (degrees, clockwise on screen about z), scaled, blurred (em), and
 * how clearly it shows.
 */
export type Pose = { x: Expr; y: Expr; z: Expr; ax: Expr; ay: Expr; az: Expr; scale: Expr; blur: Expr; opacity: Expr; motion: boolean };

/** Each direction as a unit vector on screen (y down). */
const VECTORS: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
/**
 * Which way a circle or a square turns, clockwise on screen being 1: rolling right turns
 * clockwise, rolling left the other way; up and down as if along a wall on the right.
 */
const SPIN: Record<Direction, 1 | -1> = { up: 1, right: 1, down: -1, left: -1 };
/** The side a square tips over: the floor below it going sideways, the wall on its right going up or down. */
const FLOOR: Record<Direction, [number, number]> = { up: [1, 0], down: [1, 0], left: [0, 1], right: [0, 1] };
/** The angle between a drum's symbols, and a cube's (degrees). */
export const DRUM_ANGLE = 30;
export const CUBE_ANGLE = 90;
/**
 * How small `scale` makes a symbol once it's gone: never to nothing, which reads as a symbol
 * coming out of nowhere, and small enough to read as depth beside the others.
 */
export const SCALE_TO = 0.6;
/** How blurred `blur` makes a symbol once it's gone (em): enough to blend it into the next, and cheap. */
export const BLUR_TO = 0.08;
/** The turn's speed, sprung beside its value: steps a second, read by `motion`. */
export const SPEED = "--roll-s";
/** How much `motion` blurs a symbol a step a second (em), and the most it ever does. */
export const MOTION_PER_STEP = 0.004;
export const MOTION_MOST = 0.12;
/** How blurred a symbol turning `speed` steps a second is (em), as `motion` blurs it. */
export const motionBlur = (speed: number) => Math.min(Math.abs(speed) * MOTION_PER_STEP, MOTION_MOST);

/**
 * A symbol's pose `p` steps past rest. `step` is how far apart symbols are along the direction
 * (em), `line` the text's line (em): a circle rolls on a wheel half a line across.
 */
export function poseOf(look: Look, direction: Direction, step: number, line: number, effects: readonly Effect[] = []): Pose {
  const [dx, dy] = VECTORS[direction];
  const spin = SPIN[direction];
  const zero = num(0);
  const still: Pose = { x: zero, y: zero, z: zero, ax: zero, ay: zero, az: zero, scale: num(1), blur: zero, opacity: num(1), motion: false };
  let pose: Pose;
  switch (look) {
    case "slide": {
      const along = times(P, step);
      pose = { ...still, x: times(along, dx), y: times(along, dy) };
      break;
    }
    case "drum":
    case "cube": {
      // Symbols on a turning drum, `angle` apart: one a face of a cube at 90°, its faces meeting.
      const angle = look === "drum" ? DRUM_ANGLE : CUBE_ANGLE;
      const radius = step / 2 / Math.tan((angle / 2) * RAD);
      const turned = times(P, angle);
      const along = times(sin(turned), radius);
      // Leaving, its far edge goes away: the top going up, the right going right.
      const tilt = times(turned, direction === "up" || direction === "right" ? 1 : -1);
      const vertical = dx === 0;
      // Within a quarter turn of facing you, shaded as it turns away; past it, gone, however far
      // round: a whole turn on, a face would face you again over the one that's there.
      const facing = clamp01(times(minus(num(90), abs(turned)), 1000));
      pose = {
        ...still,
        x: times(along, dx),
        y: times(along, dy),
        z: times(minus(cos(turned), num(1)), radius),
        ax: vertical ? tilt : zero,
        ay: vertical ? zero : tilt,
        opacity: product(cos(turned), facing),
      };
      break;
    }
    case "circle": {
      // Rolling along its direction without slipping, on a wheel half a line across.
      const along = times(P, step);
      pose = { ...still, x: times(along, dx), y: times(along, dy), az: times(P, (spin * step) / (line / 2) / RAD) };
      break;
    }
    case "square": {
      // Tipping over its leading corner a quarter turn a step, a square `step` across.
      const [nx, ny] = FLOOR[direction];
      const half = step / 2;
      const whole = floor(P);
      const quarter = times(minus(P, whole), spin * 90);
      // From the corner it tips over to its centre, turned by how far it has tipped.
      const fromX = -half * (dx + nx);
      const fromY = -half * (dy + ny);
      pose = {
        ...still,
        x: add(times(whole, step * dx), num(half * (dx + nx)), times(cos(quarter), fromX), times(sin(quarter), -fromY)),
        y: add(times(whole, step * dy), num(half * (dy + ny)), times(sin(quarter), fromX), times(cos(quarter), fromY)),
        az: times(P, spin * 90),
      };
      break;
    }
    case "swap":
      // Where it stands, the old one giving way to the next: a crossfade, unless effects say more.
      pose = { ...still, opacity: minus(num(1), away()) };
      break;
  }
  // Effects, over any look: each as far along as the symbol is gone.
  if (effects.includes("fade") && look !== "swap") pose.opacity = product(pose.opacity, minus(num(1), away()));
  if (effects.includes("scale")) pose.scale = minus(num(1), times(away(), 1 - SCALE_TO));
  if (effects.includes("blur")) pose.blur = times(away(), BLUR_TO);
  pose.motion = effects.includes("motion");
  return pose;
}

/** Whether a look moves in depth, seen in perspective. */
export const isDeep = (look: Look) => look === "drum" || look === "cube";

/** A pose as CSS: a transform, and an opacity and a filter where they change. */
export function cssOf(pose: Pose): { transform: string; opacity: string | null; filter: string | null } {
  const length = (e: Expr) => (e.zero ? "0" : `calc(${e.css} * 1em)`);
  const angle = (e: Expr) => `calc(${e.css} * 1deg)`;
  const parts = [pose.z.zero ? `translate(${length(pose.x)}, ${length(pose.y)})` : `translate3d(${length(pose.x)}, ${length(pose.y)}, ${length(pose.z)})`];
  if (!pose.ax.zero) parts.push(`rotateX(${angle(pose.ax)})`);
  if (!pose.ay.zero) parts.push(`rotateY(${angle(pose.ay)})`);
  if (!pose.az.zero) parts.push(`rotate(${angle(pose.az)})`);
  if (!pose.scale.one) parts.push(`scale(calc(${pose.scale.css}))`);
  return {
    transform: parts.join(" "),
    opacity: pose.opacity.one ? null : `calc(${pose.opacity.css})`,
    filter: pose.motion
      ? `blur(calc((${pose.blur.zero ? "" : `${pose.blur.css} + `}min(var(${SPEED}) * ${MOTION_PER_STEP}, ${MOTION_MOST})) * 1em))`
      : pose.blur.zero
        ? null
        : `blur(${length(pose.blur)})`,
  };
}

/** A pose's values at `p`. */
export function poseAt(pose: Pose, p: number) {
  return {
    x: pose.x.at(p),
    y: pose.y.at(p),
    z: pose.z.at(p),
    ax: pose.ax.at(p),
    ay: pose.ay.at(p),
    az: pose.az.at(p),
    scale: pose.scale.at(p),
    blur: pose.blur.at(p),
    opacity: pose.opacity.at(p),
  };
}
