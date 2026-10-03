import { m as x } from "../chunks/transport-DVxB6IT1.js";
import { d as h, f as l, r as S } from "../chunks/transport-CrXa2Trj.js";
var y = "[data-preview-page]", b = 3e4, k = 3e4, E = 5e3, C = {
  closed: "Preview closed.",
  expired: "Preview expired.",
  unavailable: "Preview ended.",
  "signed-out": "Signed out."
}, p = {
  closed: "This preview was closed. Nothing it showed is kept on this page.",
  expired: "This preview expired. Start a new preview from Data to look again.",
  unavailable: "This preview ended because the receipt, your access or the application runtime changed.",
  "signed-out": "Your session expired. Sign in again, then start a new preview from Data."
}, v = {
  gone: "This preview has already ended.",
  denied: "Your access changed, so this preview has ended.",
  stale: "The prepared data changed, so this preview has ended.",
  expired: "Your session expired. Reload the page to continue.",
  invalid: "This preview could not be closed. Reload the page and try again."
}, f = /* @__PURE__ */ new Set([
  "gone",
  "denied",
  "stale"
]);
function L(e, t) {
  const s = e.dataset;
  let i = null;
  try {
    i = x(JSON.parse(s.previewSelection || ""));
  } catch {
    i = null;
  }
  const n = l(s.previewSessionUrl), r = l(s.previewCloseUrl), o = l(s.previewReturnUrl), c = h(s.previewSurface), d = Date.parse(s.previewExpires || ""), a = Date.parse(s.previewServerNow || ""), u = h(s.previewSession);
  if (!i || i.context !== "prepared" || !n || !r || !o || !c || !u || !Number.isFinite(d)) return null;
  const m = Number.isFinite(a) && Math.abs(a - t) <= 864e5 ? a - t : 0;
  return {
    sessionId: u,
    surfaceId: c,
    selection: i,
    sessionURL: n,
    closeURL: r,
    returnURL: o,
    expiresAt: d,
    skew: m
  };
}
function T(e) {
  if (e <= 0) return "(expired)";
  if (e < 6e4) return "(in less than a minute)";
  const t = Math.round(e / 6e4);
  return t === 1 ? "(in 1 minute)" : `(in ${t} minutes)`;
}
var A = class {
  constructor(e, t, s = {}) {
    this.timer = null, this.poller = null, this.expiry = null, this.checking = null, this.lastCheck = 0, this.closing = !1, this.ended = null, this.disposed = !1, this.onVisible = () => {
      document.visibilityState === "visible" && this.check();
    }, this.onClick = (i) => {
      const n = i.target instanceof Element ? i.target.closest("[data-preview-close]") : null;
      !n || !this.root.contains(n) || (i.preventDefault(), this.close());
    }, this.root = e, this.config = t, this.now = s.now || Date.now, this.navigate = s.navigate || ((i) => window.location.assign(i)), this.transport = s.transport || S({
      capabilities: "",
      open: "",
      session: t.sessionURL,
      close: t.closeURL
    });
  }
  mount() {
    const e = this.closeButton();
    e && (e.hidden = !1), this.root.addEventListener("click", this.onClick), this.localizeExpiry(), this.tick(), this.timer = setInterval(() => this.tick(), b), this.poller = setInterval(() => {
      this.check();
    }, k), document.addEventListener("visibilitychange", this.onVisible);
    const t = this.config.expiresAt - this.serverNow();
    this.expiry = setTimeout(() => {
      this.end("expired"), this.check(!0);
    }, Math.min(Math.max(t, 0) + 50, 18e5));
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.root.removeEventListener("click", this.onClick), document.removeEventListener("visibilitychange", this.onVisible), this.stopTimers(), this.checking?.abort(), this.checking = null);
  }
  endedBy() {
    return this.ended;
  }
  stopTimers() {
    this.timer !== null && clearInterval(this.timer), this.poller !== null && clearInterval(this.poller), this.expiry !== null && clearTimeout(this.expiry), this.timer = null, this.poller = null, this.expiry = null;
  }
  async check(e = !1) {
    if (this.disposed || this.checking || this.ended && !e) return;
    const t = this.now();
    if (!e && t - this.lastCheck < E) return;
    this.lastCheck = t;
    const s = new AbortController();
    this.checking = s;
    const i = await this.transport.session({
      sessionId: this.config.sessionId,
      selection: this.config.selection,
      surfaceId: this.config.surfaceId
    }, s.signal);
    if (this.checking === s && (this.checking = null, !this.disposed)) {
      if (i.ok) {
        if (i.value.state === "ready") return;
        this.end(i.value.state === "closed" ? "closed" : i.value.state === "expired" ? "expired" : "unavailable", !0);
        return;
      }
      f.has(i.failure.kind) ? this.end("unavailable", !0) : i.failure.kind === "expired" && this.end("signed-out", !0);
    }
  }
  end(e, t = !1) {
    if (this.disposed || this.ended && !t || this.ended === e) return;
    this.ended = e, this.stopTimers();
    const s = this.focusWillBeLost(), i = this.showEnded(e);
    this.withdrawControls(), i && s && document.activeElement !== i && i.focus();
    const n = this.root.querySelector("[data-preview-remaining]");
    n && e === "expired" && (n.textContent = "(expired)"), this.status(C[e]);
  }
  focusWillBeLost() {
    const e = document.activeElement;
    return !e || e === document.body ? !0 : [
      this.root.querySelector("[data-preview-main]"),
      this.closeButton(),
      ...Array.from(this.root.querySelectorAll(".data-preview__views"))
    ].some((t) => !!t?.contains(e));
  }
  showEnded(e) {
    const t = this.root.querySelector("[data-preview-main]");
    if (!t) return null;
    const s = t.querySelector("[data-preview-ended]");
    if (s) {
      s.dataset.previewEnded = e;
      const o = s.querySelector("p");
      return o && (o.textContent = p[e]), s;
    }
    const i = document.createElement("div");
    i.className = "console-callout data-preview__ended", i.dataset.tone = "warning", i.dataset.previewEnded = e, i.setAttribute("role", "alert"), i.tabIndex = -1;
    const n = document.createElement("p");
    n.textContent = p[e];
    const r = document.createElement("a");
    return r.className = "console-btn console-btn--sm console-btn--primary", r.href = this.config.returnURL, r.textContent = "Return to Data", i.append(n, r), t.replaceChildren(i), i;
  }
  withdrawControls() {
    const e = this.closeButton();
    e && (e.hidden = !0), this.root.querySelectorAll(".data-preview__views").forEach((t) => {
      t.hidden = !0;
    });
  }
  serverNow() {
    return this.now() + this.config.skew;
  }
  closeButton() {
    return this.root.querySelector("[data-preview-close]");
  }
  status(e) {
    const t = this.root.querySelector("[data-preview-status]");
    t && (t.textContent = e);
  }
  localizeExpiry() {
    const e = this.root.querySelector("[data-preview-expiry]");
    if (!e) return;
    const t = new Date(this.config.expiresAt);
    e.textContent = t.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }), e.title = t.toLocaleString();
  }
  tick() {
    if (this.disposed) return;
    const e = this.root.querySelector("[data-preview-remaining]");
    e && (e.textContent = T(this.config.expiresAt - this.serverNow()));
  }
  async close() {
    const e = this.closeButton();
    if (this.closing || this.disposed) return;
    this.closing = !0, e && (e.setAttribute("aria-busy", "true"), e.setAttribute("aria-disabled", "true"), e.textContent = "Closing…"), this.status("Closing the preview…");
    const t = new AbortController(), s = await this.transport.close({
      sessionId: this.config.sessionId,
      selection: this.config.selection,
      surfaceId: this.config.surfaceId
    }, t.signal);
    if (!this.disposed) {
      if (s.ok || f.has(s.failure.kind)) {
        this.end(s.ok ? "closed" : "unavailable", !0), this.status(s.ok ? "Preview closed. Returning to Data…" : `${v[s.failure.kind]} Returning to Data…`), e && (e.hidden = !0), this.navigate(this.config.returnURL);
        return;
      }
      this.closing = !1, e && (e.removeAttribute("aria-busy"), e.removeAttribute("aria-disabled"), e.textContent = "Close preview"), this.status(v[s.failure.kind] || "Closing the preview failed. Try again.");
    }
  }
}, w = /* @__PURE__ */ new WeakMap();
function I(e, t = {}) {
  const s = w.get(e);
  if (s) return s;
  const i = L(e, (t.now || Date.now)());
  if (!i) return null;
  const n = new A(e, i, t);
  return w.set(e, n), n.mount(), n;
}
function g() {
  document.querySelectorAll(y).forEach((e) => {
    I(e);
  });
}
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", g, { once: !0 }) : g());
export {
  A as PreviewPage,
  I as mountPreviewPage,
  L as readPreviewPageConfig
};

//# sourceMappingURL=data-preview-page.js.map