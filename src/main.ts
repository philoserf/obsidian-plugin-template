import { Plugin, PluginSettingTab } from "obsidian";

interface PluginSettings {}

const DEFAULT_SETTINGS: PluginSettings = {};

export default class ExamplePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new ExampleSettingTab(this.app, this));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

class ExampleSettingTab extends PluginSettingTab {
  plugin: ExamplePlugin;

  constructor(app: Plugin["app"], plugin: ExamplePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();
  }
}
