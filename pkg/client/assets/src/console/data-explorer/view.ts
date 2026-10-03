// Explorer markup. Pure string renderers over the controller's view model:
// every value is escaped, hashes stay under Technical identity, catalog
// examples never read as observed data and missing metadata reads as unknown
// (never zero or empty). Reuses the shared console card, key/value, table,
// badge and callout vocabulary; `console-explorer*` classes add layout only.

import { escapeAttribute, escapeHTML } from '../format.js';
import { renderRelativeTime, renderToneBadge } from '../schema/rich.js';
import { consoleStyleConfig } from '../style-config.js';
import type { CatalogDataset, CatalogScenario } from './catalog.js';
import type {
  ExploreContext,
  ExploreCount,
  ExploreEntity,
  ExploreMetadata,
  ExploreScenario,
  ExploreSelection,
  ExploreUsage,
} from './contract.js';
import type { ExplorerFailure } from './transport.js';

export type MetadataEntry =
  | { status: 'loading' }
  | { status: 'ready'; value: ExploreMetadata }
  | { status: 'failed'; failure: ExplorerFailure };

export type ExplorerSection = 'about' | 'contents' | 'insights' | 'compare' | 'usage' | 'app-preview' | 'scenarios' | 'evidence';

/** Sections rendered by the on-demand insights module. */
export type InsightsSectionID = Extract<ExplorerSection, 'insights' | 'compare'>;

/** How the pinned selection differs from the current snapshot ('' when it does not). */
export type ExplorerDrift = '' | 'changed' | 'unavailable';

export const EXPLORER_SECTIONS: ReadonlyArray<{ id: ExplorerSection; label: string }> = [
  { id: 'about', label: 'About' },
  { id: 'contents', label: 'Contents' },
  { id: 'usage', label: 'Used by' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'evidence', label: 'Evidence' },
];

export const INSIGHTS_SECTIONS: ReadonlyArray<{ id: InsightsSectionID; label: string }> = [
  { id: 'insights', label: 'Insights' },
  { id: 'compare', label: 'Compare' },
];

export function isInsightsSection(section: string): section is InsightsSectionID {
  return section === 'insights' || section === 'compare';
}

/** The section rendered by the on-demand application preview module. */
export const APP_PREVIEW_SECTION: { id: ExplorerSection; label: string } = { id: 'app-preview', label: 'App preview' };

/**
 * Detail sections; Insights and Compare follow Contents when the page offers
 * insights, and App preview follows Used by when it offers previews.
 */
export function explorerSections(insights: boolean, preview = false): ReadonlyArray<{ id: ExplorerSection; label: string }> {
  if (!insights && !preview) return EXPLORER_SECTIONS;
  const out: Array<{ id: ExplorerSection; label: string }> = [];
  EXPLORER_SECTIONS.forEach((section) => {
    out.push(section);
    if (insights && section.id === 'contents') out.push(...INSIGHTS_SECTIONS);
    if (preview && section.id === 'usage') out.push(APP_PREVIEW_SECTION);
  });
  return out;
}

export type CatalogModel = {
  scope: string;
  configured: boolean;
  datasets: CatalogDataset[];
  cards: Map<string, MetadataEntry | undefined>;
  /** Datasets with a scenario whose catalog example can be read. */
  explorable: Set<string>;
  limit: number;
};

export type DetailsModel = {
  scope: string;
  configured: boolean;
  dataset: CatalogDataset;
  /** The picked scenario row; undefined when it left the catalog. */
  scenario: CatalogScenario | undefined;
  scenarioKey: string;
  context: ExploreContext;
  /** The pinned selection the details show. */
  selection: ExploreSelection | undefined;
  drift: ExplorerDrift;
  /** What the snapshot offers now for the picked scenario and context. */
  current: ExploreSelection | undefined;
  section: ExplorerSection;
  entry: MetadataEntry | undefined;
  /** Page URL that server-resolved usage links must share an origin with. */
  base: string;
  /** Technical identity disclosure is open (kept across re-renders). */
  identityOpen?: boolean;
  /** Record preview of one entity, owned by the controller. */
  preview?: (entity: ExploreEntity) => string;
  /** Detail sections in tab order (defaults to the descriptive sections). */
  sections?: ReadonlyArray<{ id: ExplorerSection; label: string }>;
  /** Insights and Compare bodies for the pinned selection, owned by the controller. */
  insights?: (section: InsightsSectionID) => string;
  /** App preview body for the pinned prepared selection, owned by the controller. */
  appPreview?: () => string;
};

const styles = consoleStyleConfig;

export const CONTEXT_LABELS: Record<ExploreContext, string> = {
  catalog_example: 'Catalog example',
  prepared: 'Prepared receipt',
  active: 'Active data',
};

const SCOPE_LABELS: Record<ExploreCount['scope'], string> = {
  catalog_inventory: 'Catalog inventory',
  selected_scenario: 'Selected scenario',
};

export const USAGE_KIND_LABELS: Record<ExploreUsage['kind'], string> = {
  screen: 'Screen',
  report: 'Report',
  workflow: 'Workflow',
  target: 'Managed target',
};

const STATUS_TONES: Record<string, string> = {
  active: 'success',
  verified: 'info',
  stale_verification: 'warning',
  verification_failed: 'error',
  prepared: 'neutral',
  not_prepared: 'neutral',
};

const FAILURE_MESSAGES: Record<ExplorerFailure['kind'], string> = {
  unconfigured: 'Exploration is not available on this installation.',
  invalid: 'This selection could not be read. Choose the scenario again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'You do not have access to explore this selection.',
  gone: 'This selection is no longer available. Choose a current scenario or context.',
  stale: 'The data changed since this view loaded. Refresh to explore the current state.',
  unavailable: 'Exploration is temporarily unavailable.',
  timeout: 'The request took too long.',
  network: 'The request could not reach the server.',
  malformed: 'The server returned details this page cannot read.',
  failed: 'Exploration failed.',
  canceled: 'The request was canceled.',
};

const RETRYABLE = new Set<ExplorerFailure['kind']>(['unavailable', 'timeout', 'network', 'malformed', 'failed', 'canceled']);

const UNKNOWN = '<span class="console-kv__empty">Unknown</span>';

function muted(text: string): string {
  return `<span class="console-muted">${escapeHTML(text)}</span>`;
}

function badge(label: string, tone = ''): string {
  return renderToneBadge(label, tone, styles);
}

function copyValue(raw: string, label: string): string {
  if (!raw) return UNKNOWN;
  const shown = raw.length > 16 ? `${raw.slice(0, 12)}…` : raw;
  const title = shown === raw ? '' : ` title="${escapeAttribute(raw)}"`;
  return `<span class="console-kv__copy" data-copy-content="${escapeAttribute(raw)}"><code class="console-kv__mono"${title}>${escapeHTML(shown)}</code><button type="button" class="${styles.copyBtnSm} console-kv__copy-btn" data-copy-trigger title="${escapeAttribute(`Copy ${label}`)}" aria-label="${escapeAttribute(`Copy ${label}`)}">Copy</button></span>`;
}

function kv(rows: Array<[string, string]>): string {
  return `<dl class="console-kv">${rows.map(([label, value]) => `<dt>${escapeHTML(label)}</dt><dd>${value}</dd>`).join('')}</dl>`;
}

function textList(values: string[], empty: string): string {
  if (values.length === 0) return muted(empty);
  return `<ul class="console-explorer__list">${values.map((value) => `<li>${escapeHTML(value)}</li>`).join('')}</ul>`;
}

/** The metadata to present, or undefined while loading, failed or withheld. */
export function availableMetadata(entry: MetadataEntry | undefined): ExploreMetadata | undefined {
  if (entry?.status !== 'ready') return undefined;
  return entry.value.state === 'available' || entry.value.state === 'empty' ? entry.value : undefined;
}

/** Declared title, else the lifecycle label. Never the raw dataset ID of an unsupported reply. */
export function datasetTitle(dataset: CatalogDataset, entry: MetadataEntry | undefined): string {
  return availableMetadata(entry)?.title || dataset.label;
}

function declaredScenario(metadata: ExploreMetadata | undefined, scenario: CatalogScenario): ExploreScenario | undefined {
  const selection = scenario.selections.catalog_example;
  if (!metadata || !selection) return undefined;
  return metadata.scenarios.find((declared) => declared.scenario.id === selection.scenario.id
    && declared.scenario.version === selection.scenario.version
    && declared.scenario.profile_hash === selection.scenario.profile_hash);
}

export function scenarioTitle(metadata: ExploreMetadata | undefined, scenario: CatalogScenario): string {
  return declaredScenario(metadata, scenario)?.title || scenario.label;
}

function statusBadge(scenario: CatalogScenario): string {
  return scenario.statusLabel ? badge(scenario.statusLabel, STATUS_TONES[scenario.status] || 'neutral') : '';
}

/** Lifecycle status label and tone of a scenario row, when it names one. */
export function scenarioStatus(scenario: CatalogScenario | undefined): { label: string; tone: string } | undefined {
  return scenario?.statusLabel ? { label: scenario.statusLabel, tone: STATUS_TONES[scenario.status] || 'neutral' } : undefined;
}

function summaryText(entry: MetadataEntry | undefined, configured: boolean, explorable = true): string {
  if (!configured) return muted('No description available.');
  // Nothing will be read: the description is unknown, never pending.
  if (!explorable && !entry) return muted('Description unknown: no scenario of this dataset can be explored.');
  if (!entry || entry.status === 'loading') return '<span class="console-muted" aria-busy="true">Loading description…</span>';
  if (entry.status === 'failed') return muted('Description unavailable.');
  switch (entry.value.state) {
    case 'unsupported': return muted('No description provided by this dataset’s provider.');
    case 'suppressed': return muted('Description hidden by policy.');
    default: return entry.value.summary ? escapeHTML(entry.value.summary) : muted('No description provided.');
  }
}

// ---------------------------------------------------------------------------
// Catalog

function renderCardScenarios(dataset: CatalogDataset, metadata: ExploreMetadata | undefined): string {
  if (dataset.scenarios.length === 0) return muted('None available');
  return `<ul class="console-explorer__chips">${dataset.scenarios.map((scenario) => `<li><span>${escapeHTML(scenarioTitle(metadata, scenario))}</span>${statusBadge(scenario)}</li>`).join('')}</ul>`;
}

function renderCard(dataset: CatalogDataset, model: CatalogModel): string {
  const entry = model.cards.get(dataset.key);
  const metadata = availableMetadata(entry);
  const title = datasetTitle(dataset, entry);
  return `
    <article class="console-card console-explorer__card" data-row-key="${escapeAttribute(dataset.key)}" aria-labelledby="${escapeAttribute(`${model.scope}-card-${dataset.key}`)}">
      <header class="console-card__top">
        <span class="console-card__eyebrow">${escapeHTML(dataset.origin || 'Dataset')}</span>
        ${dataset.version ? `<code class="console-kv__mono console-explorer__version">v${escapeHTML(dataset.version)}</code>` : ''}
      </header>
      <h4 class="console-card__title" id="${escapeAttribute(`${model.scope}-card-${dataset.key}`)}">${escapeHTML(title)}</h4>
      <p class="console-card__subtitle console-explorer__summary">${summaryText(entry, model.configured, model.explorable.has(dataset.key))}</p>
      <dl class="console-card__meta console-explorer__card-meta">
        <div><dt>Scenarios</dt><dd>${renderCardScenarios(dataset, metadata)}</dd></div>
        <div><dt>Catalog inventory</dt><dd>${dataset.records && dataset.records !== 'None' ? escapeHTML(dataset.records) : UNKNOWN}</dd></div>
      </dl>
      <footer class="console-card__foot">
        ${dataset.provider ? muted(`Provider ${dataset.provider}`) : '<span></span>'}
        <button type="button" class="console-btn console-btn--sm" data-explorer-action="open" data-dataset-key="${escapeAttribute(dataset.key)}" data-explorer-focus="${escapeAttribute(`open:${dataset.key}`)}" aria-label="${escapeAttribute(`View details for ${title}`)}">View details</button>
      </footer>
    </article>
  `;
}

export function renderCatalog(model: CatalogModel): string {
  const shown = model.datasets.slice(0, model.limit);
  const hidden = model.datasets.length - shown.length;
  const notice = model.configured
    ? ''
    : '<div class="console-callout" data-tone="info"><p>Descriptions, sample records and declared usage are not offered on this installation. Cards show lifecycle details only.</p></div>';
  const body = model.datasets.length === 0
    ? '<div class="console-empty">No datasets are available to explore.</div>'
    : `<div class="console-cards console-explorer__cards">${shown.map((dataset) => renderCard(dataset, model)).join('')}</div>`;
  const more = hidden > 0
    ? `<div class="console-explorer__more"><button type="button" class="console-btn" data-explorer-action="more">Show ${hidden} more</button></div>`
    : '';
  return `
    <section class="console-card-section console-explorer__catalog" aria-labelledby="${escapeAttribute(`${model.scope}-catalog`)}">
      <div class="console-json-header console-section-header"><div class="console-section-heading"><h3 class="console-json-title" id="${escapeAttribute(`${model.scope}-catalog`)}">Explore datasets</h3><p class="console-section-description">Descriptions and declared usage come from each dataset’s provider. Counts are catalog inventory unless labelled otherwise.</p></div></div>
      ${notice}${body}${more}
    </section>
  `;
}

// ---------------------------------------------------------------------------
// Details

function contextNote(selection: ExploreSelection | undefined, context: ExploreContext, scenario: CatalogScenario | undefined): string {
  if (!selection) return 'This scenario cannot be explored in this context.';
  switch (context) {
    case 'prepared':
      return scenario?.selections.active?.receipt_id === selection.receipt_id
        ? `Prepared receipt ${selection.receipt_id} (content revision ${selection.content_revision}) on ${selection.target_id}: observed in its immutable prepared stage. This receipt is the active one; choose Active data to read what the target serves.`
        : `Prepared receipt ${selection.receipt_id} (content revision ${selection.content_revision}) on ${selection.target_id}: observed in the prepared stage. It is not active.`;
    case 'active':
      return `Active on ${selection.target_id} at generation ${selection.generation} (receipt ${selection.receipt_id}): observed in the data the target serves.`;
    default:
      return 'Catalog example: what the provider declares this scenario contains. It is not observed data and has not been verified.';
  }
}

function contextUnavailable(context: ExploreContext, scenario: CatalogScenario | undefined): string {
  if (!scenario) return 'Choose a scenario first.';
  if (context === 'prepared') return 'No prepared receipt for this scenario.';
  if (context === 'active') return scenario.targetId ? `This scenario is not active on ${scenario.targetId}.` : 'This scenario is not active.';
  return 'This scenario has no explorable target.';
}

function renderScenarioPicker(model: DetailsModel, metadata: ExploreMetadata | undefined): string {
  const options = model.dataset.scenarios.map((scenario) => {
    const selected = scenario.key === model.scenario?.key ? ' selected' : '';
    const status = scenario.statusLabel ? ` — ${scenario.statusLabel}` : '';
    return `<option value="${escapeAttribute(scenario.key)}"${selected}>${escapeHTML(scenarioTitle(metadata, scenario) + status)}</option>`;
  }).join('');
  // A picked scenario that left the catalog stays named as gone until reselection.
  const gone = model.scenario || !model.scenarioKey || !options ? '' : '<option value="" selected disabled>Scenario no longer available</option>';
  return `<label class="console-filter console-explorer__picker">Scenario<select data-explorer-control="scenario" data-explorer-focus="scenario"${options ? '' : ' disabled'}>${gone}${options || '<option>No scenarios</option>'}</select></label>`;
}

function renderContextChoices(model: DetailsModel): string {
  const name = `${model.scope}-context`;
  const choices = (Object.keys(CONTEXT_LABELS) as ExploreContext[]).map((context) => {
    const available = Boolean(model.scenario?.selections[context]);
    const checked = context === model.context ? ' checked' : '';
    const reason = available ? '' : contextUnavailable(context, model.scenario);
    const id = `${model.scope}-context-${context}`;
    return `<label class="console-explorer__choice${available ? '' : ' console-explorer__choice--unavailable'}" for="${escapeAttribute(id)}"${reason ? ` title="${escapeAttribute(reason)}"` : ''}><input type="radio" id="${escapeAttribute(id)}" name="${escapeAttribute(name)}" value="${context}" data-explorer-control="context" data-explorer-focus="${escapeAttribute(`context:${context}`)}"${checked}${available ? '' : ' disabled'}><span>${escapeHTML(CONTEXT_LABELS[context])}</span>${reason ? `<span class="console-sr-only"> — ${escapeHTML(reason)}</span>` : ''}</label>`;
  }).join('');
  return `<fieldset class="console-explorer__contexts"><legend class="console-explorer__legend">Data shown</legend><div class="console-explorer__choices">${choices}</div></fieldset>`;
}

function renderObservation(entry: MetadataEntry | undefined): string {
  if (entry?.status !== 'ready') return '';
  const value = entry.value;
  const parts = [
    value.observed_at ? `Read ${renderRelativeTime(value.observed_at, styles)}` : '',
    value.presentation_revision && value.presentation_revision !== 'unknown' ? `Description revision ${escapeHTML(value.presentation_revision)}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `<p class="console-explorer__observed">${parts.join(' · ')}</p>` : '';
}

function renderHeader(model: DetailsModel): string {
  const metadata = availableMetadata(model.entry);
  const title = datasetTitle(model.dataset, model.entry);
  const eyebrow = [model.dataset.origin, model.dataset.version ? `v${model.dataset.version}` : '', model.dataset.provider].filter(Boolean).join(' · ');
  return `
    <section class="console-json-panel console-explorer__header" aria-labelledby="${escapeAttribute(`${model.scope}-title`)}">
      <div class="console-explorer__heading">
        ${eyebrow ? `<span class="console-card__eyebrow">${escapeHTML(eyebrow)}</span>` : ''}
        <h3 class="console-explorer__title" id="${escapeAttribute(`${model.scope}-title`)}" tabindex="-1" data-explorer-focus="title">${escapeHTML(title)}</h3>
        <p class="console-explorer__summary">${model.drift ? muted('Refresh to show the description of the current data.') : summaryText(model.entry, model.configured, Boolean(model.selection))}</p>
      </div>
      <div class="console-explorer__context" role="group" aria-label="Exploring">
        ${renderScenarioPicker(model, metadata)}
        ${renderContextChoices(model)}
      </div>
      <p class="console-explorer__note" data-context="${model.context}">${escapeHTML(contextNote(model.selection, model.context, model.scenario))}</p>
      ${renderObservation(model.entry)}
    </section>
  `;
}

function renderTabs(model: DetailsModel): string {
  const tabs = (model.sections || EXPLORER_SECTIONS).map(({ id, label }) => {
    const active = id === model.section;
    return `<button type="button" role="tab" class="console-explorer__tab${active ? ' console-explorer__tab--active' : ''}" id="${escapeAttribute(`${model.scope}-tab-${id}`)}" aria-selected="${active ? 'true' : 'false'}" aria-controls="${escapeAttribute(`${model.scope}-section`)}" tabindex="${active ? '0' : '-1'}" data-explorer-section="${id}" data-explorer-focus="${escapeAttribute(`section:${id}`)}">${escapeHTML(label)}</button>`;
  }).join('');
  return `<div class="console-explorer__tabs" role="tablist" aria-label="Dataset details">${tabs}</div>`;
}

function renderFailure(reported: ExplorerFailure): string {
  // A host-supplied transport may report an unknown kind: present it as a failure.
  const failure: ExplorerFailure = reported.kind in FAILURE_MESSAGES ? reported : { kind: 'failed', status: reported.status };
  const retry = RETRYABLE.has(failure.kind)
    ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="retry" data-explorer-focus="retry">Try again</button>'
    : '';
  const reselect = failure.kind === 'gone' || failure.kind === 'invalid' || failure.kind === 'stale'
    ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>'
    : '';
  const tone = failure.kind === 'denied' || failure.kind === 'expired' ? 'error' : 'warning';
  return `<div class="console-callout console-explorer__state" data-tone="${tone}" role="alert" data-explorer-failure="${failure.kind}"><p>${escapeHTML(FAILURE_MESSAGES[failure.kind])}</p>${retry || reselect ? `<div class="console-explorer__state-actions">${retry}${reselect}</div>` : ''}</div>`;
}

function driftMessage(model: DetailsModel): string {
  if (!model.scenario) return 'The scenario you were exploring is no longer available. Choose another scenario or refresh.';
  const label = CONTEXT_LABELS[model.context].toLowerCase();
  if (model.drift === 'unavailable') {
    return `The ${label} you were exploring is no longer available for this scenario. Refresh to explore what is available now.`;
  }
  const current = model.current;
  const detail = current?.context === 'active'
    ? ` It is now receipt ${current.receipt_id} at generation ${current.generation}.`
    : current?.context === 'prepared' ? ` It is now receipt ${current.receipt_id} (content revision ${current.content_revision}).` : '';
  return `The ${label} changed since you opened it.${detail} Refresh to explore the current data.`;
}

/** The pinned selection drifted: nothing it loaded is shown until an explicit refresh. */
function renderDrift(model: DetailsModel): string {
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-explorer-state="stale"><p>${escapeHTML(driftMessage(model))}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div></div>`;
}

/** Loading, failure and withheld states that replace the selected section's content. */
function renderEntryState(model: DetailsModel): string {
  const entry = model.entry;
  if (!model.configured) return renderFailure({ kind: 'unconfigured', status: 0 });
  if (model.drift) return renderDrift(model);
  if (!model.selection) return `<div class="console-callout console-explorer__state" data-tone="info"><p>${escapeHTML(contextUnavailable(model.context, model.scenario))}</p></div>`;
  if (!entry || entry.status === 'loading') return '<div class="console-explorer__loading" role="status" aria-busy="true">Loading details…</div>';
  if (entry.status === 'failed') return renderFailure(entry.failure);
  if (entry.value.state === 'suppressed') {
    return '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="suppressed"><p>Details for this selection are hidden by policy.</p></div>';
  }
  if (entry.value.state === 'unsupported') {
    return '<div class="console-callout console-explorer__state" data-tone="info" data-explorer-state="unsupported"><p>This dataset’s provider does not describe its contents. Lifecycle details remain available in the other tabs.</p></div>';
  }
  return '';
}

function periodValue(metadata: ExploreMetadata | undefined): string {
  const period = metadata?.period;
  if (!period) return muted('No declared period');
  const range = period.start === period.end || !period.end ? period.start : `${period.start} to ${period.end}`;
  return escapeHTML(period.timezone ? `${range} (${period.timezone})` : range);
}

function renderTechnicalIdentity(model: DetailsModel, metadata: ExploreMetadata | undefined): string {
  const selection = model.selection;
  const rows: Array<[string, string]> = [
    ['Provider', model.dataset.provider ? escapeHTML(model.dataset.provider) : UNKNOWN],
    ['Dataset ID', model.dataset.datasetId ? `<code class="console-kv__mono">${escapeHTML(model.dataset.datasetId)}</code>` : UNKNOWN],
    ['Version', model.dataset.version ? escapeHTML(model.dataset.version) : UNKNOWN],
    ['Digest', copyValue(selection?.dataset.digest || model.dataset.digest, 'dataset digest')],
  ];
  if (selection) {
    rows.push(
      ['Scenario', `<code class="console-kv__mono">${escapeHTML(`${selection.scenario.id} v${selection.scenario.version}`)}</code>`],
      ['Profile hash', copyValue(selection.scenario.profile_hash, 'scenario profile hash')],
      ['Target', escapeHTML(selection.target_id)],
    );
  }
  if (metadata?.presentation_revision) rows.push(['Description revision', escapeHTML(metadata.presentation_revision)]);
  return `<details class="console-explorer__identity" data-explorer-disclosure="identity"${model.identityOpen ? ' open' : ''}><summary>Technical identity</summary>${kv(rows)}</details>`;
}

function renderAbout(model: DetailsModel, metadata: ExploreMetadata | undefined): string {
  const prerequisites = metadata ? textList(metadata.prerequisites, 'None declared') : escapeHTML(model.dataset.prerequisites || 'None');
  const rows: Array<[string, string]> = [
    ['Origin', escapeHTML([model.dataset.origin, metadata?.origin && metadata.origin !== 'unknown' ? metadata.origin : ''].filter(Boolean).join(' · ') || 'Unknown')],
    ['Declared period', periodValue(metadata)],
    ['Timezone', escapeHTML(metadata?.period?.timezone || model.dataset.timezone || '') || UNKNOWN],
    ['Prerequisites', prerequisites],
    ['Attribution', metadata ? textList(metadata.attribution, 'None declared') : UNKNOWN],
  ];
  return `${kv(rows)}${renderTechnicalIdentity(model, metadata)}`;
}

function entityLabel(metadata: ExploreMetadata, id: string): string {
  return metadata.entities.find((entity) => entity.id === id)?.label || id;
}

function renderInventory(metadata: ExploreMetadata): string {
  if (metadata.inventory.length === 0) return `<p class="console-explorer__para">${muted('No counts declared.')}</p>`;
  const rows = metadata.inventory.map((count) => `<tr><td data-label="Entity">${escapeHTML(entityLabel(metadata, count.entity_id))}</td><td data-label="Scope">${escapeHTML(SCOPE_LABELS[count.scope])}</td><td data-label="Count" class="console-explorer__number">${count.total === null ? UNKNOWN : escapeHTML(count.total.toLocaleString())}</td></tr>`).join('');
  return `<table class="console-table console-explorer__table"><caption class="console-explorer__caption">Counts. Catalog inventory covers the whole dataset; selected-scenario counts describe this scenario only.</caption><thead><tr><th scope="col">Entity</th><th scope="col">Scope</th><th scope="col">Count</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderFields(entity: ExploreEntity): string {
  if (entity.fields.length === 0) return `<p class="console-explorer__para">${muted('No fields declared.')}</p>`;
  const rows = entity.fields.map((field) => `<tr><td data-label="Field"><span class="console-cell-main"><span class="console-cell-title">${escapeHTML(field.label)}</span><code class="console-cell-sub console-kv__mono">${escapeHTML(field.id)}</code></span></td><td data-label="Type">${escapeHTML(field.type)}</td><td data-label="Unit">${field.unit ? escapeHTML(field.unit) : muted('—')}</td><td data-label="Meaning">${field.description ? escapeHTML(field.description) : muted('Not described')}</td></tr>`).join('');
  return `<table class="console-table console-explorer__table"><thead><tr><th scope="col">Field</th><th scope="col">Type</th><th scope="col">Unit</th><th scope="col">Meaning</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderRelationships(metadata: ExploreMetadata, entity: ExploreEntity): string {
  if (entity.relationships.length === 0) return '';
  const items = entity.relationships.map((relationship) => `${relationship.label} → ${entityLabel(metadata, relationship.entity_id)}`);
  return `<div class="console-explorer__related"><span class="console-explorer__label">Declared relationships</span>${textList(items, '')}</div>`;
}

function renderEntity(model: DetailsModel, metadata: ExploreMetadata, entity: ExploreEntity): string {
  return `
    <article class="console-explorer__entity" data-entity-id="${escapeAttribute(entity.id)}" aria-labelledby="${escapeAttribute(`${model.scope}-entity-${entity.id}`)}">
      <div class="console-explorer__entity-head">
        <h4 class="console-explorer__entity-title" id="${escapeAttribute(`${model.scope}-entity-${entity.id}`)}">${escapeHTML(entity.label)}</h4>
        ${entity.description ? `<p class="console-explorer__para">${escapeHTML(entity.description)}</p>` : `<p class="console-explorer__para">${muted('Not described.')}</p>`}
      </div>
      ${renderFields(entity)}
      ${renderRelationships(metadata, entity)}
      ${model.preview ? model.preview(entity) : ''}
    </article>
  `;
}

function renderContents(model: DetailsModel, metadata: ExploreMetadata): string {
  const entities = metadata.entities.length === 0
    ? `<p class="console-explorer__para">${muted('No entities declared.')}</p>`
    : metadata.entities.map((entity) => renderEntity(model, metadata, entity)).join('');
  return `${renderInventory(metadata)}<div class="console-explorer__entities">${entities}</div>`;
}

function usageNote(metadata: ExploreMetadata): string {
  switch (metadata.usage_completeness) {
    case 'complete': return 'Declared by the dataset’s provider, which reports this list as complete. It is not discovered at runtime.';
    case 'partial': return 'Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.';
    default: return 'Declared by the dataset’s provider. Other uses may exist; this list is not discovered at runtime.';
  }
}

const PHASES: ReadonlyArray<{ id: ExploreUsage['effects'][number]['phase']; label: string }> = [
  { id: 'prepare', label: 'Prepare' },
  { id: 'verify', label: 'Verify' },
  { id: 'activate', label: 'Activate' },
];

/**
 * The absolute same-origin http(s) URL of a server-resolved link, else ''.
 * Links are resolved by the application registry under current policy;
 * anything that would leave this origin or run script is dropped. The
 * absolute form is returned because a normalized path such as `//host/x`
 * would read as protocol-relative.
 */
export function safeHref(href: string, base: string): string {
  if (!href) return '';
  try {
    const page = new URL(base);
    const url = new URL(href, page);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.origin !== page.origin) return '';
    return url.href;
  } catch {
    return '';
  }
}

function renderEffects(usage: ExploreUsage): string {
  const rows = PHASES.map(({ id, label }) => {
    const declared = usage.effects.filter((effect) => effect.phase === id);
    const value = declared.length === 0
      ? '<span class="console-kv__empty">Not declared — effect unknown</span>'
      : declared.map((effect) => escapeHTML(effect.description || 'Declared without a description')).join('<br>');
    return `<dt>${escapeHTML(label)}</dt><dd>${value}</dd>`;
  }).join('');
  return `<dl class="console-explorer__effects" aria-label="${escapeAttribute(`Declared effects on ${usage.label}`)}">${rows}</dl>`;
}

function renderUsageItem(model: DetailsModel, usage: ExploreUsage): string {
  const href = safeHref(usage.href, model.base);
  const link = href
    ? `<a class="console-link" href="${escapeAttribute(href)}" data-explorer-usage-link>Open ${escapeHTML(usage.label)}<span aria-hidden="true"> →</span></a>`
    : '<span class="console-muted">No link available</span>';
  return `<li class="console-explorer__usage" data-surface-id="${escapeAttribute(usage.surface_id)}"><div class="console-explorer__usage-head"><span class="console-explorer__usage-label">${escapeHTML(usage.label)}</span>${badge(USAGE_KIND_LABELS[usage.kind])}</div>${renderEffects(usage)}<div class="console-explorer__links">${link}</div></li>`;
}

function renderUsage(model: DetailsModel, metadata: ExploreMetadata): string {
  const note = `<p class="console-explorer__para console-muted">${escapeHTML(usageNote(metadata))}</p>`;
  if (metadata.usages.length === 0) {
    return `${note}<p class="console-explorer__para" data-explorer-state="usage-unknown">No usage is declared. Impact on application features is unknown.</p>`;
  }
  return `${note}<ul class="console-explorer__usages">${metadata.usages.map((usage) => renderUsageItem(model, usage)).join('')}</ul>`;
}

function renderScenarioCard(model: DetailsModel, metadata: ExploreMetadata | undefined, scenario: CatalogScenario): string {
  const declared = declaredScenario(metadata, scenario);
  const current = scenario.key === model.scenario?.key;
  const outcomes = declared && declared.expected_outcomes.length > 0
    ? `<div class="console-explorer__related"><span class="console-explorer__label">Expected outcomes (declared, not verified)</span>${textList(declared.expected_outcomes, '')}</div>`
    : '';
  const action = current
    ? badge('Selected', 'info')
    : `<button type="button" class="console-btn console-btn--sm" data-explorer-action="scenario" data-scenario-key="${escapeAttribute(scenario.key)}" data-explorer-focus="${escapeAttribute(`scenario:${scenario.key}`)}">Explore this scenario</button>`;
  return `
    <li class="console-explorer__scenario" data-scenario-key="${escapeAttribute(scenario.key)}">
      <div class="console-explorer__usage-head"><span class="console-explorer__usage-label">${escapeHTML(scenarioTitle(metadata, scenario))}</span>${statusBadge(scenario)}</div>
      <p class="console-explorer__para">${declared?.summary ? escapeHTML(declared.summary) : muted('No description provided.')}</p>
      ${outcomes}
      <div class="console-explorer__scenario-foot">${action}</div>
    </li>
  `;
}

function renderScenarios(model: DetailsModel, metadata: ExploreMetadata | undefined): string {
  if (model.dataset.scenarios.length === 0) return `<p class="console-explorer__para">${muted('No scenarios are available.')}</p>`;
  return `<ul class="console-explorer__scenarios">${model.dataset.scenarios.map((scenario) => renderScenarioCard(model, metadata, scenario)).join('')}</ul>`;
}

function provenanceLabel(entry: MetadataEntry | undefined): string {
  if (entry?.status !== 'ready') return UNKNOWN;
  if (entry.value.provenance === 'example') return escapeHTML('Example — declared by the provider, not observed');
  if (entry.value.provenance === 'observed') return escapeHTML('Observed');
  return UNKNOWN;
}

function completenessLabel(entry: MetadataEntry | undefined): string {
  if (entry?.status !== 'ready') return UNKNOWN;
  const labels = { complete: 'Complete', partial: 'Partial — some details are missing', unknown: 'Unknown' } as const;
  return entry.value.completeness === 'unknown' ? UNKNOWN : escapeHTML(labels[entry.value.completeness]);
}

function renderEvidence(model: DetailsModel): string {
  const selection = model.selection;
  const observed = model.entry?.status === 'ready' && model.entry.value.observed_at
    ? renderRelativeTime(model.entry.value.observed_at, styles)
    : UNKNOWN;
  const rows: Array<[string, string]> = [
    ['Data shown', escapeHTML(CONTEXT_LABELS[model.context])],
    ['Provenance', provenanceLabel(model.entry)],
    ['Completeness', completenessLabel(model.entry)],
    ['Read', observed],
    ['Lifecycle status', model.scenario?.statusLabel ? statusBadge(model.scenario) : UNKNOWN],
    ['Target', selection?.target_id ? escapeHTML(selection.target_id) : UNKNOWN],
    ['Receipt', selection?.receipt_id ? `<code class="console-kv__mono">${escapeHTML(selection.receipt_id)}</code>` : muted('None — catalog example')],
    ['Content revision', selection?.content_revision ? escapeHTML(String(selection.content_revision)) : muted('None')],
    ['Generation', selection?.generation !== undefined ? escapeHTML(String(selection.generation)) : muted('None')],
  ];
  const links = '<div class="console-explorer__links"><button type="button" class="console-link" data-console-panel-link="verification">Verification evidence<span aria-hidden="true"> →</span></button><button type="button" class="console-link" data-console-panel-link="coverage">Coverage<span aria-hidden="true"> →</span></button></div>';
  return `<p class="console-explorer__para console-muted">Expected outcomes and catalog examples are declarations, not executed checks. Verification and coverage come from lifecycle evidence.</p>${kv(rows)}${links}`;
}

/** Insights read the pinned selection on their own: only selection states replace them. */
function renderInsightsSection(model: DetailsModel, section: InsightsSectionID): string {
  if (!model.configured) return renderFailure({ kind: 'unconfigured', status: 0 });
  if (model.drift) return renderDrift(model);
  if (!model.selection) return `<div class="console-callout console-explorer__state" data-tone="info"><p>${escapeHTML(contextUnavailable(model.context, model.scenario))}</p></div>`;
  return model.insights ? model.insights(section) : '';
}

/**
 * Application preview opens prepared receipts only: other contexts explain
 * why and offer the scenario's prepared receipt when the snapshot has one.
 */
function renderPreviewContext(model: DetailsModel): string {
  const prepared = model.scenario?.selections.prepared;
  const message = model.context === 'active'
    ? `Active data is what ${model.selection?.target_id || 'the target'} serves now: open the application itself to see it. Application preview opens a prepared receipt without activating it.`
    : 'A catalog example is not prepared data. Application preview opens a prepared receipt without activating it.';
  const action = prepared
    ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="prepared" data-explorer-focus="preview:prepared">Show prepared receipt ${escapeHTML(prepared.receipt_id || '')}</button></div>`
    : `<p>${escapeHTML('This scenario has no prepared receipt yet. Prepare it to preview it in the application.')}</p>`;
  return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="context"><p>${escapeHTML(message)}</p>${action}</div>`;
}

/** App preview reads the pinned prepared selection on its own: only selection states replace it. */
function renderAppPreviewSection(model: DetailsModel): string {
  if (!model.configured) return renderFailure({ kind: 'unconfigured', status: 0 });
  if (model.drift) return renderDrift(model);
  if (!model.selection) return `<div class="console-callout console-explorer__state" data-tone="info"><p>${escapeHTML(contextUnavailable(model.context, model.scenario))}</p></div>`;
  if (model.selection.context !== 'prepared') return renderPreviewContext(model);
  return model.appPreview ? model.appPreview() : '';
}

function renderSection(model: DetailsModel): string {
  if (isInsightsSection(model.section)) return renderInsightsSection(model, model.section);
  if (model.section === 'app-preview') return renderAppPreviewSection(model);
  const metadata = availableMetadata(model.entry);
  const state = renderEntryState(model);
  switch (model.section) {
    case 'about':
      return `${state}${renderAbout(model, metadata)}`;
    case 'scenarios':
      return `${state}${renderScenarios(model, metadata)}`;
    case 'evidence':
      return `${state}${renderEvidence(model)}`;
    case 'contents':
      return state || (metadata ? renderContents(model, metadata) : '');
    default:
      return state || (metadata ? renderUsage(model, metadata) : '');
  }
}

export function renderDetails(model: DetailsModel): string {
  const label = (model.sections || EXPLORER_SECTIONS).find((section) => section.id === model.section)?.label || 'Details';
  return `
    <nav class="console-explorer__crumbs" aria-label="Explorer"><button type="button" class="console-link" data-explorer-action="back" data-explorer-focus="back"><span aria-hidden="true">← </span>All datasets</button></nav>
    ${renderHeader(model)}
    <div class="console-explorer__sections">
      ${renderTabs(model)}
      <section class="console-json-panel console-explorer__section" role="tabpanel" id="${escapeAttribute(`${model.scope}-section`)}" aria-labelledby="${escapeAttribute(`${model.scope}-tab-${model.section}`)}" data-explorer-section-panel="${model.section}" data-explorer-focus="section-panel" tabindex="0">
        <h4 class="console-sr-only">${escapeHTML(label)}</h4>
        <div class="console-explorer__section-body">${renderSection(model)}</div>
      </section>
    </div>
  `;
}
