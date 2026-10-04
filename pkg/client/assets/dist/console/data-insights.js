import { escapeAttribute as d, escapeHTML as r } from "../shared/html.js";
import { C as ge, b as fe, i as G } from "../chunks/rich-5UU6Sxl8.js";
import { t as Be } from "../chunks/http-B2ojv2Fu.js";
import { _ as U, c as Ie, d as T, f as w, g as f, h as Re, m as Oe, n as Pe, p as ze, t as qe, u as v, v as h, y as Fe } from "../chunks/transport-DVxB6IT1.js";
var Ve = [
  "covered",
  "covered_empty",
  "partial",
  "uncovered",
  "policy_suppressed",
  "unavailable"
], k = {
  metrics: 16,
  buckets: 32,
  days: 90,
  comparisons: 32,
  usages: 32,
  outcomes: 32
}, We = [
  "count",
  "sum",
  "distribution"
], _e = [
  "known",
  "unknown",
  "suppressed",
  "unavailable"
], Je = ["comparable", "incompatible"], He = /^(\d{4})-(\d{2})-(\d{2})$/;
function N(e) {
  return typeof e == "number" && Number.isFinite(e) && Math.abs(e) <= Number.MAX_SAFE_INTEGER ? e : null;
}
function Z(e) {
  const t = N(e);
  return t !== null && Number.isInteger(t) && t >= 0 ? t : null;
}
function I(e) {
  const t = He.exec(e);
  if (!t) return !1;
  const [s, n, a] = [
    Number(t[1]),
    Number(t[2]),
    Number(t[3])
  ], i = new Date(Date.UTC(s, n - 1, a));
  return i.getUTCFullYear() === s && i.getUTCMonth() === n - 1 && i.getUTCDate() === a;
}
function j(e) {
  return new Set(e).size !== e.length;
}
function Ye(e) {
  const [t, s, n] = e.split("-").map(Number);
  return Date.UTC(t, s - 1, n) / 864e5;
}
function Ge(e) {
  if (e.length < 2) return !0;
  const t = e.map(Ye);
  return Math.max(...t) - Math.min(...t) < k.days;
}
function $e(e, t, s) {
  if (e !== "known") return {
    status: e,
    value: null
  };
  const n = N(t), a = s === "count";
  return n === null || (a || s === "bucket") && n < 0 || a && !Number.isInteger(n) ? {
    status: "unknown",
    value: null
  } : {
    status: e,
    value: n
  };
}
function Ke(e) {
  if (!v(e)) return {
    start: "",
    end: "",
    timezone: ""
  };
  const t = h(e.start), s = h(e.end);
  return {
    start: I(t) ? t : "",
    end: I(s) ? s : "",
    timezone: h(e.timezone)
  };
}
function Xe(e) {
  if (!v(e)) return null;
  const t = h(e.id), s = w(e.status, _e);
  return !t || !s ? null : {
    id: t,
    label: h(e.label) || t,
    ...$e(s, e.value, "bucket")
  };
}
function me(e) {
  if (!v(e)) return null;
  const t = h(e.id), s = w(e.kind, We), n = w(e.status, _e), a = T(e.buckets, k.buckets, Xe);
  if (!t || !s || !n || !a || j(a.map((l) => l.id))) return null;
  const i = $e(n, e.value, s), o = i.status === "known", c = o ? N(e.denominator) : null;
  return {
    id: t,
    label: h(e.label) || t,
    kind: s,
    unit: h(e.unit),
    population: h(e.population),
    time_scope: Ke(e.time_scope),
    denominator: c !== null && c >= 0 ? c : null,
    ...i,
    buckets: o && s === "distribution" ? a : [],
    sampling_method: h(e.sampling_method)
  };
}
function Qe(e, t) {
  if (!v(e)) return null;
  const s = Oe(e.selection), n = h(e.ref);
  return !s || !n || f(s) !== f(t) ? null : {
    selection: s,
    ref: n,
    verification_id: h(e.verification_id)
  };
}
var Ze = /* @__PURE__ */ new Set([
  "covered",
  "covered_empty",
  "partial"
]);
function et(e, t) {
  if (!v(e)) return null;
  const s = h(e.local_day);
  if (!I(s)) return null;
  const n = w(e.status, Ve), a = Qe(e.evidence, t);
  let i = n || "unavailable", o = n ? h(e.reason) : "unknown_status";
  const c = !a || t.context === "catalog_example" || i === "covered_empty" && !a.verification_id;
  return Ze.has(i) && c ? {
    local_day: s,
    timezone: h(e.timezone),
    status: "unavailable",
    evidence: null,
    reason: "unbound_evidence"
  } : {
    local_day: s,
    timezone: h(e.timezone),
    status: i,
    evidence: i === "policy_suppressed" ? null : a,
    reason: o
  };
}
function tt(e) {
  return v(e) ? {
    queries: Z(e.queries),
    records: Z(e.records)
  } : {
    queries: null,
    records: null
  };
}
function R(e, t, s = "") {
  if (!v(e)) return null;
  const n = ze(e, t), a = h(e.metric_set_id), i = T(e.metrics, k.metrics, me), o = T(e.coverage, k.days, (u) => et(u, t));
  if (!n || !i || !o || s && a !== s) return null;
  const c = o.map((u) => u.local_day);
  if (j(i.map((u) => u.id)) || j(c) || !Ge(c)) return null;
  const l = n.state === "available" || n.state === "empty";
  return {
    ...n,
    metric_set_id: a,
    equivalent_schema: h(e.equivalent_schema),
    metrics: l ? i : [],
    coverage: l ? o.sort((u, g) => u.local_day.localeCompare(g.local_day)) : [],
    work: tt(e.work)
  };
}
function ee(e, t) {
  if (e == null) return null;
  const s = me(e);
  return s && s.id === t ? s : void 0;
}
function st(e, t, s) {
  if (!v(e)) return null;
  const n = h(e.id), a = ee(e.left, n), i = ee(e.right, n);
  if (!n || a === void 0 || i === void 0) return null;
  const o = w(e.compatibility, Je) || "incompatible";
  if (a?.status === "suppressed" || i?.status === "suppressed") return {
    id: n,
    left: null,
    right: null,
    compatibility: "incompatible",
    delta: null,
    percent_change: null,
    reason: "policy_suppressed"
  };
  const c = t.provenance === "observed" && s.provenance === "observed", l = a?.status === "known" && i?.status === "known", u = o === "comparable" && c && l ? N(e.delta) : null, g = u !== null;
  let $ = h(e.reason);
  return o === "comparable" && !g && ($ = c ? "unknown_value" : "not_observed"), {
    id: n,
    left: a,
    right: i,
    compatibility: g ? "comparable" : "incompatible",
    delta: u,
    percent_change: g ? N(e.percent_change) : null,
    reason: $
  };
}
var O = {
  usages: [],
  usage_completeness: "unknown",
  expected_outcomes: []
};
function te(e) {
  if (!v(e)) return { ...O };
  const t = T(e.usages, k.usages, Re);
  return t ? {
    usages: t,
    usage_completeness: w(e.usage_completeness, Ie) || "unknown",
    expected_outcomes: Fe(e.expected_outcomes, k.outcomes)
  } : null;
}
function nt(e, t, s, n = "") {
  if (!v(e)) return null;
  const a = R(e.left, t, n), i = R(e.right, s, n);
  if (!a || !i) return null;
  const o = T(e.metrics, k.comparisons, (g) => st(g, a, i)), c = te(e.left_declarations), l = te(e.right_declarations);
  if (!o || !c || !l || j(o.map((g) => g.id))) return null;
  const u = a.state === "suppressed" || i.state === "suppressed";
  if (u) for (const g of [a, i])
    g.metrics = [], g.coverage = [];
  return {
    left: a,
    right: i,
    comparison_id: h(e.comparison_id),
    observed_at: h(e.observed_at),
    metrics: u ? [] : o,
    left_declarations: u ? { ...O } : c,
    right_declarations: u ? { ...O } : l
  };
}
function x(e, t) {
  return t === "count" ? Math.round(e).toLocaleString() : e.toLocaleString(void 0, { maximumFractionDigits: 2 });
}
function at(e, t) {
  if (t === null || !(t > 0)) return null;
  const s = e / t * 100;
  return Number.isFinite(s) ? s : null;
}
function be(e) {
  return `${e.toLocaleString(void 0, { maximumFractionDigits: 1 })}%`;
}
var ve = "−";
function ot(e, t) {
  if (e === 0) return "0";
  const s = x(Math.abs(e), t);
  return e > 0 ? `+${s}` : `${ve}${s}`;
}
function it(e) {
  if (e === 0) return "0%";
  const t = be(Math.abs(e));
  return e > 0 ? `+${t}` : `${ve}${t}`;
}
var ye = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
], rt = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
], lt = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
function ke(e) {
  const [t, s, n] = e.split("-").map(Number);
  return [
    t,
    s,
    n
  ];
}
function L(e) {
  const [t, s, n] = ke(e);
  return {
    year: t,
    month: s,
    date: n,
    weekday: new Date(Date.UTC(t, s - 1, n)).getUTCDay()
  };
}
function ct(e) {
  const { year: t, month: s, date: n, weekday: a } = L(e);
  return `${lt[a]} ${n} ${ye[s - 1]} ${t}`;
}
function K(e) {
  const { year: t, month: s, date: n } = L(e);
  return `${n} ${rt[s - 1]} ${t}`;
}
function dt(e, t) {
  return `${ye[t - 1]} ${e}`;
}
function xe(e) {
  const [t, s, n] = ke(e), a = new Date(Date.UTC(t, s - 1, n + 1));
  return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, "0")}-${String(a.getUTCDate()).padStart(2, "0")}`;
}
function P(e) {
  if (!e.start && !e.end) return "";
  const t = !e.end || e.start === e.end ? e.start : e.start ? `${e.start} to ${e.end}` : e.end;
  return e.timezone ? `${t} (${e.timezone})` : t;
}
var S = {
  unknown: "Unknown",
  suppressed: "Withheld",
  unavailable: "Unavailable"
}, y = {
  covered: {
    label: "Covered",
    glyph: "✓",
    description: "records verified for this day"
  },
  covered_empty: {
    label: "Covered — no records",
    glyph: "0",
    description: "verified, and the day has no records"
  },
  partial: {
    label: "Partially covered",
    glyph: "◐",
    description: "only part of this day is verified"
  },
  uncovered: {
    label: "Not covered",
    glyph: "–",
    description: "no verification covers this day"
  },
  policy_suppressed: {
    label: "Suppressed by policy",
    glyph: "⊘",
    description: "coverage withheld by policy"
  },
  unavailable: {
    label: "Unavailable",
    glyph: "?",
    description: "coverage could not be read"
  },
  not_reported: {
    label: "Not reported",
    glyph: "·",
    description: "the provider reported nothing for this day"
  }
}, ut = {
  not_supported: "Not offered by this dataset’s provider.",
  policy_suppressed: "Withheld by policy.",
  expected_only: "Expected by the catalog example; not verified.",
  unbound_evidence: "No verification evidence for this exact selection.",
  not_verified: "Not verified: no passed verification of this receipt covers this day.",
  unknown_status: "The reported coverage state is not recognized.",
  missing_metric: "Only one side reports this metric.",
  unknown_value: "At least one value is not known.",
  not_observed: "Example values are declarations, not observations, so no difference is computed.",
  partial_population: "At least one side is incomplete.",
  uncertified_schema: "The datasets do not certify equivalent metrics.",
  unit_mismatch: "Units or metric kinds differ.",
  population_mismatch: "Populations or sampling differ.",
  time_scope_mismatch: "Periods or timezones differ.",
  denominator_mismatch: "Denominators differ or are unknown.",
  numeric_range: "The difference is outside the supported range.",
  zero_baseline: "The baseline is zero, so a percentage is not defined.",
  percentage_unavailable: "A percentage could not be computed."
};
function z(e) {
  return e ? ut[e] || `${e.replace(/[_-]+/g, " ").replace(/^./, (t) => t.toUpperCase())}.` : "";
}
function pt(e) {
  return e.status !== "known" || e.value === null ? S[e.status === "known" ? "unknown" : e.status] : x(e.value, e.kind);
}
var ht = ge, se = {
  unconfigured: "Insights are not available on this installation.",
  invalid: "These insights could not be read. Choose the scenario again.",
  expired: "Your session expired. Reload the page to continue.",
  denied: "You do not have access to insights for this selection.",
  gone: "This selection is no longer available. Choose a current scenario or context.",
  stale: "The data changed since this view loaded. Refresh to read the current state.",
  unavailable: "Insights are temporarily unavailable.",
  timeout: "The insights took too long to read.",
  network: "The request could not reach the server.",
  malformed: "The server returned insights this page cannot read.",
  failed: "Insights failed.",
  canceled: "The request was canceled."
}, gt = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), ft = /* @__PURE__ */ new Set([
  "stale",
  "gone",
  "invalid"
]), ne = {
  chart: "Chart",
  table: "Table"
};
function _(e) {
  return `<span class="console-muted">${r(e)}</span>`;
}
function b(e) {
  return `<span class="console-insights__missing">${r(e)}</span>`;
}
var X = ' <span class="console-insights__tag" data-provenance="example" title="Declared by the provider, not observed">Example</span>';
function we(e, t, s = "display") {
  const n = `${e}-${s}`;
  return `<fieldset class="console-explorer__contexts console-insights__display"><legend class="console-explorer__legend">Show as</legend><div class="console-explorer__choices">${Object.keys(ne).map((a) => {
    const i = `${n}-${a}`;
    return `<label class="console-explorer__choice" for="${d(i)}"><input type="radio" id="${d(i)}" name="${d(n)}" value="${a}" data-insights-control="${d(s)}" data-explorer-focus="${d(`insights:${s}:${a}`)}"${a === t ? " checked" : ""}><span>${ne[a]}</span></label>`;
  }).join("")}</div></fieldset>`;
}
function q(e, t = "retry") {
  const s = e.kind in se ? e.kind : "failed", n = gt.has(s) ? `<button type="button" class="console-btn console-btn--sm" data-insights-action="${d(t)}" data-explorer-focus="${d(`insights:${t}`)}">Try again</button>` : ft.has(s) ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${s === "denied" || s === "expired" ? "error" : "warning"}" role="alert" data-insights-failure="${s}"><p>${r(se[s])}</p>${n ? `<div class="console-explorer__state-actions">${n}</div>` : ""}</div>`;
}
function Se(e, t = "") {
  const s = e.selection, n = t || "this scenario";
  return e.provenance === "example" ? "Catalog example: values the provider declares for this scenario. They are not observed and not verified." : e.provenance !== "observed" ? "Provenance unknown: these values may not be observed data." : s.context === "active" ? `Observed in what ${s.target_id} serves now for ${n} (generation ${s.generation}).` : `Observed in the prepared data for ${n} on ${s.target_id}.`;
}
function _t(e) {
  return e.completeness === "partial" ? '<div class="console-callout" data-tone="warning" data-insights-completeness="partial"><p>Partial: some values could not be read, so totals may be incomplete.</p></div>' : e.completeness === "unknown" ? '<p class="console-explorer__para console-muted" data-insights-completeness="unknown">Completeness unknown: the provider does not say whether every value was read.</p>' : "";
}
function $t(e) {
  const t = [e.observed_at ? `Read ${G(e.observed_at, ht)}` : "", e.metric_set_id ? `Metric set <code class="console-kv__mono">${r(e.metric_set_id)}</code>` : ""].filter(Boolean);
  return t.length > 0 ? `<p class="console-explorer__observed console-insights__read">${t.join(" · ")}</p>` : "";
}
function mt(e, t = "") {
  return `<p class="console-insights__provenance" data-provenance="${e.provenance === "example" || e.provenance === "observed" ? e.provenance : "unknown"}">${r(Se(e, t))}</p>${$t(e)}`;
}
function Ce(e) {
  const t = e.status === "known" && e.value !== null;
  return {
    metric: e,
    value: pt(e),
    known: t,
    period: P(e.time_scope),
    denominator: e.denominator === null ? "" : x(e.denominator, e.kind === "count" ? "count" : "sum"),
    sampling: e.sampling_method && e.sampling_method !== "unknown" ? e.sampling_method : ""
  };
}
function bt(e) {
  const t = Ce(e), s = e.denominator !== null && e.denominator > 0 ? e.denominator : null, n = Math.max(0, ...e.buckets.map((o) => o.status === "known" && o.value !== null ? o.value : 0)), a = e.buckets.map((o) => {
    const c = o.status === "known" && o.value !== null;
    if (!c) return {
      bucket: o,
      value: S[o.status === "known" ? "unknown" : o.status],
      known: c,
      share: "",
      width: 0
    };
    const l = o.value, u = at(l, s), g = s !== null ? l / s : n > 0 ? l / n : 0;
    return {
      bucket: o,
      value: x(l, "bucket"),
      known: c,
      share: u === null ? "" : be(u),
      width: Math.max(0, Math.min(100, Math.round(g * 1e3) / 10))
    };
  }), i = e.unit ? ` ${e.unit}` : "";
  return {
    row: t,
    buckets: a,
    scale: s !== null ? `Shares of ${x(s, "bucket")}${i} (declared denominator).` : e.denominator === 0 ? "The declared denominator is zero, so shares are not stated." : "Denominator unknown: bars compare categories with the largest one and no shares are stated.",
    caption: [e.population, t.period].filter(Boolean).join(" · ")
  };
}
function M(e) {
  return d(e);
}
function vt(e) {
  if (!e.known) return b(e.value);
  const t = e.metric.unit ? ` <span class="console-insights__unit">${r(e.metric.unit)}</span>` : "";
  return `<span class="console-insights__number">${r(e.value)}</span>${t}`;
}
function yt(e) {
  return [
    e.metric.population,
    e.period,
    e.denominator ? `Denominator ${e.denominator}${e.metric.unit ? ` ${e.metric.unit}` : ""}` : "",
    e.sampling ? `Sampling: ${e.sampling}` : ""
  ].filter(Boolean);
}
function kt(e, t) {
  const s = yt(e);
  return `<li class="console-insights__stat" data-metric-id="${d(e.metric.id)}" data-status="${M(e.known ? "known" : e.metric.status)}">
      <span class="console-insights__stat-label">${r(e.metric.label)}${t ? X : ""}</span>
      <span class="console-insights__stat-value">${vt(e)}</span>
      ${s.length > 0 ? `<span class="console-insights__stat-meta">${r(s.join(" · "))}</span>` : ""}
    </li>`;
}
function xt(e, t, s, n) {
  const { row: a } = t, i = `${e}-distribution-${n}`, o = a.known ? `Total ${a.value}${a.metric.unit ? ` ${a.metric.unit}` : ""}` : `Total ${a.value.toLowerCase()}`, c = a.known ? t.buckets.length === 0 ? `<p class="console-explorer__para">${_("No categories reported.")}</p>` : `<ul class="console-insights__bars" aria-labelledby="${d(i)}">${t.buckets.map((l) => `
          <li class="console-insights__bar-row" data-bucket-id="${d(l.bucket.id)}" data-status="${M(l.known ? "known" : l.bucket.status)}">
            <span class="console-insights__bar-label">${r(l.bucket.label)}</span>
            <span class="console-insights__bar-track" aria-hidden="true"><span class="console-insights__bar-fill" style="width:${l.width}%"></span></span>
            <span class="console-insights__bar-value">${l.known ? `<span class="console-insights__number">${r(l.value)}</span>` : b(l.value)}${l.share ? ` <span class="console-muted">(${r(l.share)})</span>` : ""}</span>
          </li>`).join("")}
        </ul>` : `<p class="console-explorer__para">${b(`${a.value}: categories are not shown.`)}</p>`;
  return `<figure class="console-insights__distribution" data-metric-id="${d(a.metric.id)}" data-status="${M(a.known ? "known" : a.metric.status)}">
      <figcaption class="console-insights__figcaption"><span class="console-insights__figure-title" id="${d(i)}">${r(a.metric.label)}</span>${s ? X : ""}<span class="console-muted">${r([o, t.caption].filter(Boolean).join(" · "))}</span></figcaption>
      ${c}
      ${a.known && t.buckets.length > 0 ? `<p class="console-insights__scale console-muted">${r(t.scale)}${a.sampling ? ` Sampling: ${r(a.sampling)}.` : ""}</p>` : ""}
    </figure>`;
}
function p(e, t, s = "") {
  return `<td data-label="${d(e)}"${s}>${t}</td>`;
}
function wt(e, t) {
  const s = e.map((n) => `<tr data-metric-id="${d(n.metric.id)}" data-status="${M(n.known ? "known" : n.metric.status)}">${[
    p("Metric", `<span class="console-cell-title">${r(n.metric.label)}</span>`),
    p("Value", n.known ? `<span class="console-insights__number">${r(n.value)}</span>` : b(n.value), ' class="console-insights__numeric"'),
    p("Unit", n.metric.unit ? r(n.metric.unit) : _("—")),
    p("Population", n.metric.population ? r(n.metric.population) : _("Not declared")),
    p("Period", n.period ? r(n.period) : _("Unknown")),
    p("Denominator", n.denominator ? r(n.denominator) : _(n.known ? "Not declared" : "—")),
    p("Sampling", n.sampling ? r(n.sampling) : _("Not stated"))
  ].join("")}</tr>`).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="totals"><caption class="console-explorer__caption">${t ? "Totals (example values declared by the provider, not observed)" : "Totals"}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Unit</th><th scope="col">Population</th><th scope="col">Period</th><th scope="col">Denominator</th><th scope="col">Sampling</th></tr></thead><tbody>${s}</tbody></table></div>`;
}
function St(e, t) {
  const { row: s } = e, n = s.known ? `Total ${s.value}${s.metric.unit ? ` ${s.metric.unit}` : ""}` : `Total ${s.value.toLowerCase()}`, a = `${s.metric.label}${t ? " (example values)" : ""} · ${[n, e.caption].filter(Boolean).join(" · ")}`;
  if (!s.known || e.buckets.length === 0) {
    const o = s.known ? "No categories reported." : `${s.value}: categories are not shown.`;
    return `<div class="console-insights__distribution-table" data-metric-id="${d(s.metric.id)}"><p class="console-explorer__caption">${r(a)}</p><p class="console-explorer__para">${s.known ? _(o) : b(o)}</p></div>`;
  }
  const i = e.buckets.map((o) => `<tr data-bucket-id="${d(o.bucket.id)}" data-status="${M(o.known ? "known" : o.bucket.status)}">${[
    p("Category", r(o.bucket.label)),
    p("Value", o.known ? `<span class="console-insights__number">${r(o.value)}</span>` : b(o.value), ' class="console-insights__numeric"'),
    p("Share", o.share ? r(o.share) : _("—"), ' class="console-insights__numeric"')
  ].join("")}</tr>`).join("");
  return `<div class="console-explorer__table-wrap console-insights__distribution-table" data-metric-id="${d(s.metric.id)}"><table class="console-table console-insights__table" data-insights-table="distribution"><caption class="console-explorer__caption">${r(a)}</caption><thead><tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead><tbody>${i}</tbody></table><p class="console-insights__scale console-muted">${r(e.scale)}${s.sampling ? ` Sampling: ${r(s.sampling)}.` : ""}</p></div>`;
}
function Ct(e, t, s) {
  const n = t.metrics.filter((l) => l.kind !== "distribution").map(Ce), a = t.metrics.filter((l) => l.kind === "distribution").map(bt), i = `<h5 class="console-insights__heading" id="${d(`${e}-composition`)}">Composition</h5>`;
  if (n.length === 0 && a.length === 0) return `<section class="console-insights__group" aria-labelledby="${d(`${e}-composition`)}" data-insights-group="composition">${i}<p class="console-explorer__para">${_("No metrics reported for this selection.")}</p></section>`;
  const o = t.provenance === "example", c = s === "table" ? `${n.length > 0 ? wt(n, o) : ""}${a.map((l) => St(l, o)).join("")}` : `${n.length > 0 ? `<ul class="console-insights__stats" aria-label="${o ? "Totals (example values)" : "Totals"}">${n.map((l) => kt(l, o)).join("")}</ul>` : ""}${a.map((l, u) => xt(e, l, o, u)).join("")}`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-composition`)}" data-insights-group="composition" data-insights-display="${s}">${i}${c}</section>`;
}
function F(e) {
  if (e.length === 0) return [];
  const t = new Map(e.map((a) => [a.local_day, a])), s = e[e.length - 1].local_day, n = [];
  for (let a = e[0].local_day; a <= s && n.length <= 92; a = xe(a)) {
    const i = t.get(a);
    n.push({
      day: a,
      status: i ? i.status : "not_reported",
      entry: i
    });
  }
  return n;
}
function V(e) {
  const t = new Set(e.map((s) => s.timezone).filter(Boolean));
  return t.size === 1 ? [...t][0] : "";
}
function Q(e) {
  if (!e) return "";
  const t = e.evidence;
  return t ? [t.verification_id ? `Verification ${t.verification_id}` : "Provider evidence", `ref ${t.ref}`].join(" · ") : z(e.reason);
}
function ae(e, t) {
  const s = y[e.status], n = !t && e.entry?.timezone ? ` (${e.entry.timezone})` : "";
  return `${ct(e.day)}${n}: ${s.label}`;
}
function W(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => t.set(s.status, (t.get(s.status) || 0) + 1)), `<ul class="console-insights__legend" aria-label="Coverage legend">${Object.keys(y).filter((s) => t.has(s)).map((s) => {
    const n = t.get(s) || 0;
    return `<li data-status="${s}"><span class="console-insights__swatch" data-status="${s}" aria-hidden="true">${r(y[s].glyph)}</span><span>${r(y[s].label)}</span><span class="console-muted">${n} ${n === 1 ? "day" : "days"}</span></li>`;
  }).join("")}</ul>`;
}
var Tt = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
];
function Te(e, t, s) {
  const n = [];
  return t.forEach((a) => {
    const { year: i, month: o } = L(a.day), c = `${i}-${o}`, l = n[n.length - 1];
    l?.key === c ? l.days.push(a) : n.push({
      key: c,
      label: dt(i, o),
      days: [a]
    });
  }), `<div class="console-insights__months">${n.map((a, i) => {
    const o = `${e}-coverage-month-${i}`, c = a.days.map((l, u) => {
      const g = y[l.status], { date: $, weekday: m } = L(l.day), je = u === 0 ? ` console-insights__day--col-${(m + 6) % 7 + 1}` : "", Le = Q(l.entry), Ue = [ae(l, s), Le].filter(Boolean).join(" · ");
      return `<li class="console-insights__day${je}" data-status="${l.status}" data-local-day="${d(l.day)}" title="${d(Ue)}"><span class="console-insights__day-number" aria-hidden="true">${$}</span><span class="console-insights__day-glyph" aria-hidden="true">${r(g.glyph)}</span><span class="console-sr-only">${r(ae(l, s))}</span></li>`;
    }).join("");
    return `<section class="console-insights__month" aria-labelledby="${d(o)}"><h6 class="console-insights__month-title" id="${d(o)}">${r(a.label)}</h6><div class="console-insights__weekdays" aria-hidden="true">${Tt.map((l) => `<span>${l}</span>`).join("")}</div><ol class="console-insights__days">${c}</ol></section>`;
  }).join("")}</div>`;
}
function Nt(e, t) {
  const s = !t, n = e.map((i) => {
    const o = y[i.status], c = Q(i.entry);
    return `<tr data-local-day="${d(i.day)}" data-status="${i.status}">${[
      p("Local day", `<span class="console-cell-main"><span class="console-cell-title">${r(K(i.day))}</span><code class="console-cell-sub console-kv__mono">${r(i.day)}</code></span>`),
      s ? p("Timezone", i.entry?.timezone ? r(i.entry.timezone) : _("Unknown")) : "",
      p("Coverage", `<span class="console-insights__state" data-status="${i.status}"><span class="console-insights__swatch" data-status="${i.status}" aria-hidden="true">${r(o.glyph)}</span>${r(o.label)}</span>`),
      p("Evidence", c ? r(c) : _("None"))
    ].join("")}</tr>`;
  }).join(""), a = t ? `Coverage by local day (${t})` : "Coverage by local day";
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="coverage"><caption class="console-explorer__caption">${r(a)}</caption><thead><tr><th scope="col">Local day</th>${s ? '<th scope="col">Timezone</th>' : ""}<th scope="col">Coverage</th><th scope="col">Evidence</th></tr></thead><tbody>${n}</tbody></table></div>`;
}
function Mt(e, t) {
  const s = t ? `Local days in ${t}. ` : "", n = e.selection.context === "catalog_example" ? "A catalog example is never coverage: its expected dates read as not covered until a verification of an exact receipt covers them." : "Covered days are backed by verification evidence for exactly this selection; expected or example dates never count as coverage.";
  return `<p class="console-explorer__para console-muted">${r(s + n)}</p>`;
}
function At(e, t, s) {
  const n = `<h5 class="console-insights__heading" id="${d(`${e}-coverage`)}">Coverage</h5>`, a = F(t.coverage), i = V(t.coverage), o = a.length === 0 ? `<p class="console-explorer__para" data-insights-coverage="none">${_("No coverage reported for this period.")}</p>` : s === "table" ? Nt(a, i) : `${W(a)}${Te(e, a, i)}`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-coverage`)}" data-insights-group="coverage" data-insights-display="${s}">${n}${Mt(t, i)}${o}</section>`;
}
function Dt(e) {
  return !e || e.status === "loading" ? '<div class="console-explorer__loading" role="status" aria-busy="true">Loading insights…</div>' : e.status === "failed" ? q(e.failure) : e.value.state === "suppressed" ? '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="suppressed"><p>Insights for this selection are hidden by policy.</p></div>' : e.value.state === "unsupported" ? '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="unsupported"><p>This dataset’s provider does not offer composition or coverage insights for this selection. Descriptions and record previews remain available.</p></div>' : "";
}
function Et(e) {
  const t = `<div class="console-insights__toolbar"><p class="console-explorer__para console-muted">Composition and coverage of the data shown above, read on demand and bounded by the provider.</p>${we(e.scope, e.display)}</div>`, s = Dt(e.entry);
  if (s || e.entry?.status !== "ready") return `<div class="console-insights" data-insights-view="insights">${t}${s}</div>`;
  const n = e.entry.value, a = n.state === "empty" ? '<p class="console-explorer__para" data-insights-state="empty">This selection contains no records.</p>' : "";
  return `<div class="console-insights" data-insights-view="insights">
      ${t}
      ${mt(n, e.title)}
      ${_t(n)}${a}
      ${Ct(e.scope, n, e.display)}
      ${At(e.scope, n, e.display)}
    </div>`;
}
var Ne = ge, jt = {
  catalog_example: "Catalog example",
  prepared: "Prepared receipt",
  active: "Active data"
}, Lt = {
  screen: "Screen",
  report: "Report",
  workflow: "Workflow",
  target: "Managed target"
}, Ut = {
  prepare: "Prepare",
  verify: "Verify",
  activate: "Activate"
};
function ms(e) {
  return (t) => e.find((s) => s.provider === t.dataset.provider && s.datasetId === t.dataset.id && s.version === t.dataset.version)?.scenarios.find((s) => s.scenarioId === t.scenario.id && s.version === t.scenario.version)?.label || `${t.scenario.id} v${t.scenario.version}`;
}
function Me(e) {
  return `${e.dataset.provider}/${e.dataset.id} v${e.dataset.version}`;
}
function Ae(e, t) {
  return e.dataset.provider === t.dataset.provider && e.dataset.id === t.dataset.id && e.dataset.version === t.dataset.version && e.dataset.digest === t.dataset.digest;
}
function Bt(e, t, s) {
  const n = [
    e.receipt_id ? `receipt ${fe(e.receipt_id)}` : "no receipt",
    e.content_revision ? `content revision ${e.content_revision}` : "",
    e.generation !== void 0 ? `generation ${e.generation}` : "",
    `target ${e.target_id}`
  ].filter(Boolean).join(" · ");
  return {
    title: s(e),
    context: jt[e.context],
    identity: n,
    dataset: Ae(e, t) ? "" : Me(e)
  };
}
function It(e, t, s, n) {
  const a = /* @__PURE__ */ new Set([f(t)]), i = [];
  if (s && s.context === "active" && s.target_id === t.target_id && !a.has(f(s))) {
    a.add(f(s));
    const o = Ae(s, t) ? "" : ` (${Me(s)})`;
    i.push({
      key: f(s),
      selection: s,
      active: !0,
      label: `Active data on ${s.target_id}: ${n(s)}${o} (generation ${s.generation})`
    });
  }
  for (const o of e.scenarios) for (const c of ["catalog_example", "prepared"]) {
    const l = o.selections[c];
    if (!l || l.target_id !== t.target_id || a.has(f(l))) continue;
    a.add(f(l));
    const u = c === "prepared" ? `${n(l)}: prepared data (${fe(l.receipt_id)})` : `${n(l)}: catalog example`;
    i.push({
      key: f(l),
      selection: l,
      active: !1,
      label: u
    });
  }
  return i;
}
function Rt(e, t) {
  return t.active ? {
    left: t.selection,
    right: e
  } : {
    left: e,
    right: t.selection
  };
}
function Ot(e) {
  const t = e.candidates.some((i) => i.key === e.choice), s = e.candidates.map((i) => `<option value="${d(i.key)}"${i.key === e.choice ? " selected" : ""}>${r(i.label)}</option>`).join(""), n = `<option value=""${e.choice ? "" : " selected"}>Choose what to compare with…</option>`, a = e.choice && !t ? '<option value="" selected disabled>The chosen selection is no longer offered</option>' : "";
  return `<div class="console-insights__toolbar"><div class="console-insights__compare-controls">${`<label class="console-filter console-insights__picker">Compare with<select data-insights-control="compare" data-explorer-focus="insights:compare"${e.candidates.length === 0 || e.prerequisite?.status === "blocked" ? " disabled" : ""}>${a || n}${s}</select></label>`}${`<button type="button" class="console-btn console-btn--sm" data-insights-action="swap" data-explorer-focus="insights:swap"${e.pair && !e.stale && !e.prerequisite ? "" : ' aria-disabled="true"'}>Swap A and B</button>`}</div>${we(e.scope, e.display)}</div>`;
}
function Pt(e) {
  if (!e) return "";
  const t = e.provenance === "example" ? "Example values, not observed" : e.provenance === "observed" ? "Observed" : "Provenance unknown", s = e.completeness === "complete" ? "Complete" : e.completeness === "partial" ? "Partial" : "Completeness unknown", n = e.state === "unsupported" ? "Insights not offered by this provider" : e.state === "suppressed" ? "Withheld by policy" : "", a = e.observed_at ? `Read ${G(e.observed_at, Ne)}` : "";
  return `<p class="console-insights__side-evidence console-muted">${[
    r(n),
    r(t),
    r(s),
    a
  ].filter(Boolean).join(" · ")}</p>`;
}
function zt(e, t, s, n) {
  return [
    n,
    f(t) === f(e.shown) ? "Shown selection" : t.context === "active" ? "" : "Compared selection",
    s === "a" ? "Baseline" : ""
  ].filter(Boolean).join(" · ");
}
function oe(e, t, s, n) {
  const a = e.describe(s), i = `${e.scope}-side-${t}`, o = t.toUpperCase();
  return `<section class="console-insights__side" data-side="${t}" aria-labelledby="${d(i)}">
      <div class="console-insights__side-head"><span class="console-insights__side-badge" aria-hidden="true">${o}</span><h5 class="console-insights__side-title" id="${d(i)}"><span class="console-sr-only">${o}${t === "a" ? ", baseline" : ""}: </span>${r(a.title)}</h5></div>
      <p class="console-insights__side-context">${r(zt(e, s, t, a.context))}</p>
      <p class="console-insights__side-identity console-muted">${r([a.dataset, a.identity].filter(Boolean).join(" · "))}</p>
      ${Pt(n)}
    </section>`;
}
function ie(e, t) {
  return t ? {
    text: S.suppressed,
    known: !1,
    value: null
  } : e ? e.status !== "known" || e.value === null ? {
    text: S[e.status === "known" ? "unknown" : e.status],
    known: !1,
    value: null
  } : {
    text: x(e.value, e.kind),
    known: !0,
    value: e.value
  } : {
    text: "Not reported",
    known: !1,
    value: null
  };
}
function qt(e, t) {
  const s = e || t;
  if (!s) return "";
  const n = e ? P(e.time_scope) : "", a = t ? P(t.time_scope) : "", i = n && a && n !== a ? `A ${n}; B ${a}` : n || a;
  return [s.population, i].filter(Boolean).join(" · ");
}
function Ft(e) {
  const t = e.left || e.right, s = e.reason === "policy_suppressed", n = t?.kind || "sum", a = e.compatibility === "comparable" && e.delta !== null, i = a ? e.percent_change !== null ? it(e.percent_change) : e.reason === "zero_baseline" ? "Not defined (zero baseline)" : "Not available" : "—", o = a ? e.reason && e.reason !== "zero_baseline" ? z(e.reason) : e.delta === 0 ? "No change." : "" : z(e.reason) || "These values are not comparable.";
  return {
    comparison: e,
    label: t?.label || e.id,
    unit: t?.unit || "",
    kind: n,
    scope: qt(e.left, e.right),
    a: ie(e.left, s),
    b: ie(e.right, s),
    difference: a ? ot(e.delta, n) : "Not compared",
    change: i,
    note: o,
    comparable: a
  };
}
function Vt(e, t) {
  return e === null || !(t > 0) ? 0 : Math.max(0, Math.min(100, Math.round(Math.abs(e) / t * 1e3) / 10));
}
function A(e, t, s, n, a) {
  const i = e.toUpperCase(), o = t.known ? `<span class="console-insights__number">${r(t.text)}</span>${n ? ` <span class="console-muted">${r(n)}</span>` : ""}` : b(t.text);
  return `<div class="console-insights__pair-row" data-side="${e}" data-status="${t.known ? "known" : "missing"}"${a ? ' data-provenance="example"' : ""}><span class="console-insights__pair-side" aria-hidden="true">${i}</span><span class="console-insights__bar-track" aria-hidden="true"><span class="console-insights__bar-fill" style="width:${Vt(t.value, s)}%"></span></span><span class="console-insights__bar-value"><span class="console-sr-only">${i}: </span>${o}${a ? X : ""}</span></div>`;
}
function re(e, t) {
  return t[e] ? `${e.toUpperCase()} (example)` : e.toUpperCase();
}
function Wt(e) {
  const t = e.note ? `<span class="console-insights__delta-note">${r(e.note)}</span>` : "";
  if (!e.comparable) return `<p class="console-insights__delta" data-compatibility="incompatible"><span class="console-insights__delta-label">Difference (B − A)</span> <span class="console-insights__delta-value">${b(e.difference)}</span>${t}</p>`;
  const s = e.unit ? ` ${r(e.unit)}` : "";
  return `<p class="console-insights__delta" data-compatibility="comparable"><span class="console-insights__delta-label">Difference (B − A)</span> <strong class="console-insights__delta-value console-insights__number">${r(e.difference)}</strong>${s} <span class="console-insights__delta-change">Change ${r(e.change)}</span>${t}</p>`;
}
function le(e, t) {
  return t ? e ? e.status !== "known" || e.value === null ? {
    text: S[e.status === "known" ? "unknown" : e.status],
    known: !1,
    value: null
  } : {
    text: x(e.value, "bucket"),
    known: !0,
    value: e.value
  } : {
    text: t.status === "known" ? "Not reported" : S[t.status],
    known: !1,
    value: null
  } : {
    text: "Not reported",
    known: !1,
    value: null
  };
}
function De(e) {
  const { left: t, right: s } = e.comparison;
  if (e.kind !== "distribution" || !t?.buckets.length && !s?.buckets.length) return [];
  const n = [], a = /* @__PURE__ */ new Map();
  return [t, s].forEach((i) => i?.buckets.forEach((o) => {
    a.has(o.id) || (n.push(o.id), a.set(o.id, o.label));
  })), n.map((i) => ({
    id: i,
    label: a.get(i) || i,
    a: le(t?.buckets.find((o) => o.id === i), t),
    b: le(s?.buckets.find((o) => o.id === i), s)
  }));
}
function Jt(e, t) {
  const s = Math.max(0, ...[e.a.value, e.b.value].filter((o) => o !== null).map(Math.abs)), n = De(e), a = Math.max(0, ...n.flatMap((o) => [o.a.value, o.b.value]).filter((o) => o !== null).map(Math.abs)), i = n.length === 0 ? "" : `<ul class="console-insights__pair-buckets" aria-label="${d(`${e.label} by category`)}">${n.map((o) => `<li class="console-insights__pair-bucket" data-bucket-id="${d(o.id)}"><span class="console-insights__bar-label">${r(o.label)}</span>${A("a", o.a, a, "", t.a)}${A("b", o.b, a, "", t.b)}</li>`).join("")}</ul>`;
  return `<li class="console-insights__pair" data-metric-id="${d(e.comparison.id)}" data-compatibility="${e.comparable ? "comparable" : "incompatible"}">
      <div class="console-insights__pair-head"><span class="console-insights__pair-label">${r(e.label)}</span>${e.scope ? `<span class="console-muted">${r(e.scope)}</span>` : ""}</div>
      <div class="console-insights__pair-bars">${A("a", e.a, s, e.unit, t.a)}${A("b", e.b, s, e.unit, t.b)}</div>
      ${Wt(e)}
      ${i}
    </li>`;
}
function D(e, t) {
  return p(e, t.known ? `<span class="console-insights__number">${r(t.text)}</span>` : b(t.text), ' class="console-insights__numeric"');
}
function J(e, t) {
  return t.a && t.b ? `${e} (example values declared by the providers, not observed)` : t.a || t.b ? `${e} (${t.a ? "A" : "B"} shows example values declared by the provider, not observed)` : e;
}
function Ht(e, t) {
  const s = re("a", t), n = re("b", t), a = e.map((o) => `<tr data-metric-id="${d(o.comparison.id)}" data-compatibility="${o.comparable ? "comparable" : "incompatible"}">${[
    p("Metric", `<span class="console-cell-main"><span class="console-cell-title">${r(o.label)}</span>${o.scope ? `<span class="console-cell-sub">${r(o.scope)}</span>` : ""}</span>`),
    p("Unit", o.unit ? r(o.unit) : _("—")),
    D(s, o.a),
    D(n, o.b),
    p("Difference (B − A)", o.comparable ? `<strong class="console-insights__number">${r(o.difference)}</strong>` : b(o.difference), ' class="console-insights__numeric"'),
    p("Change", o.comparable ? r(o.change) : _(o.change), ' class="console-insights__numeric"'),
    p("Notes", o.note ? r(o.note) : _("—"))
  ].join("")}</tr>`).join(""), i = e.map((o) => {
    const c = De(o);
    if (c.length === 0) return "";
    const l = c.map((u) => `<tr data-bucket-id="${d(u.id)}">${[
      p("Category", r(u.label)),
      D(s, u.a),
      D(n, u.b)
    ].join("")}</tr>`).join("");
    return `<div class="console-explorer__table-wrap" data-metric-id="${d(o.comparison.id)}"><table class="console-table console-insights__table" data-insights-table="compare-categories"><caption class="console-explorer__caption">${r(J(`${o.label} by category`, t))}</caption><thead><tr><th scope="col">Category</th><th scope="col">${s}</th><th scope="col">${n}</th></tr></thead><tbody>${l}</tbody></table></div>`;
  }).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare"><caption class="console-explorer__caption">${r(J("Metrics", t))}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Unit</th><th scope="col">${s}</th><th scope="col">${n}</th><th scope="col">Difference (B − A)</th><th scope="col">Change</th><th scope="col">Notes</th></tr></thead><tbody>${a}</tbody></table></div>${i}`;
}
function Yt(e, t, s) {
  const n = t.metrics.map(Ft), a = {
    a: t.left.provenance === "example",
    b: t.right.provenance === "example"
  }, i = a.a || a.b, o = `<h5 class="console-insights__heading" id="${d(`${e}-compare-metrics`)}">Composition</h5>`, c = i ? "At least one side shows example values declared by the provider. Values appear side by side; no difference is computed." : "Differences are computed by the server only for comparable observed values with the same unit, population, period and denominator.", l = n.length === 0 ? `<p class="console-explorer__para">${_("No metrics reported for either side.")}</p>` : s === "table" ? Ht(n, a) : `<ul class="console-insights__pairs" aria-label="${d(J("Metrics", a))}">${n.map((u) => Jt(u, a)).join("")}</ul>`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-compare-metrics`)}" data-insights-group="compare-metrics" data-insights-display="${s}">${o}<p class="console-explorer__para console-muted">${r(c)}</p>${l}</section>`;
}
var Gt = 184;
function Kt(e, t) {
  const s = [...e.coverage, ...t.coverage].map((i) => i.local_day).sort();
  if (s.length === 0) return {
    days: [],
    a: [],
    b: []
  };
  const n = [];
  for (let i = s[0]; i <= s[s.length - 1]; i = xe(i)) {
    if (n.length >= Gt) return null;
    n.push(i);
  }
  const a = (i) => {
    const o = new Map(i.coverage.map((c) => [c.local_day, c]));
    return n.map((c) => {
      const l = o.get(c);
      return {
        day: c,
        status: l ? l.status : "not_reported",
        entry: l
      };
    });
  };
  return {
    days: n,
    a: a(e),
    b: a(t)
  };
}
function H(e, t) {
  const s = y[t.status], n = Q(t.entry);
  return p(e, `<span class="console-insights__state" data-status="${t.status}"><span class="console-insights__swatch" data-status="${t.status}" aria-hidden="true">${r(s.glyph)}</span>${r(s.label)}</span>${n ? `<span class="console-cell-sub">${r(n)}</span>` : ""}`);
}
function E(e, t, s, n, a) {
  const i = t.toUpperCase(), o = n.length === 0 ? `<p class="console-explorer__para">${_("No coverage reported.")}</p>` : Te(`${e}-${t}`, n, a);
  return `<section class="console-insights__coverage-side" data-side="${t}" aria-label="${d(`${i}: ${s}`)}"><h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${i}</span>${r(s)}</h6>${o}</section>`;
}
function ce(e, t, s, n) {
  const a = e.toUpperCase();
  if (s.length === 0) return `<p class="console-explorer__para">${_(`${a}: no coverage reported.`)}</p>`;
  const i = s.map((o) => `<tr data-local-day="${d(o.day)}" data-side-${e}="${o.status}">${p("Local day", r(K(o.day)))}${H(a, o)}</tr>`).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage-${e}"><caption class="console-explorer__caption">${r(`${a}: ${t}${n ? ` (${n})` : ""}`)}</caption><thead><tr><th scope="col">Local day</th><th scope="col">${a}</th></tr></thead><tbody>${i}</tbody></table></div>`;
}
function Xt(e, t, s) {
  const n = e.scope, a = `<h5 class="console-insights__heading" id="${d(`${n}-compare-coverage`)}">Coverage</h5>`, i = {
    a: e.describe(t.left.selection).title,
    b: e.describe(t.right.selection).title
  }, o = {
    a: V(t.left.coverage),
    b: V(t.right.coverage)
  }, c = o.a && o.a === o.b ? `Local days in ${o.a}. ` : o.a || o.b ? `Local days in ${o.a || "an unknown timezone"} (A) and ${o.b || "an unknown timezone"} (B). ` : "", l = `<p class="console-explorer__para console-muted">${r(`${c}Covered days need verification evidence for exactly that side's selection; example dates never count as coverage.`)}</p>`, u = Kt(t.left, t.right);
  let g;
  if (u && u.days.length === 0) g = `<p class="console-explorer__para" data-insights-coverage="none">${_("No coverage reported for either side.")}</p>`;
  else if (u) g = s === "table" ? `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage"><caption class="console-explorer__caption">Coverage by local day</caption><thead><tr><th scope="col">Local day</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>${u.days.map(($, m) => `<tr data-local-day="${d($)}" data-side-a="${u.a[m].status}" data-side-b="${u.b[m].status}">${p("Local day", `<span class="console-cell-main"><span class="console-cell-title">${r(K($))}</span><code class="console-cell-sub console-kv__mono">${r($)}</code></span>`)}${H("A", u.a[m])}${H("B", u.b[m])}</tr>`).join("")}</tbody></table></div>` : `${W([...u.a, ...u.b])}<div class="console-insights__coverage-pair">${E(n, "a", i.a, u.a, o.a)}${E(n, "b", i.b, u.b, o.b)}</div>`;
  else {
    const $ = F(t.left.coverage), m = F(t.right.coverage);
    g = s === "table" ? `${ce("a", i.a, $, o.a)}${ce("b", i.b, m, o.b)}` : `${W([...$, ...m])}<div class="console-insights__coverage-pair">${E(n, "a", i.a, $, o.a)}${E(n, "b", i.b, m, o.b)}</div>`;
  }
  return `<section class="console-insights__group" aria-labelledby="${d(`${n}-compare-coverage`)}" data-insights-group="compare-coverage" data-insights-display="${s}">${a}${l}${g}</section>`;
}
function Qt(e) {
  return e.usages.length === 0 ? `<p class="console-explorer__para">${_(e.usage_completeness === "complete" ? "No usage declared." : "No usage declared: impact on application features is unknown.")}</p>` : `<ul class="console-insights__usages">${e.usages.map((t) => {
    const s = [
      "prepare",
      "verify",
      "activate"
    ].map((n) => {
      const a = t.effects.filter((i) => i.phase === n).map((i) => i.description || "Declared without a description");
      return `<li><span class="console-insights__phase">${Ut[n]}</span> ${a.length > 0 ? r(a.join("; ")) : '<span class="console-kv__empty">Not declared — effect unknown</span>'}</li>`;
    }).join("");
    return `<li class="console-insights__usage"><span class="console-insights__usage-label">${r(t.label)}</span> <span class="console-muted">${r(Lt[t.kind])}</span><ul class="console-insights__effects">${s}</ul></li>`;
  }).join("")}</ul>${e.usage_completeness === "complete" ? "" : '<p class="console-explorer__para console-muted">Other uses may exist; this list is declared, not discovered.</p>'}`;
}
function Zt(e) {
  return e.expected_outcomes.length === 0 ? `<p class="console-explorer__para">${_("No expected outcomes declared.")}</p>` : `<ul class="console-explorer__list">${e.expected_outcomes.map((t) => `<li>${r(t)}</li>`).join("")}</ul>`;
}
function es(e, t) {
  const s = e.scope, n = JSON.stringify(t.left_declarations) === JSON.stringify(t.right_declarations), a = (i, o, c) => `<div class="console-insights__declared" data-side="${i}">
        <h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${i.toUpperCase()}</span>${r(e.describe(o).title)}</h6>
        <span class="console-explorer__label">Expected outcomes (declared, not verified)</span>${Zt(c)}
        <span class="console-explorer__label">Declared usage and effects</span>${Qt(c)}
      </div>`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${s}-compare-declared`)}" data-insights-group="compare-declarations">
      <h5 class="console-insights__heading" id="${d(`${s}-compare-declared`)}">Declared outcomes and usage</h5>
      <p class="console-explorer__para console-muted">${r(`Declared by each dataset’s provider. Declarations are not executed checks or observed effects.${n ? " Both sides declare the same outcomes and usage." : ""}`)}</p>
      <div class="console-insights__declared-pair">${a("a", t.left.selection, t.left_declarations)}${a("b", t.right.selection, t.right_declarations)}</div>
    </section>`;
}
function C(e, t) {
  return `<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="${d(t)}"><p>${r(e)}</p></div>`;
}
function ts(e, t) {
  const s = t ? "Compare with the current data" : "Choose again";
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-insights-state="stale"><p>${r(e)}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-insights-action="compare-current" data-explorer-focus="insights:compare-current">${s}</button></div></div>`;
}
function ss(e) {
  const t = [e.left.state === "unsupported" ? "A" : "", e.right.state === "unsupported" ? "B" : ""].filter(Boolean);
  return t.length === 0 ? "" : C(`${t.length === 2 ? "Neither side’s provider offers" : `The provider of ${t[0]} does not offer`} composition or coverage insights for its selection, so its values are not shown.`, "unsupported");
}
function de(e) {
  return `<div class="console-explorer__loading" role="status" aria-busy="true">${r(e)}</div>`;
}
function ns(e) {
  const t = e.left.provenance === "example", s = e.right.provenance === "example";
  if (!t && !s) return "";
  const n = t && s ? "Both sides are catalog examples: values the providers declare. They are not observed, so no difference is computed." : `${t ? "A" : "B"} is a catalog example: ${Se(t ? e.left : e.right).replace(/^Catalog example: /, "")} No difference is computed against it.`;
  return `<p class="console-insights__provenance" data-provenance="example">${r(n)}</p>`;
}
function as(e) {
  if (e.stale) return ts(e.stale, e.staleCurrent !== !1);
  const t = e.prerequisite;
  if (t?.status === "failed") return q(t.failure, "compare-retry");
  if (t?.status === "loading") return de("Reading the data shown…");
  const s = e.entry;
  return !s || s.status === "loading" ? de("Comparing…") : s.status === "failed" ? q(s.failure, "compare-retry") : s.value.left.state === "suppressed" || s.value.right.state === "suppressed" ? C("This comparison is hidden by policy: at least one side is withheld, so neither side’s values are shown.", "suppressed") : "";
}
function os(e) {
  const t = `<p class="console-explorer__para console-muted">Compare the data shown with another scenario, receipt or the active data. A is the baseline; differences are B − A.</p>${Ot(e)}`, s = (o) => `<div class="console-insights" data-insights-view="compare">${t}${o}</div>`;
  if (e.prerequisite?.status === "blocked") return s(C(e.prerequisite.message, "blocked"));
  if (!e.pair) return s(e.candidates.length === 0 ? C(`Nothing to compare with: this dataset offers no other scenario context on ${e.shown.target_id}, and no other data is active there.`, "no-candidates") : C("Choose a scenario, receipt or the active data to compare with the data shown.", "unchosen"));
  const n = e.entry?.status === "ready" ? e.entry.value : void 0, a = `<div class="console-insights__sides">${oe(e, "a", e.pair.left, n?.left)}${oe(e, "b", e.pair.right, n?.right)}</div>`, i = as(e);
  return s(i || !n ? `${a}${i}` : `${a}${n.observed_at ? `<p class="console-explorer__observed console-insights__read">Compared ${G(n.observed_at, Ne)}</p>` : ""}${ns(n)}${ss(n)}
      ${Yt(e.scope, n, e.display)}
      ${Xt(e, n, e.display)}
      ${es(e, n)}`);
}
var is = /* @__PURE__ */ new Set([
  "denied",
  "expired",
  "gone",
  "stale",
  "invalid",
  "unconfigured"
]);
function B(e) {
  return `${f(e.left)}\0${f(e.right)}`;
}
function Y(e) {
  const { observed_at: t, work: s, ...n } = e;
  return n;
}
function ue(e, t) {
  return e ? e.status === "ready" ? JSON.stringify(["ready", t(e.value)]) : e.status === "failed" ? JSON.stringify(["failed", e.failure.kind]) : "loading" : "";
}
function rs(e) {
  const { observed_at: t, comparison_id: s, ...n } = e;
  return {
    ...n,
    left: Y(e.left),
    right: Y(e.right)
  };
}
var Ee = class {
  constructor(e, t) {
    this.content = e, this.changed = t, this.key = "", this.controller = null, this.pending = !1;
  }
  current() {
    return this.key;
  }
  busy() {
    return this.controller !== null;
  }
  load(e, t) {
    this.abort();
    const s = new AbortController();
    this.key = e, this.controller = s, this.pending = !1, this.entry = { status: "loading" }, t(s.signal).then((n) => {
      s.signal.aborted || this.controller !== s || this.key !== e || (this.controller = null, this.entry = n.ok ? {
        status: "ready",
        value: n.value
      } : {
        status: "failed",
        failure: n.failure
      }, this.changed());
    });
  }
  markStale() {
    this.key && this.entry && this.entry.status !== "loading" && (this.pending = !0);
  }
  revalidate(e) {
    if (!this.pending || this.controller || !this.key) return;
    this.pending = !1;
    const t = this.key, s = new AbortController();
    this.controller = s, e(s.signal).then((n) => {
      if (s.signal.aborted || this.controller !== s || this.key !== t || (this.controller = null, !n.ok && !is.has(n.failure.kind))) return;
      const a = n.ok ? {
        status: "ready",
        value: n.value
      } : {
        status: "failed",
        failure: n.failure
      };
      ue(this.entry, this.content) !== ue(a, this.content) && (this.entry = a, this.changed());
    });
  }
  abort() {
    this.controller?.abort(), this.controller = null;
  }
  clear() {
    this.abort(), this.key = "", this.entry = void 0, this.pending = !1;
  }
}, ls = class {
  constructor(e, t) {
    this.read = e, this.slot = new Ee(Y, t);
  }
  entry(e) {
    return e && this.selection && f(e) === this.slot.current() ? this.slot.entry : void 0;
  }
  load(e, t = !1) {
    const s = f(e);
    !t && this.slot.current() === s && this.slot.entry || (this.selection = e, this.slot.load(s, (n) => this.read(e, n)));
  }
  markStale() {
    this.slot.markStale();
  }
  revalidate() {
    const e = this.selection;
    e && this.slot.revalidate((t) => this.read(e, t));
  }
  clear() {
    this.slot.clear(), this.selection = void 0;
  }
}, cs = class {
  constructor(e, t, s = () => !0) {
    this.read = e, this.ready = s, this.choice = "", this.stale = "", this.slot = new Ee(rs, t);
  }
  get entry() {
    return this.pair && this.slot.current() === B(this.pair) ? this.slot.entry : void 0;
  }
  choose(e, t) {
    this.slot.clear(), this.stale = "", this.choice = t?.key || "", this.pair = t ? Rt(e, t) : void 0, this.pair && this.load();
  }
  ensure() {
    this.pair && !this.stale && this.slot.current() !== B(this.pair) && this.load();
  }
  swap() {
    !this.pair || this.stale || (this.pair = {
      left: this.pair.right,
      right: this.pair.left
    }, this.load());
  }
  retry() {
    this.pair && !this.stale && this.load();
  }
  markDrifted(e) {
    !this.pair || this.stale || (this.slot.clear(), this.stale = e);
  }
  markStale() {
    this.stale || this.slot.markStale();
  }
  revalidate() {
    const e = this.pair;
    e && !this.stale && this.ready() && this.slot.revalidate((t) => this.read(e, t));
  }
  clear() {
    this.slot.clear(), this.choice = "", this.pair = void 0, this.stale = "";
  }
  load() {
    const e = this.pair;
    if (!this.ready()) {
      this.slot.clear();
      return;
    }
    this.slot.load(B(e), (t) => this.read(e, t));
  }
};
function pe(e, t) {
  const s = t.filter(([, n]) => n !== "").map(([n, a]) => `${encodeURIComponent(n)}=${encodeURIComponent(a)}`).join("&");
  return s ? `${e}${e.includes("?") ? "&" : "?"}${s}` : e;
}
async function he(e, t, s) {
  const n = await Be(e, {
    method: "GET",
    signal: t,
    timeoutMs: qe,
    fallbackError: "Insights are unavailable."
  });
  if (t.aborted) return {
    ok: !1,
    failure: {
      kind: "canceled",
      status: 0
    }
  };
  if (!n.ok) return {
    ok: !1,
    failure: {
      kind: Pe(n.status),
      status: n.status
    }
  };
  const a = s(n.value);
  return a === null ? {
    ok: !1,
    failure: {
      kind: "malformed",
      status: n.status
    }
  } : {
    ok: !0,
    value: a
  };
}
function ds(e) {
  return {
    insights(t, s, n) {
      const a = s || e.metricSetID;
      return he(pe(e.insights, [["selection", JSON.stringify(U(t))], ["metric_set_id", a]]), n, (i) => R(i, t, a));
    },
    compare(t, s, n) {
      return he(pe(e.compare, [
        ["left", JSON.stringify(U(t.left))],
        ["right", JSON.stringify(U(t.right))],
        ["metric_set_id", s]
      ]), n, (a) => nt(a, t.left, t.right, s));
    }
  };
}
function us(e, t) {
  return e.target_id === t.target_id && e.dataset.provider === t.dataset.provider && e.dataset.id === t.dataset.id && e.dataset.version === t.dataset.version && e.dataset.digest === t.dataset.digest && e.scenario.id === t.scenario.id && e.scenario.version === t.scenario.version && e.scenario.profile_hash === t.scenario.profile_hash;
}
var ps = {
  insights: () => Promise.resolve({
    ok: !1,
    failure: {
      kind: "unconfigured",
      status: 0
    }
  }),
  compare: () => Promise.resolve({
    ok: !1,
    failure: {
      kind: "unconfigured",
      status: 0
    }
  })
}, hs = class {
  constructor(e) {
    this.display = "chart", this.host = e;
    const t = e.transport || (e.routes ? ds(e.routes) : ps);
    this.insights = new ls((s, n) => t.insights(s, "", n), () => this.insightsLanded()), this.comparison = new cs((s, n) => t.compare(s, this.metricSet(), n), () => this.host.update(), () => !!this.metricSet());
  }
  show(e) {
    e && this.shown && f(e) === f(this.shown) || (this.insights.clear(), this.comparison.clear(), this.shown = e);
  }
  render(e) {
    const t = this.shown;
    return t ? e === "insights" ? Et({
      scope: this.host.scope,
      selection: t,
      entry: this.insights.entry(t),
      display: this.display,
      title: this.host.title(t)
    }) : os({
      scope: this.host.scope,
      shown: t,
      candidates: this.candidates(),
      choice: this.comparison.choice,
      pair: this.comparison.pair,
      describe: (s) => Bt(s, t, this.host.title),
      entry: this.comparison.entry,
      display: this.display,
      ...this.staleState(),
      prerequisite: this.prerequisite()
    }) : "";
  }
  load(e) {
    this.shown && (this.insights.load(this.shown), e === "compare" && this.comparison.ensure());
  }
  markStale() {
    this.insights.markStale(), this.comparison.markStale();
  }
  revalidate(e) {
    this.insights.revalidate(), e === "compare" && this.comparison.revalidate();
  }
  reconcile() {
    const e = this.comparedSide();
    !e || this.comparison.stale || this.candidates().some((t) => t.key === f(e)) || this.comparison.markDrifted("drifted");
  }
  staleState() {
    const e = this.comparedSide();
    if (!this.comparison.stale || !e) return {};
    const t = this.replacement(e);
    return {
      stale: this.driftReason(e, t),
      staleCurrent: !!t
    };
  }
  handleChange(e) {
    const t = e.dataset.insightsControl;
    if (t === "display" && e instanceof HTMLInputElement) {
      const s = e.value === "table" ? "table" : "chart";
      return e.checked && s !== this.display && (this.display = s, this.host.update(`insights:display:${s}`)), !0;
    }
    return t === "compare" && e instanceof HTMLSelectElement ? (this.choose(e.value), !0) : !1;
  }
  handleClick(e) {
    const t = e.dataset.insightsAction || "";
    if (!t) return !1;
    if (e.getAttribute("aria-disabled") === "true") return !0;
    const s = this.shown;
    switch (t) {
      case "retry":
        return s && this.insights.load(s, !0), this.host.update("section:insights"), !0;
      case "compare-retry":
        return s && !this.metricSet() ? this.insights.load(s, !0) : this.comparison.retry(), this.host.update("insights:compare"), !0;
      case "swap":
        return this.comparison.swap(), this.host.update("insights:swap"), !0;
      case "compare-current":
        return this.compareCurrent(), !0;
      default:
        return !1;
    }
  }
  refreshFailed() {
    this.shown && (this.insights.entry(this.shown)?.status === "failed" && this.insights.load(this.shown, !0), this.comparison.entry?.status === "failed" && this.comparison.retry());
  }
  clear() {
    this.insights.clear(), this.comparison.clear(), this.shown = void 0;
  }
  metricSet() {
    const e = this.insights.entry(this.shown);
    if (e?.status !== "ready") return "";
    const { state: t, metric_set_id: s } = e.value;
    return t === "available" || t === "empty" ? s : "";
  }
  prerequisite() {
    const e = this.insights.entry(this.shown);
    if (!e || e.status === "loading") return { status: "loading" };
    if (e.status === "failed") return {
      status: "failed",
      failure: e.failure
    };
    if (e.value.state === "suppressed") return {
      status: "blocked",
      message: "Insights for the data shown are hidden by policy, so it cannot be compared."
    };
    if (!this.metricSet()) return {
      status: "blocked",
      message: "This dataset’s provider does not offer insights for the data shown, so it cannot be compared."
    };
  }
  insightsLanded() {
    this.comparison.ensure(), this.comparison.revalidate(), this.host.update();
  }
  candidates() {
    const e = this.shown, t = this.host.dataset();
    return e && t ? It(t, e, this.host.activeSelection(e.target_id), this.host.title) : [];
  }
  comparedSide(e = this.comparison.pair) {
    const t = this.shown;
    if (!(!e || !t))
      return f(e.left) === f(t) ? e.right : e.left;
  }
  replacement(e) {
    if (!e) return;
    const t = this.candidates();
    return e.context === "active" ? t.find((s) => s.active) : t.find((s) => !s.active && s.selection.context === e.context && us(s.selection, e));
  }
  driftReason(e, t) {
    const s = this.host.title(e);
    return t && t.key === f(e) ? `${e.context === "active" ? `The active data on ${e.target_id}` : e.context === "prepared" ? `The prepared receipt ${e.receipt_id} of ${s}` : `The catalog example of ${s}`} was briefly unavailable. Compare again to read it.` : e.context === "active" ? t ? `The active data on ${e.target_id} changed since you chose it: it now serves ${this.host.title(t.selection)} at generation ${t.selection.generation}. Compare again to use the current active data.` : `The active data on ${e.target_id} you chose is no longer offered. Choose again to compare.` : e.context === "prepared" ? t ? `The prepared receipt ${e.receipt_id} of ${s} was replaced by receipt ${t.selection.receipt_id}. Compare again to use the current receipt.` : `The prepared data of ${s} you chose is no longer offered. Choose again to compare.` : t ? `The catalog example of ${s} changed since you chose it. Compare again to use the current example.` : `The catalog example of ${s} is no longer offered. Choose again to compare.`;
  }
  choose(e) {
    const t = this.shown;
    if (!t) return;
    if (!e) {
      this.comparison.clear(), this.host.update("insights:compare");
      return;
    }
    const s = this.candidates().find((n) => n.key === e);
    !s || s.key === this.comparison.choice && !this.comparison.stale || (this.comparison.choose(t, s), this.host.update("insights:compare"));
  }
  compareCurrent() {
    const e = this.shown, t = this.replacement(this.comparedSide());
    e && t ? this.comparison.choose(e, t) : this.comparison.clear(), this.host.update("insights:compare");
  }
};
function bs(e) {
  return new hs(e);
}
export {
  jt as CONTEXT_LABELS,
  Ve as COVERAGE_STATUSES,
  cs as CompareSession,
  hs as DataInsights,
  k as INSIGHT_LIMITS,
  ls as InsightsSession,
  is as WITHDRAWING,
  ms as catalogTitle,
  It as compareCandidates,
  F as coverageDays,
  bs as createDataInsights,
  ds as createHTTPInsightsTransport,
  Rt as defaultPair,
  Bt as describeSelection,
  B as pairKey,
  nt as parseComparison,
  R as parseInsights,
  me as parseMetric,
  Se as provenanceText,
  os as renderCompare,
  Ct as renderComposition,
  At as renderCoverage,
  we as renderDisplayToggle,
  Et as renderInsights,
  q as renderInsightsFailure
};

//# sourceMappingURL=data-insights.js.map