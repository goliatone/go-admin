import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sourceURL = new URL('../src/datatable/actions.ts', import.meta.url);
const inputCSSURL = new URL('../input.css', import.meta.url);
const outputCSSURL = new URL('../output.css', import.meta.url);
const distCSSURL = new URL('../dist/output.css', import.meta.url);
const tailwindConfigURL = new URL('../tailwind.config.cjs', import.meta.url);

function actionVariantMappings(source) {
  const typeMatch = source.match(/export type ActionVariant\s*=\s*([^;]+);/);
  assert.ok(typeMatch, 'ActionVariant type declaration must remain discoverable');
  const variants = [...typeMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);

  const mapMatch = source.match(/const variants: Record<ActionVariant, string> = \{([\s\S]*?)\n\s*\};/);
  assert.ok(mapMatch, 'ActionVariant CSS mapping must remain discoverable');
  const mappings = new Map(
    [...mapMatch[1].matchAll(/(\w+):\s*'([^']+)'/g)].map((match) => [match[1], match[2]]),
  );
  return { variants, mappings };
}

test('every typed action variant maps to source and built button CSS', async () => {
  const [actions, inputCSS, outputCSS, distCSS] = await Promise.all([
    readFile(sourceURL, 'utf8'),
    readFile(inputCSSURL, 'utf8'),
    readFile(outputCSSURL, 'utf8'),
    readFile(distCSSURL, 'utf8'),
  ]);
  const { variants, mappings } = actionVariantMappings(actions);

  assert.deepEqual([...mappings.keys()].sort(), [...variants].sort());
  for (const variant of variants) {
    const className = mappings.get(variant);
    assert.ok(className, `missing CSS mapping for ${variant}`);
    assert.match(inputCSS, new RegExp(`\\.${className}\\s*\\{`));
    assert.match(outputCSS, new RegExp(`\\.${className}\\{`));
    assert.match(distCSS, new RegExp(`\\.${className}\\{`));
  }
});

test('button labels default to one line with an explicit multiline opt-out', async () => {
  const [inputCSS, outputCSS, distCSS, tailwindConfig] = await Promise.all([
    readFile(inputCSSURL, 'utf8'),
    readFile(outputCSSURL, 'utf8'),
    readFile(distCSSURL, 'utf8'),
    readFile(tailwindConfigURL, 'utf8'),
  ]);

  assert.match(inputCSS, /\.btn\s*\{[^}]*whitespace-nowrap/s);
  assert.match(inputCSS, /\.btn-multiline\s*\{[^}]*whitespace-normal/s);
  assert.match(tailwindConfig, /['"]btn-multiline['"]/);
  for (const css of [outputCSS, distCSS]) {
    assert.match(css, /\.btn\{[^}]*white-space:nowrap/);
    assert.match(css, /\.btn-multiline\{[^}]*white-space:normal/);
  }
});
