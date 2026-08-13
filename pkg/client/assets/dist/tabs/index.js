import { createLogger as p } from "../shared/logger.js";
import { escapeHTML as s } from "../shared/html.js";
import { formatAbsoluteDateTime as f, formatRelativeTimeNatural as b, parseTimeValue as g } from "../shared/time-formatters.js";
import { n as v, t as h } from "../chunks/application-widgets-ghhHXoXr.js";
function x(t) {
  return typeof t == "number" ? t.toLocaleString() : t == null ? "" : String(t);
}
function M(t) {
  return g(t);
}
function u(t) {
  return f(t, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function y(t) {
  return b(t, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    numeric: "auto",
    direction: "bidirectional"
  });
}
function l(t) {
  const e = t || document;
  e.querySelectorAll("[data-relative-time]").forEach((a) => {
    const r = a.getAttribute("data-relative-time");
    if (!r) return;
    a.textContent = y(r);
    const i = u(r);
    i && a.setAttribute("title", i);
  }), e.querySelectorAll("[data-absolute-time]").forEach((a) => {
    const r = a.getAttribute("data-absolute-time");
    if (!r) return;
    const i = u(r);
    a.textContent = i, i && a.setAttribute("title", i);
  });
}
function w(t) {
  return t == null || String(t).trim() === "";
}
var $ = {
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
function T(t) {
  return t ? $[t] || t.replace(/_/g, " ") : "";
}
function _(t) {
  const e = t?.value !== void 0 && t?.value !== null ? t.value : "-", a = s(e), r = String(t?.type || "text").toLowerCase();
  if (r === "badge") return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${a}</span>`;
  if (r === "status") {
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
  if (r === "verified") {
    const i = !!t?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${a}</span><span class="${i ? "text-green-500" : "text-gray-400"}">${i ? "✓" : "✕"}</span></span>`;
  }
  return r === "date" ? `<time datetime="${a}" data-absolute-time="${a}">${a}</time>` : r === "relative" ? `<time datetime="${a}" data-relative-time="${a}">${a}</time>` : a;
}
function A(t) {
  const e = t.map((a) => {
    const r = (Array.isArray(a?.fields) ? a.fields : []).filter((i) => !(i?.hide_if_empty && w(i?.value)));
    return r.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${s(a?.label || "")}</div>
        <dl class="space-y-3">
          ${r.map((i) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${s(i?.label || i?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${_(i)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return e.length ? `<div class="space-y-6">${e.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function k(t) {
  const e = t.definition || "", a = t.data || {}, r = h(e);
  if (r) return r.render(t);
  if (e === "admin.widget.user_stats") {
    const i = a.values || {
      Total: a.total,
      Active: a.active,
      "New Today": a.new_today
    };
    return `<div class="metrics">${Object.entries(i).map(([n, o]) => `<div class="metric"><small>${s(n)}</small><span>${s(x(o))}</span></div>`).join("")}</div>`;
  }
  if (e === "admin.widget.settings_overview") {
    const i = a.values || {}, n = Object.entries(i);
    return n.length ? `<dl class="space-y-2">${n.map(([o, d]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${s(o)}</dt><dd class="text-sm font-medium text-gray-900">${s(d ?? "-")}</dd></div>`).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (e === "admin.widget.user_profile_overview") {
    const i = Array.isArray(a.sections) ? a.sections : [];
    return i.length ? A(i) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (e === "admin.widget.activity_feed" || e === "admin.widget.user_activity_feed") {
    const i = a.entries || [];
    return i.length ? `<ul class="space-y-3">${i.map((n) => {
      const o = String(n.actor || "system").trim() || "system", d = String(n.action || "updated").trim() || "updated", c = String(n.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${s(o)}</div>
        <div class="text-gray-500 text-sm mt-1">${s(d)}${c ? ` ${s(c)}` : ""}</div>
        ${n.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${s(n.created_at)}" data-relative-time="${s(n.created_at)}">${s(n.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${s(JSON.stringify(a, null, 2))}</pre>`;
}
function S(t) {
  const e = t.metadata?.layout?.width || t.span || 12, a = t.data?.title || t.config?.title || t.title || v(t.definition, t) || T(t.definition);
  return `
    <article class="widget" data-widget="${s(t.id || t.definition || "")}" data-span="${s(e)}" style="--span: ${s(e)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${s(a)}</h3></div>
      <div class="widget__content">${k(t)}</div>
    </article>
  `;
}
function C(t) {
  const e = Array.isArray(t.widgets) ? t.widgets : [], a = t.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${e.length ? `<div class="widgets-grid" data-area-code="${s(t.area_code || "")}">${e.map(S).join("")}</div>` : `<p class="text-sm text-gray-500">${s(a)}</p>`}</div></div>`;
}
function L(t) {
  const e = t.record || {}, a = Array.isArray(t.fields) ? t.fields : [], r = e.username || e.display_name || e.id || "", i = e.email || "", n = String(e.username || e.display_name || e.email || e.id || "?").slice(0, 1).toUpperCase();
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${s(n)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${s(r)}</h2>
          <p class="text-sm text-gray-500">${s(i)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${a.map((o) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${s(o.label)}</div><div class="text-base font-medium text-gray-900">${s(o.value ?? "-")}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}
function N(t) {
  const e = t.href || "", a = t.panel || "panel";
  return e ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${s(a)} panel.</p>
        <a href="${s(e)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function j(t) {
  return t.html ? t.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${t.template ? `Template tab "${s(t.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function P(t) {
  const e = t?.tab || t;
  return !e || !e.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : e.kind === "dashboard_area" || e.kind === "cms_area" ? C(e) : e.kind === "details" ? L(t) : e.kind === "panel" ? N(e) : e.kind === "template" ? j(e) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
var m = p("TabsController"), E = class {
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
    const a = encodeURIComponent(e), r = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${r}/tabs/${a}` : `${this.basePath}/${this.panelName}/${r}/tabs/${a}`;
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
        m.warn("[TabsController] Unable to update URL", e);
      }
  }
  handleTabClick(t) {
    const e = t.target.closest("[data-tab-id]");
    if (!e) return;
    const a = e.dataset.renderMode || "";
    a !== "hybrid" && a !== "client" || (t.preventDefault(), this.loadTab(e));
  }
  async loadTab(t, e) {
    const a = t.dataset.renderMode || "", r = t.dataset.tabId || "";
    if (!a || !r) return !1;
    const i = t.getAttribute("href") || "";
    this.setActiveTab(r), e?.silent || this.updateUrl(i), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (a === "hybrid") {
        const n = this.buildEndpoint("html", r);
        if (!n) throw new Error("missing html endpoint");
        const o = await fetch(n, { headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!o.ok) throw new Error(`tab html ${o.status}`);
        return this.panelContainer.innerHTML = await o.text(), l(this.panelContainer), !0;
      }
      if (a === "client") {
        const n = this.buildEndpoint("json", r);
        if (!n) throw new Error("missing json endpoint");
        const o = await fetch(n, { headers: { Accept: "application/json" } });
        if (!o.ok) throw new Error(`tab json ${o.status}`);
        const d = await o.json();
        return this.panelContainer.innerHTML = P(d), l(this.panelContainer), !0;
      }
    } catch (n) {
      m.warn("[TabsController] Failed to load tab", n), this.options.onError?.(n), i && (window.location.href = i);
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
function O(t) {
  const e = document.querySelector(".panel-tabs"), a = document.querySelector("[data-tab-panel-container]");
  return !e || !a ? null : new E(e, a, t);
}
export {
  E as TabsController,
  s as escapeHTML,
  u as formatAbsoluteTime,
  x as formatNumber,
  y as formatRelativeTime,
  l as hydrateTimeElements,
  O as initTabsController,
  w as isEmptyValue,
  M as parseTimestamp,
  P as renderClientTab,
  L as renderDetailsPanel,
  N as renderPanelLink,
  j as renderTemplatePanel,
  S as renderWidget,
  C as renderWidgetPanel
};

//# sourceMappingURL=index.js.map