function r(a) {
  return String(a || "").replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[e] || e);
}
function b(a) {
  return typeof a == "number" ? a.toLocaleString() : a == null ? "" : String(a);
}
function p(a) {
  if (a == null || a === "") return null;
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? null : t;
}
function f(a) {
  const t = p(a);
  return t ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(t) : String(a || "");
}
function g(a) {
  const t = p(a);
  if (!t) return String(a || "");
  const e = t.getTime() - Date.now(), i = Math.abs(e), s = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), n = 1e3, o = 60 * n, d = 60 * o, l = 24 * d, u = 30 * l, m = 365 * l;
  return i < o ? s.format(Math.round(e / n), "second") : i < d ? s.format(Math.round(e / o), "minute") : i < l ? s.format(Math.round(e / d), "hour") : i < u ? s.format(Math.round(e / l), "day") : i < m ? s.format(Math.round(e / u), "month") : s.format(Math.round(e / m), "year");
}
function c(a) {
  const t = a || document;
  t.querySelectorAll("[data-relative-time]").forEach((e) => {
    const i = e.getAttribute("data-relative-time");
    if (!i) return;
    e.textContent = g(i);
    const s = f(i);
    s && e.setAttribute("title", s);
  }), t.querySelectorAll("[data-absolute-time]").forEach((e) => {
    const i = e.getAttribute("data-absolute-time");
    if (!i) return;
    const s = f(i);
    e.textContent = s, s && e.setAttribute("title", s);
  });
}
function h(a) {
  return a == null || String(a).trim() === "";
}
const v = {
  "admin.widget.user_stats": "User Statistics",
  "admin.widget.activity_feed": "Recent Activity",
  "admin.widget.user_activity_feed": "User Activity",
  "admin.widget.quick_actions": "Quick Actions",
  "admin.widget.notifications": "Notifications",
  "admin.widget.settings_overview": "Settings Overview",
  "admin.widget.user_profile_overview": "Profile Overview",
  "admin.widget.content_stats": "Content Stats",
  "admin.widget.storage_stats": "Storage Stats",
  "admin.widget.system_health": "System Health"
};
function x(a) {
  return a ? v[a] || a.replace(/_/g, " ") : "";
}
function y(a) {
  const t = a?.value !== void 0 && a?.value !== null ? a.value : "-", e = r(t), i = String(a?.type || "text").toLowerCase();
  if (i === "badge")
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${e}</span>`;
  if (i === "status") {
    const s = String(t || "").toLowerCase(), n = {
      active: { dot: "bg-green-500", text: "text-green-700" },
      inactive: { dot: "bg-gray-400", text: "text-gray-600" },
      suspended: { dot: "bg-red-500", text: "text-red-700" },
      pending: { dot: "bg-yellow-500", text: "text-yellow-700" }
    }[s] || { dot: "bg-gray-400", text: "text-gray-700" };
    return `<span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full ${n.dot}"></span><span class="${n.text}">${e}</span></span>`;
  }
  if (i === "verified") {
    const s = !!a?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${e}</span><span class="${s ? "text-green-500" : "text-gray-400"}">${s ? "✓" : "✕"}</span></span>`;
  }
  return i === "date" ? `<time datetime="${e}" data-absolute-time="${e}">${e}</time>` : i === "relative" ? `<time datetime="${e}" data-relative-time="${e}">${e}</time>` : e;
}
function w(a) {
  const t = a.map((e) => {
    const s = (Array.isArray(e?.fields) ? e.fields : []).filter((n) => !(n?.hide_if_empty && h(n?.value)));
    return s.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${r(e?.label || "")}</div>
        <dl class="space-y-3">
          ${s.map((n) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${r(n?.label || n?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${y(n)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return t.length ? `<div class="space-y-6">${t.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function $(a) {
  const t = a.definition || "", e = a.data || {};
  if (t === "admin.widget.user_stats") {
    const i = e.values || { Total: e.total, Active: e.active, "New Today": e.new_today };
    return `<div class="metrics">${Object.entries(i).map(
      ([s, n]) => `<div class="metric"><small>${r(s)}</small><span>${r(b(n))}</span></div>`
    ).join("")}</div>`;
  }
  if (t === "admin.widget.settings_overview") {
    const i = e.values || {}, s = Object.entries(i);
    return s.length ? `<dl class="space-y-2">${s.map(
      ([n, o]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${r(n)}</dt><dd class="text-sm font-medium text-gray-900">${r(o ?? "-")}</dd></div>`
    ).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (t === "admin.widget.user_profile_overview") {
    const i = Array.isArray(e.sections) ? e.sections : [];
    return i.length ? w(i) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (t === "admin.widget.activity_feed" || t === "admin.widget.user_activity_feed") {
    const i = e.entries || [];
    return i.length ? `<ul class="space-y-3">${i.map(
      (s) => `<li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${r(s.actor)}</div>
        <div class="text-gray-500 text-sm mt-1">${r(s.action)} ${r(s.object)}</div>
        ${s.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${r(s.created_at)}" data-relative-time="${r(s.created_at)}">${r(s.created_at)}</time>` : ""}
      </li>`
    ).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${r(JSON.stringify(e, null, 2))}</pre>`;
}
function T(a) {
  const t = a.metadata?.layout?.width || a.span || 12, e = a.data?.title || a.config?.title || a.title || x(a.definition);
  return `
    <article class="widget" data-widget="${r(a.id || a.definition || "")}" data-span="${r(t)}" style="--span: ${r(t)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${r(e)}</h3></div>
      <div class="widget__content">${$(a)}</div>
    </article>
  `;
}
function _(a) {
  const t = Array.isArray(a.widgets) ? a.widgets : [], e = a.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${t.length ? `<div class="widgets-grid" data-area-code="${r(a.area_code || "")}">${t.map(T).join("")}</div>` : `<p class="text-sm text-gray-500">${r(e)}</p>`}</div></div>`;
}
function A(a) {
  const t = a.record || {}, e = Array.isArray(a.fields) ? a.fields : [], i = t.username || t.display_name || t.id || "", s = t.email || "", n = String(t.username || t.display_name || t.email || t.id || "?").slice(0, 1).toUpperCase();
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${r(n)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${r(i)}</h2>
          <p class="text-sm text-gray-500">${r(s)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${e.map(
    (o) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${r(o.label)}</div><div class="text-base font-medium text-gray-900">${r(o.value ?? "-")}</div></div>`
  ).join("")}
        </div>
      </div>
    </div>
  `;
}
function S(a) {
  const t = a.href || "", e = a.panel || "panel";
  return t ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${r(e)} panel.</p>
        <a href="${r(t)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function k(a) {
  return a.html ? a.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${a.template ? `Template tab "${r(a.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function C(a) {
  const t = a?.tab || a;
  return !t || !t.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : t.kind === "dashboard_area" || t.kind === "cms_area" ? _(t) : t.kind === "details" ? A(a) : t.kind === "panel" ? S(t) : t.kind === "template" ? k(t) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
class N {
  constructor(t, e, i = {}) {
    this.tabsNav = t, this.panelContainer = e, this.tabLinks = Array.from(t.querySelectorAll("[data-tab-id]")), this.basePath = (e.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (e.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = e.dataset.panel || "", this.recordId = e.dataset.recordId || "", this.options = i, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), c(this.panelContainer);
    const t = this.tabsNav.querySelector(".panel-tab-active");
    t?.dataset.renderMode === "client" && this.loadTab(t, { silent: !0 });
  }
  buildEndpoint(t, e) {
    if (!this.basePath || !this.panelName || !this.recordId || !e)
      return "";
    const i = encodeURIComponent(e), s = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${s}/tabs/${i}` : `${this.basePath}/${this.panelName}/${s}/tabs/${i}`;
  }
  setActiveTab(t) {
    this.tabLinks.forEach((e) => {
      const i = e.dataset.tabId === t;
      e.classList.toggle("panel-tab-active", i), e.setAttribute("aria-selected", i ? "true" : "false");
    }), this.panelContainer.dataset.activeTab = t || "", this.options.onTabChange?.(t);
  }
  updateUrl(t) {
    if (t)
      try {
        window.history.pushState({ tab: t }, "", t);
      } catch (e) {
        console.warn("[TabsController] Unable to update URL", e);
      }
  }
  handleTabClick(t) {
    const e = t.target.closest("[data-tab-id]");
    if (!e) return;
    const i = e.dataset.renderMode || "";
    i !== "hybrid" && i !== "client" || (t.preventDefault(), this.loadTab(e));
  }
  async loadTab(t, e) {
    const i = t.dataset.renderMode || "", s = t.dataset.tabId || "";
    if (!i || !s) return !1;
    const n = t.getAttribute("href") || "";
    this.setActiveTab(s), e?.silent || this.updateUrl(n), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (i === "hybrid") {
        const o = this.buildEndpoint("html", s);
        if (!o) throw new Error("missing html endpoint");
        const d = await fetch(o, {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });
        if (!d.ok) throw new Error(`tab html ${d.status}`);
        return this.panelContainer.innerHTML = await d.text(), c(this.panelContainer), !0;
      }
      if (i === "client") {
        const o = this.buildEndpoint("json", s);
        if (!o) throw new Error("missing json endpoint");
        const d = await fetch(o, {
          headers: { Accept: "application/json" }
        });
        if (!d.ok) throw new Error(`tab json ${d.status}`);
        const l = await d.json();
        return this.panelContainer.innerHTML = C(l), c(this.panelContainer), !0;
      }
    } catch (o) {
      console.warn("[TabsController] Failed to load tab", o), this.options.onError?.(o), n && (window.location.href = n);
    }
    return !1;
  }
  /**
   * Get the currently active tab ID
   */
  getActiveTabId() {
    return this.panelContainer.dataset.activeTab || "";
  }
  /**
   * Programmatically switch to a tab by ID
   */
  switchToTab(t) {
    const e = this.tabLinks.find((i) => i.dataset.tabId === t);
    e && this.loadTab(e);
  }
}
function j(a) {
  const t = document.querySelector(".panel-tabs"), e = document.querySelector("[data-tab-panel-container]");
  return !t || !e ? null : new N(t, e, a);
}
export {
  N as TabsController,
  r as escapeHTML,
  f as formatAbsoluteTime,
  b as formatNumber,
  g as formatRelativeTime,
  c as hydrateTimeElements,
  j as initTabsController,
  h as isEmptyValue,
  p as parseTimestamp,
  C as renderClientTab,
  A as renderDetailsPanel,
  S as renderPanelLink,
  k as renderTemplatePanel,
  T as renderWidget,
  _ as renderWidgetPanel
};
//# sourceMappingURL=index.js.map
