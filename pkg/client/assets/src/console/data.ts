// Data console entry. Mounts console roots exactly like the generic console
// entry and, for the Data console, adds the read-only dataset explorer as the
// renderer of its Explore panel. The Data page loads this entry instead of
// `console/index.js`; both share one runtime module.

import {
  disposeConsole,
  getMountedConsole,
  mountConsole,
  readConsoleBootstrap,
  type ConsoleRuntime,
  type ConsoleRuntimeOptions,
} from './runtime.js';
import { autoMountConsoleRoots } from './auto-mount.js';
import { DATA_EXPLORE_PANEL, createDataExplorer, type DataExplorer, type DataExplorerOptions } from './data-explorer.js';

export type DataConsoleOptions = ConsoleRuntimeOptions & { explorer?: DataExplorerOptions };

/** The Data module's console ID. */
export const DATA_CONSOLE_ID = 'data';

const explorers = new WeakMap<HTMLElement, DataExplorer>();

function isDataConsole(root: HTMLElement, options: DataConsoleOptions): boolean {
  const bootstrap = options.bootstrap || readConsoleBootstrap(root);
  return bootstrap?.console_id === DATA_CONSOLE_ID && !options.display && !root.hasAttribute('data-console-display');
}

/** Mount a console root; Data consoles get the explorer on their Explore panel. */
export function mountDataConsole(root: HTMLElement, options: DataConsoleOptions = {}): ConsoleRuntime | null {
  const existing = getMountedConsole(root);
  if (existing) return existing;
  const { explorer: explorerOptions, ...runtimeOptions } = options;
  if (!isDataConsole(root, options)) return mountConsole(root, runtimeOptions);
  const explorer = createDataExplorer(root, explorerOptions);
  const runtime = mountConsole(root, {
    ...runtimeOptions,
    renderers: { ...runtimeOptions.renderers, [DATA_EXPLORE_PANEL]: explorer.renderer },
    onChange: (change) => {
      explorer.handleRuntimeChange(change);
      runtimeOptions.onChange?.(change);
    },
  });
  if (!runtime) {
    explorer.destroy();
    return null;
  }
  explorers.set(root, explorer);
  explorer.attach(runtime);
  return runtime;
}

/** Dispose a mounted console and its explorer. */
export function disposeDataConsole(root: HTMLElement): void {
  disposeConsole(root);
  explorers.get(root)?.destroy();
  explorers.delete(root);
}

/** The explorer bound to a mounted Data console root, if any. */
export function getDataExplorer(root: HTMLElement): DataExplorer | null {
  return explorers.get(root) || null;
}

autoMountConsoleRoots({
  mount: (root) => {
    mountDataConsole(root);
  },
  dispose: disposeDataConsole,
});

export { DATA_EXPLORE_PANEL, DataExplorer, createDataExplorer, type DataExplorerOptions } from './data-explorer.js';
export type { ExplorerTransport, ExplorerResult, ExplorerFailure, ExplorerFailureKind } from './data-explorer/transport.js';
export type * from './data-explorer/contract.js';
export { getMountedConsole, disposeConsole } from './runtime.js';
