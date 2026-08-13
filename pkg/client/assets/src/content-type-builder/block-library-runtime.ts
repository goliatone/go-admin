export { BlockLibraryIDE, initBlockLibraryIDE } from './block-library-ide.js';

import { initBlockLibraryIDE } from './block-library-ide.js';

/** Initialize the complete first-party block-library surface. */
export function initBlockLibraryRuntime(scope: ParentNode = document): void {
  initBlockLibraryIDE(scope);
}

