import { afterEach, describe, expect, test } from "bun:test";
import { Show, type JSX } from "solid-js";
import { createSignal } from "solid-js";
import { RGBA } from "@opentui/core";
import { testRender } from "@opentui/solid";
import { ThemeProvider } from "../../theme";
import { defaultTheme, type ThemeName } from "../../theme/theme";
import { FocusProvider } from "../../context/focus";
import { KeymapProvider } from "../../keyboard/keymap-context";
import { baseAppBindings, type KeymapTable } from "../../keyboard/keymap";
import { Modal } from "./modal";
import { ModalHeader } from "./modal-header";
import { BACKDROP_ALPHA } from "./chrome";

const table: KeymapTable = { app: baseAppBindings };
const BEHIND = "behind the modal";

let destroy: (() => void) | undefined;
afterEach(() => destroy?.());

interface Rendered {
  lines: string[];
  // The fg/bg of the cell at (x, y).
  cell: (x: number, y: number) => { fg: number[]; bg: number[] };
}

async function render(
  modals: (popup: () => boolean) => JSX.Element,
  opts: { width?: number; theme?: ThemeName; popup?: boolean } = {},
): Promise<Rendered> {
  const [popup] = createSignal(opts.popup ?? false);
  const Root = (): JSX.Element => (
    <ThemeProvider name={opts.theme}>
      <FocusProvider panes={[]}>
        <KeymapProvider keymap={table}>
          <box width="100%" height="100%" backgroundColor="#0a0a0a">
            {/* A screen's worth of text the modal sits over. */}
            {Array.from({ length: 14 }, () => (
              <text fg="#eeeeee">{BEHIND.repeat(8)}</text>
            ))}
            {modals(popup)}
          </box>
        </KeymapProvider>
      </FocusProvider>
    </ThemeProvider>
  );
  const width = opts.width ?? 80;
  const t = await testRender(Root, { width, height: 14 });
  destroy = () => t.renderer.destroy();
  await t.renderOnce();
  const lines = t.captureCharFrame().split("\n");
  const spans = t.captureSpans().lines;
  const cell = (x: number, y: number): { fg: number[]; bg: number[] } => {
    let at = 0;
    for (const span of spans[y].spans) {
      if (x < at + span.width) {
        return { fg: span.fg.toInts(), bg: span.bg.toInts() };
      }
      at += span.width;
    }
    throw new Error(`no cell at ${x},${y}`);
  };
  return { lines, cell };
}

const ints = (hex: string): number[] => RGBA.fromHex(hex).toInts();
const close = (): void => {};

describe("Modal chrome", () => {
  test("default: rounded accent border around an untouched content width", async () => {
    const { lines, cell } = await render(() => (
      <Modal size="sm" onClose={close}>
        <ModalHeader title="Title" />
        <text>body</text>
      </Modal>
    ));
    expect(lines.join("\n")).toMatchSnapshot();
    // sm is 50 wide; the border sits outside it, so the card is 52.
    const top = lines[2];
    const left = top.indexOf("╭");
    expect(top.indexOf("╮") - left + 1).toBe(52);
    expect(lines[lines.findIndex((l) => l.includes("body")) + 1]).toContain(
      "╰",
    );
    expect(cell(left, 2).fg).toEqual(ints(defaultTheme.borderActive!));
  });

  test("default: the screen behind fades toward the app background", async () => {
    const { lines, cell } = await render(() => (
      <Modal size="sm" onClose={close}>
        <text>body</text>
      </Modal>
    ));
    // The text behind stays readable but dimmer.
    expect(lines[0]).toContain(BEHIND);
    const fg = cell(0, 0).fg;
    const expected = Math.round(
      0xee * (1 - BACKDROP_ALPHA) + 0x0a * BACKDROP_ALPHA,
    );
    expect(Math.abs(fg[0] - expected)).toBeLessThanOrEqual(1);
  });

  test("border={false} backdrop={false} keeps the old look", async () => {
    const { lines, cell } = await render(() => (
      <Modal size="sm" onClose={close} border={false} backdrop={false}>
        <text>body</text>
      </Modal>
    ));
    expect(lines.join("\n")).toMatchSnapshot();
    expect(lines.join("")).not.toContain("╭");
    expect(cell(0, 0).fg).toEqual(ints("#eeeeee"));
    // Card is exactly the preferred width, so content starts at its edge.
    expect(lines[2].indexOf("body")).toBe(40 - 25);
  });

  test("a popup over a modal: only the top one wears the accent", async () => {
    const { lines, cell } = await render(
      (popup) => (
        <>
          <Modal size="md" onClose={close}>
            <ModalHeader title="Under" />
            <box height={8} />
          </Modal>
          <Show when={popup()}>
            <Modal size="sm" width={30} onClose={close}>
              <box marginTop={3}>
                <ModalHeader title="Popup" />
              </box>
            </Modal>
          </Show>
        </>
      ),
      { popup: true },
    );
    expect(lines.join("\n")).toMatchSnapshot();
    // Both cards open at the same top row; the popup is the inner corner.
    const under = lines[2].indexOf("╭");
    const popupLeft = lines[2].indexOf("╭", under + 1);
    const accent = ints(defaultTheme.borderActive!);
    expect(cell(popupLeft, 2).fg).toEqual(accent);
    // The modal underneath is both demoted to the plain border and faded by
    // the popup's backdrop.
    expect(cell(under, 2).fg).not.toEqual(accent);
    expect(cell(under, 2).fg).not.toEqual(ints(defaultTheme.border!));
  });

  test("transparent theme: border, but no backdrop", async () => {
    const { lines, cell } = await render(
      () => (
        <Modal size="sm" onClose={close}>
          <text>body</text>
        </Modal>
      ),
      { theme: "terminal" },
    );
    expect(lines[2]).toContain("╭");
    expect(cell(0, 0).fg).toEqual(ints("#eeeeee"));
  });

  test("narrow terminal: the bordered card still fits", async () => {
    const { lines } = await render(
      () => (
        <Modal size="lg" onClose={close}>
          <text>body</text>
        </Modal>
      ),
      { width: 30 },
    );
    expect(lines.join("\n")).toMatchSnapshot();
    const top = lines[2];
    expect(top.indexOf("╭")).toBeGreaterThanOrEqual(0);
    expect(top.indexOf("╮")).toBeLessThan(30);
  });
});
