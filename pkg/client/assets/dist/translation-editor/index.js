import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { t as ye } from "../chunks/icon-renderer-a2WAOpSe.js";
import { httpRequest as C, readCSRFToken as ve, readHTTPError as _e } from "../shared/transport/http-client.js";
import { extractStructuredError as ee } from "../toast/error-helpers.js";
import { n as xe } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { asBoolean as h, asNumber as m, asRecord as c, asString as n, asStringArray as te } from "../shared/coercion.js";
import { $ as y, C as we, E as Se, G as $e, K as ke, Q as Re, S as Ce, T as Ee, Z as Te, _ as Ae, at as je, b as qe, et as Le, f as E, g as De, it as Oe, k as Pe, l as Ie, m as I, n as Fe, ot as Me, p as Q, r as Be, s as Ne, t as ze, tt as Ue, u as se, v as Ke, x as He, y as Ve } from "../chunks/translation-shared-DxbdCW0D.js";
import { formatTranslationTimestampUTC as re, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as D } from "../shared/record-normalization.js";
import { c as ae, s as Ye } from "../chunks/ui-states-1McZ5upU.js";
var Qe = "translation_variant_draft", Ge = "autosave", q = /* @__PURE__ */ new Map();
async function We(e) {
  const t = w(e);
  if (!t) throw new Error("syncClientBasePath is required to load sync-core");
  return typeof window < "u" && window.__translationSyncCoreModule ? O(window.__translationSyncCoreModule) : (q.has(t) || q.set(t, Xe(t)), q.get(t));
}
async function Xe(e) {
  return typeof window < "u" && typeof window.__translationSyncCoreLoader == "function" ? O(await window.__translationSyncCoreLoader(e)) : O(await import(
    /* @vite-ignore */
    `${e}/index.js`
  ));
}
function O(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid translation sync-core runtime module");
  return e;
}
function w(e) {
  return String(e || "").trim().replace(/\/+$/, "");
}
function Je(e, t, s) {
  const r = w(e);
  if (/\/variants$/i.test(r)) return r.replace(/\/variants$/i, "");
  const a = w(t);
  if (/\/assignments$/i.test(a)) return a.replace(/\/assignments$/i, "");
  const i = w(s), o = i.match(/^(.*)\/assignments(?:\/.*)?$/i);
  return o ? o[1] : r || a || i;
}
function Ze(e) {
  return `${w(e) || "/admin"}/sync-client/sync-core`;
}
function et(e) {
  const t = {};
  for (const [s, r] of Object.entries(e || {})) {
    const a = String(s || "").trim(), i = String(r || "").trim();
    !a || !i || (t[a] = i);
  }
  return t;
}
function tt(e) {
  try {
    const t = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost"), s = String(t.searchParams.get("channel") || "").trim();
    return s ? { channel: s } : {};
  } catch {
    return {};
  }
}
function st(e) {
  return et({
    ...tt(e.endpoint),
    ...e.syncScope || {}
  });
}
function rt(e) {
  const t = Object.entries(e.scope || {}).filter(([s, r]) => s.trim() !== "" && r.trim() !== "").sort(([s], [r]) => s.localeCompare(r)).map(([s, r]) => `${encodeURIComponent(s)}=${encodeURIComponent(r)}`).join("&");
  return `${encodeURIComponent(e.kind)}::${encodeURIComponent(e.id)}::${t}`;
}
function F(e) {
  const t = c(e);
  return {
    required: h(t.required),
    complete: h(t.complete),
    missing: h(t.missing)
  };
}
function M(e) {
  const t = c(e), s = n(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: h(t.changed),
    comparison_mode: s,
    previous_source_value: n(t.previous_source_value),
    current_source_value: n(t.current_source_value)
  };
}
function B(e) {
  const t = c(e);
  return {
    valid: t.valid !== !1,
    message: n(t.message)
  };
}
function v(e, t) {
  const s = c(e), r = {};
  for (const [a, i] of Object.entries(s))
    a.trim() && (r[a.trim()] = t(i));
  return r;
}
function at(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const r = c(s), a = n(r.term), i = n(r.preferred_translation);
    !a || !i || t.push({
      term: a,
      preferred_translation: i,
      notes: n(r.notes) || void 0,
      field_paths: te(r.field_paths)
    });
  }
  return t;
}
function it(e) {
  const t = c(e);
  return {
    available: h(t.available),
    title: n(t.title),
    summary: n(t.summary) || n(t.summary_markdown),
    rules: te(t.rules)
  };
}
function ie(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function nt(e) {
  const t = c(e), s = n(t.id), r = n(t.filename);
  return !s && !r ? null : {
    id: s || r || "attachment",
    kind: n(t.kind) || "reference",
    filename: r || s || "attachment",
    byte_size: m(t.byte_size),
    uploaded_at: n(t.uploaded_at),
    description: n(t.description),
    url: n(t.url)
  };
}
function ot(e) {
  return Array.isArray(e) ? e.map((t) => nt(t)).filter((t) => t !== null) : [];
}
function ct(e, t) {
  const s = c(e), r = c(s.kinds), a = {};
  for (const [i, o] of Object.entries(r)) {
    const l = m(o);
    i.trim() && (a[i.trim()] = l);
  }
  if (!Object.keys(a).length) for (const i of t) a[i.kind] = (a[i.kind] || 0) + 1;
  return {
    total: m(s.total, t.length),
    kinds: a
  };
}
function lt(e) {
  return n(e) === "comment" ? "comment" : "event";
}
function dt(e) {
  const t = c(e), s = n(t.id);
  return s ? {
    id: s,
    entry_type: lt(t.entry_type),
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
function ut(e) {
  const t = c(e), s = Array.isArray(t.items) ? t.items.map((r) => dt(r)).filter((r) => r !== null) : [];
  return {
    items: s,
    page: m(t.page, 1) || 1,
    per_page: m(t.per_page, 10) || 10,
    total: m(t.total, s.length),
    has_more: h(t.has_more),
    next_page: m(t.next_page)
  };
}
function ft(e) {
  const t = c(e), s = n(t.id), r = n(t.body);
  return !s && !r ? null : {
    id: s || r || "review-feedback",
    body: r,
    kind: n(t.kind) || "review_feedback",
    created_at: n(t.created_at),
    author_id: n(t.author_id) || void 0
  };
}
function mt(e, t) {
  const s = c(e), r = Array.isArray(s.comments) ? s.comments.map((i) => ft(i)).filter((i) => i !== null) : [], a = n(s.last_rejection_reason || t) || void 0;
  return !r.length && a && r.push({
    id: "last-rejection-reason",
    body: a,
    kind: "review_feedback",
    created_at: ""
  }), {
    last_rejection_reason: a,
    comments: r
  };
}
function pt(e) {
  const t = c(e), s = n(t.id), r = n(t.message);
  return !s || !r ? null : {
    id: s,
    category: n(t.category) === "style" ? "style" : "terminology",
    severity: n(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: n(t.field_path),
    message: r
  };
}
function gt(e, t) {
  const s = c(e);
  return {
    category: n(s.category) || t,
    enabled: h(s.enabled),
    feature_flag: n(s.feature_flag) || void 0,
    finding_count: m(s.finding_count),
    warning_count: m(s.warning_count),
    blocker_count: m(s.blocker_count)
  };
}
function ne(e) {
  const t = c(e), s = c(t.summary), r = c(t.categories), a = {};
  for (const [o, l] of Object.entries(r))
    o.trim() && (a[o.trim()] = gt(l, o.trim()));
  const i = Array.isArray(t.findings) ? t.findings.map((o) => pt(o)).filter((o) => o !== null) : [];
  return {
    enabled: h(t.enabled),
    summary: {
      finding_count: m(s.finding_count, i.length),
      warning_count: m(s.warning_count),
      blocker_count: m(s.blocker_count)
    },
    categories: a,
    findings: i,
    save_blocked: h(t.save_blocked),
    submit_blocked: h(t.submit_blocked)
  };
}
function ht(e) {
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
    version: m(t.version || t.row_version),
    row_version: m(t.row_version || t.version),
    updated_at: n(t.updated_at)
  };
}
function bt(e, t = "") {
  const s = c(e), r = n(s.locale).trim().toLowerCase();
  if (!r) return null;
  const a = n(s.href).trim(), i = h(s.enabled) && a !== "", o = n(s.reason || s.disabled_reason);
  return {
    locale: r,
    label: n(s.label) || r.toUpperCase(),
    current: h(s.current) || t !== "" && r === t,
    source: h(s.source),
    enabled: i,
    disabled: h(s.disabled) || !i,
    reason: o,
    href: i ? a : void 0,
    assignment_id: n(s.assignment_id) || void 0,
    status: n(s.status) || void 0,
    work_scope: n(s.work_scope) || void 0
  };
}
function yt(e, t) {
  const s = c(e), r = (n(s.current_locale) || n(t.target_locale) || n(t.locale)).trim().toLowerCase(), a = (n(s.source_locale) || n(t.source_locale)).trim().toLowerCase(), i = Array.isArray(s.locales) ? s.locales.map((o) => bt(o, r)).filter((o) => o !== null) : [];
  return {
    family_id: n(s.family_id) || n(t.family_id),
    current_locale: r,
    source_locale: a,
    current_work_scope: n(s.current_work_scope),
    family_detail_url: n(s.family_detail_url),
    locales: i
  };
}
function N(e, t) {
  const s = c(e), r = h(s.enabled), a = n(s.target_record_id) || n(s.record_id) || n(t.target_record_id), i = n(s.reason), o = n(s.reason_code);
  return {
    enabled: r,
    url: n(s.url) || void 0,
    reason: i || (r ? "" : "Preview is unavailable for this assignment."),
    reason_code: o || (r ? "" : "preview_unavailable"),
    assignment_id: n(s.assignment_id) || n(t.assignment_id),
    entity_type: n(s.entity_type) || n(t.entity_type),
    record_id: n(s.record_id) || a,
    target_record_id: a,
    target_locale: n(s.target_locale) || n(t.target_locale),
    channel: n(s.channel) || n(t.channel)
  };
}
function oe(e, t) {
  const s = c(e), r = c(t);
  return {
    glossary_matches: at(s.glossary_matches ?? r.glossary_matches),
    style_guide_summary: it(s.style_guide_summary ?? r.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((a) => a && typeof a == "object") : []
  };
}
function T(e) {
  const t = c(e), s = {};
  for (const [r, a] of Object.entries(t)) {
    const i = xe(a);
    !i || !r.trim() || (s[r.trim()] = i);
  }
  return s;
}
function ce(e, t, s, r, a, i) {
  if (Array.isArray(e.fields)) return e.fields.map((l) => {
    const u = c(l), g = n(u.path);
    if (!g) return null;
    const p = Object.prototype.hasOwnProperty.call(s, g);
    return {
      path: g,
      label: n(u.label) || g,
      input_type: n(u.input_type) || "text",
      required: h(u.required),
      source_value: n(u.source_value) || t[g] || "",
      target_value: p ? s[g] : n(u.target_value),
      completeness: F(u.completeness ?? r[g]),
      drift: M(u.drift ?? a[g]),
      validation: B(u.validation ?? i[g]),
      glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((_) => _ && typeof _ == "object") : []
    };
  }).filter((l) => !!l);
  const o = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(r),
    ...Object.keys(a),
    ...Object.keys(i)
  ]);
  return Array.from(o).sort().map((l) => ({
    path: l,
    label: l,
    input_type: "text",
    required: r[l]?.required === !0,
    source_value: t[l] || "",
    target_value: s[l] || "",
    completeness: r[l] ?? {
      required: !1,
      complete: !0,
      missing: !1
    },
    drift: a[l] ?? {
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
function vt(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), r = D(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), a = D(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), i = v(s.field_completeness, F), o = v(s.field_drift, M), l = v(s.field_validations, B), u = ot(s.attachments);
  return {
    assignment_id: n(s.assignment_id),
    assignment_row_version: m(s.assignment_row_version || s.assignment_version || c(s.translation_assignment).row_version || c(s.translation_assignment).version),
    variant_id: n(s.variant_id),
    family_id: n(s.family_id),
    entity_type: n(s.entity_type) || void 0,
    source_locale: n(s.source_locale) || void 0,
    target_locale: n(s.target_locale) || void 0,
    status: n(s.status) || void 0,
    priority: n(s.priority) || void 0,
    due_date: n(s.due_date) || void 0,
    row_version: m(s.row_version || s.version),
    source_fields: r,
    target_fields: a,
    fields: ce(s, r, a, i, o, l),
    field_completeness: i,
    field_drift: o,
    field_validations: l,
    source_target_drift: c(s.source_target_drift),
    history: ut(s.history),
    attachments: u,
    attachment_summary: ct(s.attachment_summary, u),
    translation_assignment: ht(s.translation_assignment),
    assist: oe(s.assist, s),
    last_rejection_reason: n(s.last_rejection_reason) || void 0,
    review_feedback: mt(s.review_feedback, s.last_rejection_reason),
    qa_results: ne(s.qa_results),
    assignment_action_states: T(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: T(s.review_action_states ?? s.review_actions),
    locale_navigation: yt(s.locale_navigation, s),
    preview_action: N(s.preview_action, s)
  };
}
function _t(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), r = c(s.preview_action);
  return {
    variant_id: n(s.variant_id),
    row_version: m(s.row_version || s.version),
    fields: D(s.fields ?? s.target_fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: v(s.field_completeness, F),
    field_drift: v(s.field_drift, M),
    field_validations: v(s.field_validations, B),
    source_target_drift: c(s.source_target_drift),
    assist: oe(s.assist, s),
    qa_results: ne(s.qa_results),
    assignment_action_states: T(s.assignment_action_states),
    review_action_states: T(s.review_action_states),
    preview_action: Object.keys(r).length ? N(r, s) : void 0
  };
}
function z(e) {
  return ce({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function U(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function xt(e) {
  return {
    detail: {
      ...e,
      fields: z(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: U(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function k(e, t, s) {
  const r = t.trim();
  if (!r) return e;
  const a = {
    ...e.detail.target_fields,
    [r]: s.trim()
  }, i = e.detail.field_completeness[r]?.required === !0, o = {
    ...e.detail.field_completeness,
    [r]: {
      required: i,
      complete: !i || s.trim() !== "",
      missing: i && s.trim() === ""
    }
  }, l = {
    ...e.detail.field_validations,
    [r]: {
      valid: !o[r].missing,
      message: o[r].missing ? e.detail.field_validations[r]?.message || `${r} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: a,
    field_completeness: o,
    field_validations: l
  };
  return u.fields = z(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [r]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: U(u)
  };
}
function wt(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function x(e, t) {
  const s = _t(t), r = {
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
    assignment_action_states: s.assignment_action_states,
    review_action_states: s.review_action_states,
    preview_action: s.preview_action || e.detail.preview_action
  };
  return r.fields = z(r), {
    ...e,
    detail: r,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: U(r),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function R(e) {
  const t = c(e.data), s = e.revision || m(t.row_version || t.version);
  return { data: {
    ...t,
    row_version: s,
    version: s
  } };
}
function G(e) {
  return Object.keys(c(e?.data)).length > 0;
}
function St(e, t) {
  const s = c(t), r = c(s.error), a = c(r.details ?? s.details), i = c(s.resource || a.resource || c(s.conflict).latestSnapshot || c(r.conflict).latestSnapshot), o = i.data && typeof i.data == "object" ? c(i.data) : {}, l = m(i.revision), u = c(r.metadata), g = Object.keys(o).length ? {
    ...o,
    row_version: m(o.row_version || o.version, l) || l
  } : c(u.latest_server_state_record);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: g
    }
  };
}
function le(e) {
  const t = c(e), s = c(t.cause), r = c(t.details), a = t.resource || r.resource;
  return t.code === "STALE_REVISION" ? {
    error: {
      code: "STALE_REVISION",
      message: n(t.message) || "stale revision",
      details: {
        current_revision: m(t.currentRevision || r.current_revision),
        resource: a
      }
    },
    resource: a,
    conflict: t.conflict
  } : s.code === "STALE_REVISION" ? le(s) : t;
}
function $t(e) {
  const t = c(e), s = c(t.details), r = c(t.conflict), a = c(t.resource || s.resource || r.latestSnapshot), i = c(a.data), o = m(a.revision || t.currentRevision || s.current_revision), l = n(a.updatedAt || a.updated_at) || (/* @__PURE__ */ new Date()).toISOString();
  return !Object.keys(i).length || o <= 0 ? null : {
    ref: c(a.ref),
    data: i,
    revision: o,
    updatedAt: l,
    metadata: c(a.metadata)
  };
}
function kt(e) {
  return n(c(e.source_target_drift).current_source_hash);
}
function W(e) {
  return typeof CSS < "u" && typeof CSS.escape == "function" ? CSS.escape(e) : e.replace(/["\\]/g, "\\$&");
}
function Rt(e) {
  const t = c(e), s = c(t.cause);
  return t.code === "STALE_REVISION" || s.code === "STALE_REVISION";
}
function X(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [r, a] of Object.entries(t))
    a == null || `${a}`.trim() === "" || s.searchParams.set(r, String(a));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
function b(e) {
  if (!(!e || typeof e.close != "function"))
    try {
      e.close();
    } catch {
      return;
    }
}
async function Ct(e) {
  const t = String(e || ""), s = typeof navigator < "u" ? navigator.clipboard : void 0;
  if (s && typeof s.writeText == "function") try {
    return await s.writeText(t), !0;
  } catch {
  }
  return Et(t);
}
function Et(e) {
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
function Tt(e, t) {
  try {
    if (e.location && typeof e.location.assign == "function") {
      e.location.assign(t);
      return;
    }
  } catch {
  }
  e.location.href = t;
}
var At = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function L(e, t) {
  const s = await ee(e);
  return new At({
    message: s.message || await _e(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: n(e.headers.get("x-request-id")) || void 0,
    traceId: ie(e.headers) || void 0
  });
}
async function jt(e) {
  const t = await C(e, { method: "GET" }), s = n(t.headers.get("x-request-id")) || void 0, r = ie(t.headers) || void 0;
  if (!t.ok) {
    const i = await ee(t);
    return {
      status: i.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: i.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: r,
      statusCode: t.status,
      errorCode: i.textCode
    };
  }
  const a = vt(await t.json());
  return a.assignment_id ? {
    status: "ready",
    detail: a,
    requestId: s,
    traceId: r,
    statusCode: t.status
  } : {
    status: "empty",
    message: "Assignment detail payload was empty.",
    requestId: s,
    traceId: r,
    statusCode: t.status
  };
}
function qt(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function A(e) {
  return n(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function Lt(e) {
  return e === "review" || e === "in_review";
}
function K(e) {
  return Lt(A(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function H(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function P(e) {
  const t = A(e);
  return t === "review" || t === "in_review" || t === "approved" || t === "archived";
}
function V(e) {
  return `This assignment is ${S(A(e) || "unavailable").toLowerCase()} and can be inspected but not edited.`;
}
function Dt(e, t) {
  if (t) return "Submitting...";
  if (e.assignment_action_states.submit_review?.enabled) return "Submit for review";
  switch (A(e)) {
    case "review":
    case "in_review":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "archived":
      return "Archived";
    case "changes_requested":
      return "Changes requested";
    default:
      return "Submit unavailable";
  }
}
function Ot(e, t, s) {
  let r = "idle";
  return e?.autosave.conflict ? r = "conflict" : e?.autosave.pending ? r = "saving" : t ? r = "dirty" : s && (r = "saved"), {
    tone: Te(r),
    text: Re(r, s),
    state: r
  };
}
function de(e) {
  const t = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function Pt(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${f(e.kind)}" role="status" aria-live="polite">
      ${d(e.message)}
    </div>
  ` : "";
}
function It(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? y("error") : y("success"), r = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${y("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${r}</span>
  `;
}
function Ft(e, t) {
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
function Mt(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function Bt(e, t) {
  const s = e.qa_results, r = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${r}` : `Submitted for review.${r}`;
}
function Nt() {
  return Ye({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${Pe} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function J(e, t) {
  return ae({
    tag: "section",
    containerClass: `${De} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: Ke,
    message: t,
    messageClass: `${Ae} mt-2`
  });
}
function Z(e, t, s) {
  return ae({
    tag: "section",
    containerClass: `${Ve} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: He,
    message: t,
    messageClass: `${qe} mt-2`,
    actionsHtml: de(s),
    role: "alert"
  });
}
function zt(e, t, s, r, a, i, o, l, u = "") {
  const g = e.assignment_action_states.submit_review, p = e.preview_action, _ = l || !g?.enabled || a || r || e.qa_results.submit_blocked, me = !p?.enabled || a || r || i || o, pe = l || a || !s, ge = (e.source_locale || "source").toUpperCase(), he = (e.target_locale || "target").toUpperCase(), $ = e.translation_assignment, j = l ? V(e) : e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : g?.reason || "", be = p?.enabled ? o ? "Reload the latest server draft before opening preview." : i ? "Opening preview." : "Open preview in a new tab." : p?.reason || "Preview is unavailable for this assignment.";
  return `
    <section class="${I} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${Ee}">Assignment editor</p>
          <div>
            <h1 class="${Se}">${d($.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${d(ge)} to ${d(he)} • ${d(S(e.status || $.status || "draft"))} • Priority ${d(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${d($.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${d($.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${f(t.state)}">${d(t.text)}</span>
            ${It(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-start gap-3">
          <button
            type="button"
            class="${E}"
            data-action="save-draft"
            ${pe ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Saving…" : "Save draft"}
          </button>
          <div class="flex max-w-xs flex-col items-start gap-1">
            <button
              type="button"
              class="${E}"
              data-action="preview-assignment"
              title="${f(be)}"
              data-preview-enabled="${p?.enabled ? "true" : "false"}"
              data-preview-reason-code="${f(p?.reason_code || "")}"
              ${me ? 'disabled aria-disabled="true"' : ""}
            >
              ${i ? "Opening..." : p?.enabled ? "Preview" : "Preview unavailable"}
            </button>
            ${!p?.enabled && p?.reason ? `<p class="text-xs text-gray-500" data-preview-unavailable-reason="true">${d(p.reason)}</p>` : ""}
          </div>
          <div class="flex max-w-xs flex-col items-start gap-1">
            <button
              type="button"
              class="${se}"
              data-action="submit-review"
              title="${f(j)}"
              ${_ ? 'disabled aria-disabled="true"' : ""}
            >
              ${d(Dt(e, r))}
            </button>
            ${_ && j ? `<p class="text-xs text-gray-500" data-submit-unavailable-reason="true">${d(j)}</p>` : ""}
          </div>
        </div>
      </div>
    </section>
  `;
}
function Ut(e) {
  const t = d(e.label || e.locale.toUpperCase()), s = "inline-flex min-h-[24px] items-center rounded px-2 py-1 text-xs font-medium transition-colors", r = "bg-blue-100 text-blue-700", a = "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900", i = "cursor-not-allowed bg-gray-50 text-gray-400 ring-1 ring-inset ring-gray-200", o = [
    `data-locale-chip="${f(e.locale)}"`,
    e.current ? 'data-locale-current="true"' : "",
    e.disabled ? 'data-locale-disabled="true"' : "",
    e.assignment_id ? `data-assignment-id="${f(e.assignment_id)}"` : ""
  ].filter(Boolean).join(" ");
  if (e.enabled && e.href) {
    const u = e.current ? r : a, g = e.current ? ' aria-current="page"' : "";
    return `<a href="${f(e.href)}" class="${s} ${u}" ${o}${g} aria-label="Open ${f(e.label || e.locale.toUpperCase())} assignment">${t}</a>`;
  }
  if (e.current) return `<span class="${s} ${r}" ${o} aria-current="page">${t}</span>`;
  const l = e.reason || "No translation assignment exists for this locale.";
  return `<span class="${s} ${i}" ${o} aria-disabled="true" title="${f(l)}" aria-label="${f(`${e.label || e.locale.toUpperCase()} unavailable: ${l}`)}">${t}</span>`;
}
function Kt(e) {
  const t = e.locale_navigation, s = t.locales, r = t.current_locale || (e.target_locale || "").toLowerCase(), a = (r || "target").toUpperCase();
  if (!t.family_id && s.length === 0 && !t.family_detail_url) return "";
  const i = s.length > 0 ? s : [{
    locale: r,
    label: a,
    current: !0,
    source: !1,
    enabled: !1,
    disabled: !1,
    reason: ""
  }];
  return `
    <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm" data-editor-locale-summary="true" data-family-id="${f(t.family_id || e.family_id)}" data-current-locale="${f(r)}">
      <div class="p-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500">Locale</span>
            <div class="flex flex-wrap items-center gap-1" data-editor-locale-chips="true">
              ${i.map(Ut).join("")}
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
function Ht(e) {
  if (!ue(e)) return "";
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
function ue(e) {
  if (!e.drift.changed) return !1;
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim());
  return e.drift.comparison_mode !== "hash_only" || t;
}
function Vt(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${Ce}">
          <span class="${we}">${d(n(s.term))}</span>
          → ${d(n(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function Yt(e) {
  const t = e.fields || [], s = e.qa_results, r = {
    missing: null,
    validation: null,
    qaBlocker: null,
    qaFinding: null,
    sourceDrift: null
  };
  let a = 0, i = 0, o = 0, l = 0;
  for (const u of t)
    u.completeness.complete && !u.completeness.missing && a++, u.completeness.required && u.completeness.missing && (i++, r.missing || (r.missing = u.path)), u.drift.changed && (o++, r.sourceDrift || (r.sourceDrift = u.path)), u.validation.valid || (l++, r.validation || (r.validation = u.path));
  if (s.enabled && s.findings.length > 0) {
    const u = s.findings.find((p) => p.severity === "blocker");
    u?.field_path && (r.qaBlocker = u.field_path);
    const g = s.findings.find((p) => p.field_path);
    g?.field_path && (r.qaFinding = g.field_path);
  }
  return {
    totalFields: t.length,
    completeFields: a,
    missingRequiredFields: i,
    sourceChangedFields: o,
    validationErrors: l,
    qaBlockers: s.enabled ? s.summary.blocker_count : 0,
    qaWarnings: s.enabled ? s.summary.warning_count : 0,
    firstIssuePath: r.missing || r.validation || r.qaBlocker || r.qaFinding || r.sourceDrift
  };
}
function Qt(e) {
  const t = e.missingRequiredFields > 0 || e.sourceChangedFields > 0 || e.validationErrors > 0 || e.qaBlockers > 0, s = e.completeFields === e.totalFields && e.missingRequiredFields === 0 && e.validationErrors === 0 && e.qaBlockers === 0, r = [], a = s ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-700 border-gray-200";
  r.push(`<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${a}">${e.completeFields}/${e.totalFields} complete</span>`), e.missingRequiredFields > 0 && r.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.missingRequiredFields} missing required</span>`), e.sourceChangedFields > 0 && r.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.sourceChangedFields} source changed</span>`), e.validationErrors > 0 && r.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.validationErrors} validation ${e.validationErrors === 1 ? "error" : "errors"}</span>`), e.qaBlockers > 0 && r.push(`<span class="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">${e.qaBlockers} QA ${e.qaBlockers === 1 ? "blocker" : "blockers"}</span>`), e.qaWarnings > 0 && r.push(`<span class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">${e.qaWarnings} QA ${e.qaWarnings === 1 ? "warning" : "warnings"}</span>`);
  const i = s ? "border-emerald-200 bg-emerald-50" : t ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50", o = e.firstIssuePath ? `<button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
        data-jump-to-field="${f(e.firstIssuePath)}"
        title="Jump to first issue"
      >
        Jump to issue
        ${Y("iconoir:nav-arrow-down", "14px")}
      </button>` : "";
  return `
    <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 ${i}" aria-label="Field progress summary" data-editor-summary="true">
      <div class="flex flex-wrap items-center gap-2">${r.join("")}</div>
      ${o}
    </section>
  `;
}
function Gt(e) {
  return e.source_value && e.source_value.trim() ? d(e.source_value) : e.required ? '<span class="text-amber-600 italic">Source text pending - required field</span>' : '<span class="text-gray-400 italic text-xs">Optional source content not provided</span>';
}
var Wt = "inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium leading-4 text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-sky-100";
function Y(e, t = "16px") {
  return ye(e, {
    size: t,
    extraClass: "text-current"
  });
}
function Xt() {
  return Y(Fe, "12px");
}
function Jt(e, t = !1) {
  const s = Yt(e), r = t ? "mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100", a = t ? "mt-2 min-h-[140px] w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" : "mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";
  return `
    <section class="space-y-4">
      ${Qt(s)}
      ${e.fields.map((i) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${f(i.path)}" id="field-${f(i.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${d(i.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(i.path)}${i.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${Wt}"
              data-copy-source="${f(i.path)}"
              data-source-value="${f(i.source_value)}"
              aria-label="Copy source text to translation field for ${f(i.label)}"
              ${t ? 'disabled aria-disabled="true"' : ""}
            >
              ${Xt()}
              <span>Copy source</span>
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${Gt(i)}</div>
            </div>
            <div class="rounded-xl border ${i.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${f(i.path)}">Translation</label>
              ${i.input_type === "textarea" ? `<textarea id="editor-field-${f(i.path)}" class="${a}" data-field-input="${f(i.path)}" ${t ? 'disabled aria-disabled="true"' : ""}>${d(i.target_value)}</textarea>` : `<input id="editor-field-${f(i.path)}" type="text" class="${r}" data-field-input="${f(i.path)}" value="${f(i.target_value)}" ${t ? 'disabled aria-disabled="true"' : ""} />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${i.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${i.completeness.missing ? "Missing required content" : "Field complete"}
                </span>
                ${ue(i) ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${i.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${f(i.path)}">${d(i.validation.message || "Validation error")}</p>`}
              ${Ht(i)}
              ${Vt(i)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function fe(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const r = c(s), a = n(r.suggested_text) || n(r.target_text);
    a && t.push({
      id: n(r.id) || `tm-${t.length}`,
      score: Zt(r.score, r.match_score),
      sourceLabel: n(r.source_label) || n(r.source) || "Internal TM",
      localePair: n(r.locale_pair) || "",
      fieldPath: n(r.field_path) || "",
      suggestedText: a,
      isStaleSource: h(r.is_stale_source) || h(r.stale_source)
    });
  }
  return t.sort((s, r) => r.score - s.score);
}
function Zt(e, t) {
  const s = m(e) || m(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const r = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(r)));
}
function es(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function ts(e) {
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
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${es(t.score)} ${t.score}%</span>
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
function ss(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${ts(fe(e.assist.translation_memory_suggestions))}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((r) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${d(r.term)}</strong> → ${d(r.preferred_translation)}
                  ${r.notes ? `<p class="mt-1 text-xs text-gray-500">${d(r.notes)}</p>` : ""}
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
                  ${s.rules.map((r) => `<li>• ${d(r)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function rs(e) {
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
  }), t.sort((s, r) => {
    const a = s.created_at ? Date.parse(s.created_at) : 0;
    return (r.created_at ? Date.parse(r.created_at) : 0) - a;
  });
}
function as(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((i) => i.severity === "blocker"), r = t.findings.filter((i) => i.severity !== "blocker"), a = (i, o) => {
    if (!i.length) return "";
    const l = Le(o);
    return `
      <section data-qa-group="${f(o === "blocker" ? "blockers" : "warnings")}">
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
    <section class="${Ue(t.submit_blocked)}">
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
      ${s.length || r.length ? `<div class="mt-4 space-y-4">${a(s, "blocker")}${a(r, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function is(e, t) {
  const s = e.review_action_states.approve, r = e.review_action_states.reject;
  return K(e) ? `
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
    state: r,
    tone: "border-rose-300 text-rose-700"
  }].map((a) => {
    const i = !a.state?.enabled || t;
    return `
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${a.tone} ${i ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
              data-action="${f(a.key)}"
              title="${f(a.state?.reason || "")}"
              ${i ? 'disabled aria-disabled="true"' : ""}
            >
              ${d(a.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function ns(e, t) {
  return e ? `
    <div class="${ke}" data-reject-modal="true">
      <section class="${$e}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${Ie}" data-action="cancel-reject">Close</button>
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
          <button type="button" class="${E}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${Ne}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function os(e, t) {
  if (!H(e)) return "";
  const s = e.assignment_action_states.archive, r = !s?.enabled || t;
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
          class="${E}"
          data-action="archive"
          title="${f(s?.reason || "")}"
          ${r ? 'disabled aria-disabled="true"' : ""}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}
function cs(e) {
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
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${d(qt(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${d(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${d(re(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function ls(e) {
  const t = e.history, s = rs(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((r) => {
    const a = Oe(r.tone);
    return `
            <li class="${a.container}" data-history-entry="${f(r.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${a.title}">${d(r.title)}</p>
                  <span class="${a.badge}">${d(r.badge)}</span>
                </div>
                <span class="${a.time}">${d(re(r.created_at) || "Current")}</span>
              </div>
              ${r.body ? `<p class="mt-2 text-sm">${d(r.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${Q}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${Q}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
var ds = {
  actions: "iconoir:flash",
  qa: "iconoir:shield",
  assist: "iconoir:chat-bubble",
  files: Be,
  history: ze
};
function us(e) {
  return Y(ds[e], "16px");
}
function fs(e) {
  const t = K(e), s = H(e), r = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, a = fe(e.assist.translation_memory_suggestions).length, i = e.assist.glossary_matches.length, o = e.attachment_summary.total, l = e.history.total;
  return {
    actions: null,
    qa: r > 0 ? String(r) : null,
    assist: a + i > 0 ? String(a + i) : null,
    files: o > 0 ? String(o) : null,
    history: l > 0 ? String(l) : null
  };
}
function ms(e, t, s = "actions", r) {
  const a = fs(e), i = K(e), o = H(e), l = i || o, u = `
    <nav class="flex flex-wrap gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1" role="tablist" aria-label="Editor sidebar sections">
      ${[
    {
      id: "actions",
      label: "Actions",
      badge: a.actions
    },
    {
      id: "qa",
      label: "QA",
      badge: a.qa
    },
    {
      id: "assist",
      label: "Assist",
      badge: a.assist
    },
    {
      id: "files",
      label: "Files",
      badge: a.files
    },
    {
      id: "history",
      label: "History",
      badge: a.history
    }
  ].map((p) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${s === p.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}"
          data-sidebar-tab="${f(p.id)}"
          role="tab"
          aria-selected="${s === p.id}"
          aria-controls="sidebar-panel-${f(p.id)}"
        >
          ${us(p.id)}
          <span class="hidden sm:inline">${d(p.label)}</span>
          ${p.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${d(p.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, g = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${i ? is(e, t) : ""}
        ${o ? os(e, t) : ""}
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
        ${as(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${ss(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${cs(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${ls(e)}
        ${de(r || {
      status: "ready",
      detail: e
    })}
      </div>
    `
  };
  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${u}
      ${Object.values(g).join("")}
    </aside>
  `;
}
function ps(e, t, s = {}, r = {}) {
  if (e.status === "loading") return Nt();
  if (e.status === "empty") return J("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return Z("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return Z("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const a = t?.detail || e.detail;
  if (!a) return J("Assignment unavailable", "No assignment detail payload was returned.");
  const i = !!(t && Object.keys(t.dirty_fields).length), o = Ot(t || null, i, r.lastSavedMessage || ""), l = t?.autosave.conflict, u = P(a);
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true" data-editor-read-only="${u ? "true" : "false"}">
      ${Pt(r.feedback || null)}
      ${zt(a, o, i, r.submitting === !0, r.saving === !0, r.previewing === !0, !!l, u, s.basePath || "")}
      ${Kt(a)}
      ${u ? `
        <section class="rounded-xl border border-gray-200 bg-gray-50 p-4" data-editor-read-only-notice="true">
          <p class="text-sm font-medium text-gray-700">${d(V(a))}</p>
        </section>
      ` : ""}
      ${l ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${se}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${Jt(a, u)}
        </div>
        <div class="order-2">
          ${ms(a, r.submitting === !0, r.activeSidebarTab || "actions", e)}
        </div>
      </div>
      ${ns(r.rejectDraft || null, r.submitting === !0)}
    </div>
  `;
}
function gs(e, t, s, r = {}, a = {}) {
  e.innerHTML = ps(t, s, r, a);
}
var hs = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.previewing = !1, this.rejectDraft = null, this.syncCoreModulePromise = null, this.syncCoreModule = null, this.syncCache = null, this.syncEngine = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null, this.activeSidebarTab = "actions";
    const t = e.basePath || "/admin";
    this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase || "",
      actionEndpointBase: e.actionEndpointBase,
      syncBaseURL: e.syncBaseURL || Je(e.variantEndpointBase || "", e.actionEndpointBase, e.endpoint),
      syncClientBasePath: e.syncClientBasePath || Ze(t),
      syncResourceKind: e.syncResourceKind || Qe,
      syncScope: st(e),
      basePath: t
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (t) => {
      (t.ctrlKey || t.metaKey) && t.key === "s" && (t.preventDefault(), this.saveDirtyFields(!1)), t.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null, this.syncResource = null, this.syncResourceKey = "", this.syncLoadedResourceKey = "", this.syncLoadedRevision = null, this.syncConflictSnapshot = null;
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await jt(e ? X(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? (this.editorState = xt(this.loadState.detail), P(this.loadState.detail) || await this.hydrateDraftSyncFromRead(this.loadState.detail)) : this.editorState = null, this.render();
  }
  render() {
    if (!this.container) return;
    const e = this.captureRenderViewportState();
    gs(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      previewing: this.previewing,
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), je(this.container), this.restoreRenderViewportState(e);
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
        const s = t.value.length, r = Math.min(e.selectionStart, s), a = Math.min(e.selectionEnd, s);
        t.setSelectionRange(r, a, e.selectionDirection || "none");
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
    return this.editorState ? P(this.editorState.detail) : !0;
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        if (this.isEditorReadOnly()) return;
        const s = t.currentTarget, r = s.dataset.fieldInput || "";
        this.editorState = k(this.editorState, r, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", (t) => {
        if (t.preventDefault(), t.stopPropagation(), this.isEditorReadOnly()) return;
        const s = e.dataset.copySource || "", r = this.editorState?.detail.fields.find((o) => o.path === s);
        if (!r || !this.editorState) return;
        const a = (r.source_value || e.dataset.sourceValue || "").trim();
        Ct(a), this.editorState = k(this.editorState, s, a);
        const i = this.container?.querySelector(`[data-field-input="${W(s)}"]`);
        if (i) {
          i.value = a;
          try {
            i.focus({ preventScroll: !0 });
          } catch {
            i.focus();
          }
          const o = i.value.length;
          try {
            i.setSelectionRange(o, o);
          } catch {
          }
        }
        this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelector('[data-action="save-draft"]')?.addEventListener("click", () => {
      this.isEditorReadOnly() || this.saveDirtyFields(!1);
    }), this.container.querySelector('[data-action="submit-review"]')?.addEventListener("click", () => {
      this.submitForReview();
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
        const r = this.container.querySelector(`[data-editor-field="${W(s)}"]`);
        if (r) {
          r.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
          const a = r.querySelector("[data-field-input]");
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
  scheduleAutosave() {
    this.isEditorReadOnly() || (this.autosaveTimer && clearTimeout(this.autosaveTimer), this.autosaveTimer = setTimeout(() => {
      this.saveDirtyFields(!0);
    }, 600));
  }
  async saveDirtyFields(e) {
    if (this.isEditorReadOnly() || !this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return !0;
    this.saving = !0, this.editorState = wt(this.editorState), this.render();
    const t = this.editorState.detail;
    try {
      const s = await this.mutateDraftSync(t, this.editorState.dirty_fields, e);
      this.syncLoadedRevision = s.snapshot.revision, this.syncConflictSnapshot = null, this.editorState = x(this.editorState, R(s.snapshot));
      const r = Ft(this.editorState.detail.qa_results, e);
      return this.lastSavedMessage = r.lastSaved, (!e || r.kind === "conflict") && (this.feedback = {
        kind: r.kind,
        message: r.message
      }), this.saving = !1, this.render(), !0;
    } catch (s) {
      return Rt(s) ? (this.syncConflictSnapshot = $t(s), this.syncConflictSnapshot?.revision && (this.syncLoadedRevision = this.syncConflictSnapshot.revision), this.editorState = St(this.editorState, le(s)), this.feedback = {
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
      if (this.editorState = t ? x(this.editorState, R(t)) : x(this.editorState, { data: e }), t?.revision) this.syncLoadedRevision = t.revision;
      else {
        const s = m(c(e).row_version || c(e).version);
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
      if (!G(t)) throw new Error("Sync refresh did not return a usable draft snapshot");
      this.syncLoadedRevision = t.revision, this.syncConflictSnapshot = null, this.editorState = x(this.editorState, R(t)), this.feedback = {
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
    const r = await this.ensureDraftSyncResource(e), a = m(r.getSnapshot()?.revision), i = this.syncLoadedRevision || a || e.row_version, o = {
      autosave: s,
      fields: t
    }, l = kt(e);
    return l && (o.acknowledged_source_hash = l), await r.mutate({
      operation: Ge,
      expectedRevision: i,
      payload: o,
      metadata: { autosave: s }
    });
  }
  async ensureDraftSyncResource(e) {
    if (this.syncCoreModule || (this.syncCoreModulePromise || (this.syncCoreModulePromise = We(this.config.syncClientBasePath)), this.syncCoreModule = await this.syncCoreModulePromise), this.syncCache || (this.syncCache = this.syncCoreModule.createInMemoryCache()), !this.syncEngine) {
      const a = this.syncCoreModule.createFetchSyncTransport({
        baseURL: this.config.syncBaseURL,
        credentials: "same-origin",
        fetch: typeof fetch == "function" ? fetch.bind(globalThis) : void 0,
        headers: (i) => {
          const o = {};
          if (String(i?.method || "GET").toUpperCase() !== "GET") {
            const l = ve();
            l && (o["X-CSRF-Token"] = l);
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
    }, r = rt(s);
    return (!this.syncResource || this.syncResourceKey !== r) && (this.syncResourceKey = r, this.syncResource = this.syncEngine.resource(s), this.syncLoadedRevision = null, this.syncConflictSnapshot = null), this.syncResource;
  }
  async ensureDraftSyncLoaded(e) {
    const t = await this.ensureDraftSyncResource(e), s = this.syncResourceKey;
    if (this.syncLoadedResourceKey === s) return;
    const r = this.editorState ? { ...this.editorState.dirty_fields } : {}, a = await t.load();
    if (!G(a)) throw new Error("Sync draft load did not return a usable draft snapshot");
    if (!this.editorState || this.editorState.detail.variant_id !== e.variant_id) return;
    let i = x(this.editorState, R(a));
    for (const [o, l] of Object.entries(r)) i = k(i, o, l);
    this.editorState = i, this.syncLoadedRevision = a.revision, this.syncConflictSnapshot = null, this.loadState = {
      ...this.loadState,
      detail: this.editorState.detail
    }, this.syncLoadedResourceKey = s;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    if (this.isEditorReadOnly()) {
      this.feedback = {
        kind: "error",
        message: V(this.editorState.detail)
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
      const o = Object.entries(this.editorState.detail.field_completeness).filter(([, l]) => l.required && l.missing).map(([l]) => l);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? Mt(this.editorState.detail) : o.length ? `Complete required fields before submitting for review: ${o.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.history.page, s = this.editorState.detail.translation_assignment.version, r = await C(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: s }
    });
    if (!r.ok) {
      const o = await L(r, "Failed to submit assignment");
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
    const a = await r.json(), i = n(c(a).data && c(c(a).data).status);
    this.feedback = {
      kind: "success",
      message: Bt(this.editorState.detail, i)
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
    return X(`${this.config.actionEndpointBase}/${encodeURIComponent(e.assignment_id)}/preview`, {
      ...this.config.syncScope,
      channel: e.preview_action.channel || this.config.syncScope.channel
    });
  }
  async previewAssignment(e) {
    if (!this.editorState || this.previewing || this.saving || this.submitting) {
      b(e);
      return;
    }
    const t = this.editorState.detail;
    if (!t.preview_action.enabled) {
      b(e), this.feedback = {
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
      b(e), this.feedback = {
        kind: "conflict",
        message: "Reload the latest server draft before opening preview."
      }, this.render();
      return;
    }
    this.previewing = !0, this.render();
    try {
      if (Object.keys(this.editorState.dirty_fields).length && (!await this.saveDirtyFields(!1) || !this.editorState || this.editorState.autosave.conflict)) {
        b(e), this.previewing = !1, this.render();
        return;
      }
      const s = await C(this.assignmentPreviewEndpoint(this.editorState.detail), { method: "GET" });
      if (!s.ok) {
        const o = await L(s, "Failed to generate preview");
        b(e), this.feedback = {
          kind: o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
          message: o.message
        }, this.previewing = !1, this.render();
        return;
      }
      const r = await s.json(), a = c(r), i = N(a.data && typeof a.data == "object" ? a.data : r, this.editorState.detail);
      if (!i.enabled || !i.url) {
        b(e), this.feedback = {
          kind: "error",
          message: i.reason || "Preview is unavailable for this assignment."
        }, this.previewing = !1, this.render();
        return;
      }
      Tt(e, i.url), this.previewing = !1, this.feedback = null, this.render();
    } catch (s) {
      b(e), this.previewing = !1, this.feedback = {
        kind: "error",
        message: s instanceof Error ? s.message : "Failed to generate preview"
      }, this.render();
    }
  }
  async runReviewAction(e, t) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, r = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!r?.enabled) {
      this.feedback = {
        kind: "error",
        message: r?.reason || `${S(e)} is unavailable.`
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
    const i = await C(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: a
    });
    if (!i.ok) {
      const o = await L(i, `Failed to ${e} assignment`);
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
    t && (this.focusTrapCleanup = Me(t, () => this.closeRejectDialog()));
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
async function Cs(e, t) {
  const s = new hs(t);
  return s.mount(e), s;
}
export {
  At as TranslationEditorRequestError,
  hs as TranslationEditorScreen,
  St as applyEditorAutosaveConflict,
  k as applyEditorFieldChange,
  x as applyEditorUpdateResponse,
  xt as createTranslationEditorState,
  jt as fetchTranslationEditorDetailState,
  Cs as initTranslationEditorPage,
  We as loadTranslationSyncCoreModule,
  wt as markEditorAutosavePending,
  vt as normalizeAssignmentEditorDetail,
  oe as normalizeEditorAssistPayload,
  _t as normalizeEditorUpdateResponse,
  gs as renderTranslationEditorPage,
  ps as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map