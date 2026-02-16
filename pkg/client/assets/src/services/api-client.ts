/**
 * Services API Client
 * Unified client for all services integration platform endpoints
 */

import type {
  // Provider types
  ListProvidersResponse,
  // Connection types
  ConnectionsListFilter,
  ListConnectionsResponse,
  ConnectionDetailResponse,
  BeginConnectionRequest,
  BeginConnectionResponse,
  CompleteCallbackResponse,
  GetConnectionGrantsResponse,
  BeginReconsentRequest,
  BeginReconsentResponse,
  RefreshConnectionRequest,
  RefreshConnectionResponse,
  RevokeConnectionRequest,
  RevokeConnectionResponse,
  // Installation types
  InstallationsListFilter,
  ListInstallationsResponse,
  BeginInstallationRequest,
  BeginInstallationResponse,
  UninstallInstallationRequest,
  UninstallInstallationResponse,
  // Subscription types
  SubscriptionsListFilter,
  ListSubscriptionsResponse,
  RenewSubscriptionRequest,
  RenewSubscriptionResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
  // Sync types
  RunSyncRequest,
  RunSyncResponse,
  GetSyncStatusResponse,
  // Capability types
  InvokeCapabilityRequest,
  InvokeCapabilityResponse,
  // Activity types
  ActivityListFilter,
  ListActivityResponse,
  // Status types
  GetStatusResponse,
  RunRetentionCleanupResponse,
  // Webhook/Inbound types
  ProcessWebhookResponse,
  DispatchInboundResponse,
  // Error types
  ServiceErrorResponse,
} from './types.js';
import { ServicesAPIError } from './types.js';

// =============================================================================
// Configuration
// =============================================================================

export interface ServicesAPIClientConfig {
  /** Base path for admin API (default: /admin/api) */
  basePath?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Custom headers to include with every request */
  headers?: Record<string, string>;
  /** Handler for errors (optional) */
  onError?: (error: ServicesAPIError) => void;
}

const DEFAULT_CONFIG: Required<Omit<ServicesAPIClientConfig, 'onError'>> = {
  basePath: '/admin/api/services',
  timeout: 30000,
  headers: {},
};

// =============================================================================
// API Client
// =============================================================================

export class ServicesAPIClient {
  private config: Required<Omit<ServicesAPIClientConfig, 'onError'>> & Pick<ServicesAPIClientConfig, 'onError'>;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ServicesAPIClientConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }

  // ---------------------------------------------------------------------------
  // Provider Endpoints
  // ---------------------------------------------------------------------------

  /**
   * List all registered providers
   */
  async listProviders(signal?: AbortSignal): Promise<ListProvidersResponse> {
    return this.get<ListProvidersResponse>('/providers', {}, signal);
  }

  // ---------------------------------------------------------------------------
  // Connection Endpoints
  // ---------------------------------------------------------------------------

  /**
   * List connections with optional filters
   */
  async listConnections(
    filter: ConnectionsListFilter = {},
    signal?: AbortSignal
  ): Promise<ListConnectionsResponse> {
    const params = this.buildListParams(filter as Record<string, string | number | boolean | string[] | undefined>);
    return this.get<ListConnectionsResponse>('/connections', params, signal);
  }

  /**
   * Get full connection detail payload
   */
  async getConnectionDetail(
    connectionRef: string,
    signal?: AbortSignal
  ): Promise<ConnectionDetailResponse> {
    return this.get<ConnectionDetailResponse>(
      `/connections/${encodeURIComponent(connectionRef)}`,
      {},
      signal
    );
  }

  /**
   * Begin a new connection flow (OAuth2 redirect)
   */
  async beginConnection(
    providerRef: string,
    request: BeginConnectionRequest = {},
    idempotencyKey?: string
  ): Promise<BeginConnectionResponse> {
    return this.post<BeginConnectionResponse>(
      `/connections/${encodeURIComponent(providerRef)}/begin`,
      request,
      idempotencyKey
    );
  }

  /**
   * Complete OAuth callback (typically called via redirect)
   */
  async completeCallback(
    providerRef: string,
    params: Record<string, string>,
    signal?: AbortSignal
  ): Promise<CompleteCallbackResponse> {
    return this.get<CompleteCallbackResponse>(
      `/connections/${encodeURIComponent(providerRef)}/callback`,
      params,
      signal
    );
  }

  /**
   * Get grant snapshot for a connection
   */
  async getConnectionGrants(
    connectionRef: string,
    signal?: AbortSignal
  ): Promise<GetConnectionGrantsResponse> {
    return this.get<GetConnectionGrantsResponse>(
      `/connections/${encodeURIComponent(connectionRef)}/grants`,
      {},
      signal
    );
  }

  /**
   * Begin re-consent flow for a connection
   */
  async beginReconsent(
    connectionRef: string,
    request: BeginReconsentRequest = {},
    idempotencyKey?: string
  ): Promise<BeginReconsentResponse> {
    return this.post<BeginReconsentResponse>(
      `/connections/${encodeURIComponent(connectionRef)}/reconsent/begin`,
      request,
      idempotencyKey
    );
  }

  /**
   * Refresh a connection's credentials
   */
  async refreshConnection(
    connectionRef: string,
    request: RefreshConnectionRequest = {},
    idempotencyKey?: string
  ): Promise<RefreshConnectionResponse> {
    return this.post<RefreshConnectionResponse>(
      `/connections/${encodeURIComponent(connectionRef)}/refresh`,
      request,
      idempotencyKey
    );
  }

  /**
   * Revoke a connection
   */
  async revokeConnection(
    connectionRef: string,
    request: RevokeConnectionRequest = {},
    idempotencyKey?: string
  ): Promise<RevokeConnectionResponse> {
    return this.post<RevokeConnectionResponse>(
      `/connections/${encodeURIComponent(connectionRef)}/revoke`,
      request,
      idempotencyKey
    );
  }

  // ---------------------------------------------------------------------------
  // Installation Endpoints
  // ---------------------------------------------------------------------------

  /**
   * List installations with optional filters
   */
  async listInstallations(
    filter: InstallationsListFilter = {},
    signal?: AbortSignal
  ): Promise<ListInstallationsResponse> {
    const params = this.buildListParams(filter as Record<string, string | number | boolean | string[] | undefined>);
    return this.get<ListInstallationsResponse>('/installations', params, signal);
  }

  /**
   * Begin a new installation flow
   */
  async beginInstallation(
    providerRef: string,
    request: BeginInstallationRequest = {},
    idempotencyKey?: string
  ): Promise<BeginInstallationResponse> {
    return this.post<BeginInstallationResponse>(
      `/installations/${encodeURIComponent(providerRef)}/begin`,
      request,
      idempotencyKey
    );
  }

  /**
   * Uninstall an installation
   */
  async uninstallInstallation(
    installationRef: string,
    request: UninstallInstallationRequest = {},
    idempotencyKey?: string
  ): Promise<UninstallInstallationResponse> {
    return this.post<UninstallInstallationResponse>(
      `/installations/${encodeURIComponent(installationRef)}/uninstall`,
      request,
      idempotencyKey
    );
  }

  // ---------------------------------------------------------------------------
  // Subscription Endpoints
  // ---------------------------------------------------------------------------

  /**
   * List subscriptions with optional filters
   */
  async listSubscriptions(
    filter: SubscriptionsListFilter = {},
    signal?: AbortSignal
  ): Promise<ListSubscriptionsResponse> {
    const params = this.buildListParams(filter as Record<string, string | number | boolean | string[] | undefined>);
    return this.get<ListSubscriptionsResponse>('/subscriptions', params, signal);
  }

  /**
   * Renew a subscription
   */
  async renewSubscription(
    subscriptionId: string,
    request: RenewSubscriptionRequest = {},
    idempotencyKey?: string
  ): Promise<RenewSubscriptionResponse> {
    return this.post<RenewSubscriptionResponse>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/renew`,
      request,
      idempotencyKey
    );
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    request: CancelSubscriptionRequest = {},
    idempotencyKey?: string
  ): Promise<CancelSubscriptionResponse> {
    return this.post<CancelSubscriptionResponse>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
      request,
      idempotencyKey
    );
  }

  // ---------------------------------------------------------------------------
  // Sync Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Run a sync job for a connection
   */
  async runSync(
    connectionId: string,
    request: RunSyncRequest,
    idempotencyKey?: string
  ): Promise<RunSyncResponse> {
    return this.post<RunSyncResponse>(
      `/sync/${encodeURIComponent(connectionId)}/run`,
      request,
      idempotencyKey
    );
  }

  /**
   * Get sync status summary for a connection
   */
  async getSyncStatus(
    connectionId: string,
    signal?: AbortSignal
  ): Promise<GetSyncStatusResponse> {
    return this.get<GetSyncStatusResponse>(
      `/sync/${encodeURIComponent(connectionId)}/status`,
      {},
      signal
    );
  }

  // ---------------------------------------------------------------------------
  // Capability Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Invoke a provider capability
   */
  async invokeCapability(
    providerId: string,
    capability: string,
    request: InvokeCapabilityRequest = {},
    idempotencyKey?: string
  ): Promise<InvokeCapabilityResponse> {
    return this.post<InvokeCapabilityResponse>(
      `/capabilities/${encodeURIComponent(providerId)}/${encodeURIComponent(capability)}/invoke`,
      request,
      idempotencyKey
    );
  }

  // ---------------------------------------------------------------------------
  // Activity Endpoints
  // ---------------------------------------------------------------------------

  /**
   * List activity entries with optional filters
   */
  async listActivity(
    filter: ActivityListFilter = {},
    signal?: AbortSignal
  ): Promise<ListActivityResponse> {
    const params = this.buildActivityParams(filter);
    return this.get<ListActivityResponse>('/activity', params, signal);
  }

  // ---------------------------------------------------------------------------
  // Status Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Get service status
   */
  async getStatus(signal?: AbortSignal): Promise<GetStatusResponse> {
    return this.get<GetStatusResponse>('/status', {}, signal);
  }

  /**
   * Run activity retention cleanup
   */
  async runRetentionCleanup(idempotencyKey?: string): Promise<RunRetentionCleanupResponse> {
    return this.post<RunRetentionCleanupResponse>('/activity/retention/cleanup', {}, idempotencyKey);
  }

  // ---------------------------------------------------------------------------
  // Webhook/Inbound Endpoints (typically server-to-server)
  // ---------------------------------------------------------------------------

  /**
   * Process a webhook from a provider
   */
  async processWebhook(
    providerId: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<ProcessWebhookResponse> {
    return this.post<ProcessWebhookResponse>(
      `/webhooks/${encodeURIComponent(providerId)}`,
      body,
      undefined,
      headers
    );
  }

  /**
   * Dispatch an inbound surface request
   */
  async dispatchInbound(
    providerId: string,
    surface: string,
    body: unknown,
    headers?: Record<string, string>
  ): Promise<DispatchInboundResponse> {
    return this.post<DispatchInboundResponse>(
      `/inbound/${encodeURIComponent(providerId)}/${encodeURIComponent(surface)}`,
      body,
      undefined,
      headers
    );
  }

  // ---------------------------------------------------------------------------
  // Request Helpers
  // ---------------------------------------------------------------------------

  /**
   * Cancel all pending requests
   */
  cancelAll(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  /**
   * Cancel a specific request by key
   */
  cancel(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  private async get<T>(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {},
    signal?: AbortSignal
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    const controller = new AbortController();
    const onAbort = () => controller.abort();

    if (signal) {
      if (signal.aborted) {
        controller.abort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
    this.abortControllers.set(path, controller);

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...this.config.headers,
        },
        signal: controller.signal,
      }, path);

      return this.handleResponse<T>(response);
    } finally {
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
      this.abortControllers.delete(path);
    }
  }

  private async post<T>(
    path: string,
    body: unknown,
    idempotencyKey?: string,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    const url = this.buildUrl(path);
    const controller = new AbortController();
    this.abortControllers.set(path, controller);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...this.config.headers,
      ...extraHeaders,
    };

    const requestIdempotencyKey = (idempotencyKey && idempotencyKey.trim()) || this.createIdempotencyKey(path);
    headers['Idempotency-Key'] = requestIdempotencyKey;

    try {
      const response = await this.fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      }, path);

      return this.handleResponse<T>(response);
    } finally {
      this.abortControllers.delete(path);
    }
  }

  private buildUrl(
    path: string,
    params: Record<string, string | number | boolean | undefined> = {}
  ): string {
    const base = this.config.basePath.replace(/\/$/, '');
    const url = new URL(`${base}${path}`, window.location.origin);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    requestKey: string
  ): Promise<Response> {
    const timeoutId = setTimeout(() => {
      const controller = this.abortControllers.get(requestKey);
      controller?.abort();
    }, this.config.timeout);

    try {
      return await fetch(url, options);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private createIdempotencyKey(path: string): string {
    const normalizedPath = path
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'request';

    const runtimeCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
      return `services_${normalizedPath}_${runtimeCrypto.randomUUID()}`;
    }

    return `services_${normalizedPath}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let payload: ServiceErrorResponse;
      try {
        payload = await response.json();
      } catch {
        payload = { error: response.statusText };
      }

      const error = ServicesAPIError.fromResponse(response.status, payload);
      this.config.onError?.(error);
      throw error;
    }

    return response.json();
  }

  private buildListParams(
    filter: Record<string, string | number | boolean | string[] | undefined>
  ): Record<string, string | number | boolean | undefined> {
    const params: Record<string, string | number | boolean | undefined> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params[key] = value.join(',');
        }
      } else {
        params[key] = value;
      }
    }

    return params;
  }

  private buildActivityParams(filter: ActivityListFilter): Record<string, string | number | boolean | undefined> {
    const params = this.buildListParams(filter as Record<string, string | number | boolean | string[] | undefined>);

    // Convert page/per_page to limit/offset for activity endpoint
    if (filter.page !== undefined && filter.per_page !== undefined) {
      params['offset'] = (filter.page - 1) * filter.per_page;
      params['limit'] = filter.per_page;
      delete params['page'];
      delete params['per_page'];
    } else if (filter.per_page !== undefined) {
      params['limit'] = filter.per_page;
      delete params['per_page'];
    }

    return params;
  }
}

// =============================================================================
// Default Instance
// =============================================================================

let defaultClient: ServicesAPIClient | null = null;

/**
 * Get the default services API client instance
 */
export function getServicesClient(): ServicesAPIClient {
  if (!defaultClient) {
    defaultClient = new ServicesAPIClient();
  }
  return defaultClient;
}

/**
 * Set the default services API client instance
 */
export function setServicesClient(client: ServicesAPIClient): void {
  defaultClient = client;
}

/**
 * Create a new services API client with custom configuration
 */
export function createServicesClient(config: ServicesAPIClientConfig = {}): ServicesAPIClient {
  return new ServicesAPIClient(config);
}
