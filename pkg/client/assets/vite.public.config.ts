import { defineConfig } from 'vite';
import { resolve } from 'path';

const entry = {
  index: resolve(import.meta.dirname, 'src/public.ts'),
  'shared/html': resolve(import.meta.dirname, 'src/shared/html.ts'),
  'shared/coercion': resolve(import.meta.dirname, 'src/shared/coercion.ts'),
  'shared/json-parse': resolve(import.meta.dirname, 'src/shared/json-parse.ts'),
  'shared/date-utils': resolve(import.meta.dirname, 'src/shared/date-utils.ts'),
  'shared/dom-ready': resolve(import.meta.dirname, 'src/shared/dom-ready.ts'),
  'shared/size-formatters': resolve(import.meta.dirname, 'src/shared/size-formatters.ts'),
  'shared/stateful-controller': resolve(import.meta.dirname, 'src/shared/stateful-controller.ts'),
  'shared/time-formatters': resolve(import.meta.dirname, 'src/shared/time-formatters.ts'),
  'shared/transport/http-client': resolve(import.meta.dirname, 'src/shared/transport/http-client.ts'),
  'services': resolve(import.meta.dirname, 'src/services/index.ts'),
  'services/command-runtime': resolve(import.meta.dirname, 'src/services/command-runtime.ts'),
  'services/ui-states': resolve(import.meta.dirname, 'src/services/ui-states.ts'),
  'services/sse-client': resolve(import.meta.dirname, 'src/services/sse-client.ts'),
  'toast/error-helpers': resolve(import.meta.dirname, 'src/toast/error-helpers.ts'),
  datatable: resolve(import.meta.dirname, 'src/datatable/index.ts'),
  'renderers/application-widgets': resolve(import.meta.dirname, 'src/renderers/application-widgets.ts'),
};

export default defineConfig({
  build: {
    lib: {
      entry,
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    outDir: 'dist-public',
    emptyDirBeforeWrite: true,
    sourcemap: true,
    target: 'es2020',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
});
