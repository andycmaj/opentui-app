// The sidebar list pane: a cursor-navigable list of tasks.

import { createEffect, For } from "solid-js";
import {
  TextAttributes,
  type Renderable,
  type ScrollBoxRenderable,
} from "@opentui/core";
import {
  Marker,
  Pane,
  PaneHeader,
  contrastingForeground,
  useFocus,
  useScope,
  useListCursor,
  useTheme,
  type Theme,
  type ThemeColor,
} from "@opentui-app/core";
import { Commands } from "../commands";
import type { Task, TaskStatus } from "../data";

function statusColor(theme: Theme, status: TaskStatus): ThemeColor {
  switch (status) {
    case "done":
      return theme.success;
    case "active":
      return theme.info;
    case "blocked":
      return theme.error;
  }
}

function statusIcon(status: TaskStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "active":
      return "◐";
    case "blocked":
      return "✗";
  }
}

interface ListProps {
  tasks: () => Task[];
  onSelect: (index: number) => void;
  onOpen: () => void;
}

export function List(props: ListProps) {
  const theme = useTheme();
  const { isPaneFocused } = useFocus();
  let scrollRef: ScrollBoxRenderable | undefined;
  let pane: Renderable | undefined;

  const isFocused = () => isPaneFocused("list");

  const cursor = useListCursor({
    itemCount: () => props.tasks().length,
    scrollRef: () => scrollRef,
  });

  // Keep the parent's selection in sync with the cursor.
  createEffect(() => props.onSelect(cursor.cursor()));

  useScope(
    "list",
    {
      [Commands.NAV_DOWN]: () => cursor.move(1),
      [Commands.NAV_UP]: () => cursor.move(-1),
      [Commands.NAV_TOP]: () => cursor.toTop(),
      [Commands.NAV_BOTTOM]: () => cursor.toBottom(),
      [Commands.ITEM_OPEN]: () => props.onOpen(),
    },
    { target: () => pane },
  );

  return (
    <Pane name="list" variant="sidebar" ref={(r) => (pane = r)}>
      <PaneHeader title="Tasks" />
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
      >
        <For each={props.tasks()}>
          {(task, index) => {
            const selected = () => isFocused() && cursor.isSelected(index());
            return (
              <box
                flexDirection="row"
                backgroundColor={selected() ? theme.primary : undefined}
                paddingLeft={1}
                paddingRight={1}
              >
                <Marker selected={selected()} />
                <text
                  fg={
                    selected()
                      ? contrastingForeground(theme.primary)
                      : statusColor(theme, task.status)
                  }
                >
                  {" "}
                  {statusIcon(task.status)}{" "}
                </text>
                <text
                  fg={
                    selected()
                      ? contrastingForeground(theme.primary)
                      : theme.text
                  }
                  attributes={selected() ? TextAttributes.BOLD : 0}
                >
                  {task.title}
                </text>
              </box>
            );
          }}
        </For>
      </scrollbox>
    </Pane>
  );
}
