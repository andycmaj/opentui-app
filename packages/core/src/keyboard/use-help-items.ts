// Live footer hints: the bindings reachable from the active pane, filtered by
// the app's help context. Queried against the pane rather than real focus so
// the hints stay put while a modal holds focus.

import type { Accessor } from "solid-js";
import { useKeymapSelector } from "@opentui/keymap/solid";
import { useFocus } from "../context/focus";
import {
  filterRelevant,
  getHelpItems,
  reachableBindings,
  type HelpBinding,
  type HelpItem,
  type HelpItemOptions,
} from "./keymap-utils";

// Bindings reachable from the active pane, recomputed on keymap and focus
// changes.
export function useReachableBindings(): Accessor<HelpBinding[]> {
  const { activePaneTarget } = useFocus();
  return useKeymapSelector((keymap) => {
    const target = activePaneTarget();
    return target ? reachableBindings(keymap, target) : [];
  });
}

export function useHelpItems<Ctx>(
  ctx?: Accessor<Ctx>,
  options?: HelpItemOptions,
): Accessor<HelpItem[]> {
  const bindings = useReachableBindings();
  return () => {
    const all = bindings();
    return getHelpItems(
      ctx ? filterRelevant<unknown>(all, ctx()) : all,
      options,
    );
  };
}
