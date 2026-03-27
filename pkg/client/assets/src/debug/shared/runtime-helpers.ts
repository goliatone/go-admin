import type { DebugEvent } from '../debug-stream.js';
import type { DebugReplCommand } from '../repl/repl-panel.js';
import {
  defaultHandleEvent,
  getSnapshotKey,
  normalizeEventTypes,
  panelRegistry,
} from './panel-registry.js';
import type { CustomLogEntry, DebugSnapshot, CustomSnapshot, LogEntry, RequestEntry, SQLEntry } from './types.js';
import { isSlowDuration } from './utils.js';

type DebugReplCommandPayload = {
  command?: string;
  description?: string;
  tags?: string[];
  aliases?: string[];
  mutates?: boolean;
  read_only?: boolean;
};

const defaultDebugPanels = ['template', 'session', 'requests', 'sql', 'logs', 'config', 'routes', 'custom'];
const defaultToolbarPanels = ['requests', 'sql', 'logs', 'routes', 'config'];

export const replPanelIDs = new Set(['console', 'shell']);

const replPanelLabels: Record<string, string> = {
  console: 'Console',
  shell: 'Shell',
};

const formatFallbackPanelLabel = (panelId: string): string => {
  if (!panelId) {
    return '';
  }
  return panelId
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\bsql\b/gi, 'SQL')
    .replace(/\b([a-z])/g, (match) => match.toUpperCase());
};

const trimBoundedArray = <T>(items: T[], maxEntries: number): T[] => {
  if (maxEntries <= 0 || items.length <= maxEntries) {
    return items;
  }
  return items.slice(-maxEntries);
};

const appendBoundedEntry = <T>(items: T[] | undefined, entry: unknown, maxEntries: number): T[] => {
  return trimBoundedArray([...(items || []), entry as T], maxEntries);
};

const setNestedValue = (dest: Record<string, unknown>, key: string, value: unknown): void => {
  if (!dest || !key) {
    return;
  }
  const parts = key
    .split('.')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return;
  }

  let current = dest;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
};

export function getDefaultPanels(): string[] {
  const registryPanels = panelRegistry.getSortedIds();
  return registryPanels.length > 0 ? registryPanels : defaultDebugPanels;
}

export function getDefaultToolbarPanels(): string[] {
  const toolbarPanels = panelRegistry.getToolbarPanels();
  if (toolbarPanels.length > 0) {
    const defaults = toolbarPanels
      .filter((panel) => panel.category === 'core' || panel.category === 'system')
      .map((panel) => panel.id);
    return defaults.length > 0 ? defaults : defaultToolbarPanels;
  }
  return defaultToolbarPanels;
}

export function isKnownPanel(panelId: string): boolean {
  return panelId === 'sessions' || panelRegistry.has(panelId) || replPanelIDs.has(panelId);
}

export function getPanelLabel(panelId: string): string {
  if (replPanelLabels[panelId]) {
    return replPanelLabels[panelId];
  }

  const def = panelRegistry.get(panelId);
  if (def) {
    return def.label;
  }

  return formatFallbackPanelLabel(panelId);
}

export function getPanelEventTypes(panelId: string): string[] {
  if (panelId === 'sessions') {
    return [];
  }

  const def = panelRegistry.get(panelId);
  if (def) {
    return normalizeEventTypes(def);
  }

  return [panelId];
}

export function buildEventToPanel(): Record<string, string> {
  const mapping: Record<string, string> = {};
  for (const def of panelRegistry.list()) {
    for (const eventType of normalizeEventTypes(def)) {
      mapping[eventType] = def.id;
    }
  }
  return mapping;
}

export function normalizeReplCommands(value: unknown): DebugReplCommand[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const commands: DebugReplCommand[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    const raw = item as DebugReplCommandPayload;
    const command = typeof raw.command === 'string' ? raw.command.trim() : '';
    if (!command) {
      return;
    }

    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const tags = Array.isArray(raw.tags)
      ? raw.tags
          .filter((tag) => typeof tag === 'string' && tag.trim() !== '')
          .map((tag) => tag.trim())
      : [];
    const aliases = Array.isArray(raw.aliases)
      ? raw.aliases
          .filter((alias) => typeof alias === 'string' && alias.trim() !== '')
          .map((alias) => alias.trim())
      : [];
    const mutates =
      typeof raw.mutates === 'boolean'
        ? raw.mutates
        : typeof raw.read_only === 'boolean'
          ? !raw.read_only
          : false;

    commands.push({
      command,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      mutates,
    });
  });

  return commands;
}

export async function fetchDebugSnapshot(debugPath: string): Promise<DebugSnapshot | null> {
  try {
    const response = await fetch(`${debugPath}/api/snapshot`, {
      credentials: 'same-origin',
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as DebugSnapshot;
  } catch {
    return null;
  }
}

export function applyCustomEventPayload(
  current: CustomSnapshot | undefined,
  payload: unknown,
  maxLogEntries = 500
): CustomSnapshot {
  const next: CustomSnapshot = {
    data: { ...(current?.data || {}) },
    logs: [...(current?.logs || [])],
  };

  if (!payload || typeof payload !== 'object') {
    return next;
  }

  const eventPayload = payload as Record<string, unknown>;
  if ('key' in eventPayload && 'value' in eventPayload) {
    setNestedValue(next.data || (next.data = {}), String(eventPayload.key), eventPayload.value);
    return next;
  }

  if ('data' in eventPayload || 'logs' in eventPayload) {
    const nested = eventPayload as Partial<CustomSnapshot>;
    if (nested.data && typeof nested.data === 'object') {
      next.data = {
        ...(next.data || {}),
        ...nested.data,
      };
    }
    if (Array.isArray(nested.logs) && nested.logs.length > 0) {
      next.logs = trimBoundedArray([...(next.logs || []), ...nested.logs], maxLogEntries);
    }
    return next;
  }

  if ('category' in eventPayload || 'message' in eventPayload) {
    next.logs = appendBoundedEntry<CustomLogEntry>(next.logs, eventPayload, maxLogEntries);
  }

  return next;
}

export function applyDebugEventToSnapshot(
  snapshot: DebugSnapshot,
  event: DebugEvent,
  options: {
    eventToPanel?: Record<string, string>;
    storeUnknownEvents?: boolean;
  } = {}
): string | null {
  if (!event || !event.type || event.type === 'snapshot') {
    return null;
  }

  const panelId = options.eventToPanel?.[event.type] || panelRegistry.findByEventType(event.type)?.id || event.type;
  const def = panelRegistry.get(panelId);
  if (def) {
    const snapshotKey = getSnapshotKey(def);
    const currentData = snapshot[snapshotKey];
    const handler =
      def.handleEvent ||
      ((current: unknown, payload: unknown) => defaultHandleEvent(current, payload, 500));
    snapshot[snapshotKey] = handler(currentData, event.payload);
    return panelId;
  }

  switch (event.type) {
    case 'request':
      snapshot.requests = appendBoundedEntry<RequestEntry>(snapshot.requests, event.payload, 500);
      break;
    case 'sql':
      snapshot.sql = appendBoundedEntry<SQLEntry>(snapshot.sql, event.payload, 200);
      break;
    case 'log':
      snapshot.logs = appendBoundedEntry<LogEntry>(snapshot.logs, event.payload, 500);
      break;
    case 'template':
      snapshot.template = (event.payload as Record<string, unknown>) || {};
      break;
    case 'session':
      snapshot.session = (event.payload as Record<string, unknown>) || {};
      break;
    case 'custom':
      snapshot.custom = applyCustomEventPayload(snapshot.custom, event.payload, 500);
      break;
    default:
      if (options.storeUnknownEvents) {
        snapshot[panelId] = event.payload;
      }
      break;
  }

  return panelId;
}

export function getToolbarCounts(
  snapshot: {
    requests?: RequestEntry[];
    sql?: SQLEntry[];
    logs?: LogEntry[];
    jserrors?: Array<Record<string, unknown>>;
  },
  slowThresholdMs = 50
): {
  requests: number;
  sql: number;
  logs: number;
  jserrors: number;
  errors: number;
  slowQueries: number;
} {
  const requests = snapshot.requests?.length || 0;
  const sql = snapshot.sql?.length || 0;
  const logs = snapshot.logs?.length || 0;
  const jserrors = snapshot.jserrors?.length || 0;

  const requestErrors = (snapshot.requests || []).filter((entry) => (entry.status || 0) >= 400).length;
  const sqlErrors = (snapshot.sql || []).filter((entry) => entry.error).length;
  const logErrors = (snapshot.logs || []).filter((entry) => {
    const level = (entry.level || '').toLowerCase();
    return level === 'error' || level === 'fatal';
  }).length;
  const slowQueries = (snapshot.sql || []).filter((entry) =>
    isSlowDuration(entry.duration, slowThresholdMs)
  ).length;

  return {
    requests,
    sql,
    logs,
    jserrors,
    errors: requestErrors + sqlErrors + logErrors + jserrors,
    slowQueries,
  };
}
