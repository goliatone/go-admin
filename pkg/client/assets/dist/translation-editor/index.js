import { escapeAttribute as m, escapeHTML as c } from "../shared/html.js";
import { httpRequest as k, readCSRFToken as ae, readHTTPError as re } from "../shared/transport/http-client.js";
import { extractStructuredError as N } from "../toast/error-helpers.js";
import { n as ie } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { asBoolean as g, asNumber as f, asRecord as l, asString as i, asStringArray as V } from "../shared/coercion.js";
import { $ as ne, G as oe, O as le, Q as v, T as ce, W as de, X as ue, Z as me, _ as fe, at as pe, b as ge, d as E, et as he, g as be, h as ve, i as _e, it as ye, l as R, m as xe, o as H, p as $e, rt as we, s as U, u as P, v as Se, w as ke, y as Ce } from "../chunks/translation-shared-CQJ98SgC.js";
import { formatTranslationTimestampUTC as Q, sentenceCaseToken as $ } from "../translation-shared/formatters.js";
import { normalizeStringRecord as C } from "../shared/record-normalization.js";
import { c as G, s as Te } from "../chunks/ui-states-1McZ5upU.js";
var Ee = "translation_variant_draft", Re = "autosave", w = /* @__PURE__ */ new Map();
async function Ae(e) {
  const t = y(e);
  if (!t) throw new Error("syncClientBasePath is required to load sync-core");
  return typeof window < "u" && window.__translationSyncCoreModule ? T(window.__translationSyncCoreModule) : (w.has(t) || w.set(t, je(t)), w.get(t));
}
async function je(e) {
  return typeof window < "u" && typeof window.__translationSyncCoreLoader == "function" ? T(await window.__translationSyncCoreLoader(e)) : T(await import(
    /* @vite-ignore */
    `${e}/index.js`
  ));
}
function T(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid translation sync-core runtime module");
  return e;
}
function y(e) {
  return String(e || "").trim().replace(/\/+$/, "");
}
function qe(e, t, s) {
  const a = y(e);
  if (/\/variants$/i.test(a)) return a.replace(/\/variants$/i, "");
  const r = y(t);
  if (/\/assignments$/i.test(r)) return r.replace(/\/assignments$/i, "");
  const n = y(s), o = n.match(/^(.*)\/assignments(?:\/.*)?$/i);
  return o ? o[1] : a || r || n;
}
function Le(e) {
  return `${y(e) || "/admin"}/sync-client/sync-core`;
}
function A(e) {
  const t = l(e);
  return {
    required: g(t.required),
    complete: g(t.complete),
    missing: g(t.missing)
  };
}
function j(e) {
  const t = l(e), s = i(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: g(t.changed),
    comparison_mode: s,
    previous_source_value: i(t.previous_source_value),
    current_source_value: i(t.current_source_value)
  };
}
function q(e) {
  const t = l(e);
  return {
    valid: t.valid !== !1,
    message: i(t.message)
  };
}
function _(e, t) {
  const s = l(e), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = t(n));
  return a;
}
function De(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = l(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || t.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: V(a.field_paths)
    });
  }
  return t;
}
function Me(e) {
  const t = l(e);
  return {
    available: g(t.available),
    title: i(t.title),
    summary: i(t.summary) || i(t.summary_markdown),
    rules: V(t.rules)
  };
}
function K(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function Fe(e) {
  const t = l(e), s = i(t.id), a = i(t.filename);
  return !s && !a ? null : {
    id: s || a || "attachment",
    kind: i(t.kind) || "reference",
    filename: a || s || "attachment",
    byte_size: f(t.byte_size),
    uploaded_at: i(t.uploaded_at),
    description: i(t.description),
    url: i(t.url)
  };
}
function Pe(e) {
  return Array.isArray(e) ? e.map((t) => Fe(t)).filter((t) => t !== null) : [];
}
function Be(e, t) {
  const s = l(e), a = l(s.kinds), r = {};
  for (const [n, o] of Object.entries(a)) {
    const d = f(o);
    n.trim() && (r[n.trim()] = d);
  }
  if (!Object.keys(r).length) for (const n of t) r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: f(s.total, t.length),
    kinds: r
  };
}
function Ie(e) {
  return i(e) === "comment" ? "comment" : "event";
}
function Oe(e) {
  const t = l(e), s = i(t.id);
  return s ? {
    id: s,
    entry_type: Ie(t.entry_type),
    title: i(t.title),
    body: i(t.body),
    action: i(t.action),
    actor_id: i(t.actor_id),
    author_id: i(t.author_id),
    created_at: i(t.created_at),
    kind: i(t.kind),
    metadata: l(t.metadata)
  } : null;
}
function ze(e) {
  const t = l(e), s = Array.isArray(t.items) ? t.items.map((a) => Oe(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(t.page, 1) || 1,
    per_page: f(t.per_page, 10) || 10,
    total: f(t.total, s.length),
    has_more: g(t.has_more),
    next_page: f(t.next_page)
  };
}
function Ne(e) {
  const t = l(e), s = i(t.id), a = i(t.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(t.kind) || "review_feedback",
    created_at: i(t.created_at),
    author_id: i(t.author_id) || void 0
  };
}
function Ve(e, t) {
  const s = l(e), a = Array.isArray(s.comments) ? s.comments.map((n) => Ne(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || t) || void 0;
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
function He(e) {
  const t = l(e), s = i(t.id), a = i(t.message);
  return !s || !a ? null : {
    id: s,
    category: i(t.category) === "style" ? "style" : "terminology",
    severity: i(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(t.field_path),
    message: a
  };
}
function Ue(e, t) {
  const s = l(e);
  return {
    category: i(s.category) || t,
    enabled: g(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function Y(e) {
  const t = l(e), s = l(t.summary), a = l(t.categories), r = {};
  for (const [o, d] of Object.entries(a))
    o.trim() && (r[o.trim()] = Ue(d, o.trim()));
  const n = Array.isArray(t.findings) ? t.findings.map((o) => He(o)).filter((o) => o !== null) : [];
  return {
    enabled: g(t.enabled),
    summary: {
      finding_count: f(s.finding_count, n.length),
      warning_count: f(s.warning_count),
      blocker_count: f(s.blocker_count)
    },
    categories: r,
    findings: n,
    save_blocked: g(t.save_blocked),
    submit_blocked: g(t.submit_blocked)
  };
}
function Qe(e) {
  const t = l(e);
  return {
    id: i(t.id || t.assignment_id),
    status: i(t.status || t.queue_state),
    queue_state: i(t.queue_state || t.status),
    source_title: i(t.source_title),
    source_path: i(t.source_path),
    assignee_id: i(t.assignee_id),
    reviewer_id: i(t.reviewer_id),
    due_state: i(t.due_state),
    due_date: i(t.due_date),
    version: f(t.version || t.row_version),
    row_version: f(t.row_version || t.version),
    updated_at: i(t.updated_at)
  };
}
function Ge(e, t = "") {
  const s = l(e), a = i(s.locale).trim().toLowerCase();
  if (!a) return null;
  const r = i(s.href).trim(), n = g(s.enabled) && r !== "", o = i(s.reason || s.disabled_reason);
  return {
    locale: a,
    label: i(s.label) || a.toUpperCase(),
    current: g(s.current) || t !== "" && a === t,
    source: g(s.source),
    enabled: n,
    disabled: g(s.disabled) || !n,
    reason: o,
    href: n ? r : void 0,
    assignment_id: i(s.assignment_id) || void 0,
    status: i(s.status) || void 0,
    work_scope: i(s.work_scope) || void 0
  };
}
function Ke(e, t) {
  const s = l(e), a = (i(s.current_locale) || i(t.target_locale) || i(t.locale)).trim().toLowerCase(), r = (i(s.source_locale) || i(t.source_locale)).trim().toLowerCase(), n = Array.isArray(s.locales) ? s.locales.map((o) => Ge(o, a)).filter((o) => o !== null) : [];
  return {
    family_id: i(s.family_id) || i(t.family_id),
    current_locale: a,
    source_locale: r,
    current_work_scope: i(s.current_work_scope),
    family_detail_url: i(s.family_detail_url),
    locales: n
  };
}
function W(e, t) {
  const s = l(e), a = l(t);
  return {
    glossary_matches: De(s.glossary_matches ?? a.glossary_matches),
    style_guide_summary: Me(s.style_guide_summary ?? a.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function x(e) {
  const t = l(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const n = ie(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function X(e, t, s, a, r, n) {
  if (Array.isArray(e.fields)) return e.fields.map((d) => {
    const u = l(d), p = i(u.path);
    if (!p) return null;
    const h = Object.prototype.hasOwnProperty.call(s, p);
    return {
      path: p,
      label: i(u.label) || p,
      input_type: i(u.input_type) || "text",
      required: g(u.required),
      source_value: i(u.source_value) || t[p] || "",
      target_value: h ? s[p] : i(u.target_value),
      completeness: A(u.completeness ?? a[p]),
      drift: j(u.drift ?? r[p]),
      validation: q(u.validation ?? n[p]),
      glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((b) => b && typeof b == "object") : []
    };
  }).filter((d) => !!d);
  const o = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(o).sort().map((d) => ({
    path: d,
    label: d,
    input_type: "text",
    required: a[d]?.required === !0,
    source_value: t[d] || "",
    target_value: s[d] || "",
    completeness: a[d] ?? {
      required: !1,
      complete: !0,
      missing: !1
    },
    drift: r[d] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: t[d] || ""
    },
    validation: n[d] ?? {
      valid: !0,
      message: ""
    },
    glossary_hits: []
  }));
}
function Ye(e) {
  const t = l(e), s = l(t.data && typeof t.data == "object" ? t.data : e), a = C(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), r = C(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), n = _(s.field_completeness, A), o = _(s.field_drift, j), d = _(s.field_validations, q), u = Pe(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: f(s.assignment_row_version || s.assignment_version || l(s.translation_assignment).row_version || l(s.translation_assignment).version),
    variant_id: i(s.variant_id),
    family_id: i(s.family_id),
    entity_type: i(s.entity_type) || void 0,
    source_locale: i(s.source_locale) || void 0,
    target_locale: i(s.target_locale) || void 0,
    status: i(s.status) || void 0,
    priority: i(s.priority) || void 0,
    due_date: i(s.due_date) || void 0,
    row_version: f(s.row_version || s.version),
    source_fields: a,
    target_fields: r,
    fields: X(s, a, r, n, o, d),
    field_completeness: n,
    field_drift: o,
    field_validations: d,
    source_target_drift: l(s.source_target_drift),
    history: ze(s.history),
    attachments: u,
    attachment_summary: Be(s.attachment_summary, u),
    translation_assignment: Qe(s.translation_assignment),
    assist: W(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: Ve(s.review_feedback, s.last_rejection_reason),
    qa_results: Y(s.qa_results),
    assignment_action_states: x(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: x(s.review_action_states ?? s.review_actions),
    locale_navigation: Ke(s.locale_navigation, s)
  };
}
function We(e) {
  const t = l(e), s = l(t.data && typeof t.data == "object" ? t.data : e);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: C(s.fields ?? s.target_fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: _(s.field_completeness, A),
    field_drift: _(s.field_drift, j),
    field_validations: _(s.field_validations, q),
    assist: W(s.assist, s),
    qa_results: Y(s.qa_results),
    assignment_action_states: x(s.assignment_action_states),
    review_action_states: x(s.review_action_states)
  };
}
function L(e) {
  return X({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function D(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function Xe(e) {
  return {
    detail: {
      ...e,
      fields: L(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: D(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function S(e, t, s) {
  const a = t.trim();
  if (!a) return e;
  const r = {
    ...e.detail.target_fields,
    [a]: s.trim()
  }, n = e.detail.field_completeness[a]?.required === !0, o = {
    ...e.detail.field_completeness,
    [a]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, d = {
    ...e.detail.field_validations,
    [a]: {
      valid: !o[a].missing,
      message: o[a].missing ? e.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: r,
    field_completeness: o,
    field_validations: d
  };
  return u.fields = L(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: D(u)
  };
}
function Je(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function B(e, t) {
  const s = We(t), a = {
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
  return a.fields = L(a), {
    ...e,
    detail: a,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: D(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function Ze(e) {
  const t = l(e.data), s = f(t.row_version || t.version, e.revision) || e.revision;
  return { data: {
    ...t,
    row_version: s
  } };
}
function et(e, t) {
  const s = l(t), a = l(s.error), r = l(a.details ?? s.details), n = l(s.resource || r.resource || l(s.conflict).latestSnapshot || l(a.conflict).latestSnapshot), o = n.data && typeof n.data == "object" ? l(n.data) : {}, d = f(n.revision), u = l(a.metadata), p = Object.keys(o).length ? {
    ...o,
    row_version: f(o.row_version || o.version, d) || d
  } : l(u.latest_server_state_record);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: p
    }
  };
}
function J(e) {
  const t = l(e), s = l(t.cause), a = l(t.details), r = t.resource || a.resource;
  return t.code === "STALE_REVISION" ? {
    error: {
      code: "STALE_REVISION",
      message: i(t.message) || "stale revision",
      details: {
        current_revision: f(t.currentRevision || a.current_revision),
        resource: r
      }
    },
    resource: r,
    conflict: t.conflict
  } : s.code === "STALE_REVISION" ? J(s) : t;
}
function tt(e) {
  const t = l(e), s = l(t.cause);
  return t.code === "STALE_REVISION" || s.code === "STALE_REVISION";
}
function st(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(t))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
var at = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function I(e, t) {
  const s = await N(e);
  return new at({
    message: s.message || await re(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(e.headers.get("x-request-id")) || void 0,
    traceId: K(e.headers) || void 0
  });
}
async function rt(e) {
  const t = await k(e, { method: "GET" }), s = i(t.headers.get("x-request-id")) || void 0, a = K(t.headers) || void 0;
  if (!t.ok) {
    const n = await N(t);
    return {
      status: n.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: n.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: n.textCode
    };
  }
  const r = Ye(await t.json());
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
function it(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function nt(e) {
  return i(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function ot(e) {
  return e === "review" || e === "in_review";
}
function M(e) {
  return ot(nt(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function F(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function lt(e, t, s) {
  let a = "idle";
  return e?.autosave.conflict ? a = "conflict" : e?.autosave.pending ? a = "saving" : t ? a = "dirty" : s && (a = "saved"), {
    tone: ue(a),
    text: me(a, s),
    state: a
  };
}
function Z(e) {
  const t = [
    e.requestId ? `Request ${c(e.requestId)}` : "",
    e.traceId ? `Trace ${c(e.traceId)}` : "",
    e.errorCode ? `Code ${c(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function ct(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(e.kind)}" role="status" aria-live="polite">
      ${c(e.message)}
    </div>
  ` : "";
}
function dt(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? v("error") : v("success"), a = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${v("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function ut(e, t) {
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
function mt(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function ft(e, t) {
  const s = e.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function pt() {
  return Te({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${le} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function O(e, t) {
  return G({
    tag: "section",
    containerClass: `${$e} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: ve,
    message: t,
    messageClass: `${xe} mt-2`
  });
}
function z(e, t, s) {
  return G({
    tag: "section",
    containerClass: `${be} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Se,
    message: t,
    messageClass: `${fe} mt-2`,
    actionsHtml: Z(s),
    role: "alert"
  });
}
function gt(e, t, s, a, r, n = "") {
  const o = e.assignment_action_states.submit_review, d = !o?.enabled || r || a || e.qa_results.submit_blocked, u = r || !s, p = (e.source_locale || "source").toUpperCase(), h = (e.target_locale || "target").toUpperCase(), b = e.translation_assignment, se = e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : o?.reason || "";
  return `
    <section class="${E} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${ke}">Assignment editor</p>
          <div>
            <h1 class="${ce}">${c(b.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${c(p)} to ${c(h)} • ${c($(e.status || b.status || "draft"))} • Priority ${c(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${c(b.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${c(b.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${m(t.state)}">${c(t.text)}</span>
            ${dt(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="${R}"
            data-action="save-draft"
            ${u ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="${U}"
            data-action="submit-review"
            title="${m(se)}"
            ${d ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : o?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function ht(e) {
  const t = c(e.label || e.locale.toUpperCase()), s = "inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors", a = "bg-blue-100 text-blue-700", r = "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900", n = "cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200", o = [
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
  const d = e.reason || "No translation assignment exists for this locale.";
  return `<span class="${s} ${n}" ${o} aria-disabled="true" title="${m(d)}" aria-label="${m(`${e.label || e.locale.toUpperCase()} unavailable: ${d}`)}">${t}</span>`;
}
function bt(e) {
  const t = e.locale_navigation, s = t.locales, a = t.current_locale || (e.target_locale || "").toLowerCase(), r = (a || "target").toUpperCase();
  if (!t.family_id && s.length === 0 && !t.family_detail_url) return "";
  const n = s.length > 0 ? s : [{
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
              ${n.map(ht).join("")}
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
function vt(e) {
  if (!ee(e)) return "";
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim()), s = !!(e.drift.current_source_value || e.source_value);
  return !t && !s ? `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    ` : t ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${c(e.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${c(e.drift.current_source_value || e.source_value || "Current value unavailable")}</p>
    </div>
  ` : `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
}
function ee(e) {
  if (!e.drift.changed) return !1;
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim());
  return e.drift.comparison_mode !== "hash_only" || t;
}
function _t(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${Ce}">
          <span class="${ge}">${c(i(s.term))}</span>
          → ${c(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function yt(e) {
  const t = e.fields || [], s = e.qa_results;
  let a = 0, r = 0, n = 0, o = 0, d = null;
  for (const u of t)
    u.completeness.complete && !u.completeness.missing && a++, u.completeness.required && u.completeness.missing && (r++, d || (d = u.path)), u.drift.changed && (n++, d || (d = u.path)), u.validation.valid || (o++, d || (d = u.path));
  if (!d && s.enabled && s.summary.blocker_count > 0 && s.findings.length > 0) {
    const u = s.findings.find((p) => p.severity === "blocker");
    u?.field_path && (d = u.field_path);
  }
  return {
    totalFields: t.length,
    completeFields: a,
    missingRequiredFields: r,
    sourceChangedFields: n,
    validationErrors: o,
    qaBlockers: s.enabled ? s.summary.blocker_count : 0,
    qaWarnings: s.enabled ? s.summary.warning_count : 0,
    firstIssuePath: d
  };
}
function xt(e) {
  const t = e.missingRequiredFields > 0 || e.sourceChangedFields > 0 || e.validationErrors > 0 || e.qaBlockers > 0, s = e.completeFields === e.totalFields && e.missingRequiredFields === 0 && e.validationErrors === 0 && e.qaBlockers === 0, a = [], r = s ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200";
  a.push(`<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${r}">${e.completeFields}/${e.totalFields} complete</span>`), e.missingRequiredFields > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.missingRequiredFields} missing required</span>`), e.sourceChangedFields > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.sourceChangedFields} source changed</span>`), e.validationErrors > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.validationErrors} validation ${e.validationErrors === 1 ? "error" : "errors"}</span>`), e.qaBlockers > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.qaBlockers} QA ${e.qaBlockers === 1 ? "blocker" : "blockers"}</span>`), e.qaWarnings > 0 && a.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.qaWarnings} QA ${e.qaWarnings === 1 ? "warning" : "warnings"}</span>`);
  const n = s ? "border-emerald-200 bg-emerald-50" : t ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50", o = e.firstIssuePath ? `<button
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
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${n}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${a.join("")}</div>
      ${o}
    </section>
  `;
}
function $t(e) {
  return e.source_value && e.source_value.trim() ? c(e.source_value) : e.required ? '<span class="text-amber-600 italic">Source text pending - required field</span>' : '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}
function wt(e) {
  return `
    <section class="space-y-4">
      ${xt(yt(e))}
      ${e.fields.map((t) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(t.path)}" id="field-${m(t.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${c(t.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${c(t.path)}${t.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${H}"
              data-copy-source="${m(t.path)}"
              aria-label="Copy source text to translation field for ${m(t.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${$t(t)}</div>
            </div>
            <div class="rounded-xl border ${t.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(t.path)}">Translation</label>
              ${t.input_type === "textarea" ? `<textarea id="editor-field-${m(t.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}">${c(t.target_value)}</textarea>` : `<input id="editor-field-${m(t.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}" value="${m(t.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${t.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${t.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${ee(t) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${t.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(t.path)}">${c(t.validation.message || "Validation error")}</p>`}
              ${vt(t)}
              ${_t(t)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function te(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = l(s), r = i(a.suggested_text) || i(a.target_text);
    r && t.push({
      id: i(a.id) || `tm-${t.length}`,
      score: St(a.score, a.match_score),
      sourceLabel: i(a.source_label) || i(a.source) || "Internal TM",
      localePair: i(a.locale_pair) || "",
      fieldPath: i(a.field_path) || "",
      suggestedText: r,
      isStaleSource: g(a.is_stale_source) || g(a.stale_source)
    });
  }
  return t.sort((s, a) => a.score - s.score);
}
function St(e, t) {
  const s = f(e) || f(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const a = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(a)));
}
function kt(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function Ct(e) {
  return e.length ? `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${e.map((t) => `
          <li class="rounded-xl border ${t.isStaleSource ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm" data-tm-suggestion="${m(t.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${c(t.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${kt(t.score)} ${t.score}%</span>
                  <span>${c(t.sourceLabel)}</span>
                  ${t.localePair ? `<span class="text-gray-400">${c(t.localePair)}</span>` : ""}
                  ${t.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ""}
                </div>
                ${t.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${c(t.fieldPath)}</p>` : ""}
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
function Tt(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${Ct(te(e.assist.translation_memory_suggestions))}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${c(a.term)}</strong> → ${c(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${c(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div data-assist-section="style-guide">
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${c(s.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${c(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${s.rules.map((a) => `<li>• ${c(a)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function Et(e) {
  const t = e.history.items.map((s) => ({
    id: s.id,
    title: s.title || $(s.entry_type),
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
function Rt(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((n) => n.severity === "blocker"), a = t.findings.filter((n) => n.severity !== "blocker"), r = (n, o) => {
    if (!n.length) return "";
    const d = ne(o);
    return `
      <section data-qa-group="${m(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((u) => `
          <li class="${d.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${c($(u.category))}</strong>
              <span class="${d.badge}">${c(u.severity)}</span>
            </div>
            <p class="mt-2">${c(u.message)}</p>
            ${u.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${c(u.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${he(t.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${t.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${t.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${t.submit_blocked ? v("error") : v("neutral")}">
          ${t.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${v("warning")}">Warnings ${t.summary.warning_count}</span>
        <span class="${v("error")}">Blockers ${t.summary.blocker_count}</span>
      </div>
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${r(s, "blocker")}${r(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function At(e, t) {
  const s = e.review_action_states.approve, a = e.review_action_states.reject;
  return M(e) ? `
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
    const n = !r.state?.enabled || t;
    return `
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${r.tone} ${n ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
              data-action="${m(r.key)}"
              title="${m(r.state?.reason || "")}"
              ${n ? 'disabled aria-disabled="true"' : ""}
            >
              ${c(r.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function jt(e, t) {
  return e ? `
    <div class="${oe}" data-reject-modal="true">
      <section class="${de}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${H}" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${c(e.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${c(e.comment)}</textarea>
        </label>
        ${e.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${c(e.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${R}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${_e}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function qt(e, t) {
  if (!F(e)) return "";
  const s = e.assignment_action_states.archive, a = !s?.enabled || t;
  return `
    <section
      class="${E} p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="${R}"
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
function Lt(e) {
  return `
    <section class="${E} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${e.attachment_summary.total}</span>
      </div>
      ${e.attachments.length ? `<ul class="mt-4 space-y-3">${e.attachments.map((t) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${c(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${c(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${c(it(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${c(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${c(Q(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function Dt(e) {
  const t = e.history, s = Et(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => {
    const r = we(a.tone);
    return `
            <li class="${r.container}" data-history-entry="${m(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${r.title}">${c(a.title)}</p>
                  <span class="${r.badge}">${c(a.badge)}</span>
                </div>
                <span class="${r.time}">${c(Q(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${c(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${P}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${P}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function Mt(e) {
  const t = M(e), s = F(e), a = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, r = te(e.assist.translation_memory_suggestions).length, n = e.assist.glossary_matches.length, o = e.attachment_summary.total, d = e.history.total;
  return {
    actions: null,
    qa: a > 0 ? String(a) : null,
    assist: r + n > 0 ? String(r + n) : null,
    files: o > 0 ? String(o) : null,
    history: d > 0 ? String(d) : null
  };
}
function Ft(e, t, s = "actions", a) {
  const r = Mt(e), n = M(e), o = F(e), d = n || o, u = `
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
          <span class="hidden sm:inline">${c(h.label)}</span>
          ${h.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${c(h.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, p = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${n ? At(e, t) : ""}
        ${o ? qt(e, t) : ""}
        ${d ? "" : `
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <h2 class="text-lg font-semibold text-gray-900">Actions</h2>
            <p class="mt-3 text-sm text-gray-500">No actions available for this assignment in its current state.</p>
          </div>
        `}
      </div>
    `,
    qa: `
      <div id="sidebar-panel-qa" class="space-y-4" role="tabpanel" data-sidebar-panel="qa" ${s !== "qa" ? "hidden" : ""}>
        ${Rt(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${Tt(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${Lt(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${Dt(e)}
        ${Z(a || {
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
function Pt(e, t, s = {}, a = {}) {
  if (e.status === "loading") return pt();
  if (e.status === "empty") return O("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return z("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return z("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const r = t?.detail || e.detail;
  if (!r) return O("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), o = lt(t || null, n, a.lastSavedMessage || ""), d = t?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${ct(a.feedback || null)}
      ${gt(r, o, n, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${bt(r)}
      ${d ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${U}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${wt(r)}
        </div>
        <div class="order-2">
          ${Ft(r, a.submitting === !0, a.activeSidebarTab || "actions", e)}
        </div>
      </div>
      ${jt(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function Bt(e, t, s, a = {}, r = {}) {
  e.innerHTML = Pt(t, s, a, r);
}
var It = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.syncCoreModulePromise = null, this.syncCoreModule = null, this.syncCache = null, this.syncEngine = null, this.syncResource = null, this.syncResourceID = "", this.activeSidebarTab = "actions";
    const t = e.basePath || "/admin";
    this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase || "",
      actionEndpointBase: e.actionEndpointBase,
      syncBaseURL: e.syncBaseURL || qe(e.variantEndpointBase || "", e.actionEndpointBase, e.endpoint),
      syncClientBasePath: e.syncClientBasePath || Le(t),
      syncResourceKind: e.syncResourceKind || Ee,
      basePath: t
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (t) => {
      (t.ctrlKey || t.metaKey) && t.key === "s" && (t.preventDefault(), this.saveDirtyFields(!1)), t.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null, this.syncResource = null, this.syncResourceID = "";
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await rt(e ? st(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = Xe(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (Bt(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), ye(this.container));
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        const s = t.currentTarget, a = s.dataset.fieldInput || "";
        this.editorState = S(this.editorState, a, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.copySource || "", s = this.editorState?.detail.fields.find((a) => a.path === t);
        !s || !this.editorState || (this.editorState = S(this.editorState, t, s.source_value), this.scheduleAutosave(), this.render());
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
        !t || !s || !this.editorState || (this.editorState = S(this.editorState, t, s), this.feedback = {
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
    this.saving = !0, this.editorState = Je(this.editorState), this.render();
    const t = this.editorState.detail;
    try {
      const s = await this.mutateDraftSync(t, this.editorState.dirty_fields, e);
      this.editorState = B(this.editorState, Ze(s.snapshot));
      const a = ut(this.editorState.detail.qa_results, e);
      return this.lastSavedMessage = a.lastSaved, (!e || a.kind === "conflict") && (this.feedback = {
        kind: a.kind,
        message: a.message
      }), this.saving = !1, this.render(), !0;
    } catch (s) {
      return tt(s) ? (this.editorState = et(this.editorState, J(s)), this.feedback = {
        kind: "conflict",
        message: "Autosave conflict detected. Reload the latest server draft."
      }, this.saving = !1, this.render(), !1) : (this.feedback = {
        kind: "error",
        message: s instanceof Error ? s.message : "Failed to save draft"
      }, this.saving = !1, this.render(), !1);
    }
  }
  reloadServerDraft() {
    if (!this.editorState) return;
    const e = this.editorState.autosave.conflict;
    if (e && Object.keys(e).length > 0) {
      this.editorState = B(this.editorState, { data: e }), this.feedback = {
        kind: "conflict",
        message: "Reloaded the latest server draft."
      }, this.saving = !1, this.render();
      return;
    }
    this.feedback = {
      kind: "conflict",
      message: "Reloaded the latest server draft."
    }, this.load(this.editorState.detail.history.page);
  }
  async mutateDraftSync(e, t, s) {
    return await (await this.ensureDraftSyncResource(e)).mutate({
      operation: Re,
      expectedRevision: this.editorState?.row_version || e.row_version,
      payload: {
        autosave: s,
        fields: t
      },
      metadata: { autosave: s }
    });
  }
  async ensureDraftSyncResource(e) {
    if (this.syncCoreModule || (this.syncCoreModulePromise || (this.syncCoreModulePromise = Ae(this.config.syncClientBasePath)), this.syncCoreModule = await this.syncCoreModulePromise), this.syncCache || (this.syncCache = this.syncCoreModule.createInMemoryCache()), !this.syncEngine) {
      const s = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: "same-origin",
        fetch: typeof fetch == "function" ? fetch.bind(globalThis) : void 0,
        headers: (a) => {
          const r = {};
          if (String(a?.method || "GET").toUpperCase() !== "GET") {
            const n = ae();
            n && (r["X-CSRF-Token"] = n);
          }
          return r;
        }
      });
      this.syncEngine = this.syncCoreModule.createSyncEngine({
        transport: s,
        cache: this.syncCache,
        retry: { maxAttempts: 1 }
      });
    }
    const t = e.variant_id;
    return (!this.syncResource || this.syncResourceID !== t) && (this.syncResourceID = t, this.syncResource = this.syncEngine.resource({
      kind: this.config.syncResourceKind,
      id: t
    })), this.syncResource;
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
      const n = Object.entries(this.editorState.detail.field_completeness).filter(([, o]) => o.required && o.missing).map(([o]) => o);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? mt(this.editorState.detail) : n.length ? `Complete required fields before submitting for review: ${n.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.translation_assignment.version, s = await k(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: t }
    });
    if (!s.ok) {
      const n = await I(s, "Failed to submit assignment");
      this.feedback = {
        kind: n.code === "VERSION_CONFLICT" || n.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: n.message
      }, this.submitting = !1, this.render();
      return;
    }
    const a = await s.json(), r = i(l(a).data && l(l(a).data).status);
    this.feedback = {
      kind: "success",
      message: ft(this.editorState.detail, r)
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e, t) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, a = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!a?.enabled) {
      this.feedback = {
        kind: "error",
        message: a?.reason || `${$(e)} is unavailable.`
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
    const n = await k(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: r
    });
    if (!n.ok) {
      const o = await I(n, `Failed to ${e} assignment`);
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
    t && (this.focusTrapCleanup = pe(t, () => this.closeRejectDialog()));
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
async function Yt(e, t) {
  const s = new It(t);
  return s.mount(e), s;
}
export {
  at as TranslationEditorRequestError,
  It as TranslationEditorScreen,
  et as applyEditorAutosaveConflict,
  S as applyEditorFieldChange,
  B as applyEditorUpdateResponse,
  Xe as createTranslationEditorState,
  rt as fetchTranslationEditorDetailState,
  Yt as initTranslationEditorPage,
  Ae as loadTranslationSyncCoreModule,
  Je as markEditorAutosavePending,
  Ye as normalizeAssignmentEditorDetail,
  W as normalizeEditorAssistPayload,
  We as normalizeEditorUpdateResponse,
  Bt as renderTranslationEditorPage,
  Pt as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map