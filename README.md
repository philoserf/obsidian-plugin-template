# Obsidian Plugin Template

Minimal template for Obsidian plugins using Bun.

## Setup

```bash
bun install
```

Update `manifest.json` with your plugin details.

## Development

```bash
bun run dev    # Watch mode
bun run build  # Production build
bun run check  # Type check, lint, and format check
```

## Release

Tag and push to trigger GitHub Actions release:

```bash
git tag -a 1.0.0 -m "Release 1.0.0"
git push origin 1.0.0
```

## License

MIT
