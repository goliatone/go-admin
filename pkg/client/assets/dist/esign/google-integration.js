import { f as v, b as r, s as f, h as u, a as S } from "../chunks/dom-helpers-CMRVXsMj.js";
import { escapeHTML as x } from "../shared/html.js";
const y = "esign.google.account_id", C = {
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
class _ {
  constructor(t) {
    this.accounts = [], this.oauthWindow = null, this.oauthTimeout = null, this.pendingOAuthAccountId = null, this.pendingDisconnectAccountId = null, this.messageHandler = null, this.config = t, this.apiBase = t.apiBasePath || `${t.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      connectBtn: t,
      disconnectBtn: e,
      refreshBtn: n,
      retryBtn: o,
      reauthBtn: i,
      oauthCancelBtn: s,
      disconnectCancelBtn: c,
      disconnectConfirmBtn: l,
      accountIdInput: h,
      oauthModal: g,
      disconnectModal: d
    } = this.elements;
    t && t.addEventListener("click", () => this.startOAuthFlow()), i && i.addEventListener("click", () => this.startOAuthFlow()), e && e.addEventListener("click", () => {
      this.pendingDisconnectAccountId = this.currentAccountId, d && f(d);
    }), c && c.addEventListener("click", () => {
      this.pendingDisconnectAccountId = null, d && u(d);
    }), l && l.addEventListener("click", () => this.disconnect()), s && s.addEventListener("click", () => this.cancelOAuthFlow()), n && n.addEventListener("click", () => this.checkStatus()), o && o.addEventListener("click", () => this.checkStatus()), h && (h.addEventListener("change", () => {
      this.setCurrentAccountId(h.value, !0);
    }), h.addEventListener("keydown", (p) => {
      p.key === "Enter" && (p.preventDefault(), this.setCurrentAccountId(h.value, !0));
    }));
    const { accountDropdown: m, connectFirstBtn: w } = this.elements;
    m && m.addEventListener("change", () => {
      m.value === "__new__" ? (m.value = this.currentAccountId, this.startOAuthFlowForNewAccount()) : this.setCurrentAccountId(m.value, !0);
    }), w && w.addEventListener("click", () => this.startOAuthFlowForNewAccount()), document.addEventListener("keydown", (p) => {
      p.key === "Escape" && (g && !g.classList.contains("hidden") && this.cancelOAuthFlow(), d && !d.classList.contains("hidden") && (this.pendingDisconnectAccountId = null, u(d)));
    }), [g, d].forEach((p) => {
      p && p.addEventListener("click", (b) => {
        const A = b.target;
        (A === p || A.getAttribute("aria-hidden") === "true") && (u(p), p === g ? this.cancelOAuthFlow() : p === d && (this.pendingDisconnectAccountId = null));
      });
    });
  }
  /**
   * Resolve initial account ID from various sources
   */
  resolveInitialAccountId() {
    const t = new URLSearchParams(window.location.search), e = this.normalizeAccountId(t.get("account_id"));
    if (e)
      return e;
    const n = this.normalizeAccountId(this.config.googleAccountId);
    if (n)
      return n;
    try {
      return this.normalizeAccountId(
        window.localStorage.getItem(y)
      );
    } catch {
      return "";
    }
  }
  /**
   * Normalize account ID value
   */
  normalizeAccountId(t) {
    return (t || "").trim();
  }
  /**
   * Set current account ID and optionally refresh status
   */
  setCurrentAccountId(t, e = !1) {
    const n = this.normalizeAccountId(t);
    if (n === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    this.currentAccountId = n, this.updateAccountScopeUI(), e && this.checkStatus();
  }
  /**
   * Resolve account ID for "connect new account" flow
   */
  resolveNewAccountId() {
    const { accountIdInput: t } = this.elements, e = this.normalizeAccountId(t?.value);
    return e ? this.accounts.some(
      (o) => this.normalizeAccountId(o.account_id) === e
    ) ? "" : e : "";
  }
  /**
   * Start OAuth flow using a new/manual account ID
   */
  startOAuthFlowForNewAccount() {
    const t = this.resolveNewAccountId();
    if (!t && this.accounts.length > 0) {
      this.showToast(
        "Enter a unique account ID (for example: work) before connecting another account.",
        "error"
      ), this.announce("Enter a unique account ID before connecting another account");
      const { accountIdInput: e } = this.elements;
      e && (e.focus(), e.select());
      return;
    }
    t !== this.currentAccountId && this.setCurrentAccountId(t, !1), this.startOAuthFlow(t);
  }
  /**
   * Update UI elements related to account scope
   */
  updateAccountScopeUI() {
    const { accountIdInput: t, connectedAccountId: e, importDriveLink: n, integrationSettingsLink: o } = this.elements;
    t && document.activeElement !== t && (t.value = this.currentAccountId), e && (e.textContent = this.currentAccountId ? `Account ID: ${this.currentAccountId}` : "Account ID: default"), this.persistAccountId(), this.syncAccountIdInURL(), this.updateScopedLinks([n, o]), this.renderAccountDropdown(), this.renderAccountsGrid();
  }
  /**
   * Persist account ID to localStorage
   */
  persistAccountId() {
    try {
      this.currentAccountId ? window.localStorage.setItem(y, this.currentAccountId) : window.localStorage.removeItem(y);
    } catch {
    }
  }
  /**
   * Sync account ID to URL without navigation
   */
  syncAccountIdInURL() {
    const t = new URL(window.location.href);
    this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), window.history.replaceState({}, "", t.toString());
  }
  /**
   * Update scoped links with current account ID
   */
  updateScopedLinks(t) {
    t.forEach((e) => {
      if (!e) return;
      const n = e.dataset.baseHref || e.getAttribute("href");
      n && e.setAttribute("href", this.applyAccountIdToPath(n));
    });
  }
  /**
   * Apply account ID to a path/URL
   */
  applyAccountIdToPath(t) {
    const e = new URL(t, window.location.origin);
    return this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), `${e.pathname}${e.search}${e.hash}`;
  }
  /**
   * Build API URL with user/account scope
   */
  buildScopedAPIURL(t, e = this.currentAccountId) {
    const n = new URL(`${this.apiBase}${t}`, window.location.origin);
    return n.searchParams.set("user_id", this.config.userId || ""), e && n.searchParams.set("account_id", e), n.toString();
  }
  /**
   * Announce message to screen readers
   */
  announce(t) {
    const { announcements: e } = this.elements;
    e && (e.textContent = t), S(t);
  }
  /**
   * Show a specific state and hide others
   */
  showState(t) {
    const { loadingState: e, disconnectedState: n, connectedState: o, errorState: i } = this.elements;
    switch (u(e), u(n), u(o), u(i), t) {
      case "loading":
        f(e);
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
  /**
   * Update status badge
   */
  updateStatusBadge(t, e = !1, n = !1) {
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
      t ? e ? o.innerHTML = `
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
      const t = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/status"),
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!t.ok) {
        if (t.status === 404) {
          this.showState("disconnected"), this.updateStatusBadge(!1), this.announce("Google Drive is not connected");
          return;
        }
        let i = `Failed to check status: ${t.status}`;
        try {
          const s = await t.json();
          s?.error?.message && (i = s.error.message);
        } catch {
        }
        throw new Error(i);
      }
      const e = await t.json(), n = this.normalizeIntegrationPayload(e.integration || {});
      !this.currentAccountId && n.account_id && (this.currentAccountId = n.account_id, this.updateAccountScopeUI());
      const o = n.degraded === !0;
      this.renderDegradedState(o, n.degraded_reason), n.connected ? (this.renderConnectedState(n), this.showState("connected"), this.updateStatusBadge(!0, n.needs_reauthorization, o), this.announce(
        o ? "Google Drive connected with degraded provider health" : "Google Drive is connected"
      )) : (this.showState("disconnected"), this.updateStatusBadge(!1, !1, o), this.announce(
        o ? "Google Drive integration is degraded" : "Google Drive is not connected"
      ));
    } catch (t) {
      console.error("Error checking status:", t);
      const { errorMessage: e } = this.elements;
      e && (e.textContent = t instanceof Error ? t.message : "An error occurred while checking the integration status."), this.showState("error"), this.renderDegradedState(!1, ""), this.updateStatusBadge(!1), this.announce("Error checking Google Drive status");
    }
  }
  /**
   * Normalize integration payload from API (handles both camelCase and snake_case)
   */
  normalizeIntegrationPayload(t) {
    const e = (b, A) => {
      for (const I of b)
        if (Object.prototype.hasOwnProperty.call(t, I) && t[I] !== void 0 && t[I] !== null)
          return t[I];
      return A;
    }, n = e(["expires_at", "ExpiresAt"], ""), o = e(["scopes", "Scopes"], []), i = this.normalizeAccountId(
      e(["account_id", "AccountID"], "")
    ), s = e(["connected", "Connected"], !1), c = e(["degraded", "Degraded"], !1), l = e(["degraded_reason", "DegradedReason"], ""), h = e(
      ["email", "user_email", "account_email", "AccountEmail"],
      ""
    ), g = e(
      ["can_auto_refresh", "CanAutoRefresh"],
      !1
    ), d = e(
      ["needs_reauthorization", "NeedsReauthorization", "NeedsReauth"],
      void 0
    );
    let m = e(["is_expired", "IsExpired"], void 0), w = e(
      ["is_expiring_soon", "IsExpiringSoon"],
      void 0
    );
    if ((typeof m != "boolean" || typeof w != "boolean") && n) {
      const b = new Date(n);
      if (!Number.isNaN(b.getTime())) {
        const A = b.getTime() - Date.now(), I = 5 * 60 * 1e3;
        m = A <= 0, w = A > 0 && A <= I;
      }
    }
    const p = typeof d == "boolean" ? d : (m === !0 || w === !0) && !g;
    return {
      connected: s,
      account_id: i,
      email: h,
      scopes: Array.isArray(o) ? o : [],
      expires_at: n,
      is_expired: m === !0,
      is_expiring_soon: w === !0,
      can_auto_refresh: g,
      needs_reauthorization: p,
      degraded: c,
      degraded_reason: l
    };
  }
  /**
   * Render connected state details
   */
  renderConnectedState(t) {
    const { connectedEmail: e, connectedAccountId: n, scopesList: o, expiryInfo: i, reauthWarning: s, reauthReason: c } = this.elements;
    e && (e.textContent = t.email || "Connected"), n && (n.textContent = t.account_id || this.currentAccountId ? `Account ID: ${t.account_id || this.currentAccountId}` : "Account ID: default"), this.renderScopes(t.scopes || []), this.renderExpiry(
      t.expires_at,
      t.is_expired,
      t.is_expiring_soon,
      t.can_auto_refresh,
      t.needs_reauthorization
    );
  }
  /**
   * Render scopes list
   */
  renderScopes(t) {
    const { scopesList: e } = this.elements;
    if (e) {
      if (!t || t.length === 0) {
        e.innerHTML = '<li class="text-sm text-gray-500">No specific scopes granted</li>';
        return;
      }
      e.innerHTML = t.map((n) => {
        const o = C[n] || { label: n, description: "" };
        return `
        <li class="flex items-start gap-2">
          <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
          <div>
            <span class="text-sm font-medium text-gray-700">${x(o.label)}</span>
            ${o.description ? `<p class="text-xs text-gray-500">${x(o.description)}</p>` : ""}
          </div>
        </li>
      `;
      }).join("");
    }
  }
  /**
   * Render token expiry information
   */
  renderExpiry(t, e, n, o, i) {
    const { expiryInfo: s, reauthWarning: c, reauthReason: l } = this.elements;
    if (!s) return;
    if (s.classList.remove("text-red-600", "text-amber-600"), s.classList.add("text-gray-500"), !t) {
      s.textContent = "Access token status unknown", c && u(c);
      return;
    }
    const h = new Date(t), g = /* @__PURE__ */ new Date(), d = Math.max(
      1,
      Math.round((h.getTime() - g.getTime()) / (1e3 * 60))
    );
    e ? o ? (s.textContent = "Access token expired, but refresh is available and will be applied automatically.", s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), c && u(c)) : (s.textContent = "Access token has expired. Please re-authorize.", s.classList.remove("text-gray-500"), s.classList.add("text-red-600"), c && f(c), l && (l.textContent = "Your access token has expired and cannot be refreshed automatically. Re-authorize to continue using Google Drive import.")) : n ? (s.classList.remove("text-gray-500"), s.classList.add("text-amber-600"), o ? (s.textContent = `Token expires in approximately ${d} minute${d !== 1 ? "s" : ""}. Refresh is available automatically.`, c && u(c)) : (s.textContent = `Token expires in approximately ${d} minute${d !== 1 ? "s" : ""}`, c && f(c), l && (l.textContent = `Your access token will expire in ${d} minute${d !== 1 ? "s" : ""} and cannot be refreshed automatically. Re-authorize now to avoid interruption.`))) : (s.textContent = `Token valid until ${h.toLocaleDateString()} ${h.toLocaleTimeString()}`, c && u(c)), !i && c && u(c);
  }
  /**
   * Render degraded provider state
   */
  renderDegradedState(t, e) {
    const { degradedWarning: n, degradedReason: o } = this.elements;
    n && (t ? (f(n), o && (o.textContent = e || "Google API health checks are failing. Import actions may be unavailable until provider recovery.")) : u(n));
  }
  // Account Management Methods
  /**
   * Load all connected Google accounts
   */
  async loadAccounts() {
    try {
      const t = this.buildScopedAPIURL("/esign/integrations/google/accounts"), e = await fetch(t, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!e.ok) {
        console.warn("Failed to load accounts:", e.status), this.accounts = [], this.renderAccountDropdown(), this.renderAccountsGrid();
        return;
      }
      const n = await e.json();
      this.accounts = n.accounts || [], this.updateAccountScopeUI();
    } catch (t) {
      console.error("Error loading accounts:", t), this.accounts = [], this.updateAccountScopeUI();
    }
  }
  /**
   * Render the account dropdown (Option A)
   */
  renderAccountDropdown() {
    const { accountDropdown: t } = this.elements;
    if (!t) return;
    t.innerHTML = "";
    const e = document.createElement("option");
    e.value = "", e.textContent = "Default Account", this.currentAccountId || (e.selected = !0), t.appendChild(e);
    const n = /* @__PURE__ */ new Set([""]);
    for (const i of this.accounts) {
      const s = this.normalizeAccountId(i.account_id);
      if (n.has(s))
        continue;
      n.add(s);
      const c = document.createElement("option");
      c.value = s;
      const l = i.email || s || "Default", h = i.status !== "connected" ? ` (${i.status})` : "";
      c.textContent = `${l}${h}`, s === this.currentAccountId && (c.selected = !0), t.appendChild(c);
    }
    if (this.currentAccountId && !n.has(this.currentAccountId)) {
      const i = document.createElement("option");
      i.value = this.currentAccountId, i.textContent = `${this.currentAccountId} (new)`, i.selected = !0, t.appendChild(i);
    }
    const o = document.createElement("option");
    o.value = "__new__", o.textContent = "+ Connect New Account...", t.appendChild(o);
  }
  /**
   * Render the accounts cards grid (Option B)
   */
  renderAccountsGrid() {
    const { accountsLoading: t, accountsEmpty: e, accountsGrid: n } = this.elements;
    if (t && u(t), this.accounts.length === 0) {
      e && f(e), n && u(n);
      return;
    }
    e && u(e), n && (f(n), n.innerHTML = this.accounts.map((o) => this.renderAccountCard(o)).join("") + this.renderConnectNewCard(), this.attachCardEventListeners());
  }
  /**
   * Render a single account card
   */
  renderAccountCard(t) {
    const e = t.account_id === this.currentAccountId || t.is_default && !this.currentAccountId, n = {
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
    }, s = e ? "ring-2 ring-blue-500" : "", c = n[t.status] || "bg-white border-gray-200", l = o[t.status] || "bg-gray-100 text-gray-700", h = i[t.status] || t.status, g = t.account_id || "default", d = t.email || (t.account_id ? t.account_id : "Default account");
    return `
      <div class="account-card ${c} ${s} border rounded-xl p-4 relative" data-account-id="${x(t.account_id)}">
        ${e ? '<span class="absolute top-2 right-2 text-xs font-medium text-blue-600">Active</span>' : ""}
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-full ${t.status === "connected" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${x(d)}</p>
            <p class="text-xs text-gray-500">Account: ${x(g)}</p>
            <span class="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${l}">
              ${h}
            </span>
          </div>
        </div>
        <div class="mt-4 flex gap-2">
          ${e ? "" : '<button type="button" class="select-account-btn flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Select</button>'}
          ${t.status === "needs_reauth" || t.status === "expired" ? '<button type="button" class="reauth-account-btn flex-1 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Re-auth</button>' : ""}
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
    const { accountsGrid: t, disconnectModal: e } = this.elements;
    if (!t) return;
    t.querySelectorAll(".select-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        const c = i.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !0);
      });
    }), t.querySelectorAll(".reauth-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        const c = i.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.setCurrentAccountId(c, !1), this.startOAuthFlow(c);
      });
    }), t.querySelectorAll(".disconnect-account-btn").forEach((o) => {
      o.addEventListener("click", (i) => {
        const c = i.target.closest(".account-card")?.getAttribute("data-account-id") || "";
        this.pendingDisconnectAccountId = c, e && f(e);
      });
    });
    const n = t.querySelector("#connect-new-card");
    n && n.addEventListener("click", () => this.startOAuthFlowForNewAccount());
  }
  /**
   * Escape HTML for safe rendering
   */
  // OAuth Flow Methods
  /**
   * Start OAuth flow
   */
  async startOAuthFlow(t) {
    const { oauthModal: e, errorMessage: n } = this.elements;
    e && f(e);
    const o = this.resolveOAuthRedirectURI(), i = t !== void 0 ? this.normalizeAccountId(t) : this.currentAccountId;
    this.pendingOAuthAccountId = i;
    const s = this.buildGoogleOAuthUrl(o, i);
    if (!s) {
      e && u(e), n && (n.textContent = "Google OAuth is not configured: missing client ID."), this.pendingOAuthAccountId = null, this.showState("error"), this.announce("Google OAuth is not configured");
      return;
    }
    const c = 500, l = 600, h = (window.screen.width - c) / 2, g = (window.screen.height - l) / 2;
    if (this.oauthWindow = window.open(
      s,
      "google_oauth",
      `width=${c},height=${l},left=${h},top=${g},popup=yes`
    ), !this.oauthWindow) {
      e && u(e), this.pendingOAuthAccountId = null, this.showToast("Popup blocked. Allow popups for this site and try again.", "error"), this.announce("Popup blocked");
      return;
    }
    this.messageHandler = (d) => this.handleOAuthCallback(d), window.addEventListener("message", this.messageHandler), this.oauthTimeout = setTimeout(() => {
      this.cleanupOAuthFlow(), e && u(e), this.pendingOAuthAccountId = null, this.showToast("Google authorization timed out. Please try again.", "error"), this.announce("Authorization timed out");
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
  isAllowedOAuthCallbackOrigin(t) {
    const e = this.normalizeOrigin(t);
    if (!e) return !1;
    const n = /* @__PURE__ */ new Set(), o = this.normalizeOrigin(window.location.origin);
    o && n.add(o);
    const i = this.resolveOriginFromURL(this.resolveOAuthRedirectURI());
    i && n.add(i);
    for (const s of n)
      if (e === s || this.areEquivalentLoopbackOrigins(e, s))
        return !0;
    return !1;
  }
  normalizeOrigin(t) {
    try {
      return new URL(t).origin;
    } catch {
      return "";
    }
  }
  resolveOriginFromURL(t) {
    try {
      return new URL(t).origin;
    } catch {
      return "";
    }
  }
  areEquivalentLoopbackOrigins(t, e) {
    try {
      const n = new URL(t), o = new URL(e);
      return n.protocol !== o.protocol || n.port !== o.port ? !1 : this.isLoopbackHost(n.hostname) && this.isLoopbackHost(o.hostname);
    } catch {
      return !1;
    }
  }
  isLoopbackHost(t) {
    const e = t.trim().toLowerCase();
    return e === "localhost" || e === "127.0.0.1" || e === "::1";
  }
  /**
   * Build OAuth state parameter
   */
  buildOAuthState(t) {
    const e = {
      user_id: this.config.userId || "",
      account_id: t || ""
    };
    return JSON.stringify(e);
  }
  /**
   * Build Google OAuth URL
   */
  buildGoogleOAuthUrl(t, e) {
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
      redirect_uri: t,
      response_type: "code",
      scope: o,
      access_type: "offline",
      prompt: "consent",
      state: this.buildOAuthState(e)
    }).toString()}`;
  }
  /**
   * Handle OAuth callback message
   */
  async handleOAuthCallback(t) {
    if (!this.isAllowedOAuthCallbackOrigin(t.origin)) return;
    const e = t.data;
    if (e.type !== "google_oauth_callback") return;
    const { oauthModal: n } = this.elements;
    if (this.cleanupOAuthFlow(), n && u(n), this.closeOAuthWindow(), e.error) {
      this.showToast(`OAuth failed: ${e.error}`, "error"), this.announce(`OAuth failed: ${e.error}`), this.pendingOAuthAccountId = null;
      return;
    }
    if (e.code) {
      try {
        const o = this.resolveOAuthRedirectURI(), s = (typeof e.account_id == "string" ? this.normalizeAccountId(e.account_id) : null) ?? this.pendingOAuthAccountId ?? this.currentAccountId;
        s !== this.currentAccountId && this.setCurrentAccountId(s, !1);
        const c = await fetch(
          this.buildScopedAPIURL("/esign/integrations/google/connect", s),
          {
            method: "POST",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify({
              auth_code: e.code,
              account_id: s || void 0,
              redirect_uri: o
            })
          }
        );
        if (!c.ok) {
          const l = await c.json();
          throw new Error(l.error?.message || "Failed to connect");
        }
        this.showToast("Google Drive connected successfully", "success"), this.announce("Google Drive connected successfully"), await Promise.all([this.checkStatus(), this.loadAccounts()]);
      } catch (o) {
        console.error("Connect error:", o);
        const i = o instanceof Error ? o.message : "Unknown error";
        this.showToast(`Failed to connect: ${i}`, "error"), this.announce(`Failed to connect: ${i}`);
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
    const { oauthModal: t } = this.elements;
    t && u(t), this.pendingOAuthAccountId = null, this.closeOAuthWindow(), this.cleanupOAuthFlow();
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
    const { disconnectModal: t } = this.elements;
    t && u(t);
    const e = this.pendingDisconnectAccountId ?? this.currentAccountId;
    try {
      const n = await fetch(
        this.buildScopedAPIURL("/esign/integrations/google/disconnect", e),
        {
          method: "POST",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!n.ok) {
        const o = await n.json();
        throw new Error(o.error?.message || "Failed to disconnect");
      }
      this.showToast("Google Drive disconnected", "success"), this.announce("Google Drive disconnected"), e === this.currentAccountId && this.setCurrentAccountId("", !1), await Promise.all([this.checkStatus(), this.loadAccounts()]);
    } catch (n) {
      console.error("Disconnect error:", n);
      const o = n instanceof Error ? n.message : "Unknown error";
      this.showToast(`Failed to disconnect: ${o}`, "error"), this.announce(`Failed to disconnect: ${o}`);
    } finally {
      this.pendingDisconnectAccountId = null;
    }
  }
  /**
   * Show toast notification
   */
  showToast(t, e) {
    const o = window.toastManager;
    o && (e === "success" ? o.success(t) : o.error(t));
  }
}
function D(a) {
  const t = new _(a);
  return v(() => t.init()), t;
}
function L(a) {
  const t = {
    basePath: a.basePath,
    apiBasePath: a.apiBasePath || `${a.basePath}/api`,
    userId: a.userId,
    googleAccountId: a.googleAccountId,
    googleRedirectUri: a.googleRedirectUri,
    googleClientId: a.googleClientId,
    googleEnabled: a.googleEnabled !== !1
  }, e = new _(t);
  v(() => e.init()), typeof window < "u" && (window.esignGoogleIntegrationController = e);
}
function k(a) {
  const t = a.features && typeof a.features == "object" ? a.features : {}, e = a.context && typeof a.context == "object" ? a.context : {}, n = String(a.basePath || a.base_path || "").trim();
  return n ? {
    basePath: n,
    apiBasePath: String(a.apiBasePath || a.api_base_path || "").trim() || `${n}/api`,
    userId: String(a.userId || a.user_id || e.user_id || "").trim(),
    googleAccountId: String(
      a.googleAccountId || a.google_account_id || e.google_account_id || ""
    ).trim(),
    googleRedirectUri: String(
      a.googleRedirectUri || a.google_redirect_uri || e.google_redirect_uri || ""
    ).trim(),
    googleClientId: String(
      a.googleClientId || a.google_client_id || e.google_client_id || ""
    ).trim(),
    googleEnabled: !!(a.googleEnabled ?? t.google_enabled ?? !0)
  } : null;
}
typeof document < "u" && v(() => {
  if (!document.querySelector(
    '[data-esign-page="admin.integrations.google"], [data-esign-page="google-integration"]'
  )) return;
  const t = document.getElementById("esign-page-config");
  if (t)
    try {
      const e = JSON.parse(t.textContent || "{}"), n = k(e);
      n && L(n);
    } catch (e) {
      console.warn("Failed to parse Google integration page config:", e);
    }
});
export {
  _ as GoogleIntegrationController,
  L as bootstrapGoogleIntegration,
  D as initGoogleIntegration
};
//# sourceMappingURL=google-integration.js.map
