// Small color-math helpers for deriving adaptive surfaces from terminal colors.

import { RGBA, rgbToHex } from "@opentui/core";

/** Perceptual-ish luminance in [0, 1] (Rec. 709 coefficients on 0-1 channels). */
export function relativeLuminance(hex: string): number {
  const c = RGBA.fromHex(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

/** Linear blend of two hex colors; t=0 returns a, t=1 returns b. */
export function mix(aHex: string, bHex: string, t: number): string {
  const a = RGBA.fromHex(aHex);
  const b = RGBA.fromHex(bHex);
  return rgbToHex(
    RGBA.fromValues(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t,
      1,
    ),
  );
}

/**
 * Nudge a background toward contrast to read as an "elevated" surface: lighten a
 * dark color, darken a light one. Used to build a modal card that sits a shade
 * off the terminal's own background.
 */
export function elevate(bgHex: string, amount = 0.08): string {
  const target = relativeLuminance(bgHex) < 0.5 ? "#ffffff" : "#000000";
  return mix(bgHex, target, amount);
}

/**
 * A foreground color guaranteed to read against a highlight background: white on
 * a dark background, black on a light one. Falls back to white for an undefined
 * or "transparent" background (which has no highlight to contrast with).
 */
export function contrastingForeground(bg: string | undefined): string {
  if (!bg || bg === "transparent") return "#ffffff";
  return relativeLuminance(bg) < 0.5 ? "#ffffff" : "#000000";
}
