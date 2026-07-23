import { escapeAttribute as u, escapeHTML as d } from "../shared/html.js";
import { t as Le } from "../chunks/icon-renderer-tQhqqQbt.js";
import { httpRequest as S, readCSRFToken as De, readHTTPError as Fe } from "../shared/transport/http-client.js";
import { extractStructuredError as Y, formatStructuredErrorForDisplay as ue } from "../toast/error-helpers.js";
import { r as ae, s as Oe } from "../chunks/status-vocabulary-Bdx_bn1-.js";
import { readLocationSearchParams as Ie } from "../shared/query-state/url-state.js";
import { n as fe } from "../chunks/translation-contracts-CCsjVv14.js";
import { asBoolean as _, asNumber as p, asRecord as l, asString as r, asStringArray as me } from "../shared/coercion.js";
import { A as Pe, C as I, D as Me, E as Be, F as Ne, M as ze, O as Ue, P as Ke, R as Ve, S as re, T as He, a as Ye, at as Ge, c as ge, ct as Qe, et as We, ft as Xe, g as Je, j as Ze, k as et, lt as tt, mt as st, ot as it, pt as at, s as rt, st as x, tt as nt, v as ot, x as F, y as T } from "../chunks/translation-shared-opnbNxht.js";
import { formatTranslationTimestampUTC as pe, sentenceCaseToken as P } from "../translation-shared/formatters.js";
import { normalizeStringRecord as K } from "../shared/record-normalization.js";
import { c as he, s as ct } from "../chunks/ui-states-BUSrZfJR.js";
var lt = "translation_variant_draft", dt = "autosave", N = /* @__PURE__ */ new Map();
async function ut(e) {
  const t = E(e);
  if (!t) throw new Error("syncClientBasePath is required to load sync-core");
  return typeof window < "u" && window.__translationSyncCoreModule ? V(window.__translationSyncCoreModule) : (N.has(t) || N.set(t, ft(t)), N.get(t));
}
async function ft(e) {
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
function mt(e, t, s) {
  const i = E(e);
  if (/\/variants$/i.test(i)) return i.replace(/\/variants$/i, "");
  const a = E(t);
  if (/\/assignments$/i.test(a)) return a.replace(/\/assignments$/i, "");
  const n = E(s), o = n.match(/^(.*)\/assignments(?:\/.*)?$/i);
  return o ? o[1] : i || a || n;
}
function gt(e) {
  return `${E(e) || "/admin"}/sync-client/sync-core`;
}
function pt(e) {
  const t = {};
  for (const [s, i] of Object.entries(e || {})) {
    const a = String(s || "").trim(), n = String(i || "").trim();
    !a || !n || (t[a] = n);
  }
  return t;
}
var ht = [
  "channel",
  "tenant_id",
  "org_id"
];
function _t(e) {
  try {
    const t = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost"), s = {};
    for (const i of ht) {
      const a = String(t.searchParams.get(i) || "").trim();
      a && (s[i] = a);
    }
    return s;
  } catch {
    return {};
  }
}
function bt(e) {
  return pt({
    ..._t(e.endpoint),
    ...e.syncScope || {}
  });
}
function yt(e) {
  const t = Object.entries(e.scope || {}).filter(([s, i]) => s.trim() !== "" && i.trim() !== "").sort(([s], [i]) => s.localeCompare(i)).map(([s, i]) => `${encodeURIComponent(s)}=${encodeURIComponent(i)}`).join("&");
  return `${encodeURIComponent(e.kind)}::${encodeURIComponent(e.id)}::${t}`;
}
function G(e) {
  const t = l(e);
  return {
    required: _(t.required),
    complete: _(t.complete),
    missing: _(t.missing)
  };
}
function Q(e) {
  const t = l(e), s = r(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: _(t.changed),
    comparison_mode: s,
    previous_source_value: r(t.previous_source_value),
    current_source_value: r(t.current_source_value)
  };
}
function W(e) {
  const t = l(e);
  return {
    valid: t.valid !== !1,
    message: r(t.message)
  };
}
function $(e, t) {
  const s = l(e), i = {};
  for (const [a, n] of Object.entries(s))
    a.trim() && (i[a.trim()] = t(n));
  return i;
}
function vt(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const i = l(s), a = r(i.term), n = r(i.preferred_translation);
    !a || !n || t.push({
      term: a,
      preferred_translation: n,
      notes: r(i.notes) || void 0,
      field_paths: me(i.field_paths)
    });
  }
  return t;
}
function wt(e) {
  const t = l(e);
  return {
    available: _(t.available),
    title: r(t.title),
    summary: r(t.summary) || r(t.summary_markdown),
    rules: me(t.rules)
  };
}
function _e(e) {
  return r(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function xt(e) {
  const t = l(e), s = r(t.id), i = r(t.filename);
  return !s && !i ? null : {
    id: s || i || "attachment",
    kind: r(t.kind) || "reference",
    filename: i || s || "attachment",
    byte_size: p(t.byte_size),
    uploaded_at: r(t.uploaded_at),
    description: r(t.description),
    url: r(t.url)
  };
}
function St(e) {
  return Array.isArray(e) ? e.map((t) => xt(t)).filter((t) => t !== null) : [];
}
function $t(e, t) {
  const s = l(e), i = l(s.kinds), a = {};
  for (const [n, o] of Object.entries(i)) {
    const c = p(o);
    n.trim() && (a[n.trim()] = c);
  }
  if (!Object.keys(a).length) for (const n of t) a[n.kind] = (a[n.kind] || 0) + 1;
  return {
    total: p(s.total, t.length),
    kinds: a
  };
}
function kt(e) {
  return r(e) === "comment" ? "comment" : "event";
}
function Rt(e) {
  const t = l(e), s = r(t.id);
  return s ? {
    id: s,
    entry_type: kt(t.entry_type),
    title: r(t.title),
    body: r(t.body),
    action: r(t.action),
    actor_id: r(t.actor_id),
    author_id: r(t.author_id),
    created_at: r(t.created_at),
    kind: r(t.kind),
    metadata: l(t.metadata)
  } : null;
}
function Et(e) {
  const t = l(e), s = Array.isArray(t.items) ? t.items.map((i) => Rt(i)).filter((i) => i !== null) : [];
  return {
    items: s,
    page: p(t.page, 1) || 1,
    per_page: p(t.per_page, 10) || 10,
    total: p(t.total, s.length),
    has_more: _(t.has_more),
    next_page: p(t.next_page)
  };
}
function Tt(e) {
  const t = l(e), s = r(t.id), i = r(t.body);
  return !s && !i ? null : {
    id: s || i || "review-feedback",
    body: i,
    kind: r(t.kind) || "review_feedback",
    created_at: r(t.created_at),
    author_id: r(t.author_id) || void 0
  };
}
function Ct(e, t) {
  const s = l(e), i = Array.isArray(s.comments) ? s.comments.map((n) => Tt(n)).filter((n) => n !== null) : [], a = r(s.last_rejection_reason || t) || void 0;
  return !i.length && a && i.push({
    id: "last-rejection-reason",
    body: a,
    kind: "review_feedback",
    created_at: ""
  }), {
    last_rejection_reason: a,
    comments: i
  };
}
function At(e) {
  const t = l(e), s = r(t.id), i = r(t.message);
  return !s || !i ? null : {
    id: s,
    category: r(t.category) === "style" ? "style" : "terminology",
    severity: r(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: r(t.field_path),
    message: i
  };
}
function jt(e, t) {
  const s = l(e);
  return {
    category: r(s.category) || t,
    enabled: _(s.enabled),
    feature_flag: r(s.feature_flag) || void 0,
    finding_count: p(s.finding_count),
    warning_count: p(s.warning_count),
    blocker_count: p(s.blocker_count)
  };
}
function be(e) {
  const t = l(e), s = l(t.summary), i = l(t.categories), a = {};
  for (const [o, c] of Object.entries(i))
    o.trim() && (a[o.trim()] = jt(c, o.trim()));
  const n = Array.isArray(t.findings) ? t.findings.map((o) => At(o)).filter((o) => o !== null) : [];
  return {
    enabled: _(t.enabled),
    summary: {
      finding_count: p(s.finding_count, n.length),
      warning_count: p(s.warning_count),
      blocker_count: p(s.blocker_count)
    },
    categories: a,
    findings: n,
    save_blocked: _(t.save_blocked),
    submit_blocked: _(t.submit_blocked)
  };
}
function qt(e) {
  const t = l(e);
  return {
    id: r(t.id || t.assignment_id),
    status: r(t.status || t.queue_state),
    queue_state: r(t.queue_state || t.status),
    source_title: r(t.source_title),
    source_path: r(t.source_path),
    assignee_id: r(t.assignee_id),
    assignee_label: r(t.assignee_label),
    display_assignee: r(t.display_assignee || t.assignee_label || t.assignee_id),
    reviewer_id: r(t.reviewer_id),
    reviewer_label: r(t.reviewer_label),
    display_reviewer: r(t.display_reviewer || t.reviewer_label || t.reviewer_id),
    due_state: r(t.due_state),
    due_date: r(t.due_date),
    version: p(t.version || t.row_version),
    row_version: p(t.row_version || t.version),
    updated_at: r(t.updated_at)
  };
}
function Lt(e, t = "") {
  const s = l(e), i = r(s.locale).trim().toLowerCase();
  if (!i) return null;
  const a = r(s.href).trim(), n = _(s.enabled) && a !== "", o = r(s.reason || s.disabled_reason);
  return {
    locale: i,
    label: r(s.label) || i.toUpperCase(),
    current: _(s.current) || t !== "" && i === t,
    source: _(s.source),
    enabled: n,
    disabled: _(s.disabled) || !n,
    reason: o,
    href: n ? a : void 0,
    assignment_id: r(s.assignment_id) || void 0,
    status: r(s.status) || void 0,
    work_scope: r(s.work_scope) || void 0
  };
}
function Dt(e, t) {
  const s = l(e), i = (r(s.current_locale) || r(t.target_locale) || r(t.locale)).trim().toLowerCase(), a = (r(s.source_locale) || r(t.source_locale)).trim().toLowerCase(), n = Array.isArray(s.locales) ? s.locales.map((o) => Lt(o, i)).filter((o) => o !== null) : [];
  return {
    family_id: r(s.family_id) || r(t.family_id),
    current_locale: i,
    source_locale: a,
    current_work_scope: r(s.current_work_scope),
    family_detail_url: r(s.family_detail_url),
    locales: n
  };
}
function X(e, t) {
  const s = l(e), i = _(s.enabled), a = r(s.target_record_id) || r(s.record_id) || r(t.target_record_id), n = r(s.reason), o = r(s.reason_code);
  return {
    enabled: i,
    url: r(s.url) || void 0,
    reason: n || (i ? "" : "Preview is unavailable for this assignment."),
    reason_code: o || (i ? "" : "preview_unavailable"),
    assignment_id: r(s.assignment_id) || r(t.assignment_id),
    entity_type: r(s.entity_type) || r(t.entity_type),
    record_id: r(s.record_id) || a,
    target_record_id: a,
    target_locale: r(s.target_locale) || r(t.target_locale),
    channel: r(s.channel) || r(t.channel)
  };
}
function ye(e, t) {
  const s = l(e), i = l(t);
  return {
    glossary_matches: vt(s.glossary_matches ?? i.glossary_matches),
    style_guide_summary: wt(s.style_guide_summary ?? i.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((a) => a && typeof a == "object") : []
  };
}
function O(e) {
  const t = l(e), s = {};
  for (const [i, a] of Object.entries(t)) {
    const n = fe(a);
    !n || !i.trim() || (s[i.trim()] = n);
  }
  return s;
}
function D(e, t = {}) {
  const s = l(e), i = fe(s) || { enabled: !1 }, a = l(s.payload ?? t.payload), n = r(s.assignment_id ?? a.assignment_id ?? t.assignment_id), o = r(s.field_path ?? a.field_path ?? t.field_path), c = r(s.endpoint ?? s.rpc_invoke_path ?? t.endpoint ?? t.rpc_invoke_path), f = r(s.execution_mode ?? s.executionMode ?? t.execution_mode), g = r(s.idempotency_key ?? s.idempotencyKey ?? a.idempotency_key ?? a.idempotencyKey ?? t.idempotency_key);
  return {
    ...i,
    assignment_id: n,
    field_path: o,
    command_name: r(s.command_name ?? t.command_name) || "translations.suggestions.generate",
    transport: r(s.transport ?? t.transport) || "rpc",
    rpc_method: r(s.rpc_method ?? t.rpc_method) || "admin.commands.dispatch",
    endpoint: c,
    rpc_invoke_path: r(s.rpc_invoke_path ?? t.rpc_invoke_path) || c,
    execution_mode: f,
    idempotency_key: g,
    payload: {
      ...a,
      ...n ? { assignment_id: n } : {},
      ...o ? { field_path: o } : {},
      ...g ? { idempotency_key: g } : {}
    }
  };
}
function ne(e) {
  const t = l(e), s = r(t.record_id), i = r(t.detail_url ?? t.content_detail_url), a = r(t.edit_url ?? t.content_edit_url);
  if (!(!s || !i && !a))
    return {
      content_type: r(t.content_type),
      record_id: s,
      locale: r(t.locale),
      channel: r(t.channel),
      detail_url: i,
      edit_url: a,
      content_detail_url: r(t.content_detail_url) || i,
      content_edit_url: r(t.content_edit_url) || a,
      can_view: Object.prototype.hasOwnProperty.call(t, "can_view") ? _(t.can_view) : !!i,
      can_edit: Object.prototype.hasOwnProperty.call(t, "can_edit") ? _(t.can_edit) : !!a,
      edit_disabled_reason: r(t.edit_disabled_reason),
      edit_disabled_reason_code: r(t.edit_disabled_reason_code),
      label: r(t.label) || "Edit content",
      detail_label: r(t.detail_label) || "View content"
    };
}
function Ft(e) {
  const t = l(e);
  return {
    source: ne(t.source),
    target: ne(t.target)
  };
}
function ve(e, t, s, i, a, n) {
  const o = r(e.assignment_id), c = D(e.suggest_translation_action, { assignment_id: o });
  if (Array.isArray(e.fields)) return e.fields.map((g) => {
    const m = l(g), h = r(m.path);
    if (!h) return null;
    const y = Object.prototype.hasOwnProperty.call(s, h);
    return {
      path: h,
      label: r(m.label) || h,
      input_type: r(m.input_type) || "text",
      required: _(m.required),
      source_value: r(m.source_value) || t[h] || "",
      target_value: y ? s[h] : r(m.target_value),
      completeness: G(m.completeness ?? i[h]),
      drift: Q(m.drift ?? a[h]),
      validation: W(m.validation ?? n[h]),
      glossary_hits: Array.isArray(m.glossary_hits) ? m.glossary_hits.filter((b) => b && typeof b == "object") : [],
      suggest_translation_action: D(m.suggest_translation_action, {
        ...c,
        assignment_id: o || c.assignment_id,
        field_path: h || c.field_path
      })
    };
  }).filter((g) => !!g);
  const f = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(i),
    ...Object.keys(a),
    ...Object.keys(n)
  ]);
  return Array.from(f).sort().map((g) => ({
    path: g,
    label: g,
    input_type: "text",
    required: i[g]?.required === !0,
    source_value: t[g] || "",
    target_value: s[g] || "",
    completeness: i[g] ?? {
      required: !1,
      complete: !0,
      missing: !1
    },
    drift: a[g] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: t[g] || ""
    },
    validation: n[g] ?? {
      valid: !0,
      message: ""
    },
    glossary_hits: [],
    suggest_translation_action: D(null, {
      ...c,
      assignment_id: o || c.assignment_id,
      field_path: g || c.field_path
    })
  }));
}
function we(e) {
  const t = l(e), s = l(t.data && typeof t.data == "object" ? t.data : e), i = K(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), a = K(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), n = $(s.field_completeness, G), o = $(s.field_drift, Q), c = $(s.field_validations, W), f = St(s.attachments);
  return {
    assignment_id: r(s.assignment_id),
    assignment_row_version: p(s.assignment_row_version || s.assignment_version || l(s.translation_assignment).row_version || l(s.translation_assignment).version),
    variant_id: r(s.variant_id),
    family_id: r(s.family_id),
    entity_type: r(s.entity_type) || void 0,
    source_locale: r(s.source_locale) || void 0,
    target_locale: r(s.target_locale) || void 0,
    status: r(s.status) || void 0,
    priority: r(s.priority) || void 0,
    due_date: r(s.due_date) || void 0,
    row_version: p(s.row_version || s.version),
    source_fields: i,
    target_fields: a,
    fields: ve(s, i, a, n, o, c),
    field_completeness: n,
    field_drift: o,
    field_validations: c,
    source_target_drift: l(s.source_target_drift),
    history: Et(s.history),
    attachments: f,
    attachment_summary: $t(s.attachment_summary, f),
    translation_assignment: qt(s.translation_assignment),
    assist: ye(s.assist, s),
    last_rejection_reason: r(s.last_rejection_reason) || void 0,
    review_feedback: Ct(s.review_feedback, s.last_rejection_reason),
    qa_results: be(s.qa_results),
    assignment_action_states: O(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: O(s.review_action_states ?? s.review_actions),
    suggest_translation_action: D(s.suggest_translation_action, { assignment_id: r(s.assignment_id) }),
    locale_navigation: Dt(s.locale_navigation, s),
    content_navigation: Ft(s.content_navigation),
    preview_action: X(s.preview_action, s)
  };
}
function Ot(e) {
  const t = l(e), s = l(t.data && typeof t.data == "object" ? t.data : e), i = l(s.preview_action);
  return {
    variant_id: r(s.variant_id),
    row_version: p(s.row_version || s.version),
    fields: K(s.fields ?? s.target_fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: $(s.field_completeness, G),
    field_drift: $(s.field_drift, Q),
    field_validations: $(s.field_validations, W),
    source_target_drift: l(s.source_target_drift),
    assist: ye(s.assist, s),
    qa_results: be(s.qa_results),
    assignment_action_states: O(s.assignment_action_states),
    review_action_states: O(s.review_action_states),
    preview_action: Object.keys(i).length ? X(i, s) : void 0
  };
}
function J(e) {
  return ve({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function Z(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function oe(e) {
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
  const i = t.trim();
  if (!i) return e;
  const a = {
    ...e.detail.target_fields,
    [i]: s.trim()
  }, n = e.detail.field_completeness[i]?.required === !0, o = {
    ...e.detail.field_completeness,
    [i]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, c = {
    ...e.detail.field_validations,
    [i]: {
      valid: !o[i].missing,
      message: o[i].missing ? e.detail.field_validations[i]?.message || `${i} is required` : ""
    }
  }, f = {
    ...e.detail,
    target_fields: a,
    field_completeness: o,
    field_validations: c
  };
  return f.fields = J(f), {
    ...e,
    detail: f,
    dirty_fields: {
      ...e.dirty_fields,
      [i]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: Z(f)
  };
}
function It(e) {
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
  const s = Ot(t), i = Object.keys(s.assignment_action_states).length ? s.assignment_action_states : e.detail.assignment_action_states, a = Object.keys(s.review_action_states).length ? s.review_action_states : e.detail.review_action_states, n = {
    ...e.detail,
    row_version: s.row_version,
    target_fields: {
      ...e.detail.target_fields,
      ...s.fields
    },
    field_completeness: s.field_completeness,
    field_drift: s.field_drift,
    field_validations: s.field_validations,
    source_target_drift: Object.keys(l(s.source_target_drift)).length ? s.source_target_drift : e.detail.source_target_drift,
    assist: s.assist,
    qa_results: s.qa_results,
    assignment_action_states: i,
    review_action_states: a,
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
function q(e) {
  const t = l(e.data), s = { ...t };
  delete s.assignment_action_states, delete s.editor_actions, delete s.actions, delete s.review_action_states, delete s.review_actions;
  const i = e.revision || p(t.row_version || t.version);
  return { data: {
    ...s,
    row_version: i,
    version: i
  } };
}
function ce(e) {
  return Object.keys(l(e?.data)).length > 0;
}
function Pt(e, t) {
  const s = l(t), i = l(s.error), a = l(i.details ?? s.details), n = l(s.resource || a.resource || l(s.conflict).latestSnapshot || l(i.conflict).latestSnapshot), o = n.data && typeof n.data == "object" ? l(n.data) : {}, c = p(n.revision), f = l(i.metadata), g = Object.keys(o).length ? {
    ...o,
    row_version: p(o.row_version || o.version, c) || c
  } : l(f.latest_server_state_record);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: g
    }
  };
}
function xe(e) {
  const t = l(e), s = l(t.cause), i = l(t.details), a = t.resource || i.resource;
  return t.code === "STALE_REVISION" ? {
    error: {
      code: "STALE_REVISION",
      message: r(t.message) || "stale revision",
      details: {
        current_revision: p(t.currentRevision || i.current_revision),
        resource: a
      }
    },
    resource: a,
    conflict: t.conflict
  } : s.code === "STALE_REVISION" ? xe(s) : t;
}
function Mt(e) {
  const t = l(e), s = l(t.details), i = l(t.conflict), a = l(t.resource || s.resource || i.latestSnapshot), n = l(a.data), o = p(a.revision || t.currentRevision || s.current_revision), c = r(a.updatedAt || a.updated_at) || (/* @__PURE__ */ new Date()).toISOString();
  return !Object.keys(n).length || o <= 0 ? null : {
    ref: l(a.ref),
    data: n,
    revision: o,
    updatedAt: c,
    metadata: l(a.metadata)
  };
}
function Bt(e) {
  return r(l(e.source_target_drift).current_source_hash);
}
function z(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
function Nt(e) {
  const t = l(e), s = l(t.cause);
  return t.code === "STALE_REVISION" || s.code === "STALE_REVISION";
}
function U(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [i, a] of Object.entries(t))
    a == null || `${a}`.trim() === "" || s.searchParams.set(i, String(a));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
function w(e) {
  if (!(!e || typeof e.close != "function"))
    try {
      e.close();
    } catch {
      return;
    }
}
async function zt(e) {
  const t = String(e || ""), s = typeof navigator < "u" ? navigator.clipboard : void 0;
  if (s && typeof s.writeText == "function") try {
    return await s.writeText(t), !0;
  } catch {
  }
  return Ut(t);
}
function Ut(e) {
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
function Kt(e, t) {
  try {
    if (e.location && typeof e.location.assign == "function") {
      e.location.assign(t);
      return;
    }
  } catch {
  }
  e.location.href = t;
}
var Vt = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function L(e, t) {
  const s = await Y(e);
  return new Vt({
    message: s.message || await Fe(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: r(e.headers.get("x-request-id")) || void 0,
    traceId: _e(e.headers) || void 0
  });
}
async function Ht(e) {
  const t = await S(e, { method: "GET" }), s = r(t.headers.get("x-request-id")) || void 0, i = _e(t.headers) || void 0;
  if (!t.ok) {
    const n = await Y(t);
    return {
      status: n.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: n.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: i,
      statusCode: t.status,
      errorCode: n.textCode
    };
  }
  const a = we(await t.json());
  return a.assignment_id ? {
    status: "ready",
    detail: a,
    requestId: s,
    traceId: i,
    statusCode: t.status
  } : {
    status: "empty",
    message: "Assignment detail payload was empty.",
    requestId: s,
    traceId: i,
    statusCode: t.status
  };
}
function Yt(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function C(e) {
  return r(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function Gt(e) {
  return e === "review" || e === "in_review";
}
function Qt(e) {
  return e === "changes_requested";
}
function A(e) {
  return Qt(C(e));
}
function ee(e) {
  return Gt(C(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
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
function Wt(e, t, s) {
  const i = !!t && e.trim().toLowerCase() !== t.trim().toLowerCase();
  return !i && !s ? "" : `<p class="mt-1 text-xs text-gray-500">${[i ? d(t) : "", s ? "Required" : ""].filter(Boolean).join(" • ")}</p>`;
}
function Xt(e, t, s, i) {
  if (e.assignment_action_states.submit_review?.enabled) return `
      <button
        type="button"
        class="${T}"
        data-action="submit-review"
        title="${u(i)}"
        ${s ? 'disabled aria-disabled="true"' : ""}
      >
        ${t ? "Submitting..." : "Submit review"}
      </button>
    `;
  const a = C(e);
  return a === "review" || a === "in_review" || a === "approved" || a === "archived" || a === "changes_requested" ? Oe(a) : `
    <button
      type="button"
      class="${T}"
      data-action="submit-review"
      title="${u(i)}"
      disabled aria-disabled="true"
    >
      Submit review
    </button>
  `;
}
function Jt(e, t, s) {
  let i = "idle";
  return e?.autosave.conflict ? i = "conflict" : e?.autosave.pending ? i = "saving" : t ? i = "dirty" : s && (i = "saved"), {
    tone: Ge(i),
    text: it(i, s),
    state: i
  };
}
function Se(e) {
  const t = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function Zt(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${u(e.kind)}" role="status" aria-live="polite">
      ${d(e.message)}
    </div>
  ` : "";
}
function es(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? x("error") : x("success"), i = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${x("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${i}</span>
  `;
}
function ts(e, t) {
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
function ss(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function is(e, t) {
  const s = e.qa_results, i = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${i}` : `Submitted for review.${i}`;
}
function as() {
  return ct({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${Ve} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function le(e, t) {
  return he({
    tag: "section",
    containerClass: `${He} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Me,
    message: t,
    messageClass: `${Be} mt-2`
  });
}
function de(e, t, s) {
  return he({
    tag: "section",
    containerClass: `${Ue} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Pe,
    message: t,
    messageClass: `${et} mt-2`,
    actionsHtml: Se(s),
    role: "alert"
  });
}
function rs(e, t, s, i, a, n, o, c, f = "") {
  const g = e.assignment_action_states.submit_review, m = e.assignment_action_states.claim, h = e.preview_action, y = A(e), b = !m?.enabled || a || i || o, ie = c || !g?.enabled || a || i || e.qa_results.submit_blocked, Te = !h?.enabled || a || i || n || o, Ce = c || a || !s, Ae = (e.source_locale || "source").toUpperCase(), je = (e.target_locale || "target").toUpperCase(), v = e.translation_assignment, M = c ? se(e) : e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : g?.reason || "", qe = h?.enabled ? o ? "Reload the latest server draft before opening preview." : n ? "Opening preview." : "Open preview in a new tab." : h?.reason || "Preview is unavailable for this assignment.", B = o ? "Reload the latest server draft before resuming work." : a ? "Wait for the current save to finish before resuming work." : m?.reason || "Resume work on this assignment.";
  return `
    <section class="${I} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${Ke}">Assignment editor</p>
          <div>
            <h1 class="${Ne}">${d(v.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${d(Ae.toUpperCase())} → ${d(je.toUpperCase())} • ${d(ae(e.status || v.status || "draft"))} • Priority ${d(ae(e.priority || "normal"))}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${d(v.display_assignee || v.assignee_label || v.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${d(v.display_reviewer || v.reviewer_label || v.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${u(t.state)}">${d(t.text)}</span>
            ${es(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-start gap-3">
          <button
            type="button"
            class="${F}"
            data-action="save-draft"
            ${Ce ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Saving…" : "Save draft"}
          </button>
          <div class="flex max-w-xs flex-col items-start gap-1">
            <button
              type="button"
              class="${F}"
              data-action="preview-assignment"
              title="${u(qe)}"
              data-preview-enabled="${h?.enabled ? "true" : "false"}"
              data-preview-reason-code="${u(h?.reason_code || "")}"
              ${Te ? 'disabled aria-disabled="true"' : ""}
            >
              ${n ? "Opening..." : h?.enabled ? "Preview" : "Preview unavailable"}
            </button>
            ${!h?.enabled && h?.reason ? `<p class="text-xs text-gray-500" data-preview-unavailable-reason="true">${d(h.reason)}</p>` : ""}
          </div>
          ${y ? `
            <div class="flex max-w-xs flex-col items-start gap-1">
              <button
                type="button"
                class="${T}"
                data-action="resume-work"
                title="${u(B)}"
                ${b ? 'disabled aria-disabled="true"' : ""}
              >
                ${i && m?.enabled ? "Resuming..." : "Resume work"}
              </button>
              ${b && B ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${d(B)}</p>` : ""}
            </div>
          ` : ""}
          <div class="flex max-w-xs flex-col items-start gap-1">
            ${Xt(e, i, ie, M)}
            ${ie && M ? `<p class="text-xs text-gray-500" data-submit-unavailable-reason="true">${d(M)}</p>` : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}
function ns(e) {
  const t = d(e.label || e.locale.toUpperCase()), s = "inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors", i = "bg-blue-100 text-blue-700", a = "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900", n = "cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200", o = [
    `data-locale-chip="${u(e.locale)}"`,
    e.current ? 'data-locale-current="true"' : "",
    e.disabled ? 'data-locale-disabled="true"' : "",
    e.assignment_id ? `data-assignment-id="${u(e.assignment_id)}"` : ""
  ].filter(Boolean).join(" ");
  if (e.enabled && e.href) {
    const f = e.current ? i : a, g = e.current ? ' aria-current="page"' : "";
    return `<a href="${u(e.href)}" class="${s} ${f}" ${o}${g} aria-label="Open ${u(e.label || e.locale.toUpperCase())} assignment">${t}</a>`;
  }
  if (e.current) return `<span class="${s} ${i}" ${o} aria-current="page">${t}</span>`;
  const c = e.reason || "No translation assignment exists for this locale.";
  return `<span class="${s} ${n}" ${o} aria-disabled="true" title="${u(c)}" aria-label="${u(`${e.label || e.locale.toUpperCase()} unavailable: ${c}`)}">${t}</span>`;
}
function os(e) {
  const t = e.locale_navigation, s = t.locales, i = t.current_locale || (e.target_locale || "").toLowerCase(), a = (i || "target").toUpperCase();
  if (!t.family_id && s.length === 0 && !t.family_detail_url) return "";
  const n = s.length > 0 ? s : [{
    locale: i,
    label: a,
    current: !0,
    source: !1,
    enabled: !1,
    disabled: !1,
    reason: ""
  }];
  return `
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-editor-locale-summary="true" data-family-id="${u(t.family_id || e.family_id)}" data-current-locale="${u(i)}">
      <div class="p-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Locale</span>
            <div class="flex flex-wrap items-center gap-1" data-editor-locale-chips="true">
              ${n.map(ns).join("")}
            </div>
          </div>
        </div>
        ${t.family_detail_url ? `
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
            <p class="text-xs text-gray-500">Use the family detail view for blocker ordering, publish-gate rationale, and assignment context.</p>
            <a href="${u(t.family_detail_url)}" class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800" data-family-detail-link="true" aria-label="Open translation family detail">
              Open family detail
              <span aria-hidden="true">›</span>
            </a>
          </div>
        ` : ""}
      </div>
    </section>
  `;
}
function cs(e) {
  if (!$e(e)) return "";
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim()), s = !!(e.drift.current_source_value || e.source_value);
  return !t && !s ? `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${u(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    ` : t ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${u(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${d(e.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${d(e.drift.current_source_value || e.source_value || "Current value unavailable")}</p>
    </div>
  ` : `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${u(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
}
function $e(e) {
  if (!e.drift.changed) return !1;
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim());
  return e.drift.comparison_mode !== "hash_only" || t;
}
function ls(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${Ze}">
          <span class="${ze}">${d(r(s.term))}</span>
          → ${d(r(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function ds(e) {
  const t = e.fields || [], s = e.qa_results, i = {
    missing: null,
    validation: null,
    qaBlocker: null,
    qaFinding: null,
    sourceDrift: null
  };
  let a = null, n = 0, o = 0, c = 0, f = 0, g = 0;
  for (const m of t)
    m.completeness.complete && !m.completeness.missing && n++, m.completeness.required && m.completeness.missing && (o++, i.missing || (i.missing = m.path)), m.required && !m.source_value.trim() && (c++, a || (a = m.path)), m.drift.changed && (f++, i.sourceDrift || (i.sourceDrift = m.path)), m.validation.valid || (g++, i.validation || (i.validation = m.path));
  if (s.enabled && s.findings.length > 0) {
    const m = s.findings.find((y) => y.severity === "blocker");
    m?.field_path && (i.qaBlocker = m.field_path);
    const h = s.findings.find((y) => y.field_path);
    h?.field_path && (i.qaFinding = h.field_path);
  }
  return {
    totalFields: t.length,
    completeFields: n,
    missingRequiredFields: o,
    missingRequiredSourceFields: c,
    sourceChangedFields: f,
    validationErrors: g,
    qaBlockers: s.enabled ? s.summary.blocker_count : 0,
    qaWarnings: s.enabled ? s.summary.warning_count : 0,
    firstIssuePath: a || i.missing || i.validation || i.qaBlocker || i.qaFinding || i.sourceDrift
  };
}
function us(e) {
  return r(e?.edit_url || e?.content_edit_url || e?.detail_url || e?.content_detail_url);
}
function fs(e) {
  return e ? r(e.edit_url || e.content_edit_url) ? r(e.label) || "Edit source content" : r(e.detail_label) || "View source content" : "";
}
function ke(e, t, s = "") {
  const i = us(e);
  if (!i) return "";
  const a = fs(e), n = s ? ` for ${s}` : "";
  return `
    <a
      class="${t === "summary" ? "inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 shadow-sm transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200" : "mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-700 underline-offset-2 hover:text-amber-900 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-200"}"
      href="${u(i)}"
      data-source-content-action="${u(t)}"
      aria-label="${u(`${a}${n}`)}"
    >
      ${t === "summary" ? j(ge, "14px") : ""}
      <span>${d(a)}</span>
    </a>
  `;
}
function ms(e, t) {
  const s = e.missingRequiredFields > 0 || e.missingRequiredSourceFields > 0 || e.sourceChangedFields > 0 || e.validationErrors > 0 || e.qaBlockers > 0, i = e.completeFields === e.totalFields && e.missingRequiredFields === 0 && e.missingRequiredSourceFields === 0 && e.validationErrors === 0 && e.qaBlockers === 0, a = [], n = (g, m) => `<span class="status-chip status-chip--${g}">${m}</span>`;
  a.push(n(i ? "success" : "neutral", `${e.completeFields}/${e.totalFields} complete`)), e.missingRequiredFields > 0 && a.push(n("error", `${e.missingRequiredFields} missing required`)), e.missingRequiredSourceFields > 0 && a.push(n("error", `${e.missingRequiredSourceFields} source required pending`)), e.sourceChangedFields > 0 && a.push(n("warning", `${e.sourceChangedFields} source changed`)), e.validationErrors > 0 && a.push(n("error", `${e.validationErrors} validation ${e.validationErrors === 1 ? "error" : "errors"}`)), e.qaBlockers > 0 && a.push(n("error", `${e.qaBlockers} QA ${e.qaBlockers === 1 ? "blocker" : "blockers"}`)), e.qaWarnings > 0 && a.push(n("warning", `${e.qaWarnings} QA ${e.qaWarnings === 1 ? "warning" : "warnings"}`));
  const o = i ? "border-emerald-200 bg-emerald-50" : s ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50", c = e.firstIssuePath ? `<button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        data-jump-to-field="${u(e.firstIssuePath)}"
        title="Jump to first issue"
      >
        Jump to issue
        ${j("iconoir:nav-arrow-down", "14px")}
      </button>` : "", f = e.missingRequiredSourceFields > 0 ? ke(t, "summary") : "";
  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${o}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${a.join("")}</div>
      <div class="flex flex-wrap items-center gap-2">${f}${c}</div>
    </section>
  `;
}
function gs(e, t) {
  return e.source_value && e.source_value.trim() ? d(e.source_value) : e.required ? `
      <span class="text-amber-600 italic">Source text pending - required field</span>
      ${ke(t, "field", e.label)}
    ` : '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}
var Re = "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium leading-4 text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-100";
function j(e, t = "16px") {
  return Le(e, {
    size: t,
    extraClass: "text-current"
  });
}
function ps() {
  return j(rt, "12px");
}
function hs(e, t = "") {
  const s = r(t), i = r(e.idempotency_key || e.payload?.idempotency_key || e.payload?.idempotencyKey), a = r(e.execution_mode), n = { correlation_id: s };
  i && (n.idempotency_key = i);
  const o = {
    CorrelationID: s,
    Metadata: n
  };
  return a && (o.Mode = a), i && (o.IdempotencyKey = i), {
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
        options: o
      },
      meta: { correlationId: s }
    }
  };
}
function _s(e) {
  const t = l(e), s = r(t.assignment_id ?? t.assignmentId), i = r(t.field_path ?? t.fieldPath), a = r(t.suggested_text ?? t.suggestedText);
  return !s || !i || !a ? null : {
    assignment_id: s,
    field_path: i,
    suggested_text: a,
    provider: r(t.provider) || void 0,
    model: r(t.model) || void 0,
    diagnostics: l(t.diagnostics)
  };
}
function bs(e) {
  const t = l(e.error);
  if (Object.keys(t).length === 0) return "";
  const s = {
    ...l(t.metadata),
    ...l(t.details)
  };
  return ue({
    textCode: r(t.text_code ?? t.code) || null,
    message: r(t.message) || "Failed to generate translation suggestion.",
    metadata: Object.keys(s).length > 0 ? s : null,
    fields: null,
    validationErrors: null
  }, "Failed to generate translation suggestion.");
}
async function ys(e, t = "") {
  const s = e.endpoint || e.rpc_invoke_path;
  if (!e.enabled) throw new Error(e.reason || "Translation suggestion is unavailable.");
  if (!s) throw new Error("Translation suggestion RPC endpoint is not configured.");
  const i = await S(s, {
    method: "POST",
    json: hs(e, t)
  });
  if (!i.ok) {
    const f = await Y(i);
    throw new Error(ue(f, "Failed to generate translation suggestion."));
  }
  const a = l(await i.json().catch(() => ({}))), n = bs(a);
  if (n) throw new Error(n);
  const o = l(a.data), c = _s(o.result ?? o.Result);
  if (!c) throw new Error("Translation suggestion did not return suggested text.");
  return c;
}
function vs(e) {
  return e.enabled === !0 && !!(e.endpoint || e.rpc_invoke_path);
}
function ws(e, t, s) {
  const i = e.suggest_translation_action;
  if (t || !e.source_value.trim() || !vs(i)) return "";
  const a = s, n = s ? "Generating suggestion..." : `Generate translation suggestion for ${e.label}`, o = s ? '<span class="h-3 w-3 animate-spin rounded-full border-2 border-sky-200 border-t-sky-600" aria-hidden="true"></span><span>Generating</span>' : `${j("iconoir:spark", "12px")}<span>Generate suggestion</span>`;
  return `
    <button
      type="button"
      class="${Re}"
      data-suggest-translation="${u(e.path)}"
      aria-label="Generate translation suggestion for ${u(e.label)}"
      title="${u(n)}"
      ${a ? 'disabled aria-disabled="true"' : ""}
      ${s ? 'aria-busy="true"' : ""}
    >
      ${o}
    </button>
  `;
}
function xs(e, t = !1, s = /* @__PURE__ */ new Set()) {
  const i = ds(e), a = e.content_navigation?.source, n = t ? "mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100", o = t ? "mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
  return `
    <section class="space-y-4">
      ${ms(i, a)}
      ${e.fields.map((c) => {
    const f = !!c.source_value.trim(), g = t || !f;
    return `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${u(c.path)}" id="field-${u(c.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${d(c.label)}</h2>
              ${Wt(c.label, c.path, c.required)}
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="${Re}"
                data-copy-source="${u(c.path)}"
                data-source-value="${u(c.source_value)}"
                aria-label="Copy source text to translation field for ${u(c.label)}"
                ${g ? 'disabled aria-disabled="true"' : ""}
              >
                ${ps()}
                <span>Copy source</span>
              </button>
              ${ws(c, t, s.has(c.path))}
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${gs(c, a)}</div>
            </div>
            <div class="rounded-xl border ${c.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-wider text-gray-500" for="editor-field-${u(c.path)}">Translation</label>
              ${c.input_type === "textarea" ? `<textarea id="editor-field-${u(c.path)}" class="${o}" data-field-input="${u(c.path)}" ${t ? 'disabled aria-disabled="true"' : ""}>${d(c.target_value)}</textarea>` : `<input id="editor-field-${u(c.path)}" type="text" class="${n}" data-field-input="${u(c.path)}" value="${u(c.target_value)}" ${t ? 'disabled aria-disabled="true"' : ""} />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${c.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${c.completeness.missing ? "Missing required content" : "Field complete"}
                </span>
                ${$e(c) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${c.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${u(c.path)}">${d(c.validation.message || "Validation error")}</p>`}
              ${cs(c)}
              ${ls(c)}
            </div>
          </div>
        </article>
      `;
  }).join("")}
    </section>
  `;
}
function Ee(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const i = l(s), a = r(i.suggested_text) || r(i.target_text);
    a && t.push({
      id: r(i.id) || `tm-${t.length}`,
      score: Ss(i.score, i.match_score),
      sourceLabel: r(i.source_label) || r(i.source) || "Internal TM",
      localePair: r(i.locale_pair) || "",
      fieldPath: r(i.field_path) || "",
      suggestedText: a,
      isStaleSource: _(i.is_stale_source) || _(i.stale_source)
    });
  }
  return t.sort((s, i) => i.score - s.score);
}
function Ss(e, t) {
  const s = p(e) || p(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const i = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(i)));
}
function $s(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function ks(e) {
  return e.length ? `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${e.map((t) => `
          <li class="rounded-xl border ${t.isStaleSource ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm" data-tm-suggestion="${u(t.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${d(t.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${$s(t.score)} ${t.score}%</span>
                  <span>${d(t.sourceLabel)}</span>
                  ${t.localePair ? `<span class="text-gray-400">${d(t.localePair)}</span>` : ""}
                  ${t.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ""}
                </div>
                ${t.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${d(t.fieldPath)}</p>` : ""}
              </div>
              <button
                type="button"
                class="flex-shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-sky-100"
                data-insert-tm="${u(t.id)}"
                data-insert-text="${u(t.suggestedText)}"
                data-insert-field="${u(t.fieldPath)}"
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
function Rs(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${ks(Ee(e.assist.translation_memory_suggestions))}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((i) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${d(i.term)}</strong> → ${d(i.preferred_translation)}
                  ${i.notes ? `<p class="mt-1 text-xs text-gray-500">${d(i.notes)}</p>` : ""}
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
                  ${s.rules.map((i) => `<li>• ${d(i)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function Es(e) {
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
  }), t.sort((s, i) => {
    const a = s.created_at ? Date.parse(s.created_at) : 0;
    return (i.created_at ? Date.parse(i.created_at) : 0) - a;
  });
}
function Ts(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((n) => n.severity === "blocker"), i = t.findings.filter((n) => n.severity !== "blocker"), a = (n, o) => {
    if (!n.length) return "";
    const c = Qe(o);
    return `
      <section data-qa-group="${u(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((f) => `
          <li class="${c.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${d(P(f.category))}</strong>
              <span class="${c.badge}">${d(f.severity)}</span>
            </div>
            <p class="mt-2">${d(f.message)}</p>
            ${f.field_path ? `
              <button
                type="button"
                class="mt-2 inline-flex items-center rounded-md border border-current px-2 py-1 text-xs font-medium opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current/20"
                data-jump-to-field="${u(f.field_path)}"
                title="Jump to ${u(f.field_path)}"
              >
                Field ${d(f.field_path)}
              </button>
            ` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${tt(t.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${t.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${t.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${t.submit_blocked ? x("error") : x("neutral")}">
          ${t.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${x("warning")}">Warnings ${t.summary.warning_count}</span>
        <span class="${x("error")}">Blockers ${t.summary.blocker_count}</span>
      </div>
      ${s.length || i.length ? `<div class="mt-4 space-y-4">${a(s, "blocker")}${a(i, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function Cs(e, t) {
  const s = e.review_action_states.approve, i = e.review_action_states.reject;
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
    state: i,
    tone: "btn btn-danger-outline"
  }].map((a) => {
    const n = !a.state?.enabled || t;
    return `
            <button
              type="button"
              class="${a.tone} ${n ? "cursor-not-allowed opacity-60" : ""}"
              data-action="${u(a.key)}"
              title="${u(a.state?.reason || "")}"
              ${n ? 'disabled aria-disabled="true"' : ""}
            >
              ${d(a.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function As(e, t, s, i) {
  if (!A(e)) return "";
  const a = e.assignment_action_states.claim, n = !a?.enabled || s || t || i, o = i ? "Reload the latest server draft before resuming work." : s ? "Wait for the current save to finish before resuming work." : t ? "Resume is already in progress." : a?.reason || "";
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
          title="${u(o || "Resume work on this assignment.")}"
          ${n ? 'disabled aria-disabled="true"' : ""}
        >
          ${t && a?.enabled ? "Resuming..." : "Resume work"}
        </button>
        ${n && o ? `<p class="text-xs text-gray-500" data-resume-unavailable-reason="true">${d(o)}</p>` : ""}
      </div>
    </section>
  `;
}
function js(e, t) {
  return e ? `
    <div class="${nt}" data-reject-modal="true">
      <section class="${We}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${ot}" data-action="cancel-reject">Close</button>
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
          <button type="button" class="${F}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${Je}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function qs(e, t) {
  if (!te(e)) return "";
  const s = e.assignment_action_states.archive, i = !s?.enabled || t;
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
          class="${F}"
          data-action="archive"
          title="${u(s?.reason || "")}"
          ${i ? 'disabled aria-disabled="true"' : ""}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}
function Ls(e) {
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
                <span class="text-xs text-gray-500">${d(Yt(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${d(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${d(pe(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function Ds(e) {
  const t = e.history, s = Es(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((i) => {
    const a = Xe(i.tone);
    return `
            <li class="${a.container}" data-history-entry="${u(i.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${a.title}">${d(i.title)}</p>
                  <span class="${a.badge}">${d(i.badge)}</span>
                </div>
                <span class="${a.time}">${d(pe(i.created_at) || "Current")}</span>
              </div>
              ${i.body ? `<p class="mt-2 text-sm">${d(i.body)}</p>` : ""}
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
var Fs = {
  actions: "iconoir:flash",
  qa: "iconoir:shield",
  assist: "iconoir:chat-bubble",
  files: ge,
  history: Ye
};
function Os(e) {
  return j(Fs[e], "16px");
}
function Is(e) {
  const t = A(e), s = ee(e), i = te(e), a = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, n = Ee(e.assist.translation_memory_suggestions).length, o = e.assist.glossary_matches.length, c = e.attachment_summary.total, f = e.history.total;
  return {
    actions: null,
    qa: a > 0 ? String(a) : null,
    assist: n + o > 0 ? String(n + o) : null,
    files: c > 0 ? String(c) : null,
    history: f > 0 ? String(f) : null
  };
}
function Ps(e, t, s = "actions", i, a = !1, n = !1) {
  const o = Is(e), c = A(e), f = ee(e), g = te(e), m = c || f || g, h = `
    <nav class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Editor sidebar sections">
      ${[
    {
      id: "actions",
      label: "Actions",
      badge: o.actions
    },
    {
      id: "qa",
      label: "QA",
      badge: o.qa
    },
    {
      id: "assist",
      label: "Assist",
      badge: o.assist
    },
    {
      id: "files",
      label: "Files",
      badge: o.files
    },
    {
      id: "history",
      label: "History",
      badge: o.history
    }
  ].map((b) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${s === b.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}"
          data-sidebar-tab="${u(b.id)}"
          role="tab"
          aria-selected="${s === b.id}"
          aria-controls="sidebar-panel-${u(b.id)}"
        >
          ${Os(b.id)}
          <span class="hidden sm:inline">${d(b.label)}</span>
          ${b.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${d(b.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, y = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${c ? As(e, t, a, n) : ""}
        ${f ? Cs(e, t) : ""}
        ${g ? qs(e, t) : ""}
        ${m ? "" : `
          <div class="rounded-xl border border-gray-200 bg-white p-5">
            <h2 class="text-lg font-semibold text-gray-900">Actions</h2>
            <p class="mt-3 text-sm text-gray-500">No actions available for this assignment in its current state.</p>
          </div>
        `}
      </div>
    `,
    qa: `
      <div id="sidebar-panel-qa" class="space-y-4" role="tabpanel" data-sidebar-panel="qa" ${s !== "qa" ? "hidden" : ""}>
        ${Ts(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${Rs(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${Ls(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${Ds(e)}
        ${Se(i || {
      status: "ready",
      detail: e
    })}
      </div>
    `
  };
  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${h}
      ${Object.values(y).join("")}
    </aside>
  `;
}
function Ms(e, t, s = {}, i = {}) {
  if (e.status === "loading") return as();
  if (e.status === "empty") return le("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return de("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return de("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const a = t?.detail || e.detail;
  if (!a) return le("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), o = Jt(t || null, n, i.lastSavedMessage || ""), c = t?.autosave.conflict, f = H(a);
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true" data-editor-read-only="${f ? "true" : "false"}">
      ${Zt(i.feedback || null)}
      ${rs(a, o, n, i.submitting === !0, i.saving === !0, i.previewing === !0, !!c, f, s.basePath || "")}
      ${os(a)}
      ${f ? `
        <section class="rounded-xl border border-gray-200 bg-gray-50 p-4" data-editor-read-only-notice="true">
          <p class="text-sm font-medium text-gray-700">${d(se(a))}</p>
        </section>
      ` : ""}
      ${c ? `
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
          ${xs(a, f, new Set(i.suggestingFields || []))}
        </div>
        <div class="order-2">
          ${Ps(a, i.submitting === !0, i.activeSidebarTab || "actions", e, i.saving === !0, !!c)}
        </div>
      </div>
      ${js(i.rejectDraft || null, i.submitting === !0)}
    </div>
  `;
}
function Bs(e, t, s, i = {}, a = {}) {
  e.innerHTML = Ms(t, s, i, a);
}
var Ns = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.previewing = !1, this.rejectDraft = null, this.syncCoreModulePromise = null, this.syncCoreModule = null, this.syncCache = null, this.syncEngine = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null, this.suggestingFields = /* @__PURE__ */ new Set(), this.activeSidebarTab = "actions";
    const t = e.basePath || "/admin";
    this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase || "",
      actionEndpointBase: e.actionEndpointBase,
      syncBaseURL: e.syncBaseURL || mt(e.variantEndpointBase || "", e.actionEndpointBase, e.endpoint),
      syncClientBasePath: e.syncClientBasePath || gt(t),
      syncResourceKind: e.syncResourceKind || lt,
      syncScope: bt(e),
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
    this.container = e, this.keyboardHandler = (i) => {
      (i.ctrlKey || i.metaKey) && i.key === "s" && (i.preventDefault(), this.saveDirtyFields(!1)), i.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler);
    const s = we(t);
    this.loadState = {
      status: "ready",
      detail: s
    }, this.editorState = oe(s), this.render();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null, this.suggestingFields.clear();
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await Ht(e ? U(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? (this.editorState = oe(this.loadState.detail), H(this.loadState.detail) || await this.hydrateDraftSyncFromRead(this.loadState.detail)) : this.editorState = null, this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.captureRenderViewportState();
    Bs(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      previewing: this.previewing,
      suggestingFields: Array.from(this.suggestingFields),
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), at(this.container), this.restoreRenderViewportState(e);
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
        const s = t.value.length, i = Math.min(e.selectionStart, s), a = Math.min(e.selectionEnd, s);
        t.setSelectionRange(i, a, e.selectionDirection || "none");
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
        const s = t.currentTarget, i = s.dataset.fieldInput || "";
        this.editorState = k(this.editorState, i, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", (t) => {
        if (t.preventDefault(), t.stopPropagation(), this.isEditorReadOnly()) return;
        const s = e.dataset.copySource || "", i = this.editorState?.detail.fields.find((o) => o.path === s);
        if (!i || !this.editorState) return;
        const a = (i.source_value || e.dataset.sourceValue || "").trim();
        zt(a), this.editorState = k(this.editorState, s, a);
        const n = this.container?.querySelector(`[data-field-input="${z(s)}"]`);
        if (n) {
          n.value = a;
          try {
            n.focus({ preventScroll: !0 });
          } catch {
            n.focus();
          }
          const o = n.value.length;
          try {
            n.setSelectionRange(o, o);
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
        const i = this.container.querySelector(`[data-editor-field="${z(s)}"]`);
        if (i) {
          i.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
          const a = i.querySelector("[data-field-input]");
          a && setTimeout(() => a.focus(), 300);
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
  showSuggestionTransportError(e) {
    const t = e.trim() || "Failed to generate translation suggestion.", s = typeof window < "u" ? window : null;
    if (typeof s?.toastManager?.error == "function") {
      s.toastManager.error(t);
      return;
    }
    if (typeof s?.notify?.error == "function") {
      s.notify.error(t);
      return;
    }
    this.feedback = {
      kind: "error",
      message: t
    };
  }
  showSuggestionInlineError(e) {
    this.feedback = {
      kind: "error",
      message: e.trim() || "Failed to generate translation suggestion."
    };
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
    const s = this.editorState.detail.fields.find((c) => c.path === t), i = s?.suggest_translation_action;
    if (!s || !i?.enabled) {
      this.feedback = {
        kind: "error",
        message: i?.reason || "Translation suggestion is unavailable for this field."
      }, this.render();
      return;
    }
    const a = r(this.editorState.detail.target_fields[t]), n = this.editorState.detail.row_version;
    this.suggestingFields.add(t), this.feedback = null, this.render();
    let o;
    try {
      o = await ys(i, this.loadState.requestId || "");
    } catch (c) {
      this.showSuggestionTransportError(c instanceof Error ? c.message : "Failed to generate translation suggestion."), this.render(), this.suggestingFields.delete(t), this.render();
      return;
    }
    try {
      if (!this.editorState || o.assignment_id !== this.editorState.detail.assignment_id || o.field_path !== t) throw new Error("Translation suggestion response did not match the requested field.");
      if (this.editorState.autosave.conflict) throw new Error("Reload the latest server draft before applying this suggestion.");
      if (this.editorState.detail.row_version !== n || r(this.editorState.detail.target_fields[t]) !== a) throw new Error("The field changed while the suggestion was generating. Review the current draft and try again.");
      this.editorState = k(this.editorState, t, o.suggested_text), this.lastSavedMessage = "", this.feedback = {
        kind: "success",
        message: "Translation suggestion inserted."
      }, this.scheduleAutosave(), this.render(), this.focusField(t);
    } catch (c) {
      this.showSuggestionInlineError(c instanceof Error ? c.message : "Failed to generate translation suggestion."), this.render();
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
    this.saving = !0, this.editorState = It(this.editorState), this.render();
    const t = this.editorState.detail;
    try {
      const s = await this.mutateDraftSync(t, this.editorState.dirty_fields, e);
      this.syncLoadedRevision = s.snapshot.revision, this.syncConflictSnapshot = null, this.editorState = R(this.editorState, q(s.snapshot));
      const i = ts(this.editorState.detail.qa_results, e);
      return this.lastSavedMessage = i.lastSaved, (!e || i.kind === "conflict") && (this.feedback = {
        kind: i.kind,
        message: i.message
      }), this.saving = !1, this.render(), !0;
    } catch (s) {
      return Nt(s) ? (this.syncConflictSnapshot = Mt(s), this.syncConflictSnapshot?.revision && (this.syncLoadedRevision = this.syncConflictSnapshot.revision), this.editorState = Pt(this.editorState, xe(s)), this.feedback = {
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
      if (this.editorState = t ? R(this.editorState, q(t)) : R(this.editorState, { data: e }), t?.revision) this.syncLoadedRevision = t.revision;
      else {
        const s = p(l(e).row_version || l(e).version);
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
      if (!ce(t)) throw new Error("Sync refresh did not return a usable draft snapshot");
      this.syncLoadedRevision = t.revision, this.syncConflictSnapshot = null, this.editorState = R(this.editorState, q(t)), this.feedback = {
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
    const i = await this.ensureDraftSyncResource(e), a = p(i.getSnapshot()?.revision), n = this.syncLoadedRevision || a || e.row_version, o = {
      autosave: s,
      fields: t
    }, c = Bt(e);
    return c && (o.acknowledged_source_hash = c), await i.mutate({
      operation: dt,
      expectedRevision: n,
      payload: o,
      metadata: { autosave: s }
    });
  }
  async ensureDraftSyncResource(e) {
    if (this.syncCoreModule || (this.syncCoreModulePromise || (this.syncCoreModulePromise = ut(this.config.syncClientBasePath)), this.syncCoreModule = await this.syncCoreModulePromise), this.syncCache || (this.syncCache = this.syncCoreModule.createInMemoryCache()), !this.syncEngine) {
      const a = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: "same-origin",
        fetch: typeof fetch == "function" ? fetch.bind(globalThis) : void 0,
        headers: (n) => {
          const o = {};
          if (String(n?.method || "GET").toUpperCase() !== "GET") {
            const c = De();
            c && (o["X-CSRF-Token"] = c);
          }
          return o;
        }
      });
      this.syncEngine = this.syncCoreModule.createSyncEngine({
        transport: a,
        cache: this.syncCache,
        retry: { maxAttempts: 1 }
      });
    }
    const t = e.variant_id, s = {
      kind: this.config.syncResourceKind,
      id: t,
      scope: Object.keys(this.config.syncScope).length > 0 ? this.config.syncScope : void 0
    }, i = yt(s);
    return (!this.syncResource || this.syncResourceKey !== i) && (this.syncResourceKey = i, this.syncResource = this.syncEngine.resource(s), this.syncLoadedRevision = null, this.syncConflictSnapshot = null), this.syncResource;
  }
  async ensureDraftSyncLoaded(e) {
    const t = await this.ensureDraftSyncResource(e), s = this.syncResourceKey;
    if (this.syncLoadedResourceKey === s) return;
    const i = this.editorState ? { ...this.editorState.dirty_fields } : {}, a = await t.load();
    if (!ce(a)) throw new Error("Sync draft load did not return a usable draft snapshot");
    if (!this.editorState || this.editorState.detail.variant_id !== e.variant_id) return;
    let n = R(this.editorState, q(a));
    for (const [o, c] of Object.entries(i)) n = k(n, o, c);
    this.editorState = n, this.syncLoadedRevision = a.revision, this.syncConflictSnapshot = null, this.loadState = {
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
      const o = Object.entries(this.editorState.detail.field_completeness).filter(([, c]) => c.required && c.missing).map(([c]) => c);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? ss(this.editorState.detail) : o.length ? `Complete required fields before submitting for review: ${o.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.history.page, s = this.editorState.detail.translation_assignment.version, i = await S(this.assignmentActionEndpoint(this.editorState.detail, "submit_review"), {
      method: "POST",
      json: { expected_version: s }
    });
    if (!i.ok) {
      const o = await L(i, "Failed to submit assignment");
      if (this.feedback = {
        kind: o.status === 409 || o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: o.message
      }, this.submitting = !1, o.status === 409 || o.code === "INVALID_STATUS_TRANSITION" || o.code === "INVALID_STATUS") {
        await this.load(t);
        return;
      }
      this.render();
      return;
    }
    const a = await i.json(), n = r(l(a).data && l(l(a).data).status);
    this.feedback = {
      kind: "success",
      message: is(this.editorState.detail, n)
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
    const t = this.editorState.detail.history.page, s = this.editorState.detail.translation_assignment.version, i = await S(this.assignmentActionEndpoint(this.editorState.detail, "claim"), {
      method: "POST",
      json: { expected_version: s }
    });
    if (!i.ok) {
      const a = await L(i, "Failed to resume assignment");
      if (this.feedback = {
        kind: a.status === 409 || a.code === "VERSION_CONFLICT" || a.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: a.message
      }, this.submitting = !1, a.status === 409 || a.code === "INVALID_STATUS_TRANSITION" || a.code === "INVALID_STATUS") {
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
      w(e);
      return;
    }
    const t = this.editorState.detail;
    if (!t.preview_action.enabled) {
      w(e), this.feedback = {
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
      w(e), this.feedback = {
        kind: "conflict",
        message: "Reload the latest server draft before opening preview."
      }, this.render();
      return;
    }
    this.previewing = !0, this.render();
    try {
      if (Object.keys(this.editorState.dirty_fields).length && (!await this.saveDirtyFields(!1) || !this.editorState || this.editorState.autosave.conflict)) {
        w(e), this.previewing = !1, this.render();
        return;
      }
      const s = await S(this.assignmentPreviewEndpoint(this.editorState.detail), { method: "GET" });
      if (!s.ok) {
        const o = await L(s, "Failed to generate preview");
        w(e), this.feedback = {
          kind: o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
          message: o.message
        }, this.previewing = !1, this.render();
        return;
      }
      const i = await s.json(), a = l(i), n = X(a.data && typeof a.data == "object" ? a.data : i, this.editorState.detail);
      if (!n.enabled || !n.url) {
        w(e), this.feedback = {
          kind: "error",
          message: n.reason || "Preview is unavailable for this assignment."
        }, this.previewing = !1, this.render();
        return;
      }
      Kt(e, n.url), this.previewing = !1, this.feedback = null, this.render();
    } catch (s) {
      w(e), this.previewing = !1, this.feedback = {
        kind: "error",
        message: s instanceof Error ? s.message : "Failed to generate preview"
      }, this.render();
    }
  }
  async runReviewAction(e, t) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, i = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!i?.enabled) {
      this.feedback = {
        kind: "error",
        message: i?.reason || `${P(e)} is unavailable.`
      }, this.render();
      return;
    }
    const a = { expected_version: s.translation_assignment.version };
    if (e === "reject") {
      const o = t?.reason || "";
      if (!o || !o.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      a.reason = o.trim(), t?.comment?.trim() && (a.comment = t.comment.trim());
    }
    this.submitting = !0, this.render();
    const n = await S(this.assignmentActionEndpoint(s, e), {
      method: "POST",
      json: a
    });
    if (!n.ok) {
      const o = await L(n, `Failed to ${e} assignment`);
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
    t && (this.focusTrapCleanup = st(t, () => this.closeRejectDialog()));
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
async function si(e, t) {
  const s = new Ns(t), i = t.initialDetail || Us(e);
  return (e.dataset.ssrEnhanced || "").trim() === "true" && i && !zs() ? (e.dataset.translationEditorEnhanced = "true", s.mountWithInitialDetail(e, i)) : s.mount(e), s;
}
function zs() {
  if (typeof window > "u" || !window.location) return !1;
  const e = (Ie(window.location) ?? new URLSearchParams()).get("translation_client_render");
  return e === "1" || e === "true";
}
function Us(e) {
  const t = e.querySelector('script[type="application/json"][data-translation-editor-initial-state]')?.textContent?.trim() || "";
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
export {
  Vt as TranslationEditorRequestError,
  Ns as TranslationEditorScreen,
  Pt as applyEditorAutosaveConflict,
  k as applyEditorFieldChange,
  R as applyEditorUpdateResponse,
  hs as buildTranslationSuggestionRPCRequest,
  oe as createTranslationEditorState,
  ys as dispatchTranslationSuggestion,
  Ht as fetchTranslationEditorDetailState,
  si as initTranslationEditorPage,
  ut as loadTranslationSyncCoreModule,
  It as markEditorAutosavePending,
  we as normalizeAssignmentEditorDetail,
  ye as normalizeEditorAssistPayload,
  Ot as normalizeEditorUpdateResponse,
  Bs as renderTranslationEditorPage,
  Ms as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map