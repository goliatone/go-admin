// Site Render Cache debug panel renderer
// Provides a UI for diagnosing public site render cache status and operations

import type { PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatTimestamp, formatNumber, formatJSON } from '../utils.js';
import type { DebugIconKind } from '../icons.js';

// ============================================================================
// Types (matching backend snapshot shape)
// ============================================================================

export type SiteRenderCacheKey = {
  observed_at?: string;
  key_redacted?: boolean;
  key_hash?: string;
  raw_key?: string;
  route_hint?: string;
  render_prefix?: boolean;
};

export type SiteRenderCacheOperation = {
  timestamp?: string;
  operation?: string;
  backend?: string;
  outcome?: string;
  key?: SiteRenderCacheKey;
  ttl_seconds?: number;
  target_count?: number;
  mode?: string;
  message?: string;
};

export type SiteRenderCacheError = {
  timestamp?: string;
  operation?: string;
  backend?: string;
  key?: SiteRenderCacheKey;
  message?: string;
};

export type SiteRenderCacheCachedResponse = {
  timestamp?: string;
  status?: number;
  content_type?: string;
  body_size?: number;
  header_count?: number;
  tag_count?: number;
  fresh_until?: string;
  stale_until?: string;
  ttl_seconds?: number;
  ttl_class?: string;
  key?: SiteRenderCacheKey;
};

export type SiteRenderCacheCommand = {
  timestamp?: string;
  command?: string;
  mode?: string;
  backend?: string;
  outcome?: string;
  target_count?: number;
  message?: string;
};

export type SiteRenderCacheStartupError = {
  timestamp?: string;
  backend?: string;
  error_kind?: string;
  message?: string;
  fail_closed?: boolean;
};

export type SiteRenderCacheConfig = {
  enabled?: boolean;
  backend?: string;
  fresh_ttl?: string;
  stale_ttl?: string;
  render_version?: string;
  namespace?: string;
  debug_headers?: boolean;
  debug_keys?: boolean;
  fail_closed?: boolean;
  require_tag_index?: boolean;
  max_capture_body_size?: number;
  valkey?: {
    address?: string;
    namespace?: string;
    url_configured?: boolean;
    username_set?: boolean;
    password_set?: boolean;
    db?: number;
    tls_enabled?: boolean;
    tls_skip_verify?: boolean;
  };
};

export type SiteRenderCacheCapabilities = {
  tag_invalidation?: boolean;
  prefix_invalidation?: boolean;
  close?: boolean;
  backend_descriptor?: boolean;
  app_wide_tag_clear_preferred?: boolean;
  process_local_observed_keys?: boolean;
  backend_key_scanning_enabled?: boolean;
};

export type SiteRenderCacheCounters = {
  lookups?: number;
  hits?: number;
  misses?: number;
  writes?: number;
  deletes?: number;
  invalidations?: number;
  errors?: number;
  clears?: number;
  hit_ratio?: number | null;
};

export type SiteRenderCacheSnapshot = {
  configured?: boolean;
  active?: boolean;
  backend?: string;
  status?: string;
  scope?: string;
  observed_by?: string;
  startup_error?: SiteRenderCacheStartupError;
  config?: SiteRenderCacheConfig;
  capabilities?: SiteRenderCacheCapabilities;
  counters?: SiteRenderCacheCounters;
  latest_cached?: SiteRenderCacheCachedResponse;
  observed_keys?: SiteRenderCacheKey[];
  recent_operations?: SiteRenderCacheOperation[];
  recent_errors?: SiteRenderCacheError[];
  last_command?: SiteRenderCacheCommand;
};

/**
 * Options for rendering the site render cache panel
 */
export type SiteRenderCachePanelOptions = PanelOptions & {
  /** Maximum number of operations to show. Defaults to 20. */
  maxOperations?: number;
  /** Maximum number of keys to show. Defaults to 20. */
  maxKeys?: number;
  /** Maximum number of errors to show. Defaults to 10. */
  maxErrors?: number;
  /** Whether to show raw JSON section. Defaults to false. */
  showRawJSON?: boolean;
  /** Whether to use compact layout. Defaults to false. */
  compact?: boolean;
};

// ============================================================================
// Status Badge Configuration
// ============================================================================

type StatusConfig = {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: SiteRenderCacheIcon;
};

type SiteRenderCacheIcon = Extract<
  DebugIconKind,
  'success' | 'warning' | 'error' | 'unknown' | 'refresh' | 'clear'
> | 'inactive';

function renderCacheIcon(icon: SiteRenderCacheIcon, options: { size?: number; color?: string } = {}): string {
  const size = options.size || 12;
  const color = options.color || 'currentColor';
  const commonAttrs = `data-site-cache-icon="${icon}" aria-hidden="true" focusable="false" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex:0 0 ${size}px;width:${size}px;height:${size}px;color:${color};vertical-align:-2px;"`;

  switch (icon) {
    case 'success':
      return `<svg ${commonAttrs}><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    case 'warning':
      return `<svg ${commonAttrs}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
    case 'error':
      return `<svg ${commonAttrs}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    case 'inactive':
      return `<svg ${commonAttrs}><circle cx="12" cy="12" r="8"></circle></svg>`;
    case 'refresh':
      return `<svg ${commonAttrs}><path d="M21 12a9 9 0 0 1-15.1 6.6"></path><path d="M3 12a9 9 0 0 1 15.1-6.6"></path><path d="M18 3v5h-5"></path><path d="M6 21v-5h5"></path></svg>`;
    case 'clear':
      return `<svg ${commonAttrs}><path d="m7 21-4-4 10-10 4 4-8 8"></path><path d="m14 4 6 6"></path><path d="M9 21h12"></path></svg>`;
    case 'unknown':
    default:
      return `<svg ${commonAttrs}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-.9.6-1.8 1.3-1.8 2.5"></path><path d="M12 17h.01"></path></svg>`;
  }
}

function getStatusConfig(status?: string): StatusConfig {
  const s = (status || '').toLowerCase();
  if (s === 'healthy' || s === 'active') {
    return {
      label: 'Healthy',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.4)',
      icon: 'success',
    };
  }
  if (s === 'degraded' || s === 'warn') {
    return {
      label: 'Degraded',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      icon: 'warning',
    };
  }
  if (s === 'error' || s === 'startup_error') {
    return {
      label: 'Error',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      icon: 'error',
    };
  }
  if (s === 'inactive' || s === 'disabled') {
    return {
      label: 'Inactive',
      color: '#64748b',
      bgColor: 'rgba(100, 116, 139, 0.1)',
      borderColor: 'rgba(100, 116, 139, 0.4)',
      icon: 'inactive',
    };
  }
  return {
    label: status || 'Unknown',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    icon: 'unknown',
  };
}

function getCommandOutcomeConfig(outcome?: string): StatusConfig {
  const o = (outcome || '').toLowerCase();
  if (o === 'success' || o === 'ok') {
    return {
      label: 'Success',
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.4)',
      icon: 'success',
    };
  }
  if (o === 'failed' || o === 'error') {
    return {
      label: 'Failed',
      color: '#ef4444',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      icon: 'error',
    };
  }
  if (o === 'unsupported' || o === 'none') {
    return {
      label: 'Unsupported',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      icon: 'warning',
    };
  }
  return {
    label: outcome || 'Unknown',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.1)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    icon: 'unknown',
  };
}

// ============================================================================
// Header Components
// ============================================================================

function renderStatusBadge(snapshot: SiteRenderCacheSnapshot): string {
  // Determine effective status based on configured/active state
  let effectiveStatus = snapshot.status;
  if (!snapshot.configured) {
    effectiveStatus = 'inactive';
  } else if (!snapshot.active) {
    effectiveStatus = 'inactive';
  }

  const config = getStatusConfig(effectiveStatus);

  let statusLabel = config.label;
  if (!snapshot.configured) {
    statusLabel = 'Not Configured';
  } else if (!snapshot.active) {
    statusLabel = 'Inactive';
  }

  return `
    <div style="
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: ${config.bgColor};
      border: 1px solid ${config.borderColor};
      border-radius: 5px;
    ">
      ${renderCacheIcon(config.icon, { size: 13, color: config.color })}
      <span style="
        font-size: 12px;
        font-weight: 600;
        color: ${config.color};
      ">${escapeHTML(statusLabel)}</span>
    </div>
  `;
}

function renderBackendInfo(snapshot: SiteRenderCacheSnapshot): string {
  const backend = snapshot.backend || 'none';
  const scope = snapshot.scope || 'unknown';
  const isProcessLocal = scope === 'process_local';

  // Scope badge styles
  const scopeBgColor = isProcessLocal ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)';
  const scopeBorderColor = isProcessLocal ? 'rgba(245, 158, 11, 0.3)' : 'rgba(100, 116, 139, 0.3)';
  const scopeTextColor = isProcessLocal ? '#f59e0b' : '#94a3b8';

  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    ">
      <span style="
        padding: 5px 8px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 4px;
        font-family: monospace;
        color: #e2e8f0;
      ">${escapeHTML(backend)}</span>
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        background: ${scopeBgColor};
        border: 1px solid ${scopeBorderColor};
        border-radius: 4px;
        color: ${scopeTextColor};
        font-weight: 500;
      ">${isProcessLocal ? renderCacheIcon('warning', { size: 13, color: scopeTextColor }) : ''}<span>${escapeHTML(scope)}</span></span>
      ${snapshot.observed_by ? `
        <span style="color: #64748b; font-size: 11px;">
          obs: ${escapeHTML(snapshot.observed_by)}
        </span>
      ` : ''}
    </div>
  `;
}

function renderClearButton(): string {
  return `
    <button
      type="button"
      class="debug-btn"
      data-debug-action="clear-panel"
      style="
        padding: 5px 10px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        line-height: 1;
      "
    >
      ${renderCacheIcon('clear', { size: 13, color: '#fff' })}
      <span>Clear Cache</span>
    </button>
  `;
}

function renderHeaderBar(snapshot: SiteRenderCacheSnapshot): string {
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #1e293b;
      flex-wrap: wrap;
    ">
      ${renderStatusBadge(snapshot)}
      <span style="color: #334155; font-size: 10px;">│</span>
      ${renderBackendInfo(snapshot)}
      ${snapshot.active ? `
        <div style="margin-left: auto;">
          ${renderClearButton()}
        </div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// Counter Components
// ============================================================================

function renderCounterChips(counters?: SiteRenderCacheCounters): string {
  const c = counters || {};
  const lookups = c.lookups || 0;
  const hits = c.hits || 0;
  const misses = c.misses || 0;
  const writes = c.writes || 0;
  const errors = c.errors || 0;
  const clears = c.clears || 0;

  // Calculate hit ratio display
  let hitRatioDisplay = 'N/A';
  if (lookups > 0) {
    const ratio = c.hit_ratio !== null && c.hit_ratio !== undefined
      ? c.hit_ratio
      : (hits / lookups);
    hitRatioDisplay = `${(ratio * 100).toFixed(1)}%`;
  }

  const chips = [
    { label: 'Lookups', value: formatNumber(lookups), color: '#64748b' },
    { label: 'Hits', value: formatNumber(hits), color: '#22c55e' },
    { label: 'Misses', value: formatNumber(misses), color: '#f59e0b' },
    { label: 'Writes', value: formatNumber(writes), color: '#3b82f6' },
    { label: 'Errors', value: formatNumber(errors), color: errors > 0 ? '#ef4444' : '#64748b' },
    { label: 'Clears', value: formatNumber(clears), color: '#8b5cf6' },
    { label: 'Hit Rate', value: hitRatioDisplay, color: lookups > 0 ? '#22c55e' : '#64748b' },
  ];

  return `
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
      gap: 6px;
      margin-bottom: 16px;
    ">
      ${chips
        .map(
          (chip) => `
        <div style="
          background: ${chip.color}15;
          border: 1px solid ${chip.color}30;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: ${chip.color};
            line-height: 1.2;
          ">${chip.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${chip.label}</div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// ============================================================================
// Last Command Section
// ============================================================================

function renderLastCommand(cmd?: SiteRenderCacheCommand): string {
  if (!cmd) return '';

  const config = getCommandOutcomeConfig(cmd.outcome);
  const timestamp = cmd.timestamp ? formatTimestamp(cmd.timestamp) : '';

  return `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: ${config.bgColor};
      border: 1px solid ${config.borderColor};
      border-left: 3px solid ${config.color};
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      ">
        <div style="
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        ">Last Command</div>
        <span style="
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          color: ${config.color};
          background: ${config.bgColor};
          border: 1px solid ${config.borderColor};
        ">${escapeHTML(config.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${escapeHTML(cmd.command || 'unknown')}</span>
        <span><strong>Mode:</strong> ${escapeHTML(cmd.mode || 'none')}</span>
        ${cmd.target_count !== undefined ? `<span><strong>Targets:</strong> ${cmd.target_count}</span>` : ''}
        ${timestamp ? `<span style="color: #64748b;">${escapeHTML(timestamp)}</span>` : ''}
      </div>
      ${cmd.message ? `
        <div style="
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">${escapeHTML(cmd.message)}</div>
      ` : ''}
    </div>
  `;
}

// ============================================================================
// Startup Error Section
// ============================================================================

function renderStartupError(err?: SiteRenderCacheStartupError): string {
  if (!err) return '';

  return `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-left: 3px solid #ef4444;
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      ">Startup Error</div>
      <div style="
        font-size: 12px;
        color: #fca5a5;
        line-height: 1.5;
      ">${escapeHTML(err.message || 'Unknown error')}</div>
      <div style="
        margin-top: 6px;
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
      ">
        ${err.backend ? `<span><strong>Backend:</strong> ${escapeHTML(err.backend)}</span>` : ''}
        ${err.error_kind ? `<span><strong>Kind:</strong> ${escapeHTML(err.error_kind)}</span>` : ''}
        ${err.fail_closed !== undefined ? `<span><strong>Fail Closed:</strong> ${err.fail_closed ? 'Yes' : 'No'}</span>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Recent Errors Section
// ============================================================================

function renderErrorRow(err: SiteRenderCacheError): string {
  const timestamp = err.timestamp ? formatTimestamp(err.timestamp) : '';

  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; color: #64748b; font-size: 10px; white-space: nowrap;">${escapeHTML(timestamp)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 3px;
          font-size: 10px;
          color: #f87171;
        ">${escapeHTML(err.operation || 'unknown')}</span>
      </td>
      <td style="padding: 5px 8px; font-size: 11px; color: #cbd5e1;">${escapeHTML(err.message || '')}</td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; font-family: monospace;">
        ${err.key?.route_hint ? escapeHTML(err.key.route_hint) : (err.key?.key_hash ? escapeHTML(err.key.key_hash.slice(0, 12)) : '')}
      </td>
    </tr>
  `;
}

function renderRecentErrors(errors?: SiteRenderCacheError[], maxErrors = 10): string {
  const items = errors || [];
  if (items.length === 0) return '';

  const displayItems = items.slice(-maxErrors).reverse();

  return `
    <div style="margin-bottom: 12px;">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        ${renderCacheIcon('warning', { size: 13, color: '#ef4444' })} Recent Errors (${items.length})
      </div>
      <div style="
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
      ">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #1e293b;">
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Message</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Key</th>
            </tr>
          </thead>
          <tbody>
            ${displayItems.map((e) => renderErrorRow(e)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================================
// Config Section
// ============================================================================

function renderConfigValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<span style="color: #64748b; font-style: italic;">null</span>';
  }
  if (typeof value === 'boolean') {
    const color = value ? '#22c55e' : '#64748b';
    return `<span style="color: ${color}; font-weight: 500;">${value}</span>`;
  }
  if (typeof value === 'number') {
    return `<span style="color: #818cf8;">${value}</span>`;
  }
  if (typeof value === 'string') {
    if (value === '') {
      return '<span style="color: #64748b; font-style: italic;">empty</span>';
    }
    return `<span style="color: #fbbf24;">${escapeHTML(value)}</span>`;
  }
  return escapeHTML(String(value));
}

function renderConfigSection(config?: SiteRenderCacheConfig): string {
  if (!config) return '';

  const mainFields = [
    { key: 'enabled', value: config.enabled },
    { key: 'backend', value: config.backend },
    { key: 'fresh_ttl', value: config.fresh_ttl },
    { key: 'stale_ttl', value: config.stale_ttl },
    { key: 'render_version', value: config.render_version },
    { key: 'namespace', value: config.namespace },
    { key: 'debug_headers', value: config.debug_headers },
    { key: 'debug_keys', value: config.debug_keys },
    { key: 'fail_closed', value: config.fail_closed },
    { key: 'require_tag_index', value: config.require_tag_index },
    { key: 'max_capture_body_size', value: config.max_capture_body_size },
  ];

  const rows = mainFields
    .map(
      ({ key, value }) => `
    <tr>
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${escapeHTML(key)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${renderConfigValue(value)}</td>
    </tr>
  `
    )
    .join('');

  // Valkey sub-section if present
  let valkeySection = '';
  if (config.valkey && config.backend === 'valkey') {
    const valkeyFields = [
      { key: 'address', value: config.valkey.address },
      { key: 'namespace', value: config.valkey.namespace },
      { key: 'db', value: config.valkey.db },
      { key: 'url_configured', value: config.valkey.url_configured },
      { key: 'tls_enabled', value: config.valkey.tls_enabled },
      { key: 'tls_skip_verify', value: config.valkey.tls_skip_verify },
      { key: 'username_set', value: config.valkey.username_set },
      { key: 'password_set', value: config.valkey.password_set },
    ];

    const valkeyRows = valkeyFields
      .map(
        ({ key, value }) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${escapeHTML(key)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${renderConfigValue(value)}</td>
      </tr>
    `
      )
      .join('');

    valkeySection = `
      <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #334155;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Valkey</div>
        <table style="width: 100%; border-collapse: collapse;">${valkeyRows}</table>
      </div>
    `;
  }

  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Configuration</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <table style="width: 100%; border-collapse: collapse;">${rows}</table>
        ${valkeySection}
      </div>
    </details>
  `;
}

// ============================================================================
// Capabilities Section
// ============================================================================

function renderCapabilitiesSection(caps?: SiteRenderCacheCapabilities): string {
  if (!caps) return '';

  const fields = [
    { key: 'tag_invalidation', label: 'Tag Invalidation', value: caps.tag_invalidation },
    { key: 'prefix_invalidation', label: 'Prefix Invalidation', value: caps.prefix_invalidation },
    { key: 'app_wide_tag_clear_preferred', label: 'App-Wide Clear', value: caps.app_wide_tag_clear_preferred },
    { key: 'process_local_observed_keys', label: 'Process Local Keys', value: caps.process_local_observed_keys },
    { key: 'backend_key_scanning_enabled', label: 'Key Scanning', value: caps.backend_key_scanning_enabled },
  ];

  const badges = fields
    .map(({ label, value }) => {
      const supported = Boolean(value);
      const color = supported ? '#22c55e' : '#64748b';
      const icon = supported ? 'success' : 'error';
      return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: ${color}15;
          border: 1px solid ${color}30;
          border-radius: 4px;
          font-size: 11px;
          color: ${color};
        ">
          ${renderCacheIcon(icon, { size: 13, color })}
          ${escapeHTML(label)}
        </span>
      `;
    })
    .join('');

  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Capabilities</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      ">
        ${badges}
      </div>
    </details>
  `;
}

// ============================================================================
// Latest Cached Section
// ============================================================================

function renderLatestCached(cached?: SiteRenderCacheCachedResponse): string {
  if (!cached) return '';

  const timestamp = cached.timestamp ? formatTimestamp(cached.timestamp) : '';
  const keyDisplay = cached.key?.route_hint || cached.key?.key_hash?.slice(0, 16) || 'unknown';

  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Latest Cached Response</span>
        <span style="
          margin-left: 6px;
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 9px;
          color: #60a5fa;
        ">${escapeHTML(keyDisplay)}</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          font-size: 11px;
        ">
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Status</div>
            <div style="color: #e2e8f0; font-weight: 500;">${cached.status || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Content Type</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 10px;">${escapeHTML(cached.content_type || 'unknown')}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Body Size</div>
            <div style="color: #e2e8f0;">${formatNumber(cached.body_size || 0)} bytes</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Headers</div>
            <div style="color: #e2e8f0;">${cached.header_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Tags</div>
            <div style="color: #e2e8f0;">${cached.tag_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">TTL Class</div>
            <div style="color: #e2e8f0;">${escapeHTML(cached.ttl_class || 'default')}</div>
          </div>
        </div>
        ${timestamp ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Cached at: ${escapeHTML(timestamp)}</div>` : ''}
      </div>
    </details>
  `;
}

// ============================================================================
// Observed Keys Section
// ============================================================================

function renderKeyRow(key: SiteRenderCacheKey): string {
  const timestamp = key.observed_at ? formatTimestamp(key.observed_at) : '';
  const display = key.raw_key || key.route_hint || key.key_hash?.slice(0, 16) || 'unknown';

  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${escapeHTML(timestamp)}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 10px; color: #e2e8f0; word-break: break-all;">
        ${escapeHTML(display)}
        ${key.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ''}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${key.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ''}
      </td>
    </tr>
  `;
}

function renderObservedKeys(keys?: SiteRenderCacheKey[], maxKeys = 20): string {
  const items = keys || [];
  if (items.length === 0) return '';

  const displayItems = items.slice(-maxKeys).reverse();

  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Observed Keys (${items.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${displayItems.map((k) => renderKeyRow(k)).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

// ============================================================================
// Recent Operations Section
// ============================================================================

function renderOperationRow(op: SiteRenderCacheOperation): string {
  const timestamp = op.timestamp ? formatTimestamp(op.timestamp) : '';
  const outcomeConfig = getCommandOutcomeConfig(op.outcome);
  const keyDisplay = op.key?.route_hint || op.key?.key_hash?.slice(0, 12) || '';

  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${escapeHTML(timestamp)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 10px;
          color: #60a5fa;
        ">${escapeHTML(op.operation || 'unknown')}</span>
      </td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: ${outcomeConfig.bgColor};
          border-radius: 3px;
          font-size: 10px;
          color: ${outcomeConfig.color};
        ">${escapeHTML(op.outcome || 'unknown')}</span>
      </td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHTML(keyDisplay)}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${op.message ? escapeHTML(op.message.slice(0, 50)) : ''}
      </td>
    </tr>
  `;
}

function renderRecentOperations(ops?: SiteRenderCacheOperation[], maxOps = 20): string {
  const items = ops || [];
  if (items.length === 0) return '';

  const displayItems = items.slice(-maxOps).reverse();

  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Recent Operations (${items.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Outcome</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Message</th>
            </tr>
          </thead>
          <tbody>
            ${displayItems.map((o) => renderOperationRow(o)).join('')}
          </tbody>
        </table>
      </div>
    </details>
  `;
}

// ============================================================================
// Raw JSON Section
// ============================================================================

function renderRawJSON(snapshot: SiteRenderCacheSnapshot): string {
  const jsonString = formatJSON(snapshot);

  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #64748b;
        font-size: 11px;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        padding: 10px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 10px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${escapeHTML(jsonString)}</pre>
      </div>
    </details>
  `;
}

// ============================================================================
// Main Render Functions
// ============================================================================

/**
 * Render the full site render cache panel
 */
export function renderSiteRenderCachePanel(
  snapshot: SiteRenderCacheSnapshot,
  styles: StyleConfig,
  options: SiteRenderCachePanelOptions = {}
): string {
  const {
    maxOperations = 20,
    maxKeys = 20,
    maxErrors = 10,
    showRawJSON = false,
  } = options;

  if (!snapshot) {
    return `<div class="${styles.emptyState}">No site render cache data available</div>`;
  }

  // Not configured state
  if (!snapshot.configured) {
    return `
      <div style="padding: 12px;">
        ${renderHeaderBar(snapshot)}
        <div style="
          text-align: center;
          padding: 32px 16px;
          color: #64748b;
        ">
          <div style="margin-bottom: 10px;">${renderCacheIcon('inactive', { size: 24, color: '#64748b' })}</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 12px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    `;
  }

  return `
    <div style="padding: 14px;">
      ${renderHeaderBar(snapshot)}
      ${renderStartupError(snapshot.startup_error)}
      ${renderCounterChips(snapshot.counters)}
      ${renderLastCommand(snapshot.last_command)}
      ${renderRecentErrors(snapshot.recent_errors, maxErrors)}
      ${renderLatestCached(snapshot.latest_cached)}
      ${renderConfigSection(snapshot.config)}
      ${renderCapabilitiesSection(snapshot.capabilities)}
      ${renderObservedKeys(snapshot.observed_keys, maxKeys)}
      ${renderRecentOperations(snapshot.recent_operations, maxOperations)}
      ${showRawJSON ? renderRawJSON(snapshot) : ''}
    </div>
  `;
}

/**
 * Render a compact version for the toolbar
 */
export function renderSiteRenderCachePanelCompact(
  snapshot: SiteRenderCacheSnapshot,
  styles: StyleConfig
): string {
  if (!snapshot) {
    return `<div class="${styles.emptyState}">No cache data</div>`;
  }

  // Determine effective status based on configured/active state
  let effectiveStatus = snapshot.status;
  if (!snapshot.configured) {
    effectiveStatus = 'inactive';
  } else if (!snapshot.active) {
    effectiveStatus = 'inactive';
  }
  const statusConfig = getStatusConfig(effectiveStatus);
  const counters = snapshot.counters || {};
  const hits = counters.hits || 0;
  const misses = counters.misses || 0;
  const errors = counters.errors || 0;

  let hitRatioDisplay = 'N/A';
  const lookups = counters.lookups || 0;
  if (lookups > 0) {
    const ratio = counters.hit_ratio !== null && counters.hit_ratio !== undefined
      ? counters.hit_ratio
      : (hits / lookups);
    hitRatioDisplay = `${(ratio * 100).toFixed(1)}%`;
  }

  const recentErrorCount = (snapshot.recent_errors || []).length;
  const scope = snapshot.scope || 'unknown';
  const isProcessLocal = scope === 'process_local';

  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #1e293b;
      ">
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          background: ${statusConfig.bgColor};
          border: 1px solid ${statusConfig.borderColor};
          border-radius: 4px;
        ">
          ${renderCacheIcon(statusConfig.icon, { size: 13, color: statusConfig.color })}
          <span style="font-size: 11px; font-weight: 600; color: ${statusConfig.color};">${escapeHTML(statusConfig.label)}</span>
        </span>
        <span style="
          padding: 3px 6px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
          color: #e2e8f0;
        ">${escapeHTML(snapshot.backend || 'none')}</span>
        ${isProcessLocal ? `
          <span style="
            padding: 3px 6px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 4px;
            font-size: 10px;
            color: #f59e0b;
          ">${renderCacheIcon('warning', { size: 12, color: '#f59e0b' })} local</span>
        ` : ''}
      </div>
      <div style="
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
        flex-wrap: wrap;
      ">
        <span>Hit Rate: <strong style="color: ${lookups > 0 ? '#22c55e' : '#64748b'};">${hitRatioDisplay}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${formatNumber(hits)}</strong></span>
        <span>Misses: <strong style="color: #f59e0b;">${formatNumber(misses)}</strong></span>
        ${errors > 0 || recentErrorCount > 0 ? `
          <span>Errors: <strong style="color: #ef4444;">${formatNumber(errors)}</strong></span>
        ` : ''}
      </div>
      ${snapshot.active ? `
        <div style="margin-top: 8px;">
          <button
            type="button"
            class="debug-btn"
            data-debug-action="clear-panel"
            style="
              padding: 4px 10px;
              background: #dc2626;
              color: #fff;
              border: none;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            "
          >${renderCacheIcon('clear', { size: 12, color: '#fff' })} Clear</button>
        </div>
      ` : ''}
    </div>
  `;
}
