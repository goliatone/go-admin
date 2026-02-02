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
export type BadgeCategory = 'status' | 'role' | 'generic';
export type BadgeSize = 'sm';
export interface BadgeOptions {
    size?: BadgeSize;
    extraClass?: string;
    attrs?: Record<string, string>;
    uppercase?: boolean;
}
/**
 * Returns the CSS class string for a badge.
 *
 *   badgeClasses('status', 'active')         → 'status-badge status-active'
 *   badgeClasses('status', 'required', 'sm') → 'status-badge status-badge--sm status-required'
 *   badgeClasses('role', 'admin')            → 'role-badge role-admin'
 *   badgeClasses('generic', 'blue')          → 'badge badge-blue'
 */
export declare function badgeClasses(category: BadgeCategory, variant: string, size?: BadgeSize): string;
/**
 * Returns a complete badge `<span>` HTML string.
 *
 *   badge('Active', 'status', 'active')
 *   → '<span class="status-badge status-active">Active</span>'
 *
 *   badge('REQ', 'status', 'required', { size: 'sm', uppercase: true })
 *   → '<span class="status-badge status-badge--sm status-required badge--uppercase">REQ</span>'
 */
export declare function badge(text: string, category: BadgeCategory, variant: string, opts?: BadgeOptions): string;
/**
 * Returns an HTML string for a boolean chip with icon.
 *
 *   booleanChip(true)               → green chip with check icon + "Yes"
 *   booleanChip(false, {falseLabel: 'No'}) → gray chip with X icon + "No"
 */
export declare function booleanChip(value: boolean, opts?: {
    trueLabel?: string;
    falseLabel?: string;
}): string;
//# sourceMappingURL=badge.d.ts.map