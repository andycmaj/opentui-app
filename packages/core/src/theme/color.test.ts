import { describe, expect, test } from "bun:test";
import {
  relativeLuminance,
  mix,
  elevate,
  contrastingForeground,
} from "./color";

describe("color math", () => {
  test("relativeLuminance ranks black < gray < white", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    const gray = relativeLuminance("#808080");
    expect(gray).toBeGreaterThan(0);
    expect(gray).toBeLessThan(1);
  });

  test("mix interpolates endpoints", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    // Halfway is a mid gray (255 * 0.5 = 127.5, rounded to 0x80).
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  test("elevate lightens dark and darkens light", () => {
    expect(relativeLuminance(elevate("#000000"))).toBeGreaterThan(0);
    expect(relativeLuminance(elevate("#ffffff"))).toBeLessThan(1);
  });

  test("contrastingForeground picks legible text", () => {
    expect(contrastingForeground("#000000")).toBe("#ffffff");
    expect(contrastingForeground("#ffffff")).toBe("#000000");
    expect(contrastingForeground(undefined)).toBe("#ffffff");
    expect(contrastingForeground("transparent")).toBe("#ffffff");
  });
});
