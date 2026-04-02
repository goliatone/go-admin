import { j as E, b as r, s as m, h as u } from "../chunks/dom-helpers-Cd24RS2-.js";
import { s as w, a as f } from "../chunks/page-feedback-GAI02g1h.js";
import { readHTTPError as C, httpRequest as k } from "../shared/transport/http-client.js";
import { r as O, o as I, s as D, t as R, p as $ } from "../chunks/google-drive-utils-DVyZvmUh.js";
import { escapeHTML as S } from "../shared/html.js";
import { onReady as _ } from "../shared/dom-ready.js";
const F = {
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
};
class L {
  constructor(e) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = O(
      new URLSearchParams(window.location.search),
      this.config.googleAccountId
    ), this.elements = {
      loadingState: r("#loading-state"),
      disconnectedState: r("#disconnected-state"),
      connectedState: r("#connected-state"),
      errorState: r("#error-state"),
      statusBadge: r("#status-badge"),
      announcements: r("#integration-announcements"),
      accountIdInput: r("#account-id-input"),
      connectBtn: r("#connect-btn"),
      disconnectBtn: r("#disconnect-btn"),
      refreshBtn: r("#refresh-status-btn"),
      retryBtn: r("#retry-btn"),
      reauthBtn: r("#reauth-btn"),
      oauthModal: r("#oauth-modal"),
      oauthCancelBtn: r("#oauth-cancel-btn"),
      disconnectModal: r("#disconnect-modal"),
      disconnectCancelBtn: r("#disconnect-cancel-btn"),
      disconnectConfirmBtn: r("#disconnect-confirm-btn"),
      connectedEmail: r("#connected-email"),
      connectedAccountId: r("#connected-account-id"),
      scopesList: r("#scopes-list"),
      expiryInfo: r("#expiry-info"),
      reauthWarning: r("#reauth-warning"),
      reauthReason: r("#reauth-reason"),
      errorMessage: r("#error-message"),
      degradedWarning: r("#degraded-warning"),
      degradedReason: r("#degraded-reason"),
      importDriveLink: r("#import-drive-link"),
      integrationSettingsLink: r("#integration-settings-link"),
      // Option A - Dropdown
      accountDropdown: r("#account-dropdown"),
      // Option B - Cards Grid
      accountsSection: r("#accounts-section"),
      accountsLoading: r("#accounts-loading"),
      accountsEmpty: r("#accounts-empty"),
      accountsGrid: r("#accounts-grid"),
      connectFirstBtn: r("#connect-first-btn")
    };
  }
  /**
   * Initialize the integration page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), await Promise.all([this.checkStatus(), this.loadAccounts()]);
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    const {
      connectBtn: e,
      disconnectBtn: t,
      refreshBtn: n,
      retryBtn: o,
      reauthBtn: c,
      oauthCancelBtn: s,
      disconnectCancelBtn: i,
      disconnectConfirmBtn: h,
      accountIdInput: l,
      oauthModal: g,
      disconnectModal: d
    } = this.elements;
    e && e.addEventListener("click", () => this.startOAuthFlow()), c && c.addEventListener("click", () => this.startOAuthFlow()), t && t.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, d && m(d);
    }), i && i.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, d && u(d);
    }), h && h.addEventListener("click", () => this.disconnect()), s && s.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), o && o.addEventListener("click", () => this.checkStatus()), l && (l.addEventListener("change", () => {
      this.setCurrentAccountId(l.value, !0);
    }), l.addEventListener("keydown", (p) => {
      p.key === "Enter" && (p.preventDefault(), this.setCurrentAccountId(l.value, !0));
    }));
    const { accountDropdown: A, connectFirstBtn: x } = this.elements;
    A && A.addEventListener("change", () => {
      A.value === "__new__" ? (A.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(A.value, !0);
    }), x && x.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (p) => {
      p.key === "Escape" && (g && !g.classList.contains("hidden") && this.cancelOAuthFlow(), d && !d.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, u(d)));
    }), [g, d].forEach((p) => {
      p && p.addEventListener("click", (v) => {
        const b = v.target;
        (b === p || b.getAttribute("aria-hidden") === "true") && (u(p), p === g ? this.cancelOAuthFlow() : p === d && (this.pendingDisconnectAccountId = null));
      });
    });
  }
  /**
   * Set current account ID and optionally refresh status
   */
  setCurrentAccountId(e, t = !1) {
    const n = I(e);
    if (n === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    this.currentAccountId = n, this.updateAccountScopeUI(), t && this.checkStatus();
  }
  /**
   * Resolve account ID for "connect new account" flow
   */
  resolveNewAccountId() {
    const { accountIdInput: e } = this.elements, t = I(e?.value);
    return t ? this.accounts.some(
      (o) => I(o.account_id) === t
    ) ? "" : t : "";
  }
  /**
   * Start OAuth flow using a new/manual account ID
   */
  startOAuthFlowForNewAccount() {
    const e = this.resolveNewAccountId();
    if (!e && this.accounts.length > 0) {
      w(
        "Enter a unique account ID (for example: work) before connecting another account.",
        "error"
      ), f(
        this.elements.announcements,
        "Enter a unique account ID before connecting another account"
      );
      const { accountIdInput: t } = this.elements;
      t && (t.focus(), t.select());
      return;
    }
    e !== this.currentAccountId && this.setCurrentAccountId(e, !1), this.startOAuthFlow(e);
  }
  /**
   * Update UI elements related to account scope
   */
  updateAccountScopeUI() {
    const { accountIdInput: e, connectedAccountId: t, importDriveLink: n, integrationSettingsLink: o } = this.elements;
    e && document.activeElement !== e && (e.value = this.currentAccountId), t && (t.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), D(this.currentAccountId), R(this.currentAccountId), this.updateScopedLinks([n, o]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Update scoped links with current account ID
   */
  updateScopedLinks(e) {
    e.forEach((t) => {
      if (!t) return;
      const n = t.dataset.baseHref || t.getAttribute("href");
      n && t.setAttribute("href", $(n, this.currentAccountId));
    });
  }
  /**
   * Build API URL with user/account scope
   */
  buildScopedAPIURL(e, t = this.currentAccountId) {
    const n = new URL(`${this.apiBase}${e}`, window.location.origin);
    return n.searchParams.set("user_id", this.config.userId || ""), t && n.searchParams.set("account_id", t), n.toString();
  }
  /**
   * Show a specific state and hide others
   */
  showState(e) {
    const { loadingState: t, disconnectedState: n, connectedState: o, errorState: c } = this.elements;
    switch (u(t), u(n), u(o), u(c), e) {
      case "loading":
        m(t);
        break;
      case "disconnected":
        m(n);
        break;
      case "connected":
        m(o);
        break;
      case "error":
        m(c);
        break;
    }
  }
  /**
   * Update status badge
   */
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
  /**
   * Check integration status from API
   */
  async checkStatus() {
    this.showState("loading");
    try {
      const e = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/status"),
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!e.ok) {
        if (e.status === 404) {
          this.showState("disconnected"), this.updateStatusBadge(!1), f(this.elements.announcements, "Google Drive is not connected");
          return;
        }
        throw new Error(await C(e, `Failed to check status: ${e.status}`, {
          appendStatusToFallback: !1
        }));
      }
      const t = await e.json(), n = this.normalizeIntegrationPayload(t.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const o = n.degraded === !0;
      this.renderDegradedState(o, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, o), f(
        this.elements.announcements,
        o ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, o), f(
        this.elements.announcements,
        o ? "Google Drive integration is degraded" : "Google Drive is not connected"
      ));
    } catch (e) {
      console.error("Error checking status:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred while checking the integration status."), this.showState("error"), this.renderDegradedState(!1, ""), this.updateStatusBadge(!1), f(this.elements.announcements, "Error checking Google Drive status");
    }
  }
  /**
   * Normalize integration payload from API (handles both camelCase and snake_case)
   */
  normalizeIntegrationPayload(e) {
    const t = (v, b) => {
      for (const y of v)
        if (Object.prototype.hasOwnProperty.call(e, y) && e[y] !== void 0 && e[y] !== null)
          return e[y];
      return b;
    }, n = t(["expires_at", "ExpiresAt"], ""), o = t(["scopes", "Scopes"], []), c = I(
      t(["account_id", "AccountID"], "")
    ), s = t(["connected", "Connected"], !1), i = t(["degraded", "Degraded"], !1), h = t(["degraded_reason", "DegradedReason"], ""), l = t(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), g = t(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), d = t(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let A = t(["is_expired", "IsExpired"], void 0), x = t(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof A != "boolean" || typeof x != "boolean") && n) {
      const v = new Date(n);
      if (!Number.isNaN(v.getTime())) {
        const b = v.getTime() - Date.now(), y = 5 * 60 * 1e3;
        A = b <= 0, x = b > 0 && b <= y;
      }
    }
    const p = typeof d == "boolean" ? d : (A === !0 || x === !0) && !g;
    return {
      connected: s,
      account_id: c,
      email: l,
      scopes: Array.isArray(o) ? o : [],
      expires_at: n,
      is_expired: A === !0,
      is_expiring_soon: x === !0,
      can_auto_refresh: g,
      needs_reauthorization: p,
      degraded: i,
      degraded_reason: h
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(e) {
    const { connectedEmail: t, connectedAccountId: n, scopesList: o, expiryInfo: c, reauthWarning: s, reauthReason: i } = this.elements;
    t && (t.textContent = e.email || "Connected"), n && (n.textContent = e.account_id || this.currentAccountId ? `Account ID: ${e.account_id || this.currentAccountId}` : "Account ID: default"), this.renderScopes(e.scopes || []), this.renderExpiry(
      e.expires_at,
      e.is_expired,
      e.is_expiring_soon,
      e.can_auto_refresh,
      e.needs_reauthorization
    );
  }
  /**
   * Render scopes list
   */
  renderScopes(e) {
    const { scopesList: t } = this.elements;
    if (t) {
      if (!e || e.length === 0) {
        t.innerHTML = '<li class="text-sm text-gray-500">No specific scopes granted</li>';
        return;
      }
      t.innerHTML = e.map((n) => {
        const o = F[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${S(o.label)}</span>
            ${o.description ? `<p class="text-xs text-gray-500">${S(o.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(e, t, n, o, c) {
    const { expiryInfo: s, reauthWarning: i, reauthReason: h } = this.elements;
    if (!s) return;
    if (s.classList.remove("text-red-600", "text-amber-600"), s.classList.add("text-gray-500"), !e) {
      s.textContent = "Access token status unknown", i && u(i);
      return;
    }
    const l = new Date(e), g = /* @__PURE__ */ new Date(), d = Math.max(
      1,
      Math.round((l.getTime() - g.getTime()) / (1e3 * 60))
    );
    t ? o ? (s.textContent = "Access token expired, but refresh is available and will be applied automatically.", s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), i && u(i)) : (s.textContent = "Access token has expired. Please re-authorize.", s.classList.remove("text-gray-500"), s.classList.add("text-red-600"), i && m(i), h && (h.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), o ? (s.textContent = `Token expires in approximately ${d} minute${d !== 1 ? "s" : ""}. Refresh is available automatically.`, i && u(i)) : (s.textContent = `Token expires in approximately ${d} minute${d !== 1 ? "s" : ""}`, i && m(i), h && (h.textContent = `Your access token will expire in ${d} minute${d !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (s.textContent = `Token valid until ${l.toLocaleDateString()} ${l.toLocaleTimeString()}`, i && u(i)), !c && i && u(i);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(e, t) {
    const { degradedWarning: n, degradedReason: o } = this.elements;
    n && (e ? (m(n), o && (o.textContent = t || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : u(n));
  }
  // Account Management Methods
  /**
   * Load all connected Google accounts
   */
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
      const n = await t.json();
      this.accounts = n.accounts || [], this.updateAccountScopeUI();
    } catch (e) {
      console.error("Error loading accounts:", e), this.accounts = [], this.updateAccountScopeUI();
    }
  }
  /**
   * Render the account dropdown (Option A)
   */
  renderAccountDropdown() {
    const { accountDropdown: e } = this.elements;
    if (!e) return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default Account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const n = /* @__PURE__ */ new Set([""]);
    for (const c of this.accounts) {
      const s = I(c.account_id);
      if (n.has(s))
        continue;
      n.add(s);
      const i = document.createElement("option");
      i.value = s;
      const h = c.email || s || "Default", l = c.status !== "connected" ? ` (${c.status})` : "";
      i.textContent = `${h}${l}`, s === this.currentAccountId && (i.selected = !0), e.appendChild(i);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const c = document.createElement("option");
      c.value = this.currentAccountId, c.textContent = `${this.currentAccountId} (new)`, c.selected = !0, e.appendChild(c);
    }
    const o = document.createElement("option");
    o.value = "__new__", o.textContent = "+ Connect New Account...", e.appendChild(o);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: e, accountsEmpty: t, accountsGrid: n } = this.elements;
    if (e && u(e), this.accounts.length === 0) {
      t && m(t), n && u(n);
      return;
    }
    t && u(t), n && (m(n), n.innerHTML = this.accounts.map((o) => this.renderAccountCard(o)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
  }
  /**
   * Render a single account card
   */
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
    }, c = {
      connected: "Connected",
      expired: "Expired",
      needs_reauth: "Re-auth needed",
      degraded: "Degraded"
    }, s = t ? "ring-2 ring-blue-500" : "", i = n[e.status] || "bg-white border-gray-200", h = o[e.status] || "bg-gray-100 text-gray-700", l = c[e.status] || e.status, g = e.account_id || "default", d = e.email || (e.account_id ? e.account_id : "Default account");
    return `
      <div class="account-card ${i} ${s} border rounded-xl p-4 relative" data-account-id="${S(e.account_id)}">
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
            <p class="text-sm font-medium text-gray-900 truncate">${S(d)}</p>
            <p class="text-xs text-gray-500">Account: ${S(g)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${h}">
              ${l}
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
  /**
   * Render the "Connect New Account" card
   */
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
  /**
   * Attach event listeners to account cards
   */
  attachCardEventListeners() {
    const { accountsGrid: e, disconnectModal: t } = this.elements;
    if (!e) return;
    e.querySelectorAll(".select-account-btn").forEach((o) => {
      o.addEventListener("click", (c) => {
        const i = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(i, !0);
      });
    }), e.querySelectorAll(".reauth-account-btn").forEach((o) => {
      o.addEventListener("click", (c) => {
        const i = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(i, !1), this.startOAuthFlow(i);
      });
    }), e.querySelectorAll(".disconnect-account-btn").forEach((o) => {
      o.addEventListener("click", (c) => {
        const i = c.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = i, t && m(t);
      });
    });
    const n = e.querySelector("#connect-new-card");
    n && n.addEventListener("click", () => this.startOAuthFlowForNewAccount());
  }
  /**
   * Escape HTML for safe rendering
   */
  // OAuth Flow Methods
  /**
   * Start OAuth flow
   */
  async startOAuthFlow(e) {
    const { oauthModal: t, errorMessage: n } = this.elements;
    t && m(t);
    const o = this.resolveOAuthRedirectURI(), c = e !== void 0 ? I(e) : this.currentAccountId;
    this.pendingOAuthAccountId = c;
    const s = this.buildGoogleOAuthUrl(o, c);
    if (!s) {
      t && u(t), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), f(this.elements.announcements, "Google OAuth is not configured");
      return;
    }
    const i = 500, h = 600, l = (window.screen.width - i) / 2, g = (window.screen.height - h) / 2;
    if (this.oauthWindow = window.open(
      s,
      "google_oauth",
      `width=${i},height=${h},left=${l},top=${g},popup=yes`
    ), !this.oauthWindow) {
      t && u(t), this.pendingOAuthAccountId = null, w("Popup blocked. Allow popups for this site and try again.", "error"), f(this.elements.announcements, "Popup blocked");
      return;
    }
    this.messageHandler = (d) => this.handleOAuthCallback(d), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), t && u(t), this.pendingOAuthAccountId = null, w("Google authorization timed out. Please try again.", "error"), f(this.elements.announcements, "Authorization timed out");
    }, 12e4);
  }
  /**
   * Resolve OAuth redirect URI
   */
  resolveOAuthRedirectURI() {
    return this.config.googleRedirectUri ? this.config.googleRedirectUri : `${window.location.origin}${this.config.basePath}/esign/integrations/google/callback`;
  }
  /**
   * Validate callback origin for popup postMessage events.
   * Allows exact origin match and localhost/loopback-equivalent origins.
   */
  isAllowedOAuthCallbackOrigin(e) {
    const t = this.normalizeOrigin(e);
    if (!t) return !1;
    const n = /* @__PURE__ */ new Set(), o = this.normalizeOrigin(window.location.origin);
    o && n.add(o);
    const c = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    c && n.add(c);
    for (const s of n)
      if (t === s || this.areEquivalentLoopbackOrigins(t, s))
        return !0;
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
  /**
   * Build OAuth state parameter
   */
  buildOAuthState(e) {
    const t = {
      user_id: this.config.userId || "",
      account_id: e || ""
    };
    return JSON.stringify(t);
  }
  /**
   * Build Google OAuth URL
   */
  buildGoogleOAuthUrl(e, t) {
    const n = this.config.googleClientId;
    if (!n)
      return null;
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
  /**
   * Handle OAuth callback message
   */
  async handleOAuthCallback(e) {
    if (!this.isAllowedOAuthCallbackOrigin(e.origin)) return;
    const t = e.data;
    if (t.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && u(n), this.closeOAuthWindow(), t.error) {
      w(`OAuth failed: ${t.error}`, "error"), f(this.elements.announcements, `OAuth failed: ${t.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (t.code) {
      try {
        const o = this.resolveOAuthRedirectURI(), s = (typeof t.account_id == "string" ? I(t.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        s !== this.currentAccountId && this.setCurrentAccountId(s, !1);
        const i = await k(
          this.buildScopedAPIURL("/esign/integrations/google/connect", s),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: t.code,
              account_id: s || void 0,
              redirect_uri: o
            })
          }
        );
        if (!i.ok)
          throw new Error(await C(i, "Failed to connect", {
            appendStatusToFallback: !1
          }));
        w("Google Drive connected successfully", "success"), f(this.elements.announcements, "Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (o) {
        console.error("Connect error:", o);
        const c = o instanceof Error ? o.message : "Unknown error";
        w(`Failed to connect: ${c}`, "error"), f(this.elements.announcements, `Failed to connect: ${c}`);
      } finally {
        this.pendingOAuthAccountId = null;
      }
      return;
    }
    this.pendingOAuthAccountId = null;
  }
  /**
   * Cancel OAuth flow
   */
  cancelOAuthFlow() {
    const { oauthModal: e } = this.elements;
    e && u(e), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
  }
  /**
   * Cleanup OAuth flow resources
   */
  cleanupOAuthFlow() {
    this.oauthTimeout && (clearTimeout(this.oauthTimeout), this.oauthTimeout = null), this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null);
  }
  /**
   * Close OAuth popup window
   */
  closeOAuthWindow() {
    if (this.oauthWindow) {
      try {
        this.oauthWindow.close();
      } catch {
      }
      this.oauthWindow = null;
    }
  }
  /**
   * Disconnect Google account
   */
  async disconnect() {
    const { disconnectModal: e } = this.elements;
    e && u(e);
    const t = this.pendingDisconnectAccountId ?? this.currentAccountId;
    try {
      const n = await k(
        this.buildScopedAPIURL("/esign/integrations/google/disconnect", t),
        {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!n.ok)
        throw new Error(await C(n, "Failed to disconnect", {
          appendStatusToFallback: !1
        }));
      w("Google Drive disconnected", "success"), f(this.elements.announcements, "Google Drive disconnected"), t === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const o = n instanceof Error ? n.message : "Unknown error";
      w(`Failed to disconnect: ${o}`, "error"), f(this.elements.announcements, `Failed to disconnect: ${o}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
}
function N(a) {
  const e = new L(a);
  return _(() => e.init()), e;
}
function P(a) {
  const e = {
    basePath: a.basePath,
    apiBasePath: a.apiBasePath || `${a.basePath}/api`,
    userId: a.userId,
    googleAccountId: a.googleAccountId,
    googleRedirectUri: a.googleRedirectUri,
    googleClientId: a.googleClientId,
    googleEnabled: a.googleEnabled !== !1
  }, t = new L(e);
  _(() => t.init()), typeof window < "u" && (window.esignGoogleIntegrationController = t);
}
function B(a) {
  const e = a.features && typeof a.features == "object" ? a.features : {}, t = a.context && typeof a.context == "object" ? a.context : {}, n = String(a.basePath || a.base_path || "").trim();
  return n ? {
    basePath: n,
    apiBasePath: String(a.apiBasePath || a.api_base_path || "").trim() || `${n}/api`,
    userId: String(a.userId || a.user_id || t.user_id || "").trim(),
    googleAccountId: String(
      a.googleAccountId || a.google_account_id || t.google_account_id || ""
    ).trim(),
    googleRedirectUri: String(
      a.googleRedirectUri || a.google_redirect_uri || t.google_redirect_uri || ""
    ).trim(),
    googleClientId: String(
      a.googleClientId || a.google_client_id || t.google_client_id || ""
    ).trim(),
    googleEnabled: !!(a.googleEnabled ?? e.google_enabled ?? !0)
  } : null;
}
typeof document < "u" && _(() => {
  if (!document.querySelector(
    '[data-esign-page="admin.integrations.google"], [data-esign-page="google-integration"]'
  )) return;
  const e = E(
    "esign-page-config",
    "Google integration page config"
  );
  if (!e)
    return;
  const t = B(e);
  t && P(t);
});
export {
  L as GoogleIntegrationController,
  P as bootstrapGoogleIntegration,
  N as initGoogleIntegration
};
//# sourceMappingURL=google-integration.js.map
