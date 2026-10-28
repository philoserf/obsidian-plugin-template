# Obsidian Plugin Template

![Status: Stable](https://img.shields.io/badge/Status-Stable-brightgreen.svg)

Minimal template for Obsidian plugins using Bun.

## Make it yours

Copy the repository, then change each of these. The check at the end finds any you missed.

| File                                  | What                                                                                  | Change to                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `manifest.json`                       | `id` (`your-plugin-id`)                                                               | your plugin's id, which is also its folder name under `.obsidian/plugins/`                             |
| `manifest.json`                       | `name`, `description`                                                                 | the display name and one sentence                                                                      |
| `package.json`                        | `name` (`obsidian-plugin-template`), `description`                                    | your repository name and the manifest's sentence                                                       |
| `.env.local.example`                  | `OBSIDIAN_DEPLOY_DEST`                                                                | copy to `.env.local` with your vault's plugin folder, so `bun run build` installs into it              |
| `src/main.ts`, `src/settings.test.ts` | `ExamplePlugin`, `ExampleSettingTab`, `my-plugin-ribbon-class`, `your-plugin-api-key` | your own class names, CSS class and suggested secret name                                              |
| `CHANGELOG.md`, `versions.json`       | the template's own history                                                            | start your own; `versions.json` can begin as `{}`, and `bun run version` appends to it                 |
| `THEORY.md`, `WALKTHROUGH.md`         | documents about the template, not your plugin                                         | delete them, or regenerate them against your code with the `code-theory` and `code-walkthrough` skills |
| `CLAUDE.md`                           | the Project Overview and its `obsidian-plugin-template` backlog pointer               | a description of your plugin; keep the rest, which applies to any copy                                 |

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

**`bun run build` installs the plugin.** It ends with `deploy.ts`, which copies `main.js`, `manifest.json` and any `styles.css` into `OBSIDIAN_DEPLOY_DEST` from `.env.local`, so there is no separate deploy step; unset, the build stops at `./main.js`. `main.js` is gitignored build output: the vault gets it from the build, and a release attaches a fresh one.

## Release

Use the `release-gate` then `release-ship` skills, as `CLAUDE.md` says; do not tag by hand. Tags are bare semver (`1.2.3`) and must agree with `package.json`, `manifest.json` and `versions.json`.

## License

MIT
