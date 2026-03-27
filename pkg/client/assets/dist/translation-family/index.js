import { escapeAttribute as h, escapeHTML as d } from "../shared/html.js";
import { asString as i, asNumberish as p, asLooseBoolean as b, asRecord as m, asStringArray as y } from "../shared/coercion.js";
import { h as te } from "../chunks/http-client-DZnuedzQ.js";
import { normalizeStringRecord as se } from "../shared/record-normalization.js";
import { extractStructuredError as G } from "../toast/error-helpers.js";
import { f as E, H as ie, h as re, L as ne, E as oe, i as le, j as ce, k as de, l as me, m as ue, B as H, d as S, M as ye, n as ge, o as fe, t as pe, p as R } from "../chunks/style-constants-i2xRoO1L.js";
import { sentenceCaseToken as v, formatTranslationTimestampUTC as D } from "../translation-shared/formatters.js";
function Y(e) {
  return i(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function k(e) {
  return i(e) === "ready" ? "ready" : "blocked";
}
function K(e) {
  const a = i(e);
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
function be(e = {}) {
  const a = i(e.channel);
  return {
    contentType: i(e.contentType),
    readinessState: i(e.readinessState),
    blockerCode: i(e.blockerCode),
    missingLocale: i(e.missingLocale),
    page: Math.max(1, p(e.page, 1)),
    perPage: Math.max(1, p(e.perPage, 50)),
    channel: a
  };
}
function _e(e = {}) {
  const a = be(e), t = new URLSearchParams();
  return a.contentType && t.set("content_type", a.contentType), a.readinessState && t.set("readiness_state", a.readinessState), a.blockerCode && t.set("blocker_code", a.blockerCode), a.missingLocale && t.set("missing_locale", a.missingLocale), a.channel && t.set("channel", a.channel), t.set("page", String(a.page)), t.set("per_page", String(a.perPage)), t;
}
function he(e, a = {}) {
  const t = `${x(e)}/translations/families`, s = _e(a).toString();
  return s ? `${t}?${s}` : t;
}
function ve(e, a, t = "") {
  const s = encodeURIComponent(i(a)), r = `${x(e)}/translations/families/${s}`, n = new URLSearchParams();
  i(t) && n.set("channel", i(t));
  const l = n.toString();
  return l ? `${r}?${l}` : r;
}
function Q(e = {}) {
  const a = i(e.channel);
  return {
    locale: i(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: i(e.assigneeId),
    priority: i(e.priority).toLowerCase(),
    dueDate: i(e.dueDate),
    channel: a,
    idempotencyKey: i(e.idempotencyKey)
  };
}
function xe(e, a, t = "") {
  const s = encodeURIComponent(i(a)), r = `${x(e)}/translations/families/${s}/variants`, n = new URLSearchParams();
  i(t) && n.set("channel", i(t));
  const l = n.toString();
  return l ? `${r}?${l}` : r;
}
function Ce(e = {}) {
  const a = Q(e), t = {
    locale: a.locale
  };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Le(e) {
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
function we(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: i(e.work_scope),
    priority: i(e.priority) || "normal",
    assigneeId: i(e.assignee_id),
    dueDate: i(e.due_date)
  };
}
function F(e, a = {}) {
  const t = m(e.default_assignment), s = y(e.missing_locales ?? a.missingLocales), r = y(e.required_for_publish ?? a.requiredForPublish), n = i(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: n,
    requiredForPublish: r,
    defaultAssignment: we({
      auto_create_assignment: t.auto_create_assignment ?? a.defaultAssignment?.autoCreateAssignment,
      work_scope: t.work_scope ?? a.defaultAssignment?.workScope,
      priority: t.priority ?? a.defaultAssignment?.priority,
      assignee_id: t.assignee_id ?? a.defaultAssignment?.assigneeId,
      due_date: t.due_date ?? a.defaultAssignment?.dueDate
    }),
    disabledReasonCode: i(e.disabled_reason_code || a.disabledReasonCode),
    disabledReason: i(e.disabled_reason || a.disabledReason)
  };
}
function $e(e) {
  const a = m(e.data), t = m(e.meta), s = m(t.family), r = m(t.refresh), n = m(a.navigation), l = F(m(s.quick_create), {
    missingLocales: y(s.missing_locales)
  });
  return {
    variantId: i(a.variant_id),
    familyId: i(a.family_id) || i(s.family_id),
    locale: i(a.locale).toLowerCase(),
    status: i(a.status),
    recordId: i(a.record_id),
    contentType: i(a.content_type),
    assignment: a.assignment ? Le(m(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: i(s.family_id),
      readinessState: k(s.readiness_state),
      missingRequiredLocaleCount: p(s.missing_required_locale_count),
      pendingReviewCount: p(s.pending_review_count),
      outdatedLocaleCount: p(s.outdated_locale_count),
      blockerCodes: y(s.blocker_codes),
      missingLocales: y(s.missing_locales),
      availableLocales: y(s.available_locales),
      quickCreate: l
    },
    refresh: {
      familyDetail: b(r.family_detail),
      familyList: b(r.family_list),
      contentSummary: b(r.content_summary)
    },
    navigation: {
      contentDetailURL: i(n.content_detail_url),
      contentEditURL: i(n.content_edit_url)
    }
  };
}
function Se(e) {
  const a = i(e.familyId), t = Q(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: xe(i(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function ke(e) {
  return {
    familyId: i(e.family_id),
    tenantId: i(e.tenant_id),
    orgId: i(e.org_id),
    contentType: i(e.content_type),
    sourceLocale: i(e.source_locale),
    sourceVariantId: i(e.source_variant_id),
    sourceRecordId: i(e.source_record_id),
    sourceTitle: i(e.source_title),
    readinessState: k(e.readiness_state),
    missingRequiredLocaleCount: p(e.missing_required_locale_count),
    pendingReviewCount: p(e.pending_review_count),
    outdatedLocaleCount: p(e.outdated_locale_count),
    blockerCodes: y(e.blocker_codes).map(K),
    missingLocales: y(e.missing_locales),
    availableLocales: y(e.available_locales)
  };
}
function qe(e) {
  const a = m(e.data), t = m(e.meta), s = Object.keys(a).length ? a : e, r = Object.keys(t).length ? t : e, n = s.items ?? s.families;
  return {
    items: (Array.isArray(n) ? n : []).map((c) => ke(m(c))),
    total: p(r.total),
    page: p(r.page, 1),
    perPage: p(r.per_page, 50),
    channel: i(r.channel)
  };
}
function B(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    locale: i(e.locale),
    status: i(e.status),
    isSource: b(e.is_source),
    sourceRecordId: i(e.source_record_id),
    sourceHashAtLastSync: i(e.source_hash_at_last_sync),
    fields: se(e.fields, { omitBlankKeys: !0, omitEmptyValues: !0 }),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    publishedAt: i(e.published_at)
  };
}
function Ae(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    blockerCode: K(e.blocker_code),
    locale: i(e.locale),
    fieldPath: i(e.field_path),
    details: m(e.details)
  };
}
function Ie(e) {
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
function X(e) {
  const a = m(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? B(m(t.source_variant)) : null, r = Array.isArray(t.blockers) ? t.blockers.map((g) => Ae(m(g))) : [], n = Array.isArray(t.locale_variants) ? t.locale_variants.map((g) => B(m(g))) : [], l = Array.isArray(t.active_assignments) ? t.active_assignments.map((g) => Ie(m(g))) : [], c = m(t.publish_gate), o = m(t.readiness_summary), u = F(m(t.quick_create), {
    missingLocales: y(o.missing_locales),
    recommendedLocale: i(o.recommended_locale),
    requiredForPublish: y(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: i(t.family_id),
    contentType: i(t.content_type),
    sourceLocale: i(t.source_locale),
    readinessState: k(t.readiness_state),
    sourceVariant: s,
    localeVariants: n,
    blockers: r,
    activeAssignments: l,
    publishGate: {
      allowed: b(c.allowed),
      overrideAllowed: b(c.override_allowed),
      blockedBy: y(c.blocked_by),
      reviewRequired: b(c.review_required)
    },
    readinessSummary: {
      state: k(o.state),
      requiredLocales: y(o.required_locales),
      missingLocales: y(o.missing_locales),
      availableLocales: y(o.available_locales),
      blockerCodes: y(o.blocker_codes),
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
      const r = i(s).toLowerCase();
      r && a.add(r);
    }
  return Array.from(a).sort();
}
function J(e, a) {
  const t = i(a).toLowerCase();
  return e.map((s) => i(s).toLowerCase()).filter((s) => s && s !== t);
}
function ua(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId)
    return e;
  const t = i(a.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === t) ? e.localeVariants.map((o) => o.locale === t ? { ...o, id: o.id || a.variantId, status: a.status || o.status } : { ...o }) : [
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
  let r = e.activeAssignments.map((o) => ({ ...o }));
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
    }, u = r.findIndex(
      (g) => g.id === o.id || g.targetLocale === o.targetLocale
    );
    u >= 0 ? r[u] = o : r = [...r, o].sort(
      (g, _) => g.targetLocale.localeCompare(_.targetLocale)
    );
  }
  const n = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), l = I(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = J(
    I(e.readinessSummary.missingLocales, a.family.missingLocales),
    t
  );
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: n,
    activeAssignments: r,
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
function ya(e, a) {
  const t = { ...e }, s = { ...m(t.translation_readiness) }, r = i(a.locale).toLowerCase(), n = i(t.requested_locale).toLowerCase(), l = i(
    t.translation_family_id || t.family_id || s.family_id || s.family_id
  );
  if (l && l !== a.familyId)
    return t;
  const c = I(
    y(t.available_locales),
    y(s.available_locales),
    a.family.availableLocales,
    [r]
  ), o = J(
    I(
      y(t.missing_required_locales),
      y(s.missing_required_locales),
      a.family.missingLocales
    ),
    r
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
  }, t.translation_readiness = s, n && n === r && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = r), t;
}
function Re(e) {
  const a = k(e);
  return a === "ready" ? { state: a, label: "Ready", tone: "success" } : { state: a, label: "Blocked", tone: "warning" };
}
function W(e) {
  const a = Re(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Te(e) {
  const a = await G(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = i(e.headers.get("x-request-id")), t.traceId = Y(e.headers), t.metadata = m(a.metadata), t;
}
function Pe(e) {
  switch (i(e)) {
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
function Ee(e) {
  return R(Pe(e));
}
function De(e) {
  switch (i(e)) {
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
function Fe(e) {
  return R(De(e));
}
function Ue(e) {
  switch (i(e)) {
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
  return R(Ue(e));
}
function je(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function Be(e) {
  return R(je(e));
}
function Oe(e, a, t) {
  const s = x(e), r = i(t.sourceRecordId);
  return !s || !r || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(r)}?locale=${encodeURIComponent(t.locale)}`;
}
function Me(e) {
  const a = i(e);
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
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${v(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && t.push({
      id: `variant-published-${s.id}`,
      timestamp: s.publishedAt,
      title: `${s.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const s of e.activeAssignments) {
    const r = s.updatedAt || s.createdAt;
    if (!r) continue;
    const n = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: r,
      title: `${s.targetLocale.toUpperCase()} assignment ${v(s.status)}`,
      detail: `${n} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, r) => r.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function Ve(e) {
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
        <div class="rounded-xl border border-gray-200 bg-white p-6">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${d(t.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${t.tone}">${d(t.value)}</div>
        </div>
      `
  ).join("");
}
function Ge(e, a) {
  const t = x(a.contentBasePath || `${x(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, r = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", n = (c) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${E}"
        data-family-create-locale="true"
        data-locale="${h(c)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${h(o ? r : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, l = e.localeVariants.map((c) => {
    const o = Oe(t, e, c), u = o ? `<a href="${h(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', g = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ee(c.status)}">${d(v(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(g)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(D(c.updatedAt || c.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${u}</div>
      </li>
    `;
  });
  for (const c of s)
    l.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
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
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${l.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function He(e) {
  return e.activeAssignments.length ? `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Me(a.dueDate), s = t === "none" ? "No due date" : v(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Fe(a.status)}">${d(v(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Be(t)}">${d(s)}</span>
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
      <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function Ye(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ne(t.blockerCode)}">${d(v(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
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
function Ke(e) {
  const a = ze(e);
  return `
    <section class="${S} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map(
    (t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
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
function Qe(e) {
  return `
    <div class="${ne}" aria-busy="true" aria-label="Loading">
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
      <div class="max-w-md ${oe} p-8 text-center shadow-sm">
        <h2 class="${le}">${d(e)}</h2>
        <p class="${ce} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function Xe(e, a) {
  return `
    <div class="${de} p-6" role="alert">
      <h2 class="${me}">${d(e)}</h2>
      <p class="${ue} mt-2">${d(a)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 ${H}">
        Reload family detail
      </button>
    </div>
  `;
}
function Je(e, a = {}) {
  if (e.status === "loading")
    return Qe("Loading translation family...");
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
        ${Xe(c, o)}
        ${P(e)}
      </div>
    `;
  }
  const t = e.detail;
  if (!t)
    return O("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, r = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(v).join(", ") : "No blockers", n = !t.quickCreate.enabled, l = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${E}"
        data-family-create-locale="true"
        data-locale="${h(t.quickCreate.recommendedLocale)}"
        ${n ? 'disabled aria-disabled="true"' : ""}
        title="${h(n ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${h(t.familyId)}" data-readiness-state="${h(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${ie}">Translation family</p>
            <h1 class="${re} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${W(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(r)}</span>
            ${l}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Ve(t)}
        </div>
        ${P(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Ge(t, a)}
          ${He(t)}
        </div>
        <div class="space-y-6">
          ${Ye(t)}
          ${Ke(t)}
        </div>
      </div>
    </div>
  `;
}
async function We(e, a = {}) {
  const t = i(e);
  if (!t)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : te(t, { headers: { Accept: "application/json" } })), r = i(s.headers.get("x-request-id")), n = Y(s.headers);
    if (!s.ok) {
      const o = await G(s);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: o.message,
        requestId: r,
        traceId: n,
        statusCode: s.status,
        errorCode: o.textCode
      };
    }
    const l = m(await s.json()), c = X(l);
    return c.familyId ? {
      status: "ready",
      detail: c,
      requestId: r,
      traceId: n,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: r,
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
function M(e, a, t = {}) {
  e.innerHTML = Je(a, t);
}
function w(e, a) {
  const s = globalThis.toastManager?.[e];
  typeof s == "function" && s(a);
}
function z(e, a) {
  const t = i(e);
  if (!t) return a;
  try {
    return JSON.parse(t);
  } catch {
    return a;
  }
}
function Ze(e, a) {
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
function ea(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "";
  const s = t.getFullYear(), r = String(t.getMonth() + 1).padStart(2, "0"), n = String(t.getDate()).padStart(2, "0"), l = String(t.getHours()).padStart(2, "0"), c = String(t.getMinutes()).padStart(2, "0");
  return `${s}-${r}-${n}T${l}:${c}`;
}
function aa(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function ta(e, a, t, s) {
  const r = i(e.locale).toLowerCase(), n = i(t).toLowerCase(), l = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return n && n === r && l ? l : r && a[r] ? a[r] : l;
}
function Z(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    w("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = i(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), r = t.missingLocales.includes(s) ? s : t.missingLocales[0], n = a.createElement("div");
  n.className = ye, n.setAttribute("data-translation-create-locale-modal", "true"), n.innerHTML = `
    <div class="${ge}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
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
              ${t.missingLocales.map((f) => `
                <option value="${h(f)}" ${f === r ? "selected" : ""}>
                  ${d(f.toUpperCase())}${f === t.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${d(t.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${d(t.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${d(t.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-6 py-4">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${t.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-6">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" name="assignee_id" value="${h(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${["low", "normal", "high", "urgent"].map((f) => `
                  <option value="${f}" ${f === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${v(f)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${h(ea(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${H}">Cancel</button>
          <button type="submit" class="${E}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(n);
  const l = n.querySelector('[role="dialog"]'), c = n.querySelector("form"), o = n.querySelector('select[name="locale"]'), u = n.querySelector('input[name="auto_create_assignment"]'), g = n.querySelector('input[name="assignee_id"]'), _ = n.querySelector('select[name="priority"]'), q = n.querySelector('input[name="due_date"]'), C = n.querySelector('[data-assignment-fields="true"]'), L = n.querySelector('[data-create-locale-feedback="true"]'), $ = n.querySelector('button[type="submit"]'), A = () => {
    ae(), n.remove();
  }, U = () => {
    !C || !u || (C.hidden = !u.checked);
  }, ae = l ? pe(l, A) : () => {
  };
  U(), u?.addEventListener("change", U), n.querySelectorAll('[data-close-modal="true"]').forEach((f) => {
    f.addEventListener("click", A);
  }), n.addEventListener("click", (f) => {
    f.target === n && A();
  }), c?.addEventListener("submit", async (f) => {
    if (f.preventDefault(), !o || !$) return;
    L && (L.hidden = !0, L.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const N = i(o.value).toLowerCase();
    try {
      const T = await e.onSubmit({
        locale: N,
        autoCreateAssignment: u?.checked,
        assigneeId: g?.value,
        priority: _?.value,
        dueDate: aa(q?.value || "")
      });
      A(), await e.onSuccess?.(T);
    } catch (T) {
      const j = Ze(T, N);
      L && (L.hidden = !1, L.textContent = j), w("error", j);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function sa(e) {
  return {
    familyId: i(e.dataset.familyId),
    requestedLocale: i(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: i(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: i(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: F(
      z(e.dataset.quickCreate || "", {}),
      {}
    ),
    localeURLs: z(e.dataset.localeUrls || "", {})
  };
}
function ga(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = sa(a), s = ee({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((r) => {
      r.addEventListener("click", (n) => {
        n.preventDefault();
        const l = i(r.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        Z({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: l,
          heading: `Create ${l.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            w("success", `${c.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), u = ta(c, t.localeURLs, t.requestedLocale, o);
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
  const t = e.dataset || {}, s = i(a.endpoint || t.endpoint), r = {
    basePath: i(a.basePath || t.basePath || "/admin"),
    contentBasePath: i(a.contentBasePath || t.contentBasePath)
  };
  M(e, { status: "loading" }, r);
  const n = await We(s, { fetch: a.fetch });
  if (M(e, n, r), typeof e.querySelector == "function") {
    if (n.status === "ready" && n.detail) {
      const c = `${x(r.basePath || "/admin")}/api`, o = ee({ basePath: c, fetch: a.fetch });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((u) => {
        u.dataset.translationCreateBound !== "true" && (u.dataset.translationCreateBound = "true", u.addEventListener("click", (g) => {
          g.preventDefault();
          const _ = n.detail;
          if (!_) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (u.getAttribute("aria-disabled") === "true") {
            w("warning", _.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const q = i(u.dataset.locale).toLowerCase() || _.quickCreate.recommendedLocale || "";
          Z({
            familyId: _.familyId,
            quickCreate: _.quickCreate,
            initialLocale: q,
            heading: `Create ${q.toUpperCase()} locale`,
            onSubmit: (C) => o.createLocale(_.familyId, C),
            onSuccess: async (C) => {
              w("success", `${C.locale.toUpperCase()} locale created.`), await V(e, { ...a, ...r, endpoint: s });
            }
          });
        }));
      });
    }
    const l = e.querySelector(".ui-state-retry-btn");
    l && l.addEventListener("click", () => {
      V(e, { ...a, ...r, endpoint: s });
    });
  }
  return n;
}
function ee(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a)
    throw new Error("translation-family client requires fetch");
  const t = x(e.basePath || "/admin/api");
  return {
    async list(s = {}) {
      const n = await (await a(he(t, s), {
        headers: { Accept: "application/json" }
      })).json();
      return qe(n);
    },
    async detail(s, r = "") {
      const l = await (await a(ve(t, s, r), {
        headers: { Accept: "application/json" }
      })).json();
      return X(l);
    },
    async createLocale(s, r = {}) {
      const n = Se({
        ...r,
        familyId: s,
        basePath: t
      }), l = await a(n.endpoint, {
        method: "POST",
        headers: n.headers,
        body: JSON.stringify(Ce(n.request))
      });
      if (!l.ok)
        throw await Te(l);
      const c = await l.json();
      return $e(c);
    }
  };
}
function x(e) {
  const a = i(e);
  return a ? a.endsWith("/") ? a.slice(0, -1) : a : "";
}
export {
  ua as applyCreateLocaleToFamilyDetail,
  ya as applyCreateLocaleToSummaryState,
  xe as buildCreateLocaleURL,
  ze as buildFamilyActivityPreview,
  ve as buildFamilyDetailURL,
  _e as buildFamilyListQuery,
  he as buildFamilyListURL,
  be as createFamilyFilters,
  Se as createTranslationCreateLocaleActionModel,
  Q as createTranslationCreateLocaleRequest,
  ee as createTranslationFamilyClient,
  We as fetchTranslationFamilyDetailState,
  Re as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  ga as initTranslationSummaryCards,
  $e as normalizeCreateLocaleResult,
  X as normalizeFamilyDetail,
  qe as normalizeFamilyListResponse,
  ke as normalizeFamilyListRow,
  F as normalizeQuickCreateHints,
  W as renderReadinessChip,
  M as renderTranslationFamilyDetailPage,
  Je as renderTranslationFamilyDetailState,
  Ce as serializeCreateLocaleRequest,
  ea as toDateTimeLocalInputValue
};
//# sourceMappingURL=index.js.map
