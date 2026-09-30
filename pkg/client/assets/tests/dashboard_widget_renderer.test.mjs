import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://admin.example/admin' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;

const { WidgetRenderer, parseChartOptions } = await import('../dist/dashboard/index.js');

const closingScriptLabel = '</script><img src=x onerror=alert(1)>';
const markupText = '<img src=x onerror=alert(1)>';

function mount(html) {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container;
}

function chartWidget(data = {}, overrides = {}) {
  return {
    id: 'sales-chart',
    definition: 'admin.widget.bar_chart',
    area: 'admin.dashboard.main',
    span: 12,
    data: {
      chart_type: 'bar',
      title: 'Sales',
      theme: 'westeros',
      chart_assets_host: '/dashboard/assets/echarts/',
      chart_options: {
        title: { text: `Revenue ${closingScriptLabel}`, subtext: 'Q1 & Q2 > Q3' },
        xAxis: { type: 'category', data: ['North', closingScriptLabel] },
        yAxis: { type: 'value' },
        series: [
          {
            name: closingScriptLabel,
            type: 'bar',
            data: [{ name: '<!--<script>', value: 3 }, 5],
          },
        ],
      },
      ...data,
    },
    ...overrides,
  };
}

test('chart option text with a closing script tag stays inside the JSON script element', () => {
  const renderer = new WidgetRenderer({});
  const widget = chartWidget();
  const container = mount(renderer.render(widget, 'admin.dashboard.main'));

  assert.equal(container.querySelector('img'), null);
  assert.equal(container.querySelector('[onerror]'), null);

  const scripts = container.querySelectorAll('script');
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].getAttribute('type'), 'application/json');
  assert.ok(scripts[0].hasAttribute('data-chart-options'));
  assert.doesNotMatch(scripts[0].textContent, /[<>&]/);
  assert.match(scripts[0].textContent, /\\u003c\/script\\u003e\\u003cimg src=x onerror=alert\(1\)\\u003e/);
  assert.match(scripts[0].textContent, /Q1 \\u0026 Q2 \\u003e Q3/);

  const chart = container.querySelector('[data-echart-widget]');
  assert.ok(chart);
  assert.equal(chart.lastElementChild, scripts[0]);
  assert.deepEqual(parseChartOptions(chart), widget.data.chart_options);
});

test('chart widget text and attributes render as text', () => {
  const renderer = new WidgetRenderer({});
  const widget = chartWidget(
    {
      title: markupText,
      subtitle: '<b>Posts</b> & pages',
      footer_note: closingScriptLabel,
      theme: 'westeros" onmouseover="alert(1)',
      chart_assets_host: '/assets/"><img src=x onerror=alert(1)>/',
    },
    { id: 'chart"><img src=x onerror=alert(1)>' },
  );
  const container = mount(renderer.render(widget, 'admin.dashboard.main'));

  assert.equal(container.querySelector('img, b, script:not([data-chart-options])'), null);
  assert.equal(container.querySelector('[onerror], [onmouseover]'), null);
  assert.equal(container.querySelector('article').dataset.widget, widget.id);
  assert.equal(container.querySelector('h3').textContent, markupText);

  const paragraphs = Array.from(container.querySelectorAll('p'), (node) => node.textContent);
  assert.deepEqual(paragraphs, ['<b>Posts</b> & pages', closingScriptLabel]);

  const chart = container.querySelector('[data-echart-widget]');
  assert.equal(chart.dataset.chartTheme, widget.data.theme);
  assert.equal(chart.dataset.chartAssetsHost, widget.data.chart_assets_host);
  assert.equal(chart.dataset.chartId, `chart-${widget.id}`);
  assert.equal(chart.querySelector('div').id, chart.dataset.chartId);
  assert.deepEqual(parseChartOptions(chart), widget.data.chart_options);
});

test('widget link labels and URLs are escaped', () => {
  const renderer = new WidgetRenderer({});
  const hostileURL = '/admin/queue" onclick="alert(1)';
  const quickActions = mount(renderer.renderContent({
    id: 'quick-actions',
    definition: 'admin.widget.quick_actions',
    data: {
      actions: [{ url: hostileURL, label: markupText, method: '<i>POST</i>', description: '<b>Opens</b>' }],
    },
  }));
  const translationLinks = mount(renderer.renderContent({
    id: 'translation-progress',
    definition: 'admin.widget.translation_progress',
    data: {
      summary: {},
      links: [{ url: hostileURL, label: markupText }],
    },
  }));

  for (const container of [quickActions, translationLinks]) {
    const link = container.querySelector('a');
    assert.equal(link.getAttribute('href'), hostileURL);
    assert.equal(link.hasAttribute('onclick'), false);
    assert.equal(container.querySelector('img, i, b'), null);
    assert.match(link.textContent, /<img src=x onerror=alert\(1\)>/);
  }
  assert.match(quickActions.textContent, /<i>POST<\/i>/);
  assert.match(quickActions.textContent, /<b>Opens<\/b>/);
});

test('widget text fields render as text', () => {
  const renderer = new WidgetRenderer({ activityActionLabels: { created: markupText } });
  const cases = [
    { definition: 'admin.widget.user_stats', data: { total: markupText, trend: markupText } },
    { definition: 'admin.widget.user_profile_overview', data: { values: { [markupText]: markupText } } },
    { definition: 'admin.widget.settings_overview', data: { values: { [markupText]: { value: markupText } } } },
    { definition: 'admin.widget.activity_feed', data: { entries: [{ actor: markupText, action: 'created', object: markupText }] } },
    { definition: 'admin.widget.system_health', data: { status: markupText, uptime: markupText, api_latency: markupText, db_status: markupText } },
    { definition: 'admin.widget.content_stats', data: { published: markupText } },
    { definition: 'admin.widget.storage_stats', data: { used: markupText, total: markupText, percentage: markupText } },
    { definition: 'admin.widget.notifications', data: { notifications: [{ title: markupText, message: markupText, read: false }] } },
    {
      definition: 'admin.widget.translation_progress',
      data: {
        summary: { total: markupText },
        status_counts: { [markupText]: markupText },
        locale_counts: { [markupText]: markupText },
        updated_at: markupText,
      },
    },
    { definition: 'admin.widget.unknown', data: { note: closingScriptLabel } },
  ];

  for (const { definition, data } of cases) {
    const container = mount(renderer.renderContent({ id: definition, definition, data }));
    assert.equal(container.querySelector('img, script'), null, definition);
    assert.equal(container.querySelector('[onerror]'), null, definition);
    assert.ok(container.textContent.includes('<img src=x onerror=alert(1)>'), definition);
  }
});
