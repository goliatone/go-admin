import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Library mode configuration
    lib: {
      // Multiple entry points
      entry: {
        'datatable/index': resolve(__dirname, 'src/datatable/index.ts'),
        'dashboard/index': resolve(__dirname, 'src/dashboard/index.ts'),
        'feature-flags/index': resolve(__dirname, 'src/feature-flags/index.ts'),
        'searchbox/index': resolve(__dirname, 'src/searchbox/index.ts'),
        'toast/init': resolve(__dirname, 'src/toast/init.ts'),
        'formgen/file_uploader': resolve(__dirname, 'src/formgen/file_uploader.ts'),
        'formgen/permission_matrix': resolve(__dirname, 'src/formgen/permission_matrix.ts'),
        'components/import-modal': resolve(__dirname, 'src/components/import-modal.ts'),
        'components/permission-pills': resolve(__dirname, 'src/components/permission-pills.ts'),
        'debug/index': resolve(__dirname, 'src/debug/index.ts'),
        'debug/repl': resolve(__dirname, 'src/debug/repl/index.ts'),
        'debug/toolbar': resolve(__dirname, 'src/debug/toolbar/index.ts'),
      },
      formats: ['es'],
      // Output file names without hash for predictable paths
      fileName: (format, entryName) => `${entryName}.js`,
    },
    // Output to dist to match embedded asset layout
    outDir: 'dist',
    // Clean output directory before build
    emptyDirBeforeWrite: true,
    // Generate source maps
    sourcemap: true,
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
