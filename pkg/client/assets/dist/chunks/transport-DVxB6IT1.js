import { t as A } from "./http-B2ojv2Fu.js";
var C = [
  "catalog_example",
  "prepared",
  "active"
], c = {
  entities: 16,
  fields: 32,
  relationships: 16,
  scenarios: 32,
  inventory: 16,
  usages: 32,
  effects: 3,
  columns: 32,
  rows: 100,
  sampleDefault: 25,
  sampleMax: 100,
  cursorBytes: 512,
  idBytes: 128
}, M = [
  "available",
  "unsupported",
  "empty",
  "suppressed"
], w = [
  "complete",
  "partial",
  "unknown"
], L = [
  "string",
  "integer",
  "number",
  "boolean",
  "date",
  "datetime"
], N = ["catalog_inventory", "selected_scenario"], D = [
  "prepare",
  "verify",
  "activate"
], B = [
  "screen",
  "report",
  "workflow",
  "target"
], $ = [
  "value",
  "null",
  "unknown",
  "redacted"
];
function a(t) {
  return !!t && typeof t == "object" && !Array.isArray(t);
}
function s(t) {
  return typeof t == "string" ? t.trim() : "";
}
function u(t, n) {
  const e = s(t);
  return n.includes(e) ? e : null;
}
function _(t) {
  return typeof t == "number" && Number.isSafeInteger(t) && t >= 0 ? t : null;
}
function b(t, n = 64) {
  return Array.isArray(t) ? t.map(s).filter(Boolean).slice(0, n) : [];
}
function l(t, n, e) {
  if (t == null) return [];
  if (!Array.isArray(t) || t.length > n) return null;
  const r = [];
  for (const i of t) {
    const o = e(i);
    if (o === null) return null;
    r.push(o);
  }
  return r;
}
function T(t) {
  if (!a(t)) return null;
  const n = {
    provider: s(t.provider),
    id: s(t.id),
    version: s(t.version),
    digest: s(t.digest)
  };
  return n.provider && n.id && n.version && n.digest ? n : null;
}
function R(t) {
  if (!a(t)) return null;
  const n = T(t.dataset), e = {
    id: s(t.id),
    version: s(t.version),
    profile_hash: s(t.profile_hash)
  };
  return n && e.id && e.version && e.profile_hash ? {
    dataset: n,
    ...e
  } : null;
}
function U(t, n) {
  return t.provider === n.provider && t.id === n.id && t.version === n.version && t.digest === n.digest;
}
function J(t) {
  if (!a(t)) return null;
  const n = T(t.dataset), e = R(t.scenario), r = u(t.context, C), i = s(t.target_id);
  if (!n || !e || !r || !i || !U(n, e.dataset)) return null;
  const o = {
    dataset: n,
    scenario: e,
    target_id: i,
    context: r
  };
  if (r === "catalog_example") return o;
  const p = s(t.receipt_id), f = _(t.content_revision);
  if (!p || !f) return null;
  if (o.receipt_id = p, o.content_revision = f, r === "active") {
    const m = _(t.generation);
    if (m === null) return null;
    o.generation = m;
  }
  return o;
}
function S(t) {
  const { dataset: n, scenario: e } = t;
  return JSON.stringify([
    t.context,
    t.target_id,
    n.provider,
    n.id,
    n.version,
    n.digest,
    e.id,
    e.version,
    e.profile_hash,
    t.receipt_id || "",
    t.content_revision ?? 0,
    t.generation ?? -1
  ]);
}
function I(t) {
  const n = {
    dataset: t.dataset,
    scenario: t.scenario,
    target_id: t.target_id,
    context: t.context
  };
  return t.context !== "catalog_example" && (n.receipt_id = t.receipt_id, n.content_revision = t.content_revision), t.context === "active" && (n.generation = t.generation), n;
}
function O(t, n) {
  const e = J(t.selection), r = u(t.state, M), i = u(t.completeness, w);
  if (!e || S(e) !== S(n) || !r || !i) return null;
  const o = s(t.provenance);
  return {
    selection: e,
    presentation_revision: s(t.presentation_revision),
    observed_at: s(t.observed_at),
    provenance: o === "example" || o === "observed" ? o : "unknown",
    completeness: i,
    state: r,
    reason: s(t.reason)
  };
}
function P(t) {
  if (!a(t)) return null;
  const n = s(t.id), e = u(t.type, L);
  return !n || !e ? null : {
    id: n,
    label: s(t.label) || n,
    description: s(t.description),
    type: e,
    unit: s(t.unit)
  };
}
function X(t) {
  if (!a(t)) return null;
  const n = {
    id: s(t.id),
    label: s(t.label),
    entity_id: s(t.entity_id)
  };
  return n.id && n.entity_id ? {
    ...n,
    label: n.label || n.id
  } : null;
}
function j(t) {
  if (!a(t)) return null;
  const n = s(t.id), e = l(t.fields, c.fields, P), r = l(t.relationships, c.relationships, X);
  return !n || !e || !r ? null : {
    id: n,
    label: s(t.label) || n,
    description: s(t.description),
    fields: e,
    relationships: r
  };
}
function F(t) {
  if (!a(t)) return null;
  const n = R(t.scenario);
  return n ? {
    scenario: n,
    title: s(t.title),
    summary: s(t.summary),
    expected_outcomes: b(t.expected_outcomes, 32)
  } : null;
}
function K(t) {
  if (!a(t)) return null;
  const n = s(t.entity_id), e = u(t.scope, N);
  return !n || !e ? null : {
    entity_id: n,
    scope: e,
    total: _(t.total)
  };
}
function W(t) {
  if (!a(t)) return null;
  const n = u(t.phase, D);
  return n ? {
    phase: n,
    description: s(t.description)
  } : null;
}
function z(t) {
  if (!a(t)) return null;
  const n = s(t.surface_id), e = u(t.kind, B), r = l(t.effects, c.effects, W);
  return !n || !e || !r ? null : {
    surface_id: n,
    kind: e,
    label: s(t.label) || n,
    effects: r,
    href: s(t.href)
  };
}
function G(t) {
  if (!a(t)) return null;
  const n = {
    start: s(t.start),
    end: s(t.end),
    timezone: s(t.timezone)
  };
  return n.start || n.end ? n : null;
}
function H(t, n) {
  if (!a(t)) return null;
  const e = O(t, n), r = l(t.entities, c.entities, j), i = l(t.scenarios, c.scenarios, F), o = l(t.inventory, c.inventory, K), p = l(t.usages, c.usages, z);
  return !e || !r || !i || !o || !p ? null : {
    ...e,
    title: s(t.title),
    summary: s(t.summary),
    origin: s(t.origin),
    entities: r,
    scenarios: i,
    inventory: o,
    period: G(t.period),
    prerequisites: b(t.prerequisites),
    attribution: b(t.attribution),
    usages: p,
    usage_completeness: u(t.usage_completeness, w) || "unknown"
  };
}
function Q(t) {
  if (t === null || typeof t == "string" || typeof t == "boolean" || typeof t == "number" && Number.isFinite(t)) return t;
}
function V(t) {
  if (!a(t)) return null;
  const n = u(t.state, $), e = Q(t.value);
  return !n || e === void 0 ? null : {
    state: n,
    value: n === "value" ? e : null
  };
}
function Y(t, n) {
  if (!a(t) || !a(t.cells)) return null;
  const e = s(t.record_key);
  if (!e) return null;
  const r = {};
  for (const i of n) {
    const o = V(t.cells[i.id]);
    r[i.id] = o || {
      state: "unknown",
      value: null
    };
  }
  return {
    record_key: e,
    cells: r
  };
}
function x(t, n, e) {
  if (!a(t)) return null;
  const r = O(t, n), i = l(t.columns, c.columns, P), o = s(t.entity_id);
  if (!r || !i || !o || !e.includes(o)) return null;
  const p = l(t.rows, c.rows, (m) => Y(m, i));
  if (!p) return null;
  const f = s(t.next_cursor);
  return {
    ...r,
    entity_id: o,
    columns: i,
    rows: p,
    total: _(t.total),
    next_cursor: f && f.length <= c.cursorBytes ? f : null,
    sampling_method: s(t.sampling_method)
  };
}
var Z = 1e4, q = 'script[type="application/json"][data-console-bootstrap]';
function d(t) {
  const n = s(t);
  return n.startsWith("/") && !n.startsWith("//") ? n : "";
}
function E(t, n) {
  const e = Array.from(t.querySelectorAll(q)).find((r) => r.closest("[data-console-root]") === t);
  if (!e) return {};
  try {
    const r = JSON.parse(e.textContent || ""), i = a(r) && a(r.extensions) ? r.extensions : {};
    return a(i[n]) ? i[n] : {};
  } catch {
    return {};
  }
}
function nt(t) {
  const n = E(t, "data_explorer"), e = {
    metadata: d(n.metadata),
    samples: d(n.samples),
    related: d(n.related)
  };
  return e.metadata && e.samples && e.related ? e : null;
}
function et(t) {
  const n = E(t, "data_insights"), e = {
    insights: d(n.insights),
    compare: d(n.compare),
    metricSetID: s(n.metric_set_id)
  };
  return e.insights && e.compare ? e : null;
}
function rt(t) {
  const n = E(t, "data_preview"), e = {
    capabilities: d(n.capabilities),
    open: d(n.open),
    session: d(n.session),
    close: d(n.close)
  }, r = (i) => /:session(?=$|[/?#])/.test(i);
  return e.capabilities && e.open && r(e.session) && r(e.close) ? e : null;
}
function v(t) {
  switch (t) {
    case 0:
      return "network";
    case 400:
      return "invalid";
    case 401:
      return "expired";
    case 403:
      return "denied";
    case 404:
    case 410:
      return "gone";
    case 408:
      return "canceled";
    case 409:
      return "stale";
    case 503:
      return "unavailable";
    case 504:
      return "timeout";
    default:
      return "failed";
  }
}
function y(t, n) {
  const e = n.filter(([, r]) => r !== "").map(([r, i]) => `${encodeURIComponent(r)}=${encodeURIComponent(i)}`).join("&");
  return e ? `${t}${t.includes("?") ? "&" : "?"}${e}` : t;
}
function k(t) {
  const n = Math.min(Math.max(Math.floor(t.limit || c.sampleDefault), 1), c.sampleMax);
  return [
    ["selection", JSON.stringify(I(t.selection))],
    ["entity_id", t.entityId],
    ["cursor", t.cursor || ""],
    ["limit", String(n)]
  ];
}
async function g(t, n, e) {
  const r = await A(t, {
    method: "GET",
    signal: n,
    timeoutMs: Z,
    fallbackError: "Exploration is unavailable."
  });
  if (n.aborted) return {
    ok: !1,
    failure: {
      kind: "canceled",
      status: 0
    }
  };
  if (!r.ok) return {
    ok: !1,
    failure: {
      kind: v(r.status),
      status: r.status
    }
  };
  const i = e(r.value);
  return i === null ? {
    ok: !1,
    failure: {
      kind: "malformed",
      status: r.status
    }
  } : {
    ok: !0,
    value: i
  };
}
function st(t) {
  return {
    metadata(n, e) {
      return g(y(t.metadata, [["selection", JSON.stringify(I(n))]]), e, (r) => H(r, n));
    },
    samples(n, e) {
      return g(y(t.samples, k(n)), e, (r) => x(r, n.selection, [n.entityId]));
    },
    related(n, e) {
      const r = [
        ...k(n),
        ["record_key", n.recordKey],
        ["relationship_id", n.relationshipId]
      ];
      return g(y(t.related, r), e, (i) => x(i, n.selection, [n.relatedEntityId, n.entityId]));
    }
  };
}
var h = () => Promise.resolve({
  ok: !1,
  failure: {
    kind: "unconfigured",
    status: 0
  }
}), it = {
  metadata: () => h(),
  samples: () => h(),
  related: () => h()
};
export {
  I as _,
  et as a,
  w as c,
  l as d,
  u as f,
  S as g,
  z as h,
  nt as i,
  C as l,
  J as m,
  v as n,
  rt as o,
  O as p,
  st as r,
  it as s,
  Z as t,
  a as u,
  s as v,
  b as y
};

//# sourceMappingURL=transport-DVxB6IT1.js.map