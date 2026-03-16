import { e as x, a as d } from "../chunks/html-Br-oQr7i.js";
import { h as ae } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as V } from "../toast/error-helpers.js";
import { B as P, H as te, a as se, E as re, b as ie, c as ne, d as oe, e as le, f as ce, g as G, C as k, M as de, h as me, i as ue, t as ge } from "../chunks/style-constants-_M0LozTF.js";
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
function H(e) {
  return r(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function g(e) {
  return Array.isArray(e) ? e.map((a) => r(a)).filter((a) => a.length > 0) : [];
}
function q(e) {
  return r(e) === "ready" ? "ready" : "blocked";
}
function Y(e) {
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
function ye(e) {
  const a = m(e), t = {};
  for (const [s, i] of Object.entries(a)) {
    const n = r(i);
    s.trim() !== "" && n !== "" && (t[s] = n);
  }
  return t;
}
function fe(e = {}) {
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
function pe(e = {}) {
  const a = fe(e), t = new URLSearchParams();
  return a.contentType && t.set("content_type", a.contentType), a.readinessState && t.set("readiness_state", a.readinessState), a.blockerCode && t.set("blocker_code", a.blockerCode), a.missingLocale && t.set("missing_locale", a.missingLocale), a.environment && t.set("environment", a.environment), t.set("page", String(a.page)), t.set("per_page", String(a.perPage)), t;
}
function be(e, a = {}) {
  const t = `${v(e)}/translations/families`, s = pe(a).toString();
  return s ? `${t}?${s}` : t;
}
function _e(e, a, t = "") {
  const s = encodeURIComponent(r(a)), i = `${v(e)}/translations/families/${s}`, n = new URLSearchParams();
  r(t) && n.set("environment", r(t));
  const l = n.toString();
  return l ? `${i}?${l}` : i;
}
function K(e = {}) {
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
function xe(e, a, t = "") {
  const s = encodeURIComponent(r(a)), i = `${v(e)}/translations/families/${s}/variants`, n = new URLSearchParams();
  r(t) && n.set("environment", r(t));
  const l = n.toString();
  return l ? `${i}?${l}` : i;
}
function he(e = {}) {
  const a = K(e), t = {
    locale: a.locale
  };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.environment && (t.environment = a.environment), t;
}
function ve(e) {
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
function Ce(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: r(e.work_scope),
    priority: r(e.priority) || "normal",
    assigneeId: r(e.assignee_id),
    dueDate: r(e.due_date)
  };
}
function E(e, a = {}) {
  const t = m(e.default_assignment), s = g(e.missing_locales ?? a.missingLocales), i = g(e.required_for_publish ?? a.requiredForPublish), n = r(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: n,
    requiredForPublish: i,
    defaultAssignment: Ce({
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
function Le(e) {
  const a = m(e.data), t = m(e.meta), s = m(t.family), i = m(t.refresh), n = m(a.navigation), l = E(m(s.quick_create), {
    missingLocales: g(s.missing_locales)
  });
  return {
    variantId: r(a.variant_id),
    familyId: r(a.family_id) || r(s.family_id),
    locale: r(a.locale).toLowerCase(),
    status: r(a.status),
    recordId: r(a.record_id),
    contentType: r(a.content_type),
    assignment: a.assignment ? ve(m(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: r(s.family_id),
      readinessState: q(s.readiness_state),
      missingRequiredLocaleCount: p(s.missing_required_locale_count),
      pendingReviewCount: p(s.pending_review_count),
      outdatedLocaleCount: p(s.outdated_locale_count),
      blockerCodes: g(s.blocker_codes),
      missingLocales: g(s.missing_locales),
      availableLocales: g(s.available_locales),
      quickCreate: l
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
function we(e) {
  const a = r(e.familyId), t = K(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: xe(r(e.basePath) || "/admin/api", a, t.environment),
    headers: s,
    request: t
  };
}
function $e(e) {
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
    blockerCodes: g(e.blocker_codes).map(Y),
    missingLocales: g(e.missing_locales),
    availableLocales: g(e.available_locales)
  };
}
function ke(e) {
  const a = m(e.data), t = m(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, n = s.items ?? s.families;
  return {
    items: (Array.isArray(n) ? n : []).map((c) => $e(m(c))),
    total: p(i.total),
    page: p(i.page, 1),
    perPage: p(i.per_page, 50),
    environment: r(i.environment)
  };
}
function j(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    locale: r(e.locale),
    status: r(e.status),
    isSource: b(e.is_source),
    sourceRecordId: r(e.source_record_id),
    sourceHashAtLastSync: r(e.source_hash_at_last_sync),
    fields: ye(e.fields),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at),
    publishedAt: r(e.published_at)
  };
}
function qe(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    blockerCode: Y(e.blocker_code),
    locale: r(e.locale),
    fieldPath: r(e.field_path),
    details: m(e.details)
  };
}
function Se(e) {
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
function Q(e) {
  const a = m(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? j(m(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((y) => qe(m(y))) : [], n = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => j(m(y))) : [], l = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => Se(m(y))) : [], c = m(t.publish_gate), o = m(t.readiness_summary), u = E(m(t.quick_create), {
    missingLocales: g(o.missing_locales),
    recommendedLocale: r(o.recommended_locale),
    requiredForPublish: g(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: r(t.family_id),
    contentType: r(t.content_type),
    sourceLocale: r(t.source_locale),
    readinessState: q(t.readiness_state),
    sourceVariant: s,
    localeVariants: n,
    blockers: i,
    activeAssignments: l,
    publishGate: {
      allowed: b(c.allowed),
      overrideAllowed: b(c.override_allowed),
      blockedBy: g(c.blocked_by),
      reviewRequired: b(c.review_required)
    },
    readinessSummary: {
      state: q(o.state),
      requiredLocales: g(o.required_locales),
      missingLocales: g(o.missing_locales),
      availableLocales: g(o.available_locales),
      blockerCodes: g(o.blocker_codes),
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
      const i = r(s).toLowerCase();
      i && a.add(i);
    }
  return Array.from(a).sort();
}
function X(e, a) {
  const t = r(a).toLowerCase();
  return e.map((s) => r(s).toLowerCase()).filter((s) => s && s !== t);
}
function ta(e, a) {
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
    }, u = i.findIndex(
      (y) => y.id === o.id || y.targetLocale === o.targetLocale
    );
    u >= 0 ? i[u] = o : i = [...i, o].sort(
      (y, _) => y.targetLocale.localeCompare(_.targetLocale)
    );
  }
  const n = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), l = I(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = X(
    I(e.readinessSummary.missingLocales, a.family.missingLocales),
    t
  );
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
function sa(e, a) {
  const t = { ...e }, s = { ...m(t.translation_readiness) }, i = r(a.locale).toLowerCase(), n = r(t.requested_locale).toLowerCase(), l = r(
    t.translation_family_id || t.translation_group_id || s.family_id || s.translation_group_id
  );
  if (l && l !== a.familyId)
    return t;
  const c = I(
    g(t.available_locales),
    g(s.available_locales),
    a.family.availableLocales,
    [i]
  ), o = X(
    I(
      g(t.missing_required_locales),
      g(s.missing_required_locales),
      a.family.missingLocales
    ),
    i
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
  }, t.translation_readiness = s, n && n === i && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = i), t;
}
function Ae(e) {
  const a = q(e);
  return a === "ready" ? { state: a, label: "Ready", tone: "success" } : { state: a, label: "Blocked", tone: "warning" };
}
function J(e) {
  const a = Ae(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ie(e) {
  const a = await V(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = r(e.headers.get("x-request-id")), t.traceId = H(e.headers), t.metadata = m(a.metadata), t;
}
function D(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? a : t.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function h(e) {
  const a = r(e).replace(/_/g, " ");
  return a ? a.charAt(0).toUpperCase() + a.slice(1) : "";
}
function Re(e) {
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
function Te(e) {
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
function Pe(e) {
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
function Ee(e, a, t) {
  const s = v(e), i = r(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function De(e) {
  const a = r(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 48 * 60 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Fe(e, a = 5) {
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
function Ne(e) {
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
function Ue(e, a) {
  const t = v(a.contentBasePath || `${v(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", n = (c) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${P}"
        data-family-create-locale="true"
        data-locale="${x(c)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${x(o ? i : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, l = e.localeVariants.map((c) => {
    const o = Ee(t, e, c), u = o ? `<a href="${x(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Re(c.status)}">${d(h(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(D(c.updatedAt || c.createdAt)) || "n/a"}</p>
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
        <div class="flex-shrink-0">${n(c)}</div>
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
        ${l.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function je(e) {
  return e.activeAssignments.length ? `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = De(a.dueDate), s = t === "none" ? "No due date" : h(t), i = t === "overdue" ? "bg-rose-100 text-rose-700" : t === "due_soon" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700";
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Te(a.status)}">${d(h(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${i}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(D(a.updatedAt || a.createdAt)) || "n/a"}</p>
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
function Be(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Pe(t.blockerCode)}">${d(h(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-4">
        <div class="flex flex-wrap items-center gap-3">
          ${J(e.readinessState)}
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
function Oe(e) {
  const a = Fe(e);
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map(
    (t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(D(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `
  ).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function T(e) {
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
function ze(e) {
  return `
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function B(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${re} p-8 text-center shadow-sm">
        <h2 class="${ie}">${d(e)}</h2>
        <p class="${ne} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function Me(e, a) {
  return `
    <div class="${oe} p-6" role="alert">
      <h2 class="${le}">${d(e)}</h2>
      <p class="${ce} mt-2">${d(a)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 ${G}">
        Reload family detail
      </button>
    </div>
  `;
}
function Ve(e, a = {}) {
  if (e.status === "loading")
    return ze("Loading translation family...");
  if (e.status === "empty")
    return `
      ${B(
      "Family detail unavailable",
      e.message || "This family detail view does not have a backing payload yet."
    )}
      ${T(e)}
    `;
  if (e.status === "error" || e.status === "conflict") {
    const c = e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", o = e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed.");
    return `
      <div class="translation-family-detail-error">
        ${Me(c, o)}
        ${T(e)}
      </div>
    `;
  }
  const t = e.detail;
  if (!t)
    return B("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(h).join(", ") : "No blockers", n = !t.quickCreate.enabled, l = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${P}"
        data-family-create-locale="true"
        data-locale="${x(t.quickCreate.recommendedLocale)}"
        ${n ? 'disabled aria-disabled="true"' : ""}
        title="${x(n ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${x(t.familyId)}" data-readiness-state="${x(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${te}">Translation family</p>
            <h1 class="${se} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${J(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${l}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Ne(t)}
        </div>
        ${T(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Ue(t, a)}
          ${je(t)}
        </div>
        <div class="space-y-6">
          ${Be(t)}
          ${Oe(t)}
        </div>
      </div>
    </div>
  `;
}
async function Ge(e, a = {}) {
  const t = r(e);
  if (!t)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : ae(t, { headers: { Accept: "application/json" } })), i = r(s.headers.get("x-request-id")), n = H(s.headers);
    if (!s.ok) {
      const o = await V(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: o.message,
        requestId: i,
        traceId: n,
        statusCode: s.status,
        errorCode: o.textCode
      };
    }
    const l = m(await s.json()), c = Q(l);
    return c.familyId ? {
      status: "ready",
      detail: c,
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
function O(e, a, t = {}) {
  e.innerHTML = Ve(a, t);
}
function w(e, a) {
  const s = globalThis.toastManager?.[e];
  typeof s == "function" && s(a);
}
function z(e, a) {
  const t = r(e);
  if (!t) return a;
  try {
    return JSON.parse(t);
  } catch {
    return a;
  }
}
function He(e, a) {
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
function Ye(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "";
  const s = t.getFullYear(), i = String(t.getMonth() + 1).padStart(2, "0"), n = String(t.getDate()).padStart(2, "0"), l = String(t.getHours()).padStart(2, "0"), c = String(t.getMinutes()).padStart(2, "0");
  return `${s}-${i}-${n}T${l}:${c}`;
}
function Ke(e) {
  const a = r(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Qe(e, a, t, s) {
  const i = r(e.locale).toLowerCase(), n = r(t).toLowerCase(), l = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return n && n === i && l ? l : i && a[i] ? a[i] : l;
}
function W(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    w("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = r(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], n = a.createElement("div");
  n.className = de, n.setAttribute("data-translation-create-locale-modal", "true"), n.innerHTML = `
    <div class="${me}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${ue}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((f) => `
                <option value="${x(f)}" ${f === i ? "selected" : ""}>
                  ${d(f.toUpperCase())}${f === t.recommendedLocale ? " (recommended)" : ""}
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
              <input type="text" name="assignee_id" value="${x(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${["low", "normal", "high", "urgent"].map((f) => `
                  <option value="${f}" ${f === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${h(f)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${x(Ye(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${G}">Cancel</button>
          <button type="submit" class="${P}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(n);
  const l = n.querySelector('[role="dialog"]'), c = n.querySelector("form"), o = n.querySelector('select[name="locale"]'), u = n.querySelector('input[name="auto_create_assignment"]'), y = n.querySelector('input[name="assignee_id"]'), _ = n.querySelector('select[name="priority"]'), S = n.querySelector('input[name="due_date"]'), C = n.querySelector('[data-assignment-fields="true"]'), L = n.querySelector('[data-create-locale-feedback="true"]'), $ = n.querySelector('button[type="submit"]'), A = () => {
    ee(), n.remove();
  }, F = () => {
    !C || !u || (C.hidden = !u.checked);
  }, ee = l ? ge(l, A) : () => {
  };
  F(), u?.addEventListener("change", F), n.querySelectorAll('[data-close-modal="true"]').forEach((f) => {
    f.addEventListener("click", A);
  }), n.addEventListener("click", (f) => {
    f.target === n && A();
  }), c?.addEventListener("submit", async (f) => {
    if (f.preventDefault(), !o || !$) return;
    L && (L.hidden = !0, L.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const N = r(o.value).toLowerCase();
    try {
      const R = await e.onSubmit({
        locale: N,
        autoCreateAssignment: u?.checked,
        assigneeId: y?.value,
        priority: _?.value,
        dueDate: Ke(S?.value || "")
      });
      A(), await e.onSuccess?.(R);
    } catch (R) {
      const U = He(R, N);
      L && (L.hidden = !1, L.textContent = U), w("error", U);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Xe(e) {
  return {
    familyId: r(e.dataset.translationGroupId),
    requestedLocale: r(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: r(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: r(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: E(
      z(e.dataset.quickCreate || "", {}),
      {}
    ),
    localeURLs: z(e.dataset.localeUrls || "", {})
  };
}
function ra(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Xe(a), s = Z({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (n) => {
        n.preventDefault();
        const l = r(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        W({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: l,
          heading: `Create ${l.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            w("success", `${c.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), u = Qe(c, t.localeURLs, t.requestedLocale, o);
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
async function M(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = r(a.endpoint || t.endpoint), i = {
    basePath: r(a.basePath || t.basePath || "/admin"),
    contentBasePath: r(a.contentBasePath || t.contentBasePath)
  };
  O(e, { status: "loading" }, i);
  const n = await Ge(s, { fetch: a.fetch });
  if (O(e, n, i), typeof e.querySelector == "function") {
    if (n.status === "ready" && n.detail) {
      const c = `${v(i.basePath || "/admin")}/api`, o = Z({ basePath: c, fetch: a.fetch });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((u) => {
        u.dataset.translationCreateBound !== "true" && (u.dataset.translationCreateBound = "true", u.addEventListener("click", (y) => {
          y.preventDefault();
          const _ = n.detail;
          if (!_) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (u.getAttribute("aria-disabled") === "true") {
            w("warning", _.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const S = r(u.dataset.locale).toLowerCase() || _.quickCreate.recommendedLocale || "";
          W({
            familyId: _.familyId,
            quickCreate: _.quickCreate,
            initialLocale: S,
            heading: `Create ${S.toUpperCase()} locale`,
            onSubmit: (C) => o.createLocale(_.familyId, C),
            onSuccess: async (C) => {
              w("success", `${C.locale.toUpperCase()} locale created.`), await M(e, { ...a, ...i, endpoint: s });
            }
          });
        }));
      });
    }
    const l = e.querySelector(".ui-state-retry-btn");
    l && l.addEventListener("click", () => {
      M(e, { ...a, ...i, endpoint: s });
    });
  }
  return n;
}
function Z(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("translation-family client requires fetch");
  const t = v(e.basePath || "/admin/api");
  return {
    async list(s = {}) {
      const n = await (await a(be(t, s), {
        headers: { Accept: "application/json" }
      })).json();
      return ke(n);
    },
    async detail(s, i = "") {
      const l = await (await a(_e(t, s, i), {
        headers: { Accept: "application/json" }
      })).json();
      return Q(l);
    },
    async createLocale(s, i = {}) {
      const n = we({
        ...i,
        familyId: s,
        basePath: t
      }), l = await a(n.endpoint, {
        method: "POST",
        headers: n.headers,
        body: JSON.stringify(he(n.request))
      });
      if (!l.ok)
        throw await Ie(l);
      const c = await l.json();
      return Le(c);
    }
  };
}
function v(e) {
  const a = r(e);
  return a ? a.endsWith("/") ? a.slice(0, -1) : a : "";
}
export {
  ta as applyCreateLocaleToFamilyDetail,
  sa as applyCreateLocaleToSummaryState,
  xe as buildCreateLocaleURL,
  Fe as buildFamilyActivityPreview,
  _e as buildFamilyDetailURL,
  pe as buildFamilyListQuery,
  be as buildFamilyListURL,
  fe as createFamilyFilters,
  we as createTranslationCreateLocaleActionModel,
  K as createTranslationCreateLocaleRequest,
  Z as createTranslationFamilyClient,
  Ge as fetchTranslationFamilyDetailState,
  Ae as getReadinessChip,
  M as initTranslationFamilyDetailPage,
  ra as initTranslationSummaryCards,
  Le as normalizeCreateLocaleResult,
  Q as normalizeFamilyDetail,
  ke as normalizeFamilyListResponse,
  $e as normalizeFamilyListRow,
  E as normalizeQuickCreateHints,
  J as renderReadinessChip,
  O as renderTranslationFamilyDetailPage,
  Ve as renderTranslationFamilyDetailState,
  he as serializeCreateLocaleRequest,
  Ye as toDateTimeLocalInputValue
};
//# sourceMappingURL=index.js.map
