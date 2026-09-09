# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Minimal template for Obsidian plugins using Bun as the build tool and runtime. The real
consumers are the repositories copied from it, so a change is good if it improves every
future copy — the placeholder ids, `greet()`, the ribbon icon and the empty settings tab are
demonstration surface, not dead code.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the
`obsidian-plugin-template` row). Read it when starting work; update it when that step ships.

## Development Commands

`bun run` prints the full script list. The ones with behavior worth knowing:

```bash
bun install                      # Install dependencies
bun run build                    # Runs check, then bundles to ./main.js (minified)
bun run dev                      # Unminified build; despite the flag name it does NOT watch
bun run check                    # tsc --noEmit, then biome check .
bun run lint:fix                 # Auto-fix lint and format issues
bun run version                  # Sync package.json version into manifest.json + versions.json
bun test                         # Run tests
bun test src/utils.test.ts       # Run one test file
bun test -t "empty string"       # Run tests matching a name
```

`build` and `dev` both overwrite the tracked `main.js`. `dev` writes an *unminified* bundle,
so after using it run `bun run build` before committing or the CI diff fails.

## Architecture

### The committed bundle

Obsidian has no build step: it loads `manifest.json` and `main.js` straight out of a vault's
`.obsidian/plugins/<id>/`, so the committed `main.js` *is* the shipped plugin. Consequences,
in the order they bite:

- `main.js` is tracked on purpose. Gitignoring it has been tried and reverted; do not "fix"
  it again.
- Every source change must be committed together with a rebuilt `main.js`. CI
  (`.github/workflows/main.yml`) runs `bun run build` then `git diff --exit-code main.js`, so
  a stale bundle fails the PR.
- Bun is deliberately unpinned (`bun-version: latest` in the CI and release workflows), so a
  Bun release that shifts bundler output trips the same diff. The remedy is always rebuild
  and commit — never pin Bun to silence it.
- `build.ts` externalizes `obsidian` and `electron` and emits CommonJS. Bundling either
  module produces a broken plugin, not a large one.

### Version identity

`package.json` is the only file a human edits the version in. `bun run version`
(`version-bump.ts`) is the only writer of `manifest.json` and `versions.json`.
`versions.json` is not a changelog — it maps each plugin version to the `minAppVersion` that
build requires, and Obsidian reads it to serve older builds to older apps. It is append-only;
pruning it strands users. Nothing checks that a release tag matches `manifest.json`.

### Testing

Plugin lifecycle is exercised by Obsidian itself — never instantiate the `Plugin` class in
tests. Test pure modules imported by `main.ts` (see `src/utils.ts` / `src/utils.test.ts` for
the pattern). `bunfig.toml` preloads `src/test-preload.ts`, which `mock.module`s `obsidian` so
a pure module that happens to sit beside an `obsidian` import still loads under `bun test`.
Note that `tsconfig.json` excludes `*.test.ts`: test files are linted by Biome but not
typechecked by `bun run check`.

### Release

Use the `obsidian-gate` then `obsidian-ship` skills — do not tag by hand.
`.github/workflows/release.yml` fires on any tag (Obsidian convention is bare semver, no `v`
prefix) and uploads exactly `main.js` and `manifest.json` with `fail_on_unmatched_files`. A
plugin that grows a `styles.css` — a static file, not a build output — must have it added to
that list.

## Code Style

Enforced by Biome: 2-space indent, organized imports, git-aware VCS integration.
`biome.json`'s `files.includes` and `tsconfig.json`'s `include` are both explicit lists, so a
new top-level `.ts` file is neither linted nor typechecked until it is added to both.
