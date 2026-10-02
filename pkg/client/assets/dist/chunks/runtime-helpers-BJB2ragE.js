import { httpRequest as w, readExpectedHTTPJSON as S } from "../shared/transport/http-client.js";
import { formatByteSize as T } from "../shared/size-formatters.js";
import { l as E, o as B, r as N, u as q } from "./avatar-DIbK-LSg.js";
var K = (e, r = 50) => {
  if (e == null) return {
    text: "0ms",
    isSlow: !1
  };
  if (typeof e == "string") {
    const o = h(e);
    return {
      text: e,
      isSlow: o !== null && o >= r
    };
  }
  const s = Number(e);
  if (Number.isNaN(s)) return {
    text: "0ms",
    isSlow: !1
  };
  const t = s / 1e6, n = t >= r;
  return t < 1 ? {
    text: `${(s / 1e3).toFixed(1)}µs`,
    isSlow: n
  } : t < 1e3 ? {
    text: `${t.toFixed(2)}ms`,
    isSlow: n
  } : {
    text: `${(t / 1e3).toFixed(2)}s`,
    isSlow: n
  };
}, k = (e, r = 50) => {
  const s = A(e);
  return s === null ? !1 : s >= r;
}, $ = (e, r) => e ? e.length > r ? e.substring(0, r) + "..." : e : "", h = (e) => {
  const r = e.trim();
  if (!r) return null;
  const s = r.match(/^([0-9]*\.?[0-9]+)\s*(ns|µs|us|ms|s)?$/i);
  if (!s) return null;
  const t = Number(s[1]);
  if (Number.isNaN(t)) return null;
  switch ((s[2] || "ms").toLowerCase()) {
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
}, A = (e) => {
  if (e == null) return null;
  if (typeof e == "string") return h(e);
  const r = Number(e);
  return Number.isNaN(r) ? null : r / 1e6;
}, O = (e) => e ? e >= 500 ? "error" : e >= 400 ? "warn" : "" : "", U = (e) => {
  if (!e) return "info";
  const r = e.toLowerCase();
  return r === "error" || r === "fatal" ? "error" : r === "warn" || r === "warning" ? "warn" : r === "debug" || r === "trace" ? "debug" : "info";
}, H = (e) => T(e, {
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
}) ?? "0 B", M = (e) => Array.isArray(e) ? e : [], m = "__go_admin_panel_registry__";
function D() {
  const e = globalThis;
  return e[m] || (e[m] = new N()), e[m];
}
var i = D(), _ = [
  "template",
  "session",
  "requests",
  "sql",
  "logs",
  "config",
  "routes",
  "custom"
], d = [
  "requests",
  "sql",
  "logs",
  "routes",
  "config"
], v = {
  requests: ["request"],
  sql: ["sql"],
  logs: ["log"],
  template: ["template"],
  session: ["session"],
  custom: ["custom"],
  jserrors: ["jserror"],
  routes: [],
  config: []
}, C = /* @__PURE__ */ new Set(["console", "shell"]), p = {
  console: "Console",
  shell: "Shell"
}, b = {
  console: "iconoir:code",
  shell: "iconoir:terminal"
}, x = (e) => e ? e.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/gi, "SQL").replace(/\b([a-z])/g, (r) => r.toUpperCase()) : "", P = (e, r) => r <= 0 || e.length <= r ? e : e.slice(-r), g = (e, r, s) => P([...e || [], r], s), j = (e, r, s) => {
  if (!e || !r) return;
  const t = r.split(".").map((o) => o.trim()).filter(Boolean);
  if (t.length === 0) return;
  let n = e;
  for (let o = 0; o < t.length - 1; o += 1) {
    const a = t[o];
    (!n[a] || typeof n[a] != "object") && (n[a] = {}), n = n[a];
  }
  n[t[t.length - 1]] = s;
};
function Q() {
  const e = i.getSortedIds();
  return e.length > 0 ? e : _;
}
function Y() {
  const e = i.getToolbarPanels();
  if (e.length > 0) {
    const r = e.filter((s) => s.category === "core" || s.category === "system").map((s) => s.id);
    return r.length > 0 ? r : d;
  }
  return d;
}
function G(e) {
  return e === "sessions" || i.has(e) || C.has(e);
}
function J(e) {
  if (p[e]) return p[e];
  const r = i.get(e);
  return r ? r.label : x(e);
}
function V(e) {
  return b[e] ? b[e] : i.get(e)?.icon;
}
function W(e) {
  if (e === "sessions") return [];
  const r = i.get(e);
  return r ? q(r) : v[e] || [e];
}
function X() {
  const e = {};
  for (const [r, s] of Object.entries(v)) for (const t of s) e[t] = r;
  for (const r of i.list()) for (const s of q(r)) e[s] = r.id;
  return e;
}
function Z(e) {
  if (!Array.isArray(e)) return [];
  const r = [];
  return e.forEach((s) => {
    if (!s || typeof s != "object") return;
    const t = s, n = typeof t.command == "string" ? t.command.trim() : "";
    if (!n) return;
    const o = typeof t.description == "string" ? t.description.trim() : "", a = Array.isArray(t.tags) ? t.tags.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], c = Array.isArray(t.aliases) ? t.aliases.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], f = typeof t.mutates == "boolean" ? t.mutates : typeof t.read_only == "boolean" ? !t.read_only : !1;
    r.push({
      command: n,
      description: o || void 0,
      tags: a.length > 0 ? a : void 0,
      aliases: c.length > 0 ? c : void 0,
      mutates: f
    });
  }), r;
}
async function I(e) {
  try {
    const r = await w(`${e}/api/snapshot`, { credentials: "same-origin" });
    return r.ok ? await S(r) : null;
  } catch {
    return null;
  }
}
function F(e, r, s = 500) {
  const t = {
    data: { ...e?.data || {} },
    logs: [...e?.logs || []]
  };
  if (!r || typeof r != "object") return t;
  const n = r;
  if ("key" in n && "value" in n)
    return j(t.data || (t.data = {}), String(n.key), n.value), t;
  if ("data" in n || "logs" in n) {
    const o = n;
    return o.data && typeof o.data == "object" && (t.data = {
      ...t.data || {},
      ...o.data
    }), Array.isArray(o.logs) && o.logs.length > 0 && (t.logs = P([...t.logs || [], ...o.logs], s)), t;
  }
  return ("category" in n || "message" in n) && (t.logs = g(t.logs, n, s)), t;
}
function ee(e, r, s = {}) {
  if (!r || !r.type || r.type === "snapshot") return null;
  const t = s.eventToPanel?.[r.type] || i.findByEventType(r.type)?.id || r.type, n = i.get(t);
  if (n) {
    const o = E(n), a = e[o];
    return e[o] = (n.handleEvent || ((c, f) => B(c, f, 500)))(a, r.payload), t;
  }
  switch (r.type) {
    case "request":
      e.requests = g(e.requests, r.payload, 500);
      break;
    case "sql":
      e.sql = g(e.sql, r.payload, 200);
      break;
    case "log":
      e.logs = g(e.logs, r.payload, 500);
      break;
    case "template":
      e.template = r.payload || {};
      break;
    case "session":
      e.session = r.payload || {};
      break;
    case "custom":
      e.custom = F(e.custom, r.payload, 500);
      break;
    default:
      s.storeUnknownEvents && (e[t] = r.payload);
  }
  return t;
}
function re(e, r = 50) {
  const s = e.requests?.length || 0, t = e.sql?.length || 0, n = e.logs?.length || 0, o = e.jserrors?.length || 0, a = (e.requests || []).filter((u) => (u.status || 0) >= 400).length, c = (e.sql || []).filter((u) => u.error).length, f = (e.logs || []).filter((u) => {
    const y = (u.level || "").toLowerCase();
    return y === "error" || y === "fatal";
  }).length, l = (e.sql || []).filter((u) => k(u.duration, r)).length;
  return {
    requests: s,
    sql: t,
    logs: n,
    jserrors: o,
    errors: a + c + f + o,
    slowQueries: l
  };
}
export {
  K as _,
  Q as a,
  k as b,
  V as c,
  G as d,
  Z as f,
  H as g,
  M as h,
  I as i,
  J as l,
  i as m,
  ee as n,
  Y as o,
  C as p,
  X as r,
  W as s,
  F as t,
  re as u,
  U as v,
  $ as x,
  O as y
};

//# sourceMappingURL=runtime-helpers-BJB2ragE.js.map