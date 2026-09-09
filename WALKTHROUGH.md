# Obsidian Plugin Template Walkthrough

*2026-09-09T21:46:24Z by Showboat 0.6.1*
<!-- showboat-id: 3584bb7e-d19a-442b-984a-fa995a7aedcb -->

## Overview

This repository is a **template** for building [Obsidian](https://obsidian.md) plugins with
[Bun](https://bun.sh) as both the build tool and the test runner. Copy it, rename a few
things in `manifest.json`, and you have a working plugin with a command, a ribbon icon, a
settings tab, a test harness, and a full CI/release pipeline.

Because it is a template, most of what you will read below is a *worked example* rather
than a feature: `greet()`, `ExamplePlugin`, and the placeholder plugin id exist to show
where your own code goes.

The one thing to understand before anything else: **Obsidian does not build plugins.** It
loads a folder from a vault's `.obsidian/plugins/<id>/` directory containing `manifest.json`
and `main.js`, and runs that JavaScript directly. There is no install step on the user's
machine. That single fact explains the committed build artifact, the CI diff check, and the
shape of the release workflow — all covered below.

**Entry points**

| Path                 | Role                                                       |
| -------------------- | ---------------------------------------------------------- |
| `src/main.ts`        | Plugin source entry — bundled into `main.js`                |
| `build.ts`           | Bun bundler script (`bun run build` / `bun run dev`)        |
| `version-bump.ts`    | Version sync, invoked only via `bun run version`            |
| `manifest.json`      | What Obsidian reads to identify and load the plugin         |

## Architecture

Four tracked TypeScript files, three of them at the repository root. There is no framework
and no plugin abstraction layer — the whole project is small enough to read in one sitting.

```bash
cat <<'HEREDOC'
.
├── src/
│   ├── main.ts           # Plugin class — the bundler entry point
│   ├── utils.ts          # Pure helper module (the testable layer)
│   ├── utils.test.ts     # Bun test for the pure layer
│   └── test-preload.ts   # Stubs the 'obsidian' module for bun test
├── build.ts              # Bun bundler script
├── version-bump.ts       # Syncs package.json version -> manifest + versions
├── main.js               # Built bundle — COMMITTED, Obsidian loads this
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # plugin version -> minimum Obsidian version
├── bunfig.toml           # Registers the test preload
├── tsconfig.json         # strict, ESNext, bundler resolution
├── biome.json            # Lint + format
└── .github/workflows/
    ├── main.yml          # CI: audit, build, main.js diff gate, test
    ├── release.yml       # Tag push -> GitHub release
    └── claude.yml        # @claude mentions on issues and PRs
HEREDOC
```

```output
.
├── src/
│   ├── main.ts           # Plugin class — the bundler entry point
│   ├── utils.ts          # Pure helper module (the testable layer)
│   ├── utils.test.ts     # Bun test for the pure layer
│   └── test-preload.ts   # Stubs the 'obsidian' module for bun test
├── build.ts              # Bun bundler script
├── version-bump.ts       # Syncs package.json version -> manifest + versions
├── main.js               # Built bundle — COMMITTED, Obsidian loads this
├── manifest.json         # Obsidian plugin manifest
├── versions.json         # plugin version -> minimum Obsidian version
├── bunfig.toml           # Registers the test preload
├── tsconfig.json         # strict, ESNext, bundler resolution
├── biome.json            # Lint + format
└── .github/workflows/
    ├── main.yml          # CI: audit, build, main.js diff gate, test
    ├── release.yml       # Tag push -> GitHub release
    └── claude.yml        # @claude mentions on issues and PRs
```

## 1. Where Obsidian starts: `manifest.json`

Obsidian scans each plugin folder for `manifest.json`. It identifies the plugin by `id`,
shows `name` and `description` in the settings UI, and refuses to load the plugin if the
running app is older than `minAppVersion`. `isDesktopOnly: false` declares that the plugin
works on mobile.

The `id`, `name`, and `description` here are placeholders — they are the first thing you
change after copying the template.

```bash
cat manifest.json
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

## 2. The plugin entry point: `src/main.ts`

`main.ts` exports a default class extending Obsidian's `Plugin`. Obsidian instantiates it
and calls `onload()`; the plugin never constructs itself. Note that `settings` is typed
`Record<string, never>` — a deliberate "this template has no settings yet" marker that lets
the empty `DEFAULT_SETTINGS` type-check. Widening that type is step one when you add a real
setting.

```bash
sed -n '1,13p' src/main.ts
```

```output
import { Notice, Plugin, PluginSettingTab } from "obsidian";
import { greet } from "./utils";

type PluginSettings = Record<string, never>;

const DEFAULT_SETTINGS: PluginSettings = {};

export default class ExamplePlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

```

### The three extension points `onload` registers

Everything the plugin contributes to Obsidian is registered here, and each of the three is
a worked example of a different Obsidian API:

- `addCommand` puts an entry in the Command Palette, keyed by `id`
- `addRibbonIcon` puts a clickable icon in the left ribbon and returns the DOM element, so
  you can attach a CSS class to it
- `addSettingTab` registers a pane under Obsidian's plugin settings

Obsidian unregisters all three automatically when the plugin unloads, which is why there is
no `onunload` in this template.

```bash
sed -n '14,36p' src/main.ts
```

```output
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

Note `ribbonIconEl.addClass("my-plugin-ribbon-class")` on the last line: the hook for
styling exists, but there is no `styles.css` in the template. If you add one, remember that
Obsidian loads it as a third file from the plugin folder — it must also be added to the
release workflow's upload list (see section 8), or your plugin ships unstyled.

### Settings persistence

`loadData()` and `saveData()` are Obsidian's per-plugin JSON store. The merge over
`DEFAULT_SETTINGS` is the standard pattern for tolerating a settings file written by an
older version of the plugin. `saveSettings()` is defined but never called — it is
scaffolding for the settings controls you will add to the tab below.

```bash
sed -n '38,58p' src/main.ts
```

```output
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
```

## 3. The pure layer: `src/utils.ts`

Both callbacks in `onload` delegate to `greet()`. That indirection is the point of the
template's testing strategy: the Obsidian-facing code stays a thin registration shell, and
the logic lives in modules that import nothing from `obsidian` and can be tested directly.

```bash
cat src/utils.ts
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

## 4. Testing: the boundary and why it is drawn there

`CLAUDE.md` states the rule in one line: **never instantiate the `Plugin` class in tests.**
`Plugin` belongs to the Obsidian runtime, and its lifecycle is driven by the application. A
test that constructs one is testing a stub of Obsidian, not the plugin, and it passes for
reasons unrelated to whether the plugin works. The project learned this and removed such a
test — see commit `f2bc2af`, "test: drop misleading Plugin-instantiation test".

So tests target pure modules only. `src/utils.test.ts` is the pattern to copy:

```bash
cat src/utils.test.ts
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

### The `obsidian` module stub

`bunfig.toml` registers a preload that runs before any test file:

```bash
cat bunfig.toml
```

```output
[test]
preload = ["./src/test-preload.ts"]
```

The preload replaces the `obsidian` module — which only exists inside the Obsidian app and
would otherwise fail to resolve under `bun test` — with minimal stub classes:

```bash
cat src/test-preload.ts
```

```output
import { mock } from "bun:test";

mock.module("obsidian", () => ({
  Plugin: class Plugin {},
  Notice: class Notice {
    hide() {}
  },
  PluginSettingTab: class PluginSettingTab {},
}));
```

Nothing in the current test suite needs this: `utils.test.ts` imports only `./utils`, which
imports nothing. The preload is here so that the *next* pure module — one that happens to
sit in a file that also imports a type or a class from `obsidian` — can be loaded under
`bun test` without the import failing at module-evaluation time. It is not a way to test the
plugin class; that is the thing the rule above rules out.

## 5. The build: `build.ts`

`bun run build` runs `bun run check && bun run build.ts`; `bun run dev` runs the same script
with `--watch`. The script is nineteen lines and the first nine carry all the decisions:

```bash
sed -n '1,9p' build.ts
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
```

Reading those options against what Obsidian expects:

- `outdir: "."` writes the bundle to the repository root as `main.js`, next to
  `manifest.json` — the exact pair Obsidian loads
- `format: "cjs"` because Obsidian's plugin loader evaluates CommonJS
- `external: ["obsidian", "electron"]` because Obsidian supplies both modules at load time.
  Bundling either produces a *broken* plugin, not merely a large one
- `minify: !watch` keeps the dev build readable and the production build small

The remainder is failure handling — a non-zero exit is what makes `bun run build` fail CI:

```bash
sed -n '11,19p' build.ts
```

```output
if (!result.success) {
  console.error("Build failed");
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

if (watch) console.log("Watching for changes...");

export {};
```

The trailing `export {}` is not decoration: it marks the file as an ES module so the
top-level `await Bun.build(...)` on line 3 is legal. `version-bump.ts` ends the same way for
the same reason.

## 6. The committed bundle, and the CI gate that protects it

`main.js` is a **tracked file**. This is the most counterintuitive thing in the repository
and the one most likely to be "fixed" by someone applying general good practice — it has
already been gitignored once (commit `673cbaa`) and restored (commit `3081162`), and GitHub
issue #28 proposing the same change is closed.

It is tracked because Obsidian ships the built bundle: there is no build step between this
repository and a user's vault. A committed artifact can go stale, so CI refuses to let it:

```bash
sed -n '17,27p' .github/workflows/main.yml
```

```output
      - run: bun install
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

`bun run build` rebuilds the bundle in place, and `git diff --exit-code main.js` then fails
the pull request if the fresh build differs from the committed one. The in-file comment
explains the second, subtler case: `bun-version: latest` is unpinned by choice, so a Bun
release that shifts bundler output trips this check too. That is the same signal, not a
false one — `release.yml` also builds with the latest Bun, so the committed bundle should
match what a release would ship. The fix is always to rebuild and commit `main.js`, never to
pin Bun to silence the diff.

## 7. Version identity: three files, one writer

`package.json`, `manifest.json`, and `versions.json` all carry version information. They are
not three copies of one fact, and only `package.json` is edited by a human.
`version-bump.ts` writes the other two, and it runs only as the `bun run version` lifecycle
hook:

```bash
sed -n '1,17p' version-bump.ts
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
```

Line 1 reads `process.env.npm_package_version`, which the package manager sets only when the
script is invoked through `bun run version`. Run any other way it throws — that is the guard,
not a bug.

The script then does two different things:

- **`manifest.json`** gets its `version` field overwritten. It also *reads* `minAppVersion`
  from here, because the manifest is where a human declares the minimum Obsidian version.
- **`versions.json`** gets a new key appended: `versions[targetVersion] = minAppVersion`.

`versions.json` is the file most often misread. It is not a changelog and not a list of
releases — it is a map from plugin version to the minimum Obsidian version that build
requires, which Obsidian consults to decide which build of a plugin to hand a user on an
older app:

```bash
cat versions.json
```

```output
{
  "1.0.0": "1.0.0",
  "1.0.1": "1.0.0"
}
```

The map is append-only by nature. Pruning old entries strands users on old Obsidian builds,
so resist the urge to "clean it up" down to the current release.

## 8. Release: `release.yml`

A tag push triggers a build and publishes a GitHub release. The upload list is the
definition of what a plugin *is* on this side of the boundary:

```bash
sed -n '21,31p' .github/workflows/release.yml
```

```output
      - run: |
          bun install
          bun run build

      - name: Create release
        uses: softprops/action-gh-release@v3
        with:
          files: |
            main.js
            manifest.json
          fail_on_unmatched_files: true
```

Exactly two files: `main.js` and `manifest.json`. `fail_on_unmatched_files: true` fails the
release if a listed file is missing — but note it cannot catch a file that is *absent from
the list*. This is the trap flagged back in section 2: a plugin that grows a `styles.css`
and does not amend these lines releases silently unstyled.

Nothing here verifies that the pushed tag matches the version in `manifest.json`; the tag is
trusted. The trigger glob is `"*"`, which accepts the bare-semver tags Obsidian's community
plugin convention expects — and anything else you happen to push.

## 9. What `bun run check` actually covers

`check` is `typecheck` (`tsc --noEmit`) plus `biome check .`, and `build` runs `check`
first — so this is the gate every push passes through. Its coverage is set by two files.
`tsconfig.json` first:

```bash
cat tsconfig.json
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

`strict: true` with `moduleResolution: "bundler"` matches how Bun resolves imports, and
`noEmit: true` because emitting is `build.ts`'s job — `tsc` here is a checker only.

Read the last two lines together, though: `include` covers `src/**/*.ts`, but `exclude`
then removes `src/**/*.test.ts`. **Test files are never type-checked.** Biome lints them,
and `bun test` transpiles rather than checks them, so a type error in a test cannot fail
`check`, `build`, or CI. This is filed as a finding below.

`biome.json` sets the lint and format surface:

```bash
sed -n '8,18p' biome.json
```

```output
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
```

This is an allowlist, not a denylist, and that is what keeps the minified `main.js` out of
the linter: the only `.js` glob is `src/**/*.js`, and `main.js` sits at the repository root.
Nothing here matches it. (`vcs.useIgnoreFile: true` in the block above does make Biome
honour `.gitignore` — that is what excludes `node_modules/` — but it could not exclude
`main.js` in any case, because `main.js` is tracked and deliberately not gitignored.)

Counting the matches confirms the surface is exactly eleven files: four under `src/`,
`build.ts` and `version-bump.ts`, and the five root-level JSON files. Note also that
`"scripts/**/*.ts"` matches nothing — there is no `scripts/` directory — which is filed
below.

## 10. Following the whole chain once

Putting the pieces in execution order:

1. You edit `src/main.ts` or a module it imports.
2. `bun run build` runs `check` (tsc + Biome), then `build.ts` bundles `src/main.ts` into
   `main.js` as minified CommonJS with `obsidian` and `electron` left external.
3. You commit **both** the source and the rebuilt `main.js`.
4. CI re-runs the build and `git diff --exit-code main.js`, failing the PR if you skipped
   step 3. Then `bun test` runs the pure-module tests through the `obsidian` preload stub.
5. `bun run version` (after bumping `package.json`) propagates the version into
   `manifest.json` and appends it to `versions.json`.
6. Pushing a tag fires `release.yml`, which builds and publishes `main.js` +
   `manifest.json` as a GitHub release.
7. Obsidian downloads those two files into `.obsidian/plugins/<id>/` and calls `onload()`.

The chain reads cleanly in one direction with one exception, noted in the findings: step 6's
upload list and step 2's build config both have to know about any third file the plugin
ships, and nothing connects them.

Step 2 also has a hole worth knowing before you rely on it: `bun run dev` does **not**
actually watch. That is a separate finding from a later audit pass, filed as
`dev-script-does-not-watch`.

## Findings

Tracing the code end to end surfaced two things a reader of this walkthrough should not have
to rediscover. Both are filed in `.issues/`.

**Related existing findings.** This walkthrough was produced as the second of several review
passes over the same repository, and the others' findings are not counted below:

- A `code-theory` pass (see `THEORY.md`) filed five: two release-procedure contradictions
  (`CLAUDE.md` names skills that do not exist; `README.md` still demonstrates the
  hand-tagging `CLAUDE.md` forbids), the `tsconfig.json` test-exclusion described in
  section 9, the dead `scripts/**/*.ts` Biome glob also in section 9, and a changelog entry
  that contradicts the committed-`main.js` design in section 6.
- A later `code-audit` pass (see `.issues/000-audit.md`) filed four, including the
  `bun run dev` regression noted in section 10.

The previous `WALKTHROUGH.md` was stale — it described a `src/main.test.ts` that does not
exist under that name and omitted `src/test-preload.ts` entirely, both consequences of the
test restructuring in commits `d32a6aa` and `f2bc2af`. It was regenerated rather than filed.

### Index

| #   | Severity | Issue                                                       | Primary location                      |
| --- | -------- | ----------------------------------------------------------- | ------------------------------------- |
| 1   | medium   | `shipped-file-list-is-duplicated-between-build-and-release` | `release.yml:28-31`, `src/main.ts:33` |
| 2   | low      | `settings-tab-is-registered-but-demonstrates-nothing`       | `src/main.ts:35,47-58`                |

**Total: 2 issues (0 critical, 0 high, 1 medium, 1 low)**

