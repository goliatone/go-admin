import { n as k } from "../chunks/index-Dvt9oAtQ.js";
function a(e) {
  return e && typeof e == "object" ? e : {};
}
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function _(e) {
  return e === !0;
}
function A(e) {
  return typeof e == "number" && Number.isFinite(e) ? e : 0;
}
function p(e) {
  const i = a(e), t = {};
  for (const [s, n] of Object.entries(i)) {
    const o = r(n);
    s.trim() && (t[s.trim()] = o);
  }
  return t;
}
function z(e) {
  return Array.isArray(e) ? e.map((i) => r(i)).filter(Boolean) : [];
}
function v(e) {
  const i = a(e);
  return {
    required: _(i.required),
    complete: _(i.complete),
    missing: _(i.missing)
  };
}
function y(e) {
  const i = a(e), t = r(i.comparison_mode) === "hash_only" ? "hash_only" : "snapshot";
  return {
    changed: _(i.changed),
    comparison_mode: t,
    previous_source_value: r(i.previous_source_value),
    current_source_value: r(i.current_source_value)
  };
}
function g(e) {
  const i = a(e);
  return {
    valid: i.valid !== !1,
    message: r(i.message)
  };
}
function f(e, i) {
  const t = a(e), s = {};
  for (const [n, o] of Object.entries(t))
    n.trim() && (s[n.trim()] = i(o));
  return s;
}
function q(e) {
  if (!Array.isArray(e)) return [];
  const i = [];
  for (const t of e) {
    const s = a(t), n = r(s.term), o = r(s.preferred_translation);
    !n || !o || i.push({
      term: n,
      preferred_translation: o,
      notes: r(s.notes) || void 0,
      field_paths: z(s.field_paths)
    });
  }
  return i;
}
function E(e) {
  const i = a(e);
  return {
    available: _(i.available),
    title: r(i.title),
    summary: r(i.summary) || r(i.summary_markdown),
    rules: z(i.rules)
  };
}
function j(e, i) {
  const t = a(e), s = a(i);
  return {
    glossary_matches: q(
      t.glossary_matches ?? s.glossary_matches
    ),
    style_guide_summary: E(
      t.style_guide_summary ?? s.style_guide_summary
    ),
    translation_memory_suggestions: Array.isArray(t.translation_memory_suggestions) ? t.translation_memory_suggestions.filter((n) => n && typeof n == "object") : []
  };
}
function m(e) {
  const i = a(e), t = {};
  for (const [s, n] of Object.entries(i)) {
    const o = k(n);
    !o || !s.trim() || (t[s.trim()] = o);
  }
  return t;
}
function h(e, i, t, s, n, o) {
  if (Array.isArray(e.fields))
    return e.fields.map((l) => {
      const d = a(l), u = r(d.path);
      return u ? {
        path: u,
        label: r(d.label) || u,
        input_type: r(d.input_type) || "text",
        required: _(d.required),
        source_value: r(d.source_value) || i[u] || "",
        target_value: r(d.target_value) || t[u] || "",
        completeness: v(d.completeness ?? s[u]),
        drift: y(d.drift ?? n[u]),
        validation: g(d.validation ?? o[u])
      } : null;
    }).filter((l) => !!l);
  const c = /* @__PURE__ */ new Set([
    ...Object.keys(i),
    ...Object.keys(t),
    ...Object.keys(s),
    ...Object.keys(n),
    ...Object.keys(o)
  ]);
  return Array.from(c).sort().map((l) => ({
    path: l,
    label: l,
    input_type: "text",
    required: s[l]?.required === !0,
    source_value: i[l] || "",
    target_value: t[l] || "",
    completeness: s[l] ?? { required: !1, complete: !0, missing: !1 },
    drift: n[l] ?? {
      changed: !1,
      comparison_mode: "snapshot",
      previous_source_value: "",
      current_source_value: i[l] || ""
    },
    validation: o[l] ?? { valid: !0, message: "" }
  }));
}
function x(e) {
  const i = a(e), t = a(i.data && typeof i.data == "object" ? i.data : e), s = p(t.source_fields), n = p(t.target_fields ?? t.fields), o = f(t.field_completeness, v), c = f(t.field_drift, y), l = f(t.field_validations, g);
  return {
    assignment_id: r(t.assignment_id),
    variant_id: r(t.variant_id),
    family_id: r(t.family_id),
    row_version: A(t.row_version || t.version),
    source_fields: s,
    target_fields: n,
    fields: h(t, s, n, o, c, l),
    field_completeness: o,
    field_drift: c,
    field_validations: l,
    assist: j(t.assist, t),
    assignment_action_states: m(
      t.assignment_action_states ?? t.editor_actions ?? t.actions
    ),
    review_action_states: m(
      t.review_action_states ?? t.review_actions
    )
  };
}
function S(e) {
  const i = a(e), t = a(i.data && typeof i.data == "object" ? i.data : e);
  return {
    variant_id: r(t.variant_id),
    row_version: A(t.row_version || t.version),
    fields: p(t.fields),
    field_completeness: f(t.field_completeness, v),
    field_drift: f(t.field_drift, y),
    field_validations: f(t.field_validations, g),
    assist: j(t.assist, t),
    assignment_action_states: m(t.assignment_action_states),
    review_action_states: m(t.review_action_states)
  };
}
function b(e) {
  return h(
    { fields: e.fields },
    e.source_fields,
    e.target_fields,
    e.field_completeness,
    e.field_drift,
    e.field_validations
  );
}
function w(e) {
  if (!e.assignment_action_states.submit_review?.enabled) return !1;
  for (const t of Object.values(e.field_completeness))
    if (t.required && t.missing) return !1;
  return !0;
}
function F(e) {
  return {
    detail: {
      ...e,
      fields: b(e)
    },
    dirty_fields: {},
    row_version: e.row_version,
    can_submit_review: w(e),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function C(e, i, t) {
  const s = i.trim();
  if (!s) return e;
  const n = {
    ...e.detail.target_fields,
    [s]: t.trim()
  }, o = e.detail.field_completeness[s]?.required === !0, c = {
    ...e.detail.field_completeness,
    [s]: {
      required: o,
      complete: !o || t.trim() !== "",
      missing: o && t.trim() === ""
    }
  }, l = {
    ...e.detail.field_validations,
    [s]: {
      valid: !c[s].missing,
      message: c[s].missing ? e.detail.field_validations[s]?.message || `${s} is required` : ""
    }
  }, d = {
    ...e.detail,
    target_fields: n,
    field_completeness: c,
    field_validations: l
  };
  return d.fields = b(d), {
    ...e,
    detail: d,
    dirty_fields: {
      ...e.dirty_fields,
      [s]: t.trim()
    },
    can_submit_review: w(d)
  };
}
function D(e) {
  return {
    ...e,
    autosave: {
      ...e.autosave,
      pending: !0
    }
  };
}
function M(e, i) {
  const t = S(i), s = {
    ...e.detail,
    row_version: t.row_version,
    target_fields: {
      ...e.detail.target_fields,
      ...t.fields
    },
    field_completeness: t.field_completeness,
    field_drift: t.field_drift,
    field_validations: t.field_validations,
    assist: t.assist,
    assignment_action_states: t.assignment_action_states,
    review_action_states: t.review_action_states
  };
  return s.fields = b(s), {
    ...e,
    detail: s,
    dirty_fields: {},
    row_version: t.row_version,
    can_submit_review: w(s),
    autosave: {
      pending: !1,
      conflict: null
    }
  };
}
function R(e, i) {
  const t = a(a(a(i).error).metadata);
  return {
    ...e,
    autosave: {
      pending: !1,
      conflict: a(t.latest_server_state_record)
    }
  };
}
export {
  R as applyEditorAutosaveConflict,
  C as applyEditorFieldChange,
  M as applyEditorUpdateResponse,
  F as createTranslationEditorState,
  D as markEditorAutosavePending,
  x as normalizeAssignmentEditorDetail,
  j as normalizeEditorAssistPayload,
  S as normalizeEditorUpdateResponse
};
//# sourceMappingURL=index.js.map
