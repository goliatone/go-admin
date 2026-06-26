import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const helperDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(helperDir, '../../../../..');
const quickstartDir = path.join(repoRoot, 'quickstart');
const shellAssetPath = path.join('components', 'dashboard', 'assets', 'shell', 'shell.js');

function goDashboardModuleDir() {
  if (process.env.GO_DASHBOARD_DIR) {
    return process.env.GO_DASHBOARD_DIR;
  }
  const output = execFileSync(
    'go',
    ['list', '-m', '-f', '{{.Dir}}', 'github.com/goliatone/go-dashboard'],
    { cwd: quickstartDir, encoding: 'utf8' },
  );
  return output.trim();
}

export function loadDashboardShell() {
  const moduleDir = goDashboardModuleDir();
  return require(path.join(moduleDir, shellAssetPath));
}
