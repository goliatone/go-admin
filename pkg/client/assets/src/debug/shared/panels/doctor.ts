// Doctor debug panel renderer
// Provides a rich UI for diagnosing system health issues

import type {
  DoctorReport,
  DoctorCheckResult,
  DoctorSeverity,
  DoctorFinding,
  DoctorActionState,
  DoctorSummary,
  PanelOptions,
} from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML, formatJSON } from '../utils.js';

/**
 * Options for rendering the doctor panel
 */
export type DoctorPanelOptions = PanelOptions & {
  /** Whether to show the raw JSON section. Defaults to true. */
  showRawJSON?: boolean;
  /** Whether to show only problematic checks. Defaults to false. */
  problemsOnly?: boolean;
};

// ============================================================================
// Severity Configuration
// ============================================================================

type SeverityConfig = {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
};

function getSeverityConfig(severity?: DoctorSeverity): SeverityConfig {
  switch ((severity || '').toLowerCase()) {
    case 'error':
      return {
        label: 'Error',
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.4)',
        icon: '\u2717', // ✗
      };
    case 'warn':
      return {
        label: 'Warning',
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
        icon: '\u26A0', // ⚠
      };
    case 'info':
      return {
        label: 'Info',
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.4)',
        icon: '\u2139', // ℹ
      };
    default:
      return {
        label: 'OK',
        color: '#22c55e',
        bgColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: 'rgba(34, 197, 94, 0.4)',
        icon: '\u2713', // ✓
      };
  }
}

function getVerdictLabel(severity?: DoctorSeverity): string {
  switch ((severity || '').toLowerCase()) {
    case 'error':
      return 'Unhealthy';
    case 'warn':
      return 'Needs Attention';
    case 'info':
      return 'Info Available';
    default:
      return 'Healthy';
  }
}

// ============================================================================
// Header Bar Components
// ============================================================================

function renderVerdictBadge(report: DoctorReport): string {
  const config = getSeverityConfig(report.verdict);
  const label = getVerdictLabel(report.verdict);

  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${config.bgColor};
      border: 1px solid ${config.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${config.color};
        line-height: 1;
      ">${config.icon}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${config.color};
        ">${escapeHTML(label)}</div>
        <div style="
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">System Status</div>
      </div>
    </div>
  `;
}

function renderSummaryChips(summary: DoctorSummary | undefined): string {
  const s = summary || { checks: 0, ok: 0, info: 0, warn: 0, error: 0 };

  const chips = [
    { label: 'Total', value: s.checks || 0, color: '#64748b' },
    { label: 'OK', value: s.ok || 0, color: '#22c55e' },
    { label: 'Info', value: s.info || 0, color: '#3b82f6' },
    { label: 'Warn', value: s.warn || 0, color: s.warn ? '#f59e0b' : '#64748b' },
    { label: 'Error', value: s.error || 0, color: s.error ? '#ef4444' : '#64748b' },
  ];

  return `
    <div style="
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    ">
      ${chips
        .map(
          (chip) => `
        <div style="
          background: ${chip.color}15;
          border: 1px solid ${chip.color}30;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        ">
          <span style="
            font-size: 18px;
            font-weight: 700;
            color: ${chip.color};
            line-height: 1.2;
          ">${chip.value}</span>
          <span style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">${chip.label}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

function renderHeaderBar(report: DoctorReport): string {
  const timestamp = report.generated_at
    ? new Date(report.generated_at).toLocaleString()
    : '';

  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      ${renderVerdictBadge(report)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${renderSummaryChips(report.summary)}
        ${timestamp ? `<span style="font-size: 11px; color: #64748b;">Generated: ${escapeHTML(timestamp)}</span>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Finding Components
// ============================================================================

function renderFinding(finding: DoctorFinding): string {
  const config = getSeverityConfig(finding.severity);
  const message = String(finding.message || '').trim();
  const hint = String(finding.hint || '').trim();
  const code = String(finding.code || '').trim();
  const component = String(finding.component || '').trim();

  if (!message) return '';

  const meta = [code, component].filter(Boolean).join(' • ');

  return `
    <div style="
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: ${config.bgColor};
      border-left: 3px solid ${config.color};
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    ">
      <span style="
        font-size: 14px;
        color: ${config.color};
        line-height: 1.4;
      ">${config.icon}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${escapeHTML(message)}</div>
        ${hint ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">💡</span>
            <span>${escapeHTML(hint)}</span>
          </div>
        ` : ''}
        ${meta ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${escapeHTML(meta)}</div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderFindings(findings: DoctorFinding[] | undefined): string {
  if (!findings || findings.length === 0) {
    return '';
  }

  return `
    <div style="margin-top: 12px;">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">Findings</div>
      ${findings.map((f) => renderFinding(f)).join('')}
    </div>
  `;
}

// ============================================================================
// Action Components
// ============================================================================

function renderAction(checkId: string, action: DoctorActionState | undefined): string {
  if (!action) {
    return '';
  }

  const description = String(action.description || '').trim();
  const cta = String(action.cta || action.label || '').trim();
  const runnable = Boolean(action.runnable);
  const applicable = Boolean(action.applicable);
  const requiresConfirmation = Boolean(action.requires_confirmation);
  const confirmText = String(action.confirm_text || '').trim();
  const kind = action.kind || 'manual';

  // Determine button state
  let buttonState = 'enabled';
  let stateMessage = '';

  if (!applicable) {
    buttonState = 'not-applicable';
    stateMessage = 'Not applicable for current status';
  } else if (!runnable) {
    buttonState = 'manual';
    stateMessage = kind === 'manual' ? 'Manual action required' : 'Action not available';
  }

  const buttonDisabled = buttonState !== 'enabled';
  const buttonStyle = buttonDisabled
    ? 'background: #374151; color: #6b7280; cursor: not-allowed;'
    : 'background: #3b82f6; color: #fff; cursor: pointer;';

  return `
    <div style="
      margin-top: 12px;
      padding: 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">How to Fix</div>
      ${description ? `
        <div style="
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
        ">${escapeHTML(description)}</div>
      ` : ''}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${cta ? `
          <button
            type="button"
            class="debug-btn"
            data-doctor-action-run="${escapeHTML(checkId)}"
            ${confirmText ? `data-doctor-action-confirm="${escapeHTML(confirmText)}"` : ''}
            ${requiresConfirmation ? 'data-doctor-action-requires-confirmation="true"' : ''}
            ${buttonDisabled ? 'disabled' : ''}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${buttonStyle}
            "
          >${escapeHTML(cta)}</button>
        ` : ''}
        ${stateMessage ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${escapeHTML(stateMessage)}</span>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Metadata Components
// ============================================================================

function renderMetadataValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '<span style="color: #64748b; font-style: italic;">null</span>';
  }
  if (typeof value === 'boolean') {
    const color = value ? '#22c55e' : '#ef4444';
    return `<span style="color: ${color}; font-weight: 500;">${value}</span>`;
  }
  if (typeof value === 'number') {
    return `<span style="color: #818cf8;">${value}</span>`;
  }
  if (typeof value === 'string') {
    return `<span style="color: #fbbf24;">"${escapeHTML(value)}"</span>`;
  }
  if (typeof value === 'object') {
    return `<span style="color: #94a3b8;">${escapeHTML(JSON.stringify(value))}</span>`;
  }
  return escapeHTML(String(value));
}

function renderMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return '';
  }

  const rows = Object.entries(metadata)
    .map(([key, value]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${escapeHTML(key)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${renderMetadataValue(value)}</td>
      </tr>
    `)
    .join('');

  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        color: #64748b;
        font-size: 12px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Metadata (${Object.keys(metadata).length} keys)</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${rows}</tbody>
        </table>
      </div>
    </details>
  `;
}

// ============================================================================
// Check Card Component
// ============================================================================

function renderCheckCard(check: DoctorCheckResult): string {
  const config = getSeverityConfig(check.status);
  const label = String(check.label || check.id || '').trim();
  const summary = String(check.summary || '').trim();
  const help = String(check.help || check.description || '').trim();
  const duration = check.duration_ms !== undefined ? `${check.duration_ms}ms` : '';

  return `
    <div style="
      border: 1px solid ${config.borderColor};
      border-left: 4px solid ${config.color};
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      background: #0f172a;
      overflow: hidden;
    ">
      <!-- Card Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: ${config.bgColor};
        border-bottom: 1px solid ${config.borderColor};
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${config.color};
            color: #fff;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
          ">${config.icon}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${escapeHTML(label)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${escapeHTML(check.id || '')}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${duration ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${escapeHTML(duration)}</span>
          ` : ''}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${config.color};
            background: ${config.bgColor};
            border: 1px solid ${config.borderColor};
          ">${escapeHTML(config.label)}</span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 16px;">
        <!-- Summary -->
        ${summary ? `
          <div style="
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.5;
          ">${escapeHTML(summary)}</div>
        ` : ''}

        <!-- Help Section -->
        ${help ? `
          <details style="margin-top: 12px;">
            <summary style="
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              user-select: none;
            ">What This Means</summary>
            <div style="
              margin-top: 8px;
              padding: 12px;
              background: #1e293b;
              border-radius: 6px;
              font-size: 13px;
              color: #94a3b8;
              line-height: 1.5;
            ">${escapeHTML(help)}</div>
          </details>
        ` : ''}

        <!-- Findings -->
        ${renderFindings(check.findings)}

        <!-- Action -->
        ${renderAction(check.id, check.action)}

        <!-- Metadata -->
        ${renderMetadata(check.metadata)}
      </div>
    </div>
  `;
}

// ============================================================================
// Next Actions Component
// ============================================================================

function renderNextActions(actions: string[] | undefined): string {
  if (!actions || actions.length === 0) {
    return '';
  }

  return `
    <div style="
      margin-top: 20px;
      padding: 16px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: #f59e0b;">📋</span>
        Recommended Next Actions
      </div>
      <ol style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${actions.map((action) => `<li style="margin-bottom: 4px;">${escapeHTML(action)}</li>`).join('')}
      </ol>
    </div>
  `;
}

// ============================================================================
// Raw JSON Section
// ============================================================================

function renderRawJSON(report: DoctorReport): string {
  const jsonString = formatJSON(report);

  return `
    <details style="margin-top: 20px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #64748b;
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

// ============================================================================
// Main Render Functions
// ============================================================================

/**
 * Render the full doctor panel
 */
export function renderDoctorPanel(
  report: DoctorReport,
  styles: StyleConfig,
  options: DoctorPanelOptions = {}
): string {
  const { showRawJSON = true, problemsOnly = false } = options;

  if (!report) {
    return `<div class="${styles.emptyState}">No doctor diagnostics available</div>`;
  }

  let checks = report.checks || [];

  // Filter to problems only if requested
  if (problemsOnly) {
    checks = checks.filter((c) => c.status === 'warn' || c.status === 'error');
  }

  // Sort checks: errors first, then warnings, then info, then ok
  const severityOrder: Record<string, number> = { error: 0, warn: 1, info: 2, ok: 3 };
  checks = [...checks].sort((a, b) => {
    const aOrder = severityOrder[a.status || 'ok'] ?? 4;
    const bOrder = severityOrder[b.status || 'ok'] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.label || a.id || '').localeCompare(b.label || b.id || '');
  });

  const hasProblems = checks.some((c) => c.status === 'warn' || c.status === 'error');

  // Empty state for all healthy
  let checksContent = '';
  if (checks.length === 0) {
    if (problemsOnly && !hasProblems) {
      checksContent = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${report.summary?.checks || 0} checks passed</div>
        </div>
      `;
    } else {
      checksContent = `<div class="${styles.emptyState}">No doctor checks available</div>`;
    }
  } else {
    checksContent = checks.map((check) => renderCheckCard(check)).join('');
  }

  return `
    <div style="padding: 12px;">
      ${renderHeaderBar(report)}
      ${checksContent}
      ${renderNextActions(report.next_actions)}
      ${showRawJSON ? renderRawJSON(report) : ''}
    </div>
  `;
}

/**
 * Render a compact version for the toolbar
 */
export function renderDoctorPanelCompact(
  report: DoctorReport,
  styles: StyleConfig
): string {
  if (!report) {
    return `<div class="${styles.emptyState}">No doctor diagnostics</div>`;
  }

  const config = getSeverityConfig(report.verdict);
  const label = getVerdictLabel(report.verdict);
  const summary = report.summary || { checks: 0, ok: 0, info: 0, warn: 0, error: 0 };
  const problemCount = (summary.warn || 0) + (summary.error || 0);

  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 20px;
          color: ${config.color};
        ">${config.icon}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${config.color};
        ">${escapeHTML(label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Checks: <strong style="color: #e2e8f0;">${summary.checks || 0}</strong></span>
        <span>OK: <strong style="color: #22c55e;">${summary.ok || 0}</strong></span>
        ${problemCount > 0 ? `
          <span>Problems: <strong style="color: #ef4444;">${problemCount}</strong></span>
        ` : ''}
      </div>
    </div>
  `;
}
