/**
 * Activity Feed Formatters
 * Handles action categorization, sentence formatting, and metadata display
 */

import type { ActivityEntry, ActionCategory, ParsedObject } from './types.js';

/**
 * Mapping of verbs to action categories
 */
const ACTION_CATEGORY_MAP: Record<string, ActionCategory> = {
  // Created
  created: 'created',
  added: 'created',
  inserted: 'created',
  registered: 'created',
  signed_up: 'created',
  imported: 'created',

  // Updated
  updated: 'updated',
  modified: 'updated',
  changed: 'updated',
  edited: 'updated',
  saved: 'updated',
  enabled: 'updated',
  disabled: 'updated',
  activated: 'updated',
  deactivated: 'updated',

  // Deleted
  deleted: 'deleted',
  removed: 'deleted',
  destroyed: 'deleted',
  purged: 'deleted',
  archived: 'deleted',

  // Auth
  login: 'auth',
  logout: 'auth',
  logged_in: 'auth',
  logged_out: 'auth',
  authenticated: 'auth',
  password_reset: 'auth',
  password_changed: 'auth',
  token_refreshed: 'auth',
  session_expired: 'auth',

  // Viewed
  viewed: 'viewed',
  accessed: 'viewed',
  read: 'viewed',
  downloaded: 'viewed',
  exported: 'viewed',
};

/**
 * Icons for each action category (using iconoir icon names)
 */
export const ACTION_ICONS: Record<ActionCategory, string> = {
  created: 'plus',
  updated: 'edit-pencil',
  deleted: 'trash',
  auth: 'key',
  viewed: 'eye',
  system: 'settings',
};

/**
 * Get the action category for a verb
 */
export function getActionCategory(verb: string): ActionCategory {
  if (!verb) return 'system';
  const normalized = verb.toLowerCase().trim().replace(/-/g, '_');
  return ACTION_CATEGORY_MAP[normalized] || 'system';
}

/**
 * Parse an object string (format: "type:id") into its components
 */
export function parseObject(object: string): ParsedObject {
  if (!object) return { type: '', id: '' };

  if (!object.includes(':')) {
    return { type: object, id: '' };
  }

  const colonIndex = object.indexOf(':');
  return {
    type: object.substring(0, colonIndex),
    id: object.substring(colonIndex + 1),
  };
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format object type for display (e.g., "user_profile" -> "User Profile")
 */
function formatObjectType(type: string): string {
  if (!type) return '';
  return type
    .split(/[_-]/)
    .map(capitalize)
    .join(' ');
}

/**
 * Format an activity entry into a human-readable sentence
 */
export function formatActivitySentence(entry: ActivityEntry): string {
  const actor = entry.actor || 'Unknown';
  const verb = entry.action || 'performed action on';
  const { type, id } = parseObject(entry.object);

  // Build object reference
  let objectRef = '';
  if (type && id) {
    objectRef = `${formatObjectType(type)} #${id}`;
  } else if (type) {
    objectRef = formatObjectType(type);
  } else if (id) {
    objectRef = `#${id}`;
  }

  // Build sentence based on action category
  const category = getActionCategory(verb);

  // Special handling for auth events
  if (category === 'auth') {
    const ip = entry.metadata?.ip || entry.metadata?.IP;
    if (ip) {
      return `<strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)} from ${escapeHtml(String(ip))}`;
    }
    return `<strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)}`;
  }

  // Standard sentence
  if (objectRef) {
    return `<strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)} <strong>${escapeHtml(objectRef)}</strong>`;
  }

  return `<strong>${escapeHtml(actor)}</strong> ${escapeHtml(verb)}`;
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Count the number of fields in metadata
 */
export function countMetadataFields(metadata: Record<string, unknown> | undefined): number {
  if (!metadata || typeof metadata !== 'object') return 0;
  return Object.keys(metadata).length;
}

/**
 * Get a summary of metadata changes
 */
export function getMetadataSummary(metadata: Record<string, unknown> | undefined): string {
  const count = countMetadataFields(metadata);
  if (count === 0) return '';
  if (count === 1) return '1 field';
  return `${count} fields`;
}

/**
 * Format metadata for expanded display
 */
export function formatMetadataExpanded(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || typeof metadata !== 'object') return '';

  const entries = Object.entries(metadata);
  if (entries.length === 0) return '';

  const items = entries.map(([key, value]) => {
    const formattedKey = escapeHtml(key);
    let formattedValue: string;

    // Check for change diff pattern (old_value -> new_value)
    if (key.endsWith('_old') || key.endsWith('_new')) {
      formattedValue = escapeHtml(formatValue(value));
    } else if (typeof value === 'object' && value !== null) {
      formattedValue = `<code class="text-xs">${escapeHtml(JSON.stringify(value))}</code>`;
    } else {
      formattedValue = escapeHtml(formatValue(value));
    }

    return `
      <div class="flex items-start justify-between gap-2 py-1">
        <span class="text-gray-500 text-xs">${formattedKey}</span>
        <span class="text-gray-900 text-xs font-medium text-right">${formattedValue}</span>
      </div>
    `;
  });

  return items.join('');
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get CSS class for action category
 */
export function getActionClass(category: ActionCategory): string {
  return `activity-action--${category}`;
}

/**
 * Get icon HTML for action category
 */
export function getActionIconHtml(category: ActionCategory): string {
  const icon = ACTION_ICONS[category];
  return `<i class="iconoir-${icon} activity-action-icon"></i>`;
}
