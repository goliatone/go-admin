import assert from 'node:assert/strict';
import test from 'node:test';

import { WidgetRenderer } from '../dist/dashboard/index.js';
import { renderWidget } from '../dist/tabs/index.js';
import { registerApplicationWidgetRenderer } from '../dist-public/renderers/application-widgets.js';

test('application renderer registration takes precedence in dashboard and tab surfaces', () => {
  const unregister = registerApplicationWidgetRenderer('sample.widget.summary', {
    title: 'Sample Summary',
    render: (widget) => `<p data-application-renderer>${widget.data?.message}</p>`,
  });
  try {
    const widget = { definition: 'sample.widget.summary', data: { message: 'ready' } };
    const dashboard = new WidgetRenderer({}).render(widget, 'admin.dashboard.main');
    const tab = renderWidget(widget);
    for (const output of [dashboard, tab]) {
      assert.match(output, /Sample Summary/);
      assert.match(output, /data-application-renderer>ready/);
    }
  } finally {
    unregister();
  }
});

test('unregister only removes the registration it created', () => {
  const first = registerApplicationWidgetRenderer('sample.widget.lifecycle', { render: () => 'first' });
  const second = registerApplicationWidgetRenderer('sample.widget.lifecycle', { render: () => 'second' });
  first();
  const output = new WidgetRenderer({}).renderContent({ definition: 'sample.widget.lifecycle' });
  assert.equal(output, 'second');
  second();
});
