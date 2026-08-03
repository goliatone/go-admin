import { escapeHTML as r } from "../shared/html.js";
import { formatAbsoluteDateTime as m, formatRelativeTimeNatural as p, parseTimeValue as f } from "../shared/time-formatters.js";
import { n as b, t as v } from "../chunks/application-widgets-ghhHXoXr.js";
function g(t) {
  return typeof t == "number" ? t.toLocaleString() : t == null ? "" : String(t);
}
function R(t) {
  return f(t);
}
function u(t) {
  return m(t, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function h(t) {
  return p(t, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    numeric: "auto",
    direction: "bidirectional"
  });
}
function l(t) {
  const e = t || document;
  e.querySelectorAll("[data-relative-time]").forEach((a) => {
    const s = a.getAttribute("data-relative-time");
    if (!s) return;
    a.textContent = h(s);
    const i = u(s);
    i && a.setAttribute("title", i);
  }), e.querySelectorAll("[data-absolute-time]").forEach((a) => {
    const s = a.getAttribute("data-absolute-time");
    if (!s) return;
    const i = u(s);
    a.textContent = i, i && a.setAttribute("title", i);
  });
}
function x(t) {
  return t == null || String(t).trim() === "";
}
var y = {
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
function w(t) {
  return t ? y[t] || t.replace(/_/g, " ") : "";
}
function $(t) {
  const e = t?.value !== void 0 && t?.value !== null ? t.value : "-", a = r(e), s = String(t?.type || "text").toLowerCase();
  if (s === "badge") return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${a}</span>`;
  if (s === "status") {
    const i = {
      active: {
        dot: "bg-green-500",
        text: "text-green-700"
      },
      inactive: {
        dot: "bg-gray-400",
        text: "text-gray-600"
      },
      suspended: {
        dot: "bg-red-500",
        text: "text-red-700"
      },
      pending: {
        dot: "bg-yellow-500",
        text: "text-yellow-700"
      }
    }[String(e || "").toLowerCase()] || {
      dot: "bg-gray-400",
      text: "text-gray-700"
    };
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${a} status"><span class="w-2 h-2 rounded-full ${i.dot}" aria-hidden="true"></span><span class="${i.text}">${a}</span></span>`;
  }
  if (s === "verified") {
    const i = !!t?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${a}</span><span class="${i ? "text-green-500" : "text-gray-400"}">${i ? "✓" : "✕"}</span></span>`;
  }
  return s === "date" ? `<time datetime="${a}" data-absolute-time="${a}">${a}</time>` : s === "relative" ? `<time datetime="${a}" data-relative-time="${a}">${a}</time>` : a;
}
function _(t) {
  const e = t.map((a) => {
    const s = (Array.isArray(a?.fields) ? a.fields : []).filter((i) => !(i?.hide_if_empty && x(i?.value)));
    return s.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${r(a?.label || "")}</div>
        <dl class="space-y-3">
          ${s.map((i) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${r(i?.label || i?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${$(i)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return e.length ? `<div class="space-y-6">${e.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function T(t) {
  const e = t.definition || "", a = t.data || {}, s = v(e);
  if (s) return s.render(t);
  if (e === "admin.widget.user_stats") {
    const i = a.values || {
      Total: a.total,
      Active: a.active,
      "New Today": a.new_today
    };
    return `<div class="metrics">${Object.entries(i).map(([n, d]) => `<div class="metric"><small>${r(n)}</small><span>${r(g(d))}</span></div>`).join("")}</div>`;
  }
  if (e === "admin.widget.settings_overview") {
    const i = a.values || {}, n = Object.entries(i);
    return n.length ? `<dl class="space-y-2">${n.map(([d, o]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${r(d)}</dt><dd class="text-sm font-medium text-gray-900">${r(o ?? "-")}</dd></div>`).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (e === "admin.widget.user_profile_overview") {
    const i = Array.isArray(a.sections) ? a.sections : [];
    return i.length ? _(i) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (e === "admin.widget.activity_feed" || e === "admin.widget.user_activity_feed") {
    const i = a.entries || [];
    return i.length ? `<ul class="space-y-3">${i.map((n) => {
      const d = String(n.actor || "system").trim() || "system", o = String(n.action || "updated").trim() || "updated", c = String(n.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${r(d)}</div>
        <div class="text-gray-500 text-sm mt-1">${r(o)}${c ? ` ${r(c)}` : ""}</div>
        ${n.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${r(n.created_at)}" data-relative-time="${r(n.created_at)}">${r(n.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${r(JSON.stringify(a, null, 2))}</pre>`;
}
function A(t) {
  const e = t.metadata?.layout?.width || t.span || 12, a = t.data?.title || t.config?.title || t.title || b(t.definition, t) || w(t.definition);
  return `
    <article class="widget" data-widget="${r(t.id || t.definition || "")}" data-span="${r(e)}" style="--span: ${r(e)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${r(a)}</h3></div>
      <div class="widget__content">${T(t)}</div>
    </article>
  `;
}
function k(t) {
  const e = Array.isArray(t.widgets) ? t.widgets : [], a = t.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${e.length ? `<div class="widgets-grid" data-area-code="${r(t.area_code || "")}">${e.map(A).join("")}</div>` : `<p class="text-sm text-gray-500">${r(a)}</p>`}</div></div>`;
}
function S(t) {
  const e = t.record || {}, a = Array.isArray(t.fields) ? t.fields : [], s = e.username || e.display_name || e.id || "", i = e.email || "", n = String(e.username || e.display_name || e.email || e.id || "?").slice(0, 1).toUpperCase();
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${r(n)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${r(s)}</h2>
          <p class="text-sm text-gray-500">${r(i)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${a.map((d) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${r(d.label)}</div><div class="text-base font-medium text-gray-900">${r(d.value ?? "-")}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}
function C(t) {
  const e = t.href || "", a = t.panel || "panel";
  return e ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${r(a)} panel.</p>
        <a href="${r(e)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function N(t) {
  return t.html ? t.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${t.template ? `Template tab "${r(t.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function L(t) {
  const e = t?.tab || t;
  return !e || !e.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : e.kind === "dashboard_area" || e.kind === "cms_area" ? k(e) : e.kind === "details" ? S(t) : e.kind === "panel" ? C(e) : e.kind === "template" ? N(e) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
var j = class {
  constructor(t, e, a = {}) {
    this.tabsNav = t, this.panelContainer = e, this.tabLinks = Array.from(t.querySelectorAll("[data-tab-id]")), this.basePath = (e.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (e.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = e.dataset.panel || "", this.recordId = e.dataset.recordId || "", this.options = a, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), l(this.panelContainer);
    const t = this.tabsNav.querySelector(".panel-tab-active");
    t?.dataset.renderMode === "client" && this.loadTab(t, { silent: !0 });
  }
  buildEndpoint(t, e) {
    if (!this.basePath || !this.panelName || !this.recordId || !e) return "";
    const a = encodeURIComponent(e), s = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${s}/tabs/${a}` : `${this.basePath}/${this.panelName}/${s}/tabs/${a}`;
  }
  setActiveTab(t) {
    this.tabLinks.forEach((e) => {
      const a = e.dataset.tabId === t;
      e.classList.toggle("panel-tab-active", a), e.setAttribute("aria-selected", a ? "true" : "false");
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
    const a = e.dataset.renderMode || "";
    a !== "hybrid" && a !== "client" || (t.preventDefault(), this.loadTab(e));
  }
  async loadTab(t, e) {
    const a = t.dataset.renderMode || "", s = t.dataset.tabId || "";
    if (!a || !s) return !1;
    const i = t.getAttribute("href") || "";
    this.setActiveTab(s), e?.silent || this.updateUrl(i), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (a === "hybrid") {
        const n = this.buildEndpoint("html", s);
        if (!n) throw new Error("missing html endpoint");
        const d = await fetch(n, { headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!d.ok) throw new Error(`tab html ${d.status}`);
        return this.panelContainer.innerHTML = await d.text(), l(this.panelContainer), !0;
      }
      if (a === "client") {
        const n = this.buildEndpoint("json", s);
        if (!n) throw new Error("missing json endpoint");
        const d = await fetch(n, { headers: { Accept: "application/json" } });
        if (!d.ok) throw new Error(`tab json ${d.status}`);
        const o = await d.json();
        return this.panelContainer.innerHTML = L(o), l(this.panelContainer), !0;
      }
    } catch (n) {
      console.warn("[TabsController] Failed to load tab", n), this.options.onError?.(n), i && (window.location.href = i);
    }
    return !1;
  }
  getActiveTabId() {
    return this.panelContainer.dataset.activeTab || "";
  }
  switchToTab(t) {
    const e = this.tabLinks.find((a) => a.dataset.tabId === t);
    e && this.loadTab(e);
  }
};
function q(t) {
  const e = document.querySelector(".panel-tabs"), a = document.querySelector("[data-tab-panel-container]");
  return !e || !a ? null : new j(e, a, t);
}
export {
  j as TabsController,
  r as escapeHTML,
  u as formatAbsoluteTime,
  g as formatNumber,
  h as formatRelativeTime,
  l as hydrateTimeElements,
  q as initTabsController,
  x as isEmptyValue,
  R as parseTimestamp,
  L as renderClientTab,
  S as renderDetailsPanel,
  C as renderPanelLink,
  N as renderTemplatePanel,
  A as renderWidget,
  k as renderWidgetPanel
};

//# sourceMappingURL=index.js.map