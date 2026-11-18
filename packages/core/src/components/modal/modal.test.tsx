import { afterEach, beforeEach, describe, expect, test } from "bun:test";
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
import { BACKDROP_ALPHA, FRAME, PLAIN_FRAME, frameGlyphs } from "./chrome";

const table: KeymapTable = { app: baseAppBindings };
const BEHIND = "behind the modal";

// The frame's corners depend on which terminal the env names, so pin it: by
// default to none known, which draws the plain corners.
const TERMINAL_ENV = [
  "GHOSTTY_RESOURCES_DIR",
  "KITTY_WINDOW_ID",
  "WEZTERM_PANE",
  "TERM_PROGRAM",
  "TERM",
];
let savedEnv: Record<string, string | undefined> = {};
beforeEach(() => {
  savedEnv = Object.fromEntries(TERMINAL_ENV.map((k) => [k, process.env[k]]));
  for (const key of TERMINAL_ENV) delete process.env[key];
});

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

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
// Corners reuse the line glyphs, so a card's edges are its first and last.
const edges = (line: string, glyph: string): [number, number] => [
  line.indexOf(glyph),
  line.lastIndexOf(glyph),
];
const close = (): void => {};

describe("Modal chrome", () => {
  test("default: accent frame around an untouched content width", async () => {
    const { lines, cell } = await render(() => (
      <Modal size="sm" onClose={close}>
        <ModalHeader title="Title" />
        <text>body</text>
      </Modal>
    ));
    expect(lines.join("\n")).toMatchSnapshot();
    // sm is 50 wide; the frame sits outside it, so the card is 52.
    const [left, right] = edges(lines[2], FRAME.top);
    expect(right - left + 1).toBe(52);
    const bottom = lines.findIndex((l) => l.includes("body")) + 1;
    expect(edges(lines[bottom], FRAME.bottom)).toEqual([left, right]);
    expect(lines[3][left]).toBe(FRAME.left);
    expect(lines[3][right]).toBe(FRAME.right);
    expect(cell(left, 2).fg).toEqual(ints(defaultTheme.borderActive!));
    // The line hugs the top edge of a cell painted in the card's surface, so
    // the card ends exactly at the line.
    expect(cell(left + 1, 2).bg).toEqual(ints(defaultTheme.contentPane));
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
    expect(lines.join("")).not.toContain(FRAME.top);
    expect(lines.join("")).not.toContain(FRAME.left);
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
    // Their top lines run together, so find each card by its left side bar.
    const under = lines[3].indexOf(FRAME.left);
    const popupLeft = lines[3].indexOf(FRAME.left, under + 1);
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
    expect(lines[2]).toContain(FRAME.top);
    expect(cell(0, 0).fg).toEqual(ints("#eeeeee"));
  });

  test("a terminal known to draw the corner glyphs gets exact corners", async () => {
    process.env.GHOSTTY_RESOURCES_DIR = "/Applications/Ghostty.app";
    const { lines } = await render(() => (
      <Modal size="sm" onClose={close}>
        <text>body</text>
      </Modal>
    ));
    expect(lines.join("\n")).toMatchSnapshot();
    expect(lines[2]).toContain(FRAME.topLeft + FRAME.top);
    expect(lines[2]).toContain(FRAME.top + FRAME.topRight);
    expect(lines[4]).toContain(FRAME.bottomLeft + FRAME.bottom);
    expect(lines[4]).toContain(FRAME.bottom + FRAME.bottomRight);
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
    const [left, right] = edges(lines[2], FRAME.top);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeLessThan(30);
  });
});

describe("frameGlyphs", () => {
  test("unknown terminals get corners that render everywhere", () => {
    expect(frameGlyphs({})).toBe(PLAIN_FRAME);
    expect(frameGlyphs({ TERM_PROGRAM: "Apple_Terminal" })).toBe(PLAIN_FRAME);
    expect(frameGlyphs({ TERM_PROGRAM: "iTerm.app" })).toBe(PLAIN_FRAME);
    expect(frameGlyphs({ TERM_PROGRAM: "tmux" }, "tmux")).toBe(PLAIN_FRAME);
  });

  test("the terminal's XTVERSION name or env picks exact corners", () => {
    expect(frameGlyphs({}, "ghostty")).toBe(FRAME);
    expect(frameGlyphs({ TERM: "xterm-kitty" })).toBe(FRAME);
    expect(frameGlyphs({ TERM_PROGRAM: "WezTerm" })).toBe(FRAME);
  });

  test("under tmux, the outer terminal's env still counts", () => {
    const env = { TERM_PROGRAM: "tmux", GHOSTTY_RESOURCES_DIR: "/x" };
    expect(frameGlyphs(env, "tmux")).toBe(FRAME);
  });
});
