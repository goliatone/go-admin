import createSSEClient, {
  type SSEClient,
  type StreamEvent,
  type StreamGapEvent,
} from './sse-client.js';
import type { CommandFeedbackAdapter, CommandFeedbackEvent } from '../services/command-runtime.js';
import type { ESignAgreementChangedEvent } from './types.js';

function normalizeAgreementEvent(payload: unknown): ESignAgreementChangedEvent | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const event = payload as Record<string, unknown>;
  if (String(event.type || '').trim() !== 'esign.agreement.changed') {
    return null;
  }
  if (String(event.resource_type || '').trim() !== 'esign_agreement') {
    return null;
  }
  const resourceId = String(event.resource_id || '').trim();
  if (!resourceId) {
    return null;
  }
  const sections = Array.isArray(event.sections)
    ? event.sections
      .map((value) => String(value || '').trim())
      .filter(Boolean)
    : [];
  return {
    type: 'esign.agreement.changed',
    resource_type: 'esign_agreement',
    resource_id: resourceId,
    tenant_id: String(event.tenant_id || '').trim() || undefined,
    org_id: String(event.org_id || '').trim() || undefined,
    correlation_id: String(event.correlation_id || '').trim() || undefined,
    sections: sections as ESignAgreementChangedEvent['sections'],
    occurred_at: String(event.occurred_at || '').trim(),
    status: String(event.status || '').trim() as ESignAgreementChangedEvent['status'],
    message: String(event.message || '').trim() || undefined,
    metadata: event.metadata && typeof event.metadata === 'object'
      ? event.metadata as Record<string, unknown>
      : undefined,
  };
}

export class AgreementDetailFeedbackAdapter implements CommandFeedbackAdapter {
  private readonly listeners = new Set<(event: CommandFeedbackEvent) => void>();
  private readonly client: SSEClient;

  constructor(endpoint: string) {
    this.client = createSSEClient({
      url: endpoint,
      onEvent: (event: StreamEvent) => {
        const payload = normalizeAgreementEvent(event.payload);
        if (!payload) {
          return;
        }
        this.emit({
          type: payload.type,
          resourceType: payload.resource_type,
          resourceId: payload.resource_id,
          tenantId: payload.tenant_id,
          orgId: payload.org_id,
          correlationId: payload.correlation_id,
          sections: payload.sections,
          status: payload.status,
          message: payload.message,
          metadata: payload.metadata,
        });
      },
      onStreamGap: (event: StreamGapEvent) => {
        this.emit({
          type: 'stream_gap',
          reason: String(event.reason || '').trim() || 'cursor_gap',
          lastEventId: String(event.last_event_id || '').trim() || undefined,
          requiresGapReconcile: Boolean(event.requires_gap_reconcile),
        });
      },
    });
  }

  start(): void {
    this.client.start();
  }

  stop(): void {
    this.client.stop();
  }

  attemptRecovery(): void {
    this.client.attemptRecovery();
  }

  subscribe(listener: (event: CommandFeedbackEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: CommandFeedbackEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
