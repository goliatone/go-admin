import { d as W } from "../chunks/index-YiVxcMWC.js";
import { escapeHTML as c, escapeAttribute as m } from "../shared/html.js";
import { h as y, r as F } from "../chunks/http-client-DZnuedzQ.js";
import { extractStructuredError as M } from "../toast/error-helpers.js";
import { f as z, s as K, t as X, L as J, E as Z, i as ee, j as te, k as se, l as ae, m as re, r as ie, u as ne, d as S, H as oe, h as ce, B as j, o as I, v as le, w as _, x as C, y as de, M as ue, n as me, q as fe, G as ge, z as pe, A as _e } from "../chunks/style-constants-i2xRoO1L.js";
function d(t) {
  return t && typeof t == "object" ? t : {};
}
function i(t) {
  return typeof t == "string" ? t.trim() : "";
}
function g(t) {
  return t === !0;
}
function f(t, e = 0) {
  return typeof t == "number" && Number.isFinite(t) ? t : e;
}
function k(t) {
  const e = d(t), s = {};
  for (const [a, r] of Object.entries(e)) {
    const n = i(r);
    a.trim() && (s[a.trim()] = n);
  }
  return s;
}
function B(t) {
  return Array.isArray(t) ? t.map((e) => i(e)).filter(Boolean) : [];
}
function A(t) {
  const e = d(t);
  return {
    required: g(e.required),
    complete: g(e.complete),
    missing: g(e.missing)
  };
}
function T(t) {
  const e = d(t), s = i(e.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: g(e.changed),
    comparison_mode: s,
    previous_source_value: i(e.previous_source_value),
    current_source_value: i(e.current_source_value)
  };
}
function E(t) {
  const e = d(t);
  return {
    valid: e.valid !== !1,
    message: i(e.message)
  };
}
function b(t, e) {
  const s = d(t), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = e(n));
  return a;
}
function be(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const s of t) {
    const a = d(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || e.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: B(a.field_paths)
    });
  }
  return e;
}
function he(t) {
  const e = d(t);
  return {
    available: g(e.available),
    title: i(e.title),
    summary: i(e.summary) || i(e.summary_markdown),
    rules: B(e.rules)
  };
}
function N(t) {
  return i(
    t.get("x-trace-id") || t.get("x-correlation-id") || t.get("traceparent")
  );
}
function ve(t) {
  const e = d(t), s = i(e.id), a = i(e.filename);
  return !s && !a ? null : {
    id: s || a || "attachment",
    kind: i(e.kind) || "reference",
    filename: a || s || "attachment",
    byte_size: f(e.byte_size),
    uploaded_at: i(e.uploaded_at),
    description: i(e.description),
    url: i(e.url)
  };
}
function ye(t) {
  return Array.isArray(t) ? t.map((e) => ve(e)).filter((e) => e !== null) : [];
}
function xe(t, e) {
  const s = d(t), a = d(s.kinds), r = {};
  for (const [n, o] of Object.entries(a)) {
    const l = f(o);
    n.trim() && (r[n.trim()] = l);
  }
  if (!Object.keys(r).length)
    for (const n of e)
      r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: f(s.total, e.length),
    kinds: r
  };
}
function $e(t) {
  return i(t) === "comment" ? "comment" : "event";
}
function we(t) {
  const e = d(t), s = i(e.id);
  return s ? {
    id: s,
    entry_type: $e(e.entry_type),
    title: i(e.title),
    body: i(e.body),
    action: i(e.action),
    actor_id: i(e.actor_id),
    author_id: i(e.author_id),
    created_at: i(e.created_at),
    kind: i(e.kind),
    metadata: d(e.metadata)
  } : null;
}
function ke(t) {
  const e = d(t), s = Array.isArray(e.items) ? e.items.map((a) => we(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(e.page, 1) || 1,
    per_page: f(e.per_page, 10) || 10,
    total: f(e.total, s.length),
    has_more: g(e.has_more),
    next_page: f(e.next_page)
  };
}
function Se(t) {
  const e = d(t), s = i(e.id), a = i(e.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(e.kind) || "review_feedback",
    created_at: i(e.created_at),
    author_id: i(e.author_id) || void 0
  };
}
function je(t, e) {
  const s = d(t), a = Array.isArray(s.comments) ? s.comments.map((n) => Se(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || e) || void 0;
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
function Ae(t) {
  const e = d(t), s = i(e.id), a = i(e.message);
  return !s || !a ? null : {
    id: s,
    category: i(e.category) === "style" ? "style" : "terminology",
    severity: i(e.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(e.field_path),
    message: a
  };
}
function Te(t, e) {
  const s = d(t);
  return {
    category: i(s.category) || e,
    enabled: g(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function H(t) {
  const e = d(t), s = d(e.summary), a = d(e.categories), r = {};
  for (const [o, l] of Object.entries(a))
    o.trim() && (r[o.trim()] = Te(l, o.trim()));
  const n = Array.isArray(e.findings) ? e.findings.map((o) => Ae(o)).filter((o) => o !== null) : [];
  return {
    enabled: g(e.enabled),
    summary: {
      finding_count: f(s.finding_count, n.length),
      warning_count: f(s.warning_count),
      blocker_count: f(s.blocker_count)
    },
    categories: r,
    findings: n,
    save_blocked: g(e.save_blocked),
    submit_blocked: g(e.submit_blocked)
  };
}
function Ee(t) {
  const e = d(t);
  return {
    id: i(e.id || e.assignment_id),
    status: i(e.status || e.queue_state),
    queue_state: i(e.queue_state || e.status),
    source_title: i(e.source_title),
    source_path: i(e.source_path),
    assignee_id: i(e.assignee_id),
    reviewer_id: i(e.reviewer_id),
    due_state: i(e.due_state),
    due_date: i(e.due_date),
    version: f(e.version || e.row_version),
    row_version: f(e.row_version || e.version),
    updated_at: i(e.updated_at)
  };
}
function U(t, e) {
  const s = d(t), a = d(e);
  return {
    glossary_matches: be(
      s.glossary_matches ?? a.glossary_matches
    ),
    style_guide_summary: he(
      s.style_guide_summary ?? a.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function x(t) {
  const e = d(t), s = {};
  for (const [a, r] of Object.entries(e)) {
    const n = W(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function Q(t, e, s, a, r, n) {
  if (Array.isArray(t.fields))
    return t.fields.map((l) => {
      const u = d(l), p = i(u.path);
      return p ? {
        path: p,
        label: i(u.label) || p,
        input_type: i(u.input_type) || "text",
        required: g(u.required),
        source_value: i(u.source_value) || e[p] || "",
        target_value: i(u.target_value) || s[p] || "",
        completeness: A(u.completeness ?? a[p]),
        drift: T(u.drift ?? r[p]),
        validation: E(u.validation ?? n[p]),
        glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((h) => h && typeof h == "object") : []
      } : null;
    }).filter((l) => !!l);
  const o = /* @__PURE__ */ new Set([
    ...Object.keys(e),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(o).sort().map((l) => ({
    path: l,
    label: l,
    input_type: "text",
    required: a[l]?.required === !0,
    source_value: e[l] || "",
    target_value: s[l] || "",
    completeness: a[l] ?? { required: !1, complete: !0, missing: !1 },
    drift: r[l] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: e[l] || ""
    },
    validation: n[l] ?? { valid: !0, message: "" },
    glossary_hits: []
  }));
}
function Re(t) {
  const e = d(t), s = d(e.data && typeof e.data == "object" ? e.data : t), a = k(s.source_fields), r = k(s.target_fields ?? s.fields), n = b(s.field_completeness, A), o = b(s.field_drift, T), l = b(s.field_validations, E), u = ye(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: f(
      s.assignment_row_version || s.assignment_version || d(s.translation_assignment).row_version || d(s.translation_assignment).version
    ),
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
    fields: Q(s, a, r, n, o, l),
    field_completeness: n,
    field_drift: o,
    field_validations: l,
    source_target_drift: d(s.source_target_drift),
    history: ke(s.history),
    attachments: u,
    attachment_summary: xe(s.attachment_summary, u),
    translation_assignment: Ee(s.translation_assignment),
    assist: U(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: je(s.review_feedback, s.last_rejection_reason),
    qa_results: H(s.qa_results),
    assignment_action_states: x(
      s.assignment_action_states ?? s.editor_actions ?? s.actions
    ),
    review_action_states: x(
      s.review_action_states ?? s.review_actions
    )
  };
}
function qe(t) {
  const e = d(t), s = d(e.data && typeof e.data == "object" ? e.data : t);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: k(s.fields),
    field_completeness: b(s.field_completeness, A),
    field_drift: b(s.field_drift, T),
    field_validations: b(s.field_validations, E),
    assist: U(s.assist, s),
    qa_results: H(s.qa_results),
    assignment_action_states: x(s.assignment_action_states),
    review_action_states: x(s.review_action_states)
  };
}
function R(t) {
  return Q(
    { fields: t.fields },
    t.source_fields,
    t.target_fields,
    t.field_completeness,
    t.field_drift,
    t.field_validations
  );
}
function q(t) {
  if (!t.assignment_action_states.submit_review?.enabled || t.qa_results.submit_blocked) return !1;
  for (const s of Object.values(t.field_completeness))
    if (s.required && s.missing) return !1;
  return !0;
}
function Ce(t) {
  return {
    detail: {
      ...t,
      fields: R(t)
    },
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: t.row_version,
    can_submit_review: q(t),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function D(t, e, s) {
  const a = e.trim();
  if (!a) return t;
  const r = {
    ...t.detail.target_fields,
    [a]: s.trim()
  }, n = t.detail.field_completeness[a]?.required === !0, o = {
    ...t.detail.field_completeness,
    [a]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, l = {
    ...t.detail.field_validations,
    [a]: {
      valid: !o[a].missing,
      message: o[a].missing ? t.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...t.detail,
    target_fields: r,
    field_completeness: o,
    field_validations: l
  };
  return u.fields = R(u), {
    ...t,
    detail: u,
    dirty_fields: {
      ...t.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: t.assignment_row_version,
    can_submit_review: q(u)
  };
}
function De(t) {
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      ...t.autosave,
      pending: !0
    }
  };
}
function Le(t, e) {
  const s = qe(e), a = {
    ...t.detail,
    row_version: s.row_version,
    target_fields: {
      ...t.detail.target_fields,
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
    ...t,
    detail: a,
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: q(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function Oe(t, e) {
  const s = d(d(d(e).error).metadata);
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: d(s.latest_server_state_record)
    }
  };
}
function L(t, e) {
  const s = new URL(t, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(e))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(t) ? s.toString() : `${s.pathname}${s.search}`;
}
class Pe extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
async function w(t, e) {
  const s = await M(t);
  return new Pe({
    message: s.message || await F(t, e),
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(t.headers.get("x-request-id")) || void 0,
    traceId: N(t.headers) || void 0
  });
}
async function Fe(t) {
  const e = await y(t, { method: "GET" }), s = i(e.headers.get("x-request-id")) || void 0, a = N(e.headers) || void 0;
  if (!e.ok) {
    const o = await M(e);
    return {
      status: o.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: o.message || `Failed to load assignment (${e.status})`,
      requestId: s,
      traceId: a,
      statusCode: e.status,
      errorCode: o.textCode
    };
  }
  const r = await e.json(), n = Re(r);
  return n.assignment_id ? {
    status: "ready",
    detail: n,
    requestId: s,
    traceId: a,
    statusCode: e.status
  } : {
    status: "empty",
    message: "Assignment detail payload was empty.",
    requestId: s,
    traceId: a,
    statusCode: e.status
  };
}
function Me(t) {
  return !t || t <= 0 ? "0 B" : t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
}
function G(t) {
  const e = i(t);
  if (!e) return "";
  const s = new Date(e);
  return Number.isNaN(s.getTime()) ? e : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function $(t) {
  const e = i(t).replace(/_/g, " ");
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function ze(t) {
  return i(t.status || t.translation_assignment.status || t.translation_assignment.queue_state);
}
function Ie(t) {
  return t === "review" || t === "in_review";
}
function Be(t) {
  const e = ze(t);
  return Ie(e) ? !0 : !!(t.review_action_states.approve?.enabled || t.review_action_states.reject?.enabled);
}
function Ne(t) {
  return !!t.assignment_action_states.archive?.enabled;
}
function He(t, e, s) {
  let a = "idle";
  return t?.autosave.conflict ? a = "conflict" : t?.autosave.pending ? a = "saving" : e ? a = "dirty" : s && (a = "saved"), {
    tone: ne(a),
    text: ie(a, s),
    state: a
  };
}
function Y(t) {
  const e = [
    t.requestId ? `Request ${c(t.requestId)}` : "",
    t.traceId ? `Trace ${c(t.traceId)}` : "",
    t.errorCode ? `Code ${c(t.errorCode)}` : ""
  ].filter(Boolean);
  return e.length ? `<p class="mt-3 text-xs text-gray-500">${e.join(" · ")}</p>` : "";
}
function Ue(t) {
  return t ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${t.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : t.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(t.kind)}" role="status" aria-live="polite">
      ${c(t.message)}
    </div>
  ` : "";
}
function Qe(t) {
  const e = t.qa_results;
  if (!e.enabled || e.summary.finding_count <= 0) return "";
  const s = e.summary.blocker_count > 0 ? _("error") : _("success"), a = e.summary.blocker_count > 0 ? `Blockers ${e.summary.blocker_count}` : "No blockers";
  return `
    <span class="${_("warning")}">Warnings ${e.summary.warning_count}</span>
    <span class="${s}">${a}</span>
  `;
}
function Ge(t, e) {
  return t.summary.blocker_count > 0 ? {
    kind: "conflict",
    message: `Draft saved with ${t.summary.blocker_count} QA blocker${t.summary.blocker_count === 1 ? "" : "s"} and ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"}. Submit remains blocked.`,
    lastSaved: e ? `Autosaved · ${t.summary.blocker_count} blocker${t.summary.blocker_count === 1 ? "" : "s"} remain` : "Draft saved"
  } : t.summary.warning_count > 0 ? {
    kind: "success",
    message: `Draft saved with ${t.summary.warning_count} QA warning${t.summary.warning_count === 1 ? "" : "s"}. Submit remains available.`,
    lastSaved: e ? `Autosaved · ${t.summary.warning_count} warning${t.summary.warning_count === 1 ? "" : "s"}` : "Draft saved"
  } : {
    kind: "success",
    message: "Draft saved.",
    lastSaved: e ? "Draft saved automatically" : "Draft saved"
  };
}
function Ye(t) {
  const e = t.qa_results;
  return e.submit_blocked ? `Resolve ${e.summary.blocker_count} QA blocker${e.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${e.summary.warning_count} warning${e.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function Ve(t, e) {
  const s = t.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return e === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function We() {
  return `
    <section class="${J} p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-gray-500">Loading translation assignment…</p>
    </section>
  `;
}
function O(t, e) {
  return `
    <section class="${Z} p-8 text-center shadow-sm">
      <h2 class="${ee}">${c(t)}</h2>
      <p class="${te} mt-2">${c(e)}</p>
    </section>
  `;
}
function P(t, e, s) {
  return `
    <section class="${se} p-8 shadow-sm">
      <h2 class="${ae}">${c(t)}</h2>
      <p class="${re} mt-2">${c(e)}</p>
      ${Y(s)}
    </section>
  `;
}
function Ke(t, e, s, a, r, n = "") {
  const o = t.assignment_action_states.submit_review, l = !o?.enabled || r || a || t.qa_results.submit_blocked, u = r || !s, p = (t.source_locale || "source").toUpperCase(), h = (t.target_locale || "target").toUpperCase(), v = t.translation_assignment, V = t.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : o?.reason || "";
  return `
    <section class="${S} p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${oe}">Assignment editor</p>
          <div>
            <h1 class="${ce}">${c(v.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${c(p)} to ${c(h)} • ${c($(t.status || v.status || "draft"))} • Priority ${c(t.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${c(v.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${c(v.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${e.tone}" data-autosave-state="${m(e.state)}">${c(e.text)}</span>
            ${Qe(t)}
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
            class="${z}"
            data-action="submit-review"
            title="${m(V)}"
            ${l ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : o?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function Xe(t) {
  return t.drift.changed ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(t.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${c(t.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${c(t.drift.current_source_value || t.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function Je(t) {
  const e = Array.isArray(t.glossary_hits) ? t.glossary_hits : [];
  return e.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${e.map((s) => `
        <span class="${ge}">
          <span class="${pe}">${c(i(s.term))}</span>
          → ${c(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function Ze(t) {
  return `
    <section class="space-y-4">
      ${t.fields.map((e) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(e.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${c(e.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${c(e.path)}${e.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${I}"
              data-copy-source="${m(e.path)}"
              aria-label="Copy source text to translation field for ${m(e.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${c(e.source_value || "No source text")}</div>
            </div>
            <div class="rounded-xl border ${e.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(e.path)}">Translation</label>
              ${e.input_type === "textarea" ? `<textarea id="editor-field-${m(e.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}">${c(e.target_value)}</textarea>` : `<input id="editor-field-${m(e.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}" value="${m(e.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${e.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${e.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${e.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${e.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(e.path)}">${c(e.validation.message || "Validation error")}</p>`}
              ${Xe(e)}
              ${Je(e)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function et(t) {
  const e = t.assist.glossary_matches, s = t.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${e.length ? `<ul class="mt-3 space-y-2">${e.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${c(a.term)}</strong> → ${c(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${c(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
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
function tt(t) {
  const e = t.history.items.map((s) => ({
    id: s.id,
    title: s.title || $(s.entry_type),
    body: s.body || "",
    created_at: s.created_at,
    badge: s.kind === "review_feedback" ? "Reviewer feedback" : s.entry_type === "comment" ? "Comment" : "Activity",
    tone: s.kind === "review_feedback" ? "review" : "event"
  }));
  return t.qa_results.enabled && t.qa_results.summary.finding_count > 0 && e.push({
    id: "timeline:qa-summary",
    title: "Current QA findings",
    body: `${t.qa_results.summary.blocker_count} blocker${t.qa_results.summary.blocker_count === 1 ? "" : "s"} and ${t.qa_results.summary.warning_count} warning${t.qa_results.summary.warning_count === 1 ? "" : "s"} are active on this draft.`,
    created_at: t.translation_assignment.updated_at || t.due_date || "",
    badge: t.qa_results.submit_blocked ? "Submit blocked" : "Warnings visible",
    tone: "qa"
  }), t.last_rejection_reason && !e.some((s) => s.body === t.last_rejection_reason) && e.push({
    id: "timeline:last-rejection-reason",
    title: "Reviewer feedback",
    body: t.last_rejection_reason,
    created_at: t.translation_assignment.updated_at || "",
    badge: "Reviewer feedback",
    tone: "review"
  }), e.sort((s, a) => {
    const r = s.created_at ? Date.parse(s.created_at) : 0;
    return (a.created_at ? Date.parse(a.created_at) : 0) - r;
  });
}
function st(t) {
  const e = t.qa_results;
  if (!e.enabled)
    return "";
  const s = e.findings.filter((n) => n.severity === "blocker"), a = e.findings.filter((n) => n.severity !== "blocker"), r = (n, o) => {
    if (!n.length)
      return "";
    const l = _e(o);
    return `
      <section data-qa-group="${m(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((u) => `
          <li class="${l.container}">
            <div class="flex items-center justify-between gap-3">
              <strong>${c($(u.category))}</strong>
              <span class="${l.badge}">${c(u.severity)}</span>
            </div>
            <p class="mt-2">${c(u.message)}</p>
            ${u.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${c(u.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    `;
  };
  return `
    <section class="${le(e.submit_blocked)}">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${e.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${e.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="${e.submit_blocked ? _("error") : _("neutral")}">
          ${e.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="${_("warning")}">Warnings ${e.summary.warning_count}</span>
        <span class="${_("error")}">Blockers ${e.summary.blocker_count}</span>
      </div>
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${r(s, "blocker")}${r(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function at(t, e) {
  const s = t.review_action_states.approve, a = t.review_action_states.reject;
  return Be(t) ? `
    <section
      class="rounded-xl border border-gray-200 bg-white p-5"
      data-editor-panel="review-actions"
      aria-label="Review actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Review actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        ${[
    {
      key: "approve",
      label: "Approve",
      state: s,
      tone: "border-emerald-300 text-emerald-700"
    },
    {
      key: "reject",
      label: "Request changes",
      state: a,
      tone: "border-rose-300 text-rose-700"
    }
  ].map((n) => {
    const o = !n.state?.enabled || e;
    return `
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${n.tone} ${o ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
              data-action="${m(n.key)}"
              title="${m(n.state?.reason || "")}"
              ${o ? 'disabled aria-disabled="true"' : ""}
            >
              ${c(n.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function rt(t, e) {
  return t ? `
    <div class="${ue}" data-reject-modal="true">
      <section class="${me}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
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
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${c(t.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${c(t.comment)}</textarea>
        </label>
        ${t.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${c(t.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${j}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${fe}" data-action="confirm-reject" ${e ? 'disabled aria-disabled="true"' : ""}>${e ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function it(t, e) {
  if (!Ne(t))
    return "";
  const s = t.assignment_action_states.archive, a = !s?.enabled || e;
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
function nt(t) {
  return `
    <section class="${S} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${t.attachment_summary.total}</span>
      </div>
      ${t.attachments.length ? `<ul class="mt-4 space-y-3">${t.attachments.map((e) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${c(e.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${c(e.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${c(Me(e.byte_size))}</span>
              </div>
              ${e.description ? `<p class="mt-2 text-xs text-gray-500">${c(e.description)}</p>` : ""}
              ${e.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${c(G(e.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function ot(t) {
  const e = t.history, s = tt(t);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${e.page} of ${Math.max(1, Math.ceil(e.total / Math.max(1, e.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => {
    const r = de(a.tone);
    return `
            <li class="${r.container}" data-history-entry="${m(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="${r.title}">${c(a.title)}</p>
                  <span class="${r.badge}">${c(a.badge)}</span>
                </div>
                <span class="${r.time}">${c(G(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${c(a.body)}</p>` : ""}
            </li>
          `;
  }).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${C}" data-history-prev="true" ${e.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${C}" data-history-next="true" ${e.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function ct(t, e, s = {}, a = {}) {
  if (t.status === "loading") return We();
  if (t.status === "empty") return O("Assignment unavailable", t.message || "No assignment detail payload was returned.");
  if (t.status === "error") return P("Editor unavailable", t.message || "Unable to load the assignment editor.", t);
  if (t.status === "conflict") return P("Editor conflict", t.message || "A newer version of this assignment is available.", t);
  const r = e?.detail || t.detail;
  if (!r) return O("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(e && Object.keys(e.dirty_fields).length), o = He(e || null, n, a.lastSavedMessage || ""), l = e?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${Ue(a.feedback || null)}
      ${Ke(r, o, n, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${l ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${z}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${Ze(r)}
        </div>
        <aside class="order-2 space-y-4 sm:space-y-6">
          ${at(r, a.submitting === !0)}
          ${it(r, a.submitting === !0)}
          ${st(r)}
          ${et(r)}
          ${nt(r)}
          ${ot(r)}
          ${Y(t)}
        </aside>
      </div>
      ${rt(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function lt(t, e, s, a = {}, r = {}) {
  t.innerHTML = ct(e, s, a, r);
}
class dt {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.focusTrapCleanup = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase,
      actionEndpointBase: e.actionEndpointBase,
      basePath: e.basePath || "/admin"
    };
  }
  mount(e) {
    this.container = e, this.keyboardHandler = (s) => {
      (s.ctrlKey || s.metaKey) && s.key === "s" && (s.preventDefault(), this.saveDirtyFields(!1)), s.key === "Escape" && this.rejectDraft && this.closeRejectDialog();
    }, document.addEventListener("keydown", this.keyboardHandler), this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render();
    const s = e ? L(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint;
    this.loadState = await Fe(s), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = Ce(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (lt(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft
    }), this.attachEventListeners(), K(this.container));
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (s) => {
        const a = s.currentTarget, r = a.dataset.fieldInput || "";
        this.editorState = D(this.editorState, r, a.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.copySource || "", a = this.editorState?.detail.fields.find((r) => r.path === s);
        !a || !this.editorState || (this.editorState = D(this.editorState, s, a.source_value), this.scheduleAutosave(), this.render());
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
      const s = e.currentTarget;
      this.rejectDraft && (this.rejectDraft = { ...this.rejectDraft, reason: s.value, error: "" });
    }), this.container.querySelector('[data-reject-comment="true"]')?.addEventListener("input", (e) => {
      const s = e.currentTarget;
      this.rejectDraft && (this.rejectDraft = { ...this.rejectDraft, comment: s.value });
    }), this.container.querySelector('[data-action="reload-server-state"]')?.addEventListener("click", () => {
      this.feedback = { kind: "conflict", message: "Reloaded the latest server draft." }, this.load(this.editorState?.detail.history.page);
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
    this.saving = !0, this.editorState = De(this.editorState), this.render();
    const s = this.editorState.detail, a = await y(L(`${this.config.variantEndpointBase}/${encodeURIComponent(s.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!a.ok) {
      if (a.status === 409) {
        const l = await a.json().catch(async () => ({ error: { message: await F(a, "Autosave conflict") } }));
        return this.editorState = Oe(this.editorState, l), this.feedback = { kind: "conflict", message: "Autosave conflict detected. Reload the latest server draft." }, this.saving = !1, this.render(), !1;
      }
      const o = await w(a, "Failed to save draft");
      return this.feedback = { kind: "error", message: o.message }, this.saving = !1, this.render(), !1;
    }
    const r = await a.json();
    this.editorState = Le(this.editorState, r);
    const n = Ge(this.editorState.detail.qa_results, e);
    return this.lastSavedMessage = n.lastSaved, (!e || n.kind === "conflict") && (this.feedback = { kind: n.kind, message: n.message }), this.saving = !1, this.render(), !0;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    const e = this.editorState.detail.assignment_action_states.submit_review;
    if (!e?.enabled) {
      this.feedback = { kind: "error", message: e?.reason || "Submit for review is unavailable." }, this.render();
      return;
    }
    if (!this.editorState.can_submit_review) {
      const o = Object.entries(this.editorState.detail.field_completeness).filter(([, l]) => l.required && l.missing).map(([l]) => l);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? Ye(this.editorState.detail) : o.length ? `Complete required fields before submitting for review: ${o.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const s = this.editorState.detail.translation_assignment.version, a = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: s }
    });
    if (!a.ok) {
      const o = await w(a, "Failed to submit assignment");
      this.feedback = {
        kind: o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: o.message
      }, this.submitting = !1, this.render();
      return;
    }
    const r = await a.json(), n = i(d(r).data && d(d(r).data).status);
    this.feedback = {
      kind: "success",
      message: Ve(this.editorState.detail, n)
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e, s) {
    if (!this.editorState || this.submitting) return;
    const a = this.editorState.detail, r = e === "archive" ? a.assignment_action_states.archive : a.review_action_states[e];
    if (!r?.enabled) {
      this.feedback = { kind: "error", message: r?.reason || `${$(e)} is unavailable.` }, this.render();
      return;
    }
    const n = {
      expected_version: a.translation_assignment.version
    };
    if (e === "reject") {
      const l = s?.reason || "";
      if (!l || !l.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      n.reason = l.trim(), s?.comment?.trim() && (n.comment = s.comment.trim());
    }
    this.submitting = !0, this.render();
    const o = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(a.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: n
    });
    if (!o.ok) {
      const l = await w(o, `Failed to ${e} assignment`);
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
    const s = this.container?.querySelector('[data-reject-modal] [role="dialog"]');
    s && (this.focusTrapCleanup = X(s, () => this.closeRejectDialog()));
  }
  closeRejectDialog() {
    this.focusTrapCleanup && (this.focusTrapCleanup(), this.focusTrapCleanup = null), this.rejectDraft = null, this.render();
  }
  async confirmReject() {
    if (!this.rejectDraft)
      return;
    const e = this.rejectDraft.reason.trim(), s = this.rejectDraft.comment.trim();
    if (!e) {
      this.rejectDraft = { ...this.rejectDraft, error: "Reject reason is required." }, this.render();
      return;
    }
    await this.runReviewAction("reject", { reason: e, comment: s });
  }
}
async function _t(t, e) {
  const s = new dt(e);
  return s.mount(t), s;
}
export {
  Pe as TranslationEditorRequestError,
  dt as TranslationEditorScreen,
  Oe as applyEditorAutosaveConflict,
  D as applyEditorFieldChange,
  Le as applyEditorUpdateResponse,
  Ce as createTranslationEditorState,
  Fe as fetchTranslationEditorDetailState,
  _t as initTranslationEditorPage,
  De as markEditorAutosavePending,
  Re as normalizeAssignmentEditorDetail,
  U as normalizeEditorAssistPayload,
  qe as normalizeEditorUpdateResponse,
  lt as renderTranslationEditorPage,
  ct as renderTranslationEditorState
};
//# sourceMappingURL=index.js.map
