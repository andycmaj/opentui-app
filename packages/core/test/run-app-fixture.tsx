// Spawned by run-app.test.ts under a PTY: boots runApp holding a live timer (the
// kind of open handle that kept apps alive after their terminal closed). opentui
// captures console and stdout, so progress goes to the file named in argv.
//   argv: <logFile> [quit] [no-exit] [exit-code]
import { appendFileSync } from "fs";
import { getGlobalRenderer, runApp } from "../src/boot";

const [logFile = "", ...flags] = process.argv.slice(2);
const log = (line: string): void => appendFileSync(logFile, `${line}\n`);

setInterval(() => {}, 1000);
await runApp(() => <text>fixture</text>, {
  onDestroy: () => {
    log("destroyed");
    if (flags.includes("exit-code")) process.exitCode = 3;
  },
  exitOnDestroy: !flags.includes("no-exit"),
});
log("ready");
// The renderer registers itself on mount, after render() resolves.
if (flags.includes("quit"))
  setTimeout(() => getGlobalRenderer()?.destroy(), 50);
