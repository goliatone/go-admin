import { badge } from '../../shared/badge.js';

export type BlockStatusVariant = 'draft' | 'active' | 'deprecated';

interface BlockStatusMeta {
  label: string;
  dotClass: string;
}

const BLOCK_STATUS_META: Record<BlockStatusVariant, BlockStatusMeta> = {
  draft: {
    label: 'Draft',
    dotClass: 'bg-yellow-400',
  },
  active: {
    label: 'Active',
    dotClass: 'bg-green-400',
  },
  deprecated: {
    label: 'Deprecated',
    dotClass: 'bg-red-400',
  },
};

export function normalizeBlockStatus(status?: string): BlockStatusVariant {
  if (status === 'draft' || status === 'deprecated') return status;
  return 'active';
}

export function renderBlockStatusBadge(status?: string): string {
  const variant = normalizeBlockStatus(status);
  const meta = BLOCK_STATUS_META[variant];
  return badge(meta.label, 'status', variant);
}

export function renderBlockStatusDot(status?: string): string {
  const variant = normalizeBlockStatus(status);
  const meta = BLOCK_STATUS_META[variant];
  return `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full ${meta.dotClass}" title="${meta.label}"></span>`;
}
