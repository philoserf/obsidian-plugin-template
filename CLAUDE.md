# CLAUDE.md

## Project Overview

Minimal template for Obsidian plugins using Bun as the build tool and runtime.

The current next step for this repo is tracked in the workspace backlog at `../NEXT.md` (the `obsidian-plugin-template` row). Read it when starting work; update it when that step ships.

## Development Commands

```bash
bun install              # Install dependencies
bun run dev              # Watch mode with auto-rebuild
bun run build            # Production build (runs check first)
bun run check            # Run all checks (typecheck + biome)
bun run typecheck        # TypeScript type checking only
bun run lint             # Biome lint + format check
bun run lint:fix         # Auto-fix lint and format issues
bun run format           # Format code with Biome
bun run version          # Sync package.json version to manifest.json + versions.json
bun test                 # Run tests
```

## Architecture

### Build System

- **Build script**: `build.ts` uses Bun's native bundler
- **Entry point**: `src/main.ts`
- **Output**: `./main.js` (CommonJS format, minified in production)
- **Externals**: `obsidian` and `electron` are not bundled

### Testing

Plugin lifecycle is exercised by Obsidian itself — never instantiate the `Plugin` class in tests. Test pure modules imported by `main.ts` (see `src/utils.ts` / `src/utils.test.ts` for the pattern).

### Release Process

Tag and push to trigger the GitHub Actions release workflow:

```bash
git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

## Code Style

Enforced by Biome: 2-space indent, organized imports, git-aware VCS integration.
