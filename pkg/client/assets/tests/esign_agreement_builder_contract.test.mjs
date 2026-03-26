import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const testFileDir = path.dirname(fileURLToPath(import.meta.url));
const agreementFormTemplatePath = path.resolve(
  testFileDir,
  '../../templates/resources/esign-agreements/form.html',
);
const agreementRuntimePath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form-runtime.ts',
);
const agreementCompositionPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/composition.ts',
);
const agreementDocumentSelectionPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/document-selection.ts',
);
const agreementFieldDefinitionsPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/field-definitions.ts',
);
const agreementPlacementEditorPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/placement-editor.ts',
);
const agreementWizardNavigationPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/wizard-navigation.ts',
);
const agreementRuntimeDistPath = path.resolve(
  testFileDir,
  '../dist/esign/index.js',
);
const agreementFormRuntimeDistPath = path.resolve(
  testFileDir,
  '../dist/esign/agreement-form.js',
);
const agreementRuntimeDistChunksPath = path.resolve(
  testFileDir,
  '../dist/chunks',
);
const agreementConstantsPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/constants.ts',
);
const agreementNormalizationPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/normalization.ts',
);
const requireFromTest = createRequire(import.meta.url);

async function loadTypeScriptCompiler() {
  try {
    return await import('typescript');
  } catch {
    return await import('../node_modules/typescript/lib/typescript.js');
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readSources(...filePaths) {
  return filePaths.map((filePath) => read(filePath)).join('\n');
}

function readBuiltAgreementFormRuntime() {
  const sourceFiles = [agreementRuntimeDistPath, agreementFormRuntimeDistPath];
  if (fs.existsSync(agreementRuntimeDistChunksPath)) {
    const chunkPaths = fs.readdirSync(agreementRuntimeDistChunksPath)
      .filter((name) => /^agreement-form-.*\.js$/.test(name))
      .map((name) => path.join(agreementRuntimeDistChunksPath, name));
    sourceFiles.push(...chunkPaths);
  }
  return sourceFiles
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => read(filePath))
    .join('\n');
}

test('Phase 0 contract: agreement form template includes field_placements_json hidden input', () => {
  const template = fs.readFileSync(agreementFormTemplatePath, 'utf8');
  assert.match(template, /id="field_placements_json" name="field_placements_json"/);
});

test('Phase 0 contract: runtime imports shared agreement-form constants and normalization helpers', () => {
  const source = readSources(
    agreementCompositionPath,
    agreementFieldDefinitionsPath,
    agreementPlacementEditorPath,
  );
  assert.match(source, /from '\.\/constants'/);
  assert.match(source, /from '\.\/normalization'/);
  assert.match(source, /TOTAL_WIZARD_STEPS/);
  assert.match(source, /WIZARD_STEP/);
  assert.match(source, /toPlacementFormPayload/);
  assert.match(source, /fieldPlacementsJSONInput\.value = JSON\.stringify\(placementEntries\)/);
});

test('Phase 0 contract: shared constants define wizard steps and placement sources', () => {
  const source = fs.readFileSync(agreementConstantsPath, 'utf8');
  assert.match(source, /export const WIZARD_STEP = \{/);
  assert.match(source, /REVIEW: 6/);
  assert.match(source, /export const TOTAL_WIZARD_STEPS/);
  assert.match(source, /export const PLACEMENT_SOURCE = \{/);
  assert.match(source, /AUTO_FALLBACK: 'auto_fallback'/);
});

test('Phase 0 contract: shared normalization exposes rule and placement canonicalizers', () => {
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  assert.match(source, /export function normalizeFieldRuleState/);
  assert.match(source, /export function expandRuleDefinitionsForPreview/);
  assert.match(source, /export function normalizePlacementInstance/);
  assert.match(source, /export function toPlacementFormPayload/);
});

test('Phase 1.1 contract: runtime includes autoPopulateAgreementTitle function', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /function autoPopulateAgreementTitle/);
  assert.match(source, /autoPopulateAgreementTitle\(title\)/);
  assert.match(source, /const currentTitle = titleInput\.value\.trim\(\)/);
  assert.match(source, /if \(currentTitle && titleSourceValue === titleSource\.USER\) \{/);
});

test('Phase 1.2 contract: runtime clamps field rule page inputs to document bounds', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /const clampRulePageInputs = \(\) =>/);
  assert.match(source, /fromPageInput\.value = String\(clampPageNumber\(val, maxPage, 1\)\)/);
  assert.match(source, /toPageInput\.value = String\(clampPageNumber\(val, maxPage, 1\)\)/);
  assert.match(source, /pageInput\.value = String\(clampPageNumber\(val, maxPage, 1\)\)/);
  assert.match(source, /const onRulePageInput = \(\) =>/);
  assert.match(source, /fromPageInput\.addEventListener\('input', onRulePageInput\)/);
  assert.match(source, /fromPageInput\.addEventListener\('change', onRulePageInput\)/);
  assert.match(source, /toPageInput\.addEventListener\('input', onRulePageInput\)/);
  assert.match(source, /toPageInput\.addEventListener\('change', onRulePageInput\)/);
  assert.match(source, /pageInput\.addEventListener\('input', onRulePageInput\)/);
  assert.match(source, /pageInput\.addEventListener\('change', onRulePageInput\)/);
  // Lower-bound clamping must not skip 0/negative values.
  assert.doesNotMatch(source, /Number\.isFinite\(val\)\s*&&\s*val\s*>\s*0/);
});

test('Phase 1.2 contract: normalization provides clampPageNumber utility', () => {
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  // clampPageNumber must be exported
  assert.match(source, /export function clampPageNumber\(/);
  // Must clamp to [1, maxPage] range
  assert.match(source, /return clampNumber\(parsed, 1, maxPage\)/);
});

test('Phase 1.2 behavior: clampPageNumber enforces lower and upper bounds', async () => {
  const ts = await loadTypeScriptCompiler();
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  const sourceWithoutImports = source.replace(/import[\s\S]*?from\s+['"][^'"]+['"];\n/g, '');
  const transpiled = ts.transpileModule(sourceWithoutImports, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const mod = { exports: {} };
  const executeModule = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled);
  executeModule(mod.exports, requireFromTest, mod, agreementNormalizationPath, path.dirname(agreementNormalizationPath));

  assert.equal(typeof mod.exports.clampPageNumber, 'function');
  assert.equal(mod.exports.clampPageNumber(0, 5, 1), 1);
  assert.equal(mod.exports.clampPageNumber(-8, 5, 1), 1);
  assert.equal(mod.exports.clampPageNumber(7, 5, 1), 5);
  assert.equal(mod.exports.clampPageNumber('3', 5, 1), 3);
});

test('Phase 1.3 contract: normalization provides computeEffectiveRulePages function', () => {
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  // Function must be exported
  assert.match(source, /export function computeEffectiveRulePages\(/);
  // Must accept fromPage, toPage, terminalPage, excludeLastPage, excludePages parameters
  assert.match(source, /fromPage: number,[\s\S]*?toPage: number,[\s\S]*?terminalPage: number,[\s\S]*?excludeLastPage: boolean,[\s\S]*?excludePages: number\[\]/);
  // Must return EffectivePageResult
  assert.match(source, /\): EffectivePageResult \{/);
  // Must add terminal page to excluded set when excludeLastPage is true
  assert.match(source, /if \(excludeLastPage\) \{[\s\S]*?excludedSet\.add\(safeTerminalPage\)/);
  // Must compute effective pages by iterating range and filtering excluded
  assert.match(source, /for \(let page = rangeStart; page <= rangeEnd/);
  // Must check if page is in excluded set
  assert.match(source, /if \(!excludedSet\.has\(page\)\)/);
});

test('Phase 1.3 behavior: computeEffectiveRulePages clamps out-of-range exclude_pages to terminal page', async () => {
  const ts = await loadTypeScriptCompiler();
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  const sourceWithoutImports = source.replace(/import[\s\S]*?from\s+['"][^'"]+['"];\n/g, '');
  const transpiled = ts.transpileModule(sourceWithoutImports, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;

  const mod = { exports: {} };
  const executeModule = new Function('exports', 'require', 'module', '__filename', '__dirname', transpiled);
  executeModule(mod.exports, requireFromTest, mod, agreementNormalizationPath, path.dirname(agreementNormalizationPath));

  assert.equal(typeof mod.exports.computeEffectiveRulePages, 'function');
  const result = mod.exports.computeEffectiveRulePages(1, 5, 5, false, [99]);
  assert.deepEqual(result.pages, [1, 2, 3, 4]);
  assert.deepEqual(result.excludedPages, [5]);
  assert.equal(result.isEmpty, false);
});

test('Phase 1.3 contract: normalization provides formatEffectivePageRange function', () => {
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  // Function must be exported
  assert.match(source, /export function formatEffectivePageRange\(/);
  // Must handle empty result case
  assert.match(source, /if \(result\.isEmpty\) \{[\s\S]*?return '\(no pages - all excluded\)'/);
  // Must handle small page counts (list format)
  assert.match(source, /if \(pages\.length <= 5\) \{[\s\S]*?return `pages \$\{pages\.join/);
  // Must handle larger counts with range notation
  assert.match(source, /return `pages \$\{ranges\.join/);
});

test('Phase 1.3 contract: contracts.ts exports EffectivePageResult interface', () => {
  const contractsPath = path.resolve(
    testFileDir,
    '../src/esign/pages/agreement-form/contracts.ts',
  );
  const source = fs.readFileSync(contractsPath, 'utf8');
  // Interface must be exported
  assert.match(source, /export interface EffectivePageResult \{/);
  // Must include pages array
  assert.match(source, /pages: number\[\];/);
  // Must include rangeStart and rangeEnd
  assert.match(source, /rangeStart: number;/);
  assert.match(source, /rangeEnd: number;/);
  // Must include excludedPages array
  assert.match(source, /excludedPages: number\[\];/);
  // Must include isEmpty flag
  assert.match(source, /isEmpty: boolean;/);
});

test('Phase 1.3 contract: runtime uses computeEffectiveRulePages for rule summary', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /computeEffectiveRulePages,/);
  assert.match(source, /formatEffectivePageRange,/);
  assert.match(source, /const effectiveResult = computeEffectiveRulePages\(/);
  assert.match(source, /const effectiveRangeText = formatEffectivePageRange\(effectiveResult\)/);
  assert.match(source, /summary\.textContent = effectiveResult\.isEmpty/);
  assert.match(source, /Warning: No initials fields will be generated \$\{effectiveRangeText\}\./);
  assert.match(source, /Generates initials fields on \$\{effectiveRangeText\}\./);
});

test('Phase 1.4 contract: Step 4 uses shared signer selection resolver', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /function resolveSignerSelection\(preferredValue: unknown, signers: SignerParticipantSummary\[\]\): string/);
  assert.match(source, /if \(preferred && signers\.some\(\(signer\) => signer\.id === preferred\)\)/);
  assert.match(source, /if \(signers\.length === 1\) \{[\s\S]*?return signers\[0\]\.id;/);
});

test('Phase 1.4 contract: Step 4 reconciles both field and rule signer selects through one path', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /function syncSignerSelectOptions\(/);
  assert.match(source, /function reconcileSignerSelects\(signers: SignerParticipantSummary\[\] = getSignerParticipants\(\)\): void/);
  assert.match(source, /participantSelects\.forEach\(\(select\) => \{[\s\S]*?syncSignerSelectOptions\(/);
  assert.match(source, /ruleParticipantSelects\.forEach\(\(select\) => \{[\s\S]*?syncSignerSelectOptions\(/);
});

test('Phase 1.4 contract: addFieldDefinition and addFieldRule both use shared signer sync', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /syncSignerSelectOptions\(participantSelect, getSignerParticipants\(\), normalizedData\.participantId\)/);
  assert.match(source, /syncSignerSelectOptions\(participantSelect, getSignerParticipants\(\), preferredParticipantID\)/);
});

test('Phase 1.5 contract: template places Add Field action below definitions list', () => {
  const template = fs.readFileSync(agreementFormTemplatePath, 'utf8');
  const listIndex = template.indexOf('id="field-definitions-container"');
  const addButtonContainerIndex = template.indexOf('id="add-field-btn-container"');
  const emptyStateIndex = template.indexOf('id="field-definitions-empty-state"');

  assert.ok(listIndex >= 0, 'field definitions list should exist');
  assert.ok(addButtonContainerIndex > listIndex, 'add-field button container should come after field definitions list');
  assert.ok(emptyStateIndex > addButtonContainerIndex, 'empty state should come after add-field button container');
});

test('Phase 1.5 contract: runtime toggles bottom Add Field action with empty state', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /const addFieldBtnContainer = elementById<HTMLElement>\('add-field-btn-container'\)/);
  assert.match(source, /if \(fields\.length === 0\) \{[\s\S]*?addFieldBtnContainer\?\.classList\.add\('hidden'\)/);
  assert.match(source, /else \{[\s\S]*?addFieldBtnContainer\?\.classList\.remove\('hidden'\)/);
});

test('Phase 1.6 contract: jump-to-place button and handlers are removed from template and runtime', () => {
  const template = fs.readFileSync(agreementFormTemplatePath, 'utf8');
  const source = fs.readFileSync(agreementRuntimePath, 'utf8');
  assert.doesNotMatch(template, /jump-to-place-btn/);
  assert.doesNotMatch(source, /jump-to-place-btn|jumpToPlace|updateJumpBtnTooltip/);
});

test('Phase 1.7 contract: placement field definitions are sorted by page then definitionId', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /function collectPlacementFieldDefinitions\(\)/);
  assert.match(source, /const page = parseInt\(String\(pageInput\?\.value \|\| '1'\), 10\) \|\| 1/);
  assert.match(source, /uniqueDefinitions\.sort\(\(a, b\) => \{[\s\S]*?if \(a\.page !== b\.page\) return a\.page - b\.page;[\s\S]*?return a\.definitionId\.localeCompare\(b\.definitionId\);[\s\S]*?\}\);/);
});

test('Phase 1.5-1.7 dist contract: built runtime reflects template/runtime agreements', () => {
  const distSource = readBuiltAgreementFormRuntime();
  assert.match(distSource, /add-field-btn-container/);
  assert.doesNotMatch(distSource, /jump-to-place-btn|updateJumpBtnTooltip/);
  assert.match(distSource, /\.definitionId\.localeCompare\(/);
});

// =============================================================================
// Phase 1.8: Document selection typeahead with recent documents
// =============================================================================

test('Phase 1.8 contract: template includes typeahead dropdown structure', () => {
  const template = fs.readFileSync(agreementFormTemplatePath, 'utf8');
  // Main typeahead container
  assert.match(template, /id="document-typeahead"/);
  // Typeahead dropdown with listbox role
  assert.match(template, /id="document-typeahead-dropdown"[\s\S]*?role="listbox"/);
  // Recent documents section
  assert.match(template, /id="document-recent-section"/);
  assert.match(template, /id="document-recent-list"/);
  // Search results section
  assert.match(template, /id="document-search-section"/);
  assert.match(template, /id="document-search-list"/);
  // Empty state
  assert.match(template, /id="document-empty-state"/);
  // Loading indicators
  assert.match(template, /id="document-dropdown-loading"/);
  assert.match(template, /id="document-search-loading"/);
  // Search input with ARIA attributes for typeahead
  assert.match(template, /id="document-search"[\s\S]*?aria-autocomplete="list"/);
  assert.match(template, /id="document-search"[\s\S]*?aria-haspopup="listbox"/);
  assert.match(template, /id="document-search"[\s\S]*?aria-expanded="false"/);
});

test('Phase 1.8 contract: runtime includes typeahead state management', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /import type \{ AgreementDocumentOption, DocumentSummary, DocumentTypeaheadState, DocumentPreviewState \} from '\.\/contracts';/);
  assert.match(source, /const typeaheadState: DocumentTypeaheadState = \{/);
  assert.match(source, /isOpen: false/);
  assert.match(source, /query: ''/);
  assert.match(source, /recentDocuments: \[\]/);
  assert.match(source, /searchResults: \[\]/);
  assert.match(source, /selectedIndex: -1/);
  assert.match(source, /isLoading: false/);
  assert.match(source, /isSearchMode: false/);
});

test('Phase 1.8 contract: runtime includes debounce utility', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /function debounce</);
  assert.match(source, /const TYPEAHEAD_DEBOUNCE_MS = 300/);
  assert.match(source, /const RECENT_DOCUMENTS_LIMIT = 5/);
  assert.match(source, /const SEARCH_RESULTS_LIMIT = 10/);
});

test('Phase 1.8 contract: runtime includes loadRecentDocuments function', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /async function loadRecentDocuments\(\)/);
  assert.match(source, /sort: 'updated_at'/);
  assert.match(source, /sort_desc: 'true'/);
  assert.match(source, /per_page: String\(RECENT_DOCUMENTS_LIMIT\)/);
  assert.match(source, /typeaheadState\.recentDocuments =/);
});

test('Phase 1.8 contract: runtime includes searchDocuments function with debouncing', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /async function searchDocuments\(query: string\)/);
  assert.match(source, /q: trimmedQuery/);
  assert.match(source, /typeaheadState\.searchResults =/);
  assert.match(source, /typeaheadState\.isSearchMode = true/);
  assert.match(source, /const debouncedSearchDocuments = debounce\(searchDocuments, TYPEAHEAD_DEBOUNCE_MS\)/);
});

test('Phase 1.8 contract: runtime includes typeahead dropdown control functions', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /function openTypeaheadDropdown\(\)/);
  assert.match(source, /function closeTypeaheadDropdown\(\)/);
  assert.match(source, /function renderTypeaheadDropdown\(\)/);
  assert.match(source, /function renderTypeaheadList\(/);
  assert.match(source, /function selectDocumentFromTypeahead\(btn: Element\)/);
});

test('Phase 1.8 contract: runtime includes keyboard navigation for typeahead', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /function handleTypeaheadKeydown\(e: KeyboardEvent\)/);
  assert.match(source, /case 'ArrowDown':/);
  assert.match(source, /case 'ArrowUp':/);
  assert.match(source, /case 'Enter':/);
  assert.match(source, /case 'Escape':/);
  assert.match(source, /case 'Home':/);
  assert.match(source, /case 'End':/);
  assert.match(source, /function scrollToSelectedOption\(\)/);
});

test('Phase 1.8 contract: runtime calls loadRecentDocuments on page load', () => {
  const source = read(agreementCompositionPath);
  const loadDocumentsIndex = source.indexOf('void documentSelectionController.loadDocuments();');
  const loadRecentIndex = source.indexOf('void documentSelectionController.loadRecentDocuments();');
  assert.ok(loadDocumentsIndex >= 0, 'loadDocuments call should exist');
  assert.ok(loadRecentIndex > loadDocumentsIndex, 'loadRecentDocuments should be called after loadDocuments');
});

test('Phase 1.8 contract: runtime opens typeahead on change document button click', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /changeDocumentBtn\.addEventListener\('click', \(\) => \{[\s\S]*?openTypeaheadDropdown\(\)/);
});

test('Phase 1.8 contract: runtime closes typeahead on outside click', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /document\.addEventListener\('click', \(e: MouseEvent\) => \{[\s\S]*?closeTypeaheadDropdown\(\)/);
});

test('Phase 1.8 contract: contracts.ts exports DocumentTypeaheadState interface', () => {
  const contractsPath = path.resolve(
    testFileDir,
    '../src/esign/pages/agreement-form/contracts.ts',
  );
  const source = fs.readFileSync(contractsPath, 'utf8');
  // DocumentSummary interface must be exported
  assert.match(source, /export interface DocumentSummary \{/);
  assert.match(source, /id: string;/);
  assert.match(source, /title: string;/);
  assert.match(source, /pageCount: number;/);
  // DocumentTypeaheadState interface must be exported
  assert.match(source, /export interface DocumentTypeaheadState \{/);
  assert.match(source, /isOpen: boolean;/);
  assert.match(source, /query: string;/);
  assert.match(source, /recentDocuments: DocumentSummary\[\];/);
  assert.match(source, /searchResults: DocumentSummary\[\];/);
  assert.match(source, /selectedIndex: number;/);
  assert.match(source, /isLoading: boolean;/);
  assert.match(source, /isSearchMode: boolean;/);
});

// =============================================================================
// Phase 2: Document Preview Card
// =============================================================================

const agreementPreviewCardPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/preview-card.ts',
);
const agreementContractsPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/contracts.ts',
);

test('Phase 2 contract: preview-card.ts module exists and exports DocumentPreviewCard class', () => {
  assert.ok(fs.existsSync(agreementPreviewCardPath), 'preview-card.ts must exist');
  const source = fs.readFileSync(agreementPreviewCardPath, 'utf8');
  // Must export DocumentPreviewCard class
  assert.match(source, /export class DocumentPreviewCard \{/);
  // Must export createPreviewCard factory function
  assert.match(source, /export function createPreviewCard/);
});

test('Phase 2 contract: preview-card.ts implements PDF thumbnail rendering with the shared PDF runtime', () => {
  const source = fs.readFileSync(agreementPreviewCardPath, 'utf8');
  // Must load via shared PDF runtime
  assert.match(source, /loadPdfDocument/);
  // Must render page to canvas
  assert.match(source, /page\.render\(/);
  // Must convert to data URL for thumbnail
  assert.match(source, /canvas\.toDataURL/);
});

test('Phase 2 contract: preview-card.ts implements thumbnail caching by document ID', () => {
  const source = fs.readFileSync(agreementPreviewCardPath, 'utf8');
  // Must have thumbnail cache
  assert.match(source, /thumbnailCache/);
  // Must export cache access functions
  assert.match(source, /export function getCachedThumbnail/);
  assert.match(source, /export function clearThumbnailCache/);
  // Must store cache entries with timestamp
  assert.match(source, /timestamp: Date\.now\(\)/);
  // Must check cache TTL
  assert.match(source, /CACHE_TTL_MS/);
});

test('Phase 2 contract: preview-card.ts handles loading, error, and empty states', () => {
  const source = fs.readFileSync(agreementPreviewCardPath, 'utf8');
  // Must track isLoading state
  assert.match(source, /isLoading: true/);
  assert.match(source, /isLoading: false/);
  // Must track error state
  assert.match(source, /error:/);
  // Must render different states via element references
  assert.match(source, /loadingState/);
  assert.match(source, /errorState/);
  assert.match(source, /emptyState/);
  assert.match(source, /contentState/);
});

test('Phase 2 contract: preview-card.ts respects wizard step visibility rules', () => {
  const source = fs.readFileSync(agreementPreviewCardPath, 'utf8');
  // Must import WIZARD_STEP constants
  assert.match(source, /import.*WIZARD_STEP.*from '\.\/constants'/);
  // Must implement updateVisibility method
  assert.match(source, /updateVisibility\(currentStep: number\)/);
  // Must show in steps 1-4 and 6, hide in step 5
  assert.match(source, /WIZARD_STEP\.DOCUMENT/);
  assert.match(source, /WIZARD_STEP\.DETAILS/);
  assert.match(source, /WIZARD_STEP\.PARTICIPANTS/);
  assert.match(source, /WIZARD_STEP\.FIELDS/);
  assert.match(source, /WIZARD_STEP\.REVIEW/);
});

test('Phase 2 contract: contracts.ts exports DocumentPreviewState and DocumentPreviewConfig interfaces', () => {
  const source = fs.readFileSync(agreementContractsPath, 'utf8');
  // DocumentPreviewState interface must be exported
  assert.match(source, /export interface DocumentPreviewState \{/);
  assert.match(source, /documentId: string \| null;/);
  assert.match(source, /documentTitle: string \| null;/);
  assert.match(source, /pageCount: number \| null;/);
  assert.match(source, /thumbnailUrl: string \| null;/);
  assert.match(source, /isLoading: boolean;/);
  assert.match(source, /error: string \| null;/);
  // DocumentPreviewConfig interface must be exported
  assert.match(source, /export interface DocumentPreviewConfig \{/);
  assert.match(source, /apiBasePath: string;/);
  assert.match(source, /basePath: string;/);
  assert.match(source, /thumbnailMaxWidth: number;/);
  assert.match(source, /thumbnailMaxHeight: number;/);
});

test('Phase 2 contract: constants.ts exports PREVIEW_CARD_DEFAULTS and PREVIEW_CARD_VISIBLE_STEPS', () => {
  const source = fs.readFileSync(agreementConstantsPath, 'utf8');
  // Must export preview card defaults
  assert.match(source, /export const PREVIEW_CARD_DEFAULTS = \{/);
  assert.match(source, /THUMBNAIL_MAX_WIDTH:/);
  assert.match(source, /THUMBNAIL_MAX_HEIGHT:/);
  // Must export visible steps array
  assert.match(source, /export const PREVIEW_CARD_VISIBLE_STEPS = \[/);
});

test('Phase 2 contract: runtime imports and initializes preview card', () => {
  const source = read(agreementCompositionPath);
  assert.match(source, /import \{ createPreviewCard/);
  assert.match(source, /from '\.\/preview-card'/);
  assert.match(source, /const previewCard = createPreviewCard\(/);
});

test('Phase 2 contract: runtime updates preview card on document selection', () => {
  const source = read(agreementDocumentSelectionPath);
  assert.match(source, /function applySelectedDocument[\s\S]*?previewCard\.setDocument\(/);
  assert.match(source, /function selectDocumentFromTypeahead[\s\S]*?applySelectedDocument\(id, title, pages\);/);
});

test('Phase 2 contract: runtime updates preview card visibility on step change', () => {
  const source = read(agreementWizardNavigationPath);
  assert.match(source, /function updateWizardUI[\s\S]*?previewCard\.updateVisibility\(currentStep\)/);
});

test('Phase 2 contract: template includes preview card HTML structure', () => {
  const template = fs.readFileSync(agreementFormTemplatePath, 'utf8');
  // Must have preview card container
  assert.match(template, /id="document-preview-card"/);
  // Must have state containers
  assert.match(template, /id="document-preview-empty"/);
  assert.match(template, /id="document-preview-loading"/);
  assert.match(template, /id="document-preview-error"/);
  assert.match(template, /id="document-preview-content"/);
  // Must have content elements
  assert.match(template, /id="document-preview-thumbnail"/);
  assert.match(template, /id="document-preview-title"/);
  assert.match(template, /id="document-preview-page-count"/);
  // Must have ARIA attributes for accessibility
  assert.match(template, /role="complementary"/);
  assert.match(template, /aria-label="Document preview"/);
});

// =============================================================================
// Phase 3: Linked Field Placement
// =============================================================================

const agreementLinkedPlacementPath = path.resolve(
  testFileDir,
  '../src/esign/pages/agreement-form/linked-placement.ts',
);

test('Phase 3 contract: linked-placement.ts module exists and exports core functions', () => {
  assert.ok(fs.existsSync(agreementLinkedPlacementPath), 'linked-placement.ts must exist');
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must export link group state management functions
  assert.match(source, /export function createLinkGroupState\(\)/);
  assert.match(source, /export function createLinkGroup\(/);
  assert.match(source, /export function addLinkGroup\(/);
  assert.match(source, /export function removeLinkGroup\(/);
  // Must export field linking functions
  assert.match(source, /export function unlinkField\(/);
  assert.match(source, /export function relinkField\(/);
  assert.match(source, /export function isFieldLinked\(/);
  // Must export placement computation functions
  assert.match(source, /export function computeLinkedPlacements\(/);
  assert.match(source, /export function convertToManualPlacement\(/);
  assert.match(source, /export function isLinkedPlacement\(/);
});

test('Phase 3 contract: linked-placement.ts implements link group state management', () => {
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must define LinkGroupState return type
  assert.match(source, /groups: new Map\(\)/);
  assert.match(source, /definitionToGroup: new Map\(\)/);
  assert.match(source, /unlinkedDefinitions: new Set\(\)/);
  // Must implement addLinkGroup with immutable update
  assert.match(source, /const newGroups = new Map\(state\.groups\)/);
  assert.match(source, /newGroups\.set\(group\.id, group\)/);
  // Must implement definitionToGroup mapping
  assert.match(source, /for \(const defId of group\.memberDefinitionIds\)/);
  assert.match(source, /newDefinitionToGroup\.set\(defId, group\.id\)/);
});

test('Phase 3 contract: linked-placement.ts sets template position correctly', () => {
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must export setLinkGroupTemplatePosition function
  assert.match(source, /export function setLinkGroupTemplatePosition\(/);
  // Must get link group for source placement
  assert.match(source, /const group = getFieldLinkGroup\(state, sourcePlacement\.definitionId\)/);
  // Must create template position from source placement
  assert.match(source, /const templatePosition: LinkGroupTemplatePosition = \{/);
  // Must include x, y, width, height in template
  assert.match(source, /x: sourcePlacement\.x/);
  assert.match(source, /y: sourcePlacement\.y/);
});

test('Phase 3 contract: linked-placement.ts computes placement for page', () => {
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must export computeLinkedPlacementForPage function
  assert.match(source, /export function computeLinkedPlacementForPage\(/);
  // Must skip already placed fields
  assert.match(source, /if \(existingPlacementsByDefId\.has\(defId\)\) continue/);
  // Must check for template position
  assert.match(source, /if \(!group \|\| !group\.isActive \|\| !group\.templatePosition\) continue/);
  // Must create new placement with AUTO_LINKED source
  assert.match(source, /placementSource: PLACEMENT_SOURCE\.AUTO_LINKED/);
  // Must use template position
  assert.match(source, /x: group\.templatePosition\.x/);
  assert.match(source, /y: group\.templatePosition\.y/);
});

test('Phase 3 contract: linked-placement.ts supports rule-based link group creation', () => {
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must export function to create link groups from rules
  assert.match(source, /export function createLinkGroupsFromRules\(/);
  // Must group fields by rule ID
  assert.match(source, /const fieldsByRule = new Map<string, string\[\]>\(\)/);
  // Must create link group only for rules with multiple fields
  assert.match(source, /if \(fieldIds\.length > 1\)/);
  // Must use rule ID in group ID
  assert.match(source, /id: `rule_\$\{ruleId\}`/);
});

test('Phase 3 contract: linked-placement.ts supports serialization/deserialization', () => {
  const source = fs.readFileSync(agreementLinkedPlacementPath, 'utf8');
  // Must export serialization function
  assert.match(source, /export function serializeLinkGroupState\(/);
  // Must export deserialization function
  assert.match(source, /export function deserializeLinkGroupState\(/);
  // Must serialize groups and unlinked definitions
  assert.match(source, /groups:/);
  assert.match(source, /unlinkedDefinitions: Array\.from\(state\.unlinkedDefinitions\)/);
});

test('Phase 3 contract: constants.ts exports AUTO_LINKED placement source', () => {
  const source = fs.readFileSync(agreementConstantsPath, 'utf8');
  // Must export AUTO_LINKED in PLACEMENT_SOURCE
  assert.match(source, /AUTO_LINKED: 'auto_linked'/);
});

test('Phase 3 contract: constants.ts exports LINKED_PLACEMENT_DEFAULTS', () => {
  const source = fs.readFileSync(agreementConstantsPath, 'utf8');
  // Must export linked placement defaults
  assert.match(source, /export const LINKED_PLACEMENT_DEFAULTS = \{/);
  // Must include vertical offset
  assert.match(source, /VERTICAL_OFFSET:/);
  // Must include max per page
  assert.match(source, /MAX_PER_PAGE:/);
});

test('Phase 3 contract: contracts.ts exports LinkGroup, LinkGroupState, and LinkGroupTemplatePosition interfaces', () => {
  const source = fs.readFileSync(agreementContractsPath, 'utf8');
  // LinkGroupTemplatePosition interface must be exported
  assert.match(source, /export interface LinkGroupTemplatePosition \{/);
  assert.match(source, /x: number;/);
  assert.match(source, /y: number;/);
  assert.match(source, /width: number;/);
  assert.match(source, /height: number;/);
  // LinkGroup interface must be exported
  assert.match(source, /export interface LinkGroup \{/);
  assert.match(source, /id: string;/);
  assert.match(source, /memberDefinitionIds: string\[\];/);
  assert.match(source, /sourceFieldId\?: string;/);
  assert.match(source, /isActive: boolean;/);
  // Must include templatePosition
  assert.match(source, /templatePosition\?: LinkGroupTemplatePosition;/);
  // LinkGroupState interface must be exported
  assert.match(source, /export interface LinkGroupState \{/);
  assert.match(source, /groups: Map<string, LinkGroup>;/);
  assert.match(source, /definitionToGroup: Map<string, string>;/);
  assert.match(source, /unlinkedDefinitions: Set<string>;/);
});

test('Phase 3 contract: contracts.ts includes link metadata in NormalizedPlacementInstance', () => {
  const source = fs.readFileSync(agreementContractsPath, 'utf8');
  // Must include linkGroupId
  assert.match(source, /linkGroupId\?: string;/);
  // Must include isUnlinked flag
  assert.match(source, /isUnlinked\?: boolean;/);
  // Must include linkedFromFieldId
  assert.match(source, /linkedFromFieldId\?: string;/);
});

test('Phase 3 contract: contracts.ts includes link metadata in PlacementFormPayload', () => {
  const source = fs.readFileSync(agreementContractsPath, 'utf8');
  // Must include link_group_id
  assert.match(source, /link_group_id\?: string;/);
  // Must include is_unlinked flag
  assert.match(source, /is_unlinked\?: boolean;/);
  // Must include linked_from_field_id
  assert.match(source, /linked_from_field_id\?: string;/);
  // Must include placement_source
  assert.match(source, /placement_source\?: string;/);
});

test('Phase 3 contract: runtime imports and initializes link group state', () => {
  const source = readSources(agreementCompositionPath, agreementPlacementEditorPath);
  assert.match(source, /createLinkGroupState/);
  assert.match(source, /from '\.\/linked-placement'/);
  assert.match(source, /createLinkGroupState\(\)/);
});

test('Phase 3 contract: runtime sets template position on manual field placement', () => {
  const source = read(agreementPlacementEditorPath);
  assert.match(source, /function setLinkedPlacementTemplate\(/);
  assert.match(source, /if \(placementSource === PLACEMENT_SOURCE\.MANUAL && linkGroupId\) \{[\s\S]*?triggerLinkedPlacements\(instance\)/);
  assert.match(source, /const result = setLinkGroupTemplatePosition\(/);
  assert.match(source, /state\.linkGroupState = addLinkGroup\(state\.linkGroupState, result\.updatedGroup\)/);
});

test('Phase 3 contract: runtime auto-places linked fields on page navigation', () => {
  const source = read(agreementPlacementEditorPath);
  assert.match(source, /function autoPlaceLinkedFieldsForPage\(/);
  assert.match(source, /const result = computeLinkedPlacementForPage\(/);
  assert.match(source, /autoPlaceLinkedFieldsForPage\(state\.currentPage\)/);
  assert.match(source, /state\.fieldInstances\.push\(result\.newPlacement\)/);
});

test('Phase 3 contract: runtime creates link groups from rules', () => {
  const source = read(agreementFieldDefinitionsPath);
  assert.match(source, /const fieldsByRuleId = new Map\(\)/);
  assert.match(source, /addLinkGroup\(/);
});

test('Phase 3 contract: ExpandedRuleField includes ruleId for link group creation', () => {
  const source = fs.readFileSync(agreementContractsPath, 'utf8');
  // ExpandedRuleField must include ruleId
  assert.match(source, /ruleId\?: string;/);
  // Must have comment explaining purpose
  assert.match(source, /Rule ID that generated this field/);
});

test('Phase 3 contract: normalization adds ruleId to expanded rule fields', () => {
  const source = fs.readFileSync(agreementNormalizationPath, 'utf8');
  // expandRuleDefinitionsForPreview must include ruleId
  assert.match(source, /ruleId: baseRuleID/);
});
