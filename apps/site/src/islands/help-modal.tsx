// Web counterpart of core's KeyboardHelp: keys in --primary, descriptions in
// --muted, grouped under --accent titles.

import { For, type JSX } from "solid-js";
import { Modal, ModalHeader } from "./modal";

const GROUPS: { title: string; items: { keys: string; desc: string }[] }[] = [
  {
    title: "Anywhere",
    items: [
      { keys: "ctrl+k", desc: "command palette (also ctrl+p)" },
      { keys: "/", desc: "search" },
      { keys: "t", desc: "cycle theme" },
      { keys: "j / k", desc: "move through the current list" },
      { keys: "↵", desc: "open the focused item" },
      { keys: "?", desc: "this help" },
    ],
  },
  {
    title: "Palette & search",
    items: [
      { keys: "↑ / ↓", desc: "move selection (also ctrl+k / ctrl+j)" },
      { keys: "↵", desc: "run / open" },
      { keys: "esc", desc: "close" },
    ],
  },
];

export function HelpModal(props: { onClose: () => void }): JSX.Element {
  return (
    <Modal label="Keyboard shortcuts" onClose={props.onClose}>
      <ModalHeader title="Keyboard Shortcuts" hint="esc/?" />
      <div
        class="overlay-help"
        // The dialog needs focus for esc/? to reach it.
        ref={(el) => queueMicrotask(() => el.focus())}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === "?" || e.key === "q") {
            e.preventDefault();
            props.onClose();
          }
        }}
      >
        <For each={GROUPS}>
          {(group) => (
            <section>
              <div class="overlay-group">{group.title}</div>
              <For each={group.items}>
                {(item) => (
                  <div class="overlay-help-row">
                    <kbd>{item.keys}</kbd>
                    <span class="muted">{item.desc}</span>
                  </div>
                )}
              </For>
            </section>
          )}
        </For>
        <button
          type="button"
          class="overlay-close"
          onClick={() => props.onClose()}
        >
          close
        </button>
      </div>
    </Modal>
  );
}
