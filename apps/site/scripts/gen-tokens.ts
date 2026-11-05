// Generates src/styles/tokens.css from the framework's own theme definitions,
// so the site's colors can never drift from what the TUIs render.
//
// Runs under Bun rather than inside Astro/Vite: core's color math imports
// @opentui/core, which loads a native library that Vite can't bundle.

import {
  defaultTheme,
  THEME_NAMES,
  tokyoNightTheme,
  type Theme,
} from "../../../packages/core/src/theme/theme";
import { SITE_THEMES } from "../src/themes";
import {
  contrastingForeground,
  elevate,
  mix,
} from "../../../packages/core/src/theme/color";

type Palette = Record<keyof Theme, string>;

const TOKEN_NAMES = {
  background: "--bg",
  contentPane: "--pane",
  text: "--text",
  textMuted: "--muted",
  border: "--border",
  borderActive: "--border-active",
  borderSubtle: "--border-subtle",
  selectionFg: "--sel-fg",
  selectionBg: "--sel-bg",
  primary: "--primary",
  secondary: "--secondary",
  accent: "--accent",
  error: "--error",
  warning: "--warning",
  success: "--success",
  info: "--info",
} as const satisfies Record<keyof Theme, string>;

const THEME_KEYS: readonly (keyof Theme)[] = [
  "background",
  "contentPane",
  "text",
  "textMuted",
  "border",
  "borderActive",
  "borderSubtle",
  "selectionFg",
  "selectionBg",
  "primary",
  "secondary",
  "accent",
  "error",
  "warning",
  "success",
  "info",
];

// WCAG relative luminance, used only to keep text readable on the web palettes
// that the TUI leaves to the terminal (`terminal`, `mono`).
function luminance(hex: string): number {
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Pull a color toward `toward` until it reaches the target contrast against bg.
function ensureContrast(
  color: string,
  bg: string,
  toward: string,
  target = 4.5,
): string {
  let out = color;
  for (let t = 0.05; contrast(out, bg) < target && t <= 1; t += 0.05) {
    out = mix(color, toward, t);
  }
  return out;
}

// The TUI themes used here must not defer anything to the terminal: the web has
// no terminal colors to fall back on.
function isConcrete(theme: Theme): theme is Theme & Palette {
  return THEME_KEYS.every((key) => {
    const value = theme[key];
    return value !== undefined && value !== "transparent";
  });
}

function fromTheme(theme: Theme): Palette {
  if (!isConcrete(theme)) {
    throw new Error("theme has transparent or terminal-default colors");
  }
  return theme;
}

// `terminal` defers to the terminal's own colors; on the web the equivalent is
// the visitor's OS light/dark preference with a neutral surface. Accents are
// kept (that is the point of `terminal`) but nudged for contrast on light.
function terminalPalette(mode: "light" | "dark"): Palette {
  const bg = mode === "dark" ? "#111111" : "#fafafa";
  const fg = mode === "dark" ? "#e6e6e6" : "#1c1c1c";
  const raised = elevate(bg, 0.12);
  const fix = (c: string) => ensureContrast(c, bg, fg);
  return {
    background: bg,
    contentPane: elevate(bg, 0.04),
    text: fg,
    textMuted: fix(mix(fg, bg, 0.45)),
    border: raised,
    borderActive: fix(defaultTheme.secondary!),
    borderSubtle: elevate(bg, 0.07),
    selectionFg: fg,
    selectionBg: mode === "dark" ? "#264f78" : "#cfe3ff",
    primary: fix(defaultTheme.primary!),
    secondary: fix(defaultTheme.secondary!),
    accent: fix(defaultTheme.accent!),
    error: fix(defaultTheme.error!),
    warning: fix(defaultTheme.warning!),
    success: fix(defaultTheme.success!),
    info: fix(defaultTheme.info!),
  };
}

// `mono` has no color at all: every semantic token collapses to the foreground,
// state is carried by glyphs and labels, exactly as in the TUI.
function monoPalette(mode: "light" | "dark"): Palette {
  const base = terminalPalette(mode);
  const fg = base.text;
  return {
    ...base,
    borderActive: fg,
    selectionBg: mode === "dark" ? "#282828" : "#e2e2e2",
    primary: fg,
    secondary: fg,
    accent: fg,
    error: fg,
    warning: fg,
    success: fg,
    info: fg,
  };
}

function block(selector: string, palette: Palette, scheme: string): string {
  const lines = THEME_KEYS.map(
    (key) => `  ${TOKEN_NAMES[key]}: ${palette[key]};`,
  );
  // Text on a --primary fill (the selected palette row), picked exactly as the
  // TUI's CommandPalette does.
  lines.push(`  --on-primary: ${contrastingForeground(palette.primary)};`);
  return `${selector} {\n  color-scheme: ${scheme};\n${lines.join("\n")}\n}`;
}

// Recordings are always made in the `default` theme, so the player's ANSI
// palette is that theme's, whatever the site theme is.
const d = fromTheme(defaultTheme);
const ansi = [
  d.background,
  d.error,
  d.success,
  d.warning,
  d.secondary,
  d.accent,
  d.info,
  d.text,
  d.textMuted,
  d.error,
  d.success,
  d.warning,
  d.secondary,
  d.accent,
  d.info,
  "#ffffff",
];
const playerTheme = [
  ".asciinema-player-theme-panes {",
  `  --term-color-foreground: ${d.text};`,
  `  --term-color-background: ${d.background};`,
  ...ansi.map((c, i) => `  --term-color-${i}: ${c};`),
  "}",
].join("\n");

// `default` sits on bare :root so the page is styled even before the theme
// script runs or with JS disabled.
const css = [
  "/* Generated by scripts/gen-tokens.ts from packages/core/src/theme. Do not edit. */",
  block(':root,\n:root[data-theme="default"]', fromTheme(defaultTheme), "dark"),
  block(':root[data-theme="tokyo-night"]', fromTheme(tokyoNightTheme), "dark"),
  block(':root[data-theme="terminal"]', terminalPalette("dark"), "dark"),
  block(':root[data-theme="mono"]', monoPalette("dark"), "dark"),
  "@media (prefers-color-scheme: light) {",
  block(':root[data-theme="terminal"]', terminalPalette("light"), "light"),
  block(':root[data-theme="mono"]', monoPalette("light"), "light"),
  "}",
  playerTheme,
  "",
].join("\n\n");

// The site's theme list is hand-kept (Astro can't import core's theme module);
// fail the build if core gains or renames a theme.
if (JSON.stringify(SITE_THEMES) !== JSON.stringify(THEME_NAMES)) {
  throw new Error(
    `src/themes.ts ${JSON.stringify(SITE_THEMES)} != core THEME_NAMES ${JSON.stringify(THEME_NAMES)}`,
  );
}

const outPath = new URL("../src/styles/tokens.css", import.meta.url);
await Bun.write(outPath, css);
console.log(`wrote ${outPath.pathname}`);
