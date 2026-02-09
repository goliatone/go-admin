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
    return `<ul class="space-y-3">${entries.map((e) =>
      `<li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${escapeHTML(e.actor)}</div>
        <div class="text-gray-500 text-sm mt-1">${escapeHTML(e.action)} ${escapeHTML(e.object)}</div>
        ${e.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${escapeHTML(e.created_at)}" data-relative-time="${escapeHTML(e.created_at)}">${escapeHTML(e.created_at)}</time>` : ''}
      </li>`
    ).join('')}</ul>`;
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
