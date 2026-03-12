import { e as _, a as d } from "../chunks/html-Br-oQr7i.js";
import { h as J } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as z } from "../toast/error-helpers.js";
function i(e) {
  return typeof e == "string" ? e.trim() : "";
}
function y(e, t = 0) {
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
  return i(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function u(e) {
  return Array.isArray(e) ? e.map((t) => i(t)).filter((t) => t.length > 0) : [];
}
function $(e) {
  return i(e) === "ready" ? "ready" : "blocked";
}
function M(e) {
  const t = i(e);
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
  for (const [s, n] of Object.entries(t)) {
    const r = i(n);
    s.trim() !== "" && r !== "" && (a[s] = r);
  }
  return a;
}
function X(e = {}) {
  return {
    contentType: i(e.contentType),
    readinessState: i(e.readinessState),
    blockerCode: i(e.blockerCode),
    missingLocale: i(e.missingLocale),
    page: Math.max(1, y(e.page, 1)),
    perPage: Math.max(1, y(e.perPage, 50)),
    environment: i(e.environment)
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
  const s = encodeURIComponent(i(t)), n = `${C(e)}/translations/families/${s}`, r = new URLSearchParams();
  i(a) && r.set("environment", i(a));
  const c = r.toString();
  return c ? `${n}?${c}` : n;
}
function V(e = {}) {
  return {
    locale: i(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: i(e.assigneeId),
    priority: i(e.priority).toLowerCase(),
    dueDate: i(e.dueDate),
    environment: i(e.environment),
    idempotencyKey: i(e.idempotencyKey)
  };
}
function ae(e, t, a = "") {
  const s = encodeURIComponent(i(t)), n = `${C(e)}/translations/families/${s}/variants`, r = new URLSearchParams();
  i(a) && r.set("environment", i(a));
  const c = r.toString();
  return c ? `${n}?${c}` : n;
}
function se(e = {}) {
  const t = V(e), a = {
    locale: t.locale
  };
  return t.autoCreateAssignment && (a.auto_create_assignment = !0), t.assigneeId && (a.assignee_id = t.assigneeId), t.priority && (a.priority = t.priority), t.dueDate && (a.due_date = t.dueDate), t.environment && (a.environment = t.environment), a;
}
function ie(e) {
  return {
    assignmentId: i(e.assignment_id),
    status: i(e.status),
    targetLocale: i(e.target_locale),
    workScope: i(e.work_scope),
    assigneeId: i(e.assignee_id),
    priority: i(e.priority),
    dueDate: i(e.due_date)
  };
}
function ne(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: i(e.work_scope),
    priority: i(e.priority) || "normal",
    assigneeId: i(e.assignee_id),
    dueDate: i(e.due_date)
  };
}
function R(e, t = {}) {
  const a = m(e.default_assignment), s = u(e.missing_locales ?? t.missingLocales), n = u(e.required_for_publish ?? t.requiredForPublish), r = i(e.recommended_locale || t.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: n,
    defaultAssignment: ne({
      auto_create_assignment: a.auto_create_assignment ?? t.defaultAssignment?.autoCreateAssignment,
      work_scope: a.work_scope ?? t.defaultAssignment?.workScope,
      priority: a.priority ?? t.defaultAssignment?.priority,
      assignee_id: a.assignee_id ?? t.defaultAssignment?.assigneeId,
      due_date: a.due_date ?? t.defaultAssignment?.dueDate
    }),
    disabledReasonCode: i(e.disabled_reason_code || t.disabledReasonCode),
    disabledReason: i(e.disabled_reason || t.disabledReason)
  };
}
function re(e) {
  const t = m(e.data), a = m(e.meta), s = m(a.family), n = m(a.refresh), r = m(t.navigation), c = R(m(s.quick_create), {
    missingLocales: u(s.missing_locales)
  });
  return {
    variantId: i(t.variant_id),
    familyId: i(t.family_id) || i(s.family_id),
    locale: i(t.locale).toLowerCase(),
    status: i(t.status),
    recordId: i(t.record_id),
    contentType: i(t.content_type),
    assignment: t.assignment ? ie(m(t.assignment)) : null,
    idempotencyHit: b(a.idempotency_hit),
    assignmentReused: b(a.assignment_reused),
    family: {
      familyId: i(s.family_id),
      readinessState: $(s.readiness_state),
      missingRequiredLocaleCount: y(s.missing_required_locale_count),
      pendingReviewCount: y(s.pending_review_count),
      outdatedLocaleCount: y(s.outdated_locale_count),
      blockerCodes: u(s.blocker_codes),
      missingLocales: u(s.missing_locales),
      availableLocales: u(s.available_locales),
      quickCreate: c
    },
    refresh: {
      familyDetail: b(n.family_detail),
      familyList: b(n.family_list),
      contentSummary: b(n.content_summary)
    },
    navigation: {
      contentDetailURL: i(r.content_detail_url),
      contentEditURL: i(r.content_edit_url)
    }
  };
}
function oe(e) {
  const t = i(e.familyId), a = V(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return a.idempotencyKey && (s["X-Idempotency-Key"] = a.idempotencyKey), {
    familyId: t,
    endpoint: ae(i(e.basePath) || "/admin/api", t, a.environment),
    headers: s,
    request: a
  };
}
function le(e) {
  return {
    familyId: i(e.family_id),
    tenantId: i(e.tenant_id),
    orgId: i(e.org_id),
    contentType: i(e.content_type),
    sourceLocale: i(e.source_locale),
    sourceVariantId: i(e.source_variant_id),
    sourceRecordId: i(e.source_record_id),
    sourceTitle: i(e.source_title),
    readinessState: $(e.readiness_state),
    missingRequiredLocaleCount: y(e.missing_required_locale_count),
    pendingReviewCount: y(e.pending_review_count),
    outdatedLocaleCount: y(e.outdated_locale_count),
    blockerCodes: u(e.blocker_codes).map(M),
    missingLocales: u(e.missing_locales),
    availableLocales: u(e.available_locales)
  };
}
function ce(e) {
  const t = m(e.data), a = m(e.meta), s = Object.keys(t).length ? t : e, n = Object.keys(a).length ? a : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((l) => le(m(l))),
    total: y(n.total),
    page: y(n.page, 1),
    perPage: y(n.per_page, 50),
    environment: i(n.environment)
  };
}
function U(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    locale: i(e.locale),
    status: i(e.status),
    isSource: b(e.is_source),
    sourceRecordId: i(e.source_record_id),
    sourceHashAtLastSync: i(e.source_hash_at_last_sync),
    fields: W(e.fields),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    publishedAt: i(e.published_at)
  };
}
function de(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    blockerCode: M(e.blocker_code),
    locale: i(e.locale),
    fieldPath: i(e.field_path),
    details: m(e.details)
  };
}
function me(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    variantId: i(e.variant_id),
    sourceLocale: i(e.source_locale),
    targetLocale: i(e.target_locale),
    workScope: i(e.work_scope),
    status: i(e.status),
    assigneeId: i(e.assignee_id),
    reviewerId: i(e.reviewer_id),
    priority: i(e.priority),
    dueDate: i(e.due_date),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at)
  };
}
function G(e) {
  const t = m(e.data), a = Object.keys(t).length ? t : e, s = a.source_variant ? U(m(a.source_variant)) : null, n = Array.isArray(a.blockers) ? a.blockers.map((p) => de(m(p))) : [], r = Array.isArray(a.locale_variants) ? a.locale_variants.map((p) => U(m(p))) : [], c = Array.isArray(a.active_assignments) ? a.active_assignments.map((p) => me(m(p))) : [], l = m(a.publish_gate), o = m(a.readiness_summary), f = R(m(a.quick_create), {
    missingLocales: u(o.missing_locales),
    recommendedLocale: i(o.recommended_locale),
    requiredForPublish: u(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: i(a.family_id),
    contentType: i(a.content_type),
    sourceLocale: i(a.source_locale),
    readinessState: $(a.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: n,
    activeAssignments: c,
    publishGate: {
      allowed: b(l.allowed),
      overrideAllowed: b(l.override_allowed),
      blockedBy: u(l.blocked_by),
      reviewRequired: b(l.review_required)
    },
    readinessSummary: {
      state: $(o.state),
      requiredLocales: u(o.required_locales),
      missingLocales: u(o.missing_locales),
      availableLocales: u(o.available_locales),
      blockerCodes: u(o.blocker_codes),
      missingRequiredLocaleCount: y(o.missing_required_locale_count),
      pendingReviewCount: y(o.pending_review_count),
      outdatedLocaleCount: y(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: f
  };
}
function q(...e) {
  const t = /* @__PURE__ */ new Set();
  for (const a of e)
    for (const s of a) {
      const n = i(s).toLowerCase();
      n && t.add(n);
    }
  return Array.from(t).sort();
}
function H(e, t) {
  const a = i(t).toLowerCase();
  return e.map((s) => i(s).toLowerCase()).filter((s) => s && s !== a);
}
function je(e, t) {
  if (!e || !t || !t.familyId || e.familyId !== t.familyId)
    return e;
  const a = i(t.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === a) ? e.localeVariants.map((o) => o.locale === a ? { ...o, id: o.id || t.variantId, status: t.status || o.status } : { ...o }) : [
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
  ].sort((o, f) => o.locale.localeCompare(f.locale));
  let n = e.activeAssignments.map((o) => ({ ...o }));
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
    }, f = n.findIndex(
      (p) => p.id === o.id || p.targetLocale === o.targetLocale
    );
    f >= 0 ? n[f] = o : n = [...n, o].sort(
      (p, x) => p.targetLocale.localeCompare(x.targetLocale)
    );
  }
  const r = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === a)), c = q(e.readinessSummary.availableLocales, t.family.availableLocales, [a]), l = H(
    q(e.readinessSummary.missingLocales, t.family.missingLocales),
    a
  );
  return {
    ...e,
    readinessState: t.family.readinessState,
    localeVariants: s,
    blockers: r,
    activeAssignments: n,
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
  const a = { ...e }, s = { ...m(a.translation_readiness) }, n = i(t.locale).toLowerCase(), r = i(a.requested_locale).toLowerCase(), c = i(
    a.translation_family_id || a.translation_group_id || s.family_id || s.translation_group_id
  );
  if (c && c !== t.familyId)
    return a;
  const l = q(
    u(a.available_locales),
    u(s.available_locales),
    t.family.availableLocales,
    [n]
  ), o = H(
    q(
      u(a.missing_required_locales),
      u(s.missing_required_locales),
      t.family.missingLocales
    ),
    n
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
  }, a.translation_readiness = s, r && r === n && (a.missing_requested_locale = !1, a.fallback_used = !1, a.resolved_locale = n), a;
}
function ue(e) {
  const t = $(e);
  return t === "ready" ? { state: t, label: "Ready", tone: "success" } : { state: t, label: "Blocked", tone: "warning" };
}
function K(e) {
  const t = ue(e);
  return `<span class="translation-family-chip translation-family-chip--${t.tone}" data-readiness-state="${t.state}">${t.label}</span>`;
}
async function fe(e) {
  const t = await z(e), a = new Error(t.message || "Failed to create locale.");
  return a.statusCode = e.status, a.textCode = t.textCode, a.requestId = i(e.headers.get("x-request-id")), a.traceId = O(e.headers), a.metadata = m(t.metadata), a;
}
function T(e) {
  const t = i(e);
  if (!t) return "";
  const a = new Date(t);
  return Number.isNaN(a.getTime()) ? t : a.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function v(e) {
  const t = i(e).replace(/_/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function pe(e) {
  switch (i(e)) {
    case "published":
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function ge(e) {
  switch (i(e)) {
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
    case "assigned":
      return "bg-sky-100 text-sky-700";
    case "changes_requested":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function ye(e) {
  switch (i(e)) {
    case "missing_locale":
      return "bg-rose-100 text-rose-700";
    case "missing_field":
      return "bg-amber-100 text-amber-700";
    case "pending_review":
      return "bg-sky-100 text-sky-700";
    case "outdated_source":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function be(e, t, a) {
  const s = C(e), n = i(a.sourceRecordId);
  return !s || !n || !t.contentType ? "" : `${s}/${encodeURIComponent(t.contentType)}/${encodeURIComponent(n)}?locale=${encodeURIComponent(a.locale)}`;
}
function xe(e) {
  const t = i(e);
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
    const n = s.updatedAt || s.createdAt;
    if (!n) continue;
    const r = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    a.push({
      id: `assignment-${s.id}`,
      timestamp: n,
      title: `${s.targetLocale.toUpperCase()} assignment ${v(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return a.sort((s, n) => n.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, t));
}
function _e(e) {
  return [
    {
      label: "Required locales",
      value: e.readinessSummary.requiredLocales.length,
      tone: "text-slate-900"
    },
    {
      label: "Missing locales",
      value: e.readinessSummary.missingRequiredLocaleCount,
      tone: e.readinessSummary.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-slate-900"
    },
    {
      label: "Pending review",
      value: e.readinessSummary.pendingReviewCount,
      tone: e.readinessSummary.pendingReviewCount > 0 ? "text-amber-700" : "text-slate-900"
    },
    {
      label: "Outdated locales",
      value: e.readinessSummary.outdatedLocaleCount,
      tone: e.readinessSummary.outdatedLocaleCount > 0 ? "text-violet-700" : "text-slate-900"
    }
  ].map(
    (a) => `
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${d(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${d(a.value)}</div>
        </div>
      `
  ).join("");
}
function ve(e, t) {
  const a = C(t.contentBasePath || `${C(t.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, n = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${o ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-sky-600 text-white hover:bg-sky-700"}"
        data-family-create-locale="true"
        data-locale="${_(l)}"
        ${o ? 'aria-disabled="true"' : ""}
        title="${_(o ? n : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = e.localeVariants.map((l) => {
    const o = be(a, e, l), f = o ? `<a href="${_(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-slate-400">No content route</span>', p = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-slate-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${pe(l.status)}">${d(v(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-slate-600">${d(p)}</p>
          <p class="mt-1 text-xs text-slate-500">Updated ${d(T(l.updatedAt || l.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${f}</div>
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
        <div class="flex-shrink-0">${r(l)}</div>
      </li>
    `);
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-slate-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-slate-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${c.join("") || '<li class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function Ce(e) {
  return e.activeAssignments.length ? `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-slate-900">Assignments</h2>
      <p class="mt-1 text-sm text-slate-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((t) => {
    const a = xe(t.dueDate), s = a === "none" ? "No due date" : v(a), n = a === "overdue" ? "bg-rose-100 text-rose-700" : a === "due_soon" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";
    return `
              <li class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">${d(t.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ge(t.status)}">${d(v(t.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${n}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-slate-600">
                  ${d(t.assigneeId || "Unassigned")}
                  <span class="text-slate-400">·</span>
                  Priority ${d(t.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-slate-500">Updated ${d(T(t.updatedAt || t.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-slate-900">Assignments</h2>
        <p class="mt-1 text-sm text-slate-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function we(e) {
  const t = e.blockers.length ? e.blockers.map((a) => {
    const s = [a.locale && a.locale.toUpperCase(), a.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ye(a.blockerCode)}">${d(v(a.blockerCode))}</span>
              ${s ? `<span class="text-sm text-slate-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-slate-500">No blockers recorded.</li>';
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-slate-900">Publish gate</h2>
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
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${t}</ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-slate-600" role="list">
            <li>Review required: <strong class="text-slate-900">${e.publishGate.reviewRequired ? "Yes" : "No"}</strong></li>
            <li>Override allowed: <strong class="text-slate-900">${e.publishGate.overrideAllowed ? "Yes" : "No"}</strong></li>
            <li>Available locales: <strong class="text-slate-900">${d(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}
function Le(e) {
  const t = he(e);
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-slate-900">Activity preview</h2>
      <p class="mt-1 text-sm text-slate-500">Recent server timestamps across variants and active assignments.</p>
      ${t.length ? `<ol class="mt-5 space-y-3" role="list">
              ${t.map(
    (a) => `
                    <li class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-slate-900">${d(a.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${a.tone === "success" ? "bg-emerald-100 text-emerald-700" : a.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}">${d(T(a.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-slate-600">${d(a.detail)}</p>
                    </li>
                  `
  ).join("")}
            </ol>` : '<p class="mt-4 text-sm text-slate-500">No activity timestamps are available for this family yet.</p>'}
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
    (a) => `<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">${a}</span>`
  ).join("")}
    </div>
  ` : "";
}
function ke(e) {
  return `
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-slate-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function N(e, t) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">${d(e)}</h2>
        <p class="mt-2 text-sm text-slate-500">${d(t)}</p>
      </div>
    </div>
  `;
}
function $e(e, t) {
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
    return ke("Loading translation family...");
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
        ${$e(l, o)}
        ${I(e)}
      </div>
    `;
  }
  const a = e.detail;
  if (!a)
    return N("Family detail unavailable", "No family detail payload was returned.");
  const s = a.sourceVariant?.fields.title || a.sourceVariant?.fields.slug || `${a.contentType} family`, n = a.readinessSummary.blockerCodes.length ? a.readinessSummary.blockerCodes.map(v).join(", ") : "No blockers", r = !a.quickCreate.enabled, c = a.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium ${r ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-sky-600 text-white hover:bg-sky-700"}"
        data-family-create-locale="true"
        data-locale="${_(a.quickCreate.recommendedLocale)}"
        ${r ? 'aria-disabled="true"' : ""}
        title="${_(r ? a.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${a.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(a.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${_(a.familyId)}" data-readiness-state="${_(a.readinessState)}">
      <section class="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Translation family</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">${d(s)}</h1>
            <p class="mt-2 text-sm text-slate-600">${d(a.contentType)} · Source locale ${d(a.sourceLocale.toUpperCase())} · Family ${d(a.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${K(a.readinessState)}
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">${d(n)}</span>
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
  const a = i(e);
  if (!a)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const s = await (t.fetch ? t.fetch(a, { headers: { Accept: "application/json" } }) : J(a, { headers: { Accept: "application/json" } })), n = i(s.headers.get("x-request-id")), r = O(s.headers);
    if (!s.ok) {
      const o = await z(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: o.message,
        requestId: n,
        traceId: r,
        statusCode: s.status,
        errorCode: o.textCode
      };
    }
    const c = m(await s.json()), l = G(c);
    return l.familyId ? {
      status: "ready",
      detail: l,
      requestId: n,
      traceId: r,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: n,
      traceId: r,
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
  const a = i(e);
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
  const t = i(e);
  if (!t) return "";
  const a = new Date(t);
  if (Number.isNaN(a.getTime())) return "";
  const s = a.getFullYear(), n = String(a.getMonth() + 1).padStart(2, "0"), r = String(a.getDate()).padStart(2, "0"), c = String(a.getHours()).padStart(2, "0"), l = String(a.getMinutes()).padStart(2, "0");
  return `${s}-${n}-${r}T${c}:${l}`;
}
function Re(e) {
  const t = i(e);
  if (!t) return "";
  const a = new Date(t);
  return Number.isNaN(a.getTime()) ? "" : a.toISOString();
}
function Te(e, t, a, s) {
  const n = i(e.locale).toLowerCase(), r = i(a).toLowerCase(), c = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === n && c ? c : n && t[n] ? t[n] : c;
}
function Q(e) {
  const t = typeof document < "u" ? document : null;
  if (!t) return;
  const a = e.quickCreate;
  if (!a.enabled || a.missingLocales.length === 0) {
    w("warning", a.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = i(e.initialLocale || a.recommendedLocale || a.missingLocales[0]).toLowerCase(), n = a.missingLocales.includes(s) ? s : a.missingLocales[0], r = t.createElement("div");
  r.className = "fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4", r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="w-full max-w-xl rounded-3xl bg-white shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-slate-950">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-slate-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-slate-900">Locale</span>
            <select name="locale" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900">
              ${a.missingLocales.map((g) => `
                <option value="${_(g)}" ${g === n ? "selected" : ""}>
                  ${d(g.toUpperCase())}${g === a.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p><strong>Required for publish:</strong> ${d(a.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${d(a.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${d(a.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-slate-300 text-sky-600" ${a.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-slate-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-2xl border border-slate-200 p-4">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-slate-900">Assignee</span>
              <input type="text" name="assignee_id" value="${_(a.defaultAssignment.assigneeId)}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-slate-900">Priority</span>
              <select name="priority" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900">
                ${["low", "normal", "high", "urgent"].map((g) => `
                  <option value="${g}" ${g === (a.defaultAssignment.priority || "normal") ? "selected" : ""}>${v(g)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-slate-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${_(Ie(a.defaultAssignment.dueDate))}" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, t.body.appendChild(r);
  const c = r.querySelector("form"), l = r.querySelector('select[name="locale"]'), o = r.querySelector('input[name="auto_create_assignment"]'), f = r.querySelector('input[name="assignee_id"]'), p = r.querySelector('select[name="priority"]'), x = r.querySelector('input[name="due_date"]'), L = r.querySelector('[data-assignment-fields="true"]'), h = r.querySelector('[data-create-locale-feedback="true"]'), k = r.querySelector('button[type="submit"]'), S = () => {
    r.remove();
  }, P = () => {
    !L || !o || (L.hidden = !o.checked);
  };
  P(), o?.addEventListener("change", P), r.querySelectorAll('[data-close-modal="true"]').forEach((g) => {
    g.addEventListener("click", S);
  }), r.addEventListener("click", (g) => {
    g.target === r && S();
  }), c?.addEventListener("submit", async (g) => {
    if (g.preventDefault(), !l || !k) return;
    h && (h.hidden = !0, h.textContent = ""), k.disabled = !0, k.classList.add("opacity-60", "cursor-not-allowed");
    const D = i(l.value).toLowerCase();
    try {
      const A = await e.onSubmit({
        locale: D,
        autoCreateAssignment: o?.checked,
        assigneeId: f?.value,
        priority: p?.value,
        dueDate: Re(x?.value || "")
      });
      S(), await e.onSuccess?.(A);
    } catch (A) {
      const F = Ae(A, D);
      h && (h.hidden = !1, h.textContent = F), w("error", F);
    } finally {
      k.disabled = !1, k.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Pe(e) {
  return {
    familyId: i(e.dataset.translationGroupId),
    requestedLocale: i(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: i(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: i(e.dataset.apiBasePath || "/admin/api"),
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
    t.querySelectorAll('[data-action="create-locale"]').forEach((n) => {
      n.addEventListener("click", (r) => {
        r.preventDefault();
        const c = i(n.dataset.locale).toLowerCase() || a.quickCreate.recommendedLocale;
        Q({
          familyId: a.familyId,
          quickCreate: a.quickCreate,
          initialLocale: c,
          heading: `Create ${c.toUpperCase() || a.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(a.familyId, l),
          onSuccess: async (l) => {
            w("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), f = Te(l, a.localeURLs, a.requestedLocale, o);
            if (f && typeof window < "u") {
              window.location.href = f;
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
  const a = e.dataset || {}, s = i(t.endpoint || a.endpoint), n = {
    basePath: i(t.basePath || a.basePath || "/admin"),
    contentBasePath: i(t.contentBasePath || a.contentBasePath)
  };
  j(e, { status: "loading" }, n);
  const r = await Se(s, { fetch: t.fetch });
  if (j(e, r, n), typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const l = `${C(n.basePath || "/admin")}/api`, o = Y({ basePath: l, fetch: t.fetch });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((f) => {
        f.dataset.translationCreateBound !== "true" && (f.dataset.translationCreateBound = "true", f.addEventListener("click", (p) => {
          p.preventDefault();
          const x = r.detail;
          if (!x) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (f.getAttribute("aria-disabled") === "true") {
            w("warning", x.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const L = i(f.dataset.locale).toLowerCase() || x.quickCreate.recommendedLocale || "";
          Q({
            familyId: x.familyId,
            quickCreate: x.quickCreate,
            initialLocale: L,
            heading: `Create ${L.toUpperCase()} locale`,
            onSubmit: (h) => o.createLocale(x.familyId, h),
            onSuccess: async (h) => {
              w("success", `${h.locale.toUpperCase()} locale created.`), await B(e, { ...t, ...n, endpoint: s });
            }
          });
        }));
      });
    }
    const c = e.querySelector(".ui-state-retry-btn");
    c && c.addEventListener("click", () => {
      B(e, { ...t, ...n, endpoint: s });
    });
  }
  return r;
}
function Y(e = {}) {
  const t = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t)
    throw new Error("translation-family client requires fetch");
  const a = C(e.basePath || "/admin/api");
  return {
    async list(s = {}) {
      const r = await (await t(ee(a, s), {
        headers: { Accept: "application/json" }
      })).json();
      return ce(r);
    },
    async detail(s, n = "") {
      const c = await (await t(te(a, s, n), {
        headers: { Accept: "application/json" }
      })).json();
      return G(c);
    },
    async createLocale(s, n = {}) {
      const r = oe({
        ...n,
        familyId: s,
        basePath: a
      }), c = await t(r.endpoint, {
        method: "POST",
        headers: r.headers,
        body: JSON.stringify(se(r.request))
      });
      if (!c.ok)
        throw await fe(c);
      const l = await c.json();
      return re(l);
    }
  };
}
function C(e) {
  const t = i(e);
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
  re as normalizeCreateLocaleResult,
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
