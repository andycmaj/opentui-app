// Base command ids provided by the framework. Apps extend these with their own
// string ids (e.g. `export const Commands = { ...BaseCommands, PR_MERGE: "pr.merge" }`).

export const BaseCommands = {
  // App-level
  APP_QUIT: "app.quit",
  PALETTE_OPEN: "app.palette",
  HELP_OPEN: "app.help",

  // Focus / layout
  FOCUS_NEXT: "focus.next",
  SIDEBAR_TOGGLE: "focus.sidebar.toggle",

  // Navigation (shared across panes)
  NAV_DOWN: "nav.down",
  NAV_UP: "nav.up",
  NAV_TOP: "nav.top",
  NAV_BOTTOM: "nav.bottom",

  // Scrolling
  SCROLL_PAGEUP: "scroll.pageup",
  SCROLL_PAGEDOWN: "scroll.pagedown",
} as const;

// Commands every modal layer understands. `Modal` owns MODAL_CLOSE; list-style
// modals supply handlers for the rest.
export const ModalCommands = {
  MODAL_CLOSE: "modal.close",
  MODAL_UP: "modal.up",
  MODAL_DOWN: "modal.down",
  MODAL_SELECT: "modal.select",
} as const;

// A command is just a string id, so apps can add their own without augmenting
// a union.
export type Command = string;
