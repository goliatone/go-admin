import { createLogger as f } from "../shared/logger.js";
import { escapeAttribute as u, escapeHTML as o } from "../shared/html.js";
import { httpRequest as _ } from "../shared/transport/http-client.js";
import { s as E } from "../chunks/status-vocabulary-BYdivV6D.js";
import { t as A } from "../chunks/sortable.esm-ChQrsKAN.js";
import { n as T, t as C } from "../chunks/application-widgets-ghhHXoXr.js";
var N = class {
  constructor() {
    this.sortableInstances = [];
  }
  enable(t, e) {
    t.querySelectorAll("[data-widgets-grid]").forEach((a) => {
      const n = A.create(a, {
        handle: ".widget-drag-handle",
        draggable: "[data-widget]",
        animation: 150,
        ghostClass: "widget--ghost",
        chosenClass: "widget--chosen",
        dragClass: "widget--drag",
        group: "dashboard-widgets",
        onEnd: () => {
          e();
        }
      });
      this.sortableInstances.push(n);
    });
  }
  disable() {
    this.sortableInstances.forEach((t) => {
      t.destroy();
    }), this.sortableInstances = [];
  }
}, z = class {
  toggleWidth(t, e, a) {
    const n = e === a ? a / 2 : a;
    return this.applyWidth(t, n), n;
  }
  applyWidth(t, e) {
    t.dataset.span = e.toString(), t.style.setProperty("--span", e.toString());
  }
}, j = class {
  toggle(t) {
    const e = t.dataset.hidden !== "true";
    return this.applyVisibility(t, e), e;
  }
  applyVisibility(t, e) {
    e ? (t.dataset.hidden = "true", t.classList.add("is-hidden")) : (delete t.dataset.hidden, t.classList.remove("is-hidden"));
  }
}, k = f("DashboardPersistence"), B = class {
  async save(t, e) {
    const a = await _(t, {
      method: "POST",
      json: e
    });
    if (!a.ok) throw new Error(`Failed to save layout: ${a.statusText}`);
  }
  async load(t) {
    try {
      const e = await fetch(t);
      return e.ok ? await e.json() : null;
    } catch (e) {
      return k.warn("Failed to load layout preferences:", e), null;
    }
  }
}, b = f("WidgetGrid"), D = class {
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
      onError: t.onError || ((e) => b.error("WidgetGrid error:", e))
    }, this.behaviors = {
      dragDrop: t.behaviors?.dragDrop || new N(),
      resize: t.behaviors?.resize || new z(),
      visibility: t.behaviors?.visibility || new j(),
      persistence: t.behaviors?.persistence || new B()
    };
  }
  async init(t) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container) throw new Error("Widget grid container not found");
    const e = this.normalizePanelDetailState(t);
    e.schema && (this.panelSchema = e.schema, this.panelTabs = e.schema.tabs || []), this.normalizeRenderedWidgetSpans(), this.attachEventListeners(), this.initializeDragDrop(), e.data && this.validateHydration(e.data);
  }
  validateHydration(t) {
    if (!Array.isArray(t?.areas) || !this.container) return;
    const e = Array.from(this.container.querySelectorAll("[data-widgets-grid][data-area-grid]")).map((r) => r.dataset.areaGrid || r.dataset.areaCode || "").filter((r) => !!r);
    if (e.length === 0) return;
    const a = new Set(t.areas.map((r) => r?.code || r?.area_code || r?.id || "").filter((r) => typeof r == "string" && r.length > 0)), n = e.filter((r) => !a.has(r));
    n.length > 0 && b.warn("Hydration mismatch: rendered area(s) missing from server state", {
      missing: n,
      server: Array.from(a),
      dom: e
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
      const e = t;
      return {
        data: e.data,
        schema: e.schema
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
      const e = this.normalizeSpan(t.dataset.span);
      t.dataset.span = e.toString(), t.style.setProperty("--span", e.toString());
    });
  }
  normalizeSpan(t) {
    const e = Number.parseInt(String(t ?? ""), 10), a = Math.min(Math.max(this.config.defaultSpan, 1), this.config.maxColumns);
    return !Number.isFinite(e) || e < 1 || e > this.config.maxColumns ? a : e;
  }
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (t) => {
      const e = t.target.closest(this.config.selectors.hideBtn);
      if (e) {
        const a = e.closest("[data-widget]");
        a && (this.behaviors.visibility.toggle(a), this.saveLayout());
      }
    }), this.container.addEventListener("click", (t) => {
      const e = t.target.closest(this.config.selectors.resizeBtn);
      if (e) {
        const a = e.closest("[data-widget]");
        if (a) {
          const n = this.normalizeSpan(a.dataset.span), r = this.behaviors.resize.toggleWidth(a, n, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", i = Array.from(e.childNodes).find((s) => s.nodeType === Node.TEXT_NODE);
          i && (i.textContent = r), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((t) => {
      const e = t.closest("[data-widget]");
      if (e) {
        const a = this.normalizeSpan(e.dataset.span) === this.config.maxColumns ? "Half Width" : "Full Width", n = Array.from(t.childNodes).find((r) => r.nodeType === Node.TEXT_NODE);
        n && (n.textContent = a);
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
    this.container.querySelectorAll(this.config.selectors.areas).forEach((a) => {
      const n = a.dataset.areaGrid || a.dataset.areaCode;
      if (!n) return;
      const r = Array.from(a.querySelectorAll('[data-widget]:not([data-hidden="true"])'));
      t.area_order[n] = r.map((i) => i.dataset.widget), t.layout_rows[n] = this.serializeRows(r);
    });
    const e = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return t.hidden_widget_ids = Array.from(e).map((a) => a.dataset.widget), t;
  }
  serializeRows(t) {
    const e = [];
    let a = [], n = 0;
    return t.forEach((r) => {
      const i = r.dataset.widget, s = this.normalizeSpan(r.dataset.span);
      n + s > this.config.maxColumns && n > 0 && (e.push({ widgets: a }), a = [], n = 0), a.push({
        id: i,
        width: s
      }), n += s, n >= this.config.maxColumns && (e.push({ widgets: a }), a = [], n = 0);
    }), a.length > 0 && e.push({ widgets: a }), e;
  }
  updateStatus(t) {
    this.statusElement && (this.statusElement.textContent = t);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}, L = {
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
  "admin.widget.scatter_chart": "Scatter Chart"
}, O = /* @__PURE__ */ new Set([
  "admin.widget.bar_chart",
  "admin.widget.line_chart",
  "admin.widget.pie_chart",
  "admin.widget.gauge_chart",
  "admin.widget.scatter_chart"
]);
function W(t) {
  return JSON.stringify(t).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
var I = class {
  constructor(t) {
    this.activityActionLabels = t.activityActionLabels || {};
  }
  render(t, e) {
    const a = e === "admin.dashboard.main" || e === "admin.dashboard.footer", n = this.normalizeSpan(t.metadata?.layout?.width ?? t.span), r = t.hidden || !1, i = t.data?.title || t.config?.title || T(t.definition, t) || this.getTitle(t.definition), s = t.id || t.definition || `widget-${Math.random().toString(36).substr(2, 9)}`, l = this.renderContent(t);
    let d = '<div class="widget__toolbar">';
    return d += '<button type="button" class="hide-widget">Toggle Hide</button>', a ? d += '<button type="button" class="resize-widget">Half Width</button>' : d += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>', d += "</div>", `
      <article class="widget"
               data-widget="${u(s)}"
               data-span="${n}"
               data-area-code="${u(e)}"
               data-resizable="${a}"
               ${r ? 'data-hidden="true"' : ""}
               style="--span: ${n}">
        ${d}
        <div class="widget__header mb-4">
          
      <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder widget">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </button>
    
          <h3 class="text-lg font-semibold text-gray-900">${o(i)}</h3>
        </div>
        <div class="widget__content">
          ${l}
        </div>
      </article>
    `;
  }
  renderContent(t) {
    const e = t.definition || "", a = t.data || {}, n = t.config || {}, r = C(e);
    if (r) return r.render(t);
    if (e === "admin.widget.user_stats") {
      const i = {
        Total: a.total ?? 0,
        Active: a.active ?? 0,
        "New Today": a.new_today ?? 0
      };
      return a.trend && (i.Trend = a.trend), `
        <div class="metrics">
          ${Object.entries(i).map(([s, l]) => `
            <div class="metric">
              <small>${s}</small>
              <span>${o(this.formatNumber(l))}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (e === "admin.widget.user_profile_overview") {
      const i = a.values || {}, s = Object.entries(i);
      return s.length === 0 ? '<p class="text-gray-500">No profile data to display</p>' : `
        <dl class="space-y-2">
          ${s.map(([l, d]) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-600">${o(l)}</dt>
              <dd class="text-sm font-semibold text-gray-900">${o(d ?? "—")}</dd>
            </div>
          `).join("")}
        </dl>
      `;
    }
    if (e === "admin.widget.settings_overview") {
      const i = a.values || {}, s = Object.entries(i);
      return s.length === 0 ? '<p class="text-gray-500">No settings to display</p>' : `
        <dl class="space-y-2">
          ${s.map(([l, d]) => {
        const c = typeof d == "object" && d !== null ? d.value ?? d : d;
        return `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${o(l)}</dt>
                <dd class="text-sm font-semibold text-gray-900">${o(c ?? "—")}</dd>
              </div>
            `;
      }).join("")}
        </dl>
      `;
    }
    if (e === "admin.widget.activity_feed") {
      const i = a.entries || [];
      return i.length === 0 ? '<p class="text-gray-500">No recent activity</p>' : `
        <ul class="space-y-3">
          ${i.map((s) => {
        const l = String(s?.actor || s?.metadata?.actor || "system").trim() || "system", d = String(s?.action || "").trim(), c = this.activityActionLabels?.[d] || d || "updated", g = String(s?.object || "").trim();
        return `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${o(l)}</div>
              <div class="text-gray-600 text-sm mt-1">${o(c)}${g ? ` ${o(g)}` : ""}</div>
            </li>
          `;
      }).join("")}
        </ul>
      `;
    }
    if (e === "admin.widget.quick_actions") {
      const i = a.actions || [];
      return i.length === 0 ? '<p class="text-gray-500">No quick actions configured</p>' : `
        <div class="space-y-2">
          ${i.map((s) => `
            <a class="block p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition" href="${u(s.url || "#")}" target="_blank" rel="noreferrer">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900 text-sm">${o(s.label || "Action")}</div>
                ${s.method ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${o(s.method)}</span>` : ""}
              </div>
              ${s.description ? `<div class="text-gray-600 text-sm mt-1">${o(s.description)}</div>` : ""}
            </a>
          `).join("")}
        </div>
      `;
    }
    if (e === "admin.widget.chart_sample")
      return a.disabled ? '<p class="text-gray-500 text-sm italic">This legacy chart widget has been disabled.</p>' : '<p class="text-gray-500 text-sm italic">Legacy chart widgets are not supported in the canonical dashboard contract.</p>';
    if (e === "admin.widget.system_health") return `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-semibold text-green-600">${o(a.status || "unknown")}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-semibold">${o(a.uptime || "N/A")}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">API Latency:</span>
            <span class="font-semibold">${o(a.api_latency || "N/A")}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Database:</span>
            <span class="font-semibold ${a.db_status === "connected" ? "text-green-600" : "text-red-600"}">${o(a.db_status || "unknown")}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.content_stats") return `
        <div class="metrics">
          <div class="metric">
            <small>Published</small>
            <span>${o(this.formatNumber(a.published || 0))}</span>
          </div>
          <div class="metric">
            <small>Draft</small>
            <span>${o(this.formatNumber(a.draft || 0))}</span>
          </div>
          <div class="metric">
            <small>Scheduled</small>
            <span>${o(this.formatNumber(a.scheduled || 0))}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.storage_stats") return `
        <div class="metrics">
          <div class="metric">
            <small>Used</small>
            <span>${o(a.used || "0 GB")}</span>
          </div>
          <div class="metric">
            <small>Total</small>
            <span>${o(a.total || "0 GB")}</span>
          </div>
          <div class="metric">
            <small>Usage</small>
            <span>${o(a.percentage || "0%")}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.notifications") {
      const i = a.notifications || [];
      return i.length === 0 ? '<p class="text-gray-500">No notifications</p>' : `
        <ul class="space-y-3">
          ${i.slice(0, 5).map((s) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${o(s.title)}</div>
                  <div class="text-gray-600 text-sm mt-1">${o(s.message)}</div>
                </div>
                <span class="px-2 py-1 text-xs font-semibold ${s.read ? "text-gray-600 bg-gray-100" : "text-white bg-blue-500"} rounded-full whitespace-nowrap">
                  ${s.read ? "Read" : "New"}
                </span>
              </div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (e === "admin.widget.translation_progress") {
      const i = a.summary || {}, s = a.status_counts || {}, l = a.locale_counts || {}, d = Array.isArray(a.links) ? a.links : [], c = Number(i.overdue || 0), g = a.updated_at ? String(a.updated_at) : "", S = (h, m) => E(String(h || ""), { count: this.formatNumber(m) });
      return `
        <div class="grid grid-cols-3 gap-3 mb-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${o(this.formatNumber(i.total || 0))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${o(this.formatNumber(i.active || 0))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">Active</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-purple-700">${o(this.formatNumber(i.review || 0))}</div>
            <div class="text-xs text-purple-600 uppercase tracking-wide">Review</div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-4">
          <div class="${c > 0 ? "bg-red-50" : "bg-gray-50"} rounded-lg p-2 text-center">
            <div class="text-lg font-bold ${c > 0 ? "text-red-700" : "text-gray-600"}">
              ${o(this.formatNumber(c))}
            </div>
            <div class="text-xs ${c > 0 ? "text-red-600" : "text-gray-500"} uppercase tracking-wide">Overdue</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-lg font-bold text-green-700">${o(this.formatNumber(i.approved || 0))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Approved</div>
          </div>
        </div>

        ${Object.keys(s).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Status</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(s).map(([h, m]) => S(h, m)).join("")}
            </div>
          </div>
        ` : ""}

        ${Object.keys(l).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(l).map(([h, m]) => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <span class="uppercase font-semibold">${o(h)}</span>
                  <span class="text-indigo-500">${o(this.formatNumber(m))}</span>
                </span>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${d.length > 0 ? `
          <div class="pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
            <div class="flex flex-wrap gap-2">
              ${d.map((h) => `
                <a href="${u(h.url || "#")}"
                   class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors">
                  ${o(h.label || "Open")}
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${g ? `
          <div class="mt-4 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Updated <time data-relative-time="${u(g)}">${o(g)}</time>
          </div>
        ` : ""}
      `;
    }
    if (O.has(e)) {
      const i = a.subtitle || n.subtitle || "", s = String(a.theme || "westeros"), l = String(a.chart_assets_host || "/dashboard/assets/echarts/"), d = a.chart_options ? W(a.chart_options) : "", c = u(`chart-${t.id || t.definition || Math.random().toString(36).slice(2, 10)}`);
      return `
        <div>
          ${i ? `<p class="text-sm text-gray-500 mb-3">${o(i)}</p>` : ""}
          ${d ? `
            <div class="chart-container" data-echart-widget data-chart-id="${c}" data-chart-theme="${u(s)}" data-chart-assets-host="${u(l)}">
              <div id="${c}" class="w-full" style="height: 360px;"></div>
              <script type="application/json" data-chart-options>${d}<\/script>
            </div>
          ` : '<p class="text-sm text-gray-500 italic">Chart configuration unavailable.</p>'}
          ${a.footer_note ? `<p class="text-xs text-gray-500 mt-2">${o(a.footer_note)}</p>` : ""}
        </div>
      `;
    }
    return `<pre class="text-xs text-gray-600 overflow-auto">${o(JSON.stringify(a, null, 2))}</pre>`;
  }
  getTitle(t) {
    return L[t] || t;
  }
  formatNumber(t) {
    return typeof t == "number" ? t.toLocaleString() : String(t);
  }
  normalizeSpan(t) {
    const e = Number.parseInt(String(t ?? ""), 10);
    return !Number.isFinite(e) || e < 1 || e > 12 ? 12 : e;
  }
}, p = f("AdminDashboard"), v = /* @__PURE__ */ new Map(), y = /* @__PURE__ */ new WeakMap();
async function R(t) {
  const e = new I(t), a = t.apiBasePath ? `${t.apiBasePath}/dashboard` : `${t.basePath}/api/dashboard`, n = document.getElementById("dashboard-export");
  n && n.addEventListener("click", () => window.open(a));
  const r = H((await (await fetch(a)).json()).widgets || []);
  for (const [i, s] of Object.entries(r)) {
    const l = document.querySelector(`[data-area-grid="${i}"]`);
    l && (l.innerHTML = s.map((d) => e.render(d, i)).join(""));
  }
  await x(), await new D({
    apiEndpoint: a,
    preferencesEndpoint: `${a}/preferences`,
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
      p.debug("Layout saved:", i);
    },
    onError: (i) => {
      p.error("Widget grid error:", i);
      const s = document.getElementById("save-status");
      s && (s.textContent = "Failed to save layout");
    }
  }).init(), await x();
}
function H(t) {
  return t.reduce((e, a) => {
    const n = a.area || "admin.dashboard.main";
    return e[n] || (e[n] = []), e[n].push(a), e;
  }, {});
}
function $(t) {
  const e = (t || "").trim();
  return e ? e.endsWith("/") ? e : `${e}/` : "/dashboard/assets/echarts/";
}
function w(t) {
  if (!t) return Promise.resolve();
  if (v.has(t)) return v.get(t);
  if (document.querySelector(`script[src="${t}"]`)) {
    const a = Promise.resolve();
    return v.set(t, a), a;
  }
  const e = new Promise((a, n) => {
    const r = document.createElement("script");
    r.src = t, r.async = !0, r.onload = () => a(), r.onerror = () => n(/* @__PURE__ */ new Error(`Failed to load chart asset: ${t}`)), document.head.appendChild(r);
  });
  return v.set(t, e), e;
}
var P = /* @__PURE__ */ new Set([
  "default",
  "light",
  "dark"
]);
function q(t, e) {
  const a = (t || "").trim();
  return !a || P.has(a) ? "" : `${$(e)}themes/${a}.js`;
}
async function M(t, e) {
  const a = $(e);
  await w(`${a}echarts.min.js`), await w(q(t, a));
}
function F(t) {
  const e = t.querySelector("script[data-chart-options]");
  if (!e?.textContent) return null;
  try {
    return JSON.parse(e.textContent);
  } catch (a) {
    return p.error("[admin-dashboard] Failed to parse chart options", a), null;
  }
}
function G(t) {
  const e = (t.dataset.chartId || "").trim(), a = (t.dataset.chartTheme || "westeros").trim(), n = F(t), r = e ? document.getElementById(e) : null, i = window.echarts;
  if (!r || !n || !i) return;
  const s = i.getInstanceByDom(r) || i.init(r, a, { renderer: "canvas" });
  if (s.setOption(n, !0), !y.has(t) && window.ResizeObserver) {
    const l = new ResizeObserver(() => {
      try {
        s.resize();
      } catch (d) {
        p.warn("[admin-dashboard] Chart resize failed", d);
      }
    });
    l.observe(r), y.set(t, l);
  }
}
async function x() {
  const t = Array.from(document.querySelectorAll("[data-echart-widget]"));
  for (const e of t) {
    const a = (e.dataset.chartTheme || "westeros").trim(), n = e.dataset.chartAssetsHost || "";
    try {
      await M(a, n), G(e);
    } catch (r) {
      p.error("[admin-dashboard] Failed to hydrate chart widget", r);
    }
  }
}
function Y() {
  const t = document.getElementById("admin-dashboard-config");
  if (!t?.textContent) {
    p.error("[admin-dashboard] Missing #admin-dashboard-config element");
    return;
  }
  try {
    R(JSON.parse(t.textContent)).catch((e) => {
      p.error("[admin-dashboard] Failed to initialize:", e);
    });
  } catch (e) {
    p.error("[admin-dashboard] Invalid config JSON:", e);
  }
}
export {
  N as DefaultDragDropBehavior,
  B as DefaultPersistenceBehavior,
  z as DefaultResizeBehavior,
  j as DefaultVisibilityBehavior,
  D as WidgetGrid,
  I as WidgetRenderer,
  Y as bootstrapAdminDashboard,
  q as echartsThemeScriptURL,
  R as initAdminDashboard,
  F as parseChartOptions
};

//# sourceMappingURL=index.js.map