import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface PluginSettings {
  exampleSetting: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  exampleSetting: "default",
};

export default class ExamplePlugin extends Plugin {
  settings: PluginSettings;

  async onload() {
    await this.loadSettings();

    // Add a simple command
    this.addCommand({
      id: "example-command",
      name: "Example command",
      callback: () => {
        console.log("Example command executed");
      },
    });

    // Add settings tab
    this.addSettingTab(new ExampleSettingTab(this.app, this));
  }

  onunload() {
    console.log("Unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class ExampleSettingTab extends PluginSettingTab {
  plugin: ExamplePlugin;

  constructor(app: App, plugin: ExamplePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Example setting")
      .setDesc("This is an example setting")
      .addText((text) =>
        text
          .setPlaceholder("Enter value")
          .setValue(this.plugin.settings.exampleSetting)
          .onChange(async (value) => {
            this.plugin.settings.exampleSetting = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
