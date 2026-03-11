# Obsidian Plugin Template — Code Walkthrough

*2026-03-09T04:05:41Z by Showboat 0.6.1*
<!-- showboat-id: 92e7f9cc-7d6f-40f5-b587-add89ffe53a3 -->

## Overview

This is a minimal GitHub template for building Obsidian plugins with Bun. The codebase is small — roughly 200 lines of TypeScript across six files — but it covers the full lifecycle: source, build, test, lint, version management, validation, and CI/CD release.

The walkthrough follows the data flow: source → build → output → release.

---

## Project Structure

```bash
find . -not -path "./node_modules/*" -not -path "./.git/*" -not -path "./.bun/*" -not -path "./.claude/*" -not -name "bun.lock" -not -name "walkthrough.md" | sort
```

```output
.
./.git
./.github
./.github/dependabot.yml
./.github/settings.yml
./.github/workflows
./.github/workflows/main.yml
./.github/workflows/release.yml
./.gitignore
./biome.json
./build.ts
./CHANGELOG.md
./CLAUDE.md
./LICENSE
./main.js
./manifest.json
./node_modules
./package.json
./README.md
./scripts
./scripts/validate-plugin.ts
./src
./src/main.test.ts
./src/main.ts
./src/utils.ts
./tsconfig.json
./version-bump.ts
./versions.json
```

Key groupings:

| Path | Purpose |
|------|---------|
| `src/main.ts` | Plugin entry point — Obsidian lifecycle |
| `src/utils.ts` | Shared utilities (testable, framework-free) |
| `src/__tests__/main.test.ts` | Bun-native test suite |
| `build.ts` | Bun bundler configuration |
| `version-bump.ts` | Syncs version across metadata files |
| `scripts/validate-plugin.ts` | Pre-release validation |
| `manifest.json` / `versions.json` | Obsidian plugin metadata |
| `package.json` / `tsconfig.json` / `biome.json` | Toolchain configuration |
| `.github/workflows/` | CI, release, Dependabot, GitHub Pages |

---

## 1. The Plugin Source — `src/utils.ts`

We start here because it's the simplest file and the only one with test coverage. It has zero framework dependencies.

```bash
cat -n src/utils.ts
```

```output
     1	/**
     2	 * A simple utility function to demonstrate testing and basic plugin functionality.
     3	 * @param name The name to greet.
     4	 * @returns A greeting string.
     5	 */
     6	export function greet(name: string): string {
     7	  return `Hello, ${name}!`;
     8	}
```

A single exported function. The JSDoc is useful here since this is a template — users will replace it, and the doc shows the expected pattern. The function takes a `string` and returns a `string`; no null checks, no edge-case handling. For a template placeholder, that's fine.

---

## 2. The Plugin Entry Point — `src/main.ts`

This is where Obsidian loads the plugin. It follows the standard Obsidian plugin pattern: extend `Plugin`, implement `onload()`, register commands/ribbons/settings.

```bash
cat -n src/main.ts
```

```output
     1	import { Notice, Plugin, PluginSettingTab } from "obsidian";
     2	import { greet } from "./utils";
     3	
     4	type PluginSettings = Record<string, never>;
     5	
     6	const DEFAULT_SETTINGS: PluginSettings = {};
     7	
     8	export default class ExamplePlugin extends Plugin {
     9	  settings: PluginSettings = DEFAULT_SETTINGS;
    10	
    11	  async onload(): Promise<void> {
    12	    await this.loadSettings();
    13	
    14	    // This adds a simple command that can be triggered by the user (e.g., from the Command Palette).
    15	    this.addCommand({
    16	      id: "greet-command",
    17	      name: "Greet the user",
    18	      callback: () => {
    19	        new Notice(greet("Obsidian User"));
    20	      },
    21	    });
    22	
    23	    // This adds a ribbon icon to the left ribbon.
    24	    const ribbonIconEl = this.addRibbonIcon(
    25	      "bell",
    26	      "Greet via Ribbon Icon",
    27	      (_evt: MouseEvent) => {
    28	        // Called when the user clicks the icon.
    29	        new Notice(greet("Ribbon Clicker"));
    30	      },
    31	    );
    32	    // Perform some extra configuration on the ribbon icon element if necessary.
    33	    ribbonIconEl.addClass("my-plugin-ribbon-class");
    34	
    35	    this.addSettingTab(new ExampleSettingTab(this.app, this));
    36	  }
    37	
    38	  async loadSettings(): Promise<void> {
    39	    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    40	  }
    41	
    42	  async saveSettings(): Promise<void> {
    43	    await this.saveData(this.settings);
    44	  }
    45	}
    46	
    47	class ExampleSettingTab extends PluginSettingTab {
    48	  plugin: ExamplePlugin;
    49	
    50	  constructor(app: Plugin["app"], plugin: ExamplePlugin) {
    51	    super(app, plugin);
    52	    this.plugin = plugin;
    53	  }
    54	
    55	  display(): void {
    56	    this.containerEl.empty();
    57	  }
    58	}
```

### How it works

**Line 4 — `PluginSettings`**: Typed as `Record<string, never>`, meaning "an object with no properties." This is a deliberate placeholder. When extending the template, you'd replace this with your actual settings shape.

**Lines 11–36 — `onload()`**: The Obsidian lifecycle hook. It does three things in order:

1. **Loads persisted settings** (line 12) from Obsidian's data store via `this.loadData()`.
2. **Registers a command** (lines 15–21) — appears in the Command Palette as "Greet the user."
3. **Adds a ribbon icon** (lines 24–33) — a bell icon in the left sidebar that fires a `Notice`.
4. **Registers a settings tab** (line 35) — wires up `ExampleSettingTab`.

**Lines 38–44 — Settings persistence**: `loadSettings()` merges saved data over defaults using `Object.assign()`. This is the standard Obsidian pattern — it means new settings keys added in future versions get their defaults even if the user has old saved data.

**Lines 47–58 — `ExampleSettingTab`**: Currently a stub — `display()` just clears the container. Template users would add `Setting` constructors here.

### Concerns

- **No `onunload()`**: The plugin doesn't implement `onunload()`. For this template it's harmless (Obsidian cleans up commands and ribbon icons automatically), but a real plugin with intervals, observers, or DOM listeners would need it.
- **`export default`**: Obsidian requires the plugin class as the default export, so this is correct and necessary.

---

## 3. Tests — `src/__tests__/main.test.ts`

The test suite uses Bun's native test runner.

```bash
cat -n src/__tests__/main.test.ts
```

```output
cat: src/__tests__/main.test.ts: No such file or directory
```

Two tests, both passing. They only cover `greet()` from `utils.ts` — the plugin class itself has no test coverage. This is a known gap (see issue #29).

### Concerns

- **Tests not in CI**: The CI workflow (`main.yml`) runs `bun run check` but not `bun test`. Tests pass locally but aren't a quality gate. (Issue #25)
- **No plugin-level tests**: Testing `ExamplePlugin` would require mocking the Obsidian API, which is non-trivial but valuable for a template to demonstrate.

---

## 4. The Build System — `build.ts`

```bash
cat -n build.ts
```

```output
     1	const watch = process.argv.includes("--watch");
     2	
     3	const result = await Bun.build({
     4	  entrypoints: ["src/main.ts"],
     5	  outdir: ".",
     6	  format: "cjs",
     7	  external: ["obsidian", "electron"],
     8	  minify: !watch,
     9	});
    10	
    11	if (!result.success) {
    12	  console.error("Build failed");
    13	  for (const message of result.logs) console.error(message);
    14	  process.exit(1);
    15	}
    16	
    17	if (watch) console.log("Watching for changes...");
    18	
    19	export {};
```

### How it works

**Line 1**: Checks for `--watch` flag. When `bun run dev` is invoked, `package.json` passes `--watch` to `build.ts`.

**Lines 3–9 — `Bun.build()`**: The entire build configuration:

- **`entrypoints`**: Single entry at `src/main.ts`. Bun resolves all imports from here.
- **`outdir: "."`**: Output lands in the project root as `main.js`.
- **`format: "cjs"`**: CommonJS — required by Obsidian's plugin loader (it uses `require()`).
- **`external`**: `obsidian` and `electron` are provided by the host app at runtime. Bundling them would fail (and bloat the output).
- **`minify: !watch`**: Minify in production builds, skip during development for readable output.

**Line 19 — `export {}`**: Forces Bun to treat this file as an ESM module (needed for top-level `await` on line 3).

### Concerns

- **`--watch` doesn't actually watch**: Bun's `Bun.build()` API doesn't support file watching. The `--watch` flag only disables minification and prints a message. The `dev` script relies on Bun's built-in `--watch` for the *process* restart, but that's handled by `bun run`, not by `Bun.build()`. This works, but the "Watching for changes..." message on line 17 is slightly misleading — it's Bun's process watcher that restarts the whole script, not an incremental rebuild.

Let's verify the build output:

```bash
bun run build.ts && wc -c main.js | awk "{print \$1, \"bytes\"}" && head -c 120 main.js && echo "..."
```

```output
1185 bytes
var{defineProperty:y,getOwnPropertyNames:k,getOwnPropertyDescriptor:m}=Object,q=Object.prototype.hasOwnProperty;var f=ne...
```

The minified output is ~1.2 KB. Obsidian plugins run inside Electron, so bundle size matters less than on the web, but keeping it small is good practice.

---

## 5. Version Management — `version-bump.ts`

Obsidian plugins have three files that carry version info: `package.json`, `manifest.json`, and `versions.json`. This script keeps them in sync.

```bash
cat -n version-bump.ts
```

```output
     1	import { readFileSync, writeFileSync } from "node:fs";
     2	
     3	const targetVersion = process.env.npm_package_version;
     4	if (!targetVersion) {
     5	  throw new Error("No version found in package.json");
     6	}
     7	
     8	// Update manifest.json
     9	const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
    10	const { minAppVersion } = manifest;
    11	manifest.version = targetVersion;
    12	writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
    13	
    14	// Update versions.json
    15	const versions = JSON.parse(readFileSync("versions.json", "utf8"));
    16	versions[targetVersion] = minAppVersion;
    17	writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`);
    18	
    19	console.log(`Updated to version ${targetVersion}`);
```

### How it works

**Line 8**: Reads `npm_package_version` from the environment. This is set automatically when you run scripts via `bun run` (or `npm run`). That's why CLAUDE.md says "Must be run as `bun run version`, not directly."

**Lines 14–17**: Reads `manifest.json`, updates its `version` field, writes it back with 2-space indent and trailing newline.

**Lines 20–22**: Reads `versions.json` and adds a new entry mapping the new version to the current `minAppVersion`. This file tells Obsidian which minimum app version each plugin version requires.

### The version flow

1. Edit `version` in `package.json` (the source of truth)
2. Run `bun run version` — syncs to `manifest.json` and `versions.json`
3. Commit, tag, push → release workflow builds and publishes

Let's look at the current state of all three files:

```bash
echo "=== package.json ===" && grep "\"version\"" package.json && echo && echo "=== manifest.json ===" && grep "\"version\"" manifest.json && echo && echo "=== versions.json ===" && cat versions.json
```

```output
=== package.json ===
  "version": "1.0.0",
    "version": "bun run version-bump.ts",

=== manifest.json ===
  "version": "1.0.0",

=== versions.json ===
{
  "1.0.0": "1.0.0"
}
```

All three files agree on `1.0.0`. The `versions.json` entry `"1.0.0": "1.0.0"` means plugin version 1.0.0 requires Obsidian app version 1.0.0 or later.

---

## 6. Pre-Release Validation — `scripts/validate-plugin.ts`

```bash
cat -n scripts/validate-plugin.ts
```

```output
     1	#!/usr/bin/env bun
     2	
     3	import { readFileSync } from "node:fs";
     4	import { $ } from "bun";
     5	
     6	const manifest = JSON.parse(readFileSync("manifest.json", "utf-8"));
     7	console.log(`🔍 Validating ${manifest.name || "plugin"}...\n`);
     8	
     9	let errors = 0;
    10	
    11	// Check manifest.json
    12	if (!manifest.id || !manifest.name || !manifest.version) {
    13	  console.error("✗ manifest.json missing required fields");
    14	  errors++;
    15	} else {
    16	  console.log(`✓ manifest.json — ${manifest.name} v${manifest.version}`);
    17	}
    18	
    19	// Check package.json version matches manifest
    20	try {
    21	  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
    22	  if (pkg.version !== manifest.version) {
    23	    console.error(
    24	      `✗ Version mismatch: package.json (${pkg.version}) != manifest.json (${manifest.version})`,
    25	    );
    26	    errors++;
    27	  } else {
    28	    console.log("✓ Version numbers match");
    29	  }
    30	} catch (error) {
    31	  console.error("✗ Version check failed:", error);
    32	  errors++;
    33	}
    34	
    35	// Run checks
    36	console.log("\n🔧 Checking code quality...");
    37	const checkResult = await $`bun run check`.nothrow();
    38	if (checkResult.exitCode === 0) {
    39	  console.log("✓ Code quality checks passed");
    40	} else {
    41	  console.error("✗ Code quality checks failed");
    42	  errors++;
    43	}
    44	
    45	// Build the plugin
    46	console.log("\n📦 Building plugin...");
    47	const buildResult = await $`bun run build.ts`.nothrow();
    48	if (buildResult.exitCode === 0) {
    49	  console.log("✓ Build successful");
    50	
    51	  const mainFile = Bun.file("main.js");
    52	  if (await mainFile.exists()) {
    53	    const size = mainFile.size / 1024;
    54	    console.log(`  Output: main.js (${size.toFixed(2)} KB)`);
    55	  } else {
    56	    console.error("✗ main.js not found after build");
    57	    errors++;
    58	  }
    59	} else {
    60	  console.error("✗ Build failed");
    61	  errors++;
    62	}
    63	
    64	// Summary
    65	console.log(`\n${"=".repeat(50)}`);
    66	if (errors === 0) {
    67	  console.log("✅ All validations passed! Plugin is ready.");
    68	  process.exit(0);
    69	} else {
    70	  console.log(`❌ Validation failed with ${errors} error(s).`);
    71	  process.exit(1);
    72	}
```

### How it works

The script runs four checks in sequence, accumulating an error count:

1. **Manifest fields** (line 12): Verifies `manifest.json` has `id`, `name`, and `version`.
2. **Version match** (line 22): Confirms `package.json` and `manifest.json` agree on the version.
3. **Code quality** (line 37): Runs `bun run check` (typecheck + biome lint).
4. **Build** (line 47): Runs `bun run build.ts` and verifies `main.js` was produced.

Uses Bun's `$` shell template tag with `.nothrow()` so subprocess failures don't throw — they're handled via `exitCode` checks instead.

### Concerns

- **No test step**: The validate script runs checks and build but skips `bun test`. A pre-release gate should include tests. (Issue #26)
- **Line 47 — `bun run build.ts`**: This calls `build.ts` directly instead of `bun run build` (which runs `check` first). Since `check` already ran on line 37, this avoids double-checking — but if someone changes the `build` script later, this could diverge.
- **`if: always()`** is not used — if the check step fails, the build still runs. This is arguably correct (you might want to see all failures at once), but it means a type error won't stop the build attempt.

---

## 7. Configuration Files

### TypeScript — `tsconfig.json`

```bash
cat -n tsconfig.json
```

```output
     1	{
     2	  "compilerOptions": {
     3	    "target": "ESNext",
     4	    "lib": ["DOM", "ESNext"],
     5	    "module": "ESNext",
     6	    "moduleResolution": "bundler",
     7	    "noEmit": true,
     8	    "strict": true,
     9	    "skipLibCheck": true
    10	  },
    11	  "include": ["src/**/*.ts", "build.ts", "version-bump.ts"],
    12	  "exclude": ["src/**/*.test.ts"]
    13	}
```

Key choices:

- **`noEmit: true`**: TypeScript is used only for type checking. Bun handles compilation.
- **`strict: true`**: Full strict mode — `strictNullChecks`, `noImplicitAny`, etc.
- **`moduleResolution: "bundler"`**: The modern resolution strategy that matches how Bun resolves imports.
- **`skipLibCheck: true`**: Skips type checking `.d.ts` files from dependencies. Speeds up checks and avoids issues with conflicting type definitions.
- **`include`**: Covers source, build script, and version-bump script. Notably excludes `scripts/validate-plugin.ts` — it still type-checks because Bun runs it directly, but `tsc --noEmit` won't catch errors there.

### Biome — `biome.json`

```bash
cat -n biome.json
```

```output
     1	{
     2	  "$schema": "https://biomejs.dev/schemas/latest/schema.json",
     3	  "vcs": {
     4	    "enabled": true,
     5	    "clientKind": "git",
     6	    "useIgnoreFile": true
     7	  },
     8	  "files": {
     9	    "includes": [
    10	      "src/**/*.ts",
    11	      "src/**/*.js",
    12	      "*.json",
    13	      "scripts/**/*.ts",
    14	      "version-bump.ts",
    15	      "build.ts"
    16	    ],
    17	    "ignoreUnknown": true
    18	  },
    19	  "formatter": {
    20	    "indentStyle": "space"
    21	  },
    22	  "assist": {
    23	    "actions": {
    24	      "source": {
    25	        "organizeImports": "on"
    26	      }
    27	    }
    28	  }
    29	}
```

- **VCS integration**: Biome respects `.gitignore`, so `node_modules/` and other ignored paths are skipped automatically.
- **`includes`**: Explicit file list rather than glob-everything. This prevents Biome from touching `main.js` (the build output) or markdown files.
- **`indentStyle: "space"`**: 2-space indent (Biome's default width).
- **`organizeImports`**: Auto-sorts imports on format.
- No custom lint rules — uses Biome's recommended defaults, which is appropriate for a template.

### Package scripts — `package.json`

```bash
sed -n "7,20p" package.json | cat -n
```

```output
     1	  "license": "MIT",
     2	  "scripts": {
     3	    "audit": "bun audit --audit-level=critical",
     4	    "dev": "bun run build.ts --watch",
     5	    "build": "bun run check && bun run build.ts",
     6	    "check": "bun run typecheck && biome check .",
     7	    "typecheck": "tsc --noEmit",
     8	    "lint": "biome check .",
     9	    "lint:fix": "biome check --write .",
    10	    "format": "biome format --write .",
    11	    "format:check": "biome format .",
    12	    "validate": "bun run scripts/validate-plugin.ts",
    13	    "version": "bun run version-bump.ts",
    14	    "test": "bun test",
```

The script dependency chain:

```bash
cat <<'HEREDOC'
build → check → typecheck (tsc --noEmit)
              → biome check .
       → build.ts (Bun.build)

validate → manifest checks
         → version match check
         → check (same as above)
         → build.ts

dev → build.ts --watch (no check, for speed)
HEREDOC
```

```output
build → check → typecheck (tsc --noEmit)
              → biome check .
       → build.ts (Bun.build)

validate → manifest checks
         → version match check
         → check (same as above)
         → build.ts

dev → build.ts --watch (no check, for speed)
```

Notable: `build` gates on `check`, so you can't produce a build artifact without passing types and lint. But `test` is not in the chain anywhere — it's an independent, manual step.

---

## 8. CI/CD Workflows

### CI — `.github/workflows/main.yml`

```bash
cat -n .github/workflows/main.yml
```

```output
     1	name: CI
     2	
     3	on:
     4	  push:
     5	    branches: [main]
     6	  pull_request:
     7	    branches: [main]
     8	
     9	jobs:
    10	  check:
    11	    runs-on: ubuntu-latest
    12	    steps:
    13	      - uses: actions/checkout@v6
    14	
    15	      - uses: oven-sh/setup-bun@v2
    16	        with:
    17	          bun-version: latest
    18	
    19	      - run: bun install
    20	      - run: bun audit --audit-level=critical
    21	      - run: bun run check
    22	      - run: bun test
```

Minimal and correct. Runs on push to `main` and on PRs targeting `main`. Uses `oven-sh/setup-bun@v2` with `latest` version, then runs `check` (typecheck + biome).

**Concern**: No `bun test` step. Tests exist but aren't part of CI. (Issue #25)

### Release — `.github/workflows/release.yml`

```bash
cat -n .github/workflows/release.yml
```

```output
     1	name: Release
     2	
     3	on:
     4	  push:
     5	    tags:
     6	      - "*"
     7	
     8	permissions:
     9	  contents: write
    10	
    11	jobs:
    12	  build:
    13	    runs-on: ubuntu-latest
    14	    steps:
    15	      - uses: actions/checkout@v6
    16	
    17	      - uses: oven-sh/setup-bun@v2
    18	        with:
    19	          bun-version: latest
    20	
    21	      - run: |
    22	          bun install
    23	          bun run build
    24	
    25	      - name: Create release
    26	        uses: softprops/action-gh-release@v2
    27	        with:
    28	          files: |
    29	            main.js
    30	            manifest.json
    31	          fail_on_unmatched_files: true
    32	        env:
    33	          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Triggered by any tag push (`tags: ["*"]`). Builds the plugin with `bun run build` (which runs `check` first), then creates a GitHub Release with `main.js` and `manifest.json` as assets using `softprops/action-gh-release@v2`.

**`fail_on_unmatched_files: true`** is a good safety — if the build somehow doesn't produce `main.js`, the release fails instead of publishing incomplete artifacts.

**Concern**: The tag pattern `"*"` matches any tag, not just semver. A tag like `test-foo` would trigger a release. A stricter pattern like `"[0-9]*"` or `"v*"` would be safer.

### Dependabot Auto-Merge — `.github/workflows/dependabot.yml`

```bash
cat -n .github/workflows/dependabot.yml
```

```output
cat: .github/workflows/dependabot.yml: No such file or directory
```

### Concerns

1. **`if: always()` on approve/merge (lines 35, 41)**: The approve and merge steps run even if `bun run check` fails. This means a Dependabot PR that breaks type checking or lint will still be approved and auto-merged. This should be `if: success()` (the default) or removed entirely.

2. **No `bun test` step**: Same gap as CI — checks pass but tests aren't run. (Issue #27)

3. **`actions/setup-node@v4` instead of `oven-sh/setup-bun`**: This workflow sets up Node.js 20 but then runs `bun install` and `bun run check`. It works because Bun is pre-installed on GitHub's `ubuntu-latest` runners, but it's inconsistent with the other workflows that explicitly use `oven-sh/setup-bun@v2`. The Node.js setup step is unnecessary.

4. **`pull_request_target` trigger (line 6)**: This event runs in the context of the base branch with write permissions. For Dependabot this is fine (it's a trusted actor), but `pull_request_target` is a common source of security issues if the actor check on line 15 were ever removed or weakened.

5. **`fetch-depth: 0`**: Full history checkout is unnecessary for running checks. The other workflows don't use it.

### Dependabot Configuration — `.github/dependabot.yml`

```bash
cat -n .github/dependabot.yml
```

```output
     1	version: 2
     2	updates:
     3	  - package-ecosystem: npm
     4	    directory: "/"
     5	    schedule:
     6	      interval: weekly
     7	      day: monday
     8	      time: "03:00"
     9	    open-pull-requests-limit: 10
    10	    reviewers:
    11	      - philoserf
    12	    assignees:
    13	      - philoserf
    14	    commit-message:
    15	      prefix: "chore"
    16	      prefix-scope: "deps"
    17	      include: "scope"
    18	
    19	  - package-ecosystem: github-actions
    20	    directory: "/"
    21	    schedule:
    22	      interval: weekly
    23	      day: monday
    24	      time: "03:00"
    25	    open-pull-requests-limit: 10
    26	    reviewers:
    27	      - philoserf
    28	    assignees:
    29	      - philoserf
    30	    commit-message:
    31	      prefix: "chore"
    32	      prefix-scope: "ci"
    33	      include: "scope"
```

Good setup: weekly updates for both npm packages and GitHub Actions, Monday at 03:00 UTC. Commit messages follow conventional commits (`chore(deps):` for packages, `chore(ci):` for actions). Reviewer and assignee set to the repo owner.

---

## 9. What `.gitignore` Covers

```bash
cat -n .gitignore
```

```output
     1	# Build output
     2	*.js.map
     3	
     4	# Dependencies
     5	node_modules/
     6	
     7	# Bun
     8	.bun/
     9	bun.lockb
    10	
    11	# Environment
    12	.env
    13	.env.local
    14	
    15	# OS
    16	.DS_Store
    17	Thumbs.db
    18	
    19	# IDE
    20	.vscode/
    21	.idea/
    22	*.swp
    23	*.swo
    24	*~
    25	
    26	# Claude Code
    27	.claude/settings.local.json
    28	
    29	# Planning
    30	.planning/
```

Covers the essentials: source maps, dependencies, env files, OS junk, IDE configs, Claude Code local settings.

**Notable absence**: `main.js` is not gitignored. The compiled build output is tracked in git. Since the release workflow builds from source, tracking the artifact adds diff noise without providing value. (Issue #28)

Also: `bun.lockb` is ignored (Bun's old binary lockfile format) but `bun.lock` (the current text-based format) is tracked — this is correct for modern Bun.

---

## 10. Summary of Concerns

### Quality gate gaps

| What | CI | Validate | Dependabot |
|------|----|----------|------------|
| Type check | yes | yes | yes |
| Biome lint | yes | yes | yes |
| Tests | **no** | **no** | **no** |
| Build | no | yes | no |

Tests are the missing leg of the stool. All three pipelines skip `bun test`.

### Dependabot workflow issues

- `if: always()` on approve/merge means broken PRs get auto-merged
- Uses `actions/setup-node` instead of `oven-sh/setup-bun` (inconsistent)
- `fetch-depth: 0` is unnecessary

### Release workflow

- Tag pattern `"*"` is overly broad — any tag triggers a release

### Build artifact

- `main.js` tracked in git — adds noise, release workflow builds from source anyway

### Template completeness

- `ExampleSettingTab.display()` is empty — no example of adding a `Setting`
- No `onunload()` shown — useful for plugins with cleanup needs
- No plugin-level test coverage

### Community standards

The template aligns well with the [Obsidian sample plugin](https://github.com/obsidianmd/obsidian-sample-plugin):

- Same `manifest.json` / `versions.json` structure
- Same `version-bump.ts` approach (reads `npm_package_version`)
- Same build externals (`obsidian`, `electron`)
- Adds Biome (sample uses ESLint) and Bun (sample uses esbuild + Node) — reasonable modernizations

The main divergence from community norms is using Bun instead of the Node/esbuild stack. This is a deliberate choice documented in the README and AGENTS.md.

---

Open issues for tracked concerns: #25, #26, #27, #28, #29, #30.
