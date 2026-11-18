import { afterEach, describe, expect, test } from "bun:test";
import { batch, createSignal, Show, type JSX } from "solid-js";
import { testRender } from "@opentui/solid";
import { ThemeProvider } from "../theme";
import { Pane } from "../components/pane";
import { FocusProvider, useFocus, type FocusContextValue } from "./focus";

let destroy: (() => void) | undefined;
afterEach(() => destroy?.());

// `input` mounts only while `inputShown`, like a chat box shown for some items;
// `main` likewise with `mainShown`.
async function setup(opts: {
  panes: string[];
  inputShown?: boolean;
  mainShown?: boolean;
}) {
  const [inputShown, setInputShown] = createSignal(opts.inputShown ?? true);
  const [mainShown, setMainShown] = createSignal(opts.mainShown ?? true);
  const shown: Record<string, () => boolean> = {
    input: inputShown,
    main: mainShown,
  };
  let focus: FocusContextValue | undefined;

  function Shell(): JSX.Element {
    focus = useFocus();
    const [side, ...rest] = opts.panes;
    return (
      <box flexDirection="row">
        <Show when={focus.sidebarVisible()}>
          <Pane name={side} variant="sidebar">
            <text>{side}</text>
          </Pane>
        </Show>
        {rest.map((name) => (
          <Show when={(shown[name] ?? (() => true))()}>
            <Pane name={name} variant="content">
              <text>{name}</text>
            </Pane>
          </Show>
        ))}
      </box>
    );
  }

  const t = await testRender(
    () => (
      <ThemeProvider>
        <FocusProvider panes={opts.panes}>
          <Shell />
        </FocusProvider>
      </ThemeProvider>
    ),
    { width: 120, height: 10 },
  );
  destroy = () => t.renderer.destroy();
  const settle = async () => {
    await new Promise((r) => setTimeout(r, 20));
    await t.renderOnce();
  };
  await settle();
  const f = focus!;
  const cycle = async () => {
    f.cyclePane();
    await settle();
  };
  // Where real focus is: the pane whose box holds the renderer's focus.
  const realFocus = () => {
    const target = f.activePaneTarget();
    return target && t.renderer.currentFocusedRenderable === target
      ? f.state.activePane
      : undefined;
  };
  const nothingFocused = () => t.renderer.currentFocusedRenderable === null;
  return {
    focus: f,
    cycle,
    settle,
    realFocus,
    nothingFocused,
    setInputShown,
    setMainShown,
  };
}

const PANES = ["side", "main", "input"];

describe("cyclePane", () => {
  test("skips a pane that isn't mounted", async () => {
    const { cycle, realFocus } = await setup({
      panes: PANES,
      inputShown: false,
    });
    await cycle();
    expect(realFocus()).toBe("main");
    await cycle();
    expect(realFocus()).toBe("side");
  });

  test("reaches mounted panes in order", async () => {
    const { cycle, realFocus } = await setup({ panes: PANES });
    expect(realFocus()).toBe("side");
    await cycle();
    expect(realFocus()).toBe("main");
    await cycle();
    expect(realFocus()).toBe("input");
    await cycle();
    expect(realFocus()).toBe("side");
  });

  test("picks up a pane once it mounts", async () => {
    const { cycle, realFocus, settle, setInputShown } = await setup({
      panes: PANES,
      inputShown: false,
    });
    await cycle();
    setInputShown(true);
    await settle();
    await cycle();
    expect(realFocus()).toBe("input");
  });

  test("shows a hidden sidebar rather than skipping it", async () => {
    const { focus, cycle, settle, realFocus } = await setup({
      panes: PANES,
      inputShown: false,
    });
    focus.toggleSidebar();
    await settle();
    expect(focus.sidebarVisible()).toBe(false);
    expect(realFocus()).toBe("main");
    await cycle();
    expect(focus.sidebarVisible()).toBe(true);
    expect(realFocus()).toBe("side");
  });

  test("a single pane stays put", async () => {
    const { cycle, realFocus } = await setup({ panes: ["board"] });
    expect(realFocus()).toBe("board");
    await cycle();
    expect(realFocus()).toBe("board");
  });
});

describe("focus never lands nowhere", () => {
  test("focusing the hidden sidebar pane shows it", async () => {
    const { focus, settle, realFocus } = await setup({ panes: PANES });
    focus.toggleSidebar();
    await settle();
    expect(realFocus()).toBe("main");
    focus.setActivePane("side");
    await settle();
    expect(focus.sidebarVisible()).toBe(true);
    expect(realFocus()).toBe("side");
  });

  test("a focused pane that unmounts hands focus to the content pane", async () => {
    const { focus, settle, realFocus, nothingFocused, setInputShown } =
      await setup({ panes: PANES });
    focus.setActivePane("input");
    await settle();
    expect(realFocus()).toBe("input");
    setInputShown(false);
    await settle();
    expect(nothingFocused()).toBe(false);
    expect(realFocus()).toBe("main");
  });

  test("falls back to any mounted pane when the content pane is gone", async () => {
    const { focus, settle, realFocus, setMainShown } = await setup({
      panes: PANES,
    });
    focus.setActivePane("main");
    await settle();
    setMainShown(false);
    await settle();
    expect(realFocus()).toBe("side");
  });

  test("a pending pane still takes focus once it mounts", async () => {
    const { focus, settle, realFocus, setInputShown, setMainShown } =
      await setup({ panes: PANES, inputShown: false });
    focus.setActivePane("main");
    await settle();
    // Asked for before it mounts; then the focused pane goes away.
    focus.setActivePane("input");
    setMainShown(false);
    await settle();
    expect(realFocus()).toBe("side");
    setInputShown(true);
    await settle();
    expect(realFocus()).toBe("input");
  });

  test("a pane mounting in the same update takes focus over the fallback", async () => {
    const { focus, settle, realFocus, setInputShown, setMainShown } =
      await setup({ panes: PANES, inputShown: false });
    focus.setActivePane("main");
    await settle();
    focus.setActivePane("input");
    batch(() => {
      setMainShown(false);
      setInputShown(true);
    });
    await settle();
    expect(realFocus()).toBe("input");
  });

  test("closing a modal over an unmounted pane falls back", async () => {
    const { focus, settle, realFocus, nothingFocused, setInputShown } =
      await setup({ panes: PANES });
    focus.setActivePane("input");
    await settle();
    focus.openModal("help");
    setInputShown(false);
    await settle();
    focus.closeModal();
    await settle();
    expect(nothingFocused()).toBe(false);
    expect(realFocus()).toBe("main");
  });
});
