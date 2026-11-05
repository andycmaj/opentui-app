// Mirrors core's THEME_NAMES; scripts/gen-tokens.ts fails if they diverge.
export const SITE_THEMES = [
  "default",
  "terminal",
  "mono",
  "tokyo-night",
] as const;
export type SiteTheme = (typeof SITE_THEMES)[number];
export const THEME_STORAGE_KEY = "panes:theme";
