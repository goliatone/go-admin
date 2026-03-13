import { n as Q } from "../chunks/index-Dvt9oAtQ.js";
import { a as o, e as m } from "../chunks/html-Br-oQr7i.js";
import { h as y, r as z } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as F } from "../toast/error-helpers.js";
function c(t) {
  return t && typeof t == "object" ? t : {};
}
function i(t) {
  return typeof t == "string" ? t.trim() : "";
}
function f(t) {
  return t === !0;
}
function g(t, e = 0) {
  return typeof t == "number" && Number.isFinite(t) ? t : e;
}
function $(t) {
  const e = c(t), s = {};
  for (const [r, a] of Object.entries(e)) {
    const n = i(a);
    r.trim() && (s[r.trim()] = n);
  }
  return s;
}
function O(t) {
  return Array.isArray(t) ? t.map((e) => i(e)).filter(Boolean) : [];
}
function k(t) {
  const e = c(t);
  return {
    required: f(e.required),
    complete: f(e.complete),
    missing: f(e.missing)
  };
}
function S(t) {
  const e = c(t), s = i(e.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: f(e.changed),
    comparison_mode: s,
    previous_source_value: i(e.previous_source_value),
    current_source_value: i(e.current_source_value)
  };
}
function j(t) {
  const e = c(t);
  return {
    valid: e.valid !== !1,
    message: i(e.message)
  };
}
function p(t, e) {
  const s = c(t), r = {};
  for (const [a, n] of Object.entries(s))
    a.trim() && (r[a.trim()] = e(n));
  return r;
}
function G(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const s of t) {
    const r = c(s), a = i(r.term), n = i(r.preferred_translation);
    !a || !n || e.push({
      term: a,
      preferred_translation: n,
      notes: i(r.notes) || void 0,
      field_paths: O(r.field_paths)
    });
  }
  return e;
}
function V(t) {
  const e = c(t);
  return {
    available: f(e.available),
    title: i(e.title),
    summary: i(e.summary) || i(e.summary_markdown),
    rules: O(e.rules)
  };
}
function B(t) {
  return i(
    t.get("x-trace-id") || t.get("x-correlation-id") || t.get("traceparent")
  );
}
function W(t) {
  const e = c(t), s = i(e.id), r = i(e.filename);
  return !s && !r ? null : {
    id: s || r || "attachment",
    kind: i(e.kind) || "reference",
    filename: r || s || "attachment",
    byte_size: g(e.byte_size),
    uploaded_at: i(e.uploaded_at),
    description: i(e.description),
    url: i(e.url)
  };
}
function K(t) {
  return Array.isArray(t) ? t.map((e) => W(e)).filter((e) => e !== null) : [];
}
function Y(t, e) {
  const s = c(t), r = c(s.kinds), a = {};
  for (const [n, d] of Object.entries(r)) {
    const l = g(d);
    n.trim() && (a[n.trim()] = l);
  }
  if (!Object.keys(a).length)
    for (const n of e)
      a[n.kind] = (a[n.kind] || 0) + 1;
  return {
    total: g(s.total, e.length),
    kinds: a
  };
}
function J(t) {
  return i(t) === "comment" ? "comment" : "event";
}
function X(t) {
  const e = c(t), s = i(e.id);
  return s ? {
    id: s,
    entry_type: J(e.entry_type),
    title: i(e.title),
    body: i(e.body),
    action: i(e.action),
    actor_id: i(e.actor_id),
    author_id: i(e.author_id),
    created_at: i(e.created_at),
    kind: i(e.kind),
    metadata: c(e.metadata)
  } : null;
}
function Z(t) {
  const e = c(t), s = Array.isArray(e.items) ? e.items.map((r) => X(r)).filter((r) => r !== null) : [];
  return {
    items: s,
    page: g(e.page, 1) || 1,
    per_page: g(e.per_page, 10) || 10,
    total: g(e.total, s.length),
    has_more: f(e.has_more),
    next_page: g(e.next_page)
  };
}
function ee(t) {
  const e = c(t), s = i(e.id), r = i(e.body);
  return !s && !r ? null : {
    id: s || r || "review-feedback",
    body: r,
    kind: i(e.kind) || "review_feedback",
    created_at: i(e.created_at),
    author_id: i(e.author_id) || void 0
  };
}
function te(t, e) {
  const s = c(t), r = Array.isArray(s.comments) ? s.comments.map((n) => ee(n)).filter((n) => n !== null) : [], a = i(s.last_rejection_reason || e) || void 0;
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
function se(t) {
  const e = c(t), s = i(e.id), r = i(e.message);
  return !s || !r ? null : {
    id: s,
    category: i(e.category) === "style" ? "style" : "terminology",
    severity: i(e.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(e.field_path),
    message: r
  };
}
function re(t, e) {
  const s = c(t);
  return {
    category: i(s.category) || e,
    enabled: f(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: g(s.finding_count),
    warning_count: g(s.warning_count),
    blocker_count: g(s.blocker_count)
  };
}
function I(t) {
  const e = c(t), s = c(e.summary), r = c(e.categories), a = {};
  for (const [d, l] of Object.entries(r))
    d.trim() && (a[d.trim()] = re(l, d.trim()));
  const n = Array.isArray(e.findings) ? e.findings.map((d) => se(d)).filter((d) => d !== null) : [];
  return {
    enabled: f(e.enabled),
    summary: {
      finding_count: g(s.finding_count, n.length),
      warning_count: g(s.warning_count),
      blocker_count: g(s.blocker_count)
    },
    categories: a,
    findings: n,
    save_blocked: f(e.save_blocked),
    submit_blocked: f(e.submit_blocked)
  };
}
function ae(t) {
  const e = c(t);
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
    version: g(e.version || e.row_version),
    row_version: g(e.row_version || e.version),
    updated_at: i(e.updated_at)
  };
}
function M(t, e) {
  const s = c(t), r = c(e);
  return {
    glossary_matches: G(
      s.glossary_matches ?? r.glossary_matches
    ),
    style_guide_summary: V(
      s.style_guide_summary ?? r.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((a) => a && typeof a == "object") : []
  };
}
function v(t) {
  const e = c(t), s = {};
  for (const [r, a] of Object.entries(e)) {
    const n = Q(a);
    !n || !r.trim() || (s[r.trim()] = n);
  }
  return s;
}
function P(t, e, s, r, a, n) {
  if (Array.isArray(t.fields))
    return t.fields.map((l) => {
      const u = c(l), b = i(u.path);
      return b ? {
        path: b,
        label: i(u.label) || b,
        input_type: i(u.input_type) || "text",
        required: f(u.required),
        source_value: i(u.source_value) || e[b] || "",
        target_value: i(u.target_value) || s[b] || "",
        completeness: k(u.completeness ?? r[b]),
        drift: S(u.drift ?? a[b]),
        validation: j(u.validation ?? n[b]),
        glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((_) => _ && typeof _ == "object") : []
      } : null;
    }).filter((l) => !!l);
  const d = /* @__PURE__ */ new Set([
    ...Object.keys(e),
    ...Object.keys(s),
    ...Object.keys(r),
    ...Object.keys(a),
    ...Object.keys(n)
  ]);
  return Array.from(d).sort().map((l) => ({
    path: l,
    label: l,
    input_type: "text",
    required: r[l]?.required === !0,
    source_value: e[l] || "",
    target_value: s[l] || "",
    completeness: r[l] ?? { required: !1, complete: !0, missing: !1 },
    drift: a[l] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: e[l] || ""
    },
    validation: n[l] ?? { valid: !0, message: "" },
    glossary_hits: []
  }));
}
function ie(t) {
  const e = c(t), s = c(e.data && typeof e.data == "object" ? e.data : t), r = $(s.source_fields), a = $(s.target_fields ?? s.fields), n = p(s.field_completeness, k), d = p(s.field_drift, S), l = p(s.field_validations, j), u = K(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: g(
      s.assignment_row_version || s.assignment_version || c(s.translation_assignment).row_version || c(s.translation_assignment).version
    ),
    variant_id: i(s.variant_id),
    family_id: i(s.family_id),
    entity_type: i(s.entity_type) || void 0,
    source_locale: i(s.source_locale) || void 0,
    target_locale: i(s.target_locale) || void 0,
    status: i(s.status) || void 0,
    priority: i(s.priority) || void 0,
    due_date: i(s.due_date) || void 0,
    row_version: g(s.row_version || s.version),
    source_fields: r,
    target_fields: a,
    fields: P(s, r, a, n, d, l),
    field_completeness: n,
    field_drift: d,
    field_validations: l,
    source_target_drift: c(s.source_target_drift),
    history: Z(s.history),
    attachments: u,
    attachment_summary: Y(s.attachment_summary, u),
    translation_assignment: ae(s.translation_assignment),
    assist: M(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: te(s.review_feedback, s.last_rejection_reason),
    qa_results: I(s.qa_results),
    assignment_action_states: v(
      s.assignment_action_states ?? s.editor_actions ?? s.actions
    ),
    review_action_states: v(
      s.review_action_states ?? s.review_actions
    )
  };
}
function ne(t) {
  const e = c(t), s = c(e.data && typeof e.data == "object" ? e.data : t);
  return {
    variant_id: i(s.variant_id),
    row_version: g(s.row_version || s.version),
    fields: $(s.fields),
    field_completeness: p(s.field_completeness, k),
    field_drift: p(s.field_drift, S),
    field_validations: p(s.field_validations, j),
    assist: M(s.assist, s),
    qa_results: I(s.qa_results),
    assignment_action_states: v(s.assignment_action_states),
    review_action_states: v(s.review_action_states)
  };
}
function q(t) {
  return P(
    { fields: t.fields },
    t.source_fields,
    t.target_fields,
    t.field_completeness,
    t.field_drift,
    t.field_validations
  );
}
function A(t) {
  if (!t.assignment_action_states.submit_review?.enabled || t.qa_results.submit_blocked) return !1;
  for (const s of Object.values(t.field_completeness))
    if (s.required && s.missing) return !1;
  return !0;
}
function oe(t) {
  return {
    detail: {
      ...t,
      fields: q(t)
    },
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: t.row_version,
    can_submit_review: A(t),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function D(t, e, s) {
  const r = e.trim();
  if (!r) return t;
  const a = {
    ...t.detail.target_fields,
    [r]: s.trim()
  }, n = t.detail.field_completeness[r]?.required === !0, d = {
    ...t.detail.field_completeness,
    [r]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, l = {
    ...t.detail.field_validations,
    [r]: {
      valid: !d[r].missing,
      message: d[r].missing ? t.detail.field_validations[r]?.message || `${r} is required` : ""
    }
  }, u = {
    ...t.detail,
    target_fields: a,
    field_completeness: d,
    field_validations: l
  };
  return u.fields = q(u), {
    ...t,
    detail: u,
    dirty_fields: {
      ...t.dirty_fields,
      [r]: s.trim()
    },
    assignment_row_version: t.assignment_row_version,
    can_submit_review: A(u)
  };
}
function de(t) {
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      ...t.autosave,
      pending: !0
    }
  };
}
function le(t, e) {
  const s = ne(e), r = {
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
  return r.fields = q(r), {
    ...t,
    detail: r,
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: A(r),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function ce(t, e) {
  const s = c(c(c(e).error).metadata);
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: c(s.latest_server_state_record)
    }
  };
}
function C(t, e) {
  const s = new URL(t, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [r, a] of Object.entries(e))
    a == null || `${a}`.trim() === "" || s.searchParams.set(r, String(a));
  return /^https?:\/\//i.test(t) ? s.toString() : `${s.pathname}${s.search}`;
}
class ue extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
async function w(t, e) {
  const s = await F(t);
  return new ue({
    message: s.message || await z(t, e),
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(t.headers.get("x-request-id")) || void 0,
    traceId: B(t.headers) || void 0
  });
}
async function me(t) {
  const e = await y(t, { method: "GET" }), s = i(e.headers.get("x-request-id")) || void 0, r = B(e.headers) || void 0;
  if (!e.ok) {
    const d = await F(e);
    return {
      status: d.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: d.message || `Failed to load assignment (${e.status})`,
      requestId: s,
      traceId: r,
      statusCode: e.status,
      errorCode: d.textCode
    };
  }
  const a = await e.json(), n = ie(a);
  return n.assignment_id ? {
    status: "ready",
    detail: n,
    requestId: s,
    traceId: r,
    statusCode: e.status
  } : {
    status: "empty",
    message: "Assignment detail payload was empty.",
    requestId: s,
    traceId: r,
    statusCode: e.status
  };
}
function ge(t) {
  return !t || t <= 0 ? "0 B" : t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
}
function N(t) {
  const e = i(t);
  if (!e) return "";
  const s = new Date(e);
  return Number.isNaN(s.getTime()) ? e : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function x(t) {
  const e = i(t).replace(/_/g, " ");
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function fe(t) {
  return i(t.status || t.translation_assignment.status || t.translation_assignment.queue_state);
}
function be(t) {
  return t === "review" || t === "in_review";
}
function pe(t) {
  const e = fe(t);
  return be(e) ? !0 : !!(t.review_action_states.approve?.enabled || t.review_action_states.reject?.enabled);
}
function _e(t) {
  return !!t.assignment_action_states.archive?.enabled;
}
function he(t, e, s) {
  return t?.autosave.conflict ? { tone: "bg-rose-100 text-rose-700", text: "Conflict detected", state: "conflict" } : t?.autosave.pending ? { tone: "bg-amber-100 text-amber-700", text: "Autosaving draft…", state: "saving" } : e ? { tone: "bg-gray-100 text-gray-700", text: "Unsaved changes", state: "dirty" } : s ? { tone: "bg-emerald-100 text-emerald-700", text: s, state: "saved" } : { tone: "bg-gray-100 text-gray-700", text: "No pending changes", state: "idle" };
}
function U(t) {
  const e = [
    t.requestId ? `Request ${o(t.requestId)}` : "",
    t.traceId ? `Trace ${o(t.traceId)}` : "",
    t.errorCode ? `Code ${o(t.errorCode)}` : ""
  ].filter(Boolean);
  return e.length ? `<p class="mt-3 text-xs text-gray-500">${e.join(" · ")}</p>` : "";
}
function ye(t) {
  return t ? `
    <div class="rounded-2xl border px-4 py-3 text-sm font-medium ${t.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : t.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(t.kind)}" role="status" aria-live="polite">
      ${o(t.message)}
    </div>
  ` : "";
}
function ve(t) {
  const e = t.qa_results;
  return !e.enabled || e.summary.finding_count <= 0 ? "" : `
    <span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Warnings ${e.summary.warning_count}</span>
    <span class="rounded-full ${e.summary.blocker_count > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"} px-3 py-1 font-medium">
      ${e.summary.blocker_count > 0 ? `Blockers ${e.summary.blocker_count}` : "No blockers"}
    </span>
  `;
}
function xe(t, e) {
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
function we(t) {
  const e = t.qa_results;
  return e.submit_blocked ? `Resolve ${e.summary.blocker_count} QA blocker${e.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${e.summary.warning_count} warning${e.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function $e(t, e) {
  const s = t.qa_results, r = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return e === "approved" ? `Submitted and auto-approved.${r}` : `Submitted for review.${r}`;
}
function ke() {
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-gray-500">Loading translation assignment…</p>
    </section>
  `;
}
function T(t, e) {
  return `
    <section class="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
      <h2 class="text-lg font-semibold text-gray-900">${o(t)}</h2>
      <p class="mt-2 text-sm text-gray-500">${o(e)}</p>
    </section>
  `;
}
function L(t, e, s) {
  return `
    <section class="rounded-xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <h2 class="text-lg font-semibold text-rose-900">${o(t)}</h2>
      <p class="mt-2 text-sm text-rose-700">${o(e)}</p>
      ${U(s)}
    </section>
  `;
}
function Se(t, e, s, r, a, n = "") {
  const d = t.assignment_action_states.submit_review, l = !d?.enabled || a || r || t.qa_results.submit_blocked, u = a || !s, b = (t.source_locale || "source").toUpperCase(), _ = (t.target_locale || "target").toUpperCase(), h = t.translation_assignment, H = t.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : d?.reason || "", E = n ? `${n}/queue` : "", R = n && t.family_id ? `${n}/families/${encodeURIComponent(t.family_id)}` : "";
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <nav class="mb-4 flex items-center gap-2 text-sm text-gray-500" aria-label="Breadcrumb">
        ${E ? `<a href="${m(E)}" class="hover:text-gray-900 hover:underline">Queue</a>` : "<span>Queue</span>"}
        <span aria-hidden="true">›</span>
        ${R ? `<a href="${m(R)}" class="hover:text-gray-900 hover:underline">${o(t.family_id)}</a>` : `<span>${o(t.family_id || "Family")}</span>`}
        <span aria-hidden="true">›</span>
        <span class="font-medium text-gray-900">${o(t.target_locale?.toUpperCase() || "Editor")}</span>
      </nav>
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Assignment editor</p>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-gray-900">${o(h.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${o(b)} to ${o(_)} • ${o(x(t.status || h.status || "draft"))} • Priority ${o(t.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${o(h.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${o(h.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${e.tone}" data-autosave-state="${m(e.state)}">${o(e.text)}</span>
            ${ve(t)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 ${u ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
            data-action="save-draft"
            ${u ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white ${l ? "cursor-not-allowed opacity-60" : "hover:bg-gray-800"}"
            data-action="submit-review"
            title="${m(H)}"
            ${l ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Submitting…" : d?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function je(t) {
  return t.drift.changed ? `
    <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(t.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${o(t.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${o(t.drift.current_source_value || t.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function qe(t) {
  const e = Array.isArray(t.glossary_hits) ? t.glossary_hits : [];
  return e.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${e.map((s) => `
        <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          ${o(i(s.term))} → ${o(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function Ae(t) {
  return `
    <section class="space-y-4">
      ${t.fields.map((e) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(e.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${o(e.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${o(e.path)}${e.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
              data-copy-source="${m(e.path)}"
              aria-label="Copy source text to translation field for ${m(e.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${o(e.source_value || "No source text")}</div>
            </div>
            <div class="rounded-2xl border ${e.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(e.path)}">Translation</label>
              ${e.input_type === "textarea" ? `<textarea id="editor-field-${m(e.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}">${o(e.target_value)}</textarea>` : `<input id="editor-field-${m(e.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}" value="${m(e.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${e.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${e.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${e.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${e.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(e.path)}">${o(e.validation.message || "Validation error")}</p>`}
              ${je(e)}
              ${qe(e)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function Ee(t) {
  const e = t.assist.glossary_matches, s = t.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${e.length ? `<ul class="mt-3 space-y-2">${e.map((r) => `
                <li class="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${o(r.term)}</strong> → ${o(r.preferred_translation)}
                  ${r.notes ? `<p class="mt-1 text-xs text-gray-500">${o(r.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3">
                <p class="text-sm font-semibold text-gray-900">${o(s.title)}</p>
                <p class="mt-2 text-sm text-gray-700">${o(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                  ${s.rules.map((r) => `<li>• ${o(r)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-gray-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function Re(t) {
  const e = t.history.items.map((s) => ({
    id: s.id,
    title: s.title || x(s.entry_type),
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
  }), e.sort((s, r) => {
    const a = s.created_at ? Date.parse(s.created_at) : 0;
    return (r.created_at ? Date.parse(r.created_at) : 0) - a;
  });
}
function De(t) {
  const e = t.qa_results;
  if (!e.enabled)
    return "";
  const s = e.findings.filter((n) => n.severity === "blocker"), r = e.findings.filter((n) => n.severity !== "blocker"), a = (n, d) => n.length ? `
      <section data-qa-group="${m(d === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${d === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${d === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((l) => `
          <li class="rounded-2xl border ${d === "blocker" ? "border-rose-200 bg-white text-rose-900" : "border-amber-200 bg-white text-amber-900"} px-3 py-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <strong>${o(x(l.category))}</strong>
              <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${d === "blocker" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}">${o(l.severity)}</span>
            </div>
            <p class="mt-2">${o(l.message)}</p>
            ${l.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${o(l.field_path)}</p>` : ""}
          </li>
        `).join("")}</ol>
      </section>
    ` : "";
  return `
    <section class="rounded-xl border ${e.submit_blocked ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-white"} p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">QA checks</h2>
          <p class="mt-1 text-sm ${e.submit_blocked ? "text-rose-700" : "text-gray-600"}">
            ${e.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="rounded-full ${e.submit_blocked ? "bg-rose-100 text-rose-700" : "bg-gray-100 text-gray-700"} px-3 py-1 text-xs font-semibold">
          ${e.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Warnings ${e.summary.warning_count}</span>
        <span class="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-800">Blockers ${e.summary.blocker_count}</span>
      </div>
      ${s.length || r.length ? `<div class="mt-4 space-y-4">${a(s, "blocker")}${a(r, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function Ce(t, e) {
  const s = t.review_action_states.approve, r = t.review_action_states.reject;
  return pe(t) ? `
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
      state: r,
      tone: "border-rose-300 text-rose-700"
    }
  ].map((n) => {
    const d = !n.state?.enabled || e;
    return `
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm font-semibold ${n.tone} ${d ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
              data-action="${m(n.key)}"
              title="${m(n.state?.reason || "")}"
              ${d ? 'disabled aria-disabled="true"' : ""}
            >
              ${o(n.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function Te(t, e) {
  return t ? `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/45 px-4" data-reject-modal="true">
      <section class="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Review action</p>
            <h2 id="translation-reject-title" class="mt-2 text-2xl font-semibold text-gray-900">Request changes</h2>
            <p class="mt-2 text-sm text-gray-600">Capture the rejection reason so translators can see it directly in the editor timeline.</p>
          </div>
          <button type="button" class="rounded-full border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-gray-400 hover:text-gray-900" data-action="cancel-reject">Close</button>
        </div>
        <label class="mt-5 block text-sm font-medium text-gray-700">
          Reject reason
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${o(t.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${o(t.comment)}</textarea>
        </label>
        ${t.error ? `<p class="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${o(t.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" data-action="cancel-reject">Cancel</button>
          <button type="button" class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 ${e ? "cursor-not-allowed opacity-60" : ""}" data-action="confirm-reject" ${e ? 'disabled aria-disabled="true"' : ""}>${e ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function Le(t, e) {
  if (!_e(t))
    return "";
  const s = t.assignment_action_states.archive, r = !s?.enabled || e;
  return `
    <section
      class="rounded-xl border border-gray-200 bg-white p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 ${r ? "cursor-not-allowed opacity-60" : "hover:bg-gray-50"}"
          data-action="archive"
          title="${m(s?.reason || "")}"
          ${r ? 'disabled aria-disabled="true"' : ""}
        >
          Archive
        </button>
      </div>
    </section>
  `;
}
function ze(t) {
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${t.attachment_summary.total}</span>
      </div>
      ${t.attachments.length ? `<ul class="mt-4 space-y-3">${t.attachments.map((e) => `
            <li class="rounded-2xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${o(e.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${o(e.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${o(ge(e.byte_size))}</span>
              </div>
              ${e.description ? `<p class="mt-2 text-xs text-gray-500">${o(e.description)}</p>` : ""}
              ${e.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${o(N(e.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function Fe(t) {
  const e = t.history, s = Re(t);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${e.page} of ${Math.max(1, Math.ceil(e.total / Math.max(1, e.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((r) => `
            <li class="rounded-2xl border ${r.tone === "review" ? "border-amber-200 bg-amber-50" : r.tone === "qa" ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm ${r.tone === "review" ? "text-amber-900" : r.tone === "qa" ? "text-rose-900" : "text-gray-700"}" data-history-entry="${m(r.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="font-semibold ${r.tone === "review" ? "text-amber-950" : r.tone === "qa" ? "text-rose-950" : "text-gray-900"}">${o(r.title)}</p>
                  <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${r.tone === "review" ? "bg-white/80 text-amber-700" : r.tone === "qa" ? "bg-white/90 text-rose-700" : "bg-white/80 text-gray-600"}">${o(r.badge)}</span>
                </div>
                <span class="text-xs ${r.tone === "review" ? "text-amber-700" : r.tone === "qa" ? "text-rose-700" : "text-gray-500"}">${o(N(r.created_at) || "Current")}</span>
              </div>
              ${r.body ? `<p class="mt-2 text-sm">${o(r.body)}</p>` : ""}
            </li>
          `).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" data-history-prev="true" ${e.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50" data-history-next="true" ${e.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function Oe(t, e, s = {}, r = {}) {
  if (t.status === "loading") return ke();
  if (t.status === "empty") return T("Assignment unavailable", t.message || "No assignment detail payload was returned.");
  if (t.status === "error") return L("Editor unavailable", t.message || "Unable to load the assignment editor.", t);
  if (t.status === "conflict") return L("Editor conflict", t.message || "A newer version of this assignment is available.", t);
  const a = e?.detail || t.detail;
  if (!a) return T("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(e && Object.keys(e.dirty_fields).length), d = he(e || null, n, r.lastSavedMessage || ""), l = e?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${ye(r.feedback || null)}
      ${Se(a, d, n, r.submitting === !0, r.saving === !0, s.basePath || "")}
      ${l ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div class="space-y-6">
          ${Ae(a)}
        </div>
        <aside class="space-y-6">
          ${Ce(a, r.submitting === !0)}
          ${Le(a, r.submitting === !0)}
          ${De(a)}
          ${Ee(a)}
          ${ze(a)}
          ${Fe(a)}
          ${U(t)}
        </aside>
      </div>
      ${Te(r.rejectDraft || null, r.submitting === !0)}
    </div>
  `;
}
function Be(t, e, s, r = {}, a = {}) {
  t.innerHTML = Oe(e, s, r, a);
}
class Ie {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.keyboardHandler = null, this.saving = !1, this.submitting = !1, this.rejectDraft = null, this.config = {
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
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.keyboardHandler && (document.removeEventListener("keydown", this.keyboardHandler), this.keyboardHandler = null), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render();
    const s = e ? C(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint;
    this.loadState = await me(s), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = oe(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (Be(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting,
      rejectDraft: this.rejectDraft
    }), this.attachEventListeners());
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (s) => {
        const r = s.currentTarget, a = r.dataset.fieldInput || "";
        this.editorState = D(this.editorState, a, r.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.copySource || "", r = this.editorState?.detail.fields.find((a) => a.path === s);
        !r || !this.editorState || (this.editorState = D(this.editorState, s, r.source_value), this.scheduleAutosave(), this.render());
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
    this.saving = !0, this.editorState = de(this.editorState), this.render();
    const s = this.editorState.detail, r = await y(C(`${this.config.variantEndpointBase}/${encodeURIComponent(s.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!r.ok) {
      if (r.status === 409) {
        const l = await r.json().catch(async () => ({ error: { message: await z(r, "Autosave conflict") } }));
        return this.editorState = ce(this.editorState, l), this.feedback = { kind: "conflict", message: "Autosave conflict detected. Reload the latest server draft." }, this.saving = !1, this.render(), !1;
      }
      const d = await w(r, "Failed to save draft");
      return this.feedback = { kind: "error", message: d.message }, this.saving = !1, this.render(), !1;
    }
    const a = await r.json();
    this.editorState = le(this.editorState, a);
    const n = xe(this.editorState.detail.qa_results, e);
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
      const d = Object.entries(this.editorState.detail.field_completeness).filter(([, l]) => l.required && l.missing).map(([l]) => l);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? we(this.editorState.detail) : d.length ? `Complete required fields before submitting for review: ${d.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const s = this.editorState.detail.translation_assignment.version, r = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: s }
    });
    if (!r.ok) {
      const d = await w(r, "Failed to submit assignment");
      this.feedback = {
        kind: d.code === "VERSION_CONFLICT" || d.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: d.message
      }, this.submitting = !1, this.render();
      return;
    }
    const a = await r.json(), n = i(c(a).data && c(c(a).data).status);
    this.feedback = {
      kind: "success",
      message: $e(this.editorState.detail, n)
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e, s) {
    if (!this.editorState || this.submitting) return;
    const r = this.editorState.detail, a = e === "archive" ? r.assignment_action_states.archive : r.review_action_states[e];
    if (!a?.enabled) {
      this.feedback = { kind: "error", message: a?.reason || `${x(e)} is unavailable.` }, this.render();
      return;
    }
    const n = {
      expected_version: r.translation_assignment.version
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
    const d = await y(`${this.config.actionEndpointBase}/${encodeURIComponent(r.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: n
    });
    if (!d.ok) {
      const l = await w(d, `Failed to ${e} assignment`);
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
  }
  closeRejectDialog() {
    this.rejectDraft = null, this.render();
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
async function He(t, e) {
  const s = new Ie(e);
  return s.mount(t), s;
}
export {
  ue as TranslationEditorRequestError,
  Ie as TranslationEditorScreen,
  ce as applyEditorAutosaveConflict,
  D as applyEditorFieldChange,
  le as applyEditorUpdateResponse,
  oe as createTranslationEditorState,
  me as fetchTranslationEditorDetailState,
  He as initTranslationEditorPage,
  de as markEditorAutosavePending,
  ie as normalizeAssignmentEditorDetail,
  M as normalizeEditorAssistPayload,
  ne as normalizeEditorUpdateResponse,
  Be as renderTranslationEditorPage,
  Oe as renderTranslationEditorState
};
//# sourceMappingURL=index.js.map
