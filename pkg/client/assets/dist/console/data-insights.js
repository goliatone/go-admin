import { escapeAttribute as d, escapeHTML as r } from "../shared/html.js";
import { S as ge, i as G } from "../chunks/rich-C-60Te1B.js";
import { t as Ue } from "../chunks/http-B2ojv2Fu.js";
import { _ as U, c as Be, d as T, f as w, g as f, h as Ie, m as Re, n as Oe, p as Pe, t as ze, u as v, v as h, y as qe } from "../chunks/transport-DVxB6IT1.js";
var Fe = [
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
}, Ve = [
  "count",
  "sum",
  "distribution"
], fe = [
  "known",
  "unknown",
  "suppressed",
  "unavailable"
], We = ["comparable", "incompatible"], Je = /^(\d{4})-(\d{2})-(\d{2})$/;
function N(e) {
  return typeof e == "number" && Number.isFinite(e) && Math.abs(e) <= Number.MAX_SAFE_INTEGER ? e : null;
}
function Z(e) {
  const t = N(e);
  return t !== null && Number.isInteger(t) && t >= 0 ? t : null;
}
function I(e) {
  const t = Je.exec(e);
  if (!t) return !1;
  const [s, n, a] = [
    Number(t[1]),
    Number(t[2]),
    Number(t[3])
  ], i = new Date(Date.UTC(s, n - 1, a));
  return i.getUTCFullYear() === s && i.getUTCMonth() === n - 1 && i.getUTCDate() === a;
}
function L(e) {
  return new Set(e).size !== e.length;
}
function He(e) {
  const [t, s, n] = e.split("-").map(Number);
  return Date.UTC(t, s - 1, n) / 864e5;
}
function Ye(e) {
  if (e.length < 2) return !0;
  const t = e.map(He);
  return Math.max(...t) - Math.min(...t) < k.days;
}
function _e(e, t, s) {
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
function Ge(e) {
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
function Ke(e) {
  if (!v(e)) return null;
  const t = h(e.id), s = w(e.status, fe);
  return !t || !s ? null : {
    id: t,
    label: h(e.label) || t,
    ..._e(s, e.value, "bucket")
  };
}
function $e(e) {
  if (!v(e)) return null;
  const t = h(e.id), s = w(e.kind, Ve), n = w(e.status, fe), a = T(e.buckets, k.buckets, Ke);
  if (!t || !s || !n || !a || L(a.map((l) => l.id))) return null;
  const i = _e(n, e.value, s), o = i.status === "known", c = o ? N(e.denominator) : null;
  return {
    id: t,
    label: h(e.label) || t,
    kind: s,
    unit: h(e.unit),
    population: h(e.population),
    time_scope: Ge(e.time_scope),
    denominator: c !== null && c >= 0 ? c : null,
    ...i,
    buckets: o && s === "distribution" ? a : [],
    sampling_method: h(e.sampling_method)
  };
}
function Xe(e, t) {
  if (!v(e)) return null;
  const s = Re(e.selection), n = h(e.ref);
  return !s || !n || f(s) !== f(t) ? null : {
    selection: s,
    ref: n,
    verification_id: h(e.verification_id)
  };
}
var Qe = /* @__PURE__ */ new Set([
  "covered",
  "covered_empty",
  "partial"
]);
function Ze(e, t) {
  if (!v(e)) return null;
  const s = h(e.local_day);
  if (!I(s)) return null;
  const n = w(e.status, Fe), a = Xe(e.evidence, t);
  let i = n || "unavailable", o = n ? h(e.reason) : "unknown_status";
  const c = !a || t.context === "catalog_example" || i === "covered_empty" && !a.verification_id;
  return Qe.has(i) && c ? {
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
function et(e) {
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
  const n = Pe(e, t), a = h(e.metric_set_id), i = T(e.metrics, k.metrics, $e), o = T(e.coverage, k.days, (p) => Ze(p, t));
  if (!n || !i || !o || s && a !== s) return null;
  const c = o.map((p) => p.local_day);
  if (L(i.map((p) => p.id)) || L(c) || !Ye(c)) return null;
  const l = n.state === "available" || n.state === "empty";
  return {
    ...n,
    metric_set_id: a,
    equivalent_schema: h(e.equivalent_schema),
    metrics: l ? i : [],
    coverage: l ? o.sort((p, g) => p.local_day.localeCompare(g.local_day)) : [],
    work: et(e.work)
  };
}
function ee(e, t) {
  if (e == null) return null;
  const s = $e(e);
  return s && s.id === t ? s : void 0;
}
function tt(e, t, s) {
  if (!v(e)) return null;
  const n = h(e.id), a = ee(e.left, n), i = ee(e.right, n);
  if (!n || a === void 0 || i === void 0) return null;
  const o = w(e.compatibility, We) || "incompatible";
  if (a?.status === "suppressed" || i?.status === "suppressed") return {
    id: n,
    left: null,
    right: null,
    compatibility: "incompatible",
    delta: null,
    percent_change: null,
    reason: "policy_suppressed"
  };
  const c = t.provenance === "observed" && s.provenance === "observed", l = a?.status === "known" && i?.status === "known", p = o === "comparable" && c && l ? N(e.delta) : null, g = p !== null;
  let $ = h(e.reason);
  return o === "comparable" && !g && ($ = c ? "unknown_value" : "not_observed"), {
    id: n,
    left: a,
    right: i,
    compatibility: g ? "comparable" : "incompatible",
    delta: p,
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
  const t = T(e.usages, k.usages, Ie);
  return t ? {
    usages: t,
    usage_completeness: w(e.usage_completeness, Be) || "unknown",
    expected_outcomes: qe(e.expected_outcomes, k.outcomes)
  } : null;
}
function st(e, t, s, n = "") {
  if (!v(e)) return null;
  const a = R(e.left, t, n), i = R(e.right, s, n);
  if (!a || !i) return null;
  const o = T(e.metrics, k.comparisons, (g) => tt(g, a, i)), c = te(e.left_declarations), l = te(e.right_declarations);
  if (!o || !c || !l || L(o.map((g) => g.id))) return null;
  const p = a.state === "suppressed" || i.state === "suppressed";
  if (p) for (const g of [a, i])
    g.metrics = [], g.coverage = [];
  return {
    left: a,
    right: i,
    comparison_id: h(e.comparison_id),
    observed_at: h(e.observed_at),
    metrics: p ? [] : o,
    left_declarations: p ? { ...O } : c,
    right_declarations: p ? { ...O } : l
  };
}
function x(e, t) {
  return t === "count" ? Math.round(e).toLocaleString() : e.toLocaleString(void 0, { maximumFractionDigits: 2 });
}
function nt(e, t) {
  if (t === null || !(t > 0)) return null;
  const s = e / t * 100;
  return Number.isFinite(s) ? s : null;
}
function me(e) {
  return `${e.toLocaleString(void 0, { maximumFractionDigits: 1 })}%`;
}
var be = "−";
function at(e, t) {
  if (e === 0) return "0";
  const s = x(Math.abs(e), t);
  return e > 0 ? `+${s}` : `${be}${s}`;
}
function ot(e) {
  if (e === 0) return "0%";
  const t = me(Math.abs(e));
  return e > 0 ? `+${t}` : `${be}${t}`;
}
var ve = [
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
], it = [
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
], rt = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday"
];
function ye(e) {
  const [t, s, n] = e.split("-").map(Number);
  return [
    t,
    s,
    n
  ];
}
function j(e) {
  const [t, s, n] = ye(e);
  return {
    year: t,
    month: s,
    date: n,
    weekday: new Date(Date.UTC(t, s - 1, n)).getUTCDay()
  };
}
function lt(e) {
  const { year: t, month: s, date: n, weekday: a } = j(e);
  return `${rt[a]} ${n} ${ve[s - 1]} ${t}`;
}
function K(e) {
  const { year: t, month: s, date: n } = j(e);
  return `${n} ${it[s - 1]} ${t}`;
}
function ct(e, t) {
  return `${ve[t - 1]} ${e}`;
}
function ke(e) {
  const [t, s, n] = ye(e), a = new Date(Date.UTC(t, s - 1, n + 1));
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
}, dt = {
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
  return e ? dt[e] || `${e.replace(/[_-]+/g, " ").replace(/^./, (t) => t.toUpperCase())}.` : "";
}
function pt(e) {
  return e.status !== "known" || e.value === null ? S[e.status === "known" ? "unknown" : e.status] : x(e.value, e.kind);
}
var ut = ge, se = {
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
}, ht = /* @__PURE__ */ new Set([
  "unavailable",
  "timeout",
  "network",
  "malformed",
  "failed",
  "canceled"
]), gt = /* @__PURE__ */ new Set([
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
function xe(e, t, s = "display") {
  const n = `${e}-${s}`;
  return `<fieldset class="console-explorer__contexts console-insights__display"><legend class="console-explorer__legend">Show as</legend><div class="console-explorer__choices">${Object.keys(ne).map((a) => {
    const i = `${n}-${a}`;
    return `<label class="console-explorer__choice" for="${d(i)}"><input type="radio" id="${d(i)}" name="${d(n)}" value="${a}" data-insights-control="${d(s)}" data-explorer-focus="${d(`insights:${s}:${a}`)}"${a === t ? " checked" : ""}><span>${ne[a]}</span></label>`;
  }).join("")}</div></fieldset>`;
}
function q(e, t = "retry") {
  const s = e.kind in se ? e.kind : "failed", n = ht.has(s) ? `<button type="button" class="console-btn console-btn--sm" data-insights-action="${d(t)}" data-explorer-focus="${d(`insights:${t}`)}">Try again</button>` : gt.has(s) ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>' : "";
  return `<div class="console-callout console-explorer__state" data-tone="${s === "denied" || s === "expired" ? "error" : "warning"}" role="alert" data-insights-failure="${s}"><p>${r(se[s])}</p>${n ? `<div class="console-explorer__state-actions">${n}</div>` : ""}</div>`;
}
function we(e) {
  const t = e.selection;
  return e.provenance === "example" ? "Catalog example: values the provider declares for this scenario. They are not observed and not verified." : e.provenance !== "observed" ? "Provenance unknown: these values may not be observed data." : t.context === "active" ? `Observed in the active data on ${t.target_id} at generation ${t.generation} (receipt ${t.receipt_id}).` : `Observed in prepared receipt ${t.receipt_id} (content revision ${t.content_revision}) on ${t.target_id}.`;
}
function ft(e) {
  return e.completeness === "partial" ? '<div class="console-callout" data-tone="warning" data-insights-completeness="partial"><p>Partial: some values could not be read, so totals may be incomplete.</p></div>' : e.completeness === "unknown" ? '<p class="console-explorer__para console-muted" data-insights-completeness="unknown">Completeness unknown: the provider does not say whether every value was read.</p>' : "";
}
function _t(e) {
  const t = [e.observed_at ? `Read ${G(e.observed_at, ut)}` : "", e.metric_set_id ? `Metric set <code class="console-kv__mono">${r(e.metric_set_id)}</code>` : ""].filter(Boolean);
  return t.length > 0 ? `<p class="console-explorer__observed console-insights__read">${t.join(" · ")}</p>` : "";
}
function $t(e) {
  return `<p class="console-insights__provenance" data-provenance="${e.provenance === "example" || e.provenance === "observed" ? e.provenance : "unknown"}">${r(we(e))}</p>${_t(e)}`;
}
function Se(e) {
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
function mt(e) {
  const t = Se(e), s = e.denominator !== null && e.denominator > 0 ? e.denominator : null, n = Math.max(0, ...e.buckets.map((o) => o.status === "known" && o.value !== null ? o.value : 0)), a = e.buckets.map((o) => {
    const c = o.status === "known" && o.value !== null;
    if (!c) return {
      bucket: o,
      value: S[o.status === "known" ? "unknown" : o.status],
      known: c,
      share: "",
      width: 0
    };
    const l = o.value, p = nt(l, s), g = s !== null ? l / s : n > 0 ? l / n : 0;
    return {
      bucket: o,
      value: x(l, "bucket"),
      known: c,
      share: p === null ? "" : me(p),
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
function bt(e) {
  if (!e.known) return b(e.value);
  const t = e.metric.unit ? ` <span class="console-insights__unit">${r(e.metric.unit)}</span>` : "";
  return `<span class="console-insights__number">${r(e.value)}</span>${t}`;
}
function vt(e) {
  return [
    e.metric.population,
    e.period,
    e.denominator ? `Denominator ${e.denominator}${e.metric.unit ? ` ${e.metric.unit}` : ""}` : "",
    e.sampling ? `Sampling: ${e.sampling}` : ""
  ].filter(Boolean);
}
function yt(e, t) {
  const s = vt(e);
  return `<li class="console-insights__stat" data-metric-id="${d(e.metric.id)}" data-status="${M(e.known ? "known" : e.metric.status)}">
      <span class="console-insights__stat-label">${r(e.metric.label)}${t ? X : ""}</span>
      <span class="console-insights__stat-value">${bt(e)}</span>
      ${s.length > 0 ? `<span class="console-insights__stat-meta">${r(s.join(" · "))}</span>` : ""}
    </li>`;
}
function kt(e, t, s, n) {
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
function u(e, t, s = "") {
  return `<td data-label="${d(e)}"${s}>${t}</td>`;
}
function xt(e, t) {
  const s = e.map((n) => `<tr data-metric-id="${d(n.metric.id)}" data-status="${M(n.known ? "known" : n.metric.status)}">${[
    u("Metric", `<span class="console-cell-title">${r(n.metric.label)}</span>`),
    u("Value", n.known ? `<span class="console-insights__number">${r(n.value)}</span>` : b(n.value), ' class="console-insights__numeric"'),
    u("Unit", n.metric.unit ? r(n.metric.unit) : _("—")),
    u("Population", n.metric.population ? r(n.metric.population) : _("Not declared")),
    u("Period", n.period ? r(n.period) : _("Unknown")),
    u("Denominator", n.denominator ? r(n.denominator) : _(n.known ? "Not declared" : "—")),
    u("Sampling", n.sampling ? r(n.sampling) : _("Not stated"))
  ].join("")}</tr>`).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="totals"><caption class="console-explorer__caption">${t ? "Totals (example values declared by the provider, not observed)" : "Totals"}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Unit</th><th scope="col">Population</th><th scope="col">Period</th><th scope="col">Denominator</th><th scope="col">Sampling</th></tr></thead><tbody>${s}</tbody></table></div>`;
}
function wt(e, t) {
  const { row: s } = e, n = s.known ? `Total ${s.value}${s.metric.unit ? ` ${s.metric.unit}` : ""}` : `Total ${s.value.toLowerCase()}`, a = `${s.metric.label}${t ? " (example values)" : ""} · ${[n, e.caption].filter(Boolean).join(" · ")}`;
  if (!s.known || e.buckets.length === 0) {
    const o = s.known ? "No categories reported." : `${s.value}: categories are not shown.`;
    return `<div class="console-insights__distribution-table" data-metric-id="${d(s.metric.id)}"><p class="console-explorer__caption">${r(a)}</p><p class="console-explorer__para">${s.known ? _(o) : b(o)}</p></div>`;
  }
  const i = e.buckets.map((o) => `<tr data-bucket-id="${d(o.bucket.id)}" data-status="${M(o.known ? "known" : o.bucket.status)}">${[
    u("Category", r(o.bucket.label)),
    u("Value", o.known ? `<span class="console-insights__number">${r(o.value)}</span>` : b(o.value), ' class="console-insights__numeric"'),
    u("Share", o.share ? r(o.share) : _("—"), ' class="console-insights__numeric"')
  ].join("")}</tr>`).join("");
  return `<div class="console-explorer__table-wrap console-insights__distribution-table" data-metric-id="${d(s.metric.id)}"><table class="console-table console-insights__table" data-insights-table="distribution"><caption class="console-explorer__caption">${r(a)}</caption><thead><tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead><tbody>${i}</tbody></table><p class="console-insights__scale console-muted">${r(e.scale)}${s.sampling ? ` Sampling: ${r(s.sampling)}.` : ""}</p></div>`;
}
function St(e, t, s) {
  const n = t.metrics.filter((l) => l.kind !== "distribution").map(Se), a = t.metrics.filter((l) => l.kind === "distribution").map(mt), i = `<h5 class="console-insights__heading" id="${d(`${e}-composition`)}">Composition</h5>`;
  if (n.length === 0 && a.length === 0) return `<section class="console-insights__group" aria-labelledby="${d(`${e}-composition`)}" data-insights-group="composition">${i}<p class="console-explorer__para">${_("No metrics reported for this selection.")}</p></section>`;
  const o = t.provenance === "example", c = s === "table" ? `${n.length > 0 ? xt(n, o) : ""}${a.map((l) => wt(l, o)).join("")}` : `${n.length > 0 ? `<ul class="console-insights__stats" aria-label="${o ? "Totals (example values)" : "Totals"}">${n.map((l) => yt(l, o)).join("")}</ul>` : ""}${a.map((l, p) => kt(e, l, o, p)).join("")}`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-composition`)}" data-insights-group="composition" data-insights-display="${s}">${i}${c}</section>`;
}
function F(e) {
  if (e.length === 0) return [];
  const t = new Map(e.map((a) => [a.local_day, a])), s = e[e.length - 1].local_day, n = [];
  for (let a = e[0].local_day; a <= s && n.length <= 92; a = ke(a)) {
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
  return `${lt(e.day)}${n}: ${s.label}`;
}
function W(e) {
  const t = /* @__PURE__ */ new Map();
  return e.forEach((s) => t.set(s.status, (t.get(s.status) || 0) + 1)), `<ul class="console-insights__legend" aria-label="Coverage legend">${Object.keys(y).filter((s) => t.has(s)).map((s) => {
    const n = t.get(s) || 0;
    return `<li data-status="${s}"><span class="console-insights__swatch" data-status="${s}" aria-hidden="true">${r(y[s].glyph)}</span><span>${r(y[s].label)}</span><span class="console-muted">${n} ${n === 1 ? "day" : "days"}</span></li>`;
  }).join("")}</ul>`;
}
var Ct = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun"
];
function Ce(e, t, s) {
  const n = [];
  return t.forEach((a) => {
    const { year: i, month: o } = j(a.day), c = `${i}-${o}`, l = n[n.length - 1];
    l?.key === c ? l.days.push(a) : n.push({
      key: c,
      label: ct(i, o),
      days: [a]
    });
  }), `<div class="console-insights__months">${n.map((a, i) => {
    const o = `${e}-coverage-month-${i}`, c = a.days.map((l, p) => {
      const g = y[l.status], { date: $, weekday: m } = j(l.day), Ee = p === 0 ? ` console-insights__day--col-${(m + 6) % 7 + 1}` : "", Le = Q(l.entry), je = [ae(l, s), Le].filter(Boolean).join(" · ");
      return `<li class="console-insights__day${Ee}" data-status="${l.status}" data-local-day="${d(l.day)}" title="${d(je)}"><span class="console-insights__day-number" aria-hidden="true">${$}</span><span class="console-insights__day-glyph" aria-hidden="true">${r(g.glyph)}</span><span class="console-sr-only">${r(ae(l, s))}</span></li>`;
    }).join("");
    return `<section class="console-insights__month" aria-labelledby="${d(o)}"><h6 class="console-insights__month-title" id="${d(o)}">${r(a.label)}</h6><div class="console-insights__weekdays" aria-hidden="true">${Ct.map((l) => `<span>${l}</span>`).join("")}</div><ol class="console-insights__days">${c}</ol></section>`;
  }).join("")}</div>`;
}
function Tt(e, t) {
  const s = !t, n = e.map((i) => {
    const o = y[i.status], c = Q(i.entry);
    return `<tr data-local-day="${d(i.day)}" data-status="${i.status}">${[
      u("Local day", `<span class="console-cell-main"><span class="console-cell-title">${r(K(i.day))}</span><code class="console-cell-sub console-kv__mono">${r(i.day)}</code></span>`),
      s ? u("Timezone", i.entry?.timezone ? r(i.entry.timezone) : _("Unknown")) : "",
      u("Coverage", `<span class="console-insights__state" data-status="${i.status}"><span class="console-insights__swatch" data-status="${i.status}" aria-hidden="true">${r(o.glyph)}</span>${r(o.label)}</span>`),
      u("Evidence", c ? r(c) : _("None"))
    ].join("")}</tr>`;
  }).join(""), a = t ? `Coverage by local day (${t})` : "Coverage by local day";
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="coverage"><caption class="console-explorer__caption">${r(a)}</caption><thead><tr><th scope="col">Local day</th>${s ? '<th scope="col">Timezone</th>' : ""}<th scope="col">Coverage</th><th scope="col">Evidence</th></tr></thead><tbody>${n}</tbody></table></div>`;
}
function Nt(e, t) {
  const s = t ? `Local days in ${t}. ` : "", n = e.selection.context === "catalog_example" ? "A catalog example is never coverage: its expected dates read as not covered until a verification of an exact receipt covers them." : "Covered days are backed by verification evidence for exactly this selection; expected or example dates never count as coverage.";
  return `<p class="console-explorer__para console-muted">${r(s + n)}</p>`;
}
function Mt(e, t, s) {
  const n = `<h5 class="console-insights__heading" id="${d(`${e}-coverage`)}">Coverage</h5>`, a = F(t.coverage), i = V(t.coverage), o = a.length === 0 ? `<p class="console-explorer__para" data-insights-coverage="none">${_("No coverage reported for this period.")}</p>` : s === "table" ? Tt(a, i) : `${W(a)}${Ce(e, a, i)}`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-coverage`)}" data-insights-group="coverage" data-insights-display="${s}">${n}${Nt(t, i)}${o}</section>`;
}
function At(e) {
  return !e || e.status === "loading" ? '<div class="console-explorer__loading" role="status" aria-busy="true">Loading insights…</div>' : e.status === "failed" ? q(e.failure) : e.value.state === "suppressed" ? '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="suppressed"><p>Insights for this selection are hidden by policy.</p></div>' : e.value.state === "unsupported" ? '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="unsupported"><p>This dataset’s provider does not offer composition or coverage insights for this selection. Descriptions and record previews remain available.</p></div>' : "";
}
function Dt(e) {
  const t = `<div class="console-insights__toolbar"><p class="console-explorer__para console-muted">Composition and coverage of the data shown above, read on demand and bounded by the provider.</p>${xe(e.scope, e.display)}</div>`, s = At(e.entry);
  if (s || e.entry?.status !== "ready") return `<div class="console-insights" data-insights-view="insights">${t}${s}</div>`;
  const n = e.entry.value, a = n.state === "empty" ? '<p class="console-explorer__para" data-insights-state="empty">This selection contains no records.</p>' : "";
  return `<div class="console-insights" data-insights-view="insights">
      ${t}
      ${$t(n)}
      ${ft(n)}${a}
      ${St(e.scope, n, e.display)}
      ${Mt(e.scope, n, e.display)}
    </div>`;
}
var Te = ge, Et = {
  catalog_example: "Catalog example",
  prepared: "Prepared receipt",
  active: "Active data"
}, Lt = {
  screen: "Screen",
  report: "Report",
  workflow: "Workflow",
  target: "Managed target"
}, jt = {
  prepare: "Prepare",
  verify: "Verify",
  activate: "Activate"
};
function $s(e) {
  return (t) => e.find((s) => s.provider === t.dataset.provider && s.datasetId === t.dataset.id && s.version === t.dataset.version)?.scenarios.find((s) => s.scenarioId === t.scenario.id && s.version === t.scenario.version)?.label || `${t.scenario.id} v${t.scenario.version}`;
}
function Ne(e) {
  return `${e.dataset.provider}/${e.dataset.id} v${e.dataset.version}`;
}
function Me(e, t) {
  return e.dataset.provider === t.dataset.provider && e.dataset.id === t.dataset.id && e.dataset.version === t.dataset.version && e.dataset.digest === t.dataset.digest;
}
function Ut(e, t, s) {
  const n = [
    e.receipt_id ? `receipt ${e.receipt_id}` : "no receipt",
    e.content_revision ? `content revision ${e.content_revision}` : "",
    e.generation !== void 0 ? `generation ${e.generation}` : "",
    `target ${e.target_id}`
  ].filter(Boolean).join(" · ");
  return {
    title: s(e),
    context: Et[e.context],
    identity: n,
    dataset: Me(e, t) ? "" : Ne(e)
  };
}
function Bt(e, t, s, n) {
  const a = /* @__PURE__ */ new Set([f(t)]), i = [];
  if (s && s.context === "active" && s.target_id === t.target_id && !a.has(f(s))) {
    a.add(f(s));
    const o = Me(s, t) ? "" : ` (${Ne(s)})`;
    i.push({
      key: f(s),
      selection: s,
      active: !0,
      label: `Active data on ${s.target_id}: ${n(s)}${o} at generation ${s.generation}`
    });
  }
  for (const o of e.scenarios) for (const c of ["catalog_example", "prepared"]) {
    const l = o.selections[c];
    if (!l || l.target_id !== t.target_id || a.has(f(l))) continue;
    a.add(f(l));
    const p = c === "prepared" ? `${n(l)}: prepared receipt ${l.receipt_id}` : `${n(l)}: catalog example`;
    i.push({
      key: f(l),
      selection: l,
      active: !1,
      label: p
    });
  }
  return i;
}
function It(e, t) {
  return t.active ? {
    left: t.selection,
    right: e
  } : {
    left: e,
    right: t.selection
  };
}
function Rt(e) {
  const t = e.candidates.some((i) => i.key === e.choice), s = e.candidates.map((i) => `<option value="${d(i.key)}"${i.key === e.choice ? " selected" : ""}>${r(i.label)}</option>`).join(""), n = `<option value=""${e.choice ? "" : " selected"}>Choose what to compare with…</option>`, a = e.choice && !t ? '<option value="" selected disabled>The chosen selection is no longer offered</option>' : "";
  return `<div class="console-insights__toolbar"><div class="console-insights__compare-controls">${`<label class="console-filter console-insights__picker">Compare with<select data-insights-control="compare" data-explorer-focus="insights:compare"${e.candidates.length === 0 || e.prerequisite?.status === "blocked" ? " disabled" : ""}>${a || n}${s}</select></label>`}${`<button type="button" class="console-btn console-btn--sm" data-insights-action="swap" data-explorer-focus="insights:swap"${e.pair && !e.stale && !e.prerequisite ? "" : ' aria-disabled="true"'}>Swap A and B</button>`}</div>${xe(e.scope, e.display)}</div>`;
}
function Ot(e) {
  if (!e) return "";
  const t = e.provenance === "example" ? "Example values, not observed" : e.provenance === "observed" ? "Observed" : "Provenance unknown", s = e.completeness === "complete" ? "Complete" : e.completeness === "partial" ? "Partial" : "Completeness unknown", n = e.state === "unsupported" ? "Insights not offered by this provider" : e.state === "suppressed" ? "Withheld by policy" : "", a = e.observed_at ? `Read ${G(e.observed_at, Te)}` : "";
  return `<p class="console-insights__side-evidence console-muted">${[
    r(n),
    r(t),
    r(s),
    a
  ].filter(Boolean).join(" · ")}</p>`;
}
function Pt(e, t, s, n) {
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
      <p class="console-insights__side-context">${r(Pt(e, s, t, a.context))}</p>
      <p class="console-insights__side-identity console-muted">${r([a.dataset, a.identity].filter(Boolean).join(" · "))}</p>
      ${Ot(n)}
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
function zt(e, t) {
  const s = e || t;
  if (!s) return "";
  const n = e ? P(e.time_scope) : "", a = t ? P(t.time_scope) : "", i = n && a && n !== a ? `A ${n}; B ${a}` : n || a;
  return [s.population, i].filter(Boolean).join(" · ");
}
function qt(e) {
  const t = e.left || e.right, s = e.reason === "policy_suppressed", n = t?.kind || "sum", a = e.compatibility === "comparable" && e.delta !== null, i = a ? e.percent_change !== null ? ot(e.percent_change) : e.reason === "zero_baseline" ? "Not defined (zero baseline)" : "Not available" : "—", o = a ? e.reason && e.reason !== "zero_baseline" ? z(e.reason) : e.delta === 0 ? "No change." : "" : z(e.reason) || "These values are not comparable.";
  return {
    comparison: e,
    label: t?.label || e.id,
    unit: t?.unit || "",
    kind: n,
    scope: zt(e.left, e.right),
    a: ie(e.left, s),
    b: ie(e.right, s),
    difference: a ? at(e.delta, n) : "Not compared",
    change: i,
    note: o,
    comparable: a
  };
}
function Ft(e, t) {
  return e === null || !(t > 0) ? 0 : Math.max(0, Math.min(100, Math.round(Math.abs(e) / t * 1e3) / 10));
}
function A(e, t, s, n, a) {
  const i = e.toUpperCase(), o = t.known ? `<span class="console-insights__number">${r(t.text)}</span>${n ? ` <span class="console-muted">${r(n)}</span>` : ""}` : b(t.text);
  return `<div class="console-insights__pair-row" data-side="${e}" data-status="${t.known ? "known" : "missing"}"${a ? ' data-provenance="example"' : ""}><span class="console-insights__pair-side" aria-hidden="true">${i}</span><span class="console-insights__bar-track" aria-hidden="true"><span class="console-insights__bar-fill" style="width:${Ft(t.value, s)}%"></span></span><span class="console-insights__bar-value"><span class="console-sr-only">${i}: </span>${o}${a ? X : ""}</span></div>`;
}
function re(e, t) {
  return t[e] ? `${e.toUpperCase()} (example)` : e.toUpperCase();
}
function Vt(e) {
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
function Ae(e) {
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
function Wt(e, t) {
  const s = Math.max(0, ...[e.a.value, e.b.value].filter((o) => o !== null).map(Math.abs)), n = Ae(e), a = Math.max(0, ...n.flatMap((o) => [o.a.value, o.b.value]).filter((o) => o !== null).map(Math.abs)), i = n.length === 0 ? "" : `<ul class="console-insights__pair-buckets" aria-label="${d(`${e.label} by category`)}">${n.map((o) => `<li class="console-insights__pair-bucket" data-bucket-id="${d(o.id)}"><span class="console-insights__bar-label">${r(o.label)}</span>${A("a", o.a, a, "", t.a)}${A("b", o.b, a, "", t.b)}</li>`).join("")}</ul>`;
  return `<li class="console-insights__pair" data-metric-id="${d(e.comparison.id)}" data-compatibility="${e.comparable ? "comparable" : "incompatible"}">
      <div class="console-insights__pair-head"><span class="console-insights__pair-label">${r(e.label)}</span>${e.scope ? `<span class="console-muted">${r(e.scope)}</span>` : ""}</div>
      <div class="console-insights__pair-bars">${A("a", e.a, s, e.unit, t.a)}${A("b", e.b, s, e.unit, t.b)}</div>
      ${Vt(e)}
      ${i}
    </li>`;
}
function D(e, t) {
  return u(e, t.known ? `<span class="console-insights__number">${r(t.text)}</span>` : b(t.text), ' class="console-insights__numeric"');
}
function J(e, t) {
  return t.a && t.b ? `${e} (example values declared by the providers, not observed)` : t.a || t.b ? `${e} (${t.a ? "A" : "B"} shows example values declared by the provider, not observed)` : e;
}
function Jt(e, t) {
  const s = re("a", t), n = re("b", t), a = e.map((o) => `<tr data-metric-id="${d(o.comparison.id)}" data-compatibility="${o.comparable ? "comparable" : "incompatible"}">${[
    u("Metric", `<span class="console-cell-main"><span class="console-cell-title">${r(o.label)}</span>${o.scope ? `<span class="console-cell-sub">${r(o.scope)}</span>` : ""}</span>`),
    u("Unit", o.unit ? r(o.unit) : _("—")),
    D(s, o.a),
    D(n, o.b),
    u("Difference (B − A)", o.comparable ? `<strong class="console-insights__number">${r(o.difference)}</strong>` : b(o.difference), ' class="console-insights__numeric"'),
    u("Change", o.comparable ? r(o.change) : _(o.change), ' class="console-insights__numeric"'),
    u("Notes", o.note ? r(o.note) : _("—"))
  ].join("")}</tr>`).join(""), i = e.map((o) => {
    const c = Ae(o);
    if (c.length === 0) return "";
    const l = c.map((p) => `<tr data-bucket-id="${d(p.id)}">${[
      u("Category", r(p.label)),
      D(s, p.a),
      D(n, p.b)
    ].join("")}</tr>`).join("");
    return `<div class="console-explorer__table-wrap" data-metric-id="${d(o.comparison.id)}"><table class="console-table console-insights__table" data-insights-table="compare-categories"><caption class="console-explorer__caption">${r(J(`${o.label} by category`, t))}</caption><thead><tr><th scope="col">Category</th><th scope="col">${s}</th><th scope="col">${n}</th></tr></thead><tbody>${l}</tbody></table></div>`;
  }).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare"><caption class="console-explorer__caption">${r(J("Metrics", t))}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Unit</th><th scope="col">${s}</th><th scope="col">${n}</th><th scope="col">Difference (B − A)</th><th scope="col">Change</th><th scope="col">Notes</th></tr></thead><tbody>${a}</tbody></table></div>${i}`;
}
function Ht(e, t, s) {
  const n = t.metrics.map(qt), a = {
    a: t.left.provenance === "example",
    b: t.right.provenance === "example"
  }, i = a.a || a.b, o = `<h5 class="console-insights__heading" id="${d(`${e}-compare-metrics`)}">Composition</h5>`, c = i ? "At least one side shows example values declared by the provider. Values appear side by side; no difference is computed." : "Differences are computed by the server only for comparable observed values with the same unit, population, period and denominator.", l = n.length === 0 ? `<p class="console-explorer__para">${_("No metrics reported for either side.")}</p>` : s === "table" ? Jt(n, a) : `<ul class="console-insights__pairs" aria-label="${d(J("Metrics", a))}">${n.map((p) => Wt(p, a)).join("")}</ul>`;
  return `<section class="console-insights__group" aria-labelledby="${d(`${e}-compare-metrics`)}" data-insights-group="compare-metrics" data-insights-display="${s}">${o}<p class="console-explorer__para console-muted">${r(c)}</p>${l}</section>`;
}
var Yt = 184;
function Gt(e, t) {
  const s = [...e.coverage, ...t.coverage].map((i) => i.local_day).sort();
  if (s.length === 0) return {
    days: [],
    a: [],
    b: []
  };
  const n = [];
  for (let i = s[0]; i <= s[s.length - 1]; i = ke(i)) {
    if (n.length >= Yt) return null;
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
  return u(e, `<span class="console-insights__state" data-status="${t.status}"><span class="console-insights__swatch" data-status="${t.status}" aria-hidden="true">${r(s.glyph)}</span>${r(s.label)}</span>${n ? `<span class="console-cell-sub">${r(n)}</span>` : ""}`);
}
function E(e, t, s, n, a) {
  const i = t.toUpperCase(), o = n.length === 0 ? `<p class="console-explorer__para">${_("No coverage reported.")}</p>` : Ce(`${e}-${t}`, n, a);
  return `<section class="console-insights__coverage-side" data-side="${t}" aria-label="${d(`${i}: ${s}`)}"><h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${i}</span>${r(s)}</h6>${o}</section>`;
}
function ce(e, t, s, n) {
  const a = e.toUpperCase();
  if (s.length === 0) return `<p class="console-explorer__para">${_(`${a}: no coverage reported.`)}</p>`;
  const i = s.map((o) => `<tr data-local-day="${d(o.day)}" data-side-${e}="${o.status}">${u("Local day", r(K(o.day)))}${H(a, o)}</tr>`).join("");
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage-${e}"><caption class="console-explorer__caption">${r(`${a}: ${t}${n ? ` (${n})` : ""}`)}</caption><thead><tr><th scope="col">Local day</th><th scope="col">${a}</th></tr></thead><tbody>${i}</tbody></table></div>`;
}
function Kt(e, t, s) {
  const n = e.scope, a = `<h5 class="console-insights__heading" id="${d(`${n}-compare-coverage`)}">Coverage</h5>`, i = {
    a: e.describe(t.left.selection).title,
    b: e.describe(t.right.selection).title
  }, o = {
    a: V(t.left.coverage),
    b: V(t.right.coverage)
  }, c = o.a && o.a === o.b ? `Local days in ${o.a}. ` : o.a || o.b ? `Local days in ${o.a || "an unknown timezone"} (A) and ${o.b || "an unknown timezone"} (B). ` : "", l = `<p class="console-explorer__para console-muted">${r(`${c}Covered days need verification evidence for exactly that side's selection; example dates never count as coverage.`)}</p>`, p = Gt(t.left, t.right);
  let g;
  if (p && p.days.length === 0) g = `<p class="console-explorer__para" data-insights-coverage="none">${_("No coverage reported for either side.")}</p>`;
  else if (p) g = s === "table" ? `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage"><caption class="console-explorer__caption">Coverage by local day</caption><thead><tr><th scope="col">Local day</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>${p.days.map(($, m) => `<tr data-local-day="${d($)}" data-side-a="${p.a[m].status}" data-side-b="${p.b[m].status}">${u("Local day", `<span class="console-cell-main"><span class="console-cell-title">${r(K($))}</span><code class="console-cell-sub console-kv__mono">${r($)}</code></span>`)}${H("A", p.a[m])}${H("B", p.b[m])}</tr>`).join("")}</tbody></table></div>` : `${W([...p.a, ...p.b])}<div class="console-insights__coverage-pair">${E(n, "a", i.a, p.a, o.a)}${E(n, "b", i.b, p.b, o.b)}</div>`;
  else {
    const $ = F(t.left.coverage), m = F(t.right.coverage);
    g = s === "table" ? `${ce("a", i.a, $, o.a)}${ce("b", i.b, m, o.b)}` : `${W([...$, ...m])}<div class="console-insights__coverage-pair">${E(n, "a", i.a, $, o.a)}${E(n, "b", i.b, m, o.b)}</div>`;
  }
  return `<section class="console-insights__group" aria-labelledby="${d(`${n}-compare-coverage`)}" data-insights-group="compare-coverage" data-insights-display="${s}">${a}${l}${g}</section>`;
}
function Xt(e) {
  return e.usages.length === 0 ? `<p class="console-explorer__para">${_(e.usage_completeness === "complete" ? "No usage declared." : "No usage declared: impact on application features is unknown.")}</p>` : `<ul class="console-insights__usages">${e.usages.map((t) => {
    const s = [
      "prepare",
      "verify",
      "activate"
    ].map((n) => {
      const a = t.effects.filter((i) => i.phase === n).map((i) => i.description || "Declared without a description");
      return `<li><span class="console-insights__phase">${jt[n]}</span> ${a.length > 0 ? r(a.join("; ")) : '<span class="console-kv__empty">Not declared — effect unknown</span>'}</li>`;
    }).join("");
    return `<li class="console-insights__usage"><span class="console-insights__usage-label">${r(t.label)}</span> <span class="console-muted">${r(Lt[t.kind])}</span><ul class="console-insights__effects">${s}</ul></li>`;
  }).join("")}</ul>${e.usage_completeness === "complete" ? "" : '<p class="console-explorer__para console-muted">Other uses may exist; this list is declared, not discovered.</p>'}`;
}
function Qt(e) {
  return e.expected_outcomes.length === 0 ? `<p class="console-explorer__para">${_("No expected outcomes declared.")}</p>` : `<ul class="console-explorer__list">${e.expected_outcomes.map((t) => `<li>${r(t)}</li>`).join("")}</ul>`;
}
function Zt(e, t) {
  const s = e.scope, n = JSON.stringify(t.left_declarations) === JSON.stringify(t.right_declarations), a = (i, o, c) => `<div class="console-insights__declared" data-side="${i}">
        <h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${i.toUpperCase()}</span>${r(e.describe(o).title)}</h6>
        <span class="console-explorer__label">Expected outcomes (declared, not verified)</span>${Qt(c)}
        <span class="console-explorer__label">Declared usage and effects</span>${Xt(c)}
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
function es(e, t) {
  const s = t ? "Compare with the current data" : "Choose again";
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-insights-state="stale"><p>${r(e)}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-insights-action="compare-current" data-explorer-focus="insights:compare-current">${s}</button></div></div>`;
}
function ts(e) {
  const t = [e.left.state === "unsupported" ? "A" : "", e.right.state === "unsupported" ? "B" : ""].filter(Boolean);
  return t.length === 0 ? "" : C(`${t.length === 2 ? "Neither side’s provider offers" : `The provider of ${t[0]} does not offer`} composition or coverage insights for its selection, so its values are not shown.`, "unsupported");
}
function de(e) {
  return `<div class="console-explorer__loading" role="status" aria-busy="true">${r(e)}</div>`;
}
function ss(e) {
  const t = e.left.provenance === "example", s = e.right.provenance === "example";
  if (!t && !s) return "";
  const n = t && s ? "Both sides are catalog examples: values the providers declare. They are not observed, so no difference is computed." : `${t ? "A" : "B"} is a catalog example: ${we(t ? e.left : e.right).replace(/^Catalog example: /, "")} No difference is computed against it.`;
  return `<p class="console-insights__provenance" data-provenance="example">${r(n)}</p>`;
}
function ns(e) {
  if (e.stale) return es(e.stale, e.staleCurrent !== !1);
  const t = e.prerequisite;
  if (t?.status === "failed") return q(t.failure, "compare-retry");
  if (t?.status === "loading") return de("Reading the data shown…");
  const s = e.entry;
  return !s || s.status === "loading" ? de("Comparing…") : s.status === "failed" ? q(s.failure, "compare-retry") : s.value.left.state === "suppressed" || s.value.right.state === "suppressed" ? C("This comparison is hidden by policy: at least one side is withheld, so neither side’s values are shown.", "suppressed") : "";
}
function as(e) {
  const t = `<p class="console-explorer__para console-muted">Compare the data shown with another scenario, receipt or the active data. A is the baseline; differences are B − A.</p>${Rt(e)}`, s = (o) => `<div class="console-insights" data-insights-view="compare">${t}${o}</div>`;
  if (e.prerequisite?.status === "blocked") return s(C(e.prerequisite.message, "blocked"));
  if (!e.pair) return s(e.candidates.length === 0 ? C(`Nothing to compare with: this dataset offers no other scenario context on ${e.shown.target_id}, and no other data is active there.`, "no-candidates") : C("Choose a scenario, receipt or the active data to compare with the data shown.", "unchosen"));
  const n = e.entry?.status === "ready" ? e.entry.value : void 0, a = `<div class="console-insights__sides">${oe(e, "a", e.pair.left, n?.left)}${oe(e, "b", e.pair.right, n?.right)}</div>`, i = ns(e);
  return s(i || !n ? `${a}${i}` : `${a}${n.observed_at ? `<p class="console-explorer__observed console-insights__read">Compared ${G(n.observed_at, Te)}</p>` : ""}${ss(n)}${ts(n)}
      ${Ht(e.scope, n, e.display)}
      ${Kt(e, n, e.display)}
      ${Zt(e, n)}`);
}
var os = /* @__PURE__ */ new Set([
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
function pe(e, t) {
  return e ? e.status === "ready" ? JSON.stringify(["ready", t(e.value)]) : e.status === "failed" ? JSON.stringify(["failed", e.failure.kind]) : "loading" : "";
}
function is(e) {
  const { observed_at: t, comparison_id: s, ...n } = e;
  return {
    ...n,
    left: Y(e.left),
    right: Y(e.right)
  };
}
var De = class {
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
      if (s.signal.aborted || this.controller !== s || this.key !== t || (this.controller = null, !n.ok && !os.has(n.failure.kind))) return;
      const a = n.ok ? {
        status: "ready",
        value: n.value
      } : {
        status: "failed",
        failure: n.failure
      };
      pe(this.entry, this.content) !== pe(a, this.content) && (this.entry = a, this.changed());
    });
  }
  abort() {
    this.controller?.abort(), this.controller = null;
  }
  clear() {
    this.abort(), this.key = "", this.entry = void 0, this.pending = !1;
  }
}, rs = class {
  constructor(e, t) {
    this.read = e, this.slot = new De(Y, t);
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
}, ls = class {
  constructor(e, t, s = () => !0) {
    this.read = e, this.ready = s, this.choice = "", this.stale = "", this.slot = new De(is, t);
  }
  get entry() {
    return this.pair && this.slot.current() === B(this.pair) ? this.slot.entry : void 0;
  }
  choose(e, t) {
    this.slot.clear(), this.stale = "", this.choice = t?.key || "", this.pair = t ? It(e, t) : void 0, this.pair && this.load();
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
function ue(e, t) {
  const s = t.filter(([, n]) => n !== "").map(([n, a]) => `${encodeURIComponent(n)}=${encodeURIComponent(a)}`).join("&");
  return s ? `${e}${e.includes("?") ? "&" : "?"}${s}` : e;
}
async function he(e, t, s) {
  const n = await Ue(e, {
    method: "GET",
    signal: t,
    timeoutMs: ze,
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
      kind: Oe(n.status),
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
function cs(e) {
  return {
    insights(t, s, n) {
      const a = s || e.metricSetID;
      return he(ue(e.insights, [["selection", JSON.stringify(U(t))], ["metric_set_id", a]]), n, (i) => R(i, t, a));
    },
    compare(t, s, n) {
      return he(ue(e.compare, [
        ["left", JSON.stringify(U(t.left))],
        ["right", JSON.stringify(U(t.right))],
        ["metric_set_id", s]
      ]), n, (a) => st(a, t.left, t.right, s));
    }
  };
}
function ds(e, t) {
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
}, us = class {
  constructor(e) {
    this.display = "chart", this.host = e;
    const t = e.transport || (e.routes ? cs(e.routes) : ps);
    this.insights = new rs((s, n) => t.insights(s, "", n), () => this.insightsLanded()), this.comparison = new ls((s, n) => t.compare(s, this.metricSet(), n), () => this.host.update(), () => !!this.metricSet());
  }
  show(e) {
    e && this.shown && f(e) === f(this.shown) || (this.insights.clear(), this.comparison.clear(), this.shown = e);
  }
  render(e) {
    const t = this.shown;
    return t ? e === "insights" ? Dt({
      scope: this.host.scope,
      selection: t,
      entry: this.insights.entry(t),
      display: this.display
    }) : as({
      scope: this.host.scope,
      shown: t,
      candidates: this.candidates(),
      choice: this.comparison.choice,
      pair: this.comparison.pair,
      describe: (s) => Ut(s, t, this.host.title),
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
    return e && t ? Bt(t, e, this.host.activeSelection(e.target_id), this.host.title) : [];
  }
  comparedSide(e = this.comparison.pair) {
    const t = this.shown;
    if (!(!e || !t))
      return f(e.left) === f(t) ? e.right : e.left;
  }
  replacement(e) {
    if (!e) return;
    const t = this.candidates();
    return e.context === "active" ? t.find((s) => s.active) : t.find((s) => !s.active && s.selection.context === e.context && ds(s.selection, e));
  }
  driftReason(e, t) {
    const s = this.host.title(e);
    return t && t.key === f(e) ? `${e.context === "active" ? `The active data on ${e.target_id}` : e.context === "prepared" ? `The prepared receipt ${e.receipt_id} of ${s}` : `The catalog example of ${s}`} was briefly unavailable. Compare again to read it.` : e.context === "active" ? t ? `The active data on ${e.target_id} changed since you chose it: it is now ${this.host.title(t.selection)} at generation ${t.selection.generation} (receipt ${t.selection.receipt_id}). Compare again to use the current active data.` : `The active data on ${e.target_id} you chose is no longer offered. Choose again to compare.` : e.context === "prepared" ? t ? `The prepared receipt ${e.receipt_id} of ${s} was replaced by receipt ${t.selection.receipt_id}. Compare again to use the current receipt.` : `The prepared receipt ${e.receipt_id} of ${s} is no longer offered. Choose again to compare.` : t ? `The catalog example of ${s} changed since you chose it. Compare again to use the current example.` : `The catalog example of ${s} is no longer offered. Choose again to compare.`;
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
function ms(e) {
  return new us(e);
}
export {
  Et as CONTEXT_LABELS,
  Fe as COVERAGE_STATUSES,
  ls as CompareSession,
  us as DataInsights,
  k as INSIGHT_LIMITS,
  rs as InsightsSession,
  os as WITHDRAWING,
  $s as catalogTitle,
  Bt as compareCandidates,
  F as coverageDays,
  ms as createDataInsights,
  cs as createHTTPInsightsTransport,
  It as defaultPair,
  Ut as describeSelection,
  B as pairKey,
  st as parseComparison,
  R as parseInsights,
  $e as parseMetric,
  we as provenanceText,
  as as renderCompare,
  St as renderComposition,
  Mt as renderCoverage,
  xe as renderDisplayToggle,
  Dt as renderInsights,
  q as renderInsightsFailure
};

//# sourceMappingURL=data-insights.js.map