# @cesarvenzac/roll

Text that rolls as it changes. Digits turn as an odometer's do and keep their places; letters,
signs and icons roll over; everything moves on a spring that carries on when it's interrupted.
Give it the value as you'd write it, formatted however you like, and it works out the rest.

[![A price, a count, a clock, a word, an icon and a day, each rolling to its next value: €8 to €6.67, 999 to 1,000, 9:59 to 10:00, Saving to Saved, a copy icon to a tick, Wed to Thu](https://cesarvenzac.com/media/37d79baf-d757-4816-9f5a-5dea265877c9.webp)](https://cesarvenzac.com/roll)

The docs, with live examples, are at [cesarvenzac.com/roll](https://cesarvenzac.com/roll).

```sh
npm install @cesarvenzac/roll
```

## Use

```ts
import { roll } from "@cesarvenzac/roll";

const price = roll(document.querySelector(".price")!, "€8");
price.set("€6.67");
```

In React:

```tsx
import { Roll } from "@cesarvenzac/roll/react";

<Roll value={price} />
<Roll value={copied ? <Check /> : <Copy />} label={copied ? "Copied" : "Copy"} />
```

A value is text, a number or a node. Format numbers as they're to be read (`toLocaleString`,
`Intl.NumberFormat`, a clock), first or through `format`: Roll reads what you wrote, in any
language.

Anywhere else:

```ts
import "@cesarvenzac/roll/element"; // <roll-text value="€8" look="drum" trend></roll-text>
import { roll } from "@cesarvenzac/roll/svelte"; // <span use:roll={{ value: price }}></span>
import { vRoll } from "@cesarvenzac/roll/vue"; // <span v-roll="price"></span>
```

None of them needs anything else installed: the element is a plain custom element, the Svelte one
an action and the Vue one a directive.

## What rolls, and how

- **A number's digits keep their places.** The units stay the units: 9 becoming 10 turns the 9 to
  0 while a 1 rolls in on its left, 9:59 becoming 10:00 keeps its colon where it is, and 1,234
  becoming 999 lets the 1 and its comma roll away from where they stand. A fraction is read from
  its mark, so €8 becoming €6.67 turns the 8 back to a 6 and rolls .67 in after it. Thousands are
  told from decimals ("12,345", "1.234.567", "1 234,5"), and each number in a value keeps its own
  places ("3/12", "1:05:30").
- **Each digit turns the way the number went**: forward as it counts up (7, 8, 9, 0), back as it
  counts down, never the long way round. The way is read from the numbers themselves, fractions
  and signs included: €8 to €6.40 is down, −3° to −5° is down, 9:59 to 10:00 is up.
- **Anything else rolls over.** A sign, a letter, a word's letters in their places, as a
  split-flap board's: the old one out, the new one in, from below going up. With `reels`, letters
  turn through the alphabet instead, all of them forward as a split-flap board's flaps do, never
  some one way and some the other: `reels: [DIGITS, LOWERCASE]`.
- **Icons roll too.** Give it a node, an SVG say, and it rolls over as one; in React, any element.
- **Interrupted, it goes on.** Every turn is a spring. Sent somewhere else mid-way, a digit carries
  on from where it is at the speed it has, then comes home as quickly as a fresh turn would. A
  number counting fast never stutters or restarts.
- **Widths ease.** Characters keep the width the font gives them (no tabular figures needed), and
  a column eases to the next character's width as it turns: what follows the number moves with it.

## Looks

A symbol slides on a flat strip unless you say otherwise. `look` changes how it turns, and
`direction` where it goes as the value turns forward:

```tsx
<Roll value={price} look="drum" />                    // a slot machine's drum
<Roll value={price} look="cube" direction="right" />  // the faces of a turning box
<Roll value={time} look="circle" direction="right" /> // rolling like a wheel, clockwise
<Roll value={time} look="circle" direction="left" />  // the other way round
<Roll value={icon} look="square" direction="right" /> // tipping over its edge
<Roll value={label} look="swap" effects={["scale", "blur"]} /> // in place
```

- `slide`: a flat strip, symbols a line apart. The default.
- `drum`: symbols round a drum, 30° apart, seen in perspective and shaded as they turn away.
- `cube`: each symbol a face of a box, a quarter turn a step.
- `circle`: each symbol rolls along without slipping, on a wheel half a line across.
- `square`: each symbol tips over its leading corner, a quarter turn a step.
- `swap`: in place, the old symbol giving way to the next: a crossfade, unless effects say more.

`effects` lay `fade`, `scale` and `blur` over any look, as far as a symbol has gone: it fades
out as it leaves and in as it comes, shrinks to 60% and grows back (never from nothing, which
reads as a glitch), blurs to 0.08em and sharpens. `motion` blurs it by how fast it goes instead:
a long spin smears and lands sharp. They mix: `look="swap" effects={["scale", "blur"]}` scales one
symbol out as the next scales in, and `effects={["motion"]}` with `count` reads as a real
odometer's blur.

Directions are `up` (the default: what leaves goes up, the next comes up from below), `down`,
`left` and `right`. Counting down runs a turn the other way. Going across, what leaves stays inside
its own cell, never over its neighbours. A look is geometry the browser works out every frame
from one sprung value (CSS's `sin()`, `cos()` and `round()`), so it's as smooth as the spring.

## Counting, trends and knowing when it's done

```tsx
<Roll value={visitors} count format={(n) => n.toLocaleString("en")} trend />
```

- **`count`** walks a number given as a number through every value between the last and the
  next, on a spring of its own (about a second, or the seconds you give), each number rounded as
  the one it's going to is written before `format` writes it, and rolled: 6.67 to 8 drops its
  decimals at once and lands on 8, 8 to 6.67 shows them at once. Its digits are tabular figures
  while it counts, so the value holds its width. Sent somewhere new mid-count, it goes on at the
  speed it has.
- **`trend`** tints the value a moment as its numbers go up or down, green or red (darkened to
  read on white), then lets it fade back to its own colour: `trend={{ up: "…", down: "…" }}` for
  colours of your own. A change whose numbers didn't move isn't tinted.
- **`settled`** (a promise on the roller) and **`onSettle`** (an option) say when it has come to
  rest on its value: its turns done, and its count.
- **`staggerFrom`** starts a change's characters from the `start`, the `end` or the `center`.
- **Groups** move several rollers as one. Give each the same `rollGroup()` (in React, wrap them in
  `<RollGroup>`): a change to several in the same moment staggers across them all in the page's
  order, and the group's `settled` and `onSettle` wait for every one.

```ts
const row = rollGroup({ onSettle: () => console.log("all landed") });
const price = roll(priceElement, "€8", { group: row });
const total = roll(totalElement, "€24", { group: row });
```

## The details

- **At rest it's plain text**: one text node, as crisp as any text, selected and copied as text,
  costing nothing. Cells exist only while something turns, and only for the characters that do;
  it goes back to plain text without moving the text after it by more than a sixty-fourth of a
  pixel.
- **Soft edges.** A symbol fades as it leaves its line, and symbols are spaced so that what hangs
  past a line (a g's tail, an accent, a line set tight) never peeks once a turn lands.
- **Lands evenly.** Text moved by less than a pixel a frame goes a whole pixel at a time, with
  waits between, so a spring's tail stutters. A turn slows on its spring until it moves a pixel a
  frame, then comes the rest of the way at that pace.
- **Reduced motion** (`prefers-reduced-motion`, unless told otherwise): nothing moves; the new
  character fades in where it stands.
- **Read once.** Assistive tech hears the value in words; the drawing that moves is hidden from it.
- **Drawn on a server.** The React component draws the value as plain text, and the browser takes
  it up as it is: nothing moves as the page hydrates.
- **Any container.** Measured in em against a ruler under the same transforms, so it rolls true in
  a scaled sheet or a page zoomed to be filmed.
- **Characters as you read them.** An é written as an e and an accent, a flag, a family of emoji:
  one character each.
- **Together.** Every roller on the page changes in one batch: all write, all read in one layout,
  all animate. A table of numbers changing at once lays out once, not once a number.

## API

### `roll(element, value, options?)`

Makes `element` show `value`, replacing what was in it, and returns a roller:

- `set(value, options?)`: roll to `value`. Options given here hold from now on.
- `value`: what it shows, or is rolling to.
- `settled`: a promise that resolves once it's at rest on the value it was last given.
- `destroy()`: stop. What it shows stays, as plain text.

### `rollGroup({ onSettle? })`

A group to give rollers as `group`: they stagger as one value and settle together. Its
`settled` resolves once every one of them is at rest.

### `<Roll value label? {...options} {...spanProps} />`

`@cesarvenzac/roll/react`. A `<span>` showing `value`, text, a number or an element, rolling to
each new one. Its own props (`className`, `style`, `id`…) go on the `<span>`. An element rolls
over as one and should be still: what rolls is a copy. React 18 or later, as an optional peer
dependency; it's a client component. `<RollGroup onSettle?>` groups every `Roll` inside it.

### `<roll-text>`

`@cesarvenzac/roll/element` defines it when imported. Its options are attributes (`look`,
`direction`, `effects="fade blur"`, `stagger-from`, `trend`, `count`, `tabular`, `duration`, `bounce`,
`stagger`, `way`, `reels`, `reduced-motion`, `label`), its value an attribute or the `value`
property (a number counts), and `options` a property for what an attribute can't say (`format`,
`group`, `onSettle`). Its `settled` is the roller's. Text written inside it before it's defined (a
server's) is taken up as it is.

### Svelte and Vue

`@cesarvenzac/roll/svelte`'s `roll` is an action taking `{ value, ...options }`;
`@cesarvenzac/roll/vue`'s `vRoll` a directive taking a value or `{ value, ...options }`. Give the
directive an element with nothing inside for Vue to keep.

### Options

| Option          | Default            | What it does                                                                  |
| --------------- | ------------------ | ----------------------------------------------------------------------------- |
| `duration`      | `0.6`              | Seconds a turn takes to come to rest, near enough (the spring's).             |
| `bounce`        | `0`                | How far a turn goes past and comes back, 0 to 1.                              |
| `stagger`       | `0.03`             | Seconds between one character starting and the next, left to right.          |
| `reels`         | `[DIGITS]`         | What turns through its symbols rather than rolling over: strings, in order.  |
| `way`           | `"auto"`           | `"up"` or `"down"` to turn everything one way; `"auto"` reads the numbers.   |
| `reducedMotion` | the media query    | `true` to fade rather than move, `false` to move whatever the system says.    |
| `look`          | `"slide"`          | How a symbol turns: `slide`, `drum`, `cube`, `circle`, `square` or `swap`.    |
| `direction`     | `"up"`             | Where a symbol goes, turning forward: `up`, `down`, `left` or `right`.        |
| `effects`       | `[]`               | Laid over the look: `fade`, `scale`, `blur`, or `motion` (blur by speed).     |
| `staggerFrom`   | `"start"`          | Where a change's characters start from: `start`, `end` or `center`.           |
| `trend`         | `false`            | Tints the value green going up and red going down, then lets it fade back.    |
| `count`         | `false`            | Counts a number through every value between: `true`, or the seconds to take.  |
| `format`        | `String`           | How a number given as a number is written.                                    |
| `tabular`       | while counting     | Tabular figures, every digit one width: on with `count`, else the font's own. |
| `onSettle`      |                    | Called each time it comes to rest on a new value.                             |
| `group`         |                    | A `rollGroup()` it moves with.                                                |
| `label`         | the value's words  | What assistive tech reads. A node's `aria-label` unless said.                 |

A reel is a string of symbols in order, going round: `DIGITS` (`"0123456789"`), `LOWERCASE`,
`UPPERCASE`, or your own (`"♠♥♦♣"`). A number's digits turn the way the number went; any other
symbol on a reel turns forward (or as `way` says), going round the reel if it must. The stagger
is never more than a quarter of a second from the first character to the last.

## Styling

It's text: set its font, size, colour and line height on the element, and they hold while it
rolls. Kerning and ligatures are off inside it, so a character is as wide alone as among the
others and nothing shifts as it turns into cells and back. A value that counts draws tabular
figures, every digit one width, so it holds its width while its digits change every frame; any
other keeps the font's own figures, whose widths Roll eases as they change. `tabular` says
otherwise either way: tabular figures suit any number that changes while it's watched (a price, a
clock, a column of numbers), the font's own a large figure that changes now and then.

## Cost

About 9 kB minified and gzipped for `roll()`, 10 kB with every entry, and no dependencies. At rest a value
is one text node. Starting a turn takes about 2 ms for a number, 12 ms for twenty changing at
once and 80 ms for two hundred, measured in headless Chromium on one core of a 2.1 GHz server.
A turn moves its strip by `top`, not a transform: on a layer of its own a letter was placed on whole
device pixels and stood apart from the text beside it, so it's drawn in the page as that text is.
A look is posed on the main thread, from a value the browser animates; `drum` and `cube` are drawn
in 3D, on layers of their own, so they land within half a device pixel of the text.

## Browsers

Any browser with the Web Animations API. Springs play as a CSS `linear()` easing between two
keyframes where there is one (Chrome 113, Safari 17.2, Firefox 112), and as a keyframe a frame
elsewhere. Looks need a registered CSS property and CSS's trigonometry and rounding (Chrome 125,
Safari 16.4, Firefox 128); elsewhere every look slides up, without effects. Characters are split
by `Intl.Segmenter` where there is one.

## Development

```sh
npm ci
npm test
npm run typecheck
npm run check # packed as npm publishes it, then installed and run as a user's would be
```

This repository is a copy. The package is developed inside the site it was made for, whose
repository is private, and every release copies it here and publishes it to npm from here, with
provenance. Issues are welcome; pull requests are read, and their changes made at the source.

## Licence

MIT.
