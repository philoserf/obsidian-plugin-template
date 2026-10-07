import { mock } from "bun:test";

mock.module("obsidian", () => ({
  Plugin: class Plugin {},
  Notice: class Notice {
    hide() {}
  },
  // The real constructor keeps the app; the secret row reads its keychain.
  PluginSettingTab: class PluginSettingTab {
    app: unknown;
    constructor(app?: unknown) {
      this.app = app;
    }
  },
  SecretComponent: class SecretComponent {
    setValue() {
      return this;
    }
    onChange() {
      return this;
    }
  },
}));
