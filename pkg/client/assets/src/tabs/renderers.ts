/**
 * Rendering functions for tab panel content
 */

import type {
  TabPanel,
  TabPanelPayload,
  Widget,
  ProfileSection,
  ProfileField,
  FieldDefinition,
} from './types';
import { escapeHTML, formatNumber, isEmptyValue } from './formatters';

const WIDGET_TITLES: Record<string, string> = {
  'admin.widget.user_stats': 'User Statistics',
  'admin.widget.activity_feed': 'Recent Activity',
  'admin.widget.user_activity_feed': 'User Activity',
  'admin.widget.quick_actions': 'Quick Actions',
  'admin.widget.notifications': 'Notifications',
  'admin.widget.settings_overview': 'Settings Overview',
  'admin.widget.user_profile_overview': 'Profile Overview',
  'admin.widget.content_stats': 'Content Stats',
  'admin.widget.storage_stats': 'Storage Stats',
  'admin.widget.system_health': 'System Health',
  'esign.widget.agreement_stats': 'E-Sign Agreement Stats',
  'esign.widget.signing_activity': 'E-Sign Signing Activity',
  'esign.widget.delivery_health': 'E-Sign Delivery Health',
  'esign.widget.pending_signatures': 'E-Sign Pending Signatures',
};

function getWidgetTitle(definition?: string): string {
  if (!definition) return '';
  return WIDGET_TITLES[definition] || definition.replace(/_/g, ' ');
}

function renderProfileFieldValue(field: ProfileField): string {
  const value = field?.value !== undefined && field?.value !== null ? field.value : '-';
  const valueText = escapeHTML(value);
  const type = String(field?.type || 'text').toLowerCase();

  if (type === 'badge') {
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${valueText}</span>`;
  }

  if (type === 'status') {
    const status = String(value || '').toLowerCase();
    const tone = ({
      active: { dot: 'bg-green-500', text: 'text-green-700' },
      inactive: { dot: 'bg-gray-400', text: 'text-gray-600' },
      suspended: { dot: 'bg-red-500', text: 'text-red-700' },
      pending: { dot: 'bg-yellow-500', text: 'text-yellow-700' },
    } as Record<string, { dot: string; text: string }>)[status] || { dot: 'bg-gray-400', text: 'text-gray-700' };
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${valueText} status"><span class="w-2 h-2 rounded-full ${tone.dot}" aria-hidden="true"></span><span class="${tone.text}">${valueText}</span></span>`;
  }

  if (type === 'verified') {
    const verified = Boolean(field?.verified);
    return `<span class="inline-flex items-center gap-1.5"><span>${valueText}</span><span class="${verified ? 'text-green-500' : 'text-gray-400'}">${verified ? '✓' : '✕'}</span></span>`;
  }

  if (type === 'date') {
    return `<time datetime="${valueText}" data-absolute-time="${valueText}">${valueText}</time>`;
  }

  if (type === 'relative') {
    return `<time datetime="${valueText}" data-relative-time="${valueText}">${valueText}</time>`;
  }

  return valueText;
}

function renderProfileSections(sections: ProfileSection[]): string {
  const blocks = sections.map((section) => {
    const fields = Array.isArray(section?.fields) ? section.fields : [];
    const visibleFields = fields.filter((f) => !(f?.hide_if_empty && isEmptyValue(f?.value)));
    if (!visibleFields.length) return '';

    return `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${escapeHTML(section?.label || '')}</div>
        <dl class="space-y-3">
          ${visibleFields.map((f) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${escapeHTML(f?.label || f?.key || '')}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${renderProfileFieldValue(f)}</dd>
            </div>
          `).join('')}
        </dl>
      </div>
    `;
  }).filter(Boolean);

  return blocks.length
    ? `<div class="space-y-6">${blocks.join('')}</div>`
    : '<p class="text-gray-500">No profile data to display</p>';
}

function renderWidgetContent(widget: Widget): string {
  const def = widget.definition || '';
  const data = widget.data || {};

  if (def === 'admin.widget.user_stats') {
    const values = data.values || { Total: data.total, Active: data.active, 'New Today': data.new_today };
    return `<div class="metrics">${Object.entries(values).map(([k, v]) =>
      `<div class="metric"><small>${escapeHTML(k)}</small><span>${escapeHTML(formatNumber(v))}</span></div>`
    ).join('')}</div>`;
  }

  if (def === 'admin.widget.settings_overview') {
    const values = data.values || {};
    const entries = Object.entries(values);
    if (!entries.length) return '<p class="text-gray-500">No settings to display</p>';
    return `<dl class="space-y-2">${entries.map(([k, v]) =>
      `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${escapeHTML(k)}</dt><dd class="text-sm font-medium text-gray-900">${escapeHTML(v ?? '-')}</dd></div>`
    ).join('')}</dl>`;
  }

  if (def === 'admin.widget.user_profile_overview') {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    if (!sections.length) return '<p class="text-gray-500">No profile data to display</p>';
    return renderProfileSections(sections);
  }

  if (def === 'admin.widget.activity_feed' || def === 'admin.widget.user_activity_feed') {
    const entries = data.entries || [];
    if (!entries.length) return '<p class="text-gray-500">No recent activity</p>';
    return `<ul class="space-y-3">${entries.map((e) => {
      const actor = String(e.actor || 'system').trim() || 'system';
      const action = String(e.action || 'updated').trim() || 'updated';
      const object = String(e.object || '').trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${escapeHTML(actor)}</div>
        <div class="text-gray-500 text-sm mt-1">${escapeHTML(action)}${object ? ` ${escapeHTML(object)}` : ''}</div>
        ${e.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${escapeHTML(e.created_at)}" data-relative-time="${escapeHTML(e.created_at)}">${escapeHTML(e.created_at)}</time>` : ''}
      </li>`
      ;
    }).join('')}</ul>`;
  }

  if (def === 'esign.widget.agreement_stats') {
    const esign = data as Record<string, unknown>;
    const total = Number(esign.total || 0);
    const pending = Number(esign.pending || 0);
    const completed = Number(esign.completed || 0);
    const cancelled = Number(esign.voided || 0) + Number(esign.declined || 0) + Number(esign.expired || 0);
    const completionRate = total > 0 ? Math.round((completed * 100) / total) : 0;
    const listURL = String(esign.list_url || '').trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${escapeHTML(formatNumber(total))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${escapeHTML(formatNumber(pending))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${escapeHTML(formatNumber(completed))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
          </div>
          <div class="bg-red-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-700">${escapeHTML(formatNumber(cancelled))}</div>
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
            <a href="${escapeHTML(listURL)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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

  if (def === 'esign.widget.signing_activity') {
    const esign = data as Record<string, unknown>;
    const activities = Array.isArray(esign.activities) ? esign.activities as Array<Record<string, unknown>> : [];
    const activityURL = String(esign.activity_url || '').trim();
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
      ${activities.length ? `
        <ul class="space-y-3">
          ${activities.map((activity) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${eventColorClass(activity.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${activity.agreement_url
                    ? `<a href="${escapeHTML(activity.agreement_url)}" class="hover:text-blue-600">${escapeHTML(activity.agreement_title || 'Agreement')}</a>`
                    : `${escapeHTML(activity.agreement_title || 'Agreement')}`
                  }
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${escapeHTML(activity.type || 'event')}</span>
                  ${activity.actor ? `<span class="mx-1">·</span><span>${escapeHTML(activity.actor)}</span>` : ''}
                </div>
              </div>
              ${activity.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${escapeHTML(activity.timestamp)}">
                  <time data-relative-time="${escapeHTML(activity.timestamp)}">${escapeHTML(activity.timestamp)}</time>
                </div>
              ` : ''}
            </li>
          `).join('')}
        </ul>
      ` : `
        <div class="text-center py-4 text-gray-500">
          <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-sm">No recent signing activity</p>
        </div>
      `}
      ${activityURL ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${escapeHTML(activityURL)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Activity
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ''}
    `;
  }

  if (def === 'esign.widget.delivery_health') {
    const esign = data as Record<string, unknown>;
    const emailRate = Math.max(0, Math.min(100, Number(esign.email_success_rate ?? 100)));
    const jobRate = Math.max(0, Math.min(100, Number(esign.job_success_rate ?? 100)));
    const pendingRetries = Number(esign.pending_retries || 0);
    const period = String(esign.period || '').trim();
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
            <span class="text-sm text-gray-600">Email Delivery</span>
            <span class="text-sm font-semibold ${emailTone.text}">${emailRate}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${emailTone.bar}" style="width: ${emailRate}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${escapeHTML(formatNumber(esign.emails_sent || 0))} sent</span>
            <span>${escapeHTML(formatNumber(esign.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${jobTone.text}">${jobRate}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${jobTone.bar}" style="width: ${jobRate}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${escapeHTML(formatNumber(esign.jobs_completed || 0))} completed</span>
            <span>${escapeHTML(formatNumber(esign.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${pendingRetries > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${escapeHTML(formatNumber(pendingRetries))} items pending retry
          </div>
        ` : ''}
      </div>
      ${period ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${escapeHTML(period)}</div>` : ''}
    `;
  }

  if (def === 'esign.widget.pending_signatures') {
    const esign = data as Record<string, unknown>;
    const agreements = Array.isArray(esign.agreements) ? esign.agreements as Array<Record<string, unknown>> : [];
    const listURL = String(esign.list_url || '').trim();
    return `
      ${agreements.length ? `
        <ul class="space-y-2">
          ${agreements.map((agreement) => {
            const pendingRecipients = Array.isArray(agreement.pending_recipients) ? agreement.pending_recipients as Array<Record<string, unknown>> : [];
            return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${agreement.url
                    ? `<a href="${escapeHTML(agreement.url)}" class="hover:text-blue-600">${escapeHTML(agreement.title || 'Untitled')}</a>`
                    : `${escapeHTML(agreement.title || 'Untitled')}`
                  }
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${escapeHTML(formatNumber(agreement.pending_count || 0))} of ${escapeHTML(formatNumber(agreement.total_recipients || 0))} signatures pending
                </div>
                ${pendingRecipients.length ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${pendingRecipients.slice(0, 3).map((recipient) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${escapeHTML(recipient.name || recipient.email || 'Recipient')}
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
      ` : `
        <div class="text-center py-6 text-gray-500">
          <p class="text-sm font-medium">All caught up!</p>
          <p class="text-xs mt-1">No agreements pending signature</p>
        </div>
      `}
      ${listURL ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${escapeHTML(listURL)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ''}
    `;
  }

  return `<pre class="text-xs text-gray-600 overflow-auto">${escapeHTML(JSON.stringify(data, null, 2))}</pre>`;
}

export function renderWidget(widget: Widget): string {
  const span = widget.metadata?.layout?.width || widget.span || 12;
  const title = widget.data?.title || widget.config?.title || widget.title || getWidgetTitle(widget.definition);

  return `
    <article class="widget" data-widget="${escapeHTML(widget.id || widget.definition || '')}" data-span="${escapeHTML(span)}" style="--span: ${escapeHTML(span)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${escapeHTML(title)}</h3></div>
      <div class="widget__content">${renderWidgetContent(widget)}</div>
    </article>
  `;
}

export function renderWidgetPanel(panel: TabPanel): string {
  const widgets = Array.isArray(panel.widgets) ? panel.widgets : [];
  const message = panel.empty_message || 'No widgets configured for this tab.';
  const content = widgets.length
    ? `<div class="widgets-grid" data-area-code="${escapeHTML(panel.area_code || '')}">${widgets.map(renderWidget).join('')}</div>`
    : `<p class="text-sm text-gray-500">${escapeHTML(message)}</p>`;

  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${content}</div></div>`;
}

export function renderDetailsPanel(payload: TabPanelPayload): string {
  const record = payload.record || {};
  const fields = Array.isArray(payload.fields) ? payload.fields : [];
  const displayName = (record.username || record.display_name || record.id || '') as string;
  const email = (record.email || '') as string;
  const initial = String(record.username || record.display_name || record.email || record.id || '?').slice(0, 1).toUpperCase();

  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${escapeHTML(initial)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${escapeHTML(displayName)}</h2>
          <p class="text-sm text-gray-500">${escapeHTML(email)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${fields.map((f: FieldDefinition) =>
            `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${escapeHTML(f.label)}</div><div class="text-base font-medium text-gray-900">${escapeHTML(f.value ?? '-')}</div></div>`
          ).join('')}
        </div>
      </div>
    </div>
  `;
}

export function renderPanelLink(panel: TabPanel): string {
  const href = panel.href || '';
  const panelName = panel.panel || 'panel';

  if (!href) {
    return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>`;
  }

  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${escapeHTML(panelName)} panel.</p>
        <a href="${escapeHTML(href)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  `;
}

export function renderTemplatePanel(panel: TabPanel): string {
  if (panel.html) return panel.html;

  const msg = panel.template
    ? `Template tab "${escapeHTML(panel.template)}" requires server rendering.`
    : 'Template tab is missing a template reference.';

  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${msg}</div></div>`;
}

export function renderClientTab(payload: TabPanelPayload): string {
  const panel = payload?.tab || (payload as unknown as TabPanel);

  if (!panel || !panel.kind) {
    return '<p class="text-sm text-gray-500">No content available.</p>';
  }

  if (panel.kind === 'dashboard_area' || panel.kind === 'cms_area') {
    return renderWidgetPanel(panel);
  }

  if (panel.kind === 'details') {
    return renderDetailsPanel(payload);
  }

  if (panel.kind === 'panel') {
    return renderPanelLink(panel);
  }

  if (panel.kind === 'template') {
    return renderTemplatePanel(panel);
  }

  return '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
