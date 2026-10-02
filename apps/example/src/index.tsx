// Entry point: boot the app through the framework's runApp harness.

import { runApp } from "@andycmaj/opentui-app";
import { App } from "./app";

await runApp(() => <App />);
