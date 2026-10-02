// Creates the app's @opentui/keymap engine and provides it, together with the
// app's declarative binding table, to the framework's shell components
// (Footer, KeyboardHelp, Modal) and to useScope.

import { createContext, useContext, type ParentProps } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { createDefaultOpenTuiKeymap } from "@opentui/keymap/opentui";
import {
  KeymapProvider as EngineProvider,
  useKeymap,
} from "@opentui/keymap/solid";
import type { KeymapTable } from "./keymap";

export { useKeymap };
export type AppKeymap = ReturnType<typeof useKeymap>;

const KeymapTableContext = createContext<KeymapTable>();

// Copies the framework's binding fields into binding attrs so help queries can
// read them back off `getCommandEntries`.
function registerFrameworkFields(keymap: AppKeymap): void {
  keymap.registerBindingFields({
    help(value, ctx) {
      if (typeof value === "string") ctx.attr("help", value);
    },
    scope(value, ctx) {
      if (typeof value === "string") ctx.attr("scope", value);
    },
    relevant(value, ctx) {
      if (typeof value === "function") ctx.attr("relevant", value);
    },
  });
}

export function KeymapProvider(props: ParentProps<{ keymap: KeymapTable }>) {
  const keymap = createDefaultOpenTuiKeymap(useRenderer());
  registerFrameworkFields(keymap);

  return (
    <EngineProvider keymap={keymap}>
      <KeymapTableContext.Provider value={props.keymap}>
        {props.children}
      </KeymapTableContext.Provider>
    </EngineProvider>
  );
}

export function useKeymapTable(): KeymapTable {
  const table = useContext(KeymapTableContext);
  if (!table) {
    throw new Error("useKeymapTable must be used within a KeymapProvider");
  }
  return table;
}
