// Registers one keymap layer for a scope: the scope's bindings from the app's
// table (plus any extras) wired to the given command handlers.

import type { Renderable } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";
import type { Command } from "./commands";
import type { BindingSpec, Scope } from "./keymap";
import { useKeymapTable } from "./keymap-context";

// A handler may return exactly false to decline the key, letting it fall
// through to lower layers or the focused renderable (e.g. a text input).
export type CommandHandlers = Partial<Record<Command, () => unknown>>;

export interface ScopeOptions {
  // Layer is active while focus is within this renderable. Omit for a global
  // layer.
  target?: () => Renderable | null | undefined;
  // Higher runs first. Modals use MODAL_PRIORITY to shadow everything else.
  priority?: number;
  // Bindings beyond the table's entry for this scope.
  bindings?: BindingSpec[];
}

export const MODAL_PRIORITY = 100;

/**
 * Bind a scope's keys to handlers. Only bindings whose command has a handler
 * are registered, so a scope never swallows a key it can't act on.
 *
 * Handlers are read once; they should read reactive state when they run.
 */
export function useScope(
  scope: Scope,
  handlers: CommandHandlers,
  options: ScopeOptions = {},
): void {
  const table = useKeymapTable();
  const specs = [...(table[scope] ?? []), ...(options.bindings ?? [])].filter(
    (spec) => handlers[spec.cmd],
  );

  const commands = Object.entries(handlers).map(([name, handler]) => ({
    name,
    title: specs.find((spec) => spec.cmd === name)?.desc,
    run() {
      return handler?.() === false ? false : undefined;
    },
  }));

  const bindings = specs.map((spec) => ({
    key: spec.key,
    cmd: spec.cmd,
    desc: spec.desc,
    scope,
    ...(spec.help ? { help: spec.help } : {}),
    ...(spec.relevant
      ? { relevant: (ctx: unknown) => spec.relevant?.(ctx) ?? true }
      : {}),
  }));

  // useBindings re-registers when anything read here changes, so only the
  // target accessor is read inside.
  useBindings(() =>
    options.target
      ? {
          target: options.target,
          priority: options.priority,
          commands,
          bindings,
        }
      : { priority: options.priority, commands, bindings },
  );
}
