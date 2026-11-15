"use client";

/**
 * Rolling text in React. `Roll` shows `value` and rolls to the next whenever it changes:
 *
 *   import { Roll } from "@cesarvenzac/roll/react";
 *
 *   <Roll value={price} />
 *   <Roll value={done ? <Check /> : <Copy />} label={done ? "Copied" : "Copy"} />
 *   <RollGroup><Roll value={a} /> <Roll value={b} /></RollGroup>
 *
 * A server draws the value as plain text, which the browser takes up as it is: nothing moves as
 * the page hydrates. An element (an icon, say) rolls over as one, drawn as it renders; it should
 * be still, since what rolls is a copy.
 */

import { createContext, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Driver, type DriverOptions, shownOf } from "./driver.ts";
import { Group, SPOKEN, type Value, VISUAL } from "./engine.ts";

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const styleOf = (css: string): CSSProperties =>
  Object.fromEntries(
    css.split(";").map((rule) => {
      const [name, value] = rule.split(":");
      return [name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()), value];
    }),
  );
const VISUAL_STYLE = styleOf(VISUAL);
const SPOKEN_STYLE = styleOf(SPOKEN);
/** Set as the visual is, so what a server drew doesn't move as it's taken up. */
const ROOT_STYLE: CSSProperties = { position: "relative", whiteSpace: "nowrap", fontKerning: "none", fontVariantLigatures: "none" };
const HIDDEN: CSSProperties = { display: "none" };

const escape = (text: string) => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

/** The group the rollers inside a `RollGroup` join. */
const GroupContext = createContext<Group | null>(null);

/**
 * Rollers that move as one: every `Roll` inside joins it. A change to several of them in the same
 * moment staggers across them all in the page's order; `onSettle` is called each time they've all
 * come to rest.
 */
export function RollGroup({ children, onSettle }: { children: ReactNode; onSettle?: () => void }) {
  const [group] = useState(() => new Group());
  useIsomorphicLayoutEffect(() => {
    group.listen(onSettle);
  });
  return <GroupContext.Provider value={group}>{children}</GroupContext.Provider>;
}

export type RollProps = Omit<DriverOptions, "group"> &
  Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
    /** Text or a number, formatted as it's to be read, or an element that rolls over as one. */
    value: string | number | ReactElement;
    /** What assistive tech reads: the text unless said. An element says nothing unless it's given one. */
    label?: string;
  };

/** A `<span>` showing `value`, rolling to each new one. */
export function Roll({
  value,
  label,
  duration,
  bounce,
  stagger,
  staggerFrom,
  reels,
  way,
  reducedMotion,
  look,
  direction,
  effects,
  trend,
  count,
  format,
  onSettle,
  style,
  ...props
}: RollProps) {
  const visual = useRef<HTMLSpanElement>(null);
  const source = useRef<HTMLSpanElement>(null);
  const engine = useRef<Driver | null>(null);
  const group = useContext(GroupContext);
  const options = useRef<DriverOptions>({});
  const text = typeof value === "string" || typeof value === "number" ? (shownOf(value, format) as string) : null;
  // What the server drew stays the visual's: React never writes into it again, the engine does.
  const [drawn] = useState(() => ({ __html: text === null ? "" : escape(text) }));
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    options.current = { duration, bounce, stagger, staggerFrom, reels, way, reducedMotion, look, direction, effects, trend, count, format, onSettle, group: group ?? undefined };
    const next: Value | null = typeof value === "number" ? value : (text ?? source.current?.firstElementChild ?? source.current?.firstChild ?? null);
    if (!engine.current) {
      engine.current = new Driver(visual.current!, next ?? "", () => options.current);
      setMounted(true);
    } else if (next !== null) engine.current.set(next);
  });
  useEffect(
    () => () => {
      engine.current?.destroy();
      engine.current = null;
    },
    [],
  );

  return (
    <span {...props} style={{ ...ROOT_STYLE, ...style }}>
      <span ref={visual} aria-hidden="true" style={VISUAL_STYLE} dangerouslySetInnerHTML={drawn} />
      {text === null && (
        // The element as React renders it: shown until the engine draws its copy, then its source.
        // Set as the visual is, so it lays out as the copy will: in a plain span, an icon the page
        // makes a block (Tailwind's SVGs) broke out of its line and stood taller until hydration.
        <span ref={source} aria-hidden="true" style={mounted ? HIDDEN : VISUAL_STYLE}>
          {value}
        </span>
      )}
      <span style={SPOKEN_STYLE}>{label ?? text}</span>
    </span>
  );
}
