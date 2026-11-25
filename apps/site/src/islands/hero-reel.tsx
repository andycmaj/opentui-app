// The home page's hero: one pane that plays each app's recording in turn, like
// cycling panes in a TUI. ←/→ (or the arrow buttons) switch app; a finished
// recording advances to the next one.

import { createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { moveSelection } from "../lib/palette";
import Recording from "./recording";

export interface ReelItem {
  id: string;
  name: string;
  href: string;
  status: "stable" | "beta";
  cast: string;
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export default function HeroReel(props: { items: ReelItem[] }): JSX.Element {
  const [index, setIndex] = createSignal(0);
  // Without motion, nothing plays until asked, so nothing ends and advances.
  const [motion, setMotion] = createSignal(false);
  const current = (): ReelItem | undefined => props.items[index()];
  const step = (delta: number): void => {
    setIndex((i) => moveSelection(i, delta, props.items.length));
  };

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTyping(e.target)) return;
    // A focused player seeks with its own arrows; an open overlay owns keys.
    if (e.target instanceof Element && e.target.closest(".ap-wrapper")) return;
    if (document.querySelector(".overlay-backdrop")) return;
    e.preventDefault();
    step(e.key === "ArrowRight" ? 1 : -1);
  }

  onMount(() => {
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));
  });

  return (
    <div class="reel">
      <header class="reel-header">
        <h1 class="reel-title">
          <a href={current()?.href}>{current()?.name}</a>
        </h1>
        <Show when={current()}>
          {(item) => (
            <span class={`badge badge--${item().status}`}>
              {item().status === "stable" ? "●" : "◐"} {item().status}
            </span>
          )}
        </Show>
        <span class="reel-nav">
          <button
            type="button"
            aria-label="Previous app"
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <span class="muted" aria-live="polite">
            {index() + 1}/{props.items.length}
          </span>
          <button type="button" aria-label="Next app" onClick={() => step(1)}>
            ›
          </button>
          <span class="reel-hint">
            <kbd>←/→</kbd>
            <span class="muted"> switch app</span>
          </span>
        </span>
      </header>
      <Show when={current()} keyed>
        {(item) => (
          <Recording
            src={item.cast}
            autoPlay={motion()}
            loop={false}
            onEnded={() => step(1)}
          />
        )}
      </Show>
    </div>
  );
}
