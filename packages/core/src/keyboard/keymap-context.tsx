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
import { BaseCommands } from "./commands";
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

// Apps bind quit in a focus-within layer, so if a focus bug leaves nothing
// focused every layer goes dead and the app can only be killed. Run quit for
// its keys only then: after dispatch, unhandled, with no focused renderable.
// A global ctrl+c layer would be wrong, since it would beat an attached
// terminal (useKeyPassthrough) or a focused input to the key.
function installQuitFallback(keymap: AppKeymap, table: KeymapTable): void {
  const quitKeys = Object.values(table)
    .flat()
    .filter((spec) => spec.cmd === BaseCommands.APP_QUIT)
    .map((spec) => keymap.createKeyMatcher(spec.key));
  if (quitKeys.length === 0) return;

  keymap.intercept("key:after", (ctx) => {
    if (ctx.handled || ctx.focused !== null) return;
    if (!quitKeys.some((matches) => matches(ctx.event))) return;
    // runCommand reaches commands in inactive layers, which the app's quit
    // handler is while nothing holds focus.
    if (keymap.runCommand(BaseCommands.APP_QUIT).ok) {
      ctx.consume({ preventDefault: true, stopPropagation: true });
    }
  });
}

export function KeymapProvider(props: ParentProps<{ keymap: KeymapTable }>) {
  const keymap = createDefaultOpenTuiKeymap(useRenderer());
  registerFrameworkFields(keymap);
  installQuitFallback(keymap, props.keymap);

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
