import { escapeHTML } from './shared/utils.js';
import type * as SyntaxHighlight from './syntax-highlight.js';
import { createRetryableModuleLoader } from './shared/capability-loader.js';

type SyntaxModule = typeof SyntaxHighlight;
type SyntaxImporter = () => Promise<SyntaxModule>;

export function createSyntaxLoader(importer: SyntaxImporter): () => Promise<SyntaxModule> {
  return createRetryableModuleLoader(importer).load;
}

export const loadSyntaxHighlight = createSyntaxLoader(() => import('./syntax-highlight.js'));

export function renderDeferredSyntax(source: string, language: 'json' | 'sql'): string {
  return `<code data-debug-syntax="${language}">${escapeHTML(source)}</code>`;
}

export async function enhanceDeferredSyntax(root: ParentNode): Promise<void> {
  const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-debug-syntax]:not([data-debug-syntax-ready])'));
  if (targets.length === 0) return;
  const sources = targets.map((target) => target.textContent || '');
  targets.forEach((target) => target.setAttribute('aria-busy', 'true'));
  try {
    const syntax = await loadSyntaxHighlight();
    targets.forEach((target, index) => {
      if (!target.isConnected || target.textContent !== sources[index]) return;
      const language = target.dataset.debugSyntax;
      target.innerHTML = language === 'sql'
        ? syntax.highlightSQL(sources[index], true)
        : syntax.highlightJSON(sources[index], true);
      target.setAttribute('data-debug-syntax-ready', 'true');
      target.removeAttribute('aria-busy');
      target.removeAttribute('title');
    });
  } catch {
    targets.forEach((target) => {
      target.removeAttribute('aria-busy');
      target.title = 'Syntax highlighting unavailable. Activate again to retry.';
    });
  }
}
