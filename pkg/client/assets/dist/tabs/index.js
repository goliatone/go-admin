import { escapeHTML as a } from "../shared/html.js";
import { formatAbsoluteDateTime as x, formatRelativeTimeNatural as f, parseTimeValue as h } from "../shared/time-formatters.js";
import { n as y, t as $ } from "../chunks/application-widgets-9yj65FzP.js";
function u(e) {
  return typeof e == "number" ? e.toLocaleString() : e == null ? "" : String(e);
}
function B(e) {
  return h(e);
}
function b(e) {
  return x(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function w(e) {
  return f(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    numeric: "auto",
    direction: "bidirectional"
  });
}
function p(e) {
  const t = e || document;
  t.querySelectorAll("[data-relative-time]").forEach((i) => {
    const n = i.getAttribute("data-relative-time");
    if (!n) return;
    i.textContent = w(n);
    const s = b(n);
    s && i.setAttribute("title", s);
  }), t.querySelectorAll("[data-absolute-time]").forEach((i) => {
    const n = i.getAttribute("data-absolute-time");
    if (!n) return;
    const s = b(n);
    i.textContent = s, s && i.setAttribute("title", s);
  });
}
function _(e) {
  return e == null || String(e).trim() === "";
}
var k = {
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
function A(e) {
  return e ? k[e] || e.replace(/_/g, " ") : "";
}
function T(e) {
  const t = e?.value !== void 0 && e?.value !== null ? e.value : "-", i = a(t), n = String(e?.type || "text").toLowerCase();
  if (n === "badge") return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${i}</span>`;
  if (n === "status") {
    const s = {
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
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${i} status"><span class="w-2 h-2 rounded-full ${s.dot}" aria-hidden="true"></span><span class="${s.text}">${i}</span></span>`;
  }
  if (n === "verified") {
    const s = !!e?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${i}</span><span class="${s ? "text-green-500" : "text-gray-400"}">${s ? "✓" : "✕"}</span></span>`;
  }
  return n === "date" ? `<time datetime="${i}" data-absolute-time="${i}">${i}</time>` : n === "relative" ? `<time datetime="${i}" data-relative-time="${i}">${i}</time>` : i;
}
function j(e) {
  const t = e.map((i) => {
    const n = (Array.isArray(i?.fields) ? i.fields : []).filter((s) => !(s?.hide_if_empty && _(s?.value)));
    return n.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${a(i?.label || "")}</div>
        <dl class="space-y-3">
          ${n.map((s) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${a(s?.label || s?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${T(s)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return t.length ? `<div class="space-y-6">${t.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function S(e) {
  const t = e.definition || "", i = e.data || {}, n = $(t);
  if (n) return n.render(e);
  if (t === "admin.widget.user_stats") {
    const s = i.values || {
      Total: i.total,
      Active: i.active,
      "New Today": i.new_today
    };
    return `<div class="metrics">${Object.entries(s).map(([r, d]) => `<div class="metric"><small>${a(r)}</small><span>${a(u(d))}</span></div>`).join("")}</div>`;
  }
  if (t === "admin.widget.settings_overview") {
    const s = i.values || {}, r = Object.entries(s);
    return r.length ? `<dl class="space-y-2">${r.map(([d, o]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${a(d)}</dt><dd class="text-sm font-medium text-gray-900">${a(o ?? "-")}</dd></div>`).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (t === "admin.widget.user_profile_overview") {
    const s = Array.isArray(i.sections) ? i.sections : [];
    return s.length ? j(s) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (t === "admin.widget.activity_feed" || t === "admin.widget.user_activity_feed") {
    const s = i.entries || [];
    return s.length ? `<ul class="space-y-3">${s.map((r) => {
      const d = String(r.actor || "system").trim() || "system", o = String(r.action || "updated").trim() || "updated", l = String(r.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${a(d)}</div>
        <div class="text-gray-500 text-sm mt-1">${a(o)}${l ? ` ${a(l)}` : ""}</div>
        ${r.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${a(r.created_at)}" data-relative-time="${a(r.created_at)}">${a(r.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  if (t === "esign.widget.agreement_stats") {
    const s = i, r = Number(s.total || 0), d = Number(s.pending || 0), o = Number(s.completed || 0), l = Number(s.voided || 0) + Number(s.declined || 0) + Number(s.expired || 0), c = r > 0 ? Math.round(o * 100 / r) : 0, g = String(s.list_url || "").trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${a(u(r))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${a(u(d))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${a(u(o))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
          </div>
          <div class="bg-red-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-700">${a(u(l))}</div>
            <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
          </div>
        </div>
        ${r > 0 ? `
          <div class="mt-4 pt-4 border-t border-gray-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-gray-600">Completion Rate</span>
              <span class="text-sm font-semibold text-gray-900">${c}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-green-500 h-2 rounded-full" style="width: ${c}%"></div>
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
    const s = i, r = Array.isArray(s.activities) ? s.activities : [], d = String(s.activity_url || "").trim(), o = (l) => {
      const c = String(l || "").toLowerCase();
      return c === "signed" || c === "completed" ? "bg-green-500" : c === "viewed" ? "bg-purple-500" : c === "sent" ? "bg-blue-500" : c === "declined" ? "bg-orange-500" : c === "voided" || c === "expired" ? "bg-red-500" : "bg-gray-400";
    };
    return `
      ${r.length ? `
        <ul class="space-y-3">
          ${r.map((l) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${o(l.type)}" aria-hidden="true"></span>
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
      ${d ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(d)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
    const s = i, r = Math.max(0, Math.min(100, Number(s.email_success_rate ?? 100))), d = Math.max(0, Math.min(100, Number(s.job_success_rate ?? 100))), o = Number(s.pending_retries || 0), l = String(s.period || "").trim(), c = (v) => v >= 95 ? {
      text: "text-green-600",
      bar: "bg-green-500"
    } : v >= 80 ? {
      text: "text-yellow-600",
      bar: "bg-yellow-500"
    } : {
      text: "text-red-600",
      bar: "bg-red-500"
    }, g = c(r), m = c(d);
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
            <span>${a(u(s.emails_sent || 0))} sent</span>
            <span>${a(u(s.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${m.text}">${d}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${m.bar}" style="width: ${d}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${a(u(s.jobs_completed || 0))} completed</span>
            <span>${a(u(s.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${o > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${a(u(o))} items pending retry
          </div>
        ` : ""}
      </div>
      ${l ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${a(l)}</div>` : ""}
    `;
  }
  if (t === "esign.widget.pending_signatures") {
    const s = i, r = Array.isArray(s.agreements) ? s.agreements : [], d = String(s.list_url || "").trim();
    return `
      ${r.length ? `
        <ul class="space-y-2">
          ${r.map((o) => {
      const l = Array.isArray(o.pending_recipients) ? o.pending_recipients : [];
      return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${o.url ? `<a href="${a(o.url)}" class="hover:text-blue-600">${a(o.title || "Untitled")}</a>` : `${a(o.title || "Untitled")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${a(u(o.pending_count || 0))} of ${a(u(o.total_recipients || 0))} signatures pending
                </div>
                ${l.length ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${l.slice(0, 3).map((c) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${a(c.name || c.email || "Recipient")}
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
      ${d ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${a(d)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${a(JSON.stringify(i, null, 2))}</pre>`;
}
function C(e) {
  const t = e.metadata?.layout?.width || e.span || 12, i = e.data?.title || e.config?.title || e.title || y(e.definition, e) || A(e.definition);
  return `
    <article class="widget" data-widget="${a(e.id || e.definition || "")}" data-span="${a(t)}" style="--span: ${a(t)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${a(i)}</h3></div>
      <div class="widget__content">${S(e)}</div>
    </article>
  `;
}
function N(e) {
  const t = Array.isArray(e.widgets) ? e.widgets : [], i = e.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${t.length ? `<div class="widgets-grid" data-area-code="${a(e.area_code || "")}">${t.map(C).join("")}</div>` : `<p class="text-sm text-gray-500">${a(i)}</p>`}</div></div>`;
}
function L(e) {
  const t = e.record || {}, i = Array.isArray(e.fields) ? e.fields : [], n = t.username || t.display_name || t.id || "", s = t.email || "";
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${a(String(t.username || t.display_name || t.email || t.id || "?").slice(0, 1).toUpperCase())}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${a(n)}</h2>
          <p class="text-sm text-gray-500">${a(s)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${i.map((r) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${a(r.label)}</div><div class="text-base font-medium text-gray-900">${a(r.value ?? "-")}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}
function R(e) {
  const t = e.href || "", i = e.panel || "panel";
  return t ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${a(i)} panel.</p>
        <a href="${a(t)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function E(e) {
  return e.html ? e.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${e.template ? `Template tab "${a(e.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function P(e) {
  const t = e?.tab || e;
  return !t || !t.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : t.kind === "dashboard_area" || t.kind === "cms_area" ? N(t) : t.kind === "details" ? L(e) : t.kind === "panel" ? R(t) : t.kind === "template" ? E(t) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
var M = class {
  constructor(e, t, i = {}) {
    this.tabsNav = e, this.panelContainer = t, this.tabLinks = Array.from(e.querySelectorAll("[data-tab-id]")), this.basePath = (t.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (t.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = t.dataset.panel || "", this.recordId = t.dataset.recordId || "", this.options = i, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), p(this.panelContainer);
    const e = this.tabsNav.querySelector(".panel-tab-active");
    e?.dataset.renderMode === "client" && this.loadTab(e, { silent: !0 });
  }
  buildEndpoint(e, t) {
    if (!this.basePath || !this.panelName || !this.recordId || !t) return "";
    const i = encodeURIComponent(t), n = encodeURIComponent(this.recordId);
    return e === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${n}/tabs/${i}` : `${this.basePath}/${this.panelName}/${n}/tabs/${i}`;
  }
  setActiveTab(e) {
    this.tabLinks.forEach((t) => {
      const i = t.dataset.tabId === e;
      t.classList.toggle("panel-tab-active", i), t.setAttribute("aria-selected", i ? "true" : "false");
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
    const i = t.dataset.renderMode || "";
    i !== "hybrid" && i !== "client" || (e.preventDefault(), this.loadTab(t));
  }
  async loadTab(e, t) {
    const i = e.dataset.renderMode || "", n = e.dataset.tabId || "";
    if (!i || !n) return !1;
    const s = e.getAttribute("href") || "";
    this.setActiveTab(n), t?.silent || this.updateUrl(s), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (i === "hybrid") {
        const r = this.buildEndpoint("html", n);
        if (!r) throw new Error("missing html endpoint");
        const d = await fetch(r, { headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!d.ok) throw new Error(`tab html ${d.status}`);
        return this.panelContainer.innerHTML = await d.text(), p(this.panelContainer), !0;
      }
      if (i === "client") {
        const r = this.buildEndpoint("json", n);
        if (!r) throw new Error("missing json endpoint");
        const d = await fetch(r, { headers: { Accept: "application/json" } });
        if (!d.ok) throw new Error(`tab json ${d.status}`);
        const o = await d.json();
        return this.panelContainer.innerHTML = P(o), p(this.panelContainer), !0;
      }
    } catch (r) {
      console.warn("[TabsController] Failed to load tab", r), this.options.onError?.(r), s && (window.location.href = s);
    }
    return !1;
  }
  getActiveTabId() {
    return this.panelContainer.dataset.activeTab || "";
  }
  switchToTab(e) {
    const t = this.tabLinks.find((i) => i.dataset.tabId === e);
    t && this.loadTab(t);
  }
};
function H(e) {
  const t = document.querySelector(".panel-tabs"), i = document.querySelector("[data-tab-panel-container]");
  return !t || !i ? null : new M(t, i, e);
}
export {
  M as TabsController,
  a as escapeHTML,
  b as formatAbsoluteTime,
  u as formatNumber,
  w as formatRelativeTime,
  p as hydrateTimeElements,
  H as initTabsController,
  _ as isEmptyValue,
  B as parseTimestamp,
  P as renderClientTab,
  L as renderDetailsPanel,
  R as renderPanelLink,
  E as renderTemplatePanel,
  C as renderWidget,
  N as renderWidgetPanel
};

//# sourceMappingURL=index.js.map