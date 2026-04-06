import { escapeAttribute as _, escapeHTML as c } from "../shared/html.js";
import { httpRequest as ne, readHTTPJSON as oe } from "../shared/transport/http-client.js";
import { extractStructuredError as Q } from "../toast/error-helpers.js";
import { buildURL as E, setNumberSearchParam as M, setSearchParam as v } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as w } from "../shared/path-normalization.js";
import { parseJSONValue as V } from "../shared/json-parse.js";
import { asLooseBoolean as b, asNumberish as p, asRecord as m, asString as r, asStringArray as y } from "../shared/coercion.js";
import { $ as R, C as le, E as ce, H as de, S as me, U as ue, _ as ye, d as k, g as ge, h as fe, l as X, m as pe, o as be, p as _e, rt as he, s as D, v as ve } from "../chunks/translation-shared-BSLmw_rJ.js";
import { formatTranslationTimestampUTC as F, sentenceCaseToken as h } from "../translation-shared/formatters.js";
import { normalizeStringRecord as xe } from "../shared/record-normalization.js";
function J(e) {
  return r(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function q(e) {
  return r(e) === "ready" ? "ready" : "blocked";
}
function W(e) {
  const a = r(e);
  switch (a) {
    case "missing_locale":
    case "missing_field":
    case "pending_review":
    case "outdated_source":
    case "policy_denied":
      return a;
    default:
      return "policy_denied";
  }
}
function Ce(e = {}) {
  const a = r(e.channel);
  return {
    contentType: r(e.contentType),
    readinessState: r(e.readinessState),
    blockerCode: r(e.blockerCode),
    missingLocale: r(e.missingLocale),
    page: Math.max(1, p(e.page, 1)),
    perPage: Math.max(1, p(e.perPage, 50)),
    channel: a
  };
}
function Le(e = {}) {
  const a = Ce(e), t = new URLSearchParams();
  return v(t, "content_type", a.contentType), v(t, "readiness_state", a.readinessState), v(t, "blocker_code", a.blockerCode), v(t, "missing_locale", a.missingLocale), v(t, "channel", a.channel), M(t, "page", a.page, { min: 1 }), M(t, "per_page", a.perPage, { min: 1 }), t;
}
function U(e, a = "", t = "") {
  const s = w(e);
  return a ? `${s}/translations/families/${encodeURIComponent(r(a))}${t}` : `${s}/translations/families`;
}
function we(e, a = {}) {
  return E(U(e), Le(a));
}
function $e(e, a, t = "") {
  const s = new URLSearchParams();
  return v(s, "channel", t), E(U(e, a), s);
}
function Z(e = {}) {
  const a = r(e.channel);
  return {
    locale: r(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: r(e.assigneeId),
    priority: r(e.priority).toLowerCase(),
    dueDate: r(e.dueDate),
    channel: a,
    idempotencyKey: r(e.idempotencyKey)
  };
}
function Se(e, a, t = "") {
  const s = new URLSearchParams();
  return v(s, "channel", t), E(U(e, a, "/variants"), s);
}
function ke(e = {}) {
  const a = Z(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function qe(e) {
  return {
    assignmentId: r(e.assignment_id),
    status: r(e.status),
    targetLocale: r(e.target_locale),
    workScope: r(e.work_scope),
    assigneeId: r(e.assignee_id),
    priority: r(e.priority),
    dueDate: r(e.due_date)
  };
}
function Ae(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: r(e.work_scope),
    priority: r(e.priority) || "normal",
    assigneeId: r(e.assignee_id),
    dueDate: r(e.due_date)
  };
}
function N(e, a = {}) {
  const t = m(e.default_assignment), s = y(e.missing_locales ?? a.missingLocales), i = y(e.required_for_publish ?? a.requiredForPublish), n = r(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: n,
    requiredForPublish: i,
    defaultAssignment: Ae({
      auto_create_assignment: t.auto_create_assignment ?? a.defaultAssignment?.autoCreateAssignment,
      work_scope: t.work_scope ?? a.defaultAssignment?.workScope,
      priority: t.priority ?? a.defaultAssignment?.priority,
      assignee_id: t.assignee_id ?? a.defaultAssignment?.assigneeId,
      due_date: t.due_date ?? a.defaultAssignment?.dueDate
    }),
    disabledReasonCode: r(e.disabled_reason_code || a.disabledReasonCode),
    disabledReason: r(e.disabled_reason || a.disabledReason)
  };
}
function Te(e) {
  const a = m(e.data), t = m(e.meta), s = m(t.family), i = m(t.refresh), n = m(a.navigation), d = N(m(s.quick_create), { missingLocales: y(s.missing_locales) });
  return {
    variantId: r(a.variant_id),
    familyId: r(a.family_id) || r(s.family_id),
    locale: r(a.locale).toLowerCase(),
    status: r(a.status),
    recordId: r(a.record_id),
    contentType: r(a.content_type),
    assignment: a.assignment ? qe(m(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: r(s.family_id),
      readinessState: q(s.readiness_state),
      missingRequiredLocaleCount: p(s.missing_required_locale_count),
      pendingReviewCount: p(s.pending_review_count),
      outdatedLocaleCount: p(s.outdated_locale_count),
      blockerCodes: y(s.blocker_codes),
      missingLocales: y(s.missing_locales),
      availableLocales: y(s.available_locales),
      quickCreate: d
    },
    refresh: {
      familyDetail: b(i.family_detail),
      familyList: b(i.family_list),
      contentSummary: b(i.content_summary)
    },
    navigation: {
      contentDetailURL: r(n.content_detail_url),
      contentEditURL: r(n.content_edit_url)
    }
  };
}
function Re(e) {
  const a = r(e.familyId), t = Z(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Se(r(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Ie(e) {
  return {
    familyId: r(e.family_id),
    tenantId: r(e.tenant_id),
    orgId: r(e.org_id),
    contentType: r(e.content_type),
    sourceLocale: r(e.source_locale),
    sourceVariantId: r(e.source_variant_id),
    sourceRecordId: r(e.source_record_id),
    sourceTitle: r(e.source_title),
    readinessState: q(e.readiness_state),
    missingRequiredLocaleCount: p(e.missing_required_locale_count),
    pendingReviewCount: p(e.pending_review_count),
    outdatedLocaleCount: p(e.outdated_locale_count),
    blockerCodes: y(e.blocker_codes).map(W),
    missingLocales: y(e.missing_locales),
    availableLocales: y(e.available_locales)
  };
}
function Pe(e) {
  const a = m(e.data), t = m(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, n = s.items ?? s.families;
  return {
    items: (Array.isArray(n) ? n : []).map((d) => Ie(m(d))),
    total: p(i.total),
    page: p(i.page, 1),
    perPage: p(i.per_page, 50),
    channel: r(i.channel)
  };
}
function G(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    locale: r(e.locale),
    status: r(e.status),
    isSource: b(e.is_source),
    sourceRecordId: r(e.source_record_id),
    sourceHashAtLastSync: r(e.source_hash_at_last_sync),
    fields: xe(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at),
    publishedAt: r(e.published_at)
  };
}
function Ee(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    blockerCode: W(e.blocker_code),
    locale: r(e.locale),
    fieldPath: r(e.field_path),
    details: m(e.details)
  };
}
function De(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    variantId: r(e.variant_id),
    sourceLocale: r(e.source_locale),
    targetLocale: r(e.target_locale),
    workScope: r(e.work_scope),
    status: r(e.status),
    assigneeId: r(e.assignee_id),
    reviewerId: r(e.reviewer_id),
    priority: r(e.priority),
    dueDate: r(e.due_date),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at)
  };
}
function ee(e) {
  const a = m(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? G(m(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((u) => Ee(m(u))) : [], n = Array.isArray(t.locale_variants) ? t.locale_variants.map((u) => G(m(u))) : [], d = Array.isArray(t.active_assignments) ? t.active_assignments.map((u) => De(m(u))) : [], l = m(t.publish_gate), o = m(t.readiness_summary), g = N(m(t.quick_create), {
    missingLocales: y(o.missing_locales),
    recommendedLocale: r(o.recommended_locale),
    requiredForPublish: y(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: r(t.family_id),
    contentType: r(t.content_type),
    sourceLocale: r(t.source_locale),
    readinessState: q(t.readiness_state),
    sourceVariant: s,
    localeVariants: n,
    blockers: i,
    activeAssignments: d,
    publishGate: {
      allowed: b(l.allowed),
      overrideAllowed: b(l.override_allowed),
      blockedBy: y(l.blocked_by),
      reviewRequired: b(l.review_required)
    },
    readinessSummary: {
      state: q(o.state),
      requiredLocales: y(o.required_locales),
      missingLocales: y(o.missing_locales),
      availableLocales: y(o.available_locales),
      blockerCodes: y(o.blocker_codes),
      missingRequiredLocaleCount: p(o.missing_required_locale_count),
      pendingReviewCount: p(o.pending_review_count),
      outdatedLocaleCount: p(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: g
  };
}
function T(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = r(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function ae(e, a) {
  const t = r(a).toLowerCase();
  return e.map((s) => r(s).toLowerCase()).filter((s) => s && s !== t);
}
function ha(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = r(a.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === t) ? e.localeVariants.map((o) => o.locale === t ? {
    ...o,
    id: o.id || a.variantId,
    status: a.status || o.status
  } : { ...o }) : [...e.localeVariants.map((o) => ({ ...o })), {
    id: a.variantId,
    familyId: e.familyId,
    locale: t,
    status: a.status,
    isSource: !1,
    sourceRecordId: e.sourceVariant?.sourceRecordId || "",
    sourceHashAtLastSync: "",
    fields: {},
    createdAt: "",
    updatedAt: "",
    publishedAt: ""
  }].sort((o, g) => o.locale.localeCompare(g.locale));
  let i = e.activeAssignments.map((o) => ({ ...o }));
  if (a.assignment) {
    const o = {
      id: a.assignment.assignmentId,
      familyId: e.familyId,
      variantId: a.variantId,
      sourceLocale: e.sourceLocale,
      targetLocale: a.assignment.targetLocale || t,
      workScope: a.assignment.workScope || e.quickCreate.defaultAssignment.workScope,
      status: a.assignment.status,
      assigneeId: a.assignment.assigneeId,
      reviewerId: "",
      priority: a.assignment.priority,
      dueDate: a.assignment.dueDate,
      createdAt: "",
      updatedAt: ""
    }, g = i.findIndex((u) => u.id === o.id || u.targetLocale === o.targetLocale);
    g >= 0 ? i[g] = o : i = [...i, o].sort((u, x) => u.targetLocale.localeCompare(x.targetLocale));
  }
  const n = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), d = T(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), l = ae(T(e.readinessSummary.missingLocales, a.family.missingLocales), t);
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: n,
    activeAssignments: i,
    publishGate: {
      allowed: a.family.readinessState === "ready",
      overrideAllowed: e.publishGate.overrideAllowed,
      blockedBy: [...a.family.blockerCodes],
      reviewRequired: e.publishGate.reviewRequired
    },
    readinessSummary: {
      ...e.readinessSummary,
      state: a.family.readinessState,
      availableLocales: d,
      missingLocales: l,
      blockerCodes: [...a.family.blockerCodes],
      missingRequiredLocaleCount: a.family.missingRequiredLocaleCount,
      pendingReviewCount: a.family.pendingReviewCount,
      outdatedLocaleCount: a.family.outdatedLocaleCount,
      publishReady: a.family.readinessState === "ready"
    },
    quickCreate: { ...a.family.quickCreate }
  };
}
function va(e, a) {
  const t = { ...e }, s = { ...m(t.translation_readiness) }, i = r(a.locale).toLowerCase(), n = r(t.requested_locale).toLowerCase(), d = r(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (d && d !== a.familyId) return t;
  const l = T(y(t.available_locales), y(s.available_locales), a.family.availableLocales, [i]), o = ae(T(y(t.missing_required_locales), y(s.missing_required_locales), a.family.missingLocales), i);
  return t.available_locales = l, t.missing_required_locales = o, t.translation_family_id = d || a.familyId, s.family_id = d || a.familyId, s.state = a.family.readinessState, s.available_locales = l, s.missing_required_locales = o, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
    auto_create_assignment: a.family.quickCreate.defaultAssignment.autoCreateAssignment,
    work_scope: a.family.quickCreate.defaultAssignment.workScope,
    priority: a.family.quickCreate.defaultAssignment.priority,
    assignee_id: a.family.quickCreate.defaultAssignment.assigneeId,
    due_date: a.family.quickCreate.defaultAssignment.dueDate
  }, s.quick_create = {
    enabled: a.family.quickCreate.enabled,
    missing_locales: [...a.family.quickCreate.missingLocales],
    recommended_locale: a.family.quickCreate.recommendedLocale,
    required_for_publish: [...a.family.quickCreate.requiredForPublish],
    default_assignment: {
      auto_create_assignment: a.family.quickCreate.defaultAssignment.autoCreateAssignment,
      work_scope: a.family.quickCreate.defaultAssignment.workScope,
      priority: a.family.quickCreate.defaultAssignment.priority,
      assignee_id: a.family.quickCreate.defaultAssignment.assigneeId,
      due_date: a.family.quickCreate.defaultAssignment.dueDate
    },
    disabled_reason_code: a.family.quickCreate.disabledReasonCode,
    disabled_reason: a.family.quickCreate.disabledReason
  }, t.translation_readiness = s, n && n === i && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = i), t;
}
function Fe(e) {
  const a = q(e);
  return a === "ready" ? {
    state: a,
    label: "Ready",
    tone: "success"
  } : {
    state: a,
    label: "Blocked",
    tone: "warning"
  };
}
function te(e) {
  const a = Fe(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ue(e) {
  const a = await Q(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = r(e.headers.get("x-request-id")), t.traceId = J(e.headers), t.metadata = m(a.metadata), t;
}
function Ne(e) {
  switch (r(e)) {
    case "published":
    case "approved":
      return "success";
    case "in_review":
      return "warning";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}
function Be(e) {
  return R(Ne(e));
}
function je(e) {
  switch (r(e)) {
    case "in_review":
      return "warning";
    case "in_progress":
    case "assigned":
      return "info";
    case "changes_requested":
      return "error";
    default:
      return "neutral";
  }
}
function Oe(e) {
  return R(je(e));
}
function ze(e) {
  switch (r(e)) {
    case "missing_locale":
      return "error";
    case "missing_field":
      return "warning";
    case "pending_review":
      return "info";
    case "outdated_source":
      return "purple";
    default:
      return "neutral";
  }
}
function Me(e) {
  return R(ze(e));
}
function Ve(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function Ge(e) {
  return R(Ve(e));
}
function He(e, a, t) {
  const s = w(e), i = r(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function Ye(e) {
  const a = r(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Ke(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${h(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && t.push({
      id: `variant-published-${s.id}`,
      timestamp: s.publishedAt,
      title: `${s.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const s of e.activeAssignments) {
    const i = s.updatedAt || s.createdAt;
    if (!i) continue;
    const n = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: `${s.targetLocale.toUpperCase()} assignment ${h(s.status)}`,
      detail: `${n} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function Qe(e) {
  return [
    {
      label: "Required locales",
      value: e.readinessSummary.requiredLocales.length,
      tone: "text-gray-900"
    },
    {
      label: "Missing locales",
      value: e.readinessSummary.missingRequiredLocaleCount,
      tone: e.readinessSummary.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900"
    },
    {
      label: "Pending review",
      value: e.readinessSummary.pendingReviewCount,
      tone: e.readinessSummary.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900"
    },
    {
      label: "Outdated locales",
      value: e.readinessSummary.outdatedLocaleCount,
      tone: e.readinessSummary.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900"
    }
  ].map((a) => `
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${c(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${c(a.value)}</div>
        </div>
      `).join("");
}
function Xe(e, a) {
  const t = w(a.contentBasePath || `${w(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", n = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${D}"
        data-family-create-locale="true"
        data-locale="${_(l)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${_(o ? i : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, d = e.localeVariants.map((l) => {
    const o = He(t, e, l), g = o ? `<a href="${_(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', u = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${c(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Be(l.status)}">${c(h(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${c(u)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${c(F(l.updatedAt || l.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${g}</div>
      </li>
    `;
  });
  for (const l of s) d.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${c(l.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${n(l)}</div>
      </li>
    `);
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${d.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function Je(e) {
  return e.activeAssignments.length ? `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Ye(a.dueDate), s = t === "none" ? "No due date" : h(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${c(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Oe(a.status)}">${c(h(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ge(t)}">${c(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${c(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${c(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${c(F(a.updatedAt || a.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function We(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Me(t.blockerCode)}">${c(h(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${c(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${te(e.readinessState)}
          <span class="text-sm font-medium ${e.publishGate.allowed ? "text-emerald-800" : "text-amber-800"}">
            ${e.publishGate.allowed ? "Eligible to publish." : "Publishing is blocked until blockers are cleared."}
          </span>
        </div>
        <p class="mt-2 text-sm ${e.publishGate.allowed ? "text-emerald-700" : "text-amber-700"}">
          ${e.publishGate.overrideAllowed ? "Policy allows an explicit publish override once the review owner supplies a rationale." : "No override path is available for this family."}
        </p>
      </div>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${a}</ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-gray-600" role="list">
            <li>Review required: <strong class="text-gray-900">${e.publishGate.reviewRequired ? "Yes" : "No"}</strong></li>
            <li>Override allowed: <strong class="text-gray-900">${e.publishGate.overrideAllowed ? "Yes" : "No"}</strong></li>
            <li>Available locales: <strong class="text-gray-900">${c(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}
function Ze(e) {
  const a = Ke(e);
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${c(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${c(F(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${c(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function P(e) {
  const a = [
    e.requestId ? `Request ${c(e.requestId)}` : "",
    e.traceId ? `Trace ${c(e.traceId)}` : "",
    e.errorCode ? `Code ${c(e.errorCode)}` : ""
  ].filter(Boolean);
  return a.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${a.map((t) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${t}</span>`).join("")}
    </div>
  ` : "";
}
function ea(e) {
  return `
    <div class="${ce}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${c(e)}</span>
      </div>
    </div>
  `;
}
function H(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${_e} p-8 text-center shadow-sm">
        <h2 class="${fe}">${c(e)}</h2>
        <p class="${pe} mt-2">${c(a)}</p>
      </div>
    </div>
  `;
}
function aa(e, a) {
  return `
    <div class="${ge} p-6" role="alert">
      <h2 class="${ve}">${c(e)}</h2>
      <p class="${ye} mt-2">${c(a)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 ${X}">
        Reload family detail
      </button>
    </div>
  `;
}
function ta(e, a = {}) {
  if (e.status === "loading") return ea("Loading translation family...");
  if (e.status === "empty") return `
      ${H("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${P(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${aa(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."))}
        ${P(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return H("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(h).join(", ") : "No blockers", n = !t.quickCreate.enabled, d = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${D}"
        data-family-create-locale="true"
        data-locale="${_(t.quickCreate.recommendedLocale)}"
        ${n ? 'disabled aria-disabled="true"' : ""}
        title="${_(n ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${c(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${_(t.familyId)}" data-readiness-state="${_(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${me}">Translation family</p>
            <h1 class="${le} mt-2">${c(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${c(t.contentType)} · Source locale ${c(t.sourceLocale.toUpperCase())} · Family ${c(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${te(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${c(i)}</span>
            ${d}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Qe(t)}
        </div>
        ${P(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Xe(t, a)}
          ${Je(t)}
        </div>
        <div class="space-y-6">
          ${We(t)}
          ${Ze(t)}
        </div>
      </div>
    </div>
  `;
}
async function sa(e, a = {}) {
  const t = r(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : ne(t, { headers: { Accept: "application/json" } })), i = r(s.headers.get("x-request-id")), n = J(s.headers);
    if (!s.ok) {
      const l = await Q(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: l.message,
        requestId: i,
        traceId: n,
        statusCode: s.status,
        errorCode: l.textCode
      };
    }
    const d = ee(m(await s.json()));
    return d.familyId ? {
      status: "ready",
      detail: d,
      requestId: i,
      traceId: n,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: i,
      traceId: n,
      statusCode: s.status
    };
  } catch (s) {
    return {
      status: "error",
      message: s instanceof Error ? s.message : "Failed to load translation family detail."
    };
  }
}
function Y(e, a, t = {}) {
  e.innerHTML = ta(a, t);
}
function L(e, a) {
  const t = globalThis.toastManager?.[e];
  typeof t == "function" && t(a);
}
function ra(e, a) {
  switch (e.textCode) {
    case "TRANSLATION_EXISTS":
      return `${a.toUpperCase()} already exists. Reload to open the existing locale.`;
    case "POLICY_BLOCKED":
      return "Policy blocked locale creation for this family.";
    case "VERSION_CONFLICT":
      return "The family changed while you were creating the locale. Reload and try again.";
    default:
      return e.message || "Failed to create locale.";
  }
}
function ia(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function na(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function oa(e, a, t, s) {
  const i = r(e.locale).toLowerCase(), n = r(t).toLowerCase(), d = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return n && n === i && d ? d : i && a[i] ? a[i] : d;
}
function se(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    L("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = r(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], n = a.createElement("div");
  n.className = ue, n.setAttribute("data-translation-create-locale-modal", "true"), n.innerHTML = `
    <div class="${de}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${c(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${c(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${be}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((f) => `
                <option value="${_(f)}" ${f === i ? "selected" : ""}>
                  ${c(f.toUpperCase())}${f === t.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${c(t.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${c(t.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${c(t.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-6 py-4">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${t.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-6">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${_(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${[
    "low",
    "normal",
    "high",
    "urgent"
  ].map((f) => `
                  <option value="${f}" ${f === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${h(f)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${_(ia(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${X}">Cancel</button>
          <button type="submit" class="${D}">${c(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(n);
  const d = n.querySelector('[role="dialog"]'), l = n.querySelector("form"), o = n.querySelector('select[name="locale"]'), g = n.querySelector('input[name="auto_create_assignment"]'), u = n.querySelector('input[name="assignee_id"]'), x = n.querySelector('select[name="priority"]'), $ = n.querySelector('input[name="due_date"]'), B = n.querySelector('[data-assignment-fields="true"]'), C = n.querySelector('[data-create-locale-feedback="true"]'), S = n.querySelector('button[type="submit"]'), A = () => {
    ie(), n.remove();
  }, j = () => {
    !B || !g || (B.hidden = !g.checked);
  }, ie = d ? he(d, A) : () => {
  };
  j(), g?.addEventListener("change", j), n.querySelectorAll('[data-close-modal="true"]').forEach((f) => {
    f.addEventListener("click", A);
  }), n.addEventListener("click", (f) => {
    f.target === n && A();
  }), l?.addEventListener("submit", async (f) => {
    if (f.preventDefault(), !o || !S) return;
    C && (C.hidden = !0, C.textContent = ""), S.disabled = !0, S.classList.add("opacity-60", "cursor-not-allowed");
    const O = r(o.value).toLowerCase();
    try {
      const I = await e.onSubmit({
        locale: O,
        autoCreateAssignment: g?.checked,
        assigneeId: u?.value,
        priority: x?.value,
        dueDate: na($?.value || "")
      });
      A(), await e.onSuccess?.(I);
    } catch (I) {
      const z = ra(I, O);
      C && (C.hidden = !1, C.textContent = z), L("error", z);
    } finally {
      S.disabled = !1, S.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function la(e) {
  return {
    familyId: r(e.dataset.familyId),
    requestedLocale: r(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: r(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: r(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: N(V(e.dataset.quickCreate, {}), {}),
    localeURLs: V(e.dataset.localeUrls, {})
  };
}
function xa(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = la(a), s = re({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (n) => {
        n.preventDefault();
        const d = r(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        se({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: d,
          heading: `Create ${d.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(t.familyId, l),
          onSuccess: async (l) => {
            L("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), g = oa(l, t.localeURLs, t.requestedLocale, o);
            if (g && typeof window < "u") {
              window.location.href = g;
              return;
            }
            typeof window < "u" && window.location.reload();
          }
        });
      });
    });
  });
}
async function K(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = r(a.endpoint || t.endpoint), i = {
    basePath: r(a.basePath || t.basePath || "/admin"),
    contentBasePath: r(a.contentBasePath || t.contentBasePath)
  };
  Y(e, { status: "loading" }, i);
  const n = await sa(s, { fetch: a.fetch });
  if (Y(e, n, i), typeof e.querySelector == "function") {
    if (n.status === "ready" && n.detail) {
      const l = re({
        basePath: `${w(i.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((o) => {
        o.dataset.translationCreateBound !== "true" && (o.dataset.translationCreateBound = "true", o.addEventListener("click", (g) => {
          g.preventDefault();
          const u = n.detail;
          if (!u) {
            L("error", "Translation family detail is unavailable.");
            return;
          }
          if (o.getAttribute("aria-disabled") === "true") {
            L("warning", u.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const x = r(o.dataset.locale).toLowerCase() || u.quickCreate.recommendedLocale || "";
          se({
            familyId: u.familyId,
            quickCreate: u.quickCreate,
            initialLocale: x,
            heading: `Create ${x.toUpperCase()} locale`,
            onSubmit: ($) => l.createLocale(u.familyId, $),
            onSuccess: async ($) => {
              L("success", `${$.locale.toUpperCase()} locale created.`), await K(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
    }
    const d = e.querySelector(".ui-state-retry-btn");
    d && d.addEventListener("click", () => {
      K(e, {
        ...a,
        ...i,
        endpoint: s
      });
    });
  }
  return n;
}
function re(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = w(e.basePath || "/admin/api");
  async function s(i) {
    return oe(i);
  }
  return {
    async list(i = {}) {
      return Pe(await s(await a(we(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, n = "") {
      return ee(await s(await a($e(t, i, n), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, n = {}) {
      const d = Re({
        ...n,
        familyId: i,
        basePath: t
      }), l = await a(d.endpoint, {
        method: "POST",
        headers: d.headers,
        body: JSON.stringify(ke(d.request))
      });
      if (!l.ok) throw await Ue(l);
      return Te(await s(l));
    }
  };
}
export {
  ha as applyCreateLocaleToFamilyDetail,
  va as applyCreateLocaleToSummaryState,
  Se as buildCreateLocaleURL,
  Ke as buildFamilyActivityPreview,
  $e as buildFamilyDetailURL,
  Le as buildFamilyListQuery,
  we as buildFamilyListURL,
  Ce as createFamilyFilters,
  Re as createTranslationCreateLocaleActionModel,
  Z as createTranslationCreateLocaleRequest,
  re as createTranslationFamilyClient,
  sa as fetchTranslationFamilyDetailState,
  Fe as getReadinessChip,
  K as initTranslationFamilyDetailPage,
  xa as initTranslationSummaryCards,
  Te as normalizeCreateLocaleResult,
  ee as normalizeFamilyDetail,
  Pe as normalizeFamilyListResponse,
  Ie as normalizeFamilyListRow,
  N as normalizeQuickCreateHints,
  te as renderReadinessChip,
  Y as renderTranslationFamilyDetailPage,
  ta as renderTranslationFamilyDetailState,
  ke as serializeCreateLocaleRequest,
  ia as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map