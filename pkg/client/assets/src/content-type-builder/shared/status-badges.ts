import { badge } from '../../shared/badge.js';

export type BlockStatusVariant = 'draft' | 'active' | 'deprecated';

const BLOCK_STATUS_LABELS: Record<BlockStatusVariant, string> = {
  draft: 'Draft',
  active: 'Active',
  deprecated: 'Deprecated',
};

export function normalizeBlockStatus(status?: string): BlockStatusVariant {
  if (status === 'draft' || status === 'deprecated') return status;
  return 'active';
}

/**
 * Render a block status through the shared, accessible text+color badge so
 * every modeling surface presents status the same way (visible label + tone,
 * never color alone). Pass `{ size: 'sm' }` for compact list rows.
 */
export function renderBlockStatusBadge(status?: string, opts?: { size?: 'sm' }): string {
  const variant = normalizeBlockStatus(status);
  return badge(BLOCK_STATUS_LABELS[variant], 'status', variant, opts?.size ? { size: opts.size } : undefined);
}
