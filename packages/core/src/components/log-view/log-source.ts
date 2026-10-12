// The seam between an app's log storage and LogBufferView. The view pulls
// incremental patches by checkpoint and is pushed a notification when new lines
// land, so a store can append at any rate without the view copying its lines.

export interface LogLine {
  // A single display line; must not contain a newline.
  text: string;
  // "WARN" and "ERROR" are colored; anything else renders as plain text.
  level?: string;
  // ISO 8601; shown as a [HH:MM:SS] prefix while timestamps are on.
  time?: string;
  // Marks a section header (e.g. a build step). Rendered highlighted and kept
  // visible while a search filter is active.
  buildEvent?: string;
}

export const LogUpdateAction = {
  APPEND: "append",
  // Earlier lines were dropped or replaced; previous checkpoints are invalid.
  TRUNCATE: "truncate",
} as const;
export type LogUpdateAction =
  (typeof LogUpdateAction)[keyof typeof LogUpdateAction];

export interface LogUpdateEvent {
  action: LogUpdateAction;
}

export type LogUpdateListener = (event: LogUpdateEvent) => void;

export interface LogPatch<L extends LogLine = LogLine> {
  lines: L[];
  checkpoint: number;
}

export interface LogSource<L extends LogLine = LogLine> {
  // Lines for `key` added since `checkpoint` (0 = everything).
  patchSet(key: string, checkpoint: number): LogPatch<L>;
  addUpdateListener(listener: LogUpdateListener): void;
  removeUpdateListener(listener: LogUpdateListener): void;
}

export interface MemoryLogSource extends LogSource {
  // Replace the content for `key` (e.g. a re-fetched document).
  set(key: string, text: string): void;
  // Append text for `key`, splitting on newlines. A trailing partial line is
  // held until its newline arrives, so streamed chunks join correctly.
  append(key: string, text: string, fields?: Omit<LogLine, "text">): void;
  clear(key?: string): void;
}

interface Entry {
  lines: LogLine[];
  partial: string;
}

// An in-memory LogSource for text that isn't already line-indexed: command
// output, streamed logs, or static documents like YAML.
export function createMemoryLogSource(): MemoryLogSource {
  const entries = new Map<string, Entry>();
  const listeners = new Set<LogUpdateListener>();

  function entry(key: string): Entry {
    let e = entries.get(key);
    if (!e) {
      e = { lines: [], partial: "" };
      entries.set(key, e);
    }
    return e;
  }

  function emit(action: LogUpdateAction): void {
    for (const listener of listeners) listener({ action });
  }

  return {
    patchSet(key, checkpoint) {
      const lines = entries.get(key)?.lines ?? [];
      return { lines: lines.slice(checkpoint), checkpoint: lines.length };
    },
    addUpdateListener(listener) {
      listeners.add(listener);
    },
    removeUpdateListener(listener) {
      listeners.delete(listener);
    },
    set(key, text) {
      const lines = text.replace(/\n$/, "").split("\n");
      entries.set(key, {
        lines: text === "" ? [] : lines.map((line) => ({ text: line })),
        partial: "",
      });
      emit(LogUpdateAction.TRUNCATE);
    },
    append(key, text, fields) {
      const e = entry(key);
      const parts = (e.partial + text).split("\n");
      e.partial = parts.pop() ?? "";
      if (parts.length === 0) return;
      for (const part of parts) e.lines.push({ ...fields, text: part });
      emit(LogUpdateAction.APPEND);
    },
    clear(key) {
      if (key === undefined) entries.clear();
      else entries.delete(key);
      emit(LogUpdateAction.TRUNCATE);
    },
  };
}
