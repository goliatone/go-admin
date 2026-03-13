import { n as N } from "../chunks/index-Dvt9oAtQ.js";
import { a as o, e as f } from "../chunks/html-Br-oQr7i.js";
import { h as v, r as z } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as L } from "../toast/error-helpers.js";
function l(t) {
  return t && typeof t == "object" ? t : {};
}
function i(t) {
  return typeof t == "string" ? t.trim() : "";
}
function p(t) {
  return t === !0;
}
function m(t, e = 0) {
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
function F(t) {
  return Array.isArray(t) ? t.map((e) => i(e)).filter(Boolean) : [];
}
function $(t) {
  const e = l(t);
  return {
    required: p(e.required),
    complete: p(e.complete),
    missing: p(e.missing)
  };
}
function k(t) {
  const e = l(t), s = i(e.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: p(e.changed),
    comparison_mode: s,
    previous_source_value: i(e.previous_source_value),
    current_source_value: i(e.current_source_value)
  };
}
function S(t) {
  const e = l(t);
  return {
    valid: e.valid !== !1,
    message: i(e.message)
  };
}
function _(t, e) {
  const s = l(t), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = e(n));
  return a;
}
function U(t) {
  if (!Array.isArray(t)) return [];
  const e = [];
  for (const s of t) {
    const a = l(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || e.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: F(a.field_paths)
    });
  }
  return e;
}
function H(t) {
  const e = l(t);
  return {
    available: p(e.available),
    title: i(e.title),
    summary: i(e.summary) || i(e.summary_markdown),
    rules: F(e.rules)
  };
}
function O(t) {
  return i(
    t.get("x-trace-id") || t.get("x-correlation-id") || t.get("traceparent")
  );
}
function Q(t) {
  const e = l(t), s = i(e.id), a = i(e.filename);
  return !s && !a ? null : {
    id: s || a || "attachment",
    kind: i(e.kind) || "reference",
    filename: a || s || "attachment",
    byte_size: m(e.byte_size),
    uploaded_at: i(e.uploaded_at),
    description: i(e.description),
    url: i(e.url)
  };
}
function G(t) {
  return Array.isArray(t) ? t.map((e) => Q(e)).filter((e) => e !== null) : [];
}
function V(t, e) {
  const s = l(t), a = l(s.kinds), r = {};
  for (const [n, d] of Object.entries(a)) {
    const c = m(d);
    n.trim() && (r[n.trim()] = c);
  }
  if (!Object.keys(r).length)
    for (const n of e)
      r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: m(s.total, e.length),
    kinds: r
  };
}
function K(t) {
  return i(t) === "comment" ? "comment" : "event";
}
function W(t) {
  const e = l(t), s = i(e.id);
  return s ? {
    id: s,
    entry_type: K(e.entry_type),
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
function Y(t) {
  const e = l(t), s = Array.isArray(e.items) ? e.items.map((a) => W(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: m(e.page, 1) || 1,
    per_page: m(e.per_page, 10) || 10,
    total: m(e.total, s.length),
    has_more: p(e.has_more),
    next_page: m(e.next_page)
  };
}
function J(t) {
  const e = l(t), s = i(e.id), a = i(e.body);
  return !s && !a ? null : {
    id: s || a || "review-feedback",
    body: a,
    kind: i(e.kind) || "review_feedback",
    created_at: i(e.created_at),
    author_id: i(e.author_id) || void 0
  };
}
function X(t, e) {
  const s = l(t), a = Array.isArray(s.comments) ? s.comments.map((n) => J(n)).filter((n) => n !== null) : [], r = i(s.last_rejection_reason || e) || void 0;
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
function Z(t) {
  const e = l(t), s = i(e.id), a = i(e.message);
  return !s || !a ? null : {
    id: s,
    category: i(e.category) === "style" ? "style" : "terminology",
    severity: i(e.severity) === "blocker" ? "blocker" : "warning",
    field_path: i(e.field_path),
    message: a
  };
}
function ee(t, e) {
  const s = l(t);
  return {
    category: i(s.category) || e,
    enabled: p(s.enabled),
    feature_flag: i(s.feature_flag) || void 0,
    finding_count: m(s.finding_count),
    warning_count: m(s.warning_count),
    blocker_count: m(s.blocker_count)
  };
}
function P(t) {
  const e = l(t), s = l(e.summary), a = l(e.categories), r = {};
  for (const [d, c] of Object.entries(a))
    d.trim() && (r[d.trim()] = ee(c, d.trim()));
  const n = Array.isArray(e.findings) ? e.findings.map((d) => Z(d)).filter((d) => d !== null) : [];
  return {
    enabled: p(e.enabled),
    summary: {
      finding_count: m(s.finding_count, n.length),
      warning_count: m(s.warning_count),
      blocker_count: m(s.blocker_count)
    },
    categories: r,
    findings: n,
    save_blocked: p(e.save_blocked),
    submit_blocked: p(e.submit_blocked)
  };
}
function te(t) {
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
    version: m(e.version || e.row_version),
    row_version: m(e.row_version || e.version),
    updated_at: i(e.updated_at)
  };
}
function I(t, e) {
  const s = l(t), a = l(e);
  return {
    glossary_matches: U(
      s.glossary_matches ?? a.glossary_matches
    ),
    style_guide_summary: H(
      s.style_guide_summary ?? a.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function h(t) {
  const e = l(t), s = {};
  for (const [a, r] of Object.entries(e)) {
    const n = N(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function B(t, e, s, a, r, n) {
  if (Array.isArray(t.fields))
    return t.fields.map((c) => {
      const u = l(c), b = i(u.path);
      return b ? {
        path: b,
        label: i(u.label) || b,
        input_type: i(u.input_type) || "text",
        required: p(u.required),
        source_value: i(u.source_value) || e[b] || "",
        target_value: i(u.target_value) || s[b] || "",
        completeness: $(u.completeness ?? a[b]),
        drift: k(u.drift ?? r[b]),
        validation: S(u.validation ?? n[b]),
        glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((g) => g && typeof g == "object") : []
      } : null;
    }).filter((c) => !!c);
  const d = /* @__PURE__ */ new Set([
    ...Object.keys(e),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(d).sort().map((c) => ({
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
function se(t) {
  const e = l(t), s = l(e.data && typeof e.data == "object" ? e.data : t), a = w(s.source_fields), r = w(s.target_fields ?? s.fields), n = _(s.field_completeness, $), d = _(s.field_drift, k), c = _(s.field_validations, S), u = G(s.attachments);
  return {
    assignment_id: i(s.assignment_id),
    assignment_row_version: m(
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
    row_version: m(s.row_version || s.version),
    source_fields: a,
    target_fields: r,
    fields: B(s, a, r, n, d, c),
    field_completeness: n,
    field_drift: d,
    field_validations: c,
    source_target_drift: l(s.source_target_drift),
    history: Y(s.history),
    attachments: u,
    attachment_summary: V(s.attachment_summary, u),
    translation_assignment: te(s.translation_assignment),
    assist: I(s.assist, s),
    last_rejection_reason: i(s.last_rejection_reason) || void 0,
    review_feedback: X(s.review_feedback, s.last_rejection_reason),
    qa_results: P(s.qa_results),
    assignment_action_states: h(
      s.assignment_action_states ?? s.editor_actions ?? s.actions
    ),
    review_action_states: h(
      s.review_action_states ?? s.review_actions
    )
  };
}
function ae(t) {
  const e = l(t), s = l(e.data && typeof e.data == "object" ? e.data : t);
  return {
    variant_id: i(s.variant_id),
    row_version: m(s.row_version || s.version),
    fields: w(s.fields),
    field_completeness: _(s.field_completeness, $),
    field_drift: _(s.field_drift, k),
    field_validations: _(s.field_validations, S),
    assist: I(s.assist, s),
    qa_results: P(s.qa_results),
    assignment_action_states: h(s.assignment_action_states),
    review_action_states: h(s.review_action_states)
  };
}
function A(t) {
  return B(
    { fields: t.fields },
    t.source_fields,
    t.target_fields,
    t.field_completeness,
    t.field_drift,
    t.field_validations
  );
}
function j(t) {
  if (!t.assignment_action_states.submit_review?.enabled || t.qa_results.submit_blocked) return !1;
  for (const s of Object.values(t.field_completeness))
    if (s.required && s.missing) return !1;
  return !0;
}
function ie(t) {
  return {
    detail: {
      ...t,
      fields: A(t)
    },
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: t.row_version,
    can_submit_review: j(t),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function E(t, e, s) {
  const a = e.trim();
  if (!a) return t;
  const r = {
    ...t.detail.target_fields,
    [a]: s.trim()
  }, n = t.detail.field_completeness[a]?.required === !0, d = {
    ...t.detail.field_completeness,
    [a]: {
      required: n,
      complete: !n || s.trim() !== "",
      missing: n && s.trim() === ""
    }
  }, c = {
    ...t.detail.field_validations,
    [a]: {
      valid: !d[a].missing,
      message: d[a].missing ? t.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...t.detail,
    target_fields: r,
    field_completeness: d,
    field_validations: c
  };
  return u.fields = A(u), {
    ...t,
    detail: u,
    dirty_fields: {
      ...t.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: t.assignment_row_version,
    can_submit_review: j(u)
  };
}
function re(t) {
  return {
    ...t,
    assignment_row_version: t.assignment_row_version,
    autosave: {
      ...t.autosave,
      pending: !0
    }
  };
}
function ne(t, e) {
  const s = ae(e), a = {
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
  return a.fields = A(a), {
    ...t,
    detail: a,
    dirty_fields: {},
    assignment_row_version: t.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: j(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function oe(t, e) {
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
function R(t, e) {
  const s = new URL(t, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(e))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(t) ? s.toString() : `${s.pathname}${s.search}`;
}
class de extends Error {
  constructor(e) {
    super(e.message), this.name = "TranslationEditorRequestError", this.status = e.status, this.code = e.code ?? null, this.metadata = e.metadata ?? null, this.requestId = e.requestId, this.traceId = e.traceId;
  }
}
async function y(t, e) {
  const s = await L(t);
  return new de({
    message: s.message || await z(t, e),
    status: t.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(t.headers.get("x-request-id")) || void 0,
    traceId: O(t.headers) || void 0
  });
}
async function le(t) {
  const e = await v(t, { method: "GET" }), s = i(e.headers.get("x-request-id")) || void 0, a = O(e.headers) || void 0;
  if (!e.ok) {
    const d = await L(e);
    return {
      status: d.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: d.message || `Failed to load assignment (${e.status})`,
      requestId: s,
      traceId: a,
      statusCode: e.status,
      errorCode: d.textCode
    };
  }
  const r = await e.json(), n = se(r);
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
function ce(t) {
  return !t || t <= 0 ? "0 B" : t < 1024 ? `${t} B` : t < 1024 * 1024 ? `${(t / 1024).toFixed(1)} KB` : `${(t / (1024 * 1024)).toFixed(1)} MB`;
}
function q(t) {
  const e = i(t);
  if (!e) return "";
  const s = new Date(e);
  return Number.isNaN(s.getTime()) ? e : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function x(t) {
  const e = i(t).replace(/_/g, " ");
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function ue(t) {
  return i(t.status || t.translation_assignment.status || t.translation_assignment.queue_state);
}
function me(t) {
  return t === "review" || t === "in_review";
}
function fe(t) {
  const e = ue(t);
  return me(e) ? !0 : !!(t.review_action_states.approve?.enabled || t.review_action_states.reject?.enabled);
}
function pe(t) {
  return !!t.assignment_action_states.archive?.enabled;
}
function be(t, e, s) {
  return t?.autosave.conflict ? { tone: "bg-rose-100 text-rose-700", text: "Conflict detected", state: "conflict" } : t?.autosave.pending ? { tone: "bg-amber-100 text-amber-700", text: "Autosaving draft…", state: "saving" } : e ? { tone: "bg-slate-100 text-slate-700", text: "Unsaved changes", state: "dirty" } : s ? { tone: "bg-emerald-100 text-emerald-700", text: s, state: "saved" } : { tone: "bg-slate-100 text-slate-700", text: "No pending changes", state: "idle" };
}
function D(t) {
  const e = [
    t.requestId ? `Request ${o(t.requestId)}` : "",
    t.traceId ? `Trace ${o(t.traceId)}` : "",
    t.errorCode ? `Code ${o(t.errorCode)}` : ""
  ].filter(Boolean);
  return e.length ? `<p class="mt-3 text-xs text-slate-500">${e.join(" · ")}</p>` : "";
}
function ge(t) {
  return t ? `
    <div class="rounded-2xl border px-4 py-3 text-sm font-medium ${t.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : t.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${f(t.kind)}" role="status" aria-live="polite">
      ${o(t.message)}
    </div>
  ` : "";
}
function _e() {
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-slate-500">Loading translation assignment…</p>
    </section>
  `;
}
function T(t, e) {
  return `
    <section class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">${o(t)}</h2>
      <p class="mt-2 text-sm text-slate-500">${o(e)}</p>
    </section>
  `;
}
function C(t, e, s) {
  return `
    <section class="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <h2 class="text-lg font-semibold text-rose-900">${o(t)}</h2>
      <p class="mt-2 text-sm text-rose-700">${o(e)}</p>
      ${D(s)}
    </section>
  `;
}
function ve(t, e, s, a, r) {
  const n = t.assignment_action_states.submit_review, d = !n?.enabled || r || a || t.qa_results.submit_blocked, c = r || !s, u = (t.source_locale || "source").toUpperCase(), b = (t.target_locale || "target").toUpperCase(), g = t.translation_assignment, M = t.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : n?.reason || "";
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assignment editor</p>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-950">${o(g.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-slate-600">
              ${o(u)} to ${o(b)} • ${o(x(t.status || g.status || "draft"))} • Priority ${o(t.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-slate-600">
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Assignee ${o(g.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Reviewer ${o(g.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${e.tone}" data-autosave-state="${f(e.state)}">${o(e.text)}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 ${c ? "cursor-not-allowed opacity-60" : "hover:border-slate-400 hover:text-slate-900"}"
            data-action="save-draft"
            ${c ? 'disabled aria-disabled="true"' : ""}
          >
            ${r ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white ${d ? "cursor-not-allowed opacity-60" : "hover:bg-sky-700"}"
            data-action="submit-review"
            title="${f(M)}"
            ${d ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : n?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function he(t) {
  return t.drift.changed ? `
    <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${f(t.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${o(t.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${o(t.drift.current_source_value || t.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function xe(t) {
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
function ye(t) {
  return `
    <section class="space-y-4">
      ${t.fields.map((e) => `
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-editor-field="${f(e.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-950">${o(e.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${o(e.path)}${e.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
              data-copy-source="${f(e.path)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-slate-800">${o(e.source_value || "No source text")}</div>
            </div>
            <div class="rounded-2xl border ${e.validation.valid ? "border-slate-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" for="editor-field-${f(e.path)}">Translation</label>
              ${e.input_type === "textarea" ? `<textarea id="editor-field-${f(e.path)}" class="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${f(e.path)}">${o(e.target_value)}</textarea>` : `<input id="editor-field-${f(e.path)}" type="text" class="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${f(e.path)}" value="${f(e.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${e.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${e.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${e.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${e.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${f(e.path)}">${o(e.validation.message || "Validation error")}</p>`}
              ${he(e)}
              ${xe(e)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function we(t) {
  const e = t.assist.glossary_matches, s = t.assist.style_guide_summary;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-950">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">Glossary</h3>
          ${e.length ? `<ul class="mt-3 space-y-2">${e.map((a) => `
                <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                  <strong class="text-slate-950">${o(a.term)}</strong> → ${o(a.preferred_translation)}
                  ${a.notes ? `<p class="mt-1 text-xs text-slate-500">${o(a.notes)}</p>` : ""}
                </li>
              `).join("")}</ul>` : '<p class="mt-3 text-sm text-slate-500">Glossary matches unavailable for this assignment.</p>'}
        </div>
        <div>
          <h3 class="text-sm font-semibold text-slate-800">Style guide</h3>
          ${s.available ? `
              <div class="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p class="text-sm font-semibold text-slate-900">${o(s.title)}</p>
                <p class="mt-2 text-sm text-slate-700">${o(s.summary)}</p>
                <ul class="mt-3 space-y-2 text-sm text-slate-700">
                  ${s.rules.map((a) => `<li>• ${o(a)}</li>`).join("")}
                </ul>
              </div>
            ` : '<p class="mt-3 text-sm text-slate-500">Style-guide guidance is unavailable. Editing remains enabled.</p>'}
        </div>
      </div>
    </section>
  `;
}
function $e(t) {
  const e = t.review_feedback.comments;
  return !e.length && !t.last_rejection_reason ? "" : `
    <section class="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-amber-950">Reviewer feedback</h2>
      ${t.last_rejection_reason ? `<p class="mt-3 rounded-2xl bg-white/70 px-3 py-3 text-sm text-amber-900">${o(t.last_rejection_reason)}</p>` : ""}
      ${e.length ? `<ol class="mt-4 space-y-3">${e.map((s) => `
            <li class="rounded-2xl border border-amber-200 bg-white px-3 py-3 text-sm text-amber-900">
              <p>${o(s.body || "Feedback unavailable")}</p>
              <p class="mt-2 text-xs text-amber-700">${o(s.author_id || "Reviewer")}${s.created_at ? ` • ${o(q(s.created_at))}` : ""}</p>
            </li>
          `).join("")}</ol>` : ""}
    </section>
  `;
}
function ke(t) {
  const e = t.qa_results;
  if (!e.enabled)
    return "";
  const s = e.findings;
  return `
    <section class="rounded-3xl border ${e.submit_blocked ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"} p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold text-slate-950">QA checks</h2>
          <p class="mt-1 text-sm ${e.submit_blocked ? "text-rose-700" : "text-slate-600"}">
            ${e.submit_blocked ? "Submit is blocked until blockers are resolved." : "Warnings are advisory; blockers must be resolved before submit."}
          </p>
        </div>
        <span class="rounded-full ${e.submit_blocked ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-700"} px-3 py-1 text-xs font-semibold">
          ${e.summary.finding_count} findings
        </span>
      </div>
      <div class="mt-4 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Warnings ${e.summary.warning_count}</span>
        <span class="rounded-full bg-rose-100 px-3 py-1 font-medium text-rose-800">Blockers ${e.summary.blocker_count}</span>
      </div>
      ${s.length ? `<ol class="mt-4 space-y-3">${s.map((a) => `
            <li class="rounded-2xl border ${a.severity === "blocker" ? "border-rose-200 bg-white text-rose-900" : "border-amber-200 bg-white text-amber-900"} px-3 py-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <strong>${o(x(a.category))}</strong>
                <span class="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${a.severity === "blocker" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}">${o(a.severity)}</span>
              </div>
              <p class="mt-2">${o(a.message)}</p>
              ${a.field_path ? `<p class="mt-2 text-xs opacity-80">Field ${o(a.field_path)}</p>` : ""}
            </li>
          `).join("")}</ol>` : '<p class="mt-4 text-sm text-slate-500">No QA findings for this assignment.</p>'}
    </section>
  `;
}
function Se(t, e) {
  const s = t.review_action_states.approve, a = t.review_action_states.reject;
  return fe(t) ? `
    <section
      class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      data-editor-panel="review-actions"
      aria-label="Review actions"
    >
      <h2 class="text-lg font-semibold text-slate-950">Review actions</h2>
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
      label: "Reject",
      state: a,
      tone: "border-rose-300 text-rose-700"
    }
  ].map((n) => {
    const d = !n.state?.enabled || e;
    return `
            <button
              type="button"
              class="rounded-xl border px-4 py-2 text-sm font-semibold ${n.tone} ${d ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"}"
              data-action="${f(n.key)}"
              title="${f(n.state?.reason || "")}"
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
function Ae(t, e) {
  if (!pe(t))
    return "";
  const s = t.assignment_action_states.archive, a = !s?.enabled || e;
  return `
    <section
      class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
      data-editor-panel="management-actions"
      aria-label="Management actions"
    >
      <h2 class="text-lg font-semibold text-slate-950">Management actions</h2>
      <div class="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 ${a ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"}"
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
function je(t) {
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">Attachments</h2>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">${t.attachment_summary.total}</span>
      </div>
      ${t.attachments.length ? `<ul class="mt-4 space-y-3">${t.attachments.map((e) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">${o(e.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${o(e.kind)}</p>
                </div>
                <span class="text-xs text-slate-500">${o(ce(e.byte_size))}</span>
              </div>
              ${e.description ? `<p class="mt-2 text-xs text-slate-500">${o(e.description)}</p>` : ""}
              ${e.uploaded_at ? `<p class="mt-2 text-xs text-slate-500">Uploaded ${o(q(e.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-slate-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function qe(t) {
  const e = t.history;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">History</h2>
        <span class="text-xs text-slate-500">Page ${e.page} of ${Math.max(1, Math.ceil(e.total / Math.max(1, e.per_page)))}</span>
      </div>
      ${e.items.length ? `<ol class="mt-4 space-y-3">${e.items.map((s) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700" data-history-entry="${f(s.id)}">
              <div class="flex items-start justify-between gap-3">
                <p class="font-semibold text-slate-900">${o(s.title || x(s.entry_type))}</p>
                <span class="text-xs text-slate-500">${o(q(s.created_at))}</span>
              </div>
              ${s.body ? `<p class="mt-2 text-sm text-slate-700">${o(s.body)}</p>` : ""}
              ${s.action ? `<p class="mt-2 text-xs text-slate-500">Action ${o(s.action)}</p>` : ""}
            </li>
          `).join("")}</ol>` : '<p class="mt-4 text-sm text-slate-500">No history entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-prev="true" ${e.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-next="true" ${e.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function Ee(t, e, s = {}, a = {}) {
  if (t.status === "loading") return _e();
  if (t.status === "empty") return T("Assignment unavailable", t.message || "No assignment detail payload was returned.");
  if (t.status === "error") return C("Editor unavailable", t.message || "Unable to load the assignment editor.", t);
  if (t.status === "conflict") return C("Editor conflict", t.message || "A newer version of this assignment is available.", t);
  const r = e?.detail || t.detail;
  if (!r) return T("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(e && Object.keys(e.dirty_fields).length), d = be(e || null, n, a.lastSavedMessage || ""), c = e?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${ge(a.feedback || null)}
      ${ve(r, d, n, a.submitting === !0, a.saving === !0)}
      ${c ? `
        <section class="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-amber-900">Autosave conflict</h2>
              <p class="mt-1 text-sm text-amber-800">A newer server draft exists. Reload it before continuing.</p>
            </div>
            <button type="button" class="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700" data-action="reload-server-state">Reload server draft</button>
          </div>
        </section>
      ` : ""}
      <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div class="space-y-6">
          ${ye(r)}
        </div>
        <aside class="space-y-6">
          ${Se(r, a.submitting === !0)}
          ${Ae(r, a.submitting === !0)}
          ${$e(r)}
          ${ke(r)}
          ${we(r)}
          ${je(r)}
          ${qe(r)}
          ${D(t)}
        </aside>
      </div>
    </div>
  `;
}
function Re(t, e, s, a = {}, r = {}) {
  t.innerHTML = Ee(e, s, a, r);
}
class Te {
  constructor(e) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.saving = !1, this.submitting = !1, this.config = {
      endpoint: e.endpoint,
      variantEndpointBase: e.variantEndpointBase,
      actionEndpointBase: e.actionEndpointBase,
      basePath: e.basePath || "/admin"
    };
  }
  mount(e) {
    this.container = e, this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async load(e) {
    this.loadState = { status: "loading" }, this.render();
    const s = e ? R(this.config.endpoint, {
      history_page: e,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint;
    this.loadState = await le(s), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = ie(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (Re(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting
    }), this.attachEventListeners());
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((e) => {
      e.addEventListener("input", (s) => {
        const a = s.currentTarget, r = a.dataset.fieldInput || "";
        this.editorState = E(this.editorState, r, a.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((e) => {
      e.addEventListener("click", () => {
        const s = e.dataset.copySource || "", a = this.editorState?.detail.fields.find((r) => r.path === s);
        !a || !this.editorState || (this.editorState = E(this.editorState, s, a.source_value), this.scheduleAutosave(), this.render());
      });
    }), this.container.querySelector('[data-action="save-draft"]')?.addEventListener("click", () => {
      this.saveDirtyFields(!1);
    }), this.container.querySelector('[data-action="submit-review"]')?.addEventListener("click", () => {
      this.submitForReview();
    }), this.container.querySelector('[data-action="approve"]')?.addEventListener("click", () => {
      this.runReviewAction("approve");
    }), this.container.querySelector('[data-action="reject"]')?.addEventListener("click", () => {
      this.runReviewAction("reject");
    }), this.container.querySelector('[data-action="archive"]')?.addEventListener("click", () => {
      this.runReviewAction("archive");
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
    this.saving = !0, this.editorState = re(this.editorState), this.render();
    const s = this.editorState.detail, a = await v(R(`${this.config.variantEndpointBase}/${encodeURIComponent(s.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: e,
        fields: this.editorState.dirty_fields
      }
    });
    if (!a.ok) {
      if (a.status === 409) {
        const d = await a.json().catch(async () => ({ error: { message: await z(a, "Autosave conflict") } }));
        return this.editorState = oe(this.editorState, d), this.feedback = { kind: "conflict", message: "Autosave conflict detected. Reload the latest server draft." }, this.saving = !1, this.render(), !1;
      }
      const n = await y(a, "Failed to save draft");
      return this.feedback = { kind: "error", message: n.message }, this.saving = !1, this.render(), !1;
    }
    const r = await a.json();
    return this.editorState = ne(this.editorState, r), this.lastSavedMessage = e ? "Draft saved automatically" : "Draft saved", e || (this.feedback = { kind: "success", message: "Draft saved." }), this.saving = !1, this.render(), !0;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    const e = this.editorState.detail.assignment_action_states.submit_review;
    if (!e?.enabled) {
      this.feedback = { kind: "error", message: e?.reason || "Submit for review is unavailable." }, this.render();
      return;
    }
    if (!this.editorState.can_submit_review) {
      const d = Object.entries(this.editorState.detail.field_completeness).filter(([, c]) => c.required && c.missing).map(([c]) => c);
      this.feedback = {
        kind: this.editorState.detail.qa_results.submit_blocked ? "conflict" : "error",
        message: this.editorState.detail.qa_results.submit_blocked ? "Resolve QA blockers before submitting for review." : d.length ? `Complete required fields before submitting for review: ${d.join(", ")}.` : "Submit for review is unavailable."
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
      const d = await y(a, "Failed to submit assignment");
      this.feedback = {
        kind: d.code === "VERSION_CONFLICT" || d.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: d.message
      }, this.submitting = !1, this.render();
      return;
    }
    const r = await a.json(), n = i(l(r).data && l(l(r).data).status);
    this.feedback = {
      kind: "success",
      message: n === "approved" ? "Submitted and auto-approved." : "Submitted for review."
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
  async runReviewAction(e) {
    if (!this.editorState || this.submitting) return;
    const s = this.editorState.detail, a = e === "archive" ? s.assignment_action_states.archive : s.review_action_states[e];
    if (!a?.enabled) {
      this.feedback = { kind: "error", message: a?.reason || `${x(e)} is unavailable.` }, this.render();
      return;
    }
    const r = {
      expected_version: s.translation_assignment.version
    };
    if (e === "reject") {
      const d = typeof window < "u" ? window.prompt("Reject reason") : "";
      if (!d || !d.trim()) {
        this.feedback = { kind: "error", message: "Reject reason is required." }, this.render();
        return;
      }
      r.reason = d.trim();
    }
    this.submitting = !0, this.render();
    const n = await v(`${this.config.actionEndpointBase}/${encodeURIComponent(s.assignment_id)}/actions/${e}`, {
      method: "POST",
      json: r
    });
    if (!n.ok) {
      const d = await y(n, `Failed to ${e} assignment`);
      this.feedback = {
        kind: d.code === "VERSION_CONFLICT" || d.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: d.message
      }, this.submitting = !1, this.render();
      return;
    }
    this.feedback = {
      kind: "success",
      message: e === "approve" ? "Assignment approved." : e === "reject" ? "Assignment rejected." : "Assignment archived."
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
}
async function Oe(t, e) {
  const s = new Te(e);
  return s.mount(t), s;
}
export {
  de as TranslationEditorRequestError,
  Te as TranslationEditorScreen,
  oe as applyEditorAutosaveConflict,
  E as applyEditorFieldChange,
  ne as applyEditorUpdateResponse,
  ie as createTranslationEditorState,
  le as fetchTranslationEditorDetailState,
  Oe as initTranslationEditorPage,
  re as markEditorAutosavePending,
  se as normalizeAssignmentEditorDetail,
  I as normalizeEditorAssistPayload,
  ae as normalizeEditorUpdateResponse,
  Re as renderTranslationEditorPage,
  Ee as renderTranslationEditorState
};
//# sourceMappingURL=index.js.map
