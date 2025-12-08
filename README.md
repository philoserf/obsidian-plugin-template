# Obsidian Plugin Template

A minimal template for building Obsidian plugins with Bun and TypeScript.

## Features

- 🚀 **Bun** - Fast JavaScript runtime and package manager
- 📦 **esbuild** - Lightning-fast bundler
- 📘 **TypeScript** - Type-safe development
- 🎯 **Minimal** - Only what you need, nothing more

## Project Structure

```
.
├── src/              # TypeScript source files
│   └── main.ts       # Main plugin entry point
├── dist/             # Bundled output (generated)
├── manifest.json     # Plugin manifest
├── versions.json     # Version compatibility mapping
├── build.ts          # Build configuration
└── package.json      # Dependencies and scripts
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- [Obsidian](https://obsidian.md) installed

### Initial Setup

1. **Use this template** to create your new repository

2. **Clone your repository**
   ```bash
   git clone https://github.com/yourusername/your-plugin-name.git
   cd your-plugin-name
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Update plugin metadata** in `manifest.json`:
   - Change `id` to your unique plugin ID
   - Update `name`, `description`, and `author`
   - Set `authorUrl` to your GitHub profile or website

5. **Update `package.json`**:
   - Change `name` to match your plugin
   - Update `description` and `author`

## Development

### Build for development
```bash
bun run build
```

### Watch mode (rebuilds on file changes)
```bash
bun run dev
```

### Install in Obsidian

1. Build the plugin (creates `dist/main.js`)
2. Create a folder for your plugin in your vault's `.obsidian/plugins/` directory
3. Copy `manifest.json` and `dist/main.js` to that folder
4. Reload Obsidian
5. Enable your plugin in Settings → Community plugins

## Releasing

1. Update version in `package.json`
2. Run `bun run version` to update `manifest.json` and `versions.json`
3. Create a git tag and push:
   ```bash
   git tag -a 1.0.0 -m "Release 1.0.0"
   git push origin 1.0.0
   ```
4. Create a GitHub release with the tag
5. Attach `manifest.json` and `dist/main.js` to the release

## Customizing

- Edit `src/main.ts` to build your plugin
- Add new TypeScript files in `src/` as needed
- Update settings interface and tab as required
- Modify build configuration in `build.ts` if needed

## License

MIT
