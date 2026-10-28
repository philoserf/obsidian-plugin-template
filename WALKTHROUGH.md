# Obsidian Plugin Template Walkthrough

## Overview

This repository is a **template** for building [Obsidian](https://obsidian.md) plugins with
[Bun](https://bun.sh) as the bundler, script runner and test runner. Copying it gives you a working plugin
with a command, a ribbon icon, a declarative settings tab with a keychain-backed credential
row, and a test harness. Its release path runs through the `release-gate` and `release-ship`
skills, not through anything in the repository.

Most of what follows is a _worked example_, not a feature. `greet()`, `ExamplePlugin`, the
example settings and the placeholder plugin id show where your own code goes. The settings
tab is also the pattern the philoserf plugins port to.

One fact explains most of the repository's shape: **Obsidian does not build plugins.** It
loads `manifest.json` and `main.js` straight out of a vault's `.obsidian/plugins/<id>/` folder
and runs that JavaScript. Nothing gets installed or built on the user's machine. That is why
the build ends by copying the bundle into a vault, and why a release attaches a fresh one.
Nothing reads a committed copy, so `main.js` is gitignored.

**Entry points**

| Path              | Role                                                      |
| ----------------- | --------------------------------------------------------- |
| `manifest.json`   | What Obsidian reads to identify and load the plugin       |
| `src/main.ts`     | Plugin source entry, bundled into `main.js`               |
| `package.json`    | The `build`, `dev`, `check`, `version` and `test` scripts |
| `deploy.ts`       | The last step of `bun run build`: install into a vault    |
| `version-bump.ts` | Version sync, run only through `bun run version`          |

## Architecture

```text
.
├── src/
│   ├── main.ts           # settingsFrom(), plugin class, secretStatus(), settings tab — the bundle entry
│   ├── utils.ts          # greet(): a pure module with no obsidian import
│   ├── utils.test.ts     # Tests for the pure module
│   ├── settings.test.ts  # Tests the settings tab as data
│   └── test-preload.ts   # Stubs the 'obsidian' module under bun test
├── deploy.ts             # Copies the plugin into OBSIDIAN_DEPLOY_DEST, if set
├── version-bump.ts       # package.json version -> manifest.json + versions.json
├── .env.local.example    # OBSIDIAN_DEPLOY_DEST, copied to the gitignored .env.local
├── main.js               # Built bundle — gitignored, Obsidian loads this
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # plugin version -> minimum Obsidian version
├── bunfig.toml           # Registers the test preload
├── tsconfig.json         # strict TypeScript, checker only
├── biome.json            # Lint + format for code and JSON
└── .prettierrc.json      # Markdown format config, read by bun fmt
```

Data flows one way: `src/*.ts` → `bun build` → `main.js` → your vault (through `deploy.ts`)
or a GitHub release → a vault. At
runtime the plugin's only state is `data.json`, which it reads and writes through Obsidian's
`loadData()`/`saveData()`. Credential values are the exception: they live in Obsidian's
keychain, and `data.json` holds only a secret's name.

## 1. Where Obsidian starts: `manifest.json`

Obsidian scans each plugin folder for `manifest.json`. It identifies the plugin by `id`,
shows `name` and `description` in the settings UI, and refuses to load the plugin on an app
older than `minAppVersion`. `isDesktopOnly: false` declares mobile support.

`manifest.json`

```json
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.2.0",
  "minAppVersion": "1.13.0",
  "description": "A brief description of your plugin",
```

`minAppVersion` is `1.13.0` because the settings tab below uses `getSettingDefinitions()`,
which Obsidian added in 1.13.0. `id`, `name` and `description` are placeholders, the first
row of the README's copier checklist.

## 2. The plugin entry point: `src/main.ts`

### Settings shape and defaults

The file opens with the settings type and its defaults. The comment on `apiKeySecret` states
the credential rule the whole tab is built around: `data.json` is plaintext and syncs, so it
may hold a secret's _ID_ and never the secret itself.

`src/main.ts` — `PluginSettings`, `DEFAULT_SETTINGS`

```typescript
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
```

### `onload`: what the plugin registers

Obsidian constructs the default-exported class and calls `onload()`. The plugin never
constructs itself. `onload` loads settings first, because everything after it reads them.
It then registers three extension points, each a different Obsidian API:

- `addCommand` adds a Command Palette entry, keyed by `id`.
- `addRibbonIcon` adds a left-ribbon icon and returns its element, so a CSS class can be
  attached.
- `addSettingTab` registers the settings pane described in section 4.

`src/main.ts` — `ExamplePlugin.onload`

```typescript
  override async onload(): Promise<void> {
    await this.loadSettings();

    // This adds a simple command that can be triggered by the user (e.g., from the Command Palette).
    this.addCommand({
      id: "greet-command",
      name: "Greet the user",
      callback: () => this.greet(),
    });
    ...
    ribbonIconEl.addClass("my-plugin-ribbon-class");

    this.addSettingTab(new ExampleSettingTab(this.app, this));

    if (this.settings.greetOnLoad) this.greet();
  }
```

Obsidian unregisters all three on unload, which is why the template has no `onunload`. The
`override` keywords come from `noImplicitOverride` in `tsconfig.json`. Even `settings` takes
one, because Obsidian 1.13's `Plugin` declares an optional `settings?: unknown` field.

The command, the ribbon icon, the "Greet now" settings row and `greetOnLoad` all reach the
same method:

`src/main.ts` — `ExamplePlugin.greet`, `loadSettings`, `saveSettings`

```typescript
  greet(): void {
    new Notice(greet(this.settings.name, this.settings.greeting));
  }

  async loadSettings(): Promise<void> {
    this.settings = settingsFrom(await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
```

`loadSettings` hands whatever `loadData()` returns to `settingsFrom`, a pure function
defined just above the class. `loadData()` returns `null` when no `data.json` exists yet:

`src/main.ts` — `settingsFrom`

```typescript
export function settingsFrom(
  stored: Partial<PluginSettings> | null,
): PluginSettings {
  const settings = Object.assign({}, DEFAULT_SETTINGS, stored);
  if (settings.name.trim() === "") settings.name = DEFAULT_SETTINGS.name;
  return settings;
}
```

It merges the stored data over `DEFAULT_SETTINGS`, so a `data.json` written by an older
version gets defaults for any keys it lacks, and a first run gets all defaults. Then it
re-applies the one rule the settings tab enforces on input, a non-blank name. Section 4 shows
that rule's other half. The repair happens in memory only. `data.json` keeps a blank name
until the next save of any setting writes the repaired one back.

## 3. The pure layer: `src/utils.ts`

`ExamplePlugin.greet` is a shell around a function from a module that imports nothing from
`obsidian`:

`src/utils.ts` — `greet`

```typescript
export function greet(name: string, greeting = "Hello"): string {
  return `${greeting}, ${name}!`;
}
```

That split is the template's testing strategy (section 6). Obsidian-facing code stays a thin
registration layer, and the logic lives where `bun test` can reach it directly. `settingsFrom`
and `secretStatus` are just as pure but sit in `main.ts`, beside what they serve. Tests reach
them through the `obsidian` stub described in section 6.

## 4. The settings tab: definitions, not `display()`

### The tab is data

`ExampleSettingTab` has no `display()`. Since Obsidian 1.13.0 a tab can return
`getSettingDefinitions()` instead. Obsidian renders the definitions, indexes every row for
settings search, and saves each `control` row into `plugin.settings[key]` itself. Once
definitions are returned, `display()` is deprecated and never called. The comment above the
class says this in four lines:

`src/main.ts` — `ExampleSettingTab`

```typescript
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
```

The method returns two groups. Each row in **Greeting** shows a different kind:

| Row              | Kind                | Saves to               |
| ---------------- | ------------------- | ---------------------- |
| Name             | `text` control      | `settings.name`        |
| Greeting         | `dropdown` control  | `settings.greeting`    |
| Greet on startup | `toggle` control    | `settings.greetOnLoad` |
| Greet now        | `action` (a button) | nothing                |

The text row also carries a validator:

`src/main.ts` — `ExampleSettingTab.getSettingDefinitions`, the `Name` row

```typescript
            control: {
              type: "text",
              key: "name",
              placeholder: DEFAULT_SETTINGS.name,
              // Rejects the edit in the UI only. A stored value is never
              // repaired, so anything that must hold is checked on load too,
              // in settingsFrom.
              validate: (value) =>
                value.trim() === "" ? "Name cannot be empty." : undefined,
            },
```

The comment matches Obsidian's own typings. `validate` runs when the row mounts and on each
edit, and it never rewrites the stored value. An empty `name` can still reach `data.json`
some other way, such as a hand edit, a sync conflict or an older version. Without a second
check it would greet as `Hello, !`. `settingsFrom` (section 2) is that check, the same
`trim() === ""` test applied on load. A row that gains a `validate` needs a matching line
there.

### The credential row: `render`, `SecretComponent` and `secretStatus`

There is no declarative secret control. The **Credentials** group's only row is a `render`
row, drawn by hand and saved by hand. It puts a `SecretComponent`, Obsidian's keychain picker,
into the row's control area. The component reports a secret's _ID_ on change, and only that
ID is written to settings, so the secret's value never touches `data.json`.

`src/main.ts` — `ExampleSettingTab.getSettingDefinitions`, the `API key` row

```typescript
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
                  // A cleared control reports null.
                  this.plugin.settings.apiKeySecret = id ?? "";
                  await this.plugin.saveSettings();
                  // Re-render so the description reports the new secret.
                  this.update();
                });
            },
          },
```

Since `obsidian` 1.14.4 the typings declare `onChange`'s value as `string | null`, and a
cleared control reports `null`. The row stores `""` instead, the value `DEFAULT_SETTINGS`
already uses for "no secret". `apiKeySecret` stays a `string`, which is what `setValue` and
`secretStatus` take.

The row's description comes from `secretStatus`, a pure function that sits in `main.ts`
next to the tab it serves. Its doc comment states the problem it solves. A secret's _name_
syncs with `data.json`, but its _value_ stays on the device that stored it. On a second
device the row can point at a name that device's keychain lacks, and Settings → Keychain is
a separate screen that would not say so.

`src/main.ts` — `secretStatus`

```typescript
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
```

It has three outcomes: no secret chosen (suggest a shareable name), chosen and present
(confirm it), and chosen but missing on this device (say what to add). It reads
`listSecrets()`, which returns names only and never calls `getSecret`, so the settings
screen never loads a credential value.

### Why `this.update()` is there

A description is computed when `getSettingDefinitions()` runs, not when the row repaints. In
Obsidian's typings, `update()` "stores the result of getSettingDefinitions() for rendering
and search indexing", and `addSettingTab()` calls it once. Without the explicit
`this.update()` in `onChange`, picking a secret would save the new ID but leave the
description reporting the old one until the tab was rebuilt. Calling `update()` re-runs the
definitions, so `secretStatus` sees the new ID. That is also why the method carries the
comment "Runs on every update(), so keep it cheap": `listSecrets()` is the only lookup in
it.

The control rows do not need this, because Obsidian saves them and their descriptions are
static.

## 5. The build: two `bun build` lines and an install

No build script file exists. `package.json`'s scripts call `bun build` directly:

`package.json` — `scripts.dev`, `scripts.build`, `scripts.check`

```json
    "dev": "bun build src/main.ts --outdir . --format cjs --external obsidian --external electron --watch",
    "build": "bun run check && bun build src/main.ts --outdir . --format cjs --external obsidian --external electron --minify && bun run deploy.ts",
    "check": "bun run typecheck && biome check . && bun fmt --check \"**/*.md\"",
```

Read the flags against what Obsidian expects:

- `--outdir .` writes `main.js` to the repository root, next to `manifest.json`, which is
  the pair Obsidian loads.
- `--format cjs`, because Obsidian's plugin loader evaluates CommonJS.
- `--external obsidian --external electron`, because Obsidian supplies both modules at load
  time. Bundling either produces a _broken_ plugin, not just a large one.
- `build` minifies and then installs (section 7); `dev` watches, stays unminified and
  installs nothing.

`build` runs `check` first. That is `bun run typecheck`, `biome check .` over everything
git does not ignore except `main.js`, and `bun fmt` over Markdown. Test files are in
`tsconfig.json`'s `src/**/*.ts` include, so they are typechecked too.

`package.json` — `scripts.typecheck`

```json
    "typecheck": "bun --check",
```

`bun --check` is Bun's built-in type checker. It reads `tsconfig.json` (strict, with
`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`) and emits nothing. It is spelled
as a flag on purpose. Bare `bun check` would run this repository's own `check` script, which
calls `typecheck`, which would call `bun check` again. The `typescript` dev dependency is
still installed for the editor's language server, and no script runs it.

`dev` overwrites `./main.js` with an unminified bundle and does not copy it anywhere. Run
`bun run build` to put a minified build into the vault.

## 6. Testing

### The boundary

**Never instantiate the `Plugin` class in tests.** Obsidian drives its lifecycle, and a test
that constructs one is testing a stub. Tests target pure functions, plus one class whose
output is plain data. `src/utils.test.ts` covers `greet`, including its default greeting.

### The `obsidian` stub

`bunfig.toml` preloads `src/test-preload.ts` before every test file. The `obsidian` module
exists only inside the app, so without a stub any file that imports it fails at module
evaluation:

`src/test-preload.ts`

```typescript
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
```

Every _value_ import from `obsidian` needs an entry here. Type imports such as
`SettingDefinitionItem` are erased. The `PluginSettingTab` stub keeps `app` because
`getSettingDefinitions()` reads `this.app.secretStorage` for the credential row's
description.

### The settings tab, tested as data

Because the tab is data, `src/settings.test.ts` builds it with a stand-in plugin and a
stand-in app whose keychain is empty, and asserts on the returned definitions. No DOM is
involved:

`src/settings.test.ts` — `definitions`

```typescript
function definitions(): SettingDefinitionItem[] {
  const plugin = { settings: {}, greet() {} } as unknown as ExamplePlugin;
  return new ExampleSettingTab(
    {
      secretStorage: { listSecrets: () => [] },
    } as unknown as ExamplePlugin["app"],
    plugin,
  ).getSettingDefinitions();
}
```

The tab tests check four things: the group headings; which keys the control rows bind; the
`Name` validator; and that the API key row is a `render` row, not a `control`. That last one
matters, because a `control` row would auto-save the value itself into `data.json`.
`secretStatus` gets one test per outcome.

The same file tests `settingsFrom`, the load-time half of the `Name` rule. It needs no stand-in
at all, because it is `loadSettings` without the plugin:

`src/settings.test.ts` — "loading replaces a stored blank name with the default"

```typescript
// validate never repairs data.json, so loading checks the same rule again.
test("loading replaces a stored blank name with the default", () => {
  expect(settingsFrom({ name: "  " }).name).toBe("Obsidian User");
});
```

A second test checks that a real name survives, that missing keys get their defaults, and that
`null`, a first run with no `data.json`, yields the defaults.

Transcript of `bun test`, run while writing this document:

```text
bun test v1.4.4 (5d9cc0f4f)

 13 pass
 0 fail
 17 expect() calls
Ran 13 tests across 2 files. [4.00ms]
```

## 7. The bundle is build output: `deploy.ts`

`main.js` is gitignored. It was tracked until 1.2.0 (#111): #28 had restored it for "users
who install directly from GitHub", which none of the plugins copied from this template has.
The vault gets its bundle from the build, and a release attaches a fresh one, so nothing
reads a committed copy.

`bun run build` ends with `deploy.ts`, so building is installing:

`deploy.ts`

```typescript
const dest = process.env.OBSIDIAN_DEPLOY_DEST;
if (!dest) {
  console.log("OBSIDIAN_DEPLOY_DEST not set — built ./main.js only");
  process.exit(0);
}

const files = ["main.js", "manifest.json", "styles.css"].filter((f) =>
  existsSync(f),
);
await $`mkdir -p ${dest}`;
await $`cp ${files} ${dest}`;
```

Bun loads `OBSIDIAN_DEPLOY_DEST` from the gitignored `.env.local`; `.env.local.example`
shows the line to copy. `bun run` does not pass `.env.local` to a shell script, which is why
the copy is a Bun file rather than a `cp` in `package.json`. Unset, as on a machine without
the vault, the build stops at `./main.js`. The file list is the three Obsidian loads, with
`styles.css` filtered out when the plugin has none.

Bun is unpinned on purpose. A Bun release that shifts bundler output changes the next build,
and with `main.js` untracked there is no diff to commit; the next build carries it into the
vault and the next release. Never pin Bun to silence a change in bundler output.

## 8. Version identity: three files, one writer

`package.json`, `manifest.json` and `versions.json` all carry version data, and a human edits
only `package.json`. `version-bump.ts` writes the other two, run as `bun run version`, which
sets `npm_package_version`. Run any other way, the script throws:

`version-bump.ts`

```typescript
const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  throw new Error("No version found in package.json");
}

// Update manifest.json
const manifest = await Bun.file("manifest.json").json();
const { minAppVersion } = manifest;
// JSON.stringify drops undefined values, so without this the versions.json
// entry below would vanish silently and the script would still report success.
if (typeof minAppVersion !== "string" || !minAppVersion) {
  throw new Error("No minAppVersion found in manifest.json");
}
```

It overwrites `manifest.json`'s `version` and appends `versions[targetVersion] =
minAppVersion`. `versions.json` is not a changelog. It maps each plugin version to the
oldest Obsidian that build runs on, and Obsidian reads it to serve older builds to older
apps:

`versions.json`

```json
{
  "1.0.0": "1.0.0",
  "1.0.1": "1.0.0",
  "1.1.0": "1.13.0",
  "1.1.1": "1.13.0",
  "1.2.0": "1.13.0"
}
```

The `1.1.0` row is where the 1.13.0 floor from section 1 becomes visible to Obsidian. A user
on 1.12 is offered `1.0.1`. The map is append-only, because pruning it strands those users.

## 9. Release: the `release-gate` and `release-ship` skills

The repository has no release workflow. #93 removed it, and releases go through two skills,
as `README.md` and `CLAUDE.md` both say: `release-gate` reports whether the tree can be
tagged, and `release-ship` does the tagging. Neither lives in this repository.

The gate refuses what the old workflow refused, before anything is tagged. The version in
`package.json` and `manifest.json` must match the release, and `versions.json` must have a
row for it. A fresh build must leave the tree clean, and the tests must pass. Tags are
bare semver (`1.2.3`, no `v`), which is Obsidian's convention.

`release-ship` builds at the tag, because `main.js` is gitignored and the working tree's
copy could come from any branch. It then creates the GitHub release with
`gh release create` and attaches the assets
the gate's Obsidian profile names: `main.js`, `manifest.json` and, if present, `styles.css`.
Those are the three files Obsidian loads from a plugin folder. The template has no
`styles.css`, but the ribbon icon's `my-plugin-ribbon-class` is the hook for one. A plugin
that adds a stylesheet ships it with no edit here.

## 10. Following the whole chain once

1. You edit `src/main.ts` or a module it imports.
2. `bun run build` runs `check` (`bun --check`, Biome, `bun fmt`), bundles `src/main.ts`
   into a minified CommonJS `main.js` with `obsidian` and `electron` left external, and
   `deploy.ts` copies it into your vault when `.env.local` names one.
3. You reload the plugin in Obsidian, run `bun test`, and commit the source. `main.js` is
   gitignored, so it is not part of the commit.
4. A release bumps `package.json`, runs `bun run version` to sync `manifest.json` and append
   to `versions.json`, and merges as one prep PR.
5. `release-gate` checks the merged tree: versions agree, the build leaves the tree clean,
   the tests pass. `release-ship` then tags the merged commit, builds at the tag and
   publishes the assets.
6. Obsidian downloads those files into `.obsidian/plugins/<id>/`, constructs `ExamplePlugin`
   and calls `onload()`. `loadSettings` reads `data.json` through `settingsFrom`. The settings
   tab reads its keychain names through `secretStatus`, and the plugin reads the credential's
   value with `secretStorage.getSecret(id)` only when it needs it.
