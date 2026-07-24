import type { DebugSnapshot, DeploymentSnapshot } from './types.js';

export type DeploymentIndicator = {
  /** Canonical compact identity, e.g. `STAGING · brisk-otter`. */
  label: string;
  /** Validated six-digit hex color; never a raw payload value. */
  color: string;
  /** Upper-cased environment name. */
  environment: string;
  /** Short environment token used when horizontal space is tight. */
  environmentShort: string;
  /** Human-friendly process name. */
  instance: string;
  /** Full single-line summary for tooltips and accessible names. */
  title: string;
};

/** Neutral slate used when the payload carries no safe environment color. */
const NEUTRAL_COLOR = '#64748b';

/**
 * Short tokens for the environments go-admin names by default, plus the
 * aliases the resolver canonicalizes. Unknown environments fall back to a
 * bounded slice so the collapsed indicator never grows unpredictably.
 */
const ENVIRONMENT_SHORT_NAMES: Record<string, string> = {
  development: 'DEV',
  dev: 'DEV',
  local: 'LOCAL',
  staging: 'STG',
  stage: 'STG',
  production: 'PROD',
  prod: 'PROD',
  preview: 'PREV',
  sandbox: 'SBX',
  testing: 'TEST',
  test: 'TEST',
  qa: 'QA',
};

function textField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Environment colors are validated server-side before serialization. This is
 * the client-side gate so a legacy or hand-crafted payload can never reach a
 * CSS custom property.
 */
function safeColor(value: unknown): string {
  const raw = textField(value).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : NEUTRAL_COLOR;
}

function shortEnvironment(environment: string): string {
  const known = ENVIRONMENT_SHORT_NAMES[environment.toLowerCase()];
  if (known) {
    return known;
  }
  const upper = environment.toUpperCase();
  return upper.length <= 5 ? upper : upper.slice(0, 4);
}

export function deploymentIndicator(
  snapshot: DebugSnapshot,
  panels?: readonly string[]
): DeploymentIndicator | null {
  if (panels && !panels.some((panel) => panel.trim().toLowerCase() === 'deployment')) {
    return null;
  }
  const deployment = snapshot.deployment as DeploymentSnapshot | undefined;
  const environment = textField(deployment?.environment?.name);
  const instance = textField(deployment?.runtime?.instance_name);
  if (!environment || !instance) {
    return null;
  }
  const upperEnvironment = environment.toUpperCase();
  // Version and commit are optional context: present them when the payload has
  // them, omit them silently when an older server did not send them.
  const details = [
    `Environment: ${environment}`,
    `Instance: ${instance}`,
    textField(deployment?.application?.version) ? `Version: ${textField(deployment?.application?.version)}` : '',
    textField(deployment?.build?.commit_short) ? `Commit: ${textField(deployment?.build?.commit_short)}` : '',
  ].filter(Boolean);
  return {
    label: `${upperEnvironment} · ${instance}`,
    color: safeColor(deployment?.environment?.color),
    environment: upperEnvironment,
    environmentShort: shortEnvironment(environment),
    instance,
    title: details.join(' · '),
  };
}
