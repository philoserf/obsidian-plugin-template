# Obsidian Plugin Template Walkthrough

*2026-04-03T18:42:01Z by Showboat 0.6.1*
<!-- showboat-id: 256f4d93-f6cb-4a26-99c3-b4553ecac91b -->

## Overview

A minimal Obsidian plugin template that uses **Bun** as the build tool and runtime, **Biome** for linting and formatting, and **TypeScript** in strict mode. The template provides a working plugin skeleton with a command, ribbon icon, settings tab, and a complete CI/release pipeline via GitHub Actions.

**Version:** 1.0.1  
**Entry point:** `src/main.ts` → bundled to `main.js` (CommonJS)  
**Key technologies:** Bun, TypeScript 6, Biome, Obsidian API

## Architecture

```bash
cat <<'HEREDOC'
.
├── src/
│   ├── main.ts          # Plugin class — entry point
│   ├── utils.ts          # Shared utility functions
│   └── main.test.ts      # Bun test suite
├── build.ts              # Bun bundler script
├── version-bump.ts       # Syncs version across manifest files
├── main.js               # Built output (committed, required by Obsidian)
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # Version → minAppVersion mapping
├── package.json          # Scripts, dependencies, metadata
├── tsconfig.json         # TypeScript config (strict, ESNext, bundler resolution)
├── biome.json            # Biome formatter + linter config
└── .github/
    ├── workflows/
    │   ├── main.yml      # CI: check + test on push/PR
    │   └── release.yml   # Release: build + publish on tag push
    ├── dependabot.yml    # Weekly dependency updates
    └── settings.yml      # Repo settings (template repo)
HEREDOC

```

```output
.
├── src/
│   ├── main.ts          # Plugin class — entry point
│   ├── utils.ts          # Shared utility functions
│   └── main.test.ts      # Bun test suite
├── build.ts              # Bun bundler script
├── version-bump.ts       # Syncs version across manifest files
├── main.js               # Built output (committed, required by Obsidian)
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # Version → minAppVersion mapping
├── package.json          # Scripts, dependencies, metadata
├── tsconfig.json         # TypeScript config (strict, ESNext, bundler resolution)
├── biome.json            # Biome formatter + linter config
└── .github/
    ├── workflows/
    │   ├── main.yml      # CI: check + test on push/PR
    │   └── release.yml   # Release: build + publish on tag push
    ├── dependabot.yml    # Weekly dependency updates
    └── settings.yml      # Repo settings (template repo)
```

Data flows from `src/main.ts` through Bun's bundler (`build.ts`) into `main.js`. Obsidian loads `main.js` at runtime, reading `manifest.json` for metadata. The `versions.json` file maps plugin versions to minimum Obsidian versions for compatibility checking.

## Plugin Entry Point — `src/main.ts`

The plugin class `ExamplePlugin` extends `Plugin` from the Obsidian API. It registers a command, a ribbon icon, and a settings tab during `onload()`. Settings are currently an empty record — a placeholder for future configuration.

```bash
head -9 src/main.ts
```

```output
import { Notice, Plugin, PluginSettingTab } from "obsidian";
import { greet } from "./utils";

type PluginSettings = Record<string, never>;

const DEFAULT_SETTINGS: PluginSettings = {};

export default class ExamplePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
```

The plugin imports `Notice`, `Plugin`, and `PluginSettingTab` from the Obsidian API, plus a local `greet` utility. Settings use `Record<string, never>` — an empty object type that prevents any keys. This is a clean placeholder: when you add settings fields, you change this type and `DEFAULT_SETTINGS` together.

### `onload()` — Registration

The async `onload()` method is called by Obsidian when the plugin activates. It loads persisted settings, then registers three UI elements:

```bash
tail -n +11 src/main.ts | head -26
```

```output
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
```

Three registrations happen in `onload()`:

1. **Command** (`greet-command`) — Appears in the Command Palette, shows a `Notice` with "Hello, Obsidian User!".
2. **Ribbon icon** — A bell icon in the left sidebar. Clicking it shows "Hello, Ribbon Clicker!". The element gets an extra CSS class for styling.
3. **Settings tab** — Registers `ExampleSettingTab` (currently renders an empty container).

### Settings Persistence

`loadSettings()` merges saved data with defaults using `Object.assign`. `saveSettings()` writes the settings object to Obsidian's data store. Both delegate to the inherited `loadData()`/`saveData()` methods from `Plugin`.

```bash
tail -n +38 src/main.ts | head -7
```

```output
  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
```

### Settings Tab — `ExampleSettingTab`

The settings tab is a skeleton. It clears its container in `display()` but adds no controls. This is where you'd add `Setting` instances for user-configurable options.

```bash
tail -n +47 src/main.ts
```

```output
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
```

## Utility Module — `src/utils.ts`

A single pure function that formats a greeting string. Extracted from `main.ts` to demonstrate module separation and testability.

```bash
head -8 src/utils.ts
```

```output
/**
 * A simple utility function to demonstrate testing and basic plugin functionality.
 * @param name The name to greet.
 * @returns A greeting string.
 */
export function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

## Tests — `src/main.test.ts`

Tests use Bun's native test runner. Two tests cover the `greet` function: a happy path and an empty-string edge case. The plugin class itself has no tests (tracked in issue #29).

```bash
head -11 src/main.test.ts
```

```output
import { expect, test } from "bun:test";
import { greet } from "./utils";

test("greet function returns a greeting", () => {
  expect(greet("World")).toBe("Hello, World!");
  expect(greet("Obsidian")).toBe("Hello, Obsidian!");
});

test("greet function handles empty string", () => {
  expect(greet("")).toBe("Hello, !");
});
```

## Build System — `build.ts`

The build script uses Bun's native bundler. It reads `--watch` from argv to toggle minification (minified in production, unminified in watch mode). Output is CommonJS format to `./main.js`, with `obsidian` and `electron` marked as externals since Obsidian provides them at runtime.

```bash
head -19 build.ts
```

```output
const watch = process.argv.includes("--watch");

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: ".",
  format: "cjs",
  external: ["obsidian", "electron"],
  minify: !watch,
});

if (!result.success) {
  console.error("Build failed");
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

if (watch) console.log("Watching for changes...");

export {};
```

The `export {}` at the end makes the file a module (required for top-level `await`). Note that `--watch` here only controls minification — it doesn't enable Bun's file watcher. The `bun run dev` script in `package.json` passes `--watch` to this script but Bun's bundler doesn't have a built-in watch mode, so rebuilds require re-running the command.

## Version Bumping — `version-bump.ts`

When you run `bun run version` (which triggers `npm version` lifecycle), this script reads the new version from `npm_package_version` and syncs it to `manifest.json` and `versions.json`.

```bash
head -19 version-bump.ts
```

```output
const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  throw new Error("No version found in package.json");
}

// Update manifest.json
const manifest = await Bun.file("manifest.json").json();
const { minAppVersion } = manifest;
manifest.version = targetVersion;
await Bun.write("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

// Update versions.json
const versions = await Bun.file("versions.json").json();
versions[targetVersion] = minAppVersion;
await Bun.write("versions.json", `${JSON.stringify(versions, null, 2)}\n`);

console.log(`Updated to version ${targetVersion}`);

export {};
```

The script uses Bun's `Bun.file().json()` and `Bun.write()` APIs for file I/O — no Node.js `fs` module needed. It reads `minAppVersion` from the current `manifest.json` and maps the new version to it in `versions.json`, building up the compatibility matrix over time.

## Configuration Files

### `manifest.json` — Plugin Identity

Obsidian reads this file to identify the plugin. Key fields: `id` (unique plugin identifier), `version`, `minAppVersion` (minimum Obsidian version required), and `isDesktopOnly`.

```bash
head -10 manifest.json
```

```output
{
  "id": "your-plugin-id",
  "name": "Your Plugin Name",
  "version": "1.0.1",
  "minAppVersion": "1.0.0",
  "description": "A brief description of your plugin",
  "author": "Mark Ayers",
  "authorUrl": "https://github.com/philoserf",
  "isDesktopOnly": false
}
```

### `tsconfig.json` — TypeScript Compilation

Targets ESNext with bundler module resolution (appropriate for Bun). Strict mode is enabled. Test files are excluded from type checking. The `noEmit` flag means `tsc` is used only for type checking — Bun handles the actual compilation.

```bash
head -14 tsconfig.json
```

```output
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun", "node"],
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts", "build.ts", "version-bump.ts"],
  "exclude": ["src/**/*.test.ts"]
}
```

### `biome.json` — Linting and Formatting

Biome is configured with git-aware VCS integration (respects `.gitignore`), space indentation, and auto-organized imports. It explicitly includes source files and config files but uses `ignoreUnknown` to skip unrecognized file types.

```bash
head -29 biome.json
```

```output
{
  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "includes": [
      "src/**/*.ts",
      "src/**/*.js",
      "*.json",
      "scripts/**/*.ts",
      "version-bump.ts",
      "build.ts"
    ],
    "ignoreUnknown": true
  },
  "formatter": {
    "indentStyle": "space"
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

## CI/CD Pipeline

### CI Workflow — `.github/workflows/main.yml`

Runs on every push to `main` and on pull requests. Steps: install dependencies, audit for critical vulnerabilities, run all checks (typecheck + biome), and run tests.

```bash
head -21 .github/workflows/main.yml
```

```output
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun audit --audit-level=critical
      - run: bun run check
      - run: bun test
```

### Release Workflow — `.github/workflows/release.yml`

Triggered by any tag push. Builds the plugin and creates a GitHub release with `main.js` and `manifest.json` attached — the two files Obsidian needs to install a plugin.

```bash
head -34 .github/workflows/release.yml
```

```output
name: Release

on:
  push:
    tags:
      - "*"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - run: |
          bun install
          bun run build

      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          files: |
            main.js
            manifest.json
          fail_on_unmatched_files: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Dependabot — `.github/dependabot.yml`

Weekly dependency updates for both npm packages and GitHub Actions, scheduled Mondays at 03:00 UTC. Uses conventional commit format (`chore(deps):` for npm, `chore(ci):` for actions).

## Concerns

### Code Quality

1. **No `onunload()` method.** The plugin class doesn't implement `onunload()`. While Obsidian handles basic cleanup (removing commands, ribbon icons, settings tabs registered via `this.addCommand` etc.), the official sample plugin includes it as a lifecycle hook for custom teardown. For a template, it's worth including — even as an empty method — so users know the hook exists.

2. **Placeholder manifest values.** `manifest.json` still has `"id": "your-plugin-id"` and `"name": "Your Plugin Name"`. These should be updated or documented more prominently as requiring customization.

3. **`saveSettings()` is never called.** The method exists but nothing invokes it. Since the settings tab has no controls, this is consistent — but a template user might not realize they need to wire it up when adding settings.

4. **No plugin class tests.** Only `utils.ts` is tested. The plugin class has no test coverage (tracked in issue #29). Testing Obsidian plugins requires mocking the Obsidian API, which is non-trivial but expected in a template.

### Community Standards

5. **Release tag pattern is too broad.** The release workflow triggers on `tags: ["*"]`, meaning any tag (not just semver) triggers a release build. The Obsidian community standard is to match semver tags like `"[0-9]*"` or `"v*"`.

6. **`main.js` is committed.** This is intentional and required — Obsidian expects `main.js` in the repo for direct GitHub installation. The `.gitignore` correctly does not ignore it. This is a gotcha that trips up many plugin developers.

7. **Watch mode doesn't actually watch.** The `bun run dev` script passes `--watch` to `build.ts`, which only toggles minification. There's no file watcher — users expecting hot-reload will be confused. Consider documenting this or implementing actual watch behavior.

8. **`scripts/**/*.ts` in biome includes.** The `biome.json` includes `scripts/**/*.ts` but no `scripts/` directory exists. Harmless but untidy.

