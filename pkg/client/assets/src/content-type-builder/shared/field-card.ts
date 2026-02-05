/**
 * Shared Field Card
 *
 * Renders a consistent field card for both the Block Editor Panel
 * and Content Type Editor. Supports drag-and-drop, expand/collapse,
 * reorder buttons, and custom action slots.
 *
 * Both surfaces use the same standard sizing by default (compact=false).
 */

import type { FieldDefinition } from '../types';
import { getFieldTypeMetadata } from '../field-type-picker';
import { badge } from '../../shared/badge';
import { dragHandleIcon } from './field-input-classes';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldCardConfig {
  /** The field definition to render */
  field: FieldDefinition;
  /** Card is expanded (accordion body visible) */
  isExpanded?: boolean;
  /** Card is selected (highlighted border) */
  isSelected?: boolean;
  /** Card is a drop target for drag-and-drop */
  isDropTarget?: boolean;
  /** Card has validation errors */
  hasErrors?: boolean;
  /** Error messages shown below the metadata line */
  errorMessages?: string[];
  /** Show up/down reorder buttons */
  showReorderButtons?: boolean;
  /** First in group — disables "move up" */
  isFirst?: boolean;
  /** Last in group — disables "move down" */
  isLast?: boolean;
  /** Compact mode: xs sizes, tighter padding (block editor) */
  compact?: boolean;
  /** Slot: render expanded accordion content. If provided, expand toggle is shown */
  renderExpandedContent?: () => string;
  /** Slot: pre-rendered HTML for surface-specific actions (menus, buttons) */
  actionsHtml?: string;
  /** Optional constraint summary badges (e.g. "min: 5", "pattern") */
  constraintBadges?: string[];
  /** Section name for data-field-section attribute */
  sectionName?: string;
  /** Index for data-field-index attribute */
  index?: number;
}

// ---------------------------------------------------------------------------
// Escape Helper
// ---------------------------------------------------------------------------

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// SVG Icons (inlined to avoid external dependencies)
// ---------------------------------------------------------------------------

const CHEVRON_UP = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>';
const CHEVRON_DOWN = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>';
const EXPAND_ICON = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>';
const COLLAPSE_ICON = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>';
const ERROR_ICON = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

/**
 * Render a shared field card.
 *
 * Both surfaces use the standard sizing by default.
 * Set `compact: true` for a denser layout (smaller padding, xs text).
 */
export function renderFieldCard(config: FieldCardConfig): string {
  const {
    field,
    isExpanded = false,
    isSelected = false,
    isDropTarget = false,
    hasErrors = false,
    errorMessages = [],
    showReorderButtons = false,
    isFirst = false,
    isLast = false,
    compact = false,
    renderExpandedContent,
    actionsHtml = '',
    constraintBadges = [],
    sectionName,
    index,
  } = config;

  const meta = getFieldTypeMetadata(field.type);
  const expandable = typeof renderExpandedContent === 'function';

  // --- Wrapper state classes ---
  let wrapperState: string;
  if (hasErrors) {
    wrapperState = 'border-red-400 bg-red-50 dark:bg-red-900/10';
  } else if (isExpanded) {
    wrapperState = 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/20';
  } else if (isSelected) {
    wrapperState = 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
  } else {
    wrapperState = 'border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-gray-600';
  }

  const dropClass = isDropTarget ? 'border-t-2 border-t-blue-400' : '';

  // --- Size variants ---
  const gapClass = compact ? 'gap-1.5 px-2 py-2' : 'gap-3 p-3';
  const iconSize = compact ? 'w-7 h-7 rounded-md' : 'w-8 h-8 rounded-lg';
  const labelSize = compact ? 'text-[13px]' : 'text-sm';
  const metaSize = compact ? 'text-[10px]' : 'text-xs';
  const handleSize = compact ? 'xs' as const : 'sm' as const;

  // --- Field type icon ---
  const iconBg = hasErrors
    ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400';
  const iconContent = hasErrors ? ERROR_ICON : (meta?.icon ?? '?');

  // --- Badges (required / readonly / hidden) ---
  const badges: string[] = [];
  if (field.required) {
    badges.push(badge('req', 'status', 'required', { size: 'sm', uppercase: true, extraClass: 'flex-shrink-0' }));
  }
  if (field.readonly) {
    badges.push(badge('ro', 'status', 'readonly', { size: 'sm', uppercase: true, extraClass: 'flex-shrink-0' }));
  }
  if (field.hidden) {
    badges.push(badge('hid', 'status', 'hidden', { size: 'sm', uppercase: true, extraClass: 'flex-shrink-0' }));
  }
  const badgesHtml = badges.join('\n          ');

  // --- Data attributes ---
  let dataAttrs = `data-field-card="${esc(field.id)}"`;
  if (sectionName != null) dataAttrs += ` data-field-section="${esc(sectionName)}"`;
  if (index != null) dataAttrs += ` data-field-index="${index}"`;

  // --- Metadata line ---
  let metaLine: string;
  if (compact) {
    metaLine = `${esc(field.name)} &middot; ${esc(field.type)}`;
  } else {
    const typeLabel = meta?.label ?? field.type;
    const parts = [
      `<span class="font-mono">${esc(field.name)}</span>`,
      `<span>&middot;</span>`,
      `<span>${esc(typeLabel)}</span>`,
    ];
    if (field.section) parts.push(`<span>&middot; ${esc(field.section)}</span>`);
    if (field.gridSpan) parts.push(`<span>&middot; ${field.gridSpan} cols</span>`);
    metaLine = parts.join(' ');
  }

  // --- Constraint badges (optional, typically content-type editor) ---
  let constraintHtml = '';
  if (constraintBadges.length > 0) {
    constraintHtml = `
            <div class="flex items-center gap-1 mt-1">
              ${constraintBadges.map(c => `<span class="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">${esc(c)}</span>`).join('')}
            </div>`;
  }

  // --- Error messages ---
  let errorHtml = '';
  if (hasErrors && errorMessages.length > 0) {
    errorHtml = `
            <div class="mt-1 text-xs text-red-600 dark:text-red-400">
              ${errorMessages.map(msg => esc(msg)).join(', ')}
            </div>`;
  }

  // --- Reorder buttons ---
  let reorderHtml = '';
  if (showReorderButtons) {
    const upDisabled = isFirst;
    const downDisabled = isLast;
    const upClass = upDisabled
      ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';
    const downClass = downDisabled
      ? 'text-gray-200 dark:text-gray-700 cursor-not-allowed'
      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800';

    reorderHtml = `
          <span class="flex-shrink-0 inline-flex flex-col border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            <button type="button" data-field-move-up="${esc(field.id)}"
                    class="px-0.5 py-px ${upClass} transition-colors"
                    title="Move up" ${upDisabled ? 'disabled' : ''}>
              ${CHEVRON_UP}
            </button>
            <span class="block h-px bg-gray-200 dark:bg-gray-700"></span>
            <button type="button" data-field-move-down="${esc(field.id)}"
                    class="px-0.5 py-px ${downClass} transition-colors"
                    title="Move down" ${downDisabled ? 'disabled' : ''}>
              ${CHEVRON_DOWN}
            </button>
          </span>`;
  }

  // --- Expand toggle ---
  let expandToggle = '';
  if (expandable) {
    expandToggle = `
          <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer transition-colors">
            ${isExpanded ? COLLAPSE_ICON : EXPAND_ICON}
          </span>`;
  }

  return `
      <div ${dataAttrs}
           draggable="true"
           class="rounded-lg border ${dropClass} ${wrapperState} transition-colors">
        <div class="flex items-center ${gapClass} select-none" ${expandable ? `data-field-toggle="${esc(field.id)}"` : ''}>
          <span class="flex-shrink-0 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 cursor-grab active:cursor-grabbing" data-field-grip="${esc(field.id)}">
            ${dragHandleIcon(handleSize)}
          </span>
          <span class="flex-shrink-0 ${iconSize} flex items-center justify-center ${iconBg} text-[11px]">
            ${iconContent}
          </span>
          <span class="flex-1 min-w-0 ${expandable ? 'cursor-pointer' : ''}">
            <span class="block ${labelSize} font-medium text-gray-800 dark:text-gray-100 truncate">${esc(field.label || field.name)}</span>
            <span class="block ${metaSize} text-gray-400 dark:text-gray-500 ${compact ? 'font-mono' : ''} truncate">${metaLine}</span>${constraintHtml}${errorHtml}
          </span>
          ${badgesHtml}
          ${reorderHtml}
          ${actionsHtml}
          ${expandToggle}
        </div>
        ${isExpanded && expandable ? renderExpandedContent!() : ''}
      </div>`;
}

// ---------------------------------------------------------------------------
// Shared Kebab Actions Menu
// ---------------------------------------------------------------------------

const KEBAB_ICON = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path></svg>';

/**
 * Render a kebab (⋮) action button for a field card.
 * Both surfaces use this to trigger contextual menus.
 */
export function renderFieldKebab(fieldId: string): string {
  return `<button type="button" data-field-actions="${esc(fieldId)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              ${KEBAB_ICON}
            </button>`;
}

// ---------------------------------------------------------------------------
// Shared Drop Zone
// ---------------------------------------------------------------------------

export interface DropZoneConfig {
  /** Whether the zone is currently highlighted (drag hover) */
  highlight?: boolean;
  /** Helper text shown inside the zone */
  text?: string;
}

/**
 * Render a shared field drop zone used at the bottom of field lists.
 * Both the Block Editor and Content Type Editor use this.
 */
export function renderDropZone(config: DropZoneConfig = {}): string {
  const {
    highlight = false,
    text = 'Drop a field here or click a field type in the palette',
  } = config;
  const highlightClass = highlight
    ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20'
    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600';
  return `
      <div data-field-drop-zone
           class="mx-3 my-2 py-6 border-2 border-dashed rounded-lg text-center transition-colors ${highlightClass}">
        <p class="text-xs text-gray-400 dark:text-gray-500">${esc(text)}</p>
      </div>`;
}
