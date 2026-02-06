class g {
  constructor() {
    this.draggedElement = null, this.cleanupFunctions = [];
  }
  enable(t, e) {
    t.querySelectorAll("[data-widget]").forEach((a) => {
      a.draggable = !0;
      const i = () => {
        this.draggedElement = a, a.classList.add("dragging");
      }, r = () => {
        a.classList.remove("dragging"), this.draggedElement = null;
      };
      a.addEventListener("dragstart", i), a.addEventListener("dragend", r), this.cleanupFunctions.push(() => {
        a.removeEventListener("dragstart", i), a.removeEventListener("dragend", r);
      });
    }), t.querySelectorAll("[data-widgets-grid]").forEach((a) => {
      const i = (d) => {
        if (d.preventDefault(), !this.draggedElement) return;
        const l = this.getDragAfterElement(a, d.clientY);
        l == null ? a.appendChild(this.draggedElement) : l !== this.draggedElement && a.insertBefore(this.draggedElement, l);
      }, r = (d) => {
        d.preventDefault(), e();
      };
      a.addEventListener("dragover", i), a.addEventListener("drop", r), this.cleanupFunctions.push(() => {
        a.removeEventListener("dragover", i), a.removeEventListener("drop", r);
      });
    });
  }
  disable() {
    this.cleanupFunctions.forEach((t) => t()), this.cleanupFunctions = [], this.draggedElement = null;
  }
  getDragAfterElement(t, e) {
    return Array.from(
      t.querySelectorAll("[data-widget]:not(.dragging)")
    ).reduce(
      (n, a) => {
        const i = a.getBoundingClientRect(), r = e - i.top - i.height / 2;
        return r < 0 && r > n.offset ? { offset: r, element: a } : n;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }
}
class m {
  toggleWidth(t, e, s) {
    const n = e === s ? s / 2 : s;
    return this.applyWidth(t, n), n;
  }
  applyWidth(t, e) {
    t.dataset.span = e.toString(), t.style.setProperty("--span", e.toString());
  }
}
class p {
  toggle(t) {
    const s = !(t.dataset.hidden === "true");
    return this.applyVisibility(t, s), s;
  }
  applyVisibility(t, e) {
    e ? (t.dataset.hidden = "true", t.classList.add("is-hidden")) : (delete t.dataset.hidden, t.classList.remove("is-hidden"));
  }
}
class f {
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
class v {
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
      dragDrop: t.behaviors?.dragDrop || new g(),
      resize: t.behaviors?.resize || new m(),
      visibility: t.behaviors?.visibility || new p(),
      persistence: t.behaviors?.persistence || new f()
    };
  }
  async init(t) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container)
      throw new Error("Widget grid container not found");
    const e = this.normalizePanelDetailState(t);
    e.schema && (this.panelSchema = e.schema, this.panelTabs = e.schema.tabs || []), this.attachEventListeners(), this.initializeDragDrop(), e.data && this.validateHydration(e.data);
  }
  validateHydration(t) {
    if (t.areas) {
      const e = this.container?.querySelectorAll("[data-area-code]");
      e && e.length !== t.areas.length && console.warn("Hydration mismatch: area count does not match", {
        server: t.areas.length,
        dom: e.length
      });
    }
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
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.hideBtn);
      if (s) {
        const n = s.closest("[data-widget]");
        n && (this.behaviors.visibility.toggle(n), this.saveLayout());
      }
    }), this.container.addEventListener("click", (t) => {
      const s = t.target.closest(this.config.selectors.resizeBtn);
      if (s) {
        const n = s.closest("[data-widget]");
        if (n) {
          const a = parseInt(n.dataset.span || `${this.config.defaultSpan}`, 10), r = this.behaviors.resize.toggleWidth(n, a, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", d = Array.from(s.childNodes).find((l) => l.nodeType === Node.TEXT_NODE);
          d && (d.textContent = r), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((t) => {
      const e = t.closest("[data-widget]");
      if (e) {
        const n = parseInt(e.dataset.span || `${this.config.defaultSpan}`, 10) === this.config.maxColumns ? "Half Width" : "Full Width", a = Array.from(t.childNodes).find((i) => i.nodeType === Node.TEXT_NODE);
        a && (a.textContent = n);
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
    this.container.querySelectorAll(this.config.selectors.areas).forEach((n) => {
      const a = n.dataset.areaGrid || n.dataset.areaCode;
      if (!a) return;
      const i = Array.from(
        n.querySelectorAll('[data-widget]:not([data-hidden="true"])')
      );
      t.area_order[a] = i.map((r) => r.dataset.widget), t.layout_rows[a] = this.serializeRows(i);
    });
    const s = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return t.hidden_widget_ids = Array.from(s).map((n) => n.dataset.widget), t;
  }
  serializeRows(t) {
    const e = [];
    let s = [], n = 0;
    return t.forEach((a) => {
      const i = a.dataset.widget, r = parseInt(a.dataset.span || `${this.config.defaultSpan}`, 10);
      n + r > this.config.maxColumns && n > 0 && (e.push({ widgets: s }), s = [], n = 0), s.push({ id: i, width: r }), n += r, n >= this.config.maxColumns && (e.push({ widgets: s }), s = [], n = 0);
    }), s.length > 0 && e.push({ widgets: s }), e;
  }
  updateStatus(t) {
    this.statusElement && (this.statusElement.textContent = t);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}
const b = {
  "admin.widget.user_stats": "User Statistics",
  "admin.widget.activity_feed": "Recent Activity",
  "admin.widget.quick_actions": "Quick Actions",
  "admin.widget.notifications": "Notifications",
  "admin.widget.settings_overview": "Settings Overview",
  "admin.widget.content_stats": "Content Stats",
  "admin.widget.storage_stats": "Storage Stats",
  "admin.widget.system_health": "System Health",
  "admin.widget.bar_chart": "Bar Chart",
  "admin.widget.line_chart": "Line Chart",
  "admin.widget.pie_chart": "Pie Chart",
  "admin.widget.gauge_chart": "Gauge",
  "admin.widget.scatter_chart": "Scatter Chart"
};
class y {
  constructor(t) {
    this.activityActionLabels = t.activityActionLabels || {};
  }
  /**
   * Render a complete widget with wrapper and toolbar
   */
  render(t, e) {
    const s = e === "admin.dashboard.main" || e === "admin.dashboard.footer", n = t.metadata?.layout?.width || t.span || 12, a = t.hidden || !1, i = t.data?.title || t.config?.title || this.getTitle(t.definition), r = t.id || t.definition || `widget-${Math.random().toString(36).substr(2, 9)}`, d = this.renderContent(t);
    let l = '<div class="widget__toolbar">';
    return l += '<button type="button" class="hide-widget">Toggle Hide</button>', s ? l += '<button type="button" class="resize-widget">Half Width</button>' : l += '<button type="button" class="resize-widget" disabled title="Resize only available in Main or Operations">Half Width</button>', l += "</div>", `
      <article class="widget"
               data-widget="${r}"
               data-span="${n}"
               data-area-code="${e}"
               data-resizable="${s}"
               ${a ? 'data-hidden="true"' : ""}
               style="--span: ${n}">
        ${l}
        <div class="widget__header mb-4">
          <h3 class="text-lg font-semibold text-gray-900">${i}</h3>
        </div>
        <div class="widget__content">
          ${d}
        </div>
      </article>
    `;
  }
  /**
   * Render widget content based on definition type
   */
  renderContent(t) {
    const e = t.definition || "", s = t.data || {}, n = t.config || {};
    if (e === "admin.widget.user_stats") {
      const a = s.values || {
        Total: s.total,
        Active: s.active,
        "New Today": s.new_today
      };
      return s.trend && (a.Trend = s.trend), `
        <div class="metrics">
          ${Object.entries(a).map(([i, r]) => `
            <div class="metric">
              <small>${i}</small>
              <span>${this.formatNumber(r)}</span>
            </div>
          `).join("")}
        </div>
      `;
    }
    if (e === "admin.widget.settings_overview") {
      const a = s.values || {}, i = Object.entries(a);
      return i.length === 0 ? '<p class="text-gray-500">No settings to display</p>' : `
        <dl class="space-y-2">
          ${i.map(([r, d]) => {
        const l = typeof d == "object" && d !== null ? d.value ?? d : d;
        return `
              <div class="flex items-start justify-between gap-4">
                <dt class="text-sm text-gray-600">${r}</dt>
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
          ${a.map((i) => `
            <li class="py-3 border-b border-gray-100 last:border-b-0">
              <div class="font-semibold text-gray-900 text-sm">${i.actor}</div>
              <div class="text-gray-600 text-sm mt-1">${this.activityActionLabels?.[i.action] || i.action} ${i.object}</div>
            </li>
          `).join("")}
        </ul>
      `;
    }
    if (e === "admin.widget.quick_actions") {
      const a = s.actions || [];
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
    if (e.includes("_chart") && s.chart_html) {
      const a = s.subtitle || n.subtitle || "";
      return `
        <div>
          ${a ? `<p class="text-sm text-gray-500 mb-3">${a}</p>` : ""}
          <div class="chart-container">${s.chart_html}</div>
        </div>
      `;
    }
    return `<pre class="text-xs text-gray-600 overflow-auto">${JSON.stringify(s, null, 2)}</pre>`;
  }
  /**
   * Get display title for widget definition
   */
  getTitle(t) {
    return b[t] || t;
  }
  /**
   * Format number with locale
   */
  formatNumber(t) {
    return typeof t == "number" ? t.toLocaleString() : String(t);
  }
}
const h = /* @__PURE__ */ new Set();
async function w(o) {
  const t = new y(o), e = o.apiBasePath ? `${o.apiBasePath}/dashboard` : `${o.basePath}/api/dashboard`, s = document.getElementById("dashboard-export");
  s && s.addEventListener("click", () => window.open(e));
  const a = await (await fetch(e)).json(), i = x(a.widgets || []);
  for (const [d, l] of Object.entries(i)) {
    const c = document.querySelector(`[data-area-grid="${d}"]`);
    c && (c.innerHTML = l.map((u) => t.render(u, d)).join(""));
  }
  E(), await new v({
    apiEndpoint: e,
    preferencesEndpoint: `${e}/preferences`,
    areas: ["admin.dashboard.main", "admin.dashboard.sidebar", "admin.dashboard.footer"],
    selectors: {
      hideBtn: ".hide-widget",
      resizeBtn: ".resize-widget"
    },
    onSave: (d) => {
      console.log("Layout saved:", d);
    },
    onError: (d) => {
      console.error("Widget grid error:", d);
      const l = document.getElementById("save-status");
      l && (l.textContent = "Failed to save layout");
    }
  }).init();
}
function x(o) {
  return o.reduce((t, e) => {
    const s = e.area || "admin.dashboard.main";
    return t[s] || (t[s] = []), t[s].push(e), t;
  }, {});
}
function E() {
  document.querySelectorAll(".chart-container script").forEach((o) => {
    const t = o, e = t.src || o.textContent || "";
    if (h.has(e)) return;
    h.add(e);
    const s = document.createElement("script");
    t.src ? s.src = t.src : s.textContent = o.textContent, document.body.appendChild(s);
  });
}
function S() {
  const o = document.getElementById("admin-dashboard-config");
  if (!o?.textContent) {
    console.error("[admin-dashboard] Missing #admin-dashboard-config element");
    return;
  }
  try {
    const t = JSON.parse(o.textContent);
    w(t).catch((e) => {
      console.error("[admin-dashboard] Failed to initialize:", e);
    });
  } catch (t) {
    console.error("[admin-dashboard] Invalid config JSON:", t);
  }
}
export {
  g as DefaultDragDropBehavior,
  f as DefaultPersistenceBehavior,
  m as DefaultResizeBehavior,
  p as DefaultVisibilityBehavior,
  v as WidgetGrid,
  y as WidgetRenderer,
  S as bootstrapAdminDashboard,
  w as initAdminDashboard
};
//# sourceMappingURL=index.js.map
