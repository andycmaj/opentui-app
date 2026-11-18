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
export interface FrameGlyphs {
  top: string;
  bottom: string;
  left: string;
  right: string;
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

// The exact corners (U+1FB7C-F) are from Unicode 13's legacy-computing block.
export const FRAME: FrameGlyphs = {
  top: "▔",
  bottom: "▁",
  left: "▏",
  right: "▕",
  topLeft: "🭽",
  topRight: "🭾",
  bottomLeft: "🭼",
  bottomRight: "🭿",
};

// Where those corners would be missing-glyph boxes (Terminal.app, older
// iTerm2), the corners reuse the line glyphs: every glyph is then from Block
// Elements, which render everywhere, at the cost of a notch at each corner.
export const PLAIN_FRAME: FrameGlyphs = {
  ...FRAME,
  topLeft: FRAME.top,
  topRight: FRAME.top,
  bottomLeft: FRAME.bottom,
  bottomRight: FRAME.bottom,
};

// Terminals that draw the legacy-computing corners themselves rather than
// relying on the font. Kept to ones known to; anything else gets PLAIN_FRAME.
const CORNER_TERMINALS = /ghostty|kitty|wezterm|foot|contour|rio/i;

// Env vars these terminals set. Under tmux, XTVERSION names tmux rather than
// the terminal outside it, but the outer terminal's env usually carries in.
const CORNER_TERMINAL_ENV = [
  "GHOSTTY_RESOURCES_DIR",
  "KITTY_WINDOW_ID",
  "WEZTERM_PANE",
];

// `terminalName` is opentui's XTVERSION answer, when it has one.
export function frameGlyphs(
  env: Record<string, string | undefined>,
  terminalName?: string,
): FrameGlyphs {
  const named = [terminalName, env.TERM_PROGRAM, env.TERM].some(
    (name) => name !== undefined && CORNER_TERMINALS.test(name),
  );
  const marked = CORNER_TERMINAL_ENV.some((key) => env[key]);
  return named || marked ? FRAME : PLAIN_FRAME;
}

export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function drawFrame(
  buffer: OptimizedBuffer,
  rect: FrameRect,
  glyphs: FrameGlyphs,
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
    buffer.setCell(col, y, glyphs.top, fg, bg);
    buffer.setCell(col, bottom, glyphs.bottom, fg, bg);
  }
  for (let row = y + 1; row < bottom; row++) {
    buffer.setCell(x, row, glyphs.left, fg, bg);
    buffer.setCell(right, row, glyphs.right, fg, bg);
  }
  buffer.setCell(x, y, glyphs.topLeft, fg, bg);
  buffer.setCell(right, y, glyphs.topRight, fg, bg);
  buffer.setCell(x, bottom, glyphs.bottomLeft, fg, bg);
  buffer.setCell(right, bottom, glyphs.bottomRight, fg, bg);
}
