import { formatByteSize as A } from "../shared/size-formatters.js";
const $ = (t) => {
  if (!t)
    return "";
  if (typeof t == "number")
    return new Date(t).toLocaleTimeString();
  if (typeof t == "string") {
    const r = new Date(t);
    return Number.isNaN(r.getTime()) ? t : r.toLocaleTimeString();
  }
  return "";
}, x = (t, r = 50) => {
  if (t == null)
    return { text: "0ms", isSlow: !1 };
  if (typeof t == "string") {
    const o = w(t), i = o !== null && o >= r;
    return { text: t, isSlow: i };
  }
  const n = Number(t);
  if (Number.isNaN(n))
    return { text: "0ms", isSlow: !1 };
  const e = n / 1e6, s = e >= r;
  return e < 1 ? { text: `${(n / 1e3).toFixed(1)}µs`, isSlow: s } : e < 1e3 ? { text: `${e.toFixed(2)}ms`, isSlow: s } : { text: `${(e / 1e3).toFixed(2)}s`, isSlow: s };
}, T = (t, r = 50) => {
  const n = N(t);
  return n === null ? !1 : n >= r;
}, z = (t, r) => {
  const { nullAsEmptyObject: n = !0, indent: e = 2 } = r || {};
  if (t == null)
    return n ? "{}" : "null";
  try {
    return JSON.stringify(t, null, e);
  } catch {
    return String(t ?? "");
  }
}, K = (t, r) => t ? t.length > r ? t.substring(0, r) + "..." : t : "", w = (t) => {
  const r = t.trim();
  if (!r)
    return null;
  const n = r.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!n)
    return null;
  const e = Number(n[1]);
  if (Number.isNaN(e))
    return null;
  switch ((n[2] || "ms").toLowerCase()) {
    case "ns":
      return e / 1e6;
    case "us":
    case "µs":
      return e / 1e3;
    case "ms":
      return e;
    case "s":
      return e * 1e3;
    default:
      return null;
  }
}, N = (t) => {
  if (t == null)
    return null;
  if (typeof t == "string")
    return w(t);
  const r = Number(t);
  return Number.isNaN(r) ? null : r / 1e6;
}, O = (t) => {
  if (t == null || t === "")
    return "0";
  const r = Number(t);
  return Number.isNaN(r) ? String(t) : r.toLocaleString();
}, R = (t) => t == null ? 0 : Array.isArray(t) ? t.length : typeof t == "object" ? Object.keys(t).length : 1, M = (t) => t ? t >= 500 ? "error" : t >= 400 ? "warn" : "" : "", U = (t) => {
  if (!t)
    return "info";
  const r = t.toLowerCase();
  return r === "error" || r === "fatal" ? "error" : r === "warn" || r === "warning" ? "warn" : r === "debug" || r === "trace" ? "debug" : "info";
}, G = (t) => A(t, {
  emptyFallback: "0 B",
  zeroFallback: "0 B",
  invalidFallback: "0 B",
  unitLabels: ["B", "KB", "MB"],
  precisionByUnit: [0, 1, 1]
}) ?? "0 B", J = (t) => Array.isArray(t) ? t : [];
function m(t) {
  return t.snapshotKey ?? t.id;
}
function y(t) {
  return t.eventTypes ? Array.isArray(t.eventTypes) ? t.eventTypes : [t.eventTypes] : [m(t)];
}
function q(t) {
  return Array.isArray(t) ? t.length : t && typeof t == "object" ? Object.keys(t).length : 0;
}
function C(t, r, n = 500) {
  if (Array.isArray(t)) {
    const e = [...t, r];
    return n > 0 ? e.slice(-n) : e;
  }
  return t && typeof t == "object" && r && typeof r == "object" ? { ...t, ...r } : r;
}
function P(t, r) {
  const n = m(r);
  return t[n];
}
function Q(t, r) {
  const n = P(t, r);
  return r.getCount ? r.getCount(n) : q(n);
}
function Y(t, r, n, e, s) {
  return s === "console" && t.renderConsole ? t.renderConsole(r, n, e) : s === "toolbar" && t.renderToolbar ? t.renderToolbar(r, n, e) : s === "toolbar" && t.supportsToolbar === !1 ? `<div class="${n.emptyState}">Panel "${t.label}" not available in toolbar</div>` : t.render(r, n, e);
}
class k {
  constructor() {
    this.panels = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
  }
  /**
   * Register a panel definition.
   * If a panel with the same ID exists, it will be replaced.
   */
  register(r) {
    this.panels.set(r.id, r), this.notifyListeners({
      type: "register",
      panelId: r.id,
      panel: r
    });
  }
  /**
   * Unregister a panel by ID.
   */
  unregister(r) {
    const n = this.panels.get(r);
    this.panels.delete(r) && this.notifyListeners({
      type: "unregister",
      panelId: r,
      panel: n
    });
  }
  /**
   * Get a panel definition by ID.
   */
  get(r) {
    return this.panels.get(r);
  }
  /**
   * Check if a panel is registered.
   */
  has(r) {
    return this.panels.has(r);
  }
  /**
   * Get all registered panel definitions.
   */
  list() {
    return Array.from(this.panels.values());
  }
  /**
   * Get all registered panel IDs.
   */
  ids() {
    return Array.from(this.panels.keys());
  }
  /**
   * Get panel IDs sorted by category and order.
   */
  getSortedIds() {
    return this.list().sort((r, n) => {
      const e = r.category || "custom", s = n.category || "custom";
      return e !== s ? e.localeCompare(s) : (r.order || 100) - (n.order || 100);
    }).map((r) => r.id);
  }
  /**
   * Get panels filtered for toolbar display.
   */
  getToolbarPanels() {
    return this.list().filter((r) => r.supportsToolbar !== !1);
  }
  /**
   * Get all event types that need WebSocket subscriptions.
   */
  getAllEventTypes() {
    const r = /* @__PURE__ */ new Set();
    for (const n of this.panels.values())
      for (const e of y(n))
        r.add(e);
    return Array.from(r);
  }
  /**
   * Find panel by event type.
   */
  findByEventType(r) {
    for (const n of this.panels.values())
      if (y(n).includes(r))
        return n;
  }
  /**
   * Subscribe to registry changes.
   * Returns unsubscribe function.
   */
  subscribe(r) {
    return this.listeners.add(r), () => this.listeners.delete(r);
  }
  /**
   * Subscribe to any registry change (simpler API).
   * Returns unsubscribe function.
   */
  onChange(r) {
    const n = () => r();
    return this.subscribe(n);
  }
  notifyListeners(r) {
    this.listeners.forEach((n) => n(r));
  }
}
const d = "__go_admin_panel_registry__";
function B() {
  const t = globalThis;
  return t[d] || (t[d] = new k()), t[d];
}
const l = B(), E = ["template", "session", "requests", "sql", "logs", "config", "routes", "custom"], b = ["requests", "sql", "logs", "routes", "config"], j = /* @__PURE__ */ new Set(["console", "shell"]), h = {
  console: "Console",
  shell: "Shell"
}, L = (t) => t ? t.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/gi, "SQL").replace(/\b([a-z])/g, (r) => r.toUpperCase()) : "", S = (t, r) => r <= 0 || t.length <= r ? t : t.slice(-r), g = (t, r, n) => S([...t || [], r], n), D = (t, r, n) => {
  if (!t || !r)
    return;
  const e = r.split(".").map((o) => o.trim()).filter(Boolean);
  if (e.length === 0)
    return;
  let s = t;
  for (let o = 0; o < e.length - 1; o += 1) {
    const i = e[o];
    (!s[i] || typeof s[i] != "object") && (s[i] = {}), s = s[i];
  }
  s[e[e.length - 1]] = n;
};
function H() {
  const t = l.getSortedIds();
  return t.length > 0 ? t : E;
}
function V() {
  const t = l.getToolbarPanels();
  if (t.length > 0) {
    const r = t.filter((n) => n.category === "core" || n.category === "system").map((n) => n.id);
    return r.length > 0 ? r : b;
  }
  return b;
}
function W(t) {
  return t === "sessions" || l.has(t) || j.has(t);
}
function X(t) {
  if (h[t])
    return h[t];
  const r = l.get(t);
  return r ? r.label : L(t);
}
function Z(t) {
  if (t === "sessions")
    return [];
  const r = l.get(t);
  return r ? y(r) : [t];
}
function I() {
  const t = {};
  for (const r of l.list())
    for (const n of y(r))
      t[n] = r.id;
  return t;
}
function v(t) {
  if (!Array.isArray(t))
    return [];
  const r = [];
  return t.forEach((n) => {
    if (!n || typeof n != "object")
      return;
    const e = n, s = typeof e.command == "string" ? e.command.trim() : "";
    if (!s)
      return;
    const o = typeof e.description == "string" ? e.description.trim() : "", i = Array.isArray(e.tags) ? e.tags.filter((a) => typeof a == "string" && a.trim() !== "").map((a) => a.trim()) : [], c = Array.isArray(e.aliases) ? e.aliases.filter((a) => typeof a == "string" && a.trim() !== "").map((a) => a.trim()) : [], f = typeof e.mutates == "boolean" ? e.mutates : typeof e.read_only == "boolean" ? !e.read_only : !1;
    r.push({
      command: s,
      description: o || void 0,
      tags: i.length > 0 ? i : void 0,
      aliases: c.length > 0 ? c : void 0,
      mutates: f
    });
  }), r;
}
async function tt(t) {
  try {
    const r = await fetch(`${t}/api/snapshot`, {
      credentials: "same-origin"
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}
function _(t, r, n = 500) {
  const e = {
    data: { ...t?.data || {} },
    logs: [...t?.logs || []]
  };
  if (!r || typeof r != "object")
    return e;
  const s = r;
  if ("key" in s && "value" in s)
    return D(e.data || (e.data = {}), String(s.key), s.value), e;
  if ("data" in s || "logs" in s) {
    const o = s;
    return o.data && typeof o.data == "object" && (e.data = {
      ...e.data || {},
      ...o.data
    }), Array.isArray(o.logs) && o.logs.length > 0 && (e.logs = S([...e.logs || [], ...o.logs], n)), e;
  }
  return ("category" in s || "message" in s) && (e.logs = g(e.logs, s, n)), e;
}
function rt(t, r, n = {}) {
  if (!r || !r.type || r.type === "snapshot")
    return null;
  const e = n.eventToPanel?.[r.type] || l.findByEventType(r.type)?.id || r.type, s = l.get(e);
  if (s) {
    const o = m(s), i = t[o], c = s.handleEvent || ((f, a) => C(f, a, 500));
    return t[o] = c(i, r.payload), e;
  }
  switch (r.type) {
    case "request":
      t.requests = g(t.requests, r.payload, 500);
      break;
    case "sql":
      t.sql = g(t.sql, r.payload, 200);
      break;
    case "log":
      t.logs = g(t.logs, r.payload, 500);
      break;
    case "template":
      t.template = r.payload || {};
      break;
    case "session":
      t.session = r.payload || {};
      break;
    case "custom":
      t.custom = _(t.custom, r.payload, 500);
      break;
    default:
      n.storeUnknownEvents && (t[e] = r.payload);
      break;
  }
  return e;
}
function et(t, r = 50) {
  const n = t.requests?.length || 0, e = t.sql?.length || 0, s = t.logs?.length || 0, o = t.jserrors?.length || 0, i = (t.requests || []).filter((u) => (u.status || 0) >= 400).length, c = (t.sql || []).filter((u) => u.error).length, f = (t.logs || []).filter((u) => {
    const p = (u.level || "").toLowerCase();
    return p === "error" || p === "fatal";
  }).length, a = (t.sql || []).filter(
    (u) => T(u.duration, r)
  ).length;
  return {
    requests: n,
    sql: e,
    logs: s,
    jserrors: o,
    errors: i + c + f + o,
    slowQueries: a
  };
}
export {
  V as A,
  tt as B,
  rt as C,
  _ as D,
  G as E,
  X as a,
  I as b,
  m as c,
  $ as d,
  O as e,
  z as f,
  Z as g,
  Q as h,
  R as i,
  C as j,
  W as k,
  J as l,
  T as m,
  v as n,
  H as o,
  l as p,
  y as q,
  j as r,
  q as s,
  P as t,
  Y as u,
  x as v,
  K as w,
  M as x,
  U as y,
  et as z
};
//# sourceMappingURL=shared-helpers-C0Ec_MtO.js.map
