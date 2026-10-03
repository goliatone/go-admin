// Auto-mounting shared by console entries: mount every `[data-console-root]`
// that did not opt out with `data-console-manual`, including roots inserted
// later (for example by a dashboard refresh), and dispose removed roots.

const ROOT_SELECTOR = '[data-console-root]:not([data-console-manual])';

export type ConsoleRootLifecycle = {
  mount: (root: HTMLElement) => void;
  dispose: (root: HTMLElement) => void;
};

function consoleRoots(node: Node): HTMLElement[] {
  if (!(node instanceof HTMLElement)) return [];
  const roots = Array.from(node.querySelectorAll<HTMLElement>(ROOT_SELECTOR));
  return node.matches(ROOT_SELECTOR) ? [node, ...roots] : roots;
}

function observeConsoleRoots(lifecycle: ConsoleRootLifecycle): void {
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.removedNodes.forEach((node) => {
        consoleRoots(node).forEach((root) => {
          if (!root.isConnected) lifecycle.dispose(root);
        });
      });
      record.addedNodes.forEach((node) => {
        consoleRoots(node).forEach((root) => {
          if (root.isConnected) lifecycle.mount(root);
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

/** Mount current and future console roots once the document is ready. */
export function autoMountConsoleRoots(lifecycle: ConsoleRootLifecycle): void {
  if (typeof document === 'undefined') return;
  const start = (): void => {
    document.querySelectorAll<HTMLElement>(ROOT_SELECTOR).forEach((root) => lifecycle.mount(root));
    observeConsoleRoots(lifecycle);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
}
