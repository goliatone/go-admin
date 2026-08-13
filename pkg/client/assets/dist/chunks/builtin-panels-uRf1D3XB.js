import { escapeAttribute as m, escapeHTML as n } from "../shared/html.js";
import { A as y, D as H, E as U, F as ge, M as be, O as R, P as E, b as x, h as j, j as re, k as b, t as fe, w as xe } from "./runtime-helpers-C2cPJaEE.js";
import { B as z, F as me, I as C, N as ae, P as he, R as ye, j as $ } from "./server-definitions-yM2kAYaY.js";
import { r as h } from "./icons-CAenalpJ.js";
function ve(e) {
  return ge(e);
}
var $e = ve(() => import("./repl-panel-BY_ZYjKg.js").then((e) => e.n)), bo = $e.load;
function O(e, t, o) {
  return `
    <div class="${o.panelControls}">
      <label class="${o.sortToggle}">
        <input type="checkbox" data-sort-toggle="${e}" ${t ? "checked" : ""}>
        <span>Newest first</span>
      </label>
    </div>
  `;
}
function _(e) {
  return e.id ? e.id : `sql-${C(`${e.timestamp || ""}|${e.duration ?? ""}|${e.query || ""}`)}`;
}
function we(e) {
  return `
    <div class="${e.sqlToolbar}" data-sql-toolbar>
      <span data-sql-selected-count>0 selected</span>
      <button class="${e.sqlToolbarBtn}" data-sql-export="clipboard" title="Copy selected queries to clipboard">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Copy
      </button>
      <button class="${e.sqlToolbarBtn}" data-sql-export="download" title="Download selected queries as .sql file">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Download .sql
      </button>
      <button class="${e.sqlToolbarBtn}" data-sql-clear-selection title="Clear selection">
        Clear
      </button>
    </div>
  `;
}
function ke(e, t, o) {
  return t ? `
      <button class="${e.copyBtnSm}" data-copy-trigger="${o}" title="Copy SQL">
        <i class="iconoir-copy"></i> Copy
      </button>
    ` : `
    <button class="${e.copyBtn}" data-copy-trigger title="Copy SQL">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      Copy
    </button>
  `;
}
function K(e, t, o) {
  const r = H(e.duration, o.slowThresholdMs), a = r.isSlow, s = !!e.error, i = _(e), d = m(i), c = `sql-row-${i}`, l = m(c), p = e.query || "", u = z(p, "sql"), g = [t.expandableRow];
  a && g.push(t.slowQuery), s && g.push(t.errorQuery);
  const f = a ? t.durationSlow : "", v = ke(t, o.useIconCopyButton || !1, c);
  return `
    <tr class="${g.join(" ")}" data-row-id="${l}" data-sql-id="${d}">
      <td class="${t.selectCell}"><input type="checkbox" class="sql-select-row" data-sql-id="${d}"></td>
      <td class="${t.duration} ${f}">${r.text}</td>
      <td>${n(b(e.row_count ?? "-"))}</td>
      <td class="${t.timestamp}">${n(y(e.timestamp))}</td>
      <td>${s ? `<span class="${t.badgeError}">Error</span>` : ""}</td>
      <td class="${t.queryText}"><span class="${t.expandIcon}">&#9654;</span>${n(p)}</td>
    </tr>
    <tr class="${t.expansionRow}" data-expansion-for="${l}">
      <td colspan="6">
        <div class="${t.expandedContent}" data-copy-content="${n(p)}">
          <div class="${t.expandedContentHeader}">
            ${v}
          </div>
          <pre>${u}</pre>
        </div>
      </td>
    </tr>
  `;
}
function Ce(e, t, o) {
  return e.map((r) => K(r, t, o)).join("");
}
function M(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: a = 50, maxEntries: s = 50, showSortToggle: i = !1, useIconCopyButton: d = !1 } = o, c = i ? O("sql", r, t) : "", l = we(t);
  if (!e.length) return c + `<div class="${t.emptyState}">No SQL queries captured</div>`;
  let p = s ? e.slice(-s) : e;
  r && (p = [...p].reverse());
  const u = Ce(p, t, {
    ...o,
    slowThresholdMs: a,
    useIconCopyButton: d
  });
  return `
    ${c}
    ${l}
    <table class="${t.table}" data-sql-table>
      <thead>
        <tr>
          <th class="${t.selectCell}"><input type="checkbox" class="sql-select-all"></th>
          <th>Duration</th>
          <th>Rows</th>
          <th>Time</th>
          <th>Status</th>
          <th>Query</th>
        </tr>
      </thead>
      <tbody>${u}</tbody>
    </table>
  `;
}
function fo(e, t, o, r) {
  return he(e, K(t, o, r), r.newestFirst !== !1), _(t);
}
function xo(e, t, o) {
  return me(e, "tr[data-sql-id]", "data-sql-id", t, o);
}
var G = /* @__PURE__ */ new WeakSet(), W = /* @__PURE__ */ new WeakSet();
function Se(e) {
  if (W.has(e)) return;
  W.add(e);
  const t = (o) => {
    const r = o.target;
    if (!r) return;
    const a = r.closest(".expandable-row")?.nextElementSibling || r.closest("pre, .expansion-row, [data-debug-syntax]");
    a && ye(a);
  };
  e.addEventListener("click", t), e.addEventListener("focusin", t);
}
async function L(e, t, o = {}) {
  const { feedbackDuration: r = 1500, useIconFeedback: a = !1, successClass: s = a ? "debug-copy--success" : "copied", errorClass: i = "debug-copy--error" } = o;
  try {
    await navigator.clipboard.writeText(e);
    const d = t.innerHTML;
    return t.classList.add(s), a ? t.innerHTML = '<i class="iconoir-check"></i> Copied' : t.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied
      `, setTimeout(() => {
      t.innerHTML = d, t.classList.remove(s);
    }, r), !0;
  } catch {
    return t.classList.add(i), setTimeout(() => {
      t.classList.remove(i);
    }, r), !1;
  }
}
function mo(e, t = {}) {
  G.has(e) || (G.add(e), e.addEventListener("click", (o) => {
    const r = o.target?.closest("[data-copy-trigger]");
    if (!r || !e.contains(r) || r.closest("[data-sql-table]") || r.closest("[data-request-table]")) return;
    o.preventDefault(), o.stopPropagation();
    const a = r.closest("[data-copy-content]");
    a && L(a.getAttribute("data-copy-content") || "", r, t);
  }));
}
function ho(e) {
  Se(e), e.querySelectorAll(".expandable-row").forEach((t) => {
    t.closest("[data-sql-table], [data-live-list]") || t.addEventListener("click", (o) => {
      o.target.closest("a, button, input") || o.currentTarget.classList.toggle("expanded");
    });
  });
}
function yo(e, t) {
  const { tableSelector: o, rowSelector: r, keyAttr: a, expanded: s } = t;
  e.querySelectorAll(o).forEach((i) => {
    const d = (c) => {
      const l = c.target;
      if (l.closest("a, button, input")) return;
      const p = l.closest(r);
      if (!p || !i.contains(p)) return;
      const u = p.getAttribute(a);
      u && (s.has(u) ? s.delete(u) : s.add(u), se(p, s.has(u)));
    };
    i.addEventListener("click", d), i.addEventListener("keydown", (c) => {
      const l = c;
      l.key !== "Enter" && l.key !== " " || l.target.matches(r) && (l.preventDefault(), d(c));
    });
  });
}
function se(e, t) {
  e.classList.toggle("expanded", t), e.hasAttribute("aria-expanded") && e.setAttribute("aria-expanded", String(t));
  const o = e.nextElementSibling;
  o?.classList.contains("expansion-row") && o.setAttribute("aria-hidden", String(!t));
}
function vo(e, t) {
  const { rowSelector: o, keyAttr: r, expanded: a } = t;
  e.querySelectorAll(o).forEach((s) => {
    const i = s.getAttribute(r);
    se(s, !!i && a.has(i));
  });
}
function $o(e, t) {
  e.querySelectorAll("[data-sort-toggle]").forEach((o) => {
    o.addEventListener("change", (r) => {
      const a = r.target, s = a.dataset.sortToggle;
      s && t(s, a.checked);
    });
  });
}
var wo = {
  COPY_TRIGGER: "data-copy-trigger",
  COPY_CONTENT: "data-copy-content",
  ROW_ID: "data-row-id",
  EXPANSION_FOR: "data-expansion-for",
  SORT_TOGGLE: "data-sort-toggle"
}, ko = {
  EXPANDABLE_ROW: "expandable-row",
  EXPANDED: "expanded",
  EXPANSION_ROW: "expansion-row",
  SLOW_QUERY: "slow-query",
  ERROR_QUERY: "error-query",
  EXPAND_ICON: "expand-icon"
};
function Y(e, t) {
  const o = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map();
  return e.forEach((a, s) => {
    const i = _(a);
    o.set(i, s), r.set(i, a);
  }), [...t].filter((a) => r.has(a)).sort((a, s) => (o.get(a) ?? 0) - (o.get(s) ?? 0)).map((a) => r.get(a)).map((a) => {
    let s = `-- Duration: ${H(a.duration).text} | Rows: ${a.row_count ?? 0}`;
    return a.error && (s += ` | Error: ${a.error}`), a.timestamp && (s += ` | Time: ${a.timestamp}`), `${s}
${a.query || ""};`;
  }).join(`

`);
}
function _e(e, t, o = "text/sql") {
  const r = new Blob([e], { type: o }), a = URL.createObjectURL(r), s = document.createElement("a");
  s.href = a, s.download = t, s.click(), URL.revokeObjectURL(a);
}
function Co(e, t, o = {}) {
  e.querySelectorAll("[data-request-table]").forEach((r) => {
    r.addEventListener("click", (a) => {
      const s = a.target, i = s.closest("[data-copy-trigger]");
      if (i && r.contains(i)) {
        a.preventDefault(), a.stopPropagation(), L(i.closest("[data-copy-content]")?.getAttribute("data-copy-content") || "", i, o);
        return;
      }
      if (s.closest("button, a, input, [data-detail-for]")) return;
      const d = s.closest("[data-request-id]");
      if (!d) return;
      const c = d.dataset.requestId;
      if (!c) return;
      const l = d.nextElementSibling;
      if (!l || !l.hasAttribute("data-detail-for") || l.dataset.detailFor !== c) return;
      const p = l.querySelector("[data-request-detail-template]");
      if (p) {
        const g = l.querySelector("td");
        g && (g.appendChild(p.content.cloneNode(!0)), p.remove());
      }
      const u = d.querySelector("[data-expand-icon]");
      t.has(c) ? (t.delete(c), l.style.display = "none", u && (u.textContent = "▶")) : (t.add(c), l.style.display = "table-row", u && (u.textContent = "▼"));
    });
  });
}
var Te = {
  table: "debug-table",
  tableRoutes: "debug-table debug-routes-table",
  badge: "badge",
  badgeMethod: (e) => `badge badge--method-${e.toLowerCase()}`,
  badgeStatus: (e) => e >= 500 ? "badge badge--status-error" : e >= 400 ? "badge badge--status-warn" : "badge badge--status",
  badgeLevel: (e) => `badge badge--level-${e.toLowerCase()}`,
  badgeError: "badge badge--status-error",
  badgeCustom: "badge badge--custom",
  duration: "duration",
  durationSlow: "duration--slow",
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  rowError: "error",
  rowSlow: "slow",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow",
  errorQuery: "error",
  expandIcon: "expand-icon",
  emptyState: "debug-empty",
  jsonViewer: "debug-json-panel",
  jsonViewerHeader: "debug-json-header",
  jsonViewerTitle: "",
  jsonGrid: "debug-json-grid",
  jsonPanel: "debug-json-panel",
  jsonHeader: "debug-json-header",
  jsonActions: "debug-json-actions",
  jsonContent: "debug-json-content",
  copyBtn: "debug-btn debug-copy",
  copyBtnSm: "debug-btn debug-copy debug-copy--sm",
  panelControls: "debug-filter",
  sortToggle: "debug-btn",
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  muted: "debug-muted",
  selectCell: "debug-sql-select",
  sqlToolbar: "debug-sql-toolbar",
  sqlToolbarBtn: "debug-btn",
  detailRow: "request-detail-row",
  detailPane: "request-detail-pane",
  detailSection: "request-detail-section",
  detailLabel: "request-detail-label",
  detailValue: "request-detail-value",
  detailKeyValueTable: "request-detail-kv",
  detailError: "request-detail-error",
  detailMasked: "request-detail-masked",
  detailBody: "request-detail-body",
  detailMetadataLine: "request-detail-metadata",
  badgeContentType: "badge badge--content-type"
}, qe = {
  table: "",
  tableRoutes: "",
  badge: "badge",
  badgeMethod: (e) => `badge badge-method ${e.toLowerCase()}`,
  badgeStatus: (e) => {
    const t = be(e);
    return t ? `badge badge-status ${t}` : "badge badge-status";
  },
  badgeLevel: (e) => `badge badge-level ${re(e)}`,
  badgeError: "badge badge-status error",
  badgeCustom: "badge",
  duration: "duration",
  durationSlow: "slow",
  timestamp: "timestamp",
  path: "path",
  message: "message",
  queryText: "query-text",
  rowError: "",
  rowSlow: "",
  expandableRow: "expandable-row",
  expansionRow: "expansion-row",
  slowQuery: "slow-query",
  errorQuery: "error-query",
  expandIcon: "expand-icon",
  emptyState: "empty-state",
  jsonViewer: "json-viewer",
  jsonViewerHeader: "json-viewer__header",
  jsonViewerTitle: "json-viewer__title",
  jsonGrid: "",
  jsonPanel: "json-viewer",
  jsonHeader: "json-viewer__header",
  jsonActions: "",
  jsonContent: "",
  copyBtn: "copy-btn",
  copyBtnSm: "copy-btn",
  panelControls: "panel-controls",
  sortToggle: "sort-toggle",
  expandedContent: "expanded-content",
  expandedContentHeader: "expanded-content__header",
  muted: "timestamp",
  selectCell: "sql-select",
  sqlToolbar: "sql-toolbar",
  sqlToolbarBtn: "copy-btn",
  detailRow: "request-detail-row",
  detailPane: "request-detail-pane",
  detailSection: "request-detail-section",
  detailLabel: "request-detail-label",
  detailValue: "request-detail-value",
  detailKeyValueTable: "request-detail-kv",
  detailError: "request-detail-error",
  detailMasked: "request-detail-masked",
  detailBody: "request-detail-body",
  detailMetadataLine: "request-detail-metadata",
  badgeContentType: "badge badge-content-type"
};
function So(e) {
  return e === "console" ? Te : qe;
}
function Ee(e) {
  const t = String(e ?? "GET").trim().toUpperCase();
  return {
    display: t || "GET",
    classToken: t.replace(/[^A-Z]/g, "") || "GET"
  };
}
function ze(e) {
  return e.id ? e.id : `req-${C(`${e.timestamp || ""}|${e.method || ""}|${e.path || ""}|${e.status ?? ""}`)}`;
}
function Le(e, t, o = {}) {
  const { maskPlaceholder: r = "***", maxDetailLength: a } = o, s = [], i = [];
  if (e.id && i.push(`<span>ID: <code>${n(e.id)}</code></span>`), e.remote_ip && i.push(`<span>IP: <code>${n(e.remote_ip)}</code></span>`), e.content_type && i.push(`<span>Content-Type: <code>${n(e.content_type)}</code></span>`), i.length > 0 && s.push(`<div class="${t.detailMetadataLine}">${i.join("")}</div>`), e.headers && Object.keys(e.headers).length > 0) {
    const d = Object.entries(e.headers).map(([c, l]) => {
      const p = a && l.length > a ? E(l, a) : l, u = l === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(c)}</dt><dd>${n(p)}${u}</dd>`;
    }).join("");
    s.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Request Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.query && Object.keys(e.query).length > 0) {
    const d = Object.entries(e.query).map(([c, l]) => {
      const p = l === r ? ` <span class="${t.detailMasked}">(masked)</span>` : "";
      return `<dt>${n(c)}</dt><dd>${n(l)}${p}</dd>`;
    }).join("");
    s.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Query Parameters</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.request_body) {
    const d = e.request_size ? ` (${U(e.request_size)})` : "", c = e.body_truncated ? ' <span class="' + t.detailMasked + '">(truncated)</span>' : "";
    let l;
    try {
      const p = JSON.parse(e.request_body);
      l = z(JSON.stringify(p, null, 2), "json");
    } catch {
      l = n(e.request_body);
    }
    s.push(`
      <div class="${t.detailSection}" data-copy-content="${n(e.request_body)}">
        <span class="${t.detailLabel}">Request Body${d}${c}</span>
        <div class="${t.detailBody}">
          <pre>${l}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger title="Copy">Copy</button>
      </div>
    `);
  }
  if (e.response_headers && Object.keys(e.response_headers).length > 0) {
    const d = Object.entries(e.response_headers).map(([c, l]) => {
      const p = a && l.length > a ? E(l, a) : l;
      return `<dt>${n(c)}</dt><dd>${n(p)}</dd>`;
    }).join("");
    s.push(`
      <div class="${t.detailSection}">
        <span class="${t.detailLabel}">Response Headers</span>
        <dl class="${t.detailKeyValueTable}">${d}</dl>
      </div>
    `);
  }
  if (e.response_body) {
    const d = e.response_size ? ` (${U(e.response_size)})` : "";
    let c;
    try {
      const l = JSON.parse(e.response_body);
      c = z(JSON.stringify(l, null, 2), "json");
    } catch {
      c = n(e.response_body);
    }
    s.push(`
      <div class="${t.detailSection}" data-copy-content="${n(e.response_body)}">
        <span class="${t.detailLabel}">Response Body${d}</span>
        <div class="${t.detailBody}">
          <pre>${c}</pre>
        </div>
        <button class="${t.copyBtnSm}" data-copy-trigger title="Copy">Copy</button>
      </div>
    `);
  }
  return e.error && s.push(`
      <div class="${t.detailSection}">
        <div class="${t.detailError}">${n(e.error)}</div>
      </div>
    `), s.length === 0 ? `<div class="${t.detailPane}"><span class="${t.muted}">No additional details available</span></div>` : `<div class="${t.detailPane}">${s.join("")}</div>`;
}
function Re(e, t, o) {
  const { display: r, classToken: a } = Ee(e.method), s = e.path || "", i = e.status || 0, d = H(e.duration, o.slowThresholdMs), c = ze(e), l = o.expandedRequestIds?.has(c) || !1, p = t.badgeMethod(a), u = t.badgeStatus(i), g = d.isSlow ? t.durationSlow : "", f = i >= 400 ? t.rowError : "", v = o.truncatePath ? E(s, o.maxPathLength || 50) : s;
  let k = "";
  const S = r;
  if (S === "POST" || S === "PUT" || S === "PATCH") {
    const Q = (e.content_type || e.headers?.["Content-Type"] || e.headers?.["content-type"] || "").split(";")[0].trim();
    Q && (k = ` <span class="${t.badgeContentType}">${n(Q)}</span>`);
  }
  const P = `<span class="${t.expandIcon}" data-expand-icon>${l ? "▼" : "▶"}</span>`, pe = l ? "table-row" : "none", V = Le(e, t, {
    maskPlaceholder: o.maskPlaceholder,
    maxDetailLength: o.maxDetailLength
  }), ue = l ? V : `<template data-request-detail-template>${V}</template>`;
  return `
    <tr class="${f}" data-request-id="${n(c)}" style="cursor:pointer">
      <td>${P}<span class="${p}">${n(r)}</span>${k}</td>
      <td class="${t.path}" title="${n(s)}">${n(v)}</td>
      <td><span class="${u}">${n(i || "-")}</span></td>
      <td class="${t.duration} ${g}">${d.text}</td>
      <td class="${t.timestamp}">${n(y(e.timestamp))}</td>
    </tr>
    <tr class="${t.detailRow}" data-detail-for="${n(c)}" style="display:${pe}">
      <td colspan="5">${ue}</td>
    </tr>
  `;
}
function N(e, t, o = {}) {
  const { newestFirst: r = !0, slowThresholdMs: a = 50, maxEntries: s, showSortToggle: i = !1, truncatePath: d = !0, maxPathLength: c = 50 } = o, l = i ? O("requests", r, t) : "";
  if (!e.length) return l + `<div class="${t.emptyState}">No requests captured</div>`;
  let p = s ? e.slice(-s) : e;
  r && (p = [...p].reverse());
  const u = p.map((g) => Re(g, t, {
    ...o,
    slowThresholdMs: a,
    truncatePath: d,
    maxPathLength: c
  })).join("");
  return `
    ${l}
    <table class="${t.table}" data-request-table>
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Status</th>
          <th>Duration</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody data-live-list>${u}</tbody>
    </table>
  `;
}
var _o = class {
  constructor(e) {
    this.selected = /* @__PURE__ */ new Set(), this.expanded = /* @__PURE__ */ new Set(), this.table = null, this.toolbarEl = null, this.countEl = null, this.selectAllEl = null, this.wired = /* @__PURE__ */ new WeakSet(), this.onTableChange = (t) => {
      const o = t.target;
      if (!(!o || !o.classList)) {
        if (o.classList.contains("sql-select-all")) {
          this.setAllVisible(o.checked);
          return;
        }
        if (o.classList.contains("sql-select-row")) {
          const r = o, a = r.dataset.sqlId;
          if (!a) return;
          r.checked ? this.selected.add(a) : this.selected.delete(a), this.updateToolbar();
        }
      }
    }, this.onTableClick = (t) => {
      const o = t.target;
      if (!o) return;
      const r = o.closest("[data-copy-trigger]");
      if (r) {
        t.preventDefault(), t.stopPropagation();
        const i = r.closest("[data-copy-content]")?.getAttribute("data-copy-content") || "";
        L(i, r, this.opts.copyOptions);
        return;
      }
      if (o.closest("a, button, input")) return;
      const a = o.closest("tr[data-sql-id]");
      if (!a) return;
      const s = a.dataset.sqlId;
      s && (this.expanded.has(s) ? (this.expanded.delete(s), a.classList.remove("expanded")) : (this.expanded.add(s), a.classList.add("expanded")));
    }, this.opts = e, this.list = new ae({
      styles: e.styles,
      containerSelector: "[data-sql-table] tbody",
      rowSelector: "tr[data-sql-id]",
      keyAttr: "data-sql-id",
      keyOf: _,
      renderRow: (t) => K(t, e.styles, e.getRenderOptions()),
      getRenderOptions: e.getRenderOptions,
      getMaxEntries: e.getMaxEntries,
      shouldDisplay: e.shouldDisplay,
      onNeedFullRender: e.onNeedFullRender,
      onPendingChange: e.onPendingChange,
      scheduleFrame: e.scheduleFrame,
      onAdopt: (t) => this.wire(t),
      onRestore: () => this.restoreState()
    });
  }
  adopt(e) {
    this.list.adopt(e);
  }
  enqueue(e) {
    this.list.enqueue(e);
  }
  setPaused(e) {
    this.list.setPaused(e);
  }
  discardPending() {
    this.list.discardPending();
  }
  get pendingCount() {
    return this.list.pendingCount;
  }
  wire(e) {
    this.table = e.querySelector("[data-sql-table]"), this.toolbarEl = e.querySelector("[data-sql-toolbar]"), this.countEl = e.querySelector("[data-sql-selected-count]"), this.selectAllEl = this.table?.querySelector(".sql-select-all") ?? null, this.table && !this.wired.has(this.table) && (this.wired.add(this.table), this.table.addEventListener("change", this.onTableChange), this.table.addEventListener("click", this.onTableClick)), this.toolbarEl && !this.wired.has(this.toolbarEl) && (this.wired.add(this.toolbarEl), this.wireToolbar(this.toolbarEl));
  }
  wireToolbar(e) {
    e.querySelector('[data-sql-export="clipboard"]')?.addEventListener("click", async (t) => {
      if (t.preventDefault(), this.selected.size === 0) return;
      const o = Y(this.opts.getQueries(), this.selected);
      await L(o, t.currentTarget, this.opts.copyOptions);
    }), e.querySelector('[data-sql-export="download"]')?.addEventListener("click", (t) => {
      if (t.preventDefault(), this.selected.size === 0) return;
      const o = Y(this.opts.getQueries(), this.selected), r = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
      _e(o, `sql-queries-${r}.sql`);
    }), e.querySelector("[data-sql-clear-selection]")?.addEventListener("click", (t) => {
      t.preventDefault(), this.clearSelection();
    });
  }
  setAllVisible(e) {
    this.table && (this.table.querySelectorAll(".sql-select-row").forEach((t) => {
      t.checked = e;
      const o = t.dataset.sqlId;
      o && (e ? this.selected.add(o) : this.selected.delete(o));
    }), this.updateToolbar());
  }
  clearSelection() {
    this.selected.clear(), this.table?.querySelectorAll(".sql-select-row").forEach((e) => {
      e.checked = !1;
    }), this.updateToolbar();
  }
  restoreState() {
    if (!this.table) return;
    const e = new Set(this.opts.getQueries().map(_));
    for (const t of [...this.selected]) e.has(t) || this.selected.delete(t);
    for (const t of [...this.expanded]) e.has(t) || this.expanded.delete(t);
    this.table.querySelectorAll(".sql-select-row").forEach((t) => {
      t.checked = !!t.dataset.sqlId && this.selected.has(t.dataset.sqlId);
    }), this.table.querySelectorAll("tr[data-sql-id]").forEach((t) => {
      const o = t.dataset.sqlId;
      o && this.expanded.has(o) ? t.classList.add("expanded") : t.classList.remove("expanded");
    }), this.updateToolbar();
  }
  updateToolbar() {
    if (this.toolbarEl) {
      const e = this.selected.size;
      this.toolbarEl.dataset.visible = e > 0 ? "true" : "false", this.countEl && (this.countEl.textContent = `${e} selected`);
    }
    if (this.selectAllEl && this.table) {
      const e = this.table.querySelectorAll(".sql-select-row"), t = this.table.querySelectorAll(".sql-select-row:checked").length;
      this.selectAllEl.checked = e.length > 0 && t === e.length, this.selectAllEl.indeterminate = t > 0 && t < e.length;
    }
  }
}, je = [
  "error",
  "root_error",
  "text_code",
  "code",
  "status_code",
  "category",
  "retryable",
  "causes",
  "cause"
], Oe = [
  "health",
  "diagnostics",
  "readiness"
], Ae = /* @__PURE__ */ new Set(["stack", "stack_trace"]);
function Pe(e) {
  return e.id ? e.id : `log-${C(`${e.timestamp || ""}|${e.level || ""}|${e.source || ""}|${e.message || ""}`)}`;
}
function To(e) {
  return ne(e).toLowerCase();
}
function ne(e) {
  try {
    return JSON.stringify(T(e), null, 2);
  } catch {
    return JSON.stringify({
      timestamp: e.timestamp,
      level: e.level,
      message: e.message,
      source: e.source
    }, null, 2);
  }
}
function T(e) {
  if (Array.isArray(e)) return e.map(T);
  if (!e || typeof e != "object") return e;
  const t = e;
  return Object.keys(t).sort().reduce((o, r) => (o[r] = T(t[r]), o), {});
}
function Me(e) {
  return e.replace(/[_-]+/g, " ").replace(/\b\w/g, (t) => t.toUpperCase());
}
function Ne(e) {
  return e !== null && typeof e == "object" ? `<pre>${n(JSON.stringify(T(e), null, 2))}</pre>` : `<span>${n((e == null, String(e)))}</span>`;
}
function q(e, t, o) {
  return t.length === 0 ? "" : `
    <section class="debug-log-detail-section">
      <h4>${n(e)}</h4>
      <dl class="${o.detailKeyValueTable}">
        ${t.map(([r, a]) => `
          <dt>${n(Me(r))}</dt>
          <dd>${Ne(a)}</dd>
        `).join("")}
      </dl>
    </section>
  `;
}
function ie(e) {
  const t = e.caller;
  if (!t) return e.source || "";
  const o = t.file ? `${t.file}${t.line ? `:${t.line}` : ""}` : "";
  return [t.function, o].filter(Boolean).join(" — ") || e.source || "";
}
function Be(e) {
  return e.source ? e.source : e.caller?.file ? `${e.caller.file}${e.caller.line ? `:${e.caller.line}` : ""}` : e.caller?.function || e.logger || "";
}
function Ie(e) {
  const t = e.fields || {}, o = /* @__PURE__ */ new Set(), r = (s) => s.flatMap((i) => i in t ? (o.add(i), [[i, t[i]]]) : []);
  let a = "";
  for (const s of Ae) {
    if (!(s in t)) continue;
    o.add(s);
    const i = t[s];
    if (a = typeof i == "string" ? i : JSON.stringify(T(i), null, 2) || "", a) break;
  }
  return {
    errors: r(je),
    diagnostics: r(Oe),
    remaining: Object.keys(t).filter((s) => !o.has(s)).sort((s, i) => s.localeCompare(i)).map((s) => [s, t[s]]),
    stack: a
  };
}
function De(e, t, o, r) {
  const a = Ie(e), s = [
    ["logger", e.logger],
    ["caller", ie(e)],
    ["request_id", e.request_id],
    ["trace_id", e.trace_id],
    ["span_id", e.span_id],
    ["session_id", e.session_id],
    ["user_id", e.user_id]
  ].filter(([, c]) => c != null && c !== ""), i = ne(e), d = a.stack ? `<div data-copy-content="${m(a.stack)}"><button type="button" class="${t.copyBtnSm}" data-copy-trigger title="Copy stack trace">Copy stack</button></div>` : "";
  return `
    <tr class="${t.expansionRow}" aria-hidden="true">
      <td colspan="${r}">
        <div id="${m(o)}" class="${t.expandedContent} debug-log-details">
          <div class="${t.expandedContentHeader} debug-log-detail-actions">
            ${d}
            <div data-copy-content="${m(i)}">
              <button type="button" class="${t.copyBtnSm}" data-copy-trigger title="Copy normalized log event as JSON">Copy JSON</button>
            </div>
          </div>
          ${q("Error", a.errors, t)}
          ${q("Diagnostics", a.diagnostics, t)}
          ${q("Context", s, t)}
          ${q("Fields", a.remaining, t)}
          ${a.stack ? `
            <section class="debug-log-detail-section debug-log-stack">
              <h4>Stack</h4>
              <pre>${n(a.stack)}</pre>
            </section>
          ` : ""}
        </div>
      </td>
    </tr>
  `;
}
function Fe(e, t, o) {
  const r = e.level || "INFO", a = String(r).toUpperCase(), s = re(String(r)), i = e.message || "", d = Be(e), c = Pe(e), l = `log-details-${C(c)}`, p = o.expandable === !0, u = o.showSource ? 4 : 3, g = t.badgeLevel(s), f = [s === "error" ? t.rowError : ""];
  p && f.push(t.expandableRow);
  const v = o.truncateMessage ? E(i, o.maxMessageLength || 100) : i, k = o.showSource ? `<td class="${t.timestamp}" title="${m(ie(e) || d)}">${n(d)}</td>` : "", S = p ? `<span class="${t.expandIcon}" aria-hidden="true">&#9654;</span>` : "", P = p ? ` tabindex="0" role="button" aria-expanded="false" aria-controls="${m(l)}" aria-label="Show details for ${m(i || "log entry")}"` : "";
  return `
    <tr class="${f.filter(Boolean).join(" ")}" data-row-key="${m(c)}"${P}>
      <td>${S}<span class="${g}">${n(a)}</span></td>
      <td class="${t.timestamp}">${n(y(e.timestamp))}</td>
      <td class="${t.message}" title="${m(i)}">${n(v)}</td>
      ${k}
    </tr>
    ${p ? De(e, t, l, u) : ""}
  `;
}
function B(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: a = 100, showSortToggle: s = !1, showSource: i = !1, truncateMessage: d = !0, maxMessageLength: c = 100 } = o, l = s ? O("logs", r, t) : "";
  if (!e.length) return l + `<div class="${t.emptyState}">No logs captured</div>`;
  let p = a ? e.slice(-a) : e;
  r && (p = [...p].reverse());
  const u = p.map((g) => Fe(g, t, {
    ...o,
    showSource: i,
    truncateMessage: d,
    maxMessageLength: c
  })).join("");
  return `
    ${l}
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Level</th>
          <th>Time</th>
          <th>Message</th>
          ${i ? "<th>Caller / Source</th>" : ""}
        </tr>
      </thead>
      <tbody data-live-list>${u}</tbody>
    </table>
  `;
}
function He(e, t, o) {
  const r = e.method || "GET", a = e.path || "", s = e.handler || "-", i = e.name || "", d = t.badgeMethod(r), c = o.showName ? `<td class="${t.timestamp}">${n(i)}</td>` : "";
  return `
    <tr>
      <td><span class="${d}">${n(r)}</span></td>
      <td class="${t.path}">${n(a)}</td>
      <td>${n(s)}</td>
      ${c}
    </tr>
  `;
}
function I(e, t, o = {}) {
  const { showName: r = !1 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No routes available</div>`;
  const a = e.map((i) => He(i, t, { showName: r })).join(""), s = r ? "<th>Name</th>" : "";
  return `
    <table class="${t.tableRoutes || t.table}">
      <thead>
        <tr>
          <th>Method</th>
          <th>Path</th>
          <th>Handler</th>
          ${s}
        </tr>
      </thead>
      <tbody>${a}</tbody>
    </table>
  `;
}
function Ke(e) {
  try {
    return JSON.stringify(e) ?? "";
  } catch {
    return String(e);
  }
}
var qo = class {
  constructor(e) {
    this.views = /* @__PURE__ */ new Map(), this.host = e;
  }
  handles(e) {
    return e?.liveList ? e.liveList.updateMode !== "upsert" || this.host.allowUpsert !== !1 : !1;
  }
  adopt(e, t) {
    this.handles(e) && this.viewFor(e).adopt(t);
  }
  enqueue(e, t) {
    !this.handles(e) || t === void 0 || this.viewFor(e).enqueue([t]);
  }
  viewFor(e) {
    const t = this.views.get(e.id);
    if (t) return t;
    const o = e.liveList, r = o.keyOf || ((s) => `r-${C(Ke(s))}`), a = new ae({
      styles: this.host.styles,
      containerSelector: o.containerSelector,
      rowSelector: o.rowSelector,
      keyAttr: o.keyAttr,
      keyOf: r,
      updateMode: o.updateMode,
      revisionOf: o.revisionOf,
      terminalOf: o.terminalOf,
      renderRow: (s) => o.renderRow(s, this.host.styles, this.host.getRenderOptions(e)),
      getRenderOptions: () => ({
        ...this.host.getRenderOptions(e),
        newestFirst: o.newestFirst ?? !1
      }),
      getMaxEntries: () => o.getMaxEntries ? o.getMaxEntries() : 500,
      shouldDisplay: this.host.shouldDisplay ? (s) => this.host.shouldDisplay(e, s) : void 0,
      onNeedFullRender: () => this.host.onNeedFullRender(e),
      onAdopt: o.onAdopt,
      onRestore: o.onRestore,
      onEvict: o.onEvict,
      scheduleFrame: this.host.scheduleFrame
    });
    return this.views.set(e.id, a), a;
  }
};
function Je(e, t) {
  return t ? `
      <button class="${e.copyBtn}" data-copy-trigger="custom-data" title="Copy to clipboard">
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
function Ve(e, t) {
  return `
    <tr>
      <td><span class="${t.badgeCustom}">${n(e.category || "custom")}</span></td>
      <td class="${t.timestamp}">${n(y(e.timestamp))}</td>
      <td class="${t.message}">${n(e.message || "")}</td>
    </tr>
  `;
}
function Qe(e, t, o) {
  const { useIconCopyButton: r = !1, showCount: a = !0 } = o, s = R(e), i = z(s, "json"), d = Je(t, r), c = a ? `<span class="${t.muted}">${b(xe(e))} keys</span>` : "";
  return `
    <div class="${t.jsonPanel}" data-copy-content="${n(s)}">
      <div class="${t.jsonHeader}">
        <span class="${t.jsonViewerTitle}">Custom Data</span>
        <div class="${t.jsonActions}">
          ${c}
          ${d}
        </div>
      </div>
      <div class="${t.jsonContent}">
        <pre>${i}</pre>
      </div>
    </div>
  `;
}
function Ue(e, t, o) {
  const { maxLogEntries: r = 50 } = o;
  if (!e.length) return `<div class="${t.emptyState}">No custom logs yet.</div>`;
  const a = e.slice(-r).reverse().map((s) => Ve(s, t)).join("");
  return `
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Category</th>
          <th>Time</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>${a}</tbody>
    </table>
  `;
}
function D(e, t, o = {}) {
  const { dataFilterFn: r } = o, a = e.data || {}, s = r ? r(a) : a, i = e.logs || [], d = Object.keys(s).length > 0, c = i.length > 0;
  if (!d && !c) return `<div class="${t.emptyState}">No custom data captured</div>`;
  let l = "";
  return d && (l += Qe(s, t, o)), c && (l += `
      <div class="${t.jsonPanel}">
        <div class="${t.jsonHeader}">
          <span class="${t.jsonViewerTitle}">Custom Logs</span>
          <span class="${t.muted}">${b(i.length)} entries</span>
        </div>
        <div class="${t.jsonContent}">
          ${Ue(i, t, o)}
        </div>
      </div>
    `), d && c ? `<div class="${t.jsonGrid}">${l}</div>` : l;
}
function Ge(e) {
  return e.id ? e.id : `jserr-${C(`${e.timestamp || ""}|${e.type || ""}|${e.message || ""}|${e.source || ""}|${e.line ?? ""}`)}`;
}
function We(e) {
  switch ((e || "").toLowerCase()) {
    case "uncaught":
      return "error";
    case "unhandled_rejection":
      return "error";
    case "console_error":
      return "warn";
    case "network_error":
      return "warn";
    case "network_abort":
      return "warn";
    default:
      return "error";
  }
}
function Ye(e) {
  switch ((e || "").toLowerCase()) {
    case "uncaught":
      return "Uncaught";
    case "unhandled_rejection":
      return "Rejection";
    case "console_error":
      return "Console";
    case "network_error":
      return "Network";
    case "network_abort":
      return "Abort";
    default:
      return e || "Error";
  }
}
function Xe(e) {
  return !!e.extra && Object.keys(e.extra).length > 0;
}
function Ze(e) {
  if (e == null) return "";
  if (typeof e == "string") return e;
  if (typeof e == "number" || typeof e == "boolean") return String(e);
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}
function et(e) {
  const t = [], o = /* @__PURE__ */ new Set(), r = (s, i) => {
    i == null || i === "" || (t.push([s, i]), o.add(s));
  }, a = e.extra ?? {};
  for (const s of [
    "method",
    "request_url",
    "status",
    "status_text",
    "abort_reason",
    "aborted",
    "intentional"
  ]) r(s, a[s]);
  return Object.keys(a).sort().forEach((s) => {
    o.has(s) || r(s, a[s]);
  }), r("page_url", e.url), r("user_agent", e.user_agent), t;
}
function tt(e, t) {
  const o = [];
  e.stack && o.push(`<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font-size:0.8em;opacity:0.85">${n(e.stack)}</pre>`);
  const r = et(e);
  if (r.length > 0) {
    const a = r.map(([s, i]) => {
      const d = Ze(i);
      return `
          <div style="font-weight:600;opacity:0.75">${n(s)}</div>
          <div style="word-break:break-all">${n(d)}</div>
        `;
    }).join("");
    o.push(`
      <div style="display:grid;grid-template-columns:max-content minmax(0,1fr);gap:0.35rem 0.75rem;font-size:0.8em">
        ${a}
      </div>
    `);
  }
  return `<div class="${t.expandedContent}">${o.join("")}</div>`;
}
function ot(e, t, o) {
  const r = Ye(e.type), a = We(e.type), s = t.badgeLevel(a), i = e.message || "", d = e.source || "", c = !!e.stack || Xe(e), l = (e.type === "network_error" || e.type === "network_abort") && e.extra?.request_url ? String(e.extra.request_url) : d && e.line ? `${d}:${e.line}${e.column ? ":" + e.column : ""}` : d || "", p = c ? `<span class="${t.expandIcon}">&#9654;</span>` : "", u = c ? t.expandableRow : "", g = o.compact ? n(i.length > 100 ? i.slice(0, 100) + "..." : i) : n(i), f = !o.compact && l ? `<td class="${t.timestamp}" title="${n(l)}">${n(l.length > 60 ? "..." + l.slice(-57) : l)}</td>` : "", v = !o.compact && e.url ? `<td class="${t.timestamp}" title="${n(e.url)}">${n(e.url.length > 40 ? "..." + e.url.slice(-37) : e.url)}</td>` : "";
  let k = "";
  return c && (k = `
      <tr class="${t.expansionRow}">
        <td colspan="${o.compact ? 3 : 5}">
          ${tt(e, t)}
        </td>
      </tr>
    `), `
    <tr class="${t.rowError} ${u}" data-row-key="${m(Ge(e))}">
      <td>${p}<span class="${s}">${n(r)}</span></td>
      <td class="${t.timestamp}">${n(y(e.timestamp))}</td>
      <td class="${t.message}" title="${n(i)}">${g}</td>
      ${f}
      ${v}
    </tr>
    ${k}
  `;
}
function F(e, t, o = {}) {
  const { newestFirst: r = !0, maxEntries: a = 100, compact: s = !1, showSortToggle: i = !1 } = o, d = i ? O("jserrors", r, t) : "";
  if (!e.length) return d + `<div class="${t.emptyState}">No JS errors captured</div>`;
  let c = a ? e.slice(-a) : e;
  r && (c = [...c].reverse());
  const l = c.map((g) => ot(g, t, {
    ...o,
    compact: s
  })).join(""), p = s ? "" : "<th>Location</th>", u = s ? "" : "<th>Page</th>";
  return `
    ${d}
    <table class="${t.table}">
      <thead>
        <tr>
          <th>Type</th>
          <th>Time</th>
          <th>Message</th>
          ${p}
          ${u}
        </tr>
      </thead>
      <tbody data-live-list>${l}</tbody>
    </table>
  `;
}
function J(e) {
  switch (e) {
    case "healthy":
      return {
        label: "Healthy",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        icon: "success"
      };
    case "missing_grants":
      return {
        label: "Missing Grants",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "error"
      };
    case "claims_stale":
      return {
        label: "Resolver Drift",
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.1)",
        icon: "warning"
      };
    case "scope_mismatch":
      return {
        label: "Scope/Policy Mismatch",
        color: "#eab308",
        bgColor: "rgba(234, 179, 8, 0.1)",
        icon: "warning"
      };
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        icon: "error"
      };
    default:
      return {
        label: "Unknown",
        color: "#6b7280",
        bgColor: "rgba(107, 114, 128, 0.1)",
        icon: "unknown"
      };
  }
}
function rt(e) {
  switch (e) {
    case "ok":
      return {
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.15)"
      };
    case "error":
      return {
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.15)"
      };
    case "warning":
      return {
        color: "#f97316",
        bgColor: "rgba(249, 115, 22, 0.15)"
      };
    default:
      return {
        color: "#6b7280",
        bgColor: "rgba(107, 114, 128, 0.15)"
      };
  }
}
function at(e) {
  const t = J(e.verdict), o = e.user_info || {};
  let r = "";
  return (o.username || o.user_id) && (r = `
      <div style="display: flex; gap: 12px; font-size: 12px; color: #94a3b8; margin-top: 8px;">
        ${o.username ? `<span>User: <strong style="color: #e2e8f0;">${n(o.username)}</strong></span>` : ""}
        ${o.role ? `<span>Role: <strong style="color: #e2e8f0;">${n(o.role)}</strong></span>` : ""}
        ${o.tenant_id ? `<span>Tenant: <strong style="color: #e2e8f0;">${n(o.tenant_id)}</strong></span>` : ""}
        ${o.org_id ? `<span>Org: <strong style="color: #e2e8f0;">${n(o.org_id)}</strong></span>` : ""}
      </div>
    `), `
    <div style="
      background: ${t.bgColor};
      border: 1px solid ${t.color}40;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="
          font-size: 24px;
          color: ${t.color};
        ">${h(t.icon, { size: "24px" })}</span>
        <div>
          <div style="
            font-size: 18px;
            font-weight: 600;
            color: ${t.color};
          ">${t.label}</div>
        </div>
      </div>
      ${r}
    </div>
  `;
}
function st(e) {
  const t = e.summary || {
    module_count: 0,
    required_keys: 0,
    claims_keys: 0,
    missing_keys: 0
  };
  return `
    <div style="
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    ">
      ${[
    {
      label: "Modules",
      value: t.module_count,
      color: "#3b82f6"
    },
    {
      label: "Required",
      value: t.required_keys,
      color: "#8b5cf6"
    },
    {
      label: "Resolved",
      value: t.claims_keys,
      color: "#22c55e"
    },
    {
      label: "Missing",
      value: t.missing_keys,
      color: t.missing_keys > 0 ? "#ef4444" : "#6b7280"
    }
  ].map((o) => `
        <div style="
          background: ${o.color}20;
          border: 1px solid ${o.color}40;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 80px;
        ">
          <span style="font-size: 20px; font-weight: 700; color: ${o.color};">${o.value}</span>
          <span style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">${o.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function nt(e, t) {
  const o = rt(e.status), r = (a) => a ? `<span style="color: #22c55e;">${h("success", { size: "14px" })}</span>` : `<span style="color: #ef4444;">${h("error", { size: "14px" })}</span>`;
  return `
    <tr style="border-bottom: 1px solid #334155;">
      <td style="padding: 10px 12px; font-family: monospace; font-size: 12px; color: #e2e8f0;">
        ${n(e.permission)}
        ${e.module ? `<span style="color: #64748b; font-size: 10px; margin-left: 8px;">(${n(e.module)})</span>` : ""}
      </td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.required)}</td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.in_claims)}</td>
      <td style="padding: 10px 12px; text-align: center;">${r(e.allows)}</td>
      <td style="padding: 10px 12px;">
        <span style="
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          background: ${o.bgColor};
          color: ${o.color};
        ">${n(e.diagnosis)}</span>
      </td>
    </tr>
  `;
}
function it(e) {
  const t = e.entries || [];
  return t.length === 0 ? `
      <div style="
        text-align: center;
        padding: 24px;
        color: #64748b;
        font-style: italic;
      ">No permissions to display</div>
    ` : `
    <div style="margin-bottom: 16px;">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        padding-bottom: 8px;
        border-bottom: 1px solid #334155;
      ">Permission Details</h3>
      <div style="overflow-x: auto;">
        <table style="
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        ">
          <thead>
            <tr style="background: #1e293b; border-bottom: 2px solid #334155;">
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Permission</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Required</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Listed</th>
              <th style="padding: 10px 12px; text-align: center; color: #94a3b8; font-weight: 600; width: 80px;">Allows</th>
              <th style="padding: 10px 12px; text-align: left; color: #94a3b8; font-weight: 600;">Diagnosis</th>
            </tr>
          </thead>
          <tbody>
            ${t.map((o, r) => nt(o, r)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function lt(e) {
  const t = e.next_actions || [];
  return t.length === 0 ? "" : `
    <div style="
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    ">
      <h3 style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin: 0 0 12px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: ${J(e.verdict).color};">Next Actions</span>
      </h3>
      <ul style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${t.map((o) => o.startsWith("  -") ? `<li style="margin-left: 20px; color: #94a3b8;">${n(o.trim().slice(2))}</li>` : `<li>${n(o)}</li>`).join("")}
      </ul>
    </div>
  `;
}
function dt(e) {
  const t = R(e);
  return `
    <details style="margin-top: 16px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #94a3b8;
        font-size: 13px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 11px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${n(t)}</pre>
      </div>
    </details>
  `;
}
function X(e, t, o = {}) {
  const { showRawJSON: r = !0, showCollapsible: a = !0 } = o;
  return e ? `
    <div style="padding: 8px;">
      ${at(e)}
      ${st(e)}
      ${it(e)}
      ${lt(e)}
      ${r ? dt(e) : ""}
    </div>
  ` : `<div class="${t.emptyState}">No permissions data available</div>`;
}
function ct(e, t) {
  if (!e) return `<div class="${t.emptyState}">No permissions data</div>`;
  const o = J(e.verdict), r = e.summary || {
    module_count: 0,
    required_keys: 0,
    claims_keys: 0,
    missing_keys: 0
  };
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 18px;
          color: ${o.color};
        ">${h(o.icon, { size: "18px" })}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${o.color};
        ">${o.label}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Required: <strong style="color: #e2e8f0;">${r.required_keys}</strong></span>
        <span>Claims: <strong style="color: #e2e8f0;">${r.claims_keys}</strong></span>
        <span>Missing: <strong style="color: ${r.missing_keys > 0 ? "#ef4444" : "#e2e8f0"};">${r.missing_keys}</strong></span>
      </div>
    </div>
  `;
}
function A(e) {
  switch ((e || "").toLowerCase()) {
    case "error":
      return {
        label: "Error",
        color: "#ef4444",
        bgColor: "rgba(239, 68, 68, 0.1)",
        borderColor: "rgba(239, 68, 68, 0.4)",
        icon: "error"
      };
    case "warn":
      return {
        label: "Warning",
        color: "#f59e0b",
        bgColor: "rgba(245, 158, 11, 0.1)",
        borderColor: "rgba(245, 158, 11, 0.4)",
        icon: "warning"
      };
    case "info":
      return {
        label: "Info",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.1)",
        borderColor: "rgba(59, 130, 246, 0.4)",
        icon: "info"
      };
    default:
      return {
        label: "OK",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.1)",
        borderColor: "rgba(34, 197, 94, 0.4)",
        icon: "success"
      };
  }
}
function le(e) {
  switch ((e || "").toLowerCase()) {
    case "error":
      return "Unhealthy";
    case "warn":
      return "Needs Attention";
    case "info":
      return "Info Available";
    default:
      return "Healthy";
  }
}
function pt(e) {
  const t = A(e.verdict), o = le(e.verdict);
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: ${t.bgColor};
      border: 1px solid ${t.borderColor};
      border-radius: 8px;
    ">
      <span style="
        font-size: 24px;
        color: ${t.color};
        line-height: 1;
      ">${h(t.icon, { size: "24px" })}</span>
      <div>
        <div style="
          font-size: 16px;
          font-weight: 600;
          color: ${t.color};
        ">${n(o)}</div>
        <div style="
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">System Status</div>
      </div>
    </div>
  `;
}
function ut(e) {
  const t = e || {
    checks: 0,
    ok: 0,
    info: 0,
    warn: 0,
    error: 0
  };
  return `
    <div style="
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    ">
      ${[
    {
      label: "Total",
      value: t.checks || 0,
      color: "#64748b"
    },
    {
      label: "OK",
      value: t.ok || 0,
      color: "#22c55e"
    },
    {
      label: "Info",
      value: t.info || 0,
      color: "#3b82f6"
    },
    {
      label: "Warn",
      value: t.warn || 0,
      color: t.warn ? "#f59e0b" : "#64748b"
    },
    {
      label: "Error",
      value: t.error || 0,
      color: t.error ? "#ef4444" : "#64748b"
    }
  ].map((o) => `
        <div style="
          background: ${o.color}15;
          border: 1px solid ${o.color}30;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 60px;
        ">
          <span style="
            font-size: 18px;
            font-weight: 700;
            color: ${o.color};
            line-height: 1.2;
          ">${o.value}</span>
          <span style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          ">${o.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}
function gt(e) {
  const t = e.generated_at ? new Date(e.generated_at).toLocaleString() : "";
  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    ">
      ${pt(e)}
      <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        ${ut(e.summary)}
        ${t ? `<span style="font-size: 11px; color: #64748b;">Generated: ${n(t)}</span>` : ""}
      </div>
    </div>
  `;
}
function bt(e) {
  const t = A(e.severity), o = String(e.message || "").trim(), r = String(e.hint || "").trim(), a = String(e.code || "").trim(), s = String(e.component || "").trim();
  if (!o) return "";
  const i = [a, s].filter(Boolean).join(" • ");
  return `
    <div style="
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      background: ${t.bgColor};
      border-left: 3px solid ${t.color};
      border-radius: 0 6px 6px 0;
      margin-bottom: 8px;
    ">
      <span style="
        font-size: 14px;
        color: ${t.color};
        line-height: 1.4;
      ">${h(t.icon, { size: "14px" })}</span>
      <div style="flex: 1; min-width: 0;">
        <div style="
          font-size: 13px;
          color: #e2e8f0;
          line-height: 1.4;
          word-break: break-word;
        ">${n(o)}</div>
        ${r ? `
          <div style="
            margin-top: 6px;
            font-size: 12px;
            color: #94a3b8;
            display: flex;
            align-items: flex-start;
            gap: 6px;
          ">
            <span style="color: #64748b;">${h("hint", { size: "13px" })}</span>
            <span>${n(r)}</span>
          </div>
        ` : ""}
        ${i ? `
          <div style="
            margin-top: 4px;
            font-size: 11px;
            color: #64748b;
            font-family: monospace;
          ">${n(i)}</div>
        ` : ""}
      </div>
    </div>
  `;
}
function ft(e) {
  return !e || e.length === 0 ? "" : `
    <div style="margin-top: 12px;">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">Findings</div>
      ${e.map((t) => bt(t)).join("")}
    </div>
  `;
}
function xt(e) {
  if (!e || e.kind !== "navigate" || !e.metadata || typeof e.metadata != "object") return null;
  const t = String(e.metadata.panel_id || "").trim();
  if (!t || !/^[A-Za-z0-9._:-]{1,128}$/.test(t)) return null;
  const o = e.metadata.state;
  return {
    panelID: t,
    state: o && typeof o == "object" && !Array.isArray(o) ? o : {}
  };
}
function mt(e, t) {
  if (!t) return "";
  const o = String(t.description || "").trim(), r = String(t.cta || t.label || "").trim(), a = !!t.runnable, s = !!t.applicable, i = !!t.requires_confirmation, d = String(t.confirm_text || "").trim(), c = t.kind || "manual", l = c === "navigate" ? xt(t) : null;
  let p = "enabled", u = "";
  s ? a || (p = "manual", u = c === "manual" ? "Manual action required" : "Action not available") : (p = "not-applicable", u = "Not applicable for current status");
  const g = p !== "enabled" || c === "navigate" && !l, f = l ? `data-doctor-action-navigate="${n(l.panelID)}" data-doctor-action-state="${n(encodeURIComponent(JSON.stringify(l.state)))}"` : c === "navigate" ? "" : `data-doctor-action-run="${n(e)}"`, v = g ? "background: #374151; color: #6b7280; cursor: not-allowed;" : "background: #3b82f6; color: #fff; cursor: pointer;";
  return `
    <div style="
      margin-top: 12px;
      padding: 12px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 12px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 8px;
      ">How to Fix</div>
      ${o ? `
        <div style="
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.5;
          margin-bottom: 12px;
        ">${n(o)}</div>
      ` : ""}
      <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
        ${r ? `
          <button
            type="button"
            class="debug-btn"
            ${f}
            ${d ? `data-doctor-action-confirm="${n(d)}"` : ""}
            ${i ? 'data-doctor-action-requires-confirmation="true"' : ""}
            ${g ? "disabled" : ""}
            style="
              padding: 8px 16px;
              border: none;
              border-radius: 6px;
              font-size: 13px;
              font-weight: 500;
              ${v}
            "
          >${n(r)}</button>
        ` : ""}
        ${u ? `
          <span style="
            font-size: 12px;
            color: #64748b;
            font-style: italic;
          ">${n(u)}</span>
        ` : ""}
      </div>
    </div>
  `;
}
function ht(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#ef4444"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? `<span style="color: #fbbf24;">"${n(e)}"</span>` : typeof e == "object" ? `<span style="color: #94a3b8;">${n(JSON.stringify(e))}</span>` : n(String(e));
}
function yt(e) {
  if (!e || Object.keys(e).length === 0) return "";
  const t = Object.entries(e).map(([o, r]) => `
      <tr>
        <td style="
          padding: 4px 8px 4px 0;
          color: #94a3b8;
          font-size: 12px;
          vertical-align: top;
          white-space: nowrap;
        ">${n(o)}:</td>
        <td style="
          padding: 4px 0;
          font-family: monospace;
          font-size: 11px;
          word-break: break-all;
        ">${ht(r)}</td>
      </tr>
    `).join("");
  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
        color: #64748b;
        font-size: 12px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Metadata (${Object.keys(e).length} keys)</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 12px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 6px;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>${t}</tbody>
        </table>
      </div>
    </details>
  `;
}
function vt(e) {
  const t = A(e.status), o = String(e.label || e.id || "").trim(), r = String(e.summary || "").trim(), a = String(e.help || e.description || "").trim(), s = e.duration_ms !== void 0 ? `${e.duration_ms}ms` : "";
  return `
    <div style="
      border: 1px solid ${t.borderColor};
      border-left: 4px solid ${t.color};
      border-radius: 0 8px 8px 0;
      margin-bottom: 12px;
      background: #0f172a;
      overflow: hidden;
    ">
      <!-- Card Header -->
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: ${t.bgColor};
        border-bottom: 1px solid ${t.borderColor};
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${t.color};
            color: #fff;
            border-radius: 50%;
            font-size: 12px;
            font-weight: 600;
          ">${h(t.icon, { size: "12px" })}</span>
          <div>
            <div style="
              font-size: 14px;
              font-weight: 600;
              color: #e2e8f0;
            ">${n(o)}</div>
            <div style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(e.id || "")}</div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${s ? `
            <span style="
              font-size: 11px;
              color: #64748b;
              font-family: monospace;
            ">${n(s)}</span>
          ` : ""}
          <span style="
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            color: ${t.color};
            background: ${t.bgColor};
            border: 1px solid ${t.borderColor};
          ">${n(t.label)}</span>
        </div>
      </div>

      <!-- Card Body -->
      <div style="padding: 16px;">
        <!-- Summary -->
        ${r ? `
          <div style="
            font-size: 13px;
            color: #cbd5e1;
            line-height: 1.5;
          ">${n(r)}</div>
        ` : ""}

        <!-- Help Section -->
        ${a ? `
          <details style="margin-top: 12px;">
            <summary style="
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              user-select: none;
            ">What This Means</summary>
            <div style="
              margin-top: 8px;
              padding: 12px;
              background: #1e293b;
              border-radius: 6px;
              font-size: 13px;
              color: #94a3b8;
              line-height: 1.5;
            ">${n(a)}</div>
          </details>
        ` : ""}

        <!-- Findings -->
        ${ft(e.findings)}

        <!-- Action -->
        ${mt(e.id, e.action)}

        <!-- Metadata -->
        ${yt(e.metadata)}
      </div>
    </div>
  `;
}
function $t(e) {
  return !e || e.length === 0 ? "" : `
    <div style="
      margin-top: 20px;
      padding: 16px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    ">
      <div style="
        font-size: 14px;
        font-weight: 600;
        color: #e2e8f0;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <span style="color: #f59e0b;">${h("nextAction", { size: "14px" })}</span>
        Recommended Next Actions
      </div>
      <ol style="
        margin: 0;
        padding: 0 0 0 20px;
        color: #cbd5e1;
        font-size: 13px;
        line-height: 1.6;
      ">
        ${e.map((t) => `<li style="margin-bottom: 4px;">${n(t)}</li>`).join("")}
      </ol>
    </div>
  `;
}
function wt(e) {
  const t = R(e);
  return `
    <details style="margin-top: 20px;">
      <summary style="
        cursor: pointer;
        padding: 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 6px;
        color: #64748b;
        font-size: 13px;
        user-select: none;
      ">
        <span style="margin-left: 8px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 8px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 6px;
        padding: 12px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 11px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${n(t)}</pre>
      </div>
    </details>
  `;
}
function Z(e, t, o = {}) {
  const { showRawJSON: r = !0, problemsOnly: a = !1 } = o;
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics available</div>`;
  let s = e.checks || [];
  a && (s = s.filter((l) => l.status === "warn" || l.status === "error"));
  const i = {
    error: 0,
    warn: 1,
    info: 2,
    ok: 3
  };
  s = [...s].sort((l, p) => {
    const u = i[l.status || "ok"] ?? 4, g = i[p.status || "ok"] ?? 4;
    return u !== g ? u - g : (l.label || l.id || "").localeCompare(p.label || p.id || "");
  });
  const d = s.some((l) => l.status === "warn" || l.status === "error");
  let c = "";
  return s.length === 0 ? a && !d ? c = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #22c55e;
        ">
          <div style="font-size: 48px; margin-bottom: 12px;">${h("success", { size: "48px" })}</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">All Systems Healthy</div>
          <div style="font-size: 14px; color: #94a3b8;">${e.summary?.checks || 0} checks passed</div>
        </div>
      ` : c = `<div class="${t.emptyState}">No doctor checks available</div>` : c = s.map((l) => vt(l)).join(""), `
    <div style="padding: 12px;">
      ${gt(e)}
      ${c}
      ${$t(e.next_actions)}
      ${r ? wt(e) : ""}
    </div>
  `;
}
function Eo(e, t) {
  if (!e) return `<div class="${t.emptyState}">No doctor diagnostics</div>`;
  const o = A(e.verdict), r = le(e.verdict), a = e.summary || {
    checks: 0,
    ok: 0,
    info: 0,
    warn: 0,
    error: 0
  }, s = (a.warn || 0) + (a.error || 0);
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      ">
        <span style="
          font-size: 20px;
          color: ${o.color};
        ">${h(o.icon, { size: "20px" })}</span>
        <span style="
          font-size: 14px;
          font-weight: 600;
          color: ${o.color};
        ">${n(r)}</span>
      </div>
      <div style="
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #94a3b8;
      ">
        <span>Checks: <strong style="color: #e2e8f0;">${a.checks || 0}</strong></span>
        <span>OK: <strong style="color: #22c55e;">${a.ok || 0}</strong></span>
        ${s > 0 ? `
          <span>Problems: <strong style="color: #ef4444;">${s}</strong></span>
        ` : ""}
      </div>
    </div>
  `;
}
function w(e, t = {}) {
  const o = t.size || 12, r = `data-site-cache-icon="${e}" aria-hidden="true" focusable="false" width="${o}" height="${o}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;flex:0 0 ${o}px;width:${o}px;height:${o}px;color:${t.color || "currentColor"};vertical-align:-2px;"`;
  switch (e) {
    case "success":
      return `<svg ${r}><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    case "warning":
      return `<svg ${r}><path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>`;
    case "error":
      return `<svg ${r}><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    case "inactive":
      return `<svg ${r}><circle cx="12" cy="12" r="8"></circle></svg>`;
    case "refresh":
      return `<svg ${r}><path d="M21 12a9 9 0 0 1-15.1 6.6"></path><path d="M3 12a9 9 0 0 1 15.1-6.6"></path><path d="M18 3v5h-5"></path><path d="M6 21v-5h5"></path></svg>`;
    case "clear":
      return `<svg ${r}><path d="m7 21-4-4 10-10 4 4-8 8"></path><path d="m14 4 6 6"></path><path d="M9 21h12"></path></svg>`;
    default:
      return `<svg ${r}><circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.6 2.6 0 1 1 4.3 2c-.9.6-1.8 1.3-1.8 2.5"></path><path d="M12 17h.01"></path></svg>`;
  }
}
function de(e) {
  const t = (e || "").toLowerCase();
  return t === "healthy" || t === "active" ? {
    label: "Backend Healthy",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "success"
  } : t === "degraded" || t === "warn" ? {
    label: "Backend Degraded",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "warning"
  } : t === "error" || t === "startup_error" ? {
    label: "Error",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "error"
  } : t === "inactive" || t === "disabled" ? {
    label: "Inactive",
    color: "#64748b",
    bgColor: "rgba(100, 116, 139, 0.1)",
    borderColor: "rgba(100, 116, 139, 0.4)",
    icon: "inactive"
  } : {
    label: e || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "unknown"
  };
}
function ce(e) {
  const t = (e || "").toLowerCase();
  return t === "success" || t === "ok" ? {
    label: "Success",
    color: "#22c55e",
    bgColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.4)",
    icon: "success"
  } : t === "failed" || t === "error" ? {
    label: "Failed",
    color: "#ef4444",
    bgColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    icon: "error"
  } : t === "unsupported" || t === "none" ? {
    label: "Unsupported",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.4)",
    icon: "warning"
  } : {
    label: e || "Unknown",
    color: "#94a3b8",
    bgColor: "rgba(148, 163, 184, 0.1)",
    borderColor: "rgba(148, 163, 184, 0.4)",
    icon: "unknown"
  };
}
function kt(e) {
  let t = e.status;
  e.configured && e.active || (t = "inactive");
  const o = de(t);
  let r = o.label;
  return e.configured ? e.active || (r = "Inactive") : r = "Not Configured", `
    <div style="
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      background: ${o.bgColor};
      border: 1px solid ${o.borderColor};
      border-radius: 5px;
    ">
      ${w(o.icon, {
    size: 13,
    color: o.color
  })}
      <span style="
        font-size: 12px;
        font-weight: 600;
        color: ${o.color};
      ">${n(r)}</span>
    </div>
  `;
}
function Ct(e) {
  const t = e.backend || "none", o = e.scope || "unknown", r = o === "process_local", a = r ? "rgba(245, 158, 11, 0.15)" : "rgba(100, 116, 139, 0.15)", s = r ? "rgba(245, 158, 11, 0.3)" : "rgba(100, 116, 139, 0.3)", i = r ? "#f59e0b" : "#94a3b8";
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
    ">
      <span style="
        padding: 5px 8px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 4px;
        font-family: monospace;
        color: #e2e8f0;
      ">${n(t)}</span>
      <span style="
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        background: ${a};
        border: 1px solid ${s};
        border-radius: 4px;
        color: ${i};
        font-weight: 500;
      ">${r ? w("warning", {
    size: 13,
    color: i
  }) : ""}<span>${n(o)}</span></span>
      ${e.observed_by ? `
        <span style="color: #64748b; font-size: 11px;">
          obs: ${n(e.observed_by)}
        </span>
      ` : ""}
    </div>
  `;
}
function St() {
  return `
    <button
      type="button"
      class="debug-btn"
      data-debug-action="clear-panel"
      style="
        padding: 5px 10px;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        line-height: 1;
      "
    >
      ${w("clear", {
    size: 13,
    color: "#fff"
  })}
      <span>Clear Cache</span>
    </button>
  `;
}
function ee(e) {
  return `
    <div style="
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid #1e293b;
      flex-wrap: wrap;
    ">
      ${kt(e)}
      <span style="color: #334155; font-size: 10px;">│</span>
      ${Ct(e)}
      ${e.active ? `
        <div style="margin-left: auto;">
          ${St()}
        </div>
      ` : ""}
    </div>
  `;
}
function _t(e) {
  const t = e || {}, o = t.lookups || 0, r = t.hits || 0, a = t.misses || 0, s = t.writes || 0, i = t.errors || 0, d = t.clears || 0;
  let c = "N/A";
  return o > 0 && (c = `${((t.hit_ratio !== null && t.hit_ratio !== void 0 ? t.hit_ratio : r / o) * 100).toFixed(1)}%`), `
    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">Backend Operations</div>
    <div style="
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(75px, 1fr));
      gap: 6px;
      margin-bottom: 16px;
    ">
      ${[
    {
      label: "Lookups",
      value: b(o),
      color: "#64748b"
    },
    {
      label: "Hits",
      value: b(r),
      color: "#22c55e"
    },
    {
      label: "Misses",
      value: b(a),
      color: "#f59e0b"
    },
    {
      label: "Writes",
      value: b(s),
      color: "#3b82f6"
    },
    {
      label: "Errors",
      value: b(i),
      color: i > 0 ? "#ef4444" : "#64748b"
    },
    {
      label: "Clears",
      value: b(d),
      color: "#8b5cf6"
    },
    {
      label: "Lookup Hit Rate",
      value: c,
      color: o > 0 ? "#22c55e" : "#64748b"
    }
  ].map((l) => `
        <div style="
          background: ${l.color}15;
          border: 1px solid ${l.color}30;
          border-radius: 5px;
          padding: 8px 10px;
          text-align: center;
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            color: ${l.color};
            line-height: 1.2;
          ">${l.value}</div>
          <div style="
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-top: 2px;
          ">${l.label}</div>
        </div>
      `).join("")}
    </div>
  `;
}
function Tt(e) {
  const t = e || {}, o = t.failed || 0, r = [
    {
      label: "Evaluated",
      value: t.evaluated || 0,
      color: "#64748b"
    },
    {
      label: "Completed",
      value: t.terminal || 0,
      color: "#64748b"
    },
    {
      label: "Eligible",
      value: t.eligible || 0,
      color: "#3b82f6"
    },
    {
      label: "Bypassed",
      value: t.bypassed || 0,
      color: "#f59e0b"
    },
    {
      label: "Served Hits",
      value: t.served_hits || 0,
      color: "#22c55e"
    },
    {
      label: "Served Stale",
      value: t.served_stale || 0,
      color: "#8b5cf6"
    },
    {
      label: "Stored",
      value: t.stored_responses || 0,
      color: "#06b6d4"
    },
    {
      label: "Uncached",
      value: t.rendered_uncached || 0,
      color: "#f97316"
    },
    {
      label: "Failed",
      value: o,
      color: o > 0 ? "#ef4444" : "#64748b"
    }
  ], a = Object.entries(t.bypass_reasons || {}).filter(([, s]) => Number(s) > 0).sort((s, i) => i[1] - s[1] || s[0].localeCompare(i[0]));
  return `
    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">Request Decisions</div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(75px, 1fr)); gap: 6px; margin-bottom: 8px;">
      ${r.map((s) => `
        <div style="background: ${s.color}15; border: 1px solid ${s.color}30; border-radius: 5px; padding: 8px 10px; text-align: center;">
          <div style="font-size: 16px; font-weight: 600; color: ${s.color}; line-height: 1.2;">${b(s.value)}</div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px;">${s.label}</div>
        </div>
      `).join("")}
    </div>
    ${a.length > 0 ? `
      <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px;" aria-label="Bypass reasons">
        ${a.map(([s, i]) => `<span style="padding: 3px 7px; border-radius: 4px; background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.25); color: #fbbf24; font-size: 10px;"><code>${n(s)}</code>: ${b(i)}</span>`).join("")}
      </div>
    ` : '<div style="margin-bottom: 14px;"></div>'}
  `;
}
function qt(e) {
  const t = Object.entries(e?.surfaces || {}).filter(([o, r]) => o !== "unknown" || Object.values(r || {}).some((a) => typeof a == "number" && a > 0)).sort(([o], [r]) => o.localeCompare(r));
  return t.length === 0 ? "" : `
    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 6px;">Request Surfaces</div>
    <div style="overflow-x: auto; margin-bottom: 14px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="color: #94a3b8; text-align: right;">
            <th style="padding: 5px 8px; text-align: left;">Surface</th>
            <th style="padding: 5px 8px;">Evaluated</th>
            <th style="padding: 5px 8px;">Bypassed</th>
            <th style="padding: 5px 8px;">Hits</th>
            <th style="padding: 5px 8px;">Stored</th>
            <th style="padding: 5px 8px;">Failed</th>
          </tr>
        </thead>
        <tbody>
          ${t.map(([o, r]) => `
            <tr style="border-top: 1px solid #1e293b; text-align: right;">
              <td style="padding: 6px 8px; text-align: left;"><code>${n(o)}</code></td>
              <td style="padding: 6px 8px;">${b(r.evaluated || 0)}</td>
              <td style="padding: 6px 8px;">${b(r.bypassed || 0)}</td>
              <td style="padding: 6px 8px;">${b(r.served_hits || 0)}</td>
              <td style="padding: 6px 8px;">${b(r.stored_responses || 0)}</td>
              <td style="padding: 6px 8px;">${b(r.failed || 0)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
function Et(e) {
  const t = (e.engagement || "no_traffic").toLowerCase(), o = {
    no_traffic: {
      label: "No request traffic observed",
      message: "This instance has not evaluated a public HTML delivery request since startup.",
      color: "#94a3b8"
    },
    all_bypassed: {
      label: "All observed requests bypassed",
      message: "Check bypass reasons. Admin and Debug Console session cookies intentionally bypass public HTML caching.",
      color: "#f59e0b"
    },
    warming: {
      label: "Cache warming",
      message: "Eligible traffic is reaching the cache, but this instance has not observed a served hit yet.",
      color: "#3b82f6"
    },
    engaged: {
      label: "Cache engaged",
      message: "This instance has served at least one public HTML response from cache.",
      color: "#22c55e"
    },
    degraded: {
      label: "Request delivery degraded",
      message: "At least one evaluated cache request ended in failure. Review request reasons and backend errors.",
      color: "#ef4444"
    }
  }, r = o[t] || o.no_traffic;
  return `
    <div style="margin-bottom: 14px; padding: 10px 12px; border-radius: 5px; background: ${r.color}12; border: 1px solid ${r.color}35;">
      <div style="font-size: 12px; font-weight: 600; color: ${r.color}; margin-bottom: 3px;">${n(r.label)}</div>
      <div style="font-size: 11px; line-height: 1.45; color: #94a3b8;">${n(r.message)}</div>
      <div style="font-size: 10px; line-height: 1.45; color: #64748b; margin-top: 5px;">Request counters are process-local to the current application instance. Valkey entries may be shared across instances. CMS repository caching is a separate process-local subsystem.</div>
    </div>
  `;
}
function zt(e) {
  if (!e) return "";
  const t = ce(e.outcome), o = e.timestamp ? y(e.timestamp) : "";
  return `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: ${t.bgColor};
      border: 1px solid ${t.borderColor};
      border-left: 3px solid ${t.color};
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      ">
        <div style="
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        ">Last Command</div>
        <span style="
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-weight: 600;
          color: ${t.color};
          background: ${t.bgColor};
          border: 1px solid ${t.borderColor};
        ">${n(t.label)}</span>
      </div>
      <div style="
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #cbd5e1;
      ">
        <span><strong>Command:</strong> ${n(e.command || "unknown")}</span>
        <span><strong>Mode:</strong> ${n(e.mode || "none")}</span>
        ${e.target_count !== void 0 ? `<span><strong>Targets:</strong> ${e.target_count}</span>` : ""}
        ${o ? `<span style="color: #64748b;">${n(o)}</span>` : ""}
      </div>
      ${e.message ? `
        <div style="
          margin-top: 6px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        ">${n(e.message)}</div>
      ` : ""}
    </div>
  `;
}
function Lt(e) {
  return e ? `
    <div style="
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.4);
      border-left: 3px solid #ef4444;
      border-radius: 0 6px 6px 0;
    ">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
      ">Startup Error</div>
      <div style="
        font-size: 12px;
        color: #fca5a5;
        line-height: 1.5;
      ">${n(e.message || "Unknown error")}</div>
      <div style="
        margin-top: 6px;
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
      ">
        ${e.backend ? `<span><strong>Backend:</strong> ${n(e.backend)}</span>` : ""}
        ${e.error_kind ? `<span><strong>Kind:</strong> ${n(e.error_kind)}</span>` : ""}
        ${e.fail_closed !== void 0 ? `<span><strong>Fail Closed:</strong> ${e.fail_closed ? "Yes" : "No"}</span>` : ""}
      </div>
    </div>
  ` : "";
}
function Rt(e) {
  const t = e.timestamp ? y(e.timestamp) : "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; color: #64748b; font-size: 10px; white-space: nowrap;">${n(t)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: rgba(239, 68, 68, 0.15);
          border-radius: 3px;
          font-size: 10px;
          color: #f87171;
        ">${n(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-size: 11px; color: #cbd5e1;">${n(e.message || "")}</td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; font-family: monospace;">
        ${e.key?.route_hint ? n(e.key.route_hint) : e.key?.key_hash ? n(e.key.key_hash.slice(0, 12)) : ""}
      </td>
    </tr>
  `;
}
function jt(e, t = 10) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <div style="margin-bottom: 12px;">
      <div style="
        font-size: 11px;
        font-weight: 600;
        color: #ef4444;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 6px;
        display: flex;
        align-items: center;
        gap: 5px;
      ">
        ${w("warning", {
    size: 13,
    color: "#ef4444"
  })} Recent Errors (${o.length})
      </div>
      <div style="
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
      ">
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
          <thead>
            <tr style="background: #1e293b;">
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Message</th>
              <th style="padding: 6px 8px; text-align: left; color: #94a3b8; font-weight: 500; font-size: 10px;">Key</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((a) => Rt(a)).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function te(e) {
  return e == null ? '<span style="color: #64748b; font-style: italic;">null</span>' : typeof e == "boolean" ? `<span style="color: ${e ? "#22c55e" : "#64748b"}; font-weight: 500;">${e}</span>` : typeof e == "number" ? `<span style="color: #818cf8;">${e}</span>` : typeof e == "string" ? e === "" ? '<span style="color: #64748b; font-style: italic;">empty</span>' : `<span style="color: #fbbf24;">${n(e)}</span>` : n(String(e));
}
function Ot(e) {
  if (!e) return "";
  const t = [
    {
      key: "enabled",
      value: e.enabled
    },
    {
      key: "backend",
      value: e.backend
    },
    {
      key: "fresh_ttl",
      value: e.fresh_ttl
    },
    {
      key: "stale_ttl",
      value: e.stale_ttl
    },
    {
      key: "render_version",
      value: e.render_version
    },
    {
      key: "namespace",
      value: e.namespace
    },
    {
      key: "debug_headers",
      value: e.debug_headers
    },
    {
      key: "debug_keys",
      value: e.debug_keys
    },
    {
      key: "fail_closed",
      value: e.fail_closed
    },
    {
      key: "require_tag_index",
      value: e.require_tag_index
    },
    {
      key: "max_capture_body_size",
      value: e.max_capture_body_size
    }
  ].map(({ key: r, value: a }) => `
    <tr>
      <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(r)}:</td>
      <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${te(a)}</td>
    </tr>
  `).join("");
  let o = "";
  return e.valkey && e.backend === "valkey" && (o = `
      <div style="margin-top: 8px; padding-left: 12px; border-left: 2px solid #334155;">
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">Valkey</div>
        <table style="width: 100%; border-collapse: collapse;">${[
    {
      key: "address",
      value: e.valkey.address
    },
    {
      key: "namespace",
      value: e.valkey.namespace
    },
    {
      key: "db",
      value: e.valkey.db
    },
    {
      key: "url_configured",
      value: e.valkey.url_configured
    },
    {
      key: "tls_enabled",
      value: e.valkey.tls_enabled
    },
    {
      key: "tls_skip_verify",
      value: e.valkey.tls_skip_verify
    },
    {
      key: "username_set",
      value: e.valkey.username_set
    },
    {
      key: "password_set",
      value: e.valkey.password_set
    }
  ].map(({ key: r, value: a }) => `
      <tr>
        <td style="padding: 4px 8px 4px 0; color: #94a3b8; font-size: 12px; white-space: nowrap;">${n(r)}:</td>
        <td style="padding: 4px 0; font-family: monospace; font-size: 11px;">${te(a)}</td>
      </tr>
    `).join("")}</table>
      </div>
    `), `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Configuration</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <table style="width: 100%; border-collapse: collapse;">${t}</table>
        ${o}
      </div>
    </details>
  `;
}
function At(e) {
  return e ? `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Capabilities</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      ">
        ${[
    {
      key: "tag_invalidation",
      label: "Tag Invalidation",
      value: e.tag_invalidation
    },
    {
      key: "prefix_invalidation",
      label: "Prefix Invalidation",
      value: e.prefix_invalidation
    },
    {
      key: "app_wide_tag_clear_preferred",
      label: "App-Wide Clear",
      value: e.app_wide_tag_clear_preferred
    },
    {
      key: "process_local_observed_keys",
      label: "Process Local Keys",
      value: e.process_local_observed_keys
    },
    {
      key: "backend_key_scanning_enabled",
      label: "Key Scanning",
      value: e.backend_key_scanning_enabled
    }
  ].map(({ label: t, value: o }) => {
    const r = !!o, a = r ? "#22c55e" : "#64748b";
    return `
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: ${a}15;
          border: 1px solid ${a}30;
          border-radius: 4px;
          font-size: 11px;
          color: ${a};
        ">
          ${w(r ? "success" : "error", {
      size: 13,
      color: a
    })}
          ${n(t)}
        </span>
      `;
  }).join("")}
      </div>
    </details>
  ` : "";
}
function Pt(e) {
  if (!e) return "";
  const t = e.timestamp ? y(e.timestamp) : "", o = e.key?.route_hint || e.key?.key_hash?.slice(0, 16) || "unknown";
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Latest Cached Response</span>
        <span style="
          margin-left: 6px;
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 9px;
          color: #60a5fa;
        ">${n(o)}</span>
      </summary>
      <div style="
        margin-top: 4px;
        padding: 10px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
      ">
        <div style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 10px;
          font-size: 11px;
        ">
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Status</div>
            <div style="color: #e2e8f0; font-weight: 500;">${e.status || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Content Type</div>
            <div style="color: #e2e8f0; font-family: monospace; font-size: 10px;">${n(e.content_type || "unknown")}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Body Size</div>
            <div style="color: #e2e8f0;">${b(e.body_size || 0)} bytes</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Headers</div>
            <div style="color: #e2e8f0;">${e.header_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">Tags</div>
            <div style="color: #e2e8f0;">${e.tag_count || 0}</div>
          </div>
          <div>
            <div style="color: #64748b; margin-bottom: 2px;">TTL Class</div>
            <div style="color: #e2e8f0;">${n(e.ttl_class || "default")}</div>
          </div>
        </div>
        ${t ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Cached at: ${n(t)}</div>` : ""}
      </div>
    </details>
  `;
}
function Mt(e) {
  const t = e.observed_at ? y(e.observed_at) : "", o = e.raw_key || e.route_hint || e.key_hash?.slice(0, 16) || "unknown";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${n(t)}</td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 10px; color: #e2e8f0; word-break: break-all;">
        ${n(o)}
        ${e.key_redacted ? '<span style="color: #64748b; font-style: italic;"> (redacted)</span>' : ""}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.render_prefix ? '<span style="color: #8b5cf6;">render</span>' : ""}
      </td>
    </tr>
  `;
}
function Nt(e, t = 20) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Observed Keys (${o.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((a) => Mt(a)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function Bt(e) {
  const t = e.timestamp ? y(e.timestamp) : "", o = ce(e.outcome), r = e.key?.route_hint || e.key?.key_hash?.slice(0, 12) || "";
  return `
    <tr style="border-bottom: 1px solid #1e293b;">
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b; white-space: nowrap;">${n(t)}</td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: #3b82f615;
          border-radius: 3px;
          font-size: 10px;
          color: #60a5fa;
        ">${n(e.operation || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px;">
        <span style="
          padding: 2px 5px;
          background: ${o.bgColor};
          border-radius: 3px;
          font-size: 10px;
          color: ${o.color};
        ">${n(e.outcome || "unknown")}</span>
      </td>
      <td style="padding: 5px 8px; font-family: monospace; font-size: 9px; color: #94a3b8; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${n(r)}
      </td>
      <td style="padding: 5px 8px; font-size: 10px; color: #64748b;">
        ${e.message ? n(e.message.slice(0, 50)) : ""}
      </td>
    </tr>
  `;
}
function It(e, t = 20) {
  const o = e || [];
  if (o.length === 0) return "";
  const r = o.slice(-t).reverse();
  return `
    <details style="margin-bottom: 8px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #94a3b8;
        font-size: 11px;
        font-weight: 500;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Recent Operations (${o.length})</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        overflow: hidden;
        max-height: 250px;
        overflow-y: auto;
      ">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #1e293b; position: sticky; top: 0;">
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Time</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Operation</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Outcome</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Key</th>
              <th style="padding: 5px 8px; text-align: left; color: #64748b; font-weight: 500; font-size: 10px;">Message</th>
            </tr>
          </thead>
          <tbody>
            ${r.map((a) => Bt(a)).join("")}
          </tbody>
        </table>
      </div>
    </details>
  `;
}
function Dt(e) {
  const t = R(e);
  return `
    <details style="margin-top: 12px;">
      <summary style="
        cursor: pointer;
        padding: 8px 10px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 5px;
        color: #64748b;
        font-size: 11px;
        user-select: none;
      ">
        <span style="margin-left: 6px;">Raw JSON Data</span>
      </summary>
      <div style="
        margin-top: 4px;
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 5px;
        padding: 10px;
        overflow-x: auto;
      ">
        <pre style="
          margin: 0;
          font-family: monospace;
          font-size: 10px;
          color: #e2e8f0;
          white-space: pre-wrap;
          word-break: break-word;
        ">${n(t)}</pre>
      </div>
    </details>
  `;
}
function oe(e, t, o = {}) {
  const { maxOperations: r = 20, maxKeys: a = 20, maxErrors: s = 10, showRawJSON: i = !1 } = o;
  return e ? e.configured ? `
    <div style="padding: 14px;">
      ${ee(e)}
      ${Lt(e.startup_error)}
      ${Et(e)}
      ${Tt(e.request_counters)}
      ${qt(e.request_counters)}
      ${_t(e.counters)}
      ${zt(e.last_command)}
      ${jt(e.recent_errors, s)}
      ${Pt(e.latest_cached)}
      ${Ot(e.config)}
      ${At(e.capabilities)}
      ${Nt(e.observed_keys, a)}
      ${It(e.recent_operations, r)}
      ${i ? Dt(e) : ""}
    </div>
  ` : `
      <div style="padding: 12px;">
        ${ee(e)}
        <div style="
          text-align: center;
          padding: 32px 16px;
          color: #64748b;
        ">
          <div style="margin-bottom: 10px;">${w("inactive", {
    size: 24,
    color: "#64748b"
  })}</div>
          <div style="font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #94a3b8;">Cache Not Configured</div>
          <div style="font-size: 12px;">Enable site render cache in application configuration.</div>
        </div>
      </div>
    ` : `<div class="${t.emptyState}">No site render cache data available</div>`;
}
function Ft(e, t) {
  if (!e) return `<div class="${t.emptyState}">No cache data</div>`;
  let o = e.status;
  e.configured && e.active || (o = "inactive");
  const r = de(o), a = e.counters || {}, s = a.hits || 0, i = a.misses || 0, d = a.errors || 0;
  let c = "N/A";
  const l = a.lookups || 0;
  l > 0 && (c = `${((a.hit_ratio !== null && a.hit_ratio !== void 0 ? a.hit_ratio : s / l) * 100).toFixed(1)}%`);
  const p = (e.recent_errors || []).length, u = (e.scope || "unknown") === "process_local", g = e.request_counters || {}, f = (e.engagement || "no_traffic").replace(/_/g, " ");
  return `
    <div style="padding: 8px;">
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #1e293b;
      ">
        <span style="
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 6px;
          background: ${r.bgColor};
          border: 1px solid ${r.borderColor};
          border-radius: 4px;
        ">
          ${w(r.icon, {
    size: 13,
    color: r.color
  })}
          <span style="font-size: 11px; font-weight: 600; color: ${r.color};">${n(r.label)}</span>
        </span>
        <span style="
          padding: 3px 6px;
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 4px;
          font-size: 10px;
          font-family: monospace;
          color: #e2e8f0;
        ">${n(e.backend || "none")}</span>
        ${u ? `
          <span style="
            padding: 3px 6px;
            background: rgba(245, 158, 11, 0.15);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 4px;
            font-size: 10px;
            color: #f59e0b;
          ">${w("warning", {
    size: 12,
    color: "#f59e0b"
  })} local</span>
        ` : ""}
      </div>
      <div style="
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #94a3b8;
        flex-wrap: wrap;
      ">
        <span>Engagement: <strong style="color: #e2e8f0; text-transform: capitalize;">${n(f)}</strong></span>
        <span>Evaluated: <strong style="color: #e2e8f0;">${b(g.evaluated || 0)}</strong></span>
        <span>Bypassed: <strong style="color: #f59e0b;">${b(g.bypassed || 0)}</strong></span>
        <span>Lookup Hit Rate: <strong style="color: ${l > 0 ? "#22c55e" : "#64748b"};">${c}</strong></span>
        <span>Hits: <strong style="color: #22c55e;">${b(s)}</strong></span>
        <span>Misses: <strong style="color: #f59e0b;">${b(i)}</strong></span>
        ${d > 0 || p > 0 ? `
          <span>Errors: <strong style="color: #ef4444;">${b(d)}</strong></span>
        ` : ""}
      </div>
      ${e.active ? `
        <div style="margin-top: 8px;">
          <button
            type="button"
            class="debug-btn"
            data-debug-action="clear-panel"
            style="
              padding: 4px 10px;
              background: #dc2626;
              color: #fff;
              border: none;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 4px;
            "
          >${w("clear", {
    size: 12,
    color: "#fff"
  })} Clear</button>
        </div>
      ` : ""}
    </div>
  `;
}
function zo(e, t = {}) {
  const o = Jt(e.dataset.actionPayload);
  return e instanceof HTMLFormElement && e.querySelectorAll("[data-action-field]").forEach((r) => {
    const a = r.closest("[hidden]");
    if (a && e.contains(a) || (r instanceof HTMLInputElement || r instanceof HTMLSelectElement || r instanceof HTMLTextAreaElement) && r.disabled) return;
    const s = (r.dataset.actionFieldPath || r.dataset.actionField || "").trim();
    if (!s) return;
    if (t.excludeSensitive && r.dataset.actionFieldSensitive === "true") {
      Gt(o, s);
      return;
    }
    const i = Vt(r);
    i !== void 0 && Ut(o, s, i);
  }), o;
}
function Lo(e) {
  return e.querySelector('[data-action-field-sensitive="true"]') !== null;
}
function Ht(e, t) {
  e.querySelectorAll("[data-action-field]").forEach((o) => {
    const r = (o.dataset.actionFieldPath || o.dataset.actionField || "").trim();
    if (!r) return;
    const a = Kt(t, r);
    if (a !== void 0) {
      if (o instanceof HTMLInputElement && o.type === "checkbox") o.checked = !!a;
      else if (o instanceof HTMLInputElement || o instanceof HTMLTextAreaElement || o instanceof HTMLSelectElement) {
        const s = (o.dataset.actionFieldKind || "").trim().toLowerCase();
        s === "string_list" && Array.isArray(a) ? o.value = a.map((i) => String(i)).join(`
`) : s === "json" && typeof a == "object" && a !== null ? o.value = JSON.stringify(a, null, 2) : o.value = String(a);
      }
      o.dispatchEvent(new Event("change", { bubbles: !0 }));
    }
  });
}
function Ro(e, t, o) {
  const r = String(o.action_id || "").trim();
  if (!t || !r) return !1;
  const a = Array.from(e.querySelectorAll("[data-panel-action-picker]")).find((d) => d.dataset.panelActionPicker === t);
  if (!a || !Array.from(a.options).some((d) => d.value === r)) return !1;
  a.value = r, a.dispatchEvent(new Event("change", { bubbles: !0 }));
  const s = o.payload && typeof o.payload == "object" && !Array.isArray(o.payload) ? o.payload : {}, i = Array.from(e.querySelectorAll("[data-panel-action-form]")).find((d) => d.dataset.panelId === t && d.dataset.actionId === r);
  return i && Ht(i, s), !0;
}
function Kt(e, t) {
  let o = e;
  for (const r of t.split(".").map((a) => a.trim()).filter(Boolean)) {
    if (!o || typeof o != "object" || Array.isArray(o)) return;
    o = o[r];
  }
  return o;
}
function Jt(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    return t && typeof t == "object" && !Array.isArray(t) ? t : {};
  } catch {
    return {};
  }
}
function Vt(e) {
  const t = (e.dataset.actionFieldKind || "").trim().toLowerCase();
  if (e instanceof HTMLInputElement && e.type === "checkbox") return e.checked;
  const o = Qt(e).trim();
  if (o !== "") {
    if (t === "number") {
      const r = Number(o);
      return Number.isFinite(r) ? r : o;
    }
    if (t === "integer") {
      const r = Number.parseInt(o, 10);
      return Number.isFinite(r) ? r : o;
    }
    if (t === "string_list") return o.split(/[\n,]/g).map((r) => r.trim()).filter(Boolean);
    if (t === "json") try {
      return JSON.parse(o);
    } catch {
      return o;
    }
    return o;
  }
}
function Qt(e) {
  return (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement || e instanceof HTMLSelectElement) && e.value || "";
}
function Ut(e, t, o) {
  const r = t.split(".").map((s) => s.trim()).filter(Boolean);
  if (r.length === 0) return;
  let a = e;
  r.slice(0, -1).forEach((s) => {
    const i = a[s];
    (!i || typeof i != "object" || Array.isArray(i)) && (a[s] = {}), a = a[s];
  }), a[r[r.length - 1]] = o;
}
function Gt(e, t) {
  const o = t.split(".").map((s) => s.trim()).filter(Boolean);
  if (o.length === 0) return;
  const r = [];
  let a = e;
  for (const s of o.slice(0, -1)) {
    const i = a[s];
    if (!i || typeof i != "object" || Array.isArray(i)) return;
    r.push({
      value: a,
      key: s
    }), a = i;
  }
  delete a[o[o.length - 1]];
  for (let s = r.length - 1; s >= 0; s -= 1) {
    const i = r[s], d = i.value[i.key];
    if (d && typeof d == "object" && !Array.isArray(d) && Object.keys(d).length === 0) delete i.value[i.key];
    else break;
  }
}
var Wt = {
  id: "requests",
  label: "Requests",
  icon: "iconoir-network",
  snapshotKey: "requests",
  eventTypes: "request",
  category: "core",
  order: 10,
  render: (e, t, o) => N(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderConsole: (e, t, o) => N(e || [], t, {
    ...o,
    showSortToggle: !1,
    truncatePath: !1
  }),
  renderToolbar: (e, t, o) => N(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    truncatePath: !0,
    maxPathLength: 50
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => j(e || [], t, 500),
  supportsToolbar: !0
}, Yt = {
  id: "sql",
  label: "SQL",
  icon: "iconoir-database",
  snapshotKey: "sql",
  eventTypes: "sql",
  category: "core",
  order: 20,
  render: (e, t, o) => M(e || [], t, {
    ...o,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderConsole: (e, t, o) => M(e || [], t, {
    ...o,
    maxEntries: 200,
    showSortToggle: !1,
    useIconCopyButton: !0
  }),
  renderToolbar: (e, t, o) => M(e || [], t, {
    ...o,
    maxEntries: 50,
    showSortToggle: !0,
    useIconCopyButton: !1
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => j(e || [], t, 500),
  supportsToolbar: !0
}, Xt = {
  id: "logs",
  label: "Logs",
  icon: "iconoir-page",
  snapshotKey: "logs",
  eventTypes: "log",
  category: "core",
  order: 30,
  render: (e, t, o) => B(e || [], t, {
    ...o,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderConsole: (e, t, o) => B(e || [], t, {
    ...o,
    maxEntries: 500,
    showSortToggle: !1,
    showSource: !0,
    truncateMessage: !1
  }),
  renderToolbar: (e, t, o) => B(e || [], t, {
    newestFirst: !0,
    maxEntries: 100,
    showSortToggle: !1,
    showSource: !1,
    truncateMessage: !0,
    maxMessageLength: 100
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => j(e || [], t, 1e3),
  supportsToolbar: !0
}, Zt = {
  id: "routes",
  label: "Routes",
  icon: "iconoir-path-arrow",
  snapshotKey: "routes",
  eventTypes: [],
  category: "system",
  order: 40,
  render: (e, t) => I(e || [], t, { showName: !0 }),
  renderConsole: (e, t) => I(e || [], t, { showName: !0 }),
  renderToolbar: (e, t) => I(e || [], t, { showName: !1 }),
  getCount: (e) => (e || []).length,
  supportsToolbar: !0
}, eo = {
  id: "config",
  label: "Config",
  icon: "iconoir-settings",
  snapshotKey: "config",
  eventTypes: [],
  category: "system",
  order: 50,
  render: (e, t, o) => $("Config", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return $("Config", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => $("Config", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  supportsToolbar: !0
}, to = {
  id: "template",
  label: "Template",
  icon: "iconoir-code",
  snapshotKey: "template",
  eventTypes: "template",
  category: "data",
  order: 10,
  render: (e, t, o) => $("Template Context", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return $("Template Context", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => $("Template Context", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, oo = {
  id: "session",
  label: "Session",
  icon: "iconoir-user",
  snapshotKey: "session",
  eventTypes: "session",
  category: "data",
  order: 20,
  render: (e, t, o) => $("Session", e, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = o?.filterFn;
    return $("Session", e, t, {
      useIconCopyButton: !0,
      showCount: !0,
      filterFn: r
    });
  },
  renderToolbar: (e, t) => $("Session", e, t, {
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => e && typeof e == "object" ? Object.keys(e).length : 0,
  handleEvent: (e, t) => t,
  supportsToolbar: !0
}, ro = {
  id: "custom",
  label: "Custom",
  icon: "iconoir-puzzle",
  snapshotKey: "custom",
  eventTypes: "custom",
  category: "data",
  order: 30,
  render: (e, t, o) => D(e || {}, t, {
    useIconCopyButton: !0,
    showCount: !0
  }),
  renderConsole: (e, t, o) => {
    const r = e || {}, a = o?.dataFilterFn;
    return D(r, t, {
      maxLogEntries: 100,
      useIconCopyButton: !0,
      showCount: !0,
      dataFilterFn: a
    });
  },
  renderToolbar: (e, t) => D(e || {}, t, {
    maxLogEntries: 50,
    useIconCopyButton: !1,
    showCount: !1
  }),
  getCount: (e) => {
    const t = e || {};
    return (t.data ? Object.keys(t.data).length : 0) + (t.logs?.length || 0);
  },
  handleEvent: (e, t) => fe(e, t, 500),
  supportsToolbar: !0
}, ao = {
  id: "jserrors",
  label: "JS Errors",
  icon: "iconoir-warning-triangle",
  snapshotKey: "jserrors",
  eventTypes: "jserror",
  category: "core",
  order: 35,
  render: (e, t, o) => F(e || [], t, {
    ...o,
    compact: !1,
    showSortToggle: !1
  }),
  renderConsole: (e, t, o) => F(e || [], t, {
    ...o,
    maxEntries: 500,
    compact: !1,
    showSortToggle: !1
  }),
  renderToolbar: (e, t, o) => F(e || [], t, {
    ...o,
    maxEntries: 50,
    compact: !0,
    showSortToggle: !0
  }),
  getCount: (e) => (e || []).length,
  handleEvent: (e, t) => j(e || [], t, 500),
  supportsToolbar: !0
}, so = {
  id: "permissions",
  label: "Permissions",
  icon: "iconoir-shield-check",
  snapshotKey: "permissions",
  eventTypes: [],
  category: "system",
  order: 45,
  showFilters: !1,
  render: (e, t, o) => X(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => X(e, t, { showRawJSON: !0 }),
  renderToolbar: (e, t, o) => ct(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : t.summary.missing_keys;
  },
  supportsToolbar: !0
}, no = {
  id: "doctor",
  label: "Doctor",
  icon: "iconoir-heart",
  snapshotKey: "doctor",
  eventTypes: [],
  category: "system",
  order: 46,
  showFilters: !1,
  render: (e, t, o) => Z(e, t, { showRawJSON: !0 }),
  renderConsole: (e, t, o) => Z(e, t, { showRawJSON: !0 }),
  getCount: (e) => {
    const t = e;
    return !t || !t.summary ? 0 : (t.summary.error || 0) + (t.summary.warn || 0);
  },
  supportsToolbar: !1
}, io = {
  id: "site-render-cache",
  label: "Public HTML Cache",
  icon: "iconoir-database",
  snapshotKey: "site-render-cache",
  eventTypes: [],
  category: "site",
  order: 80,
  showFilters: !1,
  render: (e, t) => oe(e, t, { showRawJSON: !1 }),
  renderConsole: (e, t) => oe(e, t, {
    showRawJSON: !0,
    maxOperations: 50,
    maxKeys: 50,
    maxErrors: 20
  }),
  renderToolbar: (e, t) => Ft(e, t),
  getCount: (e) => {
    const t = e;
    return !t || !t.counters ? 0 : t.counters.errors || 0;
  },
  supportsToolbar: !0
};
function lo() {
  x.register(Wt), x.register(Yt), x.register(Xt), x.register(ao), x.register(Zt), x.register(so), x.register(no), x.register(io), x.register(eo), x.register(to), x.register(oo), x.register(ro);
}
lo();
export {
  wo as A,
  xo as B,
  _o as C,
  Te as D,
  ze as E,
  yo as F,
  ve as G,
  K as H,
  $o as I,
  bo as K,
  L,
  mo as M,
  ho as N,
  So as O,
  Co as P,
  vo as R,
  ne as S,
  N as T,
  Ce as U,
  M as V,
  _ as W,
  I as _,
  oe as a,
  Fe as b,
  Z as c,
  ct as d,
  Ge as f,
  qo as g,
  D as h,
  Lo as i,
  ko as j,
  qe as k,
  Eo as l,
  F as m,
  Ht as n,
  Ft as o,
  ot as p,
  zo as r,
  xt as s,
  Ro as t,
  X as u,
  Pe as v,
  Re as w,
  B as x,
  To as y,
  fo as z
};

//# sourceMappingURL=builtin-panels-uRf1D3XB.js.map