import { onReady } from '../shared/dom-ready.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('ContentTypeBuilderBootstrap');

interface ContentEditorRuntimeModule {
  initContentTypeEditorRuntime(scope?: ParentNode): void;
}

interface BlockLibraryRuntimeModule {
  initBlockLibraryRuntime(scope?: ParentNode): void;
}

export interface RetryableContentTypeBuilderLoader<T> {
  load(): Promise<T>;
  reset(): void;
}

export interface ContentTypeBuilderBootstrapOptions {
  contentEditorLoader?: RetryableContentTypeBuilderLoader<ContentEditorRuntimeModule>;
  blockLibraryLoader?: RetryableContentTypeBuilderLoader<BlockLibraryRuntimeModule>;
  loadErrorMessage?: string;
}

export interface ContentTypeBuilderBootstrapController {
  start(): Promise<void>;
  destroy(): void;
}

type SurfaceModule = ContentEditorRuntimeModule | BlockLibraryRuntimeModule;
type SurfaceKind = 'content-editor' | 'block-library';

interface RootState {
  root: HTMLElement;
  previousBusy: string | null;
  previousLoadState: string | null;
  previousBootstrapOwner: string | null;
  status: HTMLElement | null;
}

interface SurfaceState<T extends SurfaceModule> {
  kind: SurfaceKind;
  roots: RootState[];
  loader: RetryableContentTypeBuilderLoader<T>;
  initialize(module: T, scope: ParentNode): void;
  pending: Promise<void> | null;
  initialized: boolean;
}

export function createContentTypeBuilderRuntimeLoader<T>(
  importer: () => Promise<T>,
): RetryableContentTypeBuilderLoader<T> {
  let pending: Promise<T> | null = null;
  return {
    load(): Promise<T> {
      if (!pending) {
        pending = importer().catch((error) => {
          pending = null;
          throw error;
        });
      }
      return pending;
    },
    reset(): void {
      pending = null;
    },
  };
}

const sharedContentEditorLoader = createContentTypeBuilderRuntimeLoader(
  () => import('./content-editor-runtime.js'),
);
const sharedBlockLibraryLoader = createContentTypeBuilderRuntimeLoader(
  () => import('./block-library-runtime.js'),
);

function rootState(root: HTMLElement): RootState {
  const state = {
    root,
    previousBusy: root.getAttribute('aria-busy'),
    previousLoadState: root.getAttribute('data-content-builder-load-state'),
    previousBootstrapOwner: root.getAttribute('data-content-builder-bootstrap'),
    status: null,
  };
  root.dataset.contentBuilderBootstrap = 'true';
  return state;
}

function restoreAttribute(root: HTMLElement, name: string, value: string | null): void {
  if (value === null) root.removeAttribute(name);
  else root.setAttribute(name, value);
}

function clearStatus(state: RootState): void {
  state.status?.remove();
  state.status = null;
}

function setLoading(state: RootState): void {
  clearStatus(state);
  state.root.setAttribute('aria-busy', 'true');
  state.root.dataset.contentBuilderLoadState = 'loading';
}

function setReady(state: RootState): void {
  clearStatus(state);
  restoreAttribute(state.root, 'aria-busy', state.previousBusy);
  restoreAttribute(state.root, 'data-content-builder-load-state', state.previousLoadState);
}

function setError(state: RootState, message: string, retry: () => void): void {
  restoreAttribute(state.root, 'aria-busy', state.previousBusy);
  state.root.dataset.contentBuilderLoadState = 'error';
  clearStatus(state);

  const status = document.createElement('div');
  status.dataset.contentBuilderLoadError = '';
  status.setAttribute('role', 'alert');
  status.className = 'mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700';
  const copy = document.createElement('span');
  copy.textContent = message;
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.contentBuilderRetry = '';
  button.className = 'shrink-0 rounded border border-red-300 px-3 py-1 font-medium hover:bg-red-100';
  button.textContent = 'Retry';
  button.addEventListener('click', retry, { once: true });
  status.append(copy, button);
  state.root.insertAdjacentElement('beforebegin', status);
  state.status = status;
}

function ownedRoots(scope: ParentNode, selector: string): RootState[] {
  return Array.from(scope.querySelectorAll<HTMLElement>(selector))
    .filter((root) => root.dataset.contentBuilderBootstrap !== 'true')
    .map(rootState);
}

/** Mount and start the runtime selected by established server-rendered roots. */
export function bootstrapContentTypeBuilder(
  scope: ParentNode = document,
  options: ContentTypeBuilderBootstrapOptions = {},
): ContentTypeBuilderBootstrapController {
  let generation = 0;
  let destroyed = false;
  const errorMessage = options.loadErrorMessage ?? 'Unable to load the builder. Try again.';

  const surfaces: Array<SurfaceState<any>> = [
    {
      kind: 'content-editor',
      roots: ownedRoots(scope, '[data-content-type-editor-root]'),
      loader: options.contentEditorLoader ?? sharedContentEditorLoader,
      initialize: (module: ContentEditorRuntimeModule, target: ParentNode) => module.initContentTypeEditorRuntime(target),
      pending: null,
      initialized: false,
    },
    {
      kind: 'block-library',
      roots: ownedRoots(scope, '[data-block-library-ide]'),
      loader: options.blockLibraryLoader ?? sharedBlockLibraryLoader,
      initialize: (module: BlockLibraryRuntimeModule, target: ParentNode) => module.initBlockLibraryRuntime(target),
      pending: null,
      initialized: false,
    },
  ];

  const startSurface = (surface: SurfaceState<any>): Promise<void> => {
    if (destroyed || surface.initialized || surface.roots.length === 0) return Promise.resolve();
    if (surface.pending) return surface.pending;
    const requestedGeneration = generation;
    surface.roots.forEach(setLoading);
    surface.pending = surface.loader.load()
      .then((module) => {
        if (destroyed || requestedGeneration !== generation) return;
        surface.initialize(module, scope);
        surface.initialized = true;
        surface.roots.forEach(setReady);
      })
      .catch((error) => {
        if (!destroyed && requestedGeneration === generation) {
          const retry = () => { void startSurface(surface).catch(() => {}); };
          surface.roots.forEach((state) => setError(state, errorMessage, retry));
        }
        throw error;
      })
      .finally(() => {
        surface.pending = null;
      });
    return surface.pending;
  };

  const controller: ContentTypeBuilderBootstrapController = {
    async start(): Promise<void> {
      await Promise.all(surfaces.map(startSurface));
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      for (const surface of surfaces) {
        for (const state of surface.roots) {
          clearStatus(state);
          restoreAttribute(state.root, 'aria-busy', state.previousBusy);
          restoreAttribute(state.root, 'data-content-builder-load-state', state.previousLoadState);
          restoreAttribute(state.root, 'data-content-builder-bootstrap', state.previousBootstrapOwner);
        }
      }
    },
  };

  void controller.start().catch((error) => {
    logger.error('Content type builder runtime failed to load:', error);
  });
  return controller;
}

onReady(() => {
  bootstrapContentTypeBuilder();
});

