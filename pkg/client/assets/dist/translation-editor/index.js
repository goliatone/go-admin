import { escapeAttribute as m, escapeHTML as d } from "../shared/html.js";
import { httpRequest as R, readCSRFToken as ie, readHTTPError as ne } from "../shared/transport/http-client.js";
import { extractStructuredError as V } from "../toast/error-helpers.js";
import { n as oe } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { asBoolean as g, asNumber as f, asRecord as c, asString as n, asStringArray as H } from "../shared/coercion.js";
import { C as le, E as ce, H as de, J as ue, Q as me, S as fe, U as pe, X as y, Y as ge, Z as he, _ as be, b as ye, d as A, g as ve, h as _e, i as xe, l as j, m as $e, nt as we, o as K, p as Se, rt as ke, s as Q, tt as Ce, u as B, v as Re, y as Ee } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationTimestampUTC as G, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as E } from "../shared/record-normalization.js";
import { c as Y, s as Te } from "../chunks/ui-states-1McZ5upU.js";
var Ae = "translation_variant_draft", je = "autosave", k = /* @__PURE__ */ new Map();
async function qe(e) {
  const t = _(e);
  if (!t) throw new Error("syncClientBasePath is required to load sync-core");
  return typeof window < "u" && window.__translationSyncCoreModule ? T(window.__translationSyncCoreModule) : (k.has(t) || k.set(t, Le(t)), k.get(t));
}
async function Le(e) {
  return typeof window < "u" && typeof window.__translationSyncCoreLoader == "function" ? T(await window.__translationSyncCoreLoader(e)) : T(await import(
    /* @vite-ignore */
    `${e}/index.js`
  ));
}
function T(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid translation sync-core runtime module");
  return e;
}
function _(e) {
  return String(e || "").trim().replace(/\/+$/, "");
}
function De(e, t, s) {
  const a = _(e);
  if (/\/variants$/i.test(a)) return a.replace(/\/variants$/i, "");
  const r = _(t);
  if (/\/assignments$/i.test(r)) return r.replace(/\/assignments$/i, "");
  const i = _(s), o = i.match(/^(.*)\/assignments(?:\/.*)?$/i);
  return o ? o[1] : a || r || i;
}
function Me(e) {
  return `${_(e) || "/admin"}/sync-client/sync-core`;
}
function Fe(e) {
  const t = {};
  for (const [s, a] of Object.entries(e || {})) {
    const r = String(s || "").trim(), i = String(a || "").trim();
    !r || !i || (t[r] = i);
  }
  return t;
}
function Pe(e) {
  try {
    const t = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost"), s = String(t.searchParams.get("channel") || "").trim();
    return s ? { channel: s } : {};
  } catch {
    return {};
  }
}
function Oe(e) {
  return Fe({
    ...Pe(e.endpoint),
    ...e.syncScope || {}
  });
}
function Be(e) {
  const t = Object.entries(e.scope || {}).filter(([s, a]) => s.trim() !== "" && a.trim() !== "").sort(([s], [a]) => s.localeCompare(a)).map(([s, a]) => `${encodeURIComponent(s)}=${encodeURIComponent(a)}`).join("&");
  return `${encodeURIComponent(e.kind)}::${encodeURIComponent(e.id)}::${t}`;
}
function q(e) {
  const t = c(e);
  return {
    required: g(t.required),
    complete: g(t.complete),
    missing: g(t.missing)
  };
}
function L(e) {
  const t = c(e), s = n(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: g(t.changed),
    comparison_mode: s,
    previous_source_value: n(t.previous_source_value),
    current_source_value: n(t.current_source_value)
  };
}
function D(e) {
  const t = c(e);
  return {
    valid: t.valid !== !1,
    message: n(t.message)
  };
}
function v(e, t) {
  const s = c(e), a = {};
  for (const [r, i] of Object.entries(s))
    r.trim() && (a[r.trim()] = t(i));
  return a;
}
function Ie(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = c(s), r = n(a.term), i = n(a.preferred_translation);
    !r || !i || t.push({
      term: r,
      preferred_translation: i,
      notes: n(a.notes) || void 0,
      field_paths: H(a.field_paths)
    });
  }
  return t;
}
function ze(e) {
  const t = c(e);
  return {
    available: g(t.available),
    title: n(t.title),
    summary: n(t.summary) || n(t.summary_markdown),
    rules: H(t.rules)
  };
}
function W(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function Ne(e) {
  const t = c(e), s = n(t.id), a = n(t.filename);
  return !s && !a ? null : {
    id: s || a || "attachment",
    kind: n(t.kind) || "reference",
    filename: a || s || "attachment",
    byte_size: f(t.byte_size),
    uploaded_at: n(t.uploaded_at),
    description: n(t.description),
    url: n(t.url)
  };
}
function Ue(e) {
  return Array.isArray(e) ? e.map((t) => Ne(t)).filter((t) => t !== null) : [];
}
function Ve(e, t) {
  const s = c(e), a = c(s.kinds), r = {};
  for (const [i, o] of Object.entries(a)) {
    const l = f(o);
    i.trim() && (r[i.trim()] = l);
  }
  if (!Object.keys(r).length) for (const i of t) r[i.kind] = (r[i.kind] || 0) + 1;
  return {
    total: f(s.total, t.length),
    kinds: r
  };
}
function He(e) {
  return n(e) === "comment" ? "comment" : "event";
}
function Ke(e) {
  const t = c(e), s = n(t.id);
  return s ? {
    id: s,
    entry_type: He(t.entry_type),
    title: n(t.title),
    body: n(t.body),
    action: n(t.action),
    actor_id: n(t.actor_id),
    author_id: n(t.author_id),
    created_at: n(t.created_at),
    kind: n(t.kind),
    metadata: c(t.metadata)
  } : null;
}
function Qe(e) {
  const t = c(e), s = Array.isArray(t.items) ? t.items.map((a) => Ke(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(t.page, 1) || 1,
    per_page: f(t.per_page, 10) || 10,
    total: f(t.total, s.length),
    has_more: g(t.has_more),
    next_page: f(t.next_page)
  };
}
function Ge(e) {
  const t = c(e), s = n(t.id), a = n(t.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: n(t.kind) || "review_feedback",
    created_at: n(t.created_at),
    author_id: n(t.author_id) || void 0
  };
}
function Ye(e, t) {
  const s = c(e), a = Array.isArray(s.comments) ? s.comments.map((i) => Ge(i)).filter((i) => i !== null) : [], r = n(s.last_rejection_reason || t) || void 0;
  return !a.length && r && a.push({
    id: "last-rejection-reason",
    body: r,
    kind: "review_feedback",
    created_at: ""
  }), {
    last_rejection_reason: r,
    comments: a
  };
}
function We(e) {
  const t = c(e), s = n(t.id), a = n(t.message);
  return !s || !a ? null : {
    id: s,
    category: n(t.category) === "style" ? "style" : "terminology",
    severity: n(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: n(t.field_path),
    message: a
  };
}
function Xe(e, t) {
  const s = c(e);
  return {
    category: n(s.category) || t,
    enabled: g(s.enabled),
    feature_flag: n(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function X(e) {
  const t = c(e), s = c(t.summary), a = c(t.categories), r = {};
  for (const [o, l] of Object.entries(a))
    o.trim() && (r[o.trim()] = Xe(l, o.trim()));
  const i = Array.isArray(t.findings) ? t.findings.map((o) => We(o)).filter((o) => o !== null) : [];
  return {
    enabled: g(t.enabled),
    summary: {
      finding_count: f(s.finding_count, i.length),
      warning_count: f(s.warning_count),
      blocker_count: f(s.blocker_count)
    },
    categories: r,
    findings: i,
    save_blocked: g(t.save_blocked),
    submit_blocked: g(t.submit_blocked)
  };
}
function Je(e) {
  const t = c(e);
  return {
    id: n(t.id || t.assignment_id),
    status: n(t.status || t.queue_state),
    queue_state: n(t.queue_state || t.status),
    source_title: n(t.source_title),
    source_path: n(t.source_path),
    assignee_id: n(t.assignee_id),
    reviewer_id: n(t.reviewer_id),
    due_state: n(t.due_state),
    due_date: n(t.due_date),
    version: f(t.version || t.row_version),
    row_version: f(t.row_version || t.version),
    updated_at: n(t.updated_at)
  };
}
function Ze(e, t = "") {
  const s = c(e), a = n(s.locale).trim().toLowerCase();
  if (!a) return null;
  const r = n(s.href).trim(), i = g(s.enabled) && r !== "", o = n(s.reason || s.disabled_reason);
  return {
    locale: a,
    label: n(s.label) || a.toUpperCase(),
    current: g(s.current) || t !== "" && a === t,
    source: g(s.source),
    enabled: i,
    disabled: g(s.disabled) || !i,
    reason: o,
    href: i ? r : void 0,
    assignment_id: n(s.assignment_id) || void 0,
    status: n(s.status) || void 0,
    work_scope: n(s.work_scope) || void 0
  };
}
function et(e, t) {
  const s = c(e), a = (n(s.current_locale) || n(t.target_locale) || n(t.locale)).trim().toLowerCase(), r = (n(s.source_locale) || n(t.source_locale)).trim().toLowerCase(), i = Array.isArray(s.locales) ? s.locales.map((o) => Ze(o, a)).filter((o) => o !== null) : [];
  return {
    family_id: n(s.family_id) || n(t.family_id),
    current_locale: a,
    source_locale: r,
    current_work_scope: n(s.current_work_scope),
    family_detail_url: n(s.family_detail_url),
    locales: i
  };
}
function J(e, t) {
  const s = c(e), a = c(t);
  return {
    glossary_matches: Ie(s.glossary_matches ?? a.glossary_matches),
    style_guide_summary: ze(s.style_guide_summary ?? a.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function w(e) {
  const t = c(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const i = oe(r);
    !i || !a.trim() || (s[a.trim()] = i);
  }
  return s;
}
function Z(e, t, s, a, r, i) {
  if (Array.isArray(e.fields)) return e.fields.map((l) => {
    const u = c(l), p = n(u.path);
    if (!p) return null;
    const h = Object.prototype.hasOwnProperty.call(s, p);
    return {
      path: p,
      label: n(u.label) || p,
      input_type: n(u.input_type) || "text",
      required: g(u.required),
      source_value: n(u.source_value) || t[p] || "",
      target_value: h ? s[p] : n(u.target_value),
      completeness: q(u.completeness ?? a[p]),
      drift: L(u.drift ?? r[p]),
      validation: D(u.validation ?? i[p]),
      glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((b) => b && typeof b == "object") : []
    };
  }).filter((l) => !!l);
  const o = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(i)
  ]);
  return Array.from(o).sort().map((l) => ({
    path: l,
    label: l,
    input_type: "text",
    required: a[l]?.required === !0,
    source_value: t[l] || "",
    target_value: s[l] || "",
    completeness: a[l] ?? {
      required: !1,
      complete: !0,
      missing: !1
    },
    drift: r[l] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: t[l] || ""
    },
    validation: i[l] ?? {
      valid: !0,
      message: ""
    },
    glossary_hits: []
  }));
}
function tt(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), a = E(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), r = E(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), i = v(s.field_completeness, q), o = v(s.field_drift, L), l = v(s.field_validations, D), u = Ue(s.attachments);
  return {
    assignment_id: n(s.assignment_id),
    assignment_row_version: f(s.assignment_row_version || s.assignment_version || c(s.translation_assignment).row_version || c(s.translation_assignment).version),
    variant_id: n(s.variant_id),
    family_id: n(s.family_id),
    entity_type: n(s.entity_type) || void 0,
    source_locale: n(s.source_locale) || void 0,
    target_locale: n(s.target_locale) || void 0,
    status: n(s.status) || void 0,
    priority: n(s.priority) || void 0,
    due_date: n(s.due_date) || void 0,
    row_version: f(s.row_version || s.version),
    source_fields: a,
    target_fields: r,
    fields: Z(s, a, r, i, o, l),
    field_completeness: i,
    field_drift: o,
    field_validations: l,
    source_target_drift: c(s.source_target_drift),
    history: Qe(s.history),
    attachments: u,
    attachment_summary: Ve(s.attachment_summary, u),
    translation_assignment: Je(s.translation_assignment),
    assist: J(s.assist, s),
    last_rejection_reason: n(s.last_rejection_reason) || void 0,
    review_feedback: Ye(s.review_feedback, s.last_rejection_reason),
    qa_results: X(s.qa_results),
    assignment_action_states: w(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: w(s.review_action_states ?? s.review_actions),
    locale_navigation: et(s.locale_navigation, s)
  };
}
function st(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e);
  return {
    variant_id: n(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: E(s.fields ?? s.target_fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: v(s.field_completeness, q),
    field_drift: v(s.field_drift, L),
    field_validations: v(s.field_validations, D),
    assist: J(s.assist, s),
    qa_results: X(s.qa_results),
    assignment_action_states: w(s.assignment_action_states),
    review_action_states: w(s.review_action_states)
  };
}
function M(e) {
  return Z({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function F(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function at(e) {
  return {
    detail: {
      ...e,
      fields: M(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: F(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function x(e, t, s) {
  const a = t.trim();
  if (!a) return e;
  const r = {
    ...e.detail.target_fields,
    [a]: s.trim()
  }, i = e.detail.field_completeness[a]?.required === !0, o = {
    ...e.detail.field_completeness,
    [a]: {
      required: i,
      complete: !i || s.trim() !== "",
      missing: i && s.trim() === ""
    }
  }, l = {
    ...e.detail.field_validations,
    [a]: {
      valid: !o[a].missing,
      message: o[a].missing ? e.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: r,
    field_completeness: o,
    field_validations: l
  };
  return u.fields = M(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: F(u)
  };
}
function rt(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function $(e, t) {
  const s = st(t), a = {
    ...e.detail,
    row_version: s.row_version,
    target_fields: {
      ...e.detail.target_fields,
      ...s.fields
    },
    field_completeness: s.field_completeness,
    field_drift: s.field_drift,
    field_validations: s.field_validations,
    assist: s.assist,
    qa_results: s.qa_results,
    assignment_action_states: s.assignment_action_states,
    review_action_states: s.review_action_states
  };
  return a.fields = M(a), {
    ...e,
    detail: a,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: F(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function C(e) {
  const t = c(e.data), s = f(t.row_version || t.version, e.revision) || e.revision;
  return { data: {
    ...t,
    row_version: s
  } };
}
function I(e) {
  return Object.keys(c(e?.data)).length > 0;
}
function it(e, t) {
  const s = c(t), a = c(s.error), r = c(a.details ?? s.details), i = c(s.resource || r.resource || c(s.conflict).latestSnapshot || c(a.conflict).latestSnapshot), o = i.data && typeof i.data == "object" ? c(i.data) : {}, l = f(i.revision), u = c(a.metadata), p = Object.keys(o).length ? {
    ...o,
    row_version: f(o.row_version || o.version, l) || l
  } : c(u.latest_server_state_record);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: p
    }
  };
}
function ee(e) {
  const t = c(e), s = c(t.cause), a = c(t.details), r = t.resource || a.resource;
  return t.code === "STALE_REVISION" ? {
    error: {
      code: "STALE_REVISION",
      message: n(t.message) || "stale revision",
      details: {
        current_revision: f(t.currentRevision || a.current_revision),
        resource: r
      }
    },
    resource: r,
    conflict: t.conflict
  } : s.code === "STALE_REVISION" ? ee(s) : t;
}
function nt(e) {
  const t = c(e), s = c(t.cause);
  return t.code === "STALE_REVISION" || s.code === "STALE_REVISION";
}
function ot(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(t))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
var lt = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function z(e, t) {
  const s = await V(e);
  return new lt({
    message: s.message || await ne(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: n(e.headers.get("x-request-id")) || void 0,
    traceId: W(e.headers) || void 0
  });
}
async function ct(e) {
  const t = await R(e, { method: "GET" }), s = n(t.headers.get("x-request-id")) || void 0, a = W(t.headers) || void 0;
  if (!t.ok) {
    const i = await V(t);
    return {
      status: i.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: i.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: i.textCode
    };
  }
  const r = tt(await t.json());
  return r.assignment_id ? {
    status: "ready",
    detail: r,
    requestId: s,
    traceId: a,
    statusCode: t.status
  } : {
    status: "empty",
    message: "Assignment detail payload was empty.",
    requestId: s,
    traceId: a,
    statusCode: t.status
  };
}
function dt(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function ut(e) {
  return n(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function mt(e) {
  return e === "review" || e === "in_review";
}
function P(e) {
  return mt(ut(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function O(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function ft(e, t, s) {
  let a = "idle";
  return e?.autosave.conflict ? a = "conflict" : e?.autosave.pending ? a = "saving" : t ? a = "dirty" : s && (a = "saved"), {
    tone: ue(a),
    text: ge(a, s),
    state: a
  };
}
function te(e) {
  const t = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function pt(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(e.kind)}" role="status" aria-live="polite">
      ${d(e.message)}
    </div>
  ` : "";
}
function gt(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? y("error") : y("success"), a = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${y("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function ht(e, t) {
  return e.summary.blocker_count > 0 ? {
    kind: "conflict",
    message: `Draft saved with ${e.summary.blocker_count} QA blocker${e.summary.blocker_count === 1 ? "" : "s"} and ${e.summary.warning_count} warning${e.summary.warning_count === 1 ? "" : "s"}. Submit remains blocked.`,
    lastSaved: t ? `Autosaved · ${e.summary.blocker_count} blocker${e.summary.blocker_count === 1 ? "" : "s"} remain` : "Draft saved"
  } : e.summary.warning_count > 0 ? {
    kind: "success",
    message: `Draft saved with ${e.summary.warning_count} QA warning${e.summary.warning_count === 1 ? "" : "s"}. Submit remains available.`,
    lastSaved: t ? `Autosaved · ${e.summary.warning_count} warning${e.summary.warning_count === 1 ? "" : "s"}` : "Draft saved"
  } : {
    kind: "success",
    message: "Draft saved.",
    lastSaved: t ? "Draft saved automatically" : "Draft saved"
  };
}
function bt(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function yt(e, t) {
  const s = e.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function vt() {
  return Te({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${ce} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function N(e, t) {
  return Y({
    tag: "section",
    containerClass: `${Se} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: _e,
    message: t,
    messageClass: `${$e} mt-2`
  });
}
function U(e, t, s) {
  return Y({
    tag: "section",
    containerClass: `${ve} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Re,
    message: t,
    messageClass: `${be} mt-2`,
    actionsHtml: te(s),
    role: "alert"
  });
}
function _t(e, t, s, a, r, i = "") {
  const o = e.assignment_action_states.submit_review, l = !o?.enabled || r || a || e.qa_results.submit_blocked, u = r || !s, p = (e.source_locale || "source").toUpperCase(), h = (e.target_locale || "target").toUpperCase(), b = e.translation_assignment, re = e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : o?.reason || "";
  return `
    <section class="${A} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${fe}">Assignment editor</p>
          <div>
            <h1 class="${le}">${d(b.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${d(p)} to ${d(h)} • ${d(S(e.status || b.status || "draft"))} • Priority ${d(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${d(b.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${d(b.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${m(t.state)}">${d(t.text)}</span>
            ${gt(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="${j}"
            data-action="save-draft"
            ${u ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="${Q}"
            data-action="submit-review"
            title="${m(re)}"
            ${l ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : o?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function xt(e) {
  const t = d(e.label || e.locale.toUpperCase()), s = "inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors", a = "bg-blue-100 text-blue-700", r = "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900", i = "cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200", o = [
    `data-locale-chip="${m(e.locale)}"`,
    e.current ? 'data-locale-current="true"' : "",
    e.disabled ? 'data-locale-disabled="true"' : "",
    e.assignment_id ? `data-assignment-id="${m(e.assignment_id)}"` : ""
  ].filter(Boolean).join(" ");
  if (e.enabled && e.href) {
    const u = e.current ? a : r, p = e.current ? ' aria-current="page"' : "";
    return `<a href="${m(e.href)}" class="${s} ${u}" ${o}${p} aria-label="Open ${m(e.label || e.locale.toUpperCase())} assignment">${t}</a>`;
  }
  if (e.current) return `<span class="${s} ${a}" ${o} aria-current="page">${t}</span>`;
  const l = e.reason || "No translation assignment exists for this locale.";
  return `<span class="${s} ${i}" ${o} aria-disabled="true" title="${m(l)}" aria-label="${m(`${e.label || e.locale.toUpperCase()} unavailable: ${l}`)}">${t}</span>`;
}
function $t(e) {
  const t = e.locale_navigation, s = t.locales, a = t.current_locale || (e.target_locale || "").toLowerCase(), r = (a || "target").toUpperCase();
  if (!t.family_id && s.length === 0 && !t.family_detail_url) return "";
  const i = s.length > 0 ? s : [{
    locale: a,
    label: r,
    current: !0,
    source: !1,
    enabled: !1,
    disabled: !1,
    reason: ""
  }];
  return `
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-editor-locale-summary="true" data-family-id="${m(t.family_id || e.family_id)}" data-current-locale="${m(a)}">
      <div class="p-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Locale</span>
            <div class="flex flex-wrap items-center gap-1" data-editor-locale-chips="true">
              ${i.map(xt).join("")}
            </div>
          </div>
        </div>
        ${t.family_detail_url ? `
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p class="text-xs text-gray-500">Use the family detail view for blocker ordering, publish-gate rationale, and assignment context.</p>
            <a href="${m(t.family_detail_url)}" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800" data-family-detail-link="true" aria-label="Open translation family detail">
              Open family detail
              <span aria-hidden="true">›</span>
            </a>
          </div>
        ` : ""}
      </div>
    </section>
  `;
}
function wt(e) {
  if (!se(e)) return "";
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim()), s = !!(e.drift.current_source_value || e.source_value);
  return !t && !s ? `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    ` : t ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${d(e.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${d(e.drift.current_source_value || e.source_value || "Current value unavailable")}</p>
    </div>
  ` : `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
}
function se(e) {
  if (!e.drift.changed) return !1;
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim());
  return e.drift.comparison_mode !== "hash_only" || t;
}
function St(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${Ee}">
          <span class="${ye}">${d(n(s.term))}</span>
          → ${d(n(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function kt(e) {
  const t = e.fields || [], s = e.qa_results;
  let a = 0, r = 0, i = 0, o = 0, l = null;
  for (const u of t)
    u.completeness.complete && !u.completeness.missing && a++, u.completeness.required && u.completeness.missing && (r++, l || (l = u.path)), u.drift.changed && (i++, l || (l = u.path)), u.validation.valid || (o++, l || (l = u.path));
  if (!l && s.enabled && s.summary.blocker_count > 0 && s.findings.length > 0) {
    const u = s.findings.find((p) => p.severity === "blocker");
    u?.field_path && (l = u.field_path);
  }
  return {
    totalFields: t.length,
    completeFields: a,
    missingRequiredFields: r,
    sourceChangedFields: i,
    validationErrors: o,
    qaBlockers: s.enabled ? s.summary.blocker_count : 0,
    qaWarnings: s.enabled ? s.summary.warning_count : 0,
    firstIssuePath: l
  };
}
function Ct(e) {
  const t = e.missingRequiredFields > 0 || e.sourceChangedFields > 0 || e.validationErrors > 0 || e.qaBlockers > 0, s = e.completeFields === e.totalFields && e.missingRequiredFields === 0 && e.validationErrors === 0 && e.qaBlockers === 0, a = [], r = s ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200";
  a.push(`<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${r}">${e.completeFields}/${e.totalFields} complete</span>`), e.missingRequiredFields > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.missingRequiredFields} missing required</span>`), e.sourceChangedFields > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.sourceChangedFields} source changed</span>`), e.validationErrors > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.validationErrors} validation ${e.validationErrors === 1 ? "error" : "errors"}</span>`), e.qaBlockers > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.qaBlockers} QA ${e.qaBlockers === 1 ? "blocker" : "blockers"}</span>`), e.qaWarnings > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.qaWarnings} QA ${e.qaWarnings === 1 ? "warning" : "warnings"}</span>`);
  const i = s ? "border-emerald-200 bg-emerald-50" : t ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50", o = e.firstIssuePath ? `<button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        data-jump-to-field="${m(e.firstIssuePath)}"
        title="Jump to first issue"
      >
        Jump to issue
        <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
        </svg>
      </button>` : "";
  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${i}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${a.join("")}</div>
      ${o}
    </section>
  `;
}
function Rt(e) {
  return e.source_value && e.source_value.trim() ? d(e.source_value) : e.required ? '<span class="text-amber-600 italic">Source text pending - required field</span>' : '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}
function Et(e) {
  return `
    <section class="space-y-4">
      ${Ct(kt(e))}
      ${e.fields.map((t) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(t.path)}" id="field-${m(t.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${d(t.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(t.path)}${t.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${K}"
              data-copy-source="${m(t.path)}"
              aria-label="Copy source text to translation field for ${m(t.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${Rt(t)}</div>
            </div>
            <div class="rounded-xl border ${t.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(t.path)}">Translation</label>
              ${t.input_type === "textarea" ? `<textarea id="editor-field-${m(t.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}">${d(t.target_value)}</textarea>` : `<input id="editor-field-${m(t.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}" value="${m(t.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${t.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${t.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${se(t) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${t.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(t.path)}">${d(t.validation.message || "Validation error")}</p>`}
              ${wt(t)}
              ${St(t)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function ae(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = c(s), r = n(a.suggested_text) || n(a.target_text);
    r && t.push({
      id: n(a.id) || `tm-${t.length}`,
      score: Tt(a.score, a.match_score),
      sourceLabel: n(a.source_label) || n(a.source) || "Internal TM",
      localePair: n(a.locale_pair) || "",
      fieldPath: n(a.field_path) || "",
      suggestedText: r,
      isStaleSource: g(a.is_stale_source) || g(a.stale_source)
    });
  }
  return t.sort((s, a) => a.score - s.score);
}
function Tt(e, t) {
  const s = f(e) || f(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const a = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(a)));
}
function At(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function jt(e) {
  return e.length ? `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${e.map((t) => `
          <li class="rounded-xl border ${t.isStaleSource ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm" data-tm-suggestion="${m(t.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${d(t.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${At(t.score)} ${t.score}%</span>
                  <span>${d(t.sourceLabel)}</span>
                  ${t.localePair ? `<span class="text-gray-400">${d(t.localePair)}</span>` : ""}
                  ${t.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ""}
                </div>
                ${t.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${d(t.fieldPath)}</p>` : ""}
              </div>
              <button
                type="button"
                class="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-insert-tm="${m(t.id)}"
                data-insert-text="${m(t.suggestedText)}"
                data-insert-field="${m(t.fieldPath)}"
                title="Insert this suggestion${t.isStaleSource ? " (source may have changed)" : ""}"
              >
                Insert
              </button>
            </div>
          </li>
        `).join("")}
      </ul>
    </div>
  ` : `
      <div class="mt-4">
        <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
        <p class="mt-3 text-sm text-gray-500">No matching suggestions from translation memory.</p>
      </div>
    `;
}
function qt(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${jt(ae(e.assist.translation_memory_suggestions))}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${d(a.term)}</strong> → ${d(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${d(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div data-assist-section="style-guide">
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${d(s.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${d(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${s.rules.map((a) => `<li>• ${d(a)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function Lt(e) {
  const t = e.history.items.map((s) => ({
    id: s.id,
    title: s.title || S(s.entry_type),
    body: s.body || "",
    created_at: s.created_at,
    badge: s.kind === "review_feedback" ? "Reviewer feedback" : s.entry_type === "comment" ? "Comment" : "Activity",
    tone: s.kind === "review_feedback" ? "review" : "event"
  }));
  return e.qa_results.enabled && e.qa_results.summary.finding_count > 0 && t.push({
    id: "timeline:qa-summary",
    title: "Current QA findings",
    body: `${e.qa_results.summary.blocker_count} blocker${e.qa_results.summary.blocker_count === 1 ? "" : "s"} and ${e.qa_results.summary.warning_count} warning${e.qa_results.summary.warning_count === 1 ? "" : "s"} are active on this draft.`,
    created_at: e.translation_assignment.updated_at || e.due_date || "",
    badge: e.qa_results.submit_blocked ? "Submit blocked" : "Warnings visible",
    tone: "qa"
  }), e.last_rejection_reason && !t.some((s) => s.body === e.last_rejection_reason) && t.push({
    id: "timeline:last-rejection-reason",
    title: "Reviewer feedback",
    body: e.last_rejection_reason,
    created_at: e.translation_assignment.updated_at || "",
    badge: "Reviewer feedback",
    tone: "review"
  }), t.sort((s, a) => {
    const r = s.created_at ? Date.parse(s.created_at) : 0;
    return (a.created_at ? Date.parse(a.created_at) : 0) - r;
  });
}
function Dt(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((i) => i.severity === "blocker"), a = t.findings.filter((i) => i.severity !== "blocker"), r = (i, o) => {
    if (!i.length) return "";
    const l = he(o);
    return `
      <section data-qa-group="${m(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${i.length})` : `Warnings (${i.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${i.map((u) => `
          <li class="${l.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${d(S(u.category))}</strong>
              <span class="${l.badge}">${d(u.severity)}</span>
            </div>
            <p class="mt-2">${d(u.message)}</p>
            ${u.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${d(u.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${me(t.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${t.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${t.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${t.submit_blocked ? y("error") : y("neutral")}">
          ${t.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${y("warning")}">Warnings ${t.summary.warning_count}</span>
        <span class="${y("error")}">Blockers ${t.summary.blocker_count}</span>
      </div>
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${r(s, "blocker")}${r(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function Mt(e, t) {
  const s = e.review_action_states.approve, a = e.review_action_states.reject;
  return P(e) ? `
    <section
      class="rounded-xl border border-gray-200 bg-white p-5"
      data-editor-panel="review-actions"
      aria-label="Review actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Review actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        ${[{
    key: "approve",
    label: "Approve",
    state: s,
    tone: "border-emerald-300 text-emerald-700"
  }, {
    key: "reject",
    label: "Request changes",
    state: a,
    tone: "border-rose-300 text-rose-700"
  }].map((r) => {
    const i = !r.state?.enabled || t;
    return `
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${r.tone} ${i ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
              data-action="${m(r.key)}"
              title="${m(r.state?.reason || "")}"
              ${i ? 'disabled aria-disabled="true"' : ""}
            >
              ${d(r.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function Ft(e, t) {
  return e ? `
    <div class="${pe}" data-reject-modal="true">
      <section class="${de}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${K}" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${d(e.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${d(e.comment)}</textarea>
        </label>
        ${e.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${d(e.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${j}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${xe}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function Pt(e, t) {
  if (!O(e)) return "";
  const s = e.assignment_action_states.archive, a = !s?.enabled || t;
  return `
    <section
      class="${A} p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="${j}"
          data-action="archive"
          title="${m(s?.reason || "")}"
          ${a ? 'disabled aria-disabled="true"' : ""}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}
function Ot(e) {
  return `
    <section class="${A} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${e.attachment_summary.total}</span>
      </div>
      ${e.attachments.length ? `<ul class="mt-4 space-y-3">${e.attachments.map((t) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${d(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${d(dt(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${d(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${d(G(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function Bt(e) {
  const t = e.history, s = Lt(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => {
    const r = Ce(a.tone);
    return `
            <li class="${r.container}" data-history-entry="${m(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${r.title}">${d(a.title)}</p>
                  <span class="${r.badge}">${d(a.badge)}</span>
                </div>
                <span class="${r.time}">${d(G(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${d(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${B}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${B}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function It(e) {
  const t = P(e), s = O(e), a = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, r = ae(e.assist.translation_memory_suggestions).length, i = e.assist.glossary_matches.length, o = e.attachment_summary.total, l = e.history.total;
  return {
    actions: null,
    qa: a > 0 ? String(a) : null,
    assist: r + i > 0 ? String(r + i) : null,
    files: o > 0 ? String(o) : null,
    history: l > 0 ? String(l) : null
  };
}
function zt(e, t, s = "actions", a) {
  const r = It(e), i = P(e), o = O(e), l = i || o, u = `
    <nav class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Editor sidebar sections">
      ${[
    {
      id: "actions",
      label: "Actions",
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/></svg>',
      badge: r.actions
    },
    {
      id: "qa",
      label: "QA",
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM6.5 7.5a.5.5 0 0 1 1 0v2.5a.5.5 0 0 1-1 0V7.5zm2 0a.5.5 0 0 1 1 0v2.5a.5.5 0 0 1-1 0V7.5z"/></svg>',
      badge: r.qa
    },
    {
      id: "assist",
      label: "Assist",
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a3 3 0 0 0-3 3v2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1V4a3 3 0 0 0-3-3zM6 4a2 2 0 1 1 4 0v2H6V4z"/></svg>',
      badge: r.assist
    },
    {
      id: "files",
      label: "Files",
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M4 0h5.5v1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h1V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z"/><path d="M9.5 3V0L14 4.5h-3A1.5 1.5 0 0 1 9.5 3z"/></svg>',
      badge: r.files
    },
    {
      id: "history",
      label: "History",
      icon: '<svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zM8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1a6 6 0 1 1 0 12A6 6 0 0 1 8 2z"/><path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/></svg>',
      badge: r.history
    }
  ].map((h) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${s === h.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}"
          data-sidebar-tab="${m(h.id)}"
          role="tab"
          aria-selected="${s === h.id}"
          aria-controls="sidebar-panel-${m(h.id)}"
        >
          ${h.icon}
          <span class="hidden sm:inline">${d(h.label)}</span>
          ${h.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${d(h.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, p = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${i ? Mt(e, t) : ""}
        ${o ? Pt(e, t) : ""}
        ${l ? "" : `
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <h2 class="text-lg font-semibold text-gray-900">Actions</h2>
            <p class="mt-3 text-sm text-gray-500">No actions available for this assignment in its current state.</p>
          </div>
        `}
      </div>
    `,
    qa: `
      <div id="sidebar-panel-qa" class="space-y-4" role="tabpanel" data-sidebar-panel="qa" ${s !== "qa" ? "hidden" : ""}>
        ${Dt(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${qt(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${Ot(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${Bt(e)}
        ${te(a || {
      status: "ready",
      detail: e
    })}
      </div>
    `
  };
  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${u}
      ${Object.values(p).join("")}
    </aside>
  `;
}
function Nt(e, t, s = {}, a = {}) {
  if (e.status === "loading") return vt();
  if (e.status === "empty") return N("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return U("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return U("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const r = t?.detail || e.detail;
  if (!r) return N("Assignment unavailable", "No assignment detail payload was returned.");
  const i = !!(t && Object.keys(t.dirty_fields).length), o = ft(t || null, i, a.lastSavedMessage || ""), l = t?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${pt(a.feedback || null)}
      ${_t(r, o, i, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${$t(r)}
      ${l ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${Q}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${Et(r)}
        </div>
        <div class="order-2">
          ${zt(r, a.submitting === !0, a.activeSidebarTab || "actions", e)}
        </div>
      </div>
      ${Ft(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function Ut(e, t, s, a = {}, r = {}) {
  e.innerHTML = Nt(t, s, a, r);
}
var Vt = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.syncCoreModulePromise = null, this.syncCoreModule = null, this.syncCache = null, this.syncEngine = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.activeSidebarTab = "actions";
    const t = e.basePath || "/admin";
    this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase || "",
      actionEndpointBase: e.actionEndpointBase,
      syncBaseURL: e.syncBaseURL || De(e.variantEndpointBase || "", e.actionEndpointBase, e.endpoint),
      syncClientBasePath: e.syncClientBasePath || Me(t),
      syncResourceKind: e.syncResourceKind || Ae,
      syncScope: Oe(e),
      basePath: t
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (t) => {
      (t.ctrlKey || t.metaKey) && t.key === "s" && (t.preventDefault(), this.saveDirtyFields(!1)), t.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "";
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await ct(e ? ot(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? (this.editorState = at(this.loadState.detail), await this.hydrateDraftSyncFromRead(this.loadState.detail)) : this.editorState = null, this.render();
  }
  render() {
    this.container && (Ut(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), we(this.container));
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        const s = t.currentTarget, a = s.dataset.fieldInput || "";
        this.editorState = x(this.editorState, a, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.copySource || "", s = this.editorState?.detail.fields.find((a) => a.path === t);
        !s || !this.editorState || (this.editorState = x(this.editorState, t, s.source_value), this.scheduleAutosave(), this.render());
      });
    }), this.container.querySelector('[data-action="save-draft"]')?.addEventListener("click", () => {
      this.saveDirtyFields(!1);
    }), this.container.querySelector('[data-action="submit-review"]')?.addEventListener("click", () => {
      this.submitForReview();
    }), this.container.querySelector('[data-action="approve"]')?.addEventListener("click", () => {
      this.runReviewAction("approve");
    }), this.container.querySelector('[data-action="reject"]')?.addEventListener("click", () => {
      this.openRejectDialog();
    }), this.container.querySelector('[data-action="archive"]')?.addEventListener("click", () => {
      this.runReviewAction("archive");
    }), this.container.querySelectorAll('[data-action="cancel-reject"]').forEach((e) => {
      e.addEventListener("click", () => {
        this.closeRejectDialog();
      });
    }), this.container.querySelector('[data-action="confirm-reject"]')?.addEventListener("click", () => {
      this.confirmReject();
    }), this.container.querySelector('[data-reject-reason="true"]')?.addEventListener("input", (e) => {
      const t = e.currentTarget;
      this.rejectDraft && (this.rejectDraft = {
        ...this.rejectDraft,
        reason: t.value,
        error: ""
      });
    }), this.container.querySelector('[data-reject-comment="true"]')?.addEventListener("input", (e) => {
      const t = e.currentTarget;
      this.rejectDraft && (this.rejectDraft = {
        ...this.rejectDraft,
        comment: t.value
      });
    }), this.container.querySelector('[data-action="reload-server-state"]')?.addEventListener("click", () => {
      this.reloadServerDraft();
    }), this.container.querySelector('[data-history-prev="true"]')?.addEventListener("click", () => {
      const e = (this.editorState?.detail.history.page || 1) - 1;
      e >= 1 && this.load(e);
    }), this.container.querySelector('[data-history-next="true"]')?.addEventListener("click", () => {
      const e = this.editorState?.detail.history;
      e?.has_more && this.load(e.next_page || e.page + 1);
    }), this.container.querySelector("[data-jump-to-field]")?.addEventListener("click", (e) => {
      const t = e.currentTarget.dataset.jumpToField;
      if (!t || !this.container) return;
      const s = this.container.querySelector(`[data-editor-field="${CSS.escape(t)}"]`);
      if (s) {
        s.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
        const a = s.querySelector("[data-field-input]");
        a && setTimeout(() => a.focus(), 300);
      }
    }), this.container.querySelectorAll("[data-sidebar-tab]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.sidebarTab;
        t && t !== this.activeSidebarTab && (this.activeSidebarTab = t, this.render());
      });
    }), this.container.querySelectorAll("[data-insert-tm]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.insertField || "", s = e.dataset.insertText || "";
        !t || !s || !this.editorState || (this.editorState = x(this.editorState, t, s), this.feedback = {
          kind: "success",
          message: "Translation memory suggestion inserted."
        }, this.scheduleAutosave(), this.render());
      });
    }));
  }
  scheduleAutosave() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.autosaveTimer = setTimeout(() => {
      this.saveDirtyFields(!0);
    }, 600);
  }
  async saveDirtyFields(e) {
    if (!this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return !0;
    this.saving = !0, this.editorState = rt(this.editorState), this.render();
    const t = this.editorState.detail;
    try {
      const s = await this.mutateDraftSync(t, this.editorState.dirty_fields, e);
      this.editorState = $(this.editorState, C(s.snapshot));
      const a = ht(this.editorState.detail.qa_results, e);
      return this.lastSavedMessage = a.lastSaved, (!e || a.kind === "conflict") && (this.feedback = {
        kind: a.kind,
        message: a.message
      }), this.saving = !1, this.render(), !0;
    } catch (s) {
      return nt(s) ? (this.editorState = it(this.editorState, ee(s)), this.feedback = {
        kind: "conflict",
        message: "Autosave conflict detected. Reload the latest server draft."
      }, this.saving = !1, this.render(), !1) : (this.feedback = {
        kind: "error",
        message: s instanceof Error ? s.message : "Failed to save draft"
      }, this.saving = !1, this.render(), !1);
    }
  }
  async reloadServerDraft() {
    if (!this.editorState) return;
    const e = this.editorState.autosave.conflict;
    if (e && Object.keys(e).length > 0) {
      this.editorState = $(this.editorState, { data: e }), this.feedback = {
        kind: "conflict",
        message: "Reloaded the latest server draft."
      }, this.saving = !1, this.render();
      return;
    }
    try {
      const t = await (await this.ensureDraftSyncResource(this.editorState.detail)).refresh({ force: !0 });
      if (!I(t)) throw new Error("Sync refresh did not return a usable draft snapshot");
      this.editorState = $(this.editorState, C(t)), this.feedback = {
        kind: "conflict",
        message: "Reloaded the latest server draft."
      }, this.saving = !1, this.render();
    } catch (t) {
      this.feedback = {
        kind: "error",
        message: t instanceof Error ? t.message : "Failed to reload server draft"
      }, this.saving = !1, this.render();
    }
  }
  async hydrateDraftSyncFromRead(e) {
    if (this.editorState)
      try {
        await this.ensureDraftSyncLoaded(e);
      } catch (t) {
        this.feedback = {
          kind: "error",
          message: t instanceof Error ? t.message : "Failed to load draft sync state"
        };
      }
  }
  async mutateDraftSync(e, t, s) {
    return await this.ensureDraftSyncLoaded(e), await (await this.ensureDraftSyncResource(e)).mutate({
      operation: je,
      expectedRevision: this.editorState?.row_version || e.row_version,
      payload: {
        autosave: s,
        fields: t
      },
      metadata: { autosave: s }
    });
  }
  async ensureDraftSyncResource(e) {
    if (this.syncCoreModule || (this.syncCoreModulePromise || (this.syncCoreModulePromise = qe(this.config.syncClientBasePath)), this.syncCoreModule = await this.syncCoreModulePromise), this.syncCache || (this.syncCache = this.syncCoreModule.createInMemoryCache()), !this.syncEngine) {
      const r = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: "same-origin",
        fetch: typeof fetch == "function" ? fetch.bind(globalThis) : void 0,
        headers: (i) => {
          const o = {};
          if (String(i?.method || "GET").toUpperCase() !== "GET") {
            const l = ie();
            l && (o["X-CSRF-Token"] = l);
          }
          return o;
        }
      });
      this.syncEngine = this.syncCoreModule.createSyncEngine({
        transport: r,
        cache: this.syncCache,
        retry: { maxAttempts: 1 }
      });
    }
    const t = e.variant_id, s = {
      kind: this.config.syncResourceKind,
      id: t,
      scope: Object.keys(this.config.syncScope).length > 0 ? this.config.syncScope : void 0
    }, a = Be(s);
    return (!this.syncResource || this.syncResourceKey !== a) && (this.syncResourceKey = a, this.syncResource = this.syncEngine.resource(s)), this.syncResource;
  }
  async ensureDraftSyncLoaded(e) {
    const t = await this.ensureDraftSyncResource(e), s = this.syncResourceKey;
    if (this.syncLoadedResourceKey === s) return;
    const a = this.editorState ? { ...this.editorState.dirty_fields } : {}, r = await t.load();
    if (!I(r)) throw new Error("Sync draft load did not return a usable draft snapshot");
    if (!this.editorState || this.editorState.detail.variant_id !== e.variant_id) return;
    let i = $(this.editorState, C(r));
    for (const [o, l] of Object.entries(a)) i = x(i, o, l);
    this.editorState = i, this.loadState = {
      ...this.loadState,
      detail: this.editorState.detail
    }, this.syncLoadedResourceKey = s;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    const e = this.editorState.detail.assignment_action_states.submit_review;
    if (!e?.enabled) {
      this.feedback = {
        kind: "error",
        message: e?.reason || "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (!this.editorState.can_submit_review) {
      const i = Object.entries(this.editorState.detail.field_completeness).filter(([, o]) => o.required && o.missing).map(([o]) => o);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? bt(this.editorState.detail) : i.length ? `Complete required fields before submitting for review: ${i.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.translation_assignment.version, s = await R(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: t }
    });
    if (!s.ok) {
      const i = await z(s, "Failed to submit assignment");
      this.feedback = {
        kind: i.code === "VERSION_CONFLICT" || i.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: i.message
      }, this.submitting = !1, this.render();
      return;
    }
    const a = await s.json(), r = n(c(a).data && c(c(a).data).status);
    this.feedback = {
      kind: "success",
      message: yt(this.editorState.detail, r)
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e, t) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, a = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!a?.enabled) {
      this.feedback = {
        kind: "error",
        message: a?.reason || `${S(e)} is unavailable.`
      }, this.render();
      return;
    }
    const r = { expected_version: s.translation_assignment.version };
    if (e === "reject") {
      const o = t?.reason || "";
      if (!o || !o.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      r.reason = o.trim(), t?.comment?.trim() && (r.comment = t.comment.trim());
    }
    this.submitting = !0, this.render();
    const i = await R(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: r
    });
    if (!i.ok) {
      const o = await z(i, `Failed to ${e} assignment`);
      this.feedback = {
        kind: o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: o.message
      }, this.submitting = !1, this.render();
      return;
    }
    this.feedback = {
      kind: "success",
      message: e === "approve" ? "Assignment approved." : e === "reject" ? "Changes requested." : "Assignment archived."
    }, this.rejectDraft = null, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  openRejectDialog(e = "") {
    this.rejectDraft = {
      reason: this.rejectDraft?.reason || "",
      comment: this.rejectDraft?.comment || "",
      error: e
    }, this.render();
    const t = this.container?.querySelector('[data-reject-modal] [role="dialog"]');
    t && (this.focusTrapCleanup = ke(t, () => this.closeRejectDialog()));
  }
  closeRejectDialog() {
    this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.rejectDraft = null, this.render();
  }
  async confirmReject() {
    if (!this.rejectDraft) return;
    const e = this.rejectDraft.reason.trim(), t = this.rejectDraft.comment.trim();
    if (!e) {
      this.rejectDraft = {
        ...this.rejectDraft,
        error: "Reject reason is required."
      }, this.render();
      return;
    }
    await this.runReviewAction("reject", {
      reason: e,
      comment: t
    });
  }
};
async function es(e, t) {
  const s = new Vt(t);
  return s.mount(e), s;
}
export {
  lt as TranslationEditorRequestError,
  Vt as TranslationEditorScreen,
  it as applyEditorAutosaveConflict,
  x as applyEditorFieldChange,
  $ as applyEditorUpdateResponse,
  at as createTranslationEditorState,
  ct as fetchTranslationEditorDetailState,
  es as initTranslationEditorPage,
  qe as loadTranslationSyncCoreModule,
  rt as markEditorAutosavePending,
  tt as normalizeAssignmentEditorDetail,
  J as normalizeEditorAssistPayload,
  st as normalizeEditorUpdateResponse,
  Ut as renderTranslationEditorPage,
  Nt as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map