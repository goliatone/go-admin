import { defineConfig } from 'vite';
import { resolve } from 'path';

const entry = {
  index: resolve(__dirname, 'src/public.ts'),
  'shared/html': resolve(__dirname, 'src/shared/html.ts'),
  'shared/coercion': resolve(__dirname, 'src/shared/coercion.ts'),
  'shared/json-parse': resolve(__dirname, 'src/shared/json-parse.ts'),
  'shared/date-utils': resolve(__dirname, 'src/shared/date-utils.ts'),
  'shared/dom-ready': resolve(__dirname, 'src/shared/dom-ready.ts'),
  'shared/size-formatters': resolve(__dirname, 'src/shared/size-formatters.ts'),
  'shared/stateful-controller': resolve(__dirname, 'src/shared/stateful-controller.ts'),
  'shared/time-formatters': resolve(__dirname, 'src/shared/time-formatters.ts'),
  'shared/transport/http-client': resolve(__dirname, 'src/shared/transport/http-client.ts'),
  'services': resolve(__dirname, 'src/services/index.ts'),
  'services/command-runtime': resolve(__dirname, 'src/services/command-runtime.ts'),
  'services/ui-states': resolve(__dirname, 'src/services/ui-states.ts'),
  'services/sse-client': resolve(__dirname, 'src/services/sse-client.ts'),
  'toast/error-helpers': resolve(__dirname, 'src/toast/error-helpers.ts'),
  datatable: resolve(__dirname, 'src/datatable/index.ts'),
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
