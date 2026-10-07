# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal template for Obsidian plugins using Bun as the build tool and runtime. The real
consumers are the repositories copied from it, so a change is good if it improves every
future copy — the placeholder ids, `greet()`, the ribbon icon and the example settings tab are
demonstration surface, not dead code.

The settings tab is the pattern the philoserf plugins port to: declarative
`getSettingDefinitions()` (Obsidian 1.13.0, hence `minAppVersion`), one row of each common
kind, and a `render` row with a `SecretComponent` for credentials, which store only a secret
ID in `data.json`. There is no `display()`; it is deprecated and never called once
definitions are returned.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the
`obsidian-plugin-template` row). Read it when starting work; update it when that step ships.

## Development Commands

`bun run` prints the full script list. The ones with behavior worth knowing:

```bash
bun run build                    # Runs check, then bundles to ./main.js (minified)
bun run dev                      # Unminified build, rebuilt on every change (watch mode)
bun run check                    # tsc --noEmit, biome check ., then prettier --check on Markdown
bun run lint:fix                 # Auto-fix lint and format issues (Biome and prettier)
bun run version                  # Sync package.json version into manifest.json + versions.json
bun test src/utils.test.ts       # Run one test file
bun test -t "empty string"       # Run tests matching a name
```

`build` and `dev` both overwrite the tracked `main.js`. `dev` writes an _unminified_ bundle,
so after using it run `bun run build` before committing or the CI diff fails.

## Architecture

### The committed bundle

Obsidian has no build step: it loads `manifest.json` and `main.js` straight out of a vault's
`.obsidian/plugins/<id>/`, so the committed `main.js` _is_ the shipped plugin. Consequences,
in the order they bite:

- `main.js` is tracked on purpose. Gitignoring it has been tried and reverted; do not "fix"
  it again.
- Every source change must be committed together with a rebuilt `main.js`. CI
  (`.github/workflows/main.yml`) runs `bun run build` then `git diff --exit-code main.js`, so
  a stale bundle fails the PR.
- Bun is deliberately unpinned (`bun-version: latest` in the CI and release workflows), so a
  Bun release that shifts bundler output trips the same diff. The remedy is always rebuild
  and commit — never pin Bun to silence it.
- The `build` and `dev` scripts call `bun build` directly — there is no build script file.
  They externalize `obsidian` and `electron` and emit CommonJS. Bundling either
  module produces a broken plugin, not a large one.

### Version identity

`package.json` is the only file a human edits the version in. `bun run version`
(`version-bump.ts`) is the only writer of `manifest.json` and `versions.json`.
`versions.json` is not a changelog — it maps each plugin version to the `minAppVersion` that
build requires, and Obsidian reads it to serve older builds to older apps. It is append-only;
pruning it strands users. The release workflow refuses a tag that disagrees with
`package.json`, `manifest.json` or `versions.json`, so a skipped `bun run version` fails the
release rather than shipping a mislabelled manifest.

### Testing

Plugin lifecycle is exercised by Obsidian itself — never instantiate the `Plugin` class in
tests. Test pure modules imported by `main.ts` (see `src/utils.ts` / `src/utils.test.ts` for
the pattern). `bunfig.toml` preloads `src/test-preload.ts`, which `mock.module`s `obsidian` so
a pure module that happens to sit beside an `obsidian` import still loads under `bun test`.
The settings tab is the one class tested directly: its definitions are data, so
`src/settings.test.ts` asserts on `getSettingDefinitions()` with a stand-in plugin and no DOM.
A new `obsidian` value import needs a stub in the preload.
Test files are typechecked by `bun run check` along with the rest of `src/`.

### Release

Use the `release-gate` then `release-ship` skills — do not tag by hand.
`.github/workflows/release.yml` fires only on bare-semver tags (`1.2.3`; Obsidian convention
is no `v` prefix), checks the tag against the three version files, rebuilds and requires the
result to match the committed `main.js`, runs the tests, and uploads `main.js`,
`manifest.json` and — if the plugin has one — `styles.css`.

## Code Style

Biome checks every file git does not ignore, except the minified `main.js`
(`"includes": ["**", "!main.js"]`). `tsconfig.json`'s `include` is still an explicit list, so a
new top-level `.ts` file is linted but not typechecked until it is added there.

Prettier owns Markdown only (`"**/*.md"` in the `check` and `lint:fix` scripts), with
`proseWrap: preserve`; `.prettierignore` keeps it out of `main.js` and `.issues/`.
