import { createLogger } from '../shared/logger.js';
import { parseJSONValue } from '../shared/json-parse.js';
import { ContentTypeEditor } from './content-type-editor.js';
import type { ContentTypeEditorConfig } from './types.js';
import { deriveAdminBasePath, resolveApiBasePath } from './shared/api-paths.js';
import { initContentTypeChannelSwitcher } from './shared/channel-switcher.js';

const logger = createLogger('ContentTypeBuilder');

/** Initialize content type editors on established editor roots. */
export function initContentTypeEditors(scope: ParentNode = document): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-content-type-editor-root]'));

  roots.forEach((root) => {
    if (root.dataset.initialized === 'true') return;

    const config = parseConfig(root);
    if (!config.apiBasePath) {
      logger.warn('Content type editor missing apiBasePath', root);
      return;
    }

    const basePath = config.basePath ?? deriveAdminBasePath(config.apiBasePath);
    const activeChannel = String(config.channel ?? '').trim().toLowerCase();
    const channelQuery = activeChannel && activeChannel !== 'default'
      ? `channel=${encodeURIComponent(activeChannel)}`
      : '';

    if (!config.onCancel) {
      config.onCancel = () => {
        const target = `${basePath}/content/types`;
        window.location.href = channelQuery ? `${target}?${channelQuery}` : target;
      };
    }

    if (!config.onSave) {
      config.onSave = (saved) => {
        const slug = saved.slug ?? saved.id;
        if (slug) {
          const params = [`slug=${encodeURIComponent(slug)}`];
          if (channelQuery) params.push(channelQuery);
          window.location.href = `${basePath}/content/types?${params.join('&')}`;
        }
      };
    }

    try {
      const editor = new ContentTypeEditor(root, config);
      void editor.init();
      root.dataset.initialized = 'true';
    } catch (error) {
      logger.error('Content type editor failed to initialize:', error);
      root.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${error instanceof Error ? error.message : 'An unexpected error occurred while initializing the editor.'}
          </p>
          <button type="button" onclick="window.location.reload()"
            class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50">
            Reload page
          </button>
        </div>
      `;
    }
  });
}

function parseConfig(root: HTMLElement): ContentTypeEditorConfig {
  let config: Partial<ContentTypeEditorConfig> = {};
  const configAttr = root.getAttribute('data-content-type-editor-config');
  if (configAttr) {
    config = parseJSONValue<Partial<ContentTypeEditorConfig>>(configAttr, {});
  }

  const apiBasePath = resolveApiBasePath(config.apiBasePath, root.dataset.apiBasePath, root.dataset.basePath);
  const basePath = config.basePath ?? deriveAdminBasePath(apiBasePath, root.dataset.basePath);

  return {
    ...config,
    apiBasePath,
    basePath,
    contentTypeId: config.contentTypeId ?? root.dataset.contentTypeId,
    channel: config.channel ?? root.dataset.channel,
    locale: config.locale ?? root.dataset.locale,
  };
}

/** Initialize the complete first-party content editor surface. */
export function initContentTypeEditorRuntime(scope: ParentNode = document): void {
  initContentTypeChannelSwitcher(scope);
  initContentTypeEditors(scope);
}

export { ContentTypeEditor } from './content-type-editor.js';

