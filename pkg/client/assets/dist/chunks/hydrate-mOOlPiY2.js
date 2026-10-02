import { escapeAttribute as j, escapeHTML as s } from "../shared/html.js";
import { httpRequest as ce, readExpectedHTTPJSON as le } from "../shared/transport/http-client.js";
import { a as de, n as ue, o as pe, t as fe } from "./avatar-DIbK-LSg.js";
var be = "debug", $e = /^[a-z][a-z0-9-]*$/;
function h(e) {
  const t = typeof e?.blockPrefix == "string" ? e.blockPrefix.trim() : "";
  return t && $e.test(t) ? t : be;
}
var V = (e) => e.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "default", ot = {
  table: "console-table",
  tableRoutes: "console-table",
  badge: "console-badge",
  badgeMethod: (e) => `console-badge console-badge--${V(e)}`,
  badgeStatus: (e) => e >= 500 ? "console-badge console-badge--danger" : e >= 400 ? "console-badge console-badge--warning" : "console-badge",
  badgeLevel: (e) => `console-badge console-badge--${V(e)}`,
  badgeError: "console-badge console-badge--danger",
  badgeCustom: "console-badge",
  duration: "console-duration",
  durationSlow: "console-duration--slow",
  timestamp: "console-timestamp",
  path: "console-path",
  message: "console-message",
  queryText: "console-code",
  rowError: "console-row--error",
  rowSlow: "console-row--slow",
  expandableRow: "console-row--expandable",
  expansionRow: "console-row--expansion",
  slowQuery: "console-row--slow",
  errorQuery: "console-row--error",
  expandIcon: "console-expand-icon",
  emptyState: "console-empty",
  jsonViewer: "console-json-panel",
  jsonViewerHeader: "console-json-header",
  jsonViewerTitle: "console-json-title",
  jsonGrid: "console-json-grid",
  jsonPanel: "console-json-panel",
  jsonHeader: "console-json-header",
  jsonActions: "console-json-actions",
  jsonContent: "console-json-content",
  copyBtn: "console-btn console-copy",
  copyBtnSm: "console-btn console-copy console-copy--sm",
  panelControls: "console-controls",
  sortToggle: "console-btn",
  expandedContent: "console-expanded",
  expandedContentHeader: "console-expanded__header",
  muted: "console-muted",
  selectCell: "console-select-cell",
  sqlToolbar: "console-controls",
  sqlToolbarBtn: "console-btn",
  detailRow: "console-detail-row",
  detailPane: "console-detail-pane",
  detailSection: "console-detail-section",
  detailLabel: "console-detail-label",
  detailValue: "console-detail-value",
  detailKeyValueTable: "console-detail-kv",
  detailError: "console-detail-error",
  detailMasked: "console-detail-masked",
  detailBody: "console-detail-body",
  detailMetadataLine: "console-detail-metadata",
  badgeContentType: "console-badge",
  blockPrefix: "console"
}, M = (e) => {
  if (!e) return "";
  if (typeof e == "number") return new Date(e).toLocaleTimeString();
  if (typeof e == "string") {
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? e : t.toLocaleTimeString();
  }
  return "";
}, U = (e, t) => {
  const { nullAsEmptyObject: n = !0, indent: o = 2 } = t || {};
  if (e == null) return n ? "{}" : "null";
  try {
    return JSON.stringify(e, null, o);
  } catch {
    return String(e ?? "");
  }
}, J = (e) => {
  if (e == null || e === "") return "0";
  const t = Number(e);
  return Number.isNaN(t) ? String(e) : t.toLocaleString();
}, me = (e) => e == null ? 0 : Array.isArray(e) ? e.length : typeof e == "object" ? Object.keys(e).length : 1;
function ye(e) {
  let t = 5381;
  for (let n = 0; n < e.length; n++) t = (t << 5) + t + e.charCodeAt(n) | 0;
  return (t >>> 0).toString(36);
}
function p(e) {
  if (e == null) return "";
  if (typeof e == "string") return e;
  if (typeof e == "number" || typeof e == "boolean") return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function f(e, t) {
  const n = typeof t == "string" ? t.trim().replace(/^\$\./, "") : "";
  return n ? n.split(".").filter(Boolean).reduce((o, r) => {
    if (!(o == null || typeof o != "object"))
      return o[r];
  }, e) : e;
}
function q(e, t, n) {
  return `<code data-${h(n)}-syntax="${t}">${s(e)}</code>`;
}
function z(e, t, n) {
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
function K(e, t, n, o = {}) {
  const { useIconCopyButton: r = !1, filterFn: a, showCount: i = !0 } = o, c = t && typeof t == "object" && !Array.isArray(t), d = Array.isArray(t);
  let l = t ?? {};
  if (c && a && (l = a(t)), c && Object.keys(l).length === 0 || d && l.length === 0 || !c && !d && !l) return `<div class="${n.emptyState}">No ${e.toLowerCase()} data available</div>`;
  const u = U(l), m = q(u, "json", n), v = me(l), y = d ? "items" : c ? "keys" : "entries", _ = z(n, r, `copy-${e.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`), S = i ? `<span class="${n.muted}">${J(v)} ${y}</span>` : "";
  return `
    <section class="${n.jsonPanel}" data-copy-content="${s(u)}">
      <div class="${n.jsonHeader}">
        <span class="${n.jsonViewerTitle}">${s(e)}</span>
        <div class="${n.jsonActions}">
          ${S}
          ${_}
        </div>
      </div>
      <pre>${m}</pre>
    </section>
  `;
}
function rt(e, t, n = {}) {
  const { useIconCopyButton: o = !1 } = n;
  if (!e || typeof e == "object" && Object.keys(e).length === 0) return "";
  const r = U(e), a = q(r, "json", t), i = z(t, o, `viewer-${Date.now()}`);
  return `
    <div class="${t.jsonViewer}" data-copy-content="${s(r)}">
      <div class="${t.jsonViewerHeader}">
        ${i}
      </div>
      <pre>${a}</pre>
    </div>
  `;
}
function P(e, t) {
  if (t) {
    const o = p(f(e, t));
    if (o) return o;
  }
  let n;
  try {
    n = JSON.stringify(e) ?? "";
  } catch {
    n = p(e);
  }
  return `schema-${ye(n)}`;
}
function w(e, t) {
  const n = e?.options?.[t];
  return Array.isArray(n) ? n.filter((o) => o && typeof o == "object") : [];
}
function O(e) {
  return Array.isArray(e) ? e : e && typeof e == "object" ? Object.entries(e).map(([t, n]) => ({
    key: t,
    value: n
  })) : [];
}
function G(e) {
  const t = p(e).trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(t) ? t : null;
}
function E(e, t) {
  const n = typeof t == "string" ? t.trim().toLowerCase() : "";
  return n === "number" ? J(e) : n === "timestamp" || n === "time" || n === "date" ? M(e) : n === "datetime" ? ge(e) : n === "boolean" ? e ? "Yes" : "No" : p(e);
}
function ge(e) {
  if (e == null || e === "") return "";
  const t = typeof e == "number" ? new Date(e) : new Date(p(e));
  return Number.isNaN(t.getTime()) ? p(e) : t.toLocaleString();
}
function Q(e) {
  return e == null || e === "";
}
function A(e, t) {
  const n = e || "Unavailable";
  return `<span class="${h(t)}-kv__empty">${s(n)}</span>`;
}
function X(e, t, n, o, r = "") {
  const a = typeof t == "string" ? t.trim().toLowerCase() : "", i = h(o);
  if (Q(e)) return A(n, o);
  const c = E(e, t);
  if (c === "") return A(n, o);
  switch (a) {
    case "copy":
      return Y(c, o, r);
    case "color": {
      const d = G(c);
      return d ? `<span class="${i}-kv__swatch" style="--${i}-swatch-color:${j(d)}"><span class="${i}-kv__swatch-dot" aria-hidden="true"></span><code>${s(d.toUpperCase())}</code></span>` : A(n, o);
    }
    case "badge":
      return `<span class="${o.badge}">${s(c)}</span>`;
    case "mono":
      return `<code class="${i}-kv__mono">${s(c)}</code>`;
    default:
      return s(c);
  }
}
function Y(e, t, n = "") {
  const o = h(t), r = n ? `Copy ${n}` : "Copy to clipboard";
  return `<span class="${o}-kv__copy" data-copy-content="${j(e)}"><code class="${o}-kv__mono">${s(e)}</code><button type="button" class="${t.copyBtnSm} ${o}-kv__copy-btn" data-copy-trigger title="${j(r)}" aria-label="${j(r)}">Copy</button></span>`;
}
function C(e, t) {
  return e ? `<div class="${t.jsonHeader}"><h3 class="${t.jsonViewerTitle}">${s(e)}</h3></div>` : "";
}
function he(e, t, n, o) {
  const r = w(n, "metrics"), a = r.length > 0 ? r : Object.entries(t && typeof t == "object" && !Array.isArray(t) ? t : {}).map(([i]) => ({
    label: i,
    bind: i
  }));
  return a.length === 0 ? `<div class="${o.emptyState}">No ${s(e.toLowerCase())} metrics available</div>` : `
    <section class="${o.jsonPanel}">
      ${C(e, o)}
      <div class="${o.jsonGrid}">
        ${a.map((i) => {
    const c = p(i.label || i.bind), d = E(f(t, i.bind), i.format), l = p(f(t, i.severity) || i.status || "");
    return `
            <div class="${o.detailPane}" data-severity="${s(l)}">
              <div class="${o.detailLabel}">${s(c)}</div>
              <div class="${o.detailValue}">${s(d)}</div>
            </div>
          `;
  }).join("")}
      </div>
    </section>
  `;
}
function ve(e, t, n, o) {
  const r = w(n, "fields"), a = r.length > 0 ? r : Object.entries(t && typeof t == "object" && !Array.isArray(t) ? t : {}).map(([i]) => ({
    label: i,
    bind: i
  }));
  return a.length === 0 ? `<div class="${o.emptyState}">No ${s(e.toLowerCase())} details available</div>` : `
    <section class="${o.jsonPanel}">
      ${C(e, o)}
      <dl class="${h(o)}-kv">
        ${a.map((i) => {
    const c = p(i.label || i.bind), d = f(t, i.bind), l = p(i.empty || "");
    return `<dt>${s(c)}</dt><dd>${X(d, i.format, l, o, c)}</dd>`;
  }).join("")}
      </dl>
    </section>
  `;
}
function _e(e, t, n, o) {
  const r = n?.options || {}, a = h(o), i = (g) => typeof g == "string" && g.trim() !== "" ? f(t, g) : void 0, c = G(i(r.color_bind)), d = p(i(r.eyebrow_bind)).trim(), l = p(i(r.title_bind)).trim(), u = p(i(r.title_fallback_bind)).trim(), m = l || u, v = p(i(r.subtitle_bind)).trim(), y = w(n, "chips").filter((g) => !Q(i(g.bind))), _ = i(r.avatar_bind), S = p(i(r.avatar_name_bind)).trim(), N = fe(_ && typeof _ == "object" ? {
    name: S || m,
    visual: _
  } : void 0), L = ue(N, `${a}-identity__avatar`);
  if (!d && !m && y.length === 0) return `<div class="${o.emptyState}">No ${s((e || "identity").toLowerCase())} details available</div>`;
  const re = p(r.title_format), ae = p(l ? r.title_label : r.title_fallback_label), ie = m ? re === "copy" ? Y(m, o, ae || e || "value") : `<span class="${a}-identity__value">${s(m)}</span>` : A(p(r.empty), o);
  return `
    <section class="${a}-identity"${c ? ` style="--${a}-identity-color:${j(c)}"` : ""}${c ? "" : ' data-accent="none"'}>
      <div class="${a}-identity__lead">
        ${L}
        ${d ? `<span class="${a}-identity__env"><span class="${a}-identity__dot" aria-hidden="true"></span>${s(d.toUpperCase())}</span>` : ""}
        <div class="${a}-identity__names">
          ${e ? `<span class="${a}-identity__label">${s(e)}</span>` : ""}
          <span class="${a}-identity__title">${ie}</span>
          ${v ? `<span class="${a}-identity__subtitle">${s(v)}</span>` : ""}
        </div>
      </div>
      ${y.length > 0 ? `<dl class="${a}-identity__chips">${y.map((g) => {
    const R = p(g.label || g.bind), se = X(i(g.bind), g.format, p(g.empty || ""), o, R);
    return `<div class="${a}-identity__chip"><dt>${s(R)}</dt><dd>${se}</dd></div>`;
  }).join("")}</dl>` : ""}
    </section>
  `;
}
function W(e, t, n) {
  const o = t.length > 0 ? t : Object.keys(e && typeof e == "object" ? e : {}).map((r) => ({
    label: r,
    bind: r
  }));
  return `
    <tr data-row-key="${j(P(e, n))}">
      ${o.map((r) => `<td>${s(E(f(e, r.bind), r.format))}</td>`).join("")}
    </tr>
  `;
}
function je(e, t, n, o, r = !1) {
  const a = O(t), i = w(n, "columns"), c = i.length > 0 ? i : Object.keys(a[0] && typeof a[0] == "object" ? a[0] : {}).map((u) => ({
    label: u,
    bind: u
  }));
  if (a.length === 0 || c.length === 0) return `<div class="${o.emptyState}">No ${s(e.toLowerCase())} rows available</div>`;
  const d = n?.options?.key_bind, l = r ? [...a].reverse() : a;
  return `
    <section class="${o.jsonPanel}">
      ${C(e, o)}
      <table class="${o.table}">
        <thead>
          <tr>${c.map((u) => `<th>${s(p(u.label || u.bind))}</th>`).join("")}</tr>
        </thead>
        <tbody data-live-list>
          ${l.map((u) => W(u, c, d)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function Z(e, t, n) {
  const o = p(f(e, t?.options?.label_bind || "label") || f(e, "name") || f(e, "key")), r = p(f(e, t?.options?.description_bind || "description") || f(e, "message")), a = p(f(e, t?.options?.status_bind || "status") || f(e, "severity"));
  return `
    <tr data-row-key="${j(P(e, t?.options?.key_bind))}">
      <td><span class="${n.badge}">${s(a || "status")}</span></td>
      <td><strong>${s(o)}</strong>${r ? `<div class="${n.muted}">${s(r)}</div>` : ""}</td>
    </tr>
  `;
}
function Se(e, t, n, o, r = !1) {
  const a = O(t);
  if (a.length === 0) return `<div class="${o.emptyState}">No ${s(e.toLowerCase())} statuses available</div>`;
  const i = r ? [...a].reverse() : a;
  return `
    <section class="${o.jsonPanel}">
      ${C(e, o)}
      <table class="${o.table}">
        <tbody data-live-list>
          ${i.map((c) => Z(c, n, o)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function D(e, t, n) {
  const o = M(f(e, t?.options?.timestamp_bind || "timestamp")), r = p(f(e, t?.options?.message_bind || "message") || f(e, "title")), a = p(f(e, t?.options?.level_bind || "level") || f(e, "severity"));
  return `
    <tr data-row-key="${j(P(e, t?.options?.key_bind))}">
      <td class="${n.timestamp}">${s(o)}</td>
      <td>${a ? `<span class="${n.badge}">${s(a)}</span> ` : ""}${s(r)}</td>
    </tr>
  `;
}
function xe(e, t, n, o, r = !1) {
  const a = O(t);
  if (a.length === 0) return `<div class="${o.emptyState}">No ${s(e.toLowerCase())} events available</div>`;
  const i = r ? [...a].reverse() : a;
  return `
    <section class="${o.jsonPanel}">
      ${C(e, o)}
      <table class="${o.table}">
        <tbody data-live-list>
          ${i.map((c) => D(c, n, o)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function we(e, t, n, o, r, a = !1) {
  const i = Array.isArray(n?.sections) ? n.sections : [];
  if (i.length === 0) return K(p(n?.title || e.label || e.id || "Panel"), t, o, { useIconCopyButton: r });
  const c = i.map((d) => T(e, d, t, o, r, a)).join("");
  return p(n?.options?.layout).toLowerCase() === "grid" ? `<div class="${h(o)}-schema-grid">${c}</div>` : c;
}
function T(e, t, n, o, r = !1, a = !1) {
  const i = p(t?.title || e.label || e.id || "Panel"), c = f(n, t?.bind);
  switch (p(t?.renderer).toLowerCase()) {
    case "metrics":
      return he(i, c, t, o);
    case "key_value":
      return ve(i, c, t, o);
    case "identity":
      return _e(p(t?.title), c, t, o);
    case "table":
      return je(i, c, t, o, a);
    case "status_list":
      return Se(i, c, t, o, a);
    case "timeline":
      return xe(i, c, t, o, a);
    case "stack":
      return we(e, n, t, o, r, a);
    default:
      return K(i, c ?? {}, o, { useIconCopyButton: r });
  }
}
function Ce(e) {
  const t = p(e).toLowerCase();
  return t === "table" || t === "status_list" || t === "timeline";
}
function Ae(e, t, n, o) {
  switch (p(e).toLowerCase()) {
    case "status_list":
      return Z(t, n, o);
    case "timeline":
      return D(t, n, o);
    default:
      return W(t, w(n, "columns"), n?.options?.key_bind);
  }
}
var ke = /* @__PURE__ */ new Set([
  "metrics",
  "key_value",
  "identity",
  "table",
  "status_list",
  "timeline",
  "json",
  "stack"
]), Pe = "1";
function b(e) {
  return typeof e == "string" ? e.trim().toLowerCase() : "";
}
function $(e) {
  return typeof e == "string" ? e.trim() : "";
}
function x(e) {
  const t = b(e?.renderer);
  return t !== "" && ke.has(t);
}
function ee(e) {
  if (!e || typeof e != "object") return null;
  const t = $(e.schema_version);
  return t !== "" && t !== Pe ? `Unsupported panel UI schema version "${t}". Rendering JSON fallback.` : !x(e.views?.console) && !x(e.views?.toolbar) ? "Panel UI schema does not declare a supported renderer. Rendering JSON fallback." : null;
}
function Ne(e) {
  return !e || typeof e != "object" || ee(e) !== null ? !1 : x(e.views?.console) || x(e.views?.toolbar);
}
function Le(e, t) {
  return t ? f(e, t.bind) : e;
}
function Te(e, t) {
  const n = t?.count, o = f(e, n?.bind);
  switch (b(n?.mode)) {
    case "object_keys":
      return o && typeof o == "object" && !Array.isArray(o) ? Object.keys(o).length : 0;
    case "truthy":
      return o ? 1 : 0;
    case "number":
      return typeof o == "number" && Number.isFinite(o) ? o : 0;
    case "array_length":
      return Array.isArray(o) ? o.length : 0;
    default:
      return de(o);
  }
}
function Oe(e, t, n) {
  const o = n?.events, r = b(o?.mode), a = typeof o?.max_entries == "number" ? o.max_entries : 500, i = f(t, o?.bind);
  return r === "append" ? te(Array.isArray(e) ? [...e, i] : [i], a) : r === "merge" ? Ee(e, i) : r === "upsert" ? Ve(e, i, $(o?.key), a) : i;
}
var B = /* @__PURE__ */ new Set([
  "succeeded",
  "failed",
  "canceled",
  "rejected"
]);
function te(e, t) {
  return t > 0 ? e.slice(-t) : e;
}
function Ee(e, t) {
  return e && typeof e == "object" && t && typeof t == "object" ? {
    ...e,
    ...t
  } : t;
}
function Re(e, t) {
  const n = Number(f(t, "revision") || 0), o = Number(f(e, "revision") || 0);
  if (n > 0 && o > 0 && n <= o) return !0;
  const r = b(f(e, "phase")), a = b(f(t, "phase"));
  return B.has(r) && !B.has(a);
}
function Ve(e, t, n, o) {
  if (!n || !t || typeof t != "object") return pe(e, t, o);
  const r = f(t, n), a = Array.isArray(e) ? [...e] : [], i = a.findIndex((c) => f(c, n) === r);
  if (i >= 0) {
    if (Re(a[i], t)) return a;
    a[i] = t;
  } else a.push(t);
  return te(a, o);
}
function Be(e) {
  const t = {};
  return (e?.filters || []).forEach((n) => {
    const o = b(n.id);
    o && (t[o] = b(n.kind) === "checkbox" ? !1 : "");
  }), t;
}
function k(e) {
  return e == null ? "" : String(e);
}
function Fe(e, t, n) {
  const o = t && typeof t == "object" ? t : {}, r = e?.filters || [];
  if (r.length === 0) return "";
  const a = h(n);
  return r.map((i) => {
    const c = b(i.id), d = b(i.kind);
    if (!c) return "";
    const l = $(i.label) || c, u = o[c];
    if (d === "select") {
      const m = Array.isArray(i.options) ? i.options : [];
      return `
        <div class="${a}-filter">
          <label>${s(l)}</label>
          <select data-filter="${s(c)}">
            <option value="">All</option>
            ${m.map((v) => {
        const y = $(v);
        return `<option value="${s(y)}" ${u === y ? "selected" : ""}>${s(y)}</option>`;
      }).join("")}
          </select>
        </div>
      `;
    }
    return d === "checkbox" ? `
        <label class="${a}-btn">
          <input type="checkbox" data-filter="${s(c)}" ${u ? "checked" : ""} />
          <span>${s(l)}</span>
        </label>
      ` : `
      <div class="${a}-filter ${a}-filter--grow">
        <label>${s(l)}</label>
        <input type="search" data-filter="${s(c)}" value="${s(k(u))}" />
      </div>
    `;
  }).join("");
}
function F(e, t, n) {
  const o = b(t.kind), r = f(e, t.bind);
  if (o === "checkbox") return n ? !!r : !0;
  const a = k(n).trim();
  if (!a) return !0;
  const i = k(r || e).toLowerCase();
  return o === "select" ? k(r).toLowerCase() === a.toLowerCase() : i.includes(a.toLowerCase());
}
function Ie(e, t, n) {
  const o = n?.filters || [];
  if (o.length === 0 || !t || typeof t != "object") return e;
  const r = t;
  if (Array.isArray(e)) return e.filter((a) => o.every((i) => F(a, i, r[b(i.id)])));
  if (e && typeof e == "object") {
    const a = Object.entries(e).filter(([i, c]) => {
      const d = {
        key: i,
        value: c
      };
      return o.every((l) => F(d, l, r[b(l.id)]));
    });
    return Object.fromEntries(a);
  }
  return e;
}
function He(e, t, n) {
  if (!n) return "";
  const o = b(e.id);
  return `<div class="${t.emptyState}" data-panel-degraded="${s(o)}"><strong>Panel UI degraded.</strong> ${s(n)}</div>`;
}
function ne(e, t, n = {}) {
  const o = b(e.id), r = (e.ui?.actions || []).filter((i) => i.hidden !== !0);
  if (!o || r.length === 0) return "";
  const a = h(t);
  if ((b(e.ui?.action_layout?.mode) || "list") === "select") {
    const i = $(e.ui?.action_layout?.picker_label) || "Action", c = $(e.ui?.action_layout?.empty_text) || "Select an action to continue.";
    return `
      <div class="${t.panelControls}" data-panel-action-launcher="${s(o)}" style="display:flex;flex-direction:column;gap:0.75rem;align-items:stretch">
        <div class="${a}-filter ${a}-filter--grow">
          <label>${s(i)}</label>
          <select data-panel-action-picker="${s(o)}">
            <option value="">${s(c)}</option>
            ${r.map((d) => {
      const l = b(d.id), u = $(d.label) || l;
      return l ? `<option value="${s(l)}">${s(u)}</option>` : "";
    }).join("")}
          </select>
        </div>
        ${r.map((d) => {
      const l = b(d.id);
      return l ? `<div data-panel-action-choice="${s(l)}" hidden>${I(o, l, d, t, n)}</div>` : "";
    }).join("")}
      </div>
    `;
  }
  return `
    <div class="${t.panelControls}">
      ${r.map((i) => {
    const c = b(i.id);
    return c ? I(o, c, i, t, n) : "";
  }).join("")}
    </div>
  `;
}
function I(e, t, n, o, r) {
  const a = Me(n.payload), i = Array.isArray(n.fields) ? n.fields : [], c = $(n.submit_label) || $(n.label) || t;
  return i.length > 0 ? `
      <form
        data-panel-action-form
        data-panel-id="${s(e)}"
        data-action-id="${s(t)}"
        data-action-confirm="${s($(n.confirm_text))}"
        data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
        data-action-payload='${a}'
        style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end"
      >
        ${i.map((d, l) => ze(e, t, d, l, o, r)).join("")}
        <button type="submit" class="${o.sortToggle}">${s(c)}</button>
      </form>
    ` : `
    <button
      type="button"
      class="${o.sortToggle}"
      data-panel-action
      data-panel-id="${s(e)}"
      data-action-id="${s(t)}"
      data-action-confirm="${s($(n.confirm_text))}"
      data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
      data-action-payload='${a}'
    >${s(c)}</button>
  `;
}
function Me(e) {
  return e ? s(JSON.stringify(e)).replace(/'/g, "&#39;") : "";
}
function Ue(e, t, n, o, r, a) {
  const i = $(t.idScope);
  return `${h(e)}-action-${i ? `${i}-` : ""}${n}-${o}-${r}-${a}`;
}
function Je(e) {
  const t = Array.isArray(e.options) ? e.options.map((n) => $(n)).filter(Boolean) : [];
  return {
    items: Array.isArray(e.option_items) ? e.option_items.map((n) => ({
      value: $(n?.value),
      label: $(n?.label) || $(n?.value),
      disabled: n?.disabled === !0
    })).filter((n) => n.value) : [],
    values: t
  };
}
function qe(e, t, n, o) {
  if (e.sensitive === !0) return `<input type="password" ${n}${o} autocomplete="new-password" spellcheck="false">`;
  if (t === "boolean" || t === "checkbox") return `<input type="checkbox" ${n}>`;
  const { items: r, values: a } = Je(e);
  return t === "select" || r.length > 0 || a.length > 0 ? `<select ${n}><option value=""></option>${r.length > 0 ? r.map((i) => `<option value="${s(i.value)}"${i.disabled ? " disabled" : ""}>${s(i.label)}</option>`).join("") : a.map((i) => `<option value="${s(i)}">${s(i)}</option>`).join("")}</select>` : t === "number" || t === "integer" ? `<input type="number" ${n}${o}>` : t === "textarea" || t === "json" || t === "string_list" ? `<textarea ${n}${o} rows="2"></textarea>` : `<input type="text" ${n}${o}>`;
}
function ze(e, t, n, o, r, a) {
  const i = b(n.name);
  if (!i) return "";
  const c = b(n.kind) || "text", d = $(n.label) || i, l = Ue(r, a, e, t, i, o), u = $(n.payload_path) || i, m = n.required ? " required" : "", v = $(n.placeholder), y = v ? ` placeholder="${s(v)}"` : "", _ = $(n.description), S = $(n.help), N = n.sensitive === !0, L = qe(n, c, `id="${s(l)}" data-action-field="${s(i)}" data-action-field-kind="${s(c)}" data-action-field-path="${s(u)}"${N ? ' data-action-field-sensitive="true"' : ""}${m}`, y);
  return `
    <label for="${s(l)}" style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem">
      <span>${s(d)}</span>
      ${L}
      <small
        data-action-field-error="${s(u)}"
        data-action-field-name="${s(i)}"
        data-action-id="${s(t)}"
        hidden
      ></small>
      ${_ ? `<small>${s(_)}</small>` : ""}
      ${S && S !== _ ? `<small>${s(S)}</small>` : ""}
    </label>
  `;
}
function oe(e, t, n, o, r, a, i = !1) {
  let c = "";
  return t && x(t) ? c = T(e, t, n, o, r, i) : c = T(e, {
    renderer: "json",
    title: $(e.label) || b(e.id) || "Panel"
  }, Le(n, t), o, r), `${He(e, o, a)}${c}`;
}
function Ke(e) {
  return `<div data-panel-action-result="${s(b(e.id))}"></div>`;
}
function H(e, t, n, o, r, a, i = !1, c = {}) {
  return `${ne(e, o, c)}${oe(e, t, n, o, r, a, i)}${Ke(e)}`;
}
var Ge = 3e3;
function Qe(e, t = {}) {
  if (!e || typeof e != "object") return null;
  const n = b(e.id);
  if (!n) return null;
  const o = ee(e.ui), r = o === null && Ne(e.ui) ? e.ui : void 0, a = r ? e : {
    ...e,
    ui: void 0
  }, i = r ? t.consoleRenderer : void 0, c = b(r?.events?.order) === "newest_first", d = b(r?.events?.mode), l = t.consoleRendererOwnsFilters !== !1, u = {
    ...Xe(e, n),
    ...We(r, t.styles),
    ...Ye(a, r, o, c, i),
    showFilters: i && l ? !1 : !!r?.filters?.length,
    liveList: Ze(r, r?.views?.console || r?.views?.toolbar, d, c)
  };
  return t.extend ? t.extend(u, {
    serverDef: e,
    ui: r,
    eventMode: d,
    liveNewestFirst: c
  }) : u;
}
function Xe(e, t) {
  const n = b(e.snapshot_key) || t;
  return {
    id: t,
    label: $(e.label) || t,
    icon: $(e.icon) || void 0,
    snapshotKey: n,
    eventTypes: De(e.event_types, n),
    supportsToolbar: e.supports_toolbar !== !1,
    category: $(e.category) || "custom",
    order: typeof e.order == "number" ? e.order : 100
  };
}
function Ye(e, t, n, o, r) {
  const a = t?.views?.console || t?.views?.toolbar, i = t?.views?.toolbar || t?.views?.console, c = (l, u, m) => H(e, i, l, u, !1, n, o, m);
  if (r) {
    const l = (u, m) => r({
      def: e,
      data: u,
      styles: m,
      useIconCopyButton: !0
    });
    return {
      render: l,
      renderConsole: l,
      renderToolbar: c
    };
  }
  const d = (l, u, m) => H(e, a, l, u, !0, n, o, m);
  return {
    render: d,
    renderConsole: d,
    renderToolbar: c,
    renderActions: (l, u) => ne(e, l, u),
    renderBody: (l, u) => oe(e, a, l, u, !0, n, o)
  };
}
function We(e, t) {
  const n = !!e?.filters?.length;
  return {
    getCount: e?.count ? (o) => Te(o, e) : void 0,
    handleEvent: e?.events ? (o, r) => Oe(o, r, e) : void 0,
    renderFilters: n ? (o) => Fe(e, o, t) : void 0,
    defaultFilters: n ? Be(e) : void 0,
    applyFilters: n ? (o, r) => Ie(o, r, e) : void 0
  };
}
function Ze(e, t, n, o) {
  if (!(!e || !t || n !== "append" || !Ce(t.renderer)) && (b(t.renderer) !== "table" || Array.isArray(t.options?.columns) && t.options.columns.length > 0))
    return {
      renderRow: (r, a) => Ae(t.renderer, r, t, a),
      keyOf: (r) => P(r, t.options?.key_bind),
      getMaxEntries: () => typeof e.events?.max_entries == "number" ? e.events.max_entries : 500,
      newestFirst: o
    };
}
function De(e, t) {
  if (!Array.isArray(e)) return t ? [t] : [];
  const n = /* @__PURE__ */ new Set(), o = [];
  return e.forEach((r) => {
    const a = b(r);
    a && !n.has(a) && (n.add(a), o.push(a));
  }), o.length > 0 ? o : t ? [t] : [];
}
async function at(e, t = Ge) {
  let n;
  const o = typeof AbortController < "u" ? new AbortController() : null;
  try {
    o && t > 0 && (n = setTimeout(() => o.abort(), t));
    const r = await ce(e, {
      credentials: "same-origin",
      signal: o?.signal
    });
    if (!r.ok) return [];
    const a = await le(r);
    return Array.isArray(a.panels) ? a.panels : [];
  } catch {
    return [];
  } finally {
    n !== void 0 && clearTimeout(n);
  }
}
function it(e, t, n = () => ({})) {
  let o = 0;
  return (Array.isArray(t) ? t : []).forEach((r) => {
    const a = Qe(r, n(r));
    a && e.registerServerDefinition(a) && (o += 1);
  }), o;
}
export {
  ot as C,
  ye as S,
  rt as _,
  b as a,
  J as b,
  ve as c,
  T as d,
  Se as f,
  K as g,
  P as h,
  it as i,
  Ae as l,
  xe as m,
  at as n,
  Ce as o,
  je as p,
  Qe as r,
  _e as s,
  Ge as t,
  he as u,
  me as v,
  M as x,
  U as y
};

//# sourceMappingURL=hydrate-mOOlPiY2.js.map