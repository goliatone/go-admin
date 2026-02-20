/**
 * Translation Panel Controller
 *
 * Controls a collapsible translation toolbar panel with persisted state and
 * grouped controls visibility synchronized to the current view mode.
 */

export type TranslationPanelViewMode = 'flat' | 'grouped' | 'matrix';

export interface TranslationPanelConfig {
  /** Toggle button element id */
  toggleButtonId: string;
  /** Panel container id */
  panelId: string;
  /** Expand-all button id */
  expandAllBtnId?: string;
  /** Collapse-all button id */
  collapseAllBtnId?: string;
  /** Group controls wrapper id */
  groupControlsId?: string;
  /** Selector for view mode buttons */
  viewModeSelector: string;
  /** localStorage key for expanded state */
  storageKey?: string;
}

const DEFAULT_STORAGE_KEY = 'go-admin:translation-panel-expanded';

export class TranslationPanel {
  private config: TranslationPanelConfig;
  private toggleButton: HTMLButtonElement | null = null;
  private panelElement: HTMLElement | null = null;
  private expandAllButton: HTMLButtonElement | null = null;
  private collapseAllButton: HTMLButtonElement | null = null;
  private groupControls: HTMLElement | null = null;
  private viewModeButtons: HTMLElement[] = [];
  private expanded = false;
  private boundToggleHandler: ((event: Event) => void) | null = null;

  constructor(config: TranslationPanelConfig) {
    this.config = {
      ...config,
      storageKey: config.storageKey || DEFAULT_STORAGE_KEY,
    };
  }

  init(): void {
    this.toggleButton = document.getElementById(this.config.toggleButtonId) as HTMLButtonElement | null;
    this.panelElement = document.getElementById(this.config.panelId);
    this.expandAllButton = this.config.expandAllBtnId
      ? document.getElementById(this.config.expandAllBtnId) as HTMLButtonElement | null
      : null;
    this.collapseAllButton = this.config.collapseAllBtnId
      ? document.getElementById(this.config.collapseAllBtnId) as HTMLButtonElement | null
      : null;
    this.groupControls = this.config.groupControlsId
      ? document.getElementById(this.config.groupControlsId)
      : null;
    this.viewModeButtons = Array.from(
      document.querySelectorAll<HTMLElement>(this.config.viewModeSelector)
    );

    if (!this.toggleButton || !this.panelElement) {
      return;
    }

    this.boundToggleHandler = (event: Event) => {
      event.preventDefault();
      this.toggle();
    };
    this.toggleButton.addEventListener('click', this.boundToggleHandler);

    const persisted = this.getPersistedExpandedState();
    this.setExpanded(persisted, false);
  }

  toggle(): void {
    this.setExpanded(!this.expanded, true);
  }

  expand(): void {
    this.setExpanded(true, true);
  }

  collapse(): void {
    this.setExpanded(false, true);
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  onViewModeChange(mode: TranslationPanelViewMode): void {
    const showGroupControls = mode === 'grouped' || mode === 'matrix';
    if (this.groupControls) {
      this.groupControls.classList.toggle('hidden', !showGroupControls);
    } else {
      if (this.expandAllButton) {
        this.expandAllButton.classList.toggle('hidden', !showGroupControls);
      }
      if (this.collapseAllButton) {
        this.collapseAllButton.classList.toggle('hidden', !showGroupControls);
      }
    }
    this.dispatchViewModeEvent(mode);
  }

  destroy(): void {
    if (this.toggleButton && this.boundToggleHandler) {
      this.toggleButton.removeEventListener('click', this.boundToggleHandler);
    }
    this.boundToggleHandler = null;
    this.toggleButton = null;
    this.panelElement = null;
    this.expandAllButton = null;
    this.collapseAllButton = null;
    this.groupControls = null;
    this.viewModeButtons = [];
  }

  private setExpanded(expanded: boolean, persist: boolean): void {
    this.expanded = expanded;

    if (this.panelElement) {
      this.panelElement.classList.toggle('hidden', !expanded);
    }

    if (this.toggleButton) {
      this.toggleButton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      // Toggle active state styling on button
      this.toggleButton.classList.toggle('bg-blue-50', expanded);
      this.toggleButton.classList.toggle('border-blue-300', expanded);
      this.toggleButton.classList.toggle('text-blue-700', expanded);
      this.toggleButton.classList.toggle('bg-white', !expanded);
      this.toggleButton.classList.toggle('border-gray-200', !expanded);
      this.toggleButton.classList.toggle('text-gray-800', !expanded);
      const chevron = this.toggleButton.querySelector<HTMLElement>('[data-chevron]');
      if (chevron) {
        chevron.classList.toggle('rotate-180', expanded);
      }
    }

    if (persist) {
      this.persistExpandedState(expanded);
    }

    this.dispatchToggleEvent(expanded);
  }

  private getPersistedExpandedState(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      return window.localStorage.getItem(this.config.storageKey || DEFAULT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  private persistExpandedState(expanded: boolean): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.setItem(this.config.storageKey || DEFAULT_STORAGE_KEY, expanded ? 'true' : 'false');
    } catch {
      // Ignore persistence failures (private mode/storage restrictions).
    }
  }

  private dispatchToggleEvent(expanded: boolean): void {
    if (!this.panelElement || typeof CustomEvent === 'undefined') {
      return;
    }
    this.panelElement.dispatchEvent(new CustomEvent('translation-panel:toggle', {
      detail: {
        expanded,
      },
    }));
  }

  private dispatchViewModeEvent(mode: TranslationPanelViewMode): void {
    if (!this.panelElement || typeof CustomEvent === 'undefined') {
      return;
    }
    this.panelElement.dispatchEvent(new CustomEvent('translation-panel:view-mode', {
      detail: {
        mode,
        buttonCount: this.viewModeButtons.length,
      },
    }));
  }
}

export function createTranslationPanel(config: TranslationPanelConfig): TranslationPanel {
  return new TranslationPanel(config);
}
