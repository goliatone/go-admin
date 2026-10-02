// Authorized record state for one console identity. Applies snapshots by
// watermark and live events by identity-stream sequence, record revision and
// target generation. Foreign, stale or out-of-order input is rejected;
// invalidations (and gaps in contiguous mode) request snapshot recovery.

import type { ConsoleEvent, ConsoleIdentity, ConsoleRecord, ConsoleSnapshot } from './types.js';

export type ConsoleEventOutcome =
  | 'applied'
  | 'buffered'
  | 'duplicate'
  | 'stale'
  | 'foreign'
  | 'malformed'
  | 'gap'
  | 'invalidated';

export type ConsoleSnapshotOutcome = {
  ok: boolean;
  reason?: 'foreign' | 'malformed';
  /** Buffered events applied on top of the snapshot watermark. */
  replayed: number;
  /** Buffered input still leaves a gap or invalidation; fetch another snapshot. */
  needsRecovery: boolean;
};

/**
 * `monotonic` (default) accepts any newer sequence: the shared host filters
 * per-subscription delivery, so skipped sequences are expected and the host
 * itself sends invalidation plus a fresh snapshot when it loses events.
 * `contiguous` treats any skipped sequence as a gap that needs recovery.
 */
export type ConsoleSequenceMode = 'monotonic' | 'contiguous';

export type ConsoleRecordStoreOptions = {
  identity: ConsoleIdentity;
  sequenceMode?: ConsoleSequenceMode;
  /** Upper bound for events held while a snapshot is in flight. */
  maxBufferedEvents?: number;
  /** Upper bound for records retained per panel. */
  maxRecordsPerPanel?: number;
};

const DEFAULT_MAX_BUFFERED_EVENTS = 1000;
const DEFAULT_MAX_RECORDS_PER_PANEL = 500;
const EVENT_KINDS = new Set(['upsert', 'delete', 'invalidate']);
const IDENTITY_FIELDS: Array<keyof ConsoleIdentity> = [
  'console_id',
  'application_id',
  'environment_id',
  'actor_id',
  'scope_key',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Normalize a trusted identity; every field is compared verbatim after trim. */
export function normalizeConsoleIdentity(value: unknown): ConsoleIdentity {
  const source = isObject(value) ? value : {};
  return {
    console_id: text(source.console_id),
    application_id: text(source.application_id),
    environment_id: text(source.environment_id),
    actor_id: text(source.actor_id),
    scope_key: text(source.scope_key),
  };
}

/** True when every identity field of `value` equals `identity`. */
export function sameConsoleIdentity(identity: ConsoleIdentity, value: unknown): boolean {
  const other = normalizeConsoleIdentity(value);
  return IDENTITY_FIELDS.every((field) => identity[field] === other[field]);
}

function normalizeRecord(value: unknown): ConsoleRecord | null {
  if (!isObject(value)) {
    return null;
  }
  const key = text(value.record_key);
  if (!key) {
    return null;
  }
  const record: ConsoleRecord = {
    record_key: key,
    revision: finiteNumber(value.revision) ?? 0,
    data: value.data,
  };
  const target = text(value.target_id);
  if (target) {
    record.target_id = target;
  }
  const generation = finiteNumber(value.generation);
  if (generation !== null) {
    record.generation = generation;
  }
  return record;
}

function generationKey(panelId: string, target: string): string {
  return `${panelId}\u0000${target}`;
}

export class ConsoleRecordStore {
  private readonly identity: ConsoleIdentity;
  private readonly sequenceMode: ConsoleSequenceMode;
  private readonly maxBufferedEvents: number;
  private readonly maxRecordsPerPanel: number;
  private panels = new Map<string, Map<string, ConsoleRecord>>();
  private generations = new Map<string, number>();
  private lastSequence: number | null = null;
  private recovering = true;
  private buffer: ConsoleEvent[] = [];
  private bufferOverflowed = false;

  constructor(options: ConsoleRecordStoreOptions) {
    this.identity = normalizeConsoleIdentity(options.identity);
    this.sequenceMode = options.sequenceMode === 'contiguous' ? 'contiguous' : 'monotonic';
    this.maxBufferedEvents = Math.max(1, options.maxBufferedEvents ?? DEFAULT_MAX_BUFFERED_EVENTS);
    this.maxRecordsPerPanel = Math.max(1, options.maxRecordsPerPanel ?? DEFAULT_MAX_RECORDS_PER_PANEL);
  }

  /** Last applied stream sequence, or null before the first snapshot. */
  watermark(): number | null {
    return this.lastSequence;
  }

  /** True while events are held for an in-flight or required snapshot. */
  isRecovering(): boolean {
    return this.recovering;
  }

  /** Authorized panel IDs from the latest snapshot, in snapshot order. */
  panelIds(): string[] {
    return Array.from(this.panels.keys());
  }

  hasPanel(panelId: string): boolean {
    return this.panels.has(panelId);
  }

  /** Records for a panel in snapshot order, then insertion order. */
  records(panelId: string): ConsoleRecord[] {
    const records = this.panels.get(panelId);
    return records ? Array.from(records.values()) : [];
  }

  /** Hold incoming events until the next snapshot is applied. */
  beginRecovery(): void {
    this.recovering = true;
  }

  /** Drop every record, buffer and cursor (revocation, scope change, dispose). */
  clear(): void {
    this.panels.clear();
    this.generations.clear();
    this.lastSequence = null;
    this.buffer = [];
    this.bufferOverflowed = false;
    this.recovering = true;
  }

  applySnapshot(snapshot: ConsoleSnapshot): ConsoleSnapshotOutcome {
    if (!isObject(snapshot) || !Array.isArray(snapshot.panels)) {
      return { ok: false, reason: 'malformed', replayed: 0, needsRecovery: false };
    }
    const watermark = finiteNumber(snapshot.watermark);
    if (watermark === null || watermark < 0) {
      return { ok: false, reason: 'malformed', replayed: 0, needsRecovery: false };
    }
    if (!sameConsoleIdentity(this.identity, snapshot)) {
      return { ok: false, reason: 'foreign', replayed: 0, needsRecovery: false };
    }

    const panels = new Map<string, Map<string, ConsoleRecord>>();
    const generations = new Map<string, number>();
    for (const panel of snapshot.panels) {
      const id = isObject(panel) ? text(panel.id).toLowerCase() : '';
      if (!id || panels.has(id)) {
        continue;
      }
      const records = new Map<string, ConsoleRecord>();
      const items = Array.isArray((panel as { records?: unknown }).records)
        ? (panel as { records: unknown[] }).records
        : [];
      for (const item of items) {
        const record = normalizeRecord(item);
        if (!record) {
          continue;
        }
        records.delete(record.record_key);
        records.set(record.record_key, record);
        if (record.target_id && record.generation !== undefined) {
          const keyed = generationKey(id, record.target_id);
          generations.set(keyed, Math.max(generations.get(keyed) ?? record.generation, record.generation));
        }
      }
      trimRecords(records, this.maxRecordsPerPanel);
      panels.set(id, records);
    }

    this.panels = panels;
    this.generations = generations;
    this.lastSequence = watermark;
    this.recovering = false;

    const buffered = [...this.buffer].sort((a, b) => a.sequence - b.sequence);
    const overflowed = this.bufferOverflowed;
    this.buffer = [];
    this.bufferOverflowed = false;
    let replayed = 0;
    let needsRecovery = false;
    // After a gap or invalidation the store recovers again, so the remaining
    // tail is re-buffered for the next snapshot rather than dropped.
    for (const event of buffered) {
      const outcome = this.applyEvent(event);
      if (outcome === 'applied') {
        replayed += 1;
      } else if (outcome === 'gap' || outcome === 'invalidated') {
        needsRecovery = true;
      }
    }
    // Events dropped while the buffer was full cannot be proven to precede
    // the watermark; only a newer snapshot can.
    if (overflowed && !needsRecovery) {
      needsRecovery = true;
      this.recovering = true;
    }
    return { ok: true, replayed, needsRecovery };
  }

  applyEvent(event: ConsoleEvent): ConsoleEventOutcome {
    if (!isObject(event)) {
      return 'malformed';
    }
    const sequence = finiteNumber(event.sequence);
    const kind = text(event.kind);
    if (sequence === null || !EVENT_KINDS.has(kind)) {
      return 'malformed';
    }
    if (!sameConsoleIdentity(this.identity, event)) {
      return 'foreign';
    }
    if (kind === 'invalidate') {
      // Explicit invalidation (including server buffer overflow) always
      // recovers through an authorized snapshot; the snapshot watermark
      // decides which buffered events still apply.
      this.recovering = true;
      return 'invalidated';
    }
    if (this.recovering || this.lastSequence === null) {
      this.bufferEvent(event);
      return 'buffered';
    }
    if (sequence <= this.lastSequence) {
      return 'duplicate';
    }
    if (this.sequenceMode === 'contiguous' && sequence > this.lastSequence + 1) {
      this.recovering = true;
      this.bufferEvent(event);
      return 'gap';
    }
    // The sequence is consumed whatever the record outcome, so a rejected
    // stale or unauthorized event never reads as a gap later.
    this.lastSequence = sequence;
    return this.applyRecordEvent(event, kind);
  }

  private bufferEvent(event: ConsoleEvent): void {
    if (this.buffer.length >= this.maxBufferedEvents) {
      this.buffer.shift();
      this.bufferOverflowed = true;
    }
    this.buffer.push(event);
  }

  /** Reject events for an older generation of the same panel target. */
  private acceptGeneration(panelId: string, target: string, generation: number | null): boolean {
    if (!target || generation === null) {
      return true;
    }
    const keyed = generationKey(panelId, target);
    const current = this.generations.get(keyed);
    if (current !== undefined && generation < current) {
      return false;
    }
    this.generations.set(keyed, generation);
    return true;
  }

  private applyRecordEvent(event: ConsoleEvent, kind: string): ConsoleEventOutcome {
    const panelId = text(event.panel_id).toLowerCase();
    const records = this.panels.get(panelId);
    if (!records) {
      return 'foreign';
    }
    const key = text(event.record_key);
    if (!key) {
      return 'malformed';
    }
    const target = text(event.target_id);
    const generation = finiteNumber(event.generation);
    if (!this.acceptGeneration(panelId, target, generation)) {
      return 'stale';
    }
    const existing = records.get(key);
    const incomingRevision = finiteNumber(event.revision);
    if (incomingRevision !== null && existing && incomingRevision <= existing.revision) {
      return 'stale';
    }
    if (kind === 'delete') {
      return existing && records.delete(key) ? 'applied' : 'stale';
    }
    const next: ConsoleRecord = {
      record_key: key,
      revision: incomingRevision ?? (existing ? existing.revision + 1 : 0),
      data: event.data,
    };
    if (target) {
      next.target_id = target;
    }
    if (generation !== null) {
      next.generation = generation;
    }
    // Updates keep the record's position; new records append.
    records.set(key, next);
    trimRecords(records, this.maxRecordsPerPanel);
    return 'applied';
  }
}

function trimRecords(records: Map<string, ConsoleRecord>, max: number): void {
  while (records.size > max) {
    const oldest = records.keys().next().value;
    if (oldest === undefined) {
      return;
    }
    records.delete(oldest);
  }
}
