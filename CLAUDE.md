# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
bun run lint          # ESLint and markdownlint
bun run lint:fix      # Auto-fix linting issues
bun run format        # Format code with Prettier
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

- **Main class**: `ExamplePlugin` extends Obsidian's `Plugin` class
- **Settings**: Type-safe settings with `loadSettings()` and `saveSettings()` methods
- **Settings tab**: `ExampleSettingTab` extends `PluginSettingTab` for UI configuration

### Configuration Files

- **[manifest.json](manifest.json)**: Obsidian plugin metadata (update before publishing)
- **[versions.json](versions.json)**: Maps plugin versions to minimum Obsidian versions
- **[tsconfig.json](tsconfig.json)**: TypeScript compiler options (noEmit mode, strict checking)
- **[eslint.config.js](eslint.config.js)**: Flat config format with TypeScript support

### Version Management

The [version-bump.ts](version-bump.ts) script syncs versions across files:

- Reads version from `package.json`
- Updates `manifest.json` version field
- Updates `versions.json` with new version and minimum Obsidian version

## Release Process

Tag and push to trigger GitHub Actions release:

```bash
git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

## TypeScript Configuration

- Target: ES2022
- Module resolution: bundler (Bun-style)
- Strict mode enabled
- No emit (bundler handles output)
