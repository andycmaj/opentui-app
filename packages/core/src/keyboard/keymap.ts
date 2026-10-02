// Declarative keybinding types and the framework's base bindings.
//
// An app's keymap is a table from scope to bindings. A scope names a keymap
// layer: "app" for bindings that apply anywhere in the pane layout, a pane id
// ("tree", "content", ...) for bindings active while focus is within that pane.
// Components register the handlers for a scope with `useScope`; the table stays
// the single place a binding (and its help text) is described.

import { BaseCommands, ModalCommands, type Command } from "./commands";

export type Scope = string;

// `Ctx` is the app's help context (e.g. the selected item), consumed only by
// `relevant`. It defaults to `unknown` so framework code can accept any app's
// table.
export interface BindingSpec<Ctx = unknown> {
  // @opentui/keymap key syntax: "j", "return", "ctrl+p", "shift+g". Upper-case
  // letters do not imply shift, so spell out "shift+".
  key: string;
  cmd: Command;
  desc: string;
  // When set, the binding is shown in the footer/palette with this label.
  help?: string;
  // When set, the binding is only shown in the footer/help while this returns
  // true. It never gates dispatch. Method syntax keeps `BindingSpec<Ctx>`
  // assignable to `BindingSpec`.
  relevant?(ctx: Ctx): boolean;
}

export type KeymapTable<Ctx = unknown> = Record<Scope, BindingSpec<Ctx>[]>;

// App-level bindings common to every app built on the framework.
export const baseAppBindings: BindingSpec[] = [
  { key: "ctrl+p", cmd: BaseCommands.PALETTE_OPEN, desc: "palette" },
  {
    key: ":",
    cmd: BaseCommands.PALETTE_OPEN,
    desc: "command palette",
    help: "commands",
  },
  { key: "q", cmd: BaseCommands.APP_QUIT, desc: "quit" },
  { key: "ctrl+c", cmd: BaseCommands.APP_QUIT, desc: "quit" },
  { key: "ctrl+e", cmd: BaseCommands.SIDEBAR_TOGGLE, desc: "sidebar" },
  { key: "tab", cmd: BaseCommands.FOCUS_NEXT, desc: "switch" },
  {
    key: "?",
    cmd: BaseCommands.HELP_OPEN,
    desc: "keyboard help",
    help: "help",
  },
];

// Standard vim-style navigation (j/k, arrows, g/G, PgUp/PgDn). Every navigable
// pane in an app typically shares these.
export function navBindings(): BindingSpec[] {
  return [
    { key: "j", cmd: BaseCommands.NAV_DOWN, desc: "down" },
    { key: "down", cmd: BaseCommands.NAV_DOWN, desc: "down" },
    { key: "k", cmd: BaseCommands.NAV_UP, desc: "up" },
    { key: "up", cmd: BaseCommands.NAV_UP, desc: "up" },
    { key: "g", cmd: BaseCommands.NAV_TOP, desc: "top" },
    { key: "shift+g", cmd: BaseCommands.NAV_BOTTOM, desc: "bottom" },
    { key: "pageup", cmd: BaseCommands.SCROLL_PAGEUP, desc: "pgup" },
    { key: "pagedown", cmd: BaseCommands.SCROLL_PAGEDOWN, desc: "pgdn" },
  ];
}

// Movement for list-style modals. Only non-printing keys, so a filter input
// inside the modal still receives every typed character.
export const modalNavBindings: BindingSpec[] = [
  { key: "up", cmd: ModalCommands.MODAL_UP, desc: "up" },
  { key: "ctrl+k", cmd: ModalCommands.MODAL_UP, desc: "up" },
  { key: "down", cmd: ModalCommands.MODAL_DOWN, desc: "down" },
  { key: "ctrl+j", cmd: ModalCommands.MODAL_DOWN, desc: "down" },
  { key: "return", cmd: ModalCommands.MODAL_SELECT, desc: "select" },
];
