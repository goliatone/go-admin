// Convert server panel definitions into client panel definitions and register
// them into an explicit, instance-owned registry. Malformed or unsupported
// schemas degrade to the safe JSON renderer.

import type { StyleConfig } from '../style-config.js';
import type {
  PanelOptions,
  ServerPanelDefinition,
  ServerPanelDefinitionsResponse,
  ServerPanelUI,
  ServerPanelUIView,
} from '../types.js';
import type { PanelDefinition, PanelLiveListConfig, PanelRegistry } from '../registry.js';
import { httpRequest, readExpectedHTTPJSON } from '../../shared/transport/http-client.js';
import { isSchemaListRenderer, renderSchemaListRow, schemaRowKey } from './views.js';
import {
  applyDeclaredFilters,
  applyEventPolicy,
  defaultFilterState,
  getCountForPolicy,
  getCountToneForPolicy,
  countHiddenForPolicy,
  isSupportedUI,
  normalizeSchemaID,
  normalizeSchemaText,
  renderFilterControls,
  renderPanelActionControls,
  renderServerPanelBody,
  renderServerPanelView,
  unsupportedUIReason,
} from './controls.js';

/** Default bound for panel discovery requests. */
export const PANEL_DEFINITION_FETCH_TIMEOUT_MS = 3000;

/**
 * Context handed to a custom console renderer override.
 * `def` is the validated server definition (including `ui.actions`), `data` is
 * the live snapshot payload for the panel.
 */
export type ServerPanelConsoleRendererContext = {
  def: ServerPanelDefinition;
  data: unknown;
  styles: StyleConfig;
  useIconCopyButton: boolean;
};

export type ServerPanelConsoleRenderer = (ctx: ServerPanelConsoleRendererContext) => string;

/** Facts derived while hydrating, available to host adapters. */
export type PanelHydrationContext = {
  serverDef: ServerPanelDefinition;
  ui: ServerPanelUI | undefined;
  eventMode: string;
  liveNewestFirst: boolean;
};

export type PanelHydrationOptions = {
  /** Bespoke console renderer for this panel. Toolbar views keep the schema renderer. */
  consoleRenderer?: ServerPanelConsoleRenderer;
  /**
   * Whether a console renderer owns its own filtering. Defaults to true, which
   * hides the generic filter controls for overridden panels.
   */
  consoleRendererOwnsFilters?: boolean;
  /** Host style vocabulary used by generated filter controls. Defaults to Debug's. */
  styles?: Pick<StyleConfig, 'blockPrefix'>;
  /** Host adapter hook to adjust the hydrated definition. */
  extend?: (panel: PanelDefinition, context: PanelHydrationContext) => PanelDefinition;
};

export function panelDefinitionFromServer(
  serverDef: ServerPanelDefinition,
  options: PanelHydrationOptions = {}
): PanelDefinition | null {
  if (!serverDef || typeof serverDef !== 'object') {
    return null;
  }
  const id = normalizeSchemaID(serverDef.id);
  if (!id) {
    return null;
  }
  const degradedReason = unsupportedUIReason(serverDef.ui);
  const ui = degradedReason === null && isSupportedUI(serverDef.ui) ? serverDef.ui : undefined;
  const renderDef = ui ? serverDef : { ...serverDef, ui: undefined };
  const consoleOverride = ui ? options.consoleRenderer : undefined;
  // Single source of truth for sort direction across the FULL render (baked into
  // the render closures below) and the INCREMENTAL append (carried on
  // `liveList.newestFirst`). Schema panels render in chronological array order
  // (newest last) unless an event policy opts into newest-first; both paths
  // flip together and can never diverge.
  const liveNewestFirst = normalizeSchemaID(ui?.events?.order) === 'newest_first';
  const eventMode = normalizeSchemaID(ui?.events?.mode);
  const ownsFilters = options.consoleRendererOwnsFilters !== false;

  const definition: PanelDefinition = {
    ...serverPanelMetadata(serverDef, id),
    ...schemaPolicyHooks(ui, options.styles),
    ...schemaRenderers(renderDef, ui, degradedReason, liveNewestFirst, consoleOverride),
    // Custom console panels own their own filtering, so the generic object-key
    // search must not be applied to their structured snapshot payload.
    showFilters: consoleOverride && ownsFilters ? false : Boolean(ui?.filters?.length),
    liveList: schemaLiveList(ui, ui?.views?.console || ui?.views?.toolbar, eventMode, liveNewestFirst, renderDef),
  };
  return options.extend
    ? options.extend(definition, { serverDef, ui, eventMode, liveNewestFirst })
    : definition;
}

/** Tab metadata and live-event routing for a server panel. */
function serverPanelMetadata(
  serverDef: ServerPanelDefinition,
  id: string
): Pick<PanelDefinition, 'id' | 'label' | 'icon' | 'snapshotKey' | 'eventTypes' | 'supportsToolbar' | 'category' | 'order'> {
  const snapshotKey = normalizeSchemaID(serverDef.snapshot_key) || id;
  return {
    id,
    label: normalizeSchemaText(serverDef.label) || id,
    icon: normalizeSchemaText(serverDef.icon) || undefined,
    snapshotKey,
    eventTypes: normalizeServerEventTypes(serverDef.event_types, snapshotKey),
    supportsToolbar: serverDef.supports_toolbar !== false,
    category: normalizeSchemaText(serverDef.category) || 'custom',
    order: typeof serverDef.order === 'number' ? serverDef.order : 100,
  };
}

/**
 * Console/toolbar renderers. A console override replaces the full console
 * render only; split action/body renderers exist for schema-rendered panels.
 */
function schemaRenderers(
  renderDef: ServerPanelDefinition,
  ui: ServerPanelUI | undefined,
  degradedReason: string | null,
  newestFirst: boolean,
  consoleOverride: ServerPanelConsoleRenderer | undefined
): Pick<PanelDefinition, 'render' | 'renderConsole' | 'renderToolbar' | 'renderActions' | 'renderBody'> {
  const consoleView = ui?.views?.console || ui?.views?.toolbar;
  const toolbarView = ui?.views?.toolbar || ui?.views?.console;
  const renderToolbar = (data: unknown, styles: StyleConfig, renderOptions?: PanelOptions): string =>
    renderServerPanelView(renderDef, toolbarView, data, styles, false, degradedReason, newestFirst, renderOptions);
  if (consoleOverride) {
    const renderOverride = (data: unknown, styles: StyleConfig): string =>
      consoleOverride({ def: renderDef, data, styles, useIconCopyButton: true });
    return { render: renderOverride, renderConsole: renderOverride, renderToolbar };
  }
  const renderConsole = (data: unknown, styles: StyleConfig, renderOptions?: PanelOptions): string =>
    renderServerPanelView(renderDef, consoleView, data, styles, true, degradedReason, newestFirst, renderOptions);
  return {
    render: renderConsole,
    renderConsole,
    renderToolbar,
    renderActions: (styles, renderOptions) => renderPanelActionControls(renderDef, styles, renderOptions),
    renderBody: (data, styles) => renderServerPanelBody(renderDef, consoleView, data, styles, true, degradedReason, newestFirst),
  };
}

/** Count, event, and filter hooks declared by a supported schema. */
function schemaPolicyHooks(
  ui: ServerPanelUI | undefined,
  styles: Pick<StyleConfig, 'blockPrefix'> | undefined
): Pick<PanelDefinition, 'getCount' | 'getCountTone' | 'hideCount' | 'handleEvent' | 'renderFilters' | 'defaultFilters' | 'applyFilters'> {
  const filtered = Boolean(ui?.filters?.length);
  return {
    getCount: ui?.count ? (data) => getCountForPolicy(data, ui) : undefined,
    getCountTone: ui?.count ? (data) => getCountToneForPolicy(data, ui) : undefined,
    hideCount: ui?.count ? (count) => countHiddenForPolicy(count, ui) : undefined,
    handleEvent: ui?.events ? (current, payload) => applyEventPolicy(current, payload, ui) : undefined,
    renderFilters: filtered ? (state) => renderFilterControls(ui, state, styles) : undefined,
    defaultFilters: filtered ? defaultFilterState(ui) : undefined,
    applyFilters: filtered ? (data, state) => applyDeclaredFilters(data, state, ui) : undefined,
  };
}

/**
 * Opt single-list append panels into incremental ("live list") rendering. The
 * schema list renderers emit `[data-live-list]` + keyed rows, so the host can
 * append/evict individual rows instead of rebuilding the whole table. Only
 * `append` is auto-wired; `upsert`/`merge`/`stack` stay on full render.
 */
function schemaLiveList(
  ui: ServerPanelUI | undefined,
  primaryView: ServerPanelUIView | undefined,
  eventMode: string,
  newestFirst: boolean,
  serverDef?: ServerPanelDefinition
): PanelLiveListConfig | undefined {
  if (!ui || !primaryView || eventMode !== 'append' || !isSchemaListRenderer(primaryView.renderer)) {
    return undefined;
  }
  // A `table` view without declared columns derives its columns from the first
  // row at full-render time; a per-row incremental append cannot reproduce that
  // (it would derive columns from each item), so only opt such tables in when
  // columns are declared. status_list/timeline use fixed bindings and are safe.
  const tableColumnsOk = normalizeSchemaID(primaryView.renderer) !== 'table'
    || (Array.isArray(primaryView.options?.columns) && primaryView.options.columns.length > 0);
  if (!tableColumnsOk) {
    return undefined;
  }
  return {
    renderRow: (item: unknown, styles: StyleConfig) =>
      renderSchemaListRow(primaryView.renderer, item, primaryView, styles, serverDef),
    keyOf: (item: unknown) => schemaRowKey(item, primaryView.options?.key_bind),
    getMaxEntries: () =>
      typeof ui.events?.max_entries === 'number' ? ui.events.max_entries : 500,
    newestFirst,
  };
}

function normalizeServerEventTypes(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) {
    return fallback ? [fallback] : [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  value.forEach((item) => {
    const normalized = normalizeSchemaID(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  });
  return out.length > 0 ? out : fallback ? [fallback] : [];
}

/**
 * Fetch server panel definitions from a resolved discovery URL. Failures,
 * timeouts and denied responses all yield an empty list.
 */
export async function fetchServerPanelDefinitions(
  url: string,
  timeoutMs = PANEL_DEFINITION_FETCH_TIMEOUT_MS
): Promise<ServerPanelDefinition[]> {
  let timeoutID: ReturnType<typeof setTimeout> | undefined;
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  try {
    if (controller && timeoutMs > 0) {
      timeoutID = setTimeout(() => controller.abort(), timeoutMs);
    }
    const response = await httpRequest(url, {
      credentials: 'same-origin',
      signal: controller?.signal,
    });
    if (!response.ok) {
      return [];
    }
    const payload = await readExpectedHTTPJSON<ServerPanelDefinitionsResponse>(response);
    return Array.isArray(payload.panels) ? payload.panels : [];
  } catch {
    return [];
  } finally {
    if (timeoutID !== undefined) {
      clearTimeout(timeoutID);
    }
  }
}

/**
 * Register hydrated definitions without replacing client renderers. Returns the
 * number of server definitions registered.
 */
export function registerServerPanelDefinitions(
  registry: PanelRegistry,
  definitions: ServerPanelDefinition[],
  optionsFor: (serverDef: ServerPanelDefinition) => PanelHydrationOptions = () => ({})
): number {
  let registered = 0;
  (Array.isArray(definitions) ? definitions : []).forEach((def) => {
    const panel = panelDefinitionFromServer(def, optionsFor(def));
    if (panel && registry.registerServerDefinition(panel)) {
      registered += 1;
    }
  });
  return registered;
}
