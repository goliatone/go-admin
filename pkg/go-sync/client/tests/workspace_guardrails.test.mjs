import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(here, "..");

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
