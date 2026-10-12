// The detail pane: the selected task's markdown body, or (toggled with `l`) a
// streaming activity log rendered by the framework's LogBufferView.

import { createSignal, onCleanup, Show } from "solid-js";
import { type Renderable, type ScrollBoxRenderable } from "@opentui/core";
import {
  createMemoryLogSource,
  LogBufferView,
  Markdown,
  Pane,
  PaneHeader,
  useScope,
  useTheme,
} from "@andycmaj/opentui-app";
import { Commands } from "../commands";
import type { Task } from "../data";

const ACTIVITY = [
  { text: "picked up by worker-3" },
  { text: "fetching dependencies…" },
  { text: "\x1b[32m✓\x1b[0m build cache hit (\x1b[1m412\x1b[0m modules)" },
  { text: "retrying flaky step after timeout", level: "WARN" },
  { text: "upstream returned 503 Service Unavailable", level: "ERROR" },
  { text: "progress checkpoint saved" },
];

export function Detail(props: { task: () => Task | undefined }) {
  const theme = useTheme();
  let scrollRef: ScrollBoxRenderable | undefined;
  let pane: Renderable | undefined;
  const [showActivity, setShowActivity] = createSignal(false);
  const [following, setFollowing] = createSignal(true);

  // Fake a log stream per task so the view has something live to follow.
  const activity = createMemoryLogSource();
  let tick = 0;
  const timer = setInterval(() => {
    const task = props.task();
    if (!task) return;
    const entry = ACTIVITY[tick++ % ACTIVITY.length];
    activity.append(task.id, `${entry.text}\n`, {
      level: entry.level,
      time: new Date().toISOString(),
    });
  }, 400);
  onCleanup(() => clearInterval(timer));

  const [ActivityLog, log] = LogBufferView({
    source: activity,
    sourceKey: () => props.task()?.id ?? null,
    showTimestamps: () => true,
    onAutoScrollChange: setFollowing,
  });

  const page = () =>
    showActivity()
      ? Math.floor(log.height / 2)
      : (scrollRef?.viewport?.height ?? 8);

  useScope(
    "detail",
    {
      [Commands.NAV_DOWN]: () =>
        showActivity() ? log.scrollBy(1) : scrollRef?.scrollBy(1),
      [Commands.NAV_UP]: () =>
        showActivity() ? log.scrollBy(-1) : scrollRef?.scrollBy(-1),
      [Commands.NAV_TOP]: () =>
        showActivity() ? log.scrollToTop() : scrollRef?.scrollTo(0),
      [Commands.NAV_BOTTOM]: () =>
        showActivity() ? log.scrollToBottom() : scrollRef?.scrollTo(999999),
      [Commands.SCROLL_PAGEDOWN]: () =>
        showActivity() ? log.scrollBy(page()) : scrollRef?.scrollBy(page()),
      [Commands.SCROLL_PAGEUP]: () =>
        showActivity() ? log.scrollBy(-page()) : scrollRef?.scrollBy(-page()),
      [Commands.ACTIVITY_TOGGLE]: () => setShowActivity((v) => !v),
    },
    { target: () => pane },
  );

  return (
    <Pane name="detail" variant="content" ref={(r) => (pane = r)}>
      <PaneHeader
        title={
          showActivity()
            ? `Activity: ${props.task()?.title ?? ""}`
            : (props.task()?.title ?? "Detail")
        }
      >
        <Show when={showActivity() && following()}>
          <text fg={theme.success} flexShrink={0}>
            [follow]
          </text>
        </Show>
      </PaneHeader>
      <Show
        when={showActivity()}
        fallback={
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
        }
      >
        <box marginLeft={2} flexGrow={1}>
          <ActivityLog />
        </box>
      </Show>
    </Pane>
  );
}
