// Bespoke console renderer for the "commands" debug panel (command launcher).
//
// The generic schema renderer turned the formgen-style argument form into a
// single wrapping flex row plus a redundant dropdown + read-only catalog table.
// This module replaces the full console render for the `commands` panel with a
// master-detail launcher: a searchable, grouped command catalog drives a
// sectioned, type-aware argument form and a structured result panel.
//
// It deliberately reuses the existing dispatch contract: each command form
// carries the same `data-panel-action-*` markup the server already emits, so
// `DebugPanel.runPanelAction` dispatches it unchanged. Only the rendering and
// the result presentation are bespoke. The toolbar and every other panel keep
// the generic renderer.

import { escapeHTML } from '../utils.js';
import { registerServerPanelConsoleRenderer, type ServerPanelConsoleRendererContext } from '../server-definitions.js';
import { httpRequest, readExpectedHTTPJSON, readHTTPErrorResult } from '../../../shared/transport/http-client.js';

const COMMAND_LAUNCHER_PANEL_ID = 'commands';

type ServerActionField = {
  id?: string;
  name?: string;
  label?: string;
  kind?: string;
  payload_path?: string;
  path?: string;
  placeholder?: string;
  description?: string;
  help?: string;
  required?: boolean;
  options?: string[];
  option_items?: ServerActionOption[];
  option_source?: ServerActionOptionSource;
  default?: unknown;
  display_hints?: Record<string, unknown>;
  static_options?: ServerActionOption[];
};

type ServerActionOption = {
  value?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
};

type ServerActionOptionSource = {
  id?: string;
  label?: string;
  dynamic?: boolean;
  cache_scope?: string;
  params?: Record<string, unknown>;
};

type ServerAction = {
  id?: string;
  label?: string;
  submit_label?: string;
  confirm_text?: string;
  requires_confirm?: boolean;
  payload?: Record<string, unknown>;
  fields?: ServerActionField[];
};

type DescriptorLike = {
  id?: string;
  label?: string;
  summary?: string;
  group?: string;
  tags?: string[];
  mutating?: boolean;
  execution_mode?: string;
};

type DiagnosticLike = {
  code?: string;
  severity?: string;
  message?: string;
};

type CatalogEntry = {
  // Stable selection key: the action id when the command is executable, else a
  // `cmd:<commandId>` synthetic key so visible-but-not-executable commands can
  // still be selected and described.
  key: string;
  actionId: string;
  commandId: string;
  label: string;
  action?: ServerAction;
  descriptor?: DescriptorLike;
  group: string;
  search: string;
  executable: boolean;
};

// Session state that must survive a panel re-render (snapshot updates,
// post-dispatch refresh, live events). The debug console rebuilds the panel's
// innerHTML on every snapshot, so any in-progress interaction would otherwise be
// discarded. We keep the selected command, the filter text, and a per-command
// form draft in module scope and rehydrate them on every attach.
let selectedActionId = '';
let filterText = '';
const formDrafts = new Map<string, Record<string, string>>();

// Operator-chosen master-list width (app-shell splitter). The panel rebuilds its
// innerHTML on every snapshot, so the width lives in module scope (mirrored to
// localStorage) and is re-applied on every attach, like the selection/filter.
let sidebarWidth = 0; // 0 == unset → fall back to the CSS default track width.
const SIDEBAR_DEFAULT_PX = 230;
const SIDEBAR_MIN_PX = 180;
const SIDEBAR_MAX_FALLBACK_PX = 640;
const DETAIL_MIN_PX = 280;
const SIDEBAR_KEYBOARD_STEP_PX = 24;
const SIDEBAR_WIDTH_KEY = 'cmdl:sidebar-width';

// Live command status received over the debug WebSocket (Phase 3 T11), keyed by
// correlation id. The result card reflects the latest state for the command it
// is showing — including completion pushed later by a host queue worker.
export type CommandLiveStatus = { state: string; message: string; at: string; code: string };
const commandStatusByCorrelation = new Map<string, CommandLiveStatus>();

// Clears session-scoped launcher state (selected command, filter text, form
// drafts, live statuses). Exposed so a host can reset the launcher when the
// debug session resets, and used by tests to isolate cases.
export function resetCommandLauncherState(): void {
  selectedActionId = '';
  filterText = '';
  sidebarWidth = 0;
  formDrafts.clear();
  commandStatusByCorrelation.clear();
}

const LIVE_STATE_ORDER: Record<string, number> = { submitting: 0, accepted: 1, running: 2, completed: 3, failed: 3 };

// Store a command_status event. Later events win, but never regress a terminal
// state (completed/failed) back to an earlier one from a stray/late event.
export function applyCommandLauncherStatusEvent(payload: unknown): void {
  const event = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
  const correlationId = str(event.correlation_id) || str(event.CorrelationID);
  const state = lower(event.state) || lower(event.State);
  if (!correlationId || !state) {
    return;
  }
  const existing = commandStatusByCorrelation.get(correlationId);
  if (existing && (LIVE_STATE_ORDER[existing.state] ?? -1) > (LIVE_STATE_ORDER[state] ?? -1)) {
    return;
  }
  commandStatusByCorrelation.set(correlationId, {
    state,
    message: str(event.message) || str(event.Message),
    at: str(event.at) || str(event.At),
    code: str(event.code) || str(event.Code),
  });
}

export function getCommandLauncherLiveStatus(correlationId: string): CommandLiveStatus | undefined {
  return correlationId ? commandStatusByCorrelation.get(correlationId) : undefined;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function lower(value: unknown): string {
  return str(value).toLowerCase();
}

function isBooleanKind(kind: string): boolean {
  return kind === 'boolean' || kind === 'checkbox';
}

function serializePayloadAttr(payload: Record<string, unknown> | undefined): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  return escapeHTML(JSON.stringify(payload)).replace(/'/g, '&#39;');
}

function scalarAttr(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function own<T extends object>(target: T | undefined, key: PropertyKey): boolean {
  return Boolean(target && Object.prototype.hasOwnProperty.call(target, key));
}

function presentationString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function presentationBool(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.trim().toLowerCase() === 'true';
  }
  return false;
}

function executionClass(mode: string): string {
  const normalized = lower(mode);
  if (normalized === 'inline' || normalized === 'sync') {
    return 'inline';
  }
  if (normalized === 'queued' || normalized === 'async' || normalized === 'background') {
    return 'queued';
  }
  return 'other';
}

// ============================================================================
// Catalog assembly
// ============================================================================

function buildCatalog(def: ServerPanelConsoleRendererContext['def'], data: unknown): { entries: CatalogEntry[]; diagnostics: DiagnosticLike[] } {
  const snapshot = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const commands = Array.isArray(snapshot.commands) ? (snapshot.commands as DescriptorLike[]) : [];
  const diagnostics = Array.isArray(snapshot.diagnostics) ? (snapshot.diagnostics as DiagnosticLike[]) : [];
  const actions = Array.isArray(def.ui?.actions) ? (def.ui!.actions as ServerAction[]) : [];

  const schemas = commandSchemaFields(def);

  const descriptorById = new Map<string, DescriptorLike>();
  commands.forEach((descriptor) => {
    const id = str(descriptor?.id);
    if (id) {
      descriptorById.set(id, descriptor);
    }
  });

  const actionByCommand = new Map<string, ServerAction>();
  actions.forEach((action) => {
    const actionId = lower(action?.id);
    const commandId = str((action.payload as Record<string, unknown> | undefined)?.command_id);
    if (actionId && commandId && !actionByCommand.has(commandId)) {
      actionByCommand.set(commandId, action);
    }
  });

  // Union of visible descriptors (snapshot `commands`, i.e. read-permitted) and
  // executable actions (dispatch-permitted). The snapshot can include commands
  // the operator may see but not run; iterating actions alone would drop them.
  const commandIds: string[] = [];
  const seen = new Set<string>();
  const remember = (id: string) => {
    if (id && !seen.has(id)) {
      seen.add(id);
      commandIds.push(id);
    }
  };
  commands.forEach((descriptor) => remember(str(descriptor?.id)));
  actions.forEach((action) => remember(str((action.payload as Record<string, unknown> | undefined)?.command_id)));

  const entries: CatalogEntry[] = commandIds.map((commandId) => {
    const descriptor = descriptorById.get(commandId);
    const action = actionByCommand.get(commandId);
    const actionId = action ? lower(action.id) : '';
    const executable = Boolean(action && actionId);
    const resolvedAction = executable
      ? mergeActionFieldPresentation(action!, schemas.get(commandId) || new Map<string, ServerActionField>())
      : undefined;
    const label = str(action?.label) || str(descriptor?.label) || commandId;
    const group = str(descriptor?.group) || 'Other';
    const tags = Array.isArray(descriptor?.tags) ? descriptor!.tags!.map(str).filter(Boolean) : [];
    const search = `${commandId} ${label} ${group} ${tags.join(' ')}${executable ? '' : ' no-access locked'}`.toLowerCase();
    return {
      key: executable ? actionId : `cmd:${commandId}`,
      actionId,
      commandId,
      label,
      action: resolvedAction,
      descriptor,
      group,
      search,
      executable,
    };
  });

  return { entries, diagnostics };
}

function commandSchemaFields(def: ServerPanelConsoleRendererContext['def']): Map<string, Map<string, ServerActionField>> {
  const metadata = def.ui?.metadata && typeof def.ui.metadata === 'object' ? (def.ui.metadata as Record<string, unknown>) : {};
  const schemas = metadata.serialized_schemas && typeof metadata.serialized_schemas === 'object'
    ? (metadata.serialized_schemas as Record<string, unknown>)
    : {};
  const out = new Map<string, Map<string, ServerActionField>>();
  Object.entries(schemas).forEach(([commandId, rawSchema]) => {
    const schema = rawSchema && typeof rawSchema === 'object' ? (rawSchema as Record<string, unknown>) : {};
    const rawFields = Array.isArray(schema.fields) ? (schema.fields as ServerActionField[]) : [];
    const byKey = new Map<string, ServerActionField>();
    rawFields.forEach((field) => {
      [str(field.id), str(field.name), str(field.path), str(field.payload_path).replace(/^payload\./, '')]
        .filter(Boolean)
        .forEach((key) => byKey.set(key, field));
    });
    out.set(commandId, byKey);
  });
  return out;
}

function mergeActionFieldPresentation(action: ServerAction, schemaFields: Map<string, ServerActionField>): ServerAction {
  const fields = Array.isArray(action.fields) ? action.fields : [];
  if (fields.length === 0 || schemaFields.size === 0) {
    return action;
  }
  return {
    ...action,
    fields: fields.map((field) => {
      const keys = [str(field.id), str(field.name), str(field.path), str(field.payload_path).replace(/^payload\./, '')].filter(Boolean);
      const schema = keys.map((key) => schemaFields.get(key)).find(Boolean);
      if (!schema) {
        return field;
      }
      const merged: ServerActionField = { ...field };
      if (!own(merged, 'default') && own(schema, 'default')) {
        merged.default = schema.default;
      }
      if (!own(merged, 'display_hints') && own(schema, 'display_hints')) {
        merged.display_hints = schema.display_hints;
      }
      if (!own(merged, 'option_items') && Array.isArray(schema.static_options)) {
        merged.option_items = schema.static_options;
      }
      if (!own(merged, 'option_source') && own(schema, 'option_source')) {
        merged.option_source = schema.option_source;
      }
      if (!str(merged.description)) {
        merged.description = str(schema.description) || str(schema.help);
      }
      if (!str(merged.help)) {
        merged.help = str(schema.help);
      }
      return merged;
    }),
  };
}

function groupEntries(entries: CatalogEntry[]): Array<{ group: string; items: CatalogEntry[] }> {
  const groups = new Map<string, CatalogEntry[]>();
  entries.forEach((entry) => {
    if (!groups.has(entry.group)) {
      groups.set(entry.group, []);
    }
    groups.get(entry.group)!.push(entry);
  });
  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([group, items]) => ({
      group,
      items: items.sort((a, b) => (a.commandId || a.label).localeCompare(b.commandId || b.label)),
    }));
}

// ============================================================================
// List (master) rendering
// ============================================================================

function renderListItem(entry: CatalogEntry): string {
  const execMode = str(entry.descriptor?.execution_mode);
  const execClass = executionClass(execMode);
  const dotTitle = execMode ? `Execution: ${execMode}` : 'Execution mode unknown';
  const mutating = entry.descriptor?.mutating === true;
  let flag: string;
  if (!entry.executable) {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--locked" title="You can view this command but lack permission to run it">no access</span>';
  } else if (mutating) {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--mutating" title="Mutating — writes data">writes</span>';
  } else {
    flag = '<span class="cmdl-item__flag cmdl-item__flag--read" title="Read-only">read</span>';
  }
  return `
    <button type="button" class="cmdl-item${entry.executable ? '' : ' cmdl-item--locked'}" role="option" aria-selected="false"
      data-cmdl-item="${escapeHTML(entry.key)}"
      data-cmdl-search="${escapeHTML(entry.search)}"
      title="${escapeHTML(entry.commandId || entry.label)}">
      <span class="cmdl-item__dot cmdl-item__dot--${execClass}" title="${escapeHTML(dotTitle)}" aria-hidden="true"></span>
      <span class="cmdl-item__name">${escapeHTML(entry.commandId || entry.label)}</span>
      ${flag}
    </button>`;
}

function renderList(grouped: Array<{ group: string; items: CatalogEntry[] }>, total: number): string {
  const groups = grouped
    .map(
      (group) => `
      <div class="cmdl-group" data-cmdl-group role="group" aria-label="${escapeHTML(group.group)}">
        <div class="cmdl-group__label" aria-hidden="true">${escapeHTML(group.group)}</div>
        ${group.items.map(renderListItem).join('')}
      </div>`
    )
    .join('');
  return `
    <aside class="cmdl__list">
      <div class="cmdl__search">
        <input type="search" class="cmdl__search-input" data-cmdl-filter
          placeholder="Filter ${total} command${total === 1 ? '' : 's'}…"
          aria-label="Filter commands" autocomplete="off" spellcheck="false">
      </div>
      <div class="cmdl__groups" role="listbox" aria-label="Commands" data-cmdl-groups>
        ${groups}
        <div class="cmdl__noresults" data-cmdl-noresults hidden>No commands match your filter.</div>
      </div>
    </aside>`;
}

// ============================================================================
// Detail + form rendering
// ============================================================================

function normalizedOptionItems(field: ServerActionField): Array<Required<Pick<ServerActionOption, 'value' | 'label'>> & ServerActionOption> {
  const rich = Array.isArray(field.option_items) ? field.option_items : [];
  const legacy: ServerActionOption[] = Array.isArray(field.options)
    ? field.options.map((value) => ({ value: str(value), label: str(value) }))
    : [];
  const source: ServerActionOption[] = rich.length > 0 ? rich : legacy;
  const seen = new Set<string>();
  return source
    .map((option) => {
      const value = str(option?.value);
      return {
        ...option,
        value,
        label: str(option?.label) || value,
        description: str(option?.description),
        disabled: option?.disabled === true,
      };
    })
    .filter((option) => {
      if (!option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
}

function optionSourceDependencies(source: ServerActionOptionSource | undefined): string[] {
  const raw = source?.params?.depends_on;
  const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
  return values.map(str).filter(Boolean);
}

function optionSourceAttrs(field: ServerActionField, payloadPath: string): string {
  const sourceID = str(field.option_source?.id);
  if (!sourceID) return '';
  const fieldPath = payloadPath.replace(/^payload\./, '');
  const depends = optionSourceDependencies(field.option_source).join(',');
  return ` data-cmdl-option-source="${escapeHTML(sourceID)}" data-cmdl-option-field="${escapeHTML(fieldPath)}"${depends ? ` data-cmdl-option-depends="${escapeHTML(depends)}"` : ''}`;
}

function renderOptionChoiceButtons(items: ReturnType<typeof normalizedOptionItems>): string {
  if (items.length === 0) return '';
  return `<div class="cmdl-option-choices" data-cmdl-option-choices>${items.map((option) => `
    <button type="button" class="cmdl-option-choice" data-cmdl-option-value="${escapeHTML(option.value)}"
      ${option.disabled ? 'disabled' : ''}${option.description ? ` title="${escapeHTML(option.description)}"` : ''}>
      <span>${escapeHTML(option.label)}</span>${option.description ? `<small>${escapeHTML(option.description)}</small>` : ''}
    </button>`).join('')}</div>`;
}

function fieldControl(field: ServerActionField, actionId: string, index: number): string {
  const name = str(field.name);
  if (!name) {
    return '';
  }
  const kind = lower(field.kind) || 'text';
  const label = str(field.label) || name;
  const payloadPath = str(field.payload_path) || name;
  const fieldId = `cmdl-${actionId}-${name}-${index}`;
  const required = field.required === true;
  const reqMark = required ? '<span class="cmdl-field__req" title="Required">*</span>' : '';
  const placeholder = str(field.placeholder);
  const placeholderAttr = placeholder ? ` placeholder="${escapeHTML(placeholder)}"` : '';
  const description = str(field.description);
  const helpText = str(field.help);
  const units = presentationString(field.display_hints?.units);
  const helpParts = [
    description ? `<span>${escapeHTML(description)}</span>` : '',
    helpText && helpText !== description ? `<span>${escapeHTML(helpText)}</span>` : '',
    units ? `<span class="cmdl-field__units">Units: ${escapeHTML(units)}</span>` : '',
  ].filter(Boolean);
  const help = helpParts.length ? `<small class="cmdl-field__help">${helpParts.join(' ')}</small>` : '';
  const options = normalizedOptionItems(field);
  const sourceAttrs = optionSourceAttrs(field, payloadPath);
  const sourceStatus = field.option_source
    ? `<small class="cmdl-field__source" data-cmdl-option-status>${options.length > 0 ? '' : 'Options load when this command is selected.'}</small>`
    : '';
  const requiredAttr = required ? ' required' : '';
  const baseAttrs = `id="${escapeHTML(fieldId)}" data-action-field="${escapeHTML(name)}" data-action-field-kind="${escapeHTML(kind)}" data-action-field-path="${escapeHTML(payloadPath)}"${requiredAttr}`;
  const errorSmall = `<small class="cmdl-field__error" data-action-field-error="${escapeHTML(payloadPath)}" data-action-field-name="${escapeHTML(name)}" data-action-id="${escapeHTML(actionId)}" hidden></small>`;

  // Boolean → full-width toggle row.
  if (isBooleanKind(kind)) {
    const checked = field.default === true ? ' checked' : '';
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--bool"${sourceAttrs}>
        <label class="cmdl-toggle">
          <input type="checkbox" ${baseAttrs}${checked}>
          <span class="cmdl-toggle__track" aria-hidden="true"></span>
          <span class="cmdl-toggle__text">${escapeHTML(label)}${reqMark}</span>
        </label>
        ${help}${sourceStatus}${errorSmall}
      </div>`;
  }

  let control = '';
  if (kind === 'string_list' || kind === 'array') {
    const defaults = Array.isArray(field.default) ? (field.default as unknown[]).map(str).filter(Boolean) : [];
    const entryPlaceholder = placeholder || (options.length > 0 ? 'Choose values below or type another value' : 'Add a value, press Enter');
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--list"${sourceAttrs}>
        <label class="cmdl-field__label" for="${escapeHTML(fieldId)}">${escapeHTML(label)}${reqMark}</label>
        <div class="cmdl-chips" data-cmdl-chips${required ? ' data-cmdl-chips-required="true"' : ''}>
          <span class="cmdl-chips__tags" data-cmdl-chips-tags></span>
          <input type="text" id="${escapeHTML(fieldId)}" class="cmdl-chips__entry" data-cmdl-chips-entry
            placeholder="${escapeHTML(entryPlaceholder)}" autocomplete="off" spellcheck="false">
          <input type="hidden" data-action-field="${escapeHTML(name)}" data-action-field-kind="string_list"
            data-action-field-path="${escapeHTML(payloadPath)}"
            data-cmdl-chips-value value="${escapeHTML(defaults.join('\n'))}">
        </div>
        ${renderOptionChoiceButtons(options)}
        ${help}${sourceStatus}${errorSmall}
      </div>`;
  } else if (options.length > 0 || kind === 'select' || field.option_source) {
    const defaultValue = scalarAttr(field.default);
    const unavailable = options.length === 0 && Boolean(field.option_source);
    control = `<select ${baseAttrs} data-cmdl-option-control${unavailable ? ' disabled' : ''}><option value="">${unavailable ? 'Options unavailable' : ''}</option>${options
      .map((option) => `<option value="${escapeHTML(option.value)}"${option.value === defaultValue ? ' selected' : ''}${option.disabled ? ' disabled' : ''}${option.description ? ` title="${escapeHTML(option.description)}" data-option-description="${escapeHTML(option.description)}"` : ''}>${escapeHTML(option.label)}</option>`)
      .join('')}</select><small class="cmdl-field__option-description" data-cmdl-option-description></small>`;
  } else if (kind === 'number' || kind === 'integer') {
    const valueAttr = scalarAttr(field.default);
    control = `<input type="number" ${baseAttrs}${placeholderAttr}${valueAttr ? ` value="${escapeHTML(valueAttr)}"` : ''}>`;
  } else if (kind === 'json' || kind === 'object' || kind === 'textarea') {
    const defaultText = field.default !== undefined && field.default !== null ? JSON.stringify(field.default, null, 2) : '';
    control = `<textarea ${baseAttrs}${placeholderAttr} rows="3">${escapeHTML(defaultText)}</textarea>`;
  } else {
    const valueAttr = scalarAttr(field.default);
    control = `<input type="text" ${baseAttrs}${placeholderAttr}${valueAttr ? ` value="${escapeHTML(valueAttr)}"` : ''}>`;
  }

  return `
    <div class="cmdl-field"${sourceAttrs}>
      <label class="cmdl-field__label" for="${escapeHTML(fieldId)}">${escapeHTML(label)}${reqMark}</label>
      ${control}
      ${help}${sourceStatus}${errorSmall}
    </div>`;
}

type FormSection = { title: string; fields: ServerActionField[]; collapsible: boolean };

function buildSections(fields: ServerActionField[]): FormSection[] {
  if (hasAuthoredPresentation(fields)) {
    return buildAuthoredSections(fields);
  }
  return buildHeuristicSections(fields);
}

function hasAuthoredPresentation(fields: ServerActionField[]): boolean {
  return fields.some((field) => {
    const hints = field.display_hints || {};
    return presentationString(hints.section) !== '' || own(hints, 'advanced');
  });
}

function buildAuthoredSections(fields: ServerActionField[]): FormSection[] {
  const sections: FormSection[] = [];
  const byTitle = new Map<string, FormSection>();
  const advanced: ServerActionField[] = [];

  fields.forEach((field) => {
    const hints = field.display_hints || {};
    if (presentationBool(hints.advanced)) {
      advanced.push(field);
      return;
    }
    const title = presentationString(hints.section) || 'Parameters';
    let section = byTitle.get(title);
    if (!section) {
      section = { title, fields: [], collapsible: false };
      byTitle.set(title, section);
      sections.push(section);
    }
    section.fields.push(field);
  });

  if (advanced.length) {
    sections.push({ title: 'Advanced', fields: advanced, collapsible: true });
  }
  return sections;
}

// Phase 1 fallback: keep primary inputs visible, group boolean flags, and only
// push overflow into Advanced for large commands.
function buildHeuristicSections(fields: ServerActionField[]): FormSection[] {
  const booleans = fields.filter((field) => isBooleanKind(lower(field.kind)));
  const nonBooleans = fields.filter((field) => !isBooleanKind(lower(field.kind)));
  const required = nonBooleans.filter((field) => field.required === true);
  const optional = nonBooleans.filter((field) => field.required !== true);
  const ordered = [...required, ...optional];

  let primary = ordered;
  let advanced: ServerActionField[] = [];
  if (ordered.length > 6) {
    const visibleCount = Math.max(required.length, 4);
    primary = ordered.slice(0, visibleCount);
    advanced = ordered.slice(visibleCount);
  }

  const sections: FormSection[] = [];
  if (primary.length) {
    sections.push({ title: 'Parameters', fields: primary, collapsible: false });
  }
  if (booleans.length) {
    sections.push({ title: 'Options', fields: booleans, collapsible: false });
  }
  if (advanced.length) {
    sections.push({ title: 'Advanced', fields: advanced, collapsible: true });
  }
  return sections;
}

function renderSection(section: FormSection, actionId: string, startIndex: number): string {
  const collapsedClass = section.collapsible ? ' cmdl-section--collapsed' : '';
  const head = section.collapsible
    ? `<legend class="cmdl-section__head cmdl-section__head--toggle" data-cmdl-section-toggle role="button" tabindex="0" aria-expanded="false">
        <span class="cmdl-section__caret" aria-hidden="true"></span>
        <span>${escapeHTML(section.title)}</span>
        <span class="cmdl-section__count">${section.fields.length}</span>
      </legend>`
    : `<legend class="cmdl-section__head">${escapeHTML(section.title)}</legend>`;
  const grid = section.fields.map((field, offset) => fieldControl(field, actionId, startIndex + offset)).join('');
  return `
    <fieldset class="cmdl-section${collapsedClass}">
      ${head}
      <div class="cmdl-section__grid">${grid}</div>
    </fieldset>`;
}

function renderForm(entry: CatalogEntry): string {
  const action = entry.action;
  if (!action) {
    return '';
  }
  const fields = Array.isArray(action.fields) ? action.fields : [];
  const submitLabel = str(action.submit_label) || 'Run command';
  const confirm = str(action.confirm_text);
  const requiresConfirm = action.requires_confirm === true;
  const mutating = entry.descriptor?.mutating === true;

  let body = '';
  if (fields.length === 0) {
    body = '<p class="cmdl-form__noargs">This command takes no arguments. Run it as-is.</p>';
  } else {
    const sections = buildSections(fields);
    let index = 0;
    const sectionsHtml = sections
      .map((section) => {
        const html = renderSection(section, entry.actionId, index);
        index += section.fields.length;
        return html;
      })
      .join('');
    body = `
      <div class="cmdl-recall" data-cmdl-recall data-cmdl-command="${escapeHTML(entry.commandId)}">
        <div class="cmdl-recall__list" data-cmdl-recall-list></div>
        <button type="button" class="cmdl-recall__save" data-cmdl-save-preset>Save preset</button>
      </div>
      <div class="cmdl-form__fields" data-cmdl-fields>${sectionsHtml}</div>
      <div class="cmdl-form__json" data-cmdl-json hidden>
        <textarea class="cmdl-json-editor" data-cmdl-json-editor
          data-action-field="__payload__" data-action-field-kind="json" data-action-field-path="payload"
          rows="10" spellcheck="false" aria-label="Raw JSON payload"></textarea>
        <div class="cmdl-json-error" data-cmdl-json-error hidden></div>
      </div>`;
  }

  // Mutating / confirm-required commands gate dispatch with an inline two-step
  // confirmation in the action bar instead of a blocking browser dialog. The
  // launcher owns this UX, so it tells the host (DebugPanel.runPanelAction) to
  // skip its native window.confirm via data-action-confirm-inline; the server's
  // requires_confirm signal is still surfaced honestly on the form.
  const needsConfirm = requiresConfirm || confirm !== '';
  const note = mutating
    ? '<span class="cmdl-form__note">Confirms before running</span>'
    : '';
  const jsonToggle = fields.length > 0
    ? '<button type="button" class="cmdl-btn cmdl-btn--ghost cmdl-btn--json" data-cmdl-json-toggle title="Edit the raw JSON payload">JSON</button>'
    : '';
  const confirmRow = needsConfirm
    ? `
        <div class="cmdl-form__confirm" data-cmdl-confirm-row hidden>
          <span class="cmdl-form__confirm-msg">${escapeHTML(confirm || 'Run this command?')}</span>
          <button type="submit" class="cmdl-btn cmdl-btn--run cmdl-btn--confirm" data-cmdl-confirm-run>Confirm run</button>
          <button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-cancel>Cancel</button>
        </div>`
    : '';

  return `
    <form class="cmdl-form" data-panel-action-form data-cmdl-mode="form" data-cmdl-command="${escapeHTML(entry.commandId)}"
      data-panel-id="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"
      data-action-id="${escapeHTML(entry.actionId)}"
      data-action-confirm="${escapeHTML(confirm)}"
      data-action-requires-confirm="${requiresConfirm ? 'true' : 'false'}"
      data-cmdl-confirm="${needsConfirm ? 'true' : 'false'}"
      ${needsConfirm ? 'data-action-confirm-inline="true"' : ''}
      data-action-payload='${serializePayloadAttr(action.payload)}'>
      ${body}
      <div class="cmdl-form__bar" data-cmdl-bar>
        <div class="cmdl-form__bar-main" data-cmdl-bar-main>
          <button type="submit" class="cmdl-btn cmdl-btn--run">${escapeHTML(submitLabel)}</button>
          <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
          ${jsonToggle}
          ${note}
        </div>${confirmRow}
      </div>
    </form>`;
}

function renderDetailBlock(entry: CatalogEntry): string {
  const execMode = str(entry.descriptor?.execution_mode);
  const mutating = entry.descriptor?.mutating === true;
  const summary = str(entry.descriptor?.summary);
  const chips: string[] = [];
  chips.push(`<span class="cmdl-chip">${escapeHTML(entry.group)}</span>`);
  if (execMode) {
    chips.push(`<span class="cmdl-chip cmdl-chip--${executionClass(execMode)}">${escapeHTML(execMode)}</span>`);
  }
  chips.push(
    mutating
      ? '<span class="cmdl-chip cmdl-chip--mutating">mutating</span>'
      : '<span class="cmdl-chip cmdl-chip--read">read-only</span>'
  );
  if (!entry.executable) {
    chips.push('<span class="cmdl-chip cmdl-chip--locked">no dispatch permission</span>');
  }

  let body: string;
  if (!entry.executable) {
    body = `<div class="cmdl-locked-note">You can view this command in the catalog, but you do not have permission to run it. Dispatch requires the command's own permission plus <code>admin.commands.dispatch</code>.</div>`;
  } else {
    const callout = mutating
      ? `<div class="cmdl-callout">
          <strong>This command writes data.</strong> Review the arguments before running — it confirms first, but the effect is not automatically reversible.
        </div>`
      : '';
    body = `${callout}${renderForm(entry)}`;
  }

  return `
    <div class="cmdl-cmd" data-cmdl-detail="${escapeHTML(entry.key)}" hidden>
      <div class="cmdl-cmd__head">
        <div class="cmdl-cmd__title">${escapeHTML(entry.commandId || entry.label)}</div>
        ${summary ? `<div class="cmdl-cmd__summary">${escapeHTML(summary)}</div>` : ''}
        <div class="cmdl-cmd__chips">${chips.join('')}</div>
      </div>
      ${body}
    </div>`;
}

function renderDiagnostics(diagnostics: DiagnosticLike[]): string {
  if (!diagnostics.length) {
    return '';
  }
  const rows = diagnostics
    .map((diagnostic) => {
      const severity = lower(diagnostic.severity) || 'info';
      const message = str(diagnostic.message);
      const code = str(diagnostic.code);
      return `
        <li class="cmdl-diag cmdl-diag--${escapeHTML(severity)}">
          <span class="cmdl-diag__sev">${escapeHTML(severity)}</span>
          <span class="cmdl-diag__msg">${escapeHTML(message)}${code ? ` <span class="cmdl-diag__code">${escapeHTML(code)}</span>` : ''}</span>
        </li>`;
    })
    .join('');
  return `<ul class="cmdl-diagnostics">${rows}</ul>`;
}

// ============================================================================
// Main console renderer
// ============================================================================

export function renderCommandLauncherConsole(ctx: ServerPanelConsoleRendererContext): string {
  const { def, data } = ctx;
  const { entries, diagnostics } = buildCatalog(def, data);
  const metadata = def.ui?.metadata && typeof def.ui.metadata === 'object' ? def.ui.metadata as Record<string, unknown> : {};
  const resolverAction = str(metadata.option_resolver_action);
  const resolverAttr = resolverAction ? ` data-cmdl-option-resolver="${escapeHTML(resolverAction)}"` : '';

  if (entries.length === 0) {
    return `
      <div class="cmdl" data-cmdl-root${resolverAttr}>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${renderDiagnostics(diagnostics)}
        <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
      </div>`;
  }

  const grouped = groupEntries(entries);
  const details = entries.map(renderDetailBlock).join('');

  return `
    <div class="cmdl" data-cmdl-root${resolverAttr}>
      <div class="cmdl__body" data-cmdl-body>
        ${renderList(grouped, entries.length)}
        <div class="cmdl__resizer" data-cmdl-resizer role="separator" aria-orientation="vertical"
          aria-label="Resize command list" tabindex="0"></div>
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${details}
          <!-- Result lives in the detail column (beside the list, below the form it
               belongs to) so it appears next to where the command was run, not as a
               full-width strip under the whole console. Empty == hidden via CSS. -->
          <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
        </section>
      </div>
      ${renderDiagnostics(diagnostics)}
    </div>`;
}

// ============================================================================
// Structured result (consumed by DebugPanel.renderStoredPanelActionResult)
// ============================================================================

// A go-errors style rich error envelope (the `error` object the server returns on
// failures). Everything is optional/defensive — only present fields render.
export type RichCommandErrorFrame = {
  func: string;
  funcTitle: string;
  loc: string;
  locTitle: string;
  app: boolean;
};

export type RichCommandError = {
  category: string;
  textCode: string;
  source: string;
  severity: string;
  timestamp: string;
  httpCode: string;
  metadata: Array<{ key: string; value: string }>;
  location: string;
  locationTitle: string;
  stackTrace: RichCommandErrorFrame[];
};

export type ParsedCommandResult = {
  kind: 'ok' | 'invalid' | 'error';
  message: string;
  code: string;
  correlationId: string;
  mode: string;
  dispatchId: string;
  statusReference: string;
  accepted: boolean | undefined;
  validationErrors: Array<{ path: string; message: string; code: string }>;
  richError: RichCommandError | null;
  hasRaw: boolean;
  rawJSON: string;
};

function pick(source: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
  }
  return '';
}

const RICH_ERROR_MARKERS = ['category', 'text_code', 'source', 'stack_trace', 'severity', 'location', 'metadata'];

// Locate the rich error object across the shapes failures arrive in: an HTTP
// error body `{ error: {...} }`, a structured `errors` field, or the object
// passed directly. Returns the first candidate carrying rich-error markers.
function findRichErrorObject(data: unknown, errors: unknown): Record<string, unknown> | null {
  const candidates: unknown[] = [];
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    candidates.push((data as Record<string, unknown>).error, data);
  }
  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    candidates.push((errors as Record<string, unknown>).error, errors);
  }
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const obj = candidate as Record<string, unknown>;
      if (RICH_ERROR_MARKERS.some((marker) => marker in obj)) {
        return obj;
      }
    }
  }
  return null;
}

// `github.com/goliatone/go-admin/admin.presentError` -> `admin.presentError`.
function shortFunc(fn: string): string {
  const slash = fn.lastIndexOf('/');
  return slash >= 0 ? fn.slice(slash + 1) : fn;
}

// Keep the last two path segments so frames stay readable (full path on hover).
function shortFile(file: string): string {
  const parts = file.split('/').filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join('/') : file;
}

function frameLine(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseRichError(obj: Record<string, unknown>): RichCommandError {
  const metaObj = obj.metadata && typeof obj.metadata === 'object' && !Array.isArray(obj.metadata)
    ? (obj.metadata as Record<string, unknown>)
    : {};
  const metadata = Object.entries(metaObj)
    .map(([key, value]) => ({ key, value: presentationString(value) || safeStringify(value) }))
    .filter((entry) => entry.value);

  const rawStack = Array.isArray(obj.stack_trace) ? (obj.stack_trace as Array<Record<string, unknown>>) : [];
  const stackTrace: RichCommandErrorFrame[] = rawStack
    .map((frame) => {
      const fn = str(frame.function);
      const file = str(frame.file);
      const line = frameLine(frame.line);
      return {
        func: shortFunc(fn),
        funcTitle: fn,
        loc: file ? `${shortFile(file)}${line ? `:${line}` : ''}` : '',
        locTitle: file ? `${file}${line ? `:${line}` : ''}` : '',
        // Frames outside the Go module cache are first-party (the operator's own
        // code) — the actionable ones, so they get highlighted.
        app: file !== '' && !file.includes('/pkg/mod/'),
      };
    })
    .filter((frame) => frame.func || frame.loc);

  const locObj = obj.location && typeof obj.location === 'object' && !Array.isArray(obj.location)
    ? (obj.location as Record<string, unknown>)
    : {};
  const locFile = str(locObj.file);
  const locFunc = str(locObj.function);
  const locLine = frameLine(locObj.line);
  const locShort = locFile ? `${shortFile(locFile)}${locLine ? `:${locLine}` : ''}` : '';
  const location = [shortFunc(locFunc), locShort ? `(${locShort})` : ''].filter(Boolean).join(' ');
  const locationTitle = [locFunc, locFile ? `${locFile}${locLine ? `:${locLine}` : ''}` : ''].filter(Boolean).join(' ');

  return {
    category: str(obj.category),
    textCode: str(obj.text_code),
    source: str(obj.source),
    severity: str(obj.severity),
    timestamp: str(obj.timestamp),
    httpCode: typeof obj.code === 'number' ? String(obj.code) : str(obj.code),
    metadata,
    location,
    locationTitle,
    stackTrace,
  };
}

export function extractCommandLauncherResult(
  status: 'ok' | 'error',
  message: string,
  data: unknown,
  errors?: Record<string, unknown>
): ParsedCommandResult {
  const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const receipt = d.receipt && typeof d.receipt === 'object' ? (d.receipt as Record<string, unknown>) : {};
  const rawValidation = Array.isArray(d.validation_errors) ? (d.validation_errors as Array<Record<string, unknown>>) : [];
  const validationErrors = rawValidation
    .map((entry) => ({
      path: str(entry.path),
      message: str(entry.message),
      code: str(entry.code),
    }))
    .filter((entry) => entry.message || entry.path);

  const acceptedRaw = receipt.Accepted ?? receipt.accepted;
  const accepted = typeof acceptedRaw === 'boolean' ? acceptedRaw : undefined;

  let kind: ParsedCommandResult['kind'] = 'ok';
  if (status === 'error') {
    kind = 'error';
  } else if (validationErrors.length > 0 || accepted === false) {
    kind = 'invalid';
  }

  const richErrorObject = kind === 'error' ? findRichErrorObject(data, errors) : null;
  const richError = richErrorObject ? parseRichError(richErrorObject) : null;

  let code = '';
  if (validationErrors.length > 0) {
    code = 'VALIDATION_ERROR';
  } else if (kind === 'error') {
    code = (richError && richError.textCode)
      || pick((errors || {}) as Record<string, unknown>, ['code', 'text_code'])
      || (richError ? richError.httpCode : '');
  }

  const hasRaw = data !== undefined && data !== null && (typeof data !== 'object' || Object.keys(d).length > 0);

  return {
    kind,
    message: str(message) || (kind === 'error' ? 'Command failed' : 'Command dispatched'),
    code,
    correlationId: pick(receipt, ['CorrelationID', 'correlation_id']),
    mode: pick(receipt, ['Mode', 'mode']),
    dispatchId: pick(receipt, ['DispatchID', 'dispatch_id']),
    statusReference: str(d.status_reference) || str((d as Record<string, unknown>).statusReference),
    accepted,
    validationErrors,
    richError,
    hasRaw,
    rawJSON: hasRaw ? safeStringify(data) : '',
  };
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '';
  }
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function formatClockTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString();
  } catch {
    return '';
  }
}

function metaChip(icon: string, label: string, value: string): string {
  if (!value) {
    return '';
  }
  return `<span class="cmdl-meta" title="${escapeHTML(label)}"><span class="cmdl-meta__k">${escapeHTML(icon)}</span>${escapeHTML(value)}</span>`;
}

export function renderCommandLauncherResultCard(
  parsed: ParsedCommandResult,
  options: { canRetry?: boolean; at?: number; durationMs?: number; liveStatus?: CommandLiveStatus } = {}
): string {
  const statusLabel = parsed.kind === 'error'
    ? 'Dispatch failed'
    : parsed.kind === 'invalid'
      ? (parsed.validationErrors.length ? 'Validation failed' : 'Not accepted')
      : 'Command dispatched';
  const codePill = parsed.code ? `<span class="cmdl-result__code">${escapeHTML(parsed.code)}</span>` : '';
  const live = options.liveStatus;
  const livePill = live
    ? `<span class="cmdl-result__live cmdl-result__live--${escapeHTML(live.state)}" title="Live status${live.at ? ` · ${escapeHTML(live.at)}` : ''}">${escapeHTML(live.state)}</span>`
    : '';

  const rich = parsed.richError;
  const meta = [
    metaChip('id', 'Correlation ID', parsed.correlationId),
    metaChip('mode', 'Execution mode', parsed.mode),
    metaChip('dispatch', 'Dispatch ID', parsed.dispatchId),
    metaChip('status', 'Status reference', parsed.statusReference),
    metaChip('took', 'Round-trip duration', typeof options.durationMs === 'number' ? formatDurationMs(options.durationMs) : ''),
    metaChip('at', 'Dispatched at', typeof options.at === 'number' && options.at > 0 ? formatClockTime(options.at) : ''),
    rich ? metaChip('category', 'Category', rich.category) : '',
    rich ? metaChip('severity', 'Severity', rich.severity) : '',
    rich ? metaChip('http', 'HTTP status', rich.httpCode) : '',
    ...(rich ? rich.metadata.map((entry) => metaChip(entry.key, entry.key, entry.value)) : []),
    rich ? metaChip('when', 'Timestamp', rich.timestamp) : '',
    rich ? metaChip('at', rich.locationTitle || 'Origin', rich.location) : '',
  ]
    .filter(Boolean)
    .join('');
  const metaRow = meta ? `<div class="cmdl-result__meta">${meta}</div>` : '';

  // The `source` is the underlying cause (often the real, actionable message);
  // surface it prominently when it adds something beyond the headline message.
  const cause = rich && rich.source && rich.source !== parsed.message
    ? `<div class="cmdl-result__cause"><span class="cmdl-result__cause-k">Cause</span><code class="cmdl-result__cause-v">${escapeHTML(rich.source)}</code></div>`
    : '';

  const trace = rich && rich.stackTrace.length
    ? `<details class="cmdl-result__trace"><summary>Stack trace · ${rich.stackTrace.length} frame${rich.stackTrace.length === 1 ? '' : 's'}</summary><ol class="cmdl-trace">${rich.stackTrace
        .map(
          (frame) =>
            `<li class="cmdl-trace__frame${frame.app ? ' cmdl-trace__frame--app' : ''}"><span class="cmdl-trace__fn" title="${escapeHTML(frame.funcTitle)}">${escapeHTML(frame.func)}</span>${frame.loc ? `<span class="cmdl-trace__loc" title="${escapeHTML(frame.locTitle)}">${escapeHTML(frame.loc)}</span>` : ''}</li>`
        )
        .join('')}</ol></details>`
    : '';

  const validation = parsed.validationErrors.length
    ? `<ul class="cmdl-result__validation">${parsed.validationErrors
        .map(
          (entry) =>
            `<li><span class="cmdl-result__path">${escapeHTML(entry.path || 'payload')}</span><span class="cmdl-result__vmsg">${escapeHTML(entry.message || entry.code)}</span></li>`
        )
        .join('')}</ul>`
    : '';

  const raw = parsed.hasRaw
    ? `<details class="cmdl-result__raw"><summary>Raw response</summary><pre>${escapeHTML(parsed.rawJSON)}</pre></details>`
    : '';
  const actions = options.canRetry
    ? `<div class="cmdl-result__actions"><button type="button" class="cmdl-btn cmdl-btn--ghost" data-cmdl-retry>Retry</button></div>`
    : '';

  return `
    <div class="cmdl-result__card cmdl-result__card--${parsed.kind}">
      <div class="cmdl-result__head">
        <span class="cmdl-result__status">${escapeHTML(statusLabel)}</span>
        ${codePill}${livePill}
        <button type="button" class="cmdl-result__dismiss" data-cmdl-dismiss aria-label="Dismiss result" title="Dismiss result">×</button>
      </div>
      <div class="cmdl-result__msg">${escapeHTML(parsed.message)}</div>
      ${cause}
      ${metaRow}
      ${validation}
      ${trace}
      ${actions}
      ${raw}
    </div>`;
}

// ============================================================================
// Interactions (called by DebugPanel after the panel HTML is mounted)
// ============================================================================

function selectCommand(root: HTMLElement, actionId: string): void {
  selectedActionId = actionId;
  const empty = root.querySelector<HTMLElement>('[data-cmdl-empty]');
  if (empty) {
    empty.hidden = Boolean(actionId);
  }
  root.querySelectorAll<HTMLElement>('[data-cmdl-detail]').forEach((block) => {
    block.hidden = block.dataset.cmdlDetail !== actionId;
  });
  root.querySelectorAll<HTMLElement>('[data-cmdl-item]').forEach((item) => {
    const active = item.dataset.cmdlItem === actionId;
    item.classList.toggle('cmdl-item--active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  const detail = root.querySelector<HTMLElement>(`[data-cmdl-detail="${attrValueEscape(actionId)}"]`);
  if (detail) {
    void refreshDynamicOptions(detail);
  }
}

function applyFilter(root: HTMLElement, term: string): void {
  const needle = term.trim().toLowerCase();
  let anyVisible = false;
  root.querySelectorAll<HTMLElement>('[data-cmdl-item]').forEach((item) => {
    const haystack = item.dataset.cmdlSearch || '';
    const visible = needle === '' || haystack.includes(needle);
    item.hidden = !visible;
    if (visible) {
      anyVisible = true;
    }
  });
  root.querySelectorAll<HTMLElement>('[data-cmdl-group]').forEach((group) => {
    const hasVisible = Array.from(group.querySelectorAll<HTMLElement>('[data-cmdl-item]')).some((item) => !item.hidden);
    group.hidden = !hasVisible;
  });
  const noresults = root.querySelector<HTMLElement>('[data-cmdl-noresults]');
  if (noresults) {
    noresults.hidden = anyVisible;
  }
}

function visibleItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-cmdl-item]')).filter((item) => !item.hidden);
}

function chipTokens(holder: HTMLElement): string[] {
  const hidden = holder.querySelector<HTMLInputElement>('[data-cmdl-chips-value]');
  if (!hidden || !hidden.value.trim()) {
    return [];
  }
  return hidden.value.split('\n').map((token) => token.trim()).filter(Boolean);
}

function renderChipTags(holder: HTMLElement, tokens: string[]): void {
  const tags = holder.querySelector<HTMLElement>('[data-cmdl-chips-tags]');
  const hidden = holder.querySelector<HTMLInputElement>('[data-cmdl-chips-value]');
  if (hidden) {
    hidden.value = tokens.join('\n');
  }
  if (tags) {
    tags.innerHTML = tokens
      .map(
        (token, index) =>
          `<span class="cmdl-chip-tag">${escapeHTML(token)}<button type="button" class="cmdl-chip-tag__x" data-cmdl-chip-remove="${index}" aria-label="Remove ${escapeHTML(token)}">×</button></span>`
      )
      .join('');
  }
  // Required list fields enforce validation on the visible entry input (a
  // required hidden input is exempt from HTML constraint validation): require it
  // only while there are no committed tokens.
  const entry = holder.querySelector<HTMLInputElement>('[data-cmdl-chips-entry]');
  if (entry) {
    entry.required = holder.dataset.cmdlChipsRequired === 'true' && tokens.length === 0;
  }
  const field = holder.closest<HTMLElement>('[data-cmdl-option-source]');
  field?.querySelectorAll<HTMLElement>('[data-cmdl-option-value]').forEach((option) => {
    option.classList.toggle('cmdl-option-choice--selected', tokens.includes(option.dataset.cmdlOptionValue || ''));
  });
}

const optionRequestVersions = new WeakMap<HTMLElement, number>();
const optionRefreshTimers = new WeakMap<HTMLElement, number>();

function setOptionStatus(field: HTMLElement, message: string, state = ''): void {
  const status = field.querySelector<HTMLElement>('[data-cmdl-option-status]');
  if (status) {
    status.textContent = message;
    status.dataset.state = state;
  }
}

function renderResolvedOptionChoices(items: ReturnType<typeof normalizedOptionItems>): string {
  return items.map((option) => `
    <button type="button" class="cmdl-option-choice" data-cmdl-option-value="${escapeHTML(option.value)}"
      ${option.disabled ? 'disabled' : ''}${option.description ? ` title="${escapeHTML(option.description)}"` : ''}>
      <span>${escapeHTML(option.label)}</span>${option.description ? `<small>${escapeHTML(option.description)}</small>` : ''}
    </button>`).join('');
}

function applyResolvedOptions(field: HTMLElement, rawItems: ServerActionOption[]): void {
  const items = normalizedOptionItems({ option_items: rawItems });
  const select = field.querySelector<HTMLSelectElement>('[data-cmdl-option-control]');
  if (select) {
    const previous = select.value;
    select.innerHTML = `<option value=""></option>${items.map((option) =>
      `<option value="${escapeHTML(option.value)}"${option.disabled ? ' disabled' : ''}${option.description ? ` data-option-description="${escapeHTML(option.description)}"` : ''}>${escapeHTML(option.label)}</option>`
    ).join('')}`;
    if (previous && !items.some((option) => option.value === previous)) {
      select.insertAdjacentHTML('beforeend', `<option value="${escapeHTML(previous)}" data-option-stale="true">${escapeHTML(previous)} (current)</option>`);
    }
    select.value = previous;
    select.disabled = items.length === 0;
  }
  let choices = field.querySelector<HTMLElement>('[data-cmdl-option-choices]');
  const chips = field.querySelector<HTMLElement>('[data-cmdl-chips]');
  if (chips && !choices) {
    choices = document.createElement('div');
    choices.className = 'cmdl-option-choices';
    choices.dataset.cmdlOptionChoices = '';
    chips.insertAdjacentElement('afterend', choices);
  }
  if (choices) {
    choices.innerHTML = renderResolvedOptionChoices(items);
    if (chips) renderChipTags(chips, chipTokens(chips));
  }
  setOptionStatus(field, items.length === 0 ? 'No options are currently available.' : `${items.length} option${items.length === 1 ? '' : 's'} available.`, items.length === 0 ? 'empty' : 'ready');
}

async function refreshDynamicOptionField(field: HTMLElement): Promise<void> {
  const root = field.closest<HTMLElement>('[data-cmdl-root]');
  const form = field.closest<HTMLElement>('[data-panel-action-form]');
  const debugPath = root?.dataset.cmdlDebugPath || '';
  const actionID = root?.dataset.cmdlOptionResolver || '';
  const commandID = form?.dataset.cmdlCommand || '';
  const fieldPath = field.dataset.cmdlOptionField || '';
  const sourceID = field.dataset.cmdlOptionSource || '';
  if (!root || !form || !debugPath || !actionID || !commandID || !fieldPath || !sourceID) {
    if (sourceID && (!debugPath || !actionID)) {
      setOptionStatus(field, 'Dynamic options are unavailable because no option resolver is configured.', 'error');
    }
    return;
  }
  const version = (optionRequestVersions.get(field) || 0) + 1;
  optionRequestVersions.set(field, version);
  setOptionStatus(field, 'Loading options…', 'loading');
  const control = field.querySelector<HTMLSelectElement>('[data-cmdl-option-control]');
  if (control) control.disabled = true;
  try {
    const response = await httpRequest(`${debugPath}/api/panels/${COMMAND_LAUNCHER_PANEL_ID}/actions/${encodeURIComponent(actionID)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command_id: commandID,
        field_path: fieldPath,
        source_id: sourceID,
        payload: collectFormPayload(form),
      }),
    });
    if (!response.ok) {
      const failure = await readHTTPErrorResult(response, `Options failed to load (${response.status})`, { appendStatusToFallback: false });
      throw new Error(failure.message);
    }
    const result = await readExpectedHTTPJSON<{ data?: { option_items?: ServerActionOption[]; options?: string[] } }>(response);
    if (optionRequestVersions.get(field) !== version) return;
    const rich = Array.isArray(result.data?.option_items) ? result.data!.option_items! : [];
    const legacy = Array.isArray(result.data?.options)
      ? result.data!.options!.map((value) => ({ value, label: value }))
      : [];
    applyResolvedOptions(field, rich.length > 0 ? rich : legacy);
  } catch (error) {
    if (optionRequestVersions.get(field) !== version) return;
    const message = error instanceof Error ? error.message : 'Options failed to load.';
    setOptionStatus(field, message, 'error');
    if (control) control.disabled = control.options.length <= 1;
  }
}

async function refreshDynamicOptions(scope: HTMLElement, dependency = ''): Promise<void> {
  const fields = Array.from(scope.querySelectorAll<HTMLElement>('[data-cmdl-option-source]'));
  await Promise.all(fields
    .filter((field) => {
      if (!dependency) return true;
      const dependencies = (field.dataset.cmdlOptionDepends || '').split(',').map(str).filter(Boolean);
      return dependencies.includes(dependency);
    })
    .map((field) => refreshDynamicOptionField(field)));
}

function scheduleDependentOptionRefresh(form: HTMLElement, dependency: string): void {
  form.querySelectorAll<HTMLElement>('[data-cmdl-option-source]').forEach((field) => {
    const dependencies = (field.dataset.cmdlOptionDepends || '').split(',').map(str).filter(Boolean);
    if (!dependencies.includes(dependency)) return;
    const existing = optionRefreshTimers.get(field);
    if (existing !== undefined) window.clearTimeout(existing);
    optionRefreshTimers.set(field, window.setTimeout(() => void refreshDynamicOptionField(field), 200));
  });
}

function readFieldDraftValue(field: HTMLElement): string {
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    return field.checked ? 'true' : 'false';
  }
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    return field.value;
  }
  return '';
}

function applyFieldDraftValue(field: HTMLElement, value: string): void {
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    field.checked = value === 'true';
    return;
  }
  if (field instanceof HTMLInputElement && field.dataset.cmdlChipsValue !== undefined) {
    const holder = field.closest<HTMLElement>('[data-cmdl-chips]');
    if (holder) {
      renderChipTags(holder, value ? value.split('\n').map((token) => token.trim()).filter(Boolean) : []);
    } else {
      field.value = value;
    }
    return;
  }
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value;
  }
}

function captureFormDraft(form: HTMLElement): void {
  const actionId = lower(form.dataset.actionId || '');
  if (!actionId) {
    return;
  }
  const draft: Record<string, string> = {};
  form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    const name = str(field.dataset.actionField);
    if (name) {
      draft[name] = readFieldDraftValue(field);
    }
  });
  formDrafts.set(actionId, draft);
}

function captureFormFor(el: HTMLElement): void {
  const form = el.closest<HTMLElement>('[data-panel-action-form]');
  if (form) {
    captureFormDraft(form);
  }
}

function applyFormDraft(form: HTMLElement): void {
  const actionId = lower(form.dataset.actionId || '');
  const draft = actionId ? formDrafts.get(actionId) : undefined;
  if (!draft) {
    return;
  }
  form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    const name = str(field.dataset.actionField);
    if (name && Object.prototype.hasOwnProperty.call(draft, name)) {
      applyFieldDraftValue(field, draft[name]);
    }
  });
}

// Commit any text left in a chip entry (typed but not yet turned into a token)
// before the payload is read, so unfinished input is not silently dropped.
function flushPendingChips(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-cmdl-chips]').forEach((holder) => {
    const entry = holder.querySelector<HTMLInputElement>('[data-cmdl-chips-entry]');
    if (entry && entry.value.trim()) {
      addChipTokens(holder, entry.value);
      entry.value = '';
    }
  });
}

// ============================================================================
// Recent & saved invocations (Phase 3 T12) — client-local, defensive storage
// ============================================================================

const RECENT_LIMIT = 6;

function launcherStorage(): Storage | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function readInvocationStore(key: string): Array<Record<string, unknown>> {
  const store = launcherStorage();
  if (!store) {
    return [];
  }
  try {
    const raw = store.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeInvocationStore(key: string, value: unknown): void {
  const store = launcherStorage();
  if (!store) {
    return;
  }
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable or over quota — recall is best-effort.
  }
}

function recentKey(commandId: string): string {
  return `cmdl:recent:${commandId}`;
}
function presetKey(commandId: string): string {
  return `cmdl:preset:${commandId}`;
}

// Record a dispatched invocation (its inner field payload) for quick recall.
export function recordCommandLauncherInvocation(envelope: unknown): void {
  const data = envelope && typeof envelope === 'object' ? (envelope as Record<string, unknown>) : {};
  const commandId = str(data.command_id);
  const inner = data.payload && typeof data.payload === 'object' ? (data.payload as Record<string, unknown>) : {};
  if (!commandId || Object.keys(inner).length === 0) {
    return;
  }
  const key = recentKey(commandId);
  const signature = JSON.stringify(inner);
  const existing = readInvocationStore(key).filter((entry) => JSON.stringify(entry.payload) !== signature);
  existing.unshift({ at: Date.now(), payload: inner });
  writeInvocationStore(key, existing.slice(0, RECENT_LIMIT));
}

function readActionFieldValue(field: HTMLElement): unknown {
  const kind = lower(field.dataset.actionFieldKind);
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    return field.checked;
  }
  const raw = field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement ? field.value.trim() : '';
  if (raw === '') {
    return undefined;
  }
  if (kind === 'number' || kind === 'integer') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  if (kind === 'string_list' || kind === 'array') {
    return raw.split(/[\n,]/g).map((token) => token.trim()).filter(Boolean);
  }
  if (kind === 'json' || kind === 'object') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

// Read the active form's inner field payload (skips the suspended JSON editor).
function collectFormPayload(form: HTMLElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    // Skip the inactive editor (a hidden ancestor inside the form) but not the
    // whole detail block when the command happens to be unselected.
    const hidden = field.closest('[hidden]');
    if (hidden && form.contains(hidden)) {
      return;
    }
    const name = str(field.dataset.actionField);
    if (!name || name.startsWith('__')) {
      return;
    }
    const value = readActionFieldValue(field);
    if (value !== undefined) {
      out[name] = value;
    }
  });
  return out;
}

function applyLoadedValue(field: HTMLElement, value: unknown): void {
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    field.checked = value === true || value === 'true';
    return;
  }
  if (field instanceof HTMLInputElement && field.dataset.cmdlChipsValue !== undefined) {
    const tokens = Array.isArray(value) ? value.map(str).filter(Boolean) : str(value) ? [str(value)] : [];
    const holder = field.closest<HTMLElement>('[data-cmdl-chips]');
    if (holder) {
      renderChipTags(holder, tokens);
    }
    return;
  }
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    if (value === undefined || value === null) {
      field.value = '';
    } else if (typeof value === 'object') {
      field.value = JSON.stringify(value, null, 2);
    } else {
      field.value = String(value);
    }
  }
}

function loadInvocationIntoForm(form: HTMLElement, inner: Record<string, unknown>): void {
  form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    const name = str(field.dataset.actionField);
    if (name && Object.prototype.hasOwnProperty.call(inner, name)) {
      applyLoadedValue(field, inner[name]);
    }
  });
  captureFormDraft(form);
}

function renderRecallBar(container: HTMLElement): void {
  const commandId = str(container.dataset.cmdlCommand);
  const list = container.querySelector<HTMLElement>('[data-cmdl-recall-list]');
  if (!commandId || !list) {
    return;
  }
  const recents = readInvocationStore(recentKey(commandId));
  const presets = readInvocationStore(presetKey(commandId));
  const chips: string[] = [];
  recents.forEach((_entry, index) => {
    chips.push(`<button type="button" class="cmdl-recall__chip" data-cmdl-load="recent:${index}" title="Reload recent invocation ${index + 1}">↻ recent ${index + 1}</button>`);
  });
  presets.forEach((entry, index) => {
    const name = str(entry.name) || `preset ${index + 1}`;
    chips.push(`<span class="cmdl-recall__preset"><button type="button" class="cmdl-recall__chip cmdl-recall__chip--preset" data-cmdl-load="preset:${index}" title="Load saved preset">★ ${escapeHTML(name)}</button><button type="button" class="cmdl-recall__del" data-cmdl-del-preset="${index}" aria-label="Delete preset ${escapeHTML(name)}">×</button></span>`);
  });
  list.innerHTML = chips.length ? chips.join('') : '<span class="cmdl-recall__empty">No recent runs yet.</span>';
}

function handleRecallAction(target: HTMLElement, root: HTMLElement): boolean {
  const loadBtn = target.closest<HTMLElement>('[data-cmdl-load]');
  if (loadBtn) {
    const form = loadBtn.closest<HTMLElement>('[data-panel-action-form]');
    const container = loadBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    const [kind, rawIndex] = (loadBtn.dataset.cmdlLoad || '').split(':');
    const index = Number(rawIndex);
    if (form && commandId && Number.isInteger(index)) {
      const store = readInvocationStore(kind === 'preset' ? presetKey(commandId) : recentKey(commandId));
      const inner = store[index]?.payload;
      if (inner && typeof inner === 'object') {
        loadInvocationIntoForm(form, inner as Record<string, unknown>);
      }
    }
    return true;
  }

  const saveBtn = target.closest<HTMLElement>('[data-cmdl-save-preset]');
  if (saveBtn) {
    const form = saveBtn.closest<HTMLElement>('[data-panel-action-form]');
    const container = saveBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    if (form && container && commandId) {
      const name = (typeof window !== 'undefined' && typeof window.prompt === 'function' ? window.prompt('Preset name') : '') || '';
      if (name.trim()) {
        const presets = readInvocationStore(presetKey(commandId)).filter((entry) => str(entry.name) !== name.trim());
        presets.unshift({ name: name.trim(), payload: collectFormPayload(form) });
        writeInvocationStore(presetKey(commandId), presets);
        renderRecallBar(container);
      }
    }
    return true;
  }

  const delBtn = target.closest<HTMLElement>('[data-cmdl-del-preset]');
  if (delBtn) {
    const container = delBtn.closest<HTMLElement>('[data-cmdl-recall]');
    const commandId = str(container?.dataset.cmdlCommand);
    const index = Number(delBtn.dataset.cmdlDelPreset);
    if (container && commandId && Number.isInteger(index)) {
      const presets = readInvocationStore(presetKey(commandId));
      presets.splice(index, 1);
      writeInvocationStore(presetKey(commandId), presets);
      renderRecallBar(container);
    }
    return true;
  }
  return false;
}

// ============================================================================
// JSON ↔ form power mode (Phase 3 T13)
// ============================================================================

function setJsonMode(form: HTMLElement, on: boolean): void {
  const fields = form.querySelector<HTMLElement>('[data-cmdl-fields]');
  const jsonBox = form.querySelector<HTMLElement>('[data-cmdl-json]');
  const editor = form.querySelector<HTMLTextAreaElement>('[data-cmdl-json-editor]');
  const toggle = form.querySelector<HTMLElement>('[data-cmdl-json-toggle]');
  const error = form.querySelector<HTMLElement>('[data-cmdl-json-error]');
  if (!fields || !jsonBox || !editor) {
    return;
  }
  if (on) {
    editor.value = JSON.stringify(collectFormPayload(form), null, 2);
    if (error) {
      error.hidden = true;
    }
    fields.hidden = true;
    jsonBox.hidden = false;
    form.dataset.cmdlMode = 'json';
    if (toggle) {
      toggle.textContent = 'Form';
    }
    return;
  }
  // JSON → form: parse and apply; stay in JSON mode on invalid input.
  let parsed: unknown;
  try {
    parsed = editor.value.trim() ? JSON.parse(editor.value) : {};
  } catch (err) {
    if (error) {
      error.textContent = `Invalid JSON: ${(err as Error).message}`;
      error.hidden = false;
    }
    return;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    if (error) {
      error.textContent = 'Payload must be a JSON object.';
      error.hidden = false;
    }
    return;
  }
  loadInvocationIntoForm(form, parsed as Record<string, unknown>);
  fields.hidden = false;
  jsonBox.hidden = true;
  form.dataset.cmdlMode = 'form';
  if (toggle) {
    toggle.textContent = 'JSON';
  }
}

function addChipTokens(holder: HTMLElement, raw: string): void {
  const additions = raw.split(/[\n,]/g).map((token) => token.trim()).filter(Boolean);
  if (additions.length === 0) {
    return;
  }
  const tokens = chipTokens(holder);
  additions.forEach((token) => {
    if (!tokens.includes(token)) {
      tokens.push(token);
    }
  });
  renderChipTags(holder, tokens);
}

function initChips(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-cmdl-chips]').forEach((holder) => {
    renderChipTags(holder, chipTokens(holder));
  });
}

// ============================================================================
// Master-list resize (app-shell splitter)
// ============================================================================

function readStoredSidebarWidth(): number {
  const store = launcherStorage();
  if (!store) {
    return 0;
  }
  try {
    const raw = Number(store.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(raw) && raw >= SIDEBAR_MIN_PX ? raw : 0;
  } catch {
    return 0;
  }
}

// Upper bound keeps a usable detail column; falls back when layout width is not
// yet measurable (e.g. before first paint or in a headless DOM).
function sidebarMaxWidth(body: HTMLElement): number {
  const available = body.clientWidth || 0;
  return available > 0 ? Math.max(SIDEBAR_MIN_PX, available - DETAIL_MIN_PX) : SIDEBAR_MAX_FALLBACK_PX;
}

function applySidebarWidth(body: HTMLElement, width: number): number {
  const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN_PX), sidebarMaxWidth(body));
  sidebarWidth = clamped;
  body.style.setProperty('--cmdl-sidebar-w', `${clamped}px`);
  const store = launcherStorage();
  if (store) {
    try {
      store.setItem(SIDEBAR_WIDTH_KEY, String(clamped));
    } catch {
      // best-effort persistence
    }
  }
  return clamped;
}

function restoreSidebarWidth(body: HTMLElement): void {
  if (!sidebarWidth) {
    sidebarWidth = readStoredSidebarWidth();
  }
  if (sidebarWidth) {
    body.style.setProperty('--cmdl-sidebar-w', `${sidebarWidth}px`);
  }
}

// The panel re-renders innerHTML on every snapshot, so the splitter is re-wired
// (and the persisted width re-applied) on each attach, like the selection/filter.
function wireSidebarResizer(root: HTMLElement): void {
  const resizer = root.querySelector<HTMLElement>('[data-cmdl-resizer]');
  const body = root.querySelector<HTMLElement>('[data-cmdl-body]');
  if (!resizer || !body) {
    return;
  }
  restoreSidebarWidth(body);

  resizer.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth || SIDEBAR_DEFAULT_PX;
    if (typeof resizer.setPointerCapture === 'function') {
      try { resizer.setPointerCapture(event.pointerId); } catch { /* capture unsupported */ }
    }
    const onMove = (move: PointerEvent) => applySidebarWidth(body, startWidth + (move.clientX - startX));
    const onUp = (up: PointerEvent) => {
      applySidebarWidth(body, startWidth + (up.clientX - startX));
      resizer.removeEventListener('pointermove', onMove);
      resizer.removeEventListener('pointerup', onUp);
      resizer.removeEventListener('pointercancel', onUp);
    };
    resizer.addEventListener('pointermove', onMove);
    resizer.addEventListener('pointerup', onUp);
    resizer.addEventListener('pointercancel', onUp);
  });

  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }
    event.preventDefault();
    const current = sidebarWidth || SIDEBAR_DEFAULT_PX;
    applySidebarWidth(body, current + (event.key === 'ArrowRight' ? SIDEBAR_KEYBOARD_STEP_PX : -SIDEBAR_KEYBOARD_STEP_PX));
  });
}

// ============================================================================
// Inline command confirmation (replaces the native window.confirm dialog)
// ============================================================================

function setConfirmRow(form: HTMLElement, show: boolean): void {
  const main = form.querySelector<HTMLElement>('[data-cmdl-bar-main]');
  const confirmRow = form.querySelector<HTMLElement>('[data-cmdl-confirm-row]');
  if (!main || !confirmRow) {
    return;
  }
  main.hidden = show;
  confirmRow.hidden = !show;
  const focusTarget = show
    ? confirmRow.querySelector<HTMLElement>('[data-cmdl-confirm-run]')
    : main.querySelector<HTMLElement>('button');
  if (focusTarget && typeof focusTarget.focus === 'function') {
    try { focusTarget.focus(); } catch { /* focus best-effort */ }
  }
}

export function attachCommandLauncherListeners(container: HTMLElement, options: { debugPath?: string } = {}): void {
  const root = container.querySelector<HTMLElement>('[data-cmdl-root]');
  if (!root) {
    return;
  }
  root.dataset.cmdlDebugPath = str(options.debugPath);

  initChips(root);

  // Re-apply the persisted master-list width and re-wire the resize handle.
  wireSidebarResizer(root);

  // Rehydrate in-progress form drafts so a re-render does not wipe input.
  root.querySelectorAll<HTMLElement>('[data-panel-action-form]').forEach((form) => applyFormDraft(form));

  // Populate recent/preset recall bars from client-local storage.
  root.querySelectorAll<HTMLElement>('[data-cmdl-recall]').forEach((bar) => renderRecallBar(bar));

  // Restore filter text and the previously selected command across re-renders.
  const filter = root.querySelector<HTMLInputElement>('[data-cmdl-filter]');
  if (filter && filterText) {
    filter.value = filterText;
    applyFilter(root, filterText);
  }
  if (selectedActionId && root.querySelector(`[data-cmdl-item="${attrValueEscape(selectedActionId)}"]`)) {
    selectCommand(root, selectedActionId);
  }

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    // Recent/preset recall + JSON power-mode toggle (Phase 3 T12/T13).
    if (handleRecallAction(target, root)) {
      return;
    }
    const jsonToggle = target.closest<HTMLElement>('[data-cmdl-json-toggle]');
    if (jsonToggle) {
      const form = jsonToggle.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        setJsonMode(form, form.dataset.cmdlMode !== 'json');
      }
      return;
    }

    // Inline confirmation: arm the form so the submit gate lets this dispatch
    // through. Do NOT preventDefault — the button is type=submit and the native
    // submit must proceed to the host dispatcher.
    const confirmRun = target.closest<HTMLElement>('[data-cmdl-confirm-run]');
    if (confirmRun) {
      const form = confirmRun.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        form.dataset.cmdlArmed = 'true';
      }
      return;
    }
    const cancelConfirm = target.closest<HTMLElement>('[data-cmdl-cancel]');
    if (cancelConfirm) {
      const form = cancelConfirm.closest<HTMLElement>('[data-panel-action-form]');
      if (form) {
        delete form.dataset.cmdlArmed;
        setConfirmRow(form, false);
      }
      return;
    }

    const item = target.closest<HTMLElement>('[data-cmdl-item]');
    if (item) {
      selectCommand(root, item.dataset.cmdlItem || '');
      return;
    }

    const toggle = target.closest<HTMLElement>('[data-cmdl-section-toggle]');
    if (toggle) {
      const fieldset = toggle.closest<HTMLElement>('.cmdl-section');
      if (fieldset) {
        const collapsed = fieldset.classList.toggle('cmdl-section--collapsed');
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      }
      return;
    }

    const remove = target.closest<HTMLElement>('[data-cmdl-chip-remove]');
    if (remove) {
      const holder = remove.closest<HTMLElement>('[data-cmdl-chips]');
      if (holder) {
        const tokens = chipTokens(holder);
        const index = Number(remove.dataset.cmdlChipRemove);
        if (Number.isInteger(index)) {
          tokens.splice(index, 1);
          renderChipTags(holder, tokens);
          captureFormFor(holder);
        }
      }
    }

    const optionChoice = target.closest<HTMLElement>('[data-cmdl-option-value]');
    if (optionChoice && !optionChoice.hasAttribute('disabled')) {
      const field = optionChoice.closest<HTMLElement>('[data-cmdl-option-source], .cmdl-field--list');
      const holder = field?.querySelector<HTMLElement>('[data-cmdl-chips]');
      const value = optionChoice.dataset.cmdlOptionValue || '';
      if (holder && value) {
        const tokens = chipTokens(holder);
        const index = tokens.indexOf(value);
        if (index >= 0) tokens.splice(index, 1); else tokens.push(value);
        renderChipTags(holder, tokens);
        captureFormFor(holder);
      }
    }
  });

  if (filter) {
    filter.addEventListener('input', () => {
      filterText = filter.value;
      applyFilter(root, filter.value);
    });
    filter.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        const first = visibleItems(root)[0];
        if (first) {
          event.preventDefault();
          if (event.key === 'Enter') {
            selectCommand(root, first.dataset.cmdlItem || '');
          } else {
            first.focus();
          }
        }
      }
    });
  }

  // Persist field edits to the draft store so they survive a re-render.
  const captureFromEvent = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const field = target?.closest<HTMLElement>('[data-action-field]');
    if (field) {
      captureFormFor(field);
      const form = field.closest<HTMLElement>('[data-panel-action-form]');
      const dependency = str(field.dataset.actionField) || str(field.dataset.actionFieldPath).replace(/^payload\./, '');
      if (form && dependency) scheduleDependentOptionRefresh(form, dependency);
      if (field instanceof HTMLSelectElement) {
        const description = field.selectedOptions[0]?.dataset.optionDescription || '';
        const output = field.closest<HTMLElement>('.cmdl-field')?.querySelector<HTMLElement>('[data-cmdl-option-description]');
        if (output) output.textContent = description;
      }
    }
  };
  root.addEventListener('input', captureFromEvent);
  root.addEventListener('change', captureFromEvent);

  // Capture phase runs before the form's own bubble-phase submit handler (the
  // host dispatcher), so this is where the launcher gates and prepares a submit.
  root.addEventListener('submit', (event) => {
    const target = event.target as HTMLElement | null;
    const form = target?.closest<HTMLElement>('[data-panel-action-form]');
    if (!form) {
      return;
    }
    // Inline confirmation gate: the first submit of a confirm-required command
    // reveals the Confirm/Cancel row instead of dispatching. Pressing Enter in a
    // field reaches this same path, so the confirmation cannot be bypassed.
    if (form.dataset.cmdlConfirm === 'true' && form.dataset.cmdlArmed !== 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
      setConfirmRow(form, true);
      return;
    }
    // Armed (or no confirmation needed): commit pending chip text, snapshot the
    // draft, then let the host dispatch. Reset the inline confirm UI so a later
    // run on the same (un-refreshed) form re-confirms.
    flushPendingChips(form);
    captureFormDraft(form);
    if (form.dataset.cmdlConfirm === 'true') {
      delete form.dataset.cmdlArmed;
      setConfirmRow(form, false);
    }
  }, true);

  root.addEventListener('keydown', (event) => {
    const target = event.target as HTMLElement;

    const toggle = target.closest<HTMLElement>('[data-cmdl-section-toggle]');
    if (toggle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return;
    }

    const entry = target.closest<HTMLInputElement>('[data-cmdl-chips-entry]');
    if (entry) {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        const holder = entry.closest<HTMLElement>('[data-cmdl-chips]');
        if (holder) {
          addChipTokens(holder, entry.value);
          entry.value = '';
          captureFormFor(holder);
        }
      } else if (event.key === 'Backspace' && entry.value === '') {
        const holder = entry.closest<HTMLElement>('[data-cmdl-chips]');
        if (holder) {
          const tokens = chipTokens(holder);
          tokens.pop();
          renderChipTags(holder, tokens);
          captureFormFor(holder);
        }
      }
      return;
    }

    const item = target.closest<HTMLElement>('[data-cmdl-item]');
    if (item && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const items = visibleItems(root);
      const index = items.indexOf(item);
      const next = items[event.key === 'ArrowDown' ? index + 1 : index - 1];
      if (next) {
        next.focus();
      } else if (event.key === 'ArrowUp' && filter) {
        filter.focus();
      }
      return;
    }
    if (item && event.key === 'Enter') {
      event.preventDefault();
      selectCommand(root, item.dataset.cmdlItem || '');
    }
  });

  root.addEventListener('paste', (event) => {
    const target = event.target as HTMLElement;
    const entry = target.closest<HTMLInputElement>('[data-cmdl-chips-entry]');
    if (!entry) {
      return;
    }
    const text = event.clipboardData?.getData('text') || '';
    if (/[\n,]/.test(text)) {
      event.preventDefault();
      const holder = entry.closest<HTMLElement>('[data-cmdl-chips]');
      if (holder) {
        addChipTokens(holder, text);
        entry.value = '';
        captureFormFor(holder);
      }
    }
  });

  // After a native form reset, drop the saved draft and re-sync chips to defaults.
  root.addEventListener('reset', (event) => {
    const form = event.target as HTMLElement;
    const actionId = lower(form.dataset.actionId || '');
    if (actionId) {
      formDrafts.delete(actionId);
    }
    window.setTimeout(() => {
      form.querySelectorAll<HTMLElement>('[data-cmdl-chips]').forEach((holder) => {
        renderChipTags(holder, chipTokens(holder));
      });
    }, 0);
  });
}

// Escape a value for use inside a double-quoted attribute selector. CSS.escape
// targets identifier context and would corrupt quoted values such as `cmd:foo`,
// so only backslashes and double quotes need escaping here.
function attrValueEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

// Register the console override for the command launcher panel. Importing this
// module (the console bundle does, via debug-panel) wires the override before
// server panel hydration runs.
registerServerPanelConsoleRenderer(COMMAND_LAUNCHER_PANEL_ID, renderCommandLauncherConsole);
