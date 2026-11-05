// The site's command palette: jump to any page or run a site action. Mirrors
// core's CommandPalette (substring filter, groups in order, ↵ to run).

import { createMemo, createSignal, type JSX } from "solid-js";
import { filterSections, type PaletteItem } from "../lib/palette";
import type { PageItem } from "../lib/site-pages";
import { applyTheme, currentTheme } from "../lib/site-theme";
import { Overlay, openOverlay } from "../lib/overlay";
import { SITE_THEMES } from "../themes";
import { ListModal } from "./list-modal";

interface Command extends PaletteItem {
  run: () => void;
}

export function CommandPalette(props: {
  pages: PageItem[];
  onClose: () => void;
}): JSX.Element {
  const [query, setQuery] = createSignal("");

  const commands: Command[] = [
    ...props.pages.map((page) => ({
      ...page,
      run: () => {
        window.location.href = page.href;
      },
    })),
    {
      id: "action:search",
      label: "search",
      hint: "/",
      group: "actions",
      run: () => openOverlay(Overlay.SEARCH),
    },
    {
      id: "action:help",
      label: "keyboard help",
      hint: "?",
      group: "actions",
      run: () => openOverlay(Overlay.HELP),
    },
    ...SITE_THEMES.map((theme) => ({
      id: `theme:${theme}`,
      label: `theme: ${theme}`,
      hint: theme === currentTheme() ? "current" : undefined,
      group: "themes",
      run: () => applyTheme(theme),
    })),
  ];

  const sections = createMemo(() => filterSections(commands, query()));

  return (
    <ListModal
      title="Commands"
      placeholder="Type to filter commands..."
      sections={sections()}
      emptyText="No matching commands"
      onQuery={setQuery}
      onSelect={(command) => {
        props.onClose();
        command.run();
      }}
      onClose={props.onClose}
    />
  );
}
