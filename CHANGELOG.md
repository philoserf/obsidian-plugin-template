# Changelog

## 1.2.0

### Added

- `bun run build` installs the plugin: it ends with `deploy.ts`, which copies `main.js`, `manifest.json` and any `styles.css` to `OBSIDIAN_DEPLOY_DEST` from `.env.local`, and stops at `./main.js` when that is unset
- `.env.local.example` showing `OBSIDIAN_DEPLOY_DEST`

### Changed

- `main.js` is gitignored and no longer tracked; a release attaches a fresh build. This reverses #28
- `version-bump.ts` reads `process.env` instead of `Bun.env`
- `deploy.ts` is typechecked, through `tsconfig.json`'s include list

### Removed

- The placeholder `deploy` script; the README's copier checklist points at `.env.local.example` instead

### Documentation

- Bring CLAUDE.md, README.md, THEORY.md and WALKTHROUGH.md current with the uncommitted bundle

## 1.1.1

### Fixed

- Store a cleared secret as `""` instead of `null`, which `SecretComponent` reports since `obsidian` 1.14.4
- Fall back to the default name when `data.json` holds a blank one, the rule `validate` enforces in the UI
- Turn off Biome 2.6's Markdown formatter, which disagreed with the Markdown formatter and failed `bun run check`

### Changed

- Type-check with `bun --check` instead of `tsc --noEmit`
- Format Markdown with `bun fmt` instead of Prettier; `prettier` leaves `devDependencies`
- Update dependencies

### Removed

- CI, check and release workflows; releases are cut locally
- Dependabot

### Documentation

- Bring THEORY.md and WALKTHROUGH.md current after CI's removal
- Name the `main.js` diff check in place of the removed CI
- List CLAUDE.md in the README's copier checklist

## 1.1.0

### Added

- Declarative settings tab via `getSettingDefinitions()`, with one row of each common kind
- `SecretComponent` example row that stores only a keychain secret ID in `data.json`, and whose description says whether this device's keychain has that secret
- Test preload that stubs the `obsidian` module, and settings-definition tests
- Copier checklist in the README
- Prettier config for Markdown
- CI rebuilds and commits `main.js` on Dependabot PRs

### Changed

- Require Obsidian 1.13.0 (`minAppVersion`)
- Replace `build.ts` with `bun build` scripts; `dev` now watches
- Drop `@types/node`; `version-bump.ts` reads `Bun.env` and refuses a manifest without `minAppVersion`
- Tighten `tsconfig.json`; test files are now typechecked
- Release workflow accepts bare-semver tags only, checks the tag against all three version files, requires the fresh build to match `main.js`, runs tests, and ships `styles.css` when present
- CI uses a read-only token, concurrency and a frozen lockfile
- Dependabot uses the bun ecosystem with grouped updates and a cooldown
- Drop alias scripts and redundant Biome and gitignore entries
- Update dependencies

### Removed

- Misleading `Plugin`-instantiation test
- Claude workflows and probot settings

### Documentation

- Add THEORY.md and refresh WALKTHROUGH.md
- Correct and expand CLAUDE.md
- Add a CI status badge to the README

## 1.0.1

### Fixed

- Keep the built main.js tracked: Obsidian loads the committed bundle directly
- Add types to tsconfig for TypeScript 6 compatibility

### Changed

- Use Bun APIs in version-bump.ts
- Upgrade actions/checkout v4 to v6 in Claude workflows
- CI workflow updates
- Remove validate-plugin script
- Update dependencies
- Normalize CI workflow whitespace
- Bump @types/node to 25.5.2

### Documentation

- Update LICENSE to MIT with current copyright

## 1.0.0

Initial release. A minimal template for Obsidian plugins using Bun.
