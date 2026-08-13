import type { StyleConfig } from './styles.js';

type SortToggleStyles = Pick<StyleConfig, 'panelControls' | 'sortToggle'>;

export function renderSortToggle(
  panelId: string,
  newestFirst: boolean,
  styles: SortToggleStyles
): string {
  return `
    <div class="${styles.panelControls}">
      <label class="${styles.sortToggle}">
        <input type="checkbox" data-sort-toggle="${panelId}" ${newestFirst ? 'checked' : ''}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
