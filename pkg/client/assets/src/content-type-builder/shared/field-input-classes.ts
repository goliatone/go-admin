/**
 * Shared Field Input Classes
 *
 * Centralizes CSS class strings for form inputs across the Content Type Builder.
 * All helpers include full dark mode support.
 *
 * Size variants:
 *   'sm' (default) — standard form inputs (px-3 py-2)
 *   'xs'           — compact inputs for inline editors (px-2 py-1)
 */

// ---------------------------------------------------------------------------
// Input / Select / Textarea
// ---------------------------------------------------------------------------

const BASE_INPUT =
  'w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
  'dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500';

const SIZE_SM = 'px-3 py-2 text-sm border-gray-300';
const SIZE_XS = 'px-2 py-1 text-[12px] border-gray-200';

export function inputClasses(size: 'sm' | 'xs' = 'sm'): string {
  return size === 'xs' ? `${BASE_INPUT} ${SIZE_XS}` : `${BASE_INPUT} ${SIZE_SM}`;
}

export function selectClasses(size: 'sm' | 'xs' = 'sm'): string {
  // Same base as input but without placeholder classes
  const base =
    'w-full border rounded-lg bg-white text-gray-900 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ' +
    'dark:border-gray-600 dark:bg-slate-800 dark:text-white';
  return size === 'xs' ? `${base} ${SIZE_XS}` : `${base} ${SIZE_SM}`;
}

type TextareaResize = 'none' | 'x' | 'y' | 'both';

interface TextareaClassOptions {
  size?: 'sm' | 'xs';
  /** Resize behavior (default: vertical) */
  resize?: TextareaResize;
}

export function textareaClasses(options: TextareaClassOptions = {}): string {
  const size = options.size ?? 'sm';
  const resize = options.resize ?? 'y';
  const resizeClass =
    resize === 'none' ? 'resize-none'
    : resize === 'x' ? 'resize-x'
    : resize === 'both' ? 'resize'
    : 'resize-y';
  return `${inputClasses(size)} ${resizeClass}`;
}

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

export function checkboxClasses(): string {
  return 'w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500';
}

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

export function labelClasses(size: 'sm' | 'xs' = 'sm'): string {
  return size === 'xs'
    ? 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'
    : 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
}

// ---------------------------------------------------------------------------
// Drag Handle Icon (6-dot grip pattern — canonical for all surfaces)
// ---------------------------------------------------------------------------

export function dragHandleIcon(size: 'sm' | 'xs' = 'sm'): string {
  const sizeClass = size === 'xs' ? 'w-3 h-3' : 'w-4 h-4';
  return `<svg class="${sizeClass}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
