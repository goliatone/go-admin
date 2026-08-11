import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function canonicalComponentStylesPath(root) {
  return resolve(root, 'src/styles/components.css');
}

export function composeAdminStylesheet(root, compiledPath, outputPath = compiledPath) {
  const compiledCSS = readFileSync(compiledPath, 'utf8').trimEnd();
  const componentCSS = readFileSync(canonicalComponentStylesPath(root), 'utf8').trimStart();
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${compiledCSS}\n${componentCSS}`);
}

export function copyAdminStylesheet(outputPath, targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(outputPath, targetPath);
}

export function writeLegacyComponentStylesheet(root, targetPath) {
  mkdirSync(dirname(targetPath), { recursive: true });
  copyFileSync(canonicalComponentStylesPath(root), targetPath);
}
