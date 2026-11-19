import { afterEach, describe, expect, test } from "bun:test";
import type { JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import type { InputRenderable, Renderable } from "@opentui/core";
import { BaseCommands } from "./commands";
import { KeymapProvider } from "./keymap-context";
import { baseAppBindings, type KeymapTable } from "./keymap";
import { useScope } from "./use-scope";
import { useKeyPassthrough } from "./use-key-passthrough";

const table: KeymapTable = {
  app: baseAppBindings,
  term: [{ key: "ctrl+]", cmd: "term.detach", desc: "detach" }],
};

interface Refs {
  term?: Renderable;
  input?: InputRenderable;
}

// The app layer is focus-within the layout, as in a real shell. The input sits
// outside it, standing in for a focused renderable no app layer covers.
function Shell(props: { log: string[]; refs: Refs }) {
  let layout: Renderable | undefined;

  useScope(
    "app",
    { [BaseCommands.APP_QUIT]: () => props.log.push("quit") },
    { target: () => layout },
  );
  useKeyPassthrough("term", (e) => props.log.push(`pty:${e.name}`), {
    target: () => props.refs.term,
  });

  return (
    <box flexDirection="column">
      <box ref={(r: Renderable) => (layout = r)}>
        <box ref={(r: Renderable) => (props.refs.term = r)} focusable>
          <text>term</text>
        </box>
      </box>
      <input ref={(r: InputRenderable) => (props.refs.input = r)} />
    </box>
  );
}

let destroy: (() => void) | undefined;
afterEach(() => destroy?.());

async function setup() {
  const log: string[] = [];
  const refs: Refs = {};
  const Root = (): JSX.Element => (
    <KeymapProvider keymap={table}>
      <Shell log={log} refs={refs} />
    </KeymapProvider>
  );
  const t = await testRender(Root, {
    width: 80,
    height: 20,
    // As runApp: the keymap owns ctrl+c.
    exitOnCtrlC: false,
  });
  destroy = () => t.renderer.destroy();
  const settle = async () => {
    await new Promise((r) => setTimeout(r, 20));
    await t.renderOnce();
  };
  const press = async (
    key: string,
    mods?: { shift?: boolean; ctrl?: boolean },
  ) => {
    t.mockInput.pressKey(key, mods);
    await settle();
  };
  await settle();
  return { log, refs, press, renderer: t.renderer, settle };
}

describe("quit with nothing focused", () => {
  test("ctrl+c and q run the app's quit handler", async () => {
    const { log, press, renderer } = await setup();
    expect(renderer.currentFocusedRenderable).toBeNull();
    await press("c", { ctrl: true });
    await press("q");
    expect(log).toEqual(["quit", "quit"]);
  });

  test("an attached terminal keeps ctrl+c", async () => {
    const { log, refs, press, settle } = await setup();
    refs.term?.focus();
    await settle();
    await press("c", { ctrl: true });
    expect(log).toEqual(["pty:c"]);
  });

  test("a focused input outside every layer keeps ctrl+c", async () => {
    const { log, refs, press, settle } = await setup();
    refs.input?.focus();
    await settle();
    await press("c", { ctrl: true });
    await press("q");
    expect(log).toEqual([]);
    expect(refs.input?.value).toBe("q");
  });

  test("focus lost after being held still reaches quit", async () => {
    const { log, refs, press, renderer, settle } = await setup();
    refs.term?.focus();
    await settle();
    refs.term?.blur();
    await settle();
    expect(renderer.currentFocusedRenderable).toBeNull();
    await press("c", { ctrl: true });
    expect(log).toEqual(["quit"]);
  });
});
