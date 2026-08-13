#!/usr/bin/env node

import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const packageRoot = resolve(import.meta.dirname, '..');
const sourceRoot = join(packageRoot, 'src');
const allowedOwners = new Set([
  join(sourceRoot, 'shared', 'logger.ts'),
]);
const sourceExtensions = new Set(['.js', '.mjs', '.ts', '.mts']);

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return sourceExtensions.has(extname(entry.name)) ? [path] : [];
  });
}

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
    return node.argumentExpression.text;
  }
  return '';
}

function isGlobalObject(node) {
  return ts.isIdentifier(node) && ['globalThis', 'self', 'window'].includes(node.text);
}

function isConsoleObject(node) {
  if (ts.isIdentifier(node)) return node.text === 'console';
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
  return isGlobalObject(node.expression) && propertyName(node) === 'console';
}

function isDirectConsoleAccess(node) {
  if (!ts.isPropertyAccessExpression(node) && !ts.isElementAccessExpression(node)) return false;
  return isConsoleObject(node) || isConsoleObject(node.expression);
}

export function findDirectConsoleAccess(filePath, source = readFileSync(filePath, 'utf8')) {
  const scriptKind = ['.js', '.mjs'].includes(extname(filePath)) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
  const violations = [];

  function visit(node) {
    if (isDirectConsoleAccess(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      violations.push({
        filePath,
        line: position.line + 1,
        column: position.character + 1,
      });
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return violations;
}

export function scanProductionSources() {
  return sourceFiles(sourceRoot)
    .filter((filePath) => !allowedOwners.has(filePath))
    .flatMap((filePath) => findDirectConsoleAccess(filePath));
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const violations = scanProductionSources();
  if (violations.length > 0) {
    for (const violation of violations) {
      const path = relative(packageRoot, violation.filePath).replaceAll('\\', '/');
      process.stderr.write(`${path}:${violation.line}:${violation.column}: direct console access is prohibited; use shared/logger\n`);
    }
    process.exitCode = 1;
  } else {
    process.stdout.write('No direct console access found outside src/shared/logger.ts.\n');
  }
}
