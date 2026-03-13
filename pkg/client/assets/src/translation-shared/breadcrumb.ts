/**
 * Translation Breadcrumb Component
 *
 * Provides navigation context across translation surfaces:
 * - Dashboard: Translations
 * - Queue: Translations / Queue
 * - Editor: Translations / Queue / Assignment #abc123
 * - Family Detail: Translations / Families / {family_title}
 * - Matrix: Translations / Matrix
 * - Exchange: Translations / Exchange
 *
 * Accessibility features:
 * - Uses <nav> with aria-label="Breadcrumb"
 * - Current page marked with aria-current="page"
 * - Semantic <ol> list structure
 */

import { TEXT_MUTED, TEXT_TITLE } from './style-constants.js';

// =============================================================================
// Types
// =============================================================================

export interface BreadcrumbItem {
  /** Display label for the breadcrumb item */
  label: string;
  /** URL to navigate to (omit for current page) */
  href?: string;
  /** Mark as current page (sets aria-current="page") */
  current?: boolean;
  /** Optional icon class (e.g., 'iconoir-globe') */
  icon?: string;
}

export interface BreadcrumbOptions {
  /** CSS class to add to the nav element */
  className?: string;
  /** Separator character or HTML between items */
  separator?: string;
  /** Home icon to prepend (defaults to none) */
  homeIcon?: string;
  /** Show home link before items */
  showHome?: boolean;
  /** Home link URL */
  homeHref?: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Escape HTML entities in a string
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Escape attribute values
 */
function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// =============================================================================
// Default Separator SVG
// =============================================================================

const DEFAULT_SEPARATOR = `
<svg class="w-4 h-4 ${TEXT_MUTED} flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
</svg>
`.trim();

// =============================================================================
// Render Functions
// =============================================================================

/**
 * Render a single breadcrumb item
 */
function renderBreadcrumbItem(item: BreadcrumbItem, isLast: boolean): string {
  const iconHtml = item.icon
    ? `<i class="${escapeAttr(item.icon)} text-sm opacity-70"></i>`
    : '';

  if (item.current || isLast || !item.href) {
    // Current/last item - no link
    return `
      <li class="flex items-center">
        <span
          class="flex items-center gap-1.5 text-sm font-medium ${TEXT_TITLE}"
          ${item.current ? 'aria-current="page"' : ''}
        >
          ${iconHtml}
          ${escapeHtml(item.label)}
        </span>
      </li>
    `.trim();
  }

  // Linked item
  return `
    <li class="flex items-center">
      <a
        href="${escapeAttr(item.href)}"
        class="flex items-center gap-1.5 text-sm font-medium ${TEXT_MUTED} hover:text-gray-700 transition-colors"
      >
        ${iconHtml}
        ${escapeHtml(item.label)}
      </a>
    </li>
  `.trim();
}

/**
 * Render a complete breadcrumb navigation
 *
 * @param items - Array of breadcrumb items
 * @param options - Rendering options
 * @returns HTML string for the breadcrumb nav
 *
 * @example
 * ```typescript
 * const html = renderBreadcrumb([
 *   { label: 'Translations', href: '/admin/translations' },
 *   { label: 'Queue', href: '/admin/translations/queue' },
 *   { label: 'Assignment #abc123', current: true }
 * ]);
 * ```
 */
export function renderBreadcrumb(
  items: BreadcrumbItem[],
  options: BreadcrumbOptions = {}
): string {
  const {
    className = '',
    separator = DEFAULT_SEPARATOR,
    showHome = false,
    homeHref = '/admin',
    homeIcon = 'iconoir-home',
  } = options;

  if (items.length === 0) {
    return '';
  }

  // Build home item if needed
  const homeItem: BreadcrumbItem | null = showHome
    ? { label: 'Home', href: homeHref, icon: homeIcon }
    : null;

  // Combine items
  const allItems = homeItem ? [homeItem, ...items] : items;

  // Render items with separators
  const itemsHtml = allItems
    .map((item, index) => {
      const isLast = index === allItems.length - 1;
      const itemHtml = renderBreadcrumbItem(item, isLast);

      // Add separator before non-first items
      if (index > 0) {
        return `
          <li class="flex items-center" aria-hidden="true">
            ${separator}
          </li>
          ${itemHtml}
        `.trim();
      }

      return itemHtml;
    })
    .join('\n');

  return `
    <nav aria-label="Breadcrumb" class="translation-breadcrumb ${escapeAttr(className)}">
      <ol class="flex items-center gap-2 flex-wrap">
        ${itemsHtml}
      </ol>
    </nav>
  `.trim();
}

// =============================================================================
// Preset Breadcrumb Builders
// =============================================================================

/**
 * Build breadcrumb for the translation dashboard
 */
export function buildDashboardBreadcrumb(basePath: string = '/admin'): BreadcrumbItem[] {
  return [{ label: 'Translations', current: true }];
}

/**
 * Build breadcrumb for the translation queue
 */
export function buildQueueBreadcrumb(basePath: string = '/admin'): BreadcrumbItem[] {
  return [
    { label: 'Translations', href: `${basePath}/translations` },
    { label: 'Queue', current: true },
  ];
}

/**
 * Build breadcrumb for the translation editor
 */
export function buildEditorBreadcrumb(
  assignmentId: string,
  basePath: string = '/admin'
): BreadcrumbItem[] {
  // Truncate long IDs for display
  const displayId =
    assignmentId.length > 12 ? `${assignmentId.slice(0, 12)}...` : assignmentId;

  return [
    { label: 'Translations', href: `${basePath}/translations` },
    { label: 'Queue', href: `${basePath}/translations/queue` },
    { label: `Assignment ${displayId}`, current: true },
  ];
}

/**
 * Build breadcrumb for the family detail page
 */
export function buildFamilyBreadcrumb(
  familyTitle: string,
  basePath: string = '/admin'
): BreadcrumbItem[] {
  // Truncate long titles
  const displayTitle =
    familyTitle.length > 30 ? `${familyTitle.slice(0, 30)}...` : familyTitle;

  return [
    { label: 'Translations', href: `${basePath}/translations` },
    { label: 'Families', href: `${basePath}/translations/families` },
    { label: displayTitle, current: true },
  ];
}

/**
 * Build breadcrumb for the matrix view
 */
export function buildMatrixBreadcrumb(basePath: string = '/admin'): BreadcrumbItem[] {
  return [
    { label: 'Translations', href: `${basePath}/translations` },
    { label: 'Matrix', current: true },
  ];
}

/**
 * Build breadcrumb for the exchange page
 */
export function buildExchangeBreadcrumb(basePath: string = '/admin'): BreadcrumbItem[] {
  return [
    { label: 'Translations', href: `${basePath}/translations` },
    { label: 'Exchange', current: true },
  ];
}

// =============================================================================
// Mount Helper
// =============================================================================

/**
 * Mount breadcrumb into a container element
 *
 * @param container - Container element or selector
 * @param items - Breadcrumb items to render
 * @param options - Rendering options
 *
 * @example
 * ```typescript
 * mountBreadcrumb('#breadcrumb-container', [
 *   { label: 'Translations', href: '/admin/translations' },
 *   { label: 'Queue', current: true }
 * ]);
 * ```
 */
export function mountBreadcrumb(
  container: HTMLElement | string,
  items: BreadcrumbItem[],
  options: BreadcrumbOptions = {}
): void {
  const element =
    typeof container === 'string'
      ? document.querySelector<HTMLElement>(container)
      : container;

  if (!element) {
    console.warn('[Translation Breadcrumb] Container not found:', container);
    return;
  }

  element.innerHTML = renderBreadcrumb(items, options);
}
