import { spawnSync } from 'node:child_process';
import { accessSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const helperDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(helperDir, '..', '..');
const distEntry = resolve(packageRoot, 'dist/datatable/index.js');
const lockDir = resolve(packageRoot, '.tmp/test-dist-build.lock');

let datatableModulePromise;

function distExists() {
  try {
    accessSync(distEntry);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDist(timeoutMs = 120000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (distExists()) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${distEntry}`);
}

async function ensureDatatableDist() {
  if (distExists()) {
    return;
  }

  mkdirSync(resolve(packageRoot, '.tmp'), { recursive: true });

  let acquiredLock = false;
  try {
    mkdirSync(lockDir);
    acquiredLock = true;
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'EEXIST') {
      await waitForDist();
      return;
    }
    throw error;
  }

  try {
    const result = spawnSync('npm', ['run', 'build:ts'], {
      cwd: packageRoot,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error(`npm run build:ts failed with exit code ${result.status ?? 1}`);
    }
    if (!distExists()) {
      throw new Error(`Expected ${distEntry} after npm run build:ts`);
    }
  } finally {
    if (acquiredLock) {
      rmSync(lockDir, { recursive: true, force: true });
    }
  }
}

export async function importDatatableModule() {
  if (!datatableModulePromise) {
    datatableModulePromise = (async () => {
      await ensureDatatableDist();
      return import(pathToFileURL(distEntry).href);
    })();
  }
  return datatableModulePromise;
}
