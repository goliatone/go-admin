import { httpRequest as f } from "../shared/transport/http-client.js";
import { s as x } from "../chunks/status-vocabulary-Bdx_bn1-.js";
import { t as y } from "../chunks/sortable.esm-CcMbOE-M.js";
import { n as w, t as $ } from "../chunks/application-widgets-9yj65FzP.js";
var S = class {
  constructor() {
    this.sortableInstances = [];
  }
  enable(t, s) {
    t.querySelectorAll("[data-widgets-grid]").forEach((e) => {
      const o = y.create(e, {
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
}, _ = class {
  toggleWidth(t, s, e) {
    const o = s === e ? e / 2 : e;
    return this.applyWidth(t, o), o;
  }
  applyWidth(t, s) {
    t.dataset.span = s.toString(), t.style.setProperty("--span", s.toString());
  }
}, k = class {
  toggle(t) {
    const s = t.dataset.hidden !== "true";
    return this.applyVisibility(t, s), s;
  }
  applyVisibility(t, s) {
    s ? (t.dataset.hidden = "true", t.classList.add("is-hidden")) : (delete t.dataset.hidden, t.classList.remove("is-hidden"));
  }
}, A = class {
  async save(t, s) {
    const e = await f(t, {
      method: "POST",
      json: s
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
}, N = class {
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
      dragDrop: t.behaviors?.dragDrop || new S(),
      resize: t.behaviors?.resize || new _(),
      visibility: t.behaviors?.visibility || new k(),
      persistence: t.behaviors?.persistence || new A()
    };
  }
  async init(t) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container) throw new Error("Widget grid container not found");
    const s = this.normalizePanelDetailState(t);
    s.schema && (this.panelSchema = s.schema, this.panelTabs = s.schema.tabs || []), this.normalizeRenderedWidgetSpans(), this.attachEventListeners(), this.initializeDragDrop(), s.data && this.validateHydration(s.data);
  }
  validateHydration(t) {
    if (!Array.isArray(t?.areas) || !this.container) return;
    const s = Array.from(this.container.querySelectorAll("[data-widgets-grid][data-area-grid]")).map((n) => n.dataset.areaGrid || n.dataset.areaCode || "").filter((n) => !!n);
    if (s.length === 0) return;
    const e = new Set(t.areas.map((n) => n?.code || n?.area_code || n?.id || "").filter((n) => typeof n == "string" && n.length > 0)), o = s.filter((n) => !e.has(n));
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
          const o = this.normalizeSpan(e.dataset.span), n = this.behaviors.resize.toggleWidth(e, o, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", i = Array.from(s.childNodes).find((a) => a.nodeType === Node.TEXT_NODE);
          i && (i.textContent = n), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((t) => {
      const s = t.closest("[data-widget]");
      if (s) {
        const e = this.normalizeSpan(s.dataset.span) === this.config.maxColumns ? "Half Width" : "Full Width", o = Array.from(t.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
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
      const n = Array.from(e.querySelectorAll('[data-widget]:not([data-hidden="true"])'));
      t.area_order[o] = n.map((i) => i.dataset.widget), t.layout_rows[o] = this.serializeRows(n);
    });
    const s = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return t.hidden_widget_ids = Array.from(s).map((e) => e.dataset.widget), t;
  }
  serializeRows(t) {
    const s = [];
    let e = [], o = 0;
    return t.forEach((n) => {
      const i = n.dataset.widget, a = this.normalizeSpan(n.dataset.span);
      o + a > this.config.maxColumns && o > 0 && (s.push({ widgets: e }), e = [], o = 0), e.push({
        id: i,
        width: a
      }), o += a, o >= this.config.maxColumns && (s.push({ widgets: e }), e = [], o = 0);
    }), e.length > 0 && s.push({ widgets: e }), s;
  }
  updateStatus(t) {
    this.statusElement && (this.statusElement.textContent = t);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}, C = {
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
    const e = s === "admin.dashboard.main" || s === "admin.dashboard.footer", o = this.normalizeSpan(t.metadata?.layout?.width ?? t.span), n = t.hidden || !1, i = t.data?.title || t.config?.title || w(t.definition, t) || this.getTitle(t.definition), a = t.id || t.definition || `widget-${Math.random().toString(36).substr(2, 9)}`, d = this.renderContent(t);
    let r = '<div class="widget__toolbar">';
    return r += '<button type="button" class="hide-widget">Toggle Hide</button>', e ? r += '<button type="button" class="resize-widget">Half Width</button>' : r += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>', r += "</div>", `
      <article class="widget"
               data-widget="${a}"
               data-span="${o}"
               data-area-code="${s}"
               data-resizable="${e}"
               ${n ? 'data-hidden="true"' : ""}
               style="--span: ${o}">
        ${r}
        <div class="widget__header mb-4">
          
      <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder widget">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </button>
    
          <h3 class="text-lg font-semibold text-gray-900">${i}</h3>
        </div>
        <div class="widget__content">
          ${d}
        </div>
      </article>
    `;
  }
  renderContent(t) {
    const s = t.definition || "", e = t.data || {}, o = t.config || {}, n = $(s);
    if (n) return n.render(t);
    if (s === "admin.widget.user_stats") {
      const i = {
        Total: e.total ?? 0,
        Active: e.active ?? 0,
        "New Today": e.new_today ?? 0
      };
      return e.trend && (i.Trend = e.trend), `
        <div class="metrics">
          ${Object.entries(i).map(([a, d]) => `
            <div class="metric">
              <small>${a}</small>
              <span>${this.formatNumber(d)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (s === "admin.widget.user_profile_overview") {
      const i = e.values || {}, a = Object.entries(i);
      return a.length === 0 ? '<p class="text-gray-500">No profile data to display</p>' : `
        <dl class="space-y-2">
          ${a.map(([d, r]) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-600">${d}</dt>
              <dd class="text-sm font-semibold text-gray-900">${r ?? "—"}</dd>
            </div>
          `).join("")}
        </dl>
      `;
    }
    if (s === "admin.widget.settings_overview") {
      const i = e.values || {}, a = Object.entries(i);
      return a.length === 0 ? '<p class="text-gray-500">No settings to display</p>' : `
        <dl class="space-y-2">
          ${a.map(([d, r]) => `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${d}</dt>
                <dd class="text-sm font-semibold text-gray-900">${(typeof r == "object" && r !== null ? r.value ?? r : r) ?? "—"}</dd>
              </div>
            `).join("")}
        </dl>
      `;
    }
    if (s === "admin.widget.activity_feed") {
      const i = e.entries || [];
      return i.length === 0 ? '<p class="text-gray-500">No recent activity</p>' : `
        <ul class="space-y-3">
          ${i.map((a) => {
        const d = String(a?.actor || a?.metadata?.actor || "system").trim() || "system", r = String(a?.action || "").trim(), l = this.activityActionLabels?.[r] || r || "updated", c = String(a?.object || "").trim();
        return `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${d}</div>
              <div class="text-gray-600 text-sm mt-1">${l}${c ? ` ${c}` : ""}</div>
            </li>
          `;
      }).join("")}
        </ul>
      `;
    }
    if (s === "admin.widget.quick_actions") {
      const i = e.actions || [];
      return i.length === 0 ? '<p class="text-gray-500">No quick actions configured</p>' : `
        <div class="space-y-2">
          ${i.map((a) => `
            <a class="block p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition" href="${a.url || "#"}" target="_blank" rel="noreferrer">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900 text-sm">${a.label || "Action"}</div>
                ${a.method ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${a.method}</span>` : ""}
              </div>
              ${a.description ? `<div class="text-gray-600 text-sm mt-1">${a.description}</div>` : ""}
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
      const i = e.notifications || [];
      return i.length === 0 ? '<p class="text-gray-500">No notifications</p>' : `
        <ul class="space-y-3">
          ${i.slice(0, 5).map((a) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${a.title}</div>
                  <div class="text-gray-600 text-sm mt-1">${a.message}</div>
                </div>
                <span class="px-2 py-1 text-xs font-semibold ${a.read ? "text-gray-600 bg-gray-100" : "text-white bg-blue-500"} rounded-full whitespace-nowrap">
                  ${a.read ? "Read" : "New"}
                </span>
              </div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (s === "esign.widget.agreement_stats") {
      const i = Number(e.total || 0), a = Number(e.pending || 0), d = Number(e.completed || 0), r = Number(e.voided || 0) + Number(e.declined || 0) + Number(e.expired || 0), l = i > 0 ? Math.round(d * 100 / i) : 0, c = String(e.list_url || "").trim();
      return `
        <div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-gray-900">${this.formatNumber(i)}</div>
              <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
            </div>
            <div class="bg-blue-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-blue-700">${this.formatNumber(a)}</div>
              <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
            </div>
            <div class="bg-green-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-green-700">${this.formatNumber(d)}</div>
              <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
            </div>
            <div class="bg-red-50 rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-red-700">${this.formatNumber(r)}</div>
              <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
            </div>
          </div>
          ${i > 0 ? `
            <div class="mt-4 pt-4 border-t border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm text-gray-600">Completion Rate</span>
                <span class="text-sm font-semibold text-gray-900">${l}%</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-500 h-2 rounded-full" style="width: ${l}%"></div>
              </div>
            </div>
          ` : ""}
          ${c ? `
            <div class="mt-4 pt-3 border-t border-gray-100 text-center">
              <a href="${c}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
      const i = Array.isArray(e.activities) ? e.activities : [], a = String(e.activity_url || "").trim();
      if (i.length === 0) return `
          <div class="text-center py-4 text-gray-500">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p class="text-sm">No recent signing activity</p>
          </div>
          ${a ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${a}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Activity
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ""}
        `;
      const d = (r) => {
        const l = String(r || "").toLowerCase();
        return l === "signed" || l === "completed" ? "bg-green-500" : l === "viewed" ? "bg-purple-500" : l === "sent" ? "bg-blue-500" : l === "declined" ? "bg-orange-500" : l === "voided" || l === "expired" ? "bg-red-500" : "bg-gray-400";
      };
      return `
        <ul class="space-y-3">
          ${i.map((r) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${d(r.type)}" aria-hidden="true"></span>
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
        ${a ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${a}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
      const i = Math.max(0, Math.min(100, Number(e.email_success_rate ?? 100))), a = Math.max(0, Math.min(100, Number(e.job_success_rate ?? 100))), d = Number(e.pending_retries || 0), r = String(e.period || "").trim(), l = (g) => g >= 95 ? {
        text: "text-green-600",
        bar: "bg-green-500"
      } : g >= 80 ? {
        text: "text-yellow-600",
        bar: "bg-yellow-500"
      } : {
        text: "text-red-600",
        bar: "bg-red-500"
      }, c = l(i), p = l(a);
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
              <span class="text-sm font-semibold ${c.text}">${i}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${c.bar}" style="width: ${i}%"></div>
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
              <span class="text-sm font-semibold ${p.text}">${a}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="h-2 rounded-full ${p.bar}" style="width: ${a}%"></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-gray-400">
              <span>${this.formatNumber(e.jobs_completed || 0)} completed</span>
              <span>${this.formatNumber(e.jobs_failed || 0)} failed</span>
            </div>
          </div>
          ${d > 0 ? `
            <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div class="flex items-center gap-2 text-sm text-yellow-800">
                <svg class="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <span>${this.formatNumber(d)} items pending retry</span>
              </div>
            </div>
          ` : ""}
        </div>
        ${r ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${r}</div>` : ""}
      `;
    }
    if (s === "esign.widget.pending_signatures") {
      const i = Array.isArray(e.agreements) ? e.agreements : [], a = String(e.list_url || "").trim();
      return i.length === 0 ? `
          <div class="text-center py-6 text-gray-500">
            <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p class="text-sm font-medium">All caught up!</p>
            <p class="text-xs mt-1">No agreements pending signature</p>
          </div>
          ${a ? `
            <div class="mt-3 pt-3 border-t border-gray-100 text-center">
              <a href="${a}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                View All Pending
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </a>
            </div>
          ` : ""}
        ` : `
        <ul class="space-y-2">
          ${i.map((d) => {
        const r = Array.isArray(d.pending_recipients) ? d.pending_recipients : [];
        return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-medium text-gray-900 truncate">
                      ${d.url ? `<a href="${d.url}" class="hover:text-blue-600">${d.title || "Untitled"}</a>` : `${d.title || "Untitled"}`}
                    </div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      ${this.formatNumber(d.pending_count || 0)} of ${this.formatNumber(d.total_recipients || 0)} signatures pending
                    </div>
                  </div>
                </div>
                ${r.length > 0 ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${r.slice(0, 3).map((l) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${l.name || l.email || "Recipient"}
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
        ${a ? `
          <div class="mt-3 pt-3 border-t border-gray-100 text-center">
            <a href="${a}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
      const i = e.summary || {}, a = e.status_counts || {}, d = e.locale_counts || {}, r = Array.isArray(e.links) ? e.links : [], l = Number(i.overdue || 0), c = e.updated_at ? String(e.updated_at) : "", p = (g, u) => x(String(g || ""), { count: this.formatNumber(u) });
      return `
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${this.formatNumber(i.total || 0)}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${this.formatNumber(i.active || 0)}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">Active</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-purple-700">${this.formatNumber(i.review || 0)}</div>
            <div class="text-xs text-purple-600 uppercase tracking-wide">Review</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="${l > 0 ? "bg-red-50" : "bg-gray-50"} rounded-lg p-2 text-center">
            <div class="text-lg font-bold ${l > 0 ? "text-red-700" : "text-gray-600"}">
              ${this.formatNumber(l)}
            </div>
            <div class="text-xs ${l > 0 ? "text-red-600" : "text-gray-500"} uppercase tracking-wide">Overdue</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-lg font-bold text-green-700">${this.formatNumber(i.approved || 0)}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Approved</div>
          </div>
        </div>

        ${Object.keys(a).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Status</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(a).map(([g, u]) => p(g, u)).join("")}
            </div>
          </div>
        ` : ""}

        ${Object.keys(d).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(d).map(([g, u]) => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <span class="uppercase font-semibold">${g}</span>
                  <span class="text-indigo-500">${this.formatNumber(u)}</span>
                </span>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${r.length > 0 ? `
          <div class="pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
            <div class="flex flex-wrap gap-2">
              ${r.map((g) => `
                <a href="${g.url || "#"}"
                   class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                  ${g.label || "Open"}
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${c ? `
          <div class="mt-4 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Updated <time data-relative-time="${c}">${c}</time>
          </div>
        ` : ""}
      `;
    }
    if (j.has(s)) {
      const i = e.subtitle || o.subtitle || "", a = String(e.theme || "westeros"), d = String(e.chart_assets_host || "/dashboard/assets/echarts/"), r = e.chart_options ? JSON.stringify(e.chart_options) : "", l = `chart-${t.id || t.definition || Math.random().toString(36).slice(2, 10)}`;
      return `
        <div>
          ${i ? `<p class="text-sm text-gray-500 mb-3">${i}</p>` : ""}
          ${r ? `
            <div class="chart-container" data-echart-widget data-chart-id="${l}" data-chart-theme="${a}" data-chart-assets-host="${d}">
              <div id="${l}" class="w-full" style="height: 360px;"></div>
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
    return C[t] || t;
  }
  formatNumber(t) {
    return typeof t == "number" ? t.toLocaleString() : String(t);
  }
  normalizeSpan(t) {
    const s = Number.parseInt(String(t ?? ""), 10);
    return !Number.isFinite(s) || s < 1 || s > 12 ? 12 : s;
  }
}, m = /* @__PURE__ */ new Map(), h = /* @__PURE__ */ new WeakMap();
async function T(t) {
  const s = new E(t), e = t.apiBasePath ? `${t.apiBasePath}/dashboard` : `${t.basePath}/api/dashboard`, o = document.getElementById("dashboard-export");
  o && o.addEventListener("click", () => window.open(e));
  const n = z((await (await fetch(e)).json()).widgets || []);
  for (const [i, a] of Object.entries(n)) {
    const d = document.querySelector(`[data-area-grid="${i}"]`);
    d && (d.innerHTML = a.map((r) => s.render(r, i)).join(""));
  }
  await b(), await new N({
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
      const a = document.getElementById("save-status");
      a && (a.textContent = "Failed to save layout");
    }
  }).init(), await b();
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
function v(t) {
  if (!t) return Promise.resolve();
  if (m.has(t)) return m.get(t);
  if (document.querySelector(`script[src="${t}"]`)) {
    const e = Promise.resolve();
    return m.set(t, e), e;
  }
  const s = new Promise((e, o) => {
    const n = document.createElement("script");
    n.src = t, n.async = !0, n.onload = () => e(), n.onerror = () => o(/* @__PURE__ */ new Error(`Failed to load chart asset: ${t}`)), document.head.appendChild(n);
  });
  return m.set(t, s), s;
}
async function L(t, s) {
  const e = B(s);
  await v(`${e}echarts.min.js`), t && t !== "default" && await v(`${e}themes/${t}.js`);
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
  const s = (t.dataset.chartId || "").trim(), e = (t.dataset.chartTheme || "westeros").trim(), o = D(t), n = s ? document.getElementById(s) : null, i = window.echarts;
  if (!n || !o || !i) return;
  const a = i.getInstanceByDom(n) || i.init(n, e, { renderer: "canvas" });
  if (a.setOption(o, !0), !h.has(t) && window.ResizeObserver) {
    const d = new ResizeObserver(() => {
      try {
        a.resize();
      } catch (r) {
        console.warn("[admin-dashboard] Chart resize failed", r);
      }
    });
    d.observe(n), h.set(t, d);
  }
}
async function b() {
  const t = Array.from(document.querySelectorAll("[data-echart-widget]"));
  for (const s of t) {
    const e = (s.dataset.chartTheme || "westeros").trim(), o = s.dataset.chartAssetsHost || "";
    try {
      await L(e, o), M(s);
    } catch (n) {
      console.error("[admin-dashboard] Failed to hydrate chart widget", n);
    }
  }
}
function P() {
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
  S as DefaultDragDropBehavior,
  A as DefaultPersistenceBehavior,
  _ as DefaultResizeBehavior,
  k as DefaultVisibilityBehavior,
  N as WidgetGrid,
  E as WidgetRenderer,
  P as bootstrapAdminDashboard,
  T as initAdminDashboard
};

//# sourceMappingURL=index.js.map