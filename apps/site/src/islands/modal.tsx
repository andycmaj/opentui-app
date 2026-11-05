// Web counterpart of core's Modal: an opaque --pane surface near the top of
// the screen, escape-to-close, and focus returned to where it was on close.

import { onCleanup, onMount, type JSX } from "solid-js";

interface ModalProps {
  label: string;
  onClose: () => void;
  children: JSX.Element;
}

export function Modal(props: ModalProps): JSX.Element {
  let previous: Element | null = null;

  onMount(() => {
    previous = document.activeElement;
  });
  onCleanup(() => {
    if (previous instanceof HTMLElement)
      previous.focus({ preventScroll: true });
  });

  return (
    <div
      class="overlay-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        class="overlay-modal"
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            props.onClose();
          }
        }}
      >
        {props.children}
      </div>
    </div>
  );
}

export function ModalHeader(props: {
  title: string;
  hint?: string;
}): JSX.Element {
  return (
    <div class="overlay-header">
      <strong>{props.title}</strong>
      <span class="muted">{props.hint ?? "esc"}</span>
    </div>
  );
}
