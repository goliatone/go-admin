import test from 'node:test';
import assert from 'node:assert/strict';

const { escapeHTML, escapeAttribute } = await import('../dist/shared/html.js');

test('escapeHTML escapes HTML-sensitive characters and normalizes nullish input', () => {
  assert.equal(escapeHTML(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;');
  assert.equal(escapeHTML(null), '');
  assert.equal(escapeHTML(undefined), '');
});

test('escapeAttribute adds backtick escaping for attribute contexts', () => {
  assert.equal(escapeAttribute("value`\"'"), 'value&#96;&quot;&#39;');
});
