/**
 * Shared Schema Preview primitives
 *
 * Presentational helpers shared by every content-modeling surface that renders a
 * live schema preview (Content Types editor and Block Library editor). Keeping
 * these in one place stops the two surfaces from drifting on how a preview reads:
 *
 *   - a lightweight, read-only inline snapshot ({@link wrapReadonlyPreview})
 *   - an interactive "escape hatch" modal ({@link PreviewModal}) that renders the
 *     same generated form at width and hydrates its rich editors
 *   - the hydration entry point ({@link initPreviewEditors})
 *
 * The actual debounced fetch + stale-response guard lives in each surface's
 * controller because it is wired to that surface's own edit events; only the
 * genuinely shared rendering pieces live here.
 */

import { Modal } from '../../shared/modal';

/**
 * Wrap generated preview HTML so an inline/side-pane preview reads as a
 * lightweight, non-interactive snapshot. The {@link PreviewModal} renders the
 * same HTML interactively.
 */
export function wrapReadonlyPreview(html: string): string {
  return `<div class="ct-preview-readonly pointer-events-none select-none" aria-label="Read-only form preview">${html}</div>`;
}

/**
 * Hydrate the rich JSON/WYSIWYG editors inside a freshly-rendered preview.
 * formgen-behaviors provides JSON editor hydration and formgen-relationships
 * provides WYSIWYG hydration. Safe to call when either global is absent.
 */
export function initPreviewEditors(): void {
  const fb = (window as any).FormgenBehaviors;
  if (typeof fb?.initJSONEditors === 'function') {
    fb.initJSONEditors();
  }

  const rel = (window as any).FormgenRelationships;
  const initWysiwyg = rel?.autoInitWysiwyg ?? fb?.autoInitWysiwyg;
  if (typeof initWysiwyg === 'function') {
    initWysiwyg();
  }
}

/**
 * Larger, fully interactive form preview shown in a modal. Inline previews are
 * intentionally lightweight and read-only; this is the "escape hatch" that
 * renders the same generated form at width and hydrates its rich editors.
 */
export class PreviewModal extends Modal {
  constructor(private readonly previewHtml: string, private readonly hydrate: () => void) {
    super({ size: '4xl', maxHeight: 'max-h-[90vh]', initialFocus: '[data-preview-modal-close]' });
  }

  protected renderContent(): string {
    return `
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Interactive Form Preview</h2>
        <button type="button" data-preview-modal-close
                class="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                aria-label="Close preview">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="overflow-y-auto p-6" data-preview-modal-body>${this.previewHtml}</div>
    `;
  }

  protected bindContentEvents(): void {
    this.container?.querySelector('[data-preview-modal-close]')?.addEventListener('click', () => this.hide());
  }

  protected async onAfterShow(): Promise<void> {
    // Hydrate the rich JSON/WYSIWYG editors only inside the opened modal.
    this.hydrate();
  }
}
