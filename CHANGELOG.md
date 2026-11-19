# Changelog

## 1.1.1

- Turns land evenly. Text moved by less than a pixel a frame moves a whole pixel at a time, so a spring's long tail came in a pixel, a wait, a pixel and a longer wait, the last pixel held for a tenth of a second: a stutter just as it landed. A turn now slows as before until it's moving a pixel a frame, then comes the rest of the way at that pace, a pixel every frame, and rests a little sooner.
- The README opens on the reel from its docs: a price, a count, a clock, a word, an icon and a day, rolling.

## 1.1.0

- A count goes as the number it's going to is written. Each number on the way is rounded to the target's decimals before it's formatted, so 6.67 to 8 drops its decimals at once and lands on 8, where it rolled ".00" until the end and landed, unformatted, on "8.00"; 8 to 6.67 shows them at once.
- Tabular figures while counting. A roller with `count` draws its digits in tabular figures, every digit one width, so the value holds its width while its digits change every frame; React draws them on the server too. `tabular` says otherwise, or asks for them without counting; `<roll-text>` takes it as an attribute.

## 1.0.0

- Looks and directions. `look` turns a symbol on a slot machine's drum or a turning cube, seen in perspective, rolls it along like a wheel (`circle`), tips it over its edge (`square`) or swaps it in place (`swap`, a crossfade); `slide`, the flat strip, stays the default. `direction` sends it `up` (the default), `down`, `left` or `right` as the value turns forward, and counting down runs it the other way. Going across, what leaves stays inside its own cell.
- Effects. `effects` lays `fade`, `scale` and `blur` over any look, as far as a symbol has gone: faded out and in, shrunk to 60% and grown back (never from nothing), blurred and sharpened, in any mix.
- Counting. `count` walks a number given as a number through every value between, on a spring of its own, each number rounded as the two ends are written before `format` writes it; sent somewhere new mid-count, it goes on at the speed it has. `format` writes a number given as a number, counting or not.
- Trend. `trend` tints the value green as its numbers go up and red as they go down, then lets it fade back to its own colour; colours of your own as `{ up, down }`.
- Motion blur. The `motion` effect blurs a symbol by how fast it goes: a long spin smears, then lands sharp.
- Knowing when it's done. The roller's `settled` promise and the `onSettle` option say when it's at rest on its value, its count included.
- `staggerFrom`: a change's characters start from the `start`, the `end` or the `center`.
- Groups. `rollGroup()` (React's `<RollGroup>`) moves several rollers as one: a change to several staggers across them all in the page's order, and the group settles together.
- Everywhere. `@cesarvenzac/roll/element` defines `<roll-text>`, its options attributes; `@cesarvenzac/roll/svelte` is an action and `@cesarvenzac/roll/vue` a directive. None needs anything else installed.
- Letters on a reel turn the value's way, forward unless `way` says otherwise, as a split-flap board's flaps do. They took the shorter way round, so a word's letters went some forward and some back.
- An element is drawn by a server as the engine will draw it, in an inline block: in a plain span, an icon the page's CSS makes a block (Tailwind's SVGs) broke out of its line and stood taller until the page was taken up.
- Each look is geometry written once: the browser works it out every frame from one sprung value, through CSS's `sin()`, `cos()` and `round()`, and the tests evaluate the same expressions. Where the browser can't (before Chrome 125, Safari 16.4, Firefox 128), every look slides up, without effects.

## 0.1.3

- An icon turns where it stands again. 0.1.2 widened the strip a symbol turns on, and a node a page's CSS makes a block (Tailwind makes every SVG one) stood at its left edge, half an em off, until the turn ended. Each symbol on a strip is now centred by flex, whatever it is.

## 0.1.2

- Smoother turns, with nothing shaking. Widths now ease all at once on one curve: staggered like the turns, a word's width grew then shrank, and a centred word wobbled as "Saving" became "Saved". A turning strip moves by `top` rather than a transform, so its letter is drawn in the page as the text beside it is, where a layer of its own put it on whole device pixels and it jumped as it was handed back.
- Characters that don't turn stay in one text node a run, beside the cells, as plain text lays them out: split a character a node, they stood an eighth of a pixel off and flickered as a turn began and ended.

## 0.1.1

- A digit now lands exactly where the text draws it. A turning strip was one line of text a step tall, and at some sizes the browser rounded its leading differently from the text's, so a digit settled half a pixel off and moved by that much as it went back to plain text. Each symbol on a strip is now a block a step tall, its line the text's own height.

## 0.1.0

The first version: the rolling numbers of Brume, as a library, and more than numbers.

- `roll(element, value)` and React's `<Roll value>`: text, a number or a node, rolling to each new one.
- A number's digits keep their places as an odometer's do (units stay units, a colon stays put, a digit that comes or goes rolls in or out where it stands), fractions read from their mark, thousands told from decimals, several numbers in one value.
- Each digit turns the way the number went, read from its numbers, fractions and signs included; anything else rolls over; `reels` turn letters, or any symbols, through their order.
- Icons and any node roll over as one; in React, any element.
- Springs that carry on when interrupted, launched as an ease-out; widths that ease to the next character's; soft edges; a stagger.
- Plain text at rest, cells only for what turns, every roller on a page changing in one batch with one layout.
- A fade in place under reduced motion, the value read once by assistive tech, drawn on a server as plain text and hydrated without a move.
