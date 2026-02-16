/**
 * E-Sign Integration Health Page Controller
 * Real-time observability dashboard for CRM/HRIS integrations
 */

import { qs, qsa, onReady, announce } from '../utils/dom-helpers.js';

/**
 * Configuration for the integration health page
 */
export interface IntegrationHealthConfig {
  basePath: string;
  apiBasePath?: string;
  autoRefreshInterval?: number;
}

/**
 * Health data from API
 */
interface HealthData {
  healthScore: number;
  healthTrend: number;
  syncStats: {
    total: number;
    succeeded: number;
    failed: number;
    running: number;
    successRate: number;
  };
  conflictStats: {
    pending: number;
    resolvedToday: number;
    total: number;
    trend: number;
  };
  lagStats: {
    averageMinutes: number;
    status: 'normal' | 'elevated' | 'critical';
    lastSyncMinutesAgo: number;
  };
  retryStats: {
    total: number;
    recoveryRate: number;
    avgAttempts: number;
    recent: Array<{
      provider: string;
      entity: string;
      time: string;
      status: 'recovered' | 'pending' | 'failed';
    }>;
  };
  providerHealth: Array<{
    provider: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    successRate: number;
    lastSync: string;
    conflicts: number;
    lagMinutes: number;
  }>;
  alerts: Array<{
    severity: 'info' | 'warning' | 'error';
    provider: string;
    message: string;
    time: string;
  }>;
  activityFeed: Array<{
    type: string;
    provider: string;
    message: string;
    time: string;
    status: 'success' | 'warning' | 'error';
  }>;
  chartData: {
    sync: ChartData;
    conflicts: ChartData;
  };
}

interface ChartData {
  labels: string[];
  datasets: Record<string, number[]>;
}

/**
 * Integration Health page controller
 * Manages health dashboard, charts, and real-time updates
 */
export class IntegrationHealthController {
  private readonly config: IntegrationHealthConfig;
  private readonly apiBase: string;
  private healthData: HealthData | null = null;
  private autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  private readonly elements: {
    timeRange: HTMLSelectElement | null;
    providerFilter: HTMLSelectElement | null;
    refreshBtn: HTMLElement | null;
    healthScore: HTMLElement | null;
    healthIndicator: HTMLElement | null;
    healthTrend: HTMLElement | null;
    syncSuccessRate: HTMLElement | null;
    syncSuccessCount: HTMLElement | null;
    syncFailedCount: HTMLElement | null;
    syncSuccessBar: HTMLElement | null;
    conflictCount: HTMLElement | null;
    conflictPending: HTMLElement | null;
    conflictResolved: HTMLElement | null;
    conflictTrend: HTMLElement | null;
    syncLag: HTMLElement | null;
    lagStatus: HTMLElement | null;
    lastSync: HTMLElement | null;
    retryTotal: HTMLElement | null;
    retryRecovery: HTMLElement | null;
    retryAvg: HTMLElement | null;
    retryList: HTMLElement | null;
    providerHealthTable: HTMLElement | null;
    alertsList: HTMLElement | null;
    noAlerts: HTMLElement | null;
    alertCount: HTMLElement | null;
    activityFeed: HTMLElement | null;
    syncChartCanvas: HTMLCanvasElement | null;
    conflictChartCanvas: HTMLCanvasElement | null;
  };

  constructor(config: IntegrationHealthConfig) {
    this.config = config;
    this.apiBase = config.apiBasePath || `${config.basePath}/api`;

    this.elements = {
      timeRange: qs<HTMLSelectElement>('#time-range'),
      providerFilter: qs<HTMLSelectElement>('#provider-filter'),
      refreshBtn: qs('#refresh-btn'),
      healthScore: qs('#health-score'),
      healthIndicator: qs('#health-indicator'),
      healthTrend: qs('#health-trend'),
      syncSuccessRate: qs('#sync-success-rate'),
      syncSuccessCount: qs('#sync-success-count'),
      syncFailedCount: qs('#sync-failed-count'),
      syncSuccessBar: qs('#sync-success-bar'),
      conflictCount: qs('#conflict-count'),
      conflictPending: qs('#conflict-pending'),
      conflictResolved: qs('#conflict-resolved'),
      conflictTrend: qs('#conflict-trend'),
      syncLag: qs('#sync-lag'),
      lagStatus: qs('#lag-status'),
      lastSync: qs('#last-sync'),
      retryTotal: qs('#retry-total'),
      retryRecovery: qs('#retry-recovery'),
      retryAvg: qs('#retry-avg'),
      retryList: qs('#retry-list'),
      providerHealthTable: qs('#provider-health-table'),
      alertsList: qs('#alerts-list'),
      noAlerts: qs('#no-alerts'),
      alertCount: qs('#alert-count'),
      activityFeed: qs('#activity-feed'),
      syncChartCanvas: qs<HTMLCanvasElement>('#sync-chart-canvas'),
      conflictChartCanvas: qs<HTMLCanvasElement>('#conflict-chart-canvas'),
    };
  }

  /**
   * Initialize the health dashboard
   */
  async init(): Promise<void> {
    this.setupEventListeners();
    this.initCharts();
    await this.loadHealthData();

    // Setup auto-refresh
    const interval = this.config.autoRefreshInterval || 30000;
    this.autoRefreshTimer = setInterval(() => this.loadHealthData(), interval);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const { refreshBtn, timeRange, providerFilter } = this.elements;

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadHealthData());
    }

    if (timeRange) {
      timeRange.addEventListener('change', () => this.loadHealthData());
    }

    if (providerFilter) {
      providerFilter.addEventListener('change', () => this.loadHealthData());
    }
  }

  /**
   * Initialize chart canvases
   */
  private initCharts(): void {
    const { syncChartCanvas, conflictChartCanvas } = this.elements;

    if (syncChartCanvas) {
      syncChartCanvas.width = syncChartCanvas.parentElement?.clientWidth || 400;
      syncChartCanvas.height = 240;
    }

    if (conflictChartCanvas) {
      conflictChartCanvas.width = conflictChartCanvas.parentElement?.clientWidth || 400;
      conflictChartCanvas.height = 240;
    }
  }

  /**
   * Load health data from API
   */
  async loadHealthData(): Promise<void> {
    const { timeRange, providerFilter } = this.elements;
    const range = timeRange?.value || '24h';
    const provider = providerFilter?.value || '';

    try {
      const url = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      url.searchParams.set('range', range);
      if (provider) {
        url.searchParams.set('provider', provider);
      }

      const response = await fetch(url.toString(), {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        // Use mock data for demo
        this.healthData = this.generateMockHealthData(range, provider);
      } else {
        const data = await response.json();
        this.healthData = data;
      }

      this.renderHealthData();
      announce(`Health data refreshed`);
    } catch (error) {
      console.error('Failed to load health data:', error);
      // Use mock data as fallback
      this.healthData = this.generateMockHealthData(range, provider);
      this.renderHealthData();
    }
  }

  /**
   * Generate mock health data for demonstration
   */
  private generateMockHealthData(timeRange: string, provider: string): HealthData {
    const hours =
      timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
    const dataPoints = Math.min(hours, 24);
    const providers = provider
      ? [provider]
      : ['salesforce', 'hubspot', 'bamboohr', 'workday'];

    return {
      healthScore: 98,
      healthTrend: 2,
      syncStats: {
        total: 300,
        succeeded: 289,
        failed: 11,
        running: 2,
        successRate: 96.5,
      },
      conflictStats: {
        pending: 7,
        resolvedToday: 42,
        total: 49,
        trend: -3,
      },
      lagStats: {
        averageMinutes: 12,
        status: 'normal',
        lastSyncMinutesAgo: 3,
      },
      retryStats: {
        total: 23,
        recoveryRate: 87,
        avgAttempts: 1.4,
        recent: [
          { provider: 'salesforce', entity: 'Contact', time: '5m ago', status: 'recovered' },
          { provider: 'hubspot', entity: 'Deal', time: '12m ago', status: 'recovered' },
          { provider: 'bamboohr', entity: 'Employee', time: '28m ago', status: 'pending' },
        ],
      },
      providerHealth: providers.map((p) => ({
        provider: p,
        status: p === 'workday' ? 'degraded' as const : 'healthy' as const,
        successRate: p === 'workday' ? 89.2 : 97 + Math.random() * 3,
        lastSync: `${Math.floor(Math.random() * 30) + 1}m ago`,
        conflicts: Math.floor(Math.random() * 5),
        lagMinutes: Math.floor(Math.random() * 20) + 5,
      })),
      alerts: [
        { severity: 'warning', provider: 'workday', message: 'Elevated error rate detected', time: '15m ago' },
        { severity: 'info', provider: 'salesforce', message: 'Rate limit approaching (80%)', time: '1h ago' },
      ],
      activityFeed: this.generateActivityFeed(20),
      chartData: {
        sync: this.generateTimeSeriesData(dataPoints, 'sync'),
        conflicts: this.generateTimeSeriesData(dataPoints, 'conflicts'),
      },
    };
  }

  /**
   * Generate activity feed data
   */
  private generateActivityFeed(
    count: number
  ): Array<{ type: string; provider: string; message: string; time: string; status: 'success' | 'warning' | 'error' }> {
    const activities: Array<{ type: string; provider: string; message: string; time: string; status: 'success' | 'warning' | 'error' }> = [];
    const types = ['sync_completed', 'sync_failed', 'conflict_created', 'conflict_resolved', 'mapping_published'];
    const providers = ['salesforce', 'hubspot', 'bamboohr', 'workday'];

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      activities.push({
        type,
        provider,
        message: this.getActivityMessage(type, provider),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: type.includes('failed') || type.includes('created') ? 'warning' : 'success',
      });
    }
    return activities;
  }

  /**
   * Get activity message
   */
  private getActivityMessage(type: string, provider: string): string {
    const messages: Record<string, string> = {
      sync_completed: `Sync completed for ${provider} (42 records)`,
      sync_failed: `Sync failed for ${provider}: Connection timeout`,
      conflict_created: `New conflict detected in ${provider} binding`,
      conflict_resolved: `Conflict resolved for ${provider} record`,
      mapping_published: `Mapping spec published for ${provider}`,
    };
    return messages[type] || `Activity for ${provider}`;
  }

  /**
   * Generate time series data
   */
  private generateTimeSeriesData(points: number, type: string): ChartData {
    const labels: string[] = [];
    const datasets: Record<string, number[]> = type === 'sync'
      ? { success: [], failed: [] }
      : { pending: [], resolved: [] };

    const now = new Date();
    for (let i = points - 1; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 3600000);
      labels.push(
        time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      );

      if (type === 'sync') {
        datasets.success.push(Math.floor(Math.random() * 15) + 10);
        datasets.failed.push(Math.floor(Math.random() * 3));
      } else {
        datasets.pending.push(Math.floor(Math.random() * 5));
        datasets.resolved.push(Math.floor(Math.random() * 8) + 2);
      }
    }

    return { labels, datasets };
  }

  /**
   * Render all health data
   */
  private renderHealthData(): void {
    if (!this.healthData) return;

    this.renderHealthScore();
    this.renderSyncStats();
    this.renderConflictStats();
    this.renderLagStats();
    this.renderRetryActivity();
    this.renderProviderHealth();
    this.renderAlerts();
    this.renderActivityFeed();
    this.updateCharts();
  }

  /**
   * Render health score section
   */
  private renderHealthScore(): void {
    if (!this.healthData) return;
    const { healthScore, healthIndicator, healthTrend } = this.elements;
    const data = this.healthData;

    if (healthScore) {
      healthScore.textContent = `${data.healthScore}%`;

      if (data.healthScore >= 95) {
        healthScore.className = 'text-3xl font-bold text-green-600';
      } else if (data.healthScore >= 80) {
        healthScore.className = 'text-3xl font-bold text-yellow-600';
      } else {
        healthScore.className = 'text-3xl font-bold text-red-600';
      }
    }

    if (healthIndicator) {
      if (data.healthScore >= 95) {
        healthIndicator.className = 'w-12 h-12 rounded-full bg-green-100 flex items-center justify-center';
        healthIndicator.innerHTML = `<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
      } else if (data.healthScore >= 80) {
        healthIndicator.className = 'w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center';
        healthIndicator.innerHTML = `<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
      } else {
        healthIndicator.className = 'w-12 h-12 rounded-full bg-red-100 flex items-center justify-center';
        healthIndicator.innerHTML = `<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
      }
    }

    if (healthTrend) {
      const trendSign = data.healthTrend >= 0 ? '+' : '';
      healthTrend.textContent = `${trendSign}${data.healthTrend}% from previous period`;
    }
  }

  /**
   * Render sync statistics
   */
  private renderSyncStats(): void {
    if (!this.healthData) return;
    const { syncSuccessRate, syncSuccessCount, syncFailedCount, syncSuccessBar } = this.elements;
    const stats = this.healthData.syncStats;

    if (syncSuccessRate) {
      syncSuccessRate.textContent = `${stats.successRate.toFixed(1)}%`;
    }
    if (syncSuccessCount) {
      syncSuccessCount.textContent = `${stats.succeeded} succeeded`;
    }
    if (syncFailedCount) {
      syncFailedCount.textContent = `${stats.failed} failed`;
    }
    if (syncSuccessBar) {
      syncSuccessBar.style.width = `${stats.successRate}%`;
    }
  }

  /**
   * Render conflict statistics
   */
  private renderConflictStats(): void {
    if (!this.healthData) return;
    const { conflictCount, conflictPending, conflictResolved, conflictTrend } = this.elements;
    const stats = this.healthData.conflictStats;

    if (conflictCount) {
      conflictCount.textContent = String(stats.pending);
    }
    if (conflictPending) {
      conflictPending.textContent = `${stats.pending} pending`;
    }
    if (conflictResolved) {
      conflictResolved.textContent = `${stats.resolvedToday} resolved today`;
    }
    if (conflictTrend) {
      const trendSign = stats.trend >= 0 ? '+' : '';
      conflictTrend.textContent = `${trendSign}${stats.trend} from previous period`;
    }
  }

  /**
   * Render lag statistics
   */
  private renderLagStats(): void {
    if (!this.healthData) return;
    const { syncLag, lagStatus, lastSync } = this.elements;
    const stats = this.healthData.lagStats;

    if (syncLag) {
      syncLag.textContent = `${stats.averageMinutes}m`;
    }

    if (lagStatus) {
      if (stats.status === 'normal') {
        lagStatus.className = 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full';
        lagStatus.textContent = 'Normal';
      } else if (stats.status === 'elevated') {
        lagStatus.className = 'px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full';
        lagStatus.textContent = 'Elevated';
      } else {
        lagStatus.className = 'px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full';
        lagStatus.textContent = 'Critical';
      }
    }

    if (lastSync) {
      lastSync.textContent = `Last sync: ${stats.lastSyncMinutesAgo} minutes ago`;
    }
  }

  /**
   * Render retry activity
   */
  private renderRetryActivity(): void {
    if (!this.healthData) return;
    const { retryTotal, retryRecovery, retryAvg, retryList } = this.elements;
    const stats = this.healthData.retryStats;

    if (retryTotal) {
      retryTotal.textContent = String(stats.total);
    }
    if (retryRecovery) {
      retryRecovery.textContent = `${stats.recoveryRate}%`;
    }
    if (retryAvg) {
      retryAvg.textContent = stats.avgAttempts.toFixed(1);
    }

    if (retryList) {
      retryList.innerHTML = stats.recent
        .map(
          (r) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(r.provider)} / ${this.escapeHtml(r.entity)}</span>
            <span class="${r.status === 'recovered' ? 'text-green-600' : 'text-yellow-600'}">${this.escapeHtml(r.time)}</span>
          </div>
        `
        )
        .join('');
    }
  }

  /**
   * Render provider health table
   */
  private renderProviderHealth(): void {
    if (!this.healthData) return;
    const { providerHealthTable } = this.elements;
    if (!providerHealthTable) return;

    providerHealthTable.innerHTML = this.healthData.providerHealth
      .map(
        (p) => `
        <tr class="border-b last:border-0">
          <td class="py-3 font-medium capitalize">${this.escapeHtml(p.provider)}</td>
          <td class="py-3">
            <span class="px-2 py-1 text-xs rounded-full ${
              p.status === 'healthy'
                ? 'bg-green-100 text-green-800'
                : p.status === 'degraded'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }">
              ${p.status}
            </span>
          </td>
          <td class="py-3 ${
            p.successRate >= 95
              ? 'text-green-600'
              : p.successRate >= 80
                ? 'text-yellow-600'
                : 'text-red-600'
          }">
            ${p.successRate.toFixed(1)}%
          </td>
          <td class="py-3 text-gray-600">${this.escapeHtml(p.lastSync)}</td>
          <td class="py-3">
            ${p.conflicts > 0 ? `<span class="text-orange-600">${p.conflicts}</span>` : '<span class="text-gray-400">0</span>'}
          </td>
          <td class="py-3 text-gray-600">${p.lagMinutes}m</td>
        </tr>
      `
      )
      .join('');
  }

  /**
   * Render alerts
   */
  private renderAlerts(): void {
    if (!this.healthData) return;
    const { alertsList, noAlerts, alertCount } = this.elements;

    if (this.healthData.alerts.length === 0) {
      if (alertsList) alertsList.classList.add('hidden');
      if (noAlerts) noAlerts.classList.remove('hidden');
      if (alertCount) {
        alertCount.textContent = '0 active';
        alertCount.className = 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full';
      }
    } else {
      if (alertsList) alertsList.classList.remove('hidden');
      if (noAlerts) noAlerts.classList.add('hidden');
      if (alertCount) {
        alertCount.textContent = `${this.healthData.alerts.length} active`;
        alertCount.className = 'px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full';
      }

      if (alertsList) {
        alertsList.innerHTML = this.healthData.alerts
          .map(
            (a) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${
              a.severity === 'warning'
                ? 'bg-yellow-50 border border-yellow-200'
                : a.severity === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
            }">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(a.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${this.escapeHtml(a.provider)}</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(a.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(a.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `
          )
          .join('');

        // Attach dismiss handlers
        alertsList.querySelectorAll('.dismiss-alert-btn').forEach((btn) => {
          btn.addEventListener('click', (e) => this.dismissAlert(e));
        });
      }
    }
  }

  /**
   * Get alert icon SVG
   */
  private getAlertIcon(severity: string): string {
    if (severity === 'warning') {
      return '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>';
    }
    if (severity === 'error') {
      return '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
    }
    return '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }

  /**
   * Dismiss an alert
   */
  private dismissAlert(e: Event): void {
    const btn = e.currentTarget as HTMLElement;
    const alertElement = btn.closest('.flex.items-start');
    if (alertElement) {
      alertElement.remove();
    }

    // Update count
    const { alertsList, noAlerts, alertCount } = this.elements;
    const remaining = alertsList?.querySelectorAll(':scope > div').length || 0;

    if (alertCount) {
      alertCount.textContent = `${remaining} active`;
      if (remaining === 0) {
        alertCount.className = 'px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full';
        if (alertsList) alertsList.classList.add('hidden');
        if (noAlerts) noAlerts.classList.remove('hidden');
      }
    }
  }

  /**
   * Render activity feed
   */
  private renderActivityFeed(): void {
    if (!this.healthData) return;
    const { activityFeed } = this.elements;
    if (!activityFeed) return;

    activityFeed.innerHTML = this.healthData.activityFeed
      .map(
        (a) => `
        <div class="flex items-center gap-3 py-2 border-b last:border-0">
          <div class="w-2 h-2 rounded-full ${a.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'}"></div>
          <div class="flex-1 text-sm">
            <span class="text-gray-700">${this.escapeHtml(a.message)}</span>
          </div>
          <span class="text-xs text-gray-400">${this.escapeHtml(a.time)}</span>
        </div>
      `
      )
      .join('');
  }

  /**
   * Update charts
   */
  private updateCharts(): void {
    if (!this.healthData) return;

    this.renderBarChart(
      'sync-chart-canvas',
      this.healthData.chartData.sync,
      ['#22c55e', '#ef4444'],
      ['Success', 'Failed']
    );
    this.renderBarChart(
      'conflict-chart-canvas',
      this.healthData.chartData.conflicts,
      ['#f97316', '#22c55e'],
      ['New', 'Resolved']
    );
  }

  /**
   * Render a bar chart on canvas
   */
  private renderBarChart(
    canvasId: string,
    chartData: ChartData,
    colors: string[],
    _legends: string[]
  ): void {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    ctx.clearRect(0, 0, width, height);

    const labels = chartData.labels;
    const datasets = Object.values(chartData.datasets);
    const barWidth = chartWidth / labels.length / (datasets.length + 1);

    // Find max value for scaling
    const maxVal = Math.max(...datasets.flat()) || 1;

    // Draw bars
    labels.forEach((label, i) => {
      const x = padding + (i * chartWidth) / labels.length + barWidth / 2;

      datasets.forEach((data, j) => {
        const barHeight = (data[i] / maxVal) * chartHeight;
        const barX = x + j * barWidth;
        const barY = height - padding - barHeight;

        ctx.fillStyle = colors[j] || '#6b7280';
        ctx.fillRect(barX, barY, barWidth - 2, barHeight);
      });

      // Draw label every few bars to avoid crowding
      if (i % Math.ceil(labels.length / 6) === 0) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + (datasets.length * barWidth) / 2, height - padding + 15);
      }
    });

    // Draw y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = height - padding - (i * chartHeight) / 4;
      const val = Math.round((maxVal * i) / 4);
      ctx.fillText(val.toString(), padding - 5, y + 3);
    }
  }

  /**
   * Escape HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * Initialize integration health page from config
 */
export function initIntegrationHealth(config: IntegrationHealthConfig): IntegrationHealthController {
  const controller = new IntegrationHealthController(config);
  onReady(() => controller.init());
  return controller;
}

/**
 * Bootstrap integration health page from template context
 */
export function bootstrapIntegrationHealth(config: {
  basePath: string;
  apiBasePath?: string;
  autoRefreshInterval?: number;
}): void {
  const pageConfig: IntegrationHealthConfig = {
    basePath: config.basePath,
    apiBasePath: config.apiBasePath || `${config.basePath}/api`,
    autoRefreshInterval: config.autoRefreshInterval || 30000,
  };

  const controller = new IntegrationHealthController(pageConfig);
  onReady(() => controller.init());

  // Export for testing
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).esignIntegrationHealthController = controller;
  }
}
