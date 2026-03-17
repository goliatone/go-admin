import { e as _, a as d } from "../chunks/html-Br-oQr7i.js";
import { h as te } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as G } from "../toast/error-helpers.js";
import { B as E, H as se, a as re, E as ne, b as ie, c as oe, d as le, e as ce, f as de, h as H, C as S, M as me, i as ue, j as fe, t as ye, k as R } from "../chunks/style-constants-BesmSFuV.js";
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function p(e, a = 0) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string" && e.trim() !== "") {
    const t = Number(e);
    if (Number.isFinite(t)) return t;
  }
  return a;
}
function b(e) {
  return e === !0 || e === "true" || e === "1";
}
function m(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function Y(e) {
  return r(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function f(e) {
  return Array.isArray(e) ? e.map((a) => r(a)).filter((a) => a.length > 0) : [];
}
function k(e) {
  return r(e) === "ready" ? "ready" : "blocked";
}
function K(e) {
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
function ge(e) {
  const a = m(e), t = {};
  for (const [s, n] of Object.entries(a)) {
    const i = r(n);
    s.trim() !== "" && i !== "" && (t[s] = i);
  }
  return t;
}
function pe(e = {}) {
  const a = r(e.channel ?? e.environment);
  return {
    contentType: r(e.contentType),
    readinessState: r(e.readinessState),
    blockerCode: r(e.blockerCode),
    missingLocale: r(e.missingLocale),
    page: Math.max(1, p(e.page, 1)),
    perPage: Math.max(1, p(e.perPage, 50)),
    channel: a,
    environment: a
  };
}
function be(e = {}) {
  const a = pe(e), t = new URLSearchParams();
  return a.contentType && t.set("content_type", a.contentType), a.readinessState && t.set("readiness_state", a.readinessState), a.blockerCode && t.set("blocker_code", a.blockerCode), a.missingLocale && t.set("missing_locale", a.missingLocale), a.channel && t.set("channel", a.channel), t.set("page", String(a.page)), t.set("per_page", String(a.perPage)), t;
}
function he(e, a = {}) {
  const t = `${v(e)}/translations/families`, s = be(a).toString();
  return s ? `${t}?${s}` : t;
}
function _e(e, a, t = "") {
  const s = encodeURIComponent(r(a)), n = `${v(e)}/translations/families/${s}`, i = new URLSearchParams();
  r(t) && i.set("channel", r(t));
  const l = i.toString();
  return l ? `${n}?${l}` : n;
}
function Q(e = {}) {
  const a = r(e.channel ?? e.environment);
  return {
    locale: r(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: r(e.assigneeId),
    priority: r(e.priority).toLowerCase(),
    dueDate: r(e.dueDate),
    channel: a,
    environment: a,
    idempotencyKey: r(e.idempotencyKey)
  };
}
function xe(e, a, t = "") {
  const s = encodeURIComponent(r(a)), n = `${v(e)}/translations/families/${s}/variants`, i = new URLSearchParams();
  r(t) && i.set("channel", r(t));
  const l = i.toString();
  return l ? `${n}?${l}` : n;
}
function ve(e = {}) {
  const a = Q(e), t = {
    locale: a.locale
  };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Ce(e) {
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
function Le(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: r(e.work_scope),
    priority: r(e.priority) || "normal",
    assigneeId: r(e.assignee_id),
    dueDate: r(e.due_date)
  };
}
function D(e, a = {}) {
  const t = m(e.default_assignment), s = f(e.missing_locales ?? a.missingLocales), n = f(e.required_for_publish ?? a.requiredForPublish), i = r(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: i,
    requiredForPublish: n,
    defaultAssignment: Le({
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
function we(e) {
  const a = m(e.data), t = m(e.meta), s = m(t.family), n = m(t.refresh), i = m(a.navigation), l = D(m(s.quick_create), {
    missingLocales: f(s.missing_locales)
  });
  return {
    variantId: r(a.variant_id),
    familyId: r(a.family_id) || r(s.family_id),
    locale: r(a.locale).toLowerCase(),
    status: r(a.status),
    recordId: r(a.record_id),
    contentType: r(a.content_type),
    assignment: a.assignment ? Ce(m(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: r(s.family_id),
      readinessState: k(s.readiness_state),
      missingRequiredLocaleCount: p(s.missing_required_locale_count),
      pendingReviewCount: p(s.pending_review_count),
      outdatedLocaleCount: p(s.outdated_locale_count),
      blockerCodes: f(s.blocker_codes),
      missingLocales: f(s.missing_locales),
      availableLocales: f(s.available_locales),
      quickCreate: l
    },
    refresh: {
      familyDetail: b(n.family_detail),
      familyList: b(n.family_list),
      contentSummary: b(n.content_summary)
    },
    navigation: {
      contentDetailURL: r(i.content_detail_url),
      contentEditURL: r(i.content_edit_url)
    }
  };
}
function $e(e) {
  const a = r(e.familyId), t = Q(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: xe(r(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Se(e) {
  return {
    familyId: r(e.family_id),
    tenantId: r(e.tenant_id),
    orgId: r(e.org_id),
    contentType: r(e.content_type),
    sourceLocale: r(e.source_locale),
    sourceVariantId: r(e.source_variant_id),
    sourceRecordId: r(e.source_record_id),
    sourceTitle: r(e.source_title),
    readinessState: k(e.readiness_state),
    missingRequiredLocaleCount: p(e.missing_required_locale_count),
    pendingReviewCount: p(e.pending_review_count),
    outdatedLocaleCount: p(e.outdated_locale_count),
    blockerCodes: f(e.blocker_codes).map(K),
    missingLocales: f(e.missing_locales),
    availableLocales: f(e.available_locales)
  };
}
function ke(e) {
  const a = m(e.data), t = m(e.meta), s = Object.keys(a).length ? a : e, n = Object.keys(t).length ? t : e, i = s.items ?? s.families;
  return {
    items: (Array.isArray(i) ? i : []).map((c) => Se(m(c))),
    total: p(n.total),
    page: p(n.page, 1),
    perPage: p(n.per_page, 50),
    channel: r(n.channel || n.environment)
  };
}
function B(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    locale: r(e.locale),
    status: r(e.status),
    isSource: b(e.is_source),
    sourceRecordId: r(e.source_record_id),
    sourceHashAtLastSync: r(e.source_hash_at_last_sync),
    fields: ge(e.fields),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at),
    publishedAt: r(e.published_at)
  };
}
function qe(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    blockerCode: K(e.blocker_code),
    locale: r(e.locale),
    fieldPath: r(e.field_path),
    details: m(e.details)
  };
}
function Ae(e) {
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
function X(e) {
  const a = m(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? B(m(t.source_variant)) : null, n = Array.isArray(t.blockers) ? t.blockers.map((y) => qe(m(y))) : [], i = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => B(m(y))) : [], l = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => Ae(m(y))) : [], c = m(t.publish_gate), o = m(t.readiness_summary), u = D(m(t.quick_create), {
    missingLocales: f(o.missing_locales),
    recommendedLocale: r(o.recommended_locale),
    requiredForPublish: f(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: r(t.family_id),
    contentType: r(t.content_type),
    sourceLocale: r(t.source_locale),
    readinessState: k(t.readiness_state),
    sourceVariant: s,
    localeVariants: i,
    blockers: n,
    activeAssignments: l,
    publishGate: {
      allowed: b(c.allowed),
      overrideAllowed: b(c.override_allowed),
      blockedBy: f(c.blocked_by),
      reviewRequired: b(c.review_required)
    },
    readinessSummary: {
      state: k(o.state),
      requiredLocales: f(o.required_locales),
      missingLocales: f(o.missing_locales),
      availableLocales: f(o.available_locales),
      blockerCodes: f(o.blocker_codes),
      missingRequiredLocaleCount: p(o.missing_required_locale_count),
      pendingReviewCount: p(o.pending_review_count),
      outdatedLocaleCount: p(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: u
  };
}
function I(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e)
    for (const s of t) {
      const n = r(s).toLowerCase();
      n && a.add(n);
    }
  return Array.from(a).sort();
}
function J(e, a) {
  const t = r(a).toLowerCase();
  return e.map((s) => r(s).toLowerCase()).filter((s) => s && s !== t);
}
function la(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId)
    return e;
  const t = r(a.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === t) ? e.localeVariants.map((o) => o.locale === t ? { ...o, id: o.id || a.variantId, status: a.status || o.status } : { ...o }) : [
    ...e.localeVariants.map((o) => ({ ...o })),
    {
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
    }
  ].sort((o, u) => o.locale.localeCompare(u.locale));
  let n = e.activeAssignments.map((o) => ({ ...o }));
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
    }, u = n.findIndex(
      (y) => y.id === o.id || y.targetLocale === o.targetLocale
    );
    u >= 0 ? n[u] = o : n = [...n, o].sort(
      (y, h) => y.targetLocale.localeCompare(h.targetLocale)
    );
  }
  const i = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), l = I(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = J(
    I(e.readinessSummary.missingLocales, a.family.missingLocales),
    t
  );
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: i,
    activeAssignments: n,
    publishGate: {
      allowed: a.family.readinessState === "ready",
      overrideAllowed: e.publishGate.overrideAllowed,
      blockedBy: [...a.family.blockerCodes],
      reviewRequired: e.publishGate.reviewRequired
    },
    readinessSummary: {
      ...e.readinessSummary,
      state: a.family.readinessState,
      availableLocales: l,
      missingLocales: c,
      blockerCodes: [...a.family.blockerCodes],
      missingRequiredLocaleCount: a.family.missingRequiredLocaleCount,
      pendingReviewCount: a.family.pendingReviewCount,
      outdatedLocaleCount: a.family.outdatedLocaleCount,
      publishReady: a.family.readinessState === "ready"
    },
    quickCreate: { ...a.family.quickCreate }
  };
}
function ca(e, a) {
  const t = { ...e }, s = { ...m(t.translation_readiness) }, n = r(a.locale).toLowerCase(), i = r(t.requested_locale).toLowerCase(), l = r(
    t.translation_family_id || t.family_id || s.family_id || s.family_id
  );
  if (l && l !== a.familyId)
    return t;
  const c = I(
    f(t.available_locales),
    f(s.available_locales),
    a.family.availableLocales,
    [n]
  ), o = J(
    I(
      f(t.missing_required_locales),
      f(s.missing_required_locales),
      a.family.missingLocales
    ),
    n
  );
  return t.available_locales = c, t.missing_required_locales = o, t.translation_family_id = l || a.familyId, s.family_id = l || a.familyId, s.state = a.family.readinessState, s.available_locales = c, s.missing_required_locales = o, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
  }, t.translation_readiness = s, i && i === n && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = n), t;
}
function Ie(e) {
  const a = k(e);
  return a === "ready" ? { state: a, label: "Ready", tone: "success" } : { state: a, label: "Blocked", tone: "warning" };
}
function W(e) {
  const a = Ie(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Re(e) {
  const a = await G(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = r(e.headers.get("x-request-id")), t.traceId = Y(e.headers), t.metadata = m(a.metadata), t;
}
function F(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? a : t.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function x(e) {
  const a = r(e).replace(/_/g, " ");
  return a ? a.charAt(0).toUpperCase() + a.slice(1) : "";
}
function Te(e) {
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
function Pe(e) {
  return R(Te(e));
}
function Ee(e) {
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
function De(e) {
  return R(Ee(e));
}
function Fe(e) {
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
function Ne(e) {
  return R(Fe(e));
}
function Ue(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function je(e) {
  return R(Ue(e));
}
function Be(e, a, t) {
  const s = v(e), n = r(t.sourceRecordId);
  return !s || !n || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(n)}?locale=${encodeURIComponent(t.locale)}`;
}
function Oe(e) {
  const a = r(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 48 * 60 * 60 * 1e3 ? "due_soon" : "on_track";
}
function ze(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${x(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && t.push({
      id: `variant-published-${s.id}`,
      timestamp: s.publishedAt,
      title: `${s.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const s of e.activeAssignments) {
    const n = s.updatedAt || s.createdAt;
    if (!n) continue;
    const i = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: n,
      title: `${s.targetLocale.toUpperCase()} assignment ${x(s.status)}`,
      detail: `${i} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, n) => n.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function Me(e) {
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
  ].map(
    (t) => `
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${d(t.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${t.tone}">${d(t.value)}</div>
        </div>
      `
  ).join("");
}
function Ve(e, a) {
  const t = v(a.contentBasePath || `${v(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, n = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", i = (c) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${E}"
        data-family-create-locale="true"
        data-locale="${_(c)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${_(o ? n : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, l = e.localeVariants.map((c) => {
    const o = Be(t, e, c), u = o ? `<a href="${_(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Pe(c.status)}">${d(x(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(F(c.updatedAt || c.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${u}</div>
      </li>
    `;
  });
  for (const c of s)
    l.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${d(c.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${i(c)}</div>
      </li>
    `);
  return `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${l.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function Ge(e) {
  return e.activeAssignments.length ? `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Oe(a.dueDate), s = t === "none" ? "No due date" : x(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${De(a.status)}">${d(x(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${je(t)}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(F(a.updatedAt || a.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function He(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ne(t.blockerCode)}">${d(x(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-4">
        <div class="flex flex-wrap items-center gap-3">
          ${W(e.readinessState)}
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
            <li>Available locales: <strong class="text-gray-900">${d(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}
function Ye(e) {
  const a = ze(e);
  return `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map(
    (t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(F(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `
  ).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function P(e) {
  const a = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return a.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${a.map(
    (t) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${t}</span>`
  ).join("")}
    </div>
  ` : "";
}
function Ke(e) {
  return `
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function O(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${ne} p-8 text-center shadow-sm">
        <h2 class="${ie}">${d(e)}</h2>
        <p class="${oe} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function Qe(e, a) {
  return `
    <div class="${le} p-6" role="alert">
      <h2 class="${ce}">${d(e)}</h2>
      <p class="${de} mt-2">${d(a)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 ${H}">
        Reload family detail
      </button>
    </div>
  `;
}
function Xe(e, a = {}) {
  if (e.status === "loading")
    return Ke("Loading translation family...");
  if (e.status === "empty")
    return `
      ${O(
      "Family detail unavailable",
      e.message || "This family detail view does not have a backing payload yet."
    )}
      ${P(e)}
    `;
  if (e.status === "error" || e.status === "conflict") {
    const c = e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", o = e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed.");
    return `
      <div class="translation-family-detail-error">
        ${Qe(c, o)}
        ${P(e)}
      </div>
    `;
  }
  const t = e.detail;
  if (!t)
    return O("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, n = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(x).join(", ") : "No blockers", i = !t.quickCreate.enabled, l = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${E}"
        data-family-create-locale="true"
        data-locale="${_(t.quickCreate.recommendedLocale)}"
        ${i ? 'disabled aria-disabled="true"' : ""}
        title="${_(i ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${_(t.familyId)}" data-readiness-state="${_(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${se}">Translation family</p>
            <h1 class="${re} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${W(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(n)}</span>
            ${l}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Me(t)}
        </div>
        ${P(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Ve(t, a)}
          ${Ge(t)}
        </div>
        <div class="space-y-6">
          ${He(t)}
          ${Ye(t)}
        </div>
      </div>
    </div>
  `;
}
async function Je(e, a = {}) {
  const t = r(e);
  if (!t)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : te(t, { headers: { Accept: "application/json" } })), n = r(s.headers.get("x-request-id")), i = Y(s.headers);
    if (!s.ok) {
      const o = await G(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: o.message,
        requestId: n,
        traceId: i,
        statusCode: s.status,
        errorCode: o.textCode
      };
    }
    const l = m(await s.json()), c = X(l);
    return c.familyId ? {
      status: "ready",
      detail: c,
      requestId: n,
      traceId: i,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: n,
      traceId: i,
      statusCode: s.status
    };
  } catch (s) {
    return {
      status: "error",
      message: s instanceof Error ? s.message : "Failed to load translation family detail."
    };
  }
}
function z(e, a, t = {}) {
  e.innerHTML = Xe(a, t);
}
function w(e, a) {
  const s = globalThis.toastManager?.[e];
  typeof s == "function" && s(a);
}
function M(e, a) {
  const t = r(e);
  if (!t) return a;
  try {
    return JSON.parse(t);
  } catch {
    return a;
  }
}
function We(e, a) {
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
function Ze(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "";
  const s = t.getFullYear(), n = String(t.getMonth() + 1).padStart(2, "0"), i = String(t.getDate()).padStart(2, "0"), l = String(t.getHours()).padStart(2, "0"), c = String(t.getMinutes()).padStart(2, "0");
  return `${s}-${n}-${i}T${l}:${c}`;
}
function ea(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function aa(e, a, t, s) {
  const n = r(e.locale).toLowerCase(), i = r(t).toLowerCase(), l = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return i && i === n && l ? l : n && a[n] ? a[n] : l;
}
function Z(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    w("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = r(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), n = t.missingLocales.includes(s) ? s : t.missingLocales[0], i = a.createElement("div");
  i.className = me, i.setAttribute("data-translation-create-locale-modal", "true"), i.innerHTML = `
    <div class="${ue}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${fe}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((g) => `
                <option value="${_(g)}" ${g === n ? "selected" : ""}>
                  ${d(g.toUpperCase())}${g === t.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${d(t.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${d(t.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${d(t.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${t.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-4">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${_(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${["low", "normal", "high", "urgent"].map((g) => `
                  <option value="${g}" ${g === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${x(g)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${_(Ze(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${H}">Cancel</button>
          <button type="submit" class="${E}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(i);
  const l = i.querySelector('[role="dialog"]'), c = i.querySelector("form"), o = i.querySelector('select[name="locale"]'), u = i.querySelector('input[name="auto_create_assignment"]'), y = i.querySelector('input[name="assignee_id"]'), h = i.querySelector('select[name="priority"]'), q = i.querySelector('input[name="due_date"]'), C = i.querySelector('[data-assignment-fields="true"]'), L = i.querySelector('[data-create-locale-feedback="true"]'), $ = i.querySelector('button[type="submit"]'), A = () => {
    ae(), i.remove();
  }, N = () => {
    !C || !u || (C.hidden = !u.checked);
  }, ae = l ? ye(l, A) : () => {
  };
  N(), u?.addEventListener("change", N), i.querySelectorAll('[data-close-modal="true"]').forEach((g) => {
    g.addEventListener("click", A);
  }), i.addEventListener("click", (g) => {
    g.target === i && A();
  }), c?.addEventListener("submit", async (g) => {
    if (g.preventDefault(), !o || !$) return;
    L && (L.hidden = !0, L.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const U = r(o.value).toLowerCase();
    try {
      const T = await e.onSubmit({
        locale: U,
        autoCreateAssignment: u?.checked,
        assigneeId: y?.value,
        priority: h?.value,
        dueDate: ea(q?.value || "")
      });
      A(), await e.onSuccess?.(T);
    } catch (T) {
      const j = We(T, U);
      L && (L.hidden = !1, L.textContent = j), w("error", j);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function ta(e) {
  return {
    familyId: r(e.dataset.familyId),
    requestedLocale: r(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: r(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: r(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: D(
      M(e.dataset.quickCreate || "", {}),
      {}
    ),
    localeURLs: M(e.dataset.localeUrls || "", {})
  };
}
function da(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = ta(a), s = ee({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((n) => {
      n.addEventListener("click", (i) => {
        i.preventDefault();
        const l = r(n.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        Z({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: l,
          heading: `Create ${l.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            w("success", `${c.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), u = aa(c, t.localeURLs, t.requestedLocale, o);
            if (u && typeof window < "u") {
              window.location.href = u;
              return;
            }
            typeof window < "u" && window.location.reload();
          }
        });
      });
    });
  });
}
async function V(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = r(a.endpoint || t.endpoint), n = {
    basePath: r(a.basePath || t.basePath || "/admin"),
    contentBasePath: r(a.contentBasePath || t.contentBasePath)
  };
  z(e, { status: "loading" }, n);
  const i = await Je(s, { fetch: a.fetch });
  if (z(e, i, n), typeof e.querySelector == "function") {
    if (i.status === "ready" && i.detail) {
      const c = `${v(n.basePath || "/admin")}/api`, o = ee({ basePath: c, fetch: a.fetch });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((u) => {
        u.dataset.translationCreateBound !== "true" && (u.dataset.translationCreateBound = "true", u.addEventListener("click", (y) => {
          y.preventDefault();
          const h = i.detail;
          if (!h) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (u.getAttribute("aria-disabled") === "true") {
            w("warning", h.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const q = r(u.dataset.locale).toLowerCase() || h.quickCreate.recommendedLocale || "";
          Z({
            familyId: h.familyId,
            quickCreate: h.quickCreate,
            initialLocale: q,
            heading: `Create ${q.toUpperCase()} locale`,
            onSubmit: (C) => o.createLocale(h.familyId, C),
            onSuccess: async (C) => {
              w("success", `${C.locale.toUpperCase()} locale created.`), await V(e, { ...a, ...n, endpoint: s });
            }
          });
        }));
      });
    }
    const l = e.querySelector(".ui-state-retry-btn");
    l && l.addEventListener("click", () => {
      V(e, { ...a, ...n, endpoint: s });
    });
  }
  return i;
}
function ee(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("translation-family client requires fetch");
  const t = v(e.basePath || "/admin/api");
  return {
    async list(s = {}) {
      const i = await (await a(he(t, s), {
        headers: { Accept: "application/json" }
      })).json();
      return ke(i);
    },
    async detail(s, n = "") {
      const l = await (await a(_e(t, s, n), {
        headers: { Accept: "application/json" }
      })).json();
      return X(l);
    },
    async createLocale(s, n = {}) {
      const i = $e({
        ...n,
        familyId: s,
        basePath: t
      }), l = await a(i.endpoint, {
        method: "POST",
        headers: i.headers,
        body: JSON.stringify(ve(i.request))
      });
      if (!l.ok)
        throw await Re(l);
      const c = await l.json();
      return we(c);
    }
  };
}
function v(e) {
  const a = r(e);
  return a ? a.endsWith("/") ? a.slice(0, -1) : a : "";
}
export {
  la as applyCreateLocaleToFamilyDetail,
  ca as applyCreateLocaleToSummaryState,
  xe as buildCreateLocaleURL,
  ze as buildFamilyActivityPreview,
  _e as buildFamilyDetailURL,
  be as buildFamilyListQuery,
  he as buildFamilyListURL,
  pe as createFamilyFilters,
  $e as createTranslationCreateLocaleActionModel,
  Q as createTranslationCreateLocaleRequest,
  ee as createTranslationFamilyClient,
  Je as fetchTranslationFamilyDetailState,
  Ie as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  da as initTranslationSummaryCards,
  we as normalizeCreateLocaleResult,
  X as normalizeFamilyDetail,
  ke as normalizeFamilyListResponse,
  Se as normalizeFamilyListRow,
  D as normalizeQuickCreateHints,
  W as renderReadinessChip,
  z as renderTranslationFamilyDetailPage,
  Xe as renderTranslationFamilyDetailState,
  ve as serializeCreateLocaleRequest,
  Ze as toDateTimeLocalInputValue
};
//# sourceMappingURL=index.js.map
