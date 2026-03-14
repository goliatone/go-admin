import { n as W } from "../chunks/index-Dvt9oAtQ.js";
import { a as d, e as m } from "../chunks/html-Br-oQr7i.js";
import { h as v, r as F } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as z } from "../toast/error-helpers.js";
import { B, s as K, t as X, L as J, E as Z, c as ee, d as te, e as se, f as ae, g as re, C as k, r as ie, H as ne, a as oe, h as S, n as de, j as M, o as q, M as ce, i as le, m as ue } from "../chunks/breadcrumb-BXeageNv.js";
function l(t) {
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
function w(t) {
  const e = l(t), s = {};
  for (const [a, r] of Object.entries(e)) {
    const n = i(r);
    a.trim() && (s[a.trim()] = n);
  }
  return s;
}
function N(t) {
  return Array.isArray(t) ? t.map((e) => i(e)).filter(Boolean) : [];
}
function j(t) {
  const e = l(t);
  return {
    required: g(e.required),
    complete: g(e.complete),
    missing: g(e.missing)
  };
}
function A(t) {
  const e = l(t), s = i(e.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: g(e.changed),
    comparison_mode: s,
    previous_source_value: i(e.previous_source_value),
    current_source_value: i(e.current_source_value)
  };
}
function E(t) {
  const e = l(t);
  return {
    valid: e.valid !== !1,
    message: i(e.message)
  };
}
function b(t, e) {
  const s = l(t), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = e(n));
  return a;
}
function me(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const s of t) {
    const a = l(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || e.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: N(a.field_paths)
    });
  }
  return e;
}
function fe(t) {
  const e = l(t);
  return {
    available: g(e.available),
    title: i(e.title),
    summary: i(e.summary) || i(e.summary_markdown),
    rules: N(e.rules)
  };
}
function P(t) {
  return i(
    t.get("x-trace-id") || t.get("x-correlation-id") || t.get("traceparent")
  );
}
function ge(t) {
  const e = l(t), s = i(e.id), a = i(e.filename);
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
function pe(t) {
  return Array.isArray(t) ? t.map((e) => ge(e)).filter((e) => e !== null) : [];
}
function be(t, e) {
  const s = l(t), a = l(s.kinds), r = {};
  for (const [n, o] of Object.entries(a)) {
    const c = f(o);
    n.trim() && (r[n.trim()] = c);
  }
  if (!Object.keys(r).length)
    for (const n of e)
      r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: f(s.total, e.length),
    kinds: r
  };
}
function _e(t) {
  return i(t) === "comment" ? "comment" : "event";
}
function he(t) {
  const e = l(t), s = i(e.id);
  return s ? {
    id: s,
    entry_type: _e(e.entry_type),
    title: i(e.title),
    body: i(e.body),
    action: i(e.action),
    actor_id: i(e.actor_id),
    author_id: i(e.author_id),
    created_at: i(e.created_at),
    kind: i(e.kind),
    metadata: l(e.metadata)
  } : null;
}
function ve(t) {
  const e = l(t), s = Array.isArray(e.items) ? e.items.map((a) => he(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(e.page, 1) || 1,
    per_page: f(e.per_page, 10) || 10,
    total: f(e.total, s.length),
    has_more: g(e.has_more),
    next_page: f(e.next_page)
  };
}
function ye(t) {
  const e = l(t), s = i(e.id), a = i(e.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(e.kind) || "review_feedback",
    created_at: i(e.created_at),
    author_id: i(e.author_id) || void 0
  };
}
function xe(t, e) {
  const s = l(t), a = Array.isArray(s.comments) ? s.comments.map((n) => ye(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || e) || void 0;
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
function $e(t) {
  const e = l(t), s = i(e.id), a = i(e.message);
  return !s || !a ? null : {
    id: s,
    category: i(e.category) === "style" ? "style" : "terminology",
    severity: i(e.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(e.field_path),
    message: a
  };
}
function we(t, e) {
  const s = l(t);
  return {
    category: i(s.category) || e,
    enabled: g(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: f(s.finding_count),
    warning_count: f(s.warning_count),
    blocker_count: f(s.blocker_count)
  };
}
function I(t) {
  const e = l(t), s = l(e.summary), a = l(e.categories), r = {};
  for (const [o, c] of Object.entries(a))
    o.trim() && (r[o.trim()] = we(c, o.trim()));
  const n = Array.isArray(e.findings) ? e.findings.map((o) => $e(o)).filter((o) => o !== null) : [];
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
function ke(t) {
  const e = l(t);
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
function H(t, e) {
  const s = l(t), a = l(e);
  return {
    glossary_matches: me(
      s.glossary_matches ?? a.glossary_matches
    ),
    style_guide_summary: fe(
      s.style_guide_summary ?? a.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function y(t) {
  const e = l(t), s = {};
  for (const [a, r] of Object.entries(e)) {
    const n = W(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function U(t, e, s, a, r, n) {
  if (Array.isArray(t.fields))
    return t.fields.map((c) => {
      const u = l(c), p = i(u.path);
      return p ? {
        path: p,
        label: i(u.label) || p,
        input_type: i(u.input_type) || "text",
        required: g(u.required),
        source_value: i(u.source_value) || e[p] || "",
        target_value: i(u.target_value) || s[p] || "",
        completeness: j(u.completeness ?? a[p]),
        drift: A(u.drift ?? r[p]),
        validation: E(u.validation ?? n[p]),
        glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((h) => h && typeof h == "object") : []
      } : null;
    }).filter((c) => !!c);
  const o = /* @__PURE__ */ new Set([
    ...Object.keys(e),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(o).sort().map((c) => ({
    path: c,
    label: c,
    input_type: "text",
    required: a[c]?.required === !0,
    source_value: e[c] || "",
    target_value: s[c] || "",
    completeness: a[c] ?? { required: !1, complete: !0, missing: !1 },
    drift: r[c] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: e[c] || ""
    },
    validation: n[c] ?? { valid: !0, message: "" },
    glossary_hits: []
  }));
}
function Se(t) {
  const e = l(t), s = l(e.data && typeof e.data == "object" ? e.data : t), a = w(s.source_fields), r = w(s.target_fields ?? s.fields), n = b(s.field_completeness, j), o = b(s.field_drift, A), c = b(s.field_validations, E), u = pe(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: f(
      s.assignment_row_version || s.assignment_version || l(s.translation_assignment).row_version || l(s.translation_assignment).version
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
    fields: U(s, a, r, n, o, c),
    field_completeness: n,
    field_drift: o,
    field_validations: c,
    source_target_drift: l(s.source_target_drift),
    history: ve(s.history),
    attachments: u,
    attachment_summary: be(s.attachment_summary, u),
    translation_assignment: ke(s.translation_assignment),
    assist: H(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: xe(s.review_feedback, s.last_rejection_reason),
    qa_results: I(s.qa_results),
    assignment_action_states: y(
      s.assignment_action_states ?? s.editor_actions ?? s.actions
    ),
    review_action_states: y(
      s.review_action_states ?? s.review_actions
    )
  };
}
function je(t) {
  const e = l(t), s = l(e.data && typeof e.data == "object" ? e.data : t);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: w(s.fields),
    field_completeness: b(s.field_completeness, j),
    field_drift: b(s.field_drift, A),
    field_validations: b(s.field_validations, E),
    assist: H(s.assist, s),
    qa_results: I(s.qa_results),
    assignment_action_states: y(s.assignment_action_states),
    review_action_states: y(s.review_action_states)
  };
}
function T(t) {
  return U(
    { fields: t.fields },
    t.source_fields,
    t.target_fields,
    t.field_completeness,
    t.field_drift,
    t.field_validations
  );
}
function R(t) {
  if (!t.assignment_action_states.submit_review?.enabled || t.qa_results.submit_blocked) return !1;
  for (const s of Object.values(t.field_completeness))
    if (s.required && s.missing) return !1;
  return !0;
}
function Ae(t) {
  return {
    detail: {
      ...t,
      fields: T(t)
    },
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: t.row_version,
    can_submit_review: R(t),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function C(t, e, s) {
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
  }, c = {
    ...t.detail.field_validations,
    [a]: {
      valid: !o[a].missing,
      message: o[a].missing ? t.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...t.detail,
    target_fields: r,
    field_completeness: o,
    field_validations: c
  };
  return u.fields = T(u), {
    ...t,
    detail: u,
    dirty_fields: {
      ...t.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: t.assignment_row_version,
    can_submit_review: R(u)
  };
}
function Ee(t) {
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      ...t.autosave,
      pending: !0
    }
  };
}
function Te(t, e) {
  const s = je(e), a = {
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
  return a.fields = T(a), {
    ...t,
    detail: a,
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: R(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function Re(t, e) {
  const s = l(l(l(e).error).metadata);
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: l(s.latest_server_state_record)
    }
  };
}
function D(t, e) {
  const s = new URL(t, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(e))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(t) ? s.toString() : `${s.pathname}${s.search}`;
}
class qe extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
async function $(t, e) {
  const s = await z(t);
  return new qe({
    message: s.message || await F(t, e),
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(t.headers.get("x-request-id")) || void 0,
    traceId: P(t.headers) || void 0
  });
}
async function Ce(t) {
  const e = await v(t, { method: "GET" }), s = i(e.headers.get("x-request-id")) || void 0, a = P(e.headers) || void 0;
  if (!e.ok) {
    const o = await z(e);
    return {
      status: o.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: o.message || `Failed to load assignment (${e.status})`,
      requestId: s,
      traceId: a,
      statusCode: e.status,
      errorCode: o.textCode
    };
  }
  const r = await e.json(), n = Se(r);
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
function De(t) {
  return !t || t <= 0 ? "0 B" : t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
}
function Q(t) {
  const e = i(t);
  if (!e) return "";
  const s = new Date(e);
  return Number.isNaN(s.getTime()) ? e : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function x(t) {
  const e = i(t).replace(/_/g, " ");
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function Le(t) {
  return i(t.status || t.translation_assignment.status || t.translation_assignment.queue_state);
}
function Oe(t) {
  return t === "review" || t === "in_review";
}
function Fe(t) {
  const e = Le(t);
  return Oe(e) ? !0 : !!(t.review_action_states.approve?.enabled || t.review_action_states.reject?.enabled);
}
function ze(t) {
  return !!t.assignment_action_states.archive?.enabled;
}
function Be(t, e, s) {
  return t?.autosave.conflict ? { tone: "bg-rose-100 text-rose-700", text: "Conflict detected", state: "conflict" } : t?.autosave.pending ? { tone: "bg-amber-100 text-amber-700", text: "Autosaving draft…", state: "saving" } : e ? { tone: "bg-gray-100 text-gray-700", text: "Unsaved changes", state: "dirty" } : s ? { tone: "bg-emerald-100 text-emerald-700", text: s, state: "saved" } : { tone: "bg-gray-100 text-gray-700", text: "No pending changes", state: "idle" };
}
function G(t) {
  const e = [
    t.requestId ? `Request ${d(t.requestId)}` : "",
    t.traceId ? `Trace ${d(t.traceId)}` : "",
    t.errorCode ? `Code ${d(t.errorCode)}` : ""
  ].filter(Boolean);
  return e.length ? `<p class="mt-3 text-xs text-gray-500">${e.join(" · ")}</p>` : "";
}
function Me(t) {
  return t ? `
    <div class="rounded-xl border px-4 py-3 text-sm font-medium ${t.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : t.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(t.kind)}" role="status" aria-live="polite">
      ${d(t.message)}
    </div>
  ` : "";
}
function Ne(t) {
  const e = t.qa_results;
  return !e.enabled || e.summary.finding_count <= 0 ? "" : `
    <span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">Warnings ${e.summary.warning_count}</span>
    <span class="rounded-full ${e.summary.blocker_count > 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"} px-3 py-1 font-medium">
      ${e.summary.blocker_count > 0 ? `Blockers ${e.summary.blocker_count}` : "No blockers"}
    </span>
  `;
}
function Pe(t, e) {
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
function Ie(t) {
  const e = t.qa_results;
  return e.submit_blocked ? `Resolve ${e.summary.blocker_count} QA blocker${e.summary.blocker_count === 1 ? "" : "s"} before submitting for review. ${e.summary.warning_count} warning${e.summary.warning_count === 1 ? "" : "s"} remain advisory.` : "Submit for review is unavailable.";
}
function He(t, e) {
  const s = t.qa_results, a = s.summary.warning_count > 0 ? ` ${s.summary.warning_count} QA warning${s.summary.warning_count === 1 ? "" : "s"} remain visible to reviewers.` : "";
  return e === "approved" ? `Submitted and auto-approved.${a}` : `Submitted for review.${a}`;
}
function Ue() {
  return `
    <section class="${J} p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-gray-500">Loading translation assignment…</p>
    </section>
  `;
}
function L(t, e) {
  return `
    <section class="${Z} p-8 text-center shadow-sm">
      <h2 class="${ee}">${d(t)}</h2>
      <p class="${te} mt-2">${d(e)}</p>
    </section>
  `;
}
function O(t, e, s) {
  return `
    <section class="${se} p-8 shadow-sm">
      <h2 class="${ae}">${d(t)}</h2>
      <p class="${re} mt-2">${d(e)}</p>
      ${G(s)}
    </section>
  `;
}
function Qe(t, e, s, a, r, n = "") {
  const o = t.assignment_action_states.submit_review, c = !o?.enabled || r || a || t.qa_results.submit_blocked, u = r || !s, p = (t.source_locale || "source").toUpperCase(), h = (t.target_locale || "target").toUpperCase(), _ = t.translation_assignment, Y = t.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : o?.reason || "", V = _.id || t.assignment_id || "";
  return `
    <section class="${k} p-6 shadow-sm">
      <div class="mb-4">
        ${ie(de(V, n || "/admin"))}
      </div>
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="${ne}">Assignment editor</p>
          <div>
            <h1 class="${oe}">${d(_.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-gray-600">
              ${d(p)} to ${d(h)} • ${d(x(t.status || _.status || "draft"))} • Priority ${d(t.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-gray-600">
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Assignee ${d(_.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-gray-100 px-3 py-1 font-medium">Reviewer ${d(_.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${e.tone}" data-autosave-state="${m(e.state)}">${d(e.text)}</span>
            ${Ne(t)}
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="${S}"
            data-action="save-draft"
            ${u ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="${B}"
            data-action="submit-review"
            title="${m(Y)}"
            ${c ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : o?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function Ge(t) {
  return t.drift.changed ? `
    <div class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(t.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${d(t.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${d(t.drift.current_source_value || t.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function Ye(t) {
  const e = Array.isArray(t.glossary_hits) ? t.glossary_hits : [];
  return e.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${e.map((s) => `
        <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          ${d(i(s.term))} → ${d(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function Ve(t) {
  return `
    <section class="space-y-4">
      ${t.fields.map((e) => `
        <article class="rounded-xl border border-gray-200 bg-white p-5" data-editor-field="${m(e.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">${d(e.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(e.path)}${e.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="${M}"
              data-copy-source="${m(e.path)}"
              aria-label="Copy source text to translation field for ${m(e.label)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-gray-800">${d(e.source_value || "No source text")}</div>
            </div>
            <div class="rounded-xl border ${e.validation.valid ? "border-gray-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500" for="editor-field-${m(e.path)}">Translation</label>
              ${e.input_type === "textarea" ? `<textarea id="editor-field-${m(e.path)}" class="mt-2 min-h-[140px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}">${d(e.target_value)}</textarea>` : `<input id="editor-field-${m(e.path)}" type="text" class="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(e.path)}" value="${m(e.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${e.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${e.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${e.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${e.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(e.path)}">${d(e.validation.message || "Validation error")}</p>`}
              ${Ge(e)}
              ${Ye(e)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function We(t) {
  const e = t.assist.glossary_matches, s = t.assist.style_guide_summary;
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <h2 class="text-lg font-semibold text-gray-900">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-gray-800">Glossary</h3>
          ${e.length ? `<ul class="mt-3 space-y-2">${e.map((a) => `
                <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                  <strong class="text-gray-900">${d(a.term)}</strong> → ${d(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-gray-500">${d(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-gray-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
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
function Ke(t) {
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
  }), e.sort((s, a) => {
    const r = s.created_at ? Date.parse(s.created_at) : 0;
    return (a.created_at ? Date.parse(a.created_at) : 0) - r;
  });
}
function Xe(t) {
  const e = t.qa_results;
  if (!e.enabled)
    return "";
  const s = e.findings.filter((n) => n.severity === "blocker"), a = e.findings.filter((n) => n.severity !== "blocker"), r = (n, o) => n.length ? `
      <section data-qa-group="${m(o === "blocker" ? "blockers" : "warnings")}">
        <h3 class="text-sm font-semibold ${o === "blocker" ? "text-rose-800" : "text-amber-800"}">
          ${o === "blocker" ? `Blocking findings (${n.length})` : `Warnings (${n.length})`}
        </h3>
        <ol class="mt-3 space-y-3">${n.map((c) => `
          <li class="rounded-xl border ${o === "blocker" ? "border-rose-200 bg-white text-rose-900" : "border-amber-200 bg-white text-amber-900"} px-3 py-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <strong>${d(x(c.category))}</strong>
              <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${o === "blocker" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}">${d(c.severity)}</span>
            </div>
            <p class="mt-2">${d(c.message)}</p>
            ${c.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${d(c.field_path)}</p>` : ""}
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
      ${s.length || a.length ? `<div class="mt-4 space-y-4">${r(s, "blocker")}${r(a, "warning")}</div>` : '<p class="mt-4 text-sm text-gray-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function Je(t, e) {
  const s = t.review_action_states.approve, a = t.review_action_states.reject;
  return Fe(t) ? `
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
              ${d(n.label)}
            </button>
          `;
  }).join("")}
      </div>
    </section>
  ` : "";
}
function Ze(t, e) {
  return t ? `
    <div class="${ce}" data-reject-modal="true">
      <section class="${le}" role="dialog" aria-modal="true" aria-labelledby="translation-reject-title">
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
          <textarea class="mt-2 min-h-[120px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100" data-reject-reason="true">${d(t.reason)}</textarea>
        </label>
        <label class="mt-4 block text-sm font-medium text-gray-700">
          Reviewer note
          <textarea class="mt-2 min-h-[100px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100" data-reject-comment="true">${d(t.comment)}</textarea>
        </label>
        ${t.error ? `<p class="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-medium text-rose-800">${d(t.error)}</p>` : ""}
        <div class="mt-5 flex items-center justify-end gap-3">
          <button type="button" class="${S}" data-action="cancel-reject">Cancel</button>
          <button type="button" class="${ue}" data-action="confirm-reject" ${e ? 'disabled aria-disabled="true"' : ""}>${e ? "Submitting…" : "Request changes"}</button>
        </div>
      </section>
    </div>
  ` : "";
}
function et(t, e) {
  if (!ze(t))
    return "";
  const s = t.assignment_action_states.archive, a = !s?.enabled || e;
  return `
    <section
      class="${k} p-5"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-gray-900">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="${S}"
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
function tt(t) {
  return `
    <section class="${k} p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Attachments</h2>
        <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">${t.attachment_summary.total}</span>
      </div>
      ${t.attachments.length ? `<ul class="mt-4 space-y-3">${t.attachments.map((e) => `
            <li class="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${d(e.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-gray-500">${d(e.kind)}</p>
                </div>
                <span class="text-xs text-gray-500">${d(De(e.byte_size))}</span>
              </div>
              ${e.description ? `<p class="mt-2 text-xs text-gray-500">${d(e.description)}</p>` : ""}
              ${e.uploaded_at ? `<p class="mt-2 text-xs text-gray-500">Uploaded ${d(Q(e.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-gray-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function st(t) {
  const e = t.history, s = Ke(t);
  return `
    <section class="rounded-xl border border-gray-200 bg-white p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-gray-900">Workflow timeline</h2>
        <span class="text-xs text-gray-500">Page ${e.page} of ${Math.max(1, Math.ceil(e.total / Math.max(1, e.per_page)))}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => `
            <li class="rounded-xl border ${a.tone === "review" ? "border-amber-200 bg-amber-50" : a.tone === "qa" ? "border-rose-200 bg-rose-50" : "border-gray-200 bg-gray-50"} px-3 py-3 text-sm ${a.tone === "review" ? "text-amber-900" : a.tone === "qa" ? "text-rose-900" : "text-gray-700"}" data-history-entry="${m(a.id)}">
              <div class="flex items-start justify-between gap-3">
                <div class="space-y-2">
                  <p class="font-semibold ${a.tone === "review" ? "text-amber-950" : a.tone === "qa" ? "text-rose-950" : "text-gray-900"}">${d(a.title)}</p>
                  <span class="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${a.tone === "review" ? "bg-white/80 text-amber-700" : a.tone === "qa" ? "bg-white/90 text-rose-700" : "bg-white/80 text-gray-600"}">${d(a.badge)}</span>
                </div>
                <span class="text-xs ${a.tone === "review" ? "text-amber-700" : a.tone === "qa" ? "text-rose-700" : "text-gray-500"}">${d(Q(a.created_at) || "Current")}</span>
              </div>
              ${a.body ? `<p class="mt-2 text-sm">${d(a.body)}</p>` : ""}
            </li>
          `).join("")}</ol>` : '<p class="mt-4 text-sm text-gray-500">No workflow entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="${q}" data-history-prev="true" ${e.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="${q}" data-history-next="true" ${e.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function at(t, e, s = {}, a = {}) {
  if (t.status === "loading") return Ue();
  if (t.status === "empty") return L("Assignment unavailable", t.message || "No assignment detail payload was returned.");
  if (t.status === "error") return O("Editor unavailable", t.message || "Unable to load the assignment editor.", t);
  if (t.status === "conflict") return O("Editor conflict", t.message || "A newer version of this assignment is available.", t);
  const r = e?.detail || t.detail;
  if (!r) return L("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(e && Object.keys(e.dirty_fields).length), o = Be(e || null, n, a.lastSavedMessage || ""), c = e?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${Me(a.feedback || null)}
      ${Qe(r, o, n, a.submitting === !0, a.saving === !0, s.basePath || "")}
      ${c ? `
        <section class="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="${B}" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div class="order-1 space-y-4 sm:space-y-6">
          ${Ve(r)}
        </div>
        <aside class="order-2 space-y-4 sm:space-y-6">
          ${Je(r, a.submitting === !0)}
          ${et(r, a.submitting === !0)}
          ${Xe(r)}
          ${We(r)}
          ${tt(r)}
          ${st(r)}
          ${G(t)}
        </aside>
      </div>
      ${Ze(a.rejectDraft || null, a.submitting === !0)}
    </div>
  `;
}
function rt(t, e, s, a = {}, r = {}) {
  t.innerHTML = at(e, s, a, r);
}
class it {
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
    const s = e ? D(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint;
    this.loadState = await Ce(s), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = Ae(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (rt(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
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
        this.editorState = C(this.editorState, r, a.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.copySource || "", a = this.editorState?.detail.fields.find((r) => r.path === s);
        !a || !this.editorState || (this.editorState = C(this.editorState, s, a.source_value), this.scheduleAutosave(), this.render());
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
    this.saving = !0, this.editorState = Ee(this.editorState), this.render();
    const s = this.editorState.detail, a = await v(D(`${this.config.variantEndpointBase}/${encodeURIComponent(s.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!a.ok) {
      if (a.status === 409) {
        const c = await a.json().catch(async () => ({ error: { message: await F(a, "Autosave conflict") } }));
        return this.editorState = Re(this.editorState, c), this.feedback = { kind: "conflict", message: "Autosave conflict detected. Reload the latest server draft." }, this.saving = !1, this.render(), !1;
      }
      const o = await $(a, "Failed to save draft");
      return this.feedback = { kind: "error", message: o.message }, this.saving = !1, this.render(), !1;
    }
    const r = await a.json();
    this.editorState = Te(this.editorState, r);
    const n = Pe(this.editorState.detail.qa_results, e);
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
      const o = Object.entries(this.editorState.detail.field_completeness).filter(([, c]) => c.required && c.missing).map(([c]) => c);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? Ie(this.editorState.detail) : o.length ? `Complete required fields before submitting for review: ${o.join(", ")}.` : "Submit for review is unavailable."
      }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const s = this.editorState.detail.translation_assignment.version, a = await v(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: s }
    });
    if (!a.ok) {
      const o = await $(a, "Failed to submit assignment");
      this.feedback = {
        kind: o.code === "VERSION_CONFLICT" || o.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: o.message
      }, this.submitting = !1, this.render();
      return;
    }
    const r = await a.json(), n = i(l(r).data && l(l(r).data).status);
    this.feedback = {
      kind: "success",
      message: He(this.editorState.detail, n)
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e, s) {
    if (!this.editorState || this.submitting) return;
    const a = this.editorState.detail, r = e === "archive" ? a.assignment_action_states.archive : a.review_action_states[e];
    if (!r?.enabled) {
      this.feedback = { kind: "error", message: r?.reason || `${x(e)} is unavailable.` }, this.render();
      return;
    }
    const n = {
      expected_version: a.translation_assignment.version
    };
    if (e === "reject") {
      const c = s?.reason || "";
      if (!c || !c.trim()) {
        this.openRejectDialog("Reject reason is required."), this.render();
        return;
      }
      n.reason = c.trim(), s?.comment?.trim() && (n.comment = s.comment.trim());
    }
    this.submitting = !0, this.render();
    const o = await v(`${this.config.actionEndpointBase}/${encodeURIComponent(a.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: n
    });
    if (!o.ok) {
      const c = await $(o, `Failed to ${e} assignment`);
      this.feedback = {
        kind: c.code === "VERSION_CONFLICT" || c.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: c.message
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
async function ut(t, e) {
  const s = new it(e);
  return s.mount(t), s;
}
export {
  qe as TranslationEditorRequestError,
  it as TranslationEditorScreen,
  Re as applyEditorAutosaveConflict,
  C as applyEditorFieldChange,
  Te as applyEditorUpdateResponse,
  Ae as createTranslationEditorState,
  Ce as fetchTranslationEditorDetailState,
  ut as initTranslationEditorPage,
  Ee as markEditorAutosavePending,
  Se as normalizeAssignmentEditorDetail,
  H as normalizeEditorAssistPayload,
  je as normalizeEditorUpdateResponse,
  rt as renderTranslationEditorPage,
  at as renderTranslationEditorState
};
//# sourceMappingURL=index.js.map
