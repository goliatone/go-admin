import type { AgreementFormRefs } from './refs';

export interface CoordinationBannerState {
  coordinationAvailable?: boolean;
  lastSeenAt?: string | null;
}

export interface CoordinationBannerController {
  render(state?: CoordinationBannerState): void;
  destroy(): void;
}

export interface CoordinationBannerControllerOptions {
  formatRelativeTime(value: string): string;
}

export function createCoordinationBannerController(
  refs: AgreementFormRefs,
  options: CoordinationBannerControllerOptions,
): CoordinationBannerController {
  return {
    render(state: CoordinationBannerState = {}) {
      const coordinationAvailable = state?.coordinationAvailable !== false;
      const banner = refs.coordination.banner;
      const message = refs.coordination.message;
      if (!banner || !message) {
        return;
      }

      if (coordinationAvailable) {
        banner.classList.add('hidden');
        return;
      }

      const seenLabel = state?.lastSeenAt ? options.formatRelativeTime(state.lastSeenAt) : 'recently';
      message.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${seenLabel}.`;
      banner.classList.remove('hidden');
    },
    destroy() {
      refs.coordination.banner?.classList.add('hidden');
    },
  };
}
