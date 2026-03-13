import type {
  MutationResponse,
  ResourceRef,
  ResourceSnapshot,
  SyncEnvelopeError,
} from "./contracts";
import { cloneValue } from "./internal/clone";

interface BackendReadEnvelope<T> {
  data: T;
  revision: number;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

interface BackendMutationEnvelope<T> extends BackendReadEnvelope<T> {
  applied: boolean;
  replay: boolean;
}

interface BackendErrorEnvelope<T> {
  error: {
    code: string;
    message: string;
    details?: {
      current_revision?: number;
      resource?: BackendReadEnvelope<T>;
      [key: string]: unknown;
    };
  };
}

export function parseReadEnvelope<T>(
  ref: ResourceRef,
  payload: unknown,
): ResourceSnapshot<T> {
  const envelope = asObject(payload, "read envelope");
  return snapshotFromEnvelope(ref, envelope as unknown as BackendReadEnvelope<T>);
}

export function parseMutationEnvelope<T>(
  ref: ResourceRef,
  payload: unknown,
): MutationResponse<T> {
  const envelope = asObject(payload, "mutation envelope") as unknown as BackendMutationEnvelope<T>;

  if (typeof envelope.applied !== "boolean") {
    throw new TypeError("mutation envelope must include boolean applied");
  }
  if (typeof envelope.replay !== "boolean") {
    throw new TypeError("mutation envelope must include boolean replay");
  }

  return {
    snapshot: snapshotFromEnvelope(ref, envelope),
    applied: envelope.applied,
    replay: envelope.replay,
  };
}

export function parseErrorEnvelope<T>(
  ref: ResourceRef,
  payload: unknown,
): SyncEnvelopeError<T> {
  const envelope = asObject(payload, "error envelope") as unknown as BackendErrorEnvelope<T>;
  const error = asObject(envelope.error, "error envelope.error");

  if (typeof error.code !== "string" || error.code.trim() === "") {
    throw new TypeError("error envelope must include string code");
  }
  if (typeof error.message !== "string" || error.message.trim() === "") {
    throw new TypeError("error envelope must include string message");
  }

  const details = isObject(error.details) ? error.details : undefined;
  const resourceEnvelope = details?.resource;
  const currentRevision =
    typeof details?.current_revision === "number" ? details.current_revision : undefined;

  return {
    code: error.code,
    message: error.message,
    details: cloneValue(details),
    currentRevision,
    resource: resourceEnvelope
      ? snapshotFromEnvelope(ref, resourceEnvelope as BackendReadEnvelope<T>)
      : undefined,
  };
}

function snapshotFromEnvelope<T>(
  ref: ResourceRef,
  payload: BackendReadEnvelope<T>,
): ResourceSnapshot<T> {
  if (typeof payload.revision !== "number" || Number.isNaN(payload.revision)) {
    throw new TypeError("read envelope must include numeric revision");
  }
  if (typeof payload.updated_at !== "string" || payload.updated_at.trim() === "") {
    throw new TypeError("read envelope must include string updated_at");
  }

  return {
    ref: cloneRef(ref),
    data: cloneValue(payload.data),
    revision: payload.revision,
    updatedAt: payload.updated_at,
    metadata: isObject(payload.metadata) ? cloneValue(payload.metadata) : undefined,
  };
}

function cloneRef(ref: ResourceRef): ResourceRef {
  return {
    kind: ref.kind,
    id: ref.id,
    scope: ref.scope ? { ...ref.scope } : undefined,
  };
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
