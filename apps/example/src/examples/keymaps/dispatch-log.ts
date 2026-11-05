// A record of which scope handled each command, so the example can show
// dispatch happening. Plain Solid state: no opentui imports.

import { createSignal, type Accessor } from "solid-js";
import { keysFor } from "./keymap";

export interface Dispatch {
  id: number;
  scope: string;
  cmd: string;
  keys: string;
}

export interface DispatchLog {
  entries: Accessor<Dispatch[]>;
  // Wrap a handler so each run is recorded under its scope.
  track: (scope: string, cmd: string, run: () => unknown) => () => unknown;
  clear: () => void;
}

const MAX_ENTRIES = 200;

export function createDispatchLog(): DispatchLog {
  const [entries, setEntries] = createSignal<Dispatch[]>([]);
  let nextId = 0;

  return {
    entries,
    track: (scope, cmd, run) => () => {
      setEntries((list) =>
        [
          ...list,
          { id: nextId++, scope, cmd, keys: keysFor(scope, cmd) },
        ].slice(-MAX_ENTRIES),
      );
      return run();
    },
    clear: () => setEntries([]),
  };
}
