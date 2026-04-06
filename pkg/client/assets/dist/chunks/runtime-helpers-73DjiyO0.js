import { formatByteSize as T } from "../shared/size-formatters.js";
var F = (r) => {
  if (!r) return "";
  if (typeof r == "number") return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const e = new Date(r);
    return Number.isNaN(e.getTime()) ? r : e.toLocaleTimeString();
  }
  return "";
}, O = (r, e = 50) => {
  if (r == null) return {
    text: "0ms",
    isSlow: !1
  };
  if (typeof r == "string") {
    const o = S(r);
    return {
      text: r,
      isSlow: o !== null && o >= e
    };
  }
  const n = Number(r);
  if (Number.isNaN(n)) return {
    text: "0ms",
    isSlow: !1
  };
  const t = n / 1e6, s = t >= e;
  return t < 1 ? {
    text: `${(n / 1e3).toFixed(1)}µs`,
    isSlow: s
  } : t < 1e3 ? {
    text: `${t.toFixed(2)}ms`,
    isSlow: s
  } : {
    text: `${(t / 1e3).toFixed(2)}s`,
    isSlow: s
  };
}, A = (r, e = 50) => {
  const n = N(r);
  return n === null ? !1 : n >= e;
}, $ = (r, e) => {
  const { nullAsEmptyObject: n = !0, indent: t = 2 } = e || {};
  if (r == null) return n ? "{}" : "null";
  try {
    return JSON.stringify(r, null, t);
  } catch {
    return String(r ?? "");
  }
}, x = (r, e) => r ? r.length > e ? r.substring(0, e) + "..." : r : "", S = (r) => {
  const e = r.trim();
  if (!e) return null;
  const n = e.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!n) return null;
  const t = Number(n[1]);
  if (Number.isNaN(t)) return null;
  switch ((n[2] || "ms").toLowerCase()) {
    case "ns":
      return t / 1e6;
    case "us":
    case "µs":
      return t / 1e3;
    case "ms":
      return t;
    case "s":
      return t * 1e3;
    default:
      return null;
  }
}, N = (r) => {
  if (r == null) return null;
  if (typeof r == "string") return S(r);
  const e = Number(r);
  return Number.isNaN(e) ? null : e / 1e6;
}, K = (r) => {
  if (r == null || r === "") return "0";
  const e = Number(r);
  return Number.isNaN(e) ? String(r) : e.toLocaleString();
}, R = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, z = (r) => r ? r >= 500 ? "error" : r >= 400 ? "warn" : "" : "", M = (r) => {
  if (!r) return "info";
  const e = r.toLowerCase();
  return e === "error" || e === "fatal" ? "error" : e === "warn" || e === "warning" ? "warn" : e === "debug" || e === "trace" ? "debug" : "info";
}, U = (r) => T(r, {
  emptyFallback: "0 B",
  zeroFallback: "0 B",
  invalidFallback: "0 B",
  unitLabels: [
    "B",
    "KB",
    "MB"
  ],
  precisionByUnit: [
    0,
    1,
    1
  ]
}) ?? "0 B", G = (r) => Array.isArray(r) ? r : [];
function m(r) {
  return r.snapshotKey ?? r.id;
}
function y(r) {
  return r.eventTypes ? Array.isArray(r.eventTypes) ? r.eventTypes : [r.eventTypes] : [m(r)];
}
function C(r) {
  return Array.isArray(r) ? r.length : r && typeof r == "object" ? Object.keys(r).length : 0;
}
function q(r, e, n = 500) {
  if (Array.isArray(r)) {
    const t = [...r, e];
    return n > 0 ? t.slice(-n) : t;
  }
  return r && typeof r == "object" && e && typeof e == "object" ? {
    ...r,
    ...e
  } : e;
}
function P(r, e) {
  return r[m(e)];
}
function J(r, e) {
  const n = P(r, e);
  return e.getCount ? e.getCount(n) : C(n);
}
function Q(r, e, n, t, s) {
  return s === "console" && r.renderConsole ? r.renderConsole(e, n, t) : s === "toolbar" && r.renderToolbar ? r.renderToolbar(e, n, t) : s === "toolbar" && r.supportsToolbar === !1 ? `<div class="${n.emptyState}">Panel "${r.label}" not available in toolbar</div>` : r.render(e, n, t);
}
var k = class {
  constructor() {
    this.panels = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
  }
  register(r) {
    this.panels.set(r.id, r), this.notifyListeners({
      type: "register",
      panelId: r.id,
      panel: r
    });
  }
  unregister(r) {
    const e = this.panels.get(r);
    this.panels.delete(r) && this.notifyListeners({
      type: "unregister",
      panelId: r,
      panel: e
    });
  }
  get(r) {
    return this.panels.get(r);
  }
  has(r) {
    return this.panels.has(r);
  }
  list() {
    return Array.from(this.panels.values());
  }
  ids() {
    return Array.from(this.panels.keys());
  }
  getSortedIds() {
    return this.list().sort((r, e) => {
      const n = r.category || "custom", t = e.category || "custom";
      return n !== t ? n.localeCompare(t) : (r.order || 100) - (e.order || 100);
    }).map((r) => r.id);
  }
  getToolbarPanels() {
    return this.list().filter((r) => r.supportsToolbar !== !1);
  }
  getAllEventTypes() {
    const r = /* @__PURE__ */ new Set();
    for (const e of this.panels.values()) for (const n of y(e)) r.add(n);
    return Array.from(r);
  }
  findByEventType(r) {
    for (const e of this.panels.values()) if (y(e).includes(r)) return e;
  }
  subscribe(r) {
    return this.listeners.add(r), () => this.listeners.delete(r);
  }
  onChange(r) {
    const e = () => r();
    return this.subscribe(e);
  }
  notifyListeners(r) {
    this.listeners.forEach((e) => e(r));
  }
}, d = "__go_admin_panel_registry__";
function E() {
  const r = globalThis;
  return r[d] || (r[d] = new k()), r[d];
}
var l = E(), v = [
  "template",
  "session",
  "requests",
  "sql",
  "logs",
  "config",
  "routes",
  "custom"
], b = [
  "requests",
  "sql",
  "logs",
  "routes",
  "config"
], B = /* @__PURE__ */ new Set(["console", "shell"]), h = {
  console: "Console",
  shell: "Shell"
}, j = (r) => r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/gi, "SQL").replace(/\b([a-z])/g, (e) => e.toUpperCase()) : "", w = (r, e) => e <= 0 || r.length <= e ? r : r.slice(-e), g = (r, e, n) => w([...r || [], e], n), L = (r, e, n) => {
  if (!r || !e) return;
  const t = e.split(".").map((o) => o.trim()).filter(Boolean);
  if (t.length === 0) return;
  let s = r;
  for (let o = 0; o < t.length - 1; o += 1) {
    const a = t[o];
    (!s[a] || typeof s[a] != "object") && (s[a] = {}), s = s[a];
  }
  s[t[t.length - 1]] = n;
};
function Y() {
  const r = l.getSortedIds();
  return r.length > 0 ? r : v;
}
function H() {
  const r = l.getToolbarPanels();
  if (r.length > 0) {
    const e = r.filter((n) => n.category === "core" || n.category === "system").map((n) => n.id);
    return e.length > 0 ? e : b;
  }
  return b;
}
function V(r) {
  return r === "sessions" || l.has(r) || B.has(r);
}
function W(r) {
  if (h[r]) return h[r];
  const e = l.get(r);
  return e ? e.label : j(r);
}
function X(r) {
  if (r === "sessions") return [];
  const e = l.get(r);
  return e ? y(e) : [r];
}
function Z() {
  const r = {};
  for (const e of l.list()) for (const n of y(e)) r[n] = e.id;
  return r;
}
function I(r) {
  if (!Array.isArray(r)) return [];
  const e = [];
  return r.forEach((n) => {
    if (!n || typeof n != "object") return;
    const t = n, s = typeof t.command == "string" ? t.command.trim() : "";
    if (!s) return;
    const o = typeof t.description == "string" ? t.description.trim() : "", a = Array.isArray(t.tags) ? t.tags.filter((i) => typeof i == "string" && i.trim() !== "").map((i) => i.trim()) : [], f = Array.isArray(t.aliases) ? t.aliases.filter((i) => typeof i == "string" && i.trim() !== "").map((i) => i.trim()) : [], c = typeof t.mutates == "boolean" ? t.mutates : typeof t.read_only == "boolean" ? !t.read_only : !1;
    e.push({
      command: s,
      description: o || void 0,
      tags: a.length > 0 ? a : void 0,
      aliases: f.length > 0 ? f : void 0,
      mutates: c
    });
  }), e;
}
async function rr(r) {
  try {
    const e = await fetch(`${r}/api/snapshot`, { credentials: "same-origin" });
    return e.ok ? await e.json() : null;
  } catch {
    return null;
  }
}
function _(r, e, n = 500) {
  const t = {
    data: { ...r?.data || {} },
    logs: [...r?.logs || []]
  };
  if (!e || typeof e != "object") return t;
  const s = e;
  if ("key" in s && "value" in s)
    return L(t.data || (t.data = {}), String(s.key), s.value), t;
  if ("data" in s || "logs" in s) {
    const o = s;
    return o.data && typeof o.data == "object" && (t.data = {
      ...t.data || {},
      ...o.data
    }), Array.isArray(o.logs) && o.logs.length > 0 && (t.logs = w([...t.logs || [], ...o.logs], n)), t;
  }
  return ("category" in s || "message" in s) && (t.logs = g(t.logs, s, n)), t;
}
function er(r, e, n = {}) {
  if (!e || !e.type || e.type === "snapshot") return null;
  const t = n.eventToPanel?.[e.type] || l.findByEventType(e.type)?.id || e.type, s = l.get(t);
  if (s) {
    const o = m(s), a = r[o];
    return r[o] = (s.handleEvent || ((f, c) => q(f, c, 500)))(a, e.payload), t;
  }
  switch (e.type) {
    case "request":
      r.requests = g(r.requests, e.payload, 500);
      break;
    case "sql":
      r.sql = g(r.sql, e.payload, 200);
      break;
    case "log":
      r.logs = g(r.logs, e.payload, 500);
      break;
    case "template":
      r.template = e.payload || {};
      break;
    case "session":
      r.session = e.payload || {};
      break;
    case "custom":
      r.custom = _(r.custom, e.payload, 500);
      break;
    default:
      n.storeUnknownEvents && (r[t] = e.payload);
      break;
  }
  return t;
}
function tr(r, e = 50) {
  const n = r.requests?.length || 0, t = r.sql?.length || 0, s = r.logs?.length || 0, o = r.jserrors?.length || 0, a = (r.requests || []).filter((u) => (u.status || 0) >= 400).length, f = (r.sql || []).filter((u) => u.error).length, c = (r.logs || []).filter((u) => {
    const p = (u.level || "").toLowerCase();
    return p === "error" || p === "fatal";
  }).length, i = (r.sql || []).filter((u) => A(u.duration, e)).length;
  return {
    requests: n,
    sql: t,
    logs: s,
    jserrors: o,
    errors: a + f + c + o,
    slowQueries: i
  };
}
export {
  A,
  U as C,
  F as D,
  K as E,
  M as O,
  G as S,
  $ as T,
  m as _,
  Y as a,
  Q as b,
  W as c,
  I as d,
  B as f,
  P as g,
  J as h,
  rr as i,
  x as j,
  z as k,
  tr as l,
  q as m,
  er as n,
  H as o,
  C as p,
  Z as r,
  X as s,
  _ as t,
  V as u,
  y as v,
  O as w,
  R as x,
  l as y
};

//# sourceMappingURL=runtime-helpers-73DjiyO0.js.map