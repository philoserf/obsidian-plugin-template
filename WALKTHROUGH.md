# Obsidian Plugin Template Walkthrough

## Overview

This repository is a **template** for building [Obsidian](https://obsidian.md) plugins with
[Bun](https://bun.sh) as the bundler, script runner and test runner. Copying it gives you a working plugin
with a command, a ribbon icon, a declarative settings tab with a keychain-backed credential
row, a test harness, and a CI and release pipeline.

Most of what follows is a _worked example_, not a feature. `greet()`, `ExamplePlugin`, the
example settings and the placeholder plugin id show where your own code goes. The settings
tab is also the pattern the philoserf plugins port to.

One fact explains most of the repository's shape: **Obsidian does not build plugins.** It
loads `manifest.json` and `main.js` straight out of a vault's `.obsidian/plugins/<id>/` folder
and runs that JavaScript. Nothing gets installed or built on the user's machine. That is why
the bundle is committed, why CI diffs it, and why the release workflow looks the way it does.

**Entry points**

| Path              | Role                                                        |
| ----------------- | ----------------------------------------------------------- |
| `manifest.json`   | What Obsidian reads to identify and load the plugin         |
| `src/main.ts`     | Plugin source entry, bundled into `main.js`                 |
| `package.json`    | The `build`, `dev`, `check`, `version` and `test` scripts   |
| `version-bump.ts` | Version sync, run only through `bun run version`            |
| `.github/`        | CI (`main.yml`), release (`release.yml`), Dependabot config |

## Architecture

```text
.
├── src/
│   ├── main.ts           # Plugin class, secretStatus(), settings tab — the bundle entry
│   ├── utils.ts          # greet(): a pure module with no obsidian import
│   ├── utils.test.ts     # Tests for the pure module
│   ├── settings.test.ts  # Tests the settings tab as data
│   └── test-preload.ts   # Stubs the 'obsidian' module under bun test
├── version-bump.ts       # package.json version -> manifest.json + versions.json
├── main.js               # Built bundle — COMMITTED, Obsidian loads this
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # plugin version -> minimum Obsidian version
├── bunfig.toml           # Registers the test preload
├── tsconfig.json         # strict TypeScript, checker only
├── biome.json            # Lint + format for code and JSON
├── .prettierrc.json      # Format for Markdown
└── .github/
    ├── dependabot.yml
    └── workflows/
        ├── main.yml      # CI: build, main.js diff gate, test; Dependabot rebuild
        └── release.yml   # Bare-semver tag -> verified GitHub release
```

Data flows one way: `src/*.ts` → `bun build` → `main.js` → a GitHub release → a vault. At
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
  "version": "1.1.0",
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
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
```

`loadSettings` merges the stored data over `DEFAULT_SETTINGS`, so a `data.json` written by an
older version gets defaults for any keys it lacks. It does not check the stored values. See
section 4 for what that means for the `Name` row.

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
registration layer, and the logic lives where `bun test` can reach it directly.

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
              // repaired, so anything that must hold is checked on load too.
              validate: (value) =>
                value.trim() === "" ? "Name cannot be empty." : undefined,
            },
```

The comment matches Obsidian's own typings. `validate` runs when the row mounts and on each
edit, and it never rewrites the stored value. An empty `name` that reaches `data.json` some
other way, such as a hand edit, a sync conflict or an older version, survives `loadSettings`
and greets as `Hello, !`. The template states the load-time rule here but does not
demonstrate it in `loadSettings`, which this pass filed (see Findings).

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
                  this.plugin.settings.apiKeySecret = id;
                  await this.plugin.saveSettings();
                  // Re-render so the description reports the new secret.
                  this.update();
                });
            },
          },
```

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

## 5. The build: two `bun build` lines

No build script file exists. `package.json`'s scripts call `bun build` directly:

`package.json` — `scripts.dev`, `scripts.build`, `scripts.check`

```json
    "dev": "bun build src/main.ts --outdir . --format cjs --external obsidian --external electron --watch",
    "build": "bun run check && bun build src/main.ts --outdir . --format cjs --external obsidian --external electron --minify",
    "check": "bun run typecheck && biome check . && prettier --check \"**/*.md\"",
```

Read the flags against what Obsidian expects:

- `--outdir .` writes `main.js` to the repository root, next to `manifest.json`, which is
  the pair Obsidian loads.
- `--format cjs`, because Obsidian's plugin loader evaluates CommonJS.
- `--external obsidian --external electron`, because Obsidian supplies both modules at load
  time. Bundling either produces a _broken_ plugin, not just a large one.
- `build` minifies; `dev` watches and stays unminified.

`build` runs `check` first. That is `tsc --noEmit` (strict, with `noUncheckedIndexedAccess`
and `exactOptionalPropertyTypes`), `biome check .` over everything git does not ignore
except `main.js`, and prettier over Markdown. Test files are in `tsconfig.json`'s
`src/**/*.ts` include, so they are typechecked too.

`dev` overwrites the tracked `main.js` with an unminified bundle. Run `bun run build` before
committing.

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

The tests check four things: the group headings; which keys the control rows bind; the
`Name` validator; and that the API key row is a `render` row, not a `control`. That last one
matters, because a `control` row would auto-save the value itself into `data.json`.
`secretStatus` gets one test per outcome.

Transcript of `bun test`, run while writing this document:

```text
bun test v1.4.2 (43848b5a7)

 11 pass
 0 fail
 14 expect() calls
Ran 11 tests across 2 files. [14.00ms]
```

## 7. The committed bundle, and the CI gate that protects it

`main.js` is a **tracked file**. It is the thing most likely to be "fixed" by someone
applying general good practice. It was gitignored once (commit `673cbaa`) and restored
(commit `3081162`), and issue #28 proposing the same change is closed.

Because Obsidian ships the committed bundle, CI refuses a stale one:

`.github/workflows/main.yml` — `jobs.check`

```yaml
      - run: bun install --frozen-lockfile
      - run: bun audit --audit-level=critical
      # `build` is check + bundle. The diff then fails the PR when the committed
      # main.js does not match a fresh build — Obsidian ships the committed
      # bundle, so a dependency bump that skips the rebuild must not merge.
      # bun is deliberately unpinned, so a bun release that shifts bundler
      # output trips this too. The fix is the same either way: rebuild and
      # commit main.js.
      - run: bun run build
      - run: git diff --exit-code main.js
      - run: bun test
```

Dependabot bumps `package.json` and `bun.lock` but never rebuilds, so every bump to a bundled
dependency would fail that diff. The `rebuild` job handles that case. On a Dependabot pull
request it builds, commits `main.js` onto the PR branch, and dispatches CI for the new head,
because a push made with `GITHUB_TOKEN` starts no workflow but a dispatch does:

`.github/workflows/main.yml` — `jobs.rebuild`, "Commit main.js and dispatch CI"

```yaml
        run: |
          git diff --quiet main.js && exit 0
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git commit -m "chore: rebuild main.js for the dependencies bump" main.js
          git push
          gh workflow run main.yml --ref "$GITHUB_HEAD_REF"
```

A Bun release that shifts bundler output is deliberately not covered. Bun is unpinned on
purpose, and the remedy there is a one-commit rebuild by hand, never a pin.

## 8. Version identity: three files, one writer

`package.json`, `manifest.json` and `versions.json` all carry version data, and a human edits
only `package.json`. `version-bump.ts` writes the other two, run as `bun run version`, which
sets `npm_package_version`. Run any other way, the script throws:

`version-bump.ts`

```typescript
const targetVersion = Bun.env.npm_package_version;
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
  "1.1.0": "1.13.0"
}
```

The `1.1.0` row is where the 1.13.0 floor from section 1 becomes visible to Obsidian. A user
on 1.12 is offered `1.0.1`. The map is append-only, because pruning it strands those users.

## 9. Release: `release.yml`

Only a bare-semver tag starts a release. In GitHub's filter syntax `+` is a quantifier, so
`v1.2.3`, `1.2` and `1.2.3-beta` all fail to match:

`.github/workflows/release.yml` — `on`

```yaml
on:
  push:
    tags:
      - "[0-9]+.[0-9]+.[0-9]+"
```

The job then refuses to publish anything the repository does not agree with. The tag must
equal the version in `package.json` and `manifest.json` and have a row in `versions.json`. The
fresh build must match the committed `main.js`. The tests must pass. Only then does it collect
the assets:

`.github/workflows/release.yml` — "Collect assets"

```yaml
          {
            echo "files<<EOF"
            echo main.js
            echo manifest.json
            if [ -f styles.css ]; then echo styles.css; fi
            echo EOF
          } >> "$GITHUB_OUTPUT"
```

`main.js`, `manifest.json` and, if present, `styles.css` are the three files Obsidian loads
from a plugin folder. The template has no `styles.css`, but the ribbon icon's
`my-plugin-ribbon-class` is the hook for one. A plugin that adds a stylesheet ships it with
no edit to this workflow.

## 10. Following the whole chain once

1. You edit `src/main.ts` or a module it imports.
2. `bun run build` runs `check` (tsc, Biome, prettier), then bundles `src/main.ts` into a
   minified CommonJS `main.js` with `obsidian` and `electron` left external.
3. You commit the source **and** the rebuilt `main.js` together.
4. CI rebuilds and diffs `main.js`, then runs the tests through the `obsidian` stub. On a
   Dependabot PR, the `rebuild` job does step 3 for you.
5. A release bumps `package.json`, runs `bun run version` to sync `manifest.json` and append
   to `versions.json`, and merges as one prep PR.
6. A bare-semver tag on the merged commit fires `release.yml`. It verifies the tag against
   all three files and the bundle against a fresh build, then publishes the assets.
7. Obsidian downloads those files into `.obsidian/plugins/<id>/`, constructs `ExamplePlugin`
   and calls `onload()`. The settings tab reads its keychain names through `secretStatus`,
   and the plugin reads the credential's value with `secretStorage.getSecret(id)` only when
   it needs it.

## Findings

This pass regenerated the walkthrough rather than extending it. The previous version
described the code before the 1.1.0 changes. It had a `build.ts` that was removed in #72, a
settings tab with an empty `display()` that #82 replaced, a `tsconfig.json` test exclusion
and a Biome file allowlist that are both gone, and a release workflow with a hard-coded two-file
upload list and no tag check, which #73 replaced. Each was corrected in place.

Its two filed findings are resolved in the code: the duplicated shipped-file list (issue #51,
now the optional `styles.css` step in section 9) and the undemonstrated settings tab
(issue #61, now section 4).

Tracing the code surfaced one new finding, filed locally for follow-up after this release:

| #   | Severity | Issue                                                                                        | Primary location                           |
| --- | -------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | low      | The `Name` validator's comment calls for a load-time check that `loadSettings` does not make | `src/main.ts` — `loadSettings`, `Name` row |

**Total: 1 issue (0 critical, 0 high, 0 medium, 1 low)**
