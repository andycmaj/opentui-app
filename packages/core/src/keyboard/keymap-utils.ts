// Help/footer/palette derivations. The footer and palette read the bindings
// reachable from the focused pane off the live keymap; the keyboard-help modal
// reads every scope from the declarative table. Either way a binding is only
// ever described once.

import type { Renderable } from "@opentui/core";
import { BaseCommands, type Command } from "./commands";
import type { BindingSpec, KeymapTable, Scope } from "./keymap";
import type { AppKeymap } from "./keymap-context";

export interface KeyStroke {
  name: string;
  ctrl?: boolean;
  shift?: boolean;
}

const SPECIAL_NAMES: Record<string, string> = {
  return: "Enter",
  tab: "Tab",
};

// ^e for ctrl+e, G for shift+g, friendly names for special keys.
export function formatStroke(stroke: KeyStroke): string {
  let display = stroke.name;
  if (stroke.ctrl) display = `^${display}`;
  if (stroke.shift) display = display.toUpperCase();
  return SPECIAL_NAMES[display] ?? display;
}

// Parse a single-stroke binding key ("ctrl+p", "shift+g", "?") for display.
export function parseKey(key: string): KeyStroke {
  const parts = key.split("+");
  const name = parts.pop() ?? key;
  // A trailing "+" (the plus key itself) leaves an empty name.
  if (name === "") return { name: "+" };
  const mods = new Set(parts.map((p) => p.toLowerCase()));
  return {
    name,
    ctrl: mods.has("ctrl") || mods.has("control"),
    shift: mods.has("shift"),
  };
}

export function formatKey(key: string): string {
  return formatStroke(parseKey(key));
}

// A binding as the help surfaces see it.
export interface HelpBinding<Ctx = unknown> {
  cmd: Command;
  keys: string;
  desc: string;
  help?: string;
  // The scope whose layer registered the binding.
  scope?: Scope;
  relevant?: (ctx: Ctx) => boolean;
}

/**
 * Bindings reachable from `focused` (the current focus when omitted), in
 * dispatch order: the innermost layer first, then enclosing layers.
 */
export function reachableBindings(
  keymap: AppKeymap,
  focused?: Renderable | null,
): HelpBinding[] {
  const entries = keymap.getCommandEntries(
    focused === undefined
      ? { visibility: "reachable" }
      : { visibility: "reachable", focused },
  );
  const result: HelpBinding[] = [];
  for (const entry of entries) {
    for (const binding of entry.bindings) {
      const stroke = binding.sequence[0]?.stroke;
      if (!stroke) continue;
      const attrs = binding.attrs ?? {};
      result.push({
        cmd: entry.command.name,
        keys: binding.sequence
          .map((part) => formatStroke(part.stroke))
          .join(""),
        desc: typeof attrs.desc === "string" ? attrs.desc : entry.command.name,
        help: typeof attrs.help === "string" ? attrs.help : undefined,
        scope: typeof attrs.scope === "string" ? attrs.scope : undefined,
        relevant:
          typeof attrs.relevant === "function"
            ? (attrs.relevant as (ctx: unknown) => boolean)
            : undefined,
      });
    }
  }
  return result;
}

// A scope's bindings from the table, formatted for the keyboard-help modal.
export function getScopeBindings<Ctx>(
  table: KeymapTable<Ctx>,
  scope: Scope,
): HelpBinding<Ctx>[] {
  return (table[scope] ?? []).map((spec: BindingSpec<Ctx>) => ({
    cmd: spec.cmd,
    keys: formatKey(spec.key),
    desc: spec.desc,
    help: spec.help,
    scope,
    relevant: spec.relevant?.bind(spec),
  }));
}

// Drop bindings whose `relevant` predicate rejects the given context.
// Bindings without a predicate are always relevant.
export function filterRelevant<Ctx>(
  bindings: HelpBinding<Ctx>[],
  ctx: Ctx,
): HelpBinding<Ctx>[] {
  return bindings.filter((b) => b.relevant?.(ctx) ?? true);
}

export interface HelpItem {
  keys: string;
  text: string;
}

export interface HelpItemOptions {
  // Collapse related commands into a single display (e.g. NAV_DOWN -> "j/k").
  combinedKeys?: Record<string, string>;
  // Commands to skip because they're folded into a combined display.
  skipCommands?: Set<Command>;
}

// The framework's default combined displays for the base navigation bindings.
const DEFAULT_COMBINED: Record<string, string> = {
  [BaseCommands.NAV_DOWN]: "j/k",
  [BaseCommands.NAV_TOP]: "g/G",
};

const DEFAULT_SKIP = new Set<Command>([
  BaseCommands.NAV_UP,
  BaseCommands.NAV_BOTTOM,
]);

/**
 * Footer hints: bindings that opt into help, de-duplicated by command (the
 * first, innermost binding wins), with related commands folded into one
 * display.
 */
export function getHelpItems(
  bindings: HelpBinding[],
  options: HelpItemOptions = {},
): HelpItem[] {
  const combinedKeys = { ...DEFAULT_COMBINED, ...options.combinedKeys };
  const skipCommands = options.skipCommands ?? DEFAULT_SKIP;

  const seen = new Set<string>();
  const items: HelpItem[] = [];

  for (const binding of bindings) {
    if (!binding.help) continue;
    if (seen.has(binding.cmd) || skipCommands.has(binding.cmd)) continue;
    seen.add(binding.cmd);
    items.push({
      keys: combinedKeys[binding.cmd] ?? binding.keys,
      text: binding.help,
    });
  }

  return items;
}
