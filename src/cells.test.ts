import { describe, expect, it } from "vitest";

import { cellsBetween, cellsOf, graphemesOf, wayOf } from "./cells.ts";

/** What's drawn as `before` becomes `after`, a cell a string: "+1" comes in, "[1]" goes, "1" stays (and turns). */
const drawn = (before: string, after: string) => cellsBetween(before, after).map(({ symbol, gone, fresh }) => (gone ? `[${symbol}]` : fresh ? `+${symbol}` : symbol));
const keys = (value: string) => cellsOf(value).map((cell) => cell.key);

describe("graphemesOf", () => {
  it("keeps what a reader sees as one character together", () => {
    expect(graphemesOf("été")).toEqual(["é", "t", "é"]);
    expect(graphemesOf("🇫🇷👍🏽")).toEqual(["🇫🇷", "👍🏽"]);
    expect(graphemesOf("")).toEqual([]);
  });
});

describe("cellsOf", () => {
  it("places a whole part's digits by the digits to their right, and its marks by the same", () => {
    expect(keys("1,234")).toEqual(["n0d3", "n0j3", "n0d2", "n0d1", "n0d0"]);
    expect(keys("1:05")).toEqual(["n0d2", "n0j2", "n0d1", "n0d0"]);
  });

  it("places a fraction's digits from its mark", () => {
    expect(keys("1:05.3")).toEqual(["n0d2", "n0j2", "n0d1", "n0d0", "n0m", "n0f0"]);
    expect(keys("6,40")).toEqual(["n0d0", "n0m", "n0f0", "n0f1"]);
  });

  it("tells a fraction from thousands grouped", () => {
    const hasFraction = (value: string) => cellsOf(value).some((cell) => cell.key === "n0m");
    expect(hasFraction("12,345")).toBe(false);
    expect(hasFraction("1.234.567")).toBe(false);
    expect(hasFraction("12 345")).toBe(false);
    expect(hasFraction("6.40")).toBe(true);
    expect(hasFraction("0,5")).toBe(true);
    expect(hasFraction("1,234.5")).toBe(true);
    expect(hasFraction("1 234,567")).toBe(true);
  });

  it("keeps numbers set apart by anything but one joining mark apart", () => {
    expect(keys("3/12")).toEqual(["n0d0", "t0.0", "n1d1", "n1d0"]);
    expect(keys("12 MB")).toEqual(["n0d1", "n0d0", "t0.0", "t0.1", "t0.2"]);
  });

  it("places what comes before the first number from its end, and words letter by letter", () => {
    expect(keys("-€5")).toEqual(["p1", "p0", "n0d0"]);
    expect(keys("Hi")).toEqual(["s0", "s1"]);
    expect(cellsOf("👍🏽 2").map((cell) => cell.symbol)).toEqual(["👍🏽", " ", "2"]);
  });

  it("marks digits alone as digits", () => {
    expect(cellsOf("€6.40").map((cell) => cell.digit)).toEqual([false, true, false, true, true]);
  });
});

describe("cellsBetween", () => {
  it("keeps the units the units as a number grows a digit", () => {
    expect(drawn("9", "10")).toEqual(["+1", "0"]);
    expect(drawn("99", "100")).toEqual(["+1", "0", "0"]);
    expect(drawn("9%", "10%")).toEqual(["+1", "0", "%"]);
    expect(drawn("9/12", "10/12")).toEqual(["+1", "0", "/", "1", "2"]);
  });

  it("keeps a clock's colon where it is", () => {
    expect(drawn("9:59", "10:00")).toEqual(["+1", "0", ":", "0", "0"]);
    expect(drawn("9:59.9", "10:00.0")).toEqual(["+1", "0", ":", "0", "0", ".", "0"]);
  });

  it("brings a group's mark in with its digit, and takes it away with it", () => {
    expect(drawn("9999", "10,000")).toEqual(["+1", "0", "+,", "0", "0", "0"]);
    expect(drawn("1,234", "999")).toEqual(["[1]", "[,]", "9", "9", "9"]);
  });

  it("brings a fraction in after the whole part, and takes it away from there", () => {
    expect(drawn("€8", "€6.67")).toEqual(["€", "6", "+.", "+6", "+7"]);
    expect(drawn("€6.67", "€8")).toEqual(["€", "8", "[.]", "[6]", "[7]"]);
    expect(drawn("6,67 €", "8 €")).toEqual(["8", "[,]", "[6]", "[7]", " ", "€"]);
  });

  it("keeps what follows a number from its start, and what comes before from its end", () => {
    expect(drawn("1 file", "2 files")).toEqual(["2", " ", "f", "i", "l", "e", "+s"]);
    expect(drawn("-€5", "€5")).toEqual(["[-]", "€", "5"]);
  });

  it("keeps a word's letters in their places", () => {
    expect(drawn("Saving", "Saved")).toEqual(["S", "a", "v", "e", "d", "[g]"]);
    expect(drawn("Copy", "Copied")).toEqual(["C", "o", "p", "i", "+e", "+d"]);
  });

  it("changes nothing while the value doesn't", () => {
    expect(drawn("€12.50", "€12.50")).toEqual(["€", "1", "2", ".", "5", "0"]);
  });
});

describe("wayOf", () => {
  it("reads the numbers in the value", () => {
    expect(wayOf("47%", "50%")).toBe("up");
    expect(wayOf("0:06", "0:05")).toBe("down");
    expect(wayOf("412 MB", "39 MB")).toBe("down");
    expect(wayOf("€8", "€12.50")).toBe("up");
    expect(wayOf("9:59", "10:00")).toBe("up");
  });

  it("reads a fraction as a fraction", () => {
    expect(wayOf("€8", "€6.40")).toBe("down");
    expect(wayOf("1.5", "1.25")).toBe("down");
    expect(wayOf("0,9", "1")).toBe("up");
  });

  it("reads thousands grouped as thousands", () => {
    expect(wayOf("1.234", "999")).toBe("down");
    expect(wayOf("9999", "10,000")).toBe("up");
  });

  it("reads a sign, but not a dash between numbers", () => {
    expect(wayOf("−3°", "−5°")).toBe("down");
    expect(wayOf("-1", "1")).toBe("up");
    expect(wayOf("1", "-1")).toBe("down");
    expect(wayOf("-0", "0")).toBe("up");
    expect(wayOf("2026-11-15", "2026-11-16")).toBe("up");
  });

  it("reads one number after another", () => {
    expect(wayOf("9/12", "10/12")).toBe("up");
    expect(wayOf("3/12", "3/11")).toBe("down");
  });

  it("counts up when it can't tell", () => {
    expect(wayOf("", "5")).toBe("up");
    expect(wayOf("7", "7")).toBe("up");
    expect(wayOf("Saving", "Saved")).toBe("up");
  });
});
