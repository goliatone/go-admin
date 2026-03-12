import type { AgreementFormRuntime } from './context';

export interface AgreementFormRuntimeHooks {
  renderInitialUI?(): void;
  bindEvents?(): void;
  startSideEffects?(): void;
  destroy?(): void;
}

export function createAgreementFormRuntime(hooks: AgreementFormRuntimeHooks = {}): AgreementFormRuntime {
  let started = false;

  return {
    start() {
      if (started) return;
      started = true;
      hooks.renderInitialUI?.();
      hooks.bindEvents?.();
      hooks.startSideEffects?.();
    },
    destroy() {
      if (!started) return;
      started = false;
      hooks.destroy?.();
    },
  };
}
