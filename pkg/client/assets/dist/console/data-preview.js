import { escapeAttribute as c, escapeHTML as l } from "../shared/html.js";
import { C as N, o as L } from "../chunks/rich-5UU6Sxl8.js";
import { f as D, g as u, m as O, u as k, v as P } from "../chunks/transport-DVxB6IT1.js";
import { n as F } from "../chunks/keys-CcTTWa6z.js";
import { a as q, c as Se, d as _, f as xe, i as Ie, l as Ee, n as Re, o as M, p as U, r as B, s as Ce, t as Ae, u as Ne } from "../chunks/transport-CrXa2Trj.js";
var Y = N, G = {
  screen: "Screen",
  report: "Report"
}, K = {
  ready: {
    label: "Open",
    tone: "success"
  },
  closed: {
    label: "Closed",
    tone: "neutral"
  },
  expired: {
    label: "Expired",
    tone: "warning"
  },
  unavailable: {
    label: "Ended",
    tone: "warning"
  }
}, H = /* @__PURE__ */ new Set([
  "network",
  "timeout",
  "canceled",
  "failed",
  "malformed"
]), S = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), f = /* @__PURE__ */ new Set([
  "gone",
  "denied",
  "stale"
]), J = /* @__PURE__ */ new Set([
  "stale",
  "gone",
  "denied",
  "expired",
  "invalid",
  "unconfigured"
]), m = {
  unconfigured: "Application preview is not available on this installation.",
  invalid: "This receipt could not be checked for application preview. Refresh and choose it again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "You do not have access to preview this receipt.",
  gone: "This prepared receipt is no longer available. Refresh to see the current data.",
  stale: "The prepared data changed since this page loaded. Refresh to preview the current receipt.",
  unavailable: "Application preview is temporarily unavailable.",
  timeout: "Checking application preview took too long.",
  network: "Application preview could not reach the server.",
  malformed: "The server returned preview details this page cannot read.",
  failed: "Checking application preview failed.",
  canceled: "Checking application preview was canceled.",
  busy: "Application preview is busy. Try again shortly.",
  conflict: "Application preview could not be checked. Try again."
}, W = {
  unconfigured: "Application preview is not available on this installation.",
  invalid: "This preview request was not accepted. Refresh and try again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "You do not have access to preview this view of the receipt.",
  gone: "This prepared receipt or view is no longer available. Refresh to see the current data.",
  stale: "The prepared data changed since this page loaded. Refresh to preview the current receipt.",
  unavailable: "The application cannot open a preview of this receipt right now. Try again later.",
  timeout: "Starting the preview took too long. It may have started: try again to reattach to it.",
  network: "The request could not reach the server. The preview may have started: try again to reattach to it.",
  malformed: "The server answered in a way this page cannot read. The preview may have started: try again to reattach to it.",
  failed: "Starting the preview failed. It may have started: try again to reattach to it.",
  canceled: "Starting the preview was interrupted. It may have started: try again to reattach to it.",
  busy: "You already have the most previews open at once. Close one, or wait until one expires, then try again.",
  conflict: "This launch request was already used with other input. Start a new preview."
}, x = {
  unconfigured: "Application preview is not available on this installation.",
  invalid: "This preview could not be closed. Reload the page and try again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "Your access changed, so this preview has ended.",
  gone: "This preview has already ended.",
  stale: "The prepared data changed, so this preview has ended.",
  unavailable: "Closing the preview is temporarily unavailable. Try again.",
  timeout: "Closing the preview took too long. Try again.",
  network: "The request could not reach the server. Try again.",
  malformed: "The server answered in a way this page cannot read. Try again.",
  failed: "Closing the preview failed. Try again.",
  canceled: "Closing the preview was interrupted. Try again.",
  busy: "The preview is busy. Try again.",
  conflict: "This preview could not be closed. Try again."
}, j = {
  ...x,
  invalid: "This preview could not be checked. Reload the page.",
  timeout: "Checking the preview took too long.",
  failed: "Checking the preview failed.",
  canceled: "Checking the preview was interrupted.",
  unavailable: "Checking the preview is temporarily unavailable."
}, $ = {
  not_supported: "This application does not offer previews of prepared data.",
  runtime_unavailable: "The application cannot open a preview of this receipt right now.",
  no_readable_surfaces: "No application view you can open is registered for this data.",
  unknown: "Application preview is not available for this receipt."
};
function b(e, t = "") {
  return L(e, t, Y);
}
function I(e) {
  return `<span class="console-muted">${l(e)}</span>`;
}
function E(e, t = "") {
  return t ? `preview:${e}:${t}` : `preview:${e}`;
}
function d(e, t, i, s = {}) {
  const r = `console-btn console-btn--sm${s.primary ? " console-btn--primary" : ""}`, a = s.busy || s.disabled ? ' aria-disabled="true"' : "", n = s.busy ? ' aria-busy="true"' : "", o = s.disabled ? ` title="${c(s.disabled)}"` : "";
  return `<button type="button" class="${r}" data-preview-action="${t}"${i ? ` data-surface-id="${c(i)}"` : ""} data-explorer-focus="${c(E(t, i))}"${a}${n}${o}${s.extra || ""}>${l(e)}</button>`;
}
function V(e, t) {
  if (!e) return "";
  try {
    const i = new URL(t), s = new URL(e, i);
    return s.origin === i.origin && (s.protocol === "http:" || s.protocol === "https:") ? s.href : "";
  } catch {
    return "";
  }
}
function y(e, t) {
  const i = Date.parse(e.expires_at);
  return !Number.isFinite(i) || i <= t;
}
function h(e, t) {
  return !!e && e.state === "ready" && !y(e, t);
}
function R(e) {
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function Q(e, t) {
  const i = Date.parse(e) - t;
  if (!Number.isFinite(i) || i <= 0) return "now";
  if (i < 6e4) return "in less than a minute";
  const s = Math.round(i / 6e4);
  return s === 1 ? "in 1 minute" : `in ${s} minutes`;
}
function z(e, t) {
  const i = new Date(e.expires_at);
  return `<time${Number.isNaN(i.getTime()) ? "" : ` datetime="${c(i.toISOString())}"`} title="${c(i.toLocaleString())}">${l(R(e.expires_at))}</time> (${l(Q(e.expires_at, t))})`;
}
function X(e, t) {
  return e.state === "closed" ? "This preview was closed. Nothing it showed is kept." : e.state === "expired" || e.state === "ready" && y(e, t) ? `This preview expired at ${R(e.expires_at)}. Start a new preview to look again.` : "This preview ended because the receipt, your access or the application runtime changed.";
}
function Z(e) {
  if (!e) return "";
  const t = e.action === "open" ? W : e.action === "close" ? x : j;
  return t[e.failure.kind] || t.failed;
}
function ee(e) {
  const t = e.failure;
  if (!t) return "";
  const i = t.failure.kind;
  return t.action === "open" ? i === "stale" || i === "gone" || i === "invalid" ? C() : "" : t.action === "check" && S.has(i) && e.session ? d("Check again", "check", e.session.surface_id) : "";
}
function C() {
  return '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>';
}
function te(e) {
  const t = Z(e.failure);
  if (!t) return "";
  const i = e.failure.failure.kind, s = i === "denied" || i === "expired" ? "error" : "warning", r = ee(e);
  return `<div class="console-callout console-preview__failure" data-tone="${s}" role="alert" data-preview-failure="${c(`${e.failure.action}:${i}`)}"><p>${l(t)}</p>${r ? `<div class="console-explorer__state-actions">${r}</div>` : ""}</div>`;
}
function ie(e, t, i, s, r) {
  const a = s === "closing", n = a ? "" : V(i.launch_url, e.base);
  let o = "";
  n ? o = `<a class="console-btn console-btn--sm console-btn--primary" href="${c(n)}" data-preview-launch data-surface-id="${c(t.id)}" data-explorer-focus="${c(E("launch", t.id))}">Open preview<span class="console-sr-only"> of ${l(t.label)}</span></a>` : a || (o = I("No launch link is available for this preview."));
  const p = s === "checking" ? '<span class="console-muted" role="status" aria-busy="true">Checking…</span>' : "";
  return `
    <p class="console-preview__status" data-preview-state="ready">Read-only preview of the prepared data. Expires at ${z(i, r)}.</p>
    <div class="console-preview__actions">${o}${d(a ? "Closing…" : "Close preview", "close", t.id, { busy: a })}${p}</div>
  `;
}
function se(e, t, i, s, r) {
  const a = i.state === "ready" ? "expired" : i.state, n = r ? `<div class="console-preview__actions">${d("Start a new preview", "new", t.id, { disabled: e.identifiable ? "" : g })}</div>` : "";
  return `
    <p class="console-preview__status" data-preview-state="${c(a)}">${l(X(i, s))}</p>
    ${n}
  `;
}
function re(e, t, i) {
  const s = i ? d("Start a new preview", "new", t.id, { disabled: e.identifiable ? "" : g }) : "";
  return `
    <p class="console-preview__status" data-preview-state="unknown">A preview you opened earlier may still be open, but its state could not be read.</p>
    <div class="console-preview__actions">${d("Check again", "check", t.id, { primary: !0 })}${s}</div>
  `;
}
function ae(e, t, i) {
  const s = i?.failure, r = !!i?.uncertain;
  if (s?.action === "open" && J.has(s.failure.kind) && !r) return "";
  const a = e.identifiable ? "" : g, n = a ? `<p class="console-preview__status">${I(a)}</p>` : "";
  let o = "Start preview";
  return r ? o = "Try again" : s?.action === "open" && (o = s.failure.kind === "conflict" ? "Start a new preview" : "Try again"), `${n}<div class="console-preview__actions">${d(o, "open", t.id, {
    primary: !0,
    disabled: a
  })}</div>`;
}
function ne(e, t, i, s) {
  const r = i?.session || null, a = i?.busy || "", n = i?.now ?? e.now;
  return a === "opening" ? `<div class="console-preview__actions">${d("Starting preview…", "open", t.id, {
    primary: !0,
    busy: !0
  })}</div>` : r && h(r, n) ? ie(e, t, r, a, n) : r ? se(e, t, r, n, s) : a === "checking" ? '<p class="console-preview__status" role="status" aria-busy="true">Checking the preview you opened earlier…</p>' : i?.remembered ? re(e, t, s) : s ? ae(e, t, i) : "";
}
var g = "This browser cannot create a request ID. Use a current browser to start a preview.";
function oe(e) {
  const t = e?.session;
  if (!t || e?.busy === "opening") return "";
  const i = t.state === "ready" && y(t, e.now) ? "expired" : t.state, { label: s, tone: r } = K[i];
  return b(s, r);
}
function A(e, t, i = !0) {
  const s = e.launch(t.id);
  return `
    <li class="console-preview__surface" data-surface-id="${c(t.id)}" aria-labelledby="${c(`${e.scope}-surface-${t.id}`)}">
      <div class="console-explorer__usage-head"><span class="console-explorer__usage-label" id="${c(`${e.scope}-surface-${t.id}`)}">${l(t.label)}</span>${b(G[t.kind])}${oe(s)}</div>
      ${ne(e, t, s, i)}
      ${s ? te(s) : ""}
    </li>
  `;
}
function le(e) {
  const t = e.selection, i = e.status ? b(e.status.label, e.status.tone) : '<span class="console-kv__empty">Unknown</span>';
  return `<dl class="console-kv console-preview__identity">${[
    ["Scenario", l(e.title)],
    ["Prepared receipt", `<code class="console-kv__mono">${l(t.receipt_id || "")}</code>`],
    ["Content revision", l(String(t.content_revision ?? ""))],
    ["Target", l(t.target_id)],
    ["Lifecycle status", i]
  ].map(([s, r]) => `<dt>${l(s)}</dt><dd>${r}</dd>`).join("")}</dl>`;
}
function ce(e) {
  return U(e.guarantees) ? `<ul class="console-preview__guarantees" aria-label="Preview guarantees">${[
    "Read-only",
    "Isolated from the data the target serves",
    "Expires automatically",
    "Cleaned up when closed"
  ].map((t) => `<li>${l(t)}</li>`).join("")}</ul>` : "";
}
function de(e) {
  const t = m[e.kind] || m.failed, i = S.has(e.kind) ? d("Try again", "retry", "") : "", s = e.kind === "gone" || e.kind === "stale" || e.kind === "invalid" ? C() : "";
  return `<div class="console-callout console-explorer__state" data-tone="${e.kind === "denied" || e.kind === "expired" ? "error" : "warning"}" role="alert" data-preview-failure="capability:${c(e.kind)}"><p>${l(t)}</p>${i || s ? `<div class="console-explorer__state-actions">${i}${s}</div>` : ""}</div>`;
}
function v(e, t) {
  const i = e.opened.filter((s) => !t.some((r) => r.id === s.id));
  return i.length === 0 ? "" : `<ul class="console-preview__surfaces" aria-label="Previews opened from this page">${i.map((s) => A(e, s, !1)).join("")}</ul>`;
}
function ue(e) {
  const t = e.capability;
  if (!t || t.status === "loading") return `<div class="console-explorer__loading" role="status" aria-busy="true">Checking which application views can open this receipt…</div>${v(e, [])}`;
  if (t.status === "failed") return `${de(t.failure)}${v(e, [])}`;
  const i = t.value;
  if (!i.supported) {
    const s = $[i.reason || "unknown"] || $.unknown, r = i.reason === "runtime_unavailable" ? `<div class="console-explorer__state-actions">${d("Try again", "retry", "")}</div>` : "";
    return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="unsupported" data-preview-reason="${c(i.reason || "unknown")}"><p>${l(s)} The receipt’s details remain available in the other sections.</p>${r}</div>${v(e, [])}`;
  }
  return `${ce(i)}<ul class="console-preview__surfaces" aria-label="Application views">${i.surfaces.map((s) => A(e, s)).join("")}</ul>${v(e, i.surfaces)}`;
}
function pe(e) {
  const t = e.activeReceipt ? " This receipt is also the active one; a preview still reads its pinned prepared stage." : "";
  return `
    <div class="console-preview" data-preview-root>
      <p class="console-explorer__para console-muted">Open a registered application view against this prepared receipt. Opening a preview does not verify or activate the receipt or change what ${l(e.selection.target_id)} serves.${l(t)}</p>
      ${le(e)}
      ${ue(e)}
    </div>
  `;
}
var T = 864e5, he = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function fe() {
  try {
    return typeof sessionStorage > "u" ? null : sessionStorage;
  } catch {
    return null;
  }
}
function ve(e, t) {
  if (!k(e) || !k(e.surface)) return null;
  const i = O(e.selection), s = {
    id: _(e.surface.id),
    label: P(e.surface.label),
    kind: D(e.surface.kind, ["screen", "report"])
  }, r = typeof e.at == "number" && Number.isFinite(e.at) ? e.at : NaN;
  if (!i || i.context !== "prepared" || !s.id || !s.label || s.label.length > M.labelBytes || !s.kind || !(t - r < T) || r > t + T) return null;
  const a = {
    selection: i,
    surface: s,
    at: r
  }, n = _(e.session_id), o = typeof e.request_id == "string" && he.test(e.request_id) ? e.request_id : "";
  return n && (a.session_id = n), o && (a.request_id = o), n || o ? a : null;
}
var we = class {
  constructor(e, t, i) {
    this.storage = e, this.key = F(t), this.now = i;
  }
  read() {
    if (!this.storage) return [];
    try {
      const e = JSON.parse(this.storage.getItem(this.key) || "[]");
      if (!Array.isArray(e)) return [];
      const t = this.now();
      return e.map((i) => ve(i, t)).filter((i) => i !== null).slice(-16);
    } catch {
      return [];
    }
  }
  write(e) {
    if (this.storage)
      try {
        const t = e.slice(-16);
        t.length === 0 ? this.storage.removeItem(this.key) : this.storage.setItem(this.key, JSON.stringify(t));
      } catch {
      }
  }
  wipe() {
    if (this.storage)
      try {
        this.storage.removeItem(this.key);
      } catch {
      }
  }
}, be = 16, ye = /* @__PURE__ */ new Set([
  "denied",
  "expired",
  "gone",
  "stale",
  "invalid",
  "unconfigured"
]);
function w(e, t) {
  return `${u(e)}\0${t}`;
}
var ge = class {
  constructor(e) {
    this.launches = /* @__PURE__ */ new Map(), this.capabilityRead = null, this.capabilityStale = !1, this.expiryTimer = null, this.disposed = !1, this.host = e, this.transport = e.transport || (e.routes ? B(e.routes) : q), this.generate = e.generate || (() => ""), this.now = e.now || Date.now, this.identifiable = !!this.generate(), this.store = new we(e.storage === void 0 ? fe() : e.storage, e.storageScope || "", this.now), this.restore();
  }
  show(e) {
    const t = e?.context === "prepared" ? e : void 0;
    t && this.shown && u(t) === u(this.shown) || (this.capabilityRead?.abort(), this.capabilityRead = null, this.capability = void 0, this.capabilityStale = !1, this.shown = t, this.revive(), this.scheduleExpiry());
  }
  render(e) {
    const t = this.shown;
    return t ? pe({
      scope: this.host.scope,
      selection: t,
      title: e.title,
      status: e.status,
      activeReceipt: e.activeReceipt,
      capability: this.capability,
      launch: (i) => this.view(this.launches.get(w(t, i))),
      opened: Array.from(this.launches.values()).filter((i) => (i.session || i.sessionId) && this.isShown(i.selection)).map((i) => i.surface),
      identifiable: this.identifiable,
      base: e.base,
      now: this.now()
    }) : "";
  }
  load(e = !1) {
    const t = this.shown;
    !t || this.disposed || !e && this.capability || this.readCapability(t, !1);
  }
  markStale() {
    this.capability?.status === "ready" && (this.capabilityStale = !0), this.launches.forEach((e) => {
      (e.session?.state === "ready" || e.sessionId && !e.session) && (e.stale = !0);
    });
  }
  revalidate() {
    const e = this.shown;
    !e || this.disposed || (this.capabilityStale && !this.capabilityRead && (this.capabilityStale = !1, this.readCapability(e, !0)), this.launches.forEach((t) => {
      t.stale && !t.busy && u(t.selection) === u(e) && (t.stale = !1, this.check(t, !1));
    }));
  }
  handleClick(e) {
    const t = e.dataset.previewAction || "";
    if (!t) return !1;
    if (e.getAttribute("aria-disabled") === "true") return !0;
    const i = e.dataset.surfaceId || "";
    switch (t) {
      case "retry":
        return this.load(!0), this.host.update("section-panel"), !0;
      case "open":
        return this.open(i, !1), !0;
      case "new":
        return this.open(i, !0), !0;
      case "close":
        return this.close(i), !0;
      case "check": {
        const s = this.shownLaunch(i);
        return s && (s.session || s.sessionId) && !s.busy && this.check(s, !0), !0;
      }
      default:
        return !1;
    }
  }
  refreshFailed() {
    const e = this.shown;
    !e || this.disposed || (this.launches.forEach((t) => {
      this.isShown(t.selection) && t.failure?.action === "open" && t.submitted?.state !== "uncertain" && (t.failure = null);
    }), this.capability?.status === "failed" ? this.load(!0) : this.capabilityRead || this.readCapability(e, !0));
  }
  clear(e = !1) {
    e && this.store.wipe(), this.capabilityRead?.abort(), this.capabilityRead = null, this.capability = void 0, this.capabilityStale = !1, this.launches.forEach((t) => {
      t.controller?.abort(), t.controller = null;
    }), this.launches.clear(), this.shown = void 0, this.clearExpiry();
  }
  destroy() {
    this.clear(), this.disposed = !0;
  }
  view(e) {
    if (e)
      return {
        session: e.session,
        now: this.clock(e),
        busy: e.busy,
        uncertain: e.submitted?.state === "uncertain",
        failure: e.failure,
        remembered: !e.session && !!e.sessionId
      };
  }
  restore() {
    this.store.read().forEach((e) => {
      const t = w(e.selection, e.surface.id);
      this.launches.set(t, {
        key: t,
        selection: e.selection,
        surfaceId: e.surface.id,
        surface: e.surface,
        nextID: this.generate(),
        submitted: e.request_id ? {
          id: e.request_id,
          state: "uncertain"
        } : null,
        session: null,
        busy: "",
        failure: null,
        controller: null,
        stale: !1,
        skew: 0,
        sessionId: e.session_id || ""
      });
    });
  }
  persist() {
    const e = [];
    this.launches.forEach((t) => {
      const i = t.session?.session_id || t.sessionId, s = t.submitted && t.submitted.state !== "settled" ? t.submitted.id : "";
      if (!i && !s) return;
      const r = {
        selection: t.selection,
        surface: t.surface,
        at: this.now()
      };
      i && (r.session_id = i), s && (r.request_id = s), e.push(r);
    }), this.store.write(e);
  }
  revive() {
    !this.shown || this.disposed || this.launches.forEach((e) => {
      e.sessionId && !e.session && !e.busy && this.isShown(e.selection) && this.check(e, !1);
    });
  }
  clock(e) {
    return this.now() + e.skew;
  }
  dated(e, t) {
    if (t === void 0) return;
    const i = t - this.now();
    e.skew = Math.abs(i) <= 864e5 ? i : 0;
  }
  shownLaunch(e) {
    return this.shown ? this.launches.get(w(this.shown, e)) : void 0;
  }
  isShown(e) {
    return !!this.shown && u(this.shown) === u(e);
  }
  landed(e, t = "") {
    this.disposed || (this.scheduleExpiry(), this.isShown(e.selection) && this.host.update(t));
  }
  readCapability(e, t) {
    this.capabilityRead?.abort();
    const i = new AbortController();
    this.capabilityRead = i, t || (this.capability = { status: "loading" }), this.transport.capabilities(e, i.signal).then((s) => {
      if (this.disposed || i.signal.aborted || this.capabilityRead !== i) return;
      this.capabilityRead = null;
      const r = s.ok ? {
        status: "ready",
        value: s.value
      } : {
        status: "failed",
        failure: s.failure
      };
      if (t && !s.ok && !ye.has(s.failure.kind)) return;
      const a = t && JSON.stringify(this.capability) === JSON.stringify(r);
      this.capability = r, a || this.host.update();
    });
  }
  offeredSurface(e) {
    const t = this.capability;
    if (!(t?.status !== "ready" || !t.value.supported))
      return t.value.surfaces.find((i) => i.id === e);
  }
  ensureLaunch(e, t) {
    const i = w(e, t.id);
    let s = this.launches.get(i);
    if (s)
      return s.surface = t, this.launches.delete(i), this.launches.set(i, s), s;
    s = {
      key: i,
      selection: e,
      surfaceId: t.id,
      surface: t,
      nextID: this.generate(),
      submitted: null,
      session: null,
      busy: "",
      failure: null,
      controller: null,
      stale: !1,
      skew: 0,
      sessionId: ""
    }, this.launches.set(i, s);
    for (const [r, a] of this.launches) {
      if (this.launches.size <= be) break;
      !a.busy && r !== i && this.launches.delete(r);
    }
    return this.persist(), s;
  }
  open(e, t) {
    const i = this.shown, s = this.offeredSurface(e);
    if (!i || this.disposed || !s) return;
    const r = this.ensureLaunch(i, s);
    if (r.busy || !t && h(r.session, this.clock(r))) return;
    let a;
    if (!t && r.submitted?.state === "uncertain") a = r.submitted.id;
    else {
      if (r.nextID || (r.nextID = this.generate()), !r.nextID) {
        this.host.update(`preview:open:${e}`);
        return;
      }
      a = r.nextID, r.nextID = this.generate(), r.session = null, r.sessionId = "";
    }
    r.submitted = {
      id: a,
      state: "pending"
    }, r.busy = "opening", r.failure = null, r.stale = !1, this.persist();
    const n = new AbortController();
    r.controller = n, this.host.update(`preview:open:${e}`), this.transport.open({
      selection: r.selection,
      surface_id: e,
      request_id: a
    }, n.signal).then((o) => {
      if (this.disposed || r.controller !== n) return;
      r.controller = null, r.busy = "";
      const p = r.submitted;
      if (o.ok) {
        p && (p.state = "settled"), this.dated(r, o.serverTime), r.session = o.value, r.sessionId = o.value.session_id, this.persist(), this.landed(r, h(o.value, this.clock(r)) ? `preview:launch:${e}` : `preview:new:${e}`);
        return;
      }
      H.has(o.failure.kind) ? p && (p.state = "uncertain") : r.submitted = null, r.failure = {
        action: "open",
        failure: o.failure
      }, this.persist(), this.landed(r, `preview:open:${e}`);
    });
  }
  close(e) {
    const t = this.shownLaunch(e), i = t?.session;
    if (!t || !i || t.busy || this.disposed) return;
    t.busy = "closing", t.failure = null;
    const s = new AbortController();
    t.controller = s, this.host.update(`preview:close:${e}`);
    const r = {
      sessionId: i.session_id,
      selection: t.selection,
      surfaceId: e
    };
    this.transport.close(r, s.signal).then((a) => {
      if (!(this.disposed || t.controller !== s)) {
        if (t.controller = null, t.busy = "", a.ok) {
          this.dated(t, a.serverTime), t.session = a.value, this.persist(), this.landed(t, `preview:new:${e}`);
          return;
        }
        t.failure = {
          action: "close",
          failure: a.failure
        }, f.has(a.failure.kind) && t.session && (t.session = {
          ...t.session,
          state: "unavailable",
          launch_url: ""
        }), this.landed(t, t.session?.state === "ready" ? `preview:close:${e}` : `preview:new:${e}`);
      }
    });
  }
  check(e, t) {
    const i = e.session?.session_id || e.sessionId;
    if (!i || e.busy || this.disposed) return;
    const s = !e.session;
    e.busy = "checking", t && (e.failure = null);
    const r = new AbortController();
    e.controller = r, t && this.host.update(`preview:check:${e.surfaceId}`);
    const a = {
      sessionId: i,
      selection: e.selection,
      surfaceId: e.surfaceId
    };
    this.transport.session(a, r.signal).then((n) => {
      if (this.disposed || e.controller !== r) return;
      if (e.controller = null, e.busy = "", s && !n.ok && f.has(n.failure.kind)) {
        this.launches.delete(e.key), this.persist(), this.landed(e);
        return;
      }
      const o = JSON.stringify([e.session, e.failure]);
      n.ok ? (this.dated(e, n.serverTime), e.session = n.value, e.sessionId = n.value.session_id, e.failure = null) : (f.has(n.failure.kind) || t || s) && (f.has(n.failure.kind) && e.session && (e.session = {
        ...e.session,
        state: "unavailable",
        launch_url: ""
      }), e.failure = {
        action: "check",
        failure: n.failure
      }), this.persist(), (t || s || o !== JSON.stringify([e.session, e.failure])) && this.landed(e, t ? this.checkFocus(e) : "");
    });
  }
  checkFocus(e) {
    return h(e.session, this.clock(e)) ? `preview:launch:${e.surfaceId}` : e.session ? `preview:new:${e.surfaceId}` : `preview:check:${e.surfaceId}`;
  }
  clearExpiry() {
    this.expiryTimer !== null && clearTimeout(this.expiryTimer), this.expiryTimer = null;
  }
  scheduleExpiry() {
    if (this.clearExpiry(), !this.shown || this.disposed) return;
    let e = 1 / 0;
    if (this.launches.forEach((i) => {
      !this.isShown(i.selection) || !h(i.session, this.clock(i)) || (e = Math.min(e, Date.parse(i.session.expires_at) - this.clock(i)));
    }), !Number.isFinite(e)) return;
    const t = Math.min(Math.max(e, 0) + 50, 18e5);
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null, !this.disposed && (this.launches.forEach((i) => {
        this.isShown(i.selection) && i.session?.state === "ready" && !h(i.session, this.clock(i)) && this.check(i, !1);
      }), this.host.update(), this.scheduleExpiry());
    }, t);
  }
};
function Le(e) {
  return new ge(e);
}
export {
  ge as DataPreview,
  M as PREVIEW_LIMITS,
  Ce as PREVIEW_STATES,
  Ae as PREVIEW_TIMEOUT_MS,
  g as REQUEST_ID_REASON,
  H as UNCERTAIN_FAILURES,
  Re as classifyPreviewFailure,
  Le as createDataPreview,
  B as createHTTPPreviewTransport,
  V as launchHref,
  Se as openWire,
  Ee as parseCapability,
  Ne as parseSession,
  _ as previewID,
  xe as previewPath,
  pe as renderPreview,
  U as safeGuarantees,
  y as sessionExpired,
  h as sessionLive,
  Ie as sessionPath,
  q as unconfiguredPreviewTransport
};

//# sourceMappingURL=data-preview.js.map