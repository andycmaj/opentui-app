// How a modal sets itself apart from the screen behind it: a rounded border in
// the theme's active border color (dimmed when another modal sits on top) and a
// translucent backdrop that fades the content behind toward the app background.

import { RGBA } from "@opentui/core";
import type { FocusBorderProps } from "../../theme/format";
import type { Theme, ThemeColor } from "../../theme/theme";

// How far the backdrop fades what's behind it toward the app background.
export const BACKDROP_ALPHA = 0.55;

// Cells the border takes from the modal's width, one per side.
export const BORDER_CELLS = 2;

// The backdrop for an app theme, or "transparent" when it has none. Transparent
// themes get no backdrop: a translucent fill over a cell with no background
// paints an opaque band of the fill color, which on a light terminal reads as
// a dark smear rather than a fade. Their modal still gets the border.
export function backdropColor(app: Theme): RGBA | "transparent" {
  if (app.background === "transparent") return "transparent";
  const c = RGBA.fromHex(app.background);
  return RGBA.fromValues(c.r, c.g, c.b, BACKDROP_ALPHA);
}

// The top modal's border uses the accent so it stands out; one with a popup
// over it falls back to the plain border color, so the active one is obvious.
export function modalBorderColor(modal: Theme, isTop: boolean): ThemeColor {
  return isTop ? (modal.borderActive ?? modal.text) : modal.border;
}

// Box props for the modal border. Off returns only `border: false`: opentui
// turns a border on whenever a style or color is set.
export function modalBorder(
  modal: Theme,
  isTop: boolean,
  enabled: boolean,
): FocusBorderProps {
  if (!enabled) return { border: false };
  const color = modalBorderColor(modal, isTop);
  return {
    border: true,
    borderStyle: "rounded",
    borderColor: color,
    focusedBorderColor: color,
  };
}
