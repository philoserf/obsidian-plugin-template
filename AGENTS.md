# AGENTS.md

> **Note:** `CLAUDE.md` is a symlink to `AGENTS.md`. Edit `AGENTS.md` to change this content.

## Project Overview

Minimal template for Obsidian plugins using Bun as the build tool and runtime.

## Development Commands

```bash
bun install              # Install dependencies
bun run dev              # Watch mode with auto-rebuild
bun run build            # Production build (runs check first)
bun run check            # Run all checks (typecheck + lint + format check)
bun run typecheck        # TypeScript type checking only
bun run lint             # Biome linting and markdownlint
bun run lint:fix         # Auto-fix linting issues
bun run format           # Format code with Biome
bun run format:check     # Check formatting without changes
bun run version          # Sync package.json version → manifest.json + versions.json
```

## Architecture

### Build System

- **Build script**: `build.ts` uses Bun's native bundler
- **Entry point**: `src/main.ts`
- **Output**: `./main.js` (CommonJS format, minified in production)
- **Externals**: `obsidian` and `electron` are not bundled
- `bun run build` runs `check` before building

### Plugin Structure

`ExamplePlugin` in `src/main.ts` extends Obsidian's `Plugin` class with type-safe settings (`PluginSettings`) and `ExampleSettingTab` for UI configuration.

### Version Management

`version-bump.ts` reads the version from `package.json` (via `process.env.npm_package_version`) and syncs it to `manifest.json` and `versions.json`. Must be run as `bun run version`, not directly, so the env var is populated.

### Release Process

Tag and push to trigger the GitHub Actions release workflow:

```bash
git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

The workflow builds the plugin and uploads `main.js` and `manifest.json` as release assets.
