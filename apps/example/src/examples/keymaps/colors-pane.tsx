// The colors pane: its own scope, with nav keys, `space` to pick, and an `s`
// that shadows the app-wide one while this pane has focus.

import { createMemo, createSignal, For } from "solid-js";
import {
  TextAttributes,
  type Renderable,
  type ScrollBoxRenderable,
} from "@opentui/core";
import {
  contrastingForeground,
  Marker,
  Pane,
  PaneHeader,
  useFocus,
  useListCursor,
  useScope,
  useTheme,
  type Theme,
} from "@andycmaj/opentui-app";
import { Commands } from "./commands";
import type { DispatchLog } from "./dispatch-log";

const COLOR_ROLES = [
  "primary",
  "secondary",
  "accent",
  "success",
  "warning",
  "error",
  "info",
] as const;
type ColorRole = (typeof COLOR_ROLES)[number];

function swatch(theme: Theme, role: ColorRole): string | undefined {
  return theme[role];
}

export function ColorsPane(props: { log: DispatchLog }) {
  const theme = useTheme();
  const { isPaneFocused } = useFocus();
  const [sorted, setSorted] = createSignal(false);
  const [picked, setPicked] = createSignal<ReadonlySet<ColorRole>>(new Set());
  const roles = createMemo(() =>
    sorted() ? [...COLOR_ROLES].sort() : [...COLOR_ROLES],
  );
  let pane: Renderable | undefined;
  let scrollRef: ScrollBoxRenderable | undefined;

  const cursor = useListCursor({
    itemCount: () => roles().length,
    scrollRef: () => scrollRef,
  });

  function togglePick(): void {
    const role = roles()[cursor.cursor()];
    if (!role) return;
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(role)) next.add(role);
      return next;
    });
  }

  // Every handler is tracked under this pane's scope, so the dispatch log
  // shows which layer each key reached.
  const track = (cmd: string, run: () => unknown) =>
    props.log.track("colors", cmd, run);
  useScope(
    "colors",
    {
      [Commands.NAV_DOWN]: track(Commands.NAV_DOWN, () => cursor.move(1)),
      [Commands.NAV_UP]: track(Commands.NAV_UP, () => cursor.move(-1)),
      [Commands.NAV_TOP]: track(Commands.NAV_TOP, () => cursor.toTop()),
      [Commands.NAV_BOTTOM]: track(Commands.NAV_BOTTOM, () =>
        cursor.toBottom(),
      ),
      [Commands.COLOR_PICK]: track(Commands.COLOR_PICK, togglePick),
      [Commands.COLOR_SORT]: track(Commands.COLOR_SORT, () =>
        setSorted((s) => !s),
      ),
    },
    { target: () => pane },
  );

  return (
    <Pane name="colors" variant="sidebar" width={30} ref={(r) => (pane = r)}>
      <PaneHeader title="Colors">
        <text fg={theme.textMuted}>{sorted() ? "a→z" : "theme"}</text>
      </PaneHeader>
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        flexGrow={1}
        paddingLeft={1}
        paddingRight={1}
      >
        <For each={roles()}>
          {(role, index) => {
            const selected = () =>
              isPaneFocused("colors") && cursor.isSelected(index());
            const fg = () =>
              selected() ? contrastingForeground(theme.primary) : theme.text;
            return (
              <box
                flexDirection="row"
                backgroundColor={selected() ? theme.primary : undefined}
                paddingLeft={1}
                paddingRight={1}
              >
                <Marker selected={selected()} />
                <text fg={swatch(theme, role)}>██ </text>
                <text
                  fg={fg()}
                  attributes={selected() ? TextAttributes.BOLD : 0}
                  flexGrow={1}
                >
                  {role}
                </text>
                <text fg={fg()}>{picked().has(role) ? "✓" : " "}</text>
              </box>
            );
          }}
        </For>
      </scrollbox>
    </Pane>
  );
}
