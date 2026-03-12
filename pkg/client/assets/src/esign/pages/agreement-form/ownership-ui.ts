import type { AgreementFormRefs } from './refs';

export interface OwnershipClaimSnapshot {
  tabId?: string;
  claimedAt?: string;
  lastSeenAt?: string;
}

export interface OwnershipRenderState {
  isOwner?: boolean;
  coordinationAvailable?: boolean;
  claim?: OwnershipClaimSnapshot | null;
}

export interface OwnershipUIController {
  render(state?: OwnershipRenderState): void;
  destroy(): void;
}

export interface OwnershipUIControllerOptions {
  formatRelativeTime(value: string): string;
}

export function createOwnershipUIController(
  refs: AgreementFormRefs,
  options: OwnershipUIControllerOptions,
): OwnershipUIController {
  function setControlledActionsDisabled(disabled: boolean): void {
    if (refs.form.wizardSaveBtn instanceof HTMLButtonElement) {
      refs.form.wizardSaveBtn.disabled = disabled;
    }
    if (refs.form.submitBtn instanceof HTMLButtonElement) {
      refs.form.submitBtn.disabled = disabled;
    }
  }

  return {
    render(state: OwnershipRenderState = {}) {
      const isOwner = state?.isOwner !== false;
      const coordinationAvailable = state?.coordinationAvailable !== false;
      const banner = refs.ownership.banner;
      const message = refs.ownership.message;
      const takeControlButton = refs.ownership.takeControlBtn;

      if (!banner || !message) {
        setControlledActionsDisabled(!isOwner);
        return;
      }

      if (!coordinationAvailable || isOwner) {
        banner.classList.add('hidden');
        takeControlButton?.removeAttribute('disabled');
        setControlledActionsDisabled(false);
        return;
      }

      const claim = state?.claim;
      const seenLabel = claim?.lastSeenAt ? options.formatRelativeTime(claim.lastSeenAt) : 'recently';
      message.textContent = `This agreement is active in another tab. Take control here to resume syncing and sending. Last seen ${seenLabel}.`;
      banner.classList.remove('hidden');
      setControlledActionsDisabled(true);
    },
    destroy() {
      setControlledActionsDisabled(false);
    },
  };
}
