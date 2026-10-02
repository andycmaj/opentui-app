// Shared modal filter input - auto-focusing text input with empty-value fix.

import type { InputRenderable } from "@opentui/core";
import { createEffect } from "solid-js";
import { useTheme } from "../../theme";

interface ModalFilterInputProps {
  onInput: (value: string) => void;
  placeholder?: string;
  initialValue?: string;
  ref?: (r: InputRenderable) => void;
}

export function ModalFilterInput(props: ModalFilterInputProps) {
  const theme = useTheme();
  let inputRef: InputRenderable | undefined;

  // Auto-focus on mount. The 10ms defer works around the input not accepting
  // focus synchronously during its first render.
  createEffect(() => {
    setTimeout(() => inputRef?.focus(), 10);
  });

  return (
    <box paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}>
      <input
        ref={(r: InputRenderable) => {
          inputRef = r;
          props.ref?.(r);
        }}
        value={props.initialValue}
        onContentChange={() => {
          // Workaround: input doesn't fire onInput when cleared to empty.
          if (inputRef?.value === "") {
            props.onInput("");
          }
        }}
        onInput={(e: string) => {
          props.onInput(e);
        }}
        focusedBackgroundColor={theme.background}
        cursorColor={theme.primary}
        focusedTextColor={theme.text}
        placeholder={props.placeholder ?? "Type to filter..."}
      />
    </box>
  );
}
