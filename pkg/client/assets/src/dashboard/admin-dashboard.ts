/**
 * Admin Dashboard - Client-side initialization and rendering
 */

import { WidgetGrid } from './widget-grid.js';
import { WidgetRenderer } from './widget-renderer.js';
import type { Widget, AdminDashboardConfig, DashboardResponse } from './types.js';

const chartScriptCache = new Map<string, Promise<void>>();
const chartResizeObservers = new WeakMap<HTMLElement, ResizeObserver>();

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

  await hydrateCharts();

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
  await hydrateCharts();
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

function normalizeChartAssetsHost(rawHost: string): string {
  const trimmed = (rawHost || '').trim();
  if (!trimmed) {
    return '/dashboard/assets/echarts/';
  }
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

function ensureScript(src: string): Promise<void> {
  if (!src) {
    return Promise.resolve();
  }
  if (chartScriptCache.has(src)) {
    return chartScriptCache.get(src)!;
  }
  const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
  if (existing) {
    const done = Promise.resolve();
    chartScriptCache.set(src, done);
    return done;
  }
  const pending = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load chart asset: ${src}`));
    document.head.appendChild(script);
  });
  chartScriptCache.set(src, pending);
  return pending;
}

async function ensureEChartsAssets(theme: string, assetsHost: string): Promise<void> {
  const host = normalizeChartAssetsHost(assetsHost);
  await ensureScript(`${host}echarts.min.js`);
  if (theme && theme !== 'default') {
    await ensureScript(`${host}themes/${theme}.js`);
  }
}

function parseChartOptions(container: HTMLElement): Record<string, any> | null {
  const payloadEl = container.querySelector('script[data-chart-options]');
  if (!payloadEl?.textContent) {
    return null;
  }
  try {
    return JSON.parse(payloadEl.textContent);
  } catch (error) {
    console.error('[admin-dashboard] Failed to parse chart options', error);
    return null;
  }
}

function mountChart(container: HTMLElement): void {
  const targetId = (container.dataset.chartId || '').trim();
  const theme = (container.dataset.chartTheme || 'westeros').trim();
  const options = parseChartOptions(container);
  const target = targetId ? document.getElementById(targetId) : null;
  const echarts = (window as any).echarts;
  if (!target || !options || !echarts) {
    return;
  }

  const chart = echarts.getInstanceByDom(target) || echarts.init(target, theme, { renderer: 'canvas' });
  chart.setOption(options, true);

  if (!chartResizeObservers.has(container) && window.ResizeObserver) {
    const observer = new ResizeObserver(() => {
      try {
        chart.resize();
      } catch (resizeError) {
        console.warn('[admin-dashboard] Chart resize failed', resizeError);
      }
    });
    observer.observe(target);
    chartResizeObservers.set(container, observer);
  }
}

async function hydrateCharts(): Promise<void> {
  const containers = Array.from(document.querySelectorAll<HTMLElement>('[data-echart-widget]'));
  for (const container of containers) {
    const theme = (container.dataset.chartTheme || 'westeros').trim();
    const assetsHost = container.dataset.chartAssetsHost || '';
    try {
      await ensureEChartsAssets(theme, assetsHost);
      mountChart(container);
    } catch (error) {
      console.error('[admin-dashboard] Failed to hydrate chart widget', error);
    }
  }
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
