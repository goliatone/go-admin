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
  'esign.widget.agreement_stats': 'E-Sign Agreement Stats',
  'esign.widget.signing_activity': 'E-Sign Signing Activity',
  'esign.widget.delivery_health': 'E-Sign Delivery Health',
  'esign.widget.pending_signatures': 'E-Sign Pending Signatures',
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

    // Build drag handle HTML
    const dragHandleHTML = `
      <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder widget">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </button>
    `;

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
          ${dragHandleHTML}
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
          ${entries.map((entry: { actor?: string; action?: string; object?: string; metadata?: Record<string, unknown> }) => {
            const actor = String(entry?.actor || (entry?.metadata as Record<string, unknown> | undefined)?.actor || 'system').trim() || 'system';
            const rawAction = String(entry?.action || '').trim();
            const actionLabel = this.activityActionLabels?.[rawAction] || rawAction || 'updated';
            const objectLabel = String(entry?.object || '').trim();
            return `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${actor}</div>
              <div class="text-gray-600 text-sm mt-1">${actionLabel}${objectLabel ? ` ${objectLabel}` : ''}</div>
            </li>
          `;
          }).join('')}
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
      return '<p class="text-gray-500 text-sm italic">Legacy chart widgets are not supported in the canonical dashboard contract.</p>';
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

    // E-Sign agreement stats widget
    if (def === 'esign.widget.agreement_stats') {
      const total = Number(data.total || 0);
      const pending = Number(data.pending || 0);
      const completed = Number(data.completed || 0);
      const cancelled = Number(data.voided || 0) + Number(data.declined || 0) + Number(data.expired || 0);
      const completionRate = total > 0 ? Math.round((completed * 100) / total) : 0;
      const listURL = String(data.list_url || '').trim();

      return `
        <div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-gray-900">${this.formatNumber(total)}</div>
              <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-blue-700">${this.formatNumber(pending)}</div>
              <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-green-700">${this.formatNumber(completed)}</div>
              <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
            </div>
            <div class="bg-red-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-red-700">${this.formatNumber(cancelled)}</div>
              <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
            </div>
          </div>
          ${total > 0 ? `
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Completion Rate</span>
                <span class="text-sm font-semibold text-gray-900">${completionRate}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: ${completionRate}%"></div>
              </div>
            </div>
          ` : ''}
          ${listURL ? `
            <div class="mt-4 pt-3 border-t border-gray-100 text-center">
              <a href="${listURL}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Agreements
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ''}
        </div>
      `;
    }

    // E-Sign signing activity widget
    if (def === 'esign.widget.signing_activity') {
      const activities = Array.isArray(data.activities) ? data.activities : [];
      const activityURL = String(data.activity_url || '').trim();
      if (activities.length === 0) {
        return `
          <div class="text-center py-4 text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm">No recent signing activity</p>
          </div>
          ${activityURL ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${activityURL}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Activity
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ''}
        `;
      }

      const eventColorClass = (eventType: unknown): string => {
        const value = String(eventType || '').toLowerCase();
        if (value === 'signed' || value === 'completed') return 'bg-green-500';
        if (value === 'viewed') return 'bg-purple-500';
        if (value === 'sent') return 'bg-blue-500';
        if (value === 'declined') return 'bg-orange-500';
        if (value === 'voided' || value === 'expired') return 'bg-red-500';
        return 'bg-gray-400';
      };

      return `
        <ul class="space-y-3">
          ${activities.map((activity: { type?: string; actor?: string; timestamp?: string; agreement_title?: string; agreement_url?: string }) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${eventColorClass(activity.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${activity.agreement_url
                    ? `<a href="${activity.agreement_url}" class="hover:text-blue-600">${activity.agreement_title || 'Agreement'}</a>`
                    : `${activity.agreement_title || 'Agreement'}`
                  }
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${activity.type || 'event'}</span>
                  ${activity.actor ? `<span class="mx-1">·</span><span>${activity.actor}</span>` : ''}
                </div>
              </div>
              ${activity.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${activity.timestamp}">
                  <time data-relative-time="${activity.timestamp}">${activity.timestamp}</time>
                </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
        ${activityURL ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${activityURL}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              View All Activity
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        ` : ''}
      `;
    }

    // E-Sign delivery health widget
    if (def === 'esign.widget.delivery_health') {
      const emailRate = Math.max(0, Math.min(100, Number(data.email_success_rate ?? 100)));
      const jobRate = Math.max(0, Math.min(100, Number(data.job_success_rate ?? 100)));
      const pendingRetries = Number(data.pending_retries || 0);
      const period = String(data.period || '').trim();

      const toneClasses = (rate: number): { text: string; bar: string } => {
        if (rate >= 95) return { text: 'text-green-600', bar: 'bg-green-500' };
        if (rate >= 80) return { text: 'text-yellow-600', bar: 'bg-yellow-500' };
        return { text: 'text-red-600', bar: 'bg-red-500' };
      };

      const emailTone = toneClasses(emailRate);
      const jobTone = toneClasses(jobRate);

      return `
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span class="text-sm text-gray-600">Email Delivery</span>
              </div>
              <span class="text-sm font-semibold ${emailTone.text}">${emailRate}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${emailTone.bar}" style="width: ${emailRate}%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>${this.formatNumber(data.emails_sent || 0)} sent</span>
              <span>${this.formatNumber(data.emails_failed || 0)} failed</span>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
                </svg>
                <span class="text-sm text-gray-600">Job Processing</span>
              </div>
              <span class="text-sm font-semibold ${jobTone.text}">${jobRate}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${jobTone.bar}" style="width: ${jobRate}%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>${this.formatNumber(data.jobs_completed || 0)} completed</span>
              <span>${this.formatNumber(data.jobs_failed || 0)} failed</span>
            </div>
          </div>
          ${pendingRetries > 0 ? `
            <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-center gap-2 text-sm text-yellow-800">
                <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>${this.formatNumber(pendingRetries)} items pending retry</span>
              </div>
            </div>
          ` : ''}
        </div>
        ${period ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${period}</div>` : ''}
      `;
    }

    // E-Sign pending signatures widget
    if (def === 'esign.widget.pending_signatures') {
      const agreements = Array.isArray(data.agreements) ? data.agreements : [];
      const listURL = String(data.list_url || '').trim();
      if (agreements.length === 0) {
        return `
          <div class="text-center py-6 text-gray-500">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-sm font-medium">All caught up!</p>
            <p class="text-xs mt-1">No agreements pending signature</p>
          </div>
          ${listURL ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${listURL}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Pending
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ''}
        `;
      }

      return `
        <ul class="space-y-2">
          ${agreements.map((agreement: {
            title?: string;
            url?: string;
            pending_count?: number;
            total_recipients?: number;
            pending_recipients?: Array<{ name?: string; email?: string }>;
          }) => {
            const pendingRecipients = Array.isArray(agreement.pending_recipients) ? agreement.pending_recipients : [];
            return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      ${agreement.url
                        ? `<a href="${agreement.url}" class="hover:text-blue-600">${agreement.title || 'Untitled'}</a>`
                        : `${agreement.title || 'Untitled'}`
                      }
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      ${this.formatNumber(agreement.pending_count || 0)} of ${this.formatNumber(agreement.total_recipients || 0)} signatures pending
                    </div>
                  </div>
                </div>
                ${pendingRecipients.length > 0 ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${pendingRecipients.slice(0, 3).map((recipient) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${recipient.name || recipient.email || 'Recipient'}
                      </span>
                    `).join('')}
                    ${pendingRecipients.length > 3 ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +${pendingRecipients.length - 3} more
                      </span>
                    ` : ''}
                  </div>
                ` : ''}
              </li>
            `;
          }).join('')}
        </ul>
        ${listURL ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${listURL}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              View All Pending
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        ` : ''}
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
