import type { ToastNotifier } from '../toast/types.js';
import {
  createStructuredActionError,
  executeStructuredRequest,
  formatStructuredErrorForDisplay,
  type StructuredError,
  type StructuredRequestResult,
} from '../toast/error-helpers.js';

export interface StructuredDeleteConfig {
  endpoint: string;
  confirmMessage?: string;
  confirmTitle?: string;
  notifier?: Pick<ToastNotifier, 'confirm'> | null;
  fallbackMessage?: string;
  onSuccess?: (result: StructuredRequestResult) => Promise<void> | void;
  onError?: (error: StructuredError) => Promise<void> | void;
  reconcileOnDomainFailure?: (error: StructuredError) => Promise<void> | void;
}

function defaultStructuredError(message: string): StructuredError {
  return {
    textCode: null,
    message,
    metadata: null,
    fields: null,
    validationErrors: null,
  };
}

async function confirmDelete(config: StructuredDeleteConfig): Promise<boolean> {
  const message = String(config.confirmMessage || 'Are you sure you want to delete this item?').trim()
    || 'Are you sure you want to delete this item?';
  const title = String(config.confirmTitle || 'Confirm Delete').trim() || 'Confirm Delete';

  if (config.notifier?.confirm) {
    return config.notifier.confirm(message, {
      title,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
  }

  const maybeWindow = globalThis.window as ({ confirm?: (message: string) => boolean } | undefined);
  if (maybeWindow && typeof maybeWindow.confirm === 'function') {
    return maybeWindow.confirm(message);
  }

  return true;
}

export async function executeStructuredDelete(config: StructuredDeleteConfig): Promise<StructuredRequestResult | null> {
  const confirmed = await confirmDelete(config);
  if (!confirmed) {
    return null;
  }

  const result = await executeStructuredRequest(config.endpoint, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
    },
  });

  if (result.success) {
    await config.onSuccess?.(result);
    return result;
  }

  const fallbackMessage = String(config.fallbackMessage || 'Delete failed').trim() || 'Delete failed';
  const error = result.error || defaultStructuredError(fallbackMessage);
  const normalizedError: StructuredError = {
    ...error,
    message: formatStructuredErrorForDisplay(error, fallbackMessage),
  };

  if (normalizedError.textCode && config.reconcileOnDomainFailure) {
    await config.reconcileOnDomainFailure(normalizedError);
  }

  await config.onError?.(normalizedError);

  throw createStructuredActionError(normalizedError, fallbackMessage, Boolean(config.onError));
}
