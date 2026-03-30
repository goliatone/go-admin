import { b as i, a as L } from "../chunks/dom-helpers-Cd24RS2-.js";
import { escapeHTML as l } from "../shared/html.js";
import { onReady as S } from "../shared/dom-ready.js";
class M {
  constructor(e) {
    this.healthData = null, this.autoRefreshTimer = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.elements = {
      timeRange: i("#time-range"),
      providerFilter: i("#provider-filter"),
      refreshBtn: i("#refresh-btn"),
      healthScore: i("#health-score"),
      healthIndicator: i("#health-indicator"),
      healthTrend: i("#health-trend"),
      syncSuccessRate: i("#sync-success-rate"),
      syncSuccessCount: i("#sync-success-count"),
      syncFailedCount: i("#sync-failed-count"),
      syncSuccessBar: i("#sync-success-bar"),
      conflictCount: i("#conflict-count"),
      conflictPending: i("#conflict-pending"),
      conflictResolved: i("#conflict-resolved"),
      conflictTrend: i("#conflict-trend"),
      syncLag: i("#sync-lag"),
      lagStatus: i("#lag-status"),
      lastSync: i("#last-sync"),
      retryTotal: i("#retry-total"),
      retryRecovery: i("#retry-recovery"),
      retryAvg: i("#retry-avg"),
      retryList: i("#retry-list"),
      providerHealthTable: i("#provider-health-table"),
      alertsList: i("#alerts-list"),
      noAlerts: i("#no-alerts"),
      alertCount: i("#alert-count"),
      activityFeed: i("#activity-feed"),
      syncChartCanvas: i("#sync-chart-canvas"),
      conflictChartCanvas: i("#conflict-chart-canvas")
    };
  }
  /**
   * Initialize the health dashboard
   */
  async init() {
    this.setupEventListeners(), this.initCharts(), await this.loadHealthData();
    const e = this.config.autoRefreshInterval || 3e4;
    this.autoRefreshTimer = setInterval(() => this.loadHealthData(), e);
  }
  /**
   * Cleanup resources
   */
  destroy() {
    this.autoRefreshTimer && (clearInterval(this.autoRefreshTimer), this.autoRefreshTimer = null);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const { refreshBtn: e, timeRange: t, providerFilter: a } = this.elements;
    e && e.addEventListener("click", () => this.loadHealthData()), t && t.addEventListener("change", () => this.loadHealthData()), a && a.addEventListener("change", () => this.loadHealthData());
  }
  /**
   * Initialize chart canvases
   */
  initCharts() {
    const { syncChartCanvas: e, conflictChartCanvas: t } = this.elements;
    e && (e.width = e.parentElement?.clientWidth || 400, e.height = 240), t && (t.width = t.parentElement?.clientWidth || 400, t.height = 240);
  }
  /**
   * Load health data from API
   */
  async loadHealthData() {
    const { timeRange: e, providerFilter: t } = this.elements, a = e?.value || "24h", s = t?.value || "";
    try {
      const n = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      n.searchParams.set("range", a), s && n.searchParams.set("provider", s);
      const r = await fetch(n.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!r.ok)
        this.healthData = this.generateMockHealthData(a, s);
      else {
        const o = await r.json();
        this.healthData = o;
      }
      this.renderHealthData(), L("Health data refreshed");
    } catch (n) {
      console.error("Failed to load health data:", n), this.healthData = this.generateMockHealthData(a, s), this.renderHealthData();
    }
  }
  /**
   * Generate mock health data for demonstration
   */
  generateMockHealthData(e, t) {
    const s = Math.min(e === "1h" ? 1 : e === "6h" ? 6 : e === "24h" ? 24 : e === "7d" ? 168 : 720, 24);
    return {
      healthScore: 98,
      healthTrend: 2,
      syncStats: {
        total: 300,
        succeeded: 289,
        failed: 11,
        running: 2,
        successRate: 96.5
      },
      conflictStats: {
        pending: 7,
        resolvedToday: 42,
        total: 49,
        trend: -3
      },
      lagStats: {
        averageMinutes: 12,
        status: "normal",
        lastSyncMinutesAgo: 3
      },
      retryStats: {
        total: 23,
        recoveryRate: 87,
        avgAttempts: 1.4,
        recent: [
          { provider: "salesforce", entity: "Contact", time: "5m ago", status: "recovered" },
          { provider: "hubspot", entity: "Deal", time: "12m ago", status: "recovered" },
          { provider: "bamboohr", entity: "Employee", time: "28m ago", status: "pending" }
        ]
      },
      providerHealth: (t ? [t] : ["salesforce", "hubspot", "bamboohr", "workday"]).map((r) => ({
        provider: r,
        status: r === "workday" ? "degraded" : "healthy",
        successRate: r === "workday" ? 89.2 : 97 + Math.random() * 3,
        lastSync: `${Math.floor(Math.random() * 30) + 1}m ago`,
        conflicts: Math.floor(Math.random() * 5),
        lagMinutes: Math.floor(Math.random() * 20) + 5
      })),
      alerts: [
        { severity: "warning", provider: "workday", message: "Elevated error rate detected", time: "15m ago" },
        { severity: "info", provider: "salesforce", message: "Rate limit approaching (80%)", time: "1h ago" }
      ],
      activityFeed: this.generateActivityFeed(20),
      chartData: {
        sync: this.generateTimeSeriesData(s, "sync"),
        conflicts: this.generateTimeSeriesData(s, "conflicts")
      }
    };
  }
  /**
   * Generate activity feed data
   */
  generateActivityFeed(e) {
    const t = [], a = ["sync_completed", "sync_failed", "conflict_created", "conflict_resolved", "mapping_published"], s = ["salesforce", "hubspot", "bamboohr", "workday"];
    for (let n = 0; n < e; n++) {
      const r = a[Math.floor(Math.random() * a.length)], o = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: r,
        provider: o,
        message: this.getActivityMessage(r, o),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: r.includes("failed") || r.includes("created") ? "warning" : "success"
      });
    }
    return t;
  }
  /**
   * Get activity message
   */
  getActivityMessage(e, t) {
    return {
      sync_completed: `Sync completed for ${t} (42 records)`,
      sync_failed: `Sync failed for ${t}: Connection timeout`,
      conflict_created: `New conflict detected in ${t} binding`,
      conflict_resolved: `Conflict resolved for ${t} record`,
      mapping_published: `Mapping spec published for ${t}`
    }[e] || `Activity for ${t}`;
  }
  /**
   * Generate time series data
   */
  generateTimeSeriesData(e, t) {
    const a = [], s = t === "sync" ? { success: [], failed: [] } : { pending: [], resolved: [] }, n = /* @__PURE__ */ new Date();
    for (let r = e - 1; r >= 0; r--) {
      const o = new Date(n.getTime() - r * 36e5);
      a.push(
        o.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
      ), t === "sync" ? (s.success.push(Math.floor(Math.random() * 15) + 10), s.failed.push(Math.floor(Math.random() * 3))) : (s.pending.push(Math.floor(Math.random() * 5)), s.resolved.push(Math.floor(Math.random() * 8) + 2));
    }
    return { labels: a, datasets: s };
  }
  /**
   * Render all health data
   */
  renderHealthData() {
    this.healthData && (this.renderHealthScore(), this.renderSyncStats(), this.renderConflictStats(), this.renderLagStats(), this.renderRetryActivity(), this.renderProviderHealth(), this.renderAlerts(), this.renderActivityFeed(), this.updateCharts());
  }
  /**
   * Render health score section
   */
  renderHealthScore() {
    if (!this.healthData) return;
    const { healthScore: e, healthIndicator: t, healthTrend: a } = this.elements, s = this.healthData;
    if (e && (e.textContent = `${s.healthScore}%`, s.healthScore >= 95 ? e.className = "text-3xl font-bold text-green-600" : s.healthScore >= 80 ? e.className = "text-3xl font-bold text-yellow-600" : e.className = "text-3xl font-bold text-red-600"), t && (s.healthScore >= 95 ? (t.className = "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>') : s.healthScore >= 80 ? (t.className = "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>') : (t.className = "w-12 h-12 rounded-full bg-red-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>')), a) {
      const n = s.healthTrend >= 0 ? "+" : "";
      a.textContent = `${n}${s.healthTrend}% from previous period`;
    }
  }
  /**
   * Render sync statistics
   */
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: a, syncSuccessBar: s } = this.elements, n = this.healthData.syncStats;
    e && (e.textContent = `${n.successRate.toFixed(1)}%`), t && (t.textContent = `${n.succeeded} succeeded`), a && (a.textContent = `${n.failed} failed`), s && (s.style.width = `${n.successRate}%`);
  }
  /**
   * Render conflict statistics
   */
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: a, conflictTrend: s } = this.elements, n = this.healthData.conflictStats;
    if (e && (e.textContent = String(n.pending)), t && (t.textContent = `${n.pending} pending`), a && (a.textContent = `${n.resolvedToday} resolved today`), s) {
      const r = n.trend >= 0 ? "+" : "";
      s.textContent = `${r}${n.trend} from previous period`;
    }
  }
  /**
   * Render lag statistics
   */
  renderLagStats() {
    if (!this.healthData) return;
    const { syncLag: e, lagStatus: t, lastSync: a } = this.elements, s = this.healthData.lagStats;
    e && (e.textContent = `${s.averageMinutes}m`), t && (s.status === "normal" ? (t.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", t.textContent = "Normal") : s.status === "elevated" ? (t.className = "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", t.textContent = "Elevated") : (t.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full", t.textContent = "Critical")), a && (a.textContent = `Last sync: ${s.lastSyncMinutesAgo} minutes ago`);
  }
  /**
   * Render retry activity
   */
  renderRetryActivity() {
    if (!this.healthData) return;
    const { retryTotal: e, retryRecovery: t, retryAvg: a, retryList: s } = this.elements, n = this.healthData.retryStats;
    e && (e.textContent = String(n.total)), t && (t.textContent = `${n.recoveryRate}%`), a && (a.textContent = n.avgAttempts.toFixed(1)), s && (s.innerHTML = n.recent.map(
      (r) => `
          <div class="flex justify-between items-center py-1">
            <span>${l(r.provider)} / ${l(r.entity)}</span>
            <span class="${r.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${l(r.time)}</span>
          </div>
        `
    ).join(""));
  }
  /**
   * Render provider health table
   */
  renderProviderHealth() {
    if (!this.healthData) return;
    const { providerHealthTable: e } = this.elements;
    e && (e.innerHTML = this.healthData.providerHealth.map(
      (t) => `
        <tr class="border-b last:border-0">
          <td class="py-3 font-medium capitalize">${l(t.provider)}</td>
          <td class="py-3">
            <span class="px-2 py-1 text-xs rounded-full ${t.status === "healthy" ? "bg-green-100 text-green-800" : t.status === "degraded" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}">
              ${t.status}
            </span>
          </td>
          <td class="py-3 ${t.successRate >= 95 ? "text-green-600" : t.successRate >= 80 ? "text-yellow-600" : "text-red-600"}">
            ${t.successRate.toFixed(1)}%
          </td>
          <td class="py-3 text-gray-600">${l(t.lastSync)}</td>
          <td class="py-3">
            ${t.conflicts > 0 ? `<span class="text-orange-600">${t.conflicts}</span>` : '<span class="text-gray-400">0</span>'}
          </td>
          <td class="py-3 text-gray-600">${t.lagMinutes}m</td>
        </tr>
      `
    ).join(""));
  }
  /**
   * Render alerts
   */
  renderAlerts() {
    if (!this.healthData) return;
    const { alertsList: e, noAlerts: t, alertCount: a } = this.elements;
    this.healthData.alerts.length === 0 ? (e && e.classList.add("hidden"), t && t.classList.remove("hidden"), a && (a.textContent = "0 active", a.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full")) : (e && e.classList.remove("hidden"), t && t.classList.add("hidden"), a && (a.textContent = `${this.healthData.alerts.length} active`, a.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"), e && (e.innerHTML = this.healthData.alerts.map(
      (s) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${s.severity === "warning" ? "bg-yellow-50 border border-yellow-200" : s.severity === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(s.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${l(s.provider)}</span>
                  <span class="text-xs text-gray-500">${l(s.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${l(s.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `
    ).join(""), e.querySelectorAll(".dismiss-alert-btn").forEach((s) => {
      s.addEventListener("click", (n) => this.dismissAlert(n));
    })));
  }
  /**
   * Get alert icon SVG
   */
  getAlertIcon(e) {
    return e === "warning" ? '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : e === "error" ? '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }
  /**
   * Dismiss an alert
   */
  dismissAlert(e) {
    const a = e.currentTarget.closest(".flex.items-start");
    a && a.remove();
    const { alertsList: s, noAlerts: n, alertCount: r } = this.elements, o = s?.querySelectorAll(":scope > div").length || 0;
    r && (r.textContent = `${o} active`, o === 0 && (r.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", s && s.classList.add("hidden"), n && n.classList.remove("hidden")));
  }
  /**
   * Render activity feed
   */
  renderActivityFeed() {
    if (!this.healthData) return;
    const { activityFeed: e } = this.elements;
    e && (e.innerHTML = this.healthData.activityFeed.map(
      (t) => `
        <div class="flex items-center gap-3 py-2 border-b last:border-0">
          <div class="w-2 h-2 rounded-full ${t.status === "success" ? "bg-green-500" : "bg-yellow-500"}"></div>
          <div class="flex-1 text-sm">
            <span class="text-gray-700">${l(t.message)}</span>
          </div>
          <span class="text-xs text-gray-400">${l(t.time)}</span>
        </div>
      `
    ).join(""));
  }
  /**
   * Update charts
   */
  updateCharts() {
    this.healthData && (this.renderBarChart(
      "sync-chart-canvas",
      this.healthData.chartData.sync,
      ["#22c55e", "#ef4444"],
      ["Success", "Failed"]
    ), this.renderBarChart(
      "conflict-chart-canvas",
      this.healthData.chartData.conflicts,
      ["#f97316", "#22c55e"],
      ["New", "Resolved"]
    ));
  }
  /**
   * Render a bar chart on canvas
   */
  renderBarChart(e, t, a, s) {
    const n = document.getElementById(e);
    if (!n) return;
    const r = n.getContext("2d");
    if (!r) return;
    const o = n.width, f = n.height, h = 40, m = o - h * 2, x = f - h * 2;
    r.clearRect(0, 0, o, f);
    const g = t.labels, y = Object.values(t.datasets), p = m / g.length / (y.length + 1), b = Math.max(...y.flat()) || 1;
    g.forEach((d, u) => {
      const v = h + u * m / g.length + p / 2;
      y.forEach(($, w) => {
        const C = $[u] / b * x, D = v + w * p, k = f - h - C;
        r.fillStyle = a[w] || "#6b7280", r.fillRect(D, k, p - 2, C);
      }), u % Math.ceil(g.length / 6) === 0 && (r.fillStyle = "#6b7280", r.font = "10px sans-serif", r.textAlign = "center", r.fillText(d, v + y.length * p / 2, f - h + 15));
    }), r.fillStyle = "#6b7280", r.font = "10px sans-serif", r.textAlign = "right";
    for (let d = 0; d <= 4; d++) {
      const u = f - h - d * x / 4, v = Math.round(b * d / 4);
      r.fillText(v.toString(), h - 5, u + 3);
    }
  }
  /**
   * Escape HTML
   */
}
function A(c) {
  const e = new M(c);
  return S(() => e.init()), e;
}
function B(c) {
  const e = {
    basePath: c.basePath,
    apiBasePath: c.apiBasePath || `${c.basePath}/api`,
    autoRefreshInterval: c.autoRefreshInterval || 3e4
  }, t = new M(e);
  S(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
export {
  M as IntegrationHealthController,
  B as bootstrapIntegrationHealth,
  A as initIntegrationHealth
};
//# sourceMappingURL=integration-health.js.map
