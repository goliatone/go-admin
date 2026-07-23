import type { DebugSnapshot, DeploymentSnapshot } from './types.js';

export type DeploymentIndicator = {
  label: string;
  color: string;
};

export function deploymentIndicator(snapshot: DebugSnapshot): DeploymentIndicator | null {
  const deployment = snapshot.deployment as DeploymentSnapshot | undefined;
  const environment = typeof deployment?.environment?.name === 'string'
    ? deployment.environment.name.trim()
    : '';
  const instance = typeof deployment?.runtime?.instance_name === 'string'
    ? deployment.runtime.instance_name.trim()
    : '';
  if (!environment || !instance) {
    return null;
  }
  const rawColor = typeof deployment?.environment?.color === 'string'
    ? deployment.environment.color.trim().toLowerCase()
    : '';
  const color = /^#[0-9a-f]{6}$/.test(rawColor) ? rawColor : '#64748b';
  return {
    label: `${environment.toUpperCase()} · ${instance}`,
    color,
  };
}
