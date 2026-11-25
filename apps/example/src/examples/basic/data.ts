// A fake in-memory data source. It implements the framework's DataSource seam
// without any network or Effection dependency, proving an app can plug its own
// (here trivial) fetching mechanism behind the interface.

import { createAsyncState, type DataSource } from "@andycmaj/opentui-app";

export type TaskStatus = "active" | "done" | "blocked";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  body: string;
}

const SEED: Task[] = [
  {
    id: "1",
    title: "Wire up the keymap",
    status: "done",
    body: [
      "# Wire up the keymap",
      "",
      "The keymap is **declarative** — a single table drives dispatch, the",
      "footer, and the help modal.",
      "",
      "- `j`/`k` move the cursor",
      "- `Tab` cycles panes",
      "- `:` opens the command palette",
      "",
      "> One source of truth for every binding.",
    ].join("\n"),
  },
  {
    id: "2",
    title: "Adopt the theme system",
    status: "active",
    body: [
      "# Theme system",
      "",
      "Themes defer to the terminal via `transparent` / `undefined` colors.",
      "Press `t` to cycle: `default` → `tokyo-night` → `terminal` → `mono`.",
      "",
      "```ts",
      "const theme = useTheme();",
      "<text fg={theme.primary}>hello</text>",
      "```",
    ].join("\n"),
  },
  {
    id: "3",
    title: "Handle a blocked task",
    status: "blocked",
    body: [
      "# Blocked",
      "",
      "This task is waiting on something. Task lists render too:",
      "",
      "- [x] design the seam",
      "- [ ] unblock the dependency",
      "- [ ] ship it",
    ].join("\n"),
  },
  {
    id: "4",
    title: "Fire a toast",
    status: "active",
    body: [
      "# Toasts",
      "",
      "Press `r` to refresh — a toast confirms it. Open a task with `Enter`",
      "to move focus to the detail pane.",
    ].join("\n"),
  },
];

export interface TaskDataSource extends DataSource<Task[]> {
  refreshCount: () => number;
}

export function createTaskDataSource(): TaskDataSource {
  const store = createAsyncState<Task[]>([]);
  let count = 0;

  async function refresh() {
    store.setLoading(true);
    // Simulate an async load; in a real app this is fetch/git/websocket/etc.
    await Promise.resolve();
    count++;
    store.setData(SEED.map((t) => ({ ...t })));
  }

  return {
    state: store.state,
    refresh,
    refreshCount: () => count,
  };
}
