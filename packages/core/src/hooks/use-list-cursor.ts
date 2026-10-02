// Cursor navigation for an in-place list pane (as opposed to a filterable
// modal): a moving cursor index, clamped when the list length changes, with the
// selected row auto-scrolled into view. Captures the choreography otherwise
// hand-rolled per pane.

import type { ScrollBoxRenderable } from "@opentui/core";
import { createEffect, createSelector, createSignal, on } from "solid-js";

interface ListCursorOptions {
  itemCount: () => number;
  scrollRef?: () => ScrollBoxRenderable | undefined;
  itemHeight?: number;
  // Reset the cursor to 0 when this key changes (e.g. the selected section).
  resetKey?: () => unknown;
}

export interface ListCursorResult {
  cursor: () => number;
  setCursor: (index: number) => void;
  move: (delta: number) => void;
  toTop: () => void;
  toBottom: () => void;
  pageBy: (pages: number) => void;
  isSelected: (index: number) => boolean;
}

export function useListCursor(options: ListCursorOptions): ListCursorResult {
  const itemHeight = options.itemHeight ?? 1;
  const [cursor, setCursorRaw] = createSignal(0);
  const isSelected = createSelector(cursor);

  function clamp(index: number): number {
    const count = options.itemCount();
    if (count <= 0) return 0;
    if (index < 0) return 0;
    if (index >= count) return count - 1;
    return index;
  }

  function scrollIntoView(index: number) {
    const scrollRef = options.scrollRef?.();
    if (!scrollRef) return;
    const viewport = scrollRef.viewport?.height ?? 0;
    const scrollTop = scrollRef.scrollTop;
    const itemTop = index * itemHeight;
    if (itemTop < scrollTop) {
      scrollRef.scrollTo(itemTop);
    } else if (viewport > 0 && itemTop >= scrollTop + viewport) {
      scrollRef.scrollTo(itemTop - viewport + itemHeight);
    }
  }

  function setCursor(index: number) {
    const next = clamp(index);
    setCursorRaw(next);
    scrollIntoView(next);
  }

  function move(delta: number) {
    setCursor(cursor() + delta);
  }

  function toTop() {
    setCursor(0);
  }

  function toBottom() {
    setCursor(options.itemCount() - 1);
  }

  function pageBy(pages: number) {
    const scrollRef = options.scrollRef?.();
    const viewport = scrollRef?.viewport?.height ?? 10;
    setCursor(cursor() + Math.round(viewport * pages));
  }

  // Clamp the cursor when the list shrinks under it (e.g. items removed by a
  // background refresh).
  createEffect(
    on(
      () => options.itemCount(),
      () => setCursorRaw((c) => clamp(c)),
    ),
  );

  // Reset to the top when the reset key changes.
  if (options.resetKey) {
    createEffect(on(options.resetKey, () => setCursor(0), { defer: true }));
  }

  return {
    cursor,
    setCursor,
    move,
    toTop,
    toBottom,
    pageBy,
    isSelected,
  };
}
