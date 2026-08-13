import { escapeAttribute as A, escapeHTML as s } from "../shared/html.js";
import { httpRequest as ke, readExpectedHTTPJSON as Re } from "../shared/transport/http-client.js";
import { A as Q, C as Ce, F as je, O as se, S as xe, b as Pe, h as Oe, k as ce, m as Le, w as Ee } from "./runtime-helpers-C2cPJaEE.js";
function Ne(e) {
  return je(e).load;
}
var Te = Ne(() => import("../debug/syntax-highlight.js"));
function de(e, t) {
  return `<code data-debug-syntax="${t}">${s(e)}</code>`;
}
async function kt(e) {
  const t = Array.from(e.querySelectorAll("[data-debug-syntax]:not([data-debug-syntax-ready])"));
  if (t.length === 0) return;
  const n = t.map((r) => r.textContent || "");
  t.forEach((r) => r.setAttribute("aria-busy", "true"));
  try {
    const r = await Te();
    t.forEach((i, o) => {
      !i.isConnected || i.textContent !== n[o] || (i.innerHTML = i.dataset.debugSyntax === "sql" ? r.highlightSQL(n[o], !0) : r.highlightJSON(n[o], !0), i.setAttribute("data-debug-syntax-ready", "true"), i.removeAttribute("aria-busy"), i.removeAttribute("title"));
    });
  } catch {
    t.forEach((r) => {
      r.removeAttribute("aria-busy"), r.title = "Syntax highlighting unavailable. Activate again to retry.";
    });
  }
}
function Ie(e) {
  let t = 5381;
  for (let n = 0; n < e.length; n++) t = (t << 5) + t + e.charCodeAt(n) | 0;
  return (t >>> 0).toString(36);
}
var Fe = (e) => {
  typeof requestAnimationFrame == "function" ? requestAnimationFrame(() => e()) : setTimeout(e, 16);
};
function Me(e, t, n) {
  e.insertAdjacentHTML(n ? "afterbegin" : "beforeend", t);
}
function G(e, t) {
  let n = e.nextElementSibling;
  for (e.remove(); n && !n.matches(t); ) {
    const r = n.nextElementSibling;
    n.remove(), n = r;
  }
}
function Ve(e, t, n, r, i) {
  if (!r || r <= 0) return [];
  const o = Array.from(e.querySelectorAll(t)), a = o.length - r;
  if (a <= 0) return [];
  const c = i ? o.reverse() : o, u = [];
  for (let d = 0; d < a; d++) {
    const l = c[d];
    if (!l) break;
    const p = l.getAttribute(n);
    p && u.push(p), G(l, t);
  }
  return u;
}
var Rt = class {
  constructor(e) {
    this.root = null, this.container = null, this.pending = [], this.frameScheduled = !1, this.paused = !1, this.wired = /* @__PURE__ */ new WeakSet(), this.opts = e, this.scheduleFrame = e.scheduleFrame || Fe, this.containerSelector = e.containerSelector || "[data-live-list]", this.rowSelector = e.rowSelector || "[data-row-key]", this.keyAttr = e.keyAttr || "data-row-key";
  }
  adopt(e) {
    this.root = e, this.container = e.querySelector(this.containerSelector), this.container && (this.wired.has(this.container) || (this.wired.add(this.container), this.opts.onAdopt?.(e, this.container)), this.opts.onRestore?.(e, this.container));
  }
  enqueue(e) {
    if (!(!e || e.length === 0)) {
      for (const t of e) this.pending.push(t);
      if (this.paused) {
        this.emitPending();
        return;
      }
      if (this.opts.updateMode === "upsert" && e.some((t) => this.opts.terminalOf?.(t))) {
        this.flush();
        return;
      }
      this.scheduleFlush();
    }
  }
  setPaused(e) {
    this.paused = e, !e && this.pending.length > 0 && this.scheduleFlush();
  }
  get pendingCount() {
    return this.pending.length;
  }
  discardPending() {
    this.pending.length !== 0 && (this.pending = [], this.emitPending());
  }
  scheduleFlush() {
    this.frameScheduled || (this.frameScheduled = !0, this.scheduleFrame(() => {
      this.frameScheduled = !1, this.flush();
    }));
  }
  flush() {
    if (this.paused) return;
    let e = this.pending;
    if (this.pending = [], this.emitPending(), e.length === 0) return;
    if (!this.container) {
      this.opts.onNeedFullRender?.();
      return;
    }
    const t = this.opts.getRenderOptions().newestFirst !== !1, n = this.opts.getMaxEntries();
    this.opts.updateMode === "upsert" && (e = this.collapseUpserts(e)), n && e.length > n && (e = e.slice(-n));
    const r = this.opts.updateMode === "upsert", i = this.container.scrollTop, o = typeof document < "u" ? document.activeElement : null, a = (o && this.container.contains(o) ? o.closest(this.rowSelector) : null)?.getAttribute(this.keyAttr) || "", c = o?.hasAttribute("data-live-row-focus") === !0, u = [];
    for (const d of e) {
      const l = this.opts.keyOf(d), p = this.findRow(l);
      if (this.opts.shouldDisplay && !this.opts.shouldDisplay(d)) {
        p && this.opts.updateMode === "upsert" && G(p, this.rowSelector);
        continue;
      }
      if (this.opts.updateMode === "upsert" && p) {
        if (!this.shouldReplace(p, d)) continue;
        p.insertAdjacentHTML("beforebegin", this.opts.renderRow(d)), G(p, this.rowSelector), this.decorateRow(this.findRow(l), d), u.push(l);
        continue;
      }
      Me(this.container, this.opts.renderRow(d), t), this.decorateRow(this.findRow(l), d), u.push(l);
    }
    if (u.length > 0) {
      const d = Ve(this.container, this.rowSelector, this.keyAttr, n, t);
      d.length > 0 && this.opts.onEvict?.(d), this.opts.onAfterAppend?.(this.container, u);
    }
    if (r && (this.container.scrollTop = i), this.opts.onRestore?.(this.root || this.container, this.container), a && o && !o.isConnected) {
      const d = this.findRow(a);
      (c ? d?.querySelector("[data-live-row-focus]") : d)?.focus({ preventScroll: !0 });
    }
  }
  collapseUpserts(e) {
    const t = /* @__PURE__ */ new Map(), n = [];
    for (const r of e) {
      const i = this.opts.keyOf(r), o = t.get(i);
      if (!o) {
        n.push(i), t.set(i, r);
        continue;
      }
      this.shouldAdvance(o, r) && t.set(i, r);
    }
    return n.map((r) => t.get(r)).filter(Boolean);
  }
  shouldAdvance(e, t) {
    const n = this.opts.revisionOf?.(t) ?? 0, r = this.opts.revisionOf?.(e) ?? 0;
    return !(n > 0 && r > 0 && n <= r || this.opts.terminalOf?.(e) === !0 && this.opts.terminalOf && !this.opts.terminalOf(t));
  }
  findRow(e) {
    return this.container && Array.from(this.container.querySelectorAll(this.rowSelector)).find((t) => t.getAttribute(this.keyAttr) === e) || null;
  }
  shouldReplace(e, t) {
    const n = this.opts.revisionOf?.(t) ?? 0, r = Number(e.getAttribute("data-row-revision") || "0");
    return !(n > 0 && r > 0 && n <= r || e.getAttribute("data-row-terminal") === "true" && this.opts.terminalOf && !this.opts.terminalOf(t));
  }
  decorateRow(e, t) {
    e && (this.opts.revisionOf && e.setAttribute("data-row-revision", String(this.opts.revisionOf(t))), this.opts.terminalOf && e.setAttribute("data-row-terminal", this.opts.terminalOf(t) ? "true" : "false"));
  }
  emitPending() {
    this.opts.onPendingChange?.(this.pending.length);
  }
};
function le(e, t, n) {
  return t ? `
      <button class="${e.copyBtn}" data-copy-trigger="${n}" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${e.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function ue(e, t, n, r = {}) {
  const { useIconCopyButton: i = !1, filterFn: o, showCount: a = !0 } = r, c = t && typeof t == "object" && !Array.isArray(t), u = Array.isArray(t);
  let d = t ?? {};
  if (c && o && (d = o(t)), c && Object.keys(d).length === 0 || u && d.length === 0 || !c && !u && !d) return `<div class="${n.emptyState}">No ${e.toLowerCase()} data available</div>`;
  const l = se(d), p = de(l, "json"), y = Ee(d), k = u ? "items" : c ? "keys" : "entries", C = le(n, i, `copy-${e.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`), f = a ? `<span class="${n.muted}">${ce(y)} ${k}</span>` : "";
  return `
    <section class="${n.jsonPanel}" data-copy-content="${s(l)}">
      <div class="${n.jsonHeader}">
        <span class="${n.jsonViewerTitle}">${s(e)}</span>
        <div class="${n.jsonActions}">
          ${f}
          ${C}
        </div>
      </div>
      <pre>${p}</pre>
    </section>
  `;
}
function Ct(e, t, n = {}) {
  const { useIconCopyButton: r = !1 } = n;
  if (!e || typeof e == "object" && Object.keys(e).length === 0) return "";
  const i = se(e), o = de(i, "json"), a = le(t, r, `viewer-${Date.now()}`);
  return `
    <div class="${t.jsonViewer}" data-copy-content="${s(i)}">
      <div class="${t.jsonViewerHeader}">
        ${a}
      </div>
      <pre>${o}</pre>
    </div>
  `;
}
function K(e, t) {
  if (t) {
    const r = m(_(e, t));
    if (r) return r;
  }
  let n;
  try {
    n = JSON.stringify(e) ?? "";
  } catch {
    n = m(e);
  }
  return `schema-${Ie(n)}`;
}
function m(e) {
  if (e == null) return "";
  if (typeof e == "string") return e;
  if (typeof e == "number" || typeof e == "boolean") return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function _(e, t) {
  const n = typeof t == "string" ? t.trim().replace(/^\$\./, "") : "";
  return n ? n.split(".").filter(Boolean).reduce((r, i) => {
    if (!(r == null || typeof r != "object"))
      return r[i];
  }, e) : e;
}
function D(e, t) {
  const n = e?.options?.[t];
  return Array.isArray(n) ? n.filter((r) => r && typeof r == "object") : [];
}
function Y(e) {
  return Array.isArray(e) ? e : e && typeof e == "object" ? Object.entries(e).map(([t, n]) => ({
    key: t,
    value: n
  })) : [];
}
function pe(e) {
  const t = m(e).trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(t) ? t : null;
}
function Z(e, t) {
  const n = typeof t == "string" ? t.trim().toLowerCase() : "";
  return n === "number" ? ce(e) : n === "timestamp" || n === "time" || n === "date" ? Q(e) : n === "datetime" ? qe(e) : n === "boolean" ? e ? "Yes" : "No" : m(e);
}
function qe(e) {
  if (e == null || e === "") return "";
  const t = typeof e == "number" ? new Date(e) : new Date(m(e));
  return Number.isNaN(t.getTime()) ? m(e) : t.toLocaleString();
}
function fe(e) {
  return e == null || e === "";
}
function H(e) {
  return `<span class="debug-kv__empty">${s(e || "Unavailable")}</span>`;
}
function me(e, t, n, r, i = "") {
  const o = typeof t == "string" ? t.trim().toLowerCase() : "";
  if (fe(e)) return H(n);
  const a = Z(e, t);
  if (a === "") return H(n);
  switch (o) {
    case "copy":
      return he(a, r, i);
    case "color": {
      const c = pe(a);
      return c ? `<span class="debug-kv__swatch" style="--debug-swatch-color:${A(c)}"><span class="debug-kv__swatch-dot" aria-hidden="true"></span><code>${s(c.toUpperCase())}</code></span>` : H(n);
    }
    case "badge":
      return `<span class="${r.badge}">${s(a)}</span>`;
    case "mono":
      return `<code class="debug-kv__mono">${s(a)}</code>`;
    default:
      return s(a);
  }
}
function he(e, t, n = "") {
  const r = n ? `Copy ${n}` : "Copy to clipboard";
  return `<span class="debug-kv__copy" data-copy-content="${A(e)}"><code class="debug-kv__mono">${s(e)}</code><button type="button" class="${t.copyBtnSm} debug-kv__copy-btn" data-copy-trigger title="${A(r)}" aria-label="${A(r)}">Copy</button></span>`;
}
function B(e, t) {
  return e ? `<div class="${t.jsonHeader}"><h3 class="${t.jsonViewerTitle}">${s(e)}</h3></div>` : "";
}
function Ue(e, t, n, r) {
  const i = D(n, "metrics"), o = i.length > 0 ? i : Object.entries(t && typeof t == "object" && !Array.isArray(t) ? t : {}).map(([a]) => ({
    label: a,
    bind: a
  }));
  return o.length === 0 ? `<div class="${r.emptyState}">No ${s(e.toLowerCase())} metrics available</div>` : `
    <section class="${r.jsonPanel}">
      ${B(e, r)}
      <div class="${r.jsonGrid}">
        ${o.map((a) => {
    const c = m(a.label || a.bind), u = Z(_(t, a.bind), a.format), d = m(_(t, a.severity) || a.status || "");
    return `
            <div class="${r.detailPane}" data-severity="${s(d)}">
              <div class="${r.detailLabel}">${s(c)}</div>
              <div class="${r.detailValue}">${s(u)}</div>
            </div>
          `;
  }).join("")}
      </div>
    </section>
  `;
}
function De(e, t, n, r) {
  const i = D(n, "fields"), o = i.length > 0 ? i : Object.entries(t && typeof t == "object" && !Array.isArray(t) ? t : {}).map(([a]) => ({
    label: a,
    bind: a
  }));
  return o.length === 0 ? `<div class="${r.emptyState}">No ${s(e.toLowerCase())} details available</div>` : `
    <section class="${r.jsonPanel}">
      ${B(e, r)}
      <dl class="debug-kv">
        ${o.map((a) => {
    const c = m(a.label || a.bind), u = _(t, a.bind), d = m(a.empty || "");
    return `<dt>${s(c)}</dt><dd>${me(u, a.format, d, r, c)}</dd>`;
  }).join("")}
      </dl>
    </section>
  `;
}
function Be(e, t, n, r) {
  const i = n?.options || {}, o = (R) => typeof R == "string" && R.trim() !== "" ? _(t, R) : void 0, a = pe(o(i.color_bind)), c = m(o(i.eyebrow_bind)).trim(), u = m(o(i.title_bind)).trim(), d = m(o(i.title_fallback_bind)).trim(), l = u || d, p = m(o(i.subtitle_bind)).trim(), y = D(n, "chips").filter((R) => !fe(o(R.bind))), k = o(i.avatar_bind), C = m(o(i.avatar_name_bind)).trim(), f = xe(k && typeof k == "object" ? {
    name: C || l,
    visual: k
  } : void 0), b = Ce(f, "debug-identity__avatar");
  if (!c && !l && y.length === 0) return `<div class="${r.emptyState}">No ${s((e || "identity").toLowerCase())} details available</div>`;
  const q = m(i.title_format), L = m(u ? i.title_label : i.title_fallback_label), S = l ? q === "copy" ? he(l, r, L || e || "value") : `<span class="debug-identity__value">${s(l)}</span>` : H(m(i.empty));
  return `
    <section class="debug-identity"${a ? ` style="--debug-identity-color:${A(a)}"` : ""}${a ? "" : ' data-accent="none"'}>
      <div class="debug-identity__lead">
        ${b}
        ${c ? `<span class="debug-identity__env"><span class="debug-identity__dot" aria-hidden="true"></span>${s(c.toUpperCase())}</span>` : ""}
        <div class="debug-identity__names">
          ${e ? `<span class="debug-identity__label">${s(e)}</span>` : ""}
          <span class="debug-identity__title">${S}</span>
          ${p ? `<span class="debug-identity__subtitle">${s(p)}</span>` : ""}
        </div>
      </div>
      ${y.length > 0 ? `<dl class="debug-identity__chips">${y.map((R) => {
    const X = m(R.label || R.bind), we = me(o(R.bind), R.format, m(R.empty || ""), r, X);
    return `<div class="debug-identity__chip"><dt>${s(X)}</dt><dd>${we}</dd></div>`;
  }).join("")}</dl>` : ""}
    </section>
  `;
}
function be(e, t, n) {
  const r = t.length > 0 ? t : Object.keys(e && typeof e == "object" ? e : {}).map((i) => ({
    label: i,
    bind: i
  }));
  return `
    <tr data-row-key="${A(K(e, n))}">
      ${r.map((i) => `<td>${s(Z(_(e, i.bind), i.format))}</td>`).join("")}
    </tr>
  `;
}
function He(e, t, n, r, i = !1) {
  const o = Y(t), a = D(n, "columns"), c = a.length > 0 ? a : Object.keys(o[0] && typeof o[0] == "object" ? o[0] : {}).map((l) => ({
    label: l,
    bind: l
  }));
  if (o.length === 0 || c.length === 0) return `<div class="${r.emptyState}">No ${s(e.toLowerCase())} rows available</div>`;
  const u = n?.options?.key_bind, d = i ? [...o].reverse() : o;
  return `
    <section class="${r.jsonPanel}">
      ${B(e, r)}
      <table class="${r.table}">
        <thead>
          <tr>${c.map((l) => `<th>${s(m(l.label || l.bind))}</th>`).join("")}</tr>
        </thead>
        <tbody data-live-list>
          ${d.map((l) => be(l, c, u)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function $e(e, t, n) {
  const r = m(_(e, t?.options?.label_bind || "label") || _(e, "name") || _(e, "key")), i = m(_(e, t?.options?.description_bind || "description") || _(e, "message")), o = m(_(e, t?.options?.status_bind || "status") || _(e, "severity"));
  return `
    <tr data-row-key="${A(K(e, t?.options?.key_bind))}">
      <td><span class="${n.badge}">${s(o || "status")}</span></td>
      <td><strong>${s(r)}</strong>${i ? `<div class="${n.muted}">${s(i)}</div>` : ""}</td>
    </tr>
  `;
}
function Je(e, t, n, r, i = !1) {
  const o = Y(t);
  if (o.length === 0) return `<div class="${r.emptyState}">No ${s(e.toLowerCase())} statuses available</div>`;
  const a = i ? [...o].reverse() : o;
  return `
    <section class="${r.jsonPanel}">
      ${B(e, r)}
      <table class="${r.table}">
        <tbody data-live-list>
          ${a.map((c) => $e(c, n, r)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function ge(e, t, n) {
  const r = Q(_(e, t?.options?.timestamp_bind || "timestamp")), i = m(_(e, t?.options?.message_bind || "message") || _(e, "title")), o = m(_(e, t?.options?.level_bind || "level") || _(e, "severity"));
  return `
    <tr data-row-key="${A(K(e, t?.options?.key_bind))}">
      <td class="${n.timestamp}">${s(r)}</td>
      <td>${o ? `<span class="${n.badge}">${s(o)}</span> ` : ""}${s(i)}</td>
    </tr>
  `;
}
function Ke(e, t, n, r, i = !1) {
  const o = Y(t);
  if (o.length === 0) return `<div class="${r.emptyState}">No ${s(e.toLowerCase())} events available</div>`;
  const a = i ? [...o].reverse() : o;
  return `
    <section class="${r.jsonPanel}">
      ${B(e, r)}
      <table class="${r.table}">
        <tbody data-live-list>
          ${a.map((c) => ge(c, n, r)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function ze(e, t, n, r, i, o = !1) {
  const a = Array.isArray(n?.sections) ? n.sections : [];
  if (a.length === 0) return ue(m(n?.title || e.label || e.id || "Panel"), t, r, { useIconCopyButton: i });
  const c = a.map((u) => W(e, u, t, r, i, o)).join("");
  return m(n?.options?.layout).toLowerCase() === "grid" ? `<div class="debug-schema-grid">${c}</div>` : c;
}
function W(e, t, n, r, i = !1, o = !1) {
  const a = m(t?.title || e.label || e.id || "Panel"), c = _(n, t?.bind);
  switch (m(t?.renderer).toLowerCase()) {
    case "metrics":
      return Ue(a, c, t, r);
    case "key_value":
      return De(a, c, t, r);
    case "identity":
      return Be(m(t?.title), c, t, r);
    case "table":
      return He(a, c, t, r, o);
    case "status_list":
      return Je(a, c, t, r, o);
    case "timeline":
      return Ke(a, c, t, r, o);
    case "stack":
      return ze(e, n, t, r, i, o);
    default:
      return ue(a, c ?? {}, r, { useIconCopyButton: i });
  }
}
function Ge(e) {
  const t = m(e).toLowerCase();
  return t === "table" || t === "status_list" || t === "timeline";
}
function We(e, t, n, r) {
  switch (m(e).toLowerCase()) {
    case "status_list":
      return $e(t, n, r);
    case "timeline":
      return ge(t, n, r);
    default:
      return be(t, D(n, "columns"), n?.options?.key_bind);
  }
}
var Qe = /* @__PURE__ */ new Set([
  "succeeded",
  "failed",
  "canceled",
  "rejected"
]), E = /* @__PURE__ */ new Set(), w = "", P = "", F = "", M = "", T = !1, Ye = "debug:command-run-selection";
function g(e) {
  return e == null ? "" : String(e).trim();
}
function V(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : 0;
}
function N(e) {
  const t = g(e);
  return t.length <= 512 ? t : "";
}
function jt(e) {
  const t = new URLSearchParams(e || "");
  return {
    runID: N(t.get("run_id")) || void 0,
    dispatchID: N(t.get("dispatch_id")) || void 0,
    correlationID: N(t.get("correlation_id")) || void 0
  };
}
function xt(e, t) {
  const n = typeof window < "u" ? window.location.href : "http://localhost/", r = new URL(e || n, n), i = N(t.runID), o = N(t.dispatchID), a = N(t.correlationID);
  return r.searchParams.set("panel", "command_runs"), i ? r.searchParams.set("run_id", i) : r.searchParams.delete("run_id"), o && !i ? r.searchParams.set("dispatch_id", o) : r.searchParams.delete("dispatch_id"), a && !i && !o ? r.searchParams.set("correlation_id", a) : r.searchParams.delete("correlation_id"), `${r.pathname}${r.search}${r.hash}`;
}
function Pt(e) {
  P = N(e.runID), F = P ? "" : N(e.dispatchID), M = P || F ? "" : N(e.correlationID), w = P, T = !1, w && E.add(w);
}
function Ze(e, t = !1) {
  const n = Array.isArray(e) ? e.filter((i) => i && typeof i == "object") : [], r = P ? n.find((i) => x(i) === P) : F ? n.find((i) => g(i.dispatch_id) === F) : M ? n.find((i) => g(i.correlation_id) === M) : void 0;
  return r ? (w = x(r), E.add(w), T = !1) : t && (P || F || M) && (T = !0), w;
}
function x(e) {
  return e && typeof e == "object" ? g(e.run_id) : "";
}
function O(e) {
  return e && typeof e == "object" ? V(e.revision) : 0;
}
function I(e) {
  return !!e && typeof e == "object" && Qe.has(g(e.phase).toLowerCase());
}
function ee(e) {
  if (!e || typeof e != "object") return 0;
  const t = e.updated_at || e.occurred_at || "", n = Date.parse(g(t));
  return Number.isFinite(n) ? n : 0;
}
function Xe(e, t) {
  const n = O(e), r = O(t);
  if (I(e) && !I(t) || n === r && I(e) && I(t) && g(e.phase).trim().toLowerCase() !== g(t.phase).trim().toLowerCase()) return !1;
  if (r > 0 && n > 0) {
    if (r < n) return !1;
    if (r > n) return !0;
  }
  return I(t) && !I(e) ? !0 : r >= n;
}
function et(e, t) {
  return !e || !Xe(e, t) ? e || t : O(e) === O(t) ? {
    ...e,
    ...t
  } : t;
}
function Ot(e, t) {
  const n = O(e), r = O(t);
  return n > 0 && r > n + 1;
}
function Lt(e, t) {
  const n = /* @__PURE__ */ new Map();
  return (Array.isArray(e) ? e : []).forEach((r) => {
    const i = x(r);
    i && n.set(i, {
      revision: O(r),
      generation: t.get(i) || 0
    });
  }), n;
}
function Et(e, t, n, r, i = 500) {
  const o = Array.isArray(e) ? e.filter((l) => l && typeof l == "object") : [], a = Array.isArray(t) ? t.filter((l) => l && typeof l == "object") : [], c = /* @__PURE__ */ new Map();
  o.forEach((l) => {
    const p = x(l);
    p && c.set(p, l);
  });
  const u = /* @__PURE__ */ new Set(), d = [];
  return a.forEach((l) => {
    const p = x(l);
    !p || u.has(p) || (u.add(p), d.push(et(c.get(p), l)));
  }), o.forEach((l) => {
    const p = x(l);
    if (!p || u.has(p)) return;
    const y = n.get(p);
    y && y.revision === O(l) && y.generation === (r.get(p) || 0) || d.push(l);
  }), d.sort((l, p) => ee(p) - ee(l) || x(l).localeCompare(x(p))), i > 0 ? d.slice(0, i) : d;
}
function te(e) {
  const t = e.current, n = e.total;
  if (typeof t != "number" && typeof n != "number") return "—";
  if (typeof n == "number" && n > 0) {
    const r = Math.max(0, Math.min(100, Math.round(V(t) / n * 100)));
    return `${V(t)} / ${n} (${r}%)`;
  }
  return String(V(t));
}
function ne(e) {
  return !e.attempt && !e.max_attempts ? "—" : e.max_attempts ? `${V(e.attempt)} / ${V(e.max_attempts)}` : String(V(e.attempt));
}
function re(e) {
  return typeof e.duration_ms != "number" ? "—" : e.duration_ms < 1e3 ? `${e.duration_ms} ms` : `${(e.duration_ms / 1e3).toFixed(e.duration_ms < 1e4 ? 2 : 1)} s`;
}
function v(e, t, n) {
  const r = g(t) || "—";
  return `<div><dt class="${n.detailLabel}">${s(e)}</dt><dd class="${n.detailValue}">${s(r)}</dd></div>`;
}
function tt(e, t) {
  const n = g(e.outcome?.summary), r = e.outcome?.fields && typeof e.outcome.fields == "object" ? Object.entries(e.outcome.fields).filter(([i, o]) => g(i) ? typeof o == "number" ? Number.isFinite(o) : typeof o == "string" || typeof o == "boolean" : !1).sort(([i], [o]) => i.localeCompare(o)) : [];
  return !n && r.length === 0 ? `<p class="${t.muted}" data-command-run-outcome-empty>No additional result metadata was recorded.</p>` : `
    <section class="command-run-outcome" data-command-run-outcome>
      <h4>Outcome</h4>
      ${n ? `<p>${s(n)}</p>` : ""}
      ${r.length > 0 ? `
        <dl class="command-run-details command-run-outcome__fields">
          ${r.map(([i, o]) => v(i, o, t)).join("")}
        </dl>
      ` : ""}
    </section>
  `;
}
function ye(e, t) {
  const n = e && typeof e == "object" ? e : {}, r = x(n);
  if (!r) return "";
  const i = g(n.phase).toLowerCase() || "unknown", o = O(n), a = I(n), c = `command-run-detail-${r.replace(/[^a-zA-Z0-9_-]/g, "-")}`, u = n.failure && (n.failure.category || n.failure.code) ? `${g(n.failure.category)}${n.failure.category && n.failure.code ? " / " : ""}${g(n.failure.code)}` : "—";
  return `
    <tr
      class="command-run-row ${t.expandableRow}"
      data-row-key="${A(r)}"
      data-row-revision="${o}"
      data-row-terminal="${a ? "true" : "false"}"
      data-command-run-row
      aria-selected="false"
      tabindex="-1"
    >
      <td>
        <button type="button" class="command-run-toggle" data-command-run-toggle data-live-row-focus aria-expanded="false" aria-controls="${A(c)}" aria-label="Show details for ${A(g(n.command_id) || "unknown command")} run ${A(r)} (${A(i)})">
          <span aria-hidden="true">›</span>
        </button>
        <span class="${t.badge} command-run-phase command-run-phase--${A(i)}">${s(i)}</span>
      </td>
      <td><strong>${s(g(n.command_id) || "Unknown command")}</strong><div class="${t.muted}">${s(r)}</div></td>
      <td>${s(te(n))}</td>
      <td>${s(g(n.mode) || "—")}</td>
      <td>${s(ne(n))}</td>
      <td><span class="${t.timestamp}">${s(Q(n.updated_at || n.occurred_at))}</span><div class="${t.muted}">${s(re(n))}</div></td>
      <td>${s(g(n.message) || g(n.checkpoint) || "—")}</td>
    </tr>
    <tr id="${A(c)}" class="command-run-detail ${t.expansionRow}" data-command-run-detail data-parent-key="${A(r)}" hidden>
      <td colspan="7">
        <div class="${t.expandedContent}">
          <dl class="command-run-details">
            ${v("Run ID", n.run_id, t)}
            ${v("Dispatch ID", n.dispatch_id, t)}
            ${v("Correlation ID", n.correlation_id, t)}
            ${v("Event ID", n.event_id, t)}
            ${v("Command", n.command_id, t)}
            ${v("Phase", i, t)}
            ${v("Revision", n.revision, t)}
            ${v("Mode", n.mode, t)}
            ${v("Progress", te(n), t)}
            ${v("Attempt", ne(n), t)}
            ${v("First occurred", n.first_occurred_at, t)}
            ${v("Occurred", n.occurred_at, t)}
            ${v("Started", n.started_at, t)}
            ${v("Updated", n.updated_at, t)}
            ${v("Duration", re(n), t)}
            ${v("Checkpoint", n.checkpoint, t)}
            ${v("Message", n.message, t)}
            ${v("Failure", u, t)}
          </dl>
          ${tt(n, t)}
        </div>
      </td>
    </tr>
  `;
}
function nt(e, t) {
  const n = Array.isArray(e) ? e : [];
  return Ze(n), n.length === 0 ? `<div class="${t.emptyState}" data-command-runs-empty>No command runs available</div>
      <div class="${t.emptyState}" data-command-run-unavailable ${T ? "" : "hidden"}>Selected command run is no longer retained.</div>` : `
    <section class="${t.jsonPanel}" data-command-runs-panel>
      <table class="${t.table} command-runs-table">
        <thead><tr><th>Status</th><th>Command / Run</th><th>Progress</th><th>Mode</th><th>Attempt</th><th>Timing</th><th>Message</th></tr></thead>
        <tbody data-live-list>${n.map((r) => ye(r, t)).join("")}</tbody>
      </table>
      <div class="${t.emptyState}" data-command-run-unavailable hidden>Selected command run is no longer retained.</div>
    </section>
  `;
}
function rt(e, t) {
  t.dataset.commandRunsWired !== "true" && (t.dataset.commandRunsWired = "true", t.addEventListener("click", (n) => {
    const r = n.target, i = r?.closest("[data-command-run-row]");
    if (!i) return;
    const o = i.getAttribute("data-row-key") || "";
    if (!o) return;
    w = o, P = o, F = "", M = "", T = !1, r?.closest("[data-command-run-toggle]") && (E.has(o) ? E.delete(o) : E.add(o)), ve(e, t);
    const a = t.ownerDocument.defaultView?.CustomEvent || CustomEvent;
    t.dispatchEvent(new a(Ye, {
      bubbles: !0,
      detail: { runID: o }
    }));
  }), t.addEventListener("keydown", (n) => {
    if (n.key !== "Enter" && n.key !== " ") return;
    const r = n.target;
    r?.closest("[data-command-run-toggle]") && (n.preventDefault(), r.click());
  }));
}
function ve(e, t) {
  t.querySelectorAll("[data-command-run-row]").forEach((n) => {
    const r = n.getAttribute("data-row-key") || "", i = E.has(r), o = w === r;
    n.setAttribute("aria-selected", o ? "true" : "false"), n.classList.toggle("command-run-row--selected", o), n.classList.toggle("expanded", i);
    const a = n.querySelector("[data-command-run-toggle]");
    if (a?.setAttribute("aria-expanded", i ? "true" : "false"), a) {
      const u = g(n.querySelector("strong")?.textContent) || "unknown command", d = g(n.querySelector(".command-run-phase")?.textContent) || "unknown";
      a.setAttribute("aria-label", `${i ? "Hide" : "Show"} details for ${u} run ${r} (${d})`);
    }
    const c = Array.from(t.querySelectorAll("[data-command-run-detail]")).find((u) => u.getAttribute("data-parent-key") === r);
    c && (c.hidden = !i);
  }), e.querySelectorAll("[data-command-run-unavailable]").forEach((n) => {
    n.hidden = !T;
  });
}
function ot(e) {
  e.forEach((t) => {
    E.delete(t), t === w && (T = !0);
  });
}
function Nt() {
  return w;
}
function Tt(e) {
  w = g(e), P = w, F = "", M = "", T = !1, w && E.add(w);
}
function It() {
  w = "", P = "", F = "", M = "", T = !1, E.clear();
}
var it = /* @__PURE__ */ new Set([
  "metrics",
  "key_value",
  "identity",
  "table",
  "status_list",
  "timeline",
  "json",
  "stack"
]), at = "1", st = 3e3, oe = /* @__PURE__ */ new Map();
function _e(e) {
  return (e || "").trim().replace(/\/+$/g, "") || "/admin/debug";
}
function h(e) {
  return typeof e == "string" ? e.trim().toLowerCase() : "";
}
function $(e) {
  return typeof e == "string" ? e.trim() : "";
}
function ct(e, t) {
  if (!Array.isArray(e)) return t ? [t] : [];
  const n = /* @__PURE__ */ new Set(), r = [];
  return e.forEach((i) => {
    const o = h(i);
    o && !n.has(o) && (n.add(o), r.push(o));
  }), r.length > 0 ? r : t ? [t] : [];
}
function U(e) {
  const t = h(e?.renderer);
  return t !== "" && it.has(t);
}
function Se(e) {
  if (!e || typeof e != "object") return null;
  const t = $(e.schema_version);
  return t !== "" && t !== at ? `Unsupported panel UI schema version "${t}". Rendering JSON fallback.` : !U(e.views?.console) && !U(e.views?.toolbar) ? "Panel UI schema does not declare a supported renderer. Rendering JSON fallback." : null;
}
function dt(e) {
  return !e || typeof e != "object" || Se(e) !== null ? !1 : U(e.views?.console) || U(e.views?.toolbar);
}
function j(e, t) {
  const n = $(t).replace(/^\$\./, "");
  return n ? n.split(".").filter(Boolean).reduce((r, i) => {
    if (!(r == null || typeof r != "object"))
      return r[i];
  }, e) : e;
}
function lt(e, t) {
  return t ? j(e, t.bind) : e;
}
function ut(e, t) {
  const n = t?.count, r = j(e, n?.bind);
  switch (h(n?.mode)) {
    case "object_keys":
      return r && typeof r == "object" && !Array.isArray(r) ? Object.keys(r).length : 0;
    case "truthy":
      return r ? 1 : 0;
    case "number":
      return typeof r == "number" && Number.isFinite(r) ? r : 0;
    case "array_length":
      return Array.isArray(r) ? r.length : 0;
    default:
      return Le(r);
  }
}
function pt(e, t, n) {
  const r = n?.events, i = h(r?.mode), o = typeof r?.max_entries == "number" ? r.max_entries : 500, a = j(t, r?.bind);
  if (i === "append") {
    const c = Array.isArray(e) ? [...e, a] : [a];
    return o > 0 ? c.slice(-o) : c;
  }
  if (i === "merge")
    return e && typeof e == "object" && a && typeof a == "object" ? {
      ...e,
      ...a
    } : a;
  if (i === "upsert") {
    const c = $(r?.key);
    if (!c || !a || typeof a != "object") return Oe(e, a, o);
    const u = j(a, c), d = Array.isArray(e) ? [...e] : [], l = d.findIndex((p) => j(p, c) === u);
    if (l >= 0) {
      const p = d[l], y = Number(j(a, "revision") || 0), k = Number(j(p, "revision") || 0), C = h(j(p, "phase")), f = h(j(a, "phase")), b = /* @__PURE__ */ new Set([
        "succeeded",
        "failed",
        "canceled",
        "rejected"
      ]);
      if (y > 0 && k > 0 && y <= k || b.has(C) && !b.has(f)) return d;
      d[l] = a;
    } else d.push(a);
    return o > 0 ? d.slice(-o) : d;
  }
  return a;
}
function ft(e) {
  const t = {};
  return (e?.filters || []).forEach((n) => {
    const r = h(n.id);
    r && (t[r] = h(n.kind) === "checkbox" ? !1 : "");
  }), t;
}
function mt(e, t) {
  const n = t && typeof t == "object" ? t : {}, r = e?.filters || [];
  return r.length === 0 ? "" : r.map((i) => {
    const o = h(i.id), a = h(i.kind);
    if (!o) return "";
    const c = $(i.label) || o, u = n[o];
    if (a === "select") {
      const d = Array.isArray(i.options) ? i.options : [];
      return `
        <div class="debug-filter">
          <label>${s(c)}</label>
          <select data-filter="${s(o)}">
            <option value="">All</option>
            ${d.map((l) => {
        const p = $(l);
        return `<option value="${s(p)}" ${u === p ? "selected" : ""}>${s(p)}</option>`;
      }).join("")}
          </select>
        </div>
      `;
    }
    return a === "checkbox" ? `
        <label class="debug-btn">
          <input type="checkbox" data-filter="${s(o)}" ${u ? "checked" : ""} />
          <span>${s(c)}</span>
        </label>
      ` : `
      <div class="debug-filter debug-filter--grow">
        <label>${s(c)}</label>
        <input type="search" data-filter="${s(o)}" value="${s(J(u))}" />
      </div>
    `;
  }).join("");
}
function J(e) {
  return e == null ? "" : String(e);
}
function ie(e, t, n) {
  const r = h(t.kind), i = j(e, t.bind);
  if (r === "checkbox") return n ? !!i : !0;
  const o = J(n).trim();
  if (!o) return !0;
  const a = J(i || e).toLowerCase();
  return r === "select" ? J(i).toLowerCase() === o.toLowerCase() : a.includes(o.toLowerCase());
}
function ht(e, t, n) {
  const r = n?.filters || [];
  if (r.length === 0 || !t || typeof t != "object") return e;
  const i = t;
  if (Array.isArray(e)) return e.filter((o) => r.every((a) => ie(o, a, i[h(a.id)])));
  if (e && typeof e == "object") {
    const o = Object.entries(e).filter(([a, c]) => {
      const u = {
        key: a,
        value: c
      };
      return r.every((d) => ie(u, d, i[h(d.id)]));
    });
    return Object.fromEntries(o);
  }
  return e;
}
function z(e, t, n, r, i, o, a = !1) {
  let c = "";
  return t && U(t) ? c = W(e, t, n, r, i, a) : c = W(e, {
    renderer: "json",
    title: $(e.label) || h(e.id) || "Panel"
  }, lt(n, t), r, i), `${$t(e, r)}${bt(e, r, o)}${c}<div data-panel-action-result="${s(h(e.id))}"></div>`;
}
function bt(e, t, n) {
  if (!n) return "";
  const r = h(e.id);
  return `<div class="${t.emptyState}" data-panel-degraded="${s(r)}"><strong>Panel UI degraded.</strong> ${s(n)}</div>`;
}
function $t(e, t) {
  const n = h(e.id), r = (e.ui?.actions || []).filter((i) => i.hidden !== !0);
  if (!n || r.length === 0) return "";
  if ((h(e.ui?.action_layout?.mode) || "list") === "select") {
    const i = $(e.ui?.action_layout?.picker_label) || "Action", o = $(e.ui?.action_layout?.empty_text) || "Select an action to continue.";
    return `
      <div class="${t.panelControls}" data-panel-action-launcher="${s(n)}" style="display:flex;flex-direction:column;gap:0.75rem;align-items:stretch">
        <div class="debug-filter debug-filter--grow">
          <label>${s(i)}</label>
          <select data-panel-action-picker="${s(n)}">
            <option value="">${s(o)}</option>
            ${r.map((a) => {
      const c = h(a.id), u = $(a.label) || c;
      return c ? `<option value="${s(c)}">${s(u)}</option>` : "";
    }).join("")}
          </select>
        </div>
        ${r.map((a) => {
      const c = h(a.id);
      return c ? `<div data-panel-action-choice="${s(c)}" hidden>${ae(n, c, a, t)}</div>` : "";
    }).join("")}
      </div>
    `;
  }
  return `
    <div class="${t.panelControls}">
      ${r.map((i) => {
    const o = h(i.id);
    return o ? ae(n, o, i, t) : "";
  }).join("")}
    </div>
  `;
}
function ae(e, t, n, r) {
  const i = gt(n.payload), o = Array.isArray(n.fields) ? n.fields : [], a = $(n.submit_label) || $(n.label) || t;
  return o.length > 0 ? `
      <form
        data-panel-action-form
        data-panel-id="${s(e)}"
        data-action-id="${s(t)}"
        data-action-confirm="${s($(n.confirm_text))}"
        data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
        data-action-payload='${i}'
        style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end"
      >
        ${o.map((c, u) => yt(e, t, c, u)).join("")}
        <button type="submit" class="${r.sortToggle}">${s(a)}</button>
      </form>
    ` : `
    <button
      type="button"
      class="${r.sortToggle}"
      data-panel-action
      data-panel-id="${s(e)}"
      data-action-id="${s(t)}"
      data-action-confirm="${s($(n.confirm_text))}"
      data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
      data-action-payload='${i}'
    >${s(a)}</button>
  `;
}
function gt(e) {
  return e ? s(JSON.stringify(e)).replace(/'/g, "&#39;") : "";
}
function yt(e, t, n, r) {
  const i = h(n.name);
  if (!i) return "";
  const o = h(n.kind) || "text", a = $(n.label) || i, c = `debug-action-${e}-${t}-${i}-${r}`, u = $(n.payload_path) || i, d = n.required ? " required" : "", l = $(n.placeholder), p = l ? ` placeholder="${s(l)}"` : "", y = $(n.description), k = $(n.help), C = n.sensitive === !0, f = `id="${s(c)}" data-action-field="${s(i)}" data-action-field-kind="${s(o)}" data-action-field-path="${s(u)}"${C ? ' data-action-field-sensitive="true"' : ""}${d}`, b = Array.isArray(n.options) ? n.options.map((S) => $(S)).filter(Boolean) : [], q = Array.isArray(n.option_items) ? n.option_items.map((S) => ({
    value: $(S?.value),
    label: $(S?.label) || $(S?.value),
    disabled: S?.disabled === !0
  })).filter((S) => S.value) : [];
  let L = "";
  return C ? L = `<input type="password" ${f}${p} autocomplete="new-password" spellcheck="false">` : o === "boolean" || o === "checkbox" ? L = `<input type="checkbox" ${f}>` : o === "select" || q.length > 0 || b.length > 0 ? L = `<select ${f}><option value=""></option>${q.length > 0 ? q.map((S) => `<option value="${s(S.value)}"${S.disabled ? " disabled" : ""}>${s(S.label)}</option>`).join("") : b.map((S) => `<option value="${s(S)}">${s(S)}</option>`).join("")}</select>` : o === "number" || o === "integer" ? L = `<input type="number" ${f}${p}>` : o === "textarea" || o === "json" || o === "string_list" ? L = `<textarea ${f}${p} rows="2"></textarea>` : L = `<input type="text" ${f}${p}>`, `
    <label for="${s(c)}" style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem">
      <span>${s(a)}</span>
      ${L}
      <small
        data-action-field-error="${s(u)}"
        data-action-field-name="${s(i)}"
        data-action-id="${s(t)}"
        hidden
      ></small>
      ${y ? `<small>${s(y)}</small>` : ""}
      ${k && k !== y ? `<small>${s(k)}</small>` : ""}
    </label>
  `;
}
var Ae = /* @__PURE__ */ new Map();
function Ft(e, t) {
  const n = h(e);
  n && typeof t == "function" && Ae.set(n, t);
}
function vt(e) {
  const t = h(e.id);
  if (!t) return null;
  const n = $(e.label) || t, r = h(e.snapshot_key) || t, i = Se(e.ui), o = i === null && dt(e.ui) ? e.ui : void 0, a = o ? e : {
    ...e,
    ui: void 0
  }, c = (t === "command_runs" && o ? ({ data: f, styles: b }) => nt(f, b) : void 0) || (o ? Ae.get(t) : void 0), u = c ? (f, b) => c({
    def: a,
    data: f,
    styles: b,
    useIconCopyButton: !0
  }) : void 0, d = o?.views?.console || o?.views?.toolbar, l = h(d?.renderer) !== "table" || Array.isArray(d?.options?.columns) && d.options.columns.length > 0, p = h(o?.events?.order) === "newest_first", y = h(o?.events?.mode), k = o && d && y === "append" && Ge(d.renderer) && l ? {
    renderRow: (f, b) => We(d.renderer, f, d, b),
    keyOf: (f) => K(f, d.options?.key_bind),
    getMaxEntries: () => typeof o.events?.max_entries == "number" ? o.events.max_entries : 500,
    newestFirst: p
  } : void 0, C = o && t === "command_runs" && y === "upsert" ? {
    updateMode: "upsert",
    renderRow: (f, b) => ye(f, b),
    keyOf: x,
    revisionOf: O,
    terminalOf: I,
    getMaxEntries: () => typeof o.events?.max_entries == "number" ? o.events.max_entries : 500,
    newestFirst: p,
    onAdopt: rt,
    onRestore: ve,
    onEvict: ot
  } : void 0;
  return {
    id: t,
    label: n,
    icon: $(e.icon) || void 0,
    snapshotKey: r,
    eventTypes: ct(e.event_types, r),
    supportsToolbar: e.supports_toolbar !== !1,
    category: $(e.category) || "custom",
    order: typeof e.order == "number" ? e.order : 100,
    getCount: o?.count ? (f) => ut(f, o) : void 0,
    handleEvent: o?.events ? (f, b) => pt(f, b, o) : void 0,
    renderFilters: o?.filters?.length ? (f) => mt(o, f) : void 0,
    defaultFilters: o?.filters?.length ? ft(o) : void 0,
    applyFilters: o?.filters?.length ? (f, b) => ht(f, b, o) : void 0,
    render: u || ((f, b) => z(a, o?.views?.console || o?.views?.toolbar, f, b, !0, i, p)),
    renderConsole: u || ((f, b) => z(a, o?.views?.console || o?.views?.toolbar, f, b, !0, i, p)),
    renderToolbar: (f, b) => z(a, o?.views?.toolbar || o?.views?.console, f, b, !1, i, p),
    showFilters: c && t !== "command_runs" ? !1 : !!o?.filters?.length,
    liveList: C || k
  };
}
async function _t(e, t = st) {
  let n;
  const r = typeof AbortController < "u" ? new AbortController() : null;
  try {
    const i = _e(e);
    r && t > 0 && (n = setTimeout(() => r.abort(), t));
    const o = await ke(`${i}/api/panels`, {
      credentials: "same-origin",
      signal: r?.signal
    });
    if (!o.ok) return [];
    const a = await Re(o);
    return Array.isArray(a.panels) ? a.panels : [];
  } catch {
    return [];
  } finally {
    n !== void 0 && clearTimeout(n);
  }
}
async function Mt(e) {
  const t = _e(e), n = oe.get(t);
  if (n) return n;
  const r = _t(t).then((i) => {
    let o = 0;
    return i.forEach((a) => {
      const c = vt(a);
      c && Pe.registerServerDefinition(c) && (o += 1);
    }), o;
  });
  return oe.set(t, r), r;
}
export {
  K as A,
  de as B,
  Be as C,
  Je as D,
  Ue as E,
  Ve as F,
  Ie as I,
  Ne as L,
  Ct as M,
  Rt as N,
  He as O,
  Me as P,
  kt as R,
  Ge as S,
  We as T,
  ye as _,
  Lt as a,
  Tt as b,
  Ot as c,
  ot as d,
  xt as f,
  Ze as g,
  jt as h,
  Ft as i,
  ue as j,
  Ke as k,
  Ye as l,
  Et as m,
  Mt as n,
  x as o,
  Nt as p,
  vt as r,
  O as s,
  _t as t,
  I as u,
  nt as v,
  De as w,
  Pt as x,
  It as y,
  Te as z
};

//# sourceMappingURL=server-definitions-yM2kAYaY.js.map