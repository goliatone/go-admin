import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../src/shared/icon-renderer.ts'), 'utf8');

test('shared icon renderer aliases common unsupported Iconoir names', () => {
  assert.match(source, /ICONOIR_ICON_ALIASES/);
  assert.match(source, /'file-text': 'page'/);
  assert.match(source, /'file': 'page'/);
  assert.match(source, /'alert-triangle': 'warning-triangle'/);
  assert.match(source, /ICONOIR_COMPAT_ALIAS_LIBRARIES/);
  assert.match(source, /'lucide'/);
  assert.match(source, /'feather'/);
  assert.match(source, /normalizeLibraryIconAlias/);
  assert.match(source, /ICONOIR_ICON_ALIASES\[name\.trim\(\)\.toLowerCase\(\)\]/);
  assert.match(source, /library: DEFAULT_LIBRARY, name: aliasedName/);
});
