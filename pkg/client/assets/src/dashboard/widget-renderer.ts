/**
 * Widget Renderer - Client-side widget rendering for admin dashboard
 */

import type { Widget, AdminDashboardConfig, WidgetTitleMap } from './types.js';

/** Default widget titles by definition */
const WIDGET_TITLES: WidgetTitleMap = {
  'admin.widget.user_stats': 'User Statistics',
  'admin.widget.activity_feed': 'Recent Activity',
  'admin.widget.quick_actions': 'Quick Actions',
  'admin.widget.notifications': 'Notifications',
  'admin.widget.settings_overview': 'Settings Overview',
  'admin.widget.content_stats': 'Content Stats',
  'admin.widget.storage_stats': 'Storage Stats',
  'admin.widget.system_health': 'System Health',
  'admin.widget.bar_chart': 'Bar Chart',
  'admin.widget.line_chart': 'Line Chart',
  'admin.widget.pie_chart': 'Pie Chart',
  'admin.widget.gauge_chart': 'Gauge',
  'admin.widget.scatter_chart': 'Scatter Chart',
};

/**
 * Renders dashboard widgets to HTML strings
 */
export class WidgetRenderer {
  private activityActionLabels: Record<string, string>;

  constructor(config: AdminDashboardConfig) {
    this.activityActionLabels = config.activityActionLabels || {};
  }

  /**
   * Render a complete widget with wrapper and toolbar
   */
  render(widget: Widget, areaCode: string): string {
    const areaResizable = areaCode === 'admin.dashboard.main' || areaCode === 'admin.dashboard.footer';
    const span = widget.metadata?.layout?.width || widget.span || 12;
    const hidden = widget.hidden || false;
    const title = widget.data?.title || widget.config?.title || this.getTitle(widget.definition);
    const widgetId = widget.id || widget.definition || `widget-${Math.random().toString(36).substr(2, 9)}`;
    const widgetContent = this.renderContent(widget);

    // Build toolbar HTML
    let toolbarHTML = '<div class="widget__toolbar">';
    toolbarHTML += '<button type="button" class="hide-widget">Toggle Hide</button>';

    if (areaResizable) {
      toolbarHTML += '<button type="button" class="resize-widget">Half Width</button>';
    } else {
      toolbarHTML += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>';
    }

    toolbarHTML += '</div>';

    return `
      <article class="widget"
               data-widget="${widgetId}"
               data-span="${span}"
               data-area-code="${areaCode}"
               data-resizable="${areaResizable}"
               ${hidden ? 'data-hidden="true"' : ''}
               style="--span: ${span}">
        ${toolbarHTML}
        <div class="widget__header mb-4">
          <h3 class="text-lg font-semibold text-gray-900">${title}</h3>
        </div>
        <div class="widget__content">
          ${widgetContent}
        </div>
      </article>
    `;
  }

  /**
   * Render widget content based on definition type
   */
  renderContent(widget: Widget): string {
    const def = widget.definition || '';
    const data = widget.data || {};
    const config = widget.config || {};

    // User stats widget
    if (def === 'admin.widget.user_stats') {
      const values: Record<string, unknown> = data.values || {
        Total: data.total,
        Active: data.active,
        'New Today': data.new_today,
      };
      if (data.trend) {
        values.Trend = data.trend;
      }
      return `
        <div class="metrics">
          ${Object.entries(values).map(([key, value]) => `
            <div class="metric">
              <small>${key}</small>
              <span>${this.formatNumber(value)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    // Settings overview widget
    if (def === 'admin.widget.settings_overview') {
      const values = data.values || {};
      const entries = Object.entries(values);
      if (entries.length === 0) {
        return '<p class="text-gray-500">No settings to display</p>';
      }
      return `
        <dl class="space-y-2">
          ${entries.map(([key, val]) => {
            const value = typeof val === 'object' && val !== null ? (val as Record<string, unknown>).value ?? val : val;
            return `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${key}</dt>
                <dd class="text-sm font-semibold text-gray-900">${value ?? '—'}</dd>
              </div>
            `;
          }).join('')}
        </dl>
      `;
    }

    // Activity feed widget
    if (def === 'admin.widget.activity_feed') {
      const entries = data.entries || [];
      if (entries.length === 0) {
        return '<p class="text-gray-500">No recent activity</p>';
      }
      return `
        <ul class="space-y-3">
          ${entries.map((entry: { actor: string; action: string; object: string }) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${entry.actor}</div>
              <div class="text-gray-600 text-sm mt-1">${this.activityActionLabels?.[entry.action] || entry.action} ${entry.object}</div>
            </li>
          `).join('')}
        </ul>
      `;
    }

    // Quick actions widget
    if (def === 'admin.widget.quick_actions') {
      const actions = data.actions || [];
      if (actions.length === 0) {
        return '<p class="text-gray-500">No quick actions configured</p>';
      }
      return `
        <div class="space-y-2">
          ${actions.map((action: { url?: string; label?: string; method?: string; description?: string }) => `
            <a class="block p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition" href="${action.url || '#'}" target="_blank" rel="noreferrer">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900 text-sm">${action.label || 'Action'}</div>
                ${action.method ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${action.method}</span>` : ''}
              </div>
              ${action.description ? `<div class="text-gray-600 text-sm mt-1">${action.description}</div>` : ''}
            </a>
          `).join('')}
        </div>
      `;
    }

    // Legacy chart_sample widget - show disabled message
    if (def === 'admin.widget.chart_sample') {
      if (data.disabled) {
        return '<p class="text-gray-500 text-sm italic">This legacy chart widget has been disabled.</p>';
      }
    }

    // System health widget
    if (def === 'admin.widget.system_health') {
      return `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-semibold text-green-600">${data.status || 'unknown'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-semibold">${data.uptime || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">API Latency:</span>
            <span class="font-semibold">${data.api_latency || 'N/A'}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Database:</span>
            <span class="font-semibold ${data.db_status === 'connected' ? 'text-green-600' : 'text-red-600'}">${data.db_status || 'unknown'}</span>
          </div>
        </div>
      `;
    }

    // Content stats widget
    if (def === 'admin.widget.content_stats') {
      return `
        <div class="metrics">
          <div class="metric">
            <small>Published</small>
            <span>${this.formatNumber(data.published || 0)}</span>
          </div>
          <div class="metric">
            <small>Draft</small>
            <span>${this.formatNumber(data.draft || 0)}</span>
          </div>
          <div class="metric">
            <small>Scheduled</small>
            <span>${this.formatNumber(data.scheduled || 0)}</span>
          </div>
        </div>
      `;
    }

    // Storage stats widget
    if (def === 'admin.widget.storage_stats') {
      return `
        <div class="metrics">
          <div class="metric">
            <small>Used</small>
            <span>${data.used || '0 GB'}</span>
          </div>
          <div class="metric">
            <small>Total</small>
            <span>${data.total || '0 GB'}</span>
          </div>
          <div class="metric">
            <small>Usage</small>
            <span>${data.percentage || '0%'}</span>
          </div>
        </div>
      `;
    }

    // Notifications widget
    if (def === 'admin.widget.notifications') {
      const notifications = data.notifications || [];
      if (notifications.length === 0) {
        return '<p class="text-gray-500">No notifications</p>';
      }
      return `
        <ul class="space-y-3">
          ${notifications.slice(0, 5).map((notif: { title: string; message: string; read: boolean }) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${notif.title}</div>
                  <div class="text-gray-600 text-sm mt-1">${notif.message}</div>
                </div>
                <span class="px-2 py-1 text-xs font-semibold ${notif.read ? 'text-gray-600 bg-gray-100' : 'text-white bg-blue-500'} rounded-full whitespace-nowrap">
                  ${notif.read ? 'Read' : 'New'}
                </span>
              </div>
            </li>
          `).join('')}
        </ul>
      `;
    }

    // Chart widgets (bar, line, pie, gauge, scatter)
    if (def.includes('_chart') && data.chart_html) {
      const subtitle = data.subtitle || config.subtitle || '';
      return `
        <div>
          ${subtitle ? `<p class="text-sm text-gray-500 mb-3">${subtitle}</p>` : ''}
          <div class="chart-container">${data.chart_html}</div>
        </div>
      `;
    }

    // Default: show raw data
    return `<pre class="text-xs text-gray-600 overflow-auto">${JSON.stringify(data, null, 2)}</pre>`;
  }

  /**
   * Get display title for widget definition
   */
  private getTitle(definition: string): string {
    return WIDGET_TITLES[definition] || definition;
  }

  /**
   * Format number with locale
   */
  private formatNumber(value: unknown): string {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  }
}
