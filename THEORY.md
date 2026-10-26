# Theory

_A Naur-style account of `obsidian-plugin-template` as of `1b724cd`, after 1.1.0: what you
need to hold in mind to change it without breaking the thing it exists to produce._

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
- **A committed artifact can go stale, and the repository no longer refuses a stale one.**
  The invariant is "the tree's `main.js` is what its source builds to". Until #93 two
  workflows enforced it. Now nothing in the repository does. `CLAUDE.md` says so in as many
  words, and the check is a habit: `bun run build`, then `git diff --exit-code main.js`. The
  places it still bites are outside the repository: the gate a change is shipped under, and
  `release-gate`'s check 16, which fails when a fresh build dirties the tree.
- **Bun is unpinned on purpose, which pairs with the diff.** A Bun release that shifts
  bundler output changes `main.js`. With CI gone, nobody hears about it until the next
  person runs the build. That is usually inside an unrelated change, whose gate then fails
  on a `main.js` diff that change did not cause. The remedy is still to rebuild and commit,
  never to pin. Expect it to land in whatever PR comes next.
- **Dependency bumps are by hand now, and some bumps break the check rather than the
  bundle.** #92 removed Dependabot and its `rebuild` job. A bump to a bundled dependency
  needs a rebuilt `main.js` in the same commit. A bump to a type-only dependency can fail
  `check` without changing a byte of output. #91 moved `obsidian` from 1.13.1 to 1.14.4,
  whose `SecretComponent.onChange` started reporting `string | null`, and `main` stopped
  typechecking until #96. The `obsidian` package is types only, since the app supplies the
  module at runtime, so its bumps are API-contract changes, not code changes.
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

Agreement between the three is checked at release, by `release-gate`'s version check, which
reads all three and wants each to match the version under test. Since #93 there is no
release workflow, so `release-ship` creates the GitHub release itself and attaches the assets
the gate's Obsidian profile names: `main.js`, `manifest.json`, and `styles.css` when one
exists. That list now lives in the skill, not in this repository. Adding a stylesheet still
needs no edit here.

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

**`validate` guards the UI. `settingsFrom` guards the data.** The validator rejects an empty
name as it is typed. Obsidian's typings say it never repairs a stored value, and that
invariants on stored data must be checked when reading settings. Since #100 the template
follows its own comment. `loadSettings` is `settingsFrom(await this.loadData())`, which
merges over `DEFAULT_SETTINGS` and then replaces a blank name with the default. A `data.json`
with an empty name, from a hand edit, a sync merge or an older version, now loads as
"Obsidian User". Two details matter to anyone extending it. The repair is a read-time view:
nothing writes it back, so `data.json` keeps the blank until something else saves. And it
re-checks exactly the rule the tab enforces, nothing more. A `name` that is not a string at
all would still throw at `trim()`. The pattern to copy is "every `validate` has a twin in
`settingsFrom`", not "`settingsFrom` makes stored data safe".

**Credentials go to the keychain, and `data.json` holds only a name.** `data.json` is
plaintext and syncs, so the API key row cannot be a `control` row, which would write the
value itself. It is a `render` row that hosts a `SecretComponent`. The component hands back a
secret _ID_, and only the ID is saved, by hand, because `render` rows save nothing on their
own. `settings.test.ts` pins this: "keeps the API key out of the auto-saved controls" asserts
the row has `render` and no `control`. Turning that row into a `control` row is the most
damaging change someone could make in good faith.

**"No secret" has one spelling, and it is `""`.** A cleared `SecretComponent` reports
`null`. The row stores `id ?? ""`, so a cleared control lands in the same state as a fresh
install. `DEFAULT_SETTINGS.apiKeySecret` is `""`, and `secretStatus` reads a falsy ID as "none
chosen". The null is converted once, at the component boundary, instead of being admitted
into `PluginSettings` and handled at `setValue` and `secretStatus`, which both take `string`.

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

The boundary has two sides that are tested:

- **Pure functions.** `greet` in `src/utils.ts`, a module with no `obsidian` import, and
  `secretStatus` and `settingsFrom`, which are equally pure but sit in `main.ts` beside what
  they serve. `settingsFrom` exists as a function precisely so the load-time rule can be
  tested without the lifecycle. It is `loadSettings` minus `this`.
- **The settings tab, as data.** Its output is a plain array, so `settings.test.ts`
  constructs the tab with a stand-in plugin and an app whose keychain lists nothing, then
  asserts on the definitions. It needs no DOM and no lifecycle. Constructing
  `PluginSettingTab` is allowed where constructing `Plugin` is not, because the tab's
  constructor does nothing that matters and its output is the thing under test.

`src/test-preload.ts`, loaded via `bunfig.toml`, makes both possible for anything in
`main.ts`. Importing `main.ts` evaluates `obsidian` value imports, which do not exist outside
the app. The preload's `mock.module` supplies the smallest stand-ins that let `main.ts`
evaluate and the tab build. The `PluginSettingTab` stub keeps `app` as the real one does,
because the secret row reads `app.secretStorage`. `SecretComponent` returns `this` from its
setters because the row chains them. The rule that follows: **every new `obsidian` value
import needs a stub here**, or every test that imports `main.ts` fails at load. Type-only
imports are erased and need none.

Typechecking reaches the tests too, through `tsconfig.json`'s `src/**/*.ts`. Since #97 the
checker is `bun --check`, not `tsc`. The flag spelling is load-bearing: this repository has a
`check` script, and bare `bun check` runs a script of that name before the built-in, so
`typecheck` would call `check`, which calls `typecheck`. The `typescript` dev dependency
stays, although no script runs it, because the editor's language server loads the workspace
copy. A reduction pass will see an unused dependency. It is used, just not by `bun run`.

## The seams

**The Obsidian API.** It is externalised at build time, stubbed at test time, typed by a
dev dependency, and version-gated by `minAppVersion`. These are four mechanisms for one
boundary, consistent only because `minAppVersion` has one home. The 1.13 APIs
(`getSettingDefinitions`, `update`, `SecretComponent`, `secretStorage`) are the first that tie
the floor to the code. Lowering `minAppVersion` now means removing the settings pattern, not
editing a number. Raising the `obsidian` package can change a signature under you, as #91
did, without changing what the app does.

**The workstation.** This seam replaced GitHub. #92 and #93 retired Dependabot, CI and the
release workflow "in favour of local tooling", and the repository now has no `.github/`.
The enforcement did not disappear. It moved into the `release-gate` and `release-ship`
skills and into the gate a change is shipped under, all of which live outside this tree. So
the repository states its invariants (in `CLAUDE.md`) but does not carry the machinery that
checks them. A change to that machinery is a change to the theory, and it is now invisible
from here. Nothing in this repository names a single gate command either. There is no
`Taskfile.yml`, and the gate is the sequence `CLAUDE.md` describes, run by habit or by a skill.

**The copier.** This seam has no code. It is the placeholder tokens, the checklist, and the
README's instructions for the files that describe the template rather than the copy: delete
or regenerate `THEORY.md` and `WALKTHROUGH.md`, and rewrite `CLAUDE.md`'s overview and
backlog pointer while keeping the rest (#99). The copier grep matches `CLAUDE.md` only
through that pointer, so a copy that follows every row leaves hits only in `README.md`. A
copier also inherits the workstation seam. The README and `CLAUDE.md` send releases through
`release-gate` and `release-ship`, which a copy does not contain.

**The release procedure.** No document restates it. README and `CLAUDE.md` both point at the
two skills. That is deliberate. A procedure restated in each copy is how the process drifted
across the plugins before. It is also now the whole procedure, since no workflow stands
behind the skills to refuse what they would refuse.

**Formatting.** Biome owns code and JSON, everything git does not ignore except `main.js`.
`bun fmt` owns Markdown, reading `.prettierrc.json`, so prose wrap stays preserved. #85
made Markdown formatting a repository rule rather than an editor habit, so `bun run check`,
and therefore `build`, fails on unformatted Markdown. A docs-only change can fail the bundle
build. That is surprising, and it is the price of one gate.

## What the shape accommodates, and what it does not

Adding a **pure module** is free: drop it in `src/`, import it, write a sibling test.

Adding a **setting** is one field in `PluginSettings`, one default, and one row with a
`control.key`. Obsidian does the saving. If the row has a `validate`, the same rule goes into
`settingsFrom`, with a test beside the existing ones.

Adding a **credential** means copying the secret row: a `render` row with a
`SecretComponent`, a hand save with `?? ""`, an `update()`, and a `secretStatus`
description. Reading the value at use time goes through `app.secretStorage.getSecret(id)`, as
the `PluginSettings` comment says.

Adding a **stylesheet** is one file. `release-ship` attaches it when present.

Adding a **top-level `.ts` file** is two edits. Biome lints it automatically, but
`tsconfig.json`'s `include` is an explicit list, so it is not typechecked until added there.

Changing the **build** is the highest-risk edit, because any bundler-output change is a
repository-wide `main.js` diff. That cost is intended.

Moving below **Obsidian 1.13** would mean rethinking the settings tab and the credential
model, not editing a number.

Bringing **CI back** would be a choice to move enforcement back into the repository, not a
tooling tweak. The 1.1.0 workflows (`main.yml`, `release.yml`, deleted in `9866f59`) are the
reference for what it used to check.

## Uncertainties

These are inferences from the code and its history, not recovered intent.

- **Who the copier is.** The README's checklist reads as if anyone might copy this
  repository, but its release instructions depend on skills that exist only in the
  philoserf Claude configuration, and the retirement of CI removed the one enforcement a
  stranger's copy would have inherited. I read the intended copier as philoserf, starting
  another of their own plugins. If outside copiers matter, the gap between "states its
  invariants" and "enforces them" is theirs to discover.
- **Why `secretStatus` and `settingsFrom` live in `main.ts` rather than `utils.ts`.** The
  older pattern put pure logic in a module free of `obsidian` imports. These two break it, and
  so need the preload to load. My reading is that each stays beside what it serves, the row
  and `loadSettings`, and the preload makes the location cheap. With two such functions this
  now looks like the pattern rather than drift, and `utils.ts` like the older example. I
  cannot tell whether `greet` would be placed in `utils.ts` if written today.
- **Whether `settingsFrom` should write its repair back.** It does not, so a repaired blank
  name stays blank in `data.json` until the next save of any setting. That keeps loading free
  of side effects, which may be the point, but nothing records the choice.
- **How far `bun --check` can be trusted as the only checker.** It is new in Bun 1.4.3. On
  this tree it agreed with `tsc` from TypeScript 7.0.2 (both clean) and failed `check` on a
  planted error. That is two observations, not a conformance record for this configuration
  (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`).
- **`.prettierignore` lists `main.js`**, though both `bun fmt` scripts glob only `**/*.md`
  and could never reach it. #84 removed "unreachable ignores" the same day, just before #85
  added this file. I read this as protection for a hand-run `bun fmt .` or an editor
  integration, not an oversight, but I am not certain.
- **The method `ExamplePlugin.greet` and the imported function `greet` share a name.** Inside
  the method, `greet(...)` resolves to the module import, which is correct but reads like
  recursion. I cannot tell whether the shared name is a deliberate "the method is the
  function, plus settings" or an accident of #82. It does no harm, so I have not filed it.
- **Whether the declarative tab fully replaces `display()` for every plugin that ports it.**
  The template uses rows the declarative API covers, plus one `render` escape hatch. A plugin
  with a heavily custom settings screen may need many `render` rows, and I cannot tell from
  here where the pattern stops paying.
