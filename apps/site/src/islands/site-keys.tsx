// The site's keyboard layer, laid out like an app's keymap: one global table
// of keys, overlays that take over the keyboard while open, and j/k moving
// focus through whichever list ([data-nav-list]) the page offers.

import {
  createSignal,
  Match,
  onCleanup,
  onMount,
  Switch,
  type JSX,
} from "solid-js";
import { moveSelection } from "../lib/palette";
import { Overlay, onOpenOverlay } from "../lib/overlay";
import type { PageItem } from "../lib/site-pages";
import { cycleTheme, syncThemeLabels } from "../lib/site-theme";
import { CommandPalette } from "./command-palette";
import { HelpModal } from "./help-modal";
import { SearchModal } from "./search-modal";

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function isVisible(el: HTMLElement): boolean {
  return el.offsetParent !== null || el.getClientRects().length > 0;
}

function moveInList(delta: number): void {
  const lists = [
    ...document.querySelectorAll<HTMLElement>("[data-nav-list]"),
  ].filter(isVisible);
  const active = document.activeElement;
  const list = lists.find((l) => l.contains(active)) ?? lists[0];
  if (!list) return;
  const items = [
    ...list.querySelectorAll<HTMLElement>("[data-nav-item]"),
  ].filter(isVisible);
  if (items.length === 0) return;
  const current = items.findIndex((el) => el === active || el.contains(active));
  const next =
    current === -1
      ? delta > 0
        ? 0
        : items.length - 1
      : moveSelection(current, delta, items.length);
  const target = items[next];
  target?.focus({ preventScroll: true });
  target?.scrollIntoView({ block: "nearest" });
}

export default function SiteKeys(props: {
  base: string;
  pages: PageItem[];
}): JSX.Element {
  const [overlay, setOverlay] = createSignal<Overlay | null>(null);
  const close = (): void => {
    setOverlay(null);
  };

  function onKeyDown(e: KeyboardEvent): void {
    // An open overlay owns the keyboard, like a modal's keymap layer.
    if (overlay() || e.defaultPrevented) return;

    const mod = e.ctrlKey || e.metaKey;
    // ctrl+p only: cmd+p stays the browser's print.
    if (
      mod &&
      !e.altKey &&
      !e.shiftKey &&
      (e.key === "k" || (e.ctrlKey && e.key === "p"))
    ) {
      e.preventDefault();
      setOverlay(Overlay.PALETTE);
      return;
    }
    if (mod || e.altKey || isTyping(e.target)) return;

    switch (e.key) {
      case "/":
        setOverlay(Overlay.SEARCH);
        break;
      case "?":
        setOverlay(Overlay.HELP);
        break;
      case "t":
        cycleTheme();
        break;
      case "j":
        moveInList(1);
        break;
      case "k":
        moveInList(-1);
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  onMount(() => {
    syncThemeLabels();
    document.addEventListener("keydown", onKeyDown);
    const stop = onOpenOverlay(setOverlay);
    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
      stop();
    });
  });

  return (
    <Switch>
      <Match when={overlay() === Overlay.PALETTE}>
        <CommandPalette pages={props.pages} onClose={close} />
      </Match>
      <Match when={overlay() === Overlay.SEARCH}>
        <SearchModal base={props.base} onClose={close} />
      </Match>
      <Match when={overlay() === Overlay.HELP}>
        <HelpModal onClose={close} />
      </Match>
    </Switch>
  );
}
