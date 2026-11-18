// How a modal sets itself apart from the screen behind it: a thin frame in the
// theme's active border color (dimmed when another modal sits on top) and a
// translucent backdrop that fades the content behind toward the app background.

import { parseColor, RGBA, type OptimizedBuffer } from "@opentui/core";
import type { Theme, ThemeColor } from "../../theme/theme";

// How far the backdrop fades what's behind it toward the app background.
export const BACKDROP_ALPHA = 0.55;

// Cells the frame takes from the modal's width, one per side.
export const BORDER_CELLS = 2;

// The backdrop for an app theme, or "transparent" when it has none. Transparent
// themes get no backdrop: a translucent fill over a cell with no background
// paints an opaque band of the fill color, which on a light terminal reads as
// a dark smear rather than a fade. Their modal still gets the frame.
export function backdropColor(app: Theme): RGBA | "transparent" {
  if (app.background === "transparent") return "transparent";
  const c = RGBA.fromHex(app.background);
  return RGBA.fromValues(c.r, c.g, c.b, BACKDROP_ALPHA);
}

// The top modal's frame uses the accent so it stands out; one with a popup
// over it falls back to the plain border color, so the active one is obvious.
export function modalBorderColor(modal: Theme, isTop: boolean): ThemeColor {
  return isTop ? (modal.borderActive ?? modal.text) : modal.border;
}

// Box-drawing glyphs draw their line through the middle of the cell, so the
// half cell outside the line shows the card's surface and the frame looks
// ragged against the backdrop. Eighth blocks put the line on the cell's outer
// edge instead, so the card's surface ends exactly at the line. opentui's own
// border takes one glyph for both horizontal sides, hence drawing it here.
// Corners reuse the horizontal lines: the exact corner glyphs (U+1FB7C-F, from
// Unicode 13's legacy-computing block) show as missing-glyph boxes in
// Terminal.app and older iTerm2, while Block Elements render everywhere.
export const FRAME = {
  top: "▔",
  bottom: "▁",
  left: "▏",
  right: "▕",
  topLeft: "▔",
  topRight: "▔",
  bottomLeft: "▁",
  bottomRight: "▁",
} as const;

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawFrame(
  buffer: OptimizedBuffer,
  rect: FrameRect,
  color: ThemeColor,
  surface: string,
): void {
  const { x, y, width, height } = rect;
  if (width < 2 || height < 2) return;
  const fg = parseColor(color ?? "#808080");
  const bg = parseColor(surface);
  const right = x + width - 1;
  const bottom = y + height - 1;
  for (let col = x + 1; col < right; col++) {
    buffer.setCell(col, y, FRAME.top, fg, bg);
    buffer.setCell(col, bottom, FRAME.bottom, fg, bg);
  }
  for (let row = y + 1; row < bottom; row++) {
    buffer.setCell(x, row, FRAME.left, fg, bg);
    buffer.setCell(right, row, FRAME.right, fg, bg);
  }
  buffer.setCell(x, y, FRAME.topLeft, fg, bg);
  buffer.setCell(right, y, FRAME.topRight, fg, bg);
  buffer.setCell(x, bottom, FRAME.bottomLeft, fg, bg);
  buffer.setCell(right, bottom, FRAME.bottomRight, fg, bg);
}
