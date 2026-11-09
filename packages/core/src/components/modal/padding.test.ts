import { describe, expect, test } from "bun:test";
import { modalWidth } from "./modal";
import { resolvePadding, type PaddingSides } from "./padding";

const DEFAULT: PaddingSides = { top: 0, right: 2, bottom: 1, left: 2 };

describe("resolvePadding", () => {
  test("nothing given keeps the default", () => {
    expect(resolvePadding(undefined, DEFAULT)).toEqual(DEFAULT);
    expect(resolvePadding(undefined)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });

  test("a number pads every side", () => {
    expect(resolvePadding(3, DEFAULT)).toEqual({
      top: 3,
      right: 3,
      bottom: 3,
      left: 3,
    });
  });

  test("an axis sets both its sides and leaves the other axis alone", () => {
    expect(resolvePadding({ x: 4 }, DEFAULT)).toEqual({
      top: 0,
      right: 4,
      bottom: 1,
      left: 4,
    });
    expect(resolvePadding({ x: 4, y: 1 }, DEFAULT)).toEqual({
      top: 1,
      right: 4,
      bottom: 1,
      left: 4,
    });
  });

  test("a side wins over its axis", () => {
    expect(resolvePadding({ y: 2, top: 0, left: 5 }, DEFAULT)).toEqual({
      top: 0,
      right: 2,
      bottom: 2,
      left: 5,
    });
  });
});

describe("modalWidth", () => {
  test("keeps the preferred width when the terminal has room", () => {
    expect(modalWidth(66, 120)).toBe(66);
  });

  test("narrows to the terminal, leaving a margin", () => {
    expect(modalWidth(66, 50)).toBe(46);
  });

  test("never goes below the minimum", () => {
    expect(modalWidth(66, 10)).toBe(20);
  });
});
