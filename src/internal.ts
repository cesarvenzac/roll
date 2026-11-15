/**
 * What only the site's explainers need: the pure parts, to draw a turn's strip or a spring's
 * curve beside the real thing. Not published.
 */

export { between, type Cell, cellsBetween, cellsOf, type Change, graphemesOf, wayOf } from "./cells.ts";
export { RATE, type Spring, springAt, springFrames } from "./spring.ts";
export { BLANK, type Strip, type Turn, turnOf } from "./turn.ts";
