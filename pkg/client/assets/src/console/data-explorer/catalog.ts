// Explorer catalog: datasets and their scenarios, built only from rows the
// actor already received in the authorized Explore and Scenarios panels. The
// server projects each scenario row's exact selections; the browser never
// assembles lifecycle identity from display text.

import {
  EXPLORE_CONTEXTS,
  isRecord,
  parseSelection,
  str,
  type ExploreContext,
  type ExploreSelection,
} from './contract.js';

export type CatalogScenario = {
  key: string;
  datasetKey: string;
  /** Lifecycle title (the declared scenario title, else `ready v1`) until richer metadata names it. */
  label: string;
  scenarioId: string;
  version: string;
  targetId: string;
  status: string;
  statusLabel: string;
  active: boolean;
  receiptId: string;
  contentRevision: number | null;
  selections: Partial<Record<ExploreContext, ExploreSelection>>;
};

export type CatalogDataset = {
  key: string;
  /** Lifecycle title (the declared dataset title, else `provider/id vN`) until richer metadata names it. */
  label: string;
  provider: string;
  datasetId: string;
  version: string;
  digest: string;
  origin: string;
  synthetic: boolean;
  timezone: string;
  records: string;
  prerequisites: string;
  declaredScenarios: number;
  scenarios: CatalogScenario[];
};

function rows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.filter(isRecord);
  return isRecord(value) ? [value] : [];
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

/** Row-level contexts; the active one comes only from the Overview, with its generation. */
const ROW_CONTEXTS: readonly ExploreContext[] = ['catalog_example', 'prepared'];

function scenarioSelections(row: Record<string, unknown>): CatalogScenario['selections'] {
  const out: CatalogScenario['selections'] = {};
  const declared = isRecord(row.explore) ? row.explore : {};
  ROW_CONTEXTS.forEach((context) => {
    const selection = parseSelection(declared[context]);
    if (selection && selection.context === context) out[context] = selection;
  });
  return out;
}

/** A selection belongs to the dataset row it is grouped under, exactly. */
function belongsTo(selection: ExploreSelection, dataset: CatalogDataset): boolean {
  const ref = selection.dataset;
  return ref.provider === dataset.provider && ref.id === dataset.datasetId && ref.version === dataset.version
    && dataset.digest.length > 0 && ref.digest.startsWith(dataset.digest);
}

function catalogScenario(row: Record<string, unknown>): CatalogScenario | null {
  const key = str(row.key);
  const datasetKey = str(row.dataset_key);
  if (!key || !datasetKey) return null;
  const revision = row.content_revision;
  return {
    key,
    datasetKey,
    label: str(row.label) || str(row.scenario_id) || key,
    scenarioId: str(row.scenario_id),
    version: str(row.version),
    targetId: str(row.target_id),
    status: str(row.status),
    statusLabel: str(row.status_label),
    active: row.active === true,
    receiptId: str(row.receipt_id),
    contentRevision: typeof revision === 'number' && Number.isSafeInteger(revision) && revision > 0 ? revision : null,
    selections: scenarioSelections(row),
  };
}

function catalogDataset(row: Record<string, unknown>): CatalogDataset | null {
  const key = str(row.key);
  if (!key) return null;
  return {
    key,
    label: str(row.label) || key,
    provider: str(row.provider),
    datasetId: str(row.dataset_id),
    version: str(row.version),
    digest: str(row.digest),
    origin: str(row.origin),
    synthetic: row.synthetic === true,
    timezone: str(row.timezone),
    records: str(row.records),
    prerequisites: str(row.prerequisites),
    declaredScenarios: count(row.scenarios),
    scenarios: [],
  };
}

/** Active selections the Overview projects for targets whose active receipt it shows. */
function activeSelections(overview: unknown): ExploreSelection[] {
  const summary = rows(overview)[0] || {};
  const targets = Array.isArray(summary.targets) ? summary.targets.filter(isRecord) : [];
  return targets
    .map((target) => parseSelection(target.explore_active))
    .filter((selection): selection is ExploreSelection => selection !== null && selection.context === 'active');
}

/**
 * The active selection the Overview projects for `targetId`, whatever dataset
 * it serves, or undefined while the target shows no active receipt.
 */
export function targetActiveSelection(overview: unknown, targetId: string): ExploreSelection | undefined {
  return activeSelections(overview).find((selection) => selection.target_id === targetId);
}

/**
 * The active selection of an active scenario row: same dataset, scenario,
 * target and receipt as the row's own selections, at the projected generation.
 */
function attachActive(scenario: CatalogScenario, active: ExploreSelection[]): void {
  const reference = scenario.selections.prepared || scenario.selections.catalog_example;
  if (!scenario.active || !reference) return;
  const match = active.find((selection) => selection.target_id === reference.target_id
    && selection.receipt_id === scenario.receiptId
    && selection.scenario.id === reference.scenario.id
    && selection.scenario.version === reference.scenario.version
    && selection.scenario.profile_hash === reference.scenario.profile_hash
    && selection.dataset.digest === reference.dataset.digest);
  if (match) scenario.selections.active = match;
}

/**
 * Datasets in catalog order, each with its authorized scenario rows. Scenario
 * rows whose dataset row is not visible are dropped (fail closed). The
 * Overview supplies the active selection (with its generation) of active rows.
 */
export function buildCatalog(datasets: unknown, scenarios: unknown, overview?: unknown): CatalogDataset[] {
  const active = activeSelections(overview);
  const catalog: CatalogDataset[] = [];
  const byKey = new Map<string, CatalogDataset>();
  rows(datasets).forEach((row) => {
    const dataset = catalogDataset(row);
    if (dataset && !byKey.has(dataset.key)) {
      byKey.set(dataset.key, dataset);
      catalog.push(dataset);
    }
  });
  rows(scenarios).forEach((row) => {
    const scenario = catalogScenario(row);
    const dataset = scenario ? byKey.get(scenario.datasetKey) : undefined;
    if (!scenario || !dataset || dataset.scenarios.some((existing) => existing.key === scenario.key)) return;
    attachActive(scenario, active);
    // Drop any selection that does not pin this dataset version (fail closed).
    EXPLORE_CONTEXTS.forEach((context) => {
      const selection = scenario.selections[context];
      if (selection && !belongsTo(selection, dataset)) delete scenario.selections[context];
    });
    dataset.scenarios.push(scenario);
  });
  return catalog;
}

/** The scenario whose catalog example describes the dataset on its card. */
export function cardScenario(dataset: CatalogDataset): CatalogScenario | undefined {
  return dataset.scenarios.find((scenario) => scenario.selections.catalog_example);
}

/** Contexts this scenario can be explored in, in declared order. */
export function scenarioContexts(scenario: CatalogScenario | undefined): ExploreContext[] {
  return scenario ? EXPLORE_CONTEXTS.filter((context) => Boolean(scenario.selections[context])) : [];
}
