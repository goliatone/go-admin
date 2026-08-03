import { defineConfig } from 'vite';
import { resolve } from 'path';

const outDir = process.env.GO_ADMIN_ASSET_OUT_DIR || 'dist';

export default defineConfig({
  build: {
    // Library mode configuration
    lib: {
      // Multiple entry points
      entry: {
        'activity/index': resolve(import.meta.dirname, 'src/activity/index.ts'),
        'datatable/index': resolve(import.meta.dirname, 'src/datatable/index.ts'),
        'dashboard/index': resolve(import.meta.dirname, 'src/dashboard/index.ts'),
        'feature-flags/index': resolve(import.meta.dirname, 'src/feature-flags/index.ts'),
        'searchbox/index': resolve(import.meta.dirname, 'src/searchbox/index.ts'),
        'tabs/index': resolve(import.meta.dirname, 'src/tabs/index.ts'),
        'toast/init': resolve(import.meta.dirname, 'src/toast/init.ts'),
        'toast/error-helpers': resolve(import.meta.dirname, 'src/toast/error-helpers.ts'),
        'formgen/file_uploader': resolve(import.meta.dirname, 'src/formgen/file_uploader.ts'),
        'formgen/block_editor': resolve(import.meta.dirname, 'src/formgen/block_editor.ts'),
        'formgen/block_library_picker': resolve(import.meta.dirname, 'src/formgen/block_library_picker.ts'),
        'formgen/preferences': resolve(import.meta.dirname, 'src/formgen/preferences.ts'),
        'formgen/permission_matrix': resolve(import.meta.dirname, 'src/formgen/permission_matrix.ts'),
        'formgen/schema_editor': resolve(import.meta.dirname, 'src/formgen/schema_editor.ts'),
        'login-submit-loading/index': resolve(import.meta.dirname, 'src/login-submit-loading/index.ts'),
        'components/import-modal': resolve(import.meta.dirname, 'src/components/import-modal.ts'),
        'components/permission-pills': resolve(import.meta.dirname, 'src/components/permission-pills.ts'),
        'debug/index': resolve(import.meta.dirname, 'src/debug/index.ts'),
        'debug/repl': resolve(import.meta.dirname, 'src/debug/repl/index.ts'),
        'debug/shared-helpers': resolve(import.meta.dirname, 'src/debug/shared-helpers.ts'),
        'debug/shared/path-helpers': resolve(import.meta.dirname, 'src/debug/shared/path-helpers.ts'),
        'debug/toolbar': resolve(import.meta.dirname, 'src/debug/toolbar/index.ts'),
        'content-type-builder/index': resolve(import.meta.dirname, 'src/content-type-builder/index.ts'),
        'content-type-builder/shared/date-formatters': resolve(import.meta.dirname, 'src/content-type-builder/shared/date-formatters.ts'),
        'content-type-builder/shared/status-badges': resolve(import.meta.dirname, 'src/content-type-builder/shared/status-badges.ts'),
        'content-type-builder/shared/channel-switcher': resolve(import.meta.dirname, 'src/content-type-builder/shared/channel-switcher.ts'),
        'content-type-builder/shared/text': resolve(import.meta.dirname, 'src/content-type-builder/shared/text.ts'),
        'menu-builder/index': resolve(import.meta.dirname, 'src/menu-builder/index.ts'),
        'menu-builder/shared/path-helpers': resolve(import.meta.dirname, 'src/menu-builder/shared/path-helpers.ts'),
        'entry-navigation/index': resolve(import.meta.dirname, 'src/entry-navigation/index.ts'),
        'media/index': resolve(import.meta.dirname, 'src/media/index.ts'),
        'translation-exchange/index': resolve(import.meta.dirname, 'src/translation-exchange/index.ts'),
        'translation-family/index': resolve(import.meta.dirname, 'src/translation-family/index.ts'),
        'translation-dashboard/index': resolve(import.meta.dirname, 'src/translation-dashboard/index.ts'),
        'translation-editor/index': resolve(import.meta.dirname, 'src/translation-editor/index.ts'),
        'translation-matrix/index': resolve(import.meta.dirname, 'src/translation-matrix/index.ts'),
        'translation-queue/index': resolve(import.meta.dirname, 'src/translation-queue/index.ts'),
        'translation-actions/assignment-row-actions': resolve(import.meta.dirname, 'src/translation-actions/assignment-row-actions.ts'),
        'translation-operations/index': resolve(import.meta.dirname, 'src/translation-operations/index.ts'),
        'translation-shared/formatters': resolve(import.meta.dirname, 'src/translation-shared/formatters.ts'),
        'services/index': resolve(import.meta.dirname, 'src/services/index.ts'),
        'shared/html': resolve(import.meta.dirname, 'src/shared/html.ts'),
        'shared/action-menu': resolve(import.meta.dirname, 'src/shared/action-menu.ts'),
        'shared/coercion': resolve(import.meta.dirname, 'src/shared/coercion.ts'),
        'shared/deep-clone': resolve(import.meta.dirname, 'src/shared/deep-clone.ts'),
        'shared/enhanced-action': resolve(import.meta.dirname, 'src/shared/enhanced-action.ts'),
        'shared/behaviors/index': resolve(import.meta.dirname, 'src/shared/behaviors/index.ts'),
        'shared/json-parse': resolve(import.meta.dirname, 'src/shared/json-parse.ts'),
        'shared/query-state/url-state': resolve(import.meta.dirname, 'src/shared/query-state/url-state.ts'),
        'shared/record-normalization': resolve(import.meta.dirname, 'src/shared/record-normalization.ts'),
        'shared/dom-ready': resolve(import.meta.dirname, 'src/shared/dom-ready.ts'),
        'shared/path-normalization': resolve(import.meta.dirname, 'src/shared/path-normalization.ts'),
        'shared/size-formatters': resolve(import.meta.dirname, 'src/shared/size-formatters.ts'),
        'shared/stateful-controller': resolve(import.meta.dirname, 'src/shared/stateful-controller.ts'),
        'shared/time-formatters': resolve(import.meta.dirname, 'src/shared/time-formatters.ts'),
        'shared/transport/http-client': resolve(import.meta.dirname, 'src/shared/transport/http-client.ts'),
        'shared/transport/browser-globals': resolve(import.meta.dirname, 'src/shared/transport/browser-globals.ts'),
      },
      formats: ['es'],
      // Output file names without hash for predictable paths
      fileName: (format, entryName) => `${entryName}.js`,
    },
    // Output to dist to match embedded asset layout
    outDir,
    // Clean output directory before build
    emptyDirBeforeWrite: true,
    // Generate source maps only in production
    sourcemap: process.env.NODE_ENV === 'production',
    // Keep runtime assets external to support same-origin worker URLs under CSP.
    assetsInlineLimit: 0,
    // Rollup options for chunking and externals
    rollupOptions: {
      output: {
        // Preserve directory structure for entry points
        entryFileNames: '[name].js',
        // Keep chunks in a separate directory if needed
        chunkFileNames: 'chunks/[name]-[hash].js',
        // Asset file names
        assetFileNames: '[name][extname]',
      },
    },
    // Minify for production
    minify: 'esbuild',
    // Target modern browsers
    target: 'es2020',
  },
  // Resolve configuration
  resolve: {
    alias: {
      // Allow importing from src directory
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  // Dev server configuration
  server: {
    port: 5173,
    // Proxy API requests to Go server
    proxy: {
      '/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
