/**
 * Cell Renderers for DataGrid
 * Provides extensible cell rendering capabilities
 */

import { badge, booleanChip as sharedBooleanChip } from '../shared/badge.js';
import {
  renderLocaleBadge,
  renderTranslationStatusCell,
  createTranslationStatusRenderer,
  createLocaleBadgeRenderer
} from './translation-context.js';

export type CellRenderer = (value: any, record: any, column: string) => string;

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
      return '<span class="text-gray-400">-</span>';
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
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

    // Array renderer (comma-separated)
    this.renderers.set('_array', (value: any): string => {
      if (!Array.isArray(value) || value.length === 0) {
        return '<span class="text-gray-400">-</span>';
      }
      return value.join(', ');
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
