import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const packageRoot = resolve(workspaceRoot, "..");
const versionFile = resolve(packageRoot, ".version");
const version = readFileSync(versionFile, "utf8").trim();

if (!version) {
  throw new Error(`version file is empty: ${versionFile}`);
}

updateJSON(resolve(workspaceRoot, "package.json"), (pkg) => {
  pkg.version = version;
  return pkg;
});

updateJSON(resolve(workspaceRoot, "packages", "sync-core", "package.json"), (pkg) => {
  pkg.version = version;
  return pkg;
});

updateText(
  resolve(workspaceRoot, "packages", "sync-core", "src", "metadata.ts"),
  /export const SYNC_CORE_PACKAGE_VERSION = "[^"]+";/,
  `export const SYNC_CORE_PACKAGE_VERSION = "${version}";`,
);

updateText(
  resolve(packageRoot, "version.go"),
  /const Version = "[^"]+"/,
  `const Version = "${version}"`,
);

function updateJSON(path, update) {
  const value = JSON.parse(readFileSync(path, "utf8"));
  const next = update(value);
  writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`);
}

function updateText(path, pattern, replacement) {
  const current = readFileSync(path, "utf8");
  if (!pattern.test(current)) {
    throw new Error(`pattern not found in ${path}`);
  }
  writeFileSync(path, `${current.replace(pattern, replacement)}`);
}
