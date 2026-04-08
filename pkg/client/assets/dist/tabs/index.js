import { escapeHTML as a } from "../shared/html.js";
import { formatAbsoluteDateTime as b, formatRelativeTimeNatural as x, parseTimeValue as f } from "../shared/time-formatters.js";
function c(e) {
  return typeof e == "number" ? e.toLocaleString() : e == null ? "" : String(e);
}
function M(e) {
  return f(e);
}
function v(e) {
  return b(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function h(e) {
  return x(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    numeric: "auto",
    direction: "bidirectional"
  });
}
function g(e) {
  const t = e || document;
  t.querySelectorAll("[data-relative-time]").forEach((s) => {
    const i = s.getAttribute("data-relative-time");
    if (!i) return;
    s.textContent = h(i);
    const r = v(i);
    r && s.setAttribute("title", r);
  }), t.querySelectorAll("[data-absolute-time]").forEach((s) => {
    const i = s.getAttribute("data-absolute-time");
    if (!i) return;
    const r = v(i);
    s.textContent = r, r && s.setAttribute("title", r);
  });
}
function y(e) {
  return e == null || String(e).trim() === "";
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
  "admin.widget.system_health": "System Health",
  "esign.widget.agreement_stats": "E-Sign Agreement Stats",
  "esign.widget.signing_activity": "E-Sign Signing Activity",
  "esign.widget.delivery_health": "E-Sign Delivery Health",
  "esign.widget.pending_signatures": "E-Sign Pending Signatures"
};
function w(e) {
  return e ? $[e] || e.replace(/_/g, " ") : "";
}
function _(e) {
  const t = e?.value !== void 0 && e?.value !== null ? e.value : "-", s = a(t), i = String(e?.type || "text").toLowerCase();
  if (i === "badge") return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${s}</span>`;
  if (i === "status") {
    const r = {
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
    }[String(t || "").toLowerCase()] || {
      dot: "bg-gray-400",
      text: "text-gray-700"
    };
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${s} status"><span class="w-2 h-2 rounded-full ${r.dot}" aria-hidden="true"></span><span class="${r.text}">${s}</span></span>`;
  }
  if (i === "verified") {
    const r = !!e?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${s}</span><span class="${r ? "text-green-500" : "text-gray-400"}">${r ? "✓" : "✕"}</span></span>`;
  }
  return i === "date" ? `<time datetime="${s}" data-absolute-time="${s}">${s}</time>` : i === "relative" ? `<time datetime="${s}" data-relative-time="${s}">${s}</time>` : s;
}
function k(e) {
  const t = e.map((s) => {
    const i = (Array.isArray(s?.fields) ? s.fields : []).filter((r) => !(r?.hide_if_empty && y(r?.value)));
    return i.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${a(s?.label || "")}</div>
        <dl class="space-y-3">
          ${i.map((r) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${a(r?.label || r?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${_(r)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return t.length ? `<div class="space-y-6">${t.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function A(e) {
  const t = e.definition || "", s = e.data || {};
  if (t === "admin.widget.user_stats") {
    const i = s.values || {
      Total: s.total,
      Active: s.active,
      "New Today": s.new_today
    };
    return `<div class="metrics">${Object.entries(i).map(([r, n]) => `<div class="metric"><small>${a(r)}</small><span>${a(c(n))}</span></div>`).join("")}</div>`;
  }
  if (t === "admin.widget.settings_overview") {
    const i = s.values || {}, r = Object.entries(i);
    return r.length ? `<dl class="space-y-2">${r.map(([n, d]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${a(n)}</dt><dd class="text-sm font-medium text-gray-900">${a(d ?? "-")}</dd></div>`).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (t === "admin.widget.user_profile_overview") {
    const i = Array.isArray(s.sections) ? s.sections : [];
    return i.length ? k(i) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (t === "admin.widget.activity_feed" || t === "admin.widget.user_activity_feed") {
    const i = s.entries || [];
    return i.length ? `<ul class="space-y-3">${i.map((r) => {
      const n = String(r.actor || "system").trim() || "system", d = String(r.action || "updated").trim() || "updated", l = String(r.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${a(n)}</div>
        <div class="text-gray-500 text-sm mt-1">${a(d)}${l ? ` ${a(l)}` : ""}</div>
        ${r.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${a(r.created_at)}" data-relative-time="${a(r.created_at)}">${a(r.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  if (t === "esign.widget.agreement_stats") {
    const i = s, r = Number(i.total || 0), n = Number(i.pending || 0), d = Number(i.completed || 0), l = Number(i.voided || 0) + Number(i.declined || 0) + Number(i.expired || 0), o = r > 0 ? Math.round(d * 100 / r) : 0, u = String(i.list_url || "").trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${a(c(r))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${a(c(n))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${a(c(d))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
          </div>
          <div class="bg-red-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-700">${a(c(l))}</div>
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
        ${u ? `
          <div class="mt-4 pt-3 border-t border-gray-100 text-center">
            <a href="${a(u)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
    const i = s, r = Array.isArray(i.activities) ? i.activities : [], n = String(i.activity_url || "").trim(), d = (l) => {
      const o = String(l || "").toLowerCase();
      return o === "signed" || o === "completed" ? "bg-green-500" : o === "viewed" ? "bg-purple-500" : o === "sent" ? "bg-blue-500" : o === "declined" ? "bg-orange-500" : o === "voided" || o === "expired" ? "bg-red-500" : "bg-gray-400";
    };
    return `
      ${r.length ? `
        <ul class="space-y-3">
          ${r.map((l) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${d(l.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${l.agreement_url ? `<a href="${a(l.agreement_url)}" class="hover:text-blue-600">${a(l.agreement_title || "Agreement")}</a>` : `${a(l.agreement_title || "Agreement")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${a(l.type || "event")}</span>
                  ${l.actor ? `<span class="mx-1">·</span><span>${a(l.actor)}</span>` : ""}
                </div>
              </div>
              ${l.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${a(l.timestamp)}">
                  <time data-relative-time="${a(l.timestamp)}">${a(l.timestamp)}</time>
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
      ${n ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(n)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
    const i = s, r = Math.max(0, Math.min(100, Number(i.email_success_rate ?? 100))), n = Math.max(0, Math.min(100, Number(i.job_success_rate ?? 100))), d = Number(i.pending_retries || 0), l = String(i.period || "").trim(), o = (m) => m >= 95 ? {
      text: "text-green-600",
      bar: "bg-green-500"
    } : m >= 80 ? {
      text: "text-yellow-600",
      bar: "bg-yellow-500"
    } : {
      text: "text-red-600",
      bar: "bg-red-500"
    }, u = o(r), p = o(n);
    return `
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Email Delivery</span>
            <span class="text-sm font-semibold ${u.text}">${r}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${u.bar}" style="width: ${r}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${a(c(i.emails_sent || 0))} sent</span>
            <span>${a(c(i.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${p.text}">${n}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${p.bar}" style="width: ${n}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${a(c(i.jobs_completed || 0))} completed</span>
            <span>${a(c(i.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${d > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${a(c(d))} items pending retry
          </div>
        ` : ""}
      </div>
      ${l ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${a(l)}</div>` : ""}
    `;
  }
  if (t === "esign.widget.pending_signatures") {
    const i = s, r = Array.isArray(i.agreements) ? i.agreements : [], n = String(i.list_url || "").trim();
    return `
      ${r.length ? `
        <ul class="space-y-2">
          ${r.map((d) => {
      const l = Array.isArray(d.pending_recipients) ? d.pending_recipients : [];
      return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${d.url ? `<a href="${a(d.url)}" class="hover:text-blue-600">${a(d.title || "Untitled")}</a>` : `${a(d.title || "Untitled")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${a(c(d.pending_count || 0))} of ${a(c(d.total_recipients || 0))} signatures pending
                </div>
                ${l.length ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${l.slice(0, 3).map((o) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${a(o.name || o.email || "Recipient")}
                      </span>
                    `).join("")}
                    ${l.length > 3 ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +${l.length - 3} more
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
      ${n ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(n)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${a(JSON.stringify(s, null, 2))}</pre>`;
}
function T(e) {
  const t = e.metadata?.layout?.width || e.span || 12, s = e.data?.title || e.config?.title || e.title || w(e.definition);
  return `
    <article class="widget" data-widget="${a(e.id || e.definition || "")}" data-span="${a(t)}" style="--span: ${a(t)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${a(s)}</h3></div>
      <div class="widget__content">${A(e)}</div>
    </article>
  `;
}
function j(e) {
  const t = Array.isArray(e.widgets) ? e.widgets : [], s = e.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${t.length ? `<div class="widgets-grid" data-area-code="${a(e.area_code || "")}">${t.map(T).join("")}</div>` : `<p class="text-sm text-gray-500">${a(s)}</p>`}</div></div>`;
}
function S(e) {
  const t = e.record || {}, s = Array.isArray(e.fields) ? e.fields : [], i = t.username || t.display_name || t.id || "", r = t.email || "";
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${a(String(t.username || t.display_name || t.email || t.id || "?").slice(0, 1).toUpperCase())}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${a(i)}</h2>
          <p class="text-sm text-gray-500">${a(r)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${s.map((n) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${a(n.label)}</div><div class="text-base font-medium text-gray-900">${a(n.value ?? "-")}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}
function C(e) {
  const t = e.href || "", s = e.panel || "panel";
  return t ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${a(s)} panel.</p>
        <a href="${a(t)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function N(e) {
  return e.html ? e.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${e.template ? `Template tab "${a(e.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function L(e) {
  const t = e?.tab || e;
  return !t || !t.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : t.kind === "dashboard_area" || t.kind === "cms_area" ? j(t) : t.kind === "details" ? S(e) : t.kind === "panel" ? C(t) : t.kind === "template" ? N(t) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
var E = class {
  constructor(e, t, s = {}) {
    this.tabsNav = e, this.panelContainer = t, this.tabLinks = Array.from(e.querySelectorAll("[data-tab-id]")), this.basePath = (t.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (t.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = t.dataset.panel || "", this.recordId = t.dataset.recordId || "", this.options = s, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), g(this.panelContainer);
    const e = this.tabsNav.querySelector(".panel-tab-active");
    e?.dataset.renderMode === "client" && this.loadTab(e, { silent: !0 });
  }
  buildEndpoint(e, t) {
    if (!this.basePath || !this.panelName || !this.recordId || !t) return "";
    const s = encodeURIComponent(t), i = encodeURIComponent(this.recordId);
    return e === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${i}/tabs/${s}` : `${this.basePath}/${this.panelName}/${i}/tabs/${s}`;
  }
  setActiveTab(e) {
    this.tabLinks.forEach((t) => {
      const s = t.dataset.tabId === e;
      t.classList.toggle("panel-tab-active", s), t.setAttribute("aria-selected", s ? "true" : "false");
    }), this.panelContainer.dataset.activeTab = e || "", this.options.onTabChange?.(e);
  }
  updateUrl(e) {
    if (e)
      try {
        window.history.pushState({ tab: e }, "", e);
      } catch (t) {
        console.warn("[TabsController] Unable to update URL", t);
      }
  }
  handleTabClick(e) {
    const t = e.target.closest("[data-tab-id]");
    if (!t) return;
    const s = t.dataset.renderMode || "";
    s !== "hybrid" && s !== "client" || (e.preventDefault(), this.loadTab(t));
  }
  async loadTab(e, t) {
    const s = e.dataset.renderMode || "", i = e.dataset.tabId || "";
    if (!s || !i) return !1;
    const r = e.getAttribute("href") || "";
    this.setActiveTab(i), t?.silent || this.updateUrl(r), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (s === "hybrid") {
        const n = this.buildEndpoint("html", i);
        if (!n) throw new Error("missing html endpoint");
        const d = await fetch(n, { headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!d.ok) throw new Error(`tab html ${d.status}`);
        return this.panelContainer.innerHTML = await d.text(), g(this.panelContainer), !0;
      }
      if (s === "client") {
        const n = this.buildEndpoint("json", i);
        if (!n) throw new Error("missing json endpoint");
        const d = await fetch(n, { headers: { Accept: "application/json" } });
        if (!d.ok) throw new Error(`tab json ${d.status}`);
        const l = await d.json();
        return this.panelContainer.innerHTML = L(l), g(this.panelContainer), !0;
      }
    } catch (n) {
      console.warn("[TabsController] Failed to load tab", n), this.options.onError?.(n), r && (window.location.href = r);
    }
    return !1;
  }
  getActiveTabId() {
    return this.panelContainer.dataset.activeTab || "";
  }
  switchToTab(e) {
    const t = this.tabLinks.find((s) => s.dataset.tabId === e);
    t && this.loadTab(t);
  }
};
function I(e) {
  const t = document.querySelector(".panel-tabs"), s = document.querySelector("[data-tab-panel-container]");
  return !t || !s ? null : new E(t, s, e);
}
export {
  E as TabsController,
  a as escapeHTML,
  v as formatAbsoluteTime,
  c as formatNumber,
  h as formatRelativeTime,
  g as hydrateTimeElements,
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