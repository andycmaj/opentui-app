// Entry point: boot the app through the framework's runApp harness.

import { runApp } from "@opentui-app/core";
import { App } from "./app";

await runApp(() => <App />);
