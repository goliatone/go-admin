import { PLACEMENT_SOURCE } from './constants';
import type {
  LinkGroupState,
  NormalizedPlacementInstance,
  PlacementFormPayload,
} from './contracts';
import {
  addLinkGroup,
  computeLinkedPlacementForPage,
  createLinkGroupState,
  getFieldLinkGroup,
  relinkField,
  setLinkGroupTemplatePosition,
  unlinkField,
} from './linked-placement';
import { normalizePlacementInstance, toPlacementFormPayload } from './normalization';

interface PDFPageViewport {
  width: number;
  height: number;
}

interface PDFRenderTask {
  promise: Promise<unknown>;
}

interface PDFPageProxy {
  getViewport(options: { scale: number }): PDFPageViewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D | null;
    viewport: PDFPageViewport;
  }): PDFRenderTask;
}

interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

interface PDFLoadingTask {
  promise: Promise<PDFDocumentProxy>;
}

interface PlacementFieldDefinition {
  definitionId: string;
  fieldType: string;
  participantId: string;
  participantName: string;
  page: number;
  linkGroupId?: string;
}

interface PlacementFieldDefinitionLookupResult {
  id: string;
  type: string;
  participant_id: string;
  participant_name: string;
  page: number;
  link_group_id: string;
}

interface PlacementEditorError extends Error {
  code?: string;
  status?: number;
}

interface PlacementFieldData {
  definitionId: string;
  fieldType: string;
  participantId: string;
  participantName: string;
}

interface PlacementSuggestion {
  id?: string;
  field_definition_id: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  resolver_id?: string;
  confidence?: number;
}

interface PlacementResolverScore {
  resolver_id?: string;
  supported?: boolean;
  score?: number;
}

interface PlacementRunResult {
  run_id?: string;
  id?: string;
  status?: string;
  elapsed_ms?: number;
  suggestions?: PlacementSuggestion[];
  resolver_scores?: PlacementResolverScore[];
}

interface PlacementApiResponse {
  run?: PlacementRunResult;
}

interface PlacementModalResult extends PlacementRunResult {}

interface PlacementEditorRefs {
  loading: HTMLElement | null;
  noDocument: HTMLElement | null;
  fieldsList: HTMLElement | null;
  viewer: HTMLElement | null;
  canvas: HTMLCanvasElement | null;
  overlays: HTMLElement | null;
  canvasContainer: HTMLElement | null;
  currentPage: HTMLElement | null;
  totalPages: HTMLElement | null;
  zoomLevel: HTMLElement | null;
  totalFields: HTMLElement | null;
  placedCount: HTMLElement | null;
  unplacedCount: HTMLElement | null;
  autoPlaceBtn: HTMLButtonElement | null;
  policyPreset: HTMLSelectElement | null;
  prevBtn: HTMLButtonElement | null;
  nextBtn: HTMLButtonElement | null;
  zoomIn: HTMLButtonElement | null;
  zoomOut: HTMLButtonElement | null;
  zoomFit: HTMLButtonElement | null;
  linkBatchActions: HTMLElement | null;
  linkAllBtn: HTMLButtonElement | null;
  unlinkAllBtn: HTMLButtonElement | null;
  fieldInstancesContainer: HTMLElement | null;
}

interface PlacementEditorInstance extends NormalizedPlacementInstance {
  resolverId?: string;
  confidence?: number;
  placementRunId?: string | null;
}

interface PlacementEditorState {
  pdfDoc: PDFDocumentProxy | null;
  currentPage: number;
  totalPages: number;
  scale: number;
  fieldInstances: PlacementEditorInstance[];
  selectedFieldId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  dragOffset: { x: number; y: number };
  uiHandlersBound: boolean;
  autoPlaceBound: boolean;
  loadRequestVersion: number;
  linkGroupState: LinkGroupState;
}

interface AutoPlaceState {
  currentRunId: string | null;
  suggestions: PlacementSuggestion[];
  resolverScores: PlacementResolverScore[];
  policy: string | null;
  isRunning: boolean;
}

interface PlacementEditorControllerOptions {
  apiBase?: string;
  apiVersionBase?: string;
  documentIdInput?: HTMLInputElement | null;
  fieldPlacementsJSONInput?: HTMLInputElement | null;
  initialFieldInstances?: Array<Record<string, unknown> | null | undefined>;
  initialLinkGroupState?: LinkGroupState | null;
  collectPlacementFieldDefinitions(): PlacementFieldDefinition[];
  getFieldDefinitionById(definitionId: string): PlacementFieldDefinitionLookupResult | null;
  parseAPIError(response: Response, fallbackMessage: string): Promise<PlacementEditorError>;
  mapUserFacingError(message: string, code?: string, status?: number): string;
  showToast(message: string, type?: 'success' | 'error' | 'warning' | 'info'): void;
  escapeHtml(value: unknown): string;
  onPlacementsChanged?(): void;
}

export interface PlacementEditorController {
  bindEvents(): void;
  initPlacementEditor(): Promise<void>;
  getState(): PlacementEditorState;
  getLinkGroupState(): LinkGroupState;
  setLinkGroupState(nextState: LinkGroupState | null | undefined): void;
  buildPlacementFormEntries(): PlacementFormPayload[];
  updateFieldInstancesFormData(options?: { silent?: boolean }): PlacementFormPayload[];
  restoreFieldPlacementsFromState(nextState: { fieldPlacements?: Array<Record<string, unknown> | null | undefined> } | null | undefined): void;
}

declare global {
  interface Window {
    pdfjsLib?: {
      getDocument(options: {
        url: string;
        withCredentials: boolean;
        disableWorker: boolean;
      }): PDFLoadingTask;
    };
    toastManager?: {
      info(message: string): void;
      success(message: string): void;
      error(message: string): void;
    };
  }
}

const TYPE_COLORS = {
  signature: { bg: 'bg-blue-500', border: 'border-blue-500', fill: 'rgba(59, 130, 246, 0.2)' },
  name: { bg: 'bg-green-500', border: 'border-green-500', fill: 'rgba(34, 197, 94, 0.2)' },
  date_signed: { bg: 'bg-purple-500', border: 'border-purple-500', fill: 'rgba(168, 85, 247, 0.2)' },
  text: { bg: 'bg-gray-500', border: 'border-gray-500', fill: 'rgba(107, 114, 128, 0.2)' },
  checkbox: { bg: 'bg-indigo-500', border: 'border-indigo-500', fill: 'rgba(99, 102, 241, 0.2)' },
  initials: { bg: 'bg-orange-500', border: 'border-orange-500', fill: 'rgba(249, 115, 22, 0.2)' },
};

const DEFAULT_FIELD_SIZES = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 },
};

export function createPlacementEditorController(
  options: PlacementEditorControllerOptions,
): PlacementEditorController {
  const {
    apiBase,
    apiVersionBase,
    documentIdInput,
    fieldPlacementsJSONInput,
    initialFieldInstances = [],
    initialLinkGroupState = null,
    collectPlacementFieldDefinitions,
    getFieldDefinitionById,
    parseAPIError,
    mapUserFacingError,
    showToast,
    escapeHtml,
    onPlacementsChanged,
  } = options;

  const state = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1.0,
    fieldInstances: Array.isArray(initialFieldInstances)
      ? initialFieldInstances.map((instance, index) => normalizePlacementInstance(instance, index))
      : [],
    selectedFieldId: null,
    isDragging: false,
    isResizing: false,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: false,
    autoPlaceBound: false,
    loadRequestVersion: 0,
    linkGroupState: initialLinkGroupState || createLinkGroupState(),
  };

  const autoPlaceState = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: false,
  };

  function generatePlacementID(prefix = 'fi') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  function getPlacementEls(): PlacementEditorRefs {
    return {
      loading: document.getElementById('placement-loading') as HTMLElement | null,
      noDocument: document.getElementById('placement-no-document') as HTMLElement | null,
      fieldsList: document.getElementById('placement-fields-list') as HTMLElement | null,
      viewer: document.getElementById('placement-viewer') as HTMLElement | null,
      canvas: document.getElementById('placement-pdf-canvas') as HTMLCanvasElement | null,
      overlays: document.getElementById('placement-overlays-container') as HTMLElement | null,
      canvasContainer: document.getElementById('placement-canvas-container') as HTMLElement | null,
      currentPage: document.getElementById('placement-current-page') as HTMLElement | null,
      totalPages: document.getElementById('placement-total-pages') as HTMLElement | null,
      zoomLevel: document.getElementById('placement-zoom-level') as HTMLElement | null,
      totalFields: document.getElementById('placement-total-fields') as HTMLElement | null,
      placedCount: document.getElementById('placement-placed-count') as HTMLElement | null,
      unplacedCount: document.getElementById('placement-unplaced-count') as HTMLElement | null,
      autoPlaceBtn: document.getElementById('auto-place-btn') as HTMLButtonElement | null,
      policyPreset: document.getElementById('placement-policy-preset') as HTMLSelectElement | null,
      prevBtn: document.getElementById('placement-prev-page') as HTMLButtonElement | null,
      nextBtn: document.getElementById('placement-next-page') as HTMLButtonElement | null,
      zoomIn: document.getElementById('placement-zoom-in') as HTMLButtonElement | null,
      zoomOut: document.getElementById('placement-zoom-out') as HTMLButtonElement | null,
      zoomFit: document.getElementById('placement-zoom-fit') as HTMLButtonElement | null,
      linkBatchActions: document.getElementById('link-batch-actions') as HTMLElement | null,
      linkAllBtn: document.getElementById('link-all-btn') as HTMLButtonElement | null,
      unlinkAllBtn: document.getElementById('unlink-all-btn') as HTMLButtonElement | null,
      fieldInstancesContainer: document.getElementById('field-instances-container') as HTMLElement | null,
    };
  }

  function getState(): PlacementEditorState {
    return state;
  }

  function getLinkGroupState(): LinkGroupState {
    return state.linkGroupState;
  }

  function setLinkGroupState(nextState: LinkGroupState | null | undefined): void {
    state.linkGroupState = nextState || createLinkGroupState();
  }

  function buildPlacementFormEntries(): PlacementFormPayload[] {
    return state.fieldInstances.map((instance, index) => toPlacementFormPayload(instance, index));
  }

  function updateFieldInstancesFormData(options = {}) {
    const { silent = false } = options;
    const els = getPlacementEls();
    if (els.fieldInstancesContainer) {
      els.fieldInstancesContainer.innerHTML = '';
    }
    const placementEntries = buildPlacementFormEntries();
    if (fieldPlacementsJSONInput) {
      fieldPlacementsJSONInput.value = JSON.stringify(placementEntries);
    }
    if (!silent) {
      onPlacementsChanged?.();
    }
    return placementEntries;
  }

  function updatePlacementStats() {
    const els = getPlacementEls();
    const paletteItems = Array.from(document.querySelectorAll('.placement-field-item'));
    const totalFields = paletteItems.length;
    const activeDefinitionIDs = new Set(
      paletteItems.map((item) => String(item.dataset.definitionId || '').trim()).filter((id) => id),
    );
    const placedDefinitionIDs = new Set();
    state.fieldInstances.forEach((instance) => {
      const definitionID = String(instance.definitionId || '').trim();
      if (activeDefinitionIDs.has(definitionID)) {
        placedDefinitionIDs.add(definitionID);
      }
    });
    const placedCount = placedDefinitionIDs.size;
    const unplacedCount = Math.max(0, totalFields - placedCount);

    if (els.totalFields) els.totalFields.textContent = String(totalFields);
    if (els.placedCount) els.placedCount.textContent = String(placedCount);
    if (els.unplacedCount) els.unplacedCount.textContent = String(unplacedCount);
  }

  function markFieldAsPlaced(definitionId, isAutoLinked = false) {
    const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${definitionId}"]`);
    if (!fieldItem) return;
    fieldItem.classList.add('opacity-50');
    fieldItem.draggable = false;
    const status = fieldItem.querySelector('.placement-status');
    if (status) {
      status.textContent = 'Placed';
      status.classList.remove('text-amber-600');
      status.classList.add('text-green-600');
    }
    if (isAutoLinked) {
      fieldItem.classList.add('just-linked');
    }
  }

  function unmarkFieldAsPlaced(definitionId) {
    const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${definitionId}"]`);
    if (!fieldItem) return;
    fieldItem.classList.remove('opacity-50');
    fieldItem.draggable = true;
    const status = fieldItem.querySelector('.placement-status');
    if (status) {
      status.textContent = 'Not placed';
      status.classList.remove('text-green-600');
      status.classList.add('text-amber-600');
    }
  }

  function flashLinkedSidebarItems() {
    const items = document.querySelectorAll('.placement-field-item.just-linked');
    items.forEach((item) => {
      item.classList.add('linked-flash');
      setTimeout(() => {
        item.classList.remove('linked-flash', 'just-linked');
      }, 600);
    });
  }

  function announceLinkedPlacements(count) {
    const message = count === 1
      ? 'Auto-placed 1 linked field'
      : `Auto-placed ${count} linked fields`;

    if (window.toastManager) {
      window.toastManager.info(message);
    }

    const srAnnouncement = document.createElement('div');
    srAnnouncement.setAttribute('role', 'status');
    srAnnouncement.setAttribute('aria-live', 'polite');
    srAnnouncement.className = 'sr-only';
    srAnnouncement.textContent = message;
    document.body.appendChild(srAnnouncement);
    setTimeout(() => srAnnouncement.remove(), 1000);

    flashLinkedSidebarItems();
  }

  function createLinkToggle(definitionId, isLinked) {
    const toggle = document.createElement('div');
    toggle.className = 'link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors';
    toggle.dataset.definitionId = definitionId;
    toggle.dataset.isLinked = String(isLinked);
    toggle.title = isLinked ? 'Click to unlink this field' : 'Click to re-link this field';
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-label', isLinked ? 'Unlink field from group' : 'Re-link field to group');
    toggle.setAttribute('tabindex', '0');

    if (isLinked) {
      toggle.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>`;
    } else {
      toggle.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    }

    const onActivate = () => toggleFieldLink(definitionId, isLinked);
    toggle.addEventListener('click', onActivate);
    toggle.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate();
      }
    });

    return toggle;
  }

  function updateLinkBatchButtonStates() {
    const els = getPlacementEls();
    if (els.linkAllBtn) {
      els.linkAllBtn.disabled = state.linkGroupState.unlinkedDefinitions.size === 0;
    }
    if (els.unlinkAllBtn) {
      let hasLinked = false;
      for (const definitionId of state.linkGroupState.definitionToGroup.keys()) {
        if (!state.linkGroupState.unlinkedDefinitions.has(definitionId)) {
          hasLinked = true;
          break;
        }
      }
      els.unlinkAllBtn.disabled = !hasLinked;
    }
  }

  function setupLinkBatchActions() {
    const els = getPlacementEls();
    if (els.linkAllBtn && !els.linkAllBtn.dataset.bound) {
      els.linkAllBtn.dataset.bound = 'true';
      els.linkAllBtn.addEventListener('click', () => {
        const unlinkedCount = state.linkGroupState.unlinkedDefinitions.size;
        if (unlinkedCount === 0) return;
        for (const definitionId of state.linkGroupState.unlinkedDefinitions) {
          state.linkGroupState = relinkField(state.linkGroupState, definitionId);
        }
        if (window.toastManager) {
          window.toastManager.success(`Re-linked ${unlinkedCount} field${unlinkedCount > 1 ? 's' : ''}`);
        }
        refreshPlacementSidebar();
      });
    }

    if (els.unlinkAllBtn && !els.unlinkAllBtn.dataset.bound) {
      els.unlinkAllBtn.dataset.bound = 'true';
      els.unlinkAllBtn.addEventListener('click', () => {
        let unlinkedCount = 0;
        for (const definitionId of state.linkGroupState.definitionToGroup.keys()) {
          if (!state.linkGroupState.unlinkedDefinitions.has(definitionId)) {
            state.linkGroupState = unlinkField(state.linkGroupState, definitionId);
            unlinkedCount += 1;
          }
        }
        if (unlinkedCount > 0 && window.toastManager) {
          window.toastManager.success(`Unlinked ${unlinkedCount} field${unlinkedCount > 1 ? 's' : ''}`);
        }
        refreshPlacementSidebar();
      });
    }

    updateLinkBatchButtonStates();
  }

  function buildPlacementDefinitionsWithLinks() {
    const placementDefinitions = collectPlacementFieldDefinitions();
    return placementDefinitions.map((definition) => {
      const definitionId = String(definition.definitionId || '').trim();
      const linkGroupId = state.linkGroupState.definitionToGroup.get(definitionId) || '';
      const isUnlinked = state.linkGroupState.unlinkedDefinitions.has(definitionId);
      return { ...definition, definitionId, linkGroupId, isUnlinked };
    });
  }

  function renderPlacementSidebar() {
    const els = getPlacementEls();
    if (!els.fieldsList) return;

    els.fieldsList.innerHTML = '';
    const defsWithLinks = buildPlacementDefinitionsWithLinks();

    if (els.linkBatchActions) {
      els.linkBatchActions.classList.toggle('hidden', state.linkGroupState.groups.size === 0);
    }

    defsWithLinks.forEach((definition, index) => {
      const definitionId = definition.definitionId;
      const fieldType = String(definition.fieldType || 'text').trim() || 'text';
      const participantId = String(definition.participantId || '').trim();
      const participantName = String(definition.participantName || 'Unassigned').trim() || 'Unassigned';
      const page = Number.parseInt(String(definition.page || '1'), 10) || 1;
      const linkGroupId = definition.linkGroupId;
      const isUnlinked = definition.isUnlinked;
      if (!definitionId) return;

      state.fieldInstances.forEach((instance) => {
        if (instance.definitionId === definitionId) {
          instance.type = fieldType;
          instance.participantId = participantId;
          instance.participantName = participantName;
        }
      });

      const colors = TYPE_COLORS[fieldType] || TYPE_COLORS.text;
      const isPlaced = state.fieldInstances.some((instance) => instance.definitionId === definitionId);

      const fieldItem = document.createElement('div');
      fieldItem.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${isPlaced ? 'opacity-50' : ''}`;
      fieldItem.draggable = !isPlaced;
      fieldItem.dataset.definitionId = definitionId;
      fieldItem.dataset.fieldType = fieldType;
      fieldItem.dataset.participantId = participantId;
      fieldItem.dataset.participantName = participantName;
      fieldItem.dataset.page = String(page);
      if (linkGroupId) {
        fieldItem.dataset.linkGroupId = linkGroupId;
      }

      const colorDot = document.createElement('span');
      colorDot.className = `w-3 h-3 rounded ${colors.bg}`;

      const details = document.createElement('div');
      details.className = 'flex-1 text-xs';

      const typeLabel = document.createElement('div');
      typeLabel.className = 'font-medium capitalize';
      typeLabel.textContent = fieldType.replace(/_/g, ' ');

      const participantLabel = document.createElement('div');
      participantLabel.className = 'text-gray-500';
      participantLabel.textContent = participantName;

      const status = document.createElement('span');
      status.className = `placement-status text-xs ${isPlaced ? 'text-green-600' : 'text-amber-600'}`;
      status.textContent = isPlaced ? 'Placed' : 'Not placed';

      details.appendChild(typeLabel);
      details.appendChild(participantLabel);
      fieldItem.appendChild(colorDot);
      fieldItem.appendChild(details);
      fieldItem.appendChild(status);

      fieldItem.addEventListener('dragstart', (event) => {
        if (isPlaced) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.setData('application/json', JSON.stringify({
          definitionId,
          fieldType,
          participantId,
          participantName,
        }));
        event.dataTransfer.effectAllowed = 'copy';
        fieldItem.classList.add('opacity-50');
      });

      fieldItem.addEventListener('dragend', () => {
        fieldItem.classList.remove('opacity-50');
      });

      els.fieldsList.appendChild(fieldItem);

      const nextDefinition = defsWithLinks[index + 1];
      if (linkGroupId && nextDefinition && nextDefinition.linkGroupId === linkGroupId) {
        els.fieldsList.appendChild(createLinkToggle(definitionId, !isUnlinked));
      }
    });

    setupLinkBatchActions();
    updatePlacementStats();
  }

  function refreshPlacementSidebar() {
    renderPlacementSidebar();
  }

  function toggleFieldLink(definitionId, currentlyLinked) {
    if (currentlyLinked) {
      state.linkGroupState = unlinkField(state.linkGroupState, definitionId);
      if (window.toastManager) {
        window.toastManager.info('Field unlinked');
      }
    } else {
      state.linkGroupState = relinkField(state.linkGroupState, definitionId);
      if (window.toastManager) {
        window.toastManager.info('Field re-linked');
      }
    }
    refreshPlacementSidebar();
  }

  async function renderPage(pageNum) {
    if (!state.pdfDoc) return;
    const els = getPlacementEls();
    if (!els.canvas || !els.canvasContainer) return;

    const ctx = els.canvas.getContext('2d');
    const page = await state.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: state.scale });

    els.canvas.width = viewport.width;
    els.canvas.height = viewport.height;
    els.canvasContainer.style.width = `${viewport.width}px`;
    els.canvasContainer.style.height = `${viewport.height}px`;

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    if (els.currentPage) {
      els.currentPage.textContent = String(pageNum);
    }
    renderFieldOverlays();
  }

  function setLinkedPlacementTemplate(sourcePlacement) {
    const result = setLinkGroupTemplatePosition(state.linkGroupState, sourcePlacement);
    if (!result) return;
    state.linkGroupState = addLinkGroup(state.linkGroupState, result.updatedGroup);
  }

  function autoPlaceLinkedFieldsForPage(targetPage) {
    const fieldDefinitions = new Map();
    collectPlacementFieldDefinitions().forEach((definition) => {
      const definitionId = String(definition.definitionId || '').trim();
      if (!definitionId) return;
      fieldDefinitions.set(definitionId, {
        type: String(definition.fieldType || 'text').trim() || 'text',
        participantId: String(definition.participantId || '').trim(),
        participantName: String(definition.participantName || 'Unknown').trim() || 'Unknown',
        page: Number.parseInt(String(definition.page || '1'), 10) || 1,
        linkGroupId: state.linkGroupState.definitionToGroup.get(definitionId),
      });
    });

    let placedCount = 0;
    while (placedCount < 10) {
      const result = computeLinkedPlacementForPage(
        state.linkGroupState,
        targetPage,
        state.fieldInstances,
        fieldDefinitions,
      );
      if (!result || !result.newPlacement) break;
      state.fieldInstances.push(result.newPlacement);
      markFieldAsPlaced(result.newPlacement.definitionId, true);
      placedCount += 1;
    }

    if (placedCount > 0) {
      renderFieldOverlays();
      updatePlacementStats();
      updateFieldInstancesFormData();
      announceLinkedPlacements(placedCount);
    }
  }

  function triggerLinkedPlacements(sourcePlacement) {
    setLinkedPlacementTemplate(sourcePlacement);
  }

  function renderFieldOverlays() {
    const els = getPlacementEls();
    if (!els.overlays) return;

    els.overlays.innerHTML = '';
    els.overlays.style.pointerEvents = 'auto';

    state.fieldInstances
      .filter((instance) => instance.page === state.currentPage)
      .forEach((instance) => {
        const colors = TYPE_COLORS[instance.type] || TYPE_COLORS.text;
        const isSelected = state.selectedFieldId === instance.id;
        const isAutoLinked = instance.placementSource === PLACEMENT_SOURCE.AUTO_LINKED;

        const overlay = document.createElement('div');
        const borderStyle = isAutoLinked ? 'border-dashed' : 'border-solid';
        overlay.className = `field-overlay absolute cursor-move ${colors.border} border-2 ${borderStyle} rounded`;
        overlay.style.cssText = `
          left: ${instance.x * state.scale}px;
          top: ${instance.y * state.scale}px;
          width: ${instance.width * state.scale}px;
          height: ${instance.height * state.scale}px;
          background-color: ${colors.fill};
          ${isSelected ? 'box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);' : ''}
        `;
        overlay.dataset.instanceId = instance.id;

        const label = document.createElement('div');
        label.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${colors.bg}`;
        label.textContent = `${instance.type.replace('_', ' ')} - ${instance.participantName}`;
        overlay.appendChild(label);

        if (isAutoLinked) {
          const linkBadge = document.createElement('div');
          linkBadge.className = 'absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center';
          linkBadge.title = 'Auto-linked from template';
          linkBadge.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`;
          overlay.appendChild(linkBadge);
        }

        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize';
        resizeHandle.style.cssText = 'transform: translate(50%, 50%);';
        overlay.appendChild(resizeHandle);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          removeFieldInstance(instance.id);
        });
        overlay.appendChild(deleteBtn);

        overlay.addEventListener('mousedown', (event) => {
          if (event.target === resizeHandle) {
            startResize(event, instance);
          } else if (event.target !== deleteBtn) {
            startDrag(event, instance, overlay);
          }
        });

        overlay.addEventListener('click', () => {
          state.selectedFieldId = instance.id;
          renderFieldOverlays();
        });

        els.overlays.appendChild(overlay);
      });
  }

  function addFieldInstance(fieldData, x, y, options = {}) {
    const sizes = DEFAULT_FIELD_SIZES[fieldData.fieldType] || DEFAULT_FIELD_SIZES.text;
    const placementSource = options.placementSource || PLACEMENT_SOURCE.MANUAL;
    const linkGroupId = options.linkGroupId || getFieldLinkGroup(state.linkGroupState, fieldData.definitionId)?.id;
    const instance = {
      id: generatePlacementID('fi'),
      definitionId: fieldData.definitionId,
      type: fieldData.fieldType,
      participantId: fieldData.participantId,
      participantName: fieldData.participantName,
      page: state.currentPage,
      x: Math.max(0, x - sizes.width / 2),
      y: Math.max(0, y - sizes.height / 2),
      width: sizes.width,
      height: sizes.height,
      placementSource,
      linkGroupId,
      linkedFromFieldId: options.linkedFromFieldId,
    };

    state.fieldInstances.push(instance);
    markFieldAsPlaced(fieldData.definitionId);

    if (placementSource === PLACEMENT_SOURCE.MANUAL && linkGroupId) {
      triggerLinkedPlacements(instance);
    }

    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  function addFieldInstanceFromSuggestion(fieldData, suggestion) {
    const instance = {
      id: generatePlacementID('instance'),
      definitionId: fieldData.definitionId,
      type: fieldData.fieldType,
      participantId: fieldData.participantId,
      participantName: fieldData.participantName,
      page: suggestion.page_number,
      x: suggestion.x,
      y: suggestion.y,
      width: suggestion.width,
      height: suggestion.height,
      placementSource: PLACEMENT_SOURCE.AUTO,
      resolverId: suggestion.resolver_id,
      confidence: suggestion.confidence,
      placementRunId: autoPlaceState.currentRunId,
    };
    state.fieldInstances.push(instance);
    markFieldAsPlaced(fieldData.definitionId);
    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  function startDrag(event, instance, overlay) {
    event.preventDefault();
    state.isDragging = true;
    state.selectedFieldId = instance.id;

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = instance.x * state.scale;
    const startTop = instance.y * state.scale;

    function onMouseMove(nextEvent) {
      const dx = nextEvent.clientX - startX;
      const dy = nextEvent.clientY - startY;
      instance.x = Math.max(0, (startLeft + dx) / state.scale);
      instance.y = Math.max(0, (startTop + dy) / state.scale);
      instance.placementSource = PLACEMENT_SOURCE.MANUAL;
      overlay.style.left = `${instance.x * state.scale}px`;
      overlay.style.top = `${instance.y * state.scale}px`;
    }

    function onMouseUp() {
      state.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      updateFieldInstancesFormData();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function startResize(event, instance) {
    event.preventDefault();
    event.stopPropagation();
    state.isResizing = true;

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = instance.width;
    const startHeight = instance.height;

    function onMouseMove(nextEvent) {
      const dx = (nextEvent.clientX - startX) / state.scale;
      const dy = (nextEvent.clientY - startY) / state.scale;
      instance.width = Math.max(30, startWidth + dx);
      instance.height = Math.max(20, startHeight + dy);
      instance.placementSource = PLACEMENT_SOURCE.MANUAL;
      renderFieldOverlays();
    }

    function onMouseUp() {
      state.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      updateFieldInstancesFormData();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function removeFieldInstance(instanceId) {
    const instance = state.fieldInstances.find((item) => item.id === instanceId);
    if (!instance) return;
    state.fieldInstances = state.fieldInstances.filter((item) => item.id !== instanceId);
    unmarkFieldAsPlaced(instance.definitionId);
    renderFieldOverlays();
    updatePlacementStats();
    updateFieldInstancesFormData();
  }

  function setupDropZone(viewer, overlaysContainer) {
    void overlaysContainer;
    const els = getPlacementEls();
    const canvas = els.canvas;
    if (!viewer || !canvas) return;

    viewer.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      canvas.classList.add('ring-2', 'ring-blue-500', 'ring-inset');
    });

    viewer.addEventListener('dragleave', () => {
      canvas.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');
    });

    viewer.addEventListener('drop', (event) => {
      event.preventDefault();
      canvas.classList.remove('ring-2', 'ring-blue-500', 'ring-inset');
      const data = event.dataTransfer.getData('application/json');
      if (!data) return;
      const fieldData = JSON.parse(data);
      const canvasRect = canvas.getBoundingClientRect();
      const x = (event.clientX - canvasRect.left) / state.scale;
      const y = (event.clientY - canvasRect.top) / state.scale;
      addFieldInstance(fieldData, x, y);
    });
  }

  function setupPageNavigation() {
    const els = getPlacementEls();
    els.prevBtn?.addEventListener('click', async () => {
      if (state.currentPage > 1) {
        state.currentPage -= 1;
        autoPlaceLinkedFieldsForPage(state.currentPage);
        await renderPage(state.currentPage);
      }
    });

    els.nextBtn?.addEventListener('click', async () => {
      if (state.currentPage < state.totalPages) {
        state.currentPage += 1;
        autoPlaceLinkedFieldsForPage(state.currentPage);
        await renderPage(state.currentPage);
      }
    });
  }

  function setupZoomControls() {
    const els = getPlacementEls();
    els.zoomIn?.addEventListener('click', async () => {
      state.scale = Math.min(3.0, state.scale + 0.25);
      if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
      await renderPage(state.currentPage);
    });

    els.zoomOut?.addEventListener('click', async () => {
      state.scale = Math.max(0.5, state.scale - 0.25);
      if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
      await renderPage(state.currentPage);
    });

    els.zoomFit?.addEventListener('click', async () => {
      if (!state.pdfDoc || !els.viewer) return;
      const page = await state.pdfDoc.getPage(state.currentPage);
      const viewport = page.getViewport({ scale: 1.0 });
      state.scale = (els.viewer.clientWidth - 40) / viewport.width;
      if (els.zoomLevel) els.zoomLevel.textContent = `${Math.round(state.scale * 100)}%`;
      await renderPage(state.currentPage);
    });
  }

  function getSelectedPolicyPreset() {
    return getPlacementEls().policyPreset?.value || 'balanced';
  }

  function getScoreBadgeClass(score) {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-blue-100 text-blue-800';
    if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-600';
  }

  function getConfidenceBadgeClass(confidence) {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.7) return 'bg-blue-100 text-blue-800';
    if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  function formatResolverLabel(resolverId) {
    if (!resolverId) return 'Unknown';
    return resolverId.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  function previewSuggestionOnDocument(suggestion) {
    if (suggestion.page_number !== state.currentPage) {
      state.currentPage = suggestion.page_number;
      void renderPage(suggestion.page_number);
    }

    const overlaysContainer = getPlacementEls().overlays;
    if (!overlaysContainer) return;

    document.getElementById('suggestion-preview-overlay')?.remove();

    const preview = document.createElement('div');
    preview.id = 'suggestion-preview-overlay';
    preview.className = 'absolute pointer-events-none animate-pulse';
    preview.style.cssText = `
      left: ${suggestion.x * state.scale}px;
      top: ${suggestion.y * state.scale}px;
      width: ${suggestion.width * state.scale}px;
      height: ${suggestion.height * state.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `;
    overlaysContainer.appendChild(preview);
    setTimeout(() => preview.remove(), 3000);
  }

  async function sendPlacementFeedback(acceptedCount, rejectedCount) {
    void acceptedCount;
    void rejectedCount;
    return;
  }

  function applyAcceptedSuggestions() {
    const modal = document.getElementById('placement-suggestions-modal');
    if (!modal) return;
    const acceptedItems = modal.querySelectorAll('.suggestion-item[data-accepted="true"]');

    acceptedItems.forEach((item) => {
      const index = Number.parseInt(item.dataset.index, 10);
      const suggestion = autoPlaceState.suggestions[index];
      if (!suggestion) return;

      const fieldDef = getFieldDefinitionById(suggestion.field_definition_id);
      if (!fieldDef) return;

      const fieldItem = document.querySelector(`.placement-field-item[data-definition-id="${suggestion.field_definition_id}"]`);
      if (!fieldItem || fieldItem.classList.contains('opacity-50')) return;

      const fieldData = {
        definitionId: suggestion.field_definition_id,
        fieldType: fieldDef.type,
        participantId: fieldDef.participant_id,
        participantName: fieldItem.dataset.participantName,
      };

      state.currentPage = suggestion.page_number;
      addFieldInstanceFromSuggestion(fieldData, suggestion);
    });

    if (state.pdfDoc) {
      void renderPage(state.currentPage);
    }
    void sendPlacementFeedback(acceptedItems.length, autoPlaceState.suggestions.length - acceptedItems.length);
    showToast(`Applied ${acceptedItems.length} placement${acceptedItems.length !== 1 ? 's' : ''}`, 'success');
  }

  function bindSuggestionActions(modal) {
    modal.querySelectorAll('.accept-suggestion-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.suggestion-item');
        item.classList.add('border-green-500', 'bg-green-50');
        item.classList.remove('border-red-500', 'bg-red-50');
        item.dataset.accepted = 'true';
      });
    });

    modal.querySelectorAll('.reject-suggestion-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const item = button.closest('.suggestion-item');
        item.classList.add('border-red-500', 'bg-red-50');
        item.classList.remove('border-green-500', 'bg-green-50');
        item.dataset.accepted = 'false';
      });
    });

    modal.querySelectorAll('.preview-suggestion-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const index = Number.parseInt(button.dataset.index, 10);
        const suggestion = autoPlaceState.suggestions[index];
        if (suggestion) {
          previewSuggestionOnDocument(suggestion);
        }
      });
    });
  }

  function createSuggestionsModal() {
    const modal = document.createElement('div');
    modal.id = 'placement-suggestions-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden';
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Smart Placement Suggestions</h2>
            <p class="text-sm text-gray-500 mt-0.5">Review and apply AI-generated field placements</p>
          </div>
          <button type="button" id="close-suggestions-modal" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div id="run-stats"></div>
            <div class="flex items-center gap-2">
              <button type="button" id="accept-all-btn" class="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
                Accept All
              </button>
              <button type="button" id="reject-all-btn" class="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors">
                Reject All
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 p-6">
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Suggestions</h3>
              <div id="suggestions-list" class="space-y-3"></div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Resolver Ranking</h3>
              <div id="resolver-info" class="bg-gray-50 rounded-lg p-3"></div>

              <h3 class="text-sm font-medium text-gray-700 mt-4 mb-3">Policy Preset</h3>
              <select id="placement-policy-preset-modal" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="balanced">Balanced (Recommended)</option>
                <option value="accuracy-first">Accuracy First</option>
                <option value="cost-first">Cost Optimized</option>
                <option value="speed-first">Speed Optimized</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Change preset and re-run for different results</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" id="rerun-placement-btn" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Re-run with New Policy
          </button>
          <button type="button" id="apply-suggestions-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Apply Selected
          </button>
        </div>
      </div>
    `;

    modal.querySelector('#close-suggestions-modal').addEventListener('click', () => {
      modal.classList.add('hidden');
    });

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        modal.classList.add('hidden');
      }
    });

    modal.querySelector('#accept-all-btn').addEventListener('click', () => {
      modal.querySelectorAll('.suggestion-item').forEach((item) => {
        item.classList.add('border-green-500', 'bg-green-50');
        item.classList.remove('border-red-500', 'bg-red-50');
        item.dataset.accepted = 'true';
      });
    });

    modal.querySelector('#reject-all-btn').addEventListener('click', () => {
      modal.querySelectorAll('.suggestion-item').forEach((item) => {
        item.classList.add('border-red-500', 'bg-red-50');
        item.classList.remove('border-green-500', 'bg-green-50');
        item.dataset.accepted = 'false';
      });
    });

    modal.querySelector('#apply-suggestions-btn').addEventListener('click', () => {
      applyAcceptedSuggestions();
      modal.classList.add('hidden');
    });

    modal.querySelector('#rerun-placement-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
      const modalPreset = modal.querySelector('#placement-policy-preset-modal');
      const mainPreset = getPlacementEls().policyPreset;
      if (mainPreset && modalPreset) {
        mainPreset.value = modalPreset.value;
      }
      getPlacementEls().autoPlaceBtn?.click();
    });

    return modal;
  }

  function openSuggestionsModal(result) {
    let modal = document.getElementById('placement-suggestions-modal');
    if (!modal) {
      modal = createSuggestionsModal();
      document.body.appendChild(modal);
    }

    const suggestionsContainer = modal.querySelector('#suggestions-list');
    const resolverInfo = modal.querySelector('#resolver-info');
    const runStats = modal.querySelector('#run-stats');

    resolverInfo.innerHTML = autoPlaceState.resolverScores.map((resolverScore) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${escapeHtml(String(resolverScore?.resolver_id || '').replace(/_/g, ' '))}</span>
        <div class="flex items-center gap-2">
          ${resolverScore.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${getScoreBadgeClass(resolverScore.score)}">
              ${(Number(resolverScore?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join('');

    runStats.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${escapeHtml(String(result?.run_id || '').slice(0, 8) || 'N/A')}</code></span>
        <span>Status: <span class="font-medium ${result.status === 'completed' ? 'text-green-600' : 'text-amber-600'}">${escapeHtml(String(result?.status || 'unknown'))}</span></span>
        <span>Time: ${Math.max(0, Number(result?.elapsed_ms || 0))}ms</span>
      </div>
    `;

    suggestionsContainer.innerHTML = autoPlaceState.suggestions.map((suggestion, index) => {
      const fieldDef = getFieldDefinitionById(suggestion.field_definition_id);
      const colors = TYPE_COLORS[fieldDef?.type] || TYPE_COLORS.text;
      const safeType = escapeHtml(String(fieldDef?.type || 'field').replace(/_/g, ' '));
      const safeSuggestionID = escapeHtml(String(suggestion?.id || ''));
      const safePageNumber = Math.max(1, Number(suggestion?.page_number || 1));
      const safeX = Math.round(Number(suggestion?.x || 0));
      const safeY = Math.round(Number(suggestion?.y || 0));
      const safeConfidence = Math.max(0, Number(suggestion?.confidence || 0));
      const safeResolverLabel = escapeHtml(formatResolverLabel(String(suggestion?.resolver_id || '')));

      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${index}" data-suggestion-id="${safeSuggestionID}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${colors.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${safeType}</div>
                <div class="text-xs text-gray-500">Page ${safePageNumber}, (${safeX}, ${safeY})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeClass(suggestion.confidence)}">
                ${(safeConfidence * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${safeResolverLabel}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${index}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join('');

    bindSuggestionActions(modal);
    modal.classList.remove('hidden');
  }

  function autoPlaceFallback() {
    const unplacedFields = document.querySelectorAll('.placement-field-item:not(.opacity-50)');
    let yOffset = 100;
    unplacedFields.forEach((fieldItem) => {
      const fieldData = {
        definitionId: fieldItem.dataset.definitionId,
        fieldType: fieldItem.dataset.fieldType,
        participantId: fieldItem.dataset.participantId,
        participantName: fieldItem.dataset.participantName,
      };
      const sizes = DEFAULT_FIELD_SIZES[fieldData.fieldType] || DEFAULT_FIELD_SIZES.text;
      state.currentPage = state.totalPages;
      addFieldInstance(fieldData, 300, yOffset + sizes.height / 2, { placementSource: PLACEMENT_SOURCE.AUTO_FALLBACK });
      yOffset += sizes.height + 20;
    });
    if (state.pdfDoc) {
      void renderPage(state.totalPages);
    }
    showToast('Fields placed using fallback layout', 'info');
  }

  async function runAutoPlace() {
    const els = getPlacementEls();
    if (!els.autoPlaceBtn || autoPlaceState.isRunning) return;

    const unplacedFields = document.querySelectorAll('.placement-field-item:not(.opacity-50)');
    if (unplacedFields.length === 0) {
      showToast('All fields are already placed', 'info');
      return;
    }

    const agreementId = document.querySelector('input[name="id"]')?.value;
    if (!agreementId) {
      autoPlaceFallback();
      return;
    }

    autoPlaceState.isRunning = true;
    els.autoPlaceBtn.disabled = true;
    els.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;

    try {
      const response = await fetch(`${apiVersionBase}/esign/agreements/${agreementId}/auto-place`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          policy_preset: getSelectedPolicyPreset(),
        }),
      });

      if (!response.ok) {
        throw await parseAPIError(response, 'Auto-placement failed');
      }

      const result = await response.json();
      const run = (result && typeof result === 'object' && result.run && typeof result.run === 'object')
        ? result.run
        : result;

      autoPlaceState.currentRunId = run?.run_id || run?.id || null;
      autoPlaceState.suggestions = run?.suggestions || [];
      autoPlaceState.resolverScores = run?.resolver_scores || [];

      if (autoPlaceState.suggestions.length === 0) {
        showToast('No placement suggestions found. Try placing fields manually.', 'warning');
        autoPlaceFallback();
      } else {
        openSuggestionsModal(result);
      }
    } catch (error) {
      console.error('Auto-place error:', error);
      const userMessage = mapUserFacingError(error?.message || 'Auto-placement failed', error?.code || '', error?.status || 0);
      showToast(`Auto-placement failed: ${userMessage}`, 'error');
      autoPlaceFallback();
    } finally {
      autoPlaceState.isRunning = false;
      els.autoPlaceBtn.disabled = false;
      els.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }

  function bindEvents() {
    const els = getPlacementEls();
    if (els.autoPlaceBtn && !state.autoPlaceBound) {
      els.autoPlaceBtn.addEventListener('click', () => {
        void runAutoPlace();
      });
      state.autoPlaceBound = true;
    }
  }

  async function initPlacementEditor() {
    const els = getPlacementEls();
    if (!documentIdInput?.value) {
      els.loading?.classList.add('hidden');
      els.noDocument?.classList.remove('hidden');
      return;
    }

    els.loading?.classList.remove('hidden');
    els.noDocument?.classList.add('hidden');

    const placementDefinitions = collectPlacementFieldDefinitions();
    const validDefinitionIDs = new Set(
      placementDefinitions.map((definition) => String(definition.definitionId || '').trim()).filter((id) => id),
    );
    state.fieldInstances = state.fieldInstances.filter((instance) =>
      validDefinitionIDs.has(String(instance.definitionId || '').trim()),
    );

    renderPlacementSidebar();

    const loadRequestVersion = ++state.loadRequestVersion;
    const selectedDocumentID = String(documentIdInput.value || '').trim();
    const encodedDocumentID = encodeURIComponent(selectedDocumentID);
    const pdfUrl = `${apiBase}/panels/esign_documents/${encodedDocumentID}/source/pdf`;

    try {
      if (!window.pdfjsLib || typeof window.pdfjsLib.getDocument !== 'function') {
        throw new Error('PDF preview library is unavailable');
      }

      const loadingTask = window.pdfjsLib.getDocument({
        url: pdfUrl,
        withCredentials: true,
        disableWorker: true,
      });
      const pdfDoc = await loadingTask.promise;
      if (loadRequestVersion !== state.loadRequestVersion) {
        return;
      }

      state.pdfDoc = pdfDoc;
      state.totalPages = state.pdfDoc.numPages;
      state.currentPage = 1;

      if (els.totalPages) {
        els.totalPages.textContent = String(state.totalPages);
      }

      await renderPage(state.currentPage);
      els.loading?.classList.add('hidden');

      if (!state.uiHandlersBound) {
        setupDropZone(els.viewer, els.overlays);
        setupPageNavigation();
        setupZoomControls();
        state.uiHandlersBound = true;
      }

      renderFieldOverlays();
    } catch (error) {
      if (loadRequestVersion !== state.loadRequestVersion) {
        return;
      }
      console.error('Failed to load PDF:', error);
      els.loading?.classList.add('hidden');
      els.noDocument?.classList.remove('hidden');
      if (els.noDocument) {
        els.noDocument.textContent = `Failed to load PDF: ${mapUserFacingError(error?.message || 'Failed to load PDF')}`;
      }
    }

    updatePlacementStats();
    updateFieldInstancesFormData({ silent: true });
  }

  function restoreFieldPlacementsFromState(nextState) {
    const fieldPlacements = Array.isArray(nextState?.fieldPlacements) ? nextState.fieldPlacements : [];
    state.fieldInstances = fieldPlacements.map((instance, index) => normalizePlacementInstance(instance, index));
    updateFieldInstancesFormData({ silent: true });
  }

  updateFieldInstancesFormData({ silent: true });

  return {
    bindEvents,
    initPlacementEditor,
    getState,
    getLinkGroupState,
    setLinkGroupState,
    buildPlacementFormEntries,
    updateFieldInstancesFormData,
    restoreFieldPlacementsFromState,
  };
}
