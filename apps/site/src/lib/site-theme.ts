// Browser-side theme switching. The pre-paint script (ThemeScript.astro) only
// reads the stored choice; everything that changes it goes through here.

import { SITE_THEMES, THEME_STORAGE_KEY, type SiteTheme } from "../themes";

function isSiteTheme(value: string | undefined): value is SiteTheme {
  return SITE_THEMES.some((t) => t === value);
}

export function currentTheme(): SiteTheme {
  const value = document.documentElement.dataset.theme;
  return isSiteTheme(value) ? value : "default";
}

export function applyTheme(theme: SiteTheme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage can be blocked (private windows); the switch still applies.
  }
  syncThemeLabels();
}

export function cycleTheme(): SiteTheme {
  const i = SITE_THEMES.indexOf(currentTheme());
  const next = SITE_THEMES[(i + 1) % SITE_THEMES.length] ?? "default";
  applyTheme(next);
  return next;
}

export function syncThemeLabels(): void {
  const name = currentTheme();
  for (const el of document.querySelectorAll("[data-theme-name]")) {
    el.textContent = name;
  }
}
