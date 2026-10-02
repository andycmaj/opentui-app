// Theme structure and the built-in color schemes. Derived from the OpenCode
// palette; the transparent/undefined convention lets themes defer to the
// terminal's own colors. See ThemeColor below.

import { elevate, mix } from "./color";

// OpenCode theme color definitions (dark mode).
const opencodeTheme = {
  // Step colors (gray scale)
  step1: "#0a0a0a", // darkest - background
  step2: "#141414", // panel background
  step3: "#1e1e1e", // element background
  step4: "#282828",
  step5: "#323232",
  step6: "#3c3c3c",
  step7: "#484848", // border
  step8: "#606060", // border active
  step9: "#fab283", // primary (orange/peach)
  step10: "#ffc09f",
  step11: "#808080", // muted text
  step12: "#eeeeee", // text

  // Semantic colors
  secondary: "#5c9cf5", // blue
  accent: "#9d7cd8", // purple
  red: "#e06c75",
  orange: "#f5a742",
  green: "#7fd88f",
  cyan: "#56b6c2",
  yellow: "#e5c07b",
};

/**
 * A color that maps to the terminal's own scheme rather than a fixed value.
 *
 * OpenTUI's `parseColor` resolves named/hex colors to fixed truecolor RGB, so
 * the only way to defer to the terminal is:
 *   - `"transparent"` on a background, which lets the terminal background show
 *     through, or
 *   - `undefined` on a foreground, which lets the terminal's default text color
 *     apply.
 */
export type ThemeColor = string | undefined;

export interface Theme {
  // Base colors
  background: string;
  contentPane: string; // For pane backgrounds (lighter gray)
  text: ThemeColor;
  textMuted: ThemeColor;

  // Border colors
  border: ThemeColor;
  borderActive: ThemeColor;
  borderSubtle: ThemeColor;

  // Selection colors
  selectionFg: ThemeColor;
  selectionBg: string;

  // Semantic colors
  primary: ThemeColor;
  secondary: ThemeColor;
  accent: ThemeColor;
  error: ThemeColor;
  warning: ThemeColor;
  success: ThemeColor;
  info: ThemeColor;
}

/** Selectable color scheme, chosen via the `theme` key in config. */
export type ThemeName = "default" | "terminal" | "mono" | "tokyo-night";

export const defaultTheme: Theme = {
  background: opencodeTheme.step1,
  contentPane: opencodeTheme.step3,
  text: opencodeTheme.step12,
  textMuted: opencodeTheme.step11,

  border: opencodeTheme.step5,
  borderActive: opencodeTheme.secondary,
  borderSubtle: opencodeTheme.step4,

  selectionFg: "#ffffff",
  selectionBg: "#264f78",

  primary: opencodeTheme.step9,
  secondary: opencodeTheme.secondary,
  accent: opencodeTheme.accent,
  error: opencodeTheme.red,
  warning: opencodeTheme.orange,
  success: opencodeTheme.green,
  info: opencodeTheme.cyan,
};

// Transparent backgrounds let the terminal's own background show through; the
// accent colors are kept so state stays legible. `text` is left undefined so
// body copy uses the terminal's default foreground.
export const terminalTheme: Theme = {
  ...defaultTheme,
  background: "transparent",
  contentPane: "transparent",
  text: undefined,
  // step11 (#808080) is a mid gray that reads on both light and dark terminals.
  textMuted: opencodeTheme.step11,
};

// No color at all: every foreground defers to the terminal's default, every
// background is transparent. State is conveyed by glyphs and labels rather than
// color. A single neutral selection band keeps the current row visible.
export const monoTheme: Theme = {
  background: "transparent",
  contentPane: "transparent",
  text: undefined,
  textMuted: undefined,
  border: undefined,
  borderActive: undefined,
  borderSubtle: undefined,
  selectionFg: undefined,
  selectionBg: opencodeTheme.step4,
  primary: undefined,
  secondary: undefined,
  accent: undefined,
  error: undefined,
  warning: undefined,
  success: undefined,
  info: undefined,
};

// Tokyo Night color definitions (the canonical dark "Night" variant)
const tokyoNight = {
  bg: "#1a1b26",
  surface: "#24283b", // elevated pane background
  fg: "#c0caf5",
  muted: "#737aa2", // dark5 - readable muted foreground
  gutter: "#3b4261", // fg_gutter - subtle border
  bgHighlight: "#292e42",
  selection: "#283457",

  blue: "#7aa2f7",
  magenta: "#bb9af7",
  orange: "#ff9e64",
  yellow: "#e0af68",
  green: "#9ece6a",
  cyan: "#7dcfff",
  red: "#f7768e",
};

export const tokyoNightTheme: Theme = {
  background: tokyoNight.bg,
  contentPane: tokyoNight.surface,
  text: tokyoNight.fg,
  textMuted: tokyoNight.muted,

  border: tokyoNight.gutter,
  borderActive: tokyoNight.blue,
  borderSubtle: tokyoNight.bgHighlight,

  selectionFg: tokyoNight.fg,
  selectionBg: tokyoNight.selection,

  primary: tokyoNight.orange,
  secondary: tokyoNight.blue,
  accent: tokyoNight.magenta,
  error: tokyoNight.red,
  warning: tokyoNight.yellow,
  success: tokyoNight.green,
  info: tokyoNight.cyan,
};

const themes: Record<ThemeName, Theme> = {
  default: defaultTheme,
  terminal: terminalTheme,
  mono: monoTheme,
  "tokyo-night": tokyoNightTheme,
};

export const THEME_NAMES: ThemeName[] = [
  "default",
  "terminal",
  "mono",
  "tokyo-night",
];

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

// Opaque, still-monochrome surface used for modals under the `mono` theme.
// Modals are overlays, so they need a solid background and defined foreground to
// stay readable; every semantic color maps to the text color so there is still
// no color inside the modal, preserving mono's intent.
const monoModalTheme: Theme = {
  background: defaultTheme.background,
  contentPane: defaultTheme.contentPane,
  text: defaultTheme.text,
  textMuted: defaultTheme.textMuted,
  border: defaultTheme.border,
  borderActive: defaultTheme.textMuted,
  borderSubtle: defaultTheme.borderSubtle,
  selectionFg: defaultTheme.selectionFg,
  selectionBg: defaultTheme.selectionBg,
  primary: defaultTheme.text,
  secondary: defaultTheme.text,
  accent: defaultTheme.text,
  error: defaultTheme.text,
  warning: defaultTheme.text,
  success: defaultTheme.text,
  info: defaultTheme.text,
};

/** Detected terminal colors used to build an adaptive modal surface. */
export type TerminalSurface = { background: string; foreground: string } | null;

// Modal surface, elevated a shade off the real terminal background so it reads
// as a card while matching the terminal's light/dark theme. `accents` carries
// the theme's semantic colors (kept for `terminal`, collapsed to the foreground
// for `mono` to stay monochrome).
function adaptiveModalTheme(
  accents: Theme,
  background: string,
  foreground: string,
): Theme {
  const surface = elevate(background);
  const raised = elevate(background, 0.18);
  return {
    ...accents,
    background: surface,
    contentPane: surface,
    text: foreground,
    textMuted: mix(foreground, surface, 0.4),
    border: raised,
    borderActive: foreground,
    borderSubtle: raised,
    selectionFg: foreground,
    selectionBg: raised,
  };
}

// Every semantic color collapses to the foreground so a `mono` modal stays
// colorless while remaining readable on the adaptive surface.
function monochromeAccents(foreground: string): Theme {
  return {
    ...monoModalTheme,
    primary: foreground,
    secondary: foreground,
    accent: foreground,
    error: foreground,
    warning: foreground,
    success: foreground,
    info: foreground,
  };
}

/**
 * The theme to use for modal overlays. Transparent themes (`terminal`, `mono`)
 * would let content bleed through a modal, so they need an opaque surface. When
 * the terminal's colors have been detected, that surface adapts to the
 * terminal's light/dark theme; otherwise it falls back to a static opaque
 * surface. Opaque themes (`default`, `tokyo-night`) are returned unchanged.
 */
export function getModalTheme(
  name: ThemeName,
  terminal?: TerminalSurface,
): Theme {
  if (name !== "terminal" && name !== "mono") return getTheme(name);

  if (terminal) {
    // `mono` stays monochrome; `terminal` keeps its accent colors.
    const accents =
      name === "mono" ? monochromeAccents(terminal.foreground) : terminalTheme;
    return adaptiveModalTheme(
      accents,
      terminal.background,
      terminal.foreground,
    );
  }

  return name === "mono" ? monoModalTheme : defaultTheme;
}

/**
 * Fill in any `undefined` foreground fields with a concrete color (e.g. the
 * terminal's detected default text color). Backgrounds are `string` and left
 * untouched, so `"transparent"` is preserved. A no-op for opaque themes, which
 * have no undefined fields, and when `fg` is undefined.
 */
export function resolveForeground(theme: Theme, fg: string | undefined): Theme {
  if (fg === undefined) return theme;
  const resolved: Theme = { ...theme };
  for (const key of Object.keys(resolved) as (keyof Theme)[]) {
    if (resolved[key] === undefined) resolved[key] = fg;
  }
  return resolved;
}
