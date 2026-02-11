/**
 * Cell Renderers for DataGrid
 * Provides extensible cell rendering capabilities
 */

import { badge, booleanChip as sharedBooleanChip } from '../shared/badge.js';
import { renderIcon } from '../shared/icon-renderer.js';
import {
  renderLocaleBadge,
  renderTranslationStatusCell,
  createTranslationStatusRenderer,
  createLocaleBadgeRenderer
} from './translation-context.js';

const EMPTY_CELL_HTML = '<span class="text-gray-400">-</span>';
const DEFAULT_OBJECT_LABEL_KEYS = [
  'name',
  'label',
  'title',
  'slug',
  'id',
  'code',
  'key',
  'value',
  'type',
  'blockType',
  'block_type',
];

export interface CellRendererContext {
  options?: Record<string, any>;
}

export type CellRenderer = (value: any, record: any, column: string, context?: CellRendererContext) => string;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function compactJSON(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeDisplayKeys(options: Record<string, any>): string[] {
  const keys: string[] = [];
  const pushKey = (candidate: any) => {
    if (typeof candidate !== 'string') return;
    const key = candidate.trim();
    if (!key || keys.includes(key)) return;
    keys.push(key);
  };
  pushKey(options.display_key);
  pushKey(options.displayKey);
  const listCandidate = options.display_keys ?? options.displayKeys;
  if (Array.isArray(listCandidate)) {
    listCandidate.forEach(pushKey);
  }
  return keys;
}

function objectValueByPath(value: Record<string, any>, key: string): any {
  if (!key) return undefined;
  if (Object.prototype.hasOwnProperty.call(value, key)) {
    return value[key];
  }
  if (!key.includes('.')) {
    return undefined;
  }
  const segments = key.split('.');
  let current: any = value;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function scalarSummary(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  switch (typeof value) {
    case 'string':
      return value.trim();
    case 'number':
    case 'bigint':
      return String(value);
    case 'boolean':
      return value ? 'true' : 'false';
    default:
      return '';
  }
}

function summarizeObjectValue(value: any, options: Record<string, any>): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return summarizeArrayValue(value, options);
  }
  if (typeof value !== 'object') {
    return String(value);
  }

  const displayKeys = normalizeDisplayKeys(options);
  const keys = [...displayKeys, ...DEFAULT_OBJECT_LABEL_KEYS];
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const candidate = objectValueByPath(value as Record<string, any>, key);
    const summary = scalarSummary(candidate);
    if (summary) {
      return summary;
    }
  }

  return compactJSON(value);
}

function summarizeArrayValue(value: any[], options: Record<string, any>): string {
  if (!Array.isArray(value) || value.length === 0) {
    return '';
  }
  const normalized = value
    .map(item => summarizeObjectValue(item, options).trim())
    .filter(Boolean);
  if (normalized.length === 0) {
    return '';
  }
  const rawLimit = Number(options.preview_limit ?? options.previewLimit ?? 3);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 3;
  const preview = normalized.slice(0, limit);
  if (normalized.length <= limit) {
    return preview.join(', ');
  }
  return `${preview.join(', ')} +${normalized.length - limit} more`;
}

// ---------------------------------------------------------------------------
// blocks_chips helper functions
// ---------------------------------------------------------------------------

/**
 * Normalizes a number option from renderer_options, checking both snake_case and camelCase keys.
 */
function normalizeNumberOption(
  options: Record<string, any>,
  snakeKey: string,
  camelKey: string,
  defaultValue: number
): number {
  const raw = options[snakeKey] ?? options[camelKey] ?? defaultValue;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : defaultValue;
}

/**
 * Normalizes a boolean option from renderer_options, checking both snake_case and camelCase keys.
 */
function normalizeBooleanOption(
  options: Record<string, any>,
  snakeKey: string,
  camelKey: string,
  defaultValue: boolean
): boolean {
  const raw = options[snakeKey] ?? options[camelKey];
  if (raw === undefined || raw === null) {
    return defaultValue;
  }
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    return raw.toLowerCase() === 'true' || raw === '1';
  }
  return Boolean(raw);
}

/**
 * Normalizes a string option from renderer_options, checking both snake_case and camelCase keys.
 */
function normalizeStringOption(
  options: Record<string, any>,
  snakeKey: string,
  camelKey: string,
  defaultValue: string
): string {
  const raw = options[snakeKey] ?? options[camelKey];
  if (raw === undefined || raw === null) {
    return defaultValue;
  }
  const str = String(raw).trim();
  return str || defaultValue;
}

/**
 * Block label resolution order: _type, type, blockType, block_type, then string value fallback.
 */
function resolveBlockLabel(item: any): string {
  if (item === null || item === undefined) {
    return '';
  }
  // Legacy string array support
  if (typeof item === 'string') {
    return item.trim();
  }
  if (typeof item !== 'object') {
    return String(item).trim();
  }
  // Embedded objects: check type keys in order
  const typeKeys = ['_type', 'type', 'blockType', 'block_type'];
  for (const key of typeKeys) {
    const val = item[key];
    if (typeof val === 'string' && val.trim()) {
      return val.trim();
    }
  }
  return '';
}

/**
 * Returns Tailwind classes for chip variant styling.
 */
function blocksChipVariantClass(variant: string): string {
  switch (variant) {
    case 'muted':
      return 'bg-gray-100 text-gray-600';
    case 'outline':
      return 'bg-white border border-gray-300 text-gray-700';
    case 'default':
    default:
      return 'bg-blue-50 text-blue-700';
  }
}

export class CellRendererRegistry {
  private renderers: Map<string, CellRenderer> = new Map();

  constructor() {
    this.registerDefaultRenderers();
  }

  /**
   * Register a custom renderer for a column
   */
  register(column: string, renderer: CellRenderer): void {
    this.renderers.set(column, renderer);
  }

  /**
   * Get renderer for a column (fallback to default)
   */
  get(column: string): CellRenderer {
    return this.renderers.get(column) || this.defaultRenderer;
  }

  /**
   * Check if a custom renderer exists
   */
  has(column: string): boolean {
    return this.renderers.has(column);
  }

  /**
   * Default renderer - just returns the value as string
   */
  private defaultRenderer: CellRenderer = (value: any): string => {
    if (value === null || value === undefined) {
      return EMPTY_CELL_HTML;
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (Array.isArray(value)) {
      const summary = summarizeArrayValue(value, {});
      return summary ? escapeHtml(summary) : EMPTY_CELL_HTML;
    }
    if (typeof value === 'object') {
      const summary = summarizeObjectValue(value, {});
      return summary ? escapeHtml(summary) : EMPTY_CELL_HTML;
    }
    return String(value);
  };

  /**
   * Register built-in renderers
   */
  private registerDefaultRenderers(): void {
    // Status badge renderer
    this.renderers.set('_badge', (value: any): string => {
      const variant = String(value).toLowerCase();
      return badge(String(value), 'status', variant);
    });

    // Date/time renderer
    this.renderers.set('_date', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      try {
        const date = new Date(value);
        return date.toLocaleDateString();
      } catch {
        return String(value);
      }
    });

    // DateTime renderer
    this.renderers.set('_datetime', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      try {
        const date = new Date(value);
        return date.toLocaleString();
      } catch {
        return String(value);
      }
    });

    // Boolean renderer
    this.renderers.set('_boolean', (value: any): string => {
      const isTrue = Boolean(value);
      const icon = isTrue
        ? '<svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>'
        : '<svg class="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';
      return `<div class="flex justify-center">${icon}</div>`;
    });

    // Link renderer
    this.renderers.set('_link', (value: any, record: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      const href = record.url || record.link || '#';
      return `<a href="${href}" class="text-blue-600 hover:text-blue-800 underline">${value}</a>`;
    });

    // Email renderer
    this.renderers.set('_email', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      return `<a href="mailto:${value}" class="text-blue-600 hover:text-blue-800">${value}</a>`;
    });

    // URL renderer
    this.renderers.set('_url', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      return `<a href="${value}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
        ${value}
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>`;
    });

    // Number formatter
    this.renderers.set('_number', (value: any): string => {
      if (value === null || value === undefined) return '<span class="text-gray-400">-</span>';
      return Number(value).toLocaleString();
    });

    // Currency formatter
    this.renderers.set('_currency', (value: any): string => {
      if (value === null || value === undefined) return '<span class="text-gray-400">-</span>';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Number(value));
    });

    // Percentage formatter
    this.renderers.set('_percentage', (value: any): string => {
      if (value === null || value === undefined) return '<span class="text-gray-400">-</span>';
      return `${Number(value).toFixed(2)}%`;
    });

    // File size formatter
    this.renderers.set('_filesize', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      const bytes = Number(value);
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    });

    // Truncate text renderer
    this.renderers.set('_truncate', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      const text = String(value);
      const maxLength = 50;
      if (text.length <= maxLength) return text;
      return `<span title="${text}">${text.substring(0, maxLength)}...</span>`;
    });

    // Array renderer (supports scalar and object arrays)
    this.renderers.set('_array', (value: any, _record: any, _column: string, context?: CellRendererContext): string => {
      if (!Array.isArray(value) || value.length === 0) {
        return EMPTY_CELL_HTML;
      }
      const options = context?.options || {};
      const summary = summarizeArrayValue(value, options);
      return summary ? escapeHtml(summary) : EMPTY_CELL_HTML;
    });

    // Object renderer with configurable display-key hints
    this.renderers.set('_object', (value: any, _record: any, _column: string, context?: CellRendererContext): string => {
      if (value === null || value === undefined) {
        return EMPTY_CELL_HTML;
      }
      const options = context?.options || {};
      const summary = summarizeObjectValue(value, options);
      return summary ? escapeHtml(summary) : EMPTY_CELL_HTML;
    });

    // Tags/badges renderer
    this.renderers.set('_tags', (value: any): string => {
      if (!Array.isArray(value) || value.length === 0) {
        return '<span class="text-gray-400">-</span>';
      }
      return value.map(tag =>
        `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">${tag}</span>`
      ).join('');
    });

    // Blocks chips renderer - displays block items as styled chips with icons
    this.renderers.set('blocks_chips', (value: any, _record: any, _column: string, context?: CellRendererContext): string => {
      if (!Array.isArray(value) || value.length === 0) {
        return EMPTY_CELL_HTML;
      }
      const options = context?.options || {};
      const maxVisible = normalizeNumberOption(options, 'max_visible', 'maxVisible', 3);
      const showCount = normalizeBooleanOption(options, 'show_count', 'showCount', true);
      const chipVariant = normalizeStringOption(options, 'chip_variant', 'chipVariant', 'default');
      const iconMap: Record<string, string> = options.block_icons_map || options.blockIconsMap || {};

      const chips: string[] = [];
      const visibleItems = value.slice(0, maxVisible);

      for (const item of visibleItems) {
        const label = resolveBlockLabel(item);
        if (!label) continue;
        const iconRef = iconMap[label] || 'view-grid';
        const iconHtml = renderIcon(iconRef, { size: '14px', extraClass: 'flex-shrink-0' });
        const variantClass = blocksChipVariantClass(chipVariant);
        chips.push(
          `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${variantClass}">${iconHtml}<span>${escapeHtml(label)}</span></span>`
        );
      }

      if (chips.length === 0) {
        return EMPTY_CELL_HTML;
      }

      const remaining = value.length - maxVisible;
      let overflowBadge = '';
      if (showCount && remaining > 0) {
        overflowBadge = `<span class="px-2 py-0.5 rounded text-xs bg-gray-200 text-gray-600">+${remaining} more</span>`;
      }

      return `<div class="flex flex-wrap gap-1">${chips.join('')}${overflowBadge}</div>`;
    });

    // Image thumbnail renderer
    this.renderers.set('_image', (value: any): string => {
      if (!value) return '<span class="text-gray-400">-</span>';
      return `<img src="${value}" alt="Thumbnail" class="h-10 w-10 rounded object-cover" />`;
    });

    // Avatar renderer
    this.renderers.set('_avatar', (value: any, record: any): string => {
      const name = record.name || record.username || record.email || 'U';
      const initial = name.charAt(0).toUpperCase();
      if (value) {
        return `<img src="${value}" alt="${name}" class="h-8 w-8 rounded-full object-cover" />`;
      }
      return `<div class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">${initial}</div>`;
    });
  }
}

/**
 * Pre-built cell renderers for common use cases
 */
export const CommonRenderers = {
  /**
   * Status badge renderer with custom colors
   */
  statusBadge: (_colorMap?: Record<string, string>): CellRenderer => {
    return (value: any): string => {
      const variant = String(value).toLowerCase();
      return badge(String(value), 'status', variant);
    };
  },

  /**
   * Role badge renderer with color mapping
   */
  roleBadge: (_colorMap?: Record<string, string>): CellRenderer => {
    return (value: any): string => {
      const role = String(value).toLowerCase();
      return badge(String(value), 'role', role);
    };
  },

  /**
   * Combined name+email renderer
   */
  userInfo: (value: any, record: any): string => {
    const name = value || record.name || record.username || '-';
    const email = record.email || '';
    if (email) {
      return `<div><div class="font-medium text-gray-900">${name}</div><div class="text-sm text-gray-500">${email}</div></div>`;
    }
    return `<div class="font-medium text-gray-900">${name}</div>`;
  },

  /**
   * Boolean chip renderer with icon + label (e.g., [✓ Yes] or [✕ No])
   */
  booleanChip: (options?: { trueLabel?: string; falseLabel?: string }): CellRenderer => {
    return (value: any): string => {
      return sharedBooleanChip(Boolean(value), options);
    };
  },

  /**
   * Relative time renderer (e.g., "2 hours ago")
   */
  relativeTime: (value: any): string => {
    if (!value) return '<span class="text-gray-400">-</span>';
    try {
      const date = new Date(value);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      return date.toLocaleDateString();
    } catch {
      return String(value);
    }
  },

  /**
   * Locale badge renderer - shows current locale with fallback indicator
   */
  localeBadge: createLocaleBadgeRenderer(),

  /**
   * Translation status renderer - shows locale + available locales
   */
  translationStatus: createTranslationStatusRenderer(),

  /**
   * Compact translation status for smaller cells
   */
  translationStatusCompact: createTranslationStatusRenderer({ size: 'sm', maxLocales: 2 }),
};
