/**
 * Content Types channel switcher
 *
 * Wires the page-header channel control on the Content Types screen: switching
 * channels (full navigation), resetting to default, and adding a new channel.
 * Adding a channel uses the shared, styled {@link TextPromptModal} (with inline
 * empty-validation) instead of the native browser prompt it replaced.
 *
 * The Block Library handles its own channel control inside its IDE controller;
 * this module covers the Content Types surface, whose channel wrapper lives in
 * the page header outside the editor root.
 */

import { TextPromptModal } from '../../shared/modal';
import { inputClasses } from './field-input-classes';

/**
 * Normalize a user-entered channel name to the persisted form: lowercase,
 * non `[a-z0-9_-]` collapsed to `-`, and leading/trailing dashes trimmed.
 * Exposed for unit testing.
 */
export function normalizeChannelName(value: string): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/^-+|-+$/g, '');
}

function upsertChannelOption(select: HTMLSelectElement, value: string): void {
  const existing = Array.from(select.options).some((opt) => opt.value === value);
  if (existing) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
  select.appendChild(option);
}

/** Initialize the Content Types channel switcher within a scope. Idempotent. */
export function initContentTypeChannelSwitcher(scope: ParentNode = document): void {
  const wrapper = scope.querySelector<HTMLElement>('[data-content-types-channel-wrapper]');
  if (!wrapper || wrapper.dataset.channelInit === 'true') return;

  const select = wrapper.querySelector<HTMLSelectElement>('[data-content-types-channel]');
  const resetBtn = wrapper.querySelector<HTMLButtonElement>('[data-content-types-channel-reset]');
  const addBtn = wrapper.querySelector<HTMLButtonElement>('[data-content-types-channel-add]');
  const emptyResetBtn = document.querySelector<HTMLButtonElement>('[data-content-types-empty-reset-channel]');
  if (!select || !resetBtn) return;
  wrapper.dataset.channelInit = 'true';

  const defaultChannel =
    (wrapper.getAttribute('data-default-channel') || 'default').trim().toLowerCase() || 'default';

  const normalize = (value: string | null): string => {
    const next = String(value ?? '').trim().toLowerCase();
    return next || defaultChannel;
  };

  const navigateToChannel = (nextChannel: string): void => {
    const url = new URL(window.location.href);
    const channel = normalize(nextChannel);
    if (channel === defaultChannel) {
      url.searchParams.delete('channel');
    } else {
      url.searchParams.set('channel', channel);
    }
    window.location.href = url.toString();
  };

  const updateResetVisibility = (channel: string): void => {
    const inDefault = channel === defaultChannel;
    resetBtn.classList.toggle('hidden', inDefault);
    emptyResetBtn?.classList.toggle('hidden', inDefault);
  };

  const url = new URL(window.location.href);
  const activeFromURL = normalize(url.searchParams.get('channel') || wrapper.getAttribute('data-active-channel'));
  select.value = activeFromURL;
  updateResetVisibility(activeFromURL);

  select.addEventListener('change', () => navigateToChannel(normalize(select.value)));
  resetBtn.addEventListener('click', () => navigateToChannel(defaultChannel));
  emptyResetBtn?.addEventListener('click', () => navigateToChannel(defaultChannel));

  addBtn?.addEventListener('click', () => {
    const modal = new TextPromptModal({
      title: 'Add Channel',
      label: 'Channel name',
      placeholder: 'e.g. staging',
      confirmLabel: 'Add',
      inputClass: inputClasses(),
      onConfirm: (value) => {
        const normalized = normalizeChannelName(value);
        if (!normalized) return; // ignore values that normalize to empty
        upsertChannelOption(select, normalized);
        select.value = normalized;
        navigateToChannel(normalized);
      },
    });
    void modal.show();
  });
}
