// Anything on the page (header buttons, palette actions) can open an overlay
// without importing the island that owns them.

export const Overlay = {
  PALETTE: "palette",
  SEARCH: "search",
  HELP: "help",
} as const;
export type Overlay = (typeof Overlay)[keyof typeof Overlay];

const OPEN_EVENT = "opentui-apps:open";

export function openOverlay(overlay: Overlay): void {
  document.dispatchEvent(
    new CustomEvent<Overlay>(OPEN_EVENT, { detail: overlay }),
  );
}

export function onOpenOverlay(handler: (overlay: Overlay) => void): () => void {
  const listener = (e: Event): void => {
    if (e instanceof CustomEvent && Object.values(Overlay).includes(e.detail)) {
      handler(e.detail);
    }
  };
  document.addEventListener(OPEN_EVENT, listener);
  return () => document.removeEventListener(OPEN_EVENT, listener);
}
