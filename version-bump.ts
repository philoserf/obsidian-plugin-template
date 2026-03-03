/**
 * @file This script automates the version bumping process for the Obsidian plugin.
 * It reads the version from `package.json` and updates `manifest.json` and
 * `versions.json` accordingly, ensuring consistency across plugin metadata files.
 */
import { readFileSync, writeFileSync } from "node:fs";

const targetVersion = process.env.npm_package_version;
if (!targetVersion) {
  throw new Error("No version found in package.json");
}

// Update manifest.json
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);

// Update versions.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", `${JSON.stringify(versions, null, 2)}\n`);

console.log(`Updated to version ${targetVersion}`);
