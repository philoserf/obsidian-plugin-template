# Theory

_A Naur-style account of `obsidian-plugin-template` at 1.1.0: what you need to hold in mind
to change it without breaking the thing it exists to produce._

## What this repository is for

This repository is not a plugin. It is the seed of plugins, and its real users are **other
repositories**, the copies made when a new Obsidian plugin starts, plus the existing
philoserf plugins that port its patterns back in. The code runs and greets you, but the
greeting is not the product. The product is a shape: how a plugin is bundled, versioned,
tested, released, and how its settings and credentials are modelled. A change is good if it
improves every future copy and every port, and bad if it only tidies this copy.

New maintainers get this inversion wrong first. `greet()`, `ExamplePlugin`, `your-plugin-id`,
the ribbon icon and its `my-plugin-ribbon-class`, the four example settings, the
`your-plugin-api-key` suggestion and the `deploy` script that only echoes a path are not
dead code. They are the demonstration surface, and each is a filled-in example of one thing
Obsidian lets a plugin do. Here the test for scaffolding is not "is it used?" but "would a
copier be worse off without a worked example of it?" The README's "Make it yours" table and
its closing grep turn that surface into a contract. Each placeholder carries one of a few
greppable tokens, so a copy can be checked for leftovers mechanically. A new placeholder that
dodges those tokens breaks the contract silently.

## The one domain fact everything hangs from

Obsidian does not build plugins. It loads `manifest.json` and `main.js` from a vault's
`.obsidian/plugins/<id>/`, plus `styles.css` if there is one, and runs the JavaScript as it
is. The user's machine has no install step and no dependency resolution. Most of the
repository follows from that:

- **The build output is the artifact, so it is committed.** `main.js` is tracked. It was
  gitignored once (`673cbaa`) and restored (`3081162`), and issue #28 proposing the same is
  closed. Of everything here, this is what general good practice most wants to "fix".
- **A committed artifact can go stale, so CI refuses a stale one.** `main.yml` runs
  `bun run build` and then `git diff --exit-code main.js`. `release.yml` repeats the same
  diff before uploading, so the release asset is the committed bundle and cannot be a fresh
  build that happens to differ from it. The invariant is "the tree's `main.js` is what its
  source builds to", and two workflows enforce it.
- **Bun is unpinned on purpose, which pairs with the diff.** Both workflows use
  `bun-version: latest`, so a Bun release that shifts bundler output turns CI red. That is
  the signal working. The remedy is always to rebuild and commit, never to pin.
- **Dependabot is the diff's natural enemy, and the `rebuild` job is the truce.** Dependabot
  bumps `package.json` and `bun.lock` but cannot rebuild, so every bump to a bundled
  dependency would fail the diff. `main.yml`'s `rebuild` job runs only on Dependabot PRs. It
  rebuilds, commits `main.js` onto the PR branch, and dispatches CI for the new head, because
  a `GITHUB_TOKEN` push starts no workflow but a dispatch does. It covers Dependabot only.
  A Bun release stays a one-commit rebuild by hand, by design.
- **`obsidian` and `electron` are externals, and the format is CommonJS.** Obsidian supplies
  both modules at load time. The `build` and `dev` scripts in `package.json` say so as flags
  on one `bun build` line. Bundling either module produces a broken plugin, not a large one.
  There is no build script file. #72 deleted the one there was, because it restated that line
  worse.

## Version identity: three files, one writer, one floor

`package.json`, `manifest.json` and `versions.json` all carry version data, and they are not
three copies of one fact. A human edits only `package.json`. `version-bump.ts`, run through
`bun run version`, is the only writer of the other two. It overwrites the manifest's
`version` and appends `versions[version] = minAppVersion`.

`versions.json` is not a changelog. Obsidian uses it to serve an older build to an older app,
which makes it append-only: pruning it strands users. `minAppVersion` has exactly one home,
`manifest.json`, which a human edits when the code starts needing a newer API. The bump
script refuses a manifest without it. `JSON.stringify` would otherwise drop the `undefined`
and quietly lose the `versions.json` row. 1.1.0 is the first release where the floor moves,
from `1.0.0` to `1.13.0`. So `versions.json` now does real work: an Obsidian 1.12 user is
served 1.0.1.

`release.yml` closes the loop. It accepts only bare-semver tags (`[0-9]+.[0-9]+.[0-9]+`,
since `+` is a quantifier in GitHub's filter syntax), refuses a tag that disagrees with any
of the three files, and uploads `main.js`, `manifest.json` and `styles.css` if present. The
three-file rule lives in that one step. Adding a stylesheet needs no edit to the workflow.

## Settings are data, and credentials are not settings

1.1.0 moved the template onto Obsidian 1.13's declarative settings. This is now the
template's richest idea, and the pattern the philoserf plugins port to.

**The tab is data.** `ExampleSettingTab` returns `getSettingDefinitions()` and has no
`display()`. Once definitions are returned, `display()` is deprecated and never called.
Obsidian renders the definitions, indexes every row for settings search, and saves each
`control` row into `plugin.settings[key]`. So the settings' persistence contract changed
shape. A `control` row's `key` _is_ the binding, and nothing in the plugin calls
`saveSettings()` for it. A maintainer looking for "where does the name get saved?" will find
no code, and that absence is correct. The template shows one row of each common kind: text
with a validator, dropdown, toggle, and an `action` button. It is a menu to copy from, not a
form anyone needs.

**`validate` guards the UI, not the data.** The validator rejects an empty name as it is
typed. Obsidian's typings say it never repairs a stored value and that invariants on stored
data must be checked when reading settings. The template states that rule in a comment.
`loadSettings` does not follow it. It is a bare `Object.assign` over `DEFAULT_SETTINGS`, so a
`data.json` with an empty name, from a hand edit, a sync merge or an older version, loads as
is. `PluginSettings` is therefore a claim about persisted data that nothing checks. The
walkthrough pass filed this. It is the template's one example of stated-but-unenforced
intent.

**Credentials go to the keychain, and `data.json` holds only a name.** `data.json` is
plaintext and syncs, so the API key row cannot be a `control` row, which would write the
value itself. It is a `render` row that hosts a `SecretComponent`. The component hands back a
secret _ID_, and only the ID is saved, by hand, because `render` rows save nothing on their
own. `settings.test.ts` pins this: "keeps the API key out of the auto-saved controls" asserts
the row has `render` and no `control`. Turning that row into a `control` row is the most
damaging change someone could make in good faith.

**A secret's name and value live on different sides of sync.** The name syncs with
`data.json`. The value stays in the keychain of the device that stored it. On a second
device the row points at a name that device lacks, and Settings → Keychain is a different
screen. `secretStatus(id, onDevice, suggested)` exists for that gap. It turns the three
states (none chosen, present here, missing here) into the row's description, reading names
through `listSecrets()` and never a value. The suggested name is `your-plugin-api-key`, a
greppable placeholder. Naming a secret consistently lets plugins share one keychain entry.

**A description is computed, not live.** A definition's `desc` is evaluated when
`getSettingDefinitions()` runs, and that happens on `update()`, not on repaint. That is why
the secret row's `onChange` ends with `this.update()`. Without it, the description would
report the previous secret until the tab was rebuilt. It is also why the method carries
"Runs on every update(), so keep it cheap". Anything placed in a `desc` or `visible` runs on
every save of a hand-rendered row. The rule generalises: any description that reads state
needs the writer of that state to call `update()`.

## Where the test boundary is drawn

The rule: never instantiate `Plugin` in tests. Obsidian owns that class and drives its
lifecycle, so a test that constructs one tests a stub and passes for reasons unrelated to
the plugin. The project learned this and recorded it (#45, `f2bc2af`).

1.1.0 refines the boundary rather than breaking it. Two kinds of thing are tested:

- **Pure functions.** `greet` in `src/utils.ts`, a module with no `obsidian` import, and
  `secretStatus`, which is equally pure but sits in `main.ts` beside the tab it serves.
- **The settings tab, as data.** Its output is a plain array, so `settings.test.ts`
  constructs the tab with a stand-in plugin and an app whose keychain lists nothing, then
  asserts on the definitions. It needs no DOM and no lifecycle. Constructing
  `PluginSettingTab` is allowed where constructing `Plugin` is not, because the tab's
  constructor does nothing that matters and its output is the thing under test.

`src/test-preload.ts`, loaded via `bunfig.toml`, makes the second kind possible. Importing
`main.ts` evaluates `obsidian` value imports, which do not exist outside the app. The
preload's `mock.module` supplies the smallest stand-ins that let `main.ts` evaluate and the
tab build. The `PluginSettingTab` stub keeps `app` as the real one does, because the secret
row reads `app.secretStorage`. `SecretComponent` returns `this` from its setters because the
row chains them. The rule that follows: **every new `obsidian` value import needs a stub
here**, or every test that imports `main.ts` fails at load. Type-only imports are erased and
need none.

## The seams

**The Obsidian API.** It is externalised at build time, stubbed at test time, and
version-gated by `minAppVersion`. These are three mechanisms for one boundary, consistent only
because `minAppVersion` has one home. The 1.13 APIs (`getSettingDefinitions`, `update`,
`SecretComponent`, `secretStorage`) are the first that tie the floor to the code. Lowering
`minAppVersion` now means removing the settings pattern, not editing a number.

**GitHub.** CI, the Dependabot rebuild and the tag-triggered release all live in `.github/`.
They are the only enforcement of the bundle invariant and the version agreement, so a change
there is a change to the theory, not to tooling.

**The copier.** This seam has no code. It is the placeholder tokens, the checklist, and the
README's instruction to delete or regenerate `THEORY.md` and `WALKTHROUGH.md`, which describe
the template and not the copy. The copier grep also matches `CLAUDE.md`, through its
`obsidian-plugin-template` backlog pointer. The checklist says nothing about that file, though
most of it describes the template as a template. That gap is filed below.

**The release procedure.** No document restates it. README and `CLAUDE.md` both point at the
`release-gate` and `release-ship` skills, and the release workflow refuses what those skills
would refuse. That is deliberate. A procedure restated in each copy is how the process
drifted across the plugins before.

**Formatting.** Biome owns code and JSON, everything git does not ignore except `main.js`.
Prettier owns Markdown, with prose wrap preserved. #85 made Markdown formatting a
repository rule rather than an editor habit, so `bun run check`, and therefore `build`, fails
on unformatted Markdown. A docs-only change can fail the bundle build. That is surprising,
and it is the price of one gate.

## What the shape accommodates, and what it does not

Adding a **pure module** is free: drop it in `src/`, import it, write a sibling test.

Adding a **setting** is one field in `PluginSettings`, one default, and one row with a
`control.key`. Obsidian does the saving. A setting whose value must be valid needs a
load-time check too, which the template does not yet show.

Adding a **credential** means copying the secret row: a `render` row with a
`SecretComponent`, a hand save, an `update()`, and a `secretStatus` description. Reading the
value at use time goes through `app.secretStorage.getSecret(id)`, as the `PluginSettings`
comment says.

Adding a **stylesheet** is now one file. The release workflow picks it up.

Adding a **top-level `.ts` file** is two edits. Biome lints it automatically, but
`tsconfig.json`'s `include` is an explicit list, so it is not typechecked until added there.

Changing the **build** is the highest-risk edit, because any bundler-output change is a
repository-wide `main.js` diff. That cost is intended.

Moving below **Obsidian 1.13** would mean rethinking the settings tab and the credential
model, not editing a number.

## Uncertainties

These are inferences from the code and its history, not recovered intent.

- **Why `secretStatus` lives in `main.ts` rather than `utils.ts`.** The older pattern put pure
  logic in a module free of `obsidian` imports. `secretStatus` breaks it, and so needs the
  preload to load. My reading is that it stays beside the row because it is the row's
  meaning, and the preload makes the location cheap. A copier could equally read it as drift
  from the `utils.ts` pattern. I have not filed it.
- **`.prettierignore` lists `main.js`**, though both prettier scripts glob only `**/*.md`
  and could never reach it. #84 removed "unreachable ignores" the same day, just before #85 added this file. I read this as
  protection for a hand-run `prettier --write .` or an editor integration, not an
  oversight, but I am not certain.
- **Whether Dependabot keeps maintaining a PR the `rebuild` job has pushed to.** Dependabot
  generally stops rebasing a branch someone else has committed on. I have not seen how that
  plays out here: whether a later conflicting bump gets a fresh PR or a stuck one. Nothing in
  the repository records it.
- **The method `ExamplePlugin.greet` and the imported function `greet` share a name.** Inside
  the method, `greet(...)` resolves to the module import, which is correct but reads like
  recursion. I cannot tell whether the shared name is a deliberate "the method is the
  function, plus settings" or an accident of #82. It does no harm, so I have not filed it.
- **Whether the declarative tab fully replaces `display()` for every plugin that ports it.**
  The template uses rows the declarative API covers, plus one `render` escape hatch. A plugin
  with a heavily custom settings screen may need many `render` rows, and I cannot tell from
  here where the pattern stops paying.

## Index

| #   | Severity | Issue                                                                                                    | Primary location             |
| --- | -------- | -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1   | low      | The README's copier checklist says nothing about `CLAUDE.md`, which describes the template as a template | `README.md`, "Make it yours" |

**Total: 1 issue (0 critical, 0 high, 0 medium, 1 low)**

Related existing findings: the walkthrough pass filed the unenforced `Name` invariant
described under "Settings are data". It is not counted here.
