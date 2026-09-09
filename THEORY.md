# Theory

_A Naur-style account of `obsidian-plugin-template`: what you need to hold in mind to change
it without breaking the thing it exists to produce._

## What this repository is for

This repository is not a plugin. It is the seed of plugins, and almost every decision in it
only makes sense once you accept that its real users are **other repositories** — the copies
someone makes when they start a new Obsidian plugin. The code here runs, and it even does
something (it greets you), but the greeting is not the product. The product is the shape:
the build script, the version-sync script, the CI gate, the test boundary, and the set of
files that a plugin must ship. A change is good if it makes every future copy better, and
bad if it merely makes this copy tidier.

That inversion is the first thing a new maintainer gets wrong. `greet()`, `ExamplePlugin`,
`your-plugin-id`, the ribbon icon, the empty settings tab, the `deploy` script that only
echoes a path — none of these are dead code or unfinished work. They are the demonstration
surface. Deleting them because nothing calls them removes the only worked example of each
extension point Obsidian offers. The correct test for a piece of scaffolding here is not
"is it used?" but "would a copier be worse off without a filled-in example of it?"

## The one domain fact everything hangs from

Obsidian does not build plugins. It loads a folder out of a vault's
`.obsidian/plugins/<id>/` directory containing a `manifest.json` and a `main.js`, and it
runs that JavaScript directly. There is no install step, no bundler, no dependency
resolution on the user's machine. Whatever `main.js` says at the moment it is copied into a
vault is what runs.

Almost the entire design falls out of that:

- **The build output is the artifact, so the artifact is committed.** `main.js` is a tracked
  file. This is the single most counterintuitive thing in the repo and the one most likely
  to be "fixed" by someone applying general good practice. It has already been fixed once
  and reverted: commit `673cbaa` gitignored `main.js`, commit `3081162` restored it, and
  GitHub issue #28 ("Consider gitignoring main.js build artifact") is closed. The changelog
  for 1.0.1 still carries both halves of that round trip as if they were two separate
  changes.
- **A committed artifact can go stale, so CI refuses to let it.** `.github/workflows/main.yml`
  runs `bun run build` and then `git diff --exit-code main.js`. If the bundle a fresh build
  produces differs from the one in the tree, the pull request fails. This is the load-bearing
  invariant of the repository, and the comment above it in the workflow is the best piece of
  design documentation in the codebase — read it before you touch anything in that file.
- **Bun is deliberately unpinned**, and that decision and the diff check are a matched pair.
  `setup-bun` asks for `bun-version: latest` in both the CI and release workflows. A bun
  release that changes bundler output will therefore trip the `main.js` diff. That is
  intended: `release.yml` also builds with the latest bun, so the committed bundle should
  always match what a release would ship. The remedy for a red diff is always the same —
  rebuild and commit `main.js` — and never to pin bun to make the signal go away.
- **`obsidian` and `electron` are externals, and the format is CommonJS.** `build.ts` says so
  in four lines. Obsidian supplies both modules to the plugin at load time; bundling either
  produces a broken plugin rather than a large one.

## Version identity lives in three files with one writer

`package.json`, `manifest.json`, and `versions.json` all carry version information, and they
are not three copies of the same fact.

`package.json` is the only place a human edits the version. `version-bump.ts` is the only
writer of the other two, and it reads its input from `process.env.npm_package_version` —
which means it is not a general-purpose script but a package-manager lifecycle script. Run
without that variable set it throws, and that throw is the guard, not a bug. Be precise
about how weak a guard it is: `bun run` populates the `npm_package_*` environment for any
file it executes, so `bun run version-bump.ts` succeeds and rewrites both files exactly as
`bun run version` would (verified: it is idempotent at the current version, and only the
bare `bun version-bump.ts` throws). The guard catches direct execution, not misuse.

`versions.json` is the piece most often misread. It is not a changelog and not a list of
releases; it is a map from plugin version to the **minimum Obsidian version** that build
requires, and Obsidian consults it to decide which build of a plugin to hand to a user
running an older app. That is why `version-bump.ts` writes
`versions[targetVersion] = minAppVersion` — pulling `minAppVersion` out of `manifest.json`,
the file where the human declares it — and why it only ever adds keys. The map is append-only
by nature: dropping an old entry strands users on old Obsidian builds. Anyone tempted to
"clean up" `versions.json` down to the current release is deleting compatibility metadata.

`release.yml` closes the loop by uploading exactly `main.js` and `manifest.json` to the
GitHub release, with `fail_on_unmatched_files: true`. That list is the definition of what a
plugin _is_ on this side of the boundary, and it is the file to change — not just the build
script — if a plugin ever grows a `styles.css`.

## Where the test boundary is drawn, and why it is there

The rule is stated in `CLAUDE.md` in one line: never instantiate the `Plugin` class in tests.
The reasoning behind it is worth more than the rule.

`Plugin` is not a class this codebase owns. It is supplied by the Obsidian runtime, and its
lifecycle — `onload`, command registration, ribbon icons, settings tabs — is driven by the
application, not by the plugin. A test that constructs a `Plugin` is therefore testing a
stub of Obsidian rather than the plugin, and it passes for reasons unrelated to whether the
plugin works. The project learned this the hard way and recorded it: GitHub issue #45
("Replace misleading Plugin-instantiation test with a pure helper test") and commit
`f2bc2af` ("test: drop misleading Plugin-instantiation test") are the same event. The
boundary the project settled on is **pure modules only** — `src/utils.ts` and
`src/utils.test.ts` are the pattern, and they exist to demonstrate the pattern rather than
because `greet()` needed covering.

`src/test-preload.ts` is the piece that resists easy explanation, because nothing currently
needs it. It registers a `mock.module("obsidian", …)` via `bunfig.toml`'s `[test] preload`,
supplying stub `Plugin`, `Notice`, and `PluginSettingTab` classes. No test in the repository
imports `obsidian`, directly or transitively. It is not there to enable Plugin tests — that
is the thing the project decided against. It is there so that a pure module which happens to
sit in a file that also imports something from `obsidian` can still be loaded under
`bun test` without the import blowing up at module-evaluation time. In a template, its job
is to already be present the first time a copier hits that wall, rather than to be doing
work today. The `hide()` method on the `Notice` stub is a small tell in the same direction:
someone hit a call that needed to exist, not a test that needed to pass.

## The seams

**The Obsidian API.** Externalized at build time, stubbed at test time, and version-gated by
`minAppVersion` flowing from `manifest.json` into `versions.json`. Three different mechanisms
for one boundary, each addressing a different consumer, and they are only consistent because
`minAppVersion` has exactly one authoritative home.

**GitHub Releases.** `release.yml` fires on tag pushes matching `"*"`, builds, and publishes
the two-file payload. Note that nothing verifies the tag matches the version in
`manifest.json`; the tag is trusted. Obsidian's community-plugin convention is a bare semver
tag with no `v` prefix, which is what `README.md`'s example uses and what the `"*"` glob
happily accepts alongside anything else.

**The copier.** This seam has no code. It is `manifest.json`'s placeholder `id`, `name`, and
`description`; the `deploy` script that echoes a path instead of copying anything; and the
`my-plugin-ribbon-class` that no stylesheet defines. These are handoff points, and the fact
that they are inert is the design. The weakness is that nothing enumerates them — a copier
finds them by reading everything.

**The release procedure.** The thinnest seam, and the one currently broken. Commit `ed7928d`
deliberately removed the tagging instructions from `CLAUDE.md` and replaced them with a
pointer to two skills, on the explicit reasoning that a restated procedure is how the process
drifted across seven plugin repos. The intent is sound and the mechanism is right. The
pointer itself is wrong — it names skills that do not exist — and `README.md` was never
updated, so the repository now says "do not tag by hand" in one file and demonstrates hand
tagging in the other. Both are filed below.

## What the shape accommodates, and what it does not

Adding a **pure module** is free: drop it in `src/`, import it from `main.ts`, write a
sibling `.test.ts`, and every existing mechanism already covers it.

Adding a **setting** touches four places and the type system will only warn you about two of
them. `PluginSettings` is `Record<string, never>` — a deliberate "no settings yet" marker
that makes the empty `DEFAULT_SETTINGS` type-check. Widening it is step one; extending
`DEFAULT_SETTINGS` is step two; putting controls in `ExampleSettingTab.display()`, which
currently only clears its container, is step three; and calling `saveSettings()`, which is
defined and never invoked, is step four. Note that `loadSettings()` merges whatever
`loadData()` returns from disk over the defaults, so the declared type is a claim about
persisted data that nothing validates.

Adding a **stylesheet** is where an unaware maintainer causes real damage, because it looks
like a one-file change and is not. `main.ts` already applies `my-plugin-ribbon-class` to the
ribbon icon, so the hook exists; but `styles.css` is a third file Obsidian loads from the
plugin folder, and it appears in neither `build.ts`'s output nor `release.yml`'s upload list.
A plugin that adds `styles.css` and ships without amending `release.yml` releases silently
unstyled, and `fail_on_unmatched_files` will not catch it — that flag guards against a
missing file in the list, not a missing entry in it.

Changing the **build** is the highest-risk edit in the repo, because `main.js` is committed
and the CI diff makes any bundler-output change a repository-wide event rather than a local
one. That is the intended cost.

## Uncertainties

Marked plainly, because these are inferences from code and history rather than recovered
intent.

- **`Plugin["app"]` in the settings-tab constructor.** `ExampleSettingTab` types its first
  parameter as `Plugin["app"]` instead of importing `App` from `obsidian`. It is correct and
  it saves an import, and in a template fewer imports means less for a copier to prune — but
  it is a non-obvious idiom next to Obsidian's own sample plugin, which uses `App`. I cannot
  tell whether this was a considered choice or an autocomplete artifact, and I have not filed
  it either way.
- **The tsconfig test exclusion.** `tsconfig.json` excludes `src/**/*.test.ts` from
  type checking. I read this as accidental rather than principled and filed it as a finding,
  but a deliberate reading exists: test files are checked by Biome, and excluding them keeps
  `tsc` from needing `bun:test` ambient types. I think the deliberate reading is weak,
  because `types: ["bun", "node"]` is already configured, but I could be wrong about the
  original motive.
- **`scripts/**/*.ts` in `biome.json`.** No such directory exists, and commit `d1436d8`
  removed a `validate-plugin` script. I am confident this is residue, less confident that it
  was that particular removal that orphaned it.
- **Commit `8eda692`'s message describes edits it did not make.** It claims to update
  references in `CLAUDE.md`, `README.md`, and `.prettierignore`; the diff is a bare rename
  and the repository has no `.prettierignore` at all. The most likely explanation is a
  message written for a sweep across several plugin repos and reused here, where there
  happened to be nothing to update. Nothing in the working tree is wrong as a result, so I
  have not filed it — but if you are reading commit messages as design intent, this one is
  not evidence about this repository.
- **The existing `WALKTHROUGH.md` is stale.** It describes `src/main.test.ts`, a file that
  does not exist under that name, and omits `src/test-preload.ts` entirely. It predates the
  test restructuring in `f2bc2af`/`d32a6aa`. I have not filed this because it is being
  regenerated in the same review pass that produced this document.

## Index

| #   | Severity | Issue                                                      | Primary location                  |
| --- | -------- | ---------------------------------------------------------- | --------------------------------- |
| 1   | medium   | `claude-md-names-release-skills-that-do-not-exist`         | `CLAUDE.md:40`                    |
| 2   | medium   | `readme-and-claude-md-give-opposite-release-instructions`  | `README.md:21-28`, `CLAUDE.md:40` |
| 3   | medium   | `test-files-are-excluded-from-typechecking`                | `tsconfig.json:13`                |
| 4   | low      | `biome-includes-a-scripts-directory-that-does-not-exist`   | `biome.json:13`                   |
| 5   | low      | `changelog-1-0-1-records-a-change-that-was-reverted-in-it` | `CHANGELOG.md:7,14`               |

**Total: 5 issues (0 critical, 0 high, 3 medium, 2 low)**
