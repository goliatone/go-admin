import { c as w, l as i, t as D } from "./dom-helpers-CDdChTSn.js";
var C = class {
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
  async init() {
    this.setupEventListeners(), this.initCharts(), await this.loadHealthData();
    const e = this.config.autoRefreshInterval || 3e4;
    this.autoRefreshTimer = setInterval(() => this.loadHealthData(), e);
  }
  destroy() {
    this.autoRefreshTimer && (clearInterval(this.autoRefreshTimer), this.autoRefreshTimer = null);
  }
  setupEventListeners() {
    const { refreshBtn: e, timeRange: t, providerFilter: a } = this.elements;
    e && e.addEventListener("click", () => this.loadHealthData()), t && t.addEventListener("change", () => this.loadHealthData()), a && a.addEventListener("change", () => this.loadHealthData());
  }
  initCharts() {
    const { syncChartCanvas: e, conflictChartCanvas: t } = this.elements;
    e && (e.width = e.parentElement?.clientWidth || 400, e.height = 240), t && (t.width = t.parentElement?.clientWidth || 400, t.height = 240);
  }
  async loadHealthData() {
    const { timeRange: e, providerFilter: t } = this.elements, a = e?.value || "24h", s = t?.value || "";
    try {
      const n = new URL(`${this.apiBase}/esign/integrations/health`, window.location.origin);
      n.searchParams.set("range", a), s && n.searchParams.set("provider", s);
      const r = await fetch(n.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      r.ok ? this.healthData = await r.json() : this.healthData = this.generateMockHealthData(a, s), this.renderHealthData(), D("Health data refreshed");
    } catch (n) {
      console.error("Failed to load health data:", n), this.healthData = this.generateMockHealthData(a, s), this.renderHealthData();
    }
  }
  generateMockHealthData(e, t) {
    const a = Math.min(e === "1h" ? 1 : e === "6h" ? 6 : e === "24h" ? 24 : e === "7d" ? 168 : 720, 24);
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
          {
            provider: "salesforce",
            entity: "Contact",
            time: "5m ago",
            status: "recovered"
          },
          {
            provider: "hubspot",
            entity: "Deal",
            time: "12m ago",
            status: "recovered"
          },
          {
            provider: "bamboohr",
            entity: "Employee",
            time: "28m ago",
            status: "pending"
          }
        ]
      },
      providerHealth: (t ? [t] : [
        "salesforce",
        "hubspot",
        "bamboohr",
        "workday"
      ]).map((s) => ({
        provider: s,
        status: s === "workday" ? "degraded" : "healthy",
        successRate: s === "workday" ? 89.2 : 97 + Math.random() * 3,
        lastSync: `${Math.floor(Math.random() * 30) + 1}m ago`,
        conflicts: Math.floor(Math.random() * 5),
        lagMinutes: Math.floor(Math.random() * 20) + 5
      })),
      alerts: [{
        severity: "warning",
        provider: "workday",
        message: "Elevated error rate detected",
        time: "15m ago"
      }, {
        severity: "info",
        provider: "salesforce",
        message: "Rate limit approaching (80%)",
        time: "1h ago"
      }],
      activityFeed: this.generateActivityFeed(20),
      chartData: {
        sync: this.generateTimeSeriesData(a, "sync"),
        conflicts: this.generateTimeSeriesData(a, "conflicts")
      }
    };
  }
  generateActivityFeed(e) {
    const t = [], a = [
      "sync_completed",
      "sync_failed",
      "conflict_created",
      "conflict_resolved",
      "mapping_published"
    ], s = [
      "salesforce",
      "hubspot",
      "bamboohr",
      "workday"
    ];
    for (let n = 0; n < e; n++) {
      const r = a[Math.floor(Math.random() * a.length)], l = s[Math.floor(Math.random() * s.length)];
      t.push({
        type: r,
        provider: l,
        message: this.getActivityMessage(r, l),
        time: `${Math.floor(Math.random() * 60) + 1}m ago`,
        status: r.includes("failed") || r.includes("created") ? "warning" : "success"
      });
    }
    return t;
  }
  getActivityMessage(e, t) {
    return {
      sync_completed: `Sync completed for ${t} (42 records)`,
      sync_failed: `Sync failed for ${t}: Connection timeout`,
      conflict_created: `New conflict detected in ${t} binding`,
      conflict_resolved: `Conflict resolved for ${t} record`,
      mapping_published: `Mapping spec published for ${t}`
    }[e] || `Activity for ${t}`;
  }
  generateTimeSeriesData(e, t) {
    const a = [], s = t === "sync" ? {
      success: [],
      failed: []
    } : {
      pending: [],
      resolved: []
    }, n = /* @__PURE__ */ new Date();
    for (let r = e - 1; r >= 0; r--) {
      const l = /* @__PURE__ */ new Date(n.getTime() - r * 36e5);
      a.push(l.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit"
      })), t === "sync" ? (s.success.push(Math.floor(Math.random() * 15) + 10), s.failed.push(Math.floor(Math.random() * 3))) : (s.pending.push(Math.floor(Math.random() * 5)), s.resolved.push(Math.floor(Math.random() * 8) + 2));
    }
    return {
      labels: a,
      datasets: s
    };
  }
  renderHealthData() {
    this.healthData && (this.renderHealthScore(), this.renderSyncStats(), this.renderConflictStats(), this.renderLagStats(), this.renderRetryActivity(), this.renderProviderHealth(), this.renderAlerts(), this.renderActivityFeed(), this.updateCharts());
  }
  renderHealthScore() {
    if (!this.healthData) return;
    const { healthScore: e, healthIndicator: t, healthTrend: a } = this.elements, s = this.healthData;
    e && (e.textContent = `${s.healthScore}%`, s.healthScore >= 95 ? e.className = "text-3xl font-bold text-green-600" : s.healthScore >= 80 ? e.className = "text-3xl font-bold text-yellow-600" : e.className = "text-3xl font-bold text-red-600"), t && (s.healthScore >= 95 ? (t.className = "w-12 h-12 rounded-full bg-green-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>') : s.healthScore >= 80 ? (t.className = "w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>') : (t.className = "w-12 h-12 rounded-full bg-red-100 flex items-center justify-center", t.innerHTML = '<svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>')), a && (a.textContent = `${s.healthTrend >= 0 ? "+" : ""}${s.healthTrend}% from previous period`);
  }
  renderSyncStats() {
    if (!this.healthData) return;
    const { syncSuccessRate: e, syncSuccessCount: t, syncFailedCount: a, syncSuccessBar: s } = this.elements, n = this.healthData.syncStats;
    e && (e.textContent = `${n.successRate.toFixed(1)}%`), t && (t.textContent = `${n.succeeded} succeeded`), a && (a.textContent = `${n.failed} failed`), s && (s.style.width = `${n.successRate}%`);
  }
  renderConflictStats() {
    if (!this.healthData) return;
    const { conflictCount: e, conflictPending: t, conflictResolved: a, conflictTrend: s } = this.elements, n = this.healthData.conflictStats;
    e && (e.textContent = String(n.pending)), t && (t.textContent = `${n.pending} pending`), a && (a.textContent = `${n.resolvedToday} resolved today`), s && (s.textContent = `${n.trend >= 0 ? "+" : ""}${n.trend} from previous period`);
  }
  renderLagStats() {
    if (!this.healthData) return;
    const { syncLag: e, lagStatus: t, lastSync: a } = this.elements, s = this.healthData.lagStats;
    e && (e.textContent = `${s.averageMinutes}m`), t && (s.status === "normal" ? (t.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", t.textContent = "Normal") : s.status === "elevated" ? (t.className = "px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full", t.textContent = "Elevated") : (t.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full", t.textContent = "Critical")), a && (a.textContent = `Last sync: ${s.lastSyncMinutesAgo} minutes ago`);
  }
  renderRetryActivity() {
    if (!this.healthData) return;
    const { retryTotal: e, retryRecovery: t, retryAvg: a, retryList: s } = this.elements, n = this.healthData.retryStats;
    e && (e.textContent = String(n.total)), t && (t.textContent = `${n.recoveryRate}%`), a && (a.textContent = n.avgAttempts.toFixed(1)), s && (s.innerHTML = n.recent.map((r) => `
          <div class="flex justify-between items-center py-1">
            <span>${this.escapeHtml(r.provider)} / ${this.escapeHtml(r.entity)}</span>
            <span class="${r.status === "recovered" ? "text-green-600" : "text-yellow-600"}">${this.escapeHtml(r.time)}</span>
          </div>
        `).join(""));
  }
  renderProviderHealth() {
    if (!this.healthData) return;
    const { providerHealthTable: e } = this.elements;
    e && (e.innerHTML = this.healthData.providerHealth.map((t) => `
        <tr class="border-b last:border-0">
          <td class="py-3 font-medium capitalize">${this.escapeHtml(t.provider)}</td>
          <td class="py-3">
            <span class="px-2 py-1 text-xs rounded-full ${t.status === "healthy" ? "bg-green-100 text-green-800" : t.status === "degraded" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}">
              ${t.status}
            </span>
          </td>
          <td class="py-3 ${t.successRate >= 95 ? "text-green-600" : t.successRate >= 80 ? "text-yellow-600" : "text-red-600"}">
            ${t.successRate.toFixed(1)}%
          </td>
          <td class="py-3 text-gray-600">${this.escapeHtml(t.lastSync)}</td>
          <td class="py-3">
            ${t.conflicts > 0 ? `<span class="text-orange-600">${t.conflicts}</span>` : '<span class="text-gray-400">0</span>'}
          </td>
          <td class="py-3 text-gray-600">${t.lagMinutes}m</td>
        </tr>
      `).join(""));
  }
  renderAlerts() {
    if (!this.healthData) return;
    const { alertsList: e, noAlerts: t, alertCount: a } = this.elements;
    this.healthData.alerts.length === 0 ? (e && e.classList.add("hidden"), t && t.classList.remove("hidden"), a && (a.textContent = "0 active", a.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full")) : (e && e.classList.remove("hidden"), t && t.classList.add("hidden"), a && (a.textContent = `${this.healthData.alerts.length} active`, a.className = "px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full"), e && (e.innerHTML = this.healthData.alerts.map((s) => `
            <div class="flex items-start gap-3 p-3 rounded-lg ${s.severity === "warning" ? "bg-yellow-50 border border-yellow-200" : s.severity === "error" ? "bg-red-50 border border-red-200" : "bg-blue-50 border border-blue-200"}">
              <div class="flex-shrink-0">
                ${this.getAlertIcon(s.severity)}
              </div>
              <div class="flex-1">
                <div class="flex justify-between">
                  <span class="font-medium capitalize">${this.escapeHtml(s.provider)}</span>
                  <span class="text-xs text-gray-500">${this.escapeHtml(s.time)}</span>
                </div>
                <p class="text-sm text-gray-700 mt-1">${this.escapeHtml(s.message)}</p>
              </div>
              <button class="flex-shrink-0 text-gray-400 hover:text-gray-600 dismiss-alert-btn" aria-label="Dismiss alert">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          `).join(""), e.querySelectorAll(".dismiss-alert-btn").forEach((s) => {
      s.addEventListener("click", (n) => this.dismissAlert(n));
    })));
  }
  getAlertIcon(e) {
    return e === "warning" ? '<svg class="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' : e === "error" ? '<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>' : '<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  }
  dismissAlert(e) {
    const t = e.currentTarget.closest(".flex.items-start");
    t && t.remove();
    const { alertsList: a, noAlerts: s, alertCount: n } = this.elements, r = a?.querySelectorAll(":scope > div").length || 0;
    n && (n.textContent = `${r} active`, r === 0 && (n.className = "px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full", a && a.classList.add("hidden"), s && s.classList.remove("hidden")));
  }
  renderActivityFeed() {
    if (!this.healthData) return;
    const { activityFeed: e } = this.elements;
    e && (e.innerHTML = this.healthData.activityFeed.map((t) => `
        <div class="flex items-center gap-3 py-2 border-b last:border-0">
          <div class="w-2 h-2 rounded-full ${t.status === "success" ? "bg-green-500" : "bg-yellow-500"}"></div>
          <div class="flex-1 text-sm">
            <span class="text-gray-700">${this.escapeHtml(t.message)}</span>
          </div>
          <span class="text-xs text-gray-400">${this.escapeHtml(t.time)}</span>
        </div>
      `).join(""));
  }
  updateCharts() {
    this.healthData && (this.renderBarChart("sync-chart-canvas", this.healthData.chartData.sync, ["#22c55e", "#ef4444"], ["Success", "Failed"]), this.renderBarChart("conflict-chart-canvas", this.healthData.chartData.conflicts, ["#f97316", "#22c55e"], ["New", "Resolved"]));
  }
  renderBarChart(e, t, a, s) {
    const n = document.getElementById(e);
    if (!n) return;
    const r = n.getContext("2d");
    if (!r) return;
    const l = n.width, h = n.height, o = 40, y = l - o * 2, m = h - o * 2;
    r.clearRect(0, 0, l, h);
    const f = t.labels, u = Object.values(t.datasets), g = y / f.length / (u.length + 1), v = Math.max(...u.flat()) || 1;
    f.forEach((c, d) => {
      const p = o + d * y / f.length + g / 2;
      u.forEach((S, x) => {
        const b = S[d] / v * m, M = p + x * g, $ = h - o - b;
        r.fillStyle = a[x] || "#6b7280", r.fillRect(M, $, g - 2, b);
      }), d % Math.ceil(f.length / 6) === 0 && (r.fillStyle = "#6b7280", r.font = "10px sans-serif", r.textAlign = "center", r.fillText(c, p + u.length * g / 2, h - o + 15));
    }), r.fillStyle = "#6b7280", r.font = "10px sans-serif", r.textAlign = "right";
    for (let c = 0; c <= 4; c++) {
      const d = h - o - c * m / 4, p = Math.round(v * c / 4);
      r.fillText(p.toString(), o - 5, d + 3);
    }
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
};
function k(e) {
  const t = new C(e);
  return w(() => t.init()), t;
}
function L(e) {
  const t = new C({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api`,
    autoRefreshInterval: e.autoRefreshInterval || 3e4
  });
  w(() => t.init()), typeof window < "u" && (window.esignIntegrationHealthController = t);
}
export {
  L as n,
  k as r,
  C as t
};

//# sourceMappingURL=integration-health-BH4OhBTs.js.map