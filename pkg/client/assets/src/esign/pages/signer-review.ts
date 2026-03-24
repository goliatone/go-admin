// @ts-nocheck

import { onReady } from '../utils/dom-helpers.js';
import { escapeHTML } from '../../shared/html.js';
import {
  loadPdfDocument as loadPdfSourceDocument,
  logPdfLoadError,
} from '../pdf/runtime.js';

export type SignerProfileMode = 'local_only' | 'hybrid' | 'remote_only';

export interface SignerProfileConfig {
  mode?: SignerProfileMode;
  rememberByDefault?: boolean;
  ttlDays?: number;
  persistDrawnSignature?: boolean;
  endpointBasePath?: string;
}

export interface SignerReviewConfig {
  token: string;
  apiBasePath?: string;
  signerBasePath?: string;
  resourceBasePath?: string;
  reviewApiPath?: string;
  assetContractPath?: string;
  telemetryPath?: string;
  agreementId: string;
  sessionKind?: 'signer' | 'reviewer' | string;
  uiMode?: 'sign' | 'review' | 'sign_and_review' | string;
  defaultTab?: 'sign' | 'review' | string;
  viewerMode?: 'review' | 'sign' | 'complete' | 'read_only' | string;
  viewerBanner?: 'sender_review' | 'sender_progress' | 'sender_complete' | 'sender_read_only' | string;
  recipientId: string;
  recipientEmail?: string;
  recipientName?: string;
  pageCount?: number;
  hasConsented?: boolean;
  canSign?: boolean;
  reviewMarkersVisible?: boolean;
  reviewMarkersInteractive?: boolean;
  fields?: any[];
  review?: {
    review_id?: string;
    status?: string;
    gate?: string;
    comments_enabled?: boolean;
    override_active?: boolean;
    override_reason?: string;
    override_by_user_id?: string;
    override_by_display_name?: string;
    override_at?: string;
    is_reviewer?: boolean;
    can_comment?: boolean;
    can_approve?: boolean;
    can_request_changes?: boolean;
    can_sign?: boolean;
    participant_status?: string;
    approved_count?: number;
    total_approvers?: number;
    sign_blocked?: boolean;
    sign_block_reason?: string;
    blockers?: string[];
    participant?: {
      id?: string;
      participant_type?: string;
      recipient_id?: string;
      email?: string;
      display_name?: string;
      decision_status?: string;
      effective_decision_status?: string;
      approved_on_behalf?: boolean;
      approved_on_behalf_reason?: string;
      approved_on_behalf_by_user_id?: string;
      approved_on_behalf_by_display_name?: string;
      approved_on_behalf_at?: string;
    };
    actor_map?: Record<string, {
      name?: string;
      email?: string;
      role?: string;
      actor_type?: string;
      actor_id?: string;
    }>;
    threads?: Array<{
      thread?: any;
      messages?: any[];
    }>;
  };
  flowMode?: 'unified' | 'legacy' | string;
  telemetryEnabled?: boolean;
  viewer?: {
    coordinateSpace?: 'pdf' | 'screen' | string;
    contractVersion?: string;
    unit?: 'pt' | 'px' | string;
    origin?: 'top-left' | 'bottom-left' | string;
    yAxisDirection?: 'down' | 'up' | string;
    pages?: any[];
    compatibilityTier?: string;
    compatibilityReason?: string;
    compatibilityMessage?: string;
  };
  signerState?: 'active' | 'waiting' | 'completed' | 'declined' | string;
  recipientStage?: number;
  activeStage?: number;
  activeRecipientIds?: string[];
  waitingForRecipientIds?: string[];
  profile?: SignerProfileConfig;
}

interface PersistedSignerProfile {
  schemaVersion: 1;
  key: string;
  fullName: string;
  initials: string;
  typedSignature: string;
  drawnSignatureDataUrl: string;
  drawnInitialsDataUrl: string;
  remember: boolean;
  updatedAt: number;
  expiresAt: number;
}

interface SavedSignatureEntry {
  id: string;
  type: 'signature' | 'initials';
  label?: string;
  thumbnail_data_url: string;
  data_url?: string;
  created_at?: string;
}

interface SignerProfileStore {
  load(key: string): Promise<PersistedSignerProfile | null>;
  save(key: string, patch: Partial<PersistedSignerProfile>): Promise<PersistedSignerProfile>;
  clear(key: string): Promise<void>;
}

const SIGNER_PROFILE_STORAGE_PREFIX = 'esign.signer.profile.v1';
const SIGNER_PROFILE_OUTBOX_KEY = 'esign.signer.profile.outbox.v1';
const DEFAULT_PROFILE_TTL_DAYS = 90;
const SIGNATURE_UPLOAD_MAX_BYTES = 500 * 1024;

type SignerProfileOutboxEntry = {
  op: 'patch' | 'clear';
  patch?: Partial<PersistedSignerProfile>;
  updatedAt: number;
};

class LocalSignerProfileStore implements SignerProfileStore {
  private readonly ttlMs: number;

  constructor(ttlDays: number) {
    const days = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : DEFAULT_PROFILE_TTL_DAYS;
    this.ttlMs = days * 24 * 60 * 60 * 1000;
  }

  private storageKey(key: string): string {
    return `${SIGNER_PROFILE_STORAGE_PREFIX}:${key}`;
  }

  async load(key: string): Promise<PersistedSignerProfile | null> {
    try {
      const raw = window.localStorage.getItem(this.storageKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== 1) {
        window.localStorage.removeItem(this.storageKey(key));
        return null;
      }
      if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
        window.localStorage.removeItem(this.storageKey(key));
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async save(key: string, patch: Partial<PersistedSignerProfile>): Promise<PersistedSignerProfile> {
    const now = Date.now();
    const current = (await this.load(key)) || {
      schemaVersion: 1,
      key,
      fullName: '',
      initials: '',
      typedSignature: '',
      drawnSignatureDataUrl: '',
      drawnInitialsDataUrl: '',
      remember: true,
      updatedAt: now,
      expiresAt: now + this.ttlMs,
    };

    const next: PersistedSignerProfile = {
      ...current,
      ...patch,
      schemaVersion: 1,
      key,
      updatedAt: now,
      expiresAt: now + this.ttlMs,
    };

    try {
      window.localStorage.setItem(this.storageKey(key), JSON.stringify(next));
    } catch {
      // Best-effort only.
    }
    return next;
  }

  async clear(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(this.storageKey(key));
    } catch {
      // noop
    }
  }
}

class RemoteSignerProfileStore implements SignerProfileStore {
  private readonly endpointBasePath: string;
  private readonly token: string;

  constructor(endpointBasePath: string, token: string) {
    this.endpointBasePath = endpointBasePath.replace(/\/$/, '');
    this.token = token;
  }

  private endpoint(key: string): string {
    const encodedToken = encodeURIComponent(this.token);
    const encodedKey = encodeURIComponent(normalizeSignerProfileKeyForTransport(key));
    return `${this.endpointBasePath}/profile/${encodedToken}?key=${encodedKey}`;
  }

  async load(key: string): Promise<PersistedSignerProfile | null> {
    const response = await fetch(this.endpoint(key), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || typeof payload !== 'object') return null;
    return payload.profile || null;
  }

  async save(key: string, patch: Partial<PersistedSignerProfile>): Promise<PersistedSignerProfile> {
    const response = await fetch(this.endpoint(key), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ patch }),
    });
    if (!response.ok) {
      throw new Error('remote profile sync failed');
    }
    const payload = await response.json();
    return payload.profile;
  }

  async clear(key: string): Promise<void> {
    const response = await fetch(this.endpoint(key), {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok && response.status !== 404) {
      throw new Error('remote profile clear failed');
    }
  }
}

class SignerProfileRepository {
  private readonly mode: SignerProfileMode;
  private readonly localStore: SignerProfileStore;
  private readonly remoteStore: SignerProfileStore | null;

  constructor(mode: SignerProfileMode, localStore: SignerProfileStore, remoteStore: SignerProfileStore | null) {
    this.mode = mode;
    this.localStore = localStore;
    this.remoteStore = remoteStore;
  }

  private outboxLoad(): Record<string, SignerProfileOutboxEntry> {
    try {
      const raw = window.localStorage.getItem(SIGNER_PROFILE_OUTBOX_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return {};
      }
      const outbox: Record<string, SignerProfileOutboxEntry> = {};
      for (const [key, entry] of Object.entries(parsed)) {
        if (!entry || typeof entry !== 'object') {
          continue;
        }
        const rawEntry = entry as any;
        if (rawEntry.op === 'clear') {
          outbox[key] = {
            op: 'clear',
            updatedAt: Number(rawEntry.updatedAt) || Date.now(),
          };
          continue;
        }
        // Backward compatibility: prior outbox format persisted patch-only objects.
        const patch = rawEntry.op === 'patch' ? rawEntry.patch : rawEntry;
        outbox[key] = {
          op: 'patch',
          patch: patch && typeof patch === 'object' ? patch : {},
          updatedAt: Number(rawEntry.updatedAt) || Date.now(),
        };
      }
      return outbox;
    } catch {
      return {};
    }
  }

  private outboxSave(data: Record<string, SignerProfileOutboxEntry>): void {
    try {
      window.localStorage.setItem(SIGNER_PROFILE_OUTBOX_KEY, JSON.stringify(data));
    } catch {
      // noop
    }
  }

  private queuePatch(key: string, patch: Partial<PersistedSignerProfile>): void {
    const outbox = this.outboxLoad();
    const existing = outbox[key];
    const existingPatch = existing?.op === 'patch' ? existing.patch || {} : {};
    outbox[key] = {
      op: 'patch',
      patch: { ...existingPatch, ...patch, updatedAt: Date.now() },
      updatedAt: Date.now(),
    };
    this.outboxSave(outbox);
  }

  private queueClear(key: string): void {
    const outbox = this.outboxLoad();
    outbox[key] = { op: 'clear', updatedAt: Date.now() };
    this.outboxSave(outbox);
  }

  private getOutboxEntry(key: string): SignerProfileOutboxEntry | null {
    const outbox = this.outboxLoad();
    return outbox[key] || null;
  }

  private removeOutboxEntry(key: string): void {
    const outbox = this.outboxLoad();
    if (!outbox[key]) {
      return;
    }
    delete outbox[key];
    this.outboxSave(outbox);
  }

  private async flushOutboxForKey(key: string): Promise<void> {
    if (!this.remoteStore) return;
    const outbox = this.outboxLoad();
    const entry = outbox[key];
    if (!entry) return;
    try {
      if (entry.op === 'clear') {
        await this.remoteStore.clear(key);
      } else {
        await this.remoteStore.save(key, entry.patch || {});
      }
      delete outbox[key];
      this.outboxSave(outbox);
    } catch {
      // keep outbox for future flush
    }
  }

  private pickLatest(
    local: PersistedSignerProfile | null,
    remote: PersistedSignerProfile | null
  ): PersistedSignerProfile | null {
    if (local && remote) {
      return (remote.updatedAt || 0) >= (local.updatedAt || 0) ? remote : local;
    }
    return remote || local;
  }

  async load(key: string): Promise<PersistedSignerProfile | null> {
    if (this.mode === 'remote_only') {
      if (!this.remoteStore) {
        return null;
      }
      const queued = this.getOutboxEntry(key);
      if (queued) {
        await this.flushOutboxForKey(key);
        if (this.getOutboxEntry(key)?.op === 'clear') {
          return null;
        }
      }
      return this.remoteStore.load(key);
    }

    if (this.mode === 'hybrid' && this.remoteStore) {
      const queued = this.getOutboxEntry(key);
      if (queued?.op === 'clear') {
        await this.flushOutboxForKey(key);
        return this.localStore.load(key);
      }
      const [local, remote] = await Promise.all([
        this.localStore.load(key),
        this.remoteStore.load(key).catch(() => null),
      ]);
      const merged = this.pickLatest(local, remote);
      if (merged) {
        await this.localStore.save(key, merged);
      }
      await this.flushOutboxForKey(key);
      return merged;
    }

    return this.localStore.load(key);
  }

  async save(key: string, patch: Partial<PersistedSignerProfile>): Promise<PersistedSignerProfile> {
    if (this.mode === 'remote_only') {
      if (!this.remoteStore) {
        throw new Error('remote profile store not configured');
      }
      const remote = await this.remoteStore.save(key, patch);
      this.removeOutboxEntry(key);
      return remote;
    }

    const local = await this.localStore.save(key, patch);
    if (this.mode === 'hybrid' && this.remoteStore) {
      try {
        const remote = await this.remoteStore.save(key, patch);
        await this.localStore.save(key, remote);
        this.removeOutboxEntry(key);
        return remote;
      } catch {
        this.queuePatch(key, patch);
      }
    }
    return local;
  }

  async clear(key: string): Promise<void> {
    await this.localStore.clear(key);
    if (this.remoteStore) {
      try {
        await this.remoteStore.clear(key);
      } catch {
        this.queueClear(key);
        throw new Error('remote profile clear failed');
      }
    }
    this.removeOutboxEntry(key);
  }
}

function normalizeSignerReviewConfig(config: SignerReviewConfig): Required<SignerReviewConfig> {
  const profileMode = (config.profile?.mode || 'local_only') as SignerProfileMode;
  const normalizedUIMode = String(config.uiMode || '').trim().toLowerCase();
  const normalizedDefaultTab = String(config.defaultTab || '').trim().toLowerCase();
  const normalizedViewerMode = String(config.viewerMode || '').trim().toLowerCase();
  const normalizedViewerBanner = String(config.viewerBanner || '').trim().toLowerCase();
  return {
    token: String(config.token || '').trim(),
    apiBasePath: String(config.apiBasePath || '/api/v1/esign/signing').trim(),
    signerBasePath: String(config.signerBasePath || '/sign').trim(),
    resourceBasePath: String(config.resourceBasePath || '').trim(),
    reviewApiPath: String(config.reviewApiPath || '').trim(),
    assetContractPath: String(config.assetContractPath || '').trim(),
    telemetryPath: String(config.telemetryPath || '').trim(),
    agreementId: String(config.agreementId || '').trim(),
    sessionKind: String(config.sessionKind || 'signer').trim() || 'signer',
    uiMode: normalizedUIMode || 'sign',
    defaultTab: normalizedDefaultTab || 'sign',
    viewerMode: normalizedViewerMode,
    viewerBanner: normalizedViewerBanner,
    recipientId: String(config.recipientId || '').trim(),
    recipientEmail: String(config.recipientEmail || '').trim(),
    recipientName: String(config.recipientName || '').trim(),
    pageCount: Number(config.pageCount || 1) || 1,
    hasConsented: Boolean(config.hasConsented),
    canSign: config.canSign !== false,
    reviewMarkersVisible: config.reviewMarkersVisible !== false,
    reviewMarkersInteractive: config.reviewMarkersInteractive !== false,
    fields: Array.isArray(config.fields) ? config.fields : [],
    review: normalizeReviewContext(config.review),
    flowMode: (config.flowMode || 'unified') as any,
    telemetryEnabled: config.telemetryEnabled !== false,
    viewer: {
      coordinateSpace: (config.viewer?.coordinateSpace || 'pdf') as any,
      contractVersion: String(config.viewer?.contractVersion || '1.0'),
      unit: (config.viewer?.unit || 'pt') as any,
      origin: (config.viewer?.origin || 'top-left') as any,
      yAxisDirection: (config.viewer?.yAxisDirection || 'down') as any,
      pages: Array.isArray(config.viewer?.pages) ? config.viewer?.pages : [],
      compatibilityTier: String(config.viewer?.compatibilityTier || '').trim().toLowerCase(),
      compatibilityReason: String(config.viewer?.compatibilityReason || '').trim().toLowerCase(),
      compatibilityMessage: String(config.viewer?.compatibilityMessage || '').trim(),
    },
    signerState: (config.signerState || 'active') as any,
    recipientStage: Number(config.recipientStage || 1) || 1,
    activeStage: Number(config.activeStage || 1) || 1,
    activeRecipientIds: Array.isArray(config.activeRecipientIds) ? config.activeRecipientIds : [],
    waitingForRecipientIds: Array.isArray(config.waitingForRecipientIds) ? config.waitingForRecipientIds : [],
    profile: {
      mode: profileMode,
      rememberByDefault: config.profile?.rememberByDefault !== false,
      ttlDays: Number(config.profile?.ttlDays || DEFAULT_PROFILE_TTL_DAYS) || DEFAULT_PROFILE_TTL_DAYS,
      persistDrawnSignature: Boolean(config.profile?.persistDrawnSignature),
      endpointBasePath: String(config.profile?.endpointBasePath || String(config.apiBasePath || '/api/v1/esign/signing')).trim(),
    },
  };
}

function normalizeReviewParticipant(participant) {
  if (!participant || typeof participant !== 'object') return null;
  return {
    id: String(participant.id || '').trim(),
    participant_type: String(participant.participant_type || '').trim(),
    recipient_id: String(participant.recipient_id || '').trim(),
    email: String(participant.email || '').trim(),
    display_name: String(participant.display_name || '').trim(),
    decision_status: String(participant.decision_status || '').trim(),
    effective_decision_status: String(participant.effective_decision_status || participant.decision_status || '').trim(),
    approved_on_behalf: Boolean(participant.approved_on_behalf),
    approved_on_behalf_reason: String(participant.approved_on_behalf_reason || '').trim(),
    approved_on_behalf_by_user_id: String(participant.approved_on_behalf_by_user_id || '').trim(),
    approved_on_behalf_by_display_name: String(participant.approved_on_behalf_by_display_name || '').trim(),
    approved_on_behalf_at: String(participant.approved_on_behalf_at || '').trim(),
  };
}

function normalizeReviewActorInfo(actorKey, actor) {
  if (!actor || typeof actor !== 'object') return null;
  const fallbackKey = String(actorKey || '').trim();
  const fallbackType = fallbackKey.includes(':') ? fallbackKey.split(':', 1)[0] : '';
  const fallbackID = fallbackKey.includes(':') ? fallbackKey.slice(fallbackKey.indexOf(':') + 1) : '';
  return {
    name: String(actor.name || '').trim(),
    email: String(actor.email || '').trim(),
    role: String(actor.role || '').trim(),
    actor_type: String(actor.actor_type || fallbackType).trim(),
    actor_id: String(actor.actor_id || fallbackID).trim(),
  };
}

function normalizeReviewActorMap(actorMap) {
  if (!actorMap || typeof actorMap !== 'object') return {};
  const out = {};
  Object.entries(actorMap).forEach(([key, value]) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey) return;
    const normalizedValue = normalizeReviewActorInfo(normalizedKey, value);
    if (!normalizedValue) return;
    out[normalizedKey] = normalizedValue;
  });
  return out;
}

function readNormalizedRecordValue(record, ...keys) {
  if (!record || typeof record !== 'object') return undefined;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] != null) {
      return record[key];
    }
  }
  return undefined;
}

function readNormalizedRecordString(record, ...keys) {
  const value = readNormalizedRecordValue(record, ...keys);
  if (value == null) return '';
  return String(value).trim();
}

function readNormalizedRecordNumber(record, ...keys) {
  const value = readNormalizedRecordValue(record, ...keys);
  if (value == null || value === '') return 0;
  return Number(value) || 0;
}

function normalizeReviewThread(threadWrapper) {
  if (!threadWrapper || typeof threadWrapper !== 'object') return null;
  const thread = threadWrapper.thread && typeof threadWrapper.thread === 'object' ? threadWrapper.thread : {};
  const messages = Array.isArray(threadWrapper.messages) ? threadWrapper.messages : [];
  return {
    thread: {
      id: readNormalizedRecordString(thread, 'id', 'ID'),
      review_id: readNormalizedRecordString(thread, 'review_id', 'reviewId', 'ReviewID'),
      agreement_id: readNormalizedRecordString(thread, 'agreement_id', 'agreementId', 'AgreementID'),
      visibility: readNormalizedRecordString(thread, 'visibility', 'Visibility') || 'shared',
      anchor_type: readNormalizedRecordString(thread, 'anchor_type', 'anchorType', 'AnchorType') || 'agreement',
      page_number: readNormalizedRecordNumber(thread, 'page_number', 'pageNumber', 'PageNumber'),
      field_id: readNormalizedRecordString(thread, 'field_id', 'fieldId', 'FieldID'),
      anchor_x: readNormalizedRecordNumber(thread, 'anchor_x', 'anchorX', 'AnchorX'),
      anchor_y: readNormalizedRecordNumber(thread, 'anchor_y', 'anchorY', 'AnchorY'),
      status: readNormalizedRecordString(thread, 'status', 'Status') || 'open',
      created_by_type: readNormalizedRecordString(thread, 'created_by_type', 'createdByType', 'CreatedByType'),
      created_by_id: readNormalizedRecordString(thread, 'created_by_id', 'createdByID', 'CreatedByID'),
      resolved_by_type: readNormalizedRecordString(thread, 'resolved_by_type', 'resolvedByType', 'ResolvedByType'),
      resolved_by_id: readNormalizedRecordString(thread, 'resolved_by_id', 'resolvedByID', 'ResolvedByID'),
      resolved_at: readNormalizedRecordString(thread, 'resolved_at', 'resolvedAt', 'ResolvedAt'),
      last_activity_at: readNormalizedRecordString(thread, 'last_activity_at', 'lastActivityAt', 'LastActivityAt'),
    },
    messages: messages
      .filter((message) => message && typeof message === 'object')
      .map((message) => ({
        id: readNormalizedRecordString(message, 'id', 'ID'),
        thread_id: readNormalizedRecordString(message, 'thread_id', 'threadId', 'ThreadID'),
        body: readNormalizedRecordString(message, 'body', 'Body'),
        created_by_type: readNormalizedRecordString(message, 'created_by_type', 'createdByType', 'CreatedByType'),
        created_by_id: readNormalizedRecordString(message, 'created_by_id', 'createdByID', 'CreatedByID'),
        created_at: readNormalizedRecordString(message, 'created_at', 'createdAt', 'CreatedAt'),
      })),
  };
}

function normalizeReviewContext(review) {
  if (!review || typeof review !== 'object') return null;
  const threads = Array.isArray(review.threads)
    ? review.threads.map(normalizeReviewThread).filter(Boolean)
    : [];
  const actorMap = normalizeReviewActorMap(review.actor_map || review.actorMap);
  const blockers = Array.isArray(review.blockers)
    ? review.blockers.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  return {
    review_id: String(review.review_id || '').trim(),
    status: String(review.status || '').trim(),
    gate: String(review.gate || '').trim(),
    comments_enabled: Boolean(review.comments_enabled),
    override_active: Boolean(review.override_active),
    override_reason: String(review.override_reason || '').trim(),
    override_by_user_id: String(review.override_by_user_id || '').trim(),
    override_by_display_name: String(review.override_by_display_name || '').trim(),
    override_at: String(review.override_at || '').trim(),
    is_reviewer: Boolean(review.is_reviewer),
    can_comment: Boolean(review.can_comment),
    can_approve: Boolean(review.can_approve),
    can_request_changes: Boolean(review.can_request_changes),
    can_sign: review.can_sign !== false,
    participant_status: String(review.participant_status || '').trim(),
    approved_count: Number(review.approved_count || 0) || 0,
    total_approvers: Number(review.total_approvers || 0) || 0,
    sign_blocked: Boolean(review.sign_blocked),
    sign_block_reason: String(review.sign_block_reason || '').trim(),
    blockers,
    participant: normalizeReviewParticipant(review.participant),
    actor_map: actorMap,
    open_thread_count: Number(review.open_thread_count || 0) || 0,
    resolved_thread_count: Number(review.resolved_thread_count || 0) || 0,
    threads,
  };
}

function reviewAnchorLabel(thread) {
  const anchorType = String(thread?.thread?.anchor_type || '').trim();
  switch (anchorType) {
    case 'field':
      return thread?.thread?.field_id
        ? `Field ${thread.thread.field_id}`
        : 'Field';
    case 'page':
      return thread?.thread?.page_number
        ? `Page ${thread.thread.page_number}`
        : 'Page';
    default:
      return 'Global Comment';
  }
}

function reviewThreadHasMarker(thread) {
  const anchorType = String(thread?.thread?.anchor_type || '').trim();
  return anchorType === 'page' || anchorType === 'field';
}

function reviewStatusLabel(status) {
  const normalized = normalizeReviewStatus(status);
  switch (normalized) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'changes_requested':
      return 'Changes Requested';
    case 'in_review':
      return 'In Review';
    case 'closed':
      return 'Closed';
    default:
      return normalized ? normalized.replace(/_/g, ' ') : 'Inactive';
  }
}

function normalizeReviewStatus(status) {
  return String(status || '').trim().toLowerCase();
}

function reviewParticipantDecisionStatus(review) {
  return normalizeReviewStatus(review?.participant_status || review?.participant?.effective_decision_status || review?.participant?.decision_status);
}

function reviewParticipantDecisionResolved(review) {
  const decisionStatus = reviewParticipantDecisionStatus(review);
  return decisionStatus === 'approved' || decisionStatus === 'changes_requested';
}

function reviewDecisionActionsVisible(review) {
  if (!review) return false;
  if (review.override_active) return false;
  if (!review.can_approve && !review.can_request_changes) return false;
  return !reviewParticipantDecisionResolved(review);
}

function reviewPanelSubtitle(review) {
  if (!review || typeof review !== 'object') {
    return 'Track review status, comments, and decision actions.';
  }
  const reviewStatus = normalizeReviewStatus(review.status);
  const decisionStatus = reviewParticipantDecisionStatus(review);
  const approvedCount = Number(review.approved_count || 0) || 0;
  const totalApprovers = Number(review.total_approvers || 0) || 0;
  if (review.override_active) {
    const reason = String(review.override_reason || '').trim();
    const rawActorName = String(review.override_by_display_name || '').trim();
    // Never show UUID as actor name
    const actorName = (rawActorName && !looksLikeUUID(rawActorName)) ? rawActorName : '';
    return reason
      ? `Review was finalized by admin override${actorName ? ` by ${actorName}` : ''}. Reason: ${reason}`
      : `Review was finalized by admin override${actorName ? ` by ${actorName}` : ''}.`;
  }
  if (review?.participant?.approved_on_behalf) {
    const rawActorName = String(review.participant.approved_on_behalf_by_display_name || '').trim();
    // Never show UUID as actor name
    const actorName = (rawActorName && !looksLikeUUID(rawActorName)) ? rawActorName : '';
    return actorName
      ? `Your review decision was recorded on your behalf by ${actorName}.`
      : 'Your review decision was recorded on your behalf by an admin.';
  }
  if (decisionStatus === 'approved' && reviewStatus === 'in_review') {
    if (totalApprovers > 0) {
      return `Your approval is recorded. ${approvedCount} of ${totalApprovers} approvers have approved so far.`;
    }
    return 'Your approval is recorded. Waiting for the remaining reviewers before this document can proceed.';
  }
  if (decisionStatus === 'approved' && reviewStatus === 'approved') {
    if (totalApprovers > 0) {
      return `All approvers approved (${approvedCount} of ${totalApprovers}). Review is complete.`;
    }
    return 'All reviewers approved. Review is complete.';
  }
  if (decisionStatus === 'changes_requested') {
    return 'Your change request is recorded. The sender must resolve it before this document can proceed.';
  }
  if (reviewStatus === 'in_review' && totalApprovers > 0) {
    return `${approvedCount} of ${totalApprovers} approvers have approved so far.`;
  }
  return review.gate
    ? `Gate: ${String(review.gate || '').replace(/_/g, ' ')}`
    : 'Track review status, comments, and decision actions.';
}

function toSignerProfileKey(config: Required<SignerReviewConfig>): string {
  const origin = typeof window !== 'undefined' ? window.location.origin.toLowerCase() : 'unknown';
  const principal = config.recipientEmail
    ? config.recipientEmail.trim().toLowerCase()
    : config.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${origin}:${principal}`);
}

function normalizeSignerProfileKeyForTransport(key: string): string {
  const normalized = String(key || '').trim();
  if (!normalized) return '';
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

function initialsFromName(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts.slice(0, 3).map((p) => p[0].toUpperCase()).join('');
}

function isDrawnPlaceholder(value: string): boolean {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized === '[drawn]' || normalized === '[drawn initials]';
}

function sanitizeProfileText(value: string): string {
  const normalized = String(value || '').trim();
  return isDrawnPlaceholder(normalized) ? '' : normalized;
}

function createProfileRepository(config: Required<SignerReviewConfig>): SignerProfileRepository {
  const localStore = new LocalSignerProfileStore(config.profile.ttlDays);
  if (!config.canSign || String(config.sessionKind || '').trim().toLowerCase() === 'reviewer') {
    return new SignerProfileRepository('local_only', localStore, null);
  }
  const remoteStore = new RemoteSignerProfileStore(config.profile.endpointBasePath, config.token);
  if (config.profile.mode === 'local_only') {
    return new SignerProfileRepository('local_only', localStore, null);
  }
  if (config.profile.mode === 'remote_only') {
    return new SignerProfileRepository('remote_only', localStore, remoteStore);
  }
  return new SignerProfileRepository('hybrid', localStore, remoteStore);
}

export function bootstrapSignerReview(config: SignerReviewConfig): void {
  const pageEl = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!pageEl) return;

  const marker = pageEl as HTMLElement;
  if (marker.dataset.esignBootstrapped === 'true') {
    return;
  }
  marker.dataset.esignBootstrapped = 'true';

  const unifiedConfig = normalizeSignerReviewConfig(config);
  const signerProfileKey = toSignerProfileKey(unifiedConfig);
  const signerProfileRepository = createProfileRepository(unifiedConfig);
  // ============================================
  // Client Telemetry Module
  // ============================================
  const telemetry = {
    events: [],
    sessionId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    startTime: Date.now(),
    metrics: {
      viewerLoadTime: null,
      fieldSaveLatencies: [],
      signatureAttachLatencies: [],
      errorsEncountered: [],
      pagesViewed: new Set(),
      fieldsCompleted: 0,
      consentTime: null,
      submitTime: null
    },

    /**
     * Track a telemetry event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    track(eventName, data = {}) {
      if (!unifiedConfig.telemetryEnabled) return;

      const event = {
        event: eventName,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: unifiedConfig.flowMode,
        agreementId: unifiedConfig.agreementId,
        ...data
      };

      this.events.push(event);

      // Send immediately for critical events
      if (this.isCriticalEvent(eventName)) {
        this.flush();
      }
    },

    /**
     * Check if event is critical and should be sent immediately
     * @param {string} eventName - Event name
     * @returns {boolean}
     */
    isCriticalEvent(eventName) {
      const critical = [
        'viewer_load_failed',
        'submit_success',
        'submit_failed',
        'viewer_critical_error',
        'consent_declined'
      ];
      return critical.includes(eventName);
    },

    /**
     * Track viewer load completion
     * @param {boolean} success - Whether load succeeded
     * @param {number} duration - Load duration in ms
     * @param {string} error - Error message if failed
     */
    trackViewerLoad(success, duration, error = null) {
      this.metrics.viewerLoadTime = duration;
      this.track(success ? 'viewer_load_success' : 'viewer_load_failed', {
        duration,
        error,
        pageCount: unifiedConfig.pageCount
      });
    },

    /**
     * Track field save operation
     * @param {string} fieldId - Field ID
     * @param {string} fieldType - Field type
     * @param {boolean} success - Whether save succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackFieldSave(fieldId, fieldType, success, latency, error = null) {
      this.metrics.fieldSaveLatencies.push(latency);
      if (success) {
        this.metrics.fieldsCompleted++;
      } else {
        this.metrics.errorsEncountered.push({ type: 'field_save', fieldId, error });
      }

      this.track(success ? 'field_save_success' : 'field_save_failed', {
        fieldId,
        fieldType,
        latency,
        error
      });
    },

    /**
     * Track signature attachment
     * @param {string} fieldId - Field ID
     * @param {string} signatureType - 'typed' or 'drawn'
     * @param {boolean} success - Whether attach succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackSignatureAttach(fieldId, signatureType, success, latency, error = null) {
      this.metrics.signatureAttachLatencies.push(latency);

      this.track(success ? 'signature_attach_success' : 'signature_attach_failed', {
        fieldId,
        signatureType,
        latency,
        error
      });
    },

    /**
     * Track consent action
     * @param {boolean} accepted - Whether consent was accepted
     */
    trackConsent(accepted) {
      this.metrics.consentTime = Date.now() - this.startTime;
      this.track(accepted ? 'consent_accepted' : 'consent_declined', {
        timeToConsent: this.metrics.consentTime
      });
    },

    /**
     * Track submission
     * @param {boolean} success - Whether submit succeeded
     * @param {string} error - Error message if failed
     */
    trackSubmit(success, error = null) {
      this.metrics.submitTime = Date.now() - this.startTime;

      this.track(success ? 'submit_success' : 'submit_failed', {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: state.fieldState.size,
        error
      });
    },

    /**
     * Track page navigation
     * @param {number} pageNum - Page number viewed
     */
    trackPageView(pageNum) {
      if (!this.metrics.pagesViewed.has(pageNum)) {
        this.metrics.pagesViewed.add(pageNum);
        this.track('page_viewed', {
          pageNum,
          totalPagesViewed: this.metrics.pagesViewed.size
        });
      }
    },

    /**
     * Track viewer critical error
     * @param {string} reason - Reason for error
     */
    trackViewerCriticalError(reason) {
      this.track('viewer_critical_error', {
        reason,
        timeBeforeError: Date.now() - this.startTime,
        pagesViewed: this.metrics.pagesViewed.size,
        fieldsCompleted: this.metrics.fieldsCompleted
      });
    },

    /**
     * Track degraded mode
     * @param {string} degradationType - Type of degradation
     * @param {Object} details - Additional details
     */
    trackDegradedMode(degradationType, details = {}) {
      this.track('degraded_mode', {
        degradationType,
        ...details
      });
    },

    /**
     * Get session summary for debugging
     * @returns {Object}
     */
    getSessionSummary() {
      return {
        sessionId: this.sessionId,
        duration: Date.now() - this.startTime,
        flowMode: unifiedConfig.flowMode,
        viewerLoadTime: this.metrics.viewerLoadTime,
        avgFieldSaveLatency: this.calculateAverage(this.metrics.fieldSaveLatencies),
        avgSignatureAttachLatency: this.calculateAverage(this.metrics.signatureAttachLatencies),
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: state.fieldState?.size || 0,
        pagesViewed: this.metrics.pagesViewed.size,
        errorsCount: this.metrics.errorsEncountered.length,
        consentTime: this.metrics.consentTime,
        submitTime: this.metrics.submitTime
      };
    },

    /**
     * Calculate average of array
     * @param {number[]} arr - Array of numbers
     * @returns {number}
     */
    calculateAverage(arr) {
      if (!arr.length) return 0;
      return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    },

    /**
     * Flush events to backend
     */
    async flush() {
      if (!unifiedConfig.telemetryEnabled || this.events.length === 0) return;
      const telemetryPath = telemetryEndpointPath();
      if (!telemetryPath) {
        this.events = [];
        return;
      }

      const eventsToSend = [...this.events];
      this.events = [];

      try {
        // Use sendBeacon for reliability during page unload
        if (navigator.sendBeacon) {
          const payload = JSON.stringify({
            events: eventsToSend,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(telemetryPath, payload);
        } else {
          // Fallback to fetch
          await fetch(telemetryPath, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: eventsToSend,
              summary: this.getSessionSummary()
            }),
            keepalive: true
          });
        }
      } catch (error) {
        // Re-add events if send failed
        this.events = [...eventsToSend, ...this.events];
        console.warn('Telemetry flush failed:', error);
      }
    }
  };

  // Flush telemetry on page unload
  window.addEventListener('beforeunload', () => {
    telemetry.track('session_end', telemetry.getSessionSummary());
    telemetry.flush();
  });

  // Periodic flush every 30 seconds
  setInterval(() => telemetry.flush(), 30000);

  // ============================================
  // State Management
  // ============================================
  const state = {
    currentPage: 1,
    zoomLevel: 1.0,
    pdfDoc: null,
    pageRendering: false,
    pageNumPending: null,
    pageRenderWaiters: new Map(),
    fieldState: new Map(),
    activeFieldId: null,
    hasConsented: unifiedConfig.hasConsented,
    canSignSession: unifiedConfig.canSign,
    signatureCanvases: new Map(),
    signatureTabByField: new Map(),
    savedSignaturesByType: new Map(),
    pendingSaves: new Set(),
    // Performance state
    renderedPages: new Map(), // Map of page number to rendered canvas
    pageRenderQueue: [],
    maxCachedPages: 5, // Limit memory usage
    isLowMemory: false,
    lastRenderTime: 0,
    renderDebounceMs: 100,
    profileKey: signerProfileKey,
    profileData: null,
    profileRemember: unifiedConfig.profile.rememberByDefault,
    reviewContext: unifiedConfig.review ? normalizeReviewContext(unifiedConfig.review) : null,
    reviewThreadFilter: 'all' as 'all' | 'open' | 'resolved',
    reviewThreadPage: 1,
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: false,
    overlayRenderFrameID: 0,
    reviewAnchorPointDraft: null,
    pickingReviewAnchorPoint: false,
    highlightedReviewThreadID: '',
    highlightedReviewThreadTimer: null,
    inlineComposerVisible: false,
    inlineComposerPosition: { x: 0, y: 0 },
    inlineComposerAnchor: null,
    activePanelTab: String(unifiedConfig.defaultTab || '').trim().toLowerCase() === 'review' ? 'review' as const : 'sign' as const,
  };

  function requestOverlayRender() {
    if (state.overlayRenderFrameID) return;
    state.overlayRenderFrameID = window.requestAnimationFrame(() => {
      state.overlayRenderFrameID = 0;
      renderFieldOverlays();
    });
  }

  function hasRenderedPage(pageNum) {
    const normalizedPageNum = Number(pageNum || 0) || 0;
    const canvas = document.querySelector('#pdf-page-1 canvas');
    return normalizedPageNum > 0
      && Number(state.currentPage || 0) === normalizedPageNum
      && !state.pageRendering
      && canvas instanceof HTMLCanvasElement;
  }

  function settlePageRenderWaiters(pageNum, error = null) {
    const normalizedPageNum = Number(pageNum || 0) || 0;
    if (!normalizedPageNum) return;
    const waiters = state.pageRenderWaiters.get(normalizedPageNum);
    if (!Array.isArray(waiters) || !waiters.length) return;
    state.pageRenderWaiters.delete(normalizedPageNum);
    waiters.forEach((waiter) => {
      if (waiter?.timer) {
        window.clearTimeout(waiter.timer);
      }
      if (error) {
        waiter?.reject?.(error);
        return;
      }
      waiter?.resolve?.();
    });
  }

  function waitForRenderedPage(pageNum, timeoutMs = 4000) {
    const normalizedPageNum = Number(pageNum || 0) || 0;
    if (!normalizedPageNum || hasRenderedPage(normalizedPageNum)) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        const waiters = Array.isArray(state.pageRenderWaiters.get(normalizedPageNum))
          ? state.pageRenderWaiters.get(normalizedPageNum)
          : [];
        const remaining = waiters.filter((waiter) => waiter?.resolve !== resolve);
        if (remaining.length) {
          state.pageRenderWaiters.set(normalizedPageNum, remaining);
        } else {
          state.pageRenderWaiters.delete(normalizedPageNum);
        }
        reject(new Error(`Timed out rendering page ${normalizedPageNum}.`));
      }, timeoutMs);
      const waiters = Array.isArray(state.pageRenderWaiters.get(normalizedPageNum))
        ? state.pageRenderWaiters.get(normalizedPageNum)
        : [];
      waiters.push({ resolve, reject, timer });
      state.pageRenderWaiters.set(normalizedPageNum, waiters);
      if (hasRenderedPage(normalizedPageNum)) {
        settlePageRenderWaiters(normalizedPageNum);
      }
    });
  }

  function clearTransientFieldPreview(fieldId) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;
    delete fieldData.previewValueText;
    delete fieldData.previewValueBool;
    delete fieldData.previewSignatureUrl;
  }

  function clearAllTransientFieldPreviews() {
    state.fieldState.forEach((fieldData) => {
      delete fieldData.previewValueText;
      delete fieldData.previewValueBool;
      delete fieldData.previewSignatureUrl;
    });
  }

  function setTransientFieldTextPreview(fieldId, value) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;
    const normalized = sanitizeProfileText(String(value || ''));
    if (!normalized) {
      delete fieldData.previewValueText;
      return;
    }
    fieldData.previewValueText = normalized;
    delete fieldData.previewValueBool;
    delete fieldData.previewSignatureUrl;
  }

  function setTransientFieldBoolPreview(fieldId, checked) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;
    fieldData.previewValueBool = Boolean(checked);
    delete fieldData.previewValueText;
    delete fieldData.previewSignatureUrl;
  }

  function setTransientFieldSignaturePreview(fieldId, dataUrl) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;
    const normalized = String(dataUrl || '').trim();
    if (!normalized) {
      delete fieldData.previewSignatureUrl;
      return;
    }
    fieldData.previewSignatureUrl = normalized;
    delete fieldData.previewValueText;
    delete fieldData.previewValueBool;
  }

  function hasReviewContext() {
    return Boolean(state.reviewContext && typeof state.reviewContext === 'object');
  }

  function resolvedSessionUIMode(): 'sign' | 'review' | 'sign_and_review' {
    const explicitMode = String(unifiedConfig.uiMode || '').trim().toLowerCase();
    if (explicitMode === 'sign' || explicitMode === 'review' || explicitMode === 'sign_and_review') {
      return explicitMode;
    }
    if (String(unifiedConfig.sessionKind || '').trim().toLowerCase() === 'reviewer') {
      return 'review';
    }
    if (hasReviewContext()) {
      return 'sign_and_review';
    }
    return 'sign';
  }

  function resolvedDefaultPanelTab(): 'sign' | 'review' {
    const explicitTab = String(unifiedConfig.defaultTab || '').trim().toLowerCase();
    if (explicitTab === 'sign' || explicitTab === 'review') {
      if (resolvedSessionUIMode() === 'review' && explicitTab === 'sign') return 'review';
      if (resolvedSessionUIMode() === 'sign' && explicitTab === 'review') return 'sign';
      return explicitTab;
    }
    return resolvedSessionUIMode() === 'review' ? 'review' : 'sign';
  }

  function isReviewOnlySession() {
    return resolvedSessionUIMode() === 'review';
  }

  function isCombinedSignerReviewSession() {
    return resolvedSessionUIMode() === 'sign_and_review';
  }

  function activePanelTab(): 'sign' | 'review' {
    if (isReviewOnlySession()) return 'review';
    if (!isCombinedSignerReviewSession()) return 'sign';
    return state.activePanelTab === 'review' ? 'review' : 'sign';
  }

  function signTabVisible() {
    return !isReviewOnlySession() && activePanelTab() === 'sign';
  }

  function reviewTabVisible() {
    return hasReviewContext() && (isReviewOnlySession() || activePanelTab() === 'review');
  }

  function reviewMarkersVisible() {
    if (!hasReviewContext() || !unifiedConfig.reviewMarkersVisible) return false;
    return reviewTabVisible();
  }

  function reviewMarkersInteractive() {
    if (!reviewMarkersVisible() || !unifiedConfig.reviewMarkersInteractive) return false;
    return reviewInteractionsEnabled();
  }

  function reviewInteractionsEnabled() {
    return hasReviewContext() &&
      state.reviewContext?.comments_enabled &&
      state.reviewContext?.can_comment &&
      reviewTabVisible();
  }

  function isSenderSession() {
    return String(unifiedConfig.sessionKind || '').trim().toLowerCase() === 'sender';
  }

  function senderViewerMode() {
    const mode = String(unifiedConfig.viewerMode || '').trim().toLowerCase();
    if (mode === 'review' || mode === 'sign' || mode === 'complete' || mode === 'read_only') {
      return mode;
    }
    return 'read_only';
  }

  function senderViewerBanner() {
    const banner = String(unifiedConfig.viewerBanner || '').trim().toLowerCase();
    switch (banner) {
      case 'sender_review':
      case 'sender_progress':
      case 'sender_complete':
      case 'sender_read_only':
        return banner;
      default:
        switch (senderViewerMode()) {
          case 'review':
            return 'sender_review';
          case 'sign':
            return 'sender_progress';
          case 'complete':
            return 'sender_complete';
          default:
            return 'sender_read_only';
        }
    }
  }

  function signingInteractionsEnabled() {
    return !isSenderSession() && !isReviewOnlySession() && signTabVisible();
  }

  function resolvedResourceBasePath() {
    const configured = String(unifiedConfig.resourceBasePath || '').trim();
    if (configured) return configured;
    return `${unifiedConfig.apiBasePath}/session/${encodeURIComponent(unifiedConfig.token)}`;
  }

  function reviewSessionPath() {
    return resolvedResourceBasePath();
  }

  function reviewBasePath() {
    const configured = String(unifiedConfig.reviewApiPath || '').trim();
    if (configured) return configured;
    return `${reviewSessionPath()}/review`;
  }

  function assetsContractPath() {
    const configured = String(unifiedConfig.assetContractPath || '').trim();
    if (configured) return configured;
    const publicToken = String(unifiedConfig.token || '').trim();
    if (!isSenderSession() && publicToken) {
      return `${unifiedConfig.apiBasePath}/assets/${encodeURIComponent(publicToken)}`;
    }
    return `${resolvedResourceBasePath()}/assets`;
  }

  function telemetryEndpointPath() {
    const configured = String(unifiedConfig.telemetryPath || '').trim();
    if (configured) return configured;
    const publicToken = String(unifiedConfig.token || '').trim();
    if (!publicToken) return '';
    return `${unifiedConfig.apiBasePath}/telemetry/${encodeURIComponent(publicToken)}`;
  }

  function resolveBinaryAssetUrl(assets) {
    if (!assets || typeof assets !== 'object') return '';
    return String(
      assets.preview_url ||
      assets.source_url ||
      assets.executed_url ||
      assets.certificate_url ||
      ''
    ).trim();
  }

  function countReviewThreadsByStatus(threads, status) {
    return (Array.isArray(threads) ? threads : []).filter((entry) => String(entry?.thread?.status || '').trim() === status).length;
  }

  function reviewActorKey(actorType, actorID) {
    const normalizedActorType = String(actorType || '').trim();
    const normalizedActorID = String(actorID || '').trim();
    if (!normalizedActorType || !normalizedActorID) return '';
    return `${normalizedActorType}:${normalizedActorID}`;
  }

  function humanizeReviewActorRole(actorType) {
    const normalizedActorType = String(actorType || '').trim();
    if (normalizedActorType === 'user' || normalizedActorType === 'sender') return 'Sender';
    if (normalizedActorType === 'reviewer') return 'Reviewer';
    if (normalizedActorType === 'external') return 'External Reviewer';
    if (normalizedActorType === 'recipient' || normalizedActorType === 'signer') return 'Signer';
    return normalizedActorType ? normalizedActorType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Participant';
  }

  /**
   * Check if a string looks like a UUID (to avoid displaying raw IDs in UI)
   */
  function looksLikeUUID(str) {
    if (!str || typeof str !== 'string') return false;
    const normalized = str.trim();
    // UUID pattern: 8-4-4-4-12 hex chars, or 24-32 hex chars without dashes
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const hexPattern = /^[0-9a-f]{24,32}$/i;
    return uuidPattern.test(normalized) || hexPattern.test(normalized);
  }

  /**
   * Find participant info from review context by ID
   */
  function findParticipantById(actorID) {
    if (!actorID) return null;
    const participant = state.reviewContext?.participant;
    if (!participant) return null;
    const normalizedID = String(actorID).trim();
    const pID = String(participant.id || '').trim();
    const pRecipientID = String(participant.recipient_id || '').trim();
    if (pID === normalizedID || pRecipientID === normalizedID) {
      return participant;
    }
    return null;
  }

  /**
   * Central actor info resolver with proper fallback chain:
   * 1. actor_map[name]
   * 2. actor_map[email]
   * 3. participant display_name/email from context
   * 4. humanized role label
   * 5. "Unknown User"
   *
   * NEVER returns a raw UUID.
   */
  function reviewActorInfo(actorType, actorID) {
    const actorMap = state.reviewContext?.actor_map || {};
    const aliases = [];
    const normalizedActorType = String(actorType || '').trim();
    const normalizedActorID = String(actorID || '').trim();

    // Build alias keys to check in actor_map
    if (normalizedActorType === 'recipient' || normalizedActorType === 'signer') {
      aliases.push(reviewActorKey('recipient', actorID), reviewActorKey('signer', actorID));
    } else if (normalizedActorType === 'user' || normalizedActorType === 'sender') {
      aliases.push(reviewActorKey('user', actorID), reviewActorKey('sender', actorID));
    } else if (normalizedActorType === 'reviewer' || normalizedActorType === 'external') {
      aliases.push(reviewActorKey('reviewer', actorID), reviewActorKey('external', actorID));
    } else {
      aliases.push(reviewActorKey(normalizedActorType, actorID));
    }

    // Step 1 & 2: Check actor_map for name/email
    const found = aliases.map((key) => actorMap[key]).find(Boolean);
    if (found) {
      const actorName = String(found.name || '').trim();
      const actorEmail = String(found.email || '').trim();
      // Ensure we don't return a UUID as the name
      if (actorName && !looksLikeUUID(actorName)) {
        return found;
      }
      if (actorEmail && !looksLikeUUID(actorEmail)) {
        return { ...found, name: actorEmail };
      }
    }

    // Step 3: Check participant info from context
    const participant = findParticipantById(normalizedActorID);
    if (participant) {
      const displayName = String(participant.display_name || '').trim();
      const email = String(participant.email || '').trim();
      if (displayName && !looksLikeUUID(displayName)) {
        return {
          name: displayName,
          email: email,
          role: normalizedActorType,
          actor_type: normalizedActorType,
          actor_id: normalizedActorID,
        };
      }
      if (email && !looksLikeUUID(email)) {
        return {
          name: email,
          email: email,
          role: normalizedActorType,
          actor_type: normalizedActorType,
          actor_id: normalizedActorID,
        };
      }
    }

    // Step 4 & 5: Humanized role or "Unknown User"
    const roleLabel = humanizeReviewActorRole(normalizedActorType);
    return {
      name: roleLabel || 'Unknown User',
      email: '',
      role: normalizedActorType,
      actor_type: normalizedActorType,
      actor_id: normalizedActorID,
    };
  }

  function actorNameFromMessage(message) {
    const actor = reviewActorInfo(message?.created_by_type, message?.created_by_id);
    return String(actor?.name || actor?.email || humanizeReviewActorRole(message?.created_by_type)).trim() || 'Participant';
  }

  function actorRoleFromMessage(message) {
    const actor = reviewActorInfo(message?.created_by_type, message?.created_by_id);
    return String(actor?.role || actor?.actor_type || message?.created_by_type || '').trim() || 'participant';
  }

  function initialsFromName(name, fallback = 'P') {
    const normalized = String(name || '').trim();
    if (!normalized) return String(fallback || 'P').trim().slice(0, 2).toUpperCase() || 'P';
    const letters = normalized
      .split(/\s+/)
      .map((part) => part[0] || '')
      .join('')
      .replace(/[^a-z0-9]/ig, '')
      .toUpperCase();
    if (letters) return letters.slice(0, 2);
    return normalized.replace(/[^a-z0-9]/ig, '').slice(0, 2).toUpperCase() || String(fallback || 'P').trim().slice(0, 2).toUpperCase() || 'P';
  }

  function reviewActorPresentation(actorType, actorID) {
    const actor = reviewActorInfo(actorType, actorID);
    const resolvedActorType = String(actor?.actor_type || actorType || '').trim();
    let color = '#64748b';
    if (resolvedActorType === 'user' || resolvedActorType === 'sender') color = '#2563eb';
    if (resolvedActorType === 'reviewer' || resolvedActorType === 'external') color = '#7c3aed';
    if (resolvedActorType === 'recipient' || resolvedActorType === 'signer') color = '#059669';

    // Build display name - never show UUID
    const displayName = String(actor?.name || actor?.email || humanizeReviewActorRole(resolvedActorType)).trim() || 'Participant';

    // Build initials - avoid UUID-based initials
    const initialsSource = (actor?.name && !looksLikeUUID(actor.name)) ? actor.name
      : (actor?.email && !looksLikeUUID(actor.email)) ? actor.email
      : humanizeReviewActorRole(resolvedActorType);

    return {
      actor,
      name: displayName,
      role: humanizeReviewActorRole(actor?.role || resolvedActorType),
      initials: initialsFromName(initialsSource, humanizeReviewActorRole(resolvedActorType)),
      color,
    };
  }

  function reviewParticipantLabel(participant) {
    if (!participant) return '';
    // Prefer display_name, then email, then role label - never show raw UUID
    const displayName = String(participant.display_name || '').trim();
    const email = String(participant.email || '').trim();
    if (displayName && !looksLikeUUID(displayName)) return displayName;
    if (email && !looksLikeUUID(email)) return email;
    // Fallback to humanized participant type or generic label
    const participantType = String(participant.participant_type || '').trim();
    return participantType ? humanizeReviewActorRole(participantType) : 'Participant';
  }

  function formatReviewTimestamp(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleString();
  }

  function syncReviewContext(reviewContext) {
    state.reviewContext = normalizeReviewContext(reviewContext);
    if (state.reviewContext) {
      if (!Array.isArray(state.reviewContext.threads)) {
        state.reviewContext.threads = [];
      }
      state.reviewContext.open_thread_count = countReviewThreadsByStatus(state.reviewContext.threads, 'open');
      state.reviewContext.resolved_thread_count = countReviewThreadsByStatus(state.reviewContext.threads, 'resolved');
    }
    if (isReviewOnlySession()) {
      state.activePanelTab = 'review';
    } else if (!hasReviewContext()) {
      state.activePanelTab = 'sign';
    } else if (!isCombinedSignerReviewSession()) {
      state.activePanelTab = resolvedDefaultPanelTab();
    }
    renderReviewPanel();
    requestOverlayRender();
    updateSessionChrome();
    updateSubmitButton();
  }

  async function reloadReviewSessionContext() {
    const response = await fetch(reviewSessionPath(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) {
      throw await parseAPIErrorResponse(response, 'Failed to reload review session');
    }
    const payload = await response.json();
    const session = payload?.session && typeof payload.session === 'object' ? payload.session : {};
    state.canSignSession = session.can_sign !== false;
    syncReviewContext(session.review || null);
    return session;
  }

  async function reviewAPIRequest(pathSuffix, options = {}, fallbackMessage = 'Review request failed') {
    const response = await fetch(`${reviewBasePath()}${pathSuffix}`, {
      credentials: 'same-origin',
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      throw await parseAPIErrorResponse(response, fallbackMessage);
    }
    return response.json().catch(() => ({}));
  }

  function currentReviewAnchorType() {
    const anchorSelect = document.getElementById('review-thread-anchor');
    return String(anchorSelect?.value || 'agreement').trim() || 'agreement';
  }

  function clearHighlightedReviewThread() {
    state.highlightedReviewThreadID = '';
    if (state.highlightedReviewThreadTimer) {
      window.clearTimeout(state.highlightedReviewThreadTimer);
      state.highlightedReviewThreadTimer = null;
    }
  }

  function highlightReviewThread(threadID) {
    clearHighlightedReviewThread();
    state.highlightedReviewThreadID = String(threadID || '').trim();
    if (!state.highlightedReviewThreadID) return;
    state.highlightedReviewThreadTimer = window.setTimeout(() => {
      clearHighlightedReviewThread();
      syncHighlightedReviewThreadUI();
      requestOverlayRender();
    }, 2400);
    syncHighlightedReviewThreadUI();
    requestOverlayRender();
  }

  function setReviewAnchorPointDraft(point) {
    if (!point || typeof point !== 'object') {
      state.reviewAnchorPointDraft = null;
      updateReviewAnchorPointUI();
      requestOverlayRender();
      return;
    }
    state.reviewAnchorPointDraft = {
      page_number: Number(point.page_number || state.currentPage || 1) || 1,
      anchor_x: Math.round((Number(point.anchor_x || 0) || 0) * 100) / 100,
      anchor_y: Math.round((Number(point.anchor_y || 0) || 0) * 100) / 100,
    };
    updateReviewAnchorPointUI();
    requestOverlayRender();
  }

  function setReviewAnchorPicking(active) {
    state.pickingReviewAnchorPoint = Boolean(active) && currentReviewAnchorType() === 'page';
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer?.classList.toggle('review-anchor-picking', state.pickingReviewAnchorPoint);
    if (!state.pickingReviewAnchorPoint) {
      announceToScreenReader('Comment pin placement cancelled.');
      hideInlineComposer();
    } else {
      announceToScreenReader('Click on the document page to add a comment.');
    }
    updateReviewAnchorPointUI();
  }

  function showInlineComposer(x, y, anchorPoint) {
    if (!hasReviewContext() || !state.reviewContext?.comments_enabled || !state.reviewContext?.can_comment) {
      return;
    }

    state.inlineComposerPosition = { x, y };
    state.inlineComposerAnchor = anchorPoint;
    state.inlineComposerVisible = true;

    let composer = document.getElementById('inline-comment-composer');
    if (!composer) {
      composer = createInlineComposerElement();
      document.body.appendChild(composer);
    }

    // Position the composer near the click, but adjust to stay on screen
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const composerWidth = 320;
    const composerHeight = 200;
    const padding = 16;

    let left = x + 20;
    let top = y - composerHeight / 2;

    // Keep within viewport bounds
    if (left + composerWidth > viewportWidth - padding) {
      left = x - composerWidth - 20;
    }
    if (left < padding) {
      left = padding;
    }
    if (top < padding) {
      top = padding;
    }
    if (top + composerHeight > viewportHeight - padding) {
      top = viewportHeight - composerHeight - padding;
    }

    composer.style.left = `${left}px`;
    composer.style.top = `${top}px`;
    composer.classList.remove('hidden');

    // Focus the textarea
    const textarea = composer.querySelector('textarea');
    if (textarea) {
      setTimeout(() => textarea.focus(), 100);
    }

    announceToScreenReader('Comment composer opened. Type your comment and press submit.');
  }

  function hideInlineComposer() {
    state.inlineComposerVisible = false;
    state.inlineComposerAnchor = null;
    const composer = document.getElementById('inline-comment-composer');
    if (composer) {
      composer.classList.add('hidden');
      const textarea = composer.querySelector('textarea');
      if (textarea) {
        textarea.value = '';
      }
    }
  }

  function createInlineComposerElement() {
    const composer = document.createElement('div');
    composer.id = 'inline-comment-composer';
    composer.className = 'inline-comment-composer hidden';
    composer.innerHTML = `
      <div class="inline-composer-header">
        <span class="inline-composer-title">Add Comment</span>
        <button type="button" class="inline-composer-close" aria-label="Close">
          <i class="iconoir-xmark"></i>
        </button>
      </div>
      <div class="inline-composer-body">
        <textarea id="inline-comment-body" rows="3" placeholder="Write your comment..." class="inline-composer-textarea"></textarea>
      </div>
      <div class="inline-composer-footer">
        <button type="button" class="inline-composer-cancel" data-esign-action="cancel-inline-comment">Cancel</button>
        <button type="button" class="inline-composer-submit" data-esign-action="submit-inline-comment">Comment</button>
      </div>
    `;

    // Close button handler
    const closeBtn = composer.querySelector('.inline-composer-close');
    closeBtn?.addEventListener('click', () => hideInlineComposer());

    return composer;
  }

  async function handleSubmitInlineComment() {
    if (!state.inlineComposerAnchor) return;

    const textarea = document.getElementById('inline-comment-body');
    const body = String(textarea?.value || '').trim();
    if (!body) {
      announceToScreenReader('Enter a comment before submitting.', 'assertive');
      return;
    }

    const payload = {
      thread: {
        review_id: state.reviewContext.review_id,
        visibility: 'shared',
        body,
        anchor_type: 'page',
        page_number: state.inlineComposerAnchor.page_number,
        anchor_x: state.inlineComposerAnchor.anchor_x,
        anchor_y: state.inlineComposerAnchor.anchor_y,
      },
    };

    try {
      await reviewAPIRequest('/threads', {
        method: 'POST',
        body: JSON.stringify(payload),
      }, 'Failed to create review comment');

      hideInlineComposer();
      state.pickingReviewAnchorPoint = false;
      document.getElementById('pdf-container')?.classList.remove('review-anchor-picking');

      await reloadReviewSessionContext();
      announceToScreenReader('Comment added successfully.');
    } catch (error) {
      console.error('Failed to submit inline comment:', error);
      if (window.toastManager) {
        window.toastManager.error('Failed to add comment');
      }
    }
  }

  function updateReviewAnchorPointUI() {
    const controls = document.getElementById('review-anchor-point-controls');
    const status = document.getElementById('review-anchor-point-status');
    const pickBtn = document.querySelector('[data-esign-action="pick-review-anchor-point"]');
    const clearBtn = document.querySelector('[data-esign-action="clear-review-anchor-point"]');
    const isPageAnchor = currentReviewAnchorType() === 'page';
    controls?.classList.toggle('hidden', !isPageAnchor);
    if (pickBtn instanceof HTMLButtonElement) {
      pickBtn.disabled = !hasReviewContext() || !Boolean(state.reviewContext?.comments_enabled && state.reviewContext?.can_comment);
      pickBtn.textContent = state.pickingReviewAnchorPoint ? 'Picking...' : (state.reviewAnchorPointDraft ? 'Repin location' : 'Pick location');
    }
    if (clearBtn instanceof HTMLButtonElement) {
      clearBtn.disabled = !state.reviewAnchorPointDraft;
    }
    if (!status) return;
    if (!isPageAnchor) {
      status.textContent = 'Attach this thread to a specific point on the current page.';
      return;
    }
    if (state.reviewAnchorPointDraft && Number(state.reviewAnchorPointDraft.page_number || 0) === Number(state.currentPage || 0)) {
      status.textContent = `Pinned on page ${state.reviewAnchorPointDraft.page_number} at x ${state.reviewAnchorPointDraft.anchor_x}, y ${state.reviewAnchorPointDraft.anchor_y}.`;
      return;
    }
    if (state.reviewAnchorPointDraft) {
      status.textContent = `Pinned on page ${state.reviewAnchorPointDraft.page_number}. Switch back to that page to adjust it.`;
      return;
    }
    status.textContent = state.pickingReviewAnchorPoint
      ? 'Click on the document page to pin this comment.'
      : 'Attach this thread to a specific point on the current page.';
  }

  function updateReviewProgressIndicator() {
    const indicator = document.getElementById('review-progress-indicator');
    if (!indicator) return;

    if (!hasReviewContext()) {
      indicator.classList.add('hidden');
      return;
    }

    const review = state.reviewContext;
    const status = normalizeReviewStatus(review.status);
    const participantStatus = reviewParticipantDecisionStatus(review);
    indicator.classList.remove('hidden');

    // Get step elements
    const stepDraft = document.getElementById('review-step-draft');
    const stepSent = document.getElementById('review-step-sent');
    const stepReview = document.getElementById('review-step-review');
    const stepDecision = document.getElementById('review-step-decision');
    const lines = indicator.querySelectorAll('.review-progress-line');

    // Reset all steps
    [stepDraft, stepSent, stepReview, stepDecision].forEach((step) => {
      step?.classList.remove('completed', 'active', 'changes-requested');
    });
    lines.forEach((line) => {
      line.classList.remove('completed', 'active');
    });

    // Determine current step based on review status
    // Status values: pending, in_review, approved, changes_requested
    if (status === 'approved') {
      // All steps completed
      stepDraft?.classList.add('completed');
      stepSent?.classList.add('completed');
      stepReview?.classList.add('completed');
      stepDecision?.classList.add('completed');
      lines.forEach((line) => line.classList.add('completed'));
      // Update decision icon to checkmark
      const decisionIcon = stepDecision?.querySelector('i');
      if (decisionIcon) {
        decisionIcon.className = 'iconoir-check-circle text-xs';
      }
    } else if (status === 'changes_requested') {
      // All steps completed but with changes requested state
      stepDraft?.classList.add('completed');
      stepSent?.classList.add('completed');
      stepReview?.classList.add('completed');
      stepDecision?.classList.add('changes-requested');
      lines.forEach((line) => line.classList.add('completed'));
      // Update decision icon to warning
      const decisionIcon = stepDecision?.querySelector('i');
      if (decisionIcon) {
        decisionIcon.className = 'iconoir-warning-circle text-xs';
      }
    } else if (participantStatus === 'approved' && status === 'in_review') {
      // This reviewer has finished their decision, but other reviewers are still pending.
      stepDraft?.classList.add('completed');
      stepSent?.classList.add('completed');
      stepReview?.classList.add('completed');
      stepDecision?.classList.add('active');
      lines.forEach((line) => line.classList.add('completed'));
      const decisionIcon = stepDecision?.querySelector('i');
      if (decisionIcon) {
        decisionIcon.className = 'iconoir-check-circle text-xs';
      }
    } else if (status === 'in_review' || status === 'pending') {
      // Draft and sent completed, review is active
      stepDraft?.classList.add('completed');
      stepSent?.classList.add('completed');
      stepReview?.classList.add('active');
      if (lines[0]) lines[0].classList.add('completed');
      if (lines[1]) lines[1].classList.add('completed');
      if (lines[2]) lines[2].classList.add('active');
      // Reset decision icon
      const decisionIcon = stepDecision?.querySelector('i');
      if (decisionIcon) {
        decisionIcon.className = 'iconoir-check-circle text-xs';
      }
    } else {
      // Default: draft is active (fallback for unknown states)
      stepDraft?.classList.add('active');
      // Reset decision icon
      const decisionIcon = stepDecision?.querySelector('i');
      if (decisionIcon) {
        decisionIcon.className = 'iconoir-check-circle text-xs';
      }
    }
  }

  function reviewThreadAnchorPayload() {
    const anchorType = currentReviewAnchorType();
    if (anchorType === 'field' && state.activeFieldId) {
      const field = state.fieldState.get(state.activeFieldId);
      return {
        anchor_type: 'field',
        field_id: String(state.activeFieldId || '').trim(),
        page_number: Number(field?.page || state.currentPage || 1) || 1,
      };
    }
    if (anchorType === 'page') {
      const pageNumber = state.reviewAnchorPointDraft
        ? Number(state.reviewAnchorPointDraft.page_number || state.currentPage || 1) || 1
        : Number(state.currentPage || 1) || 1;
      const payload = {
        anchor_type: 'page',
        page_number: pageNumber,
      };
      if (state.reviewAnchorPointDraft && Number(state.reviewAnchorPointDraft.page_number || 0) === pageNumber) {
        payload.anchor_x = Number(state.reviewAnchorPointDraft.anchor_x || 0) || 0;
        payload.anchor_y = Number(state.reviewAnchorPointDraft.anchor_y || 0) || 0;
      }
      return payload;
    }
    return { anchor_type: 'agreement' };
  }

  function renderReviewPanel() {
    const reviewPanel = document.getElementById('review-panel');
    const reviewBanner = document.getElementById('review-banner');
    const reviewStatusChip = document.getElementById('review-status-chip');
    const reviewSubtitle = document.getElementById('review-panel-subtitle');
    const reviewParticipantSummary = document.getElementById('review-participant-summary');
    const reviewDecisionActions = document.getElementById('review-decision-actions');
    const reviewThreadSummary = document.getElementById('review-thread-summary');
    const reviewThreadComposer = document.getElementById('review-thread-composer');
    const reviewThreadList = document.getElementById('review-thread-list');
    const reviewThreadComposerHint = document.getElementById('review-thread-composer-hint');
    if (!reviewPanel || !reviewThreadList) return;

    if (!hasReviewContext()) {
      reviewPanel.classList.add('hidden');
      reviewBanner?.classList.add('hidden');
      updateReviewAnchorPointUI();
      updateReviewProgressIndicator();
      return;
    }

    const review = state.reviewContext;
    const statusLabel = reviewStatusLabel(review.status);
    const participantStatus = reviewParticipantDecisionStatus(review);

    // In combined mode, only show review panel when review tab is active
    if (!reviewTabVisible()) {
      reviewPanel.classList.add('hidden');
      reviewBanner?.classList.add('hidden');
      updateReviewProgressIndicator();
      return;
    }
    reviewPanel.classList.remove('hidden');
    updateReviewProgressIndicator();
    if (reviewStatusChip) {
      reviewStatusChip.textContent = statusLabel;
      reviewStatusChip.className = 'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' + (
        review.status === 'approved'
          ? 'bg-emerald-100 text-emerald-700'
          : review.status === 'changes_requested'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-slate-100 text-slate-700'
      );
    }
    if (reviewSubtitle) {
      reviewSubtitle.textContent = reviewPanelSubtitle(review);
    }
    if (reviewParticipantSummary) {
      const participantName = reviewParticipantLabel(review.participant);
      if (participantName || participantStatus) {
        reviewParticipantSummary.classList.remove('hidden');
        reviewParticipantSummary.className = 'rounded-lg border px-3 py-2 text-xs';
        if (participantStatus === 'approved') {
          reviewParticipantSummary.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-800');
        } else if (participantStatus === 'changes_requested') {
          reviewParticipantSummary.classList.add('border-amber-200', 'bg-amber-50', 'text-amber-800');
        } else {
          reviewParticipantSummary.classList.add('border-slate-200', 'bg-slate-50', 'text-slate-700');
        }
        const rawOnBehalfActor = String(review.participant?.approved_on_behalf_by_display_name || '').trim();
        // Never show UUID as actor name
        const onBehalfActor = (rawOnBehalfActor && !looksLikeUUID(rawOnBehalfActor)) ? rawOnBehalfActor : '';
        const onBehalfLabel = review.participant?.approved_on_behalf
          ? ` • approved on behalf${onBehalfActor ? ` by ${onBehalfActor}` : ''}`
          : '';
        reviewParticipantSummary.textContent = participantName
          ? `${participantName} • decision ${reviewStatusLabel(participantStatus || 'pending')}${onBehalfLabel}`
          : `Decision ${reviewStatusLabel(participantStatus || 'pending')}${onBehalfLabel}`;
      } else {
        reviewParticipantSummary.classList.add('hidden');
      }
    }
    if (reviewDecisionActions) {
      reviewDecisionActions.classList.toggle('hidden', !reviewDecisionActionsVisible(review));
    }
    if (reviewThreadSummary) {
      reviewThreadSummary.classList.remove('hidden');
      const summaryParts = [];
      if ((Number(review.total_approvers || 0) || 0) > 0) {
        summaryParts.push(`${review.approved_count || 0} of ${review.total_approvers || 0} approvers approved`);
      }
      summaryParts.push(`${review.open_thread_count || 0} open`);
      summaryParts.push(`${review.resolved_thread_count || 0} resolved`);
      reviewThreadSummary.textContent = summaryParts.join(' • ');
    }
    if (reviewThreadComposer) {
      const canComment = review.comments_enabled && review.can_comment && !review.override_active;
      reviewThreadComposer.classList.toggle('hidden', !canComment);
      if (reviewThreadComposerHint) {
        const anchorType = currentReviewAnchorType();
        if (anchorType === 'field' && state.activeFieldId) {
          reviewThreadComposerHint.textContent = 'Comment will be anchored to the active field.';
        } else {
          reviewThreadComposerHint.textContent = 'Click Global Comment for agreement-level feedback, or click directly on the document to add a positioned comment.';
        }
      }
    }
    if (reviewBanner) {
      const bannerMessages = [];
      if (review.override_active) {
        const reason = String(review.override_reason || '').trim();
        const rawActorName = String(review.override_by_display_name || '').trim();
        // Never show UUID as actor name
        const actorName = (rawActorName && !looksLikeUUID(rawActorName)) ? rawActorName : '';
        bannerMessages.push(reason
          ? `Review finalized by admin override${actorName ? ` by ${actorName}` : ''}. ${reason}`
          : `Review finalized by admin override${actorName ? ` by ${actorName}` : ''}.`);
      }
      if (review.sign_blocked && review.sign_block_reason) {
        bannerMessages.push(review.sign_block_reason);
      }
      (Array.isArray(review.blockers) ? review.blockers : []).forEach((entry) => {
        const text = String(entry || '').trim();
        if (text && !bannerMessages.includes(text)) bannerMessages.push(text);
      });
      if (!bannerMessages.length) {
        reviewBanner.classList.add('hidden');
      } else {
        reviewBanner.classList.remove('hidden');
        reviewBanner.className = 'mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4';
        reviewBanner.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${escapeHTML(bannerMessages.join(' '))}</p>
            </div>
          </div>
        `;
      }
    }

    updateReviewAnchorChips();
    updateReviewAnchorPointUI();

    const allThreads = Array.isArray(review.threads) ? review.threads : [];
    if (!allThreads.length) {
      reviewThreadList.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }

    // Apply thread filter
    const filterValue = state.reviewThreadFilter || 'all';
    const filteredThreads = allThreads.filter((entry) => {
      const status = String(entry?.thread?.status || '').trim();
      if (filterValue === 'open') return status === 'open';
      if (filterValue === 'resolved') return status === 'resolved';
      return true;
    });

    // Thread pagination
    const threadsPerPage = 5;
    const totalPages = Math.ceil(filteredThreads.length / threadsPerPage);
    const currentThreadPage = Math.min(state.reviewThreadPage || 1, totalPages || 1);
    const startIdx = (currentThreadPage - 1) * threadsPerPage;
    const paginatedThreads = filteredThreads.slice(startIdx, startIdx + threadsPerPage);

    // Render filter tabs if there are threads
    const filterHTML = allThreads.length > 0 ? `
      <div class="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
        <button type="button" data-esign-action="filter-review-threads" data-filter="all" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${filterValue === 'all' ? 'bg-slate-100 text-slate-800' : 'text-gray-500 hover:text-gray-700'}">
          All (${allThreads.length})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="open" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${filterValue === 'open' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}">
          Open (${review.open_thread_count || 0})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="resolved" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${filterValue === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'text-gray-500 hover:text-gray-700'}">
          Resolved (${review.resolved_thread_count || 0})
        </button>
      </div>
    ` : '';

    // Render pagination if needed
    const paginationHTML = totalPages > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${currentThreadPage} of ${totalPages}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${currentThreadPage - 1}" class="px-2 py-1 text-xs font-medium rounded border ${currentThreadPage <= 1 ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}" ${currentThreadPage <= 1 ? 'disabled' : ''}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${currentThreadPage + 1}" class="px-2 py-1 text-xs font-medium rounded border ${currentThreadPage >= totalPages ? 'border-gray-200 text-gray-300 cursor-not-allowed' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}" ${currentThreadPage >= totalPages ? 'disabled' : ''}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : '';

    // Empty state for filtered results
    if (filteredThreads.length === 0) {
      reviewThreadList.innerHTML = `
        ${filterHTML}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${filterValue === 'all' ? '' : filterValue} comments${filterValue !== 'all' ? '. Try a different filter.' : '.'}
        </div>
      `;
      return;
    }

    const threadsHTML = paginatedThreads.map((entry) => {
      const thread = entry.thread || {};
      const messages = Array.isArray(entry.messages) ? entry.messages : [];
      const canComment = review.comments_enabled && review.can_comment;
      const canResolve = canComment && String(thread.status || '').trim() === 'open';
      const canReopen = canComment && String(thread.status || '').trim() === 'resolved';
      const anchorLabel = reviewAnchorLabel(entry);
      const lastActivity = formatReviewTimestamp(thread.last_activity_at || '');
      const replyID = `review-reply-${escapeHTML(String(thread.id || ''))}`;
      const composerID = `review-reply-composer-${escapeHTML(String(thread.id || ''))}`;
      const statusClass = String(thread.status || '').trim() === 'resolved'
        ? 'bg-emerald-50 border-emerald-200'
        : 'bg-white border-gray-200';
      const leadActor = reviewActorPresentation(messages[0]?.created_by_type || thread.created_by_type, messages[0]?.created_by_id || thread.created_by_id);
      let actorBorderClass = 'border-l-slate-300';
      if (leadActor.color === '#2563eb') actorBorderClass = 'border-l-blue-400';
      if (leadActor.color === '#7c3aed') actorBorderClass = 'border-l-purple-400';
      if (leadActor.color === '#059669') actorBorderClass = 'border-l-emerald-400';
      const isHighlighted = String(thread.id || '').trim() === String(state.highlightedReviewThreadID || '').trim();
      const visibility = String(thread.visibility || 'shared').trim();
      const isInternal = visibility === 'internal';
      const visibilityBadge = isInternal
        ? '<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700"><i class="iconoir-lock text-[10px]"></i>Internal</span>'
        : '';
      const canHighlightMarker = reviewThreadHasMarker(entry);
      return `
        <article
          class="rounded-xl border ${statusClass} border-l-4 ${actorBorderClass} p-4 ${isHighlighted ? 'ring-2 ring-blue-200 shadow-sm' : ''} ${canHighlightMarker ? 'cursor-pointer' : ''}"
          data-review-thread-id="${escapeHTML(String(thread.id || ''))}"
          ${canHighlightMarker ? 'data-esign-action="highlight-review-marker"' : ''}
          tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${escapeHTML(String(thread.id || ''))}" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${escapeHTML(anchorLabel)}</button>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${String(thread.status || '').trim() === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">${escapeHTML(reviewStatusLabel(thread.status || 'open'))}</span>
                ${visibilityBadge}
              </div>
              ${lastActivity ? `<p class="mt-2 text-xs text-gray-500">Last activity ${escapeHTML(lastActivity)}</p>` : ''}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${messages.map((message) => {
              const actor = reviewActorPresentation(message.created_by_type, message.created_by_id);
              let msgActorClass = 'bg-slate-50';
              if (actor.color === '#2563eb') msgActorClass = 'bg-blue-50 border-l-2 border-l-blue-300';
              if (actor.color === '#7c3aed') msgActorClass = 'bg-purple-50 border-l-2 border-l-purple-300';
              if (actor.color === '#059669') msgActorClass = 'bg-emerald-50 border-l-2 border-l-emerald-300';
              return `
              <div class="rounded-lg ${msgActorClass} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700">${escapeHTML(actor.name)}</p>
                    <p class="text-[10px] uppercase tracking-wide text-slate-500">${escapeHTML(actor.role)}</p>
                  </div>
                  <p class="text-[11px] text-slate-500">${escapeHTML(formatReviewTimestamp(message.created_at || ''))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${escapeHTML(String(message.body || ''))}</p>
              </div>
            `;}).join('')}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${canResolve ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${escapeHTML(String(thread.id || ''))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ''}
            ${canReopen ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${escapeHTML(String(thread.id || ''))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ''}
            ${canComment ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${escapeHTML(String(thread.id || ''))}" data-composer-id="${composerID}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ''}
          </div>
          ${canComment ? `
            <div id="${composerID}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${escapeHTML(String(thread.id || ''))}">
              <textarea id="${replyID}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${composerID}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${escapeHTML(String(thread.id || ''))}" data-reply-input-id="${replyID}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');

    reviewThreadList.innerHTML = filterHTML + threadsHTML + paginationHTML;
  }

  function reviewThreadsForFilter(filter) {
    const threads = Array.isArray(state.reviewContext?.threads) ? state.reviewContext.threads : [];
    if (filter === 'open') {
      return threads.filter((entry) => String(entry?.thread?.status || '').trim() === 'open');
    }
    if (filter === 'resolved') {
      return threads.filter((entry) => String(entry?.thread?.status || '').trim() === 'resolved');
    }
    return threads;
  }

  function updateReviewAnchorChips() {
    const pageLabel = document.getElementById('review-anchor-page-label');
    const fieldChip = document.getElementById('review-anchor-field-chip');
    const fieldLabel = document.getElementById('review-anchor-field-label');
    const anchorInput = document.getElementById('review-thread-anchor');

    // Update page label with current page
    if (pageLabel) {
      pageLabel.textContent = `Page ${state.currentPage || 1}`;
    }

    // Update field chip based on active field
    if (fieldChip && fieldLabel) {
      if (state.activeFieldId) {
        const field = state.fieldState.get(state.activeFieldId);
        const fieldType = field?.type || 'field';
        const fieldTypeLabel = fieldType.charAt(0).toUpperCase() + fieldType.slice(1).replace(/_/g, ' ');
        fieldLabel.textContent = fieldTypeLabel;
        fieldChip.disabled = false;
        fieldChip.classList.remove('hidden', 'text-gray-400', 'cursor-not-allowed');
        fieldChip.classList.add('text-gray-600');
      } else {
        fieldLabel.textContent = 'Select a field';
        fieldChip.disabled = true;
        fieldChip.classList.add('hidden', 'text-gray-400', 'cursor-not-allowed');
        fieldChip.classList.remove('text-gray-600');
        // If field was selected but no longer active, reset to global comment
        if (anchorInput && anchorInput.value === 'field') {
          selectReviewAnchorChip('agreement');
        }
      }
    }

    updateReviewAnchorPointUI();
  }

  function selectReviewAnchorChip(anchorType) {
    const anchorInput = document.getElementById('review-thread-anchor');
    const chips = document.querySelectorAll('.review-anchor-chip');
    const hint = document.getElementById('review-thread-composer-hint');

    if (anchorInput) {
      anchorInput.value = anchorType;
    }

    chips.forEach((chip) => {
      const chipType = chip.getAttribute('data-anchor-type');
      if (chipType === anchorType) {
        chip.classList.add('active', 'border-blue-300', 'bg-blue-50', 'text-blue-700');
        chip.classList.remove('border-gray-200', 'bg-white', 'text-gray-600');
      } else {
        chip.classList.remove('active', 'border-blue-300', 'bg-blue-50', 'text-blue-700');
        chip.classList.add('border-gray-200', 'bg-white', 'text-gray-600');
      }
    });

    // Update hint text immediately based on selected anchor type
    if (hint) {
      if (anchorType === 'field' && state.activeFieldId) {
        hint.textContent = 'Comment will be anchored to the active field.';
      } else {
        hint.textContent = 'Global comment on the agreement. Click directly on the document to place a positioned comment.';
      }
    }

    state.pickingReviewAnchorPoint = false;
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer?.classList.remove('review-anchor-picking');
    hideInlineComposer();
    updateReviewAnchorPointUI();
  }

  function setupReviewAnchorChips() {
    const chipsContainer = document.getElementById('review-anchor-chips');
    if (!chipsContainer) return;

    chipsContainer.addEventListener('click', (event) => {
      const chip = (event.target as HTMLElement).closest('.review-anchor-chip');
      if (!chip || chip.hasAttribute('disabled')) return;
      const anchorType = chip.getAttribute('data-anchor-type');
      if (anchorType) {
        selectReviewAnchorChip(anchorType);
      }
    });
  }

  function setupReviewAnchorPointCapture() {
    const clickSurface = document.getElementById('pdf-container');
    if (!clickSurface) return;

    clickSurface.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (!reviewInteractionsEnabled()) return;
      if (event.target.closest('.review-thread-marker, .field-overlay')) return;
      if (event.target.closest('button, textarea, input, select, label, a')) return;
      const pageContainer = document.getElementById(`pdf-page-${Number(state.currentPage || 1) || 1}`);
      if (!pageContainer) return;
      event.preventDefault();
      event.stopPropagation();
      const canvas = pageContainer.querySelector('canvas');
      const sourceElement = canvas instanceof HTMLElement ? canvas : pageContainer;
      const point = coordinateTransform.screenToPagePoint(
        Number(state.currentPage || 1) || 1,
        sourceElement,
        event.clientX,
        event.clientY,
      );
      if (!point) return;

      // Show inline composer at click location
      showInlineComposer(event.clientX, event.clientY, point);
    });
  }

  function handleFilterReviewThreads(filter) {
    const validFilters = ['all', 'open', 'resolved'];
    const normalized = String(filter || 'all').trim().toLowerCase();
    state.reviewThreadFilter = validFilters.includes(normalized) ? normalized : 'all';
    state.reviewThreadPage = 1; // Reset to first page when filter changes
    renderReviewPanel();
    announceToScreenReader(`Showing ${state.reviewThreadFilter === 'all' ? 'all' : state.reviewThreadFilter} comments.`);
  }

  function handlePageReviewThreads(page) {
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    state.reviewThreadPage = pageNum;
    renderReviewPanel();
    // Scroll to top of thread list
    const reviewPanel = document.getElementById('review-panel');
    reviewPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function toggleReplyComposer(composerID, show) {
    const composer = document.getElementById(String(composerID || '').trim());
    if (!composer) return;

    if (show) {
      // Close any other open composers first
      document.querySelectorAll('.review-reply-composer').forEach((el) => {
        if (el.id !== composerID) {
          el.classList.add('hidden');
        }
      });
      composer.classList.remove('hidden');
      // Focus the textarea
      const textarea = composer.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    } else {
      composer.classList.add('hidden');
      // Clear the textarea
      const textarea = composer.querySelector('textarea');
      if (textarea) {
        textarea.value = '';
      }
    }
  }

  function syncHighlightedReviewThreadUI() {
    document.querySelectorAll('[data-review-thread-id]').forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      const isActive = String(element.getAttribute('data-review-thread-id') || '').trim() === String(state.highlightedReviewThreadID || '').trim();
      element.classList.toggle('ring-2', isActive);
      element.classList.toggle('ring-blue-200', isActive);
      element.classList.toggle('shadow-sm', isActive);
    });
  }

  function revealReviewThread(threadID) {
    const normalizedThreadID = String(threadID || '').trim();
    if (!normalizedThreadID) return;
    const threads = Array.isArray(state.reviewContext?.threads) ? state.reviewContext.threads : [];
    const found = threads.find((entry) => String(entry?.thread?.id || '').trim() === normalizedThreadID);
    if (!found) return;

    const threadStatus = String(found?.thread?.status || 'open').trim() || 'open';
    const currentFilter = state.reviewThreadFilter || 'all';
    if (currentFilter !== 'all' && currentFilter !== threadStatus) {
      state.reviewThreadFilter = threadStatus === 'resolved' ? 'resolved' : 'open';
    }

    const filteredThreads = reviewThreadsForFilter(state.reviewThreadFilter || 'all');
    const threadIndex = filteredThreads.findIndex((entry) => String(entry?.thread?.id || '').trim() === normalizedThreadID);
    if (threadIndex >= 0) {
      state.reviewThreadPage = Math.floor(threadIndex / 5) + 1;
    } else {
      state.reviewThreadFilter = 'all';
      const allThreads = reviewThreadsForFilter('all');
      const allIndex = allThreads.findIndex((entry) => String(entry?.thread?.id || '').trim() === normalizedThreadID);
      state.reviewThreadPage = allIndex >= 0 ? Math.floor(allIndex / 5) + 1 : 1;
    }

    if (isCombinedSignerReviewSession() && activePanelTab() !== 'review') {
      switchPanelTab('review');
    }

    highlightReviewThread(normalizedThreadID);
    renderReviewPanel();

    requestAnimationFrame(() => {
      const threadEl = document.querySelector(`[data-review-thread-id="${CSS.escape(normalizedThreadID)}"]`);
      if (!(threadEl instanceof HTMLElement)) return;
      threadEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      threadEl.focus({ preventScroll: true });
    });
  }

  function switchPanelTab(tab: 'sign' | 'review') {
    if (tab !== 'sign' && tab !== 'review') return;
    if (!isCombinedSignerReviewSession()) return;
    if (tab === 'review' && !hasReviewContext()) return;

    state.activePanelTab = tab;
    renderReviewPanel();
    requestOverlayRender();
    updateSessionChrome();
    updateSubmitButton();
    announceToScreenReader(`${tab === 'sign' ? 'Sign' : 'Review'} tab selected.`);
  }

  function updateSessionChrome() {
    const sidePanel = document.querySelector('.side-panel');
    const panelTitleRow = document.getElementById('panel-title-row');
    const panelTitle = document.getElementById('panel-title');
    const panelTabs = document.getElementById('panel-tabs');
    const fieldsStatus = document.getElementById('fields-status');
    const fieldsList = document.getElementById('fields-list');
    const consentNotice = document.getElementById('consent-notice');
    const submitBtn = document.getElementById('submit-btn');
    const declineBtn = document.getElementById('decline-btn');
    const declineContainer = document.getElementById('decline-container');
    const panelFooter = document.getElementById('panel-footer');
    const mobileProgress = document.getElementById('panel-mobile-progress');
    const submitWarning = document.getElementById('review-submit-warning');
    const submitMessage = document.getElementById('review-submit-message');
    const stageBanner = document.getElementById('stage-state-banner');
    const headerProgressGroup = document.getElementById('header-progress-group');
    const identityLabel = document.getElementById('session-identity-label');
    const panelSignContent = document.getElementById('panel-sign-content');
    const panelReviewContent = document.getElementById('panel-review-content');
    const panelFooterSign = document.getElementById('panel-footer-sign');
    const panelFooterReview = document.getElementById('panel-footer-review');
    const signTab = document.getElementById('panel-tab-sign');
    const reviewTab = document.getElementById('panel-tab-review');
    const isReviewOnly = isReviewOnlySession();
    const isCombined = isCombinedSignerReviewSession();
    const isSender = isSenderSession();
    const showSignPanel = signTabVisible();
    const showReviewPanel = reviewTabVisible();
    const allowSignActions = signingInteractionsEnabled();
    const activeTabName = activePanelTab();

    // Toggle mode classes on side panel for styling
    sidePanel?.classList.toggle('review-only-mode', isReviewOnly);
    sidePanel?.classList.toggle('combined-mode', isCombined);

    if (signTab && reviewTab) {
      const isSignActive = isCombined ? activeTabName === 'sign' : !isReviewOnly;
      const signSelected = isSignActive && !isReviewOnly;
      const reviewSelected = isReviewOnly || (isCombined && activeTabName === 'review');
      signTab.setAttribute('aria-selected', String(signSelected));
      signTab.setAttribute('tabindex', signSelected ? '0' : '-1');
      reviewTab.setAttribute('aria-selected', String(reviewSelected));
      reviewTab.setAttribute('tabindex', reviewSelected ? '0' : '-1');
      signTab.hidden = isReviewOnly;
      reviewTab.hidden = !hasReviewContext();
    }

    if (panelSignContent) {
      panelSignContent.hidden = !showSignPanel;
      panelSignContent.classList.toggle('hidden', !showSignPanel);
    }
    if (panelReviewContent) {
      panelReviewContent.hidden = !showReviewPanel;
      panelReviewContent.classList.toggle('hidden', !showReviewPanel);
    }
    if (panelFooterSign) {
      panelFooterSign.hidden = !showSignPanel;
      panelFooterSign.classList.toggle('hidden', !showSignPanel);
    }
    if (panelFooterReview) {
      panelFooterReview.hidden = !showReviewPanel;
      panelFooterReview.classList.toggle('hidden', !showReviewPanel);
    }

    panelTabs?.classList.toggle('active', isCombined);
    panelTitleRow?.classList.remove('hidden');

    if (identityLabel) {
      if (isSender) {
        identityLabel.textContent = 'Viewing as';
      } else {
        identityLabel.textContent = showReviewPanel && !showSignPanel ? 'Reviewing as' : 'Signing as';
      }
    }

    headerProgressGroup?.classList.toggle('review-only-hidden', !showSignPanel);

    if (panelTitle) {
      if (isSender) {
        panelTitle.textContent = showReviewPanel && !showSignPanel ? 'Review & Comment' : 'Document Preview';
      } else {
        panelTitle.textContent = showReviewPanel && !showSignPanel ? 'Review & Comment' : 'Complete & Sign';
      }
    }

    fieldsList?.classList.toggle('hidden', !showSignPanel);
    fieldsStatus?.classList.toggle('hidden', !showSignPanel);
    mobileProgress?.classList.toggle('hidden', !showSignPanel);
    consentNotice?.classList.toggle('hidden', !allowSignActions || state.hasConsented);
    stageBanner?.classList.toggle('hidden', !showSignPanel);
    panelFooter?.classList.toggle('hidden', !showSignPanel && !showReviewPanel);
    submitBtn?.classList.toggle('hidden', !allowSignActions);
    declineBtn?.classList.toggle('hidden', !allowSignActions);
    declineContainer?.classList.toggle('hidden', !allowSignActions);

    if (submitWarning && submitMessage) {
      if (showReviewPanel) {
        submitWarning.classList.remove('hidden');
        submitMessage.textContent = showSignPanel
          ? 'Switch to the Sign tab to submit your signature.'
          : 'Review actions are available above.';
      } else if (!showSignPanel) {
        submitWarning.classList.add('hidden');
      } else if (hasReviewContext() && state.reviewContext.sign_blocked) {
        submitWarning.classList.remove('hidden');
        submitMessage.textContent = state.reviewContext.sign_block_reason || 'Signing is blocked until review completes.';
      } else {
        submitWarning.classList.add('hidden');
      }
    }
  }

  async function handleCreateReviewThread() {
    if (!hasReviewContext()) return;
    const textarea = document.getElementById('review-thread-body');
    const body = String(textarea?.value || '').trim();
    if (!body) {
      announceToScreenReader('Enter a comment before creating a thread.', 'assertive');
      return;
    }
    const payload = {
      thread: {
        review_id: state.reviewContext.review_id,
        visibility: 'shared',
        body,
        ...reviewThreadAnchorPayload(),
      },
    };
    await reviewAPIRequest('/threads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'Failed to create review thread');
    if (textarea) textarea.value = '';
    await reloadReviewSessionContext();
    announceToScreenReader('Review comment added.');
  }

  async function handleReplyReviewThread(threadID, inputID) {
    const replyInput = document.getElementById(String(inputID || '').trim());
    const body = String(replyInput?.value || '').trim();
    if (!threadID || !body) {
      announceToScreenReader('Enter a reply before sending.', 'assertive');
      return;
    }
    await reviewAPIRequest(`/threads/${encodeURIComponent(String(threadID))}/replies`, {
      method: 'POST',
      body: JSON.stringify({ reply: { body } }),
    }, 'Failed to reply to review thread');
    if (replyInput) replyInput.value = '';
    await reloadReviewSessionContext();
    announceToScreenReader('Reply added to review thread.');
  }

  async function handleReviewThreadState(threadID, resolve) {
    if (!threadID) return;
    const action = resolve ? 'resolve' : 'reopen';
    await reviewAPIRequest(`/threads/${encodeURIComponent(String(threadID))}/${action}`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, resolve ? 'Failed to resolve review thread' : 'Failed to reopen review thread');
    await reloadReviewSessionContext();
    announceToScreenReader(resolve ? 'Review thread resolved.' : 'Review thread reopened.');
  }

  async function handleReviewDecision(action, comment = '') {
    const suffix = action === 'approve' ? '/approve' : '/request-changes';
    const fallbackMessage = action === 'approve' ? 'Failed to approve review' : 'Failed to request review changes';
    const body = action === 'request-changes' && comment ? JSON.stringify({ comment }) : undefined;
    await reviewAPIRequest(suffix, { method: 'POST', body }, fallbackMessage);
    await reloadReviewSessionContext();
    let message = action === 'approve' ? 'Review approved.' : 'Review changes requested.';
    if (hasReviewContext()) {
      const reviewStatus = normalizeReviewStatus(state.reviewContext.status);
      const decisionStatus = reviewParticipantDecisionStatus(state.reviewContext);
      const approvedCount = Number(state.reviewContext.approved_count || 0) || 0;
      const totalApprovers = Number(state.reviewContext.total_approvers || 0) || 0;
      if (action === 'approve' && decisionStatus === 'approved' && reviewStatus === 'in_review') {
        message = totalApprovers > 0
          ? `Your approval was recorded. ${approvedCount} of ${totalApprovers} approvers have approved so far.`
          : 'Your approval was recorded. Waiting for the remaining reviewers.';
      } else if (action === 'approve' && decisionStatus === 'approved') {
        message = 'Review approved.';
      } else if (action === 'request-changes' && decisionStatus === 'changes_requested') {
        message = 'Your change request was recorded.';
      }
    }
    if (window.toastManager) {
      window.toastManager.success(message);
    }
    announceToScreenReader(message);
  }

  // Review decision confirmation modal state
  let pendingReviewDecisionAction = '';

  function showReviewDecisionModal(action) {
    const modal = document.getElementById('review-decision-modal');
    const iconContainer = document.getElementById('review-decision-icon-container');
    const icon = document.getElementById('review-decision-icon');
    const title = document.getElementById('review-decision-modal-title');
    const description = document.getElementById('review-decision-modal-description');
    const commentSection = document.getElementById('review-decision-comment-section');
    const commentInput = document.getElementById('review-decision-comment');
    const commentError = document.getElementById('review-decision-comment-error');
    const confirmBtn = document.getElementById('review-decision-confirm-btn');
    if (!modal) return;

    pendingReviewDecisionAction = action;

    if (action === 'approve') {
      iconContainer?.classList.remove('bg-amber-100');
      iconContainer?.classList.add('bg-emerald-100');
      icon?.classList.remove('iconoir-warning-circle', 'text-amber-600');
      icon?.classList.add('iconoir-check-circle', 'text-emerald-600');
      if (title) title.textContent = 'Approve Review?';
      if (description) description.textContent = 'This will mark the document as approved and notify the sender that the review is complete.';
      commentSection?.classList.add('hidden');
      confirmBtn?.classList.remove('bg-amber-600', 'hover:bg-amber-700');
      confirmBtn?.classList.add('btn-primary');
      if (confirmBtn) confirmBtn.textContent = 'Approve';
    } else {
      iconContainer?.classList.remove('bg-emerald-100');
      iconContainer?.classList.add('bg-amber-100');
      icon?.classList.remove('iconoir-check-circle', 'text-emerald-600');
      icon?.classList.add('iconoir-warning-circle', 'text-amber-600');
      if (title) title.textContent = 'Request Changes?';
      if (description) description.textContent = 'The sender will be notified that changes are needed before this document can proceed.';
      commentSection?.classList.remove('hidden');
      if (commentInput) commentInput.value = '';
      commentError?.classList.add('hidden');
      confirmBtn?.classList.remove('btn-primary');
      confirmBtn?.classList.add('bg-amber-600', 'hover:bg-amber-700', 'text-white');
      if (confirmBtn) confirmBtn.textContent = 'Request Changes';
    }

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const modalContent = modal.querySelector('.field-editor');
    if (modalContent instanceof HTMLElement) {
      trapFocusInModal(modalContent);
    }
    if (action === 'request-changes') {
      commentInput?.focus();
    }
  }

  function hideReviewDecisionModal() {
    const modal = document.getElementById('review-decision-modal');
    if (!modal) return;
    const modalContent = modal.querySelector('.field-editor');
    if (modalContent instanceof HTMLElement) {
      releaseFocusTrap(modalContent);
    }
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pendingReviewDecisionAction = '';
  }

  async function confirmReviewDecision() {
    if (!pendingReviewDecisionAction) return;

    const action = pendingReviewDecisionAction;
    let comment = '';

    if (action === 'request-changes') {
      const commentInput = document.getElementById('review-decision-comment');
      const commentError = document.getElementById('review-decision-comment-error');
      comment = String(commentInput?.value || '').trim();
      if (!comment) {
        commentError?.classList.remove('hidden');
        commentInput?.focus();
        announceToScreenReader('Please provide a reason for requesting changes.', 'assertive');
        return;
      }
    }

    hideReviewDecisionModal();
    await handleReviewDecision(action, comment);
  }

  async function jumpToReviewThreadAnchor(threadID) {
    const threads = Array.isArray(state.reviewContext?.threads) ? state.reviewContext.threads : [];
    const found = threads.find((entry) => String(entry?.thread?.id || '') === String(threadID || ''));
    if (!found) return '';
    highlightReviewThread(threadID);
    const anchorType = String(found?.thread?.anchor_type || '').trim();
    if (anchorType === 'field' && found.thread.field_id) {
      const field = state.fieldState.get(found.thread.field_id);
      const pageNumber = Number(field?.page || found.thread.page_number || state.currentPage || 1) || 1;
      if (pageNumber > 0) {
        await goToPage(pageNumber);
      }
      focusField(found.thread.field_id, { openEditor: false });
      highlightGuidedTarget(found.thread.field_id);
      return 'field';
    }
    if (anchorType === 'page' && Number(found?.thread?.page_number || 0) > 0) {
      await goToPage(Number(found.thread.page_number || 1) || 1);
      return 'page';
    }
    const viewerContent = document.getElementById('viewer-content');
    viewerContent?.scrollTo({ top: 0, behavior: 'smooth' });
    return 'agreement';
  }

  function getReviewThreadMarkerElement(threadID) {
    const normalizedThreadID = String(threadID || '').trim();
    if (!normalizedThreadID) return null;
    const marker = document.querySelector(`.review-thread-marker[data-thread-id="${CSS.escape(normalizedThreadID)}"]`);
    return marker instanceof HTMLElement ? marker : null;
  }

  function waitForReviewThreadMarker(threadID, timeoutMs = 4000) {
    const normalizedThreadID = String(threadID || '').trim();
    const existingMarker = getReviewThreadMarkerElement(normalizedThreadID);
    if (existingMarker) {
      return Promise.resolve(existingMarker);
    }
    return new Promise<HTMLElement>((resolve, reject) => {
      const startedAt = Date.now();
      const check = () => {
        const marker = getReviewThreadMarkerElement(normalizedThreadID);
        if (marker) {
          resolve(marker);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out locating review marker for thread ${normalizedThreadID}.`));
          return;
        }
        window.requestAnimationFrame(check);
      };
      window.requestAnimationFrame(check);
    });
  }

  async function highlightReviewThreadMarker(threadID) {
    const normalizedThreadID = String(threadID || '').trim();
    if (!normalizedThreadID) return;
    const anchorType = await jumpToReviewThreadAnchor(normalizedThreadID);
    if (anchorType !== 'page' && anchorType !== 'field') {
      return;
    }
    try {
      const marker = await waitForReviewThreadMarker(normalizedThreadID);
      marker.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    } catch {
      // Marker rendering is best-effort after navigation has already completed.
    }
  }

  // ============================================
  // Coordinate Transform System (Task 19.FE.2)
  // ============================================
  const coordinateTransform = {
    /**
     * Device pixel ratio for high-DPI displays
     */
    dpr: window.devicePixelRatio || 1,

    /**
     * Cached page dimensions from PDF.js render
     */
    pageViewports: new Map(),

    /**
     * Get page metadata from viewer config or field data
     */
    getPageMetadata(pageNum) {
      // First check viewer.pages from backend
      const viewerPage = unifiedConfig.viewer.pages?.find(p => p.page === pageNum);
      if (viewerPage) {
        return {
          width: viewerPage.width,
          height: viewerPage.height,
          rotation: viewerPage.rotation || 0
        };
      }

      // Fallback to cached PDF.js viewport metadata
      const viewport = this.pageViewports.get(pageNum);
      if (viewport) {
        return {
          width: viewport.width,
          height: viewport.height,
          rotation: viewport.rotation || 0
        };
      }

      // Default PDF page dimensions (letter size at 72 DPI)
      return { width: 612, height: 792, rotation: 0 };
    },

    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(pageNum, viewport) {
      this.pageViewports.set(pageNum, {
        width: viewport.width,
        height: viewport.height,
        rotation: viewport.rotation || 0
      });
    },

    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(fieldData, containerEl) {
      const pageNum = fieldData.page;
      const pageMetadata = this.getPageMetadata(pageNum);

      // Get rendered container dimensions
      const containerWidth = containerEl.offsetWidth;
      const containerHeight = containerEl.offsetHeight;

      // Source page dimensions (from backend or PDF)
      const sourceWidth = fieldData.pageWidth || pageMetadata.width;
      const sourceHeight = fieldData.pageHeight || pageMetadata.height;

      // Calculate scale factors from rendered canvas size to source page points.
      // Do not re-apply zoom here: container dimensions already include zoom.
      const scaleX = containerWidth / sourceWidth;
      const scaleY = containerHeight / sourceHeight;

      // Handle coordinate origin and Y-axis direction
      // Backend provides coordinates in PDF space (origin top-left, Y down)
      let posX = fieldData.posX || 0;
      let posY = fieldData.posY || 0;

      // Apply Y-axis flip if backend uses bottom-left origin
      if (unifiedConfig.viewer.origin === 'bottom-left') {
        posY = sourceHeight - posY - (fieldData.height || 30);
      }

      // Transform to screen coordinates
      const screenX = posX * scaleX;
      const screenY = posY * scaleY;
      const screenWidth = (fieldData.width || 150) * scaleX;
      const screenHeight = (fieldData.height || 30) * scaleY;

      return {
        left: screenX,
        top: screenY,
        width: screenWidth,
        height: screenHeight,
        // Store original values for debugging
        _debug: {
          sourceX: posX,
          sourceY: posY,
          sourceWidth: fieldData.width,
          sourceHeight: fieldData.height,
          pageWidth: sourceWidth,
          pageHeight: sourceHeight,
          scaleX,
          scaleY,
          zoom: state.zoomLevel,
          dpr: this.dpr
        }
      };
    },

    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(fieldData, containerEl) {
      const coords = this.pageToScreen(fieldData, containerEl);
      return {
        left: `${Math.round(coords.left)}px`,
        top: `${Math.round(coords.top)}px`,
        width: `${Math.round(coords.width)}px`,
        height: `${Math.round(coords.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? 'translateZ(0)' : 'none'
      };
    },

    screenToPagePoint(pageNum, containerEl, clientX, clientY) {
      const pageMetadata = this.getPageMetadata(pageNum);
      const rect = containerEl.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        return null;
      }

      const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const relativeY = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const sourceWidth = pageMetadata.width || rect.width;
      const sourceHeight = pageMetadata.height || rect.height;
      const scaleX = sourceWidth / rect.width;
      const scaleY = sourceHeight / rect.height;

      let anchorX = relativeX * scaleX;
      let anchorY = relativeY * scaleY;
      if (unifiedConfig.viewer.origin === 'bottom-left') {
        anchorY = sourceHeight - anchorY;
      }

      return {
        page_number: Number(pageNum || 1) || 1,
        anchor_x: Math.round(anchorX * 100) / 100,
        anchor_y: Math.round(anchorY * 100) / 100,
      };
    }
  };

  // ============================================
  // Signed Upload Contract System (Task 19.FE.1)
  // ============================================
  const signatureUploader = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(fieldId, sha256, contentType, sizeBytes) {
      const response = await fetch(
        `${unifiedConfig.apiBasePath}/signature-upload/${unifiedConfig.token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          body: JSON.stringify({
            field_instance_id: fieldId,
            sha256: sha256,
            content_type: contentType,
            size_bytes: sizeBytes
          })
        }
      );

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to get upload contract');
      }

      const responseData = await response.json();
      const contract = responseData?.contract || responseData;
      if (!contract || typeof contract !== 'object' || !contract.upload_url) {
        throw new Error('Invalid upload contract response');
      }
      return contract;
    },

    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(uploadContract, binaryData) {
      const uploadUrl = new URL(uploadContract.upload_url, window.location.origin);
      if (uploadContract.upload_token) {
        uploadUrl.searchParams.set('upload_token', String(uploadContract.upload_token));
      }
      if (uploadContract.object_key) {
        uploadUrl.searchParams.set('object_key', String(uploadContract.object_key));
      }

      const headers = {
        'Content-Type': uploadContract.content_type || 'image/png'
      };

      // Add any extra headers from the upload contract
      if (uploadContract.headers) {
        Object.entries(uploadContract.headers).forEach(([key, value]) => {
          const normalized = String(key).toLowerCase();
          // Avoid oversized request headers; backend accepts token/key via query params.
          if (normalized === 'x-esign-upload-token' || normalized === 'x-esign-upload-key') {
            return;
          }
          headers[key] = String(value);
        });
      }

      const response = await fetch(uploadUrl.toString(), {
        method: uploadContract.method || 'PUT',
        headers,
        body: binaryData,
        credentials: 'omit'
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, `Upload failed: ${response.status} ${response.statusText}`);
      }

      return true;
    },

    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(dataUrl) {
      const [header, base64Data] = dataUrl.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';

      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return new Blob([bytes], { type: mimeType });
    },

    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(fieldId, canvasDataUrl) {
      // Convert to blob for size calculation
      const blob = this.dataUrlToBlob(canvasDataUrl);
      const sizeBytes = blob.size;
      const contentType = 'image/png';

      // Calculate SHA256 of binary content
      const sha256 = await sha256Bytes(blob);

      // Request upload bootstrap contract
      const uploadContract = await this.requestUploadBootstrap(
        fieldId,
        sha256,
        contentType,
        sizeBytes
      );

      // Upload to signed URL
      await this.uploadToSignedUrl(uploadContract, blob);

      // Return contract data for attach call
      return {
        uploadToken: uploadContract.upload_token,
        objectKey: uploadContract.object_key,
        sha256: uploadContract.sha256,
        contentType: uploadContract.content_type
      };
    }
  };

  const signatureLibraryAPI = {
    endpoint(token, signatureID = '') {
      const encodedToken = encodeURIComponent(token);
      const suffix = signatureID ? `/${encodeURIComponent(signatureID)}` : '';
      return `${unifiedConfig.apiBasePath}/signatures/${encodedToken}${suffix}`;
    },

    async list(fieldType) {
      const url = new URL(this.endpoint(unifiedConfig.token), window.location.origin);
      url.searchParams.set('type', fieldType);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Failed to load saved signatures');
      }
      const payload = await response.json();
      return Array.isArray(payload?.signatures) ? payload.signatures : [];
    },

    async save(fieldType, dataUrl, label = '') {
      const response = await fetch(this.endpoint(unifiedConfig.token), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type: fieldType,
          label,
          data_url: dataUrl,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const error = new Error(payload?.error?.message || 'Failed to save signature');
        (error as any).code = payload?.error?.code || '';
        throw error;
      }
      const payload = await response.json();
      return payload?.signature || null;
    },

    async delete(signatureID) {
      const response = await fetch(this.endpoint(unifiedConfig.token, signatureID), {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || 'Failed to delete signature');
      }
    },
  };

  function resolveFieldSignatureType(fieldId) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return 'signature';
    return fieldData.type === 'initials' ? 'initials' : 'signature';
  }

  function getSavedSignaturesForType(signatureType) {
    return state.savedSignaturesByType.get(signatureType) || [];
  }

  async function ensureSavedSignaturesLoaded(fieldId, force = false) {
    const signatureType = resolveFieldSignatureType(fieldId);
    if (!force && state.savedSignaturesByType.has(signatureType)) {
      renderSavedSignatureList(fieldId);
      return;
    }
    const rows = await signatureLibraryAPI.list(signatureType);
    state.savedSignaturesByType.set(signatureType, rows);
    renderSavedSignatureList(fieldId);
  }

  function renderSavedSignatureList(fieldId) {
    const signatureType = resolveFieldSignatureType(fieldId);
    const rows = getSavedSignaturesForType(signatureType);
    const container = document.getElementById('sig-saved-list');
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
      return;
    }
    container.innerHTML = rows.map((entry) => {
      const preview = escapeHTML(String(entry?.thumbnail_data_url || entry?.data_url || ''));
      const label = escapeHTML(String(entry?.label || 'Saved signature'));
      const signatureID = escapeHTML(String(entry?.id || ''));
      return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${preview}" alt="${label}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${label}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${escapeHTML(fieldId)}" data-signature-id="${signatureID}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${escapeHTML(fieldId)}" data-signature-id="${signatureID}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
    }).join('');
  }

  async function saveCurrentSignatureToLibrary(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    const signatureType = resolveFieldSignatureType(fieldId);
    if (!canvasData || !hasSignatureCanvasContent(fieldId)) {
      throw new Error(`Please add your ${signatureType === 'initials' ? 'initials' : 'signature'} first`);
    }
    const dataUrl = canvasData.canvas.toDataURL('image/png');
    const entry = await signatureLibraryAPI.save(signatureType, dataUrl, signatureType === 'initials' ? 'Initials' : 'Signature');
    if (!entry) {
      throw new Error('Failed to save signature');
    }
    const rows = getSavedSignaturesForType(signatureType);
    rows.unshift(entry);
    state.savedSignaturesByType.set(signatureType, rows);
    renderSavedSignatureList(fieldId);
    if (window.toastManager) {
      window.toastManager.success('Saved to your signature library');
    }
  }

  async function selectSavedSignature(fieldId, signatureID) {
    const signatureType = resolveFieldSignatureType(fieldId);
    const rows = getSavedSignaturesForType(signatureType);
    const found = rows.find((entry) => String(entry?.id || '') === String(signatureID));
    if (!found) return;
    requestAnimationFrame(() => initializeSignatureCanvas(fieldId));
    await waitForSignatureCanvas(fieldId);
    const dataUrl = String(found.data_url || found.thumbnail_data_url || '').trim();
    if (!dataUrl) return;
    await setSignatureBaseImage(fieldId, dataUrl, { clearStrokes: true });
    setTransientFieldSignaturePreview(fieldId, dataUrl);
    requestOverlayRender();
    switchSignatureTab('draw', fieldId);
    announceToScreenReader('Saved signature selected.');
  }

  async function deleteSavedSignature(fieldId, signatureID) {
    const signatureType = resolveFieldSignatureType(fieldId);
    await signatureLibraryAPI.delete(signatureID);
    const rows = getSavedSignaturesForType(signatureType).filter((entry) => String(entry?.id || '') !== String(signatureID));
    state.savedSignaturesByType.set(signatureType, rows);
    renderSavedSignatureList(fieldId);
  }

  function handleSavedSignatureError(error) {
    const code = String(error?.code || '').trim();
    const fallbackMessage = String(error?.message || 'Unable to update saved signatures');
    const message = code === 'SIGNATURE_LIBRARY_LIMIT_REACHED'
      ? 'You reached your saved-signature limit for this type. Delete one to save a new one.'
      : fallbackMessage;
    if (window.toastManager) {
      window.toastManager.error(message);
    }
    announceToScreenReader(message, 'assertive');
  }

  async function waitForSignatureCanvas(fieldId, attempts = 8) {
    for (let i = 0; i < attempts; i++) {
      if (state.signatureCanvases.has(fieldId)) return true;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 40));
      initializeSignatureCanvas(fieldId);
    }
    return false;
  }

  async function processSignatureUploadFile(fieldId, file) {
    const mimeType = String(file?.type || '').toLowerCase();
    if (!['image/png', 'image/jpeg'].includes(mimeType)) {
      throw new Error('Only PNG and JPEG images are supported');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('Image file is too large');
    }
    requestAnimationFrame(() => initializeSignatureCanvas(fieldId));
    await waitForSignatureCanvas(fieldId);
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData) {
      throw new Error('Signature canvas is not ready');
    }

    const rawDataUrl = await readFileAsDataURL(file);
    const normalizedDataUrl = mimeType === 'image/png'
      ? rawDataUrl
      : await convertImageDataUrlToPNG(rawDataUrl, canvasData.drawWidth, canvasData.drawHeight);
    const normalizedSize = estimateDataURLByteSize(normalizedDataUrl);
    if (normalizedSize > SIGNATURE_UPLOAD_MAX_BYTES) {
      throw new Error(`Image exceeds ${Math.round(SIGNATURE_UPLOAD_MAX_BYTES / 1024)}KB limit after conversion`);
    }
    await setSignatureBaseImage(fieldId, normalizedDataUrl, { clearStrokes: true });
    setTransientFieldSignaturePreview(fieldId, normalizedDataUrl);
    requestOverlayRender();
    const previewWrap = document.getElementById('sig-upload-preview-wrap');
    const preview = document.getElementById('sig-upload-preview');
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (preview) preview.setAttribute('src', normalizedDataUrl);
    announceToScreenReader('Signature image uploaded. You can now insert it.');
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read image file'));
      reader.readAsDataURL(file);
    });
  }

  function estimateDataURLByteSize(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    if (parts.length < 2) return 0;
    const base64 = parts[1] || '';
    const padding = (base64.match(/=+$/) || [''])[0].length;
    return Math.floor((base64.length * 3) / 4) - padding;
  }

  async function convertImageDataUrlToPNG(dataUrl, targetWidth, targetHeight) {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const drawWidth = Math.max(1, Math.round(Number(targetWidth) || 600));
        const drawHeight = Math.max(1, Math.round(Number(targetHeight) || 160));
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Unable to process image'));
          return;
        }
        context.clearRect(0, 0, drawWidth, drawHeight);
        const scale = Math.min(drawWidth / image.width, drawHeight / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        const x = (drawWidth - width) / 2;
        const y = (drawHeight - height) / 2;
        context.drawImage(image, x, y, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('Unable to decode image file'));
      image.src = dataUrl;
    });
  }

  /**
   * SHA256 of binary blob
   */
  async function sha256Bytes(blob) {
    if (window.crypto && window.crypto.subtle) {
      const buffer = await blob.arrayBuffer();
      const digest = await window.crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    // Fallback (should not happen in modern browsers)
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(16);
  }

  // ============================================
  // Initialization
  // ============================================
  function bindActionHandlers() {
    document.addEventListener('click', (event) => {
      const clicked = event.target;
      if (!(clicked instanceof Element)) return;
      const target = clicked.closest('[data-esign-action]');
      if (!target) return;

      const action = target.getAttribute('data-esign-action');
      if (action === 'highlight-review-marker') {
        const nestedInteractive = clicked.closest('button, textarea, input, select, label, a, [data-esign-action]');
        if (nestedInteractive && nestedInteractive !== target) {
          return;
        }
      }
      switch (action) {
        case 'prev-page':
          prevPage();
          break;
        case 'next-page':
          nextPage();
          break;
        case 'zoom-out':
          zoomOut();
          break;
        case 'zoom-in':
          zoomIn();
          break;
        case 'fit-width':
          fitToWidth();
          break;
        case 'download-document':
          downloadDocument();
          break;
        case 'show-consent-modal':
          showConsentModal();
          break;
        case 'activate-field': {
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) activateField(fieldId);
          break;
        }
        case 'submit-signature':
          handleSubmit();
          break;
        case 'show-decline-modal':
          showDeclineModal();
          break;
        case 'close-field-editor':
          closeFieldEditor();
          break;
        case 'save-field-editor':
          saveFieldFromEditor();
          break;
        case 'hide-consent-modal':
          hideConsentModal();
          break;
        case 'accept-consent':
          acceptConsent();
          break;
        case 'hide-decline-modal':
          hideDeclineModal();
          break;
        case 'confirm-decline':
          confirmDecline();
          break;
        case 'approve-review':
          showReviewDecisionModal('approve');
          break;
        case 'request-review-changes':
          showReviewDecisionModal('request-changes');
          break;
        case 'hide-review-decision-modal':
          hideReviewDecisionModal();
          break;
        case 'confirm-review-decision':
          confirmReviewDecision().catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to complete review action');
            announceToScreenReader(`Error: ${error?.message || 'Unable to complete review action'}`, 'assertive');
          });
          break;
        case 'create-review-thread':
          handleCreateReviewThread().catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to add comment');
            announceToScreenReader(`Error: ${error?.message || 'Unable to add comment'}`, 'assertive');
          });
          break;
        case 'reply-review-thread': {
          const threadID = target.getAttribute('data-thread-id');
          const replyInputID = target.getAttribute('data-reply-input-id');
          handleReplyReviewThread(threadID, replyInputID).catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to reply to thread');
            announceToScreenReader(`Error: ${error?.message || 'Unable to reply to thread'}`, 'assertive');
          });
          break;
        }
        case 'resolve-review-thread': {
          const threadID = target.getAttribute('data-thread-id');
          handleReviewThreadState(threadID, true).catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to resolve thread');
            announceToScreenReader(`Error: ${error?.message || 'Unable to resolve thread'}`, 'assertive');
          });
          break;
        }
        case 'reopen-review-thread': {
          const threadID = target.getAttribute('data-thread-id');
          handleReviewThreadState(threadID, false).catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to reopen thread');
            announceToScreenReader(`Error: ${error?.message || 'Unable to reopen thread'}`, 'assertive');
          });
          break;
        }
        case 'go-review-thread-anchor': {
          const threadID = target.getAttribute('data-thread-id');
          jumpToReviewThreadAnchor(threadID).catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to navigate to comment anchor');
            announceToScreenReader(`Error: ${error?.message || 'Unable to navigate to comment anchor'}`, 'assertive');
          });
          break;
        }
        case 'go-review-thread': {
          const threadID = target.getAttribute('data-thread-id');
          revealReviewThread(threadID);
          break;
        }
        case 'highlight-review-marker': {
          const threadID = target.getAttribute('data-review-thread-id');
          highlightReviewThreadMarker(threadID).catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to locate comment marker');
            announceToScreenReader(`Error: ${error?.message || 'Unable to locate comment marker'}`, 'assertive');
          });
          break;
        }
        case 'filter-review-threads': {
          const filter = target.getAttribute('data-filter') || 'all';
          handleFilterReviewThreads(filter);
          break;
        }
        case 'page-review-threads': {
          const page = parseInt(target.getAttribute('data-page') || '1', 10);
          handlePageReviewThreads(page);
          break;
        }
        case 'toggle-reply-composer': {
          const composerID = target.getAttribute('data-composer-id');
          toggleReplyComposer(composerID, true);
          break;
        }
        case 'cancel-reply': {
          const composerID = target.getAttribute('data-composer-id');
          toggleReplyComposer(composerID, false);
          break;
        }
        case 'pick-review-anchor-point':
          if (currentReviewAnchorType() === 'page') {
            setReviewAnchorPicking(true);
          }
          break;
        case 'clear-review-anchor-point':
          state.pickingReviewAnchorPoint = false;
          document.getElementById('pdf-container')?.classList.remove('review-anchor-picking');
          setReviewAnchorPointDraft(null);
          announceToScreenReader('Pinned comment location cleared.');
          break;
        case 'submit-inline-comment':
          handleSubmitInlineComment().catch((error) => {
            if (window.toastManager) window.toastManager.error(error?.message || 'Unable to add comment');
            announceToScreenReader(`Error: ${error?.message || 'Unable to add comment'}`, 'assertive');
          });
          break;
        case 'cancel-inline-comment':
          hideInlineComposer();
          break;
        case 'retry-load-pdf':
          loadPdfDocument();
          break;
        case 'signature-tab': {
          const tab = target.getAttribute('data-tab') || 'draw';
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) switchSignatureTab(tab, fieldId);
          break;
        }
        case 'clear-signature-canvas': {
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) clearSignatureCanvas(fieldId);
          break;
        }
        case 'undo-signature-canvas': {
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) undoSignatureCanvas(fieldId);
          break;
        }
        case 'redo-signature-canvas': {
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) redoSignatureCanvas(fieldId);
          break;
        }
        case 'save-current-signature-library': {
          const fieldId = target.getAttribute('data-field-id');
          if (fieldId) {
            saveCurrentSignatureToLibrary(fieldId).catch(handleSavedSignatureError);
          }
          break;
        }
        case 'select-saved-signature': {
          const fieldId = target.getAttribute('data-field-id');
          const signatureId = target.getAttribute('data-signature-id');
          if (fieldId && signatureId) {
            selectSavedSignature(fieldId, signatureId).catch(handleSavedSignatureError);
          }
          break;
        }
        case 'delete-saved-signature': {
          const fieldId = target.getAttribute('data-field-id');
          const signatureId = target.getAttribute('data-signature-id');
          if (fieldId && signatureId) {
            deleteSavedSignature(fieldId, signatureId).catch(handleSavedSignatureError);
          }
          break;
        }
        case 'clear-signer-profile':
          clearPersistedSignerProfile().catch(() => {});
          break;
        case 'switch-panel-tab': {
          const tab = target.getAttribute('data-tab');
          if (tab === 'sign' || tab === 'review') {
            switchPanelTab(tab);
          }
          break;
        }
        case 'debug-toggle-panel':
          debugMode.togglePanel();
          break;
        case 'debug-copy-session':
          debugMode.copySessionInfo();
          break;
        case 'debug-clear-cache':
          debugMode.clearCache();
          break;
        case 'debug-show-telemetry':
          debugMode.showTelemetry();
          break;
        case 'debug-reload-viewer':
          debugMode.reloadViewer();
          break;
      }
    });

    document.addEventListener('change', (event) => {
      const changed = event.target;
      if (!(changed instanceof HTMLInputElement)) return;
      if (changed.matches('#sig-upload-input')) {
        const fieldId = changed.getAttribute('data-field-id');
        const file = changed.files?.[0];
        if (!fieldId || !file) return;
        processSignatureUploadFile(fieldId, file).catch((error) => {
          if (window.toastManager) {
            window.toastManager.error(error?.message || 'Unable to process uploaded image');
          }
        });
        return;
      }
      if (changed.matches('#field-checkbox-input')) {
        const fieldId = changed.getAttribute('data-field-id') || state.activeFieldId;
        if (!fieldId) return;
        setTransientFieldBoolPreview(fieldId, changed.checked);
        requestOverlayRender();
      }
    });

    document.addEventListener('input', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement)) return;
      const fieldId = target.getAttribute('data-field-id') || state.activeFieldId;
      if (!fieldId) return;

      if (target.matches('#sig-type-input')) {
        updateTypedSignaturePreview(fieldId, target.value || '', { syncOverlay: true });
        return;
      }

      if (target.matches('#field-text-input')) {
        setTransientFieldTextPreview(fieldId, target.value || '');
        requestOverlayRender();
        return;
      }

      if (target.matches('#field-checkbox-input') && target instanceof HTMLInputElement) {
        setTransientFieldBoolPreview(fieldId, target.checked);
        requestOverlayRender();
      }
    });
  }

  onReady(async () => {
    bindActionHandlers();

    // Detect device capabilities for performance optimization
    state.isLowMemory = detectLowMemoryDevice();

    // Initialize stage state banner for multi-signer flows (Task 24.FE.1)
    initializeCompatibilityBanner();
    initializeStageBanner();

    await initializeSignerProfile();
    initializeFieldState();
    renderReviewPanel();
    setupReviewAnchorChips();
    setupReviewAnchorPointCapture();
    updateSessionChrome();
    initializeConsentCheckbox();
    updateProgress();
    updateSubmitButton();

    // Load PDF document
    await loadPdfDocument();

    // Render field overlays
    renderFieldOverlays();

    // Set up visibility change handler for memory management
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up memory pressure handling (if supported)
    if ('memory' in navigator) {
      monitorMemoryPressure();
    }

    // Initialize debug mode if enabled
    debugMode.init();
  });

  /**
   * Handle page visibility changes for memory management
   */
  function handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, reduce memory usage
      reduceCacheSize();
    }
  }

  /**
   * Reduce cache size when memory pressure is detected
   */
  function reduceCacheSize() {
    const targetSize = state.isLowMemory ? 1 : 2;

    while (state.renderedPages.size > targetSize) {
      // Find oldest cached page that isn't the current page
      let oldest = null;
      let oldestTime = Infinity;

      state.renderedPages.forEach((value, pageNum) => {
        if (pageNum !== state.currentPage && value.timestamp < oldestTime) {
          oldest = pageNum;
          oldestTime = value.timestamp;
        }
      });

      if (oldest !== null) {
        state.renderedPages.delete(oldest);
      } else {
        break;
      }
    }
  }

  /**
   * Monitor memory pressure and adjust caching behavior
   */
  function monitorMemoryPressure() {
    // Check periodically if we're using too much memory
    setInterval(() => {
      if (navigator.memory) {
        const usedJSHeap = navigator.memory.usedJSHeapSize;
        const totalJSHeap = navigator.memory.totalJSHeapSize;
        const usage = usedJSHeap / totalJSHeap;

        if (usage > 0.8) {
          // High memory usage, reduce cache
          state.isLowMemory = true;
          reduceCacheSize();
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // ============================================
  // PDF Compatibility Banner
  // ============================================
  function defaultCompatibilityMessage(reason) {
    switch (String(reason || '').trim().toLowerCase()) {
      case 'preview_fallback_forced':
        return 'Preview is running in safe mode due to compatibility safeguards. You can continue signing.';
      case 'source_import_failed':
      case 'source_not_pdf':
        return 'This PDF preview is degraded due to source compatibility. You can continue signing.';
      case 'normalized_unavailable':
      case 'source_unavailable':
        return 'A fallback preview is being used because the source document is temporarily unavailable.';
      default:
        return 'This signing session is using a degraded preview mode for compatibility.';
    }
  }

  function initializeCompatibilityBanner() {
    const banner = document.getElementById('pdf-compatibility-banner');
    const messageEl = document.getElementById('pdf-compatibility-message');
    const titleEl = document.getElementById('pdf-compatibility-title');
    if (!banner || !messageEl || !titleEl) return;

    const tier = String(unifiedConfig.viewer.compatibilityTier || '').trim().toLowerCase();
    const reason = String(unifiedConfig.viewer.compatibilityReason || '').trim().toLowerCase();
    if (tier !== 'limited') {
      banner.classList.add('hidden');
      return;
    }

    titleEl.textContent = 'Preview Compatibility Notice';
    messageEl.textContent = String(unifiedConfig.viewer.compatibilityMessage || '').trim() || defaultCompatibilityMessage(reason);
    banner.classList.remove('hidden');
    telemetry.trackDegradedMode('pdf_preview_compatibility', { tier, reason });
  }

  // ============================================
  // Stage State Banner (Task 24.FE.1)
  // ============================================
  /**
   * Initialize stage state banner for multi-signer flows
   * Displays waiting/blocked/active state messaging with stage context
   */
  function initializeStageBanner() {
    const banner = document.getElementById('stage-state-banner');
    const icon = document.getElementById('stage-state-icon');
    const title = document.getElementById('stage-state-title');
    const message = document.getElementById('stage-state-message');
    const meta = document.getElementById('stage-state-meta');

    if (!banner || !icon || !title || !message || !meta) return;

    if (isSenderSession()) {
      const senderBanner = senderViewerBanner();
      let bannerConfig = {
        hidden: false,
        bgClass: 'bg-slate-50',
        borderClass: 'border-slate-200',
        iconClass: 'iconoir-eye text-slate-600',
        titleClass: 'text-slate-900',
        messageClass: 'text-slate-800',
        title: 'Document Preview',
        message: 'This document is available in read-only mode.',
        badges: []
      };

      switch (senderBanner) {
        case 'sender_review':
          bannerConfig = {
            hidden: false,
            bgClass: 'bg-blue-50',
            borderClass: 'border-blue-200',
            iconClass: 'iconoir-chat-bubble text-blue-600',
            titleClass: 'text-blue-900',
            messageClass: 'text-blue-800',
            title: 'Review & Comment',
            message: 'Review the current document state and collaborate through shared comments.',
            badges: [
              { icon: 'iconoir-chat-bubble', text: 'Shared comments', variant: 'blue' }
            ]
          };
          break;
        case 'sender_progress':
          bannerConfig = {
            hidden: false,
            bgClass: 'bg-amber-50',
            borderClass: 'border-amber-200',
            iconClass: 'iconoir-hourglass text-amber-600',
            titleClass: 'text-amber-900',
            messageClass: 'text-amber-800',
            title: 'Signing In Progress',
            message: 'Signing is underway. You can monitor progress and participate in shared review threads.',
            badges: [
              { icon: 'iconoir-clock', text: 'Read-only document', variant: 'amber' }
            ]
          };
          break;
        case 'sender_complete':
          bannerConfig = {
            hidden: false,
            bgClass: 'bg-green-50',
            borderClass: 'border-green-200',
            iconClass: 'iconoir-check-circle text-green-600',
            titleClass: 'text-green-900',
            messageClass: 'text-green-800',
            title: 'Completed Document',
            message: 'This agreement is complete. The document is read-only.',
            badges: [
              { icon: 'iconoir-check', text: 'Completed', variant: 'green' }
            ]
          };
          break;
      }

      banner.classList.remove('hidden');
      banner.className = `mb-4 rounded-lg border p-4 ${bannerConfig.bgClass} ${bannerConfig.borderClass}`;
      icon.className = `${bannerConfig.iconClass} mt-0.5`;
      title.className = `text-sm font-semibold ${bannerConfig.titleClass}`;
      title.textContent = bannerConfig.title;
      message.className = `text-xs ${bannerConfig.messageClass} mt-1`;
      message.textContent = bannerConfig.message;
      meta.innerHTML = '';
      bannerConfig.badges.forEach(badge => {
        const badgeEl = document.createElement('span');
        const variantClasses = {
          blue: 'bg-blue-100 text-blue-800',
          amber: 'bg-amber-100 text-amber-800',
          green: 'bg-green-100 text-green-800',
          slate: 'bg-slate-100 text-slate-800'
        };
        badgeEl.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${variantClasses[badge.variant] || variantClasses.slate}`;
        badgeEl.innerHTML = `<i class="${badge.icon} mr-1"></i>${badge.text}`;
        meta.appendChild(badgeEl);
      });
      return;
    }

    const signerState = unifiedConfig.signerState || 'active';
    const recipientStage = unifiedConfig.recipientStage || 1;
    const activeStage = unifiedConfig.activeStage || 1;
    const activeRecipientIds = unifiedConfig.activeRecipientIds || [];
    const waitingForRecipientIds = unifiedConfig.waitingForRecipientIds || [];

    // Determine banner content based on state
    let bannerConfig = {
      hidden: false,
      bgClass: 'bg-green-50',
      borderClass: 'border-green-200',
      iconClass: 'iconoir-check-circle text-green-600',
      titleClass: 'text-green-900',
      messageClass: 'text-green-800',
      title: "It's your turn to sign",
      message: 'Please complete and sign the document below.',
      badges: []
    };

    switch (signerState) {
      case 'waiting':
        bannerConfig = {
          hidden: false,
          bgClass: 'bg-blue-50',
          borderClass: 'border-blue-200',
          iconClass: 'iconoir-hourglass text-blue-600',
          titleClass: 'text-blue-900',
          messageClass: 'text-blue-800',
          title: 'Waiting for Other Signers',
          message: recipientStage > activeStage
            ? `You are in signing stage ${recipientStage}. Stage ${activeStage} is currently active.`
            : 'You will be able to sign once the previous signer(s) have completed their signatures.',
          badges: [
            { icon: 'iconoir-clock', text: 'Your turn is coming', variant: 'blue' }
          ]
        };
        if (waitingForRecipientIds.length > 0) {
          bannerConfig.badges.push({
            icon: 'iconoir-group',
            text: `${waitingForRecipientIds.length} signer(s) ahead`,
            variant: 'blue'
          });
        }
        break;

      case 'blocked':
        bannerConfig = {
          hidden: false,
          bgClass: 'bg-amber-50',
          borderClass: 'border-amber-200',
          iconClass: 'iconoir-warning-triangle text-amber-600',
          titleClass: 'text-amber-900',
          messageClass: 'text-amber-800',
          title: 'Signing Not Available',
          message: 'This agreement cannot be signed at this time. It may have been completed, voided, or is awaiting action from another party.',
          badges: [
            { icon: 'iconoir-lock', text: 'Access restricted', variant: 'amber' }
          ]
        };
        break;

      case 'completed':
        bannerConfig = {
          hidden: false,
          bgClass: 'bg-green-50',
          borderClass: 'border-green-200',
          iconClass: 'iconoir-check-circle text-green-600',
          titleClass: 'text-green-900',
          messageClass: 'text-green-800',
          title: 'Signing Complete',
          message: 'You have already completed signing this document.',
          badges: [
            { icon: 'iconoir-check', text: 'Signed', variant: 'green' }
          ]
        };
        break;

      case 'active':
      default:
        // Active state - show encouraging message
        if (activeRecipientIds.length > 1) {
          bannerConfig.message = `You and ${activeRecipientIds.length - 1} other signer(s) can sign now.`;
          bannerConfig.badges = [
            { icon: 'iconoir-users', text: `Stage ${activeStage} active`, variant: 'green' }
          ];
        } else if (recipientStage > 1) {
          bannerConfig.badges = [
            { icon: 'iconoir-check-circle', text: `Stage ${recipientStage}`, variant: 'green' }
          ];
        } else {
          // Single signer or first stage - hide the banner for cleaner UI
          bannerConfig.hidden = true;
        }
        break;
    }

    // Apply banner configuration
    if (bannerConfig.hidden) {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    banner.className = `mb-4 rounded-lg border p-4 ${bannerConfig.bgClass} ${bannerConfig.borderClass}`;

    icon.className = `${bannerConfig.iconClass} mt-0.5`;
    title.className = `text-sm font-semibold ${bannerConfig.titleClass}`;
    title.textContent = bannerConfig.title;
    message.className = `text-xs ${bannerConfig.messageClass} mt-1`;
    message.textContent = bannerConfig.message;

    // Build badge elements
    meta.innerHTML = '';
    bannerConfig.badges.forEach(badge => {
      const badgeEl = document.createElement('span');
      const variantClasses = {
        blue: 'bg-blue-100 text-blue-800',
        amber: 'bg-amber-100 text-amber-800',
        green: 'bg-green-100 text-green-800'
      };
      badgeEl.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${variantClasses[badge.variant] || variantClasses.blue}`;
      badgeEl.innerHTML = `<i class="${badge.icon} mr-1"></i>${badge.text}`;
      meta.appendChild(badgeEl);
    });
  }

  function initializeFieldState() {
    unifiedConfig.fields.forEach(field => {
      let value = null;
      let completed = false;

      if (field.type === 'checkbox') {
        value = field.value_bool || false;
        completed = value;
      } else if (field.type === 'date_signed') {
        value = new Date().toISOString().split('T')[0];
        completed = true; // Auto-filled
      } else {
        const serverValue = String(field.value_text || '');
        value = serverValue || resolveProfilePrefillValue(field);
        // Prefilled profile values should not mark field complete until persisted for this document.
        completed = Boolean(serverValue);
      }

      state.fieldState.set(field.id, {
        id: field.id,
        type: field.type,
        page: field.page || 1,
        required: field.required,
        value: value,
        completed: completed,
        hasError: false,
        lastError: null,
        // Geometry metadata is populated from backend field payloads when present.
        posX: field.pos_x || 0,
        posY: field.pos_y || 0,
        width: field.width || 150,
        height: field.height || 30,
        tabIndex: Number(field.tab_index || 0) || 0,
      });
    });
  }

  async function initializeSignerProfile() {
    try {
      const profile = await signerProfileRepository.load(state.profileKey);
      if (profile) {
        state.profileData = profile;
        state.profileRemember = profile.remember !== false;
      }
    } catch {
      // Profile sync is best-effort and must not block signer flow.
    }
  }

  function resolveProfilePrefillValue(field) {
    const profile = state.profileData;
    if (!profile) return '';
    const fieldType = String(field?.type || '').trim();

    if (fieldType === 'name') {
      return sanitizeProfileText(profile.fullName || '');
    }
    if (fieldType === 'initials') {
      const initials = sanitizeProfileText(profile.initials || '');
      return initials || initialsFromName(profile.fullName || unifiedConfig.recipientName || '');
    }
    if (fieldType === 'signature') {
      return sanitizeProfileText(profile.typedSignature || '');
    }
    return '';
  }

  function resolvePersistedDrawnDataUrl(fieldData) {
    if (!unifiedConfig.profile.persistDrawnSignature) return '';
    if (!state.profileData) return '';
    if (fieldData?.type === 'initials') {
      return (
        String(state.profileData.drawnInitialsDataUrl || '').trim() ||
        String(state.profileData.drawnSignatureDataUrl || '').trim()
      );
    }
    return String(state.profileData.drawnSignatureDataUrl || '').trim();
  }

  function resolveTypedEditorValue(fieldData) {
    const current = sanitizeProfileText(fieldData?.value || '');
    if (current) return current;
    if (!state.profileData) return '';

    if (fieldData?.type === 'initials') {
      const saved = sanitizeProfileText(state.profileData.initials || '');
      return saved || initialsFromName(state.profileData.fullName || unifiedConfig.recipientName || '');
    }
    if (fieldData?.type === 'signature') {
      return sanitizeProfileText(state.profileData.typedSignature || '');
    }
    return '';
  }

  function readRememberPreferenceFromEditor() {
    const rememberInput = document.getElementById('remember-profile-input');
    if (!(rememberInput instanceof HTMLInputElement)) {
      return state.profileRemember;
    }
    return Boolean(rememberInput.checked);
  }

  async function clearPersistedSignerProfile(silent = false) {
    let clearError = null;
    try {
      await signerProfileRepository.clear(state.profileKey);
    } catch (error) {
      clearError = error;
    } finally {
      // Always clear local in-memory profile state even if remote sync fails.
      state.profileData = null;
      state.profileRemember = unifiedConfig.profile.rememberByDefault;
    }

    if (clearError) {
      if (!silent && window.toastManager) {
        window.toastManager.error('Unable to clear saved signer profile on all devices');
      }
      if (!silent) {
        throw clearError;
      }
      return;
    }
    if (!silent && window.toastManager) {
      window.toastManager.success('Saved signer profile cleared');
    }
  }

  async function persistProfileFromField(fieldData, options = {}) {
    const remember = readRememberPreferenceFromEditor();
    state.profileRemember = remember;

    if (!remember) {
      await clearPersistedSignerProfile(true);
      return;
    }

    if (!fieldData) return;
    const patch = {
      remember: true,
    };
    const fieldType = String(fieldData.type || '');

    if (fieldType === 'name' && typeof fieldData.value === 'string') {
      const fullName = sanitizeProfileText(fieldData.value);
      if (fullName) {
        patch.fullName = fullName;
        if (!(state.profileData?.initials || '').trim()) {
          patch.initials = initialsFromName(fullName);
        }
      }
    }

    if (fieldType === 'initials') {
      if (
        options.signatureType === 'drawn' &&
        unifiedConfig.profile.persistDrawnSignature &&
        typeof options.signatureDataUrl === 'string'
      ) {
        patch.drawnInitialsDataUrl = options.signatureDataUrl;
      } else if (typeof fieldData.value === 'string') {
        const initialsValue = sanitizeProfileText(fieldData.value);
        if (initialsValue) {
          patch.initials = initialsValue;
        }
      }
    }

    if (fieldType === 'signature') {
      if (
        options.signatureType === 'drawn' &&
        unifiedConfig.profile.persistDrawnSignature &&
        typeof options.signatureDataUrl === 'string'
      ) {
        patch.drawnSignatureDataUrl = options.signatureDataUrl;
      } else if (typeof fieldData.value === 'string') {
        const typedValue = sanitizeProfileText(fieldData.value);
        if (typedValue) {
          patch.typedSignature = typedValue;
        }
      }
    }

    if (Object.keys(patch).length === 1 && patch.remember === true) return;

    try {
      const saved = await signerProfileRepository.save(state.profileKey, patch);
      state.profileData = saved;
    } catch {
      // Best-effort persistence only.
    }
  }

  function initializeConsentCheckbox() {
    const checkbox = document.getElementById('consent-checkbox');
    const acceptBtn = document.getElementById('consent-accept-btn');

    if (checkbox && acceptBtn) {
      checkbox.addEventListener('change', function() {
        acceptBtn.disabled = !this.checked;
      });
    }
  }

  // ============================================
  // Performance Optimization Helpers
  // ============================================

  /**
   * Check if device has limited memory
   * @returns {boolean}
   */
  function detectLowMemoryDevice() {
    // Check navigator.deviceMemory if available (Chrome/Edge)
    if (navigator.deviceMemory && navigator.deviceMemory < 4) {
      return true;
    }

    // Heuristic: mobile devices are more likely memory-constrained
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      return true;
    }

    return false;
  }

  /**
   * Manage page cache - evict old pages when over limit
   */
  function managePagesCache() {
    const maxPages = state.isLowMemory ? 3 : state.maxCachedPages;

    if (state.renderedPages.size <= maxPages) return;

    // Find pages to evict (furthest from current page)
    const pagesToEvict = [];
    state.renderedPages.forEach((_, pageNum) => {
      const distance = Math.abs(pageNum - state.currentPage);
      pagesToEvict.push({ pageNum, distance });
    });

    // Sort by distance descending, evict furthest pages
    pagesToEvict.sort((a, b) => b.distance - a.distance);

    while (state.renderedPages.size > maxPages && pagesToEvict.length > 0) {
      const toEvict = pagesToEvict.shift();
      if (toEvict && toEvict.pageNum !== state.currentPage) {
        state.renderedPages.delete(toEvict.pageNum);
      }
    }
  }

  /**
   * Debounced render to prevent excessive renders during rapid navigation
   * @param {number} pageNum - Page number to render
   */
  function debouncedRenderPage(pageNum) {
    const now = Date.now();
    if (now - state.lastRenderTime < state.renderDebounceMs) {
      // Queue the render
      state.pageNumPending = pageNum;
      setTimeout(() => {
        if (state.pageNumPending === pageNum) {
          renderPage(pageNum);
        }
      }, state.renderDebounceMs);
      return;
    }

    state.lastRenderTime = now;
    renderPage(pageNum);
  }

  /**
   * Preload adjacent pages for smoother navigation
   * @param {number} currentPage - Current page number
   */
  function preloadAdjacentPages(currentPage) {
    if (state.isLowMemory) return; // Skip preloading on low-memory devices

    const pagesToPreload = [];

    if (currentPage > 1) {
      pagesToPreload.push(currentPage - 1);
    }
    if (currentPage < unifiedConfig.pageCount) {
      pagesToPreload.push(currentPage + 1);
    }

    // Preload asynchronously in idle time
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        pagesToPreload.forEach(async (pageNum) => {
          if (!state.renderedPages.has(pageNum) && !state.pageRendering) {
            await preloadPage(pageNum);
          }
        });
      }, { timeout: 2000 });
    }
  }

  /**
   * Preload a page without displaying it
   * @param {number} pageNum - Page number to preload
   */
  async function preloadPage(pageNum) {
    if (!state.pdfDoc || state.renderedPages.has(pageNum)) return;

    try {
      const page = await state.pdfDoc.getPage(pageNum);
      const scale = state.zoomLevel;
      const viewport = page.getViewport({ scale: scale * window.devicePixelRatio });

      const offscreenCanvas = document.createElement('canvas');
      const ctx = offscreenCanvas.getContext('2d');

      offscreenCanvas.width = viewport.width;
      offscreenCanvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      state.renderedPages.set(pageNum, {
        canvas: offscreenCanvas,
        scale: scale,
        timestamp: Date.now()
      });

      managePagesCache();
    } catch (error) {
      console.warn('Preload failed for page', pageNum, error);
    }
  }

  /**
   * Get render quality based on device capabilities
   * @returns {number} - Scale factor for rendering
   */
  function getRenderQuality() {
    const dpr = window.devicePixelRatio || 1;

    // Limit DPR on low-memory devices
    if (state.isLowMemory) {
      return Math.min(dpr, 1.5);
    }

    // Cap at 2x for performance
    return Math.min(dpr, 2);
  }

  // ============================================
  // PDF Loading and Rendering
  // ============================================
  async function loadPdfDocument() {
    const loadingEl = document.getElementById('pdf-loading');
    const loadStartTime = Date.now();
    let documentUrl = '';

    try {
      // Fetch document URL from assets endpoint
      const assetsResponse = await fetch(assetsContractPath());
      if (!assetsResponse.ok) {
        throw new Error('Failed to load document');
      }

      const assetsData = await assetsResponse.json();
      const assets = assetsData.assets || {};

      // Only use concrete binary asset URLs - never fall back to contract_url which is JSON
      documentUrl = resolveBinaryAssetUrl(assets);

      if (!documentUrl) {
        throw new Error('Document preview is not available yet. The document may still be processing.');
      }

      // Load PDF with PDF.js
      const loadingTask = loadPdfSourceDocument({
        url: documentUrl,
        surface: 'signer-review',
        documentId: unifiedConfig.agreementId,
      });
      state.pdfDoc = await loadingTask.promise;

      // Update page count
      unifiedConfig.pageCount = state.pdfDoc.numPages;
      document.getElementById('page-count').textContent = state.pdfDoc.numPages;

      // Render first page
      await renderPage(1);

      // Update navigation buttons
      updatePageNavigation();

      // Track successful load
      telemetry.trackViewerLoad(true, Date.now() - loadStartTime);
      telemetry.trackPageView(1);

    } catch (error) {
      const normalizedError = logPdfLoadError(error, {
        surface: 'signer-review',
        documentId: unifiedConfig.agreementId,
        url: typeof documentUrl === 'string' ? documentUrl : null,
      });

      // Track failed load
      telemetry.trackViewerLoad(false, Date.now() - loadStartTime, normalizedError.rawMessage);

      if (loadingEl) {
        loadingEl.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `;
      }

      // Show viewer error with recovery guidance
      showViewerError();
    }
  }

  async function renderPage(pageNum) {
    if (!state.pdfDoc) return;

    // Check for cached render first
    const cached = state.renderedPages.get(pageNum);
    if (cached && cached.scale === state.zoomLevel) {
      displayCachedPage(cached, pageNum);
      state.currentPage = pageNum;
      document.getElementById('current-page').textContent = pageNum;
      updatePageNavigation();
      updateReviewAnchorChips();
      renderFieldOverlays();
      settlePageRenderWaiters(pageNum);
      preloadAdjacentPages(pageNum);
      return;
    }

    state.pageRendering = true;

    try {
      const page = await state.pdfDoc.getPage(pageNum);
      const scale = state.zoomLevel;
      const renderQuality = getRenderQuality();
      const viewport = page.getViewport({ scale: scale * renderQuality });
      const sourceViewport = page.getViewport({ scale: 1 });

      // Cache viewport for coordinate transforms (Task 19.FE.2)
      coordinateTransform.setPageViewport(pageNum, {
        width: sourceViewport.width,
        height: sourceViewport.height,
        rotation: sourceViewport.rotation || 0
      });

      const container = document.getElementById('pdf-page-1');
      container.innerHTML = '';

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.style.width = `${viewport.width / renderQuality}px`;
      canvas.style.height = `${viewport.height / renderQuality}px`;

      container.appendChild(canvas);

      // Update container size for overlays
      const pdfContainer = document.getElementById('pdf-container');
      pdfContainer.style.width = `${viewport.width / renderQuality}px`;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      // Cache the rendered page
      state.renderedPages.set(pageNum, {
        canvas: canvas.cloneNode(true),
        scale: scale,
        timestamp: Date.now(),
        displayWidth: viewport.width / renderQuality,
        displayHeight: viewport.height / renderQuality
      });

      // Copy rendered content to cloned canvas for cache
      const clonedCtx = state.renderedPages.get(pageNum).canvas.getContext('2d');
      clonedCtx.drawImage(canvas, 0, 0);

      managePagesCache();

      state.currentPage = pageNum;
      document.getElementById('current-page').textContent = pageNum;
      updatePageNavigation();
      updateReviewAnchorChips();

      // Re-render overlays for current page
      renderFieldOverlays();
      settlePageRenderWaiters(pageNum);

      // Track page view
      telemetry.trackPageView(pageNum);

      // Preload adjacent pages in background
      preloadAdjacentPages(pageNum);

    } catch (error) {
      settlePageRenderWaiters(pageNum, error instanceof Error ? error : new Error('Page render failed.'));
      console.error('Page render error:', error);
    } finally {
      state.pageRendering = false;

      if (state.pageNumPending !== null) {
        const pending = state.pageNumPending;
        state.pageNumPending = null;
        await renderPage(pending);
      }
    }
  }

  /**
   * Display a cached page without re-rendering
   * @param {Object} cached - Cached page data
   * @param {number} pageNum - Page number
   */
  function displayCachedPage(cached, pageNum) {
    const container = document.getElementById('pdf-page-1');
    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    canvas.width = cached.canvas.width;
    canvas.height = cached.canvas.height;
    canvas.style.width = `${cached.displayWidth}px`;
    canvas.style.height = `${cached.displayHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(cached.canvas, 0, 0);

    container.appendChild(canvas);

    // Update container size
    const pdfContainer = document.getElementById('pdf-container');
    pdfContainer.style.width = `${cached.displayWidth}px`;
  }

  function queueRenderPage(num) {
    if (state.pageRendering) {
      state.pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  // ============================================
  // Field Overlays
  // ============================================
  function resolveOverlayTextValue(fieldData) {
    if (typeof fieldData.previewValueText === 'string' && fieldData.previewValueText.trim() !== '') {
      return sanitizeProfileText(fieldData.previewValueText);
    }
    if (typeof fieldData.value === 'string' && fieldData.value.trim() !== '') {
      return sanitizeProfileText(fieldData.value);
    }
    return '';
  }

  function renderOverlayImage(overlay, src, alt, isDraft = false) {
    const img = document.createElement('img');
    img.className = 'field-overlay-preview';
    img.src = src;
    img.alt = alt;
    overlay.appendChild(img);
    overlay.classList.add('has-preview');
    if (isDraft) {
      overlay.classList.add('draft-preview');
    }
  }

  function renderOverlayValue(overlay, text, signatureLike = false, isDraft = false) {
    const value = document.createElement('span');
    value.className = 'field-overlay-value';
    if (signatureLike) {
      value.classList.add('font-signature');
    }
    value.textContent = text;
    overlay.appendChild(value);
    overlay.classList.add('has-value');
    if (isDraft) {
      overlay.classList.add('draft-preview');
    }
  }

  function renderOverlayLabel(overlay, label) {
    const labelEl = document.createElement('span');
    labelEl.className = 'field-overlay-label';
    labelEl.textContent = label;
    overlay.appendChild(labelEl);
  }

  function resolveThreadMarkerPosition(entry, containerEl) {
    if (!containerEl) return null;
    const thread = entry?.thread || {};
    const anchorType = String(thread.anchor_type || '').trim();
    if (anchorType === 'page') {
      const pageNumber = Number(thread.page_number || 0) || 0;
      const hasPoint = (Number(thread.anchor_x || 0) || 0) > 0 || (Number(thread.anchor_y || 0) || 0) > 0;
      if (pageNumber !== Number(state.currentPage || 0) || !hasPoint) return null;
      const point = coordinateTransform.pageToScreen({
        page: pageNumber,
        posX: Number(thread.anchor_x || 0) || 0,
        posY: Number(thread.anchor_y || 0) || 0,
        width: 0,
        height: 0,
      }, containerEl);
      return { left: point.left, top: point.top };
    }
    if (anchorType === 'field' && thread.field_id) {
      const field = state.fieldState.get(String(thread.field_id || '').trim());
      if (!field || Number(field.page || 0) !== Number(state.currentPage || 0)) return null;
      if (field.posX == null || field.posY == null) return null;
      const point = coordinateTransform.pageToScreen({
        page: Number(field.page || state.currentPage || 1) || 1,
        posX: (Number(field.posX || 0) || 0) + ((Number(field.width || 0) || 0) / 2),
        posY: Number(field.posY || 0) || 0,
        width: 0,
        height: 0,
      }, containerEl);
      return { left: point.left, top: point.top };
    }
    return null;
  }

  function renderReviewThreadMarkers(overlaysContainer, containerEl) {
    const threads = Array.isArray(state.reviewContext?.threads) ? state.reviewContext.threads : [];
    threads.forEach((entry) => {
      const thread = entry?.thread || {};
      const position = resolveThreadMarkerPosition(entry, containerEl);
      if (!position) return;
      const actor = reviewActorPresentation(thread.created_by_type, thread.created_by_id);
      const interactive = reviewMarkersInteractive();
      const marker = document.createElement(interactive ? 'button' : 'div');
      if (interactive && marker instanceof HTMLButtonElement) {
        marker.type = 'button';
      }
      marker.className = 'review-thread-marker';
      if (String(thread.status || '').trim() === 'resolved') {
        marker.classList.add('resolved');
      }
      if (String(thread.visibility || 'shared').trim() === 'internal') {
        marker.classList.add('internal');
      }
      if (String(thread.id || '').trim() === String(state.highlightedReviewThreadID || '').trim()) {
        marker.classList.add('active');
      }
      if (interactive) {
        marker.dataset.esignAction = 'go-review-thread';
      } else {
        marker.setAttribute('aria-hidden', 'true');
        marker.style.pointerEvents = 'none';
      }
      marker.dataset.threadId = String(thread.id || '').trim();
      marker.style.left = `${Math.round(position.left)}px`;
      marker.style.top = `${Math.round(position.top)}px`;
      marker.style.background = actor.color;
      marker.style.borderColor = actor.color;
      if (interactive) {
        marker.title = `${reviewAnchorLabel(entry)} comment by ${actor.name}`;
        marker.setAttribute('aria-label', `${reviewAnchorLabel(entry)} comment by ${actor.name}`);
      }
      marker.textContent = actor.initials;
      overlaysContainer.appendChild(marker);
    });

    if (currentReviewAnchorType() === 'page' && state.reviewAnchorPointDraft && Number(state.reviewAnchorPointDraft.page_number || 0) === Number(state.currentPage || 0)) {
      const point = coordinateTransform.pageToScreen({
        page: Number(state.reviewAnchorPointDraft.page_number || state.currentPage || 1) || 1,
        posX: Number(state.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(state.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0,
      }, containerEl);
      const draftMarker = document.createElement('div');
      draftMarker.className = 'review-thread-marker active';
      draftMarker.style.left = `${Math.round(point.left)}px`;
      draftMarker.style.top = `${Math.round(point.top)}px`;
      draftMarker.setAttribute('aria-hidden', 'true');
      draftMarker.textContent = '+';
      overlaysContainer.appendChild(draftMarker);
    }
  }

  function renderFieldOverlays() {
    const overlaysContainer = document.getElementById('field-overlays');
    if (!overlaysContainer) return;
    overlaysContainer.innerHTML = '';
    overlaysContainer.style.pointerEvents = 'auto';

    // Get PDF container for coordinate transforms
    const pdfContainer = document.getElementById('pdf-container');
    if (!pdfContainer) return;

    if (!signingInteractionsEnabled()) {
      if (reviewMarkersVisible()) {
        renderReviewThreadMarkers(overlaysContainer, pdfContainer);
      }
      return;
    }

    state.fieldState.forEach((fieldData, fieldId) => {
      // Only show overlays for current page
      if (fieldData.page !== state.currentPage) return;

      const overlay = document.createElement('div');
      overlay.className = 'field-overlay';
      overlay.dataset.fieldId = fieldId;

      if (fieldData.required) {
        overlay.classList.add('required');
      }
      if (fieldData.completed) {
        overlay.classList.add('completed');
      }
      if (state.activeFieldId === fieldId) {
        overlay.classList.add('active');
      }

      // Use coordinate transform system for precise positioning (Task 19.FE.2)
      // Check if we have valid geometry data from backend
      const hasGeometry = fieldData.posX != null && fieldData.posY != null &&
                          fieldData.width != null && fieldData.height != null;

      if (hasGeometry) {
        // Use canonical coordinate transform for precise overlay placement
        const styles = coordinateTransform.getOverlayStyles(fieldData, pdfContainer);
        overlay.style.left = styles.left;
        overlay.style.top = styles.top;
        overlay.style.width = styles.width;
        overlay.style.height = styles.height;
        overlay.style.transform = styles.transform;

        // Store debug info on element for debugging
        if (debugMode.enabled) {
          overlay.dataset.debugCoords = JSON.stringify(
            coordinateTransform.pageToScreen(fieldData, pdfContainer)._debug
          );
        }
      } else {
        // Fallback: stack fields vertically when geometry is missing
        const fieldIndex = Array.from(state.fieldState.keys()).indexOf(fieldId);
        overlay.style.left = '10px';
        overlay.style.top = `${100 + (fieldIndex * 50)}px`;
        overlay.style.width = '150px';
        overlay.style.height = '30px';
      }

      const draftSignaturePreview = String(fieldData.previewSignatureUrl || '').trim();
      const savedSignaturePreview = String(fieldData.signaturePreviewUrl || '').trim();
      const overlayTextValue = resolveOverlayTextValue(fieldData);
      const isSignatureField = fieldData.type === 'signature' || fieldData.type === 'initials';
      const hasDraftBool = typeof fieldData.previewValueBool === 'boolean';

      if (draftSignaturePreview) {
        renderOverlayImage(overlay, draftSignaturePreview, getFieldTypeLabel(fieldData.type), true);
      } else if (fieldData.completed && savedSignaturePreview) {
        renderOverlayImage(overlay, savedSignaturePreview, getFieldTypeLabel(fieldData.type));
      } else if (overlayTextValue) {
        const isDraftText = typeof fieldData.previewValueText === 'string' && fieldData.previewValueText.trim() !== '';
        renderOverlayValue(overlay, overlayTextValue, isSignatureField, isDraftText);
      } else if (fieldData.type === 'checkbox') {
        const checked = hasDraftBool ? fieldData.previewValueBool : Boolean(fieldData.value);
        if (checked) {
          renderOverlayValue(overlay, 'Checked', false, hasDraftBool);
        } else {
          renderOverlayLabel(overlay, getFieldTypeLabel(fieldData.type));
        }
      } else {
        renderOverlayLabel(overlay, getFieldTypeLabel(fieldData.type));
      }

      // Accessibility: keyboard focusable
      overlay.setAttribute('tabindex', '0');
      overlay.setAttribute('role', 'button');
      overlay.setAttribute('aria-label', `${getFieldTypeLabel(fieldData.type)} field${fieldData.required ? ', required' : ''}${fieldData.completed ? ', completed' : ''}`);

      // Click and keyboard handlers
      overlay.addEventListener('click', () => activateField(fieldId));
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activateField(fieldId);
        }
      });

      overlaysContainer.appendChild(overlay);
    });

    // Only render review thread markers when:
    // - Not in combined mode, OR
    // - In combined mode and review tab is active
    if (pdfContainer && reviewMarkersVisible()) {
      renderReviewThreadMarkers(overlaysContainer, pdfContainer);
    }
  }

  function getFieldTypeLabel(type) {
    const labels = {
      'signature': 'Sign',
      'initials': 'Initial',
      'name': 'Name',
      'date_signed': 'Date',
      'text': 'Text',
      'checkbox': 'Check'
    };
    return labels[type] || type;
  }

  // ============================================
  // Page Navigation
  // ============================================
  function prevPage() {
    if (state.currentPage <= 1) return;
    queueRenderPage(state.currentPage - 1);
  }

  function nextPage() {
    if (state.currentPage >= unifiedConfig.pageCount) return;
    queueRenderPage(state.currentPage + 1);
  }

  function goToPage(pageNum) {
    const normalizedPageNum = Number(pageNum || 0) || 0;
    if (normalizedPageNum < 1 || normalizedPageNum > unifiedConfig.pageCount) return Promise.resolve();
    const waitForPage = waitForRenderedPage(normalizedPageNum);
    if (!hasRenderedPage(normalizedPageNum)) {
      queueRenderPage(normalizedPageNum);
    }
    return waitForPage;
  }

  function updatePageNavigation() {
    document.getElementById('prev-page-btn').disabled = state.currentPage <= 1;
    document.getElementById('next-page-btn').disabled = state.currentPage >= unifiedConfig.pageCount;
  }

  // ============================================
  // Zoom Controls
  // ============================================
  function zoomIn() {
    state.zoomLevel = Math.min(state.zoomLevel + 0.25, 3.0);
    updateZoomDisplay();
    queueRenderPage(state.currentPage);
  }

  function zoomOut() {
    state.zoomLevel = Math.max(state.zoomLevel - 0.25, 0.5);
    updateZoomDisplay();
    queueRenderPage(state.currentPage);
  }

  function fitToWidth() {
    const viewerContent = document.getElementById('viewer-content');
    const containerWidth = viewerContent.offsetWidth - 32; // Account for padding

    // Estimate page width (default 612pt = 8.5in at 72dpi)
    const pageWidth = 612;
    state.zoomLevel = containerWidth / pageWidth;

    updateZoomDisplay();
    queueRenderPage(state.currentPage);
  }

  function updateZoomDisplay() {
    document.getElementById('zoom-level').textContent = `${Math.round(state.zoomLevel * 100)}%`;
  }

  // ============================================
  // Field Activation and Editor
  // ============================================
  function activateField(fieldId) {
    if (!signingInteractionsEnabled()) {
      announceToScreenReader('This review session is read-only for signing fields.');
      return;
    }
    // Check consent first
    if (!state.hasConsented && unifiedConfig.fields.some(f => f.id === fieldId && f.type !== 'date_signed')) {
      showConsentModal();
      return;
    }
    focusField(fieldId, { openEditor: true });
  }

  function focusField(fieldId, options = { openEditor: true }) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;

    if (options.openEditor && !signingInteractionsEnabled()) {
      scrollFieldIntoView(fieldId);
      return;
    }

    if (options.openEditor) {
      state.activeFieldId = fieldId;
      renderReviewPanel();
    }

    // Update UI
    document.querySelectorAll('.field-list-item').forEach(el => el.classList.remove('active', 'guided-next-target'));
    document.querySelector(`.field-list-item[data-field-id="${fieldId}"]`)?.classList.add('active');

    // Update overlays
    document.querySelectorAll('.field-overlay').forEach(el => el.classList.remove('active', 'guided-next-target'));
    document.querySelector(`.field-overlay[data-field-id="${fieldId}"]`)?.classList.add('active');

    // Navigate to field's page if needed
    if (fieldData.page !== state.currentPage) {
      goToPage(fieldData.page);
    }

    if (!options.openEditor) {
      scrollFieldIntoView(fieldId);
      return;
    }

    // Open field editor (except for date_signed which is auto-filled)
    if (fieldData.type !== 'date_signed') {
      openFieldEditor(fieldId);
    }
  }

  function scrollFieldIntoView(fieldId) {
    const listItem = document.querySelector(`.field-list-item[data-field-id="${fieldId}"]`);
    listItem?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    requestAnimationFrame(() => {
      const overlay = document.querySelector(`.field-overlay[data-field-id="${fieldId}"]`);
      overlay?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    });
  }

  function openFieldEditor(fieldId) {
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;

    const editorOverlay = document.getElementById('field-editor-overlay');
    const editorContent = document.getElementById('field-editor-content');
    const editorTitle = document.getElementById('field-editor-title');
    const legalDisclaimer = document.getElementById('field-editor-legal-disclaimer');

    editorTitle.textContent = getFieldEditorTitle(fieldData.type);
    editorContent.innerHTML = getFieldEditorContent(fieldData);
    legalDisclaimer?.classList.toggle('hidden', !(fieldData.type === 'signature' || fieldData.type === 'initials'));

    // Initialize signature canvas if needed
    if (fieldData.type === 'signature' || fieldData.type === 'initials') {
      initializeSignatureEditor(fieldId);
    }

    // Show editor with accessibility support
    editorOverlay.classList.add('active');
    editorOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trap focus in modal
    trapFocusInModal(editorOverlay.querySelector('.field-editor'));

    // Announce to screen readers
    announceToScreenReader(`Editing ${getFieldEditorTitle(fieldData.type)}. Press Escape to cancel.`);

    // Focus first input
    setTimeout(() => {
      const firstInput = editorContent.querySelector('input, textarea');
      if (firstInput) {
        firstInput.focus();
      } else {
        editorContent.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
      }
    }, 100);
    if (secondsUntil(state.writeCooldownUntil) > 0) {
      applyWriteCooldown(secondsUntil(state.writeCooldownUntil));
    }
  }

  function getFieldEditorTitle(type) {
    const titles = {
      'signature': 'Add Your Signature',
      'initials': 'Add Your Initials',
      'name': 'Enter Your Name',
      'text': 'Enter Text',
      'checkbox': 'Confirmation'
    };
    return titles[type] || 'Edit Field';
  }

  function getFieldEditorContent(fieldData) {
    const preferenceMarkup = getProfilePreferenceMarkup(fieldData.type);
    const escapedFieldID = escapeHTML(String(fieldData?.id || ''));
    const escapedFieldType = escapeHTML(String(fieldData?.type || ''));

    if (fieldData.type === 'signature' || fieldData.type === 'initials') {
      const labelText = fieldData.type === 'initials' ? 'initials' : 'signature';
      const typedEditorValue = escapeHTML(resolveTypedEditorValue(fieldData));
      const tabs = [
        { id: 'draw', label: 'Draw' },
        { id: 'type', label: 'Type' },
        { id: 'upload', label: 'Upload' },
        { id: 'saved', label: 'Saved' },
      ];
      const activeTab = resolveSignatureTab(fieldData.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${tabs.map((tab) => `
            <button
              type="button"
              id="sig-tab-${tab.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
              data-tab="${tab.id}"
              data-esign-action="signature-tab"
              data-field-id="${escapedFieldID}"
              role="tab"
              aria-selected="${activeTab === tab.id ? 'true' : 'false'}"
              aria-controls="sig-editor-${tab.id}"
              tabindex="${activeTab === tab.id ? '0' : '-1'}"
            >
              ${tab.label}
            </button>`).join('')}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${activeTab === 'type' ? '' : 'hidden'}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${labelText}"
              value="${typedEditorValue}"
              data-field-id="${escapedFieldID}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${escapedFieldID}">${typedEditorValue}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${labelText} will appear as your ${escapedFieldType}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${activeTab === 'draw' ? '' : 'hidden'}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${escapedFieldID}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${escapedFieldID}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${escapedFieldID}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${escapedFieldID}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${escapedFieldID}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${labelText} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${activeTab === 'upload' ? '' : 'hidden'}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${escapedFieldID}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${activeTab === 'saved' ? '' : 'hidden'}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${labelText}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${escapedFieldID}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${preferenceMarkup}
        </div>
      `;
    }

    if (fieldData.type === 'name') {
      const nameValue = escapeHTML(String(fieldData.value || ''));
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${nameValue}"
          data-field-id="${escapedFieldID}"
        />
        ${preferenceMarkup}
      `;
    }

    if (fieldData.type === 'text') {
      const textValue = escapeHTML(String(fieldData.value || ''));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${escapedFieldID}"
        >${textValue}</textarea>
      `;
    }

    if (fieldData.type === 'checkbox') {
      return `
        <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            id="field-checkbox-input"
            class="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${fieldData.value ? 'checked' : ''}
            data-field-id="${fieldData.id}"
          />
          <span class="text-gray-700">I agree to the terms and conditions</span>
        </label>
      `;
    }

    return '<p class="text-gray-500">Unsupported field type</p>';
  }

  function getProfilePreferenceMarkup(fieldType) {
    const supported = fieldType === 'name' || fieldType === 'initials' || fieldType === 'signature';
    if (!supported) return '';
    return `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${state.profileRemember ? 'checked' : ''}
          />
          Remember this on this device
        </label>
        <button
          type="button"
          data-esign-action="clear-signer-profile"
          class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2"
        >
          Clear saved signer profile
        </button>
      </div>
    `;
  }

  function updateTypedSignaturePreview(fieldId, value, options = { syncOverlay: false }) {
    const preview = document.getElementById('sig-type-preview');
    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;
    const normalized = sanitizeProfileText(String(value || '').trim());
    if (options?.syncOverlay) {
      if (normalized) {
        setTransientFieldTextPreview(fieldId, normalized);
      } else {
        clearTransientFieldPreview(fieldId);
      }
      requestOverlayRender();
    }
    if (!preview) return;
    if (normalized) {
      preview.textContent = normalized;
      return;
    }
    preview.textContent = fieldData.type === 'initials' ? 'Type your initials' : 'Type your signature';
  }

  function resolveSignatureTab(fieldId) {
    const saved = String(state.signatureTabByField.get(fieldId) || '').trim();
    if (saved === 'draw' || saved === 'type' || saved === 'upload' || saved === 'saved') {
      return saved;
    }
    return 'draw';
  }

  function switchSignatureTab(tab, fieldId) {
    const resolvedTab = ['draw', 'type', 'upload', 'saved'].includes(tab) ? tab : 'draw';
    state.signatureTabByField.set(fieldId, resolvedTab);

    // Update tab buttons
    document.querySelectorAll('.sig-editor-tab').forEach(btn => {
      btn.classList.remove('border-blue-600', 'text-blue-600');
      btn.classList.add('border-transparent', 'text-gray-500');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('tabindex', '-1');
    });
    const selectedTab = document.querySelector(`.sig-editor-tab[data-tab="${resolvedTab}"]`);
    selectedTab?.classList.add('border-blue-600', 'text-blue-600');
    selectedTab?.classList.remove('border-transparent', 'text-gray-500');
    selectedTab?.setAttribute('aria-selected', 'true');
    selectedTab?.setAttribute('tabindex', '0');

    // Update panels
    document.getElementById('sig-editor-type')?.classList.toggle('hidden', resolvedTab !== 'type');
    document.getElementById('sig-editor-draw')?.classList.toggle('hidden', resolvedTab !== 'draw');
    document.getElementById('sig-editor-upload')?.classList.toggle('hidden', resolvedTab !== 'upload');
    document.getElementById('sig-editor-saved')?.classList.toggle('hidden', resolvedTab !== 'saved');

    if ((resolvedTab === 'draw' || resolvedTab === 'upload' || resolvedTab === 'saved') && selectedTab) {
      requestAnimationFrame(() => initializeSignatureCanvas(fieldId));
    }
    if (resolvedTab === 'type') {
      const input = document.getElementById('sig-type-input');
      updateTypedSignaturePreview(fieldId, input?.value || '');
    }
    if (resolvedTab === 'saved') {
      ensureSavedSignaturesLoaded(fieldId).catch(handleSavedSignatureError);
    }
  }

  function initializeSignatureEditor(fieldId) {
    state.signatureTabByField.set(fieldId, 'draw');
    switchSignatureTab('draw', fieldId);
    const input = document.getElementById('sig-type-input');
    if (input) {
      updateTypedSignaturePreview(fieldId, input.value || '');
    }
  }

  function initializeSignatureCanvas(fieldId) {
    const canvas = document.getElementById('sig-draw-canvas');
    if (!canvas || state.signatureCanvases.has(fieldId)) return;

    const container = canvas.closest('.signature-canvas-container');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Use device pixel ratio for crisp drawing
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2.5;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let currentStroke = [];

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        timestamp: Date.now()
      };
    };

    const startDrawing = (e) => {
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      currentStroke = [{ x: pos.x, y: pos.y, t: pos.timestamp, width: 2.5 }];

      // Visual feedback
      if (container) {
        container.classList.add('drawing');
      }
    };

    const draw = (e) => {
      if (!isDrawing) return;

      const pos = getPos(e);
      currentStroke.push({ x: pos.x, y: pos.y, t: pos.timestamp, width: 2.5 });

      // Calculate velocity for variable stroke width
      const dx = pos.x - lastX;
      const dy = pos.y - lastY;
      const dt = pos.timestamp - (currentStroke[currentStroke.length - 2]?.t || pos.timestamp);
      const velocity = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 1);

      // Adjust line width based on velocity (faster = thinner)
      const baseWidth = 2.5;
      const minWidth = 1.5;
      const maxWidth = 4;
      const velocityFactor = Math.min(velocity / 5, 1);
      const lineWidth = Math.max(minWidth, Math.min(maxWidth, baseWidth - velocityFactor * 1.5));
      currentStroke[currentStroke.length - 1].width = lineWidth;

      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      lastX = pos.x;
      lastY = pos.y;
    };

    const stopDrawing = () => {
      isDrawing = false;
      if (currentStroke.length > 1) {
        const canvasData = state.signatureCanvases.get(fieldId);
        if (canvasData) {
          canvasData.strokes.push(currentStroke.map(point => ({ ...point })));
          canvasData.redoStack = [];
        }
        syncDrawnSignatureTransientPreview(fieldId);
      }
      currentStroke = [];

      // Remove visual feedback
      if (container) {
        container.classList.remove('drawing');
      }
    };

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events with proper prevention
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startDrawing(e);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      e.stopPropagation();
      draw(e);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopDrawing();
    }, { passive: false });

    canvas.addEventListener('touchcancel', stopDrawing);

    // Prevent scroll/zoom while drawing
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());
    canvas.addEventListener('gesturechange', (e) => e.preventDefault());
    canvas.addEventListener('gestureend', (e) => e.preventDefault());

    state.signatureCanvases.set(fieldId, {
      canvas,
      ctx,
      dpr,
      drawWidth: rect.width,
      drawHeight: rect.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: '',
      baseImage: null,
    });
    hydratePersistedDrawnImage(fieldId);
  }

  function hydratePersistedDrawnImage(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    const fieldData = state.fieldState.get(fieldId);
    if (!canvasData || !fieldData) return;

    const dataUrl = resolvePersistedDrawnDataUrl(fieldData);
    if (!dataUrl) return;
    setSignatureBaseImage(fieldId, dataUrl, { clearStrokes: true }).catch(() => {});
  }

  async function setSignatureBaseImage(fieldId, dataUrl, options = { clearStrokes: false }) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData) return false;
    const normalized = String(dataUrl || '').trim();
    if (!normalized) {
      canvasData.baseImageDataUrl = '';
      canvasData.baseImage = null;
      if (options.clearStrokes) {
        canvasData.strokes = [];
        canvasData.redoStack = [];
      }
      redrawSignatureCanvas(fieldId);
      return true;
    }

    const { drawWidth, drawHeight } = canvasData;
    const img = new Image();
    return await new Promise((resolve) => {
      img.onload = () => {
        if (options.clearStrokes) {
          canvasData.strokes = [];
          canvasData.redoStack = [];
        }
        canvasData.baseImage = img;
        canvasData.baseImageDataUrl = normalized;
        if (drawWidth > 0 && drawHeight > 0) {
          redrawSignatureCanvas(fieldId);
        }
        resolve(true);
      };
      img.onerror = () => resolve(false);
      img.src = normalized;
    });
  }

  function redrawSignatureCanvas(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData) return;
    const { ctx, drawWidth, drawHeight, baseImage, strokes } = canvasData;
    ctx.clearRect(0, 0, drawWidth, drawHeight);

    if (baseImage) {
      const scale = Math.min(drawWidth / baseImage.width, drawHeight / baseImage.height);
      const width = baseImage.width * scale;
      const height = baseImage.height * scale;
      const x = (drawWidth - width) / 2;
      const y = (drawHeight - height) / 2;
      ctx.drawImage(baseImage, x, y, width, height);
    }

    for (const stroke of strokes) {
      for (let i = 1; i < stroke.length; i++) {
        const prev = stroke[i - 1];
        const curr = stroke[i];
        ctx.lineWidth = Number(curr.width || 2.5) || 2.5;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
    }
  }

  function undoSignatureCanvas(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData || canvasData.strokes.length === 0) return;
    const stroke = canvasData.strokes.pop();
    if (stroke) {
      canvasData.redoStack.push(stroke);
    }
    redrawSignatureCanvas(fieldId);
    syncDrawnSignatureTransientPreview(fieldId);
  }

  function redoSignatureCanvas(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData || canvasData.redoStack.length === 0) return;
    const stroke = canvasData.redoStack.pop();
    if (stroke) {
      canvasData.strokes.push(stroke);
    }
    redrawSignatureCanvas(fieldId);
    syncDrawnSignatureTransientPreview(fieldId);
  }

  function hasSignatureCanvasContent(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData) return false;
    if ((canvasData.baseImageDataUrl || '').trim()) return true;
    if (canvasData.strokes.length > 0) return true;
    const { canvas, ctx } = canvasData;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData.data.some((val, i) => i % 4 === 3 && val > 0);
  }

  function syncDrawnSignatureTransientPreview(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (!canvasData) return;
    if (hasSignatureCanvasContent(fieldId)) {
      setTransientFieldSignaturePreview(fieldId, canvasData.canvas.toDataURL('image/png'));
    } else {
      clearTransientFieldPreview(fieldId);
    }
    requestOverlayRender();
  }

  function clearSignatureCanvas(fieldId) {
    const canvasData = state.signatureCanvases.get(fieldId);
    if (canvasData) {
      canvasData.strokes = [];
      canvasData.redoStack = [];
      canvasData.baseImage = null;
      canvasData.baseImageDataUrl = '';
      redrawSignatureCanvas(fieldId);
    }
    clearTransientFieldPreview(fieldId);
    requestOverlayRender();
    const uploadPreviewWrap = document.getElementById('sig-upload-preview-wrap');
    const uploadPreview = document.getElementById('sig-upload-preview');
    if (uploadPreviewWrap) {
      uploadPreviewWrap.classList.add('hidden');
    }
    if (uploadPreview) {
      uploadPreview.removeAttribute('src');
    }
  }

  function closeFieldEditor() {
    const editorOverlay = document.getElementById('field-editor-overlay');
    const fieldEditor = editorOverlay.querySelector('.field-editor');

    // Release focus trap before hiding
    releaseFocusTrap(fieldEditor);

    editorOverlay.classList.remove('active');
    editorOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Restore focus to the active field button
    if (state.activeFieldId) {
      const fieldButton = document.querySelector(`.field-list-item[data-field-id="${state.activeFieldId}"]`);
      requestAnimationFrame(() => {
        fieldButton?.focus();
      });
    }

    clearAllTransientFieldPreviews();
    requestOverlayRender();

    state.activeFieldId = null;
    renderReviewPanel();

    // Clean up canvas reference
    state.signatureCanvases.clear();

    // Announce to screen readers
    announceToScreenReader('Field editor closed.');
  }

  // ============================================
  // Field Saving
  // ============================================
  function secondsUntil(timestampMs) {
    const ts = Number(timestampMs) || 0;
    if (ts <= 0) return 0;
    return Math.max(0, Math.ceil((ts - Date.now()) / 1000));
  }

  function parseRetryAfterSeconds(response, details = {}) {
    const detailSeconds = Number(details.retry_after_seconds);
    if (Number.isFinite(detailSeconds) && detailSeconds > 0) {
      return Math.ceil(detailSeconds);
    }
    const header = String(response?.headers?.get?.('Retry-After') || '').trim();
    if (!header) return 0;
    const parsed = Number(header);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.ceil(parsed);
    }
    return 0;
  }

  async function parseAPIErrorResponse(response, fallbackMessage) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }
    const envelope = payload?.error || {};
    const details = envelope?.details && typeof envelope.details === 'object' ? envelope.details : {};
    const retryAfterSeconds = parseRetryAfterSeconds(response, details);
    const rateLimited = response?.status === 429;
    const message = rateLimited
      ? (retryAfterSeconds > 0
          ? `Too many actions too quickly. Please wait ${retryAfterSeconds}s and try again.`
          : 'Too many actions too quickly. Please wait and try again.')
      : String(envelope?.message || fallbackMessage || 'Request failed');
    const error = new Error(message);
    error.status = response?.status || 0;
    error.code = String(envelope?.code || '');
    error.details = details;
    error.rateLimited = rateLimited;
    error.retryAfterSeconds = retryAfterSeconds;
    return error;
  }

  function applyWriteCooldown(retryAfterSeconds) {
    const seconds = Math.max(1, Number(retryAfterSeconds) || 1);
    state.writeCooldownUntil = Date.now() + (seconds * 1000);
    if (state.writeCooldownTimer) {
      clearInterval(state.writeCooldownTimer);
      state.writeCooldownTimer = null;
    }
    const tick = () => {
      const saveBtn = document.getElementById('field-editor-save');
      if (!saveBtn) return;
      const remaining = secondsUntil(state.writeCooldownUntil);
      if (remaining <= 0) {
        if (!state.pendingSaves.has(state.activeFieldId || '')) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Insert';
        }
        if (state.writeCooldownTimer) {
          clearInterval(state.writeCooldownTimer);
          state.writeCooldownTimer = null;
        }
        return;
      }
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${remaining}s`;
    };
    tick();
    state.writeCooldownTimer = setInterval(tick, 250);
  }

  function applySubmitCooldown(retryAfterSeconds) {
    const seconds = Math.max(1, Number(retryAfterSeconds) || 1);
    state.submitCooldownUntil = Date.now() + (seconds * 1000);
    if (state.submitCooldownTimer) {
      clearInterval(state.submitCooldownTimer);
      state.submitCooldownTimer = null;
    }
    const tick = () => {
      const remaining = secondsUntil(state.submitCooldownUntil);
      updateSubmitButton();
      if (remaining <= 0 && state.submitCooldownTimer) {
        clearInterval(state.submitCooldownTimer);
        state.submitCooldownTimer = null;
      }
    };
    tick();
    state.submitCooldownTimer = setInterval(tick, 250);
  }

  async function saveFieldFromEditor() {
    if (!signingInteractionsEnabled()) {
      announceToScreenReader('This review session cannot modify signing fields.', 'assertive');
      return;
    }
    const fieldId = state.activeFieldId;
    if (!fieldId) return;

    const fieldData = state.fieldState.get(fieldId);
    if (!fieldData) return;

    const writeCooldownSeconds = secondsUntil(state.writeCooldownUntil);
    if (writeCooldownSeconds > 0) {
      const message = `Please wait ${writeCooldownSeconds}s before saving again.`;
      if (window.toastManager) {
        window.toastManager.error(message);
      }
      announceToScreenReader(message, 'assertive');
      return;
    }

    const saveBtn = document.getElementById('field-editor-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';

    try {
      state.profileRemember = readRememberPreferenceFromEditor();
      let success = false;

      if (fieldData.type === 'signature' || fieldData.type === 'initials') {
        success = await saveSignatureField(fieldId);
      } else if (fieldData.type === 'checkbox') {
        const checkbox = document.getElementById('field-checkbox-input');
        success = await saveFieldValue(fieldId, null, checkbox?.checked || false);
      } else {
        const input = document.getElementById('field-text-input') || document.getElementById('sig-type-input');
        const value = input?.value?.trim() || '';

        if (!value && fieldData.required) {
          throw new Error('This field is required');
        }

        success = await saveFieldValue(fieldId, value, null);
      }

      if (success) {
        closeFieldEditor();
        updateProgress();
        updateSubmitButton();
        updateA11yFieldProgress();
        renderFieldOverlays();
        updateFieldListItem(fieldId);
        guideToNextRequiredField(fieldId);

        // Announce progress to screen readers
        const progress = calculateA11yProgress();
        if (progress.allRequiredComplete) {
          announceToScreenReader('Field saved. All required fields complete. Ready to submit.');
        } else {
          announceToScreenReader(`Field saved. ${progress.remainingRequired} required field${progress.remainingRequired > 1 ? 's' : ''} remaining.`);
        }
      }
    } catch (error) {
      if (error?.rateLimited) {
        applyWriteCooldown(error.retryAfterSeconds);
      }
      if (window.toastManager) {
        window.toastManager.error(error.message);
      }

      // Announce error to screen readers
      announceToScreenReader(`Error saving field: ${error.message}`, 'assertive');
    } finally {
      if (secondsUntil(state.writeCooldownUntil) > 0) {
        const remaining = secondsUntil(state.writeCooldownUntil);
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${remaining}s`;
      } else {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Insert';
      }
    }
  }

  async function saveSignatureField(fieldId) {
    const fieldData = state.fieldState.get(fieldId);
    const typeInput = document.getElementById('sig-type-input');
    const activeTab = resolveSignatureTab(fieldId);
    const usesCanvasMode = activeTab === 'draw' || activeTab === 'upload' || activeTab === 'saved';

    if (usesCanvasMode) {
      const canvasData = state.signatureCanvases.get(fieldId);
      if (!canvasData) return false;

      if (!hasSignatureCanvasContent(fieldId)) {
        throw new Error(fieldData?.type === 'initials' ? 'Please draw your initials' : 'Please draw your signature');
      }
      const dataUrl = canvasData.canvas.toDataURL('image/png');
      return await saveSignatureArtifact(fieldId, { type: 'drawn', dataUrl }, fieldData?.type === 'initials' ? '[Drawn Initials]' : '[Drawn]');
    } else {
      const value = typeInput?.value?.trim();
      if (!value) {
        throw new Error(fieldData?.type === 'initials' ? 'Please type your initials' : 'Please type your signature');
      }

      if (fieldData.type === 'initials') {
        return await saveFieldValue(fieldId, value, null);
      }

      return await saveSignatureArtifact(fieldId, { type: 'typed', text: value }, value);
    }
  }

  async function saveFieldValue(fieldId, valueText, valueBool) {
    if (!signingInteractionsEnabled()) {
      throw new Error('This review session cannot modify signing fields');
    }
    state.pendingSaves.add(fieldId);
    const saveStartTime = Date.now();
    const fieldData = state.fieldState.get(fieldId);

    try {
      const response = await fetch(`${unifiedConfig.apiBasePath}/field-values/${unifiedConfig.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_instance_id: fieldId,
          value_text: valueText,
          value_bool: valueBool
        })
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to save field');
      }

      // Update local state
      const fieldData = state.fieldState.get(fieldId);
      if (fieldData) {
        fieldData.value = valueText ?? valueBool;
        fieldData.completed = true;
        fieldData.hasError = false;
      }

      await persistProfileFromField(fieldData);

      if (window.toastManager) {
        window.toastManager.success('Field saved');
      }

      // Track successful field save
      telemetry.trackFieldSave(fieldId, fieldData?.type, true, Date.now() - saveStartTime);

      return true;
    } catch (error) {
      const fd = state.fieldState.get(fieldId);
      if (fd) {
        fd.hasError = true;
        fd.lastError = error.message;
      }

      // Track failed field save
      telemetry.trackFieldSave(fieldId, fieldData?.type, false, Date.now() - saveStartTime, error.message);

      throw error;
    } finally {
      state.pendingSaves.delete(fieldId);
    }
  }

  async function saveSignatureArtifact(fieldId, signatureData, valueText) {
    if (!signingInteractionsEnabled()) {
      throw new Error('This review session cannot modify signing fields');
    }
    state.pendingSaves.add(fieldId);
    const saveStartTime = Date.now();
    const signatureType = signatureData?.type || 'typed';

    try {
      let payload;

      if (signatureType === 'drawn') {
        // Task 19.FE.1: Use signed upload contract flow for drawn signatures
        // 1. Request upload bootstrap token
        // 2. Upload binary to signed URL
        // 3. Attach with upload token
        const uploadResult = await signatureUploader.uploadDrawnSignature(
          fieldId,
          signatureData.dataUrl
        );

        payload = {
          field_instance_id: fieldId,
          type: 'drawn',
          value_text: valueText,
          object_key: uploadResult.objectKey,
          sha256: uploadResult.sha256,
          upload_token: uploadResult.uploadToken
        };
      } else {
        // Typed signatures continue to use direct attach flow
        payload = await buildTypedSignaturePayload(fieldId, valueText);
      }

      const response = await fetch(`${unifiedConfig.apiBasePath}/field-values/signature/${unifiedConfig.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to save signature');
      }

      // Update local state
      const fieldData = state.fieldState.get(fieldId);
      if (fieldData) {
        fieldData.value = valueText;
        fieldData.completed = true;
        fieldData.hasError = false;
        // Store signature preview URL for live preview in field overlays
        if (signatureData?.dataUrl) {
          fieldData.signaturePreviewUrl = signatureData.dataUrl;
        }
      }

      await persistProfileFromField(fieldData, {
        signatureType,
        signatureDataUrl: signatureData?.dataUrl,
      });

      if (window.toastManager) {
        window.toastManager.success('Signature applied');
      }

      // Track successful signature attach
      telemetry.trackSignatureAttach(fieldId, signatureType, true, Date.now() - saveStartTime);

      return true;
    } catch (error) {
      const fieldData = state.fieldState.get(fieldId);
      if (fieldData) {
        fieldData.hasError = true;
        fieldData.lastError = error.message;
      }

      // Track failed signature attach
      telemetry.trackSignatureAttach(fieldId, signatureType, false, Date.now() - saveStartTime, error.message);

      throw error;
    } finally {
      state.pendingSaves.delete(fieldId);
    }
  }

  /**
   * Build payload for typed signature attach (direct flow, no upload bootstrap)
   */
  async function buildTypedSignaturePayload(fieldId, valueText) {
    // Typed signatures use text-based hash
    const shaInput = `${valueText}|${fieldId}`;
    const sha256 = await sha256Hex(shaInput);

    // Object key for typed signatures
    const objectKey = `tenant/bootstrap/org/bootstrap/agreements/${unifiedConfig.agreementId}/signatures/${unifiedConfig.recipientId}/${fieldId}-${Date.now()}.txt`;

    return {
      field_instance_id: fieldId,
      type: 'typed',
      value_text: valueText,
      object_key: objectKey,
      sha256: sha256
      // Note: typed signatures do not require upload_token (v2)
    };
  }

  /**
   * SHA256 hex string from text input
   */
  async function sha256Hex(input) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const bytes = new TextEncoder().encode(input);
      const digest = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  }

  // ============================================
  // UI Updates
  // ============================================
  function updateProgress() {
    let completed = 0;
    let required = 0;

    state.fieldState.forEach(field => {
      if (field.required) required++;
      if (field.completed) completed++;
    });

    const total = state.fieldState.size;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    document.getElementById('completed-count').textContent = completed;
    document.getElementById('total-count').textContent = total;

    // Update progress ring
    const ring = document.getElementById('progress-ring-circle');
    const circumference = 97.4;
    const offset = circumference - (percentage / 100) * circumference;
    ring.style.strokeDashoffset = offset;

    // Update mobile progress bar
    document.getElementById('mobile-progress').style.width = `${percentage}%`;

    // Update status badge
    const remaining = total - completed;
    const statusEl = document.getElementById('fields-status');
    if (statusEl) {
      if (isReviewOnlySession()) {
        statusEl.textContent = hasReviewContext() ? reviewStatusLabel(state.reviewContext.status) : 'Review';
      } else if (hasReviewContext() && state.reviewContext.sign_blocked) {
        statusEl.textContent = 'Review blocked';
      } else {
        statusEl.textContent = remaining > 0 ? `${remaining} remaining` : 'All complete';
      }
    }
    updateSessionChrome();
  }

  function updateSubmitButton() {
    updateSessionChrome();
    const submitBtn = document.getElementById('submit-btn');
    const incompleteWarning = document.getElementById('incomplete-warning');
    const incompleteMessage = document.getElementById('incomplete-message');
    const submitCooldownSeconds = secondsUntil(state.submitCooldownUntil);

    let incompleteRequired = [];
    let hasErrors = false;

    state.fieldState.forEach((field, id) => {
      if (field.required && !field.completed) {
        incompleteRequired.push(field);
      }
      if (field.hasError) hasErrors = true;
    });

    const reviewBlocked = Boolean(state.reviewContext?.sign_blocked);
    const canSubmit = state.canSignSession &&
      state.hasConsented &&
      incompleteRequired.length === 0 &&
      !hasErrors &&
      !reviewBlocked &&
      state.pendingSaves.size === 0 &&
      submitCooldownSeconds === 0 &&
      !state.isSubmitting;

    submitBtn.disabled = !canSubmit;
    if (!state.isSubmitting && submitCooldownSeconds > 0) {
      submitBtn.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${submitCooldownSeconds}s`;
    } else if (!state.isSubmitting && submitCooldownSeconds === 0) {
      submitBtn.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature';
    }

    if (!state.hasConsented) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = 'Please accept the consent agreement';
    } else if (submitCooldownSeconds > 0) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = `Please wait ${submitCooldownSeconds}s before submitting again.`;
    } else if (!state.canSignSession) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = 'This session cannot submit signatures.';
    } else if (reviewBlocked) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = state.reviewContext?.sign_block_reason || 'Signing is blocked until review completes.';
    } else if (hasErrors) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = 'Some fields failed to save. Please retry.';
    } else if (incompleteRequired.length > 0) {
      incompleteWarning.classList.remove('hidden');
      incompleteMessage.textContent = `Complete ${incompleteRequired.length} required field${incompleteRequired.length > 1 ? 's' : ''}`;
    } else {
      incompleteWarning.classList.add('hidden');
    }
  }

  function updateFieldListItem(fieldId) {
    const fieldData = state.fieldState.get(fieldId);
    const listItem = document.querySelector(`.field-list-item[data-field-id="${fieldId}"]`);

    if (!listItem || !fieldData) return;

    if (fieldData.completed) {
      listItem.classList.add('completed');
      listItem.classList.remove('error');

      const icon = listItem.querySelector('.w-8');
      icon.classList.remove('bg-gray-100', 'text-gray-500', 'bg-red-100', 'text-red-600');
      icon.classList.add('bg-green-100', 'text-green-600');
      icon.innerHTML = '<i class="iconoir-check"></i>';
    } else if (fieldData.hasError) {
      listItem.classList.remove('completed');
      listItem.classList.add('error');

      const icon = listItem.querySelector('.w-8');
      icon.classList.remove('bg-gray-100', 'text-gray-500', 'bg-green-100', 'text-green-600');
      icon.classList.add('bg-red-100', 'text-red-600');
      icon.innerHTML = '<i class="iconoir-warning-circle"></i>';
    }
  }

  function sortedRequiredFields() {
    const fields = Array.from(state.fieldState.values()).filter((field) => field.required);
    fields.sort((left, right) => {
      const leftPage = Number(left.page || 0);
      const rightPage = Number(right.page || 0);
      if (leftPage !== rightPage) return leftPage - rightPage;
      const leftTab = Number(left.tabIndex || 0);
      const rightTab = Number(right.tabIndex || 0);
      if (leftTab > 0 && rightTab > 0 && leftTab !== rightTab) return leftTab - rightTab;
      if ((leftTab > 0) !== (rightTab > 0)) return leftTab > 0 ? -1 : 1;
      const leftY = Number(left.posY || 0);
      const rightY = Number(right.posY || 0);
      if (leftY !== rightY) return leftY - rightY;
      const leftX = Number(left.posX || 0);
      const rightX = Number(right.posX || 0);
      if (leftX !== rightX) return leftX - rightX;
      return String(left.id || '').localeCompare(String(right.id || ''));
    });
    return fields;
  }

  function highlightGuidedTarget(fieldId) {
    state.guidedTargetFieldId = fieldId;
    document.querySelectorAll('.field-list-item').forEach(el => el.classList.remove('guided-next-target'));
    document.querySelectorAll('.field-overlay').forEach(el => el.classList.remove('guided-next-target'));
    document.querySelector(`.field-list-item[data-field-id="${fieldId}"]`)?.classList.add('guided-next-target');
    document.querySelector(`.field-overlay[data-field-id="${fieldId}"]`)?.classList.add('guided-next-target');
  }

  function guideToNextRequiredField(currentFieldId) {
    const orderedRequired = sortedRequiredFields();
    const remaining = orderedRequired.filter((field) => !field.completed);
    if (remaining.length === 0) {
      telemetry.track('guided_next_none_remaining', { fromFieldId: currentFieldId });
      const submitBtn = document.getElementById('submit-btn');
      submitBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      submitBtn?.focus();
      announceToScreenReader('All required fields are complete. Review the document and submit when ready.');
      return;
    }

    const currentIndex = orderedRequired.findIndex((field) => String(field.id) === String(currentFieldId));
    let nextField = null;
    if (currentIndex >= 0) {
      for (let i = currentIndex + 1; i < orderedRequired.length; i++) {
        if (!orderedRequired[i].completed) {
          nextField = orderedRequired[i];
          break;
        }
      }
    }
    if (!nextField) {
      nextField = remaining[0];
    }
    if (!nextField) return;

    telemetry.track('guided_next_started', { fromFieldId: currentFieldId, toFieldId: nextField.id });

    const nextPage = Number(nextField.page || 1);
    if (nextPage !== state.currentPage) {
      goToPage(nextPage);
    }

    focusField(nextField.id, { openEditor: false });
    highlightGuidedTarget(nextField.id);

    setTimeout(() => {
      highlightGuidedTarget(nextField.id);
      scrollFieldIntoView(nextField.id);
      telemetry.track('guided_next_completed', { toFieldId: nextField.id, page: nextField.page });
      announceToScreenReader(`Next required field highlighted on page ${nextField.page}.`);
    }, 120);
  }

  // ============================================
  // Consent Management
  // ============================================
  function showConsentModal() {
    if (!signingInteractionsEnabled()) {
      return;
    }
    const consentModal = document.getElementById('consent-modal');
    consentModal.classList.add('active');
    consentModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trap focus in modal
    trapFocusInModal(consentModal.querySelector('.field-editor'));

    // Announce to screen readers
    announceToScreenReader('Electronic signature consent dialog opened. Please review and accept to continue.', 'assertive');
  }

  function hideConsentModal() {
    const consentModal = document.getElementById('consent-modal');
    const modalContent = consentModal.querySelector('.field-editor');

    // Release focus trap
    releaseFocusTrap(modalContent);

    consentModal.classList.remove('active');
    consentModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Announce to screen readers
    announceToScreenReader('Consent dialog closed.');
  }

  async function acceptConsent() {
    if (!signingInteractionsEnabled()) {
      return;
    }
    const acceptBtn = document.getElementById('consent-accept-btn');
    acceptBtn.disabled = true;
    acceptBtn.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';

    try {
      const response = await fetch(`${unifiedConfig.apiBasePath}/consent/${unifiedConfig.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accepted: true })
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to accept consent');
      }

      state.hasConsented = true;
      document.getElementById('consent-notice').classList.add('hidden');
      hideConsentModal();
      updateSubmitButton();
      updateA11yFieldProgress();

      // Track consent acceptance
      telemetry.trackConsent(true);

      if (window.toastManager) {
        window.toastManager.success('Consent accepted');
      }

      // Announce to screen readers
      announceToScreenReader('Consent accepted. You can now complete the fields and submit.');
    } catch (error) {
      if (window.toastManager) {
        window.toastManager.error(error.message);
      }

      // Announce error to screen readers
      announceToScreenReader(`Error: ${error.message}`, 'assertive');
    } finally {
      acceptBtn.disabled = false;
      acceptBtn.innerHTML = 'Accept & Continue';
    }
  }

  // ============================================
  // Submit and Decline
  // ============================================
  async function handleSubmit() {
    if (!state.canSignSession || state.reviewContext?.sign_blocked) {
      updateSubmitButton();
      return;
    }
    const submitBtn = document.getElementById('submit-btn');
    const cooldownSeconds = secondsUntil(state.submitCooldownUntil);
    if (cooldownSeconds > 0) {
      if (window.toastManager) {
        window.toastManager.error(`Please wait ${cooldownSeconds}s before submitting again.`);
      }
      updateSubmitButton();
      return;
    }
    state.isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';

    try {
      const idempotencyKey = `submit-${unifiedConfig.recipientId}-${Date.now()}`;

      const response = await fetch(`${unifiedConfig.apiBasePath}/submit/${unifiedConfig.token}`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey }
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to submit');
      }

      // Track successful submit
      telemetry.trackSubmit(true);

      // Redirect to completion page
      window.location.href = `${unifiedConfig.signerBasePath}/${unifiedConfig.token}/complete`;
    } catch (error) {
      // Track failed submit
      telemetry.trackSubmit(false, error.message);
      if (error?.rateLimited) {
        applySubmitCooldown(error.retryAfterSeconds);
      }

      if (window.toastManager) {
        window.toastManager.error(error.message);
      }
    } finally {
      state.isSubmitting = false;
      updateSubmitButton();
    }
  }

  function showDeclineModal() {
    if (!signingInteractionsEnabled()) {
      return;
    }
    const declineModal = document.getElementById('decline-modal');
    declineModal.classList.add('active');
    declineModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Trap focus in modal
    trapFocusInModal(declineModal.querySelector('.field-editor'));

    // Announce to screen readers
    announceToScreenReader('Decline to sign dialog opened. Are you sure you want to decline?', 'assertive');
  }

  function hideDeclineModal() {
    const declineModal = document.getElementById('decline-modal');
    const modalContent = declineModal.querySelector('.field-editor');

    // Release focus trap
    releaseFocusTrap(modalContent);

    declineModal.classList.remove('active');
    declineModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    // Announce to screen readers
    announceToScreenReader('Decline dialog closed.');
  }

  async function confirmDecline() {
    if (!signingInteractionsEnabled()) {
      return;
    }
    const reason = document.getElementById('decline-reason').value;

    try {
      const response = await fetch(`${unifiedConfig.apiBasePath}/decline/${unifiedConfig.token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        throw await parseAPIErrorResponse(response, 'Failed to decline');
      }

      window.location.href = `${unifiedConfig.signerBasePath}/${unifiedConfig.token}/declined`;
    } catch (error) {
      if (window.toastManager) {
        window.toastManager.error(error.message);
      }
    }
  }

  // ============================================
  // Viewer Error Handling
  // ============================================
  function showViewerError() {
    // Track viewer failure
    telemetry.trackDegradedMode('viewer_load_failure');
    telemetry.trackViewerCriticalError('viewer_load_failed');

    if (window.toastManager) {
      window.toastManager.error('Unable to load the document viewer. Please refresh the page or contact the sender for assistance.', {
        duration: 15000,
        action: {
          label: 'Refresh',
          onClick: () => window.location.reload()
        }
      });
    }
  }

  // Download document - only use binary asset URLs, never contract_url (which returns JSON)
  async function downloadDocument() {
    try {
      const assetsResponse = await fetch(assetsContractPath());
      if (!assetsResponse.ok) throw new Error('Document unavailable');

      const assetsData = await assetsResponse.json();
      const assets = assetsData.assets || {};

      // Only use concrete binary asset URLs - never fall back to contract_url which is JSON
      const downloadUrl = resolveBinaryAssetUrl(assets);

      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
      } else {
        throw new Error('Document download is not available yet. The document may still be processing.');
      }
    } catch (error) {
      if (window.toastManager) {
        window.toastManager.error(error.message || 'Unable to download document');
      }
    }
  }

  // ============================================
  // Debug/Operator Affordances
  // ============================================
  const debugMode = {
    enabled: localStorage.getItem('esign_debug') === 'true' || new URLSearchParams(window.location.search).has('debug'),
    panel: null,

    /**
     * Initialize debug mode if enabled
     */
    init() {
      if (!this.enabled) return;

      this.createDebugPanel();
      this.bindConsoleHelpers();
      this.logSessionInfo();

      console.info('%c[E-Sign Debug] Debug mode enabled. Access window.esignDebug for helpers.', 'color: #3b82f6; font-weight: bold');
    },

    /**
     * Create floating debug panel
     */
    createDebugPanel() {
      this.panel = document.createElement('div');
      this.panel.id = 'esign-debug-panel';
      this.panel.innerHTML = `
        <style>
          #esign-debug-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-height: 400px;
            background: #1f2937;
            color: #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            font-family: monospace;
            font-size: 11px;
            z-index: 9999;
            overflow: hidden;
          }
          #esign-debug-panel.collapsed {
            width: 44px;
            height: 44px;
            border-radius: 22px;
          }
          #esign-debug-panel.collapsed .debug-content {
            display: none;
          }
          #esign-debug-panel .debug-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #111827;
            cursor: pointer;
          }
          #esign-debug-panel.collapsed .debug-header {
            justify-content: center;
            padding: 10px;
          }
          #esign-debug-panel .debug-content {
            padding: 12px;
            max-height: 340px;
            overflow-y: auto;
          }
          #esign-debug-panel .debug-section {
            margin-bottom: 12px;
          }
          #esign-debug-panel .debug-label {
            color: #9ca3af;
            margin-bottom: 4px;
          }
          #esign-debug-panel .debug-value {
            color: #10b981;
          }
          #esign-debug-panel .debug-value.warning {
            color: #f59e0b;
          }
          #esign-debug-panel .debug-value.error {
            color: #ef4444;
          }
          #esign-debug-panel .debug-btn {
            padding: 4px 8px;
            background: #374151;
            border: none;
            border-radius: 4px;
            color: #e5e7eb;
            cursor: pointer;
            font-size: 10px;
          }
          #esign-debug-panel .debug-btn:hover {
            background: #4b5563;
          }
        </style>
        <div class="debug-header" data-esign-action="debug-toggle-panel">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">🔧</span>
            <span class="debug-title">Debug Panel</span>
          </span>
          <span class="debug-toggle">−</span>
        </div>
        <div class="debug-content">
          <div class="debug-section">
            <div class="debug-label">Flow Mode</div>
            <div class="debug-value" id="debug-flow-mode">${unifiedConfig.flowMode}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Session</div>
            <div class="debug-value" id="debug-session-id">${telemetry.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${state.hasConsented ? '✓ Accepted' : '✗ Pending'}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${state.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${state.isLowMemory ? '⚠ Low Memory' : 'Normal'}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${state.renderedPages?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Actions</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="debug-btn" data-esign-action="debug-copy-session">Copy Info</button>
              <button type="button" class="debug-btn" data-esign-action="debug-clear-cache">Clear Cache</button>
              <button type="button" class="debug-btn" data-esign-action="debug-show-telemetry">View Telemetry</button>
              <button type="button" class="debug-btn" data-esign-action="debug-reload-viewer">Reload Viewer</button>
            </div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Errors</div>
            <div class="debug-value" id="debug-errors" style="color: inherit;">None</div>
          </div>
        </div>
      `;
      document.body.appendChild(this.panel);

      // Update panel periodically
      setInterval(() => this.updatePanel(), 1000);
    },

    /**
     * Toggle debug panel collapsed state
     */
    togglePanel() {
      if (!this.panel) return;
      this.panel.classList.toggle('collapsed');
      const toggle = this.panel.querySelector('.debug-toggle');
      const title = this.panel.querySelector('.debug-title');
      if (this.panel.classList.contains('collapsed')) {
        toggle.textContent = '+';
        title.style.display = 'none';
      } else {
        toggle.textContent = '−';
        title.style.display = 'inline';
      }
    },

    /**
     * Update debug panel values
     */
    updatePanel() {
      if (!this.panel || this.panel.classList.contains('collapsed')) return;

      const fields = state.fieldState;
      let completed = 0;
      fields?.forEach(f => { if (f.completed) completed++; });

      document.getElementById('debug-consent').textContent = state.hasConsented ? '✓ Accepted' : '✗ Pending';
      document.getElementById('debug-consent').className = `debug-value ${state.hasConsented ? '' : 'warning'}`;
      document.getElementById('debug-fields').textContent = `${completed}/${fields?.size || 0}`;
      document.getElementById('debug-cached').textContent = state.renderedPages?.size || 0;
      document.getElementById('debug-memory').textContent = state.isLowMemory ? '⚠ Low Memory' : 'Normal';
      document.getElementById('debug-memory').className = `debug-value ${state.isLowMemory ? 'warning' : ''}`;

      const errors = telemetry.metrics.errorsEncountered;
      document.getElementById('debug-errors').textContent = errors.length > 0 ? `${errors.length} error(s)` : 'None';
      document.getElementById('debug-errors').className = `debug-value ${errors.length > 0 ? 'error' : ''}`;
    },

    /**
     * Bind console helper functions
     */
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: {
            ...unifiedConfig,
            token: '[redacted]'
          },
          state: {
            currentPage: state.currentPage,
            zoomLevel: state.zoomLevel,
            hasConsented: state.hasConsented,
            activeFieldId: state.activeFieldId,
            isLowMemory: state.isLowMemory,
            cachedPages: state.renderedPages?.size || 0
          },
          fields: Array.from(state.fieldState?.entries() || []).map(([id, f]) => ({
            id,
            type: f.type,
            completed: f.completed,
            hasError: f.hasError
          })),
          telemetry: telemetry.getSessionSummary(),
          errors: telemetry.metrics.errorsEncountered
        }),

        getEvents: () => telemetry.events,

        forceError: (msg) => {
          telemetry.track('debug_forced_error', { message: msg });
          console.error('[E-Sign Debug] Forced error:', msg);
        },

        reloadViewer: () => {
          console.log('[E-Sign Debug] Reloading viewer...');
          loadPdfDocument();
        },

        setLowMemory: (value) => {
          state.isLowMemory = value;
          managePagesCache();
          console.log(`[E-Sign Debug] Low memory mode: ${value}`);
        }
      };
    },

    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group('%c[E-Sign Debug] Session Info', 'color: #3b82f6');
      console.log('Flow Mode:', unifiedConfig.flowMode);
      console.log('Agreement ID:', unifiedConfig.agreementId);
      console.log('Session ID:', telemetry.sessionId);
      console.log('Fields:', state.fieldState?.size || 0);
      console.log('Low Memory:', state.isLowMemory);
      console.groupEnd();
    },

    /**
     * Copy session info to clipboard
     */
    async copySessionInfo() {
      const info = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(info);
        alert('Session info copied to clipboard');
      } catch (e) {
        console.log('Session Info:', info);
        alert('Check console for session info');
      }
    },

    /**
     * Reload the PDF viewer
     */
    reloadViewer() {
      console.log('[E-Sign Debug] Reloading PDF viewer...');
      loadPdfDocument();
      this.updatePanel();
    },

    /**
     * Clear page cache
     */
    clearCache() {
      state.renderedPages?.clear();
      console.log('[E-Sign Debug] Page cache cleared');
      this.updatePanel();
    },

    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(telemetry.events);
      console.log('Session Summary:', telemetry.getSessionSummary());
    }
  };

  // ============================================
  // Accessibility Helpers
  // ============================================
  function announceToScreenReader(message, type = 'polite') {
    const region = type === 'assertive' ? document.getElementById('a11y-alerts') : document.getElementById('a11y-status');
    if (region) {
      // Clear and re-announce for proper reading
      region.textContent = '';
      requestAnimationFrame(() => {
        region.textContent = message;
      });
    }
  }

  function trapFocusInModal(modalElement) {
    const focusableSelectors = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = modalElement.querySelectorAll(focusableSelectors);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Store original focus to restore later
    if (!modalElement.dataset.previousFocus) {
      modalElement.dataset.previousFocus = document.activeElement?.id || '';
    }

    function handleTabKey(e) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    }

    modalElement.addEventListener('keydown', handleTabKey);
    modalElement._focusTrapHandler = handleTabKey;

    // Focus first element
    requestAnimationFrame(() => {
      firstFocusable?.focus();
    });
  }

  function releaseFocusTrap(modalElement) {
    if (modalElement._focusTrapHandler) {
      modalElement.removeEventListener('keydown', modalElement._focusTrapHandler);
      delete modalElement._focusTrapHandler;
    }

    // Restore previous focus
    const previousFocusId = modalElement.dataset.previousFocus;
    if (previousFocusId) {
      const previousElement = document.getElementById(previousFocusId);
      requestAnimationFrame(() => {
        previousElement?.focus();
      });
      delete modalElement.dataset.previousFocus;
    }
  }

  function updateA11yFieldProgress() {
    const progress = calculateA11yProgress();
    const statusSpan = document.getElementById('submit-status');
    if (statusSpan) {
      if (progress.allRequiredComplete && state.hasConsented) {
        statusSpan.textContent = 'All required fields complete. You can now submit.';
      } else if (!state.hasConsented) {
        statusSpan.textContent = 'Please accept the electronic signature consent before submitting.';
      } else {
        statusSpan.textContent = `Complete ${progress.remainingRequired} more required field${progress.remainingRequired > 1 ? 's' : ''} to enable submission.`;
      }
    }
  }

  function calculateA11yProgress() {
    let completed = 0;
    let required = 0;
    let remainingRequired = 0;

    state.fieldState.forEach(field => {
      if (field.required) required++;
      if (field.completed) completed++;
      if (field.required && !field.completed) remainingRequired++;
    });

    return {
      completed,
      required,
      remainingRequired,
      total: state.fieldState.size,
      allRequiredComplete: remainingRequired === 0
    };
  }

  function getNextFocusableField(currentFieldId, direction = 1) {
    const fieldIds = Array.from(state.fieldState.keys());
    const currentIndex = fieldIds.indexOf(currentFieldId);
    if (currentIndex === -1) return null;

    const nextIndex = currentIndex + direction;
    if (nextIndex >= 0 && nextIndex < fieldIds.length) {
      return fieldIds[nextIndex];
    }
    return null;
  }

  // ============================================
  // Keyboard Handlers
  // ============================================
  document.addEventListener('keydown', function(e) {
    // Escape closes modals
    if (e.key === 'Escape') {
      closeFieldEditor();
      hideConsentModal();
      hideDeclineModal();
      hideReviewDecisionModal();
    }

    if (e.target instanceof HTMLElement && e.target.classList.contains('sig-editor-tab')) {
      const tabs = Array.from(document.querySelectorAll('.sig-editor-tab'));
      const currentIndex = tabs.indexOf(e.target);
      if (currentIndex !== -1) {
        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') nextIndex = 0;
        if (e.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex !== currentIndex) {
          e.preventDefault();
          const nextTab = tabs[nextIndex];
          const tabName = nextTab.getAttribute('data-tab') || 'draw';
          const fieldId = nextTab.getAttribute('data-field-id');
          if (fieldId) {
            switchSignatureTab(tabName, fieldId);
          }
          nextTab.focus();
          return;
        }
      }
    }

    // Arrow key navigation for panel tabs (combined signer+review mode)
    if (e.target instanceof HTMLElement && e.target.classList.contains('panel-tab')) {
      const tabs = Array.from(document.querySelectorAll('.panel-tab'));
      const currentIndex = tabs.indexOf(e.target);
      if (currentIndex !== -1) {
        let nextIndex = currentIndex;
        if (e.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        if (e.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') nextIndex = 0;
        if (e.key === 'End') nextIndex = tabs.length - 1;
        if (nextIndex !== currentIndex) {
          e.preventDefault();
          const nextTab = tabs[nextIndex];
          const tabName = nextTab.getAttribute('data-tab');
          if (tabName === 'sign' || tabName === 'review') {
            switchPanelTab(tabName);
          }
          nextTab.focus();
          return;
        }
      }
    }

    // Arrow key navigation in field list
    if (e.target instanceof HTMLElement && e.target.classList.contains('field-list-item')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const currentFieldId = e.target.dataset.fieldId;
        const direction = e.key === 'ArrowDown' ? 1 : -1;
        const nextFieldId = getNextFocusableField(currentFieldId, direction);

        if (nextFieldId) {
          const nextElement = document.querySelector(`.field-list-item[data-field-id="${nextFieldId}"]`);
          nextElement?.focus();
        }
      }

      // Enter/Space activates field
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const fieldId = e.target.dataset.fieldId;
        if (fieldId) {
          activateField(fieldId);
        }
      }
    }

    // Tab navigation hints in viewer
    if (e.key === 'Tab' && !e.target.closest('.field-editor-overlay') && !e.target.closest('#consent-modal') && !e.target.closest('#decline-modal')) {
      // Allow natural tab flow
    }
  });

  // Focus visible polyfill for older browsers
  document.addEventListener('mousedown', function() {
    document.body.classList.add('using-mouse');
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Tab') {
      document.body.classList.remove('using-mouse');
    }
  });
}

export class SignerReviewController {
  private readonly config: SignerReviewConfig;

  constructor(config: SignerReviewConfig) {
    this.config = config;
  }

  init(): void {
    bootstrapSignerReview(this.config);
  }

  destroy(): void {
    // Runtime currently uses event-driven globals and does not expose fine-grained teardown.
  }
}

export function initSignerReview(config: SignerReviewConfig): SignerReviewController {
  const controller = new SignerReviewController(config);
  onReady(() => controller.init());
  return controller;
}

function parseSignerReviewConfigScript(): SignerReviewConfig | null {
  const script = document.getElementById('esign-signer-review-config');
  if (!script) return null;
  try {
    const raw = JSON.parse(script.textContent || '{}');
    return (raw && typeof raw === 'object') ? (raw as SignerReviewConfig) : null;
  } catch {
    return null;
  }
}

if (typeof document !== 'undefined') {
  onReady(() => {
    const pageEl = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
    if (!pageEl) return;

    const parsed = parseSignerReviewConfigScript();
    if (!parsed) {
      console.warn('Missing signer review config script payload');
      return;
    }

    const controller = new SignerReviewController(parsed);
    controller.init();

    (window as any).esignSignerReviewController = controller;
  });
}
