import { escapeAttribute as $, escapeHTML as b } from "../shared/html.js";
function O(t, e = {}) {
  const { groupByField: r = "family_id", defaultExpanded: n = !0, expandMode: a = "explicit", expandedGroups: s = /* @__PURE__ */ new Set() } = e, i = /* @__PURE__ */ new Map(), o = [];
  for (const l of t) {
    const c = z(l, r);
    if (c) {
      const u = i.get(c);
      u ? u.push(l) : i.set(c, [l]);
    } else o.push(l);
  }
  const d = [];
  for (const [l, c] of i) {
    const u = v(c), f = _(l, a, s, n);
    d.push({
      groupId: l,
      records: c,
      summary: u,
      expanded: f,
      summaryFromBackend: !1
    });
  }
  return d.sort((l, c) => t.indexOf(l.records[0]) - t.indexOf(c.records[0])), {
    groups: d,
    ungrouped: o,
    totalGroups: d.length,
    totalRecords: t.length
  };
}
function G(t) {
  if (t.length === 0) return !1;
  let e = !1;
  for (const r of t) {
    if (M(r)) {
      e = !0;
      continue;
    }
    if (h(r)) {
      e = !0;
      continue;
    }
    return !1;
  }
  return e;
}
function U(t, e = {}) {
  const { defaultExpanded: r = !0, expandMode: n = "explicit", expandedGroups: a = /* @__PURE__ */ new Set() } = e;
  if (!G(t)) return null;
  const s = [], i = [];
  let o = 0;
  for (const d of t) {
    if (h(d)) {
      i.push({ ...d }), o += 1;
      continue;
    }
    const l = L(d);
    if (!l) return null;
    const c = A(d), u = B(d, c), f = _(l, n, a, r);
    s.push({
      groupId: l,
      displayLabel: j(d, c),
      records: c,
      summary: u,
      expanded: f,
      summaryFromBackend: R(d)
    }), o += c.length;
  }
  return {
    groups: s,
    ungrouped: i,
    totalGroups: s.length,
    totalRecords: o
  };
}
function _(t, e, r, n) {
  return e === "all" ? !r.has(t) : e === "none" ? r.has(t) : r.size === 0 ? n : r.has(t);
}
function M(t) {
  const e = t, r = typeof e.group_by == "string" ? e.group_by.trim().toLowerCase() : "", n = w(t);
  if (!(r === "family_id" || n === "group")) return !1;
  const a = A(t);
  return Array.isArray(a);
}
function h(t) {
  return w(t) === "ungrouped";
}
function w(t) {
  const e = t._group;
  if (!e || typeof e != "object" || Array.isArray(e)) return "";
  const r = e.row_type;
  return typeof r == "string" ? r.trim().toLowerCase() : "";
}
function L(t) {
  const e = t.family_id;
  if (typeof e == "string" && e.trim()) return e.trim();
  const r = t._group;
  if (!r || typeof r != "object" || Array.isArray(r)) return null;
  const n = r.id;
  return typeof n == "string" && n.trim() ? n.trim() : null;
}
function A(t) {
  const e = t, r = Array.isArray(e.records) ? e.records : e.children;
  if (Array.isArray(r)) {
    const a = r.filter((s) => !!s && typeof s == "object" && !Array.isArray(s)).map((s) => ({ ...s }));
    if (a.length > 0) return a;
  }
  const n = e.parent;
  return n && typeof n == "object" && !Array.isArray(n) ? [{ ...n }] : [];
}
function R(t) {
  const e = t.family_summary;
  return !!e && typeof e == "object" && !Array.isArray(e);
}
function B(t, e) {
  const r = t.family_summary;
  if (!r || typeof r != "object" || Array.isArray(r)) return v(e);
  const n = r, a = Array.isArray(n.available_locales) ? n.available_locales.filter(p) : [], s = Array.isArray(n.missing_locales) ? n.missing_locales.filter(p) : [], i = S(n.readiness_state) ? n.readiness_state : null, o = Math.max(e.length, typeof n.child_count == "number" ? Math.max(n.child_count, 0) : 0);
  return {
    totalItems: typeof n.total_items == "number" ? Math.max(n.total_items, 0) : o,
    availableLocales: a,
    missingLocales: s,
    readinessState: i,
    readyForPublish: typeof n.ready_for_publish == "boolean" ? n.ready_for_publish : null
  };
}
function j(t, e) {
  const r = t.family_label;
  if (typeof r == "string" && r.trim()) return r.trim();
  const n = t.family_summary;
  if (n && typeof n == "object" && !Array.isArray(n)) {
    const o = n.group_label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const a = t._group;
  if (a && typeof a == "object" && !Array.isArray(a)) {
    const o = a.label;
    if (typeof o == "string" && o.trim()) return o.trim();
  }
  const s = [], i = t.parent;
  if (i && typeof i == "object" && !Array.isArray(i)) {
    const o = i;
    s.push(o.title, o.name, o.slug, o.path);
  }
  e.length > 0 && s.push(e[0].title, e[0].name, e[0].slug, e[0].path);
  for (const o of s) if (typeof o == "string" && o.trim()) return o.trim();
}
function z(t, e) {
  const r = t[e];
  return typeof r == "string" && r.trim() ? r : null;
}
function v(t) {
  const e = /* @__PURE__ */ new Set(), r = /* @__PURE__ */ new Set();
  let n = !1, a = 0;
  for (const i of t) {
    const o = i.translation_readiness;
    if (o) {
      const l = o.available_locales, c = o.missing_required_locales, u = o.readiness_state;
      Array.isArray(l) && l.filter(p).forEach((f) => e.add(f)), Array.isArray(c) && c.filter(p).forEach((f) => r.add(f)), (u === "missing_fields" || u === "missing_locales_and_fields") && (n = !0), u === "ready" && a++;
    }
    const d = i.available_locales;
    Array.isArray(d) && d.filter(p).forEach((l) => e.add(l));
  }
  let s = null;
  if (t.length > 0) {
    const i = a === t.length, o = r.size > 0;
    i ? s = "ready" : o && n ? s = "missing_locales_and_fields" : o ? s = "missing_locales" : n && (s = "missing_fields");
  }
  return {
    totalItems: t.length,
    availableLocales: Array.from(e),
    missingLocales: Array.from(r),
    readinessState: s,
    readyForPublish: s === "ready"
  };
}
function p(t) {
  return typeof t == "string";
}
function X(t, e) {
  const r = t.groups.map((n) => {
    const a = e.get(n.groupId);
    return a ? {
      ...n,
      summary: {
        ...n.summary,
        ...a
      },
      summaryFromBackend: !0
    } : n;
  });
  return {
    ...t,
    groups: r
  };
}
function D(t) {
  const e = /* @__PURE__ */ new Map(), r = t.group_summaries;
  if (!r || typeof r != "object" || Array.isArray(r)) return e;
  for (const [n, a] of Object.entries(r)) if (a && typeof a == "object") {
    const s = a;
    e.set(n, {
      totalItems: typeof s.total_items == "number" ? s.total_items : void 0,
      availableLocales: Array.isArray(s.available_locales) ? s.available_locales.filter(p) : void 0,
      missingLocales: Array.isArray(s.missing_locales) ? s.missing_locales.filter(p) : void 0,
      readinessState: S(s.readiness_state) ? s.readiness_state : void 0,
      readyForPublish: typeof s.ready_for_publish == "boolean" ? s.ready_for_publish : void 0
    });
  }
  return e;
}
function S(t) {
  return t === "ready" || t === "missing_locales" || t === "missing_fields" || t === "missing_locales_and_fields";
}
var m = "datagrid-expand-state-";
function y(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const r of t) {
    const n = x(r);
    if (n && !e.includes(n)) {
      if (e.length >= g) break;
      e.push(n);
    }
  }
  return e;
}
function k(t) {
  if (!t) return null;
  try {
    const e = JSON.parse(t);
    return Array.isArray(e) ? {
      version: 2,
      mode: "explicit",
      ids: y(e)
    } : !e || typeof e != "object" || Array.isArray(e) ? null : {
      version: 2,
      mode: I(e.mode, "explicit"),
      ids: y(e.ids)
    };
  } catch {
    return null;
  }
}
function q(t) {
  try {
    const e = m + t, r = k(localStorage.getItem(e));
    if (r) return new Set(r.ids);
  } catch {
  }
  return /* @__PURE__ */ new Set();
}
function K(t) {
  try {
    const e = m + t, r = k(localStorage.getItem(e));
    if (r) return r.mode;
  } catch {
  }
  return "explicit";
}
function W(t) {
  try {
    const e = m + t;
    return localStorage.getItem(e) !== null;
  } catch {
    return !1;
  }
}
function J(t, e, r = "explicit") {
  try {
    const n = m + t, a = y(Array.from(e)), s = {
      version: 2,
      mode: I(r, "explicit"),
      ids: a
    };
    localStorage.setItem(n, JSON.stringify(s));
  } catch {
  }
}
function Y(t, e) {
  const r = t.groups.map((n) => n.groupId === e ? {
    ...n,
    expanded: !n.expanded
  } : n);
  return {
    ...t,
    groups: r
  };
}
function Q(t) {
  const e = t.groups.map((r) => ({
    ...r,
    expanded: !0
  }));
  return {
    ...t,
    groups: e
  };
}
function Z(t) {
  const e = t.groups.map((r) => ({
    ...r,
    expanded: !1
  }));
  return {
    ...t,
    groups: e
  };
}
function tt(t) {
  const e = /* @__PURE__ */ new Set();
  for (const r of t.groups) r.expanded && e.add(r.groupId);
  return e;
}
var E = "datagrid-view-mode-", g = 200, P = 256;
function I(t, e = "explicit") {
  return t === "all" || t === "none" || t === "explicit" ? t : e;
}
function et(t) {
  try {
    const e = E + t, r = localStorage.getItem(e);
    if (r && C(r)) return r;
  } catch {
  }
  return null;
}
function rt(t, e) {
  try {
    const r = E + t;
    localStorage.setItem(r, e);
  } catch {
  }
}
function C(t) {
  return t === "flat" || t === "grouped" || t === "matrix" || t === "server_family";
}
function nt(t) {
  return t && C(t) ? t : null;
}
function st(t) {
  if (!(t instanceof Set) || t.size === 0) return "";
  const e = Array.from(new Set(Array.from(t).map((r) => x(r)).filter((r) => r !== null))).slice(0, g).sort();
  return e.length === 0 ? "" : e.map((r) => encodeURIComponent(r)).join(",");
}
function at(t) {
  const e = /* @__PURE__ */ new Set();
  if (!t) return e;
  const r = t.split(",");
  for (const n of r) {
    if (e.size >= g) break;
    if (!n) continue;
    let a = "";
    try {
      a = decodeURIComponent(n);
    } catch {
      continue;
    }
    const s = x(a);
    s && e.add(s);
  }
  return e;
}
function x(t) {
  if (typeof t != "string") return null;
  let e = t.trim();
  if (!e) return null;
  if (e.includes("%")) try {
    const r = decodeURIComponent(e);
    typeof r == "string" && r.trim() && (e = r.trim());
  } catch {
  }
  return e.length > P ? null : e;
}
function T(t, e = {}) {
  const { summary: r } = t, { size: n = "sm" } = e, a = n === "sm" ? "text-xs" : "text-sm", s = r.availableLocales.length, i = s + r.missingLocales.length;
  let o = "";
  if (r.readinessState) {
    const c = V(r.readinessState);
    o = `
      <span class="${a} px-1.5 py-0.5 rounded ${c.bgClass} ${c.textClass}"
            title="${c.description}">
        ${c.icon} ${c.label}
      </span>
    `;
  }
  const d = i > 0 ? `<span class="${a} text-gray-500">${s}/${i} locales</span>` : "", l = `<span class="${a} text-gray-500">${r.totalItems} item${r.totalItems !== 1 ? "s" : ""}</span>`;
  return `
    <div class="inline-flex items-center gap-2">
      ${o}
      ${d}
      ${l}
    </div>
  `;
}
function V(t) {
  switch (t) {
    case "ready":
      return {
        icon: "●",
        label: "Ready",
        bgClass: "bg-green-100",
        textClass: "text-green-700",
        description: "All translations complete"
      };
    case "missing_locales":
      return {
        icon: "○",
        label: "Missing",
        bgClass: "bg-amber-100",
        textClass: "text-amber-700",
        description: "Missing required locale translations"
      };
    case "missing_fields":
      return {
        icon: "◐",
        label: "Incomplete",
        bgClass: "bg-yellow-100",
        textClass: "text-yellow-700",
        description: "Has translations but missing required fields"
      };
    case "missing_locales_and_fields":
      return {
        icon: "⚠",
        label: "Not Ready",
        bgClass: "bg-red-100",
        textClass: "text-red-700",
        description: "Missing translations and required fields"
      };
    default:
      return {
        icon: "?",
        label: "Unknown",
        bgClass: "bg-gray-100",
        textClass: "text-gray-700",
        description: "Status unknown"
      };
  }
}
function N(t) {
  if (typeof t.displayLabel == "string" && t.displayLabel.trim()) return t.displayLabel.trim();
  if (t.groupId.startsWith("ungrouped:")) return "Ungrouped Records";
  if (t.records.length > 0) {
    const e = t.records[0];
    for (const r of [
      "title",
      "name",
      "label",
      "subject"
    ]) {
      const n = e[r];
      if (typeof n == "string" && n.trim()) {
        const a = n.trim();
        return a.length > 60 ? a.slice(0, 57) + "..." : a;
      }
    }
  }
  return `Translation Group (${t.groupId.length > 8 ? t.groupId.slice(0, 8) + "..." : t.groupId})`;
}
function ot(t, e, r = {}) {
  const { showExpandIcon: n = !0, fixedColumnCount: a = 2 } = r, s = n ? `<span class="expand-icon mr-2" aria-hidden="true">${t.expanded ? "▼" : "▶"}</span>` : "", i = T(t), o = b(N(t)), d = t.records.length, l = d > 1 ? `<span class="ml-2 text-xs text-gray-500">(${d} locales)</span>` : "";
  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${$(t.groupId)}"
        data-expanded="${t.expanded}"
        role="row"
        aria-expanded="${t.expanded}"
        tabindex="0">
      <td colspan="${e + a}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${s}
            <span class="font-medium text-gray-700">${o}</span>
            ${l}
          </div>
          ${i}
        </div>
      </td>
    </tr>
  `;
}
function it(t, e = 2) {
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="empty">
      <td colspan="${t + e}" class="admin-datagrid__state admin-datagrid__state--empty px-6 py-12 text-center">
        <div class="text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No translation groups</h3>
          <p class="mt-1 text-sm text-gray-500">No grouped translations found for this content type.</p>
        </div>
      </td>
    </tr>
  `;
}
function lt(t, e = 2) {
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="loading">
      <td colspan="${t + e}" class="admin-datagrid__state admin-datagrid__state--loading px-6 py-12 text-center" role="status" aria-live="polite">
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">Loading groups...</span>
        </div>
      </td>
    </tr>
  `;
}
function ct(t, e, r, n = 2) {
  const a = r ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>` : "";
  return `
    <tr class="admin-datagrid__state-row" data-datagrid-state="error">
      <td colspan="${t + n}" class="admin-datagrid__state admin-datagrid__state--error px-6 py-12 text-center" role="alert" aria-live="assertive">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${b(e)}</p>
          ${a}
        </div>
      </td>
    </tr>
  `;
}
function F(t = 768) {
  return typeof window > "u" ? !1 : window.innerWidth < t;
}
function dt(t, e = 768) {
  return F(e) && t === "grouped" ? "flat" : t;
}
export {
  ct as C,
  O as E,
  it as S,
  Y as T,
  nt as _,
  D as a,
  ot as b,
  q as c,
  G as d,
  W as f,
  I as g,
  U as h,
  Q as i,
  et as l,
  X as m,
  at as n,
  tt as o,
  F as p,
  st as r,
  K as s,
  Z as t,
  dt as u,
  J as v,
  lt as w,
  T as x,
  rt as y
};

//# sourceMappingURL=grouped-mode-C1WBh7ma.js.map