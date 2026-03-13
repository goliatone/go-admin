import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "..");
const sourceRoot = resolve(packageRoot, "src");

function sourceFiles(root) {
  const files = [];
  for (const entry of readdirSync(root)) {
    const fullPath = join(root, entry);
    const info = statSync(fullPath);
    if (info.isDirectory()) {
      files.push(...sourceFiles(fullPath));
      continue;
    }
    if (extname(fullPath) === ".ts") {
      files.push(fullPath);
    }
  }
  return files;
}

test("sync-core source does not import app-specific modules", () => {
  const forbidden = [
    "/esign/",
    "agreement-form",
    "pkg/client/assets",
    "examples/esign",
  ];

  for (const file of sourceFiles(sourceRoot)) {
    const payload = readFileSync(file, "utf8");
    for (const marker of forbidden) {
      assert.equal(
        payload.includes(marker),
        false,
        `${file} contains forbidden app-specific marker ${marker}`,
      );
    }
  }
});

test("sync-core source does not import framework-specific packages", () => {
  const forbiddenImports = [
    `"react"`,
    `'react'`,
    `"react-dom"`,
    `'react-dom'`,
    `"vue"`,
    `'vue'`,
    `"svelte"`,
    `'svelte'`,
    `"@tanstack/react-query"`,
    `'@tanstack/react-query'`,
  ];

  for (const file of sourceFiles(sourceRoot)) {
    const payload = readFileSync(file, "utf8");
    for (const marker of forbiddenImports) {
      assert.equal(
        payload.includes(marker),
        false,
        `${file} contains forbidden framework import ${marker}`,
      );
    }
  }
});

test("sync-core package metadata does not declare framework or app-specific runtime dependencies", () => {
  const pkg = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
  const serialized = JSON.stringify({
    dependencies: pkg.dependencies ?? {},
    peerDependencies: pkg.peerDependencies ?? {},
  });

  for (const marker of [
    "react",
    "react-dom",
    "vue",
    "svelte",
    "@tanstack/react-query",
    "examples/esign",
    "pkg/client/assets",
  ]) {
    assert.equal(
      serialized.includes(marker),
      false,
      `package.json declares forbidden dependency marker ${marker}`,
    );
  }
});
