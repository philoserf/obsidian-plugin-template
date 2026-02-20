import { Notice, Plugin, PluginSettingTab } from "obsidian";
import { greet } from "./utils";

type PluginSettings = Record<string, never>;

const DEFAULT_SETTINGS: PluginSettings = {};

export default class ExamplePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    // This adds a simple command that can be triggered by the user (e.g., from the Command Palette).
    this.addCommand({
      id: "greet-command",
      name: "Greet the user",
      callback: () => {
        new Notice(greet("Obsidian User"));
      },
    });

    // This adds a ribbon icon to the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      "bell",
      "Greet via Ribbon Icon",
      (_evt: MouseEvent) => {
        // Called when the user clicks the icon.
        new Notice(greet("Ribbon Clicker"));
      },
    );
    // Perform some extra configuration on the ribbon icon element if necessary.
    ribbonIconEl.addClass("my-plugin-ribbon-class");

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
