/**
 * Admin Dashboard - Client-side initialization and rendering
 */

import { WidgetGrid } from './widget-grid.js';
import { WidgetRenderer } from './widget-renderer.js';
import type { Widget, AdminDashboardConfig, DashboardResponse } from './types.js';

/** Track executed chart scripts to prevent redeclaration errors */
const executedChartScripts = new Set<string>();

/**
 * Initialize the admin dashboard
 */
export async function initAdminDashboard(config: AdminDashboardConfig): Promise<void> {
  const renderer = new WidgetRenderer(config);
  const dashboardApi = config.apiBasePath
    ? `${config.apiBasePath}/dashboard`
    : `${config.basePath}/api/dashboard`;

  // Setup export button
  const exportBtn = document.getElementById('dashboard-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => window.open(dashboardApi));
  }

  // Fetch dashboard data
  const response = await fetch(dashboardApi);
  const data: DashboardResponse = await response.json();

  // Group widgets by area
  const widgetsByArea = groupWidgetsByArea(data.widgets || []);

  // Render widgets in each area
  for (const [areaCode, widgets] of Object.entries(widgetsByArea)) {
    const container = document.querySelector(`[data-area-grid="${areaCode}"]`);
    if (container) {
      container.innerHTML = widgets.map(w => renderer.render(w, areaCode)).join('');
    }
  }

  // Execute chart scripts (deduplicated)
  executeChartScripts();

  // Initialize widget grid with drag & drop
  const grid = new WidgetGrid({
    apiEndpoint: dashboardApi,
    preferencesEndpoint: `${dashboardApi}/preferences`,
    areas: ['admin.dashboard.main', 'admin.dashboard.sidebar', 'admin.dashboard.footer'],
    selectors: {
      hideBtn: '.hide-widget',
      resizeBtn: '.resize-widget',
    },
    onSave: (layout) => {
      console.log('Layout saved:', layout);
    },
    onError: (error) => {
      console.error('Widget grid error:', error);
      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        statusEl.textContent = 'Failed to save layout';
      }
    },
  });

  await grid.init();
}

/**
 * Group widgets by their area code
 */
function groupWidgetsByArea(widgets: Widget[]): Record<string, Widget[]> {
  return widgets.reduce((acc, widget) => {
    const area = widget.area || 'admin.dashboard.main';
    if (!acc[area]) {
      acc[area] = [];
    }
    acc[area].push(widget);
    return acc;
  }, {} as Record<string, Widget[]>);
}

/**
 * Execute chart scripts from rendered widgets (deduplicated)
 */
function executeChartScripts(): void {
  document.querySelectorAll('.chart-container script').forEach(script => {
    const scriptEl = script as HTMLScriptElement;
    const key = scriptEl.src || script.textContent || '';
    if (executedChartScripts.has(key)) return;
    executedChartScripts.add(key);

    const newScript = document.createElement('script');
    if (scriptEl.src) {
      newScript.src = scriptEl.src;
    } else {
      newScript.textContent = script.textContent;
    }
    document.body.appendChild(newScript);
  });
}

/**
 * Bootstrap dashboard from JSON config embedded in page
 */
export function bootstrapAdminDashboard(): void {
  const configEl = document.getElementById('admin-dashboard-config');
  if (!configEl?.textContent) {
    console.error('[admin-dashboard] Missing #admin-dashboard-config element');
    return;
  }

  try {
    const config: AdminDashboardConfig = JSON.parse(configEl.textContent);
    initAdminDashboard(config).catch(err => {
      console.error('[admin-dashboard] Failed to initialize:', err);
    });
  } catch (err) {
    console.error('[admin-dashboard] Invalid config JSON:', err);
  }
}
