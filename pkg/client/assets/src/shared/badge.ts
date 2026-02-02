/**
 * Shared Badge Utility
 *
 * Centralizes badge/pill HTML generation across the admin UI.
 * All visual styling is defined in input.css via composable CSS classes.
 *
 * Usage patterns:
 *   badgeClasses('status', 'draft')         → "status-badge status-draft"
 *   badge('Draft', 'status', 'draft')       → '<span class="status-badge status-draft">Draft</span>'
 *   booleanChip(true)                       → '<span class="badge badge-boolean-true">✓ Yes</span>'
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeCategory = 'status' | 'role' | 'generic';
export type BadgeSize = 'sm';

export interface BadgeOptions {
  size?: BadgeSize;
  extraClass?: string;
  attrs?: Record<string, string>;
  uppercase?: boolean;
}

// ---------------------------------------------------------------------------
// Class Name Resolver
// ---------------------------------------------------------------------------

/**
 * Returns the CSS class string for a badge.
 *
 *   badgeClasses('status', 'active')         → 'status-badge status-active'
 *   badgeClasses('status', 'required', 'sm') → 'status-badge status-badge--sm status-required'
 *   badgeClasses('role', 'admin')            → 'role-badge role-admin'
 *   badgeClasses('generic', 'blue')          → 'badge badge-blue'
 */
export function badgeClasses(
  category: BadgeCategory,
  variant: string,
  size?: BadgeSize,
): string {
  const v = variant.toLowerCase();

  const base = category === 'status' ? 'status-badge'
    : category === 'role' ? 'role-badge'
    : 'badge';

  const prefix = category === 'status' ? 'status'
    : category === 'role' ? 'role'
    : 'badge';

  const parts: string[] = [base];
  if (size === 'sm') parts.push(`${base}--sm`);
  parts.push(`${prefix}-${v}`);
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// HTML Builder
// ---------------------------------------------------------------------------

/**
 * Returns a complete badge `<span>` HTML string.
 *
 *   badge('Active', 'status', 'active')
 *   → '<span class="status-badge status-active">Active</span>'
 *
 *   badge('REQ', 'status', 'required', { size: 'sm', uppercase: true })
 *   → '<span class="status-badge status-badge--sm status-required badge--uppercase">REQ</span>'
 */
export function badge(
  text: string,
  category: BadgeCategory,
  variant: string,
  opts?: BadgeOptions,
): string {
  const cls = badgeClasses(category, variant, opts?.size);
  const parts: string[] = [cls];
  if (opts?.uppercase) parts.push('badge--uppercase');
  if (opts?.extraClass) parts.push(opts.extraClass);

  let attrStr = '';
  if (opts?.attrs) {
    attrStr = Object.entries(opts.attrs)
      .map(([k, v]) => v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`)
      .join('');
  }

  return `<span class="${parts.join(' ')}"${attrStr}>${escapeHtml(text)}</span>`;
}

// ---------------------------------------------------------------------------
// Boolean Chip
// ---------------------------------------------------------------------------

const CHECK_ICON = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd"/></svg>';
const X_ICON = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd"/></svg>';

/**
 * Returns an HTML string for a boolean chip with icon.
 *
 *   booleanChip(true)               → green chip with check icon + "Yes"
 *   booleanChip(false, {falseLabel: 'No'}) → gray chip with X icon + "No"
 */
export function booleanChip(
  value: boolean,
  opts?: { trueLabel?: string; falseLabel?: string },
): string {
  const label = value ? (opts?.trueLabel ?? 'Yes') : (opts?.falseLabel ?? 'No');
  const variant = value ? 'boolean-true' : 'boolean-false';
  const icon = value ? CHECK_ICON : X_ICON;
  return `<span class="badge badge-${variant}">${icon}${escapeHtml(label)}</span>`;
}

// ---------------------------------------------------------------------------
// Escape Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}
