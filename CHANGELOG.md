# Changelog

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
