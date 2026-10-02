// A generic, filterable command palette. Apps supply the actions; the palette
// handles filtering, navigation, and running the selected action. Built on the
// modal kit so it inherits the opaque adaptive surface and escape-to-close.

import { createMemo, For, Show } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";
import { contrastingForeground } from "../theme/color";
import { useListNavigation } from "../hooks/use-list-navigation";
import { ModalCommands } from "../keyboard/commands";
import { modalNavBindings } from "../keyboard/keymap";
import { Modal, ModalHeader, ModalFilterInput } from "./modal";

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  group?: string;
  run: () => void;
}

interface CommandPaletteProps {
  actions: PaletteAction[];
  title?: string;
  placeholder?: string;
  onClose: () => void;
}

export function CommandPalette(props: CommandPaletteProps) {
  const theme = useTheme();
  let scrollRef: ScrollBoxRenderable | undefined;

  const nav = useListNavigation({
    itemCount: () => filtered().length,
    scrollRef: () => scrollRef,
    visibleItems: 12,
  });

  const filtered = createMemo(() => {
    const q = nav.filter().toLowerCase();
    if (!q) return props.actions;
    return props.actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        (a.group?.toLowerCase().includes(q) ?? false),
    );
  });

  function runSelected() {
    const action = filtered()[nav.selected()];
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
        maxHeight={14}
        paddingLeft={2}
        paddingRight={2}
        paddingBottom={1}
      >
        <Show
          when={filtered().length > 0}
          fallback={<text fg={theme.textMuted}>No matching commands</text>}
        >
          <For each={filtered()}>
            {(action, index) => {
              const selected = () => index() === nav.selected();
              return (
                <box
                  flexDirection="row"
                  justifyContent="space-between"
                  backgroundColor={selected() ? theme.primary : undefined}
                  paddingLeft={1}
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
                    <text
                      fg={
                        selected()
                          ? contrastingForeground(theme.primary)
                          : theme.textMuted
                      }
                    >
                      {action.hint}
                    </text>
                  </Show>
                </box>
              );
            }}
          </For>
        </Show>
      </scrollbox>
    </Modal>
  );
}
