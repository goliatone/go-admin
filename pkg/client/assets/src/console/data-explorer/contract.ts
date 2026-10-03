// Data explorer wire contract. Mirrors data/exploration.go (frozen in the
// explorer DESIGN); every response is untrusted JSON, so the normalizers below
// keep only the declared shape, clamp lists to the service caps and reject a
// response whose selection is not the exact selection that was requested.

export type ExploreContext = 'catalog_example' | 'prepared' | 'active';

export const EXPLORE_CONTEXTS: readonly ExploreContext[] = ['catalog_example', 'prepared', 'active'];

export type DatasetRef = { provider: string; id: string; version: string; digest: string };

export type ScenarioRef = { dataset: DatasetRef; id: string; version: string; profile_hash: string };

export type ExploreSelection = {
  dataset: DatasetRef;
  scenario: ScenarioRef;
  target_id: string;
  context: ExploreContext;
  receipt_id?: string;
  content_revision?: number;
  generation?: number;
};

export type ExploreState = 'available' | 'unsupported' | 'empty' | 'suppressed';
export type ExploreCompleteness = 'complete' | 'partial' | 'unknown';

export type ExploreEnvelope = {
  selection: ExploreSelection;
  presentation_revision: string;
  observed_at: string;
  provenance: 'example' | 'observed' | 'unknown';
  completeness: ExploreCompleteness;
  state: ExploreState;
  reason: string;
};

export type ExploreFieldType = 'string' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime';

export type ExploreField = { id: string; label: string; description: string; type: ExploreFieldType; unit: string };

export type ExploreRelationship = { id: string; label: string; entity_id: string };

export type ExploreEntity = {
  id: string;
  label: string;
  description: string;
  fields: ExploreField[];
  relationships: ExploreRelationship[];
};

export type ExploreScenario = { scenario: ScenarioRef; title: string; summary: string; expected_outcomes: string[] };

export type ExploreCountScope = 'catalog_inventory' | 'selected_scenario';

export type ExploreCount = { entity_id: string; scope: ExploreCountScope; total: number | null };

export type ExplorePeriod = { start: string; end: string; timezone: string };

export type ExplorePhase = 'prepare' | 'verify' | 'activate';

export type ExploreEffect = { phase: ExplorePhase; description: string };

export type ExploreUsageKind = 'screen' | 'report' | 'workflow' | 'target';

export type ExploreUsage = { surface_id: string; kind: ExploreUsageKind; label: string; effects: ExploreEffect[]; href: string };

export type ExploreMetadata = ExploreEnvelope & {
  title: string;
  summary: string;
  origin: string;
  entities: ExploreEntity[];
  scenarios: ExploreScenario[];
  inventory: ExploreCount[];
  period: ExplorePeriod | null;
  prerequisites: string[];
  attribution: string[];
  usages: ExploreUsage[];
  usage_completeness: ExploreCompleteness;
};

export type ExploreCellState = 'value' | 'null' | 'unknown' | 'redacted';

export type ExploreCell = { state: ExploreCellState; value: string | number | boolean | null };

export type ExploreRow = { record_key: string; cells: Record<string, ExploreCell> };

export type ExploreSamples = ExploreEnvelope & {
  entity_id: string;
  columns: ExploreField[];
  rows: ExploreRow[];
  total: number | null;
  next_cursor: string | null;
  sampling_method: string;
};

/** Service caps (data/exploration.go); responses beyond them are malformed. */
export const EXPLORE_LIMITS = {
  entities: 16,
  fields: 32,
  relationships: 16,
  scenarios: 32,
  inventory: 16,
  usages: 32,
  effects: 3,
  columns: 32,
  rows: 100,
  sampleDefault: 25,
  sampleMax: 100,
  cursorBytes: 512,
  idBytes: 128,
} as const;

const STATES: readonly ExploreState[] = ['available', 'unsupported', 'empty', 'suppressed'];
export const COMPLETENESS: readonly ExploreCompleteness[] = ['complete', 'partial', 'unknown'];
const FIELD_TYPES: readonly ExploreFieldType[] = ['string', 'integer', 'number', 'boolean', 'date', 'datetime'];
const SCOPES: readonly ExploreCountScope[] = ['catalog_inventory', 'selected_scenario'];
const PHASES: readonly ExplorePhase[] = ['prepare', 'verify', 'activate'];
const USAGE_KINDS: readonly ExploreUsageKind[] = ['screen', 'report', 'workflow', 'target'];
const CELL_STATES: readonly ExploreCellState[] = ['value', 'null', 'unknown', 'redacted'];

type Raw = Record<string, unknown>;

export function isRecord(value: unknown): value is Raw {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const candidate = str(value) as T;
  return allowed.includes(candidate) ? candidate : null;
}

function counter(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function strings(value: unknown, limit = 64): string[] {
  return Array.isArray(value) ? value.map(str).filter(Boolean).slice(0, limit) : [];
}

/** Parsed list within `limit`, or null when malformed or over the cap (never silently truncated). */
export function list<T>(value: unknown, limit: number, parse: (item: unknown) => T | null): T[] | null {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > limit) return null;
  const out: T[] = [];
  for (const item of value) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

export function parseDatasetRef(value: unknown): DatasetRef | null {
  if (!isRecord(value)) return null;
  const ref = { provider: str(value.provider), id: str(value.id), version: str(value.version), digest: str(value.digest) };
  return ref.provider && ref.id && ref.version && ref.digest ? ref : null;
}

export function parseScenarioRef(value: unknown): ScenarioRef | null {
  if (!isRecord(value)) return null;
  const dataset = parseDatasetRef(value.dataset);
  const ref = { id: str(value.id), version: str(value.version), profile_hash: str(value.profile_hash) };
  return dataset && ref.id && ref.version && ref.profile_hash ? { dataset, ...ref } : null;
}

function sameDataset(left: DatasetRef, right: DatasetRef): boolean {
  return left.provider === right.provider && left.id === right.id && left.version === right.version && left.digest === right.digest;
}

/** Exact selection (the service validates it again); null when incomplete. */
export function parseSelection(value: unknown): ExploreSelection | null {
  if (!isRecord(value)) return null;
  const dataset = parseDatasetRef(value.dataset);
  const scenario = parseScenarioRef(value.scenario);
  const context = oneOf(value.context, EXPLORE_CONTEXTS);
  const target = str(value.target_id);
  if (!dataset || !scenario || !context || !target || !sameDataset(dataset, scenario.dataset)) return null;
  const selection: ExploreSelection = { dataset, scenario, target_id: target, context };
  if (context === 'catalog_example') return selection;
  const receipt = str(value.receipt_id);
  const revision = counter(value.content_revision);
  if (!receipt || !revision) return null;
  selection.receipt_id = receipt;
  selection.content_revision = revision;
  if (context === 'active') {
    const generation = counter(value.generation);
    if (generation === null) return null;
    selection.generation = generation;
  }
  return selection;
}

/** Canonical selection identity used for caches and late-response checks. */
export function selectionKey(selection: ExploreSelection): string {
  const { dataset, scenario } = selection;
  return JSON.stringify([
    selection.context, selection.target_id,
    dataset.provider, dataset.id, dataset.version, dataset.digest,
    scenario.id, scenario.version, scenario.profile_hash,
    selection.receipt_id || '', selection.content_revision ?? 0, selection.generation ?? -1,
  ]);
}

/** Wire form of a selection: exactly the frozen fields, nothing the server did not issue. */
export function selectionWire(selection: ExploreSelection): Raw {
  const wire: Raw = { dataset: selection.dataset, scenario: selection.scenario, target_id: selection.target_id, context: selection.context };
  if (selection.context !== 'catalog_example') {
    wire.receipt_id = selection.receipt_id;
    wire.content_revision = selection.content_revision;
  }
  if (selection.context === 'active') wire.generation = selection.generation;
  return wire;
}

/** Envelope for exactly `expected`, or null when malformed or foreign. */
export function parseEnvelope(value: Raw, expected: ExploreSelection): ExploreEnvelope | null {
  const selection = parseSelection(value.selection);
  const state = oneOf(value.state, STATES);
  const completeness = oneOf(value.completeness, COMPLETENESS);
  // A response for any other selection is a late or foreign answer.
  if (!selection || selectionKey(selection) !== selectionKey(expected) || !state || !completeness) return null;
  const provenance = str(value.provenance);
  return {
    selection,
    presentation_revision: str(value.presentation_revision),
    observed_at: str(value.observed_at),
    provenance: provenance === 'example' || provenance === 'observed' ? provenance : 'unknown',
    completeness,
    state,
    reason: str(value.reason),
  };
}

function parseField(value: unknown): ExploreField | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const type = oneOf(value.type, FIELD_TYPES);
  if (!id || !type) return null;
  return { id, label: str(value.label) || id, description: str(value.description), type, unit: str(value.unit) };
}

function parseRelationship(value: unknown): ExploreRelationship | null {
  if (!isRecord(value)) return null;
  const relationship = { id: str(value.id), label: str(value.label), entity_id: str(value.entity_id) };
  return relationship.id && relationship.entity_id ? { ...relationship, label: relationship.label || relationship.id } : null;
}

function parseEntity(value: unknown): ExploreEntity | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const fields = list(value.fields, EXPLORE_LIMITS.fields, parseField);
  const relationships = list(value.relationships, EXPLORE_LIMITS.relationships, parseRelationship);
  if (!id || !fields || !relationships) return null;
  return { id, label: str(value.label) || id, description: str(value.description), fields, relationships };
}

function parseScenario(value: unknown): ExploreScenario | null {
  if (!isRecord(value)) return null;
  const scenario = parseScenarioRef(value.scenario);
  if (!scenario) return null;
  return { scenario, title: str(value.title), summary: str(value.summary), expected_outcomes: strings(value.expected_outcomes, 32) };
}

function parseCount(value: unknown): ExploreCount | null {
  if (!isRecord(value)) return null;
  const entity = str(value.entity_id);
  const scope = oneOf(value.scope, SCOPES);
  if (!entity || !scope) return null;
  // A missing or malformed total is unknown, never zero.
  return { entity_id: entity, scope, total: counter(value.total) };
}

function parseEffect(value: unknown): ExploreEffect | null {
  if (!isRecord(value)) return null;
  const phase = oneOf(value.phase, PHASES);
  return phase ? { phase, description: str(value.description) } : null;
}

export function parseUsage(value: unknown): ExploreUsage | null {
  if (!isRecord(value)) return null;
  const surface = str(value.surface_id);
  const kind = oneOf(value.kind, USAGE_KINDS);
  const effects = list(value.effects, EXPLORE_LIMITS.effects, parseEffect);
  if (!surface || !kind || !effects) return null;
  return { surface_id: surface, kind, label: str(value.label) || surface, effects, href: str(value.href) };
}

function parsePeriod(value: unknown): ExplorePeriod | null {
  if (!isRecord(value)) return null;
  const period = { start: str(value.start), end: str(value.end), timezone: str(value.timezone) };
  return period.start || period.end ? period : null;
}

/** Metadata for exactly `expected`, or null when malformed or foreign. */
export function parseMetadata(value: unknown, expected: ExploreSelection): ExploreMetadata | null {
  if (!isRecord(value)) return null;
  const envelope = parseEnvelope(value, expected);
  const entities = list(value.entities, EXPLORE_LIMITS.entities, parseEntity);
  const scenarios = list(value.scenarios, EXPLORE_LIMITS.scenarios, parseScenario);
  const inventory = list(value.inventory, EXPLORE_LIMITS.inventory, parseCount);
  const usages = list(value.usages, EXPLORE_LIMITS.usages, parseUsage);
  if (!envelope || !entities || !scenarios || !inventory || !usages) return null;
  return {
    ...envelope,
    title: str(value.title),
    summary: str(value.summary),
    origin: str(value.origin),
    entities,
    scenarios,
    inventory,
    period: parsePeriod(value.period),
    prerequisites: strings(value.prerequisites),
    attribution: strings(value.attribution),
    usages,
    usage_completeness: oneOf(value.usage_completeness, COMPLETENESS) || 'unknown',
  };
}

function parseCellValue(value: unknown): string | number | boolean | null | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

function parseCell(value: unknown): ExploreCell | null {
  if (!isRecord(value)) return null;
  const state = oneOf(value.state, CELL_STATES);
  const parsed = parseCellValue(value.value);
  if (!state || parsed === undefined) return null;
  // Only a value cell carries data; withheld cells never reveal one.
  return { state, value: state === 'value' ? parsed : null };
}

function parseRow(value: unknown, columns: ExploreField[]): ExploreRow | null {
  if (!isRecord(value) || !isRecord(value.cells)) return null;
  const key = str(value.record_key);
  if (!key) return null;
  const cells: Record<string, ExploreCell> = {};
  for (const column of columns) {
    const cell = parseCell(value.cells[column.id]);
    // An absent cell is unknown: missing data never reads as null or empty.
    cells[column.id] = cell || { state: 'unknown', value: null };
  }
  return { record_key: key, cells };
}

/**
 * Samples for exactly `expected` and one of `entities` (a related read answers
 * with the related entity, or the source entity when it is unsupported or
 * suppressed), or null when malformed or foreign.
 */
export function parseSamples(value: unknown, expected: ExploreSelection, entities: readonly string[]): ExploreSamples | null {
  if (!isRecord(value)) return null;
  const envelope = parseEnvelope(value, expected);
  const columns = list(value.columns, EXPLORE_LIMITS.columns, parseField);
  const entity = str(value.entity_id);
  if (!envelope || !columns || !entity || !entities.includes(entity)) return null;
  const rows = list(value.rows, EXPLORE_LIMITS.rows, (row) => parseRow(row, columns));
  if (!rows) return null;
  const cursor = str(value.next_cursor);
  return {
    ...envelope,
    entity_id: entity,
    columns,
    rows,
    total: counter(value.total),
    next_cursor: cursor && cursor.length <= EXPLORE_LIMITS.cursorBytes ? cursor : null,
    sampling_method: str(value.sampling_method),
  };
}
