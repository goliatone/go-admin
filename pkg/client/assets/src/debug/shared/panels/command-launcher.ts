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
  default?: unknown;
  display_hints?: Record<string, unknown>;
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
  const description = str(field.description) || str(field.help);
  const units = presentationString(field.display_hints?.units);
  const helpParts = [
    description ? `<span>${escapeHTML(description)}</span>` : '',
    units ? `<span class="cmdl-field__units">Units: ${escapeHTML(units)}</span>` : '',
  ].filter(Boolean);
  const help = helpParts.length ? `<small class="cmdl-field__help">${helpParts.join(' ')}</small>` : '';
  const options = Array.isArray(field.options) ? field.options.map(str).filter(Boolean) : [];
  const requiredAttr = required ? ' required' : '';
  const baseAttrs = `id="${escapeHTML(fieldId)}" data-action-field="${escapeHTML(name)}" data-action-field-kind="${escapeHTML(kind)}" data-action-field-path="${escapeHTML(payloadPath)}"${requiredAttr}`;
  const errorSmall = `<small class="cmdl-field__error" data-action-field-error="${escapeHTML(payloadPath)}" data-action-field-name="${escapeHTML(name)}" data-action-id="${escapeHTML(actionId)}" hidden></small>`;

  // Boolean → full-width toggle row.
  if (isBooleanKind(kind)) {
    const checked = field.default === true ? ' checked' : '';
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--bool">
        <label class="cmdl-toggle">
          <input type="checkbox" ${baseAttrs}${checked}>
          <span class="cmdl-toggle__track" aria-hidden="true"></span>
          <span class="cmdl-toggle__text">${escapeHTML(label)}${reqMark}</span>
        </label>
        ${help}${errorSmall}
      </div>`;
  }

  let control = '';
  if (options.length > 0 || kind === 'select') {
    const defaultValue = scalarAttr(field.default);
    control = `<select ${baseAttrs}><option value=""></option>${options
      .map((option) => `<option value="${escapeHTML(option)}"${option === defaultValue ? ' selected' : ''}>${escapeHTML(option)}</option>`)
      .join('')}</select>`;
  } else if (kind === 'number' || kind === 'integer') {
    const valueAttr = scalarAttr(field.default);
    control = `<input type="number" ${baseAttrs}${placeholderAttr}${valueAttr ? ` value="${escapeHTML(valueAttr)}"` : ''}>`;
  } else if (kind === 'string_list' || kind === 'array') {
    const defaults = Array.isArray(field.default) ? (field.default as unknown[]).map(str).filter(Boolean) : [];
    const entryPlaceholder = placeholder || 'Add a value, press Enter';
    return `
      <div class="cmdl-field cmdl-field--full cmdl-field--list">
        <label class="cmdl-field__label" for="${escapeHTML(fieldId)}">${escapeHTML(label)}${reqMark}</label>
        <div class="cmdl-chips" data-cmdl-chips${required ? ' data-cmdl-chips-required="true"' : ''}>
          <span class="cmdl-chips__tags" data-cmdl-chips-tags></span>
          <input type="text" id="${escapeHTML(fieldId)}" class="cmdl-chips__entry" data-cmdl-chips-entry
            placeholder="${escapeHTML(entryPlaceholder)}" autocomplete="off" spellcheck="false">
          <input type="hidden" data-action-field="${escapeHTML(name)}" data-action-field-kind="string_list"
            data-action-field-path="${escapeHTML(payloadPath)}"
            data-cmdl-chips-value value="${escapeHTML(defaults.join('\n'))}">
        </div>
        ${help}${errorSmall}
      </div>`;
  } else if (kind === 'json' || kind === 'object' || kind === 'textarea') {
    const defaultText = field.default !== undefined && field.default !== null ? JSON.stringify(field.default, null, 2) : '';
    control = `<textarea ${baseAttrs}${placeholderAttr} rows="3">${escapeHTML(defaultText)}</textarea>`;
  } else {
    const valueAttr = scalarAttr(field.default);
    control = `<input type="text" ${baseAttrs}${placeholderAttr}${valueAttr ? ` value="${escapeHTML(valueAttr)}"` : ''}>`;
  }

  return `
    <div class="cmdl-field">
      <label class="cmdl-field__label" for="${escapeHTML(fieldId)}">${escapeHTML(label)}${reqMark}</label>
      ${control}
      ${help}${errorSmall}
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
    body = sections
      .map((section) => {
        const html = renderSection(section, entry.actionId, index);
        index += section.fields.length;
        return html;
      })
      .join('');
  }

  const note = mutating
    ? '<span class="cmdl-form__note">Confirms before running</span>'
    : '';

  return `
    <form class="cmdl-form" data-panel-action-form
      data-panel-id="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"
      data-action-id="${escapeHTML(entry.actionId)}"
      data-action-confirm="${escapeHTML(confirm)}"
      data-action-requires-confirm="${requiresConfirm ? 'true' : 'false'}"
      data-action-payload='${serializePayloadAttr(action.payload)}'>
      ${body}
      <div class="cmdl-form__bar">
        <button type="submit" class="cmdl-btn cmdl-btn--run">${escapeHTML(submitLabel)}</button>
        <button type="reset" class="cmdl-btn cmdl-btn--ghost">Reset</button>
        ${note}
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

  if (entries.length === 0) {
    return `
      <div class="cmdl" data-cmdl-root>
        <div class="cmdl__empty-panel">No commands are available to run.</div>
        ${renderDiagnostics(diagnostics)}
        <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
      </div>`;
  }

  const grouped = groupEntries(entries);
  const details = entries.map(renderDetailBlock).join('');

  return `
    <div class="cmdl" data-cmdl-root>
      <div class="cmdl__body">
        ${renderList(grouped, entries.length)}
        <section class="cmdl__detail" data-cmdl-detailcol>
          <div class="cmdl-detail__empty" data-cmdl-empty>Select a command from the list to configure and run it.</div>
          ${details}
        </section>
      </div>
      ${renderDiagnostics(diagnostics)}
      <div class="cmdl-result" data-panel-action-result="${escapeHTML(COMMAND_LAUNCHER_PANEL_ID)}"></div>
    </div>`;
}

// ============================================================================
// Structured result (consumed by DebugPanel.renderStoredPanelActionResult)
// ============================================================================

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

  let code = '';
  if (validationErrors.length > 0) {
    code = 'VALIDATION_ERROR';
  } else if (kind === 'error') {
    code = pick((errors || {}) as Record<string, unknown>, ['code', 'text_code']);
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

  const meta = [
    metaChip('id', 'Correlation ID', parsed.correlationId),
    metaChip('mode', 'Execution mode', parsed.mode),
    metaChip('dispatch', 'Dispatch ID', parsed.dispatchId),
    metaChip('status', 'Status reference', parsed.statusReference),
    metaChip('took', 'Round-trip duration', typeof options.durationMs === 'number' ? formatDurationMs(options.durationMs) : ''),
    metaChip('at', 'Dispatched at', typeof options.at === 'number' && options.at > 0 ? formatClockTime(options.at) : ''),
  ]
    .filter(Boolean)
    .join('');
  const metaRow = meta ? `<div class="cmdl-result__meta">${meta}</div>` : '';

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
      </div>
      <div class="cmdl-result__msg">${escapeHTML(parsed.message)}</div>
      ${metaRow}
      ${validation}
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

export function attachCommandLauncherListeners(container: HTMLElement): void {
  const root = container.querySelector<HTMLElement>('[data-cmdl-root]');
  if (!root) {
    return;
  }

  initChips(root);

  // Rehydrate in-progress form drafts so a re-render does not wipe input.
  root.querySelectorAll<HTMLElement>('[data-panel-action-form]').forEach((form) => applyFormDraft(form));

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
    }
  };
  root.addEventListener('input', captureFromEvent);
  root.addEventListener('change', captureFromEvent);

  // Commit pending chip text (typed but not yet tokenized) before the payload is
  // read. Capture phase runs before the form's own bubble-phase submit handler.
  root.addEventListener('submit', (event) => {
    const target = event.target as HTMLElement | null;
    const form = target?.closest<HTMLElement>('[data-panel-action-form]');
    if (form) {
      flushPendingChips(form);
      captureFormDraft(form);
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
