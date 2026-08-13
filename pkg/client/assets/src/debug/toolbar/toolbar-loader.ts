import type { DebugToolbar } from './debug-toolbar.js';
import { createRetryableModuleLoader } from '../shared/capability-loader.js';

export type DebugToolbarModule = { DebugToolbar: typeof DebugToolbar };
type DebugToolbarImporter = () => Promise<DebugToolbarModule>;

export function createDebugToolbarLoader(importer: DebugToolbarImporter): () => Promise<DebugToolbarModule> {
  return createRetryableModuleLoader(importer).load;
}

export const loadDebugToolbar = createDebugToolbarLoader(() => import('./debug-toolbar.js'));
