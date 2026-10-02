// Generic loader for a JSON config at ~/.config/<appName>/config.json. Apps
// supply a `compile` that validates/normalizes the raw JSON into their runtime
// settings shape, and `defaults` for when the file is missing or unreadable.

import { homedir } from "node:os";
import { join } from "node:path";

export interface ConfigStoreOptions<TRaw, TRuntime> {
  appName: string;
  fileName?: string;
  compile: (raw: Partial<TRaw>) => TRuntime;
  defaults: () => TRuntime;
}

export interface ConfigStore<TRuntime> {
  getConfigPath: () => string;
  load: () => Promise<TRuntime>;
}

export function createConfigStore<TRaw, TRuntime>(
  options: ConfigStoreOptions<TRaw, TRuntime>,
): ConfigStore<TRuntime> {
  const fileName = options.fileName ?? "config.json";

  function getConfigPath(): string {
    return join(homedir(), ".config", options.appName, fileName);
  }

  async function load(): Promise<TRuntime> {
    const configPath = getConfigPath();
    try {
      const file = Bun.file(configPath);
      if (!(await file.exists())) {
        return options.defaults();
      }
      const raw = JSON.parse(await file.text()) as Partial<TRaw>;
      return options.compile(raw);
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
      return options.defaults();
    }
  }

  return { getConfigPath, load };
}
