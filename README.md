# @cesarvenzac/roll

Text that rolls as it changes. Digits turn as an odometer's do and keep their places; letters,
signs and icons roll over; everything moves on a spring that carries on when it's interrupted.
Give it the value as you'd write it, formatted however you like, and it works out the rest.

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

A value is text, a number or a node. Format numbers first, as they're to be read
(`toLocaleString`, `Intl.NumberFormat`, a clock): Roll reads what you wrote, in any language.

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
  turn through the alphabet instead: `reels: [DIGITS, LOWERCASE]`.
- **Icons roll too.** Give it a node, an SVG say, and it rolls over as one; in React, any element.
- **Interrupted, it goes on.** Every turn is a spring. Sent somewhere else mid-way, a digit carries
  on from where it is at the speed it has, then comes home as quickly as a fresh turn would. A
  number counting fast never stutters or restarts.
- **Widths ease.** Characters keep the width the font gives them (no tabular figures needed), and
  a column eases to the next character's width as it turns: what follows the number moves with it.

## The details

- **At rest it's plain text**: one text node, as crisp as any text, selected and copied as text,
  costing nothing. Cells exist only while something turns, and only for the characters that do;
  it goes back to plain text without moving the text after it by more than a sixty-fourth of a
  pixel.
- **Soft edges.** A symbol fades as it leaves its line, and symbols are spaced so that what hangs
  past a line (a g's tail, an accent, a line set tight) never peeks once a turn lands.
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
- `destroy()`: stop. What it shows stays, as plain text.

### `<Roll value label? {...options} {...spanProps} />`

`@cesarvenzac/roll/react`. A `<span>` showing `value`, text, a number or an element, rolling to
each new one. Its own props (`className`, `style`, `id`…) go on the `<span>`. An element rolls
over as one and should be still: what rolls is a copy. React 18 or later, as an optional peer
dependency; it's a client component.

### Options

| Option          | Default            | What it does                                                                  |
| --------------- | ------------------ | ----------------------------------------------------------------------------- |
| `duration`      | `0.6`              | Seconds a turn takes to come to rest, near enough (the spring's).             |
| `bounce`        | `0`                | How far a turn goes past and comes back, 0 to 1.                              |
| `stagger`       | `0.03`             | Seconds between one character starting and the next, left to right.          |
| `reels`         | `[DIGITS]`         | What turns through its symbols rather than rolling over: strings, in order.  |
| `way`           | `"auto"`           | `"up"` or `"down"` to turn everything one way; `"auto"` reads the numbers.   |
| `reducedMotion` | the media query    | `true` to fade rather than move, `false` to move whatever the system says.    |
| `label`         | the value's words  | What assistive tech reads. A node's `aria-label` unless said.                 |

A reel is a string of symbols in order, going round: `DIGITS` (`"0123456789"`), `LOWERCASE`,
`UPPERCASE`, or your own (`"♠♥♦♣"`). A number's digits turn the way the number went; any other
symbol on a reel the shorter way round. The stagger is never more than a quarter of a second
from the first character to the last.

## Styling

It's text: set its font, size, colour and line height on the element, and they hold while it
rolls. Kerning and ligatures are off inside it, so a character is as wide alone as among the
others and nothing shifts as it turns into cells and back. `font-variant-numeric: tabular-nums`
gives every digit one width, if that's what you want.

## Cost

About 5 kB minified and gzipped, the React entry included, with no dependencies. At rest a value
is one text node. Starting a turn takes about 2 ms for a number, 12 ms for twenty changing at
once and 80 ms for two hundred, measured in headless Chromium on one core of a 2.1 GHz server;
the turn itself plays on the compositor (a transform), apart from the width.

## Browsers

Any browser with the Web Animations API. Springs play as a CSS `linear()` easing between two
keyframes where there is one (Chrome 113, Safari 17.2, Firefox 112), and as a keyframe a frame
elsewhere. Characters are split by `Intl.Segmenter` where there is one.

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
