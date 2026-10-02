// Focus management on top of OpenTUI's real focus. Panes register their
// focusable box; `activePane` follows the renderer's focused renderable, so the
// keymap's focus-within layers and this state always agree. Also tracks sidebar
// visibility and which modal (if any) is open. The first pane in the list is
// treated as the sidebar pane and is coupled to sidebar visibility.

import {
  createEffect,
  createSignal,
  on,
  onCleanup,
  onMount,
  type ParentProps,
} from "solid-js";
import { createStore } from "solid-js/store";
import { CliRenderEvents, type Renderable } from "@opentui/core";
import { useRenderer } from "@opentui/solid";
import { createRequiredContext } from "./require-context";

// A modal id, or "none" when nothing is open. Apps use their own string ids.
export type ModalState = string;

interface FocusState {
  // The pane focus is in, or was last in while a modal holds focus.
  activePane: string;
}

export interface FocusContextValue {
  state: FocusState;
  panes: string[];
  setActivePane: (pane: string) => void;
  cyclePane: () => void;
  isPaneFocused: (pane: string) => boolean;
  // The active pane's renderable: the focus context for help and palette
  // queries while a modal holds real focus.
  activePaneTarget: () => Renderable | undefined;
  registerPane: (pane: string, target: Renderable) => () => void;
  sidebarVisible: () => boolean;
  toggleSidebar: () => void;
  activeModal: () => ModalState;
  openModal: (modal: ModalState) => void;
  closeModal: () => void;
  isModalOpen: () => boolean;
}

const [FocusContext, useFocus] =
  createRequiredContext<FocusContextValue>("Focus");

export { useFocus };

const DEFAULT_PANES = ["sidebar", "content"];

export function FocusProvider(props: ParentProps<{ panes?: string[] }>) {
  const renderer = useRenderer();
  const panes =
    props.panes && props.panes.length > 0 ? props.panes : DEFAULT_PANES;
  const sidebarPane = panes[0];
  // The pane focused when the sidebar is hidden (first non-sidebar pane).
  const contentPane = panes[1] ?? panes[0];

  const [state, setState] = createStore<FocusState>({
    activePane: sidebarPane,
  });
  const [activeModal, setActiveModal] = createSignal<ModalState>("none");
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const [targets, setTargets] = createSignal<Map<string, Renderable>>(
    new Map(),
  );

  // A pane asked for focus before it mounted (initial focus, or the sidebar
  // being re-shown); it takes focus when it registers.
  let pendingFocus: string | null = sidebarPane;

  function isModalOpen() {
    return activeModal() !== "none";
  }

  function paneContaining(renderable: Renderable | null): string | undefined {
    for (let node = renderable; node; node = node.parent) {
      for (const [pane, target] of targets()) {
        if (target === node) return pane;
      }
    }
    return undefined;
  }

  function focusPane(pane: string) {
    setState("activePane", pane);
    // A modal keeps real focus; closing it restores focus to the active pane.
    if (isModalOpen()) return;
    const target = targets().get(pane);
    if (target && !target.isDestroyed) {
      pendingFocus = null;
      target.focus();
    } else {
      pendingFocus = pane;
    }
  }

  function registerPane(pane: string, target: Renderable): () => void {
    setTargets((prev) => new Map(prev).set(pane, target));
    if (pendingFocus === pane && !isModalOpen()) focusPane(pane);
    return () => {
      setTargets((prev) => {
        if (prev.get(pane) !== target) return prev;
        const next = new Map(prev);
        next.delete(pane);
        return next;
      });
    };
  }

  onMount(() => {
    const onFocus = (renderable: Renderable | null) => {
      const pane = paneContaining(renderable);
      if (pane) setState("activePane", pane);
    };
    renderer.on(CliRenderEvents.FOCUSED_RENDERABLE, onFocus);
    onCleanup(() => renderer.off(CliRenderEvents.FOCUSED_RENDERABLE, onFocus));
  });

  // The closing modal's box is being destroyed, so hand focus back once it's
  // gone.
  createEffect(
    on(
      activeModal,
      (modal, prev) => {
        if (modal === "none" && prev !== undefined && prev !== "none") {
          queueMicrotask(() => {
            if (!isModalOpen()) focusPane(state.activePane);
          });
        }
      },
      { defer: true },
    ),
  );

  function cyclePane() {
    const idx = panes.indexOf(state.activePane);
    const next = panes[(idx + 1) % panes.length];
    // Expand the sidebar when focusing the sidebar pane.
    if (next === sidebarPane && !sidebarOpen()) {
      setSidebarOpen(true);
    }
    focusPane(next);
  }

  function toggleSidebar() {
    const next = !sidebarOpen();
    setSidebarOpen(next);
    // Focus the sidebar pane when showing it; move focus off it when hiding,
    // since the list is no longer visible.
    focusPane(next ? sidebarPane : contentPane);
  }

  const value: FocusContextValue = {
    state,
    panes,
    setActivePane: focusPane,
    cyclePane,
    isPaneFocused: (pane) => state.activePane === pane,
    activePaneTarget: () => targets().get(state.activePane),
    registerPane,
    sidebarVisible: sidebarOpen,
    toggleSidebar,
    activeModal,
    openModal: setActiveModal,
    closeModal: () => setActiveModal("none"),
    isModalOpen,
  };

  return (
    <FocusContext.Provider value={value}>
      {props.children}
    </FocusContext.Provider>
  );
}

/**
 * Make a box a focus target for a pane. Spread `ref` onto the pane's root box;
 * pass `target` to `useScope` so the pane's bindings follow focus.
 */
export function usePane(pane: string) {
  const focus = useFocus();
  let target: Renderable | undefined;

  onMount(() => {
    if (!target) return;
    const unregister = focus.registerPane(pane, target);
    onCleanup(unregister);
  });

  return {
    ref: (renderable: Renderable) => {
      renderable.focusable = true;
      target = renderable;
    },
    target: () => target,
    isFocused: () => focus.isPaneFocused(pane),
  };
}
