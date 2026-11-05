// Records a TUI session as an asciinema v2 cast: runs the command in a Bun
// PTY, replays a key script into it, and timestamps everything it prints.
// No tmux or asciinema install needed, and timing comes from the script, so
// re-recording gives the same cast.
//
//   bun run scripts/record.ts --cwd ../example --keys ../example/demo/keymaps.keys \
//     --out public/casts/keymaps.cast -- \
//     bun run --conditions=browser --preload @opentui/solid/preload src/index.tsx keymaps
//
// Run the app directly rather than through a package.json script, or the
// cast starts with Bun's "$ <command>" echo.
//
// Key script, one step per line (blank lines and `#` comments ignored):
//   key j            a key: a character, or tab, enter, esc, space, backspace,
//                    up, down, left, right, pageup, pagedown, ctrl+x, shift+g
//   type some text   literal text
//   wait 1200        pause for N ms (on top of the default pause)
// Each step is followed by --pause ms (default 700).

import { parseArgs } from "node:util";
import { resolve } from "node:path";

const NAMED_KEYS: Record<string, string> = {
  tab: "\t",
  enter: "\r",
  return: "\r",
  esc: "\x1b",
  escape: "\x1b",
  space: " ",
  backspace: "\x7f",
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  pageup: "\x1b[5~",
  pagedown: "\x1b[6~",
};

export type Step =
  | { kind: "send"; data: string }
  | { kind: "wait"; ms: number };

export function encodeKey(key: string): string {
  const named = NAMED_KEYS[key.toLowerCase()];
  if (named) return named;
  const [mod, rest] =
    key.includes("+") && key.length > 1
      ? key.split(/\+(.+)/)
      : [undefined, key];
  if (mod === "ctrl" && rest && rest.length === 1) {
    return String.fromCharCode(rest.toLowerCase().charCodeAt(0) & 0x1f);
  }
  if (mod === "shift" && rest && rest.length === 1) return rest.toUpperCase();
  if (key.length === 1) return key;
  throw new Error(`unknown key "${key}"`);
}

export function parseKeyScript(text: string): Step[] {
  const steps: Step[] = [];
  for (const [i, raw] of text.split("\n").entries()) {
    const line = raw.replace(/\s+#.*$/, "").trim();
    if (!line || line.startsWith("#")) continue;
    const [verb, ...args] = line.split(/\s+/);
    const arg = line.slice(verb!.length).trim();
    if (verb === "key") {
      for (const k of args) steps.push({ kind: "send", data: encodeKey(k) });
    } else if (verb === "type") {
      steps.push({ kind: "send", data: arg });
    } else if (verb === "wait") {
      const ms = Number(arg);
      if (!Number.isFinite(ms))
        throw new Error(`line ${i + 1}: wait needs a number`);
      steps.push({ kind: "wait", ms });
    } else {
      throw new Error(`line ${i + 1}: unknown step "${verb}"`);
    }
  }
  return steps;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const dash = process.argv.indexOf("--");
  if (dash === -1)
    throw new Error("usage: record.ts [options] -- <command...>");
  const command = process.argv.slice(dash + 1);
  const { values } = parseArgs({
    args: process.argv.slice(2, dash),
    options: {
      cwd: { type: "string", default: "." },
      keys: { type: "string" },
      out: { type: "string" },
      cols: { type: "string", default: "120" },
      rows: { type: "string", default: "32" },
      pause: { type: "string", default: "700" },
      // Time for the app to start and draw before the first key.
      startup: { type: "string", default: "2500" },
      env: { type: "string", multiple: true, default: [] },
      title: { type: "string" },
    },
  });
  if (!values.keys || !values.out)
    throw new Error("--keys and --out are required");

  const steps = parseKeyScript(await Bun.file(values.keys).text());
  const cols = Number(values.cols);
  const rows = Number(values.rows);
  const pause = Number(values.pause);
  const extraEnv = Object.fromEntries(
    values.env.map((kv) => kv.split(/=(.*)/s).slice(0, 2)),
  );

  const events: string[] = [];
  const start = performance.now();
  const decoder = new TextDecoder();
  const proc = Bun.spawn(command, {
    cwd: resolve(values.cwd),
    env: {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      ...extraEnv,
    },
    terminal: {
      cols,
      rows,
      data: (_terminal, data) => {
        const t = (performance.now() - start) / 1000;
        const text = decoder.decode(data, { stream: true });
        if (text)
          events.push(JSON.stringify([Number(t.toFixed(4)), "o", text]));
      },
    },
  });

  await sleep(Number(values.startup));
  for (const step of steps) {
    if (step.kind === "wait") {
      await sleep(step.ms);
      continue;
    }
    proc.terminal?.write(step.data);
    await sleep(pause);
  }
  // Stop the clock before killing: the app's exit restores the shell screen,
  // which shouldn't end up as the cast's last frame.
  const end = (performance.now() - start) / 1000;
  const frames = events.length;
  proc.kill();
  await proc.exited;
  events.length = frames;

  const header = {
    version: 2,
    width: cols,
    height: rows,
    timestamp: Math.floor(Date.now() / 1000),
    // Long gaps (startup, slow data) play back at most this long.
    idle_time_limit: 1.5,
    ...(values.title ? { title: values.title } : {}),
    env: { TERM: "xterm-256color" },
  };
  await Bun.write(
    values.out,
    [JSON.stringify(header), ...events].join("\n") + "\n",
  );
  console.log(
    `recorded ${events.length} frames over ${end.toFixed(1)}s, ${steps.length} steps -> ${values.out}`,
  );
}

if (import.meta.main) await main();
