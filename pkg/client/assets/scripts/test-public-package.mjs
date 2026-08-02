#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const temporary = mkdtempSync(join(tmpdir(), 'go-admin-client-consumer-'));

function run(command, args, cwd = temporary, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
  return result.stdout ?? '';
}

try {
  const packResult = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temporary], root, true));
  const packed = packResult[0];
  if (!packed?.filename || !Array.isArray(packed.files)) {
    throw new Error('npm pack did not return a file manifest');
  }
  for (const file of packed.files) {
    const path = String(file.path || '').replaceAll('\\', '/');
    if (!path.startsWith('dist-public/') && path !== 'package.json' && path !== 'README.md' && path !== 'LICENSE') {
      throw new Error(`unexpected packed file: ${path}`);
    }
    if (/(^|[\/_-])e-?sign([\/_-]|$)/i.test(path)) {
      throw new Error(`e-sign artifact leaked into package: ${path}`);
    }
  }

  writeFileSync(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2));
  writeFileSync(join(temporary, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2020', 'DOM'],
      strict: true,
      noEmit: true,
    },
    include: ['consumer.ts'],
  }, null, 2));
  writeFileSync(join(temporary, 'consumer.ts'), `
import { httpRequest } from '@goliatone/go-admin-client/shared/transport/http-client';
import { renderPanelState } from '@goliatone/go-admin-client/services/ui-states';
import { createSSEClient, type ClientOptions } from '@goliatone/go-admin-client/services/sse-client';
import { escapeHTML } from '@goliatone/go-admin-client/shared/html';
import { asRecord } from '@goliatone/go-admin-client/shared/coercion';
import * as datatable from '@goliatone/go-admin-client/datatable';

const options: ClientOptions = { url: '/events' };
void httpRequest;
void renderPanelState;
void createSSEClient(options);
void escapeHTML('<test>');
void asRecord({ test: true });
void datatable;
`);

  run('npm', ['install', '--ignore-scripts', join(temporary, packed.filename), 'typescript@5.3.3']);
  run(resolve(temporary, 'node_modules', '.bin', 'tsc'), ['--project', 'tsconfig.json']);

  const installed = JSON.parse(readFileSync(join(temporary, 'node_modules', '@goliatone', 'go-admin-client', 'package.json'), 'utf8'));
  if (installed.name !== '@goliatone/go-admin-client') {
    throw new Error(`unexpected installed package: ${installed.name}`);
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
