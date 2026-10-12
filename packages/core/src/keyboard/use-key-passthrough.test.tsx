import { afterEach, describe, expect, test } from "bun:test";
import { createSignal, type JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import type { Renderable } from "@opentui/core";
import { ThemeProvider } from "../theme";
import { FocusProvider, useFocus } from "../context/focus";
import { Pane } from "../components/pane";
import { BaseCommands } from "./commands";
import { KeymapProvider } from "./keymap-context";
import { baseAppBindings, navBindings, type KeymapTable } from "./keymap";
import { useScope } from "./use-scope";
import { useKeyPassthrough } from "./use-key-passthrough";

const table: KeymapTable = {
  app: baseAppBindings,
  tree: navBindings(),
  term: [{ key: "ctrl+]", cmd: "term.detach", desc: "detach", help: "detach" }],
};

const [enabled, setEnabled] = createSignal(true);

function Shell(props: { log: string[] }) {
  const focus = useFocus();
  let layout: Renderable | undefined;
  let tree: Renderable | undefined;
  let term: Renderable | undefined;

  useScope(
    "app",
    {
      [BaseCommands.APP_QUIT]: () => props.log.push("quit"),
      [BaseCommands.FOCUS_NEXT]: () => focus.cyclePane(),
      [BaseCommands.PALETTE_OPEN]: () => props.log.push("palette"),
    },
    { target: () => layout },
  );
  useScope(
    "tree",
    { [BaseCommands.NAV_DOWN]: () => props.log.push("tree:down") },
    { target: () => tree },
  );
  useScope(
    "term",
    {
      "term.detach": () => {
        props.log.push("detach");
        focus.setActivePane("tree");
      },
    },
    { target: () => term },
  );
  useKeyPassthrough("term", (e) => props.log.push(`pty:${e.name}`), {
    target: () => term,
    enabled,
  });

  return (
    <box ref={(r: Renderable) => (layout = r)} flexDirection="row">
      <Pane name="tree" variant="sidebar" ref={(r) => (tree = r)}>
        <text>tree</text>
      </Pane>
      <Pane name="term" variant="content" ref={(r) => (term = r)}>
        <text>term</text>
      </Pane>
    </box>
  );
}

let destroy: (() => void) | undefined;
afterEach(() => {
  destroy?.();
  setEnabled(true);
});

async function setup() {
  const log: string[] = [];
  const Root = (): JSX.Element => (
    <ThemeProvider>
      <FocusProvider panes={["tree", "term"]}>
        <KeymapProvider keymap={table}>
          <Shell log={log} />
        </KeymapProvider>
      </FocusProvider>
    </ThemeProvider>
  );
  const t = await testRender(Root, { width: 80, height: 20 });
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
  return { log, press };
}

describe("useKeyPassthrough", () => {
  test("while focused, app and pane keys go to the handler instead", async () => {
    const { log, press } = await setup();
    await press("TAB");
    await press("q");
    await press(":");
    await press("TAB");
    await press("c", { ctrl: true });
    expect(log).toEqual(["pty:q", "pty::", "pty:tab", "pty:c"]);
  });

  test("the scope's own bindings still dispatch", async () => {
    const { log, press } = await setup();
    await press("TAB");
    await press("]", { ctrl: true });
    await press("j");
    expect(log).toEqual(["detach", "tree:down"]);
  });

  test("outside the target, keys dispatch normally", async () => {
    const { log, press } = await setup();
    await press("j");
    await press("q");
    expect(log).toEqual(["tree:down", "quit"]);
  });

  test("disabled passthrough leaves keys to the keymap", async () => {
    const { log, press } = await setup();
    await press("TAB");
    setEnabled(false);
    await press("q");
    expect(log).toEqual(["quit"]);
  });
});
