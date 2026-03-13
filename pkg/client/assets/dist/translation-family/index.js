import { e as _, a as d } from "../chunks/html-Br-oQr7i.js";
import { h as J } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as z } from "../toast/error-helpers.js";
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function p(e, t = 0) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string" && e.trim() !== "") {
    const a = Number(e);
    if (Number.isFinite(a)) return a;
  }
  return t;
}
function b(e) {
  return e === !0 || e === "true" || e === "1";
}
function m(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function O(e) {
  return r(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function u(e) {
  return Array.isArray(e) ? e.map((t) => r(t)).filter((t) => t.length > 0) : [];
}
function k(e) {
  return r(e) === "ready" ? "ready" : "blocked";
}
function M(e) {
  const t = r(e);
  switch (t) {
    case "missing_locale":
    case "missing_field":
    case "pending_review":
    case "outdated_source":
    case "policy_denied":
      return t;
    default:
      return "policy_denied";
  }
}
function W(e) {
  const t = m(e), a = {};
  for (const [s, i] of Object.entries(t)) {
    const n = r(i);
    s.trim() !== "" && n !== "" && (a[s] = n);
  }
  return a;
}
function X(e = {}) {
  return {
    contentType: r(e.contentType),
    readinessState: r(e.readinessState),
    blockerCode: r(e.blockerCode),
    missingLocale: r(e.missingLocale),
    page: Math.max(1, p(e.page, 1)),
    perPage: Math.max(1, p(e.perPage, 50)),
    environment: r(e.environment)
  };
}
function Z(e = {}) {
  const t = X(e), a = new URLSearchParams();
  return t.contentType && a.set("content_type", t.contentType), t.readinessState && a.set("readiness_state", t.readinessState), t.blockerCode && a.set("blocker_code", t.blockerCode), t.missingLocale && a.set("missing_locale", t.missingLocale), t.environment && a.set("environment", t.environment), a.set("page", String(t.page)), a.set("per_page", String(t.perPage)), a;
}
function ee(e, t = {}) {
  const a = `${C(e)}/translations/families`, s = Z(t).toString();
  return s ? `${a}?${s}` : a;
}
function te(e, t, a = "") {
  const s = encodeURIComponent(r(t)), i = `${C(e)}/translations/families/${s}`, n = new URLSearchParams();
  r(a) && n.set("environment", r(a));
  const c = n.toString();
  return c ? `${i}?${c}` : i;
}
function V(e = {}) {
  return {
    locale: r(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: r(e.assigneeId),
    priority: r(e.priority).toLowerCase(),
    dueDate: r(e.dueDate),
    environment: r(e.environment),
    idempotencyKey: r(e.idempotencyKey)
  };
}
function ae(e, t, a = "") {
  const s = encodeURIComponent(r(t)), i = `${C(e)}/translations/families/${s}/variants`, n = new URLSearchParams();
  r(a) && n.set("environment", r(a));
  const c = n.toString();
  return c ? `${i}?${c}` : i;
}
function se(e = {}) {
  const t = V(e), a = {
    locale: t.locale
  };
  return t.autoCreateAssignment && (a.auto_create_assignment = !0), t.assigneeId && (a.assignee_id = t.assigneeId), t.priority && (a.priority = t.priority), t.dueDate && (a.due_date = t.dueDate), t.environment && (a.environment = t.environment), a;
}
function re(e) {
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
function ie(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: r(e.work_scope),
    priority: r(e.priority) || "normal",
    assigneeId: r(e.assignee_id),
    dueDate: r(e.due_date)
  };
}
function R(e, t = {}) {
  const a = m(e.default_assignment), s = u(e.missing_locales ?? t.missingLocales), i = u(e.required_for_publish ?? t.requiredForPublish), n = r(e.recommended_locale || t.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: n,
    requiredForPublish: i,
    defaultAssignment: ie({
      auto_create_assignment: a.auto_create_assignment ?? t.defaultAssignment?.autoCreateAssignment,
      work_scope: a.work_scope ?? t.defaultAssignment?.workScope,
      priority: a.priority ?? t.defaultAssignment?.priority,
      assignee_id: a.assignee_id ?? t.defaultAssignment?.assigneeId,
      due_date: a.due_date ?? t.defaultAssignment?.dueDate
    }),
    disabledReasonCode: r(e.disabled_reason_code || t.disabledReasonCode),
    disabledReason: r(e.disabled_reason || t.disabledReason)
  };
}
function ne(e) {
  const t = m(e.data), a = m(e.meta), s = m(a.family), i = m(a.refresh), n = m(t.navigation), c = R(m(s.quick_create), {
    missingLocales: u(s.missing_locales)
  });
  return {
    variantId: r(t.variant_id),
    familyId: r(t.family_id) || r(s.family_id),
    locale: r(t.locale).toLowerCase(),
    status: r(t.status),
    recordId: r(t.record_id),
    contentType: r(t.content_type),
    assignment: t.assignment ? re(m(t.assignment)) : null,
    idempotencyHit: b(a.idempotency_hit),
    assignmentReused: b(a.assignment_reused),
    family: {
      familyId: r(s.family_id),
      readinessState: k(s.readiness_state),
      missingRequiredLocaleCount: p(s.missing_required_locale_count),
      pendingReviewCount: p(s.pending_review_count),
      outdatedLocaleCount: p(s.outdated_locale_count),
      blockerCodes: u(s.blocker_codes),
      missingLocales: u(s.missing_locales),
      availableLocales: u(s.available_locales),
      quickCreate: c
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
function oe(e) {
  const t = r(e.familyId), a = V(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return a.idempotencyKey && (s["X-Idempotency-Key"] = a.idempotencyKey), {
    familyId: t,
    endpoint: ae(r(e.basePath) || "/admin/api", t, a.environment),
    headers: s,
    request: a
  };
}
function le(e) {
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
    blockerCodes: u(e.blocker_codes).map(M),
    missingLocales: u(e.missing_locales),
    availableLocales: u(e.available_locales)
  };
}
function ce(e) {
  const t = m(e.data), a = m(e.meta), s = Object.keys(t).length ? t : e, i = Object.keys(a).length ? a : e, n = s.items ?? s.families;
  return {
    items: (Array.isArray(n) ? n : []).map((l) => le(m(l))),
    total: p(i.total),
    page: p(i.page, 1),
    perPage: p(i.per_page, 50),
    environment: r(i.environment)
  };
}
function U(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    locale: r(e.locale),
    status: r(e.status),
    isSource: b(e.is_source),
    sourceRecordId: r(e.source_record_id),
    sourceHashAtLastSync: r(e.source_hash_at_last_sync),
    fields: W(e.fields),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at),
    publishedAt: r(e.published_at)
  };
}
function de(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    blockerCode: M(e.blocker_code),
    locale: r(e.locale),
    fieldPath: r(e.field_path),
    details: m(e.details)
  };
}
function me(e) {
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
function G(e) {
  const t = m(e.data), a = Object.keys(t).length ? t : e, s = a.source_variant ? U(m(a.source_variant)) : null, i = Array.isArray(a.blockers) ? a.blockers.map((y) => de(m(y))) : [], n = Array.isArray(a.locale_variants) ? a.locale_variants.map((y) => U(m(y))) : [], c = Array.isArray(a.active_assignments) ? a.active_assignments.map((y) => me(m(y))) : [], l = m(a.publish_gate), o = m(a.readiness_summary), g = R(m(a.quick_create), {
    missingLocales: u(o.missing_locales),
    recommendedLocale: r(o.recommended_locale),
    requiredForPublish: u(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: r(a.family_id),
    contentType: r(a.content_type),
    sourceLocale: r(a.source_locale),
    readinessState: k(a.readiness_state),
    sourceVariant: s,
    localeVariants: n,
    blockers: i,
    activeAssignments: c,
    publishGate: {
      allowed: b(l.allowed),
      overrideAllowed: b(l.override_allowed),
      blockedBy: u(l.blocked_by),
      reviewRequired: b(l.review_required)
    },
    readinessSummary: {
      state: k(o.state),
      requiredLocales: u(o.required_locales),
      missingLocales: u(o.missing_locales),
      availableLocales: u(o.available_locales),
      blockerCodes: u(o.blocker_codes),
      missingRequiredLocaleCount: p(o.missing_required_locale_count),
      pendingReviewCount: p(o.pending_review_count),
      outdatedLocaleCount: p(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: g
  };
}
function q(...e) {
  const t = /* @__PURE__ */ new Set();
  for (const a of e)
    for (const s of a) {
      const i = r(s).toLowerCase();
      i && t.add(i);
    }
  return Array.from(t).sort();
}
function H(e, t) {
  const a = r(t).toLowerCase();
  return e.map((s) => r(s).toLowerCase()).filter((s) => s && s !== a);
}
function je(e, t) {
  if (!e || !t || !t.familyId || e.familyId !== t.familyId)
    return e;
  const a = r(t.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === a) ? e.localeVariants.map((o) => o.locale === a ? { ...o, id: o.id || t.variantId, status: t.status || o.status } : { ...o }) : [
    ...e.localeVariants.map((o) => ({ ...o })),
    {
      id: t.variantId,
      familyId: e.familyId,
      locale: a,
      status: t.status,
      isSource: !1,
      sourceRecordId: e.sourceVariant?.sourceRecordId || "",
      sourceHashAtLastSync: "",
      fields: {},
      createdAt: "",
      updatedAt: "",
      publishedAt: ""
    }
  ].sort((o, g) => o.locale.localeCompare(g.locale));
  let i = e.activeAssignments.map((o) => ({ ...o }));
  if (t.assignment) {
    const o = {
      id: t.assignment.assignmentId,
      familyId: e.familyId,
      variantId: t.variantId,
      sourceLocale: e.sourceLocale,
      targetLocale: t.assignment.targetLocale || a,
      workScope: t.assignment.workScope || e.quickCreate.defaultAssignment.workScope,
      status: t.assignment.status,
      assigneeId: t.assignment.assigneeId,
      reviewerId: "",
      priority: t.assignment.priority,
      dueDate: t.assignment.dueDate,
      createdAt: "",
      updatedAt: ""
    }, g = i.findIndex(
      (y) => y.id === o.id || y.targetLocale === o.targetLocale
    );
    g >= 0 ? i[g] = o : i = [...i, o].sort(
      (y, x) => y.targetLocale.localeCompare(x.targetLocale)
    );
  }
  const n = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === a)), c = q(e.readinessSummary.availableLocales, t.family.availableLocales, [a]), l = H(
    q(e.readinessSummary.missingLocales, t.family.missingLocales),
    a
  );
  return {
    ...e,
    readinessState: t.family.readinessState,
    localeVariants: s,
    blockers: n,
    activeAssignments: i,
    publishGate: {
      allowed: t.family.readinessState === "ready",
      overrideAllowed: e.publishGate.overrideAllowed,
      blockedBy: [...t.family.blockerCodes],
      reviewRequired: e.publishGate.reviewRequired
    },
    readinessSummary: {
      ...e.readinessSummary,
      state: t.family.readinessState,
      availableLocales: c,
      missingLocales: l,
      blockerCodes: [...t.family.blockerCodes],
      missingRequiredLocaleCount: t.family.missingRequiredLocaleCount,
      pendingReviewCount: t.family.pendingReviewCount,
      outdatedLocaleCount: t.family.outdatedLocaleCount,
      publishReady: t.family.readinessState === "ready"
    },
    quickCreate: { ...t.family.quickCreate }
  };
}
function Ee(e, t) {
  const a = { ...e }, s = { ...m(a.translation_readiness) }, i = r(t.locale).toLowerCase(), n = r(a.requested_locale).toLowerCase(), c = r(
    a.translation_family_id || a.translation_group_id || s.family_id || s.translation_group_id
  );
  if (c && c !== t.familyId)
    return a;
  const l = q(
    u(a.available_locales),
    u(s.available_locales),
    t.family.availableLocales,
    [i]
  ), o = H(
    q(
      u(a.missing_required_locales),
      u(s.missing_required_locales),
      t.family.missingLocales
    ),
    i
  );
  return a.available_locales = l, a.missing_required_locales = o, a.translation_family_id = c || t.familyId, s.family_id = c || t.familyId, s.state = t.family.readinessState, s.available_locales = l, s.missing_required_locales = o, s.blocker_codes = [...t.family.blockerCodes], s.missing_required_locale_count = t.family.missingRequiredLocaleCount, s.pending_review_count = t.family.pendingReviewCount, s.outdated_locale_count = t.family.outdatedLocaleCount, s.missing_locales = [...t.family.quickCreate.missingLocales], s.recommended_locale = t.family.quickCreate.recommendedLocale, s.required_for_publish = [...t.family.quickCreate.requiredForPublish], s.default_assignment = {
    auto_create_assignment: t.family.quickCreate.defaultAssignment.autoCreateAssignment,
    work_scope: t.family.quickCreate.defaultAssignment.workScope,
    priority: t.family.quickCreate.defaultAssignment.priority,
    assignee_id: t.family.quickCreate.defaultAssignment.assigneeId,
    due_date: t.family.quickCreate.defaultAssignment.dueDate
  }, s.quick_create = {
    enabled: t.family.quickCreate.enabled,
    missing_locales: [...t.family.quickCreate.missingLocales],
    recommended_locale: t.family.quickCreate.recommendedLocale,
    required_for_publish: [...t.family.quickCreate.requiredForPublish],
    default_assignment: {
      auto_create_assignment: t.family.quickCreate.defaultAssignment.autoCreateAssignment,
      work_scope: t.family.quickCreate.defaultAssignment.workScope,
      priority: t.family.quickCreate.defaultAssignment.priority,
      assignee_id: t.family.quickCreate.defaultAssignment.assigneeId,
      due_date: t.family.quickCreate.defaultAssignment.dueDate
    },
    disabled_reason_code: t.family.quickCreate.disabledReasonCode,
    disabled_reason: t.family.quickCreate.disabledReason
  }, a.translation_readiness = s, n && n === i && (a.missing_requested_locale = !1, a.fallback_used = !1, a.resolved_locale = i), a;
}
function ue(e) {
  const t = k(e);
  return t === "ready" ? { state: t, label: "Ready", tone: "success" } : { state: t, label: "Blocked", tone: "warning" };
}
function K(e) {
  const t = ue(e);
  return `<span class="translation-family-chip translation-family-chip--${t.tone}" data-readiness-state="${t.state}">${t.label}</span>`;
}
async function ge(e) {
  const t = await z(e), a = new Error(t.message || "Failed to create locale.");
  return a.statusCode = e.status, a.textCode = t.textCode, a.requestId = r(e.headers.get("x-request-id")), a.traceId = O(e.headers), a.metadata = m(t.metadata), a;
}
function T(e) {
  const t = r(e);
  if (!t) return "";
  const a = new Date(t);
  return Number.isNaN(a.getTime()) ? t : a.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function v(e) {
  const t = r(e).replace(/_/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function ye(e) {
  switch (r(e)) {
    case "published":
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function fe(e) {
  switch (r(e)) {
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
    case "assigned":
      return "bg-sky-100 text-sky-700";
    case "changes_requested":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function pe(e) {
  switch (r(e)) {
    case "missing_locale":
      return "bg-rose-100 text-rose-700";
    case "missing_field":
      return "bg-amber-100 text-amber-700";
    case "pending_review":
      return "bg-sky-100 text-sky-700";
    case "outdated_source":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function be(e, t, a) {
  const s = C(e), i = r(a.sourceRecordId);
  return !s || !i || !t.contentType ? "" : `${s}/${encodeURIComponent(t.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(a.locale)}`;
}
function xe(e) {
  const t = r(e);
  if (!t) return "none";
  const a = new Date(t);
  if (Number.isNaN(a.getTime())) return "none";
  const s = a.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 48 * 60 * 60 * 1e3 ? "due_soon" : "on_track";
}
function he(e, t = 5) {
  const a = [];
  for (const s of e.localeVariants)
    s.createdAt && a.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${v(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && a.push({
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
    a.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: `${s.targetLocale.toUpperCase()} assignment ${v(s.status)}`,
      detail: `${n} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return a.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, t));
}
function _e(e) {
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
    (a) => `
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${d(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${d(a.value)}</div>
        </div>
      `
  ).join("");
}
function ve(e, t) {
  const a = C(t.contentBasePath || `${C(t.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", n = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${o ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-900 text-white hover:bg-gray-800"}"
        data-family-create-locale="true"
        data-locale="${_(l)}"
        ${o ? 'aria-disabled="true"' : ""}
        title="${_(o ? i : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = e.localeVariants.map((l) => {
    const o = be(a, e, l), g = o ? `<a href="${_(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ye(l.status)}">${d(v(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(T(l.updatedAt || l.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${g}</div>
      </li>
    `;
  });
  for (const l of s)
    c.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-dashed border-rose-300 bg-rose-50 p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${d(l.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${n(l)}</div>
      </li>
    `);
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${c.join("") || '<li class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function Ce(e) {
  return e.activeAssignments.length ? `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((t) => {
    const a = xe(t.dueDate), s = a === "none" ? "No due date" : v(a), i = a === "overdue" ? "bg-rose-100 text-rose-700" : a === "due_soon" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700";
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(t.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${fe(t.status)}">${d(v(t.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${i}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(t.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(t.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(T(t.updatedAt || t.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function we(e) {
  const t = e.blockers.length ? e.blockers.map((a) => {
    const s = [a.locale && a.locale.toUpperCase(), a.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${pe(a.blockerCode)}">${d(v(a.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-4">
        <div class="flex flex-wrap items-center gap-3">
          ${K(e.readinessState)}
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
          <ul class="mt-3 space-y-2" role="list">${t}</ul>
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
function Le(e) {
  const t = he(e);
  return `
    <section class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${t.length ? `<ol class="mt-5 space-y-3" role="list">
              ${t.map(
    (a) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(a.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${a.tone === "success" ? "bg-emerald-100 text-emerald-700" : a.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(T(a.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(a.detail)}</p>
                    </li>
                  `
  ).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function I(e) {
  const t = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${t.map(
    (a) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${a}</span>`
  ).join("")}
    </div>
  ` : "";
}
function $e(e) {
  return `
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function N(e, t) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
        <h2 class="text-lg font-semibold text-gray-900">${d(e)}</h2>
        <p class="mt-2 text-sm text-gray-500">${d(t)}</p>
      </div>
    </div>
  `;
}
function ke(e, t) {
  return `
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h2 class="text-lg font-semibold text-rose-900">${d(e)}</h2>
      <p class="mt-2 text-sm text-rose-700">${d(t)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 hover:bg-rose-100">
        Reload family detail
      </button>
    </div>
  `;
}
function qe(e, t = {}) {
  if (e.status === "loading")
    return $e("Loading translation family...");
  if (e.status === "empty")
    return `
      ${N(
      "Family detail unavailable",
      e.message || "This family detail view does not have a backing payload yet."
    )}
      ${I(e)}
    `;
  if (e.status === "error" || e.status === "conflict") {
    const l = e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", o = e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed.");
    return `
      <div class="translation-family-detail-error">
        ${ke(l, o)}
        ${I(e)}
      </div>
    `;
  }
  const a = e.detail;
  if (!a)
    return N("Family detail unavailable", "No family detail payload was returned.");
  const s = a.sourceVariant?.fields.title || a.sourceVariant?.fields.slug || `${a.contentType} family`, i = a.readinessSummary.blockerCodes.length ? a.readinessSummary.blockerCodes.map(v).join(", ") : "No blockers", n = !a.quickCreate.enabled, c = a.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${n ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gray-900 text-white hover:bg-gray-800"}"
        data-family-create-locale="true"
        data-locale="${_(a.quickCreate.recommendedLocale)}"
        ${n ? 'aria-disabled="true"' : ""}
        title="${_(n ? a.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${a.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(a.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${_(a.familyId)}" data-readiness-state="${_(a.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">Translation family</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-gray-900">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(a.contentType)} · Source locale ${d(a.sourceLocale.toUpperCase())} · Family ${d(a.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${K(a.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${_e(a)}
        </div>
        ${I(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${ve(a, t)}
          ${Ce(a)}
        </div>
        <div class="space-y-6">
          ${we(a)}
          ${Le(a)}
        </div>
      </div>
    </div>
  `;
}
async function Se(e, t = {}) {
  const a = r(e);
  if (!a)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const s = await (t.fetch ? t.fetch(a, { headers: { Accept: "application/json" } }) : J(a, { headers: { Accept: "application/json" } })), i = r(s.headers.get("x-request-id")), n = O(s.headers);
    if (!s.ok) {
      const o = await z(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: o.message,
        requestId: i,
        traceId: n,
        statusCode: s.status,
        errorCode: o.textCode
      };
    }
    const c = m(await s.json()), l = G(c);
    return l.familyId ? {
      status: "ready",
      detail: l,
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
function j(e, t, a = {}) {
  e.innerHTML = qe(t, a);
}
function w(e, t) {
  const s = globalThis.toastManager?.[e];
  typeof s == "function" && s(t);
}
function E(e, t) {
  const a = r(e);
  if (!a) return t;
  try {
    return JSON.parse(a);
  } catch {
    return t;
  }
}
function Ae(e, t) {
  switch (e.textCode) {
    case "TRANSLATION_EXISTS":
      return `${t.toUpperCase()} already exists. Reload to open the existing locale.`;
    case "POLICY_BLOCKED":
      return "Policy blocked locale creation for this family.";
    case "VERSION_CONFLICT":
      return "The family changed while you were creating the locale. Reload and try again.";
    default:
      return e.message || "Failed to create locale.";
  }
}
function Ie(e) {
  const t = r(e);
  if (!t) return "";
  const a = new Date(t);
  if (Number.isNaN(a.getTime())) return "";
  const s = a.getFullYear(), i = String(a.getMonth() + 1).padStart(2, "0"), n = String(a.getDate()).padStart(2, "0"), c = String(a.getHours()).padStart(2, "0"), l = String(a.getMinutes()).padStart(2, "0");
  return `${s}-${i}-${n}T${c}:${l}`;
}
function Re(e) {
  const t = r(e);
  if (!t) return "";
  const a = new Date(t);
  return Number.isNaN(a.getTime()) ? "" : a.toISOString();
}
function Te(e, t, a, s) {
  const i = r(e.locale).toLowerCase(), n = r(a).toLowerCase(), c = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return n && n === i && c ? c : i && t[i] ? t[i] : c;
}
function Q(e) {
  const t = typeof document < "u" ? document : null;
  if (!t) return;
  const a = e.quickCreate;
  if (!a.enabled || a.missingLocales.length === 0) {
    w("warning", a.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = r(e.initialLocale || a.recommendedLocale || a.missingLocales[0]).toLowerCase(), i = a.missingLocales.includes(s) ? s : a.missingLocales[0], n = t.createElement("div");
  n.className = "fixed inset-0 z-[80] flex items-center justify-center bg-gray-900/50 p-4", n.setAttribute("data-translation-create-locale-modal", "true"), n.innerHTML = `
    <div class="w-full max-w-xl rounded-xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-200">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${a.missingLocales.map((f) => `
                <option value="${_(f)}" ${f === i ? "selected" : ""}>
                  ${d(f.toUpperCase())}${f === a.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${d(a.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${d(a.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${d(a.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${a.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-2xl border border-gray-200 p-4">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${_(a.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${["low", "normal", "high", "urgent"].map((f) => `
                  <option value="${f}" ${f === (a.defaultAssignment.priority || "normal") ? "selected" : ""}>${v(f)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${_(Ie(a.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">Cancel</button>
          <button type="submit" class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, t.body.appendChild(n);
  const c = n.querySelector("form"), l = n.querySelector('select[name="locale"]'), o = n.querySelector('input[name="auto_create_assignment"]'), g = n.querySelector('input[name="assignee_id"]'), y = n.querySelector('select[name="priority"]'), x = n.querySelector('input[name="due_date"]'), L = n.querySelector('[data-assignment-fields="true"]'), h = n.querySelector('[data-create-locale-feedback="true"]'), $ = n.querySelector('button[type="submit"]'), S = () => {
    n.remove();
  }, P = () => {
    !L || !o || (L.hidden = !o.checked);
  };
  P(), o?.addEventListener("change", P), n.querySelectorAll('[data-close-modal="true"]').forEach((f) => {
    f.addEventListener("click", S);
  }), n.addEventListener("click", (f) => {
    f.target === n && S();
  }), c?.addEventListener("submit", async (f) => {
    if (f.preventDefault(), !l || !$) return;
    h && (h.hidden = !0, h.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const D = r(l.value).toLowerCase();
    try {
      const A = await e.onSubmit({
        locale: D,
        autoCreateAssignment: o?.checked,
        assigneeId: g?.value,
        priority: y?.value,
        dueDate: Re(x?.value || "")
      });
      S(), await e.onSuccess?.(A);
    } catch (A) {
      const F = Ae(A, D);
      h && (h.hidden = !1, h.textContent = F), w("error", F);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Pe(e) {
  return {
    familyId: r(e.dataset.translationGroupId),
    requestedLocale: r(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: r(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: r(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: R(
      E(e.dataset.quickCreate || "", {}),
      {}
    ),
    localeURLs: E(e.dataset.localeUrls || "", {})
  };
}
function Be(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((t) => {
    if (t.dataset.translationCreateBound === "true") return;
    t.dataset.translationCreateBound = "true";
    const a = Pe(t), s = Y({ basePath: a.apiBasePath });
    t.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (n) => {
        n.preventDefault();
        const c = r(i.dataset.locale).toLowerCase() || a.quickCreate.recommendedLocale;
        Q({
          familyId: a.familyId,
          quickCreate: a.quickCreate,
          initialLocale: c,
          heading: `Create ${c.toUpperCase() || a.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(a.familyId, l),
          onSuccess: async (l) => {
            w("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), g = Te(l, a.localeURLs, a.requestedLocale, o);
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
async function B(e, t = {}) {
  if (!e) return null;
  const a = e.dataset || {}, s = r(t.endpoint || a.endpoint), i = {
    basePath: r(t.basePath || a.basePath || "/admin"),
    contentBasePath: r(t.contentBasePath || a.contentBasePath)
  };
  j(e, { status: "loading" }, i);
  const n = await Se(s, { fetch: t.fetch });
  if (j(e, n, i), typeof e.querySelector == "function") {
    if (n.status === "ready" && n.detail) {
      const l = `${C(i.basePath || "/admin")}/api`, o = Y({ basePath: l, fetch: t.fetch });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((g) => {
        g.dataset.translationCreateBound !== "true" && (g.dataset.translationCreateBound = "true", g.addEventListener("click", (y) => {
          y.preventDefault();
          const x = n.detail;
          if (!x) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (g.getAttribute("aria-disabled") === "true") {
            w("warning", x.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const L = r(g.dataset.locale).toLowerCase() || x.quickCreate.recommendedLocale || "";
          Q({
            familyId: x.familyId,
            quickCreate: x.quickCreate,
            initialLocale: L,
            heading: `Create ${L.toUpperCase()} locale`,
            onSubmit: (h) => o.createLocale(x.familyId, h),
            onSuccess: async (h) => {
              w("success", `${h.locale.toUpperCase()} locale created.`), await B(e, { ...t, ...i, endpoint: s });
            }
          });
        }));
      });
    }
    const c = e.querySelector(".ui-state-retry-btn");
    c && c.addEventListener("click", () => {
      B(e, { ...t, ...i, endpoint: s });
    });
  }
  return n;
}
function Y(e = {}) {
  const t = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t)
    throw new Error("translation-family client requires fetch");
  const a = C(e.basePath || "/admin/api");
  return {
    async list(s = {}) {
      const n = await (await t(ee(a, s), {
        headers: { Accept: "application/json" }
      })).json();
      return ce(n);
    },
    async detail(s, i = "") {
      const c = await (await t(te(a, s, i), {
        headers: { Accept: "application/json" }
      })).json();
      return G(c);
    },
    async createLocale(s, i = {}) {
      const n = oe({
        ...i,
        familyId: s,
        basePath: a
      }), c = await t(n.endpoint, {
        method: "POST",
        headers: n.headers,
        body: JSON.stringify(se(n.request))
      });
      if (!c.ok)
        throw await ge(c);
      const l = await c.json();
      return ne(l);
    }
  };
}
function C(e) {
  const t = r(e);
  return t ? t.endsWith("/") ? t.slice(0, -1) : t : "";
}
export {
  je as applyCreateLocaleToFamilyDetail,
  Ee as applyCreateLocaleToSummaryState,
  ae as buildCreateLocaleURL,
  he as buildFamilyActivityPreview,
  te as buildFamilyDetailURL,
  Z as buildFamilyListQuery,
  ee as buildFamilyListURL,
  X as createFamilyFilters,
  oe as createTranslationCreateLocaleActionModel,
  V as createTranslationCreateLocaleRequest,
  Y as createTranslationFamilyClient,
  Se as fetchTranslationFamilyDetailState,
  ue as getReadinessChip,
  B as initTranslationFamilyDetailPage,
  Be as initTranslationSummaryCards,
  ne as normalizeCreateLocaleResult,
  G as normalizeFamilyDetail,
  ce as normalizeFamilyListResponse,
  le as normalizeFamilyListRow,
  R as normalizeQuickCreateHints,
  K as renderReadinessChip,
  j as renderTranslationFamilyDetailPage,
  qe as renderTranslationFamilyDetailState,
  se as serializeCreateLocaleRequest,
  Ie as toDateTimeLocalInputValue
};
//# sourceMappingURL=index.js.map
