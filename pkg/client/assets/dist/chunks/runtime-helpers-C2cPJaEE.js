import { escapeAttribute as g, escapeHTML as k } from "../shared/html.js";
import { httpRequest as q, readExpectedHTTPJSON as C } from "../shared/transport/http-client.js";
import { formatByteSize as E } from "../shared/size-formatters.js";
function Y(r) {
  let e = null;
  return {
    load: () => (e || (e = r().catch((n) => {
      throw e = null, n;
    })), e),
    reset: () => {
      e = null;
    }
  };
}
var W = (r) => {
  if (!r) return "";
  if (typeof r == "number") return new Date(r).toLocaleTimeString();
  if (typeof r == "string") {
    const e = new Date(r);
    return Number.isNaN(e.getTime()) ? r : e.toLocaleTimeString();
  }
  return "";
}, Z = (r, e = 50) => {
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
}, L = (r, e = 50) => {
  const n = _(r);
  return n === null ? !1 : n >= e;
}, I = (r, e) => {
  const { nullAsEmptyObject: n = !0, indent: t = 2 } = e || {};
  if (r == null) return n ? "{}" : "null";
  try {
    return JSON.stringify(r, null, t);
  } catch {
    return String(r ?? "");
  }
}, rr = (r, e) => r ? r.length > e ? r.substring(0, e) + "..." : r : "", S = (r) => {
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
}, _ = (r) => {
  if (r == null) return null;
  if (typeof r == "string") return S(r);
  const e = Number(r);
  return Number.isNaN(e) ? null : e / 1e6;
}, er = (r) => {
  if (r == null || r === "") return "0";
  const e = Number(r);
  return Number.isNaN(e) ? String(r) : e.toLocaleString();
}, tr = (r) => r == null ? 0 : Array.isArray(r) ? r.length : typeof r == "object" ? Object.keys(r).length : 1, nr = (r) => r ? r >= 500 ? "error" : r >= 400 ? "warn" : "" : "", sr = (r) => {
  if (!r) return "info";
  const e = r.toLowerCase();
  return e === "error" || e === "fatal" ? "error" : e === "warn" || e === "warning" ? "warn" : e === "debug" || e === "trace" ? "debug" : "info";
}, or = (r) => E(r, {
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
}) ?? "0 B", ir = (r) => Array.isArray(r) ? r : [], j = 128, B = 256, $ = 16, D = 88e3;
function d(r, e) {
  return typeof r == "string" ? r.trim().slice(0, e) : "";
}
function v(r) {
  const e = d(r, 16).toLowerCase();
  return /^#[0-9a-f]{6}$/.test(e) ? e : "";
}
function M(r) {
  if (!r || typeof r != "object") return null;
  const e = r, n = d(e.name, j), t = d(e.algorithm, 64), s = d(e.version, 64), o = d(e.source, 64), i = e.visual, u = d(i?.alt, B) || n;
  if (!n || !i || !u) return null;
  if (i.kind === "monogram") {
    const a = d(i.text, $), l = v(i.background), c = v(i.foreground);
    return !a || !l || !c ? null : {
      name: n,
      algorithm: t,
      version: s,
      source: o,
      visual: {
        kind: "monogram",
        text: a,
        alt: u,
        background: l,
        foreground: c
      }
    };
  }
  if (i.kind === "image") {
    const a = typeof i.data == "string" ? i.data.trim() : "";
    return i.media_type !== "image/png" || a.length === 0 || a.length > D || !a.startsWith("iVBORw0KGgo") || !/^[A-Za-z0-9+/]+={0,2}$/.test(a) ? null : {
      name: n,
      algorithm: t,
      version: s,
      source: o,
      visual: {
        kind: "image",
        alt: u,
        media_type: "image/png",
        data: a
      }
    };
  }
  return null;
}
function ar(r, e = "deployment-persona-avatar") {
  const n = M(r);
  if (!n?.visual) return "";
  const t = n.visual;
  return t.kind === "image" ? `<span class="${g(e)}"><img src="data:image/png;base64,${g(t.data)}" alt="${g(t.alt)}"></span>` : `<span class="${g(e)}" role="img" aria-label="${g(t.alt)}" style="--persona-background:${g(t.background)};--persona-foreground:${g(t.foreground)}">${k(t.text)}</span>`;
}
function b(r) {
  return r.snapshotKey ?? r.id;
}
function y(r) {
  return r.eventTypes ? Array.isArray(r.eventTypes) ? r.eventTypes : [r.eventTypes] : [b(r)];
}
function x(r) {
  return Array.isArray(r) ? r.length : r && typeof r == "object" ? Object.keys(r).length : 0;
}
function O(r, e, n = 500) {
  if (Array.isArray(r)) {
    const t = [...r, e];
    return n > 0 ? t.slice(-n) : t;
  }
  return r && typeof r == "object" && e && typeof e == "object" ? {
    ...r,
    ...e
  } : e;
}
function R(r, e) {
  return r[b(e)];
}
function lr(r, e) {
  const n = R(r, e);
  return e.getCount ? e.getCount(n) : x(n);
}
function ur(r, e, n, t, s) {
  return s === "console" && r.renderConsole ? r.renderConsole(e, n, t) : s === "toolbar" && r.renderToolbar ? r.renderToolbar(e, n, t) : s === "toolbar" && r.supportsToolbar === !1 ? `<div class="${n.emptyState}">Panel "${r.label}" not available in toolbar</div>` : r.render(e, n, t);
}
var F = class {
  constructor() {
    this.panels = /* @__PURE__ */ new Map(), this.sources = /* @__PURE__ */ new Map(), this.listeners = /* @__PURE__ */ new Set();
  }
  register(r) {
    this.panels.set(r.id, r), this.sources.set(r.id, "client"), this.notifyListeners({
      type: "register",
      panelId: r.id,
      panel: r
    });
  }
  registerServerDefinition(r) {
    const e = this.panels.get(r.id), n = this.sources.get(r.id);
    return e && n !== "server" ? !1 : (this.panels.set(r.id, r), this.sources.set(r.id, "server"), this.notifyListeners({
      type: "register",
      panelId: r.id,
      panel: r
    }), !0);
  }
  unregister(r) {
    const e = this.panels.get(r);
    this.panels.delete(r) && (this.sources.delete(r), this.notifyListeners({
      type: "unregister",
      panelId: r,
      panel: e
    }));
  }
  get(r) {
    return this.panels.get(r);
  }
  has(r) {
    return this.panels.has(r);
  }
  isServerDefinition(r) {
    return this.sources.get(r) === "server";
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
}, p = "__go_admin_panel_registry__";
function z() {
  const r = globalThis;
  return r[p] || (r[p] = new F()), r[p];
}
var f = z(), K = [
  "template",
  "session",
  "requests",
  "sql",
  "logs",
  "config",
  "routes",
  "custom"
], A = [
  "requests",
  "sql",
  "logs",
  "routes",
  "config"
], P = {
  requests: ["request"],
  sql: ["sql"],
  logs: ["log"],
  template: ["template"],
  session: ["session"],
  custom: ["custom"],
  jserrors: ["jserror"],
  routes: [],
  config: []
}, G = /* @__PURE__ */ new Set(["console", "shell"]), T = {
  console: "Console",
  shell: "Shell"
}, w = {
  console: "iconoir:code",
  shell: "iconoir:terminal"
}, X = (r) => r ? r.replace(/[-_.]/g, " ").replace(/\s+/g, " ").trim().replace(/\bsql\b/gi, "SQL").replace(/\b([a-z])/g, (e) => e.toUpperCase()) : "", N = (r, e) => e <= 0 || r.length <= e ? r : r.slice(-e), m = (r, e, n) => N([...r || [], e], n), H = (r, e, n) => {
  if (!r || !e) return;
  const t = e.split(".").map((o) => o.trim()).filter(Boolean);
  if (t.length === 0) return;
  let s = r;
  for (let o = 0; o < t.length - 1; o += 1) {
    const i = t[o];
    (!s[i] || typeof s[i] != "object") && (s[i] = {}), s = s[i];
  }
  s[t[t.length - 1]] = n;
};
function cr() {
  const r = f.getSortedIds();
  return r.length > 0 ? r : K;
}
function fr() {
  const r = f.getToolbarPanels();
  if (r.length > 0) {
    const e = r.filter((n) => n.category === "core" || n.category === "system").map((n) => n.id);
    return e.length > 0 ? e : A;
  }
  return A;
}
function gr(r) {
  return r === "sessions" || f.has(r) || G.has(r);
}
function dr(r) {
  if (T[r]) return T[r];
  const e = f.get(r);
  return e ? e.label : X(r);
}
function mr(r) {
  return w[r] ? w[r] : f.get(r)?.icon;
}
function yr(r) {
  if (r === "sessions") return [];
  const e = f.get(r);
  return e ? y(e) : P[r] || [r];
}
function pr() {
  const r = {};
  for (const [e, n] of Object.entries(P)) for (const t of n) r[t] = e;
  for (const e of f.list()) for (const n of y(e)) r[n] = e.id;
  return r;
}
function br(r) {
  if (!Array.isArray(r)) return [];
  const e = [];
  return r.forEach((n) => {
    if (!n || typeof n != "object") return;
    const t = n, s = typeof t.command == "string" ? t.command.trim() : "";
    if (!s) return;
    const o = typeof t.description == "string" ? t.description.trim() : "", i = Array.isArray(t.tags) ? t.tags.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], u = Array.isArray(t.aliases) ? t.aliases.filter((l) => typeof l == "string" && l.trim() !== "").map((l) => l.trim()) : [], a = typeof t.mutates == "boolean" ? t.mutates : typeof t.read_only == "boolean" ? !t.read_only : !1;
    e.push({
      command: s,
      description: o || void 0,
      tags: i.length > 0 ? i : void 0,
      aliases: u.length > 0 ? u : void 0,
      mutates: a
    });
  }), e;
}
async function hr(r) {
  try {
    const e = await q(`${r}/api/snapshot`, { credentials: "same-origin" });
    return e.ok ? await C(e) : null;
  } catch {
    return null;
  }
}
function J(r, e, n = 500) {
  const t = {
    data: { ...r?.data || {} },
    logs: [...r?.logs || []]
  };
  if (!e || typeof e != "object") return t;
  const s = e;
  if ("key" in s && "value" in s)
    return H(t.data || (t.data = {}), String(s.key), s.value), t;
  if ("data" in s || "logs" in s) {
    const o = s;
    return o.data && typeof o.data == "object" && (t.data = {
      ...t.data || {},
      ...o.data
    }), Array.isArray(o.logs) && o.logs.length > 0 && (t.logs = N([...t.logs || [], ...o.logs], n)), t;
  }
  return ("category" in s || "message" in s) && (t.logs = m(t.logs, s, n)), t;
}
function vr(r, e, n = {}) {
  if (!e || !e.type || e.type === "snapshot") return null;
  const t = n.eventToPanel?.[e.type] || f.findByEventType(e.type)?.id || e.type, s = f.get(t);
  if (s) {
    const o = b(s), i = r[o];
    return r[o] = (s.handleEvent || ((u, a) => O(u, a, 500)))(i, e.payload), t;
  }
  switch (e.type) {
    case "request":
      r.requests = m(r.requests, e.payload, 500);
      break;
    case "sql":
      r.sql = m(r.sql, e.payload, 200);
      break;
    case "log":
      r.logs = m(r.logs, e.payload, 500);
      break;
    case "template":
      r.template = e.payload || {};
      break;
    case "session":
      r.session = e.payload || {};
      break;
    case "custom":
      r.custom = J(r.custom, e.payload, 500);
      break;
    default:
      n.storeUnknownEvents && (r[t] = e.payload);
  }
  return t;
}
function Ar(r, e = 50) {
  const n = r.requests?.length || 0, t = r.sql?.length || 0, s = r.logs?.length || 0, o = r.jserrors?.length || 0, i = (r.requests || []).filter((c) => (c.status || 0) >= 400).length, u = (r.sql || []).filter((c) => c.error).length, a = (r.logs || []).filter((c) => {
    const h = (c.level || "").toLowerCase();
    return h === "error" || h === "fatal";
  }).length, l = (r.sql || []).filter((c) => L(c.duration, e)).length;
  return {
    requests: n,
    sql: t,
    logs: s,
    jserrors: o,
    errors: i + u + a + o,
    slowQueries: l
  };
}
export {
  W as A,
  ar as C,
  Z as D,
  or as E,
  Y as F,
  nr as M,
  L as N,
  I as O,
  rr as P,
  M as S,
  ir as T,
  R as _,
  cr as a,
  f as b,
  mr as c,
  gr as d,
  br as f,
  lr as g,
  O as h,
  hr as i,
  sr as j,
  er as k,
  dr as l,
  x as m,
  vr as n,
  fr as o,
  G as p,
  pr as r,
  yr as s,
  J as t,
  Ar as u,
  b as v,
  tr as w,
  ur as x,
  y
};

//# sourceMappingURL=runtime-helpers-C2cPJaEE.js.map