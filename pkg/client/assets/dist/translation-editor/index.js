import { escapeAttribute as m, escapeHTML as l } from "../shared/html.js";
import { httpRequest as y, readHTTPError as X, readHTTPErrorResult as Z } from "../shared/transport/http-client.js";
import { extractStructuredError as B } from "../toast/error-helpers.js";
import { n as ee } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { asBoolean as p, asNumber as f, asRecord as u, asString as i, asStringArray as O } from "../shared/coercion.js";
import { C as te, E as se, H as ae, J as re, Q as ie, S as ne, U as oe, X as v, Y as le, Z as de, _ as ce, b as ue, d as A, g as me, h as fe, i as ge, l as j, m as pe, nt as be, o as I, p as he, rt as ve, s as N, tt as _e, u as L, v as ye, y as xe } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationTimestampUTC as H, sentenceCaseToken as $ } from "../translation-shared/formatters.js";
import { normalizeStringRecord as S } from "../shared/record-normalization.js";
import { c as V, s as $e } from "../chunks/ui-states-1McZ5upU.js";
function T(e) {
  const t = u(e);
  return {
    required: p(t.required),
    complete: p(t.complete),
    missing: p(t.missing)
  };
}
function q(e) {
  const t = u(e), s = i(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: p(t.changed),
    comparison_mode: s,
    previous_source_value: i(t.previous_source_value),
    current_source_value: i(t.current_source_value)
  };
}
function E(e) {
  const t = u(e);
  return {
    valid: t.valid !== !1,
    message: i(t.message)
  };
}
function _(e, t) {
  const s = u(e), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = t(n));
  return a;
}
function we(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = u(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || t.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: O(a.field_paths)
    });
  }
  return t;
}
function ke(e) {
  const t = u(e);
  return {
    available: p(t.available),
    title: i(t.title),
    summary: i(t.summary) || i(t.summary_markdown),
    rules: O(t.rules)
  };
}
function Q(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function Se(e) {
  const t = u(e), s = i(t.id), a = i(t.filename);
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
function Ae(e) {
  return Array.isArray(e) ? e.map((t) => Se(t)).filter((t) => t !== null) : [];
}
function je(e, t) {
  const s = u(e), a = u(s.kinds), r = {};
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
function Te(e) {
  return i(e) === "comment" ? "comment" : "event";
}
function qe(e) {
  const t = u(e), s = i(t.id);
  return s ? {
    id: s,
    entry_type: Te(t.entry_type),
    title: i(t.title),
    body: i(t.body),
    action: i(t.action),
    actor_id: i(t.actor_id),
    author_id: i(t.author_id),
    created_at: i(t.created_at),
    kind: i(t.kind),
    metadata: u(t.metadata)
  } : null;
}
function Ee(e) {
  const t = u(e), s = Array.isArray(t.items) ? t.items.map((a) => qe(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(t.page, 1) || 1,
    per_page: f(t.per_page, 10) || 10,
    total: f(t.total, s.length),
    has_more: p(t.has_more),
    next_page: f(t.next_page)
  };
}
function Ce(e) {
  const t = u(e), s = i(t.id), a = i(t.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(t.kind) || "review_feedback",
    created_at: i(t.created_at),
    author_id: i(t.author_id) || void 0
  };
}
function Re(e, t) {
  const s = u(e), a = Array.isArray(s.comments) ? s.comments.map((n) => Ce(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || t) || void 0;
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
function De(e) {
  const t = u(e), s = i(t.id), a = i(t.message);
  return !s || !a ? null : {
    id: s,
    category: i(t.category) === "style" ? "style" : "terminology",
    severity: i(t.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(t.field_path),
    message: a
  };
}
function Fe(e, t) {
  const s = u(e);
  return {
    category: i(s.category) || t,
    enabled: p(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function U(e) {
  const t = u(e), s = u(t.summary), a = u(t.categories), r = {};
  for (const [o, d] of Object.entries(a))
    o.trim() && (r[o.trim()] = Fe(d, o.trim()));
  const n = Array.isArray(t.findings) ? t.findings.map((o) => De(o)).filter((o) => o !== null) : [];
  return {
    enabled: p(t.enabled),
    summary: {
      finding_count: f(s.finding_count, n.length),
      warning_count: f(s.warning_count),
      blocker_count: f(s.blocker_count)
    },
    categories: r,
    findings: n,
    save_blocked: p(t.save_blocked),
    submit_blocked: p(t.submit_blocked)
  };
}
function Le(e) {
  const t = u(e);
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
function G(e, t) {
  const s = u(e), a = u(t);
  return {
    glossary_matches: we(s.glossary_matches ?? a.glossary_matches),
    style_guide_summary: ke(s.style_guide_summary ?? a.style_guide_summary),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function x(e) {
  const t = u(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const n = ee(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function Y(e, t, s, a, r, n) {
  if (Array.isArray(e.fields)) return e.fields.map((d) => {
    const c = u(d), g = i(c.path);
    if (!g) return null;
    const b = Object.prototype.hasOwnProperty.call(s, g);
    return {
      path: g,
      label: i(c.label) || g,
      input_type: i(c.input_type) || "text",
      required: p(c.required),
      source_value: i(c.source_value) || t[g] || "",
      target_value: b ? s[g] : i(c.target_value),
      completeness: T(c.completeness ?? a[g]),
      drift: q(c.drift ?? r[g]),
      validation: E(c.validation ?? n[g]),
      glossary_hits: Array.isArray(c.glossary_hits) ? c.glossary_hits.filter((h) => h && typeof h == "object") : []
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
function Me(e) {
  const t = u(e), s = u(t.data && typeof t.data == "object" ? t.data : e), a = S(s.source_fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), r = S(s.target_fields ?? s.fields, {
    trimKeys: !0,
    omitBlankKeys: !0
  }), n = _(s.field_completeness, T), o = _(s.field_drift, q), d = _(s.field_validations, E), c = Ae(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: f(s.assignment_row_version || s.assignment_version || u(s.translation_assignment).row_version || u(s.translation_assignment).version),
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
    fields: Y(s, a, r, n, o, d),
    field_completeness: n,
    field_drift: o,
    field_validations: d,
    source_target_drift: u(s.source_target_drift),
    history: Ee(s.history),
    attachments: c,
    attachment_summary: je(s.attachment_summary, c),
    translation_assignment: Le(s.translation_assignment),
    assist: G(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: Re(s.review_feedback, s.last_rejection_reason),
    qa_results: U(s.qa_results),
    assignment_action_states: x(s.assignment_action_states ?? s.editor_actions ?? s.actions),
    review_action_states: x(s.review_action_states ?? s.review_actions)
  };
}
function Pe(e) {
  const t = u(e), s = u(t.data && typeof t.data == "object" ? t.data : e);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: S(s.fields, {
      trimKeys: !0,
      omitBlankKeys: !0
    }),
    field_completeness: _(s.field_completeness, T),
    field_drift: _(s.field_drift, q),
    field_validations: _(s.field_validations, E),
    assist: G(s.assist, s),
    qa_results: U(s.qa_results),
    assignment_action_states: x(s.assignment_action_states),
    review_action_states: x(s.review_action_states)
  };
}
function C(e) {
  return Y({ fields: e.fields }, e.source_fields, e.target_fields, e.field_completeness, e.field_drift, e.field_validations);
}
function R(e) {
  if (!e.assignment_action_states.submit_review?.enabled || e.qa_results.submit_blocked) return !1;
  for (const t of Object.values(e.field_completeness)) if (t.required && t.missing) return !1;
  return !0;
}
function ze(e) {
  return {
    detail: {
      ...e,
      fields: C(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: R(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function w(e, t, s) {
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
  }, c = {
    ...e.detail,
    target_fields: r,
    field_completeness: o,
    field_validations: d
  };
  return c.fields = C(c), {
    ...e,
    detail: c,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: R(c)
  };
}
function Be(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function Oe(e, t) {
  const s = Pe(t), a = {
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
  return a.fields = C(a), {
    ...e,
    detail: a,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: R(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function Ie(e, t) {
  const s = u(u(u(t).error).metadata);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: u(s.latest_server_state_record)
    }
  };
}
function M(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(t))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
var Ne = class extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
};
async function k(e, t) {
  const s = await B(e);
  return new Ne({
    message: s.message || await X(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(e.headers.get("x-request-id")) || void 0,
    traceId: Q(e.headers) || void 0
  });
}
async function He(e) {
  const t = await Z(e, "Autosave conflict", { appendStatusToFallback: !1 });
  return t.payload && typeof t.payload == "object" ? t.payload : { error: { message: t.message } };
}
async function Ve(e) {
  const t = await y(e, { method: "GET" }), s = i(t.headers.get("x-request-id")) || void 0, a = Q(t.headers) || void 0;
  if (!t.ok) {
    const n = await B(t);
    return {
      status: n.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: n.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: n.textCode
    };
  }
  const r = Me(await t.json());
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
function Qe(e) {
  return !e || e <= 0 ? "0 B" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(1)} MB`;
}
function Ue(e) {
  return i(e.status || e.translation_assignment.status || e.translation_assignment.queue_state);
}
function Ge(e) {
  return e === "review" || e === "in_review";
}
function D(e) {
  return Ge(Ue(e)) ? !0 : !!(e.review_action_states.approve?.enabled || e.review_action_states.reject?.enabled);
}
function F(e) {
  return !!e.assignment_action_states.archive?.enabled;
}
function Ye(e, t, s) {
  let a = "idle";
  return e?.autosave.conflict ? a = "conflict" : e?.autosave.pending ? a = "saving" : t ? a = "dirty" : s && (a = "saved"), {
    tone: re(a),
    text: le(a, s),
    state: a
  };
}
function K(e) {
  const t = [
    e.requestId ? `Request ${l(e.requestId)}` : "",
    e.traceId ? `Trace ${l(e.traceId)}` : "",
    e.errorCode ? `Code ${l(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-gray-500">${t.join(" · ")}</p>` : "";
}
function Ke(e) {
  return e ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(e.kind)}" role="status" aria-live="polite">
      ${l(e.message)}
    </div>
  ` : "";
}
function We(e) {
  const t = e.qa_results;
  if (!t.enabled || t.summary.finding_count <= 0) return "";
  const s = t.summary.blocker_count > 0 ? v("error") : v("success"), a = t.summary.blocker_count > 0 ? `Blockers ${t.summary.blocker_count}` : "No blockers";
  return `
    <span class="${v("warning")}">Warnings ${t.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function Je(e, t) {
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
function Ze(e, t) {
  const s = e.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return t === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function et() {
  return $e({
    tag: "section",
    text: "Loading translation assignment…",
    showSpinner: !1,
    containerClass: `${se} p-8 shadow-sm`,
    textClass: "text-sm font-medium text-gray-500"
  });
}
function P(e, t) {
  return V({
    tag: "section",
    containerClass: `${he} p-8 text-center shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: fe,
    message: t,
    messageClass: `${pe} mt-2`
  });
}
function z(e, t, s) {
  return V({
    tag: "section",
    containerClass: `${me} p-8 shadow-sm`,
    bodyClass: "",
    contentClass: "",
    title: e,
    titleTag: "h2",
    titleClass: ye,
    message: t,
    messageClass: `${ce} mt-2`,
    actionsHtml: K(s),
    role: "alert"
  });
}
function tt(e, t, s, a, r, n = "") {
  const o = e.assignment_action_states.submit_review, d = !o?.enabled || r || a || e.qa_results.submit_blocked, c = r || !s, g = (e.source_locale || "source").toUpperCase(), b = (e.target_locale || "target").toUpperCase(), h = e.translation_assignment, J = e.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : o?.reason || "";
  return `
    <section class="${A} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${ne}">Assignment editor</p>
          <div>
            <h1 class="${te}">${l(h.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${l(g)} to ${l(b)} • ${l($(e.status || h.status || "draft"))} • Priority ${l(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${l(h.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${l(h.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${m(t.state)}">${l(t.text)}</span>
            ${We(e)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="${j}"
            data-action="save-draft"
            ${c ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="${N}"
            data-action="submit-review"
            title="${m(J)}"
            ${d ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : o?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function st(e) {
  if (!e.drift.changed) return "";
  const t = !!(e.drift.previous_source_value && e.drift.previous_source_value.trim()), s = !!(e.drift.current_source_value || e.source_value);
  return !t && !s ? `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Before/after values unavailable. Review the source field above.</p>
      </div>
    ` : t ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${l(e.drift.previous_source_value)}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${l(e.drift.current_source_value || e.source_value || "Current value unavailable")}</p>
    </div>
  ` : `
      <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
        <p class="font-semibold">Source changed since the last synced draft.</p>
        <p class="mt-1 text-amber-700">Previous value unavailable. Review the current source text above.</p>
      </div>
    `;
}
function at(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="${xe}">
          <span class="${ue}">${l(i(s.term))}</span>
          → ${l(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function rt(e) {
  const t = e.fields || [], s = e.qa_results;
  let a = 0, r = 0, n = 0, o = 0, d = null;
  for (const c of t)
    c.completeness.complete && !c.completeness.missing && a++, c.completeness.required && c.completeness.missing && (r++, d || (d = c.path)), c.drift.changed && (n++, d || (d = c.path)), c.validation.valid || (o++, d || (d = c.path));
  if (!d && s.enabled && s.summary.blocker_count > 0 && s.findings.length > 0) {
    const c = s.findings.find((g) => g.severity === "blocker");
    c?.field_path && (d = c.field_path);
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
function it(e) {
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
function nt(e) {
  return e.source_value && e.source_value.trim() ? l(e.source_value) : e.required ? '<span class="text-amber-600 italic">Source text pending - required field</span>' : '<span class="text-gray-400 italic">Optional source content not provided</span>';
}
function ot(e) {
  return `
    <section class="space-y-4">
      ${it(rt(e))}
      ${e.fields.map((t) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(t.path)}" id="field-${m(t.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${l(t.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${l(t.path)}${t.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${I}"
              data-copy-source="${m(t.path)}"
              aria-label="Copy source text to translation field for ${m(t.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${nt(t)}</div>
            </div>
            <div class="rounded-xl border ${t.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(t.path)}">Translation</label>
              ${t.input_type === "textarea" ? `<textarea id="editor-field-${m(t.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}">${l(t.target_value)}</textarea>` : `<input id="editor-field-${m(t.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}" value="${m(t.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${t.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${t.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${t.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${t.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(t.path)}">${l(t.validation.message || "Validation error")}</p>`}
              ${st(t)}
              ${at(t)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function W(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = u(s), r = i(a.suggested_text) || i(a.target_text);
    r && t.push({
      id: i(a.id) || `tm-${t.length}`,
      score: lt(a.score, a.match_score),
      sourceLabel: i(a.source_label) || i(a.source) || "Internal TM",
      localePair: i(a.locale_pair) || "",
      fieldPath: i(a.field_path) || "",
      suggestedText: r,
      isStaleSource: p(a.is_stale_source) || p(a.stale_source)
    });
  }
  return t.sort((s, a) => a.score - s.score);
}
function lt(e, t) {
  const s = f(e) || f(t);
  if (!Number.isFinite(s) || s <= 0) return 0;
  const a = s <= 1 ? s * 100 : s;
  return Math.max(0, Math.min(100, Math.round(a)));
}
function dt(e) {
  return e >= 99 ? "Exact" : e >= 80 ? "High" : "Fuzzy";
}
function ct(e) {
  return e.length ? `
    <div class="mt-4" data-assist-section="tm">
      <h3 class="text-sm font-semibold text-gray-800">Translation Memory</h3>
      <ul class="mt-3 space-y-2">
        ${e.map((t) => `
          <li class="rounded-xl border ${t.isStaleSource ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm" data-tm-suggestion="${m(t.id)}">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 break-words">${l(t.suggestedText)}</p>
                <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span class="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">${dt(t.score)} ${t.score}%</span>
                  <span>${l(t.sourceLabel)}</span>
                  ${t.localePair ? `<span class="text-gray-400">${l(t.localePair)}</span>` : ""}
                  ${t.isStaleSource ? '<span class="text-amber-600">Source changed</span>' : ""}
                </div>
                ${t.fieldPath ? `<p class="mt-1 text-xs text-gray-400">Field: ${l(t.fieldPath)}</p>` : ""}
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
function ut(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5" data-editor-panel="assist">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        ${ct(W(e.assist.translation_memory_suggestions))}
        <div data-assist-section="glossary">
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${l(a.term)}</strong> → ${l(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${l(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div data-assist-section="style-guide">
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${l(s.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${l(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${s.rules.map((a) => `<li>• ${l(a)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function mt(e) {
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
function ft(e) {
  const t = e.qa_results;
  if (!t.enabled) return "";
  const s = t.findings.filter((n) => n.severity === "blocker"), a = t.findings.filter((n) => n.severity !== "blocker"), r = (n, o) => {
    if (!n.length) return "";
    const d = de(o);
    return `
      <section data-qa-group="${m(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((c) => `
          <li class="${d.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${l($(c.category))}</strong>
              <span class="${d.badge}">${l(c.severity)}</span>
            </div>
            <p class="mt-2">${l(c.message)}</p>
            ${c.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${l(c.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${ie(t.submit_blocked)}">
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
function gt(e, t) {
  const s = e.review_action_states.approve, a = e.review_action_states.reject;
  return D(e) ? `
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
              ${l(r.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function pt(e, t) {
  return e ? `
    <div class="${oe}" data-reject-modal="true">
      <section class="${ae}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="${I}" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${l(e.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${l(e.comment)}</textarea>
        </label>
        ${e.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${l(e.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${j}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${ge}" data-action="confirm-reject" ${t ? 'disabled aria-disabled="true"' : ""}>${t ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function bt(e, t) {
  if (!F(e)) return "";
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
function ht(e) {
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
                  <p class="font-semibold text-gray-900">${l(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${l(t.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${l(Qe(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-gray-500">${l(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${l(H(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function vt(e) {
  const t = e.history, s = mt(e);
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
                  <p class="${r.title}">${l(a.title)}</p>
                  <span class="${r.badge}">${l(a.badge)}</span>
                </div>
                <span class="${r.time}">${l(H(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${l(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${L}" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${L}" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function _t(e) {
  const t = D(e), s = F(e), a = e.qa_results.enabled ? e.qa_results.summary.finding_count : 0, r = W(e.assist.translation_memory_suggestions).length, n = e.assist.glossary_matches.length, o = e.attachment_summary.total, d = e.history.total;
  return {
    actions: null,
    qa: a > 0 ? String(a) : null,
    assist: r + n > 0 ? String(r + n) : null,
    files: o > 0 ? String(o) : null,
    history: d > 0 ? String(d) : null
  };
}
function yt(e, t, s = "actions", a) {
  const r = _t(e), n = D(e), o = F(e), d = n || o, c = `
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
  ].map((b) => `
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${s === b.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}"
          data-sidebar-tab="${m(b.id)}"
          role="tab"
          aria-selected="${s === b.id}"
          aria-controls="sidebar-panel-${m(b.id)}"
        >
          ${b.icon}
          <span class="hidden sm:inline">${l(b.label)}</span>
          ${b.badge ? `<span class="rounded-full bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700">${l(b.badge)}</span>` : ""}
        </button>
      `).join("")}
    </nav>
  `, g = {
    actions: `
      <div id="sidebar-panel-actions" class="space-y-4" role="tabpanel" data-sidebar-panel="actions" ${s !== "actions" ? "hidden" : ""}>
        ${n ? gt(e, t) : ""}
        ${o ? bt(e, t) : ""}
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
        ${ft(e)}
      </div>
    `,
    assist: `
      <div id="sidebar-panel-assist" class="space-y-4" role="tabpanel" data-sidebar-panel="assist" ${s !== "assist" ? "hidden" : ""}>
        ${ut(e)}
      </div>
    `,
    files: `
      <div id="sidebar-panel-files" class="space-y-4" role="tabpanel" data-sidebar-panel="files" ${s !== "files" ? "hidden" : ""}>
        ${ht(e)}
      </div>
    `,
    history: `
      <div id="sidebar-panel-history" class="space-y-4" role="tabpanel" data-sidebar-panel="history" ${s !== "history" ? "hidden" : ""}>
        ${vt(e)}
        ${K(a || {
      status: "ready",
      detail: e
    })}
      </div>
    `
  };
  return `
    <aside class="space-y-4 sm:space-y-6" data-editor-sidebar="true">
      ${c}
      ${Object.values(g).join("")}
    </aside>
  `;
}
function xt(e, t, s = {}, a = {}) {
  if (e.status === "loading") return et();
  if (e.status === "empty") return P("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return z("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return z("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const r = t?.detail || e.detail;
  if (!r) return P("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), o = Ye(t || null, n, a.lastSavedMessage || ""), d = t?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${Ke(a.feedback || null)}
      ${tt(r, o, n, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${d ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${N}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${ot(r)}
        </div>
        <div class="order-2">
          ${yt(r, a.submitting === !0, a.activeSidebarTab || "actions", e)}
        </div>
      </div>
      ${pt(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function $t(e, t, s, a = {}, r = {}) {
  e.innerHTML = xt(t, s, a, r);
}
var wt = class {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.activeSidebarTab = "actions", this.config = {
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
    this.loadState = { status: "loading" }, this.render(), this.loadState = await Ve(e ? M(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = ze(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && ($t(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft,
      activeSidebarTab: this.activeSidebarTab
    }), this.attachEventListeners(), be(this.container));
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (t) => {
        const s = t.currentTarget, a = s.dataset.fieldInput || "";
        this.editorState = w(this.editorState, a, s.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.copySource || "", s = this.editorState?.detail.fields.find((a) => a.path === t);
        !s || !this.editorState || (this.editorState = w(this.editorState, t, s.source_value), this.scheduleAutosave(), this.render());
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
        !t || !s || !this.editorState || (this.editorState = w(this.editorState, t, s), this.feedback = {
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
    this.saving = !0, this.editorState = Be(this.editorState), this.render();
    const t = this.editorState.detail, s = await y(M(`${this.config.variantEndpointBase}/${encodeURIComponent(t.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!s.ok) {
      if (s.status === 409) {
        const n = await He(s);
        return this.editorState = Ie(this.editorState, n), this.feedback = {
          kind: "conflict",
          message: "Autosave conflict detected. Reload the latest server draft."
        }, this.saving = !1, this.render(), !1;
      }
      return this.feedback = {
        kind: "error",
        message: (await k(s, "Failed to save draft")).message
      }, this.saving = !1, this.render(), !1;
    }
    const a = await s.json();
    this.editorState = Oe(this.editorState, a);
    const r = Je(this.editorState.detail.qa_results, e);
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
      const n = Object.entries(this.editorState.detail.field_completeness).filter(([, o]) => o.required && o.missing).map(([o]) => o);
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
      const n = await k(s, "Failed to submit assignment");
      this.feedback = {
        kind: n.code === "VERSION_CONFLICT" || n.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: n.message
      }, this.submitting = !1, this.render();
      return;
    }
    const a = await s.json(), r = i(u(a).data && u(u(a).data).status);
    this.feedback = {
      kind: "success",
      message: Ze(this.editorState.detail, r)
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
    const n = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: r
    });
    if (!n.ok) {
      const o = await k(n, `Failed to ${e} assignment`);
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
    t && (this.focusTrapCleanup = ve(t, () => this.closeRejectDialog()));
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
async function Dt(e, t) {
  const s = new wt(t);
  return s.mount(e), s;
}
export {
  Ne as TranslationEditorRequestError,
  wt as TranslationEditorScreen,
  Ie as applyEditorAutosaveConflict,
  w as applyEditorFieldChange,
  Oe as applyEditorUpdateResponse,
  ze as createTranslationEditorState,
  Ve as fetchTranslationEditorDetailState,
  Dt as initTranslationEditorPage,
  Be as markEditorAutosavePending,
  Me as normalizeAssignmentEditorDetail,
  G as normalizeEditorAssistPayload,
  Pe as normalizeEditorUpdateResponse,
  $t as renderTranslationEditorPage,
  xt as renderTranslationEditorState
};

//# sourceMappingURL=index.js.map