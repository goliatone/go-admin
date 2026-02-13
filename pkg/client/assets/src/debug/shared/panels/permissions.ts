// Permissions debug panel renderer
// Provides a rich UI for diagnosing permission issues

import type { PermissionsSnapshot, PermissionEntry, PanelOptions } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatJSON } from '../utils.js';

/**
 * Options for rendering the permissions panel
 */
export type PermissionsPanelOptions = PanelOptions & {
  /** Whether to show the raw JSON section. Defaults to true. */
  showRawJSON?: boolean;
  /** Whether to show the collapsible details. Defaults to true. */
  showCollapsible?: boolean;
};

/**
 * Get verdict display configuration
 */
function getVerdictConfig(verdict: string): { label: string; color: string; bgColor: string; icon: string } {
  switch (verdict) {
    case 'healthy':
      return {
        label: 'Healthy',
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        icon: '\u2713', // checkmark
      };
    case 'missing_grants':
      return {
        label: 'Missing Grants',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: '\u2717', // x mark
      };
    case 'claims_stale':
      return {
        label: 'Claims Stale',
        color: '#f97316',
        bgColor: 'rgba(249, 115, 22, 0.1)',
        icon: '\u26A0', // warning
      };
    case 'scope_mismatch':
      return {
        label: 'Scope/Policy Mismatch',
        color: '#eab308',
        bgColor: 'rgba(234, 179, 8, 0.1)',
        icon: '\u26A0', // warning
      };
    case 'error':
      return {
        label: 'Error',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        icon: '\u2717', // x mark
      };
    default:
      return {
        label: 'Unknown',
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
        icon: '?',
      };
  }
}

/**
 * Get status badge configuration
 */
function getStatusConfig(status: string): { color: string; bgColor: string } {
  switch (status) {
    case 'ok':
      return { color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)' };
    case 'error':
      return { color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' };
    case 'warning':
      return { color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)' };
    case 'info':
    default:
      return { color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
  }
}

/**
 * Render the status banner
 */
function renderStatusBanner(data: PermissionsSnapshot): string {
  const verdict = getVerdictConfig(data.verdict);
  const userInfo = data.user_info || {};

  let userDisplay = '';
  if (userInfo.username || userInfo.user_id) {
    userDisplay = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${userInfo.username ? `<span>User: <strong style="color: #e2e8f0;">${escapeHTML(userInfo.username)}</strong></span>` : ''}
        ${userInfo.role ? `<span>Role: <strong style="color: #e2e8f0;">${escapeHTML(userInfo.role)}</strong></span>` : ''}
        ${userInfo.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${escapeHTML(userInfo.tenant_id)}</strong></span>` : ''}
        ${userInfo.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${escapeHTML(userInfo.org_id)}</strong></span>` : ''}
      </div>
    `;
  }

  return `
    <div style="
      background: ${verdict.bgColor};
      border: 1px solid ${verdict.color}40;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 24px;
          color: ${verdict.color};
        ">${verdict.icon}</span>
        <div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${verdict.color};
          ">${verdict.label}</div>
        </div>
      </div>
      ${userDisplay}
    </div>
  `;
}

/**
 * Render summary chips
 */
function renderSummaryChips(data: PermissionsSnapshot): string {
  const summary = data.summary || { module_count: 0, required_keys: 0, claims_keys: 0, missing_keys: 0 };

  const chips = [
    { label: 'Modules', value: summary.module_count, color: '#3b82f6' },
    { label: 'Required', value: summary.required_keys, color: '#8b5cf6' },
    { label: 'In Claims', value: summary.claims_keys, color: '#22c55e' },
    { label: 'Missing', value: summary.missing_keys, color: summary.missing_keys > 0 ? '#ef4444' : '#6b7280' },
  ];

  return `
    <div style="
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    ">
      ${chips
        .map(
          (chip) => `
        <div style="
          background: ${chip.color}20;
          border: 1px solid ${chip.color}40;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        ">
          <span style="font-size: 20px; font-weight: 700; color: ${chip.color};">${chip.value}</span>
          <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${chip.label}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Render a single permission row
 */
function renderPermissionRow(entry: PermissionEntry, index: number): string {
  const statusConfig = getStatusConfig(entry.status);

  const checkIcon = (value: boolean): string => {
    if (value) {
      return `<span style="color: #22c55e; font-weight: bold;">\u2713</span>`;
    }
    return `<span style="color: #ef4444; font-weight: bold;">\u2717</span>`;
  };

  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${escapeHTML(entry.permission)}
        ${entry.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${escapeHTML(entry.module)})</span>` : ''}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${checkIcon(entry.required)}</td>
      <td style="padding: 10px 12px; text-align: center;">${checkIcon(entry.in_claims)}</td>
      <td style="padding: 10px 12px; text-align: center;">${checkIcon(entry.allows)}</td>
      <td style="padding: 10px 12px;">
        <span style="
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          background: ${statusConfig.bgColor};
          color: ${statusConfig.color};
        ">${escapeHTML(entry.diagnosis)}</span>
      </td>
    </tr>
  `;
}

/**
 * Render the permissions table
 */
function renderPermissionsTable(data: PermissionsSnapshot): string {
  const entries = data.entries || [];

  if (entries.length === 0) {
    return `
      <div style="
        text-align: center;
        padding: 24px;
        color: #64748b;
        font-style: italic;
      ">No permissions to display</div>
    `;
  }

  return `
    <div style="margin-bottom: 16px;">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #334155;
      ">Permission Details</h3>
      <div style="overflow-x: auto;">
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        ">
          <thead>
            <tr style="background: #1e293b; border-bottom: 2px solid #334155;">
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Permission</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Required</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">In Claims</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Allows</th>
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((entry, index) => renderPermissionRow(entry, index)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render next actions panel
 */
function renderNextActionsPanel(data: PermissionsSnapshot): string {
  const actions = data.next_actions || [];

  if (actions.length === 0) {
    return '';
  }

  const verdict = getVerdictConfig(data.verdict);

  return `
    <div style="
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: ${verdict.color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${actions
          .map((action) => {
            // Indent sub-items (those starting with "  -")
            if (action.startsWith('  -')) {
              return `<li style="margin-left: 20px; color: #94a3b8;">${escapeHTML(action.trim().slice(2))}</li>`;
            }
            return `<li>${escapeHTML(action)}</li>`;
          })
          .join('')}
      </ul>
    </div>
  `;
}

/**
 * Render collapsible raw JSON section
 */
function renderRawJSONSection(data: PermissionsSnapshot): string {
  const jsonString = formatJSON(data);

  return `
    <details style="margin-top: 16px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 13px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 11px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${escapeHTML(jsonString)}</pre>
      </div>
    </details>
  `;
}

/**
 * Render the permissions panel
 *
 * @param data - Permissions snapshot data
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the permissions panel
 */
export function renderPermissionsPanel(
  data: PermissionsSnapshot,
  styles: StyleConfig,
  options: PermissionsPanelOptions = {}
): string {
  const { showRawJSON = true, showCollapsible = true } = options;

  if (!data) {
    return `<div class="${styles.emptyState}">No permissions data available</div>`;
  }

  return `
    <div style="padding: 8px;">
      ${renderStatusBanner(data)}
      ${renderSummaryChips(data)}
      ${renderPermissionsTable(data)}
      ${renderNextActionsPanel(data)}
      ${showRawJSON ? renderRawJSONSection(data) : ''}
    </div>
  `;
}

/**
 * Render a compact version for toolbar
 */
export function renderPermissionsPanelCompact(
  data: PermissionsSnapshot,
  styles: StyleConfig
): string {
  if (!data) {
    return `<div class="${styles.emptyState}">No permissions data</div>`;
  }

  const verdict = getVerdictConfig(data.verdict);
  const summary = data.summary || { module_count: 0, required_keys: 0, claims_keys: 0, missing_keys: 0 };

  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 18px;
          color: ${verdict.color};
        ">${verdict.icon}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${verdict.color};
        ">${verdict.label}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Required: <strong style="color: #e2e8f0;">${summary.required_keys}</strong></span>
        <span>Claims: <strong style="color: #e2e8f0;">${summary.claims_keys}</strong></span>
        <span>Missing: <strong style="color: ${summary.missing_keys > 0 ? '#ef4444' : '#e2e8f0'};">${summary.missing_keys}</strong></span>
      </div>
    </div>
  `;
}
