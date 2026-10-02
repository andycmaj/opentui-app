// A generic keyboard-help modal. Reads the app's binding table from context and
// groups the bindings by scope, so it stays a single source of truth with the
// footer and palette.

import { createMemo, For, Show } from "solid-js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "../theme";
import { BaseCommands } from "../keyboard/commands";
import { navBindings, type Scope } from "../keyboard/keymap";
import { useKeymapTable } from "../keyboard/keymap-context";
import { getScopeBindings } from "../keyboard/keymap-utils";
import { Modal, ModalHeader } from "./modal";

interface KeyboardHelpProps {
  onClose: () => void;
  // Map scope id -> section title. Scopes not listed use a title-cased id.
  scopeLabels?: Record<string, string>;
  // Explicit section order; defaults to "app" first, then table order.
  scopeOrder?: Scope[];
  footer?: string;
}

function titleCase(scope: string): string {
  if (scope === "app") return "Global";
  return scope.charAt(0).toUpperCase() + scope.slice(1);
}

export function KeyboardHelp(props: KeyboardHelpProps) {
  const theme = useTheme();
  const table = useKeymapTable();
  let scrollRef: ScrollBoxRenderable | undefined;

  const groups = createMemo(() => {
    const scopes = Object.keys(table);
    const order = props.scopeOrder ?? [
      "app",
      ...scopes.filter((s) => s !== "app"),
    ];

    return order
      .filter((scope) => (table[scope]?.length ?? 0) > 0)
      .map((scope) => ({
        scope,
        title: props.scopeLabels?.[scope] ?? titleCase(scope),
        items: getScopeBindings(table, scope).map((b) => ({
          key: b.keys,
          description: b.desc,
        })),
      }));
  });

  const page = () => scrollRef?.viewport?.height ?? 8;

  return (
    <Modal
      size="md"
      onClose={props.onClose}
      bindings={navBindings()}
      commands={{
        [BaseCommands.NAV_DOWN]: () => scrollRef?.scrollBy(1),
        [BaseCommands.NAV_UP]: () => scrollRef?.scrollBy(-1),
        [BaseCommands.NAV_TOP]: () => scrollRef?.scrollTo(0),
        [BaseCommands.NAV_BOTTOM]: () => scrollRef?.scrollTo(999999),
        [BaseCommands.SCROLL_PAGEDOWN]: () => scrollRef?.scrollBy(page()),
        [BaseCommands.SCROLL_PAGEUP]: () => scrollRef?.scrollBy(-page()),
      }}
    >
      <ModalHeader title="Keyboard Shortcuts" hint="j/k scroll · esc" />
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        maxHeight={16}
        paddingLeft={2}
        paddingRight={2}
        paddingBottom={1}
      >
        <For each={groups()}>
          {(group) => (
            <box flexDirection="column" marginBottom={1}>
              <text fg={theme.accent} attributes={TextAttributes.BOLD}>
                {group.title}
              </text>
              <For each={group.items}>
                {(item) => (
                  <box flexDirection="row">
                    <box width={12} flexShrink={0}>
                      <text fg={theme.primary}>{item.key}</text>
                    </box>
                    <text fg={theme.textMuted}>{item.description}</text>
                  </box>
                )}
              </For>
            </box>
          )}
        </For>
      </scrollbox>
      <Show when={props.footer}>
        <box paddingLeft={2} paddingRight={2} paddingBottom={1}>
          <text fg={theme.textMuted}>{props.footer}</text>
        </box>
      </Show>
    </Modal>
  );
}
