import type {
  MutationRequest,
  MutationResponse,
  ResourceRef,
  ResourceSnapshot,
  Unsubscribe,
} from "./contracts";
import { parseErrorEnvelope, parseMutationEnvelope, parseReadEnvelope } from "./http";

export interface SyncTransport {
  load<T>(ref: ResourceRef): Promise<ResourceSnapshot<T>>;
  mutate<T, P>(input: MutationRequest<P>): Promise<MutationResponse<T>>;
  subscribe?(
    ref: ResourceRef,
    listener: (snapshot: ResourceSnapshot<unknown> | null) => void,
  ): Unsubscribe;
}

export interface FetchResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export interface FetchRequestInitLike {
  body?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
  method?: string;
}

export type FetchLike = (
  input: string,
  init?: FetchRequestInitLike,
) => Promise<FetchResponseLike>;

export interface FetchSyncTransportContext<P = unknown> {
  requestKind: "load" | "mutate";
  method: "GET" | "PATCH" | "POST";
  ref: ResourceRef;
  input?: MutationRequest<P>;
}

export interface FetchSyncTransportOptions {
  baseURL?: string;
  fetch?: FetchLike;
  credentials?: RequestCredentials;
  headers?:
    | Record<string, string>
    | ((
        context: FetchSyncTransportContext,
      ) => Record<string, string> | Promise<Record<string, string>>);
  actionOperations?:
    | string[]
    | ((input: MutationRequest<unknown>) => boolean);
}

export function createFetchSyncTransport(
  options: FetchSyncTransportOptions = {},
): SyncTransport {
  const fetchImpl = resolveFetchImplementation(options.fetch);

  return {
    async load<T>(ref: ResourceRef): Promise<ResourceSnapshot<T>> {
      const response = await request(ref, "GET", buildResourceURL(ref, options.baseURL), undefined);
      return parseReadEnvelope<T>(ref, response);
    },
    async mutate<T, P>(input: MutationRequest<P>): Promise<MutationResponse<T>> {
      const method = shouldUseActionRoute(input as MutationRequest<unknown>, options.actionOperations)
        ? "POST"
        : "PATCH";
      const response = await request(
        input.ref,
        method,
        buildMutationURL(input.ref, input.operation, method, options.baseURL),
        {
          operation: method === "PATCH" ? input.operation : undefined,
          payload: input.payload ?? null,
          expected_revision: input.expectedRevision,
          idempotency_key: input.idempotencyKey,
          metadata: input.metadata,
        },
        input,
      );
      return parseMutationEnvelope<T>(input.ref, response);
    },
  };

  async function request<P>(
    ref: ResourceRef,
    method: "GET" | "PATCH" | "POST",
    url: string,
    body?: Record<string, unknown>,
    input?: MutationRequest<P>,
  ): Promise<unknown> {
    const context: FetchSyncTransportContext<P> = {
      requestKind: input ? "mutate" : "load",
      method,
      ref: cloneRef(ref),
      input: input ? cloneMutationInput(input) : undefined,
    };

    const headers = await resolveHeaders(options.headers, context);
    const init: FetchRequestInitLike = {
      method,
      credentials: options.credentials,
      headers,
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = {
        ...headers,
        "Content-Type": "application/json",
      };
    }

    let response: FetchResponseLike;
    try {
      response = await fetchImpl(url, init);
    } catch (error) {
      throw {
        code: "TRANSPORT_UNAVAILABLE",
        message: error instanceof Error ? error.message : "sync transport unavailable",
      };
    }

    const payload = await parseResponseBody(response);
    if (response.ok) {
      return payload;
    }

    if (payload !== undefined) {
      try {
        throw parseErrorEnvelope(ref, payload);
      } catch (error) {
        if (isEnvelopeLikeError(error)) {
          throw error;
        }
      }
    }

    throw {
      code: statusCodeToSyncCode(response.status),
      message: `sync request failed with status ${response.status}`,
    };
  }
}

function resolveFetchImplementation(override?: FetchLike): FetchLike {
  if (override) {
    return override;
  }
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis) as FetchLike;
  }
  throw new TypeError("createFetchSyncTransport requires a fetch implementation");
}

async function resolveHeaders(
  headers:
    | FetchSyncTransportOptions["headers"]
    | undefined,
  context: FetchSyncTransportContext,
): Promise<Record<string, string>> {
  const baseHeaders =
    typeof headers === "function" ? await headers(context) : headers ?? {};

  return {
    Accept: "application/json",
    ...baseHeaders,
  };
}

async function parseResponseBody(response: FetchResponseLike): Promise<unknown> {
  const raw = await response.text();
  if (!raw.trim()) {
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function buildResourceURL(ref: ResourceRef, baseURL = ""): string {
  return joinURL(baseURL, "sync", "resources", ref.kind, ref.id);
}

function buildMutationURL(
  ref: ResourceRef,
  operation: string,
  method: "PATCH" | "POST",
  baseURL = "",
): string {
  if (method === "POST") {
    return joinURL(baseURL, "sync", "resources", ref.kind, ref.id, "actions", operation);
  }
  return buildResourceURL(ref, baseURL);
}

function joinURL(baseURL: string, ...parts: string[]): string {
  const normalizedBase = baseURL.replace(/\/+$/, "");
  const normalizedParts = parts
    .map((part) => encodeURIComponent(part.trim()))
    .join("/");
  return normalizedBase ? `${normalizedBase}/${normalizedParts}` : `/${normalizedParts}`;
}

function shouldUseActionRoute(
  input: MutationRequest<unknown>,
  actionOperations: FetchSyncTransportOptions["actionOperations"],
): boolean {
  if (typeof actionOperations === "function") {
    return actionOperations(cloneMutationInput(input));
  }
  if (Array.isArray(actionOperations) && actionOperations.length > 0) {
    return actionOperations.includes(input.operation);
  }
  return typeof input.idempotencyKey === "string" && input.idempotencyKey.trim() !== "";
}

function statusCodeToSyncCode(status: number): string {
  if (status === 400) {
    return "INVALID_MUTATION";
  }
  if (status === 404) {
    return "NOT_FOUND";
  }
  if (status === 409) {
    return "STALE_REVISION";
  }
  if (status === 429) {
    return "RATE_LIMITED";
  }
  if (status >= 500) {
    return "TEMPORARY_FAILURE";
  }
  return "TEMPORARY_FAILURE";
}

function cloneRef(ref: ResourceRef): ResourceRef {
  return {
    kind: ref.kind,
    id: ref.id,
    scope: ref.scope ? { ...ref.scope } : undefined,
  };
}

function cloneMutationInput<P>(input: MutationRequest<P>): MutationRequest<P> {
  return {
    ref: cloneRef(input.ref),
    operation: input.operation,
    payload: input.payload,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.idempotencyKey,
    metadata: input.metadata ? { ...input.metadata } : undefined,
  };
}

function isEnvelopeLikeError(error: unknown): error is { code: string; message: string } {
  return Boolean(error) && typeof error === "object" &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string";
}
