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
  'admin.widget.translation_progress': 'Translation Progress',
  'admin.widget.content_stats': 'Content Stats',
  'admin.widget.storage_stats': 'Storage Stats',
  'admin.widget.system_health': 'System Health',
  'admin.widget.bar_chart': 'Bar Chart',
  'admin.widget.line_chart': 'Line Chart',
  'admin.widget.pie_chart': 'Pie Chart',
  'admin.widget.gauge_chart': 'Gauge',
  'admin.widget.scatter_chart': 'Scatter Chart',
};

const CHART_WIDGET_DEFINITIONS = new Set([
  'admin.widget.bar_chart',
  'admin.widget.line_chart',
  'admin.widget.pie_chart',
  'admin.widget.gauge_chart',
  'admin.widget.scatter_chart',
]);

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
    const span = this.normalizeSpan(widget.metadata?.layout?.width ?? widget.span);
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
      const values: Record<string, unknown> = {
        Total: data.total ?? 0,
        Active: data.active ?? 0,
        'New Today': data.new_today ?? 0,
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

    // User profile overview widget
    if (def === 'admin.widget.user_profile_overview') {
      const values = data.values || {};
      const entries = Object.entries(values);
      if (entries.length === 0) {
        return '<p class="text-gray-500">No profile data to display</p>';
      }
      return `
        <dl class="space-y-2">
          ${entries.map(([key, val]) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-600">${key}</dt>
              <dd class="text-sm font-semibold text-gray-900">${val ?? '—'}</dd>
            </div>
          `).join('')}
        </dl>
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

    // Translation progress widget
    if (def === 'admin.widget.translation_progress') {
      const summary = data.summary || {};
      const statusCounts: Record<string, unknown> = data.status_counts || {};
      const localeCounts: Record<string, unknown> = data.locale_counts || {};
      const links = Array.isArray(data.links) ? data.links : [];
      const overdueCount = Number(summary.overdue || 0);
      const updatedAt = data.updated_at ? String(data.updated_at) : '';

      const statusBadge = (statusRaw: string, count: unknown): string => {
        const status = String(statusRaw || '').trim().toLowerCase();
        let toneClass = 'bg-gray-100 text-gray-800';
        let dotClass = 'bg-gray-500';
        if (status === 'pending') {
          toneClass = 'bg-yellow-100 text-yellow-800';
          dotClass = 'bg-yellow-500';
        } else if (status === 'in_progress') {
          toneClass = 'bg-blue-100 text-blue-800';
          dotClass = 'bg-blue-500';
        } else if (status === 'review') {
          toneClass = 'bg-purple-100 text-purple-800';
          dotClass = 'bg-purple-500';
        } else if (status === 'approved' || status === 'completed') {
          toneClass = 'bg-green-100 text-green-800';
          dotClass = 'bg-green-500';
        } else if (status === 'rejected') {
          toneClass = 'bg-red-100 text-red-800';
          dotClass = 'bg-red-500';
        }
        const label = this.formatStatusLabel(statusRaw);
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${toneClass}">
            <span class="w-1.5 h-1.5 rounded-full ${dotClass}"></span>
            ${label}: ${this.formatNumber(count)}
          </span>
        `;
      };

      return `
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${this.formatNumber(summary.total || 0)}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${this.formatNumber(summary.active || 0)}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">Active</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-purple-700">${this.formatNumber(summary.review || 0)}</div>
            <div class="text-xs text-purple-600 uppercase tracking-wide">Review</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="${overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'} rounded-lg p-2 text-center">
            <div class="text-lg font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-gray-600'}">
              ${this.formatNumber(overdueCount)}
            </div>
            <div class="text-xs ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'} uppercase tracking-wide">Overdue</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-lg font-bold text-green-700">${this.formatNumber(summary.approved || 0)}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Approved</div>
          </div>
        </div>

        ${Object.keys(statusCounts).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Status</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(statusCounts).map(([status, count]) => statusBadge(status, count)).join('')}
            </div>
          </div>
        ` : ''}

        ${Object.keys(localeCounts).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(localeCounts).map(([locale, count]) => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <span class="uppercase font-semibold">${locale}</span>
                  <span class="text-indigo-500">${this.formatNumber(count)}</span>
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${links.length > 0 ? `
          <div class="pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
            <div class="flex flex-wrap gap-2">
              ${links.map((link: { url?: string; label?: string }) => `
                <a href="${link.url || '#'}"
                   class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                  ${link.label || 'Open'}
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${updatedAt ? `
          <div class="mt-4 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Updated <time data-relative-time="${updatedAt}">${updatedAt}</time>
          </div>
        ` : ''}
      `;
    }

    // Chart widgets (bar, line, pie, gauge, scatter) use canonical chart_options payload.
    if (CHART_WIDGET_DEFINITIONS.has(def)) {
      const subtitle = data.subtitle || config.subtitle || '';
      const chartTheme = String(data.theme || 'westeros');
      const assetsHost = String(data.chart_assets_host || '/dashboard/assets/echarts/');
      const chartOptions = data.chart_options ? JSON.stringify(data.chart_options) : '';
      const chartId = `chart-${widget.id || widget.definition || Math.random().toString(36).slice(2, 10)}`;
      return `
        <div>
          ${subtitle ? `<p class="text-sm text-gray-500 mb-3">${subtitle}</p>` : ''}
          ${chartOptions ? `
            <div class="chart-container" data-echart-widget data-chart-id="${chartId}" data-chart-theme="${chartTheme}" data-chart-assets-host="${assetsHost}">
              <div id="${chartId}" class="w-full" style="height: 360px;"></div>
              <script type="application/json" data-chart-options>${chartOptions}</script>
            </div>
          ` : `<p class="text-sm text-gray-500 italic">Chart configuration unavailable.</p>`}
          ${data.footer_note ? `<p class="text-xs text-gray-500 mt-2">${data.footer_note}</p>` : ''}
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

  private formatStatusLabel(status: unknown): string {
    const value = String(status || '').trim();
    if (!value) {
      return 'Unknown';
    }
    return value
      .split('_')
      .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
      .join(' ');
  }

  private normalizeSpan(value: unknown): number {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 12) {
      return 12;
    }
    return parsed;
  }
}
