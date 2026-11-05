// Pages offered by the command palette. Phase 3 derives these from the content
// collections; until then the list is kept by hand.

import type { PaletteItem } from "./palette";

export interface PageItem extends PaletteItem {
  href: string;
}

export function sitePages(base: string): PageItem[] {
  const page = (
    id: string,
    label: string,
    path: string,
    hint?: string,
  ): PageItem => ({
    id: `page:${id}`,
    label,
    hint,
    group: "pages",
    href: `${base}${path}`,
  });
  return [
    page("home", "home", "/"),
    page("tilt-tui", "tilt-tui", "/apps/tilt-tui/", "app"),
    page("ghdash-tui", "ghdash-tui", "/apps/ghdash-tui/", "app"),
    page("kube-tui", "kube-tui", "/apps/kube-tui/", "app · beta"),
    page("framework", "framework overview", "/framework/", "docs"),
    page("quick-start", "quick start", "/framework/quick-start/", "docs"),
    page("keymaps", "keymaps guide", "/framework/guides/keymaps/", "docs"),
    page("api", "api reference", "/framework/api/", "docs"),
    page("changelog", "changelog", "/changelog/"),
  ];
}
