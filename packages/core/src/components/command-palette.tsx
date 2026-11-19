// A generic, filterable command palette. Apps supply the actions; the palette
// handles filtering, navigation, and running the selected action. Built on the
// modal kit so it inherits the opaque adaptive surface and escape-to-close.

import { createMemo, For, Show } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useTerminalDimensions } from "@opentui/solid";
import { useTheme } from "../theme";
import { contrastingForeground } from "../theme/color";
import { useListNavigation } from "../hooks/use-list-navigation";
import { truncate } from "../utils/truncate";
import { ModalCommands } from "../keyboard/commands";
import { modalNavBindings } from "../keyboard/keymap";
import { Modal, ModalHeader, ModalFilterInput, modalListRows } from "./modal";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  // Actions sharing a group render together under a header, groups in order
  // of first appearance. Ungrouped actions form a header-less section.
  group?: string;
  run: () => void;
}

interface CommandPaletteProps {
  actions: PaletteAction[];
  title?: string;
  placeholder?: string;
  onClose: () => void;
}

interface PaletteSection {
  group?: string;
  actions: PaletteAction[];
}

const HINT_MAX = 24;
// The list's height on a tall terminal; a short one gets fewer rows.
const LIST_ROWS = 14;
// The header (a blank row and the title) and the filter (input between blank
// rows) above the list.
const ABOVE_LIST_ROWS = 5;

function matches(action: PaletteAction, q: string): boolean {
  return [action.label, action.group, action.hint].some(
    (field) => field?.toLowerCase().includes(q) ?? false,
  );
}

export function CommandPalette(props: CommandPaletteProps) {
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  let scrollRef: ScrollBoxRenderable | undefined;

  const listRows = createMemo(() =>
    modalListRows(LIST_ROWS, ABOVE_LIST_ROWS, dimensions().height),
  );

  // Header rows (and the gap above every header but the first) shift item
  // rows, so scroll sync works in rows rather than item indexes.
  const nav = useListNavigation({
    itemCount: () => flat().length,
    scrollRef: () => scrollRef,
    // The scrollbox's padding scrolls with its content, so every one of its
    // rows can hold an item.
    visibleItems: listRows,
    rowOf: (index) => {
      let row = 0;
      let seen = 0;
      for (const [i, section] of sections().entries()) {
        if (section.group !== undefined) row += i > 0 ? 2 : 1;
        if (index < seen + section.actions.length) return row + index - seen;
        row += section.actions.length;
        seen += section.actions.length;
      }
      return row;
    },
  });

  const sections = createMemo<PaletteSection[]>(() => {
    const q = nav.filter().toLowerCase();
    const byGroup = new Map<string | undefined, PaletteAction[]>();
    for (const action of props.actions) {
      if (q && !matches(action, q)) continue;
      const list = byGroup.get(action.group);
      if (list) list.push(action);
      else byGroup.set(action.group, [action]);
    }
    return [...byGroup].map(([group, actions]) => ({ group, actions }));
  });

  // Selection indexes the flattened sections, so it follows display order.
  const flat = createMemo(() => sections().flatMap((s) => s.actions));
  const hasHeaders = createMemo(() =>
    sections().some((s) => s.group !== undefined),
  );

  function runSelected() {
    const action = flat()[nav.selected()];
    if (action) {
      props.onClose();
      action.run();
    }
  }

  return (
    <Modal
      size="lg"
      onClose={props.onClose}
      bindings={modalNavBindings}
      commands={{
        [ModalCommands.MODAL_DOWN]: () => nav.move(1),
        [ModalCommands.MODAL_UP]: () => nav.move(-1),
        [ModalCommands.MODAL_SELECT]: runSelected,
      }}
    >
      <ModalHeader title={props.title ?? "Commands"} hint="↵ run · esc" />
      <ModalFilterInput
        onInput={nav.setFilter}
        placeholder={props.placeholder ?? "Type to filter commands..."}
      />
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        maxHeight={listRows()}
        paddingLeft={2}
        paddingRight={2}
        paddingBottom={1}
      >
        <Show
          when={flat().length > 0}
          fallback={<text fg={theme.textMuted}>No matching commands</text>}
        >
          <For each={sections()}>
            {(section, sectionIndex) => (
              <>
                <Show when={section.group}>
                  <box paddingTop={sectionIndex() > 0 ? 1 : 0}>
                    <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                      {section.group}
                    </text>
                  </box>
                </Show>
                <For each={section.actions}>
                  {(action) => {
                    const selected = () => flat()[nav.selected()] === action;
                    return (
                      <box
                        flexDirection="row"
                        justifyContent="space-between"
                        backgroundColor={selected() ? theme.primary : undefined}
                        paddingLeft={hasHeaders() ? 2 : 1}
                        paddingRight={1}
                      >
                        <text
                          fg={
                            selected()
                              ? contrastingForeground(theme.primary)
                              : theme.text
                          }
                          attributes={selected() ? TextAttributes.BOLD : 0}
                        >
                          {action.label}
                        </text>
                        <Show when={action.hint}>
                          {(hint) => (
                            <text
                              fg={
                                selected()
                                  ? contrastingForeground(theme.primary)
                                  : theme.textMuted
                              }
                            >
                              {truncate(hint(), HINT_MAX)}
                            </text>
                          )}
                        </Show>
                      </box>
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </Show>
      </scrollbox>
    </Modal>
  );
}
