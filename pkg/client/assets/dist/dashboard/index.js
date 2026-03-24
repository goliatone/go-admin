import { t as w } from "../chunks/sortable.esm-G5PYYtV9.js";
var $ = class {
  constructor() {
    this.sortableInstances = [];
  }
  enable(t, s) {
    t.querySelectorAll("[data-widgets-grid]").forEach((e) => {
      const o = w.create(e, {
        handle: ".widget-drag-handle",
        draggable: "[data-widget]",
        animation: 150,
        ghostClass: "widget--ghost",
        chosenClass: "widget--chosen",
        dragClass: "widget--drag",
        group: "dashboard-widgets",
        onEnd: () => {
          s();
        }
      });
      this.sortableInstances.push(o);
    });
  }
  disable() {
    this.sortableInstances.forEach((t) => {
      t.destroy();
    }), this.sortableInstances = [];
  }
}, S = class {
  toggleWidth(t, s, e) {
    const o = s === e ? e / 2 : e;
    return this.applyWidth(t, o), o;
  }
  applyWidth(t, s) {
    t.dataset.span = s.toString(), t.style.setProperty("--span", s.toString());
  }
}, _ = class {
  toggle(t) {
    const s = t.dataset.hidden !== "true";
    return this.applyVisibility(t, s), s;
  }
  applyVisibility(t, s) {
    s ? (t.dataset.hidden = "true", t.classList.add("is-hidden")) : (delete t.dataset.hidden, t.classList.remove("is-hidden"));
  }
};
function k() {
  const t = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim();
  return t ? { "X-CSRF-Token": t } : {};
}
var C = class {
  async save(t, s) {
    const e = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...k()
      },
      body: JSON.stringify(s)
    });
    if (!e.ok) throw new Error(`Failed to save layout: ${e.statusText}`);
  }
  async load(t) {
    try {
      const s = await fetch(t);
      return s.ok ? await s.json() : null;
    } catch (s) {
      return console.warn("Failed to load layout preferences:", s), null;
    }
  }
}, A = class {
  constructor(t) {
    this.container = null, this.saveTimer = null, this.statusElement = null, this.panelSchema = null, this.panelTabs = [], this.config = {
      apiEndpoint: t.apiEndpoint,
      preferencesEndpoint: t.preferencesEndpoint || `${t.apiEndpoint}/preferences`,
      areas: t.areas || [],
      defaultSpan: t.defaultSpan ?? 12,
      maxColumns: t.maxColumns ?? 12,
      saveDelay: t.saveDelay ?? 200,
      selectors: {
        areas: "[data-widgets-grid]",
        widgets: "[data-widget]",
        toolbar: "[data-widget-toolbar]",
        hideBtn: '[data-action="toggle-hide"]',
        resizeBtn: '[data-action="toggle-width"]',
        ...t.selectors
      },
      behaviors: t.behaviors || {},
      onSave: t.onSave || (() => {
      }),
      onError: t.onError || ((s) => console.error("WidgetGrid error:", s))
    }, this.behaviors = {
      dragDrop: t.behaviors?.dragDrop || new $(),
      resize: t.behaviors?.resize || new S(),
      visibility: t.behaviors?.visibility || new _(),
      persistence: t.behaviors?.persistence || new C()
    };
  }
  async init(t) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container) throw new Error("Widget grid container not found");
    const s = this.normalizePanelDetailState(t);
    s.schema && (this.panelSchema = s.schema, this.panelTabs = s.schema.tabs || []), this.normalizeRenderedWidgetSpans(), this.attachEventListeners(), this.initializeDragDrop(), s.data && this.validateHydration(s.data);
  }
  validateHydration(t) {
    if (!Array.isArray(t?.areas) || !this.container) return;
    const s = Array.from(this.container.querySelectorAll("[data-widgets-grid][data-area-grid]")).map((a) => a.dataset.areaGrid || a.dataset.areaCode || "").filter((a) => !!a);
    if (s.length === 0) return;
    const e = new Set(t.areas.map((a) => a?.code || a?.area_code || a?.id || "").filter((a) => typeof a == "string" && a.length > 0)), o = s.filter((a) => !e.has(a));
    o.length > 0 && console.warn("Hydration mismatch: rendered area(s) missing from server state", {
      missing: o,
      server: Array.from(e),
      dom: s
    });
  }
  getSchema() {
    return this.panelSchema;
  }
  getTabs() {
    return this.panelTabs;
  }
  normalizePanelDetailState(t) {
    if (!t) return {};
    if (t && typeof t == "object" && "data" in t) {
      const s = t;
      return {
        data: s.data,
        schema: s.schema
      };
    }
    return { data: t };
  }
  initializeDragDrop() {
    this.container && this.behaviors.dragDrop.enable(this.container, () => {
      this.saveLayout();
    });
  }
  normalizeRenderedWidgetSpans() {
    this.container && this.container.querySelectorAll("[data-widget]").forEach((t) => {
      const s = this.normalizeSpan(t.dataset.span);
      t.dataset.span = s.toString(), t.style.setProperty("--span", s.toString());
    });
  }
  normalizeSpan(t) {
    const s = Number.parseInt(String(t ?? ""), 10), e = Math.min(Math.max(this.config.defaultSpan, 1), this.config.maxColumns);
    return !Number.isFinite(s) || s < 1 || s > this.config.maxColumns ? e : s;
  }
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.hideBtn);
      if (s) {
        const e = s.closest("[data-widget]");
        e && (this.behaviors.visibility.toggle(e), this.saveLayout());
      }
    }), this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.resizeBtn);
      if (s) {
        const e = s.closest("[data-widget]");
        if (e) {
          const o = this.normalizeSpan(e.dataset.span), a = this.behaviors.resize.toggleWidth(e, o, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", i = Array.from(s.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
          i && (i.textContent = a), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((t) => {
      const s = t.closest("[data-widget]");
      if (s) {
        const e = this.normalizeSpan(s.dataset.span) === this.config.maxColumns ? "Half Width" : "Full Width", o = Array.from(t.childNodes).find((a) => a.nodeType === Node.TEXT_NODE);
        o && (o.textContent = e);
      }
    }));
  }
  saveLayout() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.updateStatus("Saving layout…"), this.saveTimer = window.setTimeout(async () => {
      try {
        const t = this.serializeLayout();
        await this.behaviors.persistence.save(this.config.preferencesEndpoint, t), this.updateStatus("Layout saved"), this.config.onSave(t);
      } catch (t) {
        this.updateStatus("Save failed"), this.config.onError(t);
      }
    }, this.config.saveDelay);
  }
  serializeLayout() {
    const t = {
      area_order: {},
      hidden_widget_ids: [],
      layout_rows: {}
    };
    if (!this.container) return t;
    this.container.querySelectorAll(this.config.selectors.areas).forEach((e) => {
      const o = e.dataset.areaGrid || e.dataset.areaCode;
      if (!o) return;
      const a = Array.from(e.querySelectorAll('[data-widget]:not([data-hidden="true"])'));
      t.area_order[o] = a.map((i) => i.dataset.widget), t.layout_rows[o] = this.serializeRows(a);
    });
    const s = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return t.hidden_widget_ids = Array.from(s).map((e) => e.dataset.widget), t;
  }
  serializeRows(t) {
    const s = [];
    let e = [], o = 0;
    return t.forEach((a) => {
      const i = a.dataset.widget, n = this.normalizeSpan(a.dataset.span);
      o + n > this.config.maxColumns && o > 0 && (s.push({ widgets: e }), e = [], o = 0), e.push({
        id: i,
        width: n
      }), o += n, o >= this.config.maxColumns && (s.push({ widgets: e }), e = [], o = 0);
    }), e.length > 0 && s.push({ widgets: e }), s;
  }
  updateStatus(t) {
    this.statusElement && (this.statusElement.textContent = t);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}, N = {
  "admin.widget.user_stats": "User Statistics",
  "admin.widget.activity_feed": "Recent Activity",
  "admin.widget.quick_actions": "Quick Actions",
  "admin.widget.notifications": "Notifications",
  "admin.widget.settings_overview": "Settings Overview",
  "admin.widget.translation_progress": "Translation Progress",
  "admin.widget.content_stats": "Content Stats",
  "admin.widget.storage_stats": "Storage Stats",
  "admin.widget.system_health": "System Health",
  "admin.widget.bar_chart": "Bar Chart",
  "admin.widget.line_chart": "Line Chart",
  "admin.widget.pie_chart": "Pie Chart",
  "admin.widget.gauge_chart": "Gauge",
  "admin.widget.scatter_chart": "Scatter Chart",
  "esign.widget.agreement_stats": "E-Sign Agreement Stats",
  "esign.widget.signing_activity": "E-Sign Signing Activity",
  "esign.widget.delivery_health": "E-Sign Delivery Health",
  "esign.widget.pending_signatures": "E-Sign Pending Signatures"
}, j = /* @__PURE__ */ new Set([
  "admin.widget.bar_chart",
  "admin.widget.line_chart",
  "admin.widget.pie_chart",
  "admin.widget.gauge_chart",
  "admin.widget.scatter_chart"
]), E = class {
  constructor(t) {
    this.activityActionLabels = t.activityActionLabels || {};
  }
  render(t, s) {
    const e = s === "admin.dashboard.main" || s === "admin.dashboard.footer", o = this.normalizeSpan(t.metadata?.layout?.width ?? t.span), a = t.hidden || !1, i = t.data?.title || t.config?.title || this.getTitle(t.definition), n = t.id || t.definition || `widget-${Math.random().toString(36).substr(2, 9)}`, r = this.renderContent(t);
    let d = '<div class="widget__toolbar">';
    return d += '<button type="button" class="hide-widget">Toggle Hide</button>', e ? d += '<button type="button" class="resize-widget">Half Width</button>' : d += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>', d += "</div>", `
      <article class="widget"
               data-widget="${n}"
               data-span="${o}"
               data-area-code="${s}"
               data-resizable="${e}"
               ${a ? 'data-hidden="true"' : ""}
               style="--span: ${o}">
        ${d}
        <div class="widget__header mb-4">
          
      <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder widget">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </button>
    
          <h3 class="text-lg font-semibold text-gray-900">${i}</h3>
        </div>
        <div class="widget__content">
          ${r}
        </div>
      </article>
    `;
  }
  renderContent(t) {
    const s = t.definition || "", e = t.data || {}, o = t.config || {};
    if (s === "admin.widget.user_stats") {
      const a = {
        Total: e.total ?? 0,
        Active: e.active ?? 0,
        "New Today": e.new_today ?? 0
      };
      return e.trend && (a.Trend = e.trend), `
        <div class="metrics">
          ${Object.entries(a).map(([i, n]) => `
            <div class="metric">
              <small>${i}</small>
              <span>${this.formatNumber(n)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (s === "admin.widget.user_profile_overview") {
      const a = e.values || {}, i = Object.entries(a);
      return i.length === 0 ? '<p class="text-gray-500">No profile data to display</p>' : `
        <dl class="space-y-2">
          ${i.map(([n, r]) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-600">${n}</dt>
              <dd class="text-sm font-semibold text-gray-900">${r ?? "—"}</dd>
            </div>
          `).join("")}
        </dl>
      `;
    }
    if (s === "admin.widget.settings_overview") {
      const a = e.values || {}, i = Object.entries(a);
      return i.length === 0 ? '<p class="text-gray-500">No settings to display</p>' : `
        <dl class="space-y-2">
          ${i.map(([n, r]) => `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${n}</dt>
                <dd class="text-sm font-semibold text-gray-900">${(typeof r == "object" && r !== null ? r.value ?? r : r) ?? "—"}</dd>
              </div>
            `).join("")}
        </dl>
      `;
    }
    if (s === "admin.widget.activity_feed") {
      const a = e.entries || [];
      return a.length === 0 ? '<p class="text-gray-500">No recent activity</p>' : `
        <ul class="space-y-3">
          ${a.map((i) => {
        const n = String(i?.actor || i?.metadata?.actor || "system").trim() || "system", r = String(i?.action || "").trim(), d = this.activityActionLabels?.[r] || r || "updated", l = String(i?.object || "").trim();
        return `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${n}</div>
              <div class="text-gray-600 text-sm mt-1">${d}${l ? ` ${l}` : ""}</div>
            </li>
          `;
      }).join("")}
        </ul>
      `;
    }
    if (s === "admin.widget.quick_actions") {
      const a = e.actions || [];
      return a.length === 0 ? '<p class="text-gray-500">No quick actions configured</p>' : `
        <div class="space-y-2">
          ${a.map((i) => `
            <a class="block p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition" href="${i.url || "#"}" target="_blank" rel="noreferrer">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900 text-sm">${i.label || "Action"}</div>
                ${i.method ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${i.method}</span>` : ""}
              </div>
              ${i.description ? `<div class="text-gray-600 text-sm mt-1">${i.description}</div>` : ""}
            </a>
          `).join("")}
        </div>
      `;
    }
    if (s === "admin.widget.chart_sample")
      return e.disabled ? '<p class="text-gray-500 text-sm italic">This legacy chart widget has been disabled.</p>' : '<p class="text-gray-500 text-sm italic">Legacy chart widgets are not supported in the canonical dashboard contract.</p>';
    if (s === "admin.widget.system_health") return `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-semibold text-green-600">${e.status || "unknown"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-semibold">${e.uptime || "N/A"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">API Latency:</span>
            <span class="font-semibold">${e.api_latency || "N/A"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Database:</span>
            <span class="font-semibold ${e.db_status === "connected" ? "text-green-600" : "text-red-600"}">${e.db_status || "unknown"}</span>
          </div>
        </div>
      `;
    if (s === "admin.widget.content_stats") return `
        <div class="metrics">
          <div class="metric">
            <small>Published</small>
            <span>${this.formatNumber(e.published || 0)}</span>
          </div>
          <div class="metric">
            <small>Draft</small>
            <span>${this.formatNumber(e.draft || 0)}</span>
          </div>
          <div class="metric">
            <small>Scheduled</small>
            <span>${this.formatNumber(e.scheduled || 0)}</span>
          </div>
        </div>
      `;
    if (s === "admin.widget.storage_stats") return `
        <div class="metrics">
          <div class="metric">
            <small>Used</small>
            <span>${e.used || "0 GB"}</span>
          </div>
          <div class="metric">
            <small>Total</small>
            <span>${e.total || "0 GB"}</span>
          </div>
          <div class="metric">
            <small>Usage</small>
            <span>${e.percentage || "0%"}</span>
          </div>
        </div>
      `;
    if (s === "admin.widget.notifications") {
      const a = e.notifications || [];
      return a.length === 0 ? '<p class="text-gray-500">No notifications</p>' : `
        <ul class="space-y-3">
          ${a.slice(0, 5).map((i) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${i.title}</div>
                  <div class="text-gray-600 text-sm mt-1">${i.message}</div>
                </div>
                <span class="px-2 py-1 text-xs font-semibold ${i.read ? "text-gray-600 bg-gray-100" : "text-white bg-blue-500"} rounded-full whitespace-nowrap">
                  ${i.read ? "Read" : "New"}
                </span>
              </div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (s === "esign.widget.agreement_stats") {
      const a = Number(e.total || 0), i = Number(e.pending || 0), n = Number(e.completed || 0), r = Number(e.voided || 0) + Number(e.declined || 0) + Number(e.expired || 0), d = a > 0 ? Math.round(n * 100 / a) : 0, l = String(e.list_url || "").trim();
      return `
        <div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-gray-900">${this.formatNumber(a)}</div>
              <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-blue-700">${this.formatNumber(i)}</div>
              <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-green-700">${this.formatNumber(n)}</div>
              <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
            </div>
            <div class="bg-red-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-red-700">${this.formatNumber(r)}</div>
              <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
            </div>
          </div>
          ${a > 0 ? `
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Completion Rate</span>
                <span class="text-sm font-semibold text-gray-900">${d}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: ${d}%"></div>
              </div>
            </div>
          ` : ""}
          ${l ? `
            <div class="mt-4 pt-3 border-t border-gray-100 text-center">
              <a href="${l}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Agreements
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ""}
        </div>
      `;
    }
    if (s === "esign.widget.signing_activity") {
      const a = Array.isArray(e.activities) ? e.activities : [], i = String(e.activity_url || "").trim();
      if (a.length === 0) return `
          <div class="text-center py-4 text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm">No recent signing activity</p>
          </div>
          ${i ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${i}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Activity
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ""}
        `;
      const n = (r) => {
        const d = String(r || "").toLowerCase();
        return d === "signed" || d === "completed" ? "bg-green-500" : d === "viewed" ? "bg-purple-500" : d === "sent" ? "bg-blue-500" : d === "declined" ? "bg-orange-500" : d === "voided" || d === "expired" ? "bg-red-500" : "bg-gray-400";
      };
      return `
        <ul class="space-y-3">
          ${a.map((r) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${n(r.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${r.agreement_url ? `<a href="${r.agreement_url}" class="hover:text-blue-600">${r.agreement_title || "Agreement"}</a>` : `${r.agreement_title || "Agreement"}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${r.type || "event"}</span>
                  ${r.actor ? `<span class="mx-1">·</span><span>${r.actor}</span>` : ""}
                </div>
              </div>
              ${r.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${r.timestamp}">
                  <time data-relative-time="${r.timestamp}">${r.timestamp}</time>
                </div>
              ` : ""}
            </li>
          `).join("")}
        </ul>
        ${i ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${i}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              View All Activity
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        ` : ""}
      `;
    }
    if (s === "esign.widget.delivery_health") {
      const a = Math.max(0, Math.min(100, Number(e.email_success_rate ?? 100))), i = Math.max(0, Math.min(100, Number(e.job_success_rate ?? 100))), n = Number(e.pending_retries || 0), r = String(e.period || "").trim(), d = (c) => c >= 95 ? {
        text: "text-green-600",
        bar: "bg-green-500"
      } : c >= 80 ? {
        text: "text-yellow-600",
        bar: "bg-yellow-500"
      } : {
        text: "text-red-600",
        bar: "bg-red-500"
      }, l = d(a), h = d(i);
      return `
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span class="text-sm text-gray-600">Email Delivery</span>
              </div>
              <span class="text-sm font-semibold ${l.text}">${a}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${l.bar}" style="width: ${a}%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>${this.formatNumber(e.emails_sent || 0)} sent</span>
              <span>${this.formatNumber(e.emails_failed || 0)} failed</span>
            </div>
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
                </svg>
                <span class="text-sm text-gray-600">Job Processing</span>
              </div>
              <span class="text-sm font-semibold ${h.text}">${i}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${h.bar}" style="width: ${i}%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>${this.formatNumber(e.jobs_completed || 0)} completed</span>
              <span>${this.formatNumber(e.jobs_failed || 0)} failed</span>
            </div>
          </div>
          ${n > 0 ? `
            <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-center gap-2 text-sm text-yellow-800">
                <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>${this.formatNumber(n)} items pending retry</span>
              </div>
            </div>
          ` : ""}
        </div>
        ${r ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${r}</div>` : ""}
      `;
    }
    if (s === "esign.widget.pending_signatures") {
      const a = Array.isArray(e.agreements) ? e.agreements : [], i = String(e.list_url || "").trim();
      return a.length === 0 ? `
          <div class="text-center py-6 text-gray-500">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-sm font-medium">All caught up!</p>
            <p class="text-xs mt-1">No agreements pending signature</p>
          </div>
          ${i ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${i}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Pending
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ""}
        ` : `
        <ul class="space-y-2">
          ${a.map((n) => {
        const r = Array.isArray(n.pending_recipients) ? n.pending_recipients : [];
        return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      ${n.url ? `<a href="${n.url}" class="hover:text-blue-600">${n.title || "Untitled"}</a>` : `${n.title || "Untitled"}`}
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      ${this.formatNumber(n.pending_count || 0)} of ${this.formatNumber(n.total_recipients || 0)} signatures pending
                    </div>
                  </div>
                </div>
                ${r.length > 0 ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${r.slice(0, 3).map((d) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${d.name || d.email || "Recipient"}
                      </span>
                    `).join("")}
                    ${r.length > 3 ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +${r.length - 3} more
                      </span>
                    ` : ""}
                  </div>
                ` : ""}
              </li>
            `;
      }).join("")}
        </ul>
        ${i ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${i}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
              View All Pending
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </a>
          </div>
        ` : ""}
      `;
    }
    if (s === "admin.widget.translation_progress") {
      const a = e.summary || {}, i = e.status_counts || {}, n = e.locale_counts || {}, r = Array.isArray(e.links) ? e.links : [], d = Number(a.overdue || 0), l = e.updated_at ? String(e.updated_at) : "", h = (c, m) => {
        const g = String(c || "").trim().toLowerCase();
        let u = "bg-gray-100 text-gray-800", p = "bg-gray-500";
        g === "pending" ? (u = "bg-yellow-100 text-yellow-800", p = "bg-yellow-500") : g === "in_progress" ? (u = "bg-blue-100 text-blue-800", p = "bg-blue-500") : g === "review" ? (u = "bg-purple-100 text-purple-800", p = "bg-purple-500") : g === "approved" || g === "completed" ? (u = "bg-green-100 text-green-800", p = "bg-green-500") : g === "rejected" && (u = "bg-red-100 text-red-800", p = "bg-red-500");
        const y = this.formatStatusLabel(c);
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${u}">
            <span class="w-1.5 h-1.5 rounded-full ${p}"></span>
            ${y}: ${this.formatNumber(m)}
          </span>
        `;
      };
      return `
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${this.formatNumber(a.total || 0)}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${this.formatNumber(a.active || 0)}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">Active</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-purple-700">${this.formatNumber(a.review || 0)}</div>
            <div class="text-xs text-purple-600 uppercase tracking-wide">Review</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="${d > 0 ? "bg-red-50" : "bg-gray-50"} rounded-lg p-2 text-center">
            <div class="text-lg font-bold ${d > 0 ? "text-red-700" : "text-gray-600"}">
              ${this.formatNumber(d)}
            </div>
            <div class="text-xs ${d > 0 ? "text-red-600" : "text-gray-500"} uppercase tracking-wide">Overdue</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-lg font-bold text-green-700">${this.formatNumber(a.approved || 0)}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Approved</div>
          </div>
        </div>

        ${Object.keys(i).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Status</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(i).map(([c, m]) => h(c, m)).join("")}
            </div>
          </div>
        ` : ""}

        ${Object.keys(n).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(n).map(([c, m]) => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <span class="uppercase font-semibold">${c}</span>
                  <span class="text-indigo-500">${this.formatNumber(m)}</span>
                </span>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${r.length > 0 ? `
          <div class="pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
            <div class="flex flex-wrap gap-2">
              ${r.map((c) => `
                <a href="${c.url || "#"}"
                   class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                  ${c.label || "Open"}
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${l ? `
          <div class="mt-4 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Updated <time data-relative-time="${l}">${l}</time>
          </div>
        ` : ""}
      `;
    }
    if (j.has(s)) {
      const a = e.subtitle || o.subtitle || "", i = String(e.theme || "westeros"), n = String(e.chart_assets_host || "/dashboard/assets/echarts/"), r = e.chart_options ? JSON.stringify(e.chart_options) : "", d = `chart-${t.id || t.definition || Math.random().toString(36).slice(2, 10)}`;
      return `
        <div>
          ${a ? `<p class="text-sm text-gray-500 mb-3">${a}</p>` : ""}
          ${r ? `
            <div class="chart-container" data-echart-widget data-chart-id="${d}" data-chart-theme="${i}" data-chart-assets-host="${n}">
              <div id="${d}" class="w-full" style="height: 360px;"></div>
              <script type="application/json" data-chart-options>${r}<\/script>
            </div>
          ` : '<p class="text-sm text-gray-500 italic">Chart configuration unavailable.</p>'}
          ${e.footer_note ? `<p class="text-xs text-gray-500 mt-2">${e.footer_note}</p>` : ""}
        </div>
      `;
    }
    return `<pre class="text-xs text-gray-600 overflow-auto">${JSON.stringify(e, null, 2)}</pre>`;
  }
  getTitle(t) {
    return N[t] || t;
  }
  formatNumber(t) {
    return typeof t == "number" ? t.toLocaleString() : String(t);
  }
  formatStatusLabel(t) {
    const s = String(t || "").trim();
    return s ? s.split("_").map((e) => e && e.charAt(0).toUpperCase() + e.slice(1)).join(" ") : "Unknown";
  }
  normalizeSpan(t) {
    const s = Number.parseInt(String(t ?? ""), 10);
    return !Number.isFinite(s) || s < 1 || s > 12 ? 12 : s;
  }
}, v = /* @__PURE__ */ new Map(), b = /* @__PURE__ */ new WeakMap();
async function T(t) {
  const s = new E(t), e = t.apiBasePath ? `${t.apiBasePath}/dashboard` : `${t.basePath}/api/dashboard`, o = document.getElementById("dashboard-export");
  o && o.addEventListener("click", () => window.open(e));
  const a = z((await (await fetch(e)).json()).widgets || []);
  for (const [i, n] of Object.entries(a)) {
    const r = document.querySelector(`[data-area-grid="${i}"]`);
    r && (r.innerHTML = n.map((d) => s.render(d, i)).join(""));
  }
  await x(), await new A({
    apiEndpoint: e,
    preferencesEndpoint: `${e}/preferences`,
    areas: [
      "admin.dashboard.main",
      "admin.dashboard.sidebar",
      "admin.dashboard.footer"
    ],
    selectors: {
      hideBtn: ".hide-widget",
      resizeBtn: ".resize-widget"
    },
    onSave: (i) => {
      console.log("Layout saved:", i);
    },
    onError: (i) => {
      console.error("Widget grid error:", i);
      const n = document.getElementById("save-status");
      n && (n.textContent = "Failed to save layout");
    }
  }).init(), await x();
}
function z(t) {
  return t.reduce((s, e) => {
    const o = e.area || "admin.dashboard.main";
    return s[o] || (s[o] = []), s[o].push(e), s;
  }, {});
}
function B(t) {
  const s = (t || "").trim();
  return s ? s.endsWith("/") ? s : `${s}/` : "/dashboard/assets/echarts/";
}
function f(t) {
  if (!t) return Promise.resolve();
  if (v.has(t)) return v.get(t);
  if (document.querySelector(`script[src="${t}"]`)) {
    const e = Promise.resolve();
    return v.set(t, e), e;
  }
  const s = new Promise((e, o) => {
    const a = document.createElement("script");
    a.src = t, a.async = !0, a.onload = () => e(), a.onerror = () => o(/* @__PURE__ */ new Error(`Failed to load chart asset: ${t}`)), document.head.appendChild(a);
  });
  return v.set(t, s), s;
}
async function L(t, s) {
  const e = B(s);
  await f(`${e}echarts.min.js`), t && t !== "default" && await f(`${e}themes/${t}.js`);
}
function D(t) {
  const s = t.querySelector("script[data-chart-options]");
  if (!s?.textContent) return null;
  try {
    return JSON.parse(s.textContent);
  } catch (e) {
    return console.error("[admin-dashboard] Failed to parse chart options", e), null;
  }
}
function M(t) {
  const s = (t.dataset.chartId || "").trim(), e = (t.dataset.chartTheme || "westeros").trim(), o = D(t), a = s ? document.getElementById(s) : null, i = window.echarts;
  if (!a || !o || !i) return;
  const n = i.getInstanceByDom(a) || i.init(a, e, { renderer: "canvas" });
  if (n.setOption(o, !0), !b.has(t) && window.ResizeObserver) {
    const r = new ResizeObserver(() => {
      try {
        n.resize();
      } catch (d) {
        console.warn("[admin-dashboard] Chart resize failed", d);
      }
    });
    r.observe(a), b.set(t, r);
  }
}
async function x() {
  const t = Array.from(document.querySelectorAll("[data-echart-widget]"));
  for (const s of t) {
    const e = (s.dataset.chartTheme || "westeros").trim(), o = s.dataset.chartAssetsHost || "";
    try {
      await L(e, o), M(s);
    } catch (a) {
      console.error("[admin-dashboard] Failed to hydrate chart widget", a);
    }
  }
}
function R() {
  const t = document.getElementById("admin-dashboard-config");
  if (!t?.textContent) {
    console.error("[admin-dashboard] Missing #admin-dashboard-config element");
    return;
  }
  try {
    T(JSON.parse(t.textContent)).catch((s) => {
      console.error("[admin-dashboard] Failed to initialize:", s);
    });
  } catch (s) {
    console.error("[admin-dashboard] Invalid config JSON:", s);
  }
}
export {
  $ as DefaultDragDropBehavior,
  C as DefaultPersistenceBehavior,
  S as DefaultResizeBehavior,
  _ as DefaultVisibilityBehavior,
  A as WidgetGrid,
  E as WidgetRenderer,
  R as bootstrapAdminDashboard,
  T as initAdminDashboard
};

//# sourceMappingURL=index.js.map