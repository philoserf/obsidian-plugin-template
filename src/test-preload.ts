import { mock } from "bun:test";

mock.module("obsidian", () => ({
  Plugin: class Plugin {},
  Notice: class Notice {
    hide() {}
  },
  PluginSettingTab: class PluginSettingTab {},
  SecretComponent: class SecretComponent {
    setValue() {
      return this;
    }
    onChange() {
      return this;
    }
  },
}));
