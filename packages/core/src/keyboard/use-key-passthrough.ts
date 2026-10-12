// Hands every key to a raw handler while focus is within a target, ahead of
// all keymap layers (including the app's). For panes that embed something that
// owns the keyboard, like a terminal. Keys bound in the scope's own table entry
// are let through to normal dispatch, so a pane can keep an escape chord (and
// have it show in the footer and help) while swallowing everything else.

import { onCleanup } from "solid-js";
import type { KeyEvent, Renderable } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import { useKeymap, useKeymapTable } from "./keymap-context";
import type { Scope } from "./keymap";

export interface KeyPassthroughOptions {
  target: () => Renderable | null | undefined;
  // Pause passthrough without unmounting, e.g. while a session is detached.
  enabled?: () => boolean;
}

function isWithin(node: Renderable | null, target: Renderable): boolean {
  for (let n: Renderable | null = node; n; n = n.parent) {
    if (n === target) return true;
  }
  return false;
}

export function useKeyPassthrough(
  scope: Scope,
  onKey: (event: KeyEvent) => void,
  options: KeyPassthroughOptions,
): void {
  const renderer = useRenderer();
  const keymap = useKeymap();
  const reserved = (useKeymapTable()[scope] ?? []).map((spec) =>
    keymap.createKeyMatcher(spec.key),
  );

  const stop = keymap.intercept("key", (ctx) => {
    const target = options.target();
    if (!target || options.enabled?.() === false) return;
    if (!isWithin(renderer.currentFocusedRenderable, target)) return;
    if (reserved.some((matches) => matches(ctx.event))) return;
    onKey(ctx.event);
    ctx.consume({ preventDefault: true, stopPropagation: true });
  });
  onCleanup(stop);
}
