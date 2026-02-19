import { S as $ } from "../chunks/sortable.esm-DOKudrbz.js";
class S {
  constructor() {
    this.sortableInstances = [];
  }
  enable(t, e) {
    t.querySelectorAll("[data-widgets-grid]").forEach((i) => {
      const a = $.create(i, {
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
      this.sortableInstances.push(a);
    });
  }
  disable() {
    this.sortableInstances.forEach((t) => {
      t.destroy();
    }), this.sortableInstances = [];
  }
}
class _ {
  toggleWidth(t, e, s) {
    const i = e === s ? s / 2 : s;
    return this.applyWidth(t, i), i;
  }
  applyWidth(t, e) {
    t.dataset.span = e.toString(), t.style.setProperty("--span", e.toString());
  }
}
class C {
  toggle(t) {
    const s = !(t.dataset.hidden === "true");
    return this.applyVisibility(t, s), s;
  }
  applyVisibility(t, e) {
    e ? (t.dataset.hidden = "true", t.classList.add("is-hidden")) : (delete t.dataset.hidden, t.classList.remove("is-hidden"));
  }
}
class E {
  async save(t, e) {
    const s = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(e)
    });
    if (!s.ok)
      throw new Error(`Failed to save layout: ${s.statusText}`);
  }
  async load(t) {
    try {
      const e = await fetch(t);
      return e.ok ? await e.json() : null;
    } catch (e) {
      return console.warn("Failed to load layout preferences:", e), null;
    }
  }
}
class T {
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
      onError: t.onError || ((e) => console.error("WidgetGrid error:", e))
    }, this.behaviors = {
      dragDrop: t.behaviors?.dragDrop || new S(),
      resize: t.behaviors?.resize || new _(),
      visibility: t.behaviors?.visibility || new C(),
      persistence: t.behaviors?.persistence || new E()
    };
  }
  async init(t) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container)
      throw new Error("Widget grid container not found");
    const e = this.normalizePanelDetailState(t);
    e.schema && (this.panelSchema = e.schema, this.panelTabs = e.schema.tabs || []), this.normalizeRenderedWidgetSpans(), this.attachEventListeners(), this.initializeDragDrop(), e.data && this.validateHydration(e.data);
  }
  validateHydration(t) {
    if (!Array.isArray(t?.areas) || !this.container)
      return;
    const e = Array.from(
      this.container.querySelectorAll("[data-widgets-grid][data-area-grid]")
    ).map((a) => a.dataset.areaGrid || a.dataset.areaCode || "").filter((a) => !!a);
    if (e.length === 0)
      return;
    const s = new Set(
      t.areas.map((a) => a?.code || a?.area_code || a?.id || "").filter((a) => typeof a == "string" && a.length > 0)
    ), i = e.filter((a) => !s.has(a));
    i.length > 0 && console.warn("Hydration mismatch: rendered area(s) missing from server state", {
      missing: i,
      server: Array.from(s),
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
    if (!t)
      return {};
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
    const e = Number.parseInt(String(t ?? ""), 10), s = Math.min(Math.max(this.config.defaultSpan, 1), this.config.maxColumns);
    return !Number.isFinite(e) || e < 1 || e > this.config.maxColumns ? s : e;
  }
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.hideBtn);
      if (s) {
        const i = s.closest("[data-widget]");
        i && (this.behaviors.visibility.toggle(i), this.saveLayout());
      }
    }), this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.resizeBtn);
      if (s) {
        const i = s.closest("[data-widget]");
        if (i) {
          const a = this.normalizeSpan(i.dataset.span), d = this.behaviors.resize.toggleWidth(i, a, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", o = Array.from(s.childNodes).find((l) => l.nodeType === Node.TEXT_NODE);
          o && (o.textContent = d), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((t) => {
      const e = t.closest("[data-widget]");
      if (e) {
        const i = this.normalizeSpan(e.dataset.span) === this.config.maxColumns ? "Half Width" : "Full Width", a = Array.from(t.childNodes).find((r) => r.nodeType === Node.TEXT_NODE);
        a && (a.textContent = i);
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
    this.container.querySelectorAll(this.config.selectors.areas).forEach((i) => {
      const a = i.dataset.areaGrid || i.dataset.areaCode;
      if (!a) return;
      const r = Array.from(
        i.querySelectorAll('[data-widget]:not([data-hidden="true"])')
      );
      t.area_order[a] = r.map((d) => d.dataset.widget), t.layout_rows[a] = this.serializeRows(r);
    });
    const s = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return t.hidden_widget_ids = Array.from(s).map((i) => i.dataset.widget), t;
  }
  serializeRows(t) {
    const e = [];
    let s = [], i = 0;
    return t.forEach((a) => {
      const r = a.dataset.widget, d = this.normalizeSpan(a.dataset.span);
      i + d > this.config.maxColumns && i > 0 && (e.push({ widgets: s }), s = [], i = 0), s.push({ id: r, width: d }), i += d, i >= this.config.maxColumns && (e.push({ widgets: s }), s = [], i = 0);
    }), s.length > 0 && e.push({ widgets: s }), e;
  }
  updateStatus(t) {
    this.statusElement && (this.statusElement.textContent = t);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}
const A = {
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
}, N = /* @__PURE__ */ new Set([
  "admin.widget.bar_chart",
  "admin.widget.line_chart",
  "admin.widget.pie_chart",
  "admin.widget.gauge_chart",
  "admin.widget.scatter_chart"
]);
class z {
  constructor(t) {
    this.activityActionLabels = t.activityActionLabels || {};
  }
  /**
   * Render a complete widget with wrapper and toolbar
   */
  render(t, e) {
    const s = e === "admin.dashboard.main" || e === "admin.dashboard.footer", i = this.normalizeSpan(t.metadata?.layout?.width ?? t.span), a = t.hidden || !1, r = t.data?.title || t.config?.title || this.getTitle(t.definition), d = t.id || t.definition || `widget-${Math.random().toString(36).substr(2, 9)}`, o = this.renderContent(t);
    let l = '<div class="widget__toolbar">';
    return l += '<button type="button" class="hide-widget">Toggle Hide</button>', s ? l += '<button type="button" class="resize-widget">Half Width</button>' : l += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>', l += "</div>", `
      <article class="widget"
               data-widget="${d}"
               data-span="${i}"
               data-area-code="${e}"
               data-resizable="${s}"
               ${a ? 'data-hidden="true"' : ""}
               style="--span: ${i}">
        ${l}
        <div class="widget__header mb-4">
          
      <button type="button" class="widget-drag-handle" title="Drag to reorder" aria-label="Drag to reorder widget">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
        </svg>
      </button>
    
          <h3 class="text-lg font-semibold text-gray-900">${r}</h3>
        </div>
        <div class="widget__content">
          ${o}
        </div>
      </article>
    `;
  }
  /**
   * Render widget content based on definition type
   */
  renderContent(t) {
    const e = t.definition || "", s = t.data || {}, i = t.config || {};
    if (e === "admin.widget.user_stats") {
      const a = {
        Total: s.total ?? 0,
        Active: s.active ?? 0,
        "New Today": s.new_today ?? 0
      };
      return s.trend && (a.Trend = s.trend), `
        <div class="metrics">
          ${Object.entries(a).map(([r, d]) => `
            <div class="metric">
              <small>${r}</small>
              <span>${this.formatNumber(d)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (e === "admin.widget.user_profile_overview") {
      const a = s.values || {}, r = Object.entries(a);
      return r.length === 0 ? '<p class="text-gray-500">No profile data to display</p>' : `
        <dl class="space-y-2">
          ${r.map(([d, o]) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-600">${d}</dt>
              <dd class="text-sm font-semibold text-gray-900">${o ?? "—"}</dd>
            </div>
          `).join("")}
        </dl>
      `;
    }
    if (e === "admin.widget.settings_overview") {
      const a = s.values || {}, r = Object.entries(a);
      return r.length === 0 ? '<p class="text-gray-500">No settings to display</p>' : `
        <dl class="space-y-2">
          ${r.map(([d, o]) => {
        const l = typeof o == "object" && o !== null ? o.value ?? o : o;
        return `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${d}</dt>
                <dd class="text-sm font-semibold text-gray-900">${l ?? "—"}</dd>
              </div>
            `;
      }).join("")}
        </dl>
      `;
    }
    if (e === "admin.widget.activity_feed") {
      const a = s.entries || [];
      return a.length === 0 ? '<p class="text-gray-500">No recent activity</p>' : `
        <ul class="space-y-3">
          ${a.map((r) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${r.actor}</div>
              <div class="text-gray-600 text-sm mt-1">${this.activityActionLabels?.[r.action] || r.action} ${r.object}</div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (e === "admin.widget.quick_actions") {
      const a = s.actions || [];
      return a.length === 0 ? '<p class="text-gray-500">No quick actions configured</p>' : `
        <div class="space-y-2">
          ${a.map((r) => `
            <a class="block p-3 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50/50 transition" href="${r.url || "#"}" target="_blank" rel="noreferrer">
              <div class="flex items-center justify-between gap-2">
                <div class="font-semibold text-gray-900 text-sm">${r.label || "Action"}</div>
                ${r.method ? `<span class="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">${r.method}</span>` : ""}
              </div>
              ${r.description ? `<div class="text-gray-600 text-sm mt-1">${r.description}</div>` : ""}
            </a>
          `).join("")}
        </div>
      `;
    }
    if (e === "admin.widget.chart_sample" && s.disabled)
      return '<p class="text-gray-500 text-sm italic">This legacy chart widget has been disabled.</p>';
    if (e === "admin.widget.system_health")
      return `
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-gray-600">Status:</span>
            <span class="font-semibold text-green-600">${s.status || "unknown"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Uptime:</span>
            <span class="font-semibold">${s.uptime || "N/A"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">API Latency:</span>
            <span class="font-semibold">${s.api_latency || "N/A"}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">Database:</span>
            <span class="font-semibold ${s.db_status === "connected" ? "text-green-600" : "text-red-600"}">${s.db_status || "unknown"}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.content_stats")
      return `
        <div class="metrics">
          <div class="metric">
            <small>Published</small>
            <span>${this.formatNumber(s.published || 0)}</span>
          </div>
          <div class="metric">
            <small>Draft</small>
            <span>${this.formatNumber(s.draft || 0)}</span>
          </div>
          <div class="metric">
            <small>Scheduled</small>
            <span>${this.formatNumber(s.scheduled || 0)}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.storage_stats")
      return `
        <div class="metrics">
          <div class="metric">
            <small>Used</small>
            <span>${s.used || "0 GB"}</span>
          </div>
          <div class="metric">
            <small>Total</small>
            <span>${s.total || "0 GB"}</span>
          </div>
          <div class="metric">
            <small>Usage</small>
            <span>${s.percentage || "0%"}</span>
          </div>
        </div>
      `;
    if (e === "admin.widget.notifications") {
      const a = s.notifications || [];
      return a.length === 0 ? '<p class="text-gray-500">No notifications</p>' : `
        <ul class="space-y-3">
          ${a.slice(0, 5).map((r) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${r.title}</div>
                  <div class="text-gray-600 text-sm mt-1">${r.message}</div>
                </div>
                <span class="px-2 py-1 text-xs font-semibold ${r.read ? "text-gray-600 bg-gray-100" : "text-white bg-blue-500"} rounded-full whitespace-nowrap">
                  ${r.read ? "Read" : "New"}
                </span>
              </div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (e === "admin.widget.translation_progress") {
      const a = s.summary || {}, r = s.status_counts || {}, d = s.locale_counts || {}, o = Array.isArray(s.links) ? s.links : [], l = Number(a.overdue || 0), h = s.updated_at ? String(s.updated_at) : "", f = (c, m) => {
        const g = String(c || "").trim().toLowerCase();
        let p = "bg-gray-100 text-gray-800", u = "bg-gray-500";
        g === "pending" ? (p = "bg-yellow-100 text-yellow-800", u = "bg-yellow-500") : g === "in_progress" ? (p = "bg-blue-100 text-blue-800", u = "bg-blue-500") : g === "review" ? (p = "bg-purple-100 text-purple-800", u = "bg-purple-500") : g === "approved" || g === "completed" ? (p = "bg-green-100 text-green-800", u = "bg-green-500") : g === "rejected" && (p = "bg-red-100 text-red-800", u = "bg-red-500");
        const w = this.formatStatusLabel(c);
        return `
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${p}">
            <span class="w-1.5 h-1.5 rounded-full ${u}"></span>
            ${w}: ${this.formatNumber(m)}
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
          <div class="${l > 0 ? "bg-red-50" : "bg-gray-50"} rounded-lg p-2 text-center">
            <div class="text-lg font-bold ${l > 0 ? "text-red-700" : "text-gray-600"}">
              ${this.formatNumber(l)}
            </div>
            <div class="text-xs ${l > 0 ? "text-red-600" : "text-gray-500"} uppercase tracking-wide">Overdue</div>
          </div>
          <div class="bg-green-50 rounded-lg p-2 text-center">
            <div class="text-lg font-bold text-green-700">${this.formatNumber(a.approved || 0)}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Approved</div>
          </div>
        </div>

        ${Object.keys(r).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Status</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(r).map(([c, m]) => f(c, m)).join("")}
            </div>
          </div>
        ` : ""}

        ${Object.keys(d).length > 0 ? `
          <div class="mb-4 pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">By Language</div>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(d).map(([c, m]) => `
                <span class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                  <span class="uppercase font-semibold">${c}</span>
                  <span class="text-indigo-500">${this.formatNumber(m)}</span>
                </span>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${o.length > 0 ? `
          <div class="pt-3 border-t border-gray-100">
            <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">Quick Access</div>
            <div class="flex flex-wrap gap-2">
              ${o.map((c) => `
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

        ${h ? `
          <div class="mt-4 pt-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            Updated <time data-relative-time="${h}">${h}</time>
          </div>
        ` : ""}
      `;
    }
    if (N.has(e)) {
      const a = s.subtitle || i.subtitle || "", r = String(s.theme || "westeros"), d = String(s.chart_assets_host || "/dashboard/assets/echarts/"), o = s.chart_options ? JSON.stringify(s.chart_options) : "", l = `chart-${t.id || t.definition || Math.random().toString(36).slice(2, 10)}`;
      return `
        <div>
          ${a ? `<p class="text-sm text-gray-500 mb-3">${a}</p>` : ""}
          ${o ? `
            <div class="chart-container" data-echart-widget data-chart-id="${l}" data-chart-theme="${r}" data-chart-assets-host="${d}">
              <div id="${l}" class="w-full" style="height: 360px;"></div>
              <script type="application/json" data-chart-options>${o}<\/script>
            </div>
          ` : '<p class="text-sm text-gray-500 italic">Chart configuration unavailable.</p>'}
          ${s.footer_note ? `<p class="text-xs text-gray-500 mt-2">${s.footer_note}</p>` : ""}
        </div>
      `;
    }
    return `<pre class="text-xs text-gray-600 overflow-auto">${JSON.stringify(s, null, 2)}</pre>`;
  }
  /**
   * Get display title for widget definition
   */
  getTitle(t) {
    return A[t] || t;
  }
  /**
   * Format number with locale
   */
  formatNumber(t) {
    return typeof t == "number" ? t.toLocaleString() : String(t);
  }
  formatStatusLabel(t) {
    const e = String(t || "").trim();
    return e ? e.split("_").map((s) => s && s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Unknown";
  }
  normalizeSpan(t) {
    const e = Number.parseInt(String(t ?? ""), 10);
    return !Number.isFinite(e) || e < 1 || e > 12 ? 12 : e;
  }
}
const b = /* @__PURE__ */ new Map(), v = /* @__PURE__ */ new WeakMap();
async function j(n) {
  const t = new z(n), e = n.apiBasePath ? `${n.apiBasePath}/dashboard` : `${n.basePath}/api/dashboard`, s = document.getElementById("dashboard-export");
  s && s.addEventListener("click", () => window.open(e));
  const a = await (await fetch(e)).json(), r = k(a.widgets || []);
  for (const [o, l] of Object.entries(r)) {
    const h = document.querySelector(`[data-area-grid="${o}"]`);
    h && (h.innerHTML = l.map((f) => t.render(f, o)).join(""));
  }
  await x(), await new T({
    apiEndpoint: e,
    preferencesEndpoint: `${e}/preferences`,
    areas: ["admin.dashboard.main", "admin.dashboard.sidebar", "admin.dashboard.footer"],
    selectors: {
      hideBtn: ".hide-widget",
      resizeBtn: ".resize-widget"
    },
    onSave: (o) => {
      console.log("Layout saved:", o);
    },
    onError: (o) => {
      console.error("Widget grid error:", o);
      const l = document.getElementById("save-status");
      l && (l.textContent = "Failed to save layout");
    }
  }).init(), await x();
}
function k(n) {
  return n.reduce((t, e) => {
    const s = e.area || "admin.dashboard.main";
    return t[s] || (t[s] = []), t[s].push(e), t;
  }, {});
}
function B(n) {
  const t = (n || "").trim();
  return t ? t.endsWith("/") ? t : `${t}/` : "/dashboard/assets/echarts/";
}
function y(n) {
  if (!n)
    return Promise.resolve();
  if (b.has(n))
    return b.get(n);
  if (document.querySelector(`script[src="${n}"]`)) {
    const s = Promise.resolve();
    return b.set(n, s), s;
  }
  const e = new Promise((s, i) => {
    const a = document.createElement("script");
    a.src = n, a.async = !0, a.onload = () => s(), a.onerror = () => i(new Error(`Failed to load chart asset: ${n}`)), document.head.appendChild(a);
  });
  return b.set(n, e), e;
}
async function D(n, t) {
  const e = B(t);
  await y(`${e}echarts.min.js`), n && n !== "default" && await y(`${e}themes/${n}.js`);
}
function L(n) {
  const t = n.querySelector("script[data-chart-options]");
  if (!t?.textContent)
    return null;
  try {
    return JSON.parse(t.textContent);
  } catch (e) {
    return console.error("[admin-dashboard] Failed to parse chart options", e), null;
  }
}
function O(n) {
  const t = (n.dataset.chartId || "").trim(), e = (n.dataset.chartTheme || "westeros").trim(), s = L(n), i = t ? document.getElementById(t) : null, a = window.echarts;
  if (!i || !s || !a)
    return;
  const r = a.getInstanceByDom(i) || a.init(i, e, { renderer: "canvas" });
  if (r.setOption(s, !0), !v.has(n) && window.ResizeObserver) {
    const d = new ResizeObserver(() => {
      try {
        r.resize();
      } catch (o) {
        console.warn("[admin-dashboard] Chart resize failed", o);
      }
    });
    d.observe(i), v.set(n, d);
  }
}
async function x() {
  const n = Array.from(document.querySelectorAll("[data-echart-widget]"));
  for (const t of n) {
    const e = (t.dataset.chartTheme || "westeros").trim(), s = t.dataset.chartAssetsHost || "";
    try {
      await D(e, s), O(t);
    } catch (i) {
      console.error("[admin-dashboard] Failed to hydrate chart widget", i);
    }
  }
}
function W() {
  const n = document.getElementById("admin-dashboard-config");
  if (!n?.textContent) {
    console.error("[admin-dashboard] Missing #admin-dashboard-config element");
    return;
  }
  try {
    const t = JSON.parse(n.textContent);
    j(t).catch((e) => {
      console.error("[admin-dashboard] Failed to initialize:", e);
    });
  } catch (t) {
    console.error("[admin-dashboard] Invalid config JSON:", t);
  }
}
export {
  S as DefaultDragDropBehavior,
  E as DefaultPersistenceBehavior,
  _ as DefaultResizeBehavior,
  C as DefaultVisibilityBehavior,
  T as WidgetGrid,
  z as WidgetRenderer,
  W as bootstrapAdminDashboard,
  j as initAdminDashboard
};
//# sourceMappingURL=index.js.map
