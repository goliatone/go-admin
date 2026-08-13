import type { DebugReplPanel } from './repl-panel.js';
import { createRetryableModuleLoader } from '../shared/capability-loader.js';

export type DebugReplPanelModule = {
  DebugReplPanel: typeof DebugReplPanel;
};
type DebugReplImporter = () => Promise<DebugReplPanelModule>;

export function createDebugReplLoader(importer: DebugReplImporter): {
  load: () => Promise<DebugReplPanelModule>;
  reset: () => void;
} {
  return createRetryableModuleLoader(importer);
}

const replLoader = createDebugReplLoader(() => import('./repl-panel.js'));

export const loadDebugReplPanel = replLoader.load;

export function resetDebugReplPanelLoader(): void {
  replLoader.reset();
}
