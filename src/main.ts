import {
  Notice,
  Plugin,
  PluginSettingTab,
  SecretComponent,
  type SettingDefinitionItem,
} from "obsidian";
import { greet } from "./utils";

interface PluginSettings {
  name: string;
  greeting: string;
  greetOnLoad: boolean;
  // The ID of a secret in app.secretStorage, never the secret itself:
  // data.json is plaintext and syncs. Read it with
  // this.app.secretStorage.getSecret(this.settings.apiKeySecret).
  apiKeySecret: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
  name: "Obsidian User",
  greeting: "Hello",
  greetOnLoad: false,
  apiKeySecret: "",
};

export default class ExamplePlugin extends Plugin {
  override settings: PluginSettings = DEFAULT_SETTINGS;

  override async onload(): Promise<void> {
    await this.loadSettings();

    // This adds a simple command that can be triggered by the user (e.g., from the Command Palette).
    this.addCommand({
      id: "greet-command",
      name: "Greet the user",
      callback: () => this.greet(),
    });

    // This adds a ribbon icon to the left ribbon.
    const ribbonIconEl = this.addRibbonIcon(
      "bell",
      "Greet via Ribbon Icon",
      (_evt: MouseEvent) => this.greet(),
    );
    // Perform some extra configuration on the ribbon icon element if necessary.
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    this.addSettingTab(new ExampleSettingTab(this.app, this));

    if (this.settings.greetOnLoad) this.greet();
  }

  greet(): void {
    new Notice(greet(this.settings.name, this.settings.greeting));
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}

/**
 * What a secret row says about the secret it points at. The plugin row and
 * Settings → Keychain are separate screens, and a secret's name syncs with
 * data.json while its value stays on the device that stored it — so on a
 * second device the row holds a name that keychain lacks, and nothing else
 * says what to call the secret. Reads names only, never values.
 */
export function secretStatus(
  id: string,
  onDevice: readonly string[],
  suggested: string,
): string {
  if (!id) {
    return `Choose or create a keychain secret. Naming it "${suggested}" lets other plugins use the same one.`;
  }
  return onDevice.includes(id)
    ? `Uses the keychain secret "${id}".`
    : `This device's keychain has no secret named "${id}". Add it in Settings → Keychain under that name, or choose another secret here.`;
}

// Declarative settings (Obsidian 1.13.0): the tab is data. Obsidian renders
// it, indexes every row for settings search, and saves each `control` row to
// plugin.settings[key] itself. A `render` row is drawn by hand and saves
// nothing on its own.
export class ExampleSettingTab extends PluginSettingTab {
  plugin: ExamplePlugin;

  constructor(app: Plugin["app"], plugin: ExamplePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  // Runs on every update(), so keep it cheap.
  override getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: "group",
        heading: "Greeting",
        items: [
          {
            name: "Name",
            desc: "Who the greeting is for.",
            control: {
              type: "text",
              key: "name",
              placeholder: DEFAULT_SETTINGS.name,
              // Rejects the edit in the UI only. A stored value is never
              // repaired, so anything that must hold is checked on load too.
              validate: (value) =>
                value.trim() === "" ? "Name cannot be empty." : undefined,
            },
          },
          {
            name: "Greeting",
            control: {
              type: "dropdown",
              key: "greeting",
              options: { Hello: "Hello", Hi: "Hi", Welcome: "Welcome" },
            },
          },
          {
            name: "Greet on startup",
            control: { type: "toggle", key: "greetOnLoad" },
          },
          {
            name: "Greet now",
            desc: "Shows the greeting with the settings above.",
            action: () => this.plugin.greet(),
          },
        ],
      },
      {
        type: "group",
        heading: "Credentials",
        items: [
          {
            name: "API key",
            desc: secretStatus(
              this.plugin.settings.apiKeySecret,
              this.app.secretStorage.listSecrets(),
              "your-plugin-api-key",
            ),
            // There is no declarative secret control, so this row is
            // rendered by hand, and saves by hand.
            render: (setting) => {
              new SecretComponent(this.app, setting.controlEl)
                .setValue(this.plugin.settings.apiKeySecret)
                .onChange(async (id) => {
                  this.plugin.settings.apiKeySecret = id;
                  await this.plugin.saveSettings();
                  // Re-render so the description reports the new secret.
                  this.update();
                });
            },
          },
        ],
      },
    ];
  }
}
