# Agents guidance

This file provides guidance to AI agents when working with code in this repository.

## Project Overview

Minimal template for Obsidian plugins using Bun as the build tool and runtime.

## Development Commands

### Setup

```bash
bun install
```

### Build and Development

```bash
bun run dev     # Watch mode with auto-rebuild
bun run build   # Production build (runs check first)
```

### Code Quality

```bash
bun run check         # Run all checks (typecheck + lint + format check)
bun run typecheck     # TypeScript type checking only
bun run lint          # Biome linting and markdownlint
bun run lint:fix      # Auto-fix linting issues
bun run format        # Format code with Biome
bun run format:check  # Check formatting without changes
```

### Versioning

```bash
bun run version  # Update manifest.json and versions.json from package.json version
```

## Architecture

### Build System

- **Build script**: [build.ts](build.ts) uses Bun's native bundler
- **Entry point**: [src/main.ts](src/main.ts)
- **Output**: `dist/main.js` (CommonJS format)
- **Externals**: `obsidian` and `electron` are marked as external dependencies
- Watch mode available via `--watch` flag

### Plugin Structure

- **Main class**: `ExamplePlugin` extends `Plugin` with type-safe settings and `ExampleSettingTab` for UI configuration

### Configuration Files

- **[manifest.json](manifest.json)**: Obsidian plugin metadata
- **[versions.json](versions.json)**: Maps plugin versions to minimum Obsidian versions
- **[tsconfig.json](tsconfig.json)**: TypeScript compiler options (ES2022, noEmit, strict mode)
- **[biome.json](biome.json)**: Linting and formatting configuration

### Version Management

The [version-bump.ts](version-bump.ts) script syncs `package.json` version to `manifest.json` and `versions.json`

## Release Process

Tag and push to trigger GitHub Actions release:

```bash
git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

## TypeScript Configuration

See tsconfig.json for target ES2022, bundler module resolution, strict mode, and noEmit configuration.
