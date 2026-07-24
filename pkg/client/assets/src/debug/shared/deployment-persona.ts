import { escapeAttribute, escapeHTML } from '../../shared/html.js';
import type { DeploymentPersona } from './types.js';

const MAX_NAME = 128;
const MAX_ALT = 256;
const MAX_MONOGRAM = 16;
const MAX_PNG_BASE64 = 88_000;

function boundedText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function safeColor(value: unknown): string {
  const color = boundedText(value, 16).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : '';
}

export function normalizeDeploymentPersona(value: unknown): DeploymentPersona | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as DeploymentPersona;
  const name = boundedText(raw.name, MAX_NAME);
  const algorithm = boundedText(raw.algorithm, 64);
  const version = boundedText(raw.version, 64);
  const source = boundedText(raw.source, 64);
  const visual = raw.visual;
  const alt = boundedText(visual?.alt, MAX_ALT) || name;
  if (!name || !visual || !alt) return null;

  if (visual.kind === 'monogram') {
    const text = boundedText(visual.text, MAX_MONOGRAM);
    const background = safeColor(visual.background);
    const foreground = safeColor(visual.foreground);
    if (!text || !background || !foreground) return null;
    return { name, algorithm, version, source, visual: { kind: 'monogram', text, alt, background, foreground } };
  }
  if (visual.kind === 'image') {
    const data = typeof visual.data === 'string' ? visual.data.trim() : '';
    if (
      visual.media_type !== 'image/png'
      || data.length === 0
      || data.length > MAX_PNG_BASE64
      || !data.startsWith('iVBORw0KGgo')
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
    ) return null;
    return { name, algorithm, version, source, visual: { kind: 'image', alt, media_type: 'image/png', data } };
  }
  return null;
}

export function renderDeploymentPersonaAvatar(
  value: unknown,
  className = 'deployment-persona-avatar'
): string {
  const persona = normalizeDeploymentPersona(value);
  if (!persona?.visual) return '';
  const visual = persona.visual;
  if (visual.kind === 'image') {
    return `<span class="${escapeAttribute(className)}"><img src="data:image/png;base64,${escapeAttribute(visual.data)}" alt="${escapeAttribute(visual.alt)}"></span>`;
  }
  return `<span class="${escapeAttribute(className)}" role="img" aria-label="${escapeAttribute(visual.alt)}" style="--persona-background:${escapeAttribute(visual.background)};--persona-foreground:${escapeAttribute(visual.foreground)}">${escapeHTML(visual.text)}</span>`;
}
