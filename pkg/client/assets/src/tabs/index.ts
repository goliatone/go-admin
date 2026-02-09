/**
 * Tabs module for resource detail views
 *
 * Provides tab navigation and content loading functionality
 * for admin panel detail pages with multiple tabs.
 *
 * Usage:
 * ```typescript
 * import { initTabsController } from './tabs';
 *
 * // Auto-initialize on page load
 * document.addEventListener('DOMContentLoaded', () => {
 *   initTabsController();
 * });
 *
 * // Or with options
 * const controller = initTabsController({
 *   onTabChange: (tabId) => console.log('Tab changed:', tabId),
 *   onError: (err) => console.error('Tab error:', err),
 * });
 *
 * // Programmatic tab switching
 * controller?.switchToTab('activity');
 * ```
 */

export { TabsController, initTabsController } from './tabs-controller';
export * from './types';
export * from './formatters';
export * from './renderers';
