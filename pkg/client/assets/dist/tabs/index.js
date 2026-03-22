function r(t) {
  return String(t || "").replace(/[&<>"']/g, (e) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[e] || e);
}
function c(t) {
  return typeof t == "number" ? t.toLocaleString() : t == null ? "" : String(t);
}
function x(t) {
  if (t == null || t === "") return null;
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? null : e;
}
function v(t) {
  const e = x(t);
  return e ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(e) : String(t || "");
}
function b(t) {
  const e = x(t);
  if (!e) return String(t || "");
  const s = e.getTime() - Date.now(), i = Math.abs(s), a = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" }), l = 1e3, d = 60 * l, n = 60 * d, o = 24 * n, u = 30 * o, g = 365 * o;
  return i < d ? a.format(Math.round(s / l), "second") : i < n ? a.format(Math.round(s / d), "minute") : i < o ? a.format(Math.round(s / n), "hour") : i < u ? a.format(Math.round(s / o), "day") : i < g ? a.format(Math.round(s / u), "month") : a.format(Math.round(s / g), "year");
}
function m(t) {
  const e = t || document;
  e.querySelectorAll("[data-relative-time]").forEach((s) => {
    const i = s.getAttribute("data-relative-time");
    if (!i) return;
    s.textContent = b(i);
    const a = v(i);
    a && s.setAttribute("title", a);
  }), e.querySelectorAll("[data-absolute-time]").forEach((s) => {
    const i = s.getAttribute("data-absolute-time");
    if (!i) return;
    const a = v(i);
    s.textContent = a, a && s.setAttribute("title", a);
  });
}
function f(t) {
  return t == null || String(t).trim() === "";
}
var h = {
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
function y(t) {
  return t ? h[t] || t.replace(/_/g, " ") : "";
}
function w(t) {
  const e = t?.value !== void 0 && t?.value !== null ? t.value : "-", s = r(e), i = String(t?.type || "text").toLowerCase();
  if (i === "badge") return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${s}</span>`;
  if (i === "status") {
    const a = {
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
    return `<span class="profile-status inline-flex items-center gap-1.5" aria-label="${s} status"><span class="w-2 h-2 rounded-full ${a.dot}" aria-hidden="true"></span><span class="${a.text}">${s}</span></span>`;
  }
  if (i === "verified") {
    const a = !!t?.verified;
    return `<span class="inline-flex items-center gap-1.5"><span>${s}</span><span class="${a ? "text-green-500" : "text-gray-400"}">${a ? "✓" : "✕"}</span></span>`;
  }
  return i === "date" ? `<time datetime="${s}" data-absolute-time="${s}">${s}</time>` : i === "relative" ? `<time datetime="${s}" data-relative-time="${s}">${s}</time>` : s;
}
function $(t) {
  const e = t.map((s) => {
    const i = (Array.isArray(s?.fields) ? s.fields : []).filter((a) => !(a?.hide_if_empty && f(a?.value)));
    return i.length ? `
      <div class="profile-section">
        <div class="text-xs uppercase tracking-wider text-gray-500 mb-3 font-semibold">${r(s?.label || "")}</div>
        <dl class="space-y-3">
          ${i.map((a) => `
            <div class="flex items-start justify-between gap-4">
              <dt class="text-sm text-gray-500">${r(a?.label || a?.key || "")}</dt>
              <dd class="text-sm font-medium text-gray-900 text-right">${w(a)}</dd>
            </div>
          `).join("")}
        </dl>
      </div>
    ` : "";
  }).filter(Boolean);
  return e.length ? `<div class="space-y-6">${e.join("")}</div>` : '<p class="text-gray-500">No profile data to display</p>';
}
function _(t) {
  const e = t.definition || "", s = t.data || {};
  if (e === "admin.widget.user_stats") {
    const i = s.values || {
      Total: s.total,
      Active: s.active,
      "New Today": s.new_today
    };
    return `<div class="metrics">${Object.entries(i).map(([a, l]) => `<div class="metric"><small>${r(a)}</small><span>${r(c(l))}</span></div>`).join("")}</div>`;
  }
  if (e === "admin.widget.settings_overview") {
    const i = s.values || {}, a = Object.entries(i);
    return a.length ? `<dl class="space-y-2">${a.map(([l, d]) => `<div class="flex items-start justify-between gap-4"><dt class="text-sm text-gray-500">${r(l)}</dt><dd class="text-sm font-medium text-gray-900">${r(d ?? "-")}</dd></div>`).join("")}</dl>` : '<p class="text-gray-500">No settings to display</p>';
  }
  if (e === "admin.widget.user_profile_overview") {
    const i = Array.isArray(s.sections) ? s.sections : [];
    return i.length ? $(i) : '<p class="text-gray-500">No profile data to display</p>';
  }
  if (e === "admin.widget.activity_feed" || e === "admin.widget.user_activity_feed") {
    const i = s.entries || [];
    return i.length ? `<ul class="space-y-3">${i.map((a) => {
      const l = String(a.actor || "system").trim() || "system", d = String(a.action || "updated").trim() || "updated", n = String(a.object || "").trim();
      return `
      <li class="py-3 border-b border-gray-100 last:border-b-0">
        <div class="font-medium text-gray-900 text-sm">${r(l)}</div>
        <div class="text-gray-500 text-sm mt-1">${r(d)}${n ? ` ${r(n)}` : ""}</div>
        ${a.created_at ? `<time class="text-xs text-gray-400 mt-1 block" datetime="${r(a.created_at)}" data-relative-time="${r(a.created_at)}">${r(a.created_at)}</time>` : ""}
      </li>`;
    }).join("")}</ul>` : '<p class="text-gray-500">No recent activity</p>';
  }
  if (e === "esign.widget.agreement_stats") {
    const i = s, a = Number(i.total || 0), l = Number(i.pending || 0), d = Number(i.completed || 0), n = Number(i.voided || 0) + Number(i.declined || 0) + Number(i.expired || 0), o = a > 0 ? Math.round(d * 100 / a) : 0, u = String(i.list_url || "").trim();
    return `
      <div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-gray-900">${r(c(a))}</div>
            <div class="text-xs text-gray-500 uppercase tracking-wide">Total</div>
          </div>
          <div class="bg-blue-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-blue-700">${r(c(l))}</div>
            <div class="text-xs text-blue-600 uppercase tracking-wide">In Progress</div>
          </div>
          <div class="bg-green-50 rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-green-700">${r(c(d))}</div>
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
  if (e === "esign.widget.signing_activity") {
    const i = s, a = Array.isArray(i.activities) ? i.activities : [], l = String(i.activity_url || "").trim(), d = (n) => {
      const o = String(n || "").toLowerCase();
      return o === "signed" || o === "completed" ? "bg-green-500" : o === "viewed" ? "bg-purple-500" : o === "sent" ? "bg-blue-500" : o === "declined" ? "bg-orange-500" : o === "voided" || o === "expired" ? "bg-red-500" : "bg-gray-400";
    };
    return `
      ${a.length ? `
        <ul class="space-y-3">
          ${a.map((n) => `
            <li class="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
              <div class="flex-shrink-0 mt-0.5">
                <span class="w-2 h-2 inline-block rounded-full ${d(n.type)}" aria-hidden="true"></span>
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
      ${l ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${r(l)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Activity
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  if (e === "esign.widget.delivery_health") {
    const i = s, a = Math.max(0, Math.min(100, Number(i.email_success_rate ?? 100))), l = Math.max(0, Math.min(100, Number(i.job_success_rate ?? 100))), d = Number(i.pending_retries || 0), n = String(i.period || "").trim(), o = (p) => p >= 95 ? {
      text: "text-green-600",
      bar: "bg-green-500"
    } : p >= 80 ? {
      text: "text-yellow-600",
      bar: "bg-yellow-500"
    } : {
      text: "text-red-600",
      bar: "bg-red-500"
    }, u = o(a), g = o(l);
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
            <span>${r(c(i.emails_sent || 0))} sent</span>
            <span>${r(c(i.emails_failed || 0))} failed</span>
          </div>
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-gray-600">Job Processing</span>
            <span class="text-sm font-semibold ${g.text}">${l}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="h-2 rounded-full ${g.bar}" style="width: ${l}%"></div>
          </div>
          <div class="flex justify-between mt-1 text-xs text-gray-400">
            <span>${r(c(i.jobs_completed || 0))} completed</span>
            <span>${r(c(i.jobs_failed || 0))} failed</span>
          </div>
        </div>
        ${d > 0 ? `
          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ${r(c(d))} items pending retry
          </div>
        ` : ""}
      </div>
      ${n ? `<div class="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 text-center">Last ${r(n)}</div>` : ""}
    `;
  }
  if (e === "esign.widget.pending_signatures") {
    const i = s, a = Array.isArray(i.agreements) ? i.agreements : [], l = String(i.list_url || "").trim();
    return `
      ${a.length ? `
        <ul class="space-y-2">
          ${a.map((d) => {
      const n = Array.isArray(d.pending_recipients) ? d.pending_recipients : [];
      return `
              <li class="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                <div class="text-sm font-medium text-gray-900 truncate">
                  ${d.url ? `<a href="${r(d.url)}" class="hover:text-blue-600">${r(d.title || "Untitled")}</a>` : `${r(d.title || "Untitled")}`}
                </div>
                <div class="text-xs text-gray-500 mt-0.5">
                  ${r(c(d.pending_count || 0))} of ${r(c(d.total_recipients || 0))} signatures pending
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
      ${l ? `
        <div class="mt-3 pt-3 border-t border-gray-100 text-center">
          <a href="${r(l)}" class="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            View All Pending
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </a>
        </div>
      ` : ""}
    `;
  }
  return `<pre class="text-xs text-gray-600 overflow-auto">${r(JSON.stringify(s, null, 2))}</pre>`;
}
function k(t) {
  const e = t.metadata?.layout?.width || t.span || 12, s = t.data?.title || t.config?.title || t.title || y(t.definition);
  return `
    <article class="widget" data-widget="${r(t.id || t.definition || "")}" data-span="${r(e)}" style="--span: ${r(e)}">
      <div class="widget__header mb-4"><h3 class="text-lg font-semibold text-gray-900">${r(s)}</h3></div>
      <div class="widget__content">${_(t)}</div>
    </article>
  `;
}
function T(t) {
  const e = Array.isArray(t.widgets) ? t.widgets : [], s = t.empty_message || "No widgets configured for this tab.";
  return `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6">${e.length ? `<div class="widgets-grid" data-area-code="${r(t.area_code || "")}">${e.map(k).join("")}</div>` : `<p class="text-sm text-gray-500">${r(s)}</p>`}</div></div>`;
}
function A(t) {
  const e = t.record || {}, s = Array.isArray(t.fields) ? t.fields : [], i = e.username || e.display_name || e.id || "", a = e.email || "";
  return `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 bg-gray-50 border-b border-gray-200 flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-xl font-semibold text-blue-700">${r(String(e.username || e.display_name || e.email || e.id || "?").slice(0, 1).toUpperCase())}</div>
        <div>
          <h2 class="text-xl font-semibold text-gray-900">${r(i)}</h2>
          <p class="text-sm text-gray-500">${r(a)}</p>
        </div>
      </div>
      <div class="p-6">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">Details</div>
        <div class="grid grid-cols-2 gap-6">
          ${s.map((l) => `<div class="flex flex-col"><div class="text-sm text-gray-500 mb-1">${r(l.label)}</div><div class="text-base font-medium text-gray-900">${r(l.value ?? "-")}</div></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}
function S(t) {
  const e = t.href || "", s = t.panel || "panel";
  return e ? `
    <div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div class="p-6 space-y-4">
        <div class="text-xs uppercase tracking-wider text-gray-500 font-semibold">Linked Panel</div>
        <p class="text-sm text-gray-500">This tab links to the ${r(s)} panel.</p>
        <a href="${r(e)}" class="btn btn-secondary">Open panel</a>
      </div>
    </div>
  ` : '<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">Panel link unavailable.</div></div>';
}
function j(t) {
  return t.html ? t.html : `<div class="max-w-4xl bg-white border border-gray-200 rounded-xl overflow-hidden"><div class="p-6 text-sm text-gray-500">${t.template ? `Template tab "${r(t.template)}" requires server rendering.` : "Template tab is missing a template reference."}</div></div>`;
}
function C(t) {
  const e = t?.tab || t;
  return !e || !e.kind ? '<p class="text-sm text-gray-500">No content available.</p>' : e.kind === "dashboard_area" || e.kind === "cms_area" ? T(e) : e.kind === "details" ? A(t) : e.kind === "panel" ? S(e) : e.kind === "template" ? j(e) : '<p class="text-sm text-gray-500">Tab content unavailable.</p>';
}
var N = class {
  constructor(t, e, s = {}) {
    this.tabsNav = t, this.panelContainer = e, this.tabLinks = Array.from(t.querySelectorAll("[data-tab-id]")), this.basePath = (e.dataset.basePath || "").replace(/\/$/, ""), this.apiBasePath = (e.dataset.apiBasePath || "").replace(/\/$/, ""), this.panelName = e.dataset.panel || "", this.recordId = e.dataset.recordId || "", this.options = s, this.init();
  }
  init() {
    this.tabsNav.addEventListener("click", this.handleTabClick.bind(this)), m(this.panelContainer);
    const t = this.tabsNav.querySelector(".panel-tab-active");
    t?.dataset.renderMode === "client" && this.loadTab(t, { silent: !0 });
  }
  buildEndpoint(t, e) {
    if (!this.basePath || !this.panelName || !this.recordId || !e) return "";
    const s = encodeURIComponent(e), i = encodeURIComponent(this.recordId);
    return t === "json" ? `${this.apiBasePath || `${this.basePath}/api`}/${this.panelName}/${i}/tabs/${s}` : `${this.basePath}/${this.panelName}/${i}/tabs/${s}`;
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
    const s = t.dataset.renderMode || "", i = t.dataset.tabId || "";
    if (!s || !i) return !1;
    const a = t.getAttribute("href") || "";
    this.setActiveTab(i), e?.silent || this.updateUrl(a), this.panelContainer.innerHTML = '<p class="text-sm text-gray-500">Loading tab...</p>';
    try {
      if (s === "hybrid") {
        const l = this.buildEndpoint("html", i);
        if (!l) throw new Error("missing html endpoint");
        const d = await fetch(l, { headers: { "X-Requested-With": "XMLHttpRequest" } });
        if (!d.ok) throw new Error(`tab html ${d.status}`);
        return this.panelContainer.innerHTML = await d.text(), m(this.panelContainer), !0;
      }
      if (s === "client") {
        const l = this.buildEndpoint("json", i);
        if (!l) throw new Error("missing json endpoint");
        const d = await fetch(l, { headers: { Accept: "application/json" } });
        if (!d.ok) throw new Error(`tab json ${d.status}`);
        const n = await d.json();
        return this.panelContainer.innerHTML = C(n), m(this.panelContainer), !0;
      }
    } catch (l) {
      console.warn("[TabsController] Failed to load tab", l), this.options.onError?.(l), a && (window.location.href = a);
    }
    return !1;
  }
  getActiveTabId() {
    return this.panelContainer.dataset.activeTab || "";
  }
  switchToTab(t) {
    const e = this.tabLinks.find((s) => s.dataset.tabId === t);
    e && this.loadTab(e);
  }
};
function M(t) {
  const e = document.querySelector(".panel-tabs"), s = document.querySelector("[data-tab-panel-container]");
  return !e || !s ? null : new N(e, s, t);
}
export {
  N as TabsController,
  r as escapeHTML,
  v as formatAbsoluteTime,
  c as formatNumber,
  b as formatRelativeTime,
  m as hydrateTimeElements,
  M as initTabsController,
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