import type { AgreementFormContext, AgreementFormRuntime } from './context';
import { createAgreementFormRuntime, type AgreementFormRuntimeHooks } from './runtime';

export interface AgreementFormBootOptions {
  context: AgreementFormContext;
  hooks?: AgreementFormRuntimeHooks;
}

export function bootAgreementFormRuntime(options: AgreementFormBootOptions): AgreementFormRuntime {
  const { context, hooks = {} } = options;

  return createAgreementFormRuntime({
    renderInitialUI() {
      hooks.renderInitialUI?.();
    },
    bindEvents() {
      hooks.bindEvents?.();
    },
    startSideEffects() {
      context.syncController.start();
      hooks.startSideEffects?.();
    },
    destroy() {
      hooks.destroy?.();
      context.syncController.destroy();
    },
  });
}
