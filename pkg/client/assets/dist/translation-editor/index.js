import { escapeAttribute as m, escapeHTML as o } from "../shared/html.js";
import { httpRequest as y, readHTTPError as V, readHTTPErrorResult as W } from "../shared/transport/http-client.js";
import { extractStructuredError as F } from "../toast/error-helpers.js";
import { n as X } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { asBoolean as g, asNumber as f, asRecord as c, asString as i, asStringArray as B } from "../shared/coercion.js";
import { C as J, E as Z, H as ee, J as te, Q as se, S as ae, U as re, X as _, Y as ie, Z as ne, _ as oe, b as le, d as S, g as ce, h as de, i as ue, l as j, m as me, nt as fe, o as M, p as ge, rt as pe, s as I, tt as _e, u as q, v as be, y as he } from "../chunks/translation-shared-BSLmw_rJ.js";
import { formatTranslationTimestampUTC as z, sentenceCaseToken as $ } from "../translation-shared/formatters.js";
import { normalizeStringRecord as k } from "../shared/record-normalization.js";
import { c as N, s as ve } from "../chunks/ui-states-CskzQjWR.js";
function T(e) {
  const t = c(e);
  return {
    required: g(t.required),
    complete: g(t.complete),
    missing: g(t.missing)
  };
}
function A(e) {
  const t = c(e), s = i(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: g(t.changed),
    comparison_mode: s,
    previous_source_value: i(t.previous_source_value),
    current_source_value: i(t.current_source_value)
  };
}
function E(e) {
  const t = c(e);
  return {
    valid: t.valid !== !1,
    message: i(t.message)
  };
}
function b(e, t) {
  const s = c(e), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = t(n));
  return a;
}
function ye(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = c(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || t.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: B(a.field_paths)
    });
  }
  return t;
}
function xe(e) {
  const t = c(e);
  return {
    available: g(t.available),
    title: i(t.title),
    summary: i(t.summary) || i(t.summary_markdown),
    rules: B(t.rules)
  };
}
function H(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function $e(e) {
  const t = c(e), s = i(t.id), a = i(t.filename);
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
function we(e) {
  return Array.isArray(e) ? e.map((t) => $e(t)).filter((t) => t !== null) : [];
}
function ke(e, t) {
  const s = c(e), a = c(s.kinds), r = {};
  for (const [n, l] of Object.entries(a)) {
    const d = f(l);
    n.trim() && (r[n.trim()] = d);
  }
  if (!Object.keys(r).length) for (const n of t) r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: f(s.total, t.length),
    kinds: r
  };
}
function Se(e) {
  return i(e) === "comment" ? "comment" : "event";
}
function je(e) {
  const t = c(e), s = i(t.id);
  return s ? {
    id: s,
    entry_type: Se(t.entry_type),
    title: i(t.title),
    body: i(t.body),
    action: i(t.action),
    actor_id: i(t.actor_id),
    author_id: i(t.author_id),
    created_at: i(t.created_at),
    kind: i(t.kind),
    metadata: c(t.metadata)
  } : null;
}
function Te(e) {
  const t = c(e), s = Array.isArray(t.items) ? t.items.map((a) => je(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(t.page, 1) || 1,
    per_page: f(t.per_page, 10) || 10,
    total: f(t.total, s.length),
    has_more: g(t.has_more),
    next_page: f(t.next_page)
  };
}
function Ae(e) {
  const t = c(e), s = i(t.id), a = i(t.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(t.kind) || "review_feedback",
    created_at: i(t.created_at),
    author_id: i(t.author_id) || void 0
  };
}
function Ee(e, t) {
  const s = c(e), a = Array.isArray(s.comments) ? s.comments.map((n) => Ae(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || t) || void 0;
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
function Re(e) {
  const t = c(e), s = i(t.id), a = i(t.message);
  return !s || !a ? null : {
    id: s,
    category: i(t.category) === "style" ? "style" : "terminology",
    severity: i(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(t.field_path),
    message: a
  };
}
function Ce(e, t) {
  const s = c(e);
  return {
    category: i(s.category) || t,
    enabled: g(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function U(e) {
  const t = c(e), s = c(t.summary), a = c(t.categories), r = {};
  for (const [l, d] of Object.entries(a))
    l.trim() && (r[l.trim()] = Ce(d, l.trim()));
  const n = Array.isArray(t.findings) ? t.findings.map((l) => Re(l)).filter((l) => l !== null) : [];
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
function qe(e) {
  const t = c(e);
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
function Q(e, t) {
  const s = c(e), a = c(t);
  return {
    glossary_matches: ye(s.glossary_matches ?? a.glossary_matches),
    style_guide_summary: xe(s.style_guide_summary ?? a.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function x(e) {
  const t = c(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const n = X(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function G(e, t, s, a, r, n) {
  if (Array.isArray(e.fields)) return e.fields.map((d) => {
    const u = c(d), p = i(u.path);
    return p ? {
      path: p,
      label: i(u.label) || p,
      input_type: i(u.input_type) || "text",
      required: g(u.required),
      source_value: i(u.source_value) || t[p] || "",
      target_value: i(u.target_value) || s[p] || "",
      completeness: T(u.completeness ?? a[p]),
      drift: A(u.drift ?? r[p]),
      validation: E(u.validation ?? n[p]),
      glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((h) => h && typeof h == "object") : []
    } : null;
  }).filter((d) => !!d);
  const l = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(l).sort().map((d) => ({
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
function De(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e), a = k(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), r = k(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), n = b(s.field_completeness, T), l = b(s.field_drift, A), d = b(s.field_validations, E), u = we(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: f(s.assignment_row_version || s.assignment_version || c(s.translation_assignment).row_version || c(s.translation_assignment).version),
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
    fields: G(s, a, r, n, l, d),
    field_completeness: n,
    field_drift: l,
    field_validations: d,
    source_target_drift: c(s.source_target_drift),
    history: Te(s.history),
    attachments: u,
    attachment_summary: ke(s.attachment_summary, u),
    translation_assignment: qe(s.translation_assignment),
    assist: Q(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: Ee(s.review_feedback, s.last_rejection_reason),
    qa_results: U(s.qa_results),
    assignment_action_states: x(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: x(s.review_action_states ?? s.review_actions)
  };
}
function Le(e) {
  const t = c(e), s = c(t.data && typeof t.data == "object" ? t.data : e);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: k(s.fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: b(s.field_completeness, T),
    field_drift: b(s.field_drift, A),
    field_validations: b(s.field_validations, E),
    assist: Q(s.assist, s),
    qa_results: U(s.qa_results),
    assignment_action_states: x(s.assignment_action_states),
    review_action_states: x(s.review_action_states)
  };
}
function R(e) {
  return G({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function C(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function Oe(e) {
  return {
    detail: {
      ...e,
      fields: R(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: C(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function D(e, t, s) {
  const a = t.trim();
  if (!a) return e;
  const r = {
    ...e.detail.target_fields,
    [a]: s.trim()
  }, n = e.detail.field_completeness[a]?.required === !0, l = {
    ...e.detail.field_completeness,
    [a]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, d = {
    ...e.detail.field_validations,
    [a]: {
      valid: !l[a].missing,
      message: l[a].missing ? e.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: r,
    field_completeness: l,
    field_validations: d
  };
  return u.fields = R(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: C(u)
  };
}
function Pe(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function Fe(e, t) {
  const s = Le(t), a = {
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
  return a.fields = R(a), {
    ...e,
    detail: a,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: C(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function Be(e, t) {
  const s = c(c(c(t).error).metadata);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: c(s.latest_server_state_record)
    }
  };
}
function L(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(t))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
var Me = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function w(e, t) {
  const s = await F(e);
  return new Me({
    message: s.message || await V(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(e.headers.get("x-request-id")) || void 0,
    traceId: H(e.headers) || void 0
  });
}
async function Ie(e) {
  const t = await W(e, "Autosave conflict", { appendStatusToFallback: !1 });
  return t.payload && typeof t.payload == "object" ? t.payload : { error: { message: t.message } };
}
async function ze(e) {
  const t = await y(e, { method: "GET" }), s = i(t.headers.get("x-request-id")) || void 0, a = H(t.headers) || void 0;
  if (!t.ok) {
    const n = await F(t);
    return {
      status: n.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: n.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: n.textCode
    };
  }
  const r = De(await t.json());
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
function Ne(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function He(e) {
  return i(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function Ue(e) {
  return e === "review" || e === "in_review";
}
function Qe(e) {
  return Ue(He(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function Ge(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function Ye(e, t, s) {
  let a = "idle";
  return e?.autosave.conflict ? a = "conflict" : e?.autosave.pending ? a = "saving" : t ? a = "dirty" : s && (a = "saved"), {
    tone: te(a),
    text: ie(a, s),
    state: a
  };
}
function Y(e) {
  const t = [
    e.requestId ? `Request ${o(e.requestId)}` : "",
    e.traceId ? `Trace ${o(e.traceId)}` : "",
    e.errorCode ? `Code ${o(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function Ke(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(e.kind)}" role="status" aria-live="polite">
      ${o(e.message)}
    </div>
  ` : "";
}
function Ve(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? _("error") : _("success"), a = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${_("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function We(e, t) {
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
function Xe(e) {
  const t = e.qa_results;
  return t.submit_blocked ? `Resolve ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function Je(e, t) {
  const s = e.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function Ze() {
  return ve({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${Z} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function O(e, t) {
  return N({
    tag: "section",
    containerClass: `${ge} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: de,
    message: t,
    messageClass: `${me} mt-2`
  });
}
function P(e, t, s) {
  return N({
    tag: "section",
    containerClass: `${ce} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: be,
    message: t,
    messageClass: `${oe} mt-2`,
    actionsHtml: Y(s),
    role: "alert"
  });
}
function et(e, t, s, a, r, n = "") {
  const l = e.assignment_action_states.submit_review, d = !l?.enabled || r || a || e.qa_results.submit_blocked, u = r || !s, p = (e.source_locale || "source").toUpperCase(), h = (e.target_locale || "target").toUpperCase(), v = e.translation_assignment, K = e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : l?.reason || "";
  return `
    <section class="${S} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${ae}">Assignment editor</p>
          <div>
            <h1 class="${J}">${o(v.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${o(p)} to ${o(h)} • ${o($(e.status || v.status || "draft"))} • Priority ${o(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${o(v.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${o(v.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${m(t.state)}">${o(t.text)}</span>
            ${Ve(e)}
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
            class="${I}"
            data-action="submit-review"
            title="${m(K)}"
            ${d ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : l?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function tt(e) {
  return e.drift.changed ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${o(e.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${o(e.drift.current_source_value || e.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function st(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${he}">
          <span class="${le}">${o(i(s.term))}</span>
          → ${o(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function at(e) {
  return `
    <section class="space-y-4">
      ${e.fields.map((t) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(t.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${o(t.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${o(t.path)}${t.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${M}"
              data-copy-source="${m(t.path)}"
              aria-label="Copy source text to translation field for ${m(t.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${o(t.source_value || "No source text")}</div>
            </div>
            <div class="rounded-xl border ${t.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(t.path)}">Translation</label>
              ${t.input_type === "textarea" ? `<textarea id="editor-field-${m(t.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}">${o(t.target_value)}</textarea>` : `<input id="editor-field-${m(t.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}" value="${m(t.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${t.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${t.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${t.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${t.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(t.path)}">${o(t.validation.message || "Validation error")}</p>`}
              ${tt(t)}
              ${st(t)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function rt(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${o(a.term)}</strong> → ${o(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${o(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${o(s.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${o(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${s.rules.map((a) => `<li>• ${o(a)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function it(e) {
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
function nt(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((n) => n.severity === "blocker"), a = t.findings.filter((n) => n.severity !== "blocker"), r = (n, l) => {
    if (!n.length) return "";
    const d = ne(l);
    return `
      <section data-qa-group="${m(l === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${l === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${l === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((u) => `
          <li class="${d.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${o($(u.category))}</strong>
              <span class="${d.badge}">${o(u.severity)}</span>
            </div>
            <p class="mt-2">${o(u.message)}</p>
            ${u.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${o(u.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${se(t.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${t.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${t.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${t.submit_blocked ? _("error") : _("neutral")}">
          ${t.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${_("warning")}">Warnings ${t.summary.warning_count}</span>
        <span class="${_("error")}">Blockers ${t.summary.blocker_count}</span>
      </div>
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${r(s, "blocker")}${r(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function ot(e, t) {
  const s = e.review_action_states.approve, a = e.review_action_states.reject;
  return Qe(e) ? `
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
              ${o(r.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function lt(e, t) {
  return e ? `
    <div class="${re}" data-reject-modal="true">
      <section class="${ee}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${M}" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${o(e.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${o(e.comment)}</textarea>
        </label>
        ${e.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${o(e.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${j}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${ue}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function ct(e, t) {
  if (!Ge(e)) return "";
  const s = e.assignment_action_states.archive, a = !s?.enabled || t;
  return `
    <section
      class="${S} p-5"
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
function dt(e) {
  return `
    <section class="${S} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${e.attachment_summary.total}</span>
      </div>
      ${e.attachments.length ? `<ul class="mt-4 space-y-3">${e.attachments.map((t) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${o(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${o(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${o(Ne(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${o(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${o(z(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function ut(e) {
  const t = e.history, s = it(e);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => {
    const r = _e(a.tone);
    return `
            <li class="${r.container}" data-history-entry="${m(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${r.title}">${o(a.title)}</p>
                  <span class="${r.badge}">${o(a.badge)}</span>
                </div>
                <span class="${r.time}">${o(z(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${o(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${q}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${q}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function mt(e, t, s = {}, a = {}) {
  if (e.status === "loading") return Ze();
  if (e.status === "empty") return O("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return P("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return P("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const r = t?.detail || e.detail;
  if (!r) return O("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), l = Ye(t || null, n, a.lastSavedMessage || ""), d = t?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${Ke(a.feedback || null)}
      ${et(r, l, n, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${d ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${I}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${at(r)}
        </div>
        <aside class="order-2 space-y-4 sm:space-y-6">
          ${ot(r, a.submitting === !0)}
          ${ct(r, a.submitting === !0)}
          ${nt(r)}
          ${rt(r)}
          ${dt(r)}
          ${ut(r)}
          ${Y(e)}
        </aside>
      </div>
      ${lt(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function ft(e, t, s, a = {}, r = {}) {
  e.innerHTML = mt(t, s, a, r);
}
var gt = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase,
      actionEndpointBase: e.actionEndpointBase,
      basePath: e.basePath || "/admin"
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (t) => {
      (t.ctrlKey || t.metaKey) && t.key === "s" && (t.preventDefault(), this.saveDirtyFields(!1)), t.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render(), this.loadState = await ze(e ? L(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = Oe(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (ft(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft
    }), this.attachEventListeners(), fe(this.container));
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        const s = t.currentTarget, a = s.dataset.fieldInput || "";
        this.editorState = D(this.editorState, a, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.copySource || "", s = this.editorState?.detail.fields.find((a) => a.path === t);
        !s || !this.editorState || (this.editorState = D(this.editorState, t, s.source_value), this.scheduleAutosave(), this.render());
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
      this.feedback = {
        kind: "conflict",
        message: "Reloaded the latest server draft."
      }, this.load(this.editorState?.detail.history.page);
    }), this.container.querySelector('[data-history-prev="true"]')?.addEventListener("click", () => {
      const e = (this.editorState?.detail.history.page || 1) - 1;
      e >= 1 && this.load(e);
    }), this.container.querySelector('[data-history-next="true"]')?.addEventListener("click", () => {
      const e = this.editorState?.detail.history;
      e?.has_more && this.load(e.next_page || e.page + 1);
    }));
  }
  scheduleAutosave() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.autosaveTimer = setTimeout(() => {
      this.saveDirtyFields(!0);
    }, 600);
  }
  async saveDirtyFields(e) {
    if (!this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return !0;
    this.saving = !0, this.editorState = Pe(this.editorState), this.render();
    const t = this.editorState.detail, s = await y(L(`${this.config.variantEndpointBase}/${encodeURIComponent(t.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!s.ok) {
      if (s.status === 409) {
        const n = await Ie(s);
        return this.editorState = Be(this.editorState, n), this.feedback = {
          kind: "conflict",
          message: "Autosave conflict detected. Reload the latest server draft."
        }, this.saving = !1, this.render(), !1;
      }
      return this.feedback = {
        kind: "error",
        message: (await w(s, "Failed to save draft")).message
      }, this.saving = !1, this.render(), !1;
    }
    const a = await s.json();
    this.editorState = Fe(this.editorState, a);
    const r = We(this.editorState.detail.qa_results, e);
    return this.lastSavedMessage = r.lastSaved, (!e || r.kind === "conflict") && (this.feedback = {
      kind: r.kind,
      message: r.message
    }), this.saving = !1, this.render(), !0;
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
      const n = Object.entries(this.editorState.detail.field_completeness).filter(([, l]) => l.required && l.missing).map(([l]) => l);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? Xe(this.editorState.detail) : n.length ? `Complete required fields before submitting for review: ${n.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const t = this.editorState.detail.translation_assignment.version, s = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: t }
    });
    if (!s.ok) {
      const n = await w(s, "Failed to submit assignment");
      this.feedback = {
        kind: n.code === "VERSION_CONFLICT" || n.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: n.message
      }, this.submitting = !1, this.render();
      return;
    }
    const a = await s.json(), r = i(c(a).data && c(c(a).data).status);
    this.feedback = {
      kind: "success",
      message: Je(this.editorState.detail, r)
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
      const l = t?.reason || "";
      if (!l || !l.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      r.reason = l.trim(), t?.comment?.trim() && (r.comment = t.comment.trim());
    }
    this.submitting = !0, this.render();
    const n = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: r
    });
    if (!n.ok) {
      const l = await w(n, `Failed to ${e} assignment`);
      this.feedback = {
        kind: l.code === "VERSION_CONFLICT" || l.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: l.message
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
async function kt(e, t) {
  const s = new gt(t);
  return s.mount(e), s;
}
export {
  Me as TranslationEditorRequestError,
  gt as TranslationEditorScreen,
  Be as applyEditorAutosaveConflict,
  D as applyEditorFieldChange,
  Fe as applyEditorUpdateResponse,
  Oe as createTranslationEditorState,
  ze as fetchTranslationEditorDetailState,
  kt as initTranslationEditorPage,
  Pe as markEditorAutosavePending,
  De as normalizeAssignmentEditorDetail,
  Q as normalizeEditorAssistPayload,
  Le as normalizeEditorUpdateResponse,
  ft as renderTranslationEditorPage,
  mt as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map