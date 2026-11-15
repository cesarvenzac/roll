"use client";

/**
 * Rolling text in React. `Roll` shows `value` and rolls to the next whenever it changes:
 *
 *   import { Roll } from "@cesarvenzac/roll/react";
 *
 *   <Roll value={price} />
 *   <Roll value={done ? <Check /> : <Copy />} label={done ? "Copied" : "Copy"} />
 *
 * A server draws the value as plain text, which the browser takes up as it is: nothing moves as
 * the page hydrates. An element (an icon, say) rolls over as one, drawn as it renders; it should
 * be still, since what rolls is a copy.
 */

import { type CSSProperties, type HTMLAttributes, type ReactElement, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Engine, type Options, SPOKEN, type Value, VISUAL } from "./engine.ts";

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

export type RollProps = Options &
  Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
    /** Text or a number, formatted as it's to be read, or an element that rolls over as one. */
    value: string | number | ReactElement;
    /** What assistive tech reads: the text unless said. An element says nothing unless it's given one. */
    label?: string;
  };

/** A `<span>` showing `value`, rolling to each new one. */
export function Roll({ value, label, duration, bounce, stagger, reels, way, reducedMotion, style, ...props }: RollProps) {
  const visual = useRef<HTMLSpanElement>(null);
  const source = useRef<HTMLSpanElement>(null);
  const engine = useRef<Engine | null>(null);
  const options = useRef<Options>({});
  const text = typeof value === "string" || typeof value === "number" ? String(value) : null;
  // What the server drew stays the visual's: React never writes into it again, the engine does.
  const [drawn] = useState(() => ({ __html: text === null ? "" : escape(text) }));
  const [mounted, setMounted] = useState(false);

  useIsomorphicLayoutEffect(() => {
    options.current = { duration, bounce, stagger, reels, way, reducedMotion };
    const next: Value | null = text ?? source.current?.firstElementChild ?? source.current?.firstChild ?? null;
    if (!engine.current) {
      engine.current = new Engine(visual.current!, next ?? "", () => options.current);
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
        <span ref={source} aria-hidden="true" style={mounted ? HIDDEN : undefined}>
          {value}
        </span>
      )}
      <span style={SPOKEN_STYLE}>{label ?? text}</span>
    </span>
  );
}
