import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Roll } from "./react.tsx";

const render = (props: Parameters<typeof Roll>[0]) => renderToStaticMarkup(createElement(Roll, props));

describe("Roll on a server", () => {
  it("draws the value as plain text, set as it rolls, and says it once to assistive tech", () => {
    const markup = render({ value: "€12.50" });
    expect(markup).toContain(`<span aria-hidden="true" style="display:inline-block;white-space:nowrap;font-kerning:none;font-variant-ligatures:none">€12.50</span>`);
    expect(markup.match(/€12\.50/g)).toHaveLength(2);
    expect(markup).toMatch(/<span style="position:absolute;[^"]*">€12\.50<\/span><\/span>$/);
  });

  it("writes a number as it is, and text safely", () => {
    expect(render({ value: 1234 })).toContain(">1234</span>");
    const markup = render({ value: `<b>"1" & 2</b>` });
    expect(markup).not.toContain("<b>");
    expect(markup).toContain("&#60;b&#62;&#34;1&#34; &#38; 2&#60;/b&#62;");
  });

  it("draws tabular figures while it counts, as the browser will, unless told otherwise", () => {
    const tabular = `font-variant-ligatures:none;font-variant-numeric:tabular-nums">1,284</span>`;
    const format = (n: number) => n.toLocaleString("en");
    expect(render({ value: 1284, count: true, format })).toContain(tabular);
    expect(render({ value: 1284, tabular: true, format })).toContain(tabular);
    expect(render({ value: 1284, count: true, tabular: false, format })).not.toContain("tabular-nums");
    expect(render({ value: 1284, format })).not.toContain("tabular-nums");
  });

  it("keeps its own props, and the style given over its own", () => {
    const markup = render({ value: "3", className: "price", id: "p", style: { color: "red" } });
    expect(markup).toMatch(/^<span class="price" id="p" style="position:relative;white-space:nowrap;font-kerning:none;font-variant-ligatures:none;color:red">/);
  });

  it("draws an element as React renders it, named by its label", () => {
    const icon = createElement("svg", { viewBox: "0 0 24 24", width: 16, height: 16 }, createElement("path", { d: "M20 6 9 17l-5-5" }));
    const markup = render({ value: icon, label: "Copied" });
    // Set as the visual is, so it lays out as the engine's copy will once the page is taken up.
    expect(markup).toContain(`<span aria-hidden="true" style="display:inline-block;white-space:nowrap;font-kerning:none;font-variant-ligatures:none"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 6 9 17l-5-5"></path></svg></span>`);
    expect(markup).toMatch(/>Copied<\/span><\/span>$/);
  });
});
