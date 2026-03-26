/**
 * E-Sign Page Feedback Helpers
 * Shared announcement and toast helpers for page controllers.
 */

import { announce } from './dom-helpers.js';

export type ToastMessageType = 'success' | 'error' | 'info';

type ToastManager = {
  success?: (message: string) => void;
  error?: (message: string) => void;
  info?: (message: string) => void;
};

function getToastManager(): ToastManager | null {
  const maybeWindow = window as Window & { toastManager?: ToastManager };
  return maybeWindow.toastManager ?? null;
}

export function announcePageMessage(
  liveRegion: HTMLElement | null | undefined,
  message: string
): void {
  if (liveRegion) {
    liveRegion.textContent = message;
  }
  announce(message);
}

export function showPageToast(
  message: string,
  type: ToastMessageType,
  options?: { alertFallback?: boolean }
): void {
  const toastManager = getToastManager();
  const handler = toastManager?.[type];
  if (typeof handler === 'function') {
    handler(message);
    return;
  }

  if (!options?.alertFallback || typeof window.alert !== 'function') {
    return;
  }

  const label = type.charAt(0).toUpperCase() + type.slice(1);
  window.alert(`${label}: ${message}`);
}
