import { watch as bunWatch } from "fs";
import { builtinModules } from "module";

const prod = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const external = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  ...builtinModules,
];

async function build() {
  const result = await Bun.build({
    entrypoints: ["src/main.ts"],
    outdir: "dist",
    target: "node",
    format: "cjs",
    sourcemap: prod ? "none" : "inline",
    minify: prod,
    external,
  });

  if (!result.success) {
    console.error("Build failed");
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log("Build complete");
}

if (watch) {
  console.log("Watching for changes...");
  const watcher = bunWatch("src", { recursive: true }, async () => {
    await build();
  });
  await build();
  process.on("SIGINT", () => {
    watcher.close();
    process.exit(0);
  });
} else {
  await build();
}
