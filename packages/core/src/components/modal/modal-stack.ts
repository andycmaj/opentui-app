// Which open modal is on top. When a popup opens over a modal, only the top one
// takes keys, so only it should look active. Module-level rather than a context
// so apps get it without adding a provider.

import { createSignal, type Accessor } from "solid-js";

export interface ModalLayer {
  isTop: Accessor<boolean>;
  release: () => void;
}

const [stack, setStack] = createSignal<readonly symbol[]>([]);

// Call when a modal mounts; release when it unmounts. Modals open in mount
// order, so the newest one is the top.
export function pushModalLayer(): ModalLayer {
  const id = Symbol("modal");
  setStack((s) => [...s, id]);
  return {
    isTop: () => stack().at(-1) === id,
    release: () => setStack((s) => s.filter((x) => x !== id)),
  };
}
