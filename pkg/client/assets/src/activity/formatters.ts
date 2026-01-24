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
 * Icons for action namespaces (first segment of dotted action strings)
 */
export const NAMESPACE_ICONS: Record<string, string> = {
  debug: 'terminal',
  user: 'user',
  users: 'group',
  auth: 'key',
  admin: 'settings',
  system: 'cpu',
  api: 'cloud',
  db: 'database',
  cache: 'archive',
  file: 'folder',
  email: 'mail',
  notification: 'bell',
  webhook: 'link',
  job: 'clock',
  queue: 'list',
  export: 'download',
  import: 'upload',
  report: 'page',
  log: 'clipboard',
  config: 'adjustments',
  settings: 'settings',
  security: 'shield',
  tenant: 'building',
  org: 'community',
  media: 'media-image',
  content: 'page-edit',
  repl: 'terminal',
};

/**
 * Parse a dotted action string like "debug.repl.close" into namespace and action
 */
export interface ParsedAction {
  namespace: string;
  action: string;
  icon: string;
  category: ActionCategory;
}

export function resolveActionLabel(
  actionStr: string,
  labels?: Record<string, string>
): string {
  if (!actionStr) return '';
  if (!labels) return actionStr;
  const trimmed = actionStr.trim();
  if (!trimmed) return actionStr;
  const label = labels[trimmed];
  if (typeof label === 'string' && label.trim() !== '') {
    return label;
  }
  return actionStr;
}

export function parseActionString(
  actionStr: string,
  labels?: Record<string, string>
): ParsedAction {
  if (!actionStr) {
    return { namespace: '', action: '', icon: 'activity', category: 'system' };
  }

  const actionLabel = resolveActionLabel(actionStr, labels);

  // Check if it's a dotted notation action
  if (actionStr.includes('.')) {
    const parts = actionStr.split('.');
    const namespace = parts[0].toLowerCase();
    const action = parts.slice(1).join('.');
    const icon = NAMESPACE_ICONS[namespace] || 'activity';

    // Determine category from the last part (the verb)
    const verb = parts[parts.length - 1];
    const category = getActionCategory(verb);

    const displayAction = actionLabel !== actionStr ? actionLabel : action;
    return { namespace, action: displayAction, icon, category };
  }

  // Standard single-word action
  const category = getActionCategory(actionStr);
  const displayAction = actionLabel !== actionStr ? actionLabel : actionStr;
  return {
    namespace: '',
    action: displayAction,
    icon: ACTION_ICONS[category],
    category,
  };
}

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
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shorten a UUID or long string to first N characters (like git short hash)
 */
export function shortenId(id: string, length: number = 7): string {
  if (!id) return '';
  // Remove dashes for UUID detection
  const clean = id.replace(/-/g, '');
  // If it looks like a UUID (32 hex chars without dashes), shorten it
  if (/^[0-9a-f]{32}$/i.test(clean)) {
    return id.substring(0, length);
  }
  // For other long strings, also shorten
  if (id.length > length + 3) {
    return id.substring(0, length);
  }
  return id;
}

/**
 * Check if a string looks like a UUID
 */
function isUuidLike(str: string): boolean {
  if (!str) return false;
  const clean = str.replace(/-/g, '');
  return /^[0-9a-f]{32}$/i.test(clean);
}

/**
 * Format an ID for display with optional tooltip for full value
 * Returns HTML with shortened ID and title attribute for full ID
 */
function formatIdWithTooltip(id: string, length: number = 8): string {
  if (!id) return '';
  const shortened = shortenId(id, length);
  if (shortened === id) {
    return escapeHtml(id);
  }
  // Return span with tooltip showing full ID
  return `<span class="activity-id-short" title="${escapeHtml(id)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${escapeHtml(shortened)}</span>`;
}

/**
 * Format an activity entry into a human-readable sentence
 */
export function formatActivitySentence(
  entry: ActivityEntry,
  labels?: Record<string, string>
): string {
  const actor = entry.actor || 'Unknown';
  const rawVerb = entry.action || 'performed action on';
  const verb = resolveActionLabel(rawVerb, labels);
  const { type, id } = parseObject(entry.object);

  // Format actor - shorten if UUID
  const actorDisplay = isUuidLike(actor)
    ? formatIdWithTooltip(actor, 8)
    : `<strong>${escapeHtml(actor)}</strong>`;

  // Build object reference with shortened ID
  let objectRef = '';
  if (type && id) {
    const shortId = formatIdWithTooltip(id, 8);
    objectRef = `${formatObjectType(type)} #${shortId}`;
  } else if (type) {
    objectRef = formatObjectType(type);
  } else if (id) {
    objectRef = `#${formatIdWithTooltip(id, 8)}`;
  }

  // Build sentence based on action category
  const category = getActionCategory(rawVerb);

  // Special handling for auth events
  if (category === 'auth') {
    const ip = entry.metadata?.ip || entry.metadata?.IP;
    if (ip) {
      return `${actorDisplay} ${escapeHtml(verb)} from ${escapeHtml(String(ip))}`;
    }
    return `${actorDisplay} ${escapeHtml(verb)}`;
  }

  // Standard sentence
  if (objectRef) {
    return `${actorDisplay} ${escapeHtml(verb)} <strong>${objectRef}</strong>`;
  }

  return `${actorDisplay} ${escapeHtml(verb)}`;
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
 * Format metadata for expanded display (grid-friendly items)
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
      // Truncate JSON strings
      const jsonStr = JSON.stringify(value);
      const truncated = jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
      formattedValue = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${escapeHtml(truncated)}</code>`;
    } else {
      formattedValue = escapeHtml(formatValue(value));
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${formattedKey}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${formattedValue}</span>
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
 * Format channel for display (shorten UUIDs)
 */
export function formatChannel(channel: string | undefined): string {
  if (!channel) return '';
  return shortenId(channel, 7);
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
