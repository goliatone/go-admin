import { escapeHTML as y } from "../shared/html.js";
import { httpRequest as C, readHTTPError as S } from "../shared/transport/http-client.js";
import { onReady as _ } from "../shared/dom-ready.js";
import { c as d, p as f, s as L, u as c } from "./dom-helpers-PJrpTqcW.js";
import { n as b, t as p } from "./page-feedback-jdwaGhAS.js";
import { D as E, E as O, O as D, c as R, y as x } from "./google-drive-utils-Cs9Gkuj9.js";
var $ = {
  "https://www.googleapis.com/auth/drive.readonly": {
    label: "Drive (Read Only)",
    description: "View files in your Google Drive"
  },
  openid: {
    label: "OpenID",
    description: "Verify your Google identity for account linking"
  },
  "https://www.googleapis.com/auth/userinfo.email": {
    label: "Account Email",
    description: "Read your Google account email address"
  },
  "https://www.googleapis.com/auth/drive.file": {
    label: "Drive (App Files)",
    description: "Access files opened with this app"
  },
  "drive.readonly": {
    label: "Drive (Read Only)",
    description: "View files in your Google Drive"
  },
  "userinfo.email": {
    label: "Account Email",
    description: "Read your Google account email address"
  },
  "drive.file": {
    label: "Drive (App Files)",
    description: "Access files opened with this app"
  }
}, k = class {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = O(new URLSearchParams(window.location.search), this.config.googleAccountId), this.elements = {
      loadingState: c("#loading-state"),
      disconnectedState: c("#disconnected-state"),
      connectedState: c("#connected-state"),
      errorState: c("#error-state"),
      statusBadge: c("#status-badge"),
      announcements: c("#integration-announcements"),
      accountIdInput: c("#account-id-input"),
      connectBtn: c("#connect-btn"),
      disconnectBtn: c("#disconnect-btn"),
      refreshBtn: c("#refresh-status-btn"),
      retryBtn: c("#retry-btn"),
      reauthBtn: c("#reauth-btn"),
      oauthModal: c("#oauth-modal"),
      oauthCancelBtn: c("#oauth-cancel-btn"),
      disconnectModal: c("#disconnect-modal"),
      disconnectCancelBtn: c("#disconnect-cancel-btn"),
      disconnectConfirmBtn: c("#disconnect-confirm-btn"),
      connectedEmail: c("#connected-email"),
      connectedAccountId: c("#connected-account-id"),
      scopesList: c("#scopes-list"),
      expiryInfo: c("#expiry-info"),
      reauthWarning: c("#reauth-warning"),
      reauthReason: c("#reauth-reason"),
      errorMessage: c("#error-message"),
      degradedWarning: c("#degraded-warning"),
      degradedReason: c("#degraded-reason"),
      importDriveLink: c("#import-drive-link"),
      integrationSettingsLink: c("#integration-settings-link"),
      accountDropdown: c("#account-dropdown"),
      accountsSection: c("#accounts-section"),
      accountsLoading: c("#accounts-loading"),
      accountsEmpty: c("#accounts-empty"),
      accountsGrid: c("#accounts-grid"),
      connectFirstBtn: c("#connect-first-btn")
    };
  }
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), await Promise.all([this.checkStatus(), this.loadAccounts()]);
  }
  setupEventListeners() {
    const { connectBtn: e, disconnectBtn: t, refreshBtn: n, retryBtn: o, reauthBtn: i, oauthCancelBtn: s, disconnectCancelBtn: r, disconnectConfirmBtn: l, accountIdInput: u, oauthModal: h, disconnectModal: a } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), i && i.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, a && f(a);
    }), r && r.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, a && d(a);
    }), l && l.addEventListener("click", () => this.disconnect()), s && s.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), o && o.addEventListener("click", () => this.checkStatus()), u && (u.addEventListener("change", () => {
      this.setCurrentAccountId(u.value, !0);
    }), u.addEventListener("keydown", (g) => {
      g.key === "Enter" && (g.preventDefault(), this.setCurrentAccountId(u.value, !0));
    }));
    const { accountDropdown: m, connectFirstBtn: w } = this.elements;
    m && m.addEventListener("change", () => {
      m.value === "__new__" ? (m.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(m.value, !0);
    }), w && w.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (g) => {
      g.key === "Escape" && (h && !h.classList.contains("hidden") && this.cancelOAuthFlow(), a && !a.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, d(a)));
    }), [h, a].forEach((g) => {
      g && g.addEventListener("click", (I) => {
        const A = I.target;
        (A === g || A.getAttribute("aria-hidden") === "true") && (d(g), g === h ? this.cancelOAuthFlow() : g === a && (this.pendingDisconnectAccountId = null));
      });
    });
  }
  setCurrentAccountId(e, t = !1) {
    const n = x(e);
    if (n === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    this.currentAccountId = n, this.updateAccountScopeUI(), t && this.checkStatus();
  }
  resolveNewAccountId() {
    const { accountIdInput: e } = this.elements, t = x(e?.value);
    return t ? this.accounts.some((n) => x(n.account_id) === t) ? "" : t : "";
  }
  startOAuthFlowForNewAccount() {
    const e = this.resolveNewAccountId();
    if (!e && this.accounts.length > 0) {
      b("Enter a unique account ID (for example: work) before connecting another account.", "error"), p(this.elements.announcements, "Enter a unique account ID before connecting another account");
      const { accountIdInput: t } = this.elements;
      t && (t.focus(), t.select());
      return;
    }
    e !== this.currentAccountId && this.setCurrentAccountId(e, !1), this.startOAuthFlow(e);
  }
  updateAccountScopeUI() {
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: o } = this.elements;
    e && document.activeElement !== e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), E(this.currentAccountId), D(this.currentAccountId), this.updateScopedLinks([n, o]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  updateScopedLinks(e) {
    e.forEach((t) => {
      if (!t) return;
      const n = t.dataset.baseHref || t.getAttribute("href");
      n && t.setAttribute("href", R(n, this.currentAccountId));
    });
  }
  buildScopedAPIURL(e, t = this.currentAccountId) {
    const n = new URL(`${this.apiBase}${e}`, window.location.origin);
    return n.searchParams.set("user_id", this.config.userId || ""), t && n.searchParams.set("account_id", t), n.toString();
  }
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: o, errorState: i } = this.elements;
    switch (d(t), d(n), d(o), d(i), e) {
      case "loading":
        f(t);
        break;
      case "disconnected":
        f(n);
        break;
      case "connected":
        f(o);
        break;
      case "error":
        f(i);
        break;
    }
  }
  updateStatusBadge(e, t = !1, n = !1) {
    const { statusBadge: o } = this.elements;
    if (o) {
      if (n) {
        o.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
          <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
          Degraded
        </span>
      `;
        return;
      }
      e ? t ? o.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <span class="w-2 h-2 rounded-full bg-amber-500" aria-hidden="true"></span>
            Expiring Soon
          </span>
        ` : o.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
            <span class="w-2 h-2 rounded-full bg-green-500" aria-hidden="true"></span>
            Connected
          </span>
        ` : o.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
          <span class="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true"></span>
          Not Connected
        </span>
      `;
    }
  }
  async checkStatus() {
    this.showState("loading");
    try {
      const e = await fetch(this.buildScopedAPIURL("/esign/integrations/google/status"), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!e.ok) {
        if (e.status === 404) {
          this.showState("disconnected"), this.updateStatusBadge(!1), p(this.elements.announcements, "Google Drive is not connected");
          return;
        }
        throw new Error(await S(e, `Failed to check status: ${e.status}`, { appendStatusToFallback: !1 }));
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const o = n.degraded === !0;
      this.renderDegradedState(o, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, o), p(this.elements.announcements, o ? "Google Drive connected with degraded provider health" : "Google Drive is connected")) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, o), p(this.elements.announcements, o ? "Google Drive integration is degraded" : "Google Drive is not connected"));
    } catch (e) {
      console.error("Error checking status:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred while checking the integration status."), this.showState("error"), this.renderDegradedState(!1, ""), this.updateStatusBadge(!1), p(this.elements.announcements, "Error checking Google Drive status");
    }
  }
  normalizeIntegrationPayload(e) {
    const t = (I, A) => {
      for (const v of I) if (Object.prototype.hasOwnProperty.call(e, v) && e[v] !== void 0 && e[v] !== null) return e[v];
      return A;
    }, n = t(["expires_at", "ExpiresAt"], ""), o = t(["scopes", "Scopes"], []), i = x(t(["account_id", "AccountID"], "")), s = t(["connected", "Connected"], !1), r = t(["degraded", "Degraded"], !1), l = t(["degraded_reason", "DegradedReason"], ""), u = t([
      "email",
      "user_email",
      "account_email",
      "AccountEmail"
    ], ""), h = t(["can_auto_refresh", "CanAutoRefresh"], !1), a = t([
      "needs_reauthorization",
      "NeedsReauthorization",
      "NeedsReauth"
    ], void 0);
    let m = t(["is_expired", "IsExpired"], void 0), w = t(["is_expiring_soon", "IsExpiringSoon"], void 0);
    if ((typeof m != "boolean" || typeof w != "boolean") && n) {
      const I = new Date(n);
      if (!Number.isNaN(I.getTime())) {
        const A = I.getTime() - Date.now(), v = 300 * 1e3;
        m = A <= 0, w = A > 0 && A <= v;
      }
    }
    const g = typeof a == "boolean" ? a : (m === !0 || w === !0) && !h;
    return {
      connected: s,
      account_id: i,
      email: u,
      scopes: Array.isArray(o) ? o : [],
      expires_at: n,
      is_expired: m === !0,
      is_expiring_soon: w === !0,
      can_auto_refresh: h,
      needs_reauthorization: g,
      degraded: r,
      degraded_reason: l
    };
  }
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: o, expiryInfo: i, reauthWarning: s, reauthReason: r } = this.elements;
    t && (t.textContent = e.email || "Connected"), n && (n.textContent = e.account_id || this.currentAccountId ? `Account ID: ${e.account_id || this.currentAccountId}` : "Account ID: default"), this.renderScopes(e.scopes || []), this.renderExpiry(e.expires_at, e.is_expired, e.is_expiring_soon, e.can_auto_refresh, e.needs_reauthorization);
  }
  renderScopes(e) {
    const { scopesList: t } = this.elements;
    if (t) {
      if (!e || e.length === 0) {
        t.innerHTML = '<li class="text-sm text-gray-500">No specific scopes granted</li>';
        return;
      }
      t.innerHTML = e.map((n) => {
        const o = $[n] || {
          label: n,
          description: ""
        };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${y(o.label)}</span>
            ${o.description ? `<p class="text-xs text-gray-500">${y(o.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  renderExpiry(e, t, n, o, i) {
    const { expiryInfo: s, reauthWarning: r, reauthReason: l } = this.elements;
    if (!s) return;
    if (s.classList.remove("text-red-600", "text-amber-600"), s.classList.add("text-gray-500"), !e) {
      s.textContent = "Access token status unknown", r && d(r);
      return;
    }
    const u = new Date(e), h = /* @__PURE__ */ new Date(), a = Math.max(1, Math.round((u.getTime() - h.getTime()) / (1e3 * 60)));
    t ? o ? (s.textContent = "Access token expired, but refresh is available and will be applied automatically.", s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), r && d(r)) : (s.textContent = "Access token has expired. Please re-authorize.", s.classList.remove("text-gray-500"), s.classList.add("text-red-600"), r && f(r), l && (l.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), o ? (s.textContent = `Token expires in approximately ${a} minute${a !== 1 ? "s" : ""}. Refresh is available automatically.`, r && d(r)) : (s.textContent = `Token expires in approximately ${a} minute${a !== 1 ? "s" : ""}`, r && f(r), l && (l.textContent = `Your access token will expire in ${a} minute${a !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (s.textContent = `Token valid until ${u.toLocaleDateString()} ${u.toLocaleTimeString()}`, r && d(r)), !i && r && d(r);
  }
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: o } = this.elements;
    n && (e ? (f(n), o && (o.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : d(n));
  }
  async loadAccounts() {
    try {
      const e = this.buildScopedAPIURL("/esign/integrations/google/accounts"), t = await fetch(e, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!t.ok) {
        console.warn("Failed to load accounts:", t.status), this.accounts = [], this.renderAccountDropdown(), this.renderAccountsGrid();
        return;
      }
      this.accounts = (await t.json()).accounts || [], this.updateAccountScopeUI();
    } catch (e) {
      console.error("Error loading accounts:", e), this.accounts = [], this.updateAccountScopeUI();
    }
  }
  renderAccountDropdown() {
    const { accountDropdown: e } = this.elements;
    if (!e) return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default Account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const n = /* @__PURE__ */ new Set([""]);
    for (const i of this.accounts) {
      const s = x(i.account_id);
      if (n.has(s)) continue;
      n.add(s);
      const r = document.createElement("option");
      r.value = s, r.textContent = `${i.email || s || "Default"}${i.status !== "connected" ? ` (${i.status})` : ""}`, s === this.currentAccountId && (r.selected = !0), e.appendChild(r);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const i = document.createElement("option");
      i.value = this.currentAccountId, i.textContent = `${this.currentAccountId} (new)`, i.selected = !0, e.appendChild(i);
    }
    const o = document.createElement("option");
    o.value = "__new__", o.textContent = "+ Connect New Account...", e.appendChild(o);
  }
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && d(e), this.accounts.length === 0) {
      t && f(t), n && d(n);
      return;
    }
    t && d(t), n && (f(n), n.innerHTML = this.accounts.map((o) => this.renderAccountCard(o)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
  }
  renderAccountCard(e) {
    const t = e.account_id === this.currentAccountId || e.is_default && !this.currentAccountId, n = {
      connected: "bg-green-50 border-green-200",
      expired: "bg-red-50 border-red-200",
      needs_reauth: "bg-amber-50 border-amber-200",
      degraded: "bg-gray-50 border-gray-200"
    }, o = {
      connected: "bg-green-100 text-green-700",
      expired: "bg-red-100 text-red-700",
      needs_reauth: "bg-amber-100 text-amber-700",
      degraded: "bg-gray-100 text-gray-700"
    }, i = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, s = t ? "ring-2 ring-blue-500" : "", r = n[e.status] || "bg-white border-gray-200", l = o[e.status] || "bg-gray-100 text-gray-700", u = i[e.status] || e.status, h = e.account_id || "default", a = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${r} ${s} border rounded-xl p-4 relative" data-account-id="${y(e.account_id)}">
        ${t ? '<span class="absolute top-2 right-2 text-xs font-medium text-blue-600">Active</span>' : ""}
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${e.status === "connected" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${y(a)}</p>
            <p class="text-xs text-gray-500">Account: ${y(h)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${l}">
              ${u}
            </span>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          ${t ? "" : '<button type="button" class="select-account-btn flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Select</button>'}
          ${e.status === "needs_reauth" || e.status === "expired" ? '<button type="button" class="reauth-account-btn flex-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Re-auth</button>' : ""}
          <button type="button" class="disconnect-account-btn text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50">Disconnect</button>
        </div>
      </div>
    `;
  }
  renderConnectNewCard() {
    return `
      <div class="account-card-new border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors min-h-[140px]" id="connect-new-card">
        <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-2">
          <svg class="w-5 h-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </div>
        <p class="text-sm font-medium text-gray-700">Connect New Account</p>
        <p class="text-xs text-gray-500 mt-1">Link another Google account</p>
      </div>
    `;
  }
  attachCardEventListeners() {
    const { accountsGrid: e, disconnectModal: t } = this.elements;
    if (!e) return;
    e.querySelectorAll(".select-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        const s = i.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        const s = i.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(s, !1), this.startOAuthFlow(s);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        this.pendingDisconnectAccountId = i.target.closest(".account-card")?.getAttribute("data-account-id") || "", t && f(t);
      });
    });
    const n = e.querySelector("#connect-new-card");
    n && n.addEventListener("click", () => this.startOAuthFlowForNewAccount());
  }
  async startOAuthFlow(e) {
    const { oauthModal: t, errorMessage: n } = this.elements;
    t && f(t);
    const o = this.resolveOAuthRedirectURI(), i = e !== void 0 ? x(e) : this.currentAccountId;
    this.pendingOAuthAccountId = i;
    const s = this.buildGoogleOAuthUrl(o, i);
    if (!s) {
      t && d(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), p(this.elements.announcements, "Google OAuth is not configured");
      return;
    }
    const r = 500, l = 600, u = (window.screen.width - r) / 2, h = (window.screen.height - l) / 2;
    if (this.oauthWindow = window.open(s, "google_oauth", `width=${r},height=${l},left=${u},top=${h},popup=yes`), !this.oauthWindow) {
      t && d(t), this.pendingOAuthAccountId = null, b("Popup blocked. Allow popups for this site and try again.", "error"), p(this.elements.announcements, "Popup blocked");
      return;
    }
    this.messageHandler = (a) => this.handleOAuthCallback(a), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && d(t), this.pendingOAuthAccountId = null, b("Google authorization timed out. Please try again.", "error"), p(this.elements.announcements, "Authorization timed out");
    }, 12e4);
  }
  resolveOAuthRedirectURI() {
    return this.config.googleRedirectUri ? this.config.googleRedirectUri : `${window.location.origin}${this.config.basePath}/esign/integrations/google/callback`;
  }
  isAllowedOAuthCallbackOrigin(e) {
    const t = this.normalizeOrigin(e);
    if (!t) return !1;
    const n = /* @__PURE__ */ new Set(), o = this.normalizeOrigin(window.location.origin);
    o && n.add(o);
    const i = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    i && n.add(i);
    for (const s of n) if (t === s || this.areEquivalentLoopbackOrigins(t, s)) return !0;
    return !1;
  }
  normalizeOrigin(e) {
    try {
      return new URL(e).origin;
    } catch {
      return "";
    }
  }
  resolveOriginFromURL(e) {
    try {
      return new URL(e).origin;
    } catch {
      return "";
    }
  }
  areEquivalentLoopbackOrigins(e, t) {
    try {
      const n = new URL(e), o = new URL(t);
      return n.protocol !== o.protocol || n.port !== o.port ? !1 : this.isLoopbackHost(n.hostname) && this.isLoopbackHost(o.hostname);
    } catch {
      return !1;
    }
  }
  isLoopbackHost(e) {
    const t = e.trim().toLowerCase();
    return t === "localhost" || t === "127.0.0.1" || t === "::1";
  }
  buildOAuthState(e) {
    const t = {
      user_id: this.config.userId || "",
      account_id: e || ""
    };
    return JSON.stringify(t);
  }
  buildGoogleOAuthUrl(e, t) {
    const n = this.config.googleClientId;
    if (!n) return null;
    const o = [
      "https://www.googleapis.com/auth/drive.readonly",
      "openid",
      "https://www.googleapis.com/auth/userinfo.email"
    ].join(" ");
    return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: n,
      redirect_uri: e,
      response_type: "code",
      scope: o,
      access_type: "offline",
      prompt: "consent",
      state: this.buildOAuthState(t)
    }).toString()}`;
  }
  async handleOAuthCallback(e) {
    if (!this.isAllowedOAuthCallbackOrigin(e.origin)) return;
    const t = e.data;
    if (t.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && d(n), this.closeOAuthWindow(), t.error) {
      b(`OAuth failed: ${t.error}`, "error"), p(this.elements.announcements, `OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const o = this.resolveOAuthRedirectURI(), i = (typeof t.account_id == "string" ? x(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        i !== this.currentAccountId && this.setCurrentAccountId(i, !1);
        const s = await C(this.buildScopedAPIURL("/esign/integrations/google/connect", i), {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            auth_code: t.code,
            account_id: i || void 0,
            redirect_uri: o
          })
        });
        if (!s.ok) throw new Error(await S(s, "Failed to connect", { appendStatusToFallback: !1 }));
        b("Google Drive connected successfully", "success"), p(this.elements.announcements, "Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (o) {
        console.error("Connect error:", o);
        const i = o instanceof Error ? o.message : "Unknown error";
        b(`Failed to connect: ${i}`, "error"), p(this.elements.announcements, `Failed to connect: ${i}`);
      } finally {
        this.pendingOAuthAccountId = null;
      }
      return;
    }
    this.pendingOAuthAccountId = null;
  }
  cancelOAuthFlow() {
    const { oauthModal: e } = this.elements;
    e && d(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
  }
  cleanupOAuthFlow() {
    this.oauthTimeout && (clearTimeout(this.oauthTimeout), this.oauthTimeout = null), this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null);
  }
  closeOAuthWindow() {
    if (this.oauthWindow) {
      try {
        this.oauthWindow.close();
      } catch {
      }
      this.oauthWindow = null;
    }
  }
  async disconnect() {
    const { disconnectModal: e } = this.elements;
    e && d(e);
    const t = this.pendingDisconnectAccountId ?? this.currentAccountId;
    try {
      const n = await C(this.buildScopedAPIURL("/esign/integrations/google/disconnect", t), {
        method: "POST",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!n.ok) throw new Error(await S(n, "Failed to disconnect", { appendStatusToFallback: !1 }));
      b("Google Drive disconnected", "success"), p(this.elements.announcements, "Google Drive disconnected"), t === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const o = n instanceof Error ? n.message : "Unknown error";
      b(`Failed to disconnect: ${o}`, "error"), p(this.elements.announcements, `Failed to disconnect: ${o}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
};
function z(e) {
  const t = new k(e);
  return _(() => t.init()), t;
}
function F(e) {
  const t = new k({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api`,
    userId: e.userId,
    googleAccountId: e.googleAccountId,
    googleRedirectUri: e.googleRedirectUri,
    googleClientId: e.googleClientId,
    googleEnabled: e.googleEnabled !== !1
  });
  _(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
function P(e) {
  const t = e.features && typeof e.features == "object" ? e.features : {}, n = e.context && typeof e.context == "object" ? e.context : {}, o = String(e.basePath || e.base_path || "").trim();
  return o ? {
    basePath: o,
    apiBasePath: String(e.apiBasePath || e.api_base_path || "").trim() || `${o}/api`,
    userId: String(e.userId || e.user_id || n.user_id || "").trim(),
    googleAccountId: String(e.googleAccountId || e.google_account_id || n.google_account_id || "").trim(),
    googleRedirectUri: String(e.googleRedirectUri || e.google_redirect_uri || n.google_redirect_uri || "").trim(),
    googleClientId: String(e.googleClientId || e.google_client_id || n.google_client_id || "").trim(),
    googleEnabled: !!(e.googleEnabled ?? t.google_enabled ?? !0)
  } : null;
}
typeof document < "u" && _(() => {
  if (!document.querySelector('[data-esign-page="admin.integrations.google"], [data-esign-page="google-integration"]')) return;
  const e = L("esign-page-config", "Google integration page config");
  if (!e) return;
  const t = P(e);
  t && F(t);
});
export {
  F as n,
  z as r,
  k as t
};

//# sourceMappingURL=google-integration-1ahZw_Z3.js.map