import type {
  FilterBuilder,
  FilterBuilderConfig,
  FilterBuilderElementTarget,
} from './filter-builder.js';

export interface FilterBuilderModule {
  FilterBuilder: new (config: FilterBuilderConfig) => FilterBuilder;
}

export interface FilterBuilderModuleLoader {
  load(): Promise<FilterBuilderModule>;
  reset(): void;
}

export interface FilterBuilderInteractionMount {
  load(options?: { open?: boolean }): Promise<FilterBuilder | null>;
  getInstance(): FilterBuilder | null;
  destroy(): void;
}

export interface FilterBuilderInteractionOptions {
  loader?: FilterBuilderModuleLoader;
  toggleButton?: FilterBuilderElementTarget;
  loadErrorMessage?: string;
}

export function createFilterBuilderModuleLoader(
  importer: () => Promise<FilterBuilderModule> = () => import('./filter-builder.js'),
): FilterBuilderModuleLoader {
  let pending: Promise<FilterBuilderModule> | null = null;
  return {
    load(): Promise<FilterBuilderModule> {
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

const sharedFilterBuilderLoader = createFilterBuilderModuleLoader();

function resolveTarget(target: FilterBuilderElementTarget | undefined): HTMLElement | null {
  if (!target) return null;
  if (typeof target !== 'string') return target;
  return document.querySelector<HTMLElement>(target);
}

function notifyLoadFailure(config: FilterBuilderConfig, message: string): void {
  const notifier = config.notifier as { error?: (value: string) => void } | undefined;
  notifier?.error?.(message);
}

/**
 * Mount a FilterBuilder only when its overlay toggle is first activated.
 *
 * The initiating activation is replayed through `open()` after construction,
 * failed imports can be retried, and destroy prevents late async attachment.
 */
export function mountFilterBuilderOnInteraction(
  config: FilterBuilderConfig,
  options: FilterBuilderInteractionOptions = {},
): FilterBuilderInteractionMount {
  const loader = options.loader ?? sharedFilterBuilderLoader;
  const target = options.toggleButton ?? config.toggleButton ?? '#filter-toggle-btn';
  const toggleButton = resolveTarget(target);
  const previousBusy = toggleButton?.getAttribute('aria-busy') ?? null;
  const previousLoadState = toggleButton?.getAttribute('data-filter-builder-load-state') ?? null;
  let instance: FilterBuilder | null = null;
  let pending: Promise<FilterBuilder | null> | null = null;
  let generation = 0;
  let destroyed = false;

  const setLoadState = (state: 'loading' | 'error' | null): void => {
    if (!toggleButton) return;
    if (state === 'loading') {
      toggleButton.setAttribute('aria-busy', 'true');
      toggleButton.dataset.filterBuilderLoadState = 'loading';
      return;
    }
    if (previousBusy === null) toggleButton.removeAttribute('aria-busy');
    else toggleButton.setAttribute('aria-busy', previousBusy);
    if (state === 'error') {
      toggleButton.dataset.filterBuilderLoadState = 'error';
    } else if (previousLoadState === null) {
      toggleButton.removeAttribute('data-filter-builder-load-state');
    } else {
      toggleButton.dataset.filterBuilderLoadState = previousLoadState;
    }
  };

  const load = ({ open = false }: { open?: boolean } = {}): Promise<FilterBuilder | null> => {
    if (destroyed) return Promise.resolve(null);
    if (instance) {
      if (open) instance.open();
      return Promise.resolve(instance);
    }
    if (pending) return pending;

    const requestedGeneration = generation;
    setLoadState('loading');
    pending = loader.load()
      .then((module) => {
        if (destroyed || requestedGeneration !== generation) return null;
        instance = new module.FilterBuilder(config);
        setLoadState(null);
        if (open) instance.open();
        return instance;
      })
      .catch((error) => {
        if (!destroyed && requestedGeneration === generation) {
          setLoadState('error');
          notifyLoadFailure(
            config,
            options.loadErrorMessage ?? 'Unable to load filters. Try again.',
          );
        }
        throw error;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  const handleToggle = (event: Event): void => {
    if (destroyed || instance) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void load({ open: true }).catch(() => {
      // The visible error state and notifier make the failure retryable.
    });
  };

  toggleButton?.addEventListener('click', handleToggle);

  return {
    load,
    getInstance: () => instance,
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      toggleButton?.removeEventListener('click', handleToggle);
      instance?.destroy();
      instance = null;
      setLoadState(null);
    },
  };
}

