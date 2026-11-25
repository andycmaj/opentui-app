// The dispatch log pane: every command that ran, newest last, with the scope
// that handled it. It binds only navigation, so app keys like `s` reach the
// app scope while this pane has focus.

import { For, Show } from "solid-js";
import type { Renderable, ScrollBoxRenderable } from "@opentui/core";
import { Pane, PaneHeader, useScope, useTheme } from "@andycmaj/opentui-app";
import { Commands } from "./commands";
import type { DispatchLog } from "./dispatch-log";

export function LogPane(props: { log: DispatchLog }) {
  const theme = useTheme();
  let pane: Renderable | undefined;
  let scrollRef: ScrollBoxRenderable | undefined;

  const scopeColor = (scope: string) =>
    scope === "app" ? theme.accent : theme.secondary;

  const track = (cmd: string, run: () => unknown) =>
    props.log.track("log", cmd, run);
  useScope(
    "log",
    {
      [Commands.NAV_DOWN]: track(Commands.NAV_DOWN, () =>
        scrollRef?.scrollBy(1),
      ),
      [Commands.NAV_UP]: track(Commands.NAV_UP, () => scrollRef?.scrollBy(-1)),
      [Commands.NAV_TOP]: track(Commands.NAV_TOP, () => scrollRef?.scrollTo(0)),
      [Commands.NAV_BOTTOM]: track(Commands.NAV_BOTTOM, () =>
        scrollRef?.scrollTo(Number.MAX_SAFE_INTEGER),
      ),
    },
    { target: () => pane },
  );

  return (
    <Pane name="log" ref={(r) => (pane = r)}>
      <PaneHeader title="Dispatch log">
        <text fg={theme.textMuted}>scope · keys · command</text>
      </PaneHeader>
      <Show
        when={props.log.entries().length > 0}
        fallback={
          <box paddingLeft={2} paddingRight={2}>
            <text fg={theme.textMuted} wrapMode="word">
              Press keys. Each command that runs shows up here with the scope
              that handled it. tab switches panes.
            </text>
          </box>
        }
      >
        <scrollbox
          ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
          flexGrow={1}
          paddingLeft={2}
          paddingRight={2}
          stickyScroll
          stickyStart="bottom"
        >
          <For each={props.log.entries()}>
            {(entry) => (
              <box flexDirection="row">
                <box width={9} flexShrink={0}>
                  <text fg={scopeColor(entry.scope)}>{entry.scope}</text>
                </box>
                <box width={14} flexShrink={0}>
                  <text fg={theme.primary}>{entry.keys}</text>
                </box>
                <text fg={theme.textMuted}>{entry.cmd}</text>
              </box>
            )}
          </For>
        </scrollbox>
      </Show>
    </Pane>
  );
}
