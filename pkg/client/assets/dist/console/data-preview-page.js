import { m as w } from "../chunks/transport-DVxB6IT1.js";
import { d as h, f as o, r as m } from "../chunks/transport-CrXa2Trj.js";
var S = "[data-preview-page]", x = 3e4, p = {
  gone: "This preview has already ended.",
  denied: "Your access changed, so this preview has ended.",
  stale: "The prepared data changed, so this preview has ended.",
  expired: "Your session expired. Reload the page to continue.",
  invalid: "This preview could not be closed. Reload the page and try again."
}, C = /* @__PURE__ */ new Set([
  "gone",
  "denied",
  "stale"
]);
function y(e, i) {
  const t = e.dataset;
  let s = null;
  try {
    s = w(JSON.parse(t.previewSelection || ""));
  } catch {
    s = null;
  }
  const r = o(t.previewSessionUrl), a = o(t.previewCloseUrl), c = o(t.previewReturnUrl), l = h(t.previewSurface), u = Date.parse(t.previewExpires || ""), n = Date.parse(t.previewServerNow || ""), d = h(t.previewSession);
  if (!s || s.context !== "prepared" || !r || !a || !c || !l || !d || !Number.isFinite(u)) return null;
  const v = Number.isFinite(n) && Math.abs(n - i) <= 864e5 ? n - i : 0;
  return {
    sessionId: d,
    surfaceId: l,
    selection: s,
    sessionURL: r,
    closeURL: a,
    returnURL: c,
    expiresAt: u,
    skew: v
  };
}
function k(e) {
  if (e <= 0) return "(expired)";
  const i = Math.ceil(e / 6e4);
  return i === 1 ? "(in 1 minute)" : `(in ${i} minutes)`;
}
var E = class {
  constructor(e, i, t = {}) {
    this.timer = null, this.closing = !1, this.disposed = !1, this.onClick = (s) => {
      const r = s.target instanceof Element ? s.target.closest("[data-preview-close]") : null;
      !r || !this.root.contains(r) || (s.preventDefault(), this.close());
    }, this.root = e, this.config = i, this.now = t.now || Date.now, this.navigate = t.navigate || ((s) => window.location.assign(s)), this.transport = t.transport || m({
      capabilities: "",
      open: "",
      session: i.sessionURL,
      close: i.closeURL
    });
  }
  mount() {
    const e = this.closeButton();
    e && (e.hidden = !1), this.root.addEventListener("click", this.onClick), this.localizeExpiry(), this.tick(), this.timer = setInterval(() => this.tick(), x);
  }
  dispose() {
    this.disposed || (this.disposed = !0, this.root.removeEventListener("click", this.onClick), this.timer !== null && clearInterval(this.timer), this.timer = null);
  }
  serverNow() {
    return this.now() + this.config.skew;
  }
  closeButton() {
    return this.root.querySelector("[data-preview-close]");
  }
  status(e) {
    const i = this.root.querySelector("[data-preview-status]");
    i && (i.textContent = e);
  }
  localizeExpiry() {
    const e = this.root.querySelector("[data-preview-expiry]");
    if (!e) return;
    const i = new Date(this.config.expiresAt);
    e.textContent = i.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }), e.title = i.toLocaleString();
  }
  tick() {
    if (this.disposed) return;
    const e = this.root.querySelector("[data-preview-remaining]");
    e && (e.textContent = k(this.config.expiresAt - this.serverNow()));
  }
  async close() {
    const e = this.closeButton();
    if (this.closing || this.disposed) return;
    this.closing = !0, e && (e.setAttribute("aria-busy", "true"), e.setAttribute("aria-disabled", "true"), e.textContent = "Closing…"), this.status("Closing the preview…");
    const i = new AbortController(), t = await this.transport.close({
      sessionId: this.config.sessionId,
      selection: this.config.selection,
      surfaceId: this.config.surfaceId
    }, i.signal);
    if (!this.disposed) {
      if (t.ok || C.has(t.failure.kind)) {
        this.status(t.ok ? "Preview closed. Returning to Data…" : `${p[t.failure.kind]} Returning to Data…`), e && (e.hidden = !0), this.navigate(this.config.returnURL);
        return;
      }
      this.closing = !1, e && (e.removeAttribute("aria-busy"), e.removeAttribute("aria-disabled"), e.textContent = "Close preview"), this.status(p[t.failure.kind] || "Closing the preview failed. Try again.");
    }
  }
}, f = /* @__PURE__ */ new WeakMap();
function b(e, i = {}) {
  const t = f.get(e);
  if (t) return t;
  const s = y(e, (i.now || Date.now)());
  if (!s) return null;
  const r = new E(e, s, i);
  return f.set(e, r), r.mount(), r;
}
function g() {
  document.querySelectorAll(S).forEach((e) => {
    b(e);
  });
}
typeof document < "u" && (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", g, { once: !0 }) : g());
export {
  E as PreviewPage,
  b as mountPreviewPage,
  y as readPreviewPageConfig
};

//# sourceMappingURL=data-preview-page.js.map