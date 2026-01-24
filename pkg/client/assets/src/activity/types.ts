/**
 * Activity Feed Types
 */

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  object: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ActivityPayload {
  entries: ActivityEntry[];
  total?: number;
  has_more?: boolean;
  next_offset?: number;
}

export interface ActivityConfig {
  apiPath: string;
  basePath: string;
  actionLabels?: Record<string, string>;
}

export interface ActivitySelectors {
  form: string;
  tableBody: string;
  emptyState: string;
  disabledState: string;
  errorState: string;
  countEl: string;
  prevBtn: string;
  nextBtn: string;
  refreshBtn: string;
  clearBtn: string;
  limitInput: string;
}

export interface ActivityState {
  limit: number;
  offset: number;
  total: number;
  nextOffset: number;
  hasMore: boolean;
  extraParams: Record<string, string>;
}

export type ActionCategory =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'auth'
  | 'viewed'
  | 'system';

export interface ParsedObject {
  type: string;
  id: string;
}

export interface ToastNotifier {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}
