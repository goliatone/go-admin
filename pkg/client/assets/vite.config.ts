import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Library mode configuration
    lib: {
      // Multiple entry points
      entry: {
        'activity/index': resolve(__dirname, 'src/activity/index.ts'),
        'datatable/index': resolve(__dirname, 'src/datatable/index.ts'),
        'dashboard/index': resolve(__dirname, 'src/dashboard/index.ts'),
        'feature-flags/index': resolve(__dirname, 'src/feature-flags/index.ts'),
        'searchbox/index': resolve(__dirname, 'src/searchbox/index.ts'),
        'tabs/index': resolve(__dirname, 'src/tabs/index.ts'),
        'toast/init': resolve(__dirname, 'src/toast/init.ts'),
        'toast/error-helpers': resolve(__dirname, 'src/toast/error-helpers.ts'),
        'formgen/file_uploader': resolve(__dirname, 'src/formgen/file_uploader.ts'),
        'formgen/block_editor': resolve(__dirname, 'src/formgen/block_editor.ts'),
        'formgen/block_library_picker': resolve(__dirname, 'src/formgen/block_library_picker.ts'),
        'formgen/preferences': resolve(__dirname, 'src/formgen/preferences.ts'),
        'formgen/permission_matrix': resolve(__dirname, 'src/formgen/permission_matrix.ts'),
        'formgen/schema_editor': resolve(__dirname, 'src/formgen/schema_editor.ts'),
        'components/import-modal': resolve(__dirname, 'src/components/import-modal.ts'),
        'components/permission-pills': resolve(__dirname, 'src/components/permission-pills.ts'),
        'debug/index': resolve(__dirname, 'src/debug/index.ts'),
        'debug/repl': resolve(__dirname, 'src/debug/repl/index.ts'),
        'debug/toolbar': resolve(__dirname, 'src/debug/toolbar/index.ts'),
        'content-type-builder/index': resolve(__dirname, 'src/content-type-builder/index.ts'),
        'menu-builder/index': resolve(__dirname, 'src/menu-builder/index.ts'),
        'translation-exchange/index': resolve(__dirname, 'src/translation-exchange/index.ts'),
        'translation-family/index': resolve(__dirname, 'src/translation-family/index.ts'),
        'translation-dashboard/index': resolve(__dirname, 'src/translation-dashboard/index.ts'),
        'translation-editor/index': resolve(__dirname, 'src/translation-editor/index.ts'),
        'translation-matrix/index': resolve(__dirname, 'src/translation-matrix/index.ts'),
        'translation-queue/index': resolve(__dirname, 'src/translation-queue/index.ts'),
        'translation-operations/index': resolve(__dirname, 'src/translation-operations/index.ts'),
        'services/index': resolve(__dirname, 'src/services/index.ts'),
        'shared/html': resolve(__dirname, 'src/shared/html.ts'),
        // E-Sign module entries
        'esign/index': resolve(__dirname, 'src/esign/index.ts'),
        'esign/admin-landing': resolve(__dirname, 'src/esign/entries/admin-landing.ts'),
        'esign/document-form': resolve(__dirname, 'src/esign/entries/document-form.ts'),
        'esign/agreement-form': resolve(__dirname, 'src/esign/entries/agreement-form.ts'),
        'esign/google-integration': resolve(__dirname, 'src/esign/entries/google-integration.ts'),
        'esign/google-callback': resolve(__dirname, 'src/esign/entries/google-callback.ts'),
        'esign/google-drive-picker': resolve(__dirname, 'src/esign/entries/google-drive-picker.ts'),
        'esign/source-management-runtime': resolve(__dirname, 'src/esign/entries/source-management-runtime.ts'),
        'esign/document-detail': resolve(__dirname, 'src/esign/entries/document-detail.ts'),
        'esign/agreement-detail': resolve(__dirname, 'src/esign/entries/agreement-detail.ts'),
        'esign/datatable': resolve(__dirname, 'src/esign/entries/datatable.ts'),
        'esign/signer-review': resolve(__dirname, 'src/esign/entries/signer-review.ts'),
        'esign/signer-complete': resolve(__dirname, 'src/esign/entries/signer-complete.ts'),
        'esign/signer-error': resolve(__dirname, 'src/esign/entries/signer-error.ts'),
        'esign/integration-health': resolve(__dirname, 'src/esign/entries/integration-health.ts'),
        'esign/integration-mappings': resolve(__dirname, 'src/esign/entries/integration-mappings.ts'),
        'esign/integration-conflicts': resolve(__dirname, 'src/esign/entries/integration-conflicts.ts'),
        'esign/integration-sync-runs': resolve(__dirname, 'src/esign/entries/integration-sync-runs.ts'),
        'esign/source-browser': resolve(__dirname, 'src/esign/entries/source-browser.ts'),
        'esign/source-detail': resolve(__dirname, 'src/esign/entries/source-detail.ts'),
        'esign/source-revisions': resolve(__dirname, 'src/esign/entries/source-revisions.ts'),
        'esign/source-search': resolve(__dirname, 'src/esign/entries/source-search.ts'),
      },
      formats: ['es'],
      // Output file names without hash for predictable paths
      fileName: (format, entryName) => `${entryName}.js`,
    },
    // Output to dist to match embedded asset layout
    outDir: 'dist',
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
      '@': resolve(__dirname, 'src'),
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
