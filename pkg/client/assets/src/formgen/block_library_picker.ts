import {
  initBlockEditor,
  registerBlockTemplate,
  refreshBlockTemplateRegistry,
  markRequiredFields,
} from './block_editor';

// =============================================================================
// 5.1  Type Definitions
// =============================================================================

type BlockEditorConfig = {
  sortable?: boolean;
  addLabel?: string;
  emptyLabel?: string;
  allowDrag?: boolean;
  dragFromHeader?: boolean;
  enableTouch?: boolean;
  enableAnimations?: boolean;
  enableCrossEditor?: boolean;
  schemaVersionPattern?: string;
  requiredFields?: Record<string, string[]>;
  validateOnInput?: boolean;
  legacyBlocks?: any[];
  showConflicts?: boolean;
};

export type BlockLibraryPickerConfig = BlockEditorConfig & {
  apiBase?: string;
  allowedBlocks?: string[];
  maxBlocks?: number;
  groupByCategory?: boolean;
  searchable?: boolean;
  lazyLoad?: boolean;
  includeInactive?: boolean;
};

export type BlockDefinitionMeta = {
  slug: string;
  label: string;
  icon?: string;
  category?: string;
  description?: string;
  schema_version?: string;
  required_fields?: string[];
  status?: string;
  disabled?: boolean;
};

type BlockTemplateResponse = {
  slug: string;
  label: string;
  icon: string;
  category: string;
  schema_version: string;
  status: string;
  disabled: boolean;
  required_fields: string[];
  html: string;
};

// =============================================================================
// Utilities
// =============================================================================

function parsePickerConfig(raw: string | null): BlockLibraryPickerConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as BlockLibraryPickerConfig;
  } catch { /* ignore */ }
  return {};
}

function parseJSONAttr<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch { /* ignore */ }
  return fallback;
}

function blockSlugAliases(value: string): string[] {
  const slug = value.trim().toLowerCase();
  if (!slug) return [];
  return Array.from(new Set([
    slug,
    slug.replace(/-/g, '_'),
    slug.replace(/_/g, '-'),
  ]));
}

type PickerAPIBase = {
  listBase: string;
  templatesBase: string;
};

function resolvePickerBases(apiBase: string): PickerAPIBase {
  const raw = apiBase.trim();
  const trimmed = raw.replace(/\/+$/, '');
  if (!trimmed) {
    const root = raw === '/' ? '/api' : '';
    if (!root) return { listBase: '', templatesBase: '' };
    return {
      listBase: `${root}/panels/block_definitions`,
      templatesBase: `${root}/block_definitions_meta`,
    };
  }

  if (trimmed.endsWith('/block_definitions_meta')) {
    const apiRoot = trimmed.replace(/\/block_definitions_meta$/, '');
    return {
      listBase: `${apiRoot}/panels/block_definitions`,
      templatesBase: trimmed,
    };
  }
  if (trimmed.endsWith('/panels/block_definitions')) {
    return {
      listBase: trimmed,
      templatesBase: trimmed.replace(/\/panels\/block_definitions$/, '/block_definitions_meta'),
    };
  }
  if (trimmed.endsWith('/block_definitions')) {
    // Legacy list endpoint input is no longer supported; require canonical API root
    // or canonical panel path.
    return { listBase: '', templatesBase: '' };
  }

  const apiRoot = /\/api(\/|$)/.test(trimmed) ? trimmed : `${trimmed}/api`;
  return {
    listBase: `${apiRoot}/panels/block_definitions`,
    templatesBase: `${apiRoot}/block_definitions_meta`,
  };
}

function renderPickerLoadError(root: HTMLElement, message: string): void {
  const existing = root.querySelector('[data-picker-load-error]');
  if (existing) {
    existing.remove();
  }
  const node = document.createElement('div');
  node.setAttribute('data-picker-load-error', 'true');
  node.className =
    'mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 ' +
    'dark:border-red-800/70 dark:bg-red-900/20 dark:text-red-300';
  node.textContent = message;
  root.prepend(node);
}

async function fetchJSON<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`fetch ${url}: ${resp.status}`);
  return resp.json() as Promise<T>;
}

// =============================================================================
// API Layer
// =============================================================================

async function fetchBlockMetadata(
  apiBase: string,
  includeInactive: boolean,
): Promise<BlockDefinitionMeta[]> {
  const params = new URLSearchParams();
  if (!includeInactive) {
    params.set('filter_status', 'active');
  }
  const qs = params.toString();
  const url = qs ? `${apiBase}?${qs}` : apiBase;

  const data = await fetchJSON<{ items: any[] }>(url);
  if (!Array.isArray(data.items)) return [];

  return data.items.map((item: any) => {
    const status = typeof item.status === 'string' ? item.status.trim() : '';
    return {
      slug: item.slug ?? '',
      label: item.name ?? item.label ?? item.slug ?? '',
      icon: item.icon,
      category: item.category,
      description: item.description,
      schema_version: item.schema_version,
      required_fields: item.required_fields,
      status: item.status,
      disabled: status.toLowerCase() !== 'active',
    };
  });
}

async function fetchBatchTemplates(
  apiBase: string,
  slugs: string[],
  includeInactive: boolean,
): Promise<BlockTemplateResponse[]> {
  if (slugs.length === 0) return [];
  let url = `${apiBase}/templates?slugs=${encodeURIComponent(slugs.join(','))}`;
  if (includeInactive) url += '&include_inactive=true';
  const data = await fetchJSON<{ items: BlockTemplateResponse[] }>(url);
  return data.items ?? [];
}

async function fetchSingleTemplate(
  apiBase: string,
  slug: string,
  includeInactive: boolean,
): Promise<BlockTemplateResponse | null> {
  let url = `${apiBase}/templates/${encodeURIComponent(slug)}`;
  if (includeInactive) url += '?include_inactive=true';
  try {
    const data = await fetchJSON<{ items: BlockTemplateResponse[] }>(url);
    return data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Template Registration Helper
// =============================================================================

function registerFromResponse(root: HTMLElement, tmpl: BlockTemplateResponse): void {
  registerBlockTemplate(root, {
    type: tmpl.slug,
    label: tmpl.label,
    icon: tmpl.icon || undefined,
    schemaVersion: tmpl.schema_version || undefined,
    requiredFields: tmpl.required_fields ?? [],
    html: tmpl.html,
  });
  refreshBlockTemplateRegistry(root);
}

// =============================================================================
// Block Item DOM Creation (for lazy-loaded templates)
// =============================================================================

function resolveTemplateSchemaVersion(tmpl: BlockTemplateResponse, pattern?: string): string {
  const raw = typeof tmpl.schema_version === 'string' ? tmpl.schema_version.trim() : '';
  if (raw) return raw;
  if (pattern) return pattern.replace('{type}', tmpl.slug);
  return `${tmpl.slug}@v1.0.0`;
}

function createBlockItemDOM(
  tmpl: BlockTemplateResponse,
  sortable: boolean,
  schemaVersionPattern?: string,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700';
  wrapper.setAttribute('data-block-item', 'true');
  wrapper.dataset.blockType = tmpl.slug;
  if (sortable) wrapper.setAttribute('draggable', 'true');

  // Header
  const header = document.createElement('div');
  header.className = 'flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700';
  header.setAttribute('data-block-header', 'true');

  const titleWrap = document.createElement('div');
  titleWrap.className = 'flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white';

  const icon = document.createElement('span');
  icon.className = 'inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200';
  icon.textContent = tmpl.icon || tmpl.label.slice(0, 1).toUpperCase();

  const label = document.createElement('span');
  label.textContent = tmpl.label;

  const typeBadge = document.createElement('span');
  typeBadge.className = 'text-xs text-gray-500 dark:text-gray-400';
  typeBadge.textContent = tmpl.slug;

  // Schema version badge (Phase 7.1)
  const schemaVersion = resolveTemplateSchemaVersion(tmpl, schemaVersionPattern);
  const schemaBadge = document.createElement('span');
  schemaBadge.className = 'block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400';
  schemaBadge.textContent = schemaVersion;
  schemaBadge.setAttribute('data-block-schema-badge', 'true');

  titleWrap.appendChild(icon);
  titleWrap.appendChild(label);
  titleWrap.appendChild(typeBadge);
  titleWrap.appendChild(schemaBadge);

  const actions = document.createElement('div');
  actions.className = 'flex items-center gap-2';

  if (sortable) {
    const moveUp = document.createElement('button');
    moveUp.type = 'button';
    moveUp.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
    moveUp.textContent = 'Up';
    moveUp.setAttribute('data-block-move-up', 'true');
    actions.appendChild(moveUp);

    const moveDown = document.createElement('button');
    moveDown.type = 'button';
    moveDown.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
    moveDown.textContent = 'Down';
    moveDown.setAttribute('data-block-move-down', 'true');
    actions.appendChild(moveDown);
  }

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
  collapseBtn.textContent = 'Collapse';
  collapseBtn.setAttribute('data-block-collapse', 'true');
  actions.appendChild(collapseBtn);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'text-xs text-red-600 hover:text-red-700';
  removeBtn.textContent = 'Remove';
  removeBtn.setAttribute('data-block-remove', 'true');
  actions.appendChild(removeBtn);

  if (sortable) {
    const dragHandle = document.createElement('span');
    dragHandle.className = 'text-xs text-gray-400 cursor-move';
    dragHandle.textContent = 'Drag';
    dragHandle.setAttribute('data-block-drag-handle', 'true');
    actions.appendChild(dragHandle);
  }

  header.appendChild(titleWrap);
  header.appendChild(actions);

  // Body
  const body = document.createElement('div');
  body.className = 'p-4 space-y-4';
  body.setAttribute('data-block-body', 'true');
  body.innerHTML = tmpl.html;

  // Mark required fields with visual indicators (Phase 7.2)
  const requiredFields = tmpl.required_fields || [];
  if (requiredFields.length > 0) {
    markRequiredFields(body, requiredFields);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(body);

  // Hidden _type field
  const typeInput = document.createElement('input');
  typeInput.type = 'hidden';
  typeInput.name = '_type';
  typeInput.value = tmpl.slug;
  typeInput.readOnly = true;
  typeInput.setAttribute('data-block-type-input', 'true');
  typeInput.setAttribute('data-block-ignore', 'true');
  wrapper.appendChild(typeInput);

  // Hidden _schema field
  wrapper.dataset.blockSchema = schemaVersion;
  const schemaInput = document.createElement('input');
  schemaInput.type = 'hidden';
  schemaInput.name = '_schema';
  schemaInput.value = schemaVersion;
  schemaInput.setAttribute('data-block-schema-input', 'true');
  schemaInput.setAttribute('data-block-ignore', 'true');
  wrapper.appendChild(schemaInput);

  return wrapper;
}

// =============================================================================
// 6.1–6.7  Picker Popover
// =============================================================================

type PopoverCallbacks = {
  onSelect: (slug: string) => void;
  onClose: () => void;
};

type PopoverAPI = {
  element: HTMLElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
  updateCards: (defs: BlockDefinitionMeta[], disabledSlugs?: Set<string>) => void;
};

function renderPickerPopover(
  initialDefs: BlockDefinitionMeta[],
  config: BlockLibraryPickerConfig,
  callbacks: PopoverCallbacks,
): PopoverAPI {
  const searchable = config.searchable !== false;
  const groupByCategory = config.groupByCategory !== false;

  // ---- Popover root (6.1, 6.5) ----
  const popover = document.createElement('div');
  popover.className =
    'absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 ' +
    'bg-white shadow-xl overflow-hidden picker-popover ' +
    'dark:bg-slate-900 dark:border-gray-700';
  popover.style.display = 'none';
  popover.setAttribute('data-picker-popover', 'true');
  popover.setAttribute('data-picker-dropdown', 'true');
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Add block');

  // ---- Search header (6.1, 6.2) ----
  let searchInput: HTMLInputElement | null = null;

  if (searchable) {
    const searchWrap = document.createElement('div');
    searchWrap.className =
      'sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 ' +
      'dark:border-gray-700 p-2 z-10';

    const searchInner = document.createElement('div');
    searchInner.className = 'relative';

    const searchIcon = document.createElement('svg');
    searchIcon.className =
      'absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none';
    searchIcon.setAttribute('fill', 'none');
    searchIcon.setAttribute('stroke', 'currentColor');
    searchIcon.setAttribute('viewBox', '0 0 24 24');
    searchIcon.innerHTML =
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" ' +
      'd="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>';

    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search blocks\u2026';
    searchInput.className =
      'w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 ' +
      'bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 ' +
      'focus:ring-blue-500 focus:border-transparent ' +
      'dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500';
    searchInput.setAttribute('data-picker-search', 'true');
    searchInput.setAttribute('autocomplete', 'off');

    searchInner.appendChild(searchIcon);
    searchInner.appendChild(searchInput);
    searchWrap.appendChild(searchInner);
    popover.appendChild(searchWrap);
  }

  // ---- Cards container ----
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'max-h-72 overflow-y-auto py-1';
  cardsContainer.setAttribute('data-picker-cards', 'true');
  cardsContainer.setAttribute('role', 'listbox');
  popover.appendChild(cardsContainer);

  // ---- Empty state (6.1) ----
  const emptyState = document.createElement('div');
  emptyState.className = 'px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400';
  emptyState.setAttribute('data-picker-empty', 'true');
  emptyState.style.display = 'none';

  const emptyIcon = document.createElement('svg');
  emptyIcon.className = 'mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600';
  emptyIcon.setAttribute('fill', 'none');
  emptyIcon.setAttribute('stroke', 'currentColor');
  emptyIcon.setAttribute('viewBox', '0 0 24 24');
  emptyIcon.innerHTML =
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" ' +
    'd="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';

  const emptyText = document.createElement('p');
  emptyText.setAttribute('data-picker-empty-text', 'true');
  emptyText.textContent = 'No block types available';

  emptyState.appendChild(emptyIcon);
  emptyState.appendChild(emptyText);
  popover.appendChild(emptyState);

  // ---- State ----
  let isOpenFlag = false;
  let focusedIndex = -1;
  let visibleCards: HTMLButtonElement[] = [];
  let currentDefs = [...initialDefs];
  let currentDisabledSlugs = new Set<string>();

  // ---- Card creation (6.1, 6.5, 6.7) ----
  function createCard(def: BlockDefinitionMeta, isTypeDisabled: boolean): HTMLButtonElement {
    const disabled = isTypeDisabled || !!def.disabled;

    const card = document.createElement('button');
    card.type = 'button';
    card.setAttribute('data-picker-item', def.slug);
    card.setAttribute('data-picker-card', def.slug);
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', 'false');
    if (def.category) card.dataset.category = def.category;

    card.className =
      'w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ' +
      (disabled
        ? 'opacity-50 cursor-not-allowed'
        : 'hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none');

    if (disabled) {
      card.disabled = true;
      card.setAttribute('aria-disabled', 'true');
      card.title =
        def.status && def.status.toLowerCase() !== 'active'
          ? 'This block type is inactive'
          : 'This block type is not available';
    }

    // Icon badge
    const iconEl = document.createElement('span');
    iconEl.className =
      'inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold ' +
      (disabled
        ? 'bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500'
        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400');
    iconEl.textContent = def.icon || def.label.slice(0, 2).toUpperCase();

    // Text content
    const textEl = document.createElement('div');
    textEl.className = 'flex-1 min-w-0';

    const labelEl = document.createElement('div');
    labelEl.className =
      'font-medium truncate ' +
      (disabled
        ? 'text-gray-400 dark:text-gray-500'
        : 'text-gray-900 dark:text-white');
    labelEl.textContent = def.label;

    const metaEl = document.createElement('div');
    metaEl.className = 'text-xs text-gray-500 dark:text-gray-400 truncate';
    const parts: string[] = [def.description || def.slug];
    if (def.status && def.status.toLowerCase() !== 'active') {
      parts.push(`(${def.status})`);
    }
    metaEl.textContent = parts.join(' ');

    textEl.appendChild(labelEl);
    textEl.appendChild(metaEl);
    card.appendChild(iconEl);
    card.appendChild(textEl);

    return card;
  }

  // ---- Render cards (6.1, 6.2) ----
  function renderCards(filter: string = ''): void {
    cardsContainer.innerHTML = '';
    visibleCards = [];
    focusedIndex = -1;

    const query = filter.toLowerCase().trim();

    const filtered = query
      ? currentDefs.filter(
          (d) =>
            d.label.toLowerCase().includes(query) ||
            d.slug.toLowerCase().includes(query) ||
            (d.category || '').toLowerCase().includes(query) ||
            (d.description || '').toLowerCase().includes(query),
        )
      : currentDefs;

    if (filtered.length === 0) {
      emptyState.style.display = '';
      const txt = emptyState.querySelector('[data-picker-empty-text]');
      if (txt) {
        txt.textContent = query ? 'No blocks match your search' : 'No block types available';
      }
      return;
    }

    emptyState.style.display = 'none';

    if (groupByCategory) {
      const groups = new Map<string, BlockDefinitionMeta[]>();
      for (const def of filtered) {
        const cat = def.category || 'other';
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat)!.push(def);
      }

      for (const [category, items] of groups) {
        const header = document.createElement('div');
        header.className =
          'px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ' +
          'sticky top-0 bg-white dark:bg-slate-900';
        header.setAttribute('data-picker-category', category);
        header.setAttribute('role', 'presentation');
        header.textContent = category;
        cardsContainer.appendChild(header);

        for (const def of items) {
          const card = createCard(def, currentDisabledSlugs.has(def.slug));
          cardsContainer.appendChild(card);
          if (!card.disabled) visibleCards.push(card);
        }
      }
    } else {
      for (const def of filtered) {
        const card = createCard(def, currentDisabledSlugs.has(def.slug));
        cardsContainer.appendChild(card);
        if (!card.disabled) visibleCards.push(card);
      }
    }
  }

  renderCards();

  // ---- Focus management (6.3) ----
  function setFocusedCard(index: number): void {
    if (focusedIndex >= 0 && focusedIndex < visibleCards.length) {
      const prev = visibleCards[focusedIndex];
      prev.classList.remove('bg-blue-50', 'dark:bg-blue-900/20');
      prev.setAttribute('aria-selected', 'false');
    }

    focusedIndex = index;

    if (focusedIndex >= 0 && focusedIndex < visibleCards.length) {
      const card = visibleCards[focusedIndex];
      card.classList.add('bg-blue-50', 'dark:bg-blue-900/20');
      card.setAttribute('aria-selected', 'true');
      if (typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  // ---- Search input handler (6.2) ----
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderCards(searchInput!.value);
    });
  }

  // ---- Keyboard navigation (6.3) ----
  function handleKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (visibleCards.length > 0) {
          setFocusedCard(focusedIndex < visibleCards.length - 1 ? focusedIndex + 1 : 0);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (visibleCards.length > 0) {
          setFocusedCard(focusedIndex <= 0 ? visibleCards.length - 1 : focusedIndex - 1);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < visibleCards.length) {
          const slug = visibleCards[focusedIndex].getAttribute('data-picker-item');
          if (slug) callbacks.onSelect(slug);
        }
        break;

      case 'Escape':
        e.preventDefault();
        callbacks.onClose();
        break;

      case 'Tab':
        e.preventDefault();
        if (searchInput && document.activeElement !== searchInput) {
          searchInput.focus();
          focusedIndex = -1;
        } else if (visibleCards.length > 0) {
          setFocusedCard(0);
        }
        break;
    }
  }

  // ---- Card click handler ----
  cardsContainer.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-picker-item]');
    if (!target || target.disabled) return;
    const slug = target.getAttribute('data-picker-item');
    if (slug) callbacks.onSelect(slug);
  });

  // ---- Popover positioning (6.4) ----
  function positionPopover(): void {
    popover.style.bottom = '';
    popover.style.marginBottom = '';
    popover.style.top = '';
    popover.style.marginTop = '4px';

    requestAnimationFrame(() => {
      const rect = popover.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - 8) {
        popover.style.bottom = '100%';
        popover.style.top = 'auto';
        popover.style.marginBottom = '4px';
        popover.style.marginTop = '0';
      }
    });
  }

  // ---- Open / Close (6.4) ----
  function open(): void {
    popover.style.display = '';
    isOpenFlag = true;
    positionPopover();

    if (searchInput) {
      searchInput.value = '';
      renderCards('');
      requestAnimationFrame(() => searchInput!.focus());
    }

    popover.addEventListener('keydown', handleKeydown);
  }

  function close(): void {
    popover.style.display = 'none';
    isOpenFlag = false;
    focusedIndex = -1;
    popover.removeEventListener('keydown', handleKeydown);
  }

  // ---- Update cards (6.6, 6.7) ----
  function updateCards(defs: BlockDefinitionMeta[], disabled?: Set<string>): void {
    currentDefs = defs;
    if (disabled) currentDisabledSlugs = disabled;
    renderCards(searchInput?.value || '');
  }

  return {
    element: popover,
    open,
    close,
    isOpen: () => isOpenFlag,
    updateCards,
  };
}

// =============================================================================
// 5.3  Picker Initialization
// =============================================================================

async function initPicker(root: HTMLElement): Promise<void> {
  const configRoot = root.closest<HTMLElement>('[data-component-config]') || root;
  const config = parsePickerConfig(configRoot.getAttribute('data-component-config'));

  const apiBase = root.dataset.apiBase || config.apiBase || '';
  if (!apiBase) {
    console.warn('block-library-picker: missing data-api-base');
    return;
  }
  const { listBase, templatesBase } = resolvePickerBases(apiBase);
  if (!listBase || !templatesBase) {
    console.warn('block-library-picker: invalid api base', apiBase);
    return;
  }

  const allowedBlocks = parseJSONAttr<string[]>(root.dataset.allowedBlocks, config.allowedBlocks ?? []);
  const maxBlocks = parseInt(root.dataset.maxBlocks || '', 10) || config.maxBlocks || 0;
  const lazyLoad = config.lazyLoad !== false;
  const includeInactive = config.includeInactive === true;
  const sortable = config.sortable ?? (root.dataset.blockSortable === 'true');

  const registeredSlugs = new Set<string>();
  const templateCache = new Map<string, BlockTemplateResponse>();

  // -- 5.3.1: Fetch block definition metadata --
  let definitions: BlockDefinitionMeta[];
  try {
    definitions = await fetchBlockMetadata(listBase, includeInactive);
  } catch (err) {
    console.error('block-library-picker: metadata fetch failed', err);
    const message = err instanceof Error ? err.message : 'Failed to load block definitions.';
    renderPickerLoadError(root, `Failed to load block definitions: ${message}`);
    return;
  }

  // Filter by allowedBlocks
  if (allowedBlocks.length > 0) {
    const allowed = new Set<string>();
    for (const slug of allowedBlocks) {
      for (const alias of blockSlugAliases(slug)) allowed.add(alias);
    }
    definitions = definitions.filter((d) => {
      for (const alias of blockSlugAliases(d.slug)) {
        if (allowed.has(alias)) return true;
      }
      return false;
    });
  }

  // -- 5.3.2: Parse existing blocks from hidden input --
  const output = root.querySelector<HTMLInputElement>('input[data-block-output]');
  let existingBlocks: any[] = [];
  if (output?.value) {
    try {
      const parsed = JSON.parse(output.value);
      if (Array.isArray(parsed)) existingBlocks = parsed;
    } catch { /* ignore */ }
  }

  // -- 5.3.3: Collect unique slugs from existing blocks --
  const existingSlugs = [
    ...new Set(
      existingBlocks
        .map((b) => (b && typeof b === 'object' ? (b._type as string) : ''))
        .filter((t): t is string => typeof t === 'string' && t.length > 0),
    ),
  ];

  // -- 5.3.4: Fetch templates for existing block slugs --
  if (existingSlugs.length > 0) {
    try {
      const templates = await fetchBatchTemplates(templatesBase, existingSlugs, includeInactive);
      for (const tmpl of templates) {
        registerFromResponse(root, tmpl);
        registeredSlugs.add(tmpl.slug);
        templateCache.set(tmpl.slug, tmpl);
      }
    } catch (err) {
      console.error('block-library-picker: template fetch failed', err);
    }
  }

  // -- 5.5 (lazyLoad=false): Prefetch all remaining templates --
  if (!lazyLoad) {
    const missing = definitions
      .filter((d) => !registeredSlugs.has(d.slug))
      .map((d) => d.slug);
    if (missing.length > 0) {
      try {
        const templates = await fetchBatchTemplates(templatesBase, missing, includeInactive);
        for (const tmpl of templates) {
          registerFromResponse(root, tmpl);
          registeredSlugs.add(tmpl.slug);
          templateCache.set(tmpl.slug, tmpl);
        }
      } catch (err) {
        console.error('block-library-picker: prefetch failed', err);
      }
    }
  }

  // -- 5.3.6: Initialize the underlying block editor --
  initBlockEditor(root);

  // =========================================================================
  // 5.4  Picker UI — replaces hidden <select> with "+ Add Block" button
  // =========================================================================

  const addSelect = root.querySelector<HTMLSelectElement>('[data-block-add-select]');
  const addButton = root.querySelector<HTMLButtonElement>('[data-block-add]');

  // The template already hides the select/button wrapper (style="display:none").

  // Picker controls container
  const pickerControls = document.createElement('div');
  pickerControls.className = 'mt-3';
  pickerControls.setAttribute('data-picker-controls', 'true');

  const pickerWrapper = document.createElement('div');
  pickerWrapper.className = 'relative inline-block';

  // Add Block button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className =
    'inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed ' +
    'border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 ' +
    'hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 ' +
    'dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 ' +
    'dark:hover:bg-slate-800';
  addBtn.setAttribute('data-picker-add-btn', 'true');
  const addButtonLabel =
    typeof config.addLabel === 'string' && config.addLabel.trim()
      ? config.addLabel.trim()
      : 'Add Block';
  addBtn.innerHTML =
    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>' +
    '</svg>' +
    `<span>${addButtonLabel}</span>`;

  // =========================================================================
  // Phase 6: Picker Popover UI
  // =========================================================================

  // -- MaxBlocks enforcement --
  const checkMaxBlocks = (): void => {
    if (maxBlocks <= 0) return;
    const count = root.querySelectorAll('[data-block-item]').length;
    const atMax = count >= maxBlocks;
    addBtn.disabled = atMax;
    addBtn.classList.toggle('opacity-50', atMax);
    addBtn.classList.toggle('cursor-not-allowed', atMax);
    addBtn.title = atMax ? `Maximum of ${maxBlocks} blocks reached` : '';
  };

  // -- Create popover (6.1–6.7) --
  const pickerPopover = renderPickerPopover(definitions, config, {
    onSelect: (slug) => handleBlockSelection(slug),
    onClose: () => {
      pickerPopover.close();
      addBtn.focus();
    },
  });

  // -- Block selection handler (5.5, updated for popover) --
  async function handleBlockSelection(slug: string): Promise<void> {
    const def = definitions.find((d) => d.slug === slug);
    if (!def || def.disabled) return;

    // Check maxBlocks
    if (maxBlocks > 0) {
      const count = root.querySelectorAll('[data-block-item]').length;
      if (count >= maxBlocks) {
        pickerPopover.close();
        return;
      }
    }

    // Check if block editor already knows this template (option exists in select)
    const editorKnows =
      addSelect instanceof HTMLSelectElement &&
      Array.from(addSelect.options).some((o) => o.value === slug);

    if (editorKnows) {
      // Use the block editor's built-in add mechanism
      addSelect!.value = slug;
      addButton?.click();
    } else {
      // Lazy load: fetch template if not cached
      let tmplResp = templateCache.get(slug);
      if (!tmplResp) {
        try {
          const fetched = await fetchSingleTemplate(templatesBase, slug, includeInactive);
          if (fetched) {
            tmplResp = fetched;
            registerFromResponse(root, tmplResp);
            registeredSlugs.add(tmplResp.slug);
            templateCache.set(tmplResp.slug, tmplResp);
          }
        } catch (err) {
          console.error(`block-library-picker: fetch template ${slug} failed`, err);
          pickerPopover.close();
          return;
        }
      }

      if (!tmplResp) {
        pickerPopover.close();
        return;
      }

      // Create block item directly and append to the list
      const blockList = root.querySelector<HTMLElement>('[data-block-list]');
      if (blockList) {
        const item = createBlockItemDOM(tmplResp, sortable, config.schemaVersionPattern);
        blockList.appendChild(item);
        // Trigger the block editor's sync by dispatching an input event
        item.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    pickerPopover.close();
    checkMaxBlocks();
  }

  // -- Toggle popover from add button --
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (addBtn.disabled) return;
    if (pickerPopover.isOpen()) {
      pickerPopover.close();
    } else {
      pickerPopover.open();
    }
  });

  // -- Open popover on ArrowDown from add button --
  addBtn.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && !pickerPopover.isOpen() && !addBtn.disabled) {
      e.preventDefault();
      pickerPopover.open();
    }
  });

  // -- Close on outside click (6.4) --
  document.addEventListener('click', (e) => {
    if (pickerPopover.isOpen() && !pickerWrapper.contains(e.target as Node)) {
      pickerPopover.close();
    }
  });

  // -- Close on Escape (document-level fallback) --
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pickerPopover.isOpen()) {
      pickerPopover.close();
      addBtn.focus();
    }
  });

  // -- Observe block list for maxBlocks updates --
  if (maxBlocks > 0) {
    const blockList = root.querySelector('[data-block-list]');
    if (blockList) {
      new MutationObserver(() => checkMaxBlocks()).observe(blockList, { childList: true });
    }
    checkMaxBlocks();
  }

  // -- Mount picker controls into the DOM --
  pickerWrapper.appendChild(addBtn);
  pickerWrapper.appendChild(pickerPopover.element);
  pickerControls.appendChild(pickerWrapper);

  const blockList = root.querySelector('[data-block-list]');
  if (blockList && blockList.nextSibling) {
    blockList.parentElement?.insertBefore(pickerControls, blockList.nextSibling);
  } else {
    root.appendChild(pickerControls);
  }

  root.setAttribute('data-picker-initialized', 'true');
}

// =============================================================================
// 5.2  Public init — find all pickers and initialize them
// =============================================================================

export async function initBlockLibraryPickers(scope: ParentNode = document): Promise<void> {
  const roots = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-block-library-picker="true"]'),
  );
  const tasks = roots
    .filter((root) => root.getAttribute('data-picker-initialized') !== 'true')
    .map((root) => initPicker(root));
  await Promise.all(tasks);
}

// =============================================================================
// 5.6  DOMContentLoaded auto-initialization
// =============================================================================

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => {
  initBlockLibraryPickers();
});
