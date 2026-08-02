import type { ToastNotifier } from '../toast/types.js';
import { type StructuredError, type StructuredRequestResult } from '../toast/error-helpers.js';
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
export declare function executeStructuredDelete(config: StructuredDeleteConfig): Promise<StructuredRequestResult | null>;
//# sourceMappingURL=action-execution.d.ts.map