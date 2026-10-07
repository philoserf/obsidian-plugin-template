# Obsidian Plugin Template

![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen.svg)

Minimal template for Obsidian plugins using Bun.

## Make it yours

Copy the repository, then change each of these. The check at the end finds any you missed.

| File                                  | What                                                           | Change to                                                                                              |
| ------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `manifest.json`                       | `id` (`your-plugin-id`)                                        | your plugin's id, which is also its folder name under `.obsidian/plugins/`                             |
| `manifest.json`                       | `name`, `description`                                          | the display name and one sentence                                                                      |
| `package.json`                        | `name` (`obsidian-plugin-template`), `description`             | your repository name and the manifest's sentence                                                       |
| `package.json`                        | the `deploy` script                                            | a copy of `main.js` and `manifest.json` into your vault's plugin folder                                |
| `src/main.ts`, `src/settings.test.ts` | `ExamplePlugin`, `ExampleSettingTab`, `my-plugin-ribbon-class` | your own class names and CSS class                                                                     |
| `CHANGELOG.md`, `versions.json`       | the template's own history                                     | start your own; `versions.json` can begin as `{}`, and `bun run version` appends to it                 |
| `THEORY.md`, `WALKTHROUGH.md`         | documents about the template, not your plugin                  | delete them, or regenerate them against your code with the `code-theory` and `code-walkthrough` skills |

`author` and `authorUrl` in `manifest.json`, `author` in `package.json`, and the `LICENSE` copyright are the template owner's. Change them if that is not you.

Then check that nothing was missed; this should find nothing outside `README.md`:

```bash
grep -rnE 'your-plugin|Your Plugin|my-plugin|Example|obsidian-plugin-template|path/to/vault' \
  --exclude-dir=node_modules --exclude=main.js --exclude=bun.lock .
```

## Setup

```bash
bun install
```

Targets Obsidian 1.13.0 (`minAppVersion`): the settings tab uses declarative
`getSettingDefinitions()`, and credentials go in Obsidian's secret storage through
`SecretComponent`, never in `data.json`.

## Development

```bash
bun run dev    # Watch mode
bun run build  # Production build
bun run check  # Type check, lint, and format check
```

**`main.js` is committed.** Obsidian loads the built bundle straight from the plugin folder, with no build step, so the committed `main.js` is the plugin. Commit every source change together with a rebuilt `main.js` (`bun run build`); CI rebuilds and fails the pull request when the committed bundle differs. Do not gitignore it.

## Release

Use the `release-gate` then `release-ship` skills, as `CLAUDE.md` says; do not tag by hand. The release workflow runs on a bare-semver tag (`1.2.3`) and refuses one that disagrees with `package.json`, `manifest.json` or `versions.json`.

## License

MIT
