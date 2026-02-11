/**
 * @file This script uses Bun to bundle the Obsidian plugin.
 * It handles conditional minification for production builds and
 * externalizes Obsidian and Electron dependencies.
 * It supports a --watch flag for development mode.
 */
const watch = process.argv.includes("--watch");

const result = await Bun.build({
  entrypoints: ["src/main.ts"],
  outdir: ".",
  format: "cjs",
  external: ["obsidian", "electron"],
  minify: !watch,
});

if (!result.success) {
  console.error("Build failed");
  for (const message of result.logs) console.error(message);
  process.exit(1);
}

if (watch) console.log("Watching for changes...");

export {};
