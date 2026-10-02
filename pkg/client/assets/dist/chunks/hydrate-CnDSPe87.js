import { escapeAttribute as v, escapeHTML as s } from "../shared/html.js";
import { httpRequest as St, readExpectedHTTPJSON as At } from "../shared/transport/http-client.js";
import { _ as X, a as Z, b as p, c as D, f as U, g as tt, h as et, i as nt, m as Ct, n as H, o as K, r as ot, s as Pt, t as R, v as Lt, x as g, y as m } from "./rich-C-60Te1B.js";
import { a as Tt, n as Nt, o as Ot, t as Et } from "./avatar-DIbK-LSg.js";
function at(t, e, n) {
  return `<code data-${g(n)}-syntax="${e}">${s(t)}</code>`;
}
function rt(t, e, n) {
  return e ? `
      <button class="${t.copyBtn}" data-copy-trigger="${n}" title="Copy to clipboard">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${t.copyBtn}" data-copy-trigger title="Copy JSON">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function it(t, e, n, o = {}) {
  const { useIconCopyButton: i = !1, filterFn: r, showCount: a = !0 } = o, c = e && typeof e == "object" && !Array.isArray(e), l = Array.isArray(e);
  let d = e ?? {};
  if (c && r && (d = r(e)), c && Object.keys(d).length === 0 || l && d.length === 0 || !c && !l && !d) return `<div class="${n.emptyState}">No ${t.toLowerCase()} data available</div>`;
  const u = et(d), y = at(u, "json", n), $ = Ct(d), _ = l ? "items" : c ? "keys" : "entries", f = rt(n, i, `copy-${t.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`), j = a ? `<span class="${n.muted}">${tt($)} ${_}</span>` : "";
  return `
    <section class="${n.jsonPanel}" data-copy-content="${s(u)}">
      <div class="${n.jsonHeader}">
        <span class="${n.jsonViewerTitle}">${s(t)}</span>
        <div class="${n.jsonActions}">
          ${j}
          ${f}
        </div>
      </div>
      <pre>${y}</pre>
    </section>
  `;
}
function Pe(t, e, n = {}) {
  const { useIconCopyButton: o = !1 } = n;
  if (!t || typeof t == "object" && Object.keys(t).length === 0) return "";
  const i = et(t), r = at(i, "json", e), a = rt(e, o, `viewer-${Date.now()}`);
  return `
    <div class="${e.jsonViewer}" data-copy-content="${s(i)}">
      <div class="${e.jsonViewerHeader}">
        ${a}
      </div>
      <pre>${r}</pre>
    </div>
  `;
}
function T(t, e) {
  if (e) {
    const o = p(m(t, e));
    if (o) return o;
  }
  let n;
  try {
    n = JSON.stringify(t) ?? "";
  } catch {
    n = p(t);
  }
  return `schema-${Lt(n)}`;
}
function N(t, e) {
  const n = t?.options?.[e];
  return Array.isArray(n) ? n.filter((o) => o && typeof o == "object") : [];
}
function B(t) {
  return Array.isArray(t) ? t : t && typeof t == "object" ? Object.entries(t).map(([e, n]) => ({
    key: e,
    value: n
  })) : [];
}
function st(t) {
  const e = p(t).trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(e) ? e : null;
}
function M(t, e) {
  const n = typeof e == "string" ? e.trim().toLowerCase() : "";
  return n === "number" ? tt(t) : n === "timestamp" || n === "time" || n === "date" ? X(t) : n === "datetime" ? wt(t) : n === "boolean" ? t ? "Yes" : "No" : p(t);
}
function wt(t) {
  if (t == null || t === "") return "";
  const e = typeof t == "number" ? new Date(t) : new Date(p(t));
  return Number.isNaN(e.getTime()) ? p(t) : e.toLocaleString();
}
function ct(t) {
  return t == null || t === "";
}
function w(t, e) {
  const n = t || "Unavailable";
  return `<span class="${g(e)}-kv__empty">${s(n)}</span>`;
}
function I(t, e, n, o, i = "", r = {}) {
  const a = typeof e == "string" ? e.trim().toLowerCase() : "", c = g(o);
  if (ct(t)) return w(n, o);
  if (a === "steps" || a === "progress" || a === "relative") return (a === "steps" ? Z(t, o) : a === "progress" ? ot(t, o) : nt(t, o)) || w(n, o);
  const l = M(t, e);
  if (l === "") return w(n, o);
  switch (a) {
    case "copy":
      return lt(l, o, i, r.truncate);
    case "color": {
      const d = st(l);
      return d ? `<span class="${c}-kv__swatch" style="--${c}-swatch-color:${v(d)}"><span class="${c}-kv__swatch-dot" aria-hidden="true"></span><code>${s(d.toUpperCase())}</code></span>` : w(n, o);
    }
    case "badge":
      return R(r.tone) ? K(l, r.tone, o) : `<span class="${o.badge}">${s(l)}</span>`;
    case "mono": {
      const d = D(l, r.truncate);
      return `<code class="${c}-kv__mono"${d === l ? "" : ` title="${v(l)}"`}>${s(d)}</code>`;
    }
    default:
      return s(l);
  }
}
function lt(t, e, n = "", o) {
  const i = g(e), r = n ? `Copy ${n}` : "Copy to clipboard", a = D(t, o), c = a === t ? "" : ` title="${v(t)}"`;
  return `<span class="${i}-kv__copy" data-copy-content="${v(t)}"><code class="${i}-kv__mono"${c}>${s(a)}</code><button type="button" class="${e.copyBtnSm} ${i}-kv__copy-btn" data-copy-trigger title="${v(r)}" aria-label="${v(r)}">Copy</button></span>`;
}
var dt = "—";
function ut(t) {
  return t.format !== void 0 || t.empty !== void 0 || t.tone_bind !== void 0 || t.secondary_bind !== void 0 || t.truncate !== void 0;
}
function Rt(t, e, n) {
  const o = m(t, e.bind);
  if (!ut(e)) return s(M(o, e.format));
  const i = p(e.label || e.bind), r = e.empty === void 0 ? dt : p(e.empty), a = typeof e.tone_bind == "string" && e.tone_bind ? m(t, e.tone_bind) : void 0, c = I(o, e.format, r, n, i, {
    tone: a,
    truncate: e.truncate
  }), l = typeof e.secondary_bind == "string" ? e.secondary_bind : "", d = l ? p(m(t, l)).trim() : "";
  if (!d) return c;
  const u = g(n);
  return `<div class="${u}-cell-main"><span class="${u}-cell-title">${c}</span><span class="${u}-cell-sub">${s(d)}</span></div>`;
}
function Ft(t) {
  return g(t) !== "debug";
}
function O(t, e, n, o) {
  if (!t) return "";
  const i = g(e), r = p(n?.description).trim(), a = p(n?.link?.panel_id).trim().toLowerCase(), c = p(n?.link?.label).trim(), l = a && c ? `<button type="button" class="${i}-link" data-console-panel-link="${v(a)}">${s(c)}<span aria-hidden="true"> →</span></button>` : "", d = H(n?.actions, o, e);
  if (!r && !l && !d) return `<div class="${e.jsonHeader}"><h3 class="${e.jsonViewerTitle}">${s(t)}</h3></div>`;
  const u = r ? `<div class="${i}-section-heading"><h3 class="${e.jsonViewerTitle}">${s(t)}</h3><p class="${i}-section-description">${s(r)}</p></div>` : `<h3 class="${e.jsonViewerTitle}">${s(t)}</h3>`;
  return `<div class="${e.jsonHeader}">${u}${l || d ? `<div class="${e.jsonActions}">${l}${d}</div>` : ""}</div>`;
}
function V(t, e, n) {
  const o = p(t?.empty).trim();
  return `<div class="${n.emptyState}">${s(o || e)}</div>`;
}
function Bt(t, e, n, o) {
  const i = N(n, "metrics"), r = i.length > 0 ? i : Object.entries(e && typeof e == "object" && !Array.isArray(e) ? e : {}).map(([a]) => ({
    label: a,
    bind: a
  }));
  return r.length === 0 ? `<div class="${o.emptyState}">No ${s(t.toLowerCase())} metrics available</div>` : `
    <section class="${o.jsonPanel}">
      ${O(t, o, n)}
      <div class="${o.jsonGrid}">
        ${r.map((a) => {
    const c = p(a.label || a.bind), l = M(m(e, a.bind), a.format), d = p(m(e, a.severity) || a.status || "");
    return `
            <div class="${o.detailPane}" data-severity="${s(d)}">
              <div class="${o.detailLabel}">${s(c)}</div>
              <div class="${o.detailValue}">${s(l)}</div>
            </div>
          `;
  }).join("")}
      </div>
    </section>
  `;
}
function Vt(t, e, n, o) {
  const i = N(n, "fields"), r = i.length > 0 ? i : Object.entries(e && typeof e == "object" && !Array.isArray(e) ? e : {}).map(([a]) => ({
    label: a,
    bind: a
  }));
  return r.length === 0 ? `<div class="${o.emptyState}">No ${s(t.toLowerCase())} details available</div>` : `
    <section class="${o.jsonPanel}">
      ${O(t, o, n)}
      <dl class="${g(o)}-kv">
        ${r.map((a) => {
    const c = p(a.label || a.bind), l = m(e, a.bind), d = p(a.empty || ""), u = typeof a.tone_bind == "string" && a.tone_bind ? m(e, a.tone_bind) : void 0;
    return `<dt>${s(c)}</dt><dd>${I(l, a.format, d, o, c, {
      tone: u,
      truncate: a.truncate
    })}</dd>`;
  }).join("")}
      </dl>
    </section>
  `;
}
function qt(t, e, n, o) {
  const i = n?.options || {}, r = g(o), a = (A) => typeof A == "string" && A.trim() !== "" ? m(e, A) : void 0, c = st(a(i.color_bind)), l = p(a(i.eyebrow_bind)).trim(), d = p(a(i.title_bind)).trim(), u = p(a(i.title_fallback_bind)).trim(), y = d || u, $ = p(a(i.subtitle_bind)).trim(), _ = N(n, "chips").filter((A) => !ct(a(A.bind))), f = a(i.avatar_bind), j = p(a(i.avatar_name_bind)).trim(), x = Et(f && typeof f == "object" ? {
    name: j || y,
    visual: f
  } : void 0), C = Nt(x, `${r}-identity__avatar`);
  if (!l && !y && _.length === 0) return `<div class="${o.emptyState}">No ${s((t || "identity").toLowerCase())} details available</div>`;
  const L = p(i.title_format), P = d ? p(i.title_label) : p(i.title_fallback_label), S = y ? L === "copy" ? lt(y, o, P || t || "value") : `<span class="${r}-identity__value">${s(y)}</span>` : w(p(i.empty), o);
  return `
    <section class="${r}-identity"${c ? ` style="--${r}-identity-color:${v(c)}"` : ""}${c ? "" : ' data-accent="none"'}>
      <div class="${r}-identity__lead">
        ${C}
        ${l ? `<span class="${r}-identity__env"><span class="${r}-identity__dot" aria-hidden="true"></span>${s(l.toUpperCase())}</span>` : ""}
        <div class="${r}-identity__names">
          ${t ? `<span class="${r}-identity__label">${s(t)}</span>` : ""}
          <span class="${r}-identity__title">${S}</span>
          ${$ ? `<span class="${r}-identity__subtitle">${s($)}</span>` : ""}
        </div>
      </div>
      ${_.length > 0 ? `<dl class="${r}-identity__chips">${_.map((A) => {
    const E = p(A.label || A.bind), k = I(a(A.bind), A.format, p(A.empty || ""), o, E);
    return `<div class="${r}-identity__chip"><dt>${s(E)}</dt><dd>${k}</dd></div>`;
  }).join("")}</dl>` : ""}
    </section>
  `;
}
function J(t, e, n, o = {}) {
  const i = e.length > 0 ? e : Object.keys(t && typeof t == "object" ? t : {}).map((u) => ({
    label: u,
    bind: u
  })), r = o.styles;
  if (!r) return `
    <tr data-row-key="${v(T(t, n))}">
      ${i.map((u) => `<td>${s(M(m(t, u.bind), u.format))}</td>`).join("")}
    </tr>
  `;
  const a = Ft(r), c = i.map((u) => `<td${a ? ` data-label="${v(p(u.label || u.bind))}"` : ""}>${Rt(t, u, r)}</td>`).join(""), l = typeof o.actionsBind == "string" ? o.actionsBind : "", d = l ? `<td class="${g(r)}-cell-actions"${a ? ' data-label="Actions"' : ""}>${H(m(t, l), o.serverDef, r)}</td>` : "";
  return `
    <tr data-row-key="${v(T(t, n))}">
      ${c}${d}
    </tr>
  `;
}
function $t(t, e, n, o, i = !1, r) {
  const a = B(e), c = N(n, "columns"), l = c.length > 0 ? c : Object.keys(a[0] && typeof a[0] == "object" ? a[0] : {}).map((f) => ({
    label: f,
    bind: f
  }));
  if (a.length === 0 || l.length === 0) return V(n, `No ${t.toLowerCase()} rows available`, o);
  const d = n?.options?.key_bind, u = n?.options?.actions_bind, y = i ? [...a].reverse() : a, $ = g(o), _ = typeof u == "string" && u ? `<th class="${$}-cell-actions"><span class="${$}-sr-only">Actions</span></th>` : "";
  return `
    <section class="${o.jsonPanel}">
      ${O(t, o, n, r)}
      <table class="${o.table}">
        <thead>
          <tr>${l.map((f) => `<th>${s(p(f.label || f.bind))}</th>`).join("")}${_}</tr>
        </thead>
        <tbody data-live-list>
          ${y.map((f) => J(f, l, d, {
    styles: o,
    serverDef: r,
    actionsBind: u
  })).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function Ht(t, e, n, o, i) {
  const r = B(e), a = n?.options || {};
  if (r.length === 0) return V(n, `No ${t.toLowerCase()} available`, o);
  const c = typeof a.max_cards == "number" && a.max_cards > 0 ? Math.floor(a.max_cards) : 0;
  if (c > 0 && r.length > c && N(n, "columns").length > 0) return $t(t, r, n, o, !1, i);
  const l = g(o), d = N(n, "fields"), u = ($, _) => {
    const f = a[_];
    return typeof f == "string" && f ? m($, f) : void 0;
  }, y = r.map(($) => {
    const _ = p(u($, "title_bind")).trim(), f = p(u($, "subtitle_bind")).trim(), j = p(u($, "status_bind")).trim(), x = d.map((S) => {
      const A = p(S.label || S.bind), E = typeof S.tone_bind == "string" && S.tone_bind ? m($, S.tone_bind) : void 0, k = S.empty === void 0 ? dt : p(S.empty);
      return `<div><dt>${s(A)}</dt><dd>${I(m($, S.bind), S.format, k, o, A, {
        tone: E,
        truncate: S.truncate
      })}</dd></div>`;
    }).join(""), C = p(u($, "eyebrow_bind")).trim(), L = H(u($, "actions_bind"), i, o), P = p(u($, "note_bind")).trim();
    return `
      <article class="${l}-card" data-row-key="${v(T($, a.key_bind))}">
        <header class="${l}-card__top">
          ${C ? `<span class="${l}-card__eyebrow">${s(C)}</span>` : "<span></span>"}
          ${j ? K(j, u($, "tone_bind"), o) : ""}
        </header>
        ${_ ? `<h4 class="${l}-card__title">${s(_)}</h4>` : ""}
        ${f ? `<p class="${l}-card__subtitle">${s(f)}</p>` : ""}
        ${x ? `<dl class="${l}-card__meta">${x}</dl>` : ""}
        ${P || L ? `<footer class="${l}-card__foot">${P ? `<span class="${l}-muted">${s(P)}</span>` : "<span></span>"}${L}</footer>` : ""}
      </article>
    `;
  }).join("");
  return `
    <section class="${l}-card-section">
      ${t ? O(t, o, n, i).replace(o.jsonHeader, `${o.jsonHeader} ${l}-section-header`) : ""}
      <div class="${l}-cards">${y}</div>
    </section>
  `;
}
function Mt(t, e, n, o, i) {
  const r = n?.options || {}, a = typeof r.limit == "number" && r.limit > 0 ? Math.floor(r.limit) : 0, c = B(e), l = a > 0 ? c.slice(0, a) : c;
  if (l.length === 0) return V(n, `No ${t.toLowerCase()} yet`, o);
  const d = g(o), u = ($, _) => {
    const f = r[_];
    return typeof f == "string" && f ? m($, f) : void 0;
  }, y = l.map(($) => {
    const _ = p(u($, "title_bind")).trim(), f = p(u($, "subtitle_bind")).trim(), j = p(u($, "status_bind")).trim(), x = R(u($, "tone_bind")), C = ot(u($, "progress_bind"), o), L = nt(u($, "time_bind"), o), P = H(u($, "actions_bind"), i, o), S = x ? ` data-tone="${x}"` : "";
    return `
      <li class="${d}-list__item" data-row-key="${v(T($, r.key_bind))}"${S}>
        <div class="${d}-list__main">
          ${_ ? `<span class="${d}-list__title">${s(_)}</span>` : ""}
          ${f ? `<span class="${d}-list__subtitle">${s(f)}</span>` : ""}
          ${C ? `<span class="${d}-list__progress">${C}</span>` : ""}
        </div>
        <div class="${d}-list__end">
          ${j ? K(j, x, o) : ""}
          ${L}
          ${P}
        </div>
      </li>
    `;
  }).join("");
  return `
    <section class="${o.jsonPanel}">
      ${O(t, o, n, i)}
      <ul class="${d}-list">${y}</ul>
    </section>
  `;
}
function pt(t, e, n) {
  const o = p(m(t, e?.options?.label_bind || "label") || m(t, "name") || m(t, "key")), i = p(m(t, e?.options?.description_bind || "description") || m(t, "message")), r = p(m(t, e?.options?.status_bind || "status") || m(t, "severity"));
  return `
    <tr data-row-key="${v(T(t, e?.options?.key_bind))}">
      <td><span class="${n.badge}">${s(r || "status")}</span></td>
      <td><strong>${s(o)}</strong>${i ? `<div class="${n.muted}">${s(i)}</div>` : ""}</td>
    </tr>
  `;
}
function It(t, e, n, o, i = !1) {
  const r = B(e);
  if (r.length === 0) return V(n, `No ${t.toLowerCase()} statuses available`, o);
  const a = i ? [...r].reverse() : r;
  return `
    <section class="${o.jsonPanel}">
      ${O(t, o, n)}
      <table class="${o.table}">
        <tbody data-live-list>
          ${a.map((c) => pt(c, n, o)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function bt(t, e, n) {
  const o = X(m(t, e?.options?.timestamp_bind || "timestamp")), i = p(m(t, e?.options?.message_bind || "message") || m(t, "title")), r = p(m(t, e?.options?.level_bind || "level") || m(t, "severity"));
  return `
    <tr data-row-key="${v(T(t, e?.options?.key_bind))}">
      <td class="${n.timestamp}">${s(o)}</td>
      <td>${r ? `<span class="${n.badge}">${s(r)}</span> ` : ""}${s(i)}</td>
    </tr>
  `;
}
function Ut(t, e, n, o, i = !1) {
  const r = B(e);
  if (r.length === 0) return V(n, `No ${t.toLowerCase()} events available`, o);
  const a = i ? [...r].reverse() : r;
  return `
    <section class="${o.jsonPanel}">
      ${O(t, o, n)}
      <table class="${o.table}">
        <tbody data-live-list>
          ${a.map((c) => bt(c, n, o)).join("")}
        </tbody>
      </table>
    </section>
  `;
}
function Jt(t, e, n, o, i, r = !1) {
  const a = Array.isArray(n?.sections) ? n.sections : [];
  if (a.length === 0) return it(p(n?.title || t.label || t.id || "Panel"), e, o, { useIconCopyButton: i });
  const c = a.map((l) => z(t, l, e, o, i, r)).join("");
  return p(n?.options?.layout).toLowerCase() === "grid" ? `<div class="${g(o)}-schema-grid">${c}</div>` : c;
}
function z(t, e, n, o, i = !1, r = !1) {
  const a = p(e?.title || t.label || t.id || "Panel"), c = m(n, e?.bind);
  switch (p(e?.renderer).toLowerCase()) {
    case "metrics":
      return Bt(a, c, e, o);
    case "key_value":
      return Vt(a, c, e, o);
    case "identity":
      return qt(p(e?.title), c, e, o);
    case "table":
      return $t(a, c, e, o, r, t);
    case "cards":
      return Ht(p(e?.title), c, e, o, t);
    case "list":
      return Mt(a, c, e, o, t);
    case "status_list":
      return It(a, c, e, o, r);
    case "timeline":
      return Ut(a, c, e, o, r);
    case "stack":
      return Jt(t, n, e, o, i, r);
    default:
      return it(a, c ?? {}, o, { useIconCopyButton: i });
  }
}
function zt(t) {
  const e = p(t).toLowerCase();
  return e === "table" || e === "status_list" || e === "timeline";
}
function Kt(t, e, n, o, i) {
  switch (p(t).toLowerCase()) {
    case "status_list":
      return pt(e, n, o);
    case "timeline":
      return bt(e, n, o);
    default: {
      const r = N(n, "columns");
      return n?.options?.actions_bind !== void 0 || r.some(ut) || g(o) !== "debug" ? J(e, r, n?.options?.key_bind, {
        styles: o,
        serverDef: i,
        actionsBind: n?.options?.actions_bind
      }) : J(e, r, n?.options?.key_bind);
    }
  }
}
var Gt = /* @__PURE__ */ new Set([
  "metrics",
  "key_value",
  "identity",
  "table",
  "status_list",
  "timeline",
  "json",
  "stack",
  "cards",
  "list"
]), Wt = "1";
function h(t) {
  return typeof t == "string" ? t.trim().toLowerCase() : "";
}
function b(t) {
  return typeof t == "string" ? t.trim() : "";
}
function F(t) {
  const e = h(t?.renderer);
  return e !== "" && Gt.has(e);
}
function ft(t) {
  if (!t || typeof t != "object") return null;
  const e = b(t.schema_version);
  return e !== "" && e !== Wt ? `Unsupported panel UI schema version "${e}". Rendering JSON fallback.` : !F(t.views?.console) && !F(t.views?.toolbar) ? "Panel UI schema does not declare a supported renderer. Rendering JSON fallback." : null;
}
function Yt(t) {
  return !t || typeof t != "object" || ft(t) !== null ? !1 : F(t.views?.console) || F(t.views?.toolbar);
}
function Qt(t, e) {
  return e ? m(t, e.bind) : t;
}
function Xt(t, e) {
  const n = e?.count, o = m(t, n?.bind);
  switch (h(n?.mode)) {
    case "object_keys":
      return o && typeof o == "object" && !Array.isArray(o) ? Object.keys(o).length : 0;
    case "truthy":
      return o ? 1 : 0;
    case "number":
      return typeof o == "number" && Number.isFinite(o) ? o : 0;
    case "array_length":
      return Array.isArray(o) ? o.length : 0;
    case "matching_rows":
      return mt(t, n?.bind).length;
    case "none":
      return 0;
    default:
      return Tt(o);
  }
}
function mt(t, e) {
  return (Array.isArray(t) ? t : []).filter((n) => !!m(n, e));
}
function Zt(t, e) {
  const n = e?.count, o = R(n?.tone);
  if (o) return o;
  const i = b(n?.tone_bind);
  return !i || h(n?.mode) !== "matching_rows" ? "" : Pt(mt(t, n?.bind).map((r) => R(m(r, i))));
}
function Dt(t, e) {
  const n = h(e?.count?.mode);
  return n === "none" || n === "matching_rows" && t === 0;
}
function te(t, e, n) {
  const o = n?.events, i = h(o?.mode), r = typeof o?.max_entries == "number" ? o.max_entries : 500, a = m(e, o?.bind);
  return i === "append" ? ht(Array.isArray(t) ? [...t, a] : [a], r) : i === "merge" ? ee(t, a) : i === "upsert" ? oe(t, a, b(o?.key), r) : a;
}
var G = /* @__PURE__ */ new Set([
  "succeeded",
  "failed",
  "canceled",
  "rejected"
]);
function ht(t, e) {
  return e > 0 ? t.slice(-e) : t;
}
function ee(t, e) {
  return t && typeof t == "object" && e && typeof e == "object" ? {
    ...t,
    ...e
  } : e;
}
function ne(t, e) {
  const n = Number(m(e, "revision") || 0), o = Number(m(t, "revision") || 0);
  if (n > 0 && o > 0 && n <= o) return !0;
  const i = h(m(t, "phase")), r = h(m(e, "phase"));
  return G.has(i) && !G.has(r);
}
function oe(t, e, n, o) {
  if (!n || !e || typeof e != "object") return Ot(t, e, o);
  const i = m(e, n), r = Array.isArray(t) ? [...t] : [], a = r.findIndex((c) => m(c, n) === i);
  if (a >= 0) {
    if (ne(r[a], e)) return r;
    r[a] = e;
  } else r.push(e);
  return ht(r, o);
}
function ae(t) {
  const e = {};
  return (t?.filters || []).forEach((n) => {
    const o = h(n.id);
    o && (e[o] = h(n.kind) === "checkbox" ? !1 : "");
  }), e;
}
function q(t) {
  return t == null ? "" : String(t);
}
function re(t, e, n) {
  const o = e && typeof e == "object" ? e : {}, i = t?.filters || [];
  if (i.length === 0) return "";
  const r = g(n);
  return i.map((a) => {
    const c = h(a.id), l = h(a.kind);
    if (!c) return "";
    const d = b(a.label) || c, u = o[c];
    if (l === "select") {
      const y = Array.isArray(a.options) ? a.options : [];
      return `
        <div class="${r}-filter">
          <label>${s(d)}</label>
          <select data-filter="${s(c)}">
            <option value="">All</option>
            ${y.map(($) => {
        const _ = b($);
        return `<option value="${s(_)}" ${u === _ ? "selected" : ""}>${s(_)}</option>`;
      }).join("")}
          </select>
        </div>
      `;
    }
    return l === "checkbox" ? `
        <label class="${r}-btn">
          <input type="checkbox" data-filter="${s(c)}" ${u ? "checked" : ""} />
          <span>${s(d)}</span>
        </label>
      ` : `
      <div class="${r}-filter ${r}-filter--grow">
        <label>${s(d)}</label>
        <input type="search" data-filter="${s(c)}" value="${s(q(u))}" />
      </div>
    `;
  }).join("");
}
function W(t, e, n) {
  const o = h(e.kind), i = m(t, e.bind);
  if (o === "checkbox") return n ? !!i : !0;
  const r = q(n).trim();
  if (!r) return !0;
  const a = q(i || t).toLowerCase();
  return o === "select" ? q(i).toLowerCase() === r.toLowerCase() : a.includes(r.toLowerCase());
}
function ie(t, e, n) {
  const o = n?.filters || [];
  if (o.length === 0 || !e || typeof e != "object") return t;
  const i = e;
  if (Array.isArray(t)) return t.filter((r) => o.every((a) => W(r, a, i[h(a.id)])));
  if (t && typeof t == "object") {
    const r = Object.entries(t).filter(([a, c]) => {
      const l = {
        key: a,
        value: c
      };
      return o.every((d) => W(l, d, i[h(d.id)]));
    });
    return Object.fromEntries(r);
  }
  return t;
}
function se(t, e, n) {
  if (!n) return "";
  const o = h(t.id);
  return `<div class="${e.emptyState}" data-panel-degraded="${s(o)}"><strong>Panel UI degraded.</strong> ${s(n)}</div>`;
}
function _t(t, e, n = {}) {
  const o = h(t.id), i = (t.ui?.actions || []).filter((c) => c.hidden !== !0);
  if (!o || i.length === 0) return "";
  const r = g(e), a = h(t.ui?.action_layout?.mode) || "list";
  if (a === "drawer" && r !== "debug") return "";
  if (a === "select" && r !== "debug") return ce(t, o, i, e, n);
  if (a === "select") {
    const c = b(t.ui?.action_layout?.picker_label) || "Action", l = b(t.ui?.action_layout?.empty_text) || "Select an action to continue.";
    return `
      <div class="${e.panelControls}" data-panel-action-launcher="${s(o)}" style="display:flex;flex-direction:column;gap:0.75rem;align-items:stretch">
        <div class="${r}-filter ${r}-filter--grow">
          <label>${s(c)}</label>
          <select data-panel-action-picker="${s(o)}">
            <option value="">${s(l)}</option>
            ${i.map((d) => {
      const u = h(d.id), y = b(d.label) || u;
      return u ? `<option value="${s(u)}">${s(y)}</option>` : "";
    }).join("")}
          </select>
        </div>
        ${i.map((d) => {
      const u = h(d.id);
      return u ? `<div data-panel-action-choice="${s(u)}" hidden>${Y(o, u, d, e, n)}</div>` : "";
    }).join("")}
      </div>
    `;
  }
  return `
    <div class="${e.panelControls}">
      ${i.map((c) => {
    const l = h(c.id);
    return l ? r === "debug" ? Y(o, l, c, e, n) : yt(o, l, c, e, n, "inline") : "";
  }).join("")}
    </div>
  `;
}
function ce(t, e, n, o, i) {
  const r = g(o), a = b(t.ui?.action_layout?.picker_label) || "Action", c = b(t.ui?.action_layout?.empty_text) || "Select an action to continue.", l = b(i.idScope), d = `${r}-action-${l ? `${l}-` : ""}${e}-picker`, u = n.map(($) => {
    const _ = h($.id);
    if (!_) return "";
    const f = U($), j = b($.label) || _;
    return `<option value="${s(_)}"${f.executable ? "" : " disabled"}>${s(j)}${f.executable ? "" : ` — ${s(f.reason)}`}</option>`;
  }).join(""), y = n.map(($) => {
    const _ = h($.id);
    return !_ || !U($).executable ? "" : `<div data-panel-action-choice="${s(_)}" hidden>${yt(e, _, $, o, i, "inline")}</div>`;
  }).join("");
  return `
    <div class="${o.panelControls} ${r}-action-launcher" data-panel-action-launcher="${s(e)}">
      <div class="${r}-filter ${r}-filter--grow">
        <label for="${v(d)}">${s(a)}</label>
        <select id="${v(d)}" data-panel-action-picker="${s(e)}">
          <option value="">${s(c)}</option>
          ${u}
        </select>
      </div>
      ${y}
    </div>
  `;
}
function yt(t, e, n, o, i, r) {
  const a = g(o), c = U(n), l = b(n.label) || e, d = b(n.submit_label) || l, u = `data-panel-id="${s(t)}" data-action-id="${s(e)}" data-action-confirm="${s(b(n.confirm_text))}" data-action-requires-confirm="${n.requires_confirm || n.confirmation ? "true" : "false"}" data-action-payload='${vt(n.payload)}'`;
  if (!c.executable) return `<button type="button" class="${a}-btn" aria-disabled="true" data-action-unavailable="${v(c.availability)}" data-panel-id="${s(t)}" data-action-id="${s(e)}" title="${v(c.reason)}"><span>${s(l)}</span><span class="${a}-sr-only"> — ${s(c.reason)}</span></button>`;
  const y = h(n.secondary_submit?.field), $ = (Array.isArray(n.fields) ? n.fields : []).filter((k) => h(k.kind) !== "hidden" && !(y && h(k.name) === y));
  if ($.length === 0 && r === "inline" && !n.secondary_submit) return `<button type="button" class="${a}-btn" data-panel-action ${u}>${s(d)}</button>`;
  const _ = $.filter((k) => !k.advanced && !k.generate), f = $.filter((k) => k.advanced || k.generate), j = (k, xt) => pe(t, e, k, xt, o, i), x = `${a}-advanced-${b(i.idScope) ? `${b(i.idScope)}-` : ""}${r}-${t}-${e}`, C = f.length === 0 ? "" : `<div class="${a}-advanced" data-expanded="false"><button type="button" class="${a}-advanced__toggle" aria-expanded="false" aria-controls="${v(x)}" data-advanced-toggle>Advanced</button><div class="${a}-advanced__body" id="${v(x)}">${f.map((k) => j(k, $.indexOf(k))).join("")}</div></div>`, L = b(n.secondary_submit?.label), P = `${L ? `<button type="submit" class="${a}-btn" data-submitter="secondary">${s(L)}</button>` : ""}<button type="submit" class="${a}-btn ${a}-btn--primary" data-submitter="primary">${s(d)}</button>`, S = r === "drawer" ? le(n, o) : "", A = r === "drawer" && b(n.drawer?.note) ? `<p class="${a}-field__help">${s(b(n.drawer?.note))}</p>` : "", E = r === "drawer" ? `<div class="${a}-drawer__footer"><button type="button" class="${a}-btn" data-drawer-cancel>Cancel</button>${P}</div>` : `<div class="${a}-form__actions">${P}</div>`;
  return `
    <form class="${a}-form ${a}-form--${r}" data-panel-action-form data-action-mode="${r}" ${u} novalidate>
      ${r === "drawer" ? `<div class="${a}-drawer__body">` : ""}
      ${S}
      ${_.map((k) => j(k, $.indexOf(k))).join("")}
      ${C}
      <div class="${a}-request-status" data-request-status hidden></div>
      ${A}
      ${r === "drawer" ? "</div>" : ""}
      ${E}
    </form>
  `;
}
function le(t, e) {
  const n = g(e), o = t.drawer || {}, i = b(o.effect), r = R(o.effect_tone) || "info", a = Z(o.steps, e), c = Array.isArray(o.details) ? o.details.map((l) => ({
    label: b(l?.label),
    value: b(l?.value),
    format: h(l?.format)
  })).filter((l) => l.label) : [];
  return `
    ${i ? `<div class="${n}-callout" data-tone="${r}"><p>${s(i)}</p></div>` : ""}
    ${a ? `<div class="${n}-drawer__steps">${a}</div>` : ""}
    ${c.length > 0 ? `<dl class="${n}-drawer__details">${c.map((l) => `<dt>${s(l.label)}</dt><dd>${l.format === "mono" || l.format === "copy" ? `<code class="${n}-kv__mono">${s(l.value)}</code>` : s(l.value || "—")}</dd>`).join("")}</dl>` : ""}
  `;
}
function de(t, e, n, o, i, r) {
  const a = h(n.name);
  if (!a) return null;
  const c = g(i), l = h(n.kind) || "text", d = gt(i, r, t, e, a, o), u = b(n.payload_path) || a, y = b(n.description), $ = b(n.help), _ = [y, $ && $ !== y ? $ : ""].filter(Boolean).join(" "), f = h(n.generate) === "request_id", j = l === "number" || l === "integer", x = n.option_source, C = [
    `id="${s(d)}"`,
    `data-action-field="${s(a)}"`,
    `data-action-field-kind="${s(f ? "text" : l)}"`,
    `data-action-field-path="${s(u)}"`,
    n.sensitive === !0 ? 'data-action-field-sensitive="true"' : "",
    f ? 'data-action-field-generated="request_id" readonly' : "",
    n.required || f ? 'required aria-required="true"' : "",
    `aria-describedby="${v(_ ? `${d}-help ${d}-error` : `${d}-error`)}"`,
    j && typeof n.min == "number" ? `min="${n.min}"` : "",
    j && typeof n.max == "number" ? `max="${n.max}"` : "",
    l === "integer" ? 'step="1" inputmode="numeric"' : "",
    x?.paginated === !0 ? `data-option-source="${v(h(x.id))}" data-option-paginated${x.searchable ? " data-option-searchable" : ""}` : ""
  ].filter(Boolean).join(" ");
  return {
    name: a,
    kind: l,
    label: b(n.label) || a,
    fieldID: d,
    generated: f,
    attrs: C,
    help: _ ? `<small class="${c}-field__help" id="${v(`${d}-help`)}">${s(_)}</small>` : "",
    error: `<small class="${c}-field__error" id="${v(`${d}-error`)}" data-action-field-error="${s(u)}" data-action-field-name="${s(a)}" data-action-id="${s(e)}" role="alert" hidden></small>`
  };
}
function ue(t) {
  const e = t.default;
  return t.sensitive === !0 || e === void 0 || e === null || typeof e == "object" ? "" : String(e);
}
function $e(t, e, n) {
  const o = g(n);
  if (e.generated) return `<div class="${o}-field__generated"><input type="text" ${e.attrs} value="" spellcheck="false" autocomplete="off"><button type="button" class="${o}-btn ${o}-btn--sm" data-copy-request-id aria-label="Copy ${v(e.label)}">Copy</button><button type="button" class="${o}-btn ${o}-btn--sm ${o}-btn--ghost" data-new-request>New request</button></div>`;
  const i = t.option_source;
  if (i?.paginated === !0) {
    const l = i.searchable ? `<input type="search" class="${o}-field__search" data-option-search aria-label="Search ${v(e.label)}" placeholder="Search">` : "";
    return `<select ${e.attrs}><option value="">Loading…</option></select>${l}<button type="button" class="${o}-btn ${o}-btn--sm ${o}-btn--ghost" data-option-more hidden>Load more</button>`;
  }
  const r = b(t.placeholder), a = jt(t, e.kind, e.attrs, r ? ` placeholder="${s(r)}"` : ""), c = ue(t);
  return c ? a.startsWith("<select") ? a.replace(`<option value="${s(c)}"`, `<option value="${s(c)}" selected`) : a.startsWith("<textarea") ? a.replace("></textarea>", `>${s(c)}</textarea>`) : a.replace(/>$/, ` value="${v(c)}">`) : a;
}
function pe(t, e, n, o, i, r) {
  const a = de(t, e, n, o, i, r);
  if (!a) return "";
  const c = g(i);
  return !a.generated && (a.kind === "boolean" || a.kind === "checkbox") ? `
      <div class="${c}-field ${c}-field--check" data-field-name="${v(a.name)}">
        <label class="${c}-check" for="${s(a.fieldID)}"><input type="checkbox" ${a.attrs}${n.default === !0 ? " checked" : ""}><span>${s(a.label)}</span></label>
        ${a.help}${a.error}
      </div>
    ` : `
    <div class="${c}-field" data-field-name="${v(a.name)}">
      <label class="${c}-field__label" for="${s(a.fieldID)}">${s(a.label)}</label>
      ${$e(n, a, i)}
      ${a.help}${a.error}
    </div>
  `;
}
function Y(t, e, n, o, i) {
  const r = vt(n.payload), a = Array.isArray(n.fields) ? n.fields : [], c = b(n.submit_label) || b(n.label) || e;
  return a.length > 0 ? `
      <form
        data-panel-action-form
        data-panel-id="${s(t)}"
        data-action-id="${s(e)}"
        data-action-confirm="${s(b(n.confirm_text))}"
        data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
        data-action-payload='${r}'
        style="display:flex;flex-wrap:wrap;gap:0.5rem;align-items:flex-end"
      >
        ${a.map((l, d) => fe(t, e, l, d, o, i)).join("")}
        <button type="submit" class="${o.sortToggle}">${s(c)}</button>
      </form>
    ` : `
    <button
      type="button"
      class="${o.sortToggle}"
      data-panel-action
      data-panel-id="${s(t)}"
      data-action-id="${s(e)}"
      data-action-confirm="${s(b(n.confirm_text))}"
      data-action-requires-confirm="${n.requires_confirm ? "true" : "false"}"
      data-action-payload='${r}'
    >${s(c)}</button>
  `;
}
function vt(t) {
  return t ? s(JSON.stringify(t)).replace(/'/g, "&#39;") : "";
}
function gt(t, e, n, o, i, r) {
  const a = b(e.idScope);
  return `${g(t)}-action-${a ? `${a}-` : ""}${n}-${o}-${i}-${r}`;
}
function be(t) {
  const e = Array.isArray(t.options) ? t.options.map((n) => b(n)).filter(Boolean) : [];
  return {
    items: Array.isArray(t.option_items) ? t.option_items.map((n) => ({
      value: b(n?.value),
      label: b(n?.label) || b(n?.value),
      disabled: n?.disabled === !0
    })).filter((n) => n.value) : [],
    values: e
  };
}
function jt(t, e, n, o) {
  if (t.sensitive === !0) return `<input type="password" ${n}${o} autocomplete="new-password" spellcheck="false">`;
  if (e === "boolean" || e === "checkbox") return `<input type="checkbox" ${n}>`;
  const { items: i, values: r } = be(t);
  return e === "select" || i.length > 0 || r.length > 0 ? `<select ${n}><option value=""></option>${i.length > 0 ? i.map((a) => `<option value="${s(a.value)}"${a.disabled ? " disabled" : ""}>${s(a.label)}</option>`).join("") : r.map((a) => `<option value="${s(a)}">${s(a)}</option>`).join("")}</select>` : e === "number" || e === "integer" ? `<input type="number" ${n}${o}>` : e === "textarea" || e === "json" || e === "string_list" ? `<textarea ${n}${o} rows="2"></textarea>` : `<input type="text" ${n}${o}>`;
}
function fe(t, e, n, o, i, r) {
  const a = h(n.name);
  if (!a) return "";
  const c = h(n.kind) || "text", l = b(n.label) || a, d = gt(i, r, t, e, a, o), u = b(n.payload_path) || a, y = n.required ? " required" : "", $ = b(n.placeholder), _ = $ ? ` placeholder="${s($)}"` : "", f = b(n.description), j = b(n.help), x = n.sensitive === !0, C = jt(n, c, `id="${s(d)}" data-action-field="${s(a)}" data-action-field-kind="${s(c)}" data-action-field-path="${s(u)}"${x ? ' data-action-field-sensitive="true"' : ""}${y}`, _);
  return `
    <label for="${s(d)}" style="display:flex;flex-direction:column;gap:0.25rem;font-size:0.8125rem">
      <span>${s(l)}</span>
      ${C}
      <small
        data-action-field-error="${s(u)}"
        data-action-field-name="${s(a)}"
        data-action-id="${s(e)}"
        hidden
      ></small>
      ${f ? `<small>${s(f)}</small>` : ""}
      ${j && j !== f ? `<small>${s(j)}</small>` : ""}
    </label>
  `;
}
function kt(t, e, n, o, i, r, a = !1) {
  let c = "";
  return e && F(e) ? c = z(t, e, n, o, i, a) : c = z(t, {
    renderer: "json",
    title: b(t.label) || h(t.id) || "Panel"
  }, Qt(n, e), o, i), `${se(t, o, r)}${c}`;
}
function me(t) {
  return `<div data-panel-action-result="${s(h(t.id))}"></div>`;
}
function Q(t, e, n, o, i, r, a = !1, c = {}) {
  return `${_t(t, o, c)}${kt(t, e, n, o, i, r, a)}${me(t)}`;
}
var he = 3e3;
function _e(t, e = {}) {
  if (!t || typeof t != "object") return null;
  const n = h(t.id);
  if (!n) return null;
  const o = ft(t.ui), i = o === null && Yt(t.ui) ? t.ui : void 0, r = i ? t : {
    ...t,
    ui: void 0
  }, a = i ? e.consoleRenderer : void 0, c = h(i?.events?.order) === "newest_first", l = h(i?.events?.mode), d = e.consoleRendererOwnsFilters !== !1, u = {
    ...ye(t, n),
    ...ge(i, e.styles),
    ...ve(r, i, o, c, a),
    showFilters: a && d ? !1 : !!i?.filters?.length,
    liveList: je(i, i?.views?.console || i?.views?.toolbar, l, c, r)
  };
  return e.extend ? e.extend(u, {
    serverDef: t,
    ui: i,
    eventMode: l,
    liveNewestFirst: c
  }) : u;
}
function ye(t, e) {
  const n = h(t.snapshot_key) || e;
  return {
    id: e,
    label: b(t.label) || e,
    icon: b(t.icon) || void 0,
    snapshotKey: n,
    eventTypes: ke(t.event_types, n),
    supportsToolbar: t.supports_toolbar !== !1,
    category: b(t.category) || "custom",
    order: typeof t.order == "number" ? t.order : 100
  };
}
function ve(t, e, n, o, i) {
  const r = e?.views?.console || e?.views?.toolbar, a = e?.views?.toolbar || e?.views?.console, c = (d, u, y) => Q(t, a, d, u, !1, n, o, y);
  if (i) {
    const d = (u, y) => i({
      def: t,
      data: u,
      styles: y,
      useIconCopyButton: !0
    });
    return {
      render: d,
      renderConsole: d,
      renderToolbar: c
    };
  }
  const l = (d, u, y) => Q(t, r, d, u, !0, n, o, y);
  return {
    render: l,
    renderConsole: l,
    renderToolbar: c,
    renderActions: (d, u) => _t(t, d, u),
    renderBody: (d, u) => kt(t, r, d, u, !0, n, o)
  };
}
function ge(t, e) {
  const n = !!t?.filters?.length;
  return {
    getCount: t?.count ? (o) => Xt(o, t) : void 0,
    getCountTone: t?.count ? (o) => Zt(o, t) : void 0,
    hideCount: t?.count ? (o) => Dt(o, t) : void 0,
    handleEvent: t?.events ? (o, i) => te(o, i, t) : void 0,
    renderFilters: n ? (o) => re(t, o, e) : void 0,
    defaultFilters: n ? ae(t) : void 0,
    applyFilters: n ? (o, i) => ie(o, i, t) : void 0
  };
}
function je(t, e, n, o, i) {
  if (!(!t || !e || n !== "append" || !zt(e.renderer)) && (h(e.renderer) !== "table" || Array.isArray(e.options?.columns) && e.options.columns.length > 0))
    return {
      renderRow: (r, a) => Kt(e.renderer, r, e, a, i),
      keyOf: (r) => T(r, e.options?.key_bind),
      getMaxEntries: () => typeof t.events?.max_entries == "number" ? t.events.max_entries : 500,
      newestFirst: o
    };
}
function ke(t, e) {
  if (!Array.isArray(t)) return e ? [e] : [];
  const n = /* @__PURE__ */ new Set(), o = [];
  return t.forEach((i) => {
    const r = h(i);
    r && !n.has(r) && (n.add(r), o.push(r));
  }), o.length > 0 ? o : e ? [e] : [];
}
async function Le(t, e = he) {
  let n;
  const o = typeof AbortController < "u" ? new AbortController() : null;
  try {
    o && e > 0 && (n = setTimeout(() => o.abort(), e));
    const i = await St(t, {
      credentials: "same-origin",
      signal: o?.signal
    });
    if (!i.ok) return [];
    const r = await At(i);
    return Array.isArray(r.panels) ? r.panels : [];
  } catch {
    return [];
  } finally {
    n !== void 0 && clearTimeout(n);
  }
}
function Te(t, e, n = () => ({})) {
  let o = 0;
  return (Array.isArray(e) ? e : []).forEach((i) => {
    const r = _e(i, n(i));
    r && t.registerServerDefinition(r) && (o += 1);
  }), o;
}
export {
  it as _,
  h as a,
  qt as c,
  Bt as d,
  z as f,
  T as g,
  Ut as h,
  Te as i,
  Vt as l,
  $t as m,
  Le as n,
  yt as o,
  It as p,
  _e as r,
  zt as s,
  he as t,
  Kt as u,
  Pe as v
};

//# sourceMappingURL=hydrate-CnDSPe87.js.map