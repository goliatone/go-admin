import type * as JSONPathSearch from './jsonpath-search.js';
import { createRetryableModuleLoader } from './capability-loader.js';

type JSONPathSearchModule = typeof JSONPathSearch;
type JSONPathImporter = () => Promise<JSONPathSearchModule>;

export function createJSONPathLoader(importer: JSONPathImporter): () => Promise<JSONPathSearchModule> {
  return createRetryableModuleLoader(importer).load;
}

export const loadJSONPathSearch = createJSONPathLoader(() => import('./jsonpath-search.js'));
