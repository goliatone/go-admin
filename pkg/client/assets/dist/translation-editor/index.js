import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { t as Ce } from "../chunks/icon-renderer-tQhqqQbt.js";
import { httpRequest as x, readCSRFToken as Ae, readHTTPError as je } from "../shared/transport/http-client.js";
import { extractStructuredError as Y } from "../toast/error-helpers.js";
import { r as ie, s as qe } from "../chunks/status-vocabulary-Bdx_bn1-.js";
import { readLocationSearchParams as Le } from "../shared/query-state/url-state.js";
import { n as de } from "../chunks/translation-contracts-DrJVTucO.js";
import { asBoolean as _, asNumber as g, asRecord as c, asString as o, asStringArray as ue } from "../shared/coercion.js";
import { A as De, C as I, D as Oe, E as Ie, F as Pe, M as Fe, O as Me, P as Be, R as Ne, S as re, T as ze, a as Ue, at as Ke, c as Ve, ct as He, et as Ye, ft as Ge, g as Qe, j as We, k as Xe, lt as Je, mt as Ze, ot as et, pt as tt, s as st, st as w, tt as at, v as it, x as D, y as T } from "../chunks/translation-shared-BfP1jYBZ.js";
import { formatTranslationTimestampUTC as fe, sentenceCaseToken as P } from "../translation-shared/formatters.js";
import { normalizeStringRecord as K } from "../shared/record-normalization.js";
import { c as me, s as rt } from "../chunks/ui-states-r4wmgfqM.js";
var nt = "translation_variant_draft", ot = "autosave", N = /* @__PURE__ */ new Map();
async function ct(e) {
  const t = E(e);
  if (!t) throw new Error("syncClientBasePath is required to load sync-core");
  return typeof window < "u" && window.__translationSyncCoreModule ? V(window.__translationSyncCoreModule) : (N.has(t) || N.set(t, lt(t)), N.get(t));
}
async function lt(e) {
  return typeof window < "u" && typeof window.__translationSyncCoreLoader == "function" ? V(await window.__translationSyncCoreLoader(e)) : V(await import(
    /* @vite-ignore */
    `${e}/index.js`
  ));
}
function V(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid translation sync-core runtime module");
  return e;
}
function E(e) {
  return String(e || "").trim().replace(/\/+$/, "");
}
function dt(e, t, s) {
  const a = E(e);
  if (/\/variants$/i.test(a)) return a.replace(/\/variants$/i, "");
  const i = E(t);
  if (/\/assignments$/i.test(i)) return i.replace(/\/assignments$/i, "");
  const n = E(s), r = n.match(/^(.*)\/assignments(?:\/.*)?$/i);
  return r ? r[1] : a || i || n;
}
function ut(e) {
  return `${E(e) || "/admin"}/sync-client/sync-core`;
}
function ft(e) {
  const t = {};
  for (const [s, a] of Object.entries(e || {})) {
    const i = String(s || "").trim(), n = String(a || "").trim();
    !i || !n || (t[i] = n);
  }
  return t;
}
var mt = [
  "channel",
  "tenant_id",
  "org_id"
];
function gt(e) {
  try {
    const t = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost"), s = {};
    for (const a of mt) {
      const i = String(t.searchParams.get(a) || "").trim();
      i && (s[a] = i);
    }
    return s;
  } catch {
    return {};
  }
}
function pt(e) {
  return ft({
    ...gt(e.endpoint),
    ...e.syncScope || {}
  });
}
function ht(e) {
  const t = Object.entries(e.scope || {}).filter(([s, a]) => s.trim() !== "" && a.trim() !== "").sort(([s], [a]) => s.localeCompare(a)).map(([s, a]) => `${encodeURIComponent(s)}=${encodeURIComponent(a)}`).join("&");
  return `${encodeURIComponent(e.kind)}::${encodeURIComponent(e.id)}::${t}`;
}
function G(e) {
  const t = c(e);
  return {
    required: _(t.required),
    complete: _(t.complete),
    missing: _(t.missing)
  };
}
function Q(e) {
  const t = c(e), s = o(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: _(t.changed),
    comparison_mode: s,
    previous_source_value: o(t.previous_source_value),
    current_source_value: o(t.current_source_value)
  };
}
function W(e) {
  const t = c(e);
  return {
    valid: t.valid !== !1,
    message: o(t.message)
  };
}
function S(e, t) {
  const s = c(e), a = {};
  for (const [i, n] of Object.entries(s))
    i.trim() && (a[i.trim()] = t(n));
  return a;
}
function _t(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = c(s), i = o(a.term), n = o(a.preferred_translation);
    !i || !n || t.push({
      term: i,
      preferred_translation: n,
      notes: o(a.notes) || void 0,
      field_paths: ue(a.field_paths)
    });
  }
  return t;
}
function bt(e) {
  const t = c(e);
  return {
    available: _(t.available),
    title: o(t.title),
    summary: o(t.summary) || o(t.summary_markdown),
    rules: ue(t.rules)
  };
}
function ge(e) {
  return o(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function yt(e) {
  const t = c(e), s = o(t.id), a = o(t.filename);
  return !s && !a ? null : {
    id: s || a || "attachment",
    kind: o(t.kind) || "reference",
    filename: a || s || "attachment",
    byte_size: g(t.byte_size),
    uploaded_at: o(t.uploaded_at),
    description: o(t.description),
    url: o(t.url)
  };
}
function vt(e) {
  return Array.isArray(e) ? e.map((t) => yt(t)).filter((t) => t !== null) : [];
}
function wt(e, t) {
  const s = c(e), a = c(s.kinds), i = {};
  for (const [n, r] of Object.entries(a)) {
    const l = g(r);
    n.trim() && (i[n.trim()] = l);
  }
  if (!Object.keys(i).length) for (const n of t) i[n.kind] = (i[n.kind] || 0) + 1;
  return {
    total: g(s.total, t.length),
    kinds: i
  };
}
function xt(e) {
  return o(e) === "comment" ? "comment" : "event";
}
function St(e) {
  const t = c(e), s = o(t.id);
  return s ? {
    id: s,
    entry_type: xt(t.entry_type),
    title: o(t.title),
    body: o(t.body),
    action: o(t.action),
    actor_id: o(t.actor_id),
    author_id: o(t.author_id),
    created_at: o(t.created_at),
    kind: o(t.kind),
    metadata: c(t.metadata)
  } : null;
}
function $t(e) {
  const t = c(e), s = Array.isArray(t.items) ? t.items.map((a) => St(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: g(t.page, 1) || 1,
    per_page: g(t.per_page, 10) || 10,
    total: g(t.total, s.length),
    has_more: _(t.has_more),
    next_page: g(t.next_page)
  };
}
function kt(e) {
  const t = c(e), s = o(t.id), a = o(t.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: o(t.kind) || "review_feedback",
    created_at: o(t.created_at),
    author_id: o(t.author_id) || void 0
  };
}
function Rt(e, t) {
  const s = c(e), a = Array.isArray(s.comments) ? s.comments.map((n) => kt(n)).filter((n) => n !== null) : [], i = o(s.last_rejection_reason || t) || void 0;
  return !a.length && i && a.push({
    id: "last-rejection-reason",
    body: i,
    kind: "review_feedback",
    created_at: ""
  }), {
    last_rejection_reason: i,
    comments: a
  };
}
function Et(e) {
  const t = c(e), s = o(t.id), a = o(t.message);
  return !s || !a ? null : {
    id: s,
    category: o(t.category) === "style" ? "style" : "terminology",
    severity: o(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: o(t.field_path),
    message: a
  };
}
function Tt(e, t) {
  const s = c(e);
  return {
    category: o(s.category) || t,
    enabled: _(s.enabled),
    feature_flag: o(s.feature_flag) || void 0,
    finding_count: g(s.finding_count),
    warning_count: g(s.warning_count),
    blocker_count: g(s.blocker_count)
  };
}
function pe(e) {
  const t = c(e), s = c(t.summary), a = c(t.categories), i = {};
  for (const [r, l] of Object.entries(a))
    r.trim() && (i[r.trim()] = Tt(l, r.trim()));
  const n = Array.isArray(t.findings) ? t.findings.map((r) => Et(r)).filter((r) => r !== null) : [];
  return {
    enabled: _(t.enabled),
    summary: {
      finding_count: g(s.finding_count, n.length),
      warning_count: g(s.warning_count),
      blocker_count: g(s.blocker_count)
    },
    categories: i,
    findings: n,
    save_blocked: _(t.save_blocked),
    submit_blocked: _(t.submit_blocked)
  };
}
function Ct(e) {
  const t = c(e);
  return {
    id: o(t.id || t.assignment_id),
    status: o(t.status || t.queue_state),
    queue_state: o(t.queue_state || t.status),
    source_title: o(t.source_title),
    source_path: o(t.source_path),
    assignee_id: o(t.assignee_id),
    assignee_label: o(t.assignee_label),
    display_assignee: o(t.display_assignee || t.assignee_label || t.assignee_id),
    reviewer_id: o(t.reviewer_id),
    reviewer_label: o(t.reviewer_label),
    display_reviewer: o(t.display_reviewer || t.reviewer_label || t.reviewer_id),
    due_state: o(t.due_state),
    due_date: o(t.due_date),
    version: g(t.version || t.row_version),
    row_version: g(t.row_version || t.version),
    updated_at: o(t.updated_at)
  };
}
function At(e, t = "") {
  const s = c(e), a = o(s.locale).trim().toLowerCase();
  if (!a) return null;
  const i = o(s.href).trim(), n = _(s.enabled) && i !== "", r = o(s.reason || s.disabled_reason);
  return {
    locale: a,
    label: o(s.label) || a.toUpperCase(),
    current: _(s.current) || t !== "" && a === t,
    source: _(s.source),
    enabled: n,
    disabled: _(s.disabled) || !n,
    reason: r,
    href: n ? i : void 0,
    assignment_id: o(s.assignment_id) || void 0,
    status: o(s.status) || void 0,
    work_scope: o(s.work_scope) || void 0
  };
}
function jt(e, t) {
  const s = c(e), a = (o(s.current_locale) || o(t.target_locale) || o(t.locale)).trim().toLowerCase(), i = (o(s.source_locale) || o(t.source_locale)).trim().toLowerCase(), n = Array.isArray(s.locales) ? s.locales.map((r) => At(r, a)).filter((r) => r !== null) : [];
  return {
    family_id: o(s.family_id) || o(t.family_id),
    current_locale: a,
    source_locale: i,
    current_work_scope: o(s.current_work_scope),
    family_detail_url: o(s.family_detail_url),
    locales: n
  };
}
function X(e, t) {
  const s = c(e), a = _(s.enabled), i = o(s.target_record_id) || o(s.record_id) || o(t.target_record_id), n = o(s.reason), r = o(s.reason_code);
  return {
    enabled: a,
    url: o(s.url) || void 0,
    reason: n || (a ? "" : "Preview is unavailable for this assignment."),
    reason_code: r || (a ? "" : "preview_unavailable"),
    assignment_id: o(s.assignment_id) || o(t.assignment_id),
    entity_type: o(s.entity_type) || o(t.entity_type),
    record_id: o(s.record_id) || i,
    target_record_id: i,
    target_locale: o(s.target_locale) || o(t.target_locale),
    channel: o(s.channel) || o(t.channel)
  };
}
function he(e, t) {
  const s = c(e), a = c(t);
  return {
    glossary_matches: _t(s.glossary_matches ?? a.glossary_matches),
    style_guide_summary: bt(s.style_guide_summary ?? a.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((i) => i && typeof i == "object") : []
  };
}
function O(e) {
  const t = c(e), s = {};
  for (const [a, i] of Object.entries(t)) {
    const n = de(i);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function L(e, t = {}) {
  const s = c(e), a = de(s) || { enabled: !1 }, i = c(s.payload ?? t.payload), n = o(s.assignment_id ?? i.assignment_id ?? t.assignment_id), r = o(s.field_path ?? i.field_path ?? t.field_path), l = o(s.endpoint ?? s.rpc_invoke_path ?? t.endpoint ?? t.rpc_invoke_path), u = o(s.execution_mode ?? s.executionMode ?? t.execution_mode), m = o(s.idempotency_key ?? s.idempotencyKey ?? i.idempotency_key ?? i.idempotencyKey ?? t.idempotency_key);
  return {
    ...a,
    assignment_id: n,
    field_path: r,
    command_name: o(s.command_name ?? t.command_name) || "translations.suggestions.generate",
    transport: o(s.transport ?? t.transport) || "rpc",
    rpc_method: o(s.rpc_method ?? t.rpc_method) || "admin.commands.dispatch",
    endpoint: l,
    rpc_invoke_path: o(s.rpc_invoke_path ?? t.rpc_invoke_path) || l,
    execution_mode: u,
    idempotency_key: m,
    payload: {
      ...i,
      ...n ? { assignment_id: n } : {},
      ...r ? { field_path: r } : {},
      ...m ? { idempotency_key: m } : {}
    }
  };
}
function _e(e, t, s, a, i, n) {
  const r = o(e.assignment_id), l = L(e.suggest_translation_action, { assignment_id: r });
  if (Array.isArray(e.fields)) return e.fields.map((m) => {
    const p = c(m), h = o(p.path);
    if (!h) return null;
    const $ = Object.prototype.hasOwnProperty.call(s, h);
    return {
      path: h,
      label: o(p.label) || h,
      input_type: o(p.input_type) || "text",
      required: _(p.required),
      source_value: o(p.source_value) || t[h] || "",
      target_value: $ ? s[h] : o(p.target_value),
      completeness: G(p.completeness ?? a[h]),
      drift: Q(p.drift ?? i[h]),
      validation: W(p.validation ?? n[h]),
      glossary_hits: Array.isArray(p.glossary_hits) ? p.glossary_hits.filter((b) => b && typeof b == "object") : [],
      suggest_translation_action: L(p.suggest_translation_action, {
        ...l,
        assignment_id: r || l.assignment_id,
        field_path: h || l.field_path
      })
    };
  }).filter((m) => !!m);
  const u = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(i),
    ...Object.keys(n)
  ]);
  return Array.from(u).sort().map((m) => ({
    path: m,
    label: m,
    input_type: "text",
    required: a[m]?.required === !0,
    source_value: t[m] || "",
    target_value: s[m] || "",
    completeness: a[m] ?? {
      required: !1,
      complete: !0,
      missing: !1
    },
    drift: i[m] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: t[m] || ""
    },
    validation: n[m] ?? {
      valid: !0,
      message: ""
    },
    glossary_hits: [],
    suggest_translation_action: L(null, {
      ...l,
      assignment_id: r || l.assignment_id,
      field_path: m || l.field_path
    })
  }));
}
function be(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), a = K(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), i = K(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), n = S(s.field_completeness, G), r = S(s.field_drift, Q), l = S(s.field_validations, W), u = vt(s.attachments);
  return {
    assignment_id: o(s.assignment_id),
    assignment_row_version: g(s.assignment_row_version || s.assignment_version || c(s.translation_assignment).row_version || c(s.translation_assignment).version),
    variant_id: o(s.variant_id),
    family_id: o(s.family_id),
    entity_type: o(s.entity_type) || void 0,
    source_locale: o(s.source_locale) || void 0,
    target_locale: o(s.target_locale) || void 0,
    status: o(s.status) || void 0,
    priority: o(s.priority) || void 0,
    due_date: o(s.due_date) || void 0,
    row_version: g(s.row_version || s.version),
    source_fields: a,
    target_fields: i,
    fields: _e(s, a, i, n, r, l),
    field_completeness: n,
    field_drift: r,
    field_validations: l,
    source_target_drift: c(s.source_target_drift),
    history: $t(s.history),
    attachments: u,
    attachment_summary: wt(s.attachment_summary, u),
    translation_assignment: Ct(s.translation_assignment),
    assist: he(s.assist, s),
    last_rejection_reason: o(s.last_rejection_reason) || void 0,
    review_feedback: Rt(s.review_feedback, s.last_rejection_reason),
    qa_results: pe(s.qa_results),
    assignment_action_states: O(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: O(s.review_action_states ?? s.review_actions),
    suggest_translation_action: L(s.suggest_translation_action, { assignment_id: o(s.assignment_id) }),
    locale_navigation: jt(s.locale_navigation, s),
    preview_action: X(s.preview_action, s)
  };
}
function qt(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), a = c(s.preview_action);
  return {
    variant_id: o(s.variant_id),
    row_version: g(s.row_version || s.version),
    fields: K(s.fields ?? s.target_fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: S(s.field_completeness, G),
    field_drift: S(s.field_drift, Q),
    field_validations: S(s.field_validations, W),
    source_target_drift: c(s.source_target_drift),
    assist: he(s.assist, s),
    qa_results: pe(s.qa_results),
    assignment_action_states: O(s.assignment_action_states),
    review_action_states: O(s.review_action_states),
    preview_action: Object.keys(a).length ? X(a, s) : void 0
  };
}
function J(e) {
  return _e({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function Z(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function ne(e) {
  return {
    detail: {
      ...e,
      fields: J(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: Z(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function k(e, t, s) {
  const a = t.trim();
  if (!a) return e;
  const i = {
    ...e.detail.target_fields,
    [a]: s.trim()
  }, n = e.detail.field_completeness[a]?.required === !0, r = {
    ...e.detail.field_completeness,
    [a]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, l = {
    ...e.detail.field_validations,
    [a]: {
      valid: !r[a].missing,
      message: r[a].missing ? e.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: i,
    field_completeness: r,
    field_validations: l
  };
  return u.fields = J(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: Z(u)
  };
}
function Lt(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function R(e, t) {
  const s = qt(t), a = Object.keys(s.assignment_action_states).length ? s.assignment_action_states : e.detail.assignment_action_states, i = Object.keys(s.review_action_states).length ? s.review_action_states : e.detail.review_action_states, n = {
    ...e.detail,
    row_version: s.row_version,
    target_fields: {
      ...e.detail.target_fields,
      ...s.fields
    },
    field_completeness: s.field_completeness,
    field_drift: s.field_drift,
    field_validations: s.field_validations,
    source_target_drift: Object.keys(c(s.source_target_drift)).length ? s.source_target_drift : e.detail.source_target_drift,
    assist: s.assist,
    qa_results: s.qa_results,
    assignment_action_states: a,
    review_action_states: i,
    preview_action: s.preview_action || e.detail.preview_action
  };
  return n.fields = J(n), {
    ...e,
    detail: n,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: Z(n),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function j(e) {
  const t = c(e.data), s = { ...t };
  delete s.assignment_action_states, delete s.editor_actions, delete s.actions, delete s.review_action_states, delete s.review_actions;
  const a = e.revision || g(t.row_version || t.version);
  return { data: {
    ...s,
    row_version: a,
    version: a
  } };
}
function oe(e) {
  return Object.keys(c(e?.data)).length > 0;
}
function Dt(e, t) {
  const s = c(t), a = c(s.error), i = c(a.details ?? s.details), n = c(s.resource || i.resource || c(s.conflict).latestSnapshot || c(a.conflict).latestSnapshot), r = n.data && typeof n.data == "object" ? c(n.data) : {}, l = g(n.revision), u = c(a.metadata), m = Object.keys(r).length ? {
    ...r,
    row_version: g(r.row_version || r.version, l) || l
  } : c(u.latest_server_state_record);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: m
    }
  };
}
function ye(e) {
  const t = c(e), s = c(t.cause), a = c(t.details), i = t.resource || a.resource;
  return t.code === "STALE_REVISION" ? {
    error: {
      code: "STALE_REVISION",
      message: o(t.message) || "stale revision",
      details: {
        current_revision: g(t.currentRevision || a.current_revision),
        resource: i
      }
    },
    resource: i,
    conflict: t.conflict
  } : s.code === "STALE_REVISION" ? ye(s) : t;
}
function Ot(e) {
  const t = c(e), s = c(t.details), a = c(t.conflict), i = c(t.resource || s.resource || a.latestSnapshot), n = c(i.data), r = g(i.revision || t.currentRevision || s.current_revision), l = o(i.updatedAt || i.updated_at) || (/* @__PURE__ */ new Date()).toISOString();
  return !Object.keys(n).length || r <= 0 ? null : {
    ref: c(i.ref),
    data: n,
    revision: r,
    updatedAt: l,
    metadata: c(i.metadata)
  };
}
function It(e) {
  return o(c(e.source_target_drift).current_source_hash);
}
function z(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
function Pt(e) {
  const t = c(e), s = c(t.cause);
  return t.code === "STALE_REVISION" || s.code === "STALE_REVISION";
}
function U(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, i] of Object.entries(t))
    i == null || `${i}`.trim() === "" || s.searchParams.set(a, String(i));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
function v(e) {
  if (!(!e || typeof e.close != "function"))
    try {
      e.close();
    } catch {
      return;
    }
}
async function Ft(e) {
  const t = String(e || ""), s = typeof navigator < "u" ? navigator.clipboard : void 0;
  if (s && typeof s.writeText == "function") try {
    return await s.writeText(t), !0;
  } catch {
  }
  return Mt(t);
}
function Mt(e) {
  if (typeof document > "u" || !document.body || typeof document.execCommand != "function") return !1;
  const t = document.createElement("textarea");
  t.value = e, t.setAttribute("readonly", "true"), t.style.position = "fixed", t.style.left = "-9999px", t.style.top = "0", document.body.appendChild(t);
  try {
    return t.focus(), t.select(), t.setSelectionRange(0, t.value.length), document.execCommand("copy");
  } catch {
    return !1;
  } finally {
    t.remove();
  }
}
function Bt(e, t) {
  try {
    if (e.location && typeof e.location.assign == "function") {
      e.location.assign(t);
      return;
    }
  } catch {
  }
  e.location.href = t;
}
var Nt = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function q(e, t) {
  const s = await Y(e);
  return new Nt({
    message: s.message || await je(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: o(e.headers.get("x-request-id")) || void 0,
    traceId: ge(e.headers) || void 0
  });
}
async function zt(e) {
  const t = await x(e, { method: "GET" }), s = o(t.headers.get("x-request-id")) || void 0, a = ge(t.headers) || void 0;
  if (!t.ok) {
    const n = await Y(t);
    return {
      status: n.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: n.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: n.textCode
    };
  }
  const i = be(await t.json());
  return i.assignment_id ? {
    status: "ready",
    detail: i,
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
function Ut(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function C(e) {
  return o(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function Kt(e) {
  return e === "review" || e === "in_review";
}
function Vt(e) {
  return e === "changes_requested";
}
function A(e) {
  return Vt(C(e));
}
function ee(e) {
  return Kt(C(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function te(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function H(e) {
  const t = C(e);
  return t === "review" || t === "in_review" || t === "approved" || t === "archived";
}
function se(e) {
  return `This assignment is ${P(C(e) || "unavailable").toLowerCase()} and can be inspected but not edited.`;
}
function Ht(e, t, s) {
  const a = !!t && e.trim().toLowerCase() !== t.trim().toLowerCase();
  return !a && !s ? "" : `<p class="mt-1 text-xs text-gray-500">${[a ? d(t) : "", s ? "Required" : ""].filter(Boolean).join(" • ")}</p>`;
}
function Yt(e, t, s, a) {
  if (e.assignment_action_states.submit_review?.enabled) return `
      <button
        type="button"
        class="${T}"
        data-action="submit-review"
        title="${f(a)}"
        ${s ? 'disabled aria-disabled="true"' : ""}
      >
        ${t ? "Submitting..." : "Submit review"}
      </button>
    `;
  const i = C(e);
  return i === "review" || i === "in_review" || i === "approved" || i === "archived" || i === "changes_requested" ? qe(i) : `
    <button
      type="button"
      class="${T}"
      data-action="submit-review"
      title="${f(a)}"
      disabled aria-disabled="true"
    >
      Submit review
    </button>
  `;
}
function Gt(e, t, s) {
  let a = "idle";
  return e?.autosave.conflict ? a = "conflict" : e?.autosave.pending ? a = "saving" : t ? a = "dirty" : s && (a = "saved"), {
    tone: Ke(a),
    text: et(a, s),
    state: a
  };
}
function ve(e) {
  const t = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function Qt(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${f(e.kind)}" role="status" aria-live="polite">
      ${d(e.message)}
    </div>
  ` : "";
}
function Wt(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? w("error") : w("success"), a = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${w("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function Xt(e, t) {
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
function Jt(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function Zt(e, t) {
  const s = e.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function es() {
  return rt({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${Ne} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function ce(e, t) {
  return me({
    tag: "section",
    containerClass: `${ze} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Oe,
    message: t,
    messageClass: `${Ie} mt-2`
  });
}
function le(e, t, s) {
  return me({
    tag: "section",
    containerClass: `${Me} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: De,
    message: t,
    messageClass: `${Xe} mt-2`,
    actionsHtml: ve(s),
    role: "alert"
  });
}
function ts(e, t, s, a, i, n, r, l, u = "") {
  const m = e.assignment_action_states.submit_review, p = e.assignment_action_states.claim, h = e.preview_action, $ = A(e), b = !p?.enabled || i || a || r, ae = l || !m?.enabled || i || a || e.qa_results.submit_blocked, $e = !h?.enabled || i || a || n || r, ke = l || i || !s, Re = (e.source_locale || "source").toUpperCase(), Ee = (e.target_locale || "target").toUpperCase(), y = e.translation_assignment, M = l ? se(e) : e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : m?.reason || "", Te = h?.enabled ? r ? "Reload the latest server draft before opening preview." : n ? "Opening preview." : "Open preview in a new tab." : h?.reason || "Preview is unavailable for this assignment.", B = r ? "Reload the latest server draft before resuming work." : i ? "Wait for the current save to finish before resuming work." : p?.reason || "Resume work on this assignment.";
  return `
    <section class="${I} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${Be}">Assignment editor</p>
          <div>
            <h1 class="${Pe}">${d(y.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${d(Re.toUpperCase())} → ${d(Ee.toUpperCase())} • ${d(ie(e.status || y.status || "draft"))} • Priority ${d(ie(e.priority || "normal"))}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${d(y.display_assignee || y.assignee_label || y.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${d(y.display_reviewer || y.reviewer_label || y.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${f(t.state)}">${d(t.text)}</span>
            ${Wt(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-start gap-3">
          <button
            type="button"
            class="${D}"
            data-action="save-draft"
            ${ke ? 'disabled aria-disabled="true"' : ""}
          >
            ${i ? "Saving…" : "Save draft"}
          </button>
          <div class="flex max-w-xs flex-col items-start gap-1">
            <button
              type="button"
              class="${D}"
              data-action="preview-assignment"
              title="${f(Te)}"
              data-preview-enabled="${h?.enabled ? "true" : "false"}"
              data-preview-reason-code="${f(h?.reason_code || "")}"
              ${$e ? 'disabled aria-disabled="true"' : ""}
            >
              ${n ? "Opening..." : h?.enabled ? "Preview" : "Preview unavailable"}
            </button>
            ${!h?.enabled && h?.reason ? `<p class="text-xs text-gray-500" data-preview-unavailable-reason="true">${d(h.reason)}</p>` : ""}
          </div>
          ${$ ? `
            <div class="flex max-w-xs flex-col items-start gap-1">
              <button
                type="button"
                class="${T}"
                data-action="resume-work"
                title="${f(B)}"
                ${b ? 'disabled aria-disabled="true"' : ""}
              >
                ${a && p?.enabled ? "Resuming..." : "Resume work"}
              </button>
              ${b && B ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${d(B)}</p>` : ""}
            </div>
          ` : ""}
          <div class="flex max-w-xs flex-col items-start gap-1">
            ${Yt(e, a, ae, M)}
            ${ae && M ? `<p class="text-xs text-gray-500" data-submit-unavailable-reason="true">${d(M)}</p>` : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}
function ss(e) {
  const t = d(e.label || e.locale.toUpperCase()), s = "inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors", a = "bg-blue-100 text-blue-700", i = "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900", n = "cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200", r = [
    `data-locale-chip="${f(e.locale)}"`,
    e.current ? 'data-locale-current="true"' : "",
    e.disabled ? 'data-locale-disabled="true"' : "",
    e.assignment_id ? `data-assignment-id="${f(e.assignment_id)}"` : ""
  ].filter(Boolean).join(" ");
  if (e.enabled && e.href) {
    const u = e.current ? a : i, m = e.current ? ' aria-current="page"' : "";
    return `<a href="${f(e.href)}" class="${s} ${u}" ${r}${m} aria-label="Open ${f(e.label || e.locale.toUpperCase())} assignment">${t}</a>`;
  }
  if (e.current) return `<span class="${s} ${a}" ${r} aria-current="page">${t}</span>`;
  const l = e.reason || "No translation assignment exists for this locale.";
  return `<span class="${s} ${n}" ${r} aria-disabled="true" title="${f(l)}" aria-label="${f(`${e.label || e.locale.toUpperCase()} unavailable: ${l}`)}">${t}</span>`;
}
function as(e) {
  const t = e.locale_navigation, s = t.locales, a = t.current_locale || (e.target_locale || "").toLowerCase(), i = (a || "target").toUpperCase();
  if (!t.family_id && s.length === 0 && !t.family_detail_url) return "";
  const n = s.length > 0 ? s : [{
    locale: a,
    label: i,
    current: !0,
    source: !1,
    enabled: !1,
    disabled: !1,
    reason: ""
  }];
  return `
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-editor-locale-summary="true" data-family-id="${f(t.family_id || e.family_id)}" data-current-locale="${f(a)}">
      <div class="p-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Locale</span>
            <div class="flex flex-wrap items-center gap-1" data-editor-locale-chips="true">
              ${n.map(ss).join("")}
            </div>
          </div>
        </div>
        ${t.family_detail_url ? `
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p class="text-xs text-gray-500">Use the family detail view for blocker ordering, publish-gate rationale, and assignment context.</p>
            <a href="${f(t.family_detail_url)}" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800" data-family-detail-link="true" aria-label="Open translation family detail">
              Open family detail
              <span aria-hidden="true">›</span>
            </a>
          </div>
        ` : ""}
      </div>
    </section>
  `;
}
function is(e) {
  if (!we(e)) return "";
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim()), s = !!(e.drift.current_source_value || e.source_value);
  return !t && !s ? `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${f(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    ` : t ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${f(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${d(e.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${d(e.drift.current_source_value || e.source_value || "Current value unavailable")}</p>
    </div>
  ` : `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${f(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
}
function we(e) {
  if (!e.drift.changed) return !1;
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim());
  return e.drift.comparison_mode !== "hash_only" || t;
}
function rs(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${We}">
          <span class="${Fe}">${d(o(s.term))}</span>
          → ${d(o(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function ns(e) {
  const t = e.fields || [], s = e.qa_results, a = {
    missing: null,
    validation: null,
    qaBlocker: null,
    qaFinding: null,
    sourceDrift: null
  };
  let i = 0, n = 0, r = 0, l = 0;
  for (const u of t)
    u.completeness.complete && !u.completeness.missing && i++, u.completeness.required && u.completeness.missing && (n++, a.missing || (a.missing = u.path)), u.drift.changed && (r++, a.sourceDrift || (a.sourceDrift = u.path)), u.validation.valid || (l++, a.validation || (a.validation = u.path));
  if (s.enabled && s.findings.length > 0) {
    const u = s.findings.find((p) => p.severity === "blocker");
    u?.field_path && (a.qaBlocker = u.field_path);
    const m = s.findings.find((p) => p.field_path);
    m?.field_path && (a.qaFinding = m.field_path);
  }
  return {
    totalFields: t.length,
    completeFields: i,
    missingRequiredFields: n,
    sourceChangedFields: r,
    validationErrors: l,
    qaBlockers: s.enabled ? s.summary.blocker_count : 0,
    qaWarnings: s.enabled ? s.summary.warning_count : 0,
    firstIssuePath: a.missing || a.validation || a.qaBlocker || a.qaFinding || a.sourceDrift
  };
}
function os(e) {
  const t = e.missingRequiredFields > 0 || e.sourceChangedFields > 0 || e.validationErrors > 0 || e.qaBlockers > 0, s = e.completeFields === e.totalFields && e.missingRequiredFields === 0 && e.validationErrors === 0 && e.qaBlockers === 0, a = [], i = (l, u) => `<span class="status-chip status-chip--${l}">${u}</span>`;
  a.push(i(s ? "success" : "neutral", `${e.completeFields}/${e.totalFields} complete`)), e.missingRequiredFields > 0 && a.push(i("error", `${e.missingRequiredFields} missing required`)), e.sourceChangedFields > 0 && a.push(i("warning", `${e.sourceChangedFields} source changed`)), e.validationErrors > 0 && a.push(i("error", `${e.validationErrors} validation ${e.validationErrors === 1 ? "error" : "errors"}`)), e.qaBlockers > 0 && a.push(i("error", `${e.qaBlockers} QA ${e.qaBlockers === 1 ? "blocker" : "blockers"}`)), e.qaWarnings > 0 && a.push(i("warning", `${e.qaWarnings} QA ${e.qaWarnings === 1 ? "warning" : "warnings"}`));
  const n = s ? "border-emerald-200 bg-emerald-50" : t ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50", r = e.firstIssuePath ? `<button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        data-jump-to-field="${f(e.firstIssuePath)}"
        title="Jump to first issue"
      >
        Jump to issue
        ${F("iconoir:nav-arrow-down", "14px")}
      </button>` : "";
  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${n}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${a.join("")}</div>
      ${r}
    </section>
  `;
}
function cs(e) {
  return e.source_value && e.source_value.trim() ? d(e.source_value) : e.required ? '<span class="text-amber-600 italic">Source text pending - required field</span>' : '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}
var xe = "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium leading-4 text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-100";
function F(e, t = "16px") {
  return Ce(e, {
    size: t,
    extraClass: "text-current"
  });
}
function ls() {
  return F(st, "12px");
}
function ds(e, t = "") {
  const s = o(t), a = o(e.idempotency_key || e.payload?.idempotency_key || e.payload?.idempotencyKey), i = o(e.execution_mode), n = { correlation_id: s };
  a && (n.idempotency_key = a);
  const r = {
    CorrelationID: s,
    Metadata: n
  };
  return i && (r.Mode = i), a && (r.IdempotencyKey = a), {
    method: e.rpc_method || "admin.commands.dispatch",
    params: {
      data: {
        name: e.command_name || "translations.suggestions.generate",
        ids: e.assignment_id ? [e.assignment_id] : [],
        payload: {
          ...e.payload,
          assignment_id: e.assignment_id,
          field_path: e.field_path
        },
        options: r
      },
      meta: { correlationId: s }
    }
  };
}
function us(e) {
  const t = c(e), s = o(t.assignment_id ?? t.assignmentId), a = o(t.field_path ?? t.fieldPath), i = o(t.suggested_text ?? t.suggestedText);
  return !s || !a || !i ? null : {
    assignment_id: s,
    field_path: a,
    suggested_text: i,
    provider: o(t.provider) || void 0,
    model: o(t.model) || void 0,
    diagnostics: c(t.diagnostics)
  };
}
async function fs(e, t = "") {
  const s = e.endpoint || e.rpc_invoke_path;
  if (!e.enabled) throw new Error(e.reason || "Translation suggestion is unavailable.");
  if (!s) throw new Error("Translation suggestion RPC endpoint is not configured.");
  const a = await x(s, {
    method: "POST",
    json: ds(e, t)
  });
  if (!a.ok) {
    const u = await Y(a);
    throw new Error(u.message || "Failed to generate translation suggestion.");
  }
  const i = c(await a.json().catch(() => ({}))), n = c(i.error);
  if (Object.keys(n).length > 0) throw new Error(o(n.message) || "Failed to generate translation suggestion.");
  const r = c(i.data), l = us(r.result ?? r.Result);
  if (!l) throw new Error("Translation suggestion did not return suggested text.");
  return l;
}
function ms(e) {
  return e.enabled ? !0 : !!(e.command_name && e.reason_code && e.reason_code !== "service_unavailable");
}
function gs(e, t, s) {
  const a = e.suggest_translation_action;
  if (!ms(a)) return "";
  const i = t || s || !a.enabled, n = s ? "Generating suggestion..." : i ? a.reason || "Translation suggestion is unavailable." : `Generate translation suggestion for ${e.label}`;
  return `
    <button
      type="button"
      class="${xe}"
      data-suggest-translation="${f(e.path)}"
      aria-label="Generate translation suggestion for ${f(e.label)}"
      title="${f(n)}"
      ${i ? 'disabled aria-disabled="true"' : ""}
    >
      ${F("iconoir:spark", "12px")}
      <span>${s ? "Generating" : "Generate suggestion"}</span>
    </button>
  `;
}
function ps(e, t = !1, s = /* @__PURE__ */ new Set()) {
  const a = ns(e), i = t ? "mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100", n = t ? "mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
  return `
    <section class="space-y-4">
      ${os(a)}
      ${e.fields.map((r) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${f(r.path)}" id="field-${f(r.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${d(r.label)}</h2>
              ${Ht(r.label, r.path, r.required)}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="${xe}"
                data-copy-source="${f(r.path)}"
                data-source-value="${f(r.source_value)}"
                aria-label="Copy source text to translation field for ${f(r.label)}"
                ${t ? 'disabled aria-disabled="true"' : ""}
              >
                ${ls()}
                <span>Copy source</span>
              </button>
              ${gs(r, t, s.has(r.path))}
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${cs(r)}</div>
            </div>
            <div class="rounded-xl border ${r.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-wider text-gray-500" for="editor-field-${f(r.path)}">Translation</label>
              ${r.input_type === "textarea" ? `<textarea id="editor-field-${f(r.path)}" class="${n}" data-field-input="${f(r.path)}" ${t ? 'disabled aria-disabled="true"' : ""}>${d(r.target_value)}</textarea>` : `<input id="editor-field-${f(r.path)}" type="text" class="${i}" data-field-input="${f(r.path)}" value="${f(r.target_value)}" ${t ? 'disabled aria-disabled="true"' : ""} />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${r.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${r.completeness.missing ? "Missing required content" : "Field complete"}
                </span>
                ${we(r) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${r.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${f(r.path)}">${d(r.validation.message || "Validation error")}</p>`}
              ${is(r)}
              ${rs(r)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function Se(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = c(s), i = o(a.suggested_text) || o(a.target_text);
    i && t.push({
      id: o(a.id) || `tm-${t.length}`,
      score: hs(a.score, a.match_score),
      sourceLabel: o(a.source_label) || o(a.source) || "Internal TM",
      localePair: o(a.locale_pair) || "",
      fieldPath: o(a.field_path) || "",
      suggestedText: i,
      isStaleSource: _(a.is_stale_source) || _(a.stale_source)
    });
  }
  return t.sort((s, a) => a.score - s.score);
}
function hs(e, t) {
  const s = g(e) || g(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const a = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(a)));
}
function _s(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function bs(e) {
  return e.length ? `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${e.map((t) => `
          <li class="rounded-xl border ${t.isStaleSource ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm" data-tm-suggestion="${f(t.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${d(t.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${_s(t.score)} ${t.score}%</span>
                  <span>${d(t.sourceLabel)}</span>
                  ${t.localePair ? `<span class="text-gray-400">${d(t.localePair)}</span>` : ""}
                  ${t.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ""}
                </div>
                ${t.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${d(t.fieldPath)}</p>` : ""}
              </div>
              <button
                type="button"
                class="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-insert-tm="${f(t.id)}"
                data-insert-text="${f(t.suggestedText)}"
                data-insert-field="${f(t.fieldPath)}"
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
function ys(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${bs(Se(e.assist.translation_memory_suggestions))}
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
function vs(e) {
  const t = e.history.items.map((s) => ({
    id: s.id,
    title: s.title || P(s.entry_type),
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
    const i = s.created_at ? Date.parse(s.created_at) : 0;
    return (a.created_at ? Date.parse(a.created_at) : 0) - i;
  });
}
function ws(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((n) => n.severity === "blocker"), a = t.findings.filter((n) => n.severity !== "blocker"), i = (n, r) => {
    if (!n.length) return "";
    const l = He(r);
    return `
      <section data-qa-group="${f(r === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${r === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${r === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((u) => `
          <li class="${l.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${d(P(u.category))}</strong>
              <span class="${l.badge}">${d(u.severity)}</span>
            </div>
            <p class="mt-2">${d(u.message)}</p>
            ${u.field_path ? `
              <button
                type="button"
                class="mt-2 inline-flex items-center rounded-md border border-current px-2 py-1 text-xs font-medium opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/20"
                data-jump-to-field="${f(u.field_path)}"
                title="Jump to ${f(u.field_path)}"
              >
                Field ${d(u.field_path)}
              </button>
            ` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${Je(t.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${t.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${t.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${t.submit_blocked ? w("error") : w("neutral")}">
          ${t.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${w("warning")}">Warnings ${t.summary.warning_count}</span>
        <span class="${w("error")}">Blockers ${t.summary.blocker_count}</span>
      </div>
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${i(s, "blocker")}${i(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function xs(e, t) {
  const s = e.review_action_states.approve, a = e.review_action_states.reject;
  return ee(e) ? `
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
    tone: "btn btn-success-outline"
  }, {
    key: "reject",
    label: "Request changes",
    state: a,
    tone: "btn btn-danger-outline"
  }].map((i) => {
    const n = !i.state?.enabled || t;
    return `
            <button
              type="button"
              class="${i.tone} ${n ? "cursor-not-allowed opacity-60" : ""}"
              data-action="${f(i.key)}"
              title="${f(i.state?.reason || "")}"
              ${n ? 'disabled aria-disabled="true"' : ""}
            >
              ${d(i.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function Ss(e, t, s, a) {
  if (!A(e)) return "";
  const i = e.assignment_action_states.claim, n = !i?.enabled || s || t || a, r = a ? "Reload the latest server draft before resuming work." : s ? "Wait for the current save to finish before resuming work." : t ? "Resume is already in progress." : i?.reason || "";
  return `
    <section
      class="${I} p-5"
      data-editor-panel="resume-actions"
      aria-label="Resume work"
    >
      <h2 class="text-lg font-semibold text-gray-900">Resume work</h2>
      <p class="mt-2 text-sm text-gray-600">This assignment has requested changes. Resume it before submitting the updated draft for review.</p>
      <div class="mt-4 flex max-w-xs flex-col items-start gap-2">
        <button
          type="button"
          class="${T}"
          data-action="resume-work"
          title="${f(r || "Resume work on this assignment.")}"
          ${n ? 'disabled aria-disabled="true"' : ""}
        >
          ${t && i?.enabled ? "Resuming..." : "Resume work"}
        </button>
        ${n && r ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${d(r)}</p>` : ""}
      </div>
    </section>
  `;
}
function $s(e, t) {
  return e ? `
    <div class="${at}" data-reject-modal="true">
      <section class="${Ye}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${it}" data-action="cancel-reject">Close</button>
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
          <button type="button" class="${D}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${Qe}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function ks(e, t) {
  if (!te(e)) return "";
  const s = e.assignment_action_states.archive, a = !s?.enabled || t;
  return `
    <section
      class="${I} p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="${D}"
          data-action="archive"
          title="${f(s?.reason || "")}"
          ${a ? 'disabled aria-disabled="true"' : ""}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}
function Rs(e) {
  return `
    <section class="${I} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${e.attachment_summary.total}</span>
      </div>
      ${e.attachments.length ? `<ul class="mt-4 space-y-3">${e.attachments.map((t) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${d(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-wider text-gray-500">${d(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${d(Ut(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${d(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${d(fe(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function Es(e) {
  const t = e.history, s = vs(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => {
    const i = Ge(a.tone);
    return `
            <li class="${i.container}" data-history-entry="${f(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${i.title}">${d(a.title)}</p>
                  <span class="${i.badge}">${d(a.badge)}</span>
                </div>
                <span class="${i.time}">${d(fe(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${d(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${re}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${re}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
var Ts = {
  actions: "iconoir:flash",
  qa: "iconoir:shield",
  assist: "iconoir:chat-bubble",
  files: Ve,
  history: Ue
};
function Cs(e) {
  return F(Ts[e], "16px");
}
function As(e) {
  const t = A(e), s = ee(e), a = te(e), i = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, n = Se(e.assist.translation_memory_suggestions).length, r = e.assist.glossary_matches.length, l = e.attachment_summary.total, u = e.history.total;
  return {
    actions: null,
    qa: i > 0 ? String(i) : null,
    assist: n + r > 0 ? String(n + r) : null,
    files: l > 0 ? String(l) : null,
    history: u > 0 ? String(u) : null
  };
}
function js(e, t, s = "actions", a, i = !1, n = !1) {
  const r = As(e), l = A(e), u = ee(e), m = te(e), p = l || u || m, h = `
    <nav class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Editor sidebar sections">
      ${[
    {
      id: "actions",
      label: "Actions",
      badge: r.actions
    },
    {
      id: "qa",
      label: "QA",
      badge: r.qa
    },
    {
      id: "assist",
      label: "Assist",
      badge: r.assist
    },
    {
      id: "files",
      label: "Files",
      badge: r.files
    },
    {
      id: "history",
      label: "History",
      badge: r.history
    }
  ].map((b) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${s === b.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}"
          data-sidebar-tab="${f(b.id)}"
          role="tab"
          aria-selected="${s === b.id}"
          aria-controls="sidebar-panel-${f(b.id)}"
        >
          ${Cs(b.id)}
          <span class="hidden sm:inline">${d(b.label)}</span>
          ${b.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${d(b.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, $ = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${l ? Ss(e, t, i, n) : ""}
        ${u ? xs(e, t) : ""}
        ${m ? ks(e, t) : ""}
        ${p ? "" : `
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <h2 class="text-lg font-semibold text-gray-900">Actions</h2>
            <p class="mt-3 text-sm text-gray-500">No actions available for this assignment in its current state.</p>
          </div>
        `}
      </div>
    `,
    qa: `
      <div id="sidebar-panel-qa" class="space-y-4" role="tabpanel" data-sidebar-panel="qa" ${s !== "qa" ? "hidden" : ""}>
        ${ws(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${ys(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${Rs(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${Es(e)}
        ${ve(a || {
      status: "ready",
      detail: e
    })}
      </div>
    `
  };
  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${h}
      ${Object.values($).join("")}
    </aside>
  `;
}
function qs(e, t, s = {}, a = {}) {
  if (e.status === "loading") return es();
  if (e.status === "empty") return ce("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return le("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return le("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const i = t?.detail || e.detail;
  if (!i) return ce("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), r = Gt(t || null, n, a.lastSavedMessage || ""), l = t?.autosave.conflict, u = H(i);
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true" data-editor-read-only="${u ? "true" : "false"}">
      ${Qt(a.feedback || null)}
      ${ts(i, r, n, a.submitting === !0, a.saving === !0, a.previewing === !0, !!l, u, s.basePath || "")}
      ${as(i)}
      ${u ? `
        <section class="rounded-xl border border-gray-200 bg-gray-50 p-4" data-editor-read-only-notice="true">
          <p class="text-sm font-medium text-gray-700">${d(se(i))}</p>
        </section>
      ` : ""}
      ${l ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${T}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${ps(i, u, new Set(a.suggestingFields || []))}
        </div>
        <div class="order-2">
          ${js(i, a.submitting === !0, a.activeSidebarTab || "actions", e, a.saving === !0, !!l)}
        </div>
      </div>
      ${$s(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function Ls(e, t, s, a = {}, i = {}) {
  e.innerHTML = qs(t, s, a, i);
}
var Ds = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.previewing = !1, this.rejectDraft = null, this.syncCoreModulePromise = null, this.syncCoreModule = null, this.syncCache = null, this.syncEngine = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null, this.suggestingFields = /* @__PURE__ */ new Set(), this.activeSidebarTab = "actions";
    const t = e.basePath || "/admin";
    this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase || "",
      actionEndpointBase: e.actionEndpointBase,
      syncBaseURL: e.syncBaseURL || dt(e.variantEndpointBase || "", e.actionEndpointBase, e.endpoint),
      syncClientBasePath: e.syncClientBasePath || ut(t),
      syncResourceKind: e.syncResourceKind || nt,
      syncScope: pt(e),
      basePath: t,
      initialDetail: e.initialDetail
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (t) => {
      (t.ctrlKey || t.metaKey) && t.key === "s" && (t.preventDefault(), this.saveDirtyFields(!1)), t.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  mountWithInitialDetail(e, t) {
    this.container = e, this.keyboardHandler = (a) => {
      (a.ctrlKey || a.metaKey) && a.key === "s" && (a.preventDefault(), this.saveDirtyFields(!1)), a.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler);
    const s = be(t);
    this.loadState = {
      status: "ready",
      detail: s
    }, this.editorState = ne(s), this.render();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null, this.suggestingFields.clear();
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await zt(e ? U(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? (this.editorState = ne(this.loadState.detail), H(this.loadState.detail) || await this.hydrateDraftSyncFromRead(this.loadState.detail)) : this.editorState = null, this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.captureRenderViewportState();
    Ls(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      previewing: this.previewing,
      suggestingFields: Array.from(this.suggestingFields),
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), tt(this.container), this.restoreRenderViewportState(e);
  }
  captureRenderViewportState() {
    if (!this.container || typeof document > "u") return null;
    const e = document.activeElement, t = typeof HTMLInputElement < "u" && e instanceof HTMLInputElement, s = typeof HTMLTextAreaElement < "u" && e instanceof HTMLTextAreaElement;
    return !(t || s) || !this.container.contains(e) || !e.dataset.fieldInput ? null : {
      fieldPath: e.dataset.fieldInput,
      selectionStart: e.selectionStart,
      selectionEnd: e.selectionEnd,
      selectionDirection: e.selectionDirection,
      scrollX: typeof window < "u" && (window.scrollX || window.pageXOffset) || 0,
      scrollY: typeof window < "u" && (window.scrollY || window.pageYOffset) || 0
    };
  }
  restoreRenderViewportState(e) {
    if (!e || !this.container) return;
    const t = Array.from(this.container.querySelectorAll("[data-field-input]")).find((s) => s.dataset.fieldInput === e.fieldPath);
    if (t) {
      try {
        t.focus({ preventScroll: !0 });
      } catch {
        t.focus();
      }
      if (e.selectionStart !== null && e.selectionEnd !== null && typeof t.setSelectionRange == "function") {
        const s = t.value.length, a = Math.min(e.selectionStart, s), i = Math.min(e.selectionEnd, s);
        t.setSelectionRange(a, i, e.selectionDirection || "none");
      }
      this.restoreWindowScroll(e), typeof window < "u" && typeof window.requestAnimationFrame == "function" && window.requestAnimationFrame(() => this.restoreWindowScroll(e));
    }
  }
  restoreWindowScroll(e) {
    if (!(typeof window > "u" || typeof window.scrollTo != "function"))
      try {
        window.scrollTo(e.scrollX, e.scrollY);
      } catch {
        return;
      }
  }
  isEditorReadOnly() {
    return this.editorState ? H(this.editorState.detail) : !0;
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        if (this.isEditorReadOnly()) return;
        const s = t.currentTarget, a = s.dataset.fieldInput || "";
        this.editorState = k(this.editorState, a, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", (t) => {
        if (t.preventDefault(), t.stopPropagation(), this.isEditorReadOnly()) return;
        const s = e.dataset.copySource || "", a = this.editorState?.detail.fields.find((r) => r.path === s);
        if (!a || !this.editorState) return;
        const i = (a.source_value || e.dataset.sourceValue || "").trim();
        Ft(i), this.editorState = k(this.editorState, s, i);
        const n = this.container?.querySelector(`[data-field-input="${z(s)}"]`);
        if (n) {
          n.value = i;
          try {
            n.focus({ preventScroll: !0 });
          } catch {
            n.focus();
          }
          const r = n.value.length;
          try {
            n.setSelectionRange(r, r);
          } catch {
          }
        }
        this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-suggest-translation]").forEach((e) => {
      e.addEventListener("click", (t) => {
        t.preventDefault(), t.stopPropagation();
        const s = e.dataset.suggestTranslation || "";
        this.generateSuggestion(s);
      });
    }), this.container.querySelector('[data-action="save-draft"]')?.addEventListener("click", () => {
      this.isEditorReadOnly() || this.saveDirtyFields(!1);
    }), this.container.querySelector('[data-action="submit-review"]')?.addEventListener("click", () => {
      this.submitForReview();
    }), this.container.querySelectorAll('[data-action="resume-work"]').forEach((e) => {
      e.addEventListener("click", () => {
        this.resumeWork();
      });
    }), this.container.querySelector('[data-action="preview-assignment"]')?.addEventListener("click", () => {
      const e = this.previewBlockedBeforeOpenMessage();
      if (e) {
        this.feedback = e, this.render();
        return;
      }
      const t = this.openPreviewWindow();
      this.previewAssignment(t);
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
    }), this.container.querySelectorAll("[data-jump-to-field]").forEach((e) => {
      e.addEventListener("click", (t) => {
        const s = t.currentTarget.dataset.jumpToField;
        if (!s || !this.container) return;
        const a = this.container.querySelector(`[data-editor-field="${z(s)}"]`);
        if (a) {
          a.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
          const i = a.querySelector("[data-field-input]");
          i && setTimeout(() => i.focus(), 300);
        }
      });
    }), this.container.querySelectorAll("[data-sidebar-tab]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.sidebarTab;
        t && t !== this.activeSidebarTab && (this.activeSidebarTab = t, this.render());
      });
    }), this.container.querySelectorAll("[data-insert-tm]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.insertField || "", s = e.dataset.insertText || "";
        !t || !s || !this.editorState || (this.editorState = k(this.editorState, t, s), this.feedback = {
          kind: "success",
          message: "Translation memory suggestion inserted."
        }, this.scheduleAutosave(), this.render());
      });
    }));
  }
  focusField(e) {
    const t = this.container?.querySelector(`[data-field-input="${z(e)}"]`);
    if (!t) return;
    try {
      t.focus({ preventScroll: !0 });
    } catch {
      t.focus();
    }
    const s = t.value.length;
    try {
      t.setSelectionRange(s, s);
    } catch {
    }
  }
  async generateSuggestion(e) {
    const t = e.trim();
    if (!t || !this.editorState || this.suggestingFields.has(t) || this.isEditorReadOnly()) return;
    if (this.editorState.autosave.conflict) {
      this.feedback = {
        kind: "conflict",
        message: "Reload the latest server draft before generating a suggestion."
      }, this.render();
      return;
    }
    const s = this.editorState.detail.fields.find((r) => r.path === t), a = s?.suggest_translation_action;
    if (!s || !a?.enabled) {
      this.feedback = {
        kind: "error",
        message: a?.reason || "Translation suggestion is unavailable for this field."
      }, this.render();
      return;
    }
    const i = o(this.editorState.detail.target_fields[t]), n = this.editorState.detail.row_version;
    this.suggestingFields.add(t), this.feedback = null, this.render();
    try {
      const r = await fs(a, this.loadState.requestId || "");
      if (!this.editorState || r.assignment_id !== this.editorState.detail.assignment_id || r.field_path !== t) throw new Error("Translation suggestion response did not match the requested field.");
      if (this.editorState.autosave.conflict) throw new Error("Reload the latest server draft before applying this suggestion.");
      if (this.editorState.detail.row_version !== n || o(this.editorState.detail.target_fields[t]) !== i) throw new Error("The field changed while the suggestion was generating. Review the current draft and try again.");
      this.editorState = k(this.editorState, t, r.suggested_text), this.lastSavedMessage = "", this.feedback = {
        kind: "success",
        message: "Translation suggestion inserted."
      }, this.scheduleAutosave(), this.render(), this.focusField(t);
    } catch (r) {
      this.feedback = {
        kind: "error",
        message: r instanceof Error ? r.message : "Failed to generate translation suggestion."
      }, this.render();
    } finally {
      this.suggestingFields.delete(t), this.render();
    }
  }
  scheduleAutosave() {
    this.isEditorReadOnly() || (this.autosaveTimer && clearTimeout(this.autosaveTimer), this.autosaveTimer = setTimeout(() => {
      this.saveDirtyFields(!0);
    }, 600));
  }
  async saveDirtyFields(e) {
    if (this.isEditorReadOnly() || !this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return !0;
    this.saving = !0, this.editorState = Lt(this.editorState), this.render();
    const t = this.editorState.detail;
    try {
      const s = await this.mutateDraftSync(t, this.editorState.dirty_fields, e);
      this.syncLoadedRevision = s.snapshot.revision, this.syncConflictSnapshot = null, this.editorState = R(this.editorState, j(s.snapshot));
      const a = Xt(this.editorState.detail.qa_results, e);
      return this.lastSavedMessage = a.lastSaved, (!e || a.kind === "conflict") && (this.feedback = {
        kind: a.kind,
        message: a.message
      }), this.saving = !1, this.render(), !0;
    } catch (s) {
      return Pt(s) ? (this.syncConflictSnapshot = Ot(s), this.syncConflictSnapshot?.revision && (this.syncLoadedRevision = this.syncConflictSnapshot.revision), this.editorState = Dt(this.editorState, ye(s)), this.feedback = {
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
      const t = this.syncConflictSnapshot;
      if (this.editorState = t ? R(this.editorState, j(t)) : R(this.editorState, { data: e }), t?.revision) this.syncLoadedRevision = t.revision;
      else {
        const s = g(c(e).row_version || c(e).version);
        s > 0 && (this.syncLoadedRevision = s);
      }
      this.syncConflictSnapshot = null, this.feedback = {
        kind: "conflict",
        message: "Reloaded the latest server draft."
      }, this.saving = !1, this.render();
      return;
    }
    try {
      const t = await (await this.ensureDraftSyncResource(this.editorState.detail)).refresh({ force: !0 });
      if (!oe(t)) throw new Error("Sync refresh did not return a usable draft snapshot");
      this.syncLoadedRevision = t.revision, this.syncConflictSnapshot = null, this.editorState = R(this.editorState, j(t)), this.feedback = {
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
    await this.ensureDraftSyncLoaded(e);
    const a = await this.ensureDraftSyncResource(e), i = g(a.getSnapshot()?.revision), n = this.syncLoadedRevision || i || e.row_version, r = {
      autosave: s,
      fields: t
    }, l = It(e);
    return l && (r.acknowledged_source_hash = l), await a.mutate({
      operation: ot,
      expectedRevision: n,
      payload: r,
      metadata: { autosave: s }
    });
  }
  async ensureDraftSyncResource(e) {
    if (this.syncCoreModule || (this.syncCoreModulePromise || (this.syncCoreModulePromise = ct(this.config.syncClientBasePath)), this.syncCoreModule = await this.syncCoreModulePromise), this.syncCache || (this.syncCache = this.syncCoreModule.createInMemoryCache()), !this.syncEngine) {
      const i = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: "same-origin",
        fetch: typeof fetch == "function" ? fetch.bind(globalThis) : void 0,
        headers: (n) => {
          const r = {};
          if (String(n?.method || "GET").toUpperCase() !== "GET") {
            const l = Ae();
            l && (r["X-CSRF-Token"] = l);
          }
          return r;
        }
      });
      this.syncEngine = this.syncCoreModule.createSyncEngine({
        transport: i,
        cache: this.syncCache,
        retry: { maxAttempts: 1 }
      });
    }
    const t = e.variant_id, s = {
      kind: this.config.syncResourceKind,
      id: t,
      scope: Object.keys(this.config.syncScope).length > 0 ? this.config.syncScope : void 0
    }, a = ht(s);
    return (!this.syncResource || this.syncResourceKey !== a) && (this.syncResourceKey = a, this.syncResource = this.syncEngine.resource(s), this.syncLoadedRevision = null, this.syncConflictSnapshot = null), this.syncResource;
  }
  async ensureDraftSyncLoaded(e) {
    const t = await this.ensureDraftSyncResource(e), s = this.syncResourceKey;
    if (this.syncLoadedResourceKey === s) return;
    const a = this.editorState ? { ...this.editorState.dirty_fields } : {}, i = await t.load();
    if (!oe(i)) throw new Error("Sync draft load did not return a usable draft snapshot");
    if (!this.editorState || this.editorState.detail.variant_id !== e.variant_id) return;
    let n = R(this.editorState, j(i));
    for (const [r, l] of Object.entries(a)) n = k(n, r, l);
    this.editorState = n, this.syncLoadedRevision = i.revision, this.syncConflictSnapshot = null, this.loadState = {
      ...this.loadState,
      detail: this.editorState.detail
    }, this.syncLoadedResourceKey = s;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    if (this.isEditorReadOnly()) {
      this.feedback = {
        kind: "error",
        message: se(this.editorState.detail)
      }, this.render();
      return;
    }
    const e = this.editorState.detail.assignment_action_states.submit_review;
    if (!e?.enabled) {
      this.feedback = {
        kind: "error",
        message: e?.reason || "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (!this.editorState.can_submit_review) {
      const r = Object.entries(this.editorState.detail.field_completeness).filter(([, l]) => l.required && l.missing).map(([l]) => l);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? Jt(this.editorState.detail) : r.length ? `Complete required fields before submitting for review: ${r.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.history.page, s = this.editorState.detail.translation_assignment.version, a = await x(this.assignmentActionEndpoint(this.editorState.detail, "submit_review"), {
      method: "POST",
      json: { expected_version: s }
    });
    if (!a.ok) {
      const r = await q(a, "Failed to submit assignment");
      if (this.feedback = {
        kind: r.status === 409 || r.code === "VERSION_CONFLICT" || r.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: r.message
      }, this.submitting = !1, r.status === 409 || r.code === "INVALID_STATUS_TRANSITION" || r.code === "INVALID_STATUS") {
        await this.load(t);
        return;
      }
      this.render();
      return;
    }
    const i = await a.json(), n = o(c(i).data && c(c(i).data).status);
    this.feedback = {
      kind: "success",
      message: Zt(this.editorState.detail, n)
    }, this.submitting = !1, await this.load(t);
  }
  assignmentActionEndpoint(e, t) {
    return U(`${this.config.actionEndpointBase}/${encodeURIComponent(e.assignment_id)}/actions/${t}`, this.config.syncScope);
  }
  async resumeWork() {
    if (!this.editorState || this.submitting) return;
    if (!A(this.editorState.detail)) {
      this.feedback = {
        kind: "error",
        message: "Resume work is unavailable for this assignment."
      }, this.render();
      return;
    }
    const e = this.editorState.detail.assignment_action_states.claim;
    if (!e?.enabled) {
      this.feedback = {
        kind: "error",
        message: e?.reason || "Resume work is unavailable."
      }, this.render();
      return;
    }
    if (this.editorState.autosave.conflict) {
      this.feedback = {
        kind: "conflict",
        message: "Reload the latest server draft before resuming work."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && (!await this.saveDirtyFields(!1) || !this.editorState))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.history.page, s = this.editorState.detail.translation_assignment.version, a = await x(this.assignmentActionEndpoint(this.editorState.detail, "claim"), {
      method: "POST",
      json: { expected_version: s }
    });
    if (!a.ok) {
      const i = await q(a, "Failed to resume assignment");
      if (this.feedback = {
        kind: i.status === 409 || i.code === "VERSION_CONFLICT" || i.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: i.message
      }, this.submitting = !1, i.status === 409 || i.code === "INVALID_STATUS_TRANSITION" || i.code === "INVALID_STATUS") {
        await this.load(t);
        return;
      }
      this.render();
      return;
    }
    this.feedback = {
      kind: "success",
      message: "Assignment resumed."
    }, this.submitting = !1, await this.load(t);
  }
  openPreviewWindow() {
    if (typeof window > "u" || typeof window.open != "function") return null;
    try {
      const e = window.open("about:blank", "_blank");
      if (e) try {
        e.opener = null;
      } catch {
      }
      return e;
    } catch {
      return null;
    }
  }
  previewBlockedBeforeOpenMessage() {
    if (!this.editorState) return {
      kind: "error",
      message: "Preview is unavailable for this assignment."
    };
    if (this.previewing) return {
      kind: "error",
      message: "Preview is already opening."
    };
    if (this.saving) return {
      kind: "error",
      message: "Wait for the current save to finish before opening preview."
    };
    if (this.submitting) return {
      kind: "error",
      message: "Wait for the current action to finish before opening preview."
    };
    const e = this.editorState.detail.preview_action;
    return e.enabled ? this.editorState.autosave.conflict ? {
      kind: "conflict",
      message: "Reload the latest server draft before opening preview."
    } : null : {
      kind: "error",
      message: e.reason || "Preview is unavailable for this assignment."
    };
  }
  assignmentPreviewEndpoint(e) {
    return U(`${this.config.actionEndpointBase}/${encodeURIComponent(e.assignment_id)}/preview`, {
      ...this.config.syncScope,
      channel: e.preview_action.channel || this.config.syncScope.channel
    });
  }
  async previewAssignment(e) {
    if (!this.editorState || this.previewing || this.saving || this.submitting) {
      v(e);
      return;
    }
    const t = this.editorState.detail;
    if (!t.preview_action.enabled) {
      v(e), this.feedback = {
        kind: "error",
        message: t.preview_action.reason || "Preview is unavailable for this assignment."
      }, this.render();
      return;
    }
    if (!e) {
      this.feedback = {
        kind: "error",
        message: "Preview was blocked by the browser. Allow popups for this site and try again."
      }, this.render();
      return;
    }
    if (this.editorState.autosave.conflict) {
      v(e), this.feedback = {
        kind: "conflict",
        message: "Reload the latest server draft before opening preview."
      }, this.render();
      return;
    }
    this.previewing = !0, this.render();
    try {
      if (Object.keys(this.editorState.dirty_fields).length && (!await this.saveDirtyFields(!1) || !this.editorState || this.editorState.autosave.conflict)) {
        v(e), this.previewing = !1, this.render();
        return;
      }
      const s = await x(this.assignmentPreviewEndpoint(this.editorState.detail), { method: "GET" });
      if (!s.ok) {
        const r = await q(s, "Failed to generate preview");
        v(e), this.feedback = {
          kind: r.code === "VERSION_CONFLICT" || r.code === "POLICY_BLOCKED" ? "conflict" : "error",
          message: r.message
        }, this.previewing = !1, this.render();
        return;
      }
      const a = await s.json(), i = c(a), n = X(i.data && typeof i.data == "object" ? i.data : a, this.editorState.detail);
      if (!n.enabled || !n.url) {
        v(e), this.feedback = {
          kind: "error",
          message: n.reason || "Preview is unavailable for this assignment."
        }, this.previewing = !1, this.render();
        return;
      }
      Bt(e, n.url), this.previewing = !1, this.feedback = null, this.render();
    } catch (s) {
      v(e), this.previewing = !1, this.feedback = {
        kind: "error",
        message: s instanceof Error ? s.message : "Failed to generate preview"
      }, this.render();
    }
  }
  async runReviewAction(e, t) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, a = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!a?.enabled) {
      this.feedback = {
        kind: "error",
        message: a?.reason || `${P(e)} is unavailable.`
      }, this.render();
      return;
    }
    const i = { expected_version: s.translation_assignment.version };
    if (e === "reject") {
      const r = t?.reason || "";
      if (!r || !r.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      i.reason = r.trim(), t?.comment?.trim() && (i.comment = t.comment.trim());
    }
    this.submitting = !0, this.render();
    const n = await x(this.assignmentActionEndpoint(s, e), {
      method: "POST",
      json: i
    });
    if (!n.ok) {
      const r = await q(n, `Failed to ${e} assignment`);
      this.feedback = {
        kind: r.code === "VERSION_CONFLICT" || r.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: r.message
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
    t && (this.focusTrapCleanup = Ze(t, () => this.closeRejectDialog()));
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
async function Qs(e, t) {
  const s = new Ds(t), a = t.initialDetail || Is(e);
  return (e.dataset.ssrEnhanced || "").trim() === "true" && a && !Os() ? (e.dataset.translationEditorEnhanced = "true", s.mountWithInitialDetail(e, a)) : s.mount(e), s;
}
function Os() {
  if (typeof window > "u" || !window.location) return !1;
  const e = (Le(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return e === "1" || e === "true";
}
function Is(e) {
  const t = e.querySelector('script[type="application/json"][data-translation-editor-initial-state]')?.textContent?.trim() || "";
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
export {
  Nt as TranslationEditorRequestError,
  Ds as TranslationEditorScreen,
  Dt as applyEditorAutosaveConflict,
  k as applyEditorFieldChange,
  R as applyEditorUpdateResponse,
  ds as buildTranslationSuggestionRPCRequest,
  ne as createTranslationEditorState,
  fs as dispatchTranslationSuggestion,
  zt as fetchTranslationEditorDetailState,
  Qs as initTranslationEditorPage,
  ct as loadTranslationSyncCoreModule,
  Lt as markEditorAutosavePending,
  be as normalizeAssignmentEditorDetail,
  he as normalizeEditorAssistPayload,
  qt as normalizeEditorUpdateResponse,
  Ls as renderTranslationEditorPage,
  qs as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map