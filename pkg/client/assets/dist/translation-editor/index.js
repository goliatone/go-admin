import { n as N } from "../chunks/index-Dvt9oAtQ.js";
import { a as o, e as m } from "../chunks/html-Br-oQr7i.js";
import { h as b, r as C } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as z } from "../toast/error-helpers.js";
function d(e) {
  return e && typeof e == "object" ? e : {};
}
function i(e) {
  return typeof e == "string" ? e.trim() : "";
}
function h(e) {
  return e === !0;
}
function f(e, t = 0) {
  return typeof e == "number" && Number.isFinite(e) ? e : t;
}
function x(e) {
  const t = d(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const n = i(r);
    a.trim() && (s[a.trim()] = n);
  }
  return s;
}
function R(e) {
  return Array.isArray(e) ? e.map((t) => i(t)).filter(Boolean) : [];
}
function y(e) {
  const t = d(e);
  return {
    required: h(t.required),
    complete: h(t.complete),
    missing: h(t.missing)
  };
}
function w(e) {
  const t = d(e), s = i(t.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: h(t.changed),
    comparison_mode: s,
    previous_source_value: i(t.previous_source_value),
    current_source_value: i(t.current_source_value)
  };
}
function $(e) {
  const t = d(e);
  return {
    valid: t.valid !== !1,
    message: i(t.message)
  };
}
function _(e, t) {
  const s = d(e), a = {};
  for (const [r, n] of Object.entries(s))
    r.trim() && (a[r.trim()] = t(n));
  return a;
}
function B(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const s of e) {
    const a = d(s), r = i(a.term), n = i(a.preferred_translation);
    !r || !n || t.push({
      term: r,
      preferred_translation: n,
      notes: i(a.notes) || void 0,
      field_paths: R(a.field_paths)
    });
  }
  return t;
}
function M(e) {
  const t = d(e);
  return {
    available: h(t.available),
    title: i(t.title),
    summary: i(t.summary) || i(t.summary_markdown),
    rules: R(t.rules)
  };
}
function L(e) {
  return i(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function U(e) {
  const t = d(e), s = i(t.id), a = i(t.filename);
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
function H(e) {
  return Array.isArray(e) ? e.map((t) => U(t)).filter((t) => t !== null) : [];
}
function G(e, t) {
  const s = d(e), a = d(s.kinds), r = {};
  for (const [n, l] of Object.entries(a)) {
    const c = f(l);
    n.trim() && (r[n.trim()] = c);
  }
  if (!Object.keys(r).length)
    for (const n of t)
      r[n.kind] = (r[n.kind] || 0) + 1;
  return {
    total: f(s.total, t.length),
    kinds: r
  };
}
function V(e) {
  return i(e) === "comment" ? "comment" : "event";
}
function K(e) {
  const t = d(e), s = i(t.id);
  return s ? {
    id: s,
    entry_type: V(t.entry_type),
    title: i(t.title),
    body: i(t.body),
    action: i(t.action),
    actor_id: i(t.actor_id),
    author_id: i(t.author_id),
    created_at: i(t.created_at),
    kind: i(t.kind),
    metadata: d(t.metadata)
  } : null;
}
function W(e) {
  const t = d(e), s = Array.isArray(t.items) ? t.items.map((a) => K(a)).filter((a) => a !== null) : [];
  return {
    items: s,
    page: f(t.page, 1) || 1,
    per_page: f(t.per_page, 10) || 10,
    total: f(t.total, s.length),
    has_more: h(t.has_more),
    next_page: f(t.next_page)
  };
}
function Y(e) {
  const t = d(e);
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
function O(e, t) {
  const s = d(e), a = d(t);
  return {
    glossary_matches: B(
      s.glossary_matches ?? a.glossary_matches
    ),
    style_guide_summary: M(
      s.style_guide_summary ?? a.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(s.translation_memory_suggestions) ? s.translation_memory_suggestions.filter((r) => r && typeof r == "object") : []
  };
}
function v(e) {
  const t = d(e), s = {};
  for (const [a, r] of Object.entries(t)) {
    const n = N(r);
    !n || !a.trim() || (s[a.trim()] = n);
  }
  return s;
}
function F(e, t, s, a, r, n) {
  if (Array.isArray(e.fields))
    return e.fields.map((c) => {
      const u = d(c), p = i(u.path);
      return p ? {
        path: p,
        label: i(u.label) || p,
        input_type: i(u.input_type) || "text",
        required: h(u.required),
        source_value: i(u.source_value) || t[p] || "",
        target_value: i(u.target_value) || s[p] || "",
        completeness: y(u.completeness ?? a[p]),
        drift: w(u.drift ?? r[p]),
        validation: $(u.validation ?? n[p]),
        glossary_hits: Array.isArray(u.glossary_hits) ? u.glossary_hits.filter((g) => g && typeof g == "object") : []
      } : null;
    }).filter((c) => !!c);
  const l = /* @__PURE__ */ new Set([
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(a),
    ...Object.keys(r),
    ...Object.keys(n)
  ]);
  return Array.from(l).sort().map((c) => ({
    path: c,
    label: c,
    input_type: "text",
    required: a[c]?.required === !0,
    source_value: t[c] || "",
    target_value: s[c] || "",
    completeness: a[c] ?? { required: !1, complete: !0, missing: !1 },
    drift: r[c] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: t[c] || ""
    },
    validation: n[c] ?? { valid: !0, message: "" },
    glossary_hits: []
  }));
}
function J(e) {
  const t = d(e), s = d(t.data && typeof t.data == "object" ? t.data : e), a = x(s.source_fields), r = x(s.target_fields ?? s.fields), n = _(s.field_completeness, y), l = _(s.field_drift, w), c = _(s.field_validations, $), u = H(s.attachments);
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
    fields: F(s, a, r, n, l, c),
    field_completeness: n,
    field_drift: l,
    field_validations: c,
    source_target_drift: d(s.source_target_drift),
    history: W(s.history),
    attachments: u,
    attachment_summary: G(s.attachment_summary, u),
    translation_assignment: Y(s.translation_assignment),
    assist: O(s.assist, s),
    assignment_action_states: v(
      s.assignment_action_states ?? s.editor_actions ?? s.actions
    ),
    review_action_states: v(
      s.review_action_states ?? s.review_actions
    )
  };
}
function Q(e) {
  const t = d(e), s = d(t.data && typeof t.data == "object" ? t.data : e);
  return {
    variant_id: i(s.variant_id),
    row_version: f(s.row_version || s.version),
    fields: x(s.fields),
    field_completeness: _(s.field_completeness, y),
    field_drift: _(s.field_drift, w),
    field_validations: _(s.field_validations, $),
    assist: O(s.assist, s),
    assignment_action_states: v(s.assignment_action_states),
    review_action_states: v(s.review_action_states)
  };
}
function S(e) {
  return F(
    { fields: e.fields },
    e.source_fields,
    e.target_fields,
    e.field_completeness,
    e.field_drift,
    e.field_validations
  );
}
function k(e) {
  if (!e.assignment_action_states.submit_review?.enabled) return !1;
  for (const s of Object.values(e.field_completeness))
    if (s.required && s.missing) return !1;
  return !0;
}
function X(e) {
  return {
    detail: {
      ...e,
      fields: S(e)
    },
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: e.row_version,
    can_submit_review: k(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function E(e, t, s) {
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
  }, c = {
    ...e.detail.field_validations,
    [a]: {
      valid: !l[a].missing,
      message: l[a].missing ? e.detail.field_validations[a]?.message || `${a} is required` : ""
    }
  }, u = {
    ...e.detail,
    target_fields: r,
    field_completeness: l,
    field_validations: c
  };
  return u.fields = S(u), {
    ...e,
    detail: u,
    dirty_fields: {
      ...e.dirty_fields,
      [a]: s.trim()
    },
    assignment_row_version: e.assignment_row_version,
    can_submit_review: k(u)
  };
}
function Z(e) {
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function tt(e, t) {
  const s = Q(t), a = {
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
    assignment_action_states: s.assignment_action_states,
    review_action_states: s.review_action_states
  };
  return a.fields = S(a), {
    ...e,
    detail: a,
    dirty_fields: {},
    assignment_row_version: e.assignment_row_version,
    row_version: s.row_version,
    can_submit_review: k(a),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function et(e, t) {
  const s = d(d(d(t).error).metadata);
  return {
    ...e,
    assignment_row_version: e.assignment_row_version,
    autosave: {
      pending: !1,
      conflict: d(s.latest_server_state_record)
    }
  };
}
function A(e, t) {
  const s = new URL(e, typeof window < "u" ? window.location.origin : "http://localhost");
  for (const [a, r] of Object.entries(t))
    r == null || `${r}`.trim() === "" || s.searchParams.set(a, String(r));
  return /^https?:\/\//i.test(e) ? s.toString() : `${s.pathname}${s.search}`;
}
class st extends Error {
  constructor(t) {
    super(t.message), this.name = "TranslationEditorRequestError", this.status = t.status, this.code = t.code ?? null, this.metadata = t.metadata ?? null, this.requestId = t.requestId, this.traceId = t.traceId;
  }
}
async function j(e, t) {
  const s = await z(e);
  return new st({
    message: s.message || await C(e, t),
    status: e.status,
    code: s.textCode,
    metadata: s.metadata,
    requestId: i(e.headers.get("x-request-id")) || void 0,
    traceId: L(e.headers) || void 0
  });
}
async function at(e) {
  const t = await b(e, { method: "GET" }), s = i(t.headers.get("x-request-id")) || void 0, a = L(t.headers) || void 0;
  if (!t.ok) {
    const l = await z(t);
    return {
      status: l.textCode === "VERSION_CONFLICT" ? "conflict" : "error",
      message: l.message || `Failed to load assignment (${t.status})`,
      requestId: s,
      traceId: a,
      statusCode: t.status,
      errorCode: l.textCode
    };
  }
  const r = await t.json(), n = J(r);
  return n.assignment_id ? {
    status: "ready",
    detail: n,
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
function I(e) {
  const t = i(e);
  if (!t) return "";
  const s = new Date(t);
  return Number.isNaN(s.getTime()) ? t : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function P(e) {
  const t = i(e).replace(/_/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function rt(e, t, s) {
  return e?.autosave.conflict ? { tone: "bg-rose-100 text-rose-700", text: "Conflict detected", state: "conflict" } : e?.autosave.pending ? { tone: "bg-amber-100 text-amber-700", text: "Autosaving draft…", state: "saving" } : t ? { tone: "bg-slate-100 text-slate-700", text: "Unsaved changes", state: "dirty" } : s ? { tone: "bg-emerald-100 text-emerald-700", text: s, state: "saved" } : { tone: "bg-slate-100 text-slate-700", text: "No pending changes", state: "idle" };
}
function D(e) {
  const t = [
    e.requestId ? `Request ${o(e.requestId)}` : "",
    e.traceId ? `Trace ${o(e.traceId)}` : "",
    e.errorCode ? `Code ${o(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `<p class="mt-3 text-xs text-slate-500">${t.join(" · ")}</p>` : "";
}
function nt(e) {
  return e ? `
    <div class="rounded-2xl border px-4 py-3 text-sm font-medium ${e.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : e.kind === "conflict" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-rose-200 bg-rose-50 text-rose-800"}" data-editor-feedback-kind="${m(e.kind)}" role="status" aria-live="polite">
      ${o(e.message)}
    </div>
  ` : "";
}
function ot() {
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm" aria-busy="true">
      <p class="text-sm font-medium text-slate-500">Loading translation assignment…</p>
    </section>
  `;
}
function T(e, t) {
  return `
    <section class="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
      <h2 class="text-lg font-semibold text-slate-900">${o(e)}</h2>
      <p class="mt-2 text-sm text-slate-500">${o(t)}</p>
    </section>
  `;
}
function q(e, t, s) {
  return `
    <section class="rounded-3xl border border-rose-200 bg-rose-50 p-8 shadow-sm">
      <h2 class="text-lg font-semibold text-rose-900">${o(e)}</h2>
      <p class="mt-2 text-sm text-rose-700">${o(t)}</p>
      ${D(s)}
    </section>
  `;
}
function dt(e, t, s, a, r) {
  const n = e.assignment_action_states.submit_review, l = !n?.enabled || r || a || e.history.total < 0, c = r || !s, u = (e.source_locale || "source").toUpperCase(), p = (e.target_locale || "target").toUpperCase(), g = e.translation_assignment;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-3">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Assignment editor</p>
          <div>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-950">${o(g.source_title || "Translation assignment")}</h1>
            <p class="mt-2 text-sm text-slate-600">
              ${o(u)} to ${o(p)} • ${o(P(e.status || g.status || "draft"))} • Priority ${o(e.priority || "normal")}
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-slate-600">
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Assignee ${o(g.assignee_id || "Unassigned")}</span>
            <span class="rounded-full bg-slate-100 px-3 py-1 font-medium">Reviewer ${o(g.reviewer_id || "Not set")}</span>
            <span class="rounded-full px-3 py-1 font-medium ${t.tone}" data-autosave-state="${m(t.state)}">${o(t.text)}</span>
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
            class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white ${l ? "cursor-not-allowed opacity-60" : "hover:bg-sky-700"}"
            data-action="submit-review"
            title="${m(n?.reason || "")}"
            ${l ? 'disabled aria-disabled="true"' : ""}
          >
            ${a ? "Submitting…" : n?.enabled ? "Submit for review" : "Submit unavailable"}
          </button>
        </div>
      </div>
    </section>
  `;
}
function lt(e) {
  return e.drift.changed ? `
    <div class="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" data-field-drift="${m(e.path)}">
      <p class="font-semibold">Source changed since the last synced draft.</p>
      <p class="mt-1"><span class="font-medium">Before:</span> ${o(e.drift.previous_source_value || "Unavailable")}</p>
      <p class="mt-1"><span class="font-medium">Current:</span> ${o(e.drift.current_source_value || e.source_value || "Unavailable")}</p>
    </div>
  ` : "";
}
function ct(e) {
  const t = Array.isArray(e.glossary_hits) ? e.glossary_hits : [];
  return t.length ? `
    <div class="mt-3 flex flex-wrap gap-2">
      ${t.map((s) => `
        <span class="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
          ${o(i(s.term))} → ${o(i(s.preferred_translation))}
        </span>
      `).join("")}
    </div>
  ` : "";
}
function ut(e) {
  return `
    <section class="space-y-4">
      ${e.fields.map((t) => `
        <article class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-editor-field="${m(t.path)}">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-slate-950">${o(t.label)}</h2>
              <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${o(t.path)}${t.required ? " • Required" : ""}</p>
            </div>
            <button
              type="button"
              class="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900"
              data-copy-source="${m(t.path)}"
            >
              Copy source
            </button>
          </div>
          <div class="mt-4 grid gap-4 xl:grid-cols-2">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source</p>
              <div class="mt-2 whitespace-pre-wrap text-sm text-slate-800">${o(t.source_value || "No source text")}</div>
            </div>
            <div class="rounded-2xl border ${t.validation.valid ? "border-slate-200" : "border-rose-200"} bg-white p-4">
              <label class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500" for="editor-field-${m(t.path)}">Translation</label>
              ${t.input_type === "textarea" ? `<textarea id="editor-field-${m(t.path)}" class="mt-2 min-h-[140px] w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}">${o(t.target_value)}</textarea>` : `<input id="editor-field-${m(t.path)}" type="text" class="mt-2 w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100" data-field-input="${m(t.path)}" value="${m(t.target_value)}" />`}
              <div class="mt-2 flex flex-wrap gap-2 text-xs">
                <span class="rounded-full px-2.5 py-1 ${t.completeness.missing ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}">
                  ${t.completeness.missing ? "Missing required content" : "Ready to submit"}
                </span>
                ${t.drift.changed ? '<span class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">Source changed</span>' : ""}
              </div>
              ${t.validation.valid ? "" : `<p class="mt-3 text-sm font-medium text-rose-700" data-field-validation="${m(t.path)}">${o(t.validation.message || "Validation error")}</p>`}
              ${lt(t)}
              ${ct(t)}
            </div>
          </div>
        </article>
      `).join("")}
    </section>
  `;
}
function mt(e) {
  const t = e.assist.glossary_matches, s = e.assist.style_guide_summary;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold text-slate-950">Assist</h2>
      <div class="mt-4 space-y-4">
        <div>
          <h3 class="text-sm font-semibold text-slate-800">Glossary</h3>
          ${t.length ? `<ul class="mt-3 space-y-2">${t.map((a) => `
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
function ft(e) {
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">Attachments</h2>
        <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">${e.attachment_summary.total}</span>
      </div>
      ${e.attachments.length ? `<ul class="mt-4 space-y-3">${e.attachments.map((t) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-slate-900">${o(t.filename)}</p>
                  <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">${o(t.kind)}</p>
                </div>
                <span class="text-xs text-slate-500">${o(it(t.byte_size))}</span>
              </div>
              ${t.description ? `<p class="mt-2 text-xs text-slate-500">${o(t.description)}</p>` : ""}
              ${t.uploaded_at ? `<p class="mt-2 text-xs text-slate-500">Uploaded ${o(I(t.uploaded_at))}</p>` : ""}
            </li>
          `).join("")}</ul>` : '<p class="mt-4 text-sm text-slate-500">No reference attachments for this assignment.</p>'}
    </section>
  `;
}
function pt(e) {
  const t = e.history;
  return `
    <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold text-slate-950">History</h2>
        <span class="text-xs text-slate-500">Page ${t.page} of ${Math.max(1, Math.ceil(t.total / Math.max(1, t.per_page)))}</span>
      </div>
      ${t.items.length ? `<ol class="mt-4 space-y-3">${t.items.map((s) => `
            <li class="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700" data-history-entry="${m(s.id)}">
              <div class="flex items-start justify-between gap-3">
                <p class="font-semibold text-slate-900">${o(s.title || P(s.entry_type))}</p>
                <span class="text-xs text-slate-500">${o(I(s.created_at))}</span>
              </div>
              ${s.body ? `<p class="mt-2 text-sm text-slate-700">${o(s.body)}</p>` : ""}
              ${s.action ? `<p class="mt-2 text-xs text-slate-500">Action ${o(s.action)}</p>` : ""}
            </li>
          `).join("")}</ol>` : '<p class="mt-4 text-sm text-slate-500">No history entries available.</p>'}
      <div class="mt-4 flex items-center justify-between gap-3">
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-prev="true" ${t.page <= 1 ? 'disabled aria-disabled="true"' : ""}>Previous</button>
        <button type="button" class="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400" data-history-next="true" ${t.has_more ? "" : 'disabled aria-disabled="true"'}>Next</button>
      </div>
    </section>
  `;
}
function gt(e, t, s = {}, a = {}) {
  if (e.status === "loading") return ot();
  if (e.status === "empty") return T("Assignment unavailable", e.message || "No assignment detail payload was returned.");
  if (e.status === "error") return q("Editor unavailable", e.message || "Unable to load the assignment editor.", e);
  if (e.status === "conflict") return q("Editor conflict", e.message || "A newer version of this assignment is available.", e);
  const r = t?.detail || e.detail;
  if (!r) return T("Assignment unavailable", "No assignment detail payload was returned.");
  const n = !!(t && Object.keys(t.dirty_fields).length), l = rt(t || null, n, a.lastSavedMessage || ""), c = t?.autosave.conflict;
  return `
    <div class="translation-editor-screen space-y-6" data-translation-editor="true">
      ${nt(a.feedback || null)}
      ${dt(r, l, n, a.submitting === !0, a.saving === !0)}
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
          ${ut(r)}
        </div>
        <aside class="space-y-6">
          ${mt(r)}
          ${ft(r)}
          ${pt(r)}
          ${D(e)}
        </aside>
      </div>
    </div>
  `;
}
function ht(e, t, s, a = {}, r = {}) {
  e.innerHTML = gt(t, s, a, r);
}
class _t {
  constructor(t) {
    this.container = null, this.loadState = { status: "loading" }, this.editorState = null, this.feedback = null, this.lastSavedMessage = "", this.autosaveTimer = null, this.saving = !1, this.submitting = !1, this.config = {
      endpoint: t.endpoint,
      variantEndpointBase: t.variantEndpointBase,
      actionEndpointBase: t.actionEndpointBase,
      basePath: t.basePath || "/admin"
    };
  }
  mount(t) {
    this.container = t, this.render(), this.load();
  }
  unmount() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.container && (this.container.innerHTML = ""), this.container = null;
  }
  async load(t) {
    this.loadState = { status: "loading" }, this.render();
    const s = t ? A(this.config.endpoint, {
      history_page: t,
      history_per_page: this.editorState?.detail.history.per_page || this.loadState.detail?.history.per_page || 10
    }) : this.config.endpoint;
    this.loadState = await at(s), this.loadState.status === "ready" && this.loadState.detail ? this.editorState = X(this.loadState.detail) : this.editorState = null, this.render();
  }
  render() {
    this.container && (ht(this.container, this.loadState, this.editorState, { basePath: this.config.basePath }, {
      feedback: this.feedback,
      lastSavedMessage: this.lastSavedMessage,
      saving: this.saving,
      submitting: this.submitting
    }), this.attachEventListeners());
  }
  attachEventListeners() {
    !this.container || !this.editorState || (this.container.querySelectorAll("[data-field-input]").forEach((t) => {
      t.addEventListener("input", (s) => {
        const a = s.currentTarget, r = a.dataset.fieldInput || "";
        this.editorState = E(this.editorState, r, a.value), this.feedback = null, this.lastSavedMessage = "", this.scheduleAutosave(), this.render();
      });
    }), this.container.querySelectorAll("[data-copy-source]").forEach((t) => {
      t.addEventListener("click", () => {
        const s = t.dataset.copySource || "", a = this.editorState?.detail.fields.find((r) => r.path === s);
        !a || !this.editorState || (this.editorState = E(this.editorState, s, a.source_value), this.scheduleAutosave(), this.render());
      });
    }), this.container.querySelector('[data-action="save-draft"]')?.addEventListener("click", () => {
      this.saveDirtyFields(!1);
    }), this.container.querySelector('[data-action="submit-review"]')?.addEventListener("click", () => {
      this.submitForReview();
    }), this.container.querySelector('[data-action="reload-server-state"]')?.addEventListener("click", () => {
      this.feedback = { kind: "conflict", message: "Reloaded the latest server draft." }, this.load(this.editorState?.detail.history.page);
    }), this.container.querySelector('[data-history-prev="true"]')?.addEventListener("click", () => {
      const t = (this.editorState?.detail.history.page || 1) - 1;
      t >= 1 && this.load(t);
    }), this.container.querySelector('[data-history-next="true"]')?.addEventListener("click", () => {
      const t = this.editorState?.detail.history;
      t?.has_more && this.load(t.next_page || t.page + 1);
    }));
  }
  scheduleAutosave() {
    this.autosaveTimer && clearTimeout(this.autosaveTimer), this.autosaveTimer = setTimeout(() => {
      this.saveDirtyFields(!0);
    }, 600);
  }
  async saveDirtyFields(t) {
    if (!this.editorState || !Object.keys(this.editorState.dirty_fields).length || this.saving) return !0;
    this.saving = !0, this.editorState = Z(this.editorState), this.render();
    const s = this.editorState.detail, a = await b(A(`${this.config.variantEndpointBase}/${encodeURIComponent(s.variant_id)}`, {}), {
      method: "PATCH",
      json: {
        expected_version: this.editorState.row_version,
        autosave: t,
        fields: this.editorState.dirty_fields
      }
    });
    if (!a.ok) {
      if (a.status === 409) {
        const l = await a.json().catch(async () => ({ error: { message: await C(a, "Autosave conflict") } }));
        return this.editorState = et(this.editorState, l), this.feedback = { kind: "conflict", message: "Autosave conflict detected. Reload the latest server draft." }, this.saving = !1, this.render(), !1;
      }
      const n = await j(a, "Failed to save draft");
      return this.feedback = { kind: "error", message: n.message }, this.saving = !1, this.render(), !1;
    }
    const r = await a.json();
    return this.editorState = tt(this.editorState, r), this.lastSavedMessage = t ? "Draft saved automatically" : "Draft saved", t || (this.feedback = { kind: "success", message: "Draft saved." }), this.saving = !1, this.render(), !0;
  }
  async submitForReview() {
    if (!this.editorState || this.submitting) return;
    const t = this.editorState.detail.assignment_action_states.submit_review;
    if (!t?.enabled) {
      this.feedback = { kind: "error", message: t?.reason || "Submit for review is unavailable." }, this.render();
      return;
    }
    if (Object.keys(this.editorState.dirty_fields).length && !await this.saveDirtyFields(!1))
      return;
    this.submitting = !0, this.render();
    const s = this.editorState.detail.translation_assignment.version, a = await b(`${this.config.actionEndpointBase}/${encodeURIComponent(this.editorState.detail.assignment_id)}/actions/submit_review`, {
      method: "POST",
      json: { expected_version: s }
    });
    if (!a.ok) {
      const l = await j(a, "Failed to submit assignment");
      this.feedback = {
        kind: l.code === "VERSION_CONFLICT" || l.code === "POLICY_BLOCKED" ? "conflict" : "error",
        message: l.message
      }, this.submitting = !1, this.render();
      return;
    }
    const r = await a.json(), n = i(d(r).data && d(d(r).data).status);
    this.feedback = {
      kind: "success",
      message: n === "approved" ? "Submitted and auto-approved." : "Submitted for review."
    }, this.submitting = !1, await this.load(this.editorState.detail.history.page);
  }
}
async function wt(e, t) {
  const s = new _t(t);
  return s.mount(e), s;
}
export {
  st as TranslationEditorRequestError,
  _t as TranslationEditorScreen,
  et as applyEditorAutosaveConflict,
  E as applyEditorFieldChange,
  tt as applyEditorUpdateResponse,
  X as createTranslationEditorState,
  at as fetchTranslationEditorDetailState,
  wt as initTranslationEditorPage,
  Z as markEditorAutosavePending,
  J as normalizeAssignmentEditorDetail,
  O as normalizeEditorAssistPayload,
  Q as normalizeEditorUpdateResponse,
  ht as renderTranslationEditorPage,
  gt as renderTranslationEditorState
};
//# sourceMappingURL=index.js.map
