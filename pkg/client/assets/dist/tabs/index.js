import { escapeHTML as r } from "../shared/html.js";
function c(i) {
  return typeof i == "number" ? i.toLocaleString() : i == null ? "" : String(i);
}
function x(i) {
  if (i == null || i === "") return null;
  const t = new Date(i);
  return Number.isNaN(t.getTime()) ? null : t;
}
function v(i) {
  const t = x(i);
  return t ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(t) : String(i || "");
}
function b(i) {
  const t = x(i);
  if (!t) return String(i || "");
  const e = t.getTime() - Date.now(), s = Math.abs(e), a = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), d = 1e3, l = 60 * d, n = 60 * l, o = 24 * n, u = 30 * o, g = 365 * o;
  return s < l ? a.format(Math.round(e / d), "second") : s < n ? a.format(Math.round(e / l), "minute") : s < o ? a.format(Math.round(e / n), "hour") : s < u ? a.format(Math.round(e / o), "day") : s < g ? a.format(Math.round(e / u), "month") : a.format(Math.round(e / g), "year");
}
function m(i) {
  const t = i || document;
  t.querySelectorAll("[data-relative-time]").forEach((e) => {
    const s = e.getAttribute("data-relative-time");
    if (!s) return;
    e.textContent = b(s);
    const a = v(s);
    a && e.setAttribute("title", a);
  }), t.querySelectorAll("[data-absolute-time]").forEach((e) => {
    const s = e.getAttribute("data-absolute-time");
    if (!s) return;
    const a = v(s);
    e.textContent = a, a && e.setAttribute("title", a);
  });
}
function f(i) {
  return i == null || String(i).trim() === "";
}
const h = {
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
function y(i) {
  return i ? h[i] || i.replace(/_/g, " ") : "";
}
function w(i) {
  const t = i?.value !== void 0 && i?.value !== null ? i.value : "-", e = r(t), s = String(i?.type || "text").toLowerCase();
  if (s === "badge")
    return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${e}</span>`;
  if (s === "status") {
    const a = String(t || "").toLowerCase(), d = {
      active: { dot: "bg-green-500", text: "text-green-700" },
      inactive: { dot: "bg-gray-400", text: "text-gray-600" },
      suspended: { dot: "bg-red-500", text: "text-red-700" },
      pending: { dot: "bg-yellow-500", text: "text-yellow-700" }
    }[a] || { dot: "bg-gray-400", text: "text-gray-700" };
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${e} status"><span class="w-2 h-2 rounded-full ${d.dot}" aria-hidden="true"></span><span class="${d.text}">${e}</span></span>`;
  }
  if (s === "verified") {
    const a = !!i?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${e}</span><span class="${a ? "text-green-500" : "text-gray-400"}">${a ? "✓" : "✕"}</span></span>`;
  }
  return s === "date" ? `<time datetime="${e}" data-absolute-time="${e}">${e}</time>` : s === "relative" ? `<time datetime="${e}" data-relative-time="${e}">${e}</time>` : e;
}
function $(i) {
  const t = i.map((e) => {
    const a = (Array.isArray(e?.fields) ? e.fields : []).filter((d) => !(d?.hide_if_empty && f(d?.value)));
    return a.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${r(e?.label || "")}</div>
        <dl class="space-y-3">
          ${a.map((d) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${r(d?.label || d?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${w(d)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return t.length ? `<div class="space-y-6">${t.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function _(i) {
  const t = i.definition || "", e = i.data || {};
  if (t === "admin.widget.user_stats") {
    const s = e.values || { Total: e.total, Active: e.active, "New Today": e.new_today };
    return `<div class="metrics">${Object.entries(s).map(
      ([a, d]) => `<div class="metric"><small>${r(a)}</small><span>${r(c(d))}</span></div>`
    ).join("")}</div>`;
  }
  if (t === "admin.widget.settings_overview") {
    const s = e.values || {}, a = Object.entries(s);
    return a.length ? `<dl class="space-y-2">${a.map(
      ([d, l]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${r(d)}</dt><dd class="text-sm font-medium text-gray-900">${r(l ?? "-")}</dd></div>`
    ).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (t === "admin.widget.user_profile_overview") {
    const s = Array.isArray(e.sections) ? e.sections : [];
    return s.length ? $(s) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (t === "admin.widget.activity_feed" || t === "admin.widget.user_activity_feed") {
    const s = e.entries || [];
    return s.length ? `<ul class="space-y-3">${s.map((a) => {
      const d = String(a.actor || "system").trim() || "system", l = String(a.action || "updated").trim() || "updated", n = String(a.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${r(d)}</div>
        <div class="text-gray-500 text-sm mt-1">${r(l)}${n ? ` ${r(n)}` : ""}</div>
        ${a.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${r(a.created_at)}" data-relative-time="${r(a.created_at)}">${r(a.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  if (t === "esign.widget.agreement_stats") {
    const s = e, a = Number(s.total || 0), d = Number(s.pending || 0), l = Number(s.completed || 0), n = Number(s.voided || 0) + Number(s.declined || 0) + Number(s.expired || 0), o = a > 0 ? Math.round(l * 100 / a) : 0, u = String(s.list_url || "").trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${r(c(a))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${r(c(d))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${r(c(l))}</div>
            <div class="text-xs text-green-600 uppercase tracking-wide">Completed</div>
          </div>
          <div class="bg-red-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-red-700">${r(c(n))}</div>
            <div class="text-xs text-red-600 uppercase tracking-wide">Cancelled</div>
          </div>
        </div>
        ${a > 0 ? `
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
            <a href="${r(u)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
    const s = e, a = Array.isArray(s.activities) ? s.activities : [], d = String(s.activity_url || "").trim(), l = (n) => {
      const o = String(n || "").toLowerCase();
      return o === "signed" || o === "completed" ? "bg-green-500" : o === "viewed" ? "bg-purple-500" : o === "sent" ? "bg-blue-500" : o === "declined" ? "bg-orange-500" : o === "voided" || o === "expired" ? "bg-red-500" : "bg-gray-400";
    };
    return `
      ${a.length ? `
        <ul class="space-y-3">
          ${a.map((n) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${l(n.type)}" aria-hidden="true"></span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${n.agreement_url ? `<a href="${r(n.agreement_url)}" class="hover:text-blue-600">${r(n.agreement_title || "Agreement")}</a>` : `${r(n.agreement_title || "Agreement")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  <span class="capitalize">${r(n.type || "event")}</span>
                  ${n.actor ? `<span class="mx-1">·</span><span>${r(n.actor)}</span>` : ""}
                </div>
              </div>
              ${n.timestamp ? `
                <div class="flex-shrink-0 text-xs text-gray-400" title="${r(n.timestamp)}">
                  <time data-relative-time="${r(n.timestamp)}">${r(n.timestamp)}</time>
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
          <a href="${r(d)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
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
    const s = e, a = Math.max(0, Math.min(100, Number(s.email_success_rate ?? 100))), d = Math.max(0, Math.min(100, Number(s.job_success_rate ?? 100))), l = Number(s.pending_retries || 0), n = String(s.period || "").trim(), o = (p) => p >= 95 ? { text: "text-green-600", bar: "bg-green-500" } : p >= 80 ? { text: "text-yellow-600", bar: "bg-yellow-500" } : { text: "text-red-600", bar: "bg-red-500" }, u = o(a), g = o(d);
    return `
      <div class="space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Email Delivery</span>
            <span class="text-sm font-semibold ${u.text}">${a}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${u.bar}" style="width: ${a}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${r(c(s.emails_sent || 0))} sent</span>
            <span>${r(c(s.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${g.text}">${d}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${g.bar}" style="width: ${d}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${r(c(s.jobs_completed || 0))} completed</span>
            <span>${r(c(s.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${l > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${r(c(l))} items pending retry
          </div>
        ` : ""}
      </div>
      ${n ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${r(n)}</div>` : ""}
    `;
  }
  if (t === "esign.widget.pending_signatures") {
    const s = e, a = Array.isArray(s.agreements) ? s.agreements : [], d = String(s.list_url || "").trim();
    return `
      ${a.length ? `
        <ul class="space-y-2">
          ${a.map((l) => {
      const n = Array.isArray(l.pending_recipients) ? l.pending_recipients : [];
      return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${l.url ? `<a href="${r(l.url)}" class="hover:text-blue-600">${r(l.title || "Untitled")}</a>` : `${r(l.title || "Untitled")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${r(c(l.pending_count || 0))} of ${r(c(l.total_recipients || 0))} signatures pending
                </div>
                ${n.length ? `
                  <div class="mt-2 flex flex-wrap gap-1">
                    ${n.slice(0, 3).map((o) => `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
                        ${r(o.name || o.email || "Recipient")}
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
      ${d ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${r(d)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${r(JSON.stringify(e, null, 2))}</pre>`;
}
function k(i) {
  const t = i.metadata?.layout?.width || i.span || 12, e = i.data?.title || i.config?.title || i.title || y(i.definition);
  return `
    <article class="widget" data-widget="${r(i.id || i.definition || "")}" data-span="${r(t)}" style="--span: ${r(t)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${r(e)}</h3></div>
      <div class="widget__content">${_(i)}</div>
    </article>
  `;
}
function T(i) {
  const t = Array.isArray(i.widgets) ? i.widgets : [], e = i.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${t.length ? `<div class="widgets-grid" data-area-code="${r(i.area_code || "")}">${t.map(k).join("")}</div>` : `<p class="text-sm text-gray-500">${r(e)}</p>`}</div></div>`;
}
function A(i) {
  const t = i.record || {}, e = Array.isArray(i.fields) ? i.fields : [], s = t.username || t.display_name || t.id || "", a = t.email || "", d = String(t.username || t.display_name || t.email || t.id || "?").slice(0, 1).toUpperCase();
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${r(d)}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${r(s)}</h2>
          <p class="text-sm text-gray-500">${r(a)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${e.map(
    (l) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${r(l.label)}</div><div class="text-base font-medium text-gray-900">${r(l.value ?? "-")}</div></div>`
  ).join("")}
        </div>
      </div>
    </div>
  `;
}
function S(i) {
  const t = i.href || "", e = i.panel || "panel";
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
function j(i) {
  return i.html ? i.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${i.template ? `Template tab "${r(i.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function C(i) {
  const t = i?.tab || i;
  return !t || !t.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : t.kind === "dashboard_area" || t.kind === "cms_area" ? T(t) : t.kind === "details" ? A(i) : t.kind === "panel" ? S(t) : t.kind === "template" ? j(t) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
class N {
  constructor(t, e, s = {}) {
    this.tabsNav = t, this.panelContainer = e, this.tabLinks = Array.from(t.querySelectorAll("[data-tab-id]")), this.basePath = (e.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (e.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = e.dataset.panel || "", this.recordId = e.dataset.recordId || "", this.options = s, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), m(this.panelContainer);
    const t = this.tabsNav.querySelector(".panel-tab-active");
    t?.dataset.renderMode === "client" && this.loadTab(t, { silent: !0 });
  }
  buildEndpoint(t, e) {
    if (!this.basePath || !this.panelName || !this.recordId || !e)
      return "";
    const s = encodeURIComponent(e), a = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${a}/tabs/${s}` : `${this.basePath}/${this.panelName}/${a}/tabs/${s}`;
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
    const s = t.dataset.renderMode || "", a = t.dataset.tabId || "";
    if (!s || !a) return !1;
    const d = t.getAttribute("href") || "";
    this.setActiveTab(a), e?.silent || this.updateUrl(d), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (s === "hybrid") {
        const l = this.buildEndpoint("html", a);
        if (!l) throw new Error("missing html endpoint");
        const n = await fetch(l, {
          headers: { "X-Requested-With": "XMLHttpRequest" }
        });
        if (!n.ok) throw new Error(`tab html ${n.status}`);
        return this.panelContainer.innerHTML = await n.text(), m(this.panelContainer), !0;
      }
      if (s === "client") {
        const l = this.buildEndpoint("json", a);
        if (!l) throw new Error("missing json endpoint");
        const n = await fetch(l, {
          headers: { Accept: "application/json" }
        });
        if (!n.ok) throw new Error(`tab json ${n.status}`);
        const o = await n.json();
        return this.panelContainer.innerHTML = C(o), m(this.panelContainer), !0;
      }
    } catch (l) {
      console.warn("[TabsController] Failed to load tab", l), this.options.onError?.(l), d && (window.location.href = d);
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
function L(i) {
  const t = document.querySelector(".panel-tabs"), e = document.querySelector("[data-tab-panel-container]");
  return !t || !e ? null : new N(t, e, i);
}
export {
  N as TabsController,
  r as escapeHTML,
  v as formatAbsoluteTime,
  c as formatNumber,
  b as formatRelativeTime,
  m as hydrateTimeElements,
  L as initTabsController,
  f as isEmptyValue,
  x as parseTimestamp,
  C as renderClientTab,
  A as renderDetailsPanel,
  S as renderPanelLink,
  j as renderTemplatePanel,
  k as renderWidget,
  T as renderWidgetPanel
};
//# sourceMappingURL=index.js.map
