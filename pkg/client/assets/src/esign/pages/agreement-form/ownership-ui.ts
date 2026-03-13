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
  return {
    render(state: OwnershipRenderState = {}) {
      const coordinationAvailable = state?.coordinationAvailable !== false;
      const banner = refs.ownership.banner;
      const message = refs.ownership.message;
      if (!banner || !message) {
        return;
      }

      if (!coordinationAvailable) {
        const claim = state?.claim;
        const seenLabel = claim?.lastSeenAt ? options.formatRelativeTime(claim.lastSeenAt) : 'recently';
        message.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${seenLabel}.`;
        banner.classList.remove('hidden');
        return;
      }

      if (state?.isOwner !== false) {
        banner.classList.add('hidden');
        return;
      }
      banner.classList.add('hidden');
    },
    destroy() {
      refs.ownership.banner?.classList.add('hidden');
    },
  };
}
