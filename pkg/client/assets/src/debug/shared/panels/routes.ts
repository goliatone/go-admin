// Shared routes panel renderer
// Used by both the full debug console and the debug toolbar

import type { RouteEntry } from '../types.js';
import type { StyleConfig } from '../styles.js';
import { escapeHTML } from '../utils.js';

/**
 * Options for rendering the routes panel
 */
export type RoutesPanelOptions = {
  /** Whether to show the name column. Defaults to true for console, false for toolbar. */
  showName?: boolean;
};

/**
 * Render a single route row
 */
function renderRouteRow(
  entry: RouteEntry,
  styles: StyleConfig,
  options: RoutesPanelOptions
): string {
  const method = entry.method || 'GET';
  const path = entry.path || '';
  const handler = entry.handler || '-';
  const name = entry.name || '';

  const methodClass = styles.badgeMethod(method);

  const nameColumn = options.showName
    ? `<td class="${styles.timestamp}">${escapeHTML(name)}</td>`
    : '';

  return `
    <tr>
      <td><span class="${methodClass}">${escapeHTML(method)}</span></td>
      <td class="${styles.path}">${escapeHTML(path)}</td>
      <td>${escapeHTML(handler)}</td>
      ${nameColumn}
    </tr>
  `;
}

/**
 * Render the routes panel table
 *
 * @param routes - Array of route entries to render
 * @param styles - Style configuration for CSS classes
 * @param options - Panel rendering options
 * @returns HTML string for the routes panel
 */
export function renderRoutesPanel(
  routes: RouteEntry[],
  styles: StyleConfig,
  options: RoutesPanelOptions = {}
): string {
  const { showName = false } = options;

  if (!routes.length) {
    return `<div class="${styles.emptyState}">No routes available</div>`;
  }

  const rows = routes
    .map((entry) => renderRouteRow(entry, styles, { showName }))
    .join('');

  const nameHeader = showName ? '<th>Name</th>' : '';

  return `
    <table class="${styles.tableRoutes || styles.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${nameHeader}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}
