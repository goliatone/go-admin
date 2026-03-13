import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");
const packageRoot = resolve(workspaceRoot, "..");
const repoRoot = resolve(packageRoot, "..", "..");

function sourceFiles(root, files = []) {
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) {
      if ([
        ".git",
        "node_modules",
        "dist",
        "dist-types",
        "test-results",
      ].includes(entry)) {
        continue;
      }
      sourceFiles(fullPath, files);
      continue;
    }
    if ([
      ".js",
      ".mjs",
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
    ].includes(extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

test("client workspace exposes packages/* as the only workspace root", () => {
  const pkg = JSON.parse(readFileSync(resolve(workspaceRoot, "package.json"), "utf8"));
  assert.deepEqual(pkg.workspaces, ["packages/*"]);
});

test("sync-core package exports only the public entrypoint", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(workspaceRoot, "packages", "sync-core", "package.json"), "utf8"),
  );
  assert.deepEqual(Object.keys(pkg.exports), ["."]);
});

test("sync-core package manifest points to declaration files that exist in the scaffold", () => {
  const pkg = JSON.parse(
    readFileSync(resolve(workspaceRoot, "packages", "sync-core", "package.json"), "utf8"),
  );

  assert.equal(
    existsSync(resolve(workspaceRoot, "packages", "sync-core", pkg.types)),
    true,
  );
  assert.equal(
    existsSync(resolve(workspaceRoot, "packages", "sync-core", pkg.exports["."].types)),
    true,
  );
});

test("repo app code does not deep-import sync-core internals", () => {
  const forbiddenMarkers = [
    "@goliatone/sync-core/internal",
    "@goliatone/sync-core/dist-types/internal",
    "/packages/sync-core/src/internal/",
    "/packages/sync-core/dist-types/internal/",
    "/packages/sync-core/src/runtime",
    "/packages/sync-core/src/transport",
  ];

  for (const file of sourceFiles(repoRoot)) {
    if (file.startsWith(resolve(packageRoot))) {
      continue;
    }
    const payload = readFileSync(file, "utf8");
    for (const marker of forbiddenMarkers) {
      assert.equal(payload.includes(marker), false, `${file} imports forbidden sync-core internal marker ${marker}`);
    }
  }
});

test("package-local release automation stays independent from host e-sign sources", () => {
  for (const path of [
    resolve(packageRoot, "taskfile"),
    resolve(workspaceRoot, "scripts", "sync-version.mjs"),
    resolve(workspaceRoot, "scripts", "build-sync.mjs"),
    resolve(workspaceRoot, "scripts", "verify-package.mjs"),
  ]) {
    const payload = readFileSync(path, "utf8");
    for (const marker of ["examples/esign", "agreement-form", "pkg/client/assets"]) {
      assert.equal(payload.includes(marker), false, `${path} contains host-specific marker ${marker}`);
    }
  }
});
