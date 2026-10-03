import { escapeAttribute as o, escapeHTML as r } from "../shared/html.js";
import { S as P, o as O } from "../chunks/rich-C-60Te1B.js";
import { g as p } from "../chunks/transport-DVxB6IT1.js";
import { a as U, c as fe, d as ve, f as we, i as ye, l as be, n as ge, o as $e, p as F, r as M, s as _e, t as ke, u as me } from "../chunks/transport-CrXa2Trj.js";
var B = P, Y = {
  screen: "Screen",
  report: "Report"
}, q = {
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
}, G = /* @__PURE__ */ new Set([
  "network",
  "timeout",
  "canceled",
  "failed",
  "malformed"
]), x = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), b = /* @__PURE__ */ new Set([
  "gone",
  "denied",
  "stale"
]), H = /* @__PURE__ */ new Set([
  "stale",
  "gone",
  "denied",
  "expired",
  "invalid",
  "unconfigured"
]), k = {
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
}, K = {
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
}, R = {
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
}, W = {
  ...R,
  invalid: "This preview could not be checked. Reload the page.",
  timeout: "Checking the preview took too long.",
  failed: "Checking the preview failed.",
  canceled: "Checking the preview was interrupted.",
  unavailable: "Checking the preview is temporarily unavailable."
}, m = {
  not_supported: "This application does not offer previews of prepared data.",
  runtime_unavailable: "The application cannot open a preview of this receipt right now.",
  no_readable_surfaces: "No application view you can open is registered for this data.",
  unknown: "Application preview is not available for this receipt."
};
function $(e, t = "") {
  return O(e, t, B);
}
function T(e) {
  return `<span class="console-muted">${r(e)}</span>`;
}
function E(e, t = "") {
  return t ? `preview:${e}:${t}` : `preview:${e}`;
}
function u(e, t, i, s = {}) {
  const a = `console-btn console-btn--sm${s.primary ? " console-btn--primary" : ""}`, n = s.busy || s.disabled ? ' aria-disabled="true"' : "", c = s.busy ? ' aria-busy="true"' : "", l = s.disabled ? ` title="${o(s.disabled)}"` : "";
  return `<button type="button" class="${a}" data-preview-action="${t}"${i ? ` data-surface-id="${o(i)}"` : ""} data-explorer-focus="${o(E(t, i))}"${n}${c}${l}${s.extra || ""}>${r(e)}</button>`;
}
function j(e, t) {
  if (!e) return "";
  try {
    const i = new URL(t), s = new URL(e, i);
    return s.origin === i.origin && (s.protocol === "http:" || s.protocol === "https:") ? s.href : "";
  } catch {
    return "";
  }
}
function _(e, t) {
  const i = Date.parse(e.expires_at);
  return !Number.isFinite(i) || i <= t;
}
function f(e, t) {
  return !!e && e.state === "ready" && !_(e, t);
}
function C(e) {
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
function J(e, t) {
  const i = Math.ceil((Date.parse(e) - t) / 6e4);
  return !Number.isFinite(i) || i <= 0 ? "now" : i === 1 ? "in 1 minute" : `in ${i} minutes`;
}
function V(e, t) {
  const i = new Date(e.expires_at);
  return `<time${Number.isNaN(i.getTime()) ? "" : ` datetime="${o(i.toISOString())}"`} title="${o(i.toLocaleString())}">${r(C(e.expires_at))}</time> (${r(J(e.expires_at, t))})`;
}
function z(e, t) {
  return e.state === "closed" ? "This preview was closed. Nothing it showed is kept." : e.state === "expired" || e.state === "ready" && _(e, t) ? `This preview expired at ${C(e.expires_at)}. Start a new preview to look again.` : "This preview ended because the receipt, your access or the application runtime changed.";
}
function Q(e) {
  if (!e) return "";
  const t = e.action === "open" ? K : e.action === "close" ? R : W;
  return t[e.failure.kind] || t.failed;
}
function X(e) {
  const t = e.failure;
  if (!t) return "";
  const i = t.failure.kind;
  return t.action === "open" ? i === "stale" || i === "gone" || i === "invalid" ? A() : "" : t.action === "check" && x.has(i) && e.session ? u("Check again", "check", e.session.surface_id) : "";
}
function A() {
  return '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>';
}
function Z(e) {
  const t = Q(e.failure);
  if (!t) return "";
  const i = e.failure.failure.kind, s = i === "denied" || i === "expired" ? "error" : "warning", a = X(e);
  return `<div class="console-callout console-preview__failure" data-tone="${s}" role="alert" data-preview-failure="${o(`${e.failure.action}:${i}`)}"><p>${r(t)}</p>${a ? `<div class="console-explorer__state-actions">${a}</div>` : ""}</div>`;
}
function ee(e, t, i, s) {
  const a = i?.session || null, n = i?.busy || "", c = i?.now ?? e.now;
  if (n === "opening") return `<div class="console-preview__actions">${u("Starting preview…", "open", t.id, {
    primary: !0,
    busy: !0
  })}</div>`;
  if (a && f(a, c)) {
    const h = n === "closing", v = h ? "" : j(a.launch_url, e.base), N = v ? `<a class="console-btn console-btn--sm console-btn--primary" href="${o(v)}" data-preview-launch data-surface-id="${o(t.id)}" data-explorer-focus="${o(E("launch", t.id))}">Open preview<span class="console-sr-only"> of ${r(t.label)}</span></a>` : h ? "" : T("No launch link is available for this preview."), D = n === "checking" ? '<span class="console-muted" role="status" aria-busy="true">Checking…</span>' : "";
    return `
      <p class="console-preview__status" data-preview-state="ready">Read-only preview of receipt <code class="console-kv__mono">${r(a.selection.receipt_id || "")}</code>. Expires at ${V(a, c)}.</p>
      <div class="console-preview__actions">${N}${u(h ? "Closing…" : "Close preview", "close", t.id, { busy: h })}${D}</div>
    `;
  }
  if (a) {
    const h = a.state === "ready" ? "expired" : a.state, v = s ? `<div class="console-preview__actions">${u("Start a new preview", "new", t.id, { disabled: e.identifiable ? "" : S })}</div>` : "";
    return `
      <p class="console-preview__status" data-preview-state="${o(h)}">${r(z(a, c))}</p>
      ${v}
    `;
  }
  if (!s) return "";
  const l = i?.failure;
  if (l?.action === "open" && H.has(l.failure.kind) && !i?.uncertain) return "";
  const d = e.identifiable ? "" : S, L = d ? `<p class="console-preview__status">${T(d)}</p>` : "";
  let y = "Start preview";
  return i?.uncertain ? y = "Try again" : l?.action === "open" && (y = l.failure.kind === "conflict" ? "Start a new preview" : "Try again"), `${L}<div class="console-preview__actions">${u(y, "open", t.id, {
    primary: !0,
    disabled: d
  })}</div>`;
}
var S = "This browser cannot create a request ID. Use a current browser to start a preview.";
function te(e) {
  const t = e?.session;
  if (!t || e?.busy === "opening") return "";
  const i = t.state === "ready" && _(t, e.now) ? "expired" : t.state, { label: s, tone: a } = q[i];
  return $(s, a);
}
function I(e, t, i = !0) {
  const s = e.launch(t.id);
  return `
    <li class="console-preview__surface" data-surface-id="${o(t.id)}" aria-labelledby="${o(`${e.scope}-surface-${t.id}`)}">
      <div class="console-explorer__usage-head"><span class="console-explorer__usage-label" id="${o(`${e.scope}-surface-${t.id}`)}">${r(t.label)}</span>${$(Y[t.kind])}${te(s)}</div>
      ${ee(e, t, s, i)}
      ${s ? Z(s) : ""}
    </li>
  `;
}
function ie(e) {
  const t = e.selection, i = e.status ? $(e.status.label, e.status.tone) : '<span class="console-kv__empty">Unknown</span>';
  return `<dl class="console-kv console-preview__identity">${[
    ["Scenario", r(e.title)],
    ["Prepared receipt", `<code class="console-kv__mono">${r(t.receipt_id || "")}</code>`],
    ["Content revision", r(String(t.content_revision ?? ""))],
    ["Target", r(t.target_id)],
    ["Lifecycle status", i]
  ].map(([s, a]) => `<dt>${r(s)}</dt><dd>${a}</dd>`).join("")}</dl>`;
}
function se(e) {
  return F(e.guarantees) ? `<ul class="console-preview__guarantees" aria-label="Preview guarantees">${[
    "Read-only",
    "Isolated from the data the target serves",
    "Expires automatically",
    "Cleaned up when closed"
  ].map((t) => `<li>${r(t)}</li>`).join("")}</ul>` : "";
}
function ae(e) {
  const t = k[e.kind] || k.failed, i = x.has(e.kind) ? u("Try again", "retry", "") : "", s = e.kind === "gone" || e.kind === "stale" || e.kind === "invalid" ? A() : "";
  return `<div class="console-callout console-explorer__state" data-tone="${e.kind === "denied" || e.kind === "expired" ? "error" : "warning"}" role="alert" data-preview-failure="capability:${o(e.kind)}"><p>${r(t)}</p>${i || s ? `<div class="console-explorer__state-actions">${i}${s}</div>` : ""}</div>`;
}
function w(e, t) {
  const i = e.opened.filter((s) => !t.some((a) => a.id === s.id));
  return i.length === 0 ? "" : `<ul class="console-preview__surfaces" aria-label="Previews opened from this page">${i.map((s) => I(e, s, !1)).join("")}</ul>`;
}
function ne(e) {
  const t = e.capability;
  if (!t || t.status === "loading") return `<div class="console-explorer__loading" role="status" aria-busy="true">Checking which application views can open this receipt…</div>${w(e, [])}`;
  if (t.status === "failed") return `${ae(t.failure)}${w(e, [])}`;
  const i = t.value;
  if (!i.supported) {
    const s = m[i.reason || "unknown"] || m.unknown, a = i.reason === "runtime_unavailable" ? `<div class="console-explorer__state-actions">${u("Try again", "retry", "")}</div>` : "";
    return `<div class="console-callout console-explorer__state" data-tone="info" data-preview-state="unsupported" data-preview-reason="${o(i.reason || "unknown")}"><p>${r(s)} The receipt’s details remain available in the other sections.</p>${a}</div>${w(e, [])}`;
  }
  return `${se(i)}<ul class="console-preview__surfaces" aria-label="Application views">${i.surfaces.map((s) => I(e, s)).join("")}</ul>${w(e, i.surfaces)}`;
}
function re(e) {
  const t = e.activeReceipt ? " This receipt is also the active one; a preview still reads its pinned prepared stage." : "";
  return `
    <div class="console-preview" data-preview-root>
      <p class="console-explorer__para console-muted">Open a registered application view against this prepared receipt. Opening a preview does not verify or activate the receipt or change what ${r(e.selection.target_id)} serves.${r(t)}</p>
      ${ie(e)}
      ${ne(e)}
    </div>
  `;
}
var oe = 16, le = /* @__PURE__ */ new Set([
  "denied",
  "expired",
  "gone",
  "stale",
  "invalid",
  "unconfigured"
]);
function g(e, t) {
  return `${p(e)}\0${t}`;
}
var ce = class {
  constructor(e) {
    this.launches = /* @__PURE__ */ new Map(), this.capabilityRead = null, this.capabilityStale = !1, this.expiryTimer = null, this.disposed = !1, this.host = e, this.transport = e.transport || (e.routes ? M(e.routes) : U), this.generate = e.generate || (() => ""), this.now = e.now || Date.now, this.identifiable = !!this.generate();
  }
  show(e) {
    const t = e?.context === "prepared" ? e : void 0;
    t && this.shown && p(t) === p(this.shown) || (this.capabilityRead?.abort(), this.capabilityRead = null, this.capability = void 0, this.capabilityStale = !1, this.shown = t, this.scheduleExpiry());
  }
  render(e) {
    const t = this.shown;
    return t ? re({
      scope: this.host.scope,
      selection: t,
      title: e.title,
      status: e.status,
      activeReceipt: e.activeReceipt,
      capability: this.capability,
      launch: (i) => this.view(this.launches.get(g(t, i))),
      opened: Array.from(this.launches.values()).filter((i) => i.session && this.isShown(i.selection)).map((i) => i.surface),
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
      e.session?.state === "ready" && (e.stale = !0);
    });
  }
  revalidate() {
    const e = this.shown;
    !e || this.disposed || (this.capabilityStale && !this.capabilityRead && (this.capabilityStale = !1, this.readCapability(e, !0)), this.launches.forEach((t) => {
      t.stale && !t.busy && p(t.selection) === p(e) && (t.stale = !1, this.check(t, !1));
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
        return s?.session && !s.busy && this.check(s, !0), !0;
      }
      default:
        return !1;
    }
  }
  refreshFailed() {
    this.capability?.status === "failed" && this.load(!0);
  }
  clear() {
    this.capabilityRead?.abort(), this.capabilityRead = null, this.capability = void 0, this.capabilityStale = !1, this.launches.forEach((e) => {
      e.controller?.abort(), e.controller = null;
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
        failure: e.failure
      };
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
    return this.shown ? this.launches.get(g(this.shown, e)) : void 0;
  }
  isShown(e) {
    return !!this.shown && p(this.shown) === p(e);
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
      const a = s.ok ? {
        status: "ready",
        value: s.value
      } : {
        status: "failed",
        failure: s.failure
      };
      if (t && !s.ok && !le.has(s.failure.kind)) return;
      const n = t && JSON.stringify(this.capability) === JSON.stringify(a);
      this.capability = a, n || this.host.update();
    });
  }
  offeredSurface(e) {
    const t = this.capability;
    if (!(t?.status !== "ready" || !t.value.supported))
      return t.value.surfaces.find((i) => i.id === e);
  }
  ensureLaunch(e, t) {
    const i = g(e, t.id);
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
      skew: 0
    }, this.launches.set(i, s);
    for (const [a, n] of this.launches) {
      if (this.launches.size <= oe) break;
      !n.busy && a !== i && this.launches.delete(a);
    }
    return s;
  }
  open(e, t) {
    const i = this.shown, s = this.offeredSurface(e);
    if (!i || this.disposed || !s) return;
    const a = this.ensureLaunch(i, s);
    if (a.busy || !t && f(a.session, this.clock(a))) return;
    let n;
    if (!t && a.submitted?.state === "uncertain") n = a.submitted.id;
    else {
      if (a.nextID || (a.nextID = this.generate()), !a.nextID) {
        this.host.update(`preview:open:${e}`);
        return;
      }
      n = a.nextID, a.nextID = this.generate(), a.session = null;
    }
    a.submitted = {
      id: n,
      state: "pending"
    }, a.busy = "opening", a.failure = null, a.stale = !1;
    const c = new AbortController();
    a.controller = c, this.host.update(`preview:open:${e}`), this.transport.open({
      selection: a.selection,
      surface_id: e,
      request_id: n
    }, c.signal).then((l) => {
      if (this.disposed || a.controller !== c) return;
      a.controller = null, a.busy = "";
      const d = a.submitted;
      if (l.ok) {
        d && (d.state = "settled"), this.dated(a, l.serverTime), a.session = l.value, this.landed(a, f(l.value, this.clock(a)) ? `preview:launch:${e}` : `preview:new:${e}`);
        return;
      }
      G.has(l.failure.kind) ? d && (d.state = "uncertain") : a.submitted = null, a.failure = {
        action: "open",
        failure: l.failure
      }, this.landed(a, `preview:open:${e}`);
    });
  }
  close(e) {
    const t = this.shownLaunch(e), i = t?.session;
    if (!t || !i || t.busy || this.disposed) return;
    t.busy = "closing", t.failure = null;
    const s = new AbortController();
    t.controller = s, this.host.update(`preview:close:${e}`);
    const a = {
      sessionId: i.session_id,
      selection: t.selection,
      surfaceId: e
    };
    this.transport.close(a, s.signal).then((n) => {
      if (!(this.disposed || t.controller !== s)) {
        if (t.controller = null, t.busy = "", n.ok) {
          this.dated(t, n.serverTime), t.session = n.value, this.landed(t, `preview:new:${e}`);
          return;
        }
        t.failure = {
          action: "close",
          failure: n.failure
        }, b.has(n.failure.kind) && t.session && (t.session = {
          ...t.session,
          state: "unavailable",
          launch_url: ""
        }), this.landed(t, t.session?.state === "ready" ? `preview:close:${e}` : `preview:new:${e}`);
      }
    });
  }
  check(e, t) {
    const i = e.session;
    if (!i || e.busy || this.disposed) return;
    e.busy = "checking", t && (e.failure = null);
    const s = new AbortController();
    e.controller = s, t && this.host.update(`preview:check:${e.surfaceId}`);
    const a = {
      sessionId: i.session_id,
      selection: e.selection,
      surfaceId: e.surfaceId
    };
    this.transport.session(a, s.signal).then((n) => {
      if (this.disposed || e.controller !== s) return;
      e.controller = null, e.busy = "";
      const c = JSON.stringify([e.session, e.failure]);
      n.ok ? (this.dated(e, n.serverTime), e.session = n.value, e.failure = null) : (b.has(n.failure.kind) || t) && (b.has(n.failure.kind) && e.session && (e.session = {
        ...e.session,
        state: "unavailable",
        launch_url: ""
      }), e.failure = {
        action: "check",
        failure: n.failure
      }), (t || c !== JSON.stringify([e.session, e.failure])) && this.landed(e, t ? f(e.session, this.clock(e)) ? `preview:launch:${e.surfaceId}` : `preview:new:${e.surfaceId}` : "");
    });
  }
  clearExpiry() {
    this.expiryTimer !== null && clearTimeout(this.expiryTimer), this.expiryTimer = null;
  }
  scheduleExpiry() {
    if (this.clearExpiry(), !this.shown || this.disposed) return;
    let e = 1 / 0;
    if (this.launches.forEach((i) => {
      !this.isShown(i.selection) || !f(i.session, this.clock(i)) || (e = Math.min(e, Date.parse(i.session.expires_at) - this.clock(i)));
    }), !Number.isFinite(e)) return;
    const t = Math.min(Math.max(e, 0) + 50, 18e5);
    this.expiryTimer = setTimeout(() => {
      this.expiryTimer = null, !this.disposed && (this.launches.forEach((i) => {
        this.isShown(i.selection) && i.session?.state === "ready" && !f(i.session, this.clock(i)) && this.check(i, !1);
      }), this.host.update(), this.scheduleExpiry());
    }, t);
  }
};
function Te(e) {
  return new ce(e);
}
export {
  ce as DataPreview,
  $e as PREVIEW_LIMITS,
  _e as PREVIEW_STATES,
  ke as PREVIEW_TIMEOUT_MS,
  S as REQUEST_ID_REASON,
  G as UNCERTAIN_FAILURES,
  ge as classifyPreviewFailure,
  Te as createDataPreview,
  M as createHTTPPreviewTransport,
  j as launchHref,
  fe as openWire,
  be as parseCapability,
  me as parseSession,
  ve as previewID,
  we as previewPath,
  re as renderPreview,
  F as safeGuarantees,
  _ as sessionExpired,
  f as sessionLive,
  ye as sessionPath,
  U as unconfiguredPreviewTransport
};

//# sourceMappingURL=data-preview.js.map