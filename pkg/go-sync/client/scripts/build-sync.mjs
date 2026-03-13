import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const packageRoot = resolve(workspaceRoot, "..");
const syncCoreRoot = resolve(workspaceRoot, "packages", "sync-core");
const distRoot = resolve(syncCoreRoot, "dist");
const embedRoot = resolve(packageRoot, "data", "client", "sync-core");
const pkg = JSON.parse(readFileSync(resolve(syncCoreRoot, "package.json"), "utf8"));

const requiredRuntimeFiles = unique(
  [
    pkg.main,
    pkg.module,
    ...Object.values(pkg.exports ?? {}).flatMap((entry) =>
      typeof entry === "string" ? [entry] : [entry.import, entry.default],
    ),
  ].filter(Boolean),
);

for (const relativePath of requiredRuntimeFiles) {
  const fullPath = resolve(syncCoreRoot, relativePath);
  if (!existsSync(fullPath)) {
    throw new Error(`required runtime artifact missing: ${relativePath}`);
  }
}

mkdirSync(resolve(packageRoot, "data", "client"), { recursive: true });
rmSync(embedRoot, { recursive: true, force: true });
mkdirSync(embedRoot, { recursive: true });
cpSync(distRoot, embedRoot, { recursive: true });

const sourceFiles = readdirSync(distRoot).sort();
const embeddedFiles = readdirSync(embedRoot).sort();
if (sourceFiles.join(",") !== embeddedFiles.join(",")) {
  throw new Error(
    `embedded artifact files do not match dist output: dist=${sourceFiles.join(",")} embed=${embeddedFiles.join(",")}`,
  );
}

for (const name of sourceFiles) {
  const distFile = readFileSync(resolve(distRoot, name), "utf8");
  const embeddedFile = readFileSync(resolve(embedRoot, name), "utf8");
  if (distFile !== embeddedFile) {
    throw new Error(`embedded artifact content drift for ${name}`);
  }
}

function unique(values) {
  return [...new Set(values)];
}
