import { DebugPanel, initDebugPanel } from './debug-panel.js';
import { DebugStream } from './debug-stream.js';

const autoInit = () => {
  initDebugPanel();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}

export { DebugPanel, DebugStream, initDebugPanel };
