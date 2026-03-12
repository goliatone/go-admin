declare global {
  interface Window {
    __esignWizardTelemetryCounters?: Record<string, number>;
  }
}

export type AgreementTelemetryEmitter = (eventName: string, fields?: Record<string, unknown>) => void;

export function createAgreementTelemetryEmitter(): AgreementTelemetryEmitter {
  return function emitWizardTelemetry(eventName: string, fields: Record<string, unknown> = {}): void {
    const normalizedEvent = String(eventName || '').trim();
    if (!normalizedEvent || typeof window === 'undefined') return;
    const counters = (window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {});
    counters[normalizedEvent] = Number(counters[normalizedEvent] || 0) + 1;
    window.dispatchEvent(new CustomEvent('esign:wizard-telemetry', {
      detail: {
        event: normalizedEvent,
        count: counters[normalizedEvent],
        fields,
        at: new Date().toISOString(),
      },
    }));
  };
}
