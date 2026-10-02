// Rich value presentation shared by tables, key/value lists, cards and lists
// (ADR-0004): server-computed tones, steps, progress, relative times, short
// copyable identifiers and declared action slots. Every value is escaped; only
// clamped numbers reach inline styles. Domain meaning stays on the server.

import { blockPrefix, type StyleConfig } from '../style-config.js';
import type { PanelUIActionRef, ServerPanelDefinition, ServerPanelUIAction } from '../types.js';
import { escapeAttribute, escapeHTML, formatNumber, textValue as text } from '../format.js';
import { consoleActionState } from '../capabilities.js';

const TONES = new Set(['success', 'info', 'warning', 'error', 'neutral', 'planned']);
const STEP_STATES = new Set(['done', 'current', 'pending', 'warning', 'failed']);
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Allowlisted tone or ''. */
export function normalizeTone(value: unknown): string {
  const tone = text(value).trim().toLowerCase();
  return TONES.has(tone) ? tone : '';
}

/** Most severe tone among candidates (error > warning > info > success > planned > neutral). */
export function severestTone(tones: string[]): string {
  const order = ['error', 'warning', 'info', 'success', 'planned', 'neutral'];
  for (const tone of order) {
    if (tones.includes(tone)) return tone;
  }
  return '';
}

/** Tone chip. The label is escaped; the tone class is allowlisted. */
export function renderToneBadge(label: string, tone: unknown, styles: StyleConfig): string {
  const normalized = normalizeTone(tone);
  const toneClass = normalized ? ` ${blockPrefix(styles)}-badge--${normalized}` : '';
  return `<span class="${styles.badge}${toneClass}">${escapeHTML(label)}</span>`;
}

/** Shorten long identifiers for display; the full value stays in title/copy. */
export function truncateValue(raw: string, limit: unknown): string {
  const max = typeof limit === 'number' && Number.isFinite(limit) ? Math.floor(limit) : 0;
  if (max < 4 || raw.length <= max) return raw;
  return `${raw.slice(0, max)}…`;
}

/** Ordered generic steps (`format: "steps"`). */
export function renderSteps(value: unknown, styles: StyleConfig): string {
  if (!Array.isArray(value) || value.length === 0) return '';
  const prefix = blockPrefix(styles);
  const steps = value
    .filter((step): step is Record<string, unknown> => Boolean(step) && typeof step === 'object')
    .map((step) => {
      const label = text(step.label).trim();
      if (!label) return '';
      const rawState = text(step.state).trim().toLowerCase();
      const state = STEP_STATES.has(rawState) ? rawState : 'pending';
      const tone = normalizeTone(step.tone);
      const toneAttr = tone ? ` data-tone="${tone}"` : '';
      const current = state === 'current' ? ' aria-current="step"' : '';
      return `<li class="${prefix}-step ${prefix}-step--${state}"${toneAttr}${current}><span class="${prefix}-step__mark" aria-hidden="true"></span><span class="${prefix}-step__label">${escapeHTML(label)}</span></li>`;
    })
    .filter(Boolean);
  return steps.length === 0 ? '' : `<ol class="${prefix}-steps">${steps.join('')}</ol>`;
}

/** Bounded progress (`format: "progress"`). Only clamped numbers reach CSS. */
export function renderProgress(value: unknown, styles: StyleConfig): string {
  if (!value || typeof value !== 'object') return '';
  const progress = value as Record<string, unknown>;
  const completed = Number(progress.completed);
  const total = Number(progress.total);
  const label = text(progress.label).trim();
  const prefix = blockPrefix(styles);
  if (!Number.isFinite(completed) || completed < 0) {
    return label ? `<span class="${prefix}-muted">${escapeHTML(label)}</span>` : '';
  }
  const known = Number.isFinite(total) && total > 0;
  const percent = known ? Math.max(0, Math.min(100, Math.round((completed / total) * 100))) : 0;
  const caption = label || (known ? `${formatNumber(completed)} of ${formatNumber(total)}` : formatNumber(completed));
  const aria = known
    ? `role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${Math.min(completed, total)}"`
    : 'role="progressbar" aria-valuemin="0"';
  return `<span class="${prefix}-progress"><span class="${prefix}-progress__bar" ${aria} aria-label="${escapeAttribute(caption)}"><span class="${prefix}-progress__fill" style="width:${percent}%"></span></span><span class="${prefix}-progress__label">${escapeHTML(caption)}</span></span>`;
}

/** Relative time ("now", "5 min ago", "3 d ago") with the absolute time in a tooltip. */
export function renderRelativeTime(value: unknown, styles: StyleConfig, now = Date.now()): string {
  if (value === null || value === undefined || value === '') return '';
  const date = typeof value === 'number' ? new Date(value) : new Date(text(value));
  if (Number.isNaN(date.getTime())) return escapeHTML(text(value));
  const delta = now - date.getTime();
  let label: string;
  if (Math.abs(delta) < MINUTE) label = 'now';
  else if (delta < 0) label = date.toLocaleString();
  else if (delta < HOUR) label = `${Math.round(delta / MINUTE)} min ago`;
  else if (delta < DAY) label = `${Math.round(delta / HOUR)} h ago`;
  else if (delta < 30 * DAY) label = `${Math.round(delta / DAY)} d ago`;
  else label = date.toLocaleDateString();
  return `<time class="${blockPrefix(styles)}-timestamp" datetime="${escapeAttribute(date.toISOString())}" title="${escapeAttribute(date.toLocaleString())}">${escapeHTML(label)}</time>`;
}

type DeclaredActions = Map<string, ServerPanelUIAction>;

function declaredActions(serverDef: ServerPanelDefinition | undefined): DeclaredActions {
  const actions: DeclaredActions = new Map();
  (serverDef?.ui?.actions || []).forEach((action) => {
    const id = text(action?.id).trim().toLowerCase();
    if (id && !action.hidden) actions.set(id, action);
  });
  return actions;
}

/** Normalize raw record references, keeping only this panel's declared actions. */
export function resolveActionRefs(value: unknown, serverDef: ServerPanelDefinition | undefined): Array<{ action: ServerPanelUIAction; actionID: string; emphasis: string }> {
  if (!Array.isArray(value) || !serverDef) return [];
  const panelID = text(serverDef.id).trim().toLowerCase();
  const actions = declaredActions(serverDef);
  const seen = new Set<string>();
  const out: Array<{ action: ServerPanelUIAction; actionID: string; emphasis: string }> = [];
  value.forEach((ref: PanelUIActionRef) => {
    if (!ref || typeof ref !== 'object') return;
    const refPanel = text(ref.panel_id).trim().toLowerCase();
    const actionID = text(ref.action_id).trim().toLowerCase();
    // Foreign-panel and undeclared references never render, so they can never run.
    if (!panelID || refPanel !== panelID || !actionID || seen.has(actionID)) return;
    const action = actions.get(actionID);
    if (!action) return;
    seen.add(actionID);
    const emphasis = text(ref.emphasis).trim().toLowerCase();
    out.push({ action, actionID, emphasis: emphasis === 'primary' || emphasis === 'menu' ? emphasis : '' });
  });
  return out;
}

function actionButton(panelID: string, actionID: string, action: ServerPanelUIAction, emphasis: string, styles: StyleConfig, inMenu = false): string {
  const prefix = blockPrefix(styles);
  const state = consoleActionState(action);
  const label = text(action.label).trim() || actionID;
  const variant = inMenu
    ? ` ${prefix}-menu__item`
    : ` ${prefix}-btn--sm${emphasis === 'primary' && state.executable ? ` ${prefix}-btn--primary` : ''}`;
  const base = `type="button" class="${inMenu ? '' : `${prefix}-btn`}${variant}" data-console-action-ref data-panel-id="${escapeAttribute(panelID)}" data-action-id="${escapeAttribute(actionID)}"`;
  if (!state.executable) {
    // Focusable disabled control: the reason stays reachable by keyboard and
    // screen readers, and the runtime refuses activation.
    return `<button ${base} aria-disabled="true" data-action-unavailable="${escapeAttribute(state.availability)}" title="${escapeAttribute(state.reason)}"><span>${escapeHTML(label)}</span><span class="${prefix}-sr-only"> — ${escapeHTML(state.reason)}</span></button>`;
  }
  return `<button ${base}>${escapeHTML(label)}</button>`;
}

/**
 * Declared action slot for a row, card or section. References resolve only
 * against the same panel's request-scoped declarations; menu-emphasis actions
 * render inside a native disclosure.
 */
export function renderActionSlot(value: unknown, serverDef: ServerPanelDefinition | undefined, styles: StyleConfig): string {
  const refs = resolveActionRefs(value, serverDef);
  if (refs.length === 0) return '';
  const prefix = blockPrefix(styles);
  const panelID = text(serverDef?.id).trim().toLowerCase();
  const inline = refs.filter((ref) => ref.emphasis !== 'menu');
  const menu = refs.filter((ref) => ref.emphasis === 'menu');
  const buttons = inline.map((ref) => actionButton(panelID, ref.actionID, ref.action, ref.emphasis, styles)).join('');
  const more = menu.length === 0
    ? ''
    : `<details class="${prefix}-menu"><summary class="${prefix}-btn ${prefix}-btn--sm ${prefix}-btn--icon" aria-label="More actions" title="More actions"><span aria-hidden="true">⋯</span></summary><div class="${prefix}-menu__list" role="group" aria-label="More actions">${menu.map((ref) => actionButton(panelID, ref.actionID, ref.action, '', styles, true)).join('')}</div></details>`;
  return `<div class="${prefix}-action-slot">${buttons}${more}</div>`;
}
