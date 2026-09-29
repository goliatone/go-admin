import test from 'node:test';
import assert from 'node:assert/strict';
import { echartsThemeScriptURL } from '../dist/dashboard/index.js';

test('runtime-provided ECharts themes load no theme script', () => {
  for (const theme of ['light', 'dark', 'default', '', '  light  ']) {
    assert.equal(
      echartsThemeScriptURL(theme, '/dashboard/assets/echarts/'),
      '',
      `theme ${JSON.stringify(theme)} must not request a theme script`,
    );
  }
});

test('named ECharts themes load from the chart assets host', () => {
  assert.equal(
    echartsThemeScriptURL('westeros', '/dashboard/assets/echarts/'),
    '/dashboard/assets/echarts/themes/westeros.js',
  );
  assert.equal(
    echartsThemeScriptURL('wonderland', 'https://cdn.example.test/echarts'),
    'https://cdn.example.test/echarts/themes/wonderland.js',
  );
  assert.equal(
    echartsThemeScriptURL('walden', ''),
    '/dashboard/assets/echarts/themes/walden.js',
  );
});
