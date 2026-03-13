import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const packageRoot = resolve(workspaceRoot, "packages", "sync-core");
const packageJSON = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const sourceIndex = readFileSync(resolve(packageRoot, "src", "index.ts"), "utf8");
const runtimeIndex = readFileSync(resolve(packageRoot, "dist", "index.js"), "utf8");
const typesIndex = readFileSync(resolve(packageRoot, "dist-types", "index.d.ts"), "utf8");
const runtimeModule = await import(pathToFileURL(resolve(packageRoot, "dist", "index.js")).href);

const runtimeFiles = unique(
  [
    packageJSON.main,
    packageJSON.module,
    ...Object.values(packageJSON.exports ?? {}).flatMap((entry) =>
      typeof entry === "string" ? [entry] : [entry.import, entry.default],
    ),
  ].filter(Boolean),
);

const typeFiles = unique(
  [
    packageJSON.types,
    ...Object.values(packageJSON.exports ?? {}).flatMap((entry) =>
      typeof entry === "string" ? [] : [entry.types],
    ),
  ].filter(Boolean),
);

for (const relativePath of [...runtimeFiles, ...typeFiles]) {
  if (!existsSync(resolve(packageRoot, relativePath))) {
    throw new Error(`package manifest references missing artifact: ${relativePath}`);
  }
}

for (const entry of packageJSON.files ?? []) {
  if (!existsSync(resolve(packageRoot, entry))) {
    throw new Error(`package files entry is missing: ${entry}`);
  }
}

const sourceExports = parseSourceExports(sourceIndex);
const runtimeExports = parseRuntimeExports(runtimeIndex);
const typeExports = parseTypeExports(typesIndex);

for (const name of sourceExports.valueExports) {
  if (!runtimeExports.has(name)) {
    throw new Error(`runtime bundle is missing public value export: ${name}`);
  }
  if (!typeExports.valueExports.has(name)) {
    throw new Error(`type bundle is missing value declaration export: ${name}`);
  }
}

for (const name of sourceExports.typeExports) {
  if (!typeExports.typeExports.has(name)) {
    throw new Error(`type bundle is missing public type export: ${name}`);
  }
}

if (runtimeModule.SYNC_CORE_PACKAGE_VERSION !== packageJSON.version) {
  throw new Error(
    `runtime package version drift: runtime=${runtimeModule.SYNC_CORE_PACKAGE_VERSION} package.json=${packageJSON.version}`,
  );
}

const distFiles = readdirSync(resolve(packageRoot, "dist")).sort();
if (!distFiles.length) {
  throw new Error("dist output is empty");
}

function parseSourceExports(source) {
  const valueExports = new Set();
  const typeExports = new Set();
  const pattern = /^export(\s+type)?\s*\{([\s\S]*?)\}\s+from\s+"[^"]+";/gm;

  for (const match of source.matchAll(pattern)) {
    const names = match[2]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/i).pop());

    for (const name of names) {
      if (match[1]) {
        typeExports.add(name);
      } else {
        valueExports.add(name);
      }
    }
  }

  return { valueExports, typeExports };
}

function parseRuntimeExports(source) {
  const match = source.match(/export\s*\{([\s\S]*?)\};?\s*$/m);
  if (!match) {
    throw new Error("runtime bundle does not expose an export block");
  }
  return new Set(
    match[1]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/i).pop()),
  );
}

function parseTypeExports(source) {
  const valueExports = new Set();
  const typeExports = new Set();
  const pattern = /^export(\s+type)?\s*\{([\s\S]*?)\}\s+from\s+"[^"]+";/gm;

  for (const match of source.matchAll(pattern)) {
    const names = match[2]
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => value.split(/\s+as\s+/i).pop());

    for (const name of names) {
      if (match[1]) {
        typeExports.add(name);
      } else {
        valueExports.add(name);
      }
    }
  }

  return { valueExports, typeExports };
}

function unique(values) {
  return [...new Set(values)];
}
