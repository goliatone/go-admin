import { escapeAttribute as p, escapeHTML as u } from "../shared/html.js";
var T = "debug", x = /^[a-z][a-z0-9-]*$/;
function f(e) {
  const n = typeof e?.blockPrefix == "string" ? e.blockPrefix.trim() : "";
  return n && x.test(n) ? n : T;
}
var w = (e) => e.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "default", M = {
  table: "console-table",
  tableRoutes: "console-table",
  badge: "console-badge",
  badgeMethod: (e) => `console-badge console-badge--${w(e)}`,
  badgeStatus: (e) => e >= 500 ? "console-badge console-badge--danger" : e >= 400 ? "console-badge console-badge--warning" : "console-badge",
  badgeLevel: (e) => `console-badge console-badge--${w(e)}`,
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
}, R = (e) => {
  if (!e) return "";
  if (typeof e == "number") return new Date(e).toLocaleTimeString();
  if (typeof e == "string") {
    const n = new Date(e);
    return Number.isNaN(n.getTime()) ? e : n.toLocaleTimeString();
  }
  return "";
}, B = (e, n) => {
  const { nullAsEmptyObject: t = !0, indent: o = 2 } = n || {};
  if (e == null) return t ? "{}" : "null";
  try {
    return JSON.stringify(e, null, o);
  } catch {
    return String(e ?? "");
  }
}, m = (e) => {
  if (e == null || e === "") return "0";
  const n = Number(e);
  return Number.isNaN(n) ? String(e) : n.toLocaleString();
}, D = (e) => e == null ? 0 : Array.isArray(e) ? e.length : typeof e == "object" ? Object.keys(e).length : 1;
function k(e) {
  let n = 5381;
  for (let t = 0; t < e.length; t++) n = (n << 5) + n + e.charCodeAt(t) | 0;
  return (n >>> 0).toString(36);
}
function c(e) {
  if (e == null) return "";
  if (typeof e == "string") return e;
  if (typeof e == "number" || typeof e == "boolean") return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function V(e, n) {
  const t = typeof n == "string" ? n.trim().replace(/^\$\./, "") : "";
  return t ? t.split(".").filter(Boolean).reduce((o, a) => {
    if (!(o == null || typeof o != "object"))
      return o[a];
  }, e) : e;
}
function F(e) {
  const n = c(e);
  if (n.length <= 12) return n;
  const t = /[0-9a-fA-F]{8}/.exec(n);
  return `${t ? t[0] : n.slice(0, 8)}…`;
}
var _ = Object.freeze([
  "action_availability.v1",
  "action_drawer.v1",
  "request_id.v1",
  "rich_views.v1",
  "secondary_submit.v1"
]), q = "X-Console-Capabilities", z = "capabilities", L = "This console was updated. Reload the page to use this action.", A = new Set(_);
function H() {
  return _.join(",");
}
function g(e) {
  return typeof e == "string" ? e.trim() : "";
}
function N(e) {
  if (!e) return {
    executable: !1,
    availability: "unavailable",
    reason: "This action is no longer available."
  };
  const n = g(e.availability).toLowerCase(), t = n === "" || n === "available" ? "available" : n === "unsupported" || n === "not_permitted" ? n : "unavailable";
  return t !== "available" ? {
    executable: !1,
    availability: t,
    reason: g(e.reason) || j(t)
  } : (Array.isArray(e.requires) ? e.requires : []).some((o) => !A.has(g(o).toLowerCase())) ? {
    executable: !1,
    availability: "unavailable",
    reason: L
  } : {
    executable: !0,
    availability: t,
    reason: ""
  };
}
function j(e) {
  return e === "unsupported" ? "Not supported here." : e === "not_permitted" ? "You do not have permission to run this action." : "Not available right now.";
}
var E = /* @__PURE__ */ new Set([
  "success",
  "info",
  "warning",
  "error",
  "neutral",
  "planned"
]), O = /* @__PURE__ */ new Set([
  "done",
  "current",
  "pending",
  "warning",
  "failed"
]), h = 6e4, y = 60 * h, $ = 24 * y;
function C(e) {
  const n = c(e).trim().toLowerCase();
  return E.has(n) ? n : "";
}
function U(e) {
  for (const n of [
    "error",
    "warning",
    "info",
    "success",
    "planned",
    "neutral"
  ]) if (e.includes(n)) return n;
  return "";
}
function J(e, n, t) {
  const o = C(n), a = o ? ` ${f(t)}-badge--${o}` : "";
  return `<span class="${t.badge}${a}">${u(e)}</span>`;
}
function K(e, n) {
  const t = typeof n == "number" && Number.isFinite(n) ? Math.floor(n) : 0;
  return t < 4 || e.length <= t ? e : `${e.slice(0, t)}…`;
}
function Q(e, n) {
  if (!Array.isArray(e) || e.length === 0) return "";
  const t = f(n), o = e.filter((a) => !!a && typeof a == "object").map((a) => {
    const s = c(a.label).trim();
    if (!s) return "";
    const i = c(a.state).trim().toLowerCase(), l = O.has(i) ? i : "pending", r = C(a.tone), d = r ? ` data-tone="${r}"` : "";
    return `<li class="${t}-step ${t}-step--${l}"${d}${l === "current" ? ' aria-current="step"' : ""}><span class="${t}-step__mark" aria-hidden="true"></span><span class="${t}-step__label">${u(s)}</span></li>`;
  }).filter(Boolean);
  return o.length === 0 ? "" : `<ol class="${t}-steps">${o.join("")}</ol>`;
}
function X(e, n) {
  if (!e || typeof e != "object") return "";
  const t = e, o = Number(t.completed), a = Number(t.total), s = c(t.label).trim(), i = f(n);
  if (!Number.isFinite(o) || o < 0) return s ? `<span class="${i}-muted">${u(s)}</span>` : "";
  const l = Number.isFinite(a) && a > 0, r = l ? Math.max(0, Math.min(100, Math.round(o / a * 100))) : 0, d = s || (l ? `${m(o)} of ${m(a)}` : m(o));
  return `<span class="${i}-progress"><span class="${i}-progress__bar" ${l ? `role="progressbar" aria-valuemin="0" aria-valuemax="${a}" aria-valuenow="${Math.min(o, a)}"` : 'role="progressbar" aria-valuemin="0"'} aria-label="${p(d)}"><span class="${i}-progress__fill" style="width:${r}%"></span></span><span class="${i}-progress__label">${u(d)}</span></span>`;
}
function Y(e, n, t = Date.now()) {
  if (e == null || e === "") return "";
  const o = typeof e == "number" ? new Date(e) : new Date(c(e));
  if (Number.isNaN(o.getTime())) return u(c(e));
  const a = t - o.getTime();
  let s;
  return Math.abs(a) < h ? s = "now" : a < 0 ? s = o.toLocaleString() : a < y ? s = `${Math.round(a / h)} min ago` : a < $ ? s = `${Math.round(a / y)} h ago` : a < 30 * $ ? s = `${Math.round(a / $)} d ago` : s = o.toLocaleDateString(), `<time class="${f(n)}-timestamp" datetime="${p(o.toISOString())}" title="${p(o.toLocaleString())}">${u(s)}</time>`;
}
function I(e) {
  const n = /* @__PURE__ */ new Map();
  return (e?.ui?.actions || []).forEach((t) => {
    const o = c(t?.id).trim().toLowerCase();
    o && !t.hidden && n.set(o, t);
  }), n;
}
function v(e, n) {
  if (!Array.isArray(e) || !n) return [];
  const t = c(n.id).trim().toLowerCase(), o = I(n), a = /* @__PURE__ */ new Set(), s = [];
  return e.forEach((i) => {
    if (!i || typeof i != "object") return;
    const l = c(i.panel_id).trim().toLowerCase(), r = c(i.action_id).trim().toLowerCase();
    if (!t || l !== t || !r || a.has(r)) return;
    const d = o.get(r);
    if (!d) return;
    a.add(r);
    const b = c(i.emphasis).trim().toLowerCase();
    s.push({
      action: d,
      actionID: r,
      emphasis: b === "primary" || b === "menu" ? b : ""
    });
  }), s;
}
function S(e, n, t, o, a, s = !1) {
  const i = f(a), l = N(t), r = c(t.label).trim() || n, d = s ? ` ${i}-menu__item` : ` ${i}-btn--sm${o === "primary" && l.executable ? ` ${i}-btn--primary` : ""}`, b = `type="button" class="${s ? "" : `${i}-btn`}${d}" data-console-action-ref data-panel-id="${p(e)}" data-action-id="${p(n)}"`;
  return l.executable ? `<button ${b}>${u(r)}</button>` : `<button ${b} aria-disabled="true" data-action-unavailable="${p(l.availability)}" title="${p(l.reason)}"><span>${u(r)}</span><span class="${i}-sr-only"> — ${u(l.reason)}</span></button>`;
}
function G(e, n, t) {
  const o = v(e, n);
  if (o.length === 0) return "";
  const a = f(t), s = c(n?.id).trim().toLowerCase(), i = o.filter((r) => r.emphasis !== "menu"), l = o.filter((r) => r.emphasis === "menu");
  return `<div class="${a}-action-slot">${i.map((r) => S(s, r.actionID, r.action, r.emphasis, t)).join("")}${l.length === 0 ? "" : `<details class="${a}-menu"><summary class="${a}-btn ${a}-btn--sm ${a}-btn--icon" aria-label="More actions" title="More actions"><span aria-hidden="true">⋯</span></summary><div class="${a}-menu__list" role="group" aria-label="More actions">${l.map((r) => S(s, r.actionID, r.action, "", t, !0)).join("")}</div></details>`}</div>`;
}
export {
  M as C,
  f as S,
  R as _,
  Q as a,
  F as b,
  K as c,
  L as d,
  N as f,
  m as g,
  B as h,
  Y as i,
  q as l,
  D as m,
  G as n,
  J as o,
  H as p,
  X as r,
  U as s,
  C as t,
  z as u,
  k as v,
  c as x,
  V as y
};

//# sourceMappingURL=rich-5UU6Sxl8.js.map