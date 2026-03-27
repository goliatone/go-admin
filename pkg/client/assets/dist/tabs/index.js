import { parseTimeValue as b, formatAbsoluteDateTime as x, formatRelativeTimeNatural as f } from "../shared/time-formatters.js";
import { escapeHTML as a } from "../shared/html.js";
function c(i) {
  return typeof i == "number" ? i.toLocaleString() : i == null ? "" : String(i);
}
function M(i) {
  return b(i);
}
function v(i) {
  return x(i, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function h(i) {
  return f(i, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    numeric: "auto",
    direction: "bidirectional"
  });
}
function u(i) {
  const t = i || document;
  t.querySelectorAll("[data-relative-time]").forEach((e) => {
    const s = e.getAttribute("data-relative-time");
    if (!s) return;
    e.textContent = h(s);
    const r = v(s);
    r && e.setAttribute("title", r);
  }), t.querySelectorAll("[data-absolute-time]").forEach((e) => {
    const s = e.getAttribute("data-absolute-time");
    if (!s) return;
    const r = v(s);
    e.textContent = r, r && e.setAttribute("title", r);
  });
}
function y(i) {
  return i == null || String(i).trim() === "";
}
const $ = {
  "admin.widget.user_stats": "User Statistics",
  "admin.widget.activity_feed": "Recent Activity",
  "admin.widget.user_activity_feed": "User Activity",
  "admin.widget.quick_actions": "Quick Actions",
  "admin.widget.notifications": "Notifications",
  "admin.widget.settings_overview": "Settings Overview",
  "admin.widget.user_profile_overview": "Profile Overview",
  "admin.widget.content_stats": "Content Stats",
  "admin.widget.storage_stats": "Storage Stats",
  "admin.widget.system_health": "System Health",
  "esign.widget.agreement_stats": "E-Sign Agreement Stats",
  "esign.widget.signing_activity": "E-Sign Signing Activity",
  "esign.widget.delivery_health": "E-Sign Delivery Health",
  "esign.widget.pending_signatures": "E-Sign Pending Signatures"
};
function w(i) {
  return i ? $[i] || i.replace(/_/g, " ") : "";
}
function _(i) {
  const t = i?.value !== void 0 && i?.value !== null ? i.value : "-", e = a(t), s = String(i?.type || "text").toLowerCase();
  if (s === "badge")
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${e}</span>`;
  if (s === "status") {
    const r = String(t || "").toLowerCase(), l = {
      active: { dot: "bg-green-500", text: "text-green-700" },
      inactive: { dot: "bg-gray-400", text: "text-gray-600" },
      suspended: { dot: "bg-red-500", text: "text-red-700" },
      pending: { dot: "bg-yellow-500", text: "text-yellow-700" }
    }[r] || { dot: "bg-gray-400", text: "text-gray-700" };
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${e} status"><span class="w-2 h-2 rounded-full ${l.dot}" aria-hidden="true"></span><span class="${l.text}">${e}</span></span>`;
  }
  if (s === "verified") {
    const r = !!i?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${e}</span><span class="${r ? "text-green-500" : "text-gray-400"}">${r ? "✓" : "✕"}</span></span>`;
  }
  return s === "date" ? `<time datetime="${e}" data-absolute-time="${e}">${e}</time>` : s === "relative" ? `<time datetime="${e}" data-relative-time="${e}">${e}</time>` : e;
}
function k(i) {
  const t = i.map((e) => {
    const r = (Array.isArray(e?.fields) ? e.fields : []).filter((l) => !(l?.hide_if_empty && y(l?.value)));
    return r.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${a(e?.label || "")}</div>
        <dl class="space-y-3">
          ${r.map((l) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${a(l?.label || l?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${_(l)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return t.length ? `<div class="space-y-6">${t.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function A(i) {
  const t = i.definition || "", e = i.data || {};
  if (t === "admin.widget.user_stats") {
    const s = e.values || { Total: e.total, Active: e.active, "New Today": e.new_today };
    return `<div class="metrics">${Object.entries(s).map(
      ([r, l]) => `<div class="metric"><small>${a(r)}</small><span>${a(c(l))}</span></div>`
    ).join("")}</div>`;
  }
  if (t === "admin.widget.settings_overview") {
    const s = e.values || {}, r = Object.entries(s);
    return r.length ? `<dl class="space-y-2">${r.map(
      ([l, d]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${a(l)}</dt><dd class="text-sm font-medium text-gray-900">${a(d ?? "-")}</dd></div>`
    ).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (t === "admin.widget.user_profile_overview") {
    const s = Array.isArray(e.sections) ? e.sections : [];
    return s.length ? k(s) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (t === "admin.widget.activity_feed" || t === "admin.widget.user_activity_feed") {
    const s = e.entries || [];
    return s.length ? `<ul class="space-y-3">${s.map((r) => {
      const l = String(r.actor || "system").trim() || "system", d = String(r.action || "updated").trim() || "updated", n = String(r.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${a(l)}</div>
        <div class="text-gray-500 text-sm mt-1">${a(d)}${n ? ` ${a(n)}` : ""}</div>
        ${r.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${a(r.created_at)}" data-relative-time="${a(r.created_at)}">${a(r.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  if (t === "esign.widget.agreement_stats") {
    const s = e, r = Number(s.total || 0), l = Number(s.pending || 0), d = Number(s.completed || 0), n = Number(s.voided || 0) + Number(s.declined || 0) + Number(s.expired || 0), o = r > 0 ? Math.round(d * 100 / r) : 0, g = String(s.list_url || "").trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${a(c(r))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${a(c(l))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${a(c(d))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
          </div>
          <div class="bg-red-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-700">${a(c(n))}</div>
            <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
          </div>
        </div>
        ${r > 0 ? `
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-600">Completion Rate</span>
              <span class="text-sm font-semibold text-gray-900">${o}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full" style="width: ${o}%"></div>
            </div>
          </div>
        ` : ""}
        ${g ? `
          <div class="mt-4 pt-3 border-t border-gray-100 text-center">
            <a href="${a(g)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
  if (t === "esign.widget.signing_activity") {
    const s = e, r = Array.isArray(s.activities) ? s.activities : [], l = String(s.activity_url || "").trim(), d = (n) => {
      const o = String(n || "").toLowerCase();
      return o === "signed" || o === "completed" ? "bg-green-500" : o === "viewed" ? "bg-purple-500" : o === "sent" ? "bg-blue-500" : o === "declined" ? "bg-orange-500" : o === "voided" || o === "expired" ? "bg-red-500" : "bg-gray-400";
    };
    return `
      ${r.length ? `
        <ul class="space-y-3">
          ${r.map((n) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${d(n.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${n.agreement_url ? `<a href="${a(n.agreement_url)}" class="hover:text-blue-600">${a(n.agreement_title || "Agreement")}</a>` : `${a(n.agreement_title || "Agreement")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${a(n.type || "event")}</span>
                  ${n.actor ? `<span class="mx-1">·</span><span>${a(n.actor)}</span>` : ""}
                </div>
              </div>
              ${n.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${a(n.timestamp)}">
                  <time data-relative-time="${a(n.timestamp)}">${a(n.timestamp)}</time>
                </div>
              ` : ""}
            </li>
          `).join("")}
        </ul>
      ` : `
        <div class="text-center py-4 text-gray-500">
          <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="text-sm">No recent signing activity</p>
        </div>
      `}
      ${l ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(l)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Activity
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  if (t === "esign.widget.delivery_health") {
    const s = e, r = Math.max(0, Math.min(100, Number(s.email_success_rate ?? 100))), l = Math.max(0, Math.min(100, Number(s.job_success_rate ?? 100))), d = Number(s.pending_retries || 0), n = String(s.period || "").trim(), o = (m) => m >= 95 ? { text: "text-green-600", bar: "bg-green-500" } : m >= 80 ? { text: "text-yellow-600", bar: "bg-yellow-500" } : { text: "text-red-600", bar: "bg-red-500" }, g = o(r), p = o(l);
    return `
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Email Delivery</span>
            <span class="text-sm font-semibold ${g.text}">${r}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${g.bar}" style="width: ${r}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${a(c(s.emails_sent || 0))} sent</span>
            <span>${a(c(s.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${p.text}">${l}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${p.bar}" style="width: ${l}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${a(c(s.jobs_completed || 0))} completed</span>
            <span>${a(c(s.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${d > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${a(c(d))} items pending retry
          </div>
        ` : ""}
      </div>
      ${n ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${a(n)}</div>` : ""}
    `;
  }
  if (t === "esign.widget.pending_signatures") {
    const s = e, r = Array.isArray(s.agreements) ? s.agreements : [], l = String(s.list_url || "").trim();
    return `
      ${r.length ? `
        <ul class="space-y-2">
          ${r.map((d) => {
      const n = Array.isArray(d.pending_recipients) ? d.pending_recipients : [];
      return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${d.url ? `<a href="${a(d.url)}" class="hover:text-blue-600">${a(d.title || "Untitled")}</a>` : `${a(d.title || "Untitled")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${a(c(d.pending_count || 0))} of ${a(c(d.total_recipients || 0))} signatures pending
                </div>
                ${n.length ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${n.slice(0, 3).map((o) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${a(o.name || o.email || "Recipient")}
                      </span>
                    `).join("")}
                    ${n.length > 3 ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +${n.length - 3} more
                      </span>
                    ` : ""}
                  </div>
                ` : ""}
              </li>
            `;
    }).join("")}
        </ul>
      ` : `
        <div class="text-center py-6 text-gray-500">
          <p class="text-sm font-medium">All caught up!</p>
          <p class="text-xs mt-1">No agreements pending signature</p>
        </div>
      `}
      ${l ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(l)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${a(JSON.stringify(e, null, 2))}</pre>`;
}
function T(i) {
  const t = i.metadata?.layout?.width || i.span || 12, e = i.data?.title || i.config?.title || i.title || w(i.definition);
  return `
    <article class="widget" data-widget="${a(i.id || i.definition || "")}" data-span="${a(t)}" style="--span: ${a(t)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${a(e)}</h3></div>
      <div class="widget__content">${A(i)}</div>
    </article>
  `;
}
function j(i) {
  const t = Array.isArray(i.widgets) ? i.widgets : [], e = i.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${t.length ? `<div class="widgets-grid" data-area-code="${a(i.area_code || "")}">${t.map(T).join("")}</div>` : `<p class="text-sm text-gray-500">${a(e)}</p>`}</div></div>`;
}
function S(i) {
  const t = i.record || {}, e = Array.isArray(i.fields) ? i.fields : [], s = t.username || t.display_name || t.id || "", r = t.email || "", l = String(t.username || t.display_name || t.email || t.id || "?").slice(0, 1).toUpperCase();
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${a(l)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${a(s)}</h2>
          <p class="text-sm text-gray-500">${a(r)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${e.map(
    (d) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${a(d.label)}</div><div class="text-base font-medium text-gray-900">${a(d.value ?? "-")}</div></div>`
  ).join("")}
        </div>
      </div>
    </div>
  `;
}
function C(i) {
  const t = i.href || "", e = i.panel || "panel";
  return t ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${a(e)} panel.</p>
        <a href="${a(t)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function N(i) {
  return i.html ? i.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${i.template ? `Template tab "${a(i.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function L(i) {
  const t = i?.tab || i;
  return !t || !t.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : t.kind === "dashboard_area" || t.kind === "cms_area" ? j(t) : t.kind === "details" ? S(i) : t.kind === "panel" ? C(t) : t.kind === "template" ? N(t) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
class R {
  constructor(t, e, s = {}) {
    this.tabsNav = t, this.panelContainer = e, this.tabLinks = Array.from(t.querySelectorAll("[data-tab-id]")), this.basePath = (e.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (e.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = e.dataset.panel || "", this.recordId = e.dataset.recordId || "", this.options = s, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), u(this.panelContainer);
    const t = this.tabsNav.querySelector(".panel-tab-active");
    t?.dataset.renderMode === "client" && this.loadTab(t, { silent: !0 });
  }
  buildEndpoint(t, e) {
    if (!this.basePath || !this.panelName || !this.recordId || !e)
      return "";
    const s = encodeURIComponent(e), r = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${r}/tabs/${s}` : `${this.basePath}/${this.panelName}/${r}/tabs/${s}`;
  }
  setActiveTab(t) {
    this.tabLinks.forEach((e) => {
      const s = e.dataset.tabId === t;
      e.classList.toggle("panel-tab-active", s), e.setAttribute("aria-selected", s ? "true" : "false");
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
    const s = e.dataset.renderMode || "";
    s !== "hybrid" && s !== "client" || (t.preventDefault(), this.loadTab(e));
  }
  async loadTab(t, e) {
    const s = t.dataset.renderMode || "", r = t.dataset.tabId || "";
    if (!s || !r) return !1;
    const l = t.getAttribute("href") || "";
    this.setActiveTab(r), e?.silent || this.updateUrl(l), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (s === "hybrid") {
        const d = this.buildEndpoint("html", r);
        if (!d) throw new Error("missing html endpoint");
        const n = await fetch(d, {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });
        if (!n.ok) throw new Error(`tab html ${n.status}`);
        return this.panelContainer.innerHTML = await n.text(), u(this.panelContainer), !0;
      }
      if (s === "client") {
        const d = this.buildEndpoint("json", r);
        if (!d) throw new Error("missing json endpoint");
        const n = await fetch(d, {
          headers: { Accept: "application/json" }
        });
        if (!n.ok) throw new Error(`tab json ${n.status}`);
        const o = await n.json();
        return this.panelContainer.innerHTML = L(o), u(this.panelContainer), !0;
      }
    } catch (d) {
      console.warn("[TabsController] Failed to load tab", d), this.options.onError?.(d), l && (window.location.href = l);
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
    const e = this.tabLinks.find((s) => s.dataset.tabId === t);
    e && this.loadTab(e);
  }
}
function I(i) {
  const t = document.querySelector(".panel-tabs"), e = document.querySelector("[data-tab-panel-container]");
  return !t || !e ? null : new R(t, e, i);
}
export {
  R as TabsController,
  a as escapeHTML,
  v as formatAbsoluteTime,
  c as formatNumber,
  h as formatRelativeTime,
  u as hydrateTimeElements,
  I as initTabsController,
  y as isEmptyValue,
  M as parseTimestamp,
  L as renderClientTab,
  S as renderDetailsPanel,
  C as renderPanelLink,
  N as renderTemplatePanel,
  T as renderWidget,
  j as renderWidgetPanel
};
//# sourceMappingURL=index.js.map
