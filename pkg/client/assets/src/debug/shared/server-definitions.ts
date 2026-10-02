// Debug compatibility adapter over the shared console panel hydration.
// Debug keeps its debug-path discovery, process-wide registry, command-run
// renderer and legacy global console-renderer overrides; other consoles use
// the instance-owned hydration in `console/schema/hydrate`.

import {
  fetchServerPanelDefinitions as fetchConsolePanelDefinitions,
  panelDefinitionFromServer as consolePanelDefinitionFromServer,
  PANEL_DEFINITION_FETCH_TIMEOUT_MS,
  type ServerPanelConsoleRenderer,
  type ServerPanelConsoleRendererContext,
} from '../../console/schema/hydrate.js';
import { panelRegistry, type PanelDefinition } from './panel-registry.js';
import type { StyleConfig } from './styles.js';
import type { ServerPanelDefinition } from './types.js';
import {
  attachCommandRunsInteractions,
  commandRunKey,
  commandRunRevision,
  commandRunsEvicted,
  commandRunTerminal,
  renderCommandRunRow,
  renderCommandRunsPanel,
  restoreCommandRunsInteractions,
} from './panels/command-runs.js';

export type { ServerPanelConsoleRenderer, ServerPanelConsoleRendererContext };

const hydrationPromises = new Map<string, Promise<number>>();

function normalizeDebugPath(debugPath: string): string {
  const trimmed = (debugPath || '').trim().replace(/\/+$/g, '');
  return trimmed || '/admin/debug';
}

function normalizeID(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

const serverPanelConsoleRenderers = new Map<string, ServerPanelConsoleRenderer>();

/**
 * Register a bespoke Debug console renderer for a specific server panel id.
 *
 * The override only replaces the full debug-console render for that panel; the
 * toolbar continues to use the generic schema renderer, and every other panel
 * is untouched. The override still receives the validated `ui` (with its action
 * contract) so it can emit the existing `data-panel-action-*` form markup and
 * reuse the shared dispatch wiring. Other consoles pass instance-scoped
 * renderers to their own hydration instead of this global map.
 */
export function registerServerPanelConsoleRenderer(panelID: string, renderer: ServerPanelConsoleRenderer): void {
  const id = normalizeID(panelID);
  if (id && typeof renderer === 'function') {
    serverPanelConsoleRenderers.set(id, renderer);
  }
}

export function panelDefinitionFromServer(serverDef: ServerPanelDefinition): PanelDefinition | null {
  const id = normalizeID(serverDef?.id);
  const commandRuns = id === 'command_runs';
  return consolePanelDefinitionFromServer(serverDef, {
    consoleRenderer: commandRuns
      ? ({ data, styles }) => renderCommandRunsPanel(data, styles)
      : serverPanelConsoleRenderers.get(id),
    consoleRendererOwnsFilters: !commandRuns,
    extend: (panel, { ui, eventMode, liveNewestFirst }) => {
      if (!commandRuns || !ui || eventMode !== 'upsert') {
        return panel;
      }
      return {
        ...panel,
        liveList: {
          updateMode: 'upsert',
          renderRow: (item: unknown, styles: StyleConfig) => renderCommandRunRow(item, styles),
          keyOf: commandRunKey,
          revisionOf: commandRunRevision,
          terminalOf: commandRunTerminal,
          getMaxEntries: () => typeof ui.events?.max_entries === 'number' ? ui.events.max_entries : 500,
          newestFirst: liveNewestFirst,
          onAdopt: attachCommandRunsInteractions,
          onRestore: restoreCommandRunsInteractions,
          onEvict: commandRunsEvicted,
        },
      };
    },
  });
}

export async function fetchServerPanelDefinitions(
  debugPath: string,
  timeoutMs = PANEL_DEFINITION_FETCH_TIMEOUT_MS
): Promise<ServerPanelDefinition[]> {
  return fetchConsolePanelDefinitions(`${normalizeDebugPath(debugPath)}/api/panels`, timeoutMs);
}

export async function hydrateServerPanelDefinitions(debugPath: string): Promise<number> {
  const base = normalizeDebugPath(debugPath);
  const existing = hydrationPromises.get(base);
  if (existing) {
    return existing;
  }

  const promise = fetchServerPanelDefinitions(base).then((defs) => {
    let registered = 0;
    defs.forEach((def) => {
      const panel = panelDefinitionFromServer(def);
      if (panel && panelRegistry.registerServerDefinition(panel)) {
        registered += 1;
      }
    });
    return registered;
  });
  hydrationPromises.set(base, promise);
  return promise;
}
