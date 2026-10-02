// The detail pane: renders the selected task's markdown body, scrollable.

import { Show } from "solid-js";
import { type Renderable, type ScrollBoxRenderable } from "@opentui/core";
import {
  Markdown,
  Pane,
  PaneHeader,
  useScope,
  useTheme,
} from "@opentui-app/core";
import { Commands } from "../commands";
import type { Task } from "../data";

export function Detail(props: { task: () => Task | undefined }) {
  const theme = useTheme();
  let scrollRef: ScrollBoxRenderable | undefined;
  let pane: Renderable | undefined;

  const page = () => scrollRef?.viewport?.height ?? 8;

  useScope(
    "detail",
    {
      [Commands.NAV_DOWN]: () => scrollRef?.scrollBy(1),
      [Commands.NAV_UP]: () => scrollRef?.scrollBy(-1),
      [Commands.NAV_TOP]: () => scrollRef?.scrollTo(0),
      [Commands.NAV_BOTTOM]: () => scrollRef?.scrollTo(999999),
      [Commands.SCROLL_PAGEDOWN]: () => scrollRef?.scrollBy(page()),
      [Commands.SCROLL_PAGEUP]: () => scrollRef?.scrollBy(-page()),
    },
    { target: () => pane },
  );

  return (
    <Pane name="detail" variant="content" ref={(r) => (pane = r)}>
      <PaneHeader title={props.task()?.title ?? "Detail"} />
      <scrollbox
        ref={(r: ScrollBoxRenderable) => (scrollRef = r)}
        flexGrow={1}
        paddingLeft={2}
        paddingRight={2}
      >
        <Show
          when={props.task()}
          fallback={<text fg={theme.textMuted}>No task selected</text>}
        >
          {(task) => <Markdown text={task().body} width={60} />}
        </Show>
      </scrollbox>
    </Pane>
  );
}
