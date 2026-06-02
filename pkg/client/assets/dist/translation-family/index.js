import { escapeAttribute as p, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as Se, httpRequest as ce, readHTTPJSON as qe } from "../shared/transport/http-client.js";
import { extractStructuredError as B } from "../toast/error-helpers.js";
import { buildURL as P, getNumberSearchParam as ae, getStringSearchParam as I, readLocationSearchParams as Re, setNumberSearchParam as te, setSearchParam as L } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as _ } from "../shared/path-normalization.js";
import { parseJSONValue as se } from "../shared/json-parse.js";
import { asLooseBoolean as b, asNumberish as h, asRecord as u, asString as n, asStringArray as f } from "../shared/coercion.js";
import { G as Ie, O as Te, T as Ae, W as Pe, _ as de, at as Fe, d as T, g as me, h as Ee, l as S, m as Ue, o as ue, p as De, s as q, tt as j, v as ye, w as Ne } from "../chunks/translation-shared-CQJ98SgC.js";
import { formatTranslationTimestampUTC as H, sentenceCaseToken as $ } from "../translation-shared/formatters.js";
import { normalizeStringRecord as Be } from "../shared/record-normalization.js";
function je(e, a = {}) {
  const t = u(e), s = b(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), c = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), l = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !c ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: c,
    environment: l,
    familyId: i
  };
}
function Oe(e, a = "") {
  const t = n(a), s = Me(e);
  return {
    method: "admin.commands.dispatch",
    params: {
      data: {
        name: e.commandName,
        ids: e.familyId ? [e.familyId] : [],
        payload: {
          family_id: e.familyId,
          environment: e.environment,
          channel: e.environment
        },
        options: {
          Mode: "inline",
          IdempotencyKey: s,
          CorrelationID: t,
          Metadata: {
            correlation_id: t,
            idempotency_key: s
          }
        }
      },
      meta: { correlationId: t }
    }
  };
}
function Me(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function ze(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !b(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function Ve(e, a = {}) {
  const t = a.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t) throw new Error("translation family sync requires fetch");
  if (!e.canSync) throw new Error("translation family sync is not available for this request");
  const s = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), i = {
    method: "POST",
    credentials: "same-origin",
    headers: s,
    body: JSON.stringify(Oe(e, a.correlationId))
  };
  Se(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const y = await B(r);
    throw new Error(y.message || "Failed to sync translation families.");
  }
  const c = u(await r.json().catch(() => ({}))), l = u(c.error);
  if (Object.keys(l).length > 0) throw new Error(n(l.message) || "Failed to sync translation families.");
  const o = u(c.data), m = ze(o.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...o,
    receipt: m
  };
}
function Y(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function A(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function pe(e) {
  const a = n(e);
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
function O(e = {}) {
  const a = n(e.channel);
  return {
    contentType: n(e.contentType),
    readinessState: n(e.readinessState),
    blockerCode: n(e.blockerCode),
    missingLocale: n(e.missingLocale),
    page: Math.max(1, h(e.page, 1)),
    perPage: Math.max(1, h(e.perPage, 50)),
    channel: a
  };
}
function fe(e = {}) {
  const a = O(e), t = new URLSearchParams();
  return L(t, "content_type", a.contentType), L(t, "readiness_state", a.readinessState), L(t, "blocker_code", a.blockerCode), L(t, "missing_locale", a.missingLocale), L(t, "channel", a.channel), te(t, "page", a.page, { min: 1 }), te(t, "per_page", a.perPage, { min: 1 }), t;
}
function K(e, a = "", t = "") {
  const s = _(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function ge(e, a = {}) {
  return P(K(e), fe(a));
}
function Ge(e, a, t = "") {
  const s = new URLSearchParams();
  return L(s, "channel", t), P(K(e, a), s);
}
function be(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: b(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function He(e, a, t = "") {
  const s = new URLSearchParams();
  return L(s, "channel", t), P(K(e, a, "/variants"), s);
}
function Ye(e = {}) {
  const a = be(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Ke(e) {
  return {
    assignmentId: n(e.assignment_id),
    status: n(e.status),
    targetLocale: n(e.target_locale),
    workScope: n(e.work_scope),
    assigneeId: n(e.assignee_id),
    priority: n(e.priority),
    dueDate: n(e.due_date)
  };
}
function Qe(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function Q(e, a = {}) {
  const t = u(e.default_assignment), s = f(e.missing_locales ?? a.missingLocales), i = f(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: Qe({
      auto_create_assignment: t.auto_create_assignment ?? a.defaultAssignment?.autoCreateAssignment,
      work_scope: t.work_scope ?? a.defaultAssignment?.workScope,
      priority: t.priority ?? a.defaultAssignment?.priority,
      assignee_id: t.assignee_id ?? a.defaultAssignment?.assigneeId,
      due_date: t.due_date ?? a.defaultAssignment?.dueDate
    }),
    disabledReasonCode: n(e.disabled_reason_code || a.disabledReasonCode),
    disabledReason: n(e.disabled_reason || a.disabledReason)
  };
}
function Je(e) {
  const a = u(e.data), t = u(e.meta), s = u(t.family), i = u(t.refresh), r = u(a.navigation), c = Q(u(s.quick_create), { missingLocales: f(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Ke(u(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: A(s.readiness_state),
      missingRequiredLocaleCount: h(s.missing_required_locale_count),
      pendingReviewCount: h(s.pending_review_count),
      outdatedLocaleCount: h(s.outdated_locale_count),
      blockerCodes: f(s.blocker_codes),
      missingLocales: f(s.missing_locales),
      availableLocales: f(s.available_locales),
      quickCreate: c
    },
    refresh: {
      familyDetail: b(i.family_detail),
      familyList: b(i.family_list),
      contentSummary: b(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function Xe(e) {
  const a = n(e.familyId), t = be(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: He(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function We(e) {
  return {
    familyId: n(e.family_id),
    tenantId: n(e.tenant_id),
    orgId: n(e.org_id),
    contentType: n(e.content_type),
    sourceLocale: n(e.source_locale),
    sourceVariantId: n(e.source_variant_id),
    sourceRecordId: n(e.source_record_id),
    sourceTitle: n(e.source_title),
    readinessState: A(e.readiness_state),
    missingRequiredLocaleCount: h(e.missing_required_locale_count),
    pendingReviewCount: h(e.pending_review_count),
    outdatedLocaleCount: h(e.outdated_locale_count),
    blockerCodes: f(e.blocker_codes).map(pe),
    missingLocales: f(e.missing_locales),
    availableLocales: f(e.available_locales)
  };
}
function he(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((c) => We(u(c))),
    total: h(i.total),
    page: h(i.page, 1),
    perPage: h(i.per_page, 50),
    channel: n(i.channel)
  };
}
function ne(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: b(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: Be(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Ze(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: pe(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: u(e.details)
  };
}
function ea(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    variantId: n(e.variant_id),
    sourceLocale: n(e.source_locale),
    targetLocale: n(e.target_locale),
    workScope: n(e.work_scope),
    status: n(e.status),
    assigneeId: n(e.assignee_id),
    reviewerId: n(e.reviewer_id),
    priority: n(e.priority),
    dueDate: n(e.due_date),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at)
  };
}
function xe(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? ne(u(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((y) => Ze(u(y))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => ne(u(y))) : [], c = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => ea(u(y))) : [], l = u(t.publish_gate), o = u(t.readiness_summary), m = Q(u(t.quick_create), {
    missingLocales: f(o.missing_locales),
    recommendedLocale: n(o.recommended_locale),
    requiredForPublish: f(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: A(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: i,
    activeAssignments: c,
    publishGate: {
      allowed: b(l.allowed),
      overrideAllowed: b(l.override_allowed),
      blockedBy: f(l.blocked_by),
      reviewRequired: b(l.review_required)
    },
    readinessSummary: {
      state: A(o.state),
      requiredLocales: f(o.required_locales),
      missingLocales: f(o.missing_locales),
      availableLocales: f(o.available_locales),
      blockerCodes: f(o.blocker_codes),
      missingRequiredLocaleCount: h(o.missing_required_locale_count),
      pendingReviewCount: h(o.pending_review_count),
      outdatedLocaleCount: h(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: m
  };
}
function N(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = n(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function ve(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function Za(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = n(a.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === t) ? e.localeVariants.map((o) => o.locale === t ? {
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
  }].sort((o, m) => o.locale.localeCompare(m.locale));
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
    }, m = i.findIndex((y) => y.id === o.id || y.targetLocale === o.targetLocale);
    m >= 0 ? i[m] = o : i = [...i, o].sort((y, g) => y.targetLocale.localeCompare(g.targetLocale));
  }
  const r = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), c = N(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), l = ve(N(e.readinessSummary.missingLocales, a.family.missingLocales), t);
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: r,
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
      availableLocales: c,
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
function et(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), c = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (c && c !== a.familyId) return t;
  const l = N(f(t.available_locales), f(s.available_locales), a.family.availableLocales, [i]), o = ve(N(f(t.missing_required_locales), f(s.missing_required_locales), a.family.missingLocales), i);
  return t.available_locales = l, t.missing_required_locales = o, t.translation_family_id = c || a.familyId, s.family_id = c || a.familyId, s.state = a.family.readinessState, s.available_locales = l, s.missing_required_locales = o, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
  }, t.translation_readiness = s, r && r === i && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = i), t;
}
function aa(e) {
  const a = A(e);
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
function J(e) {
  const a = aa(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function ta(e) {
  const a = await B(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Y(e.headers), t.metadata = u(a.metadata), t;
}
function sa(e) {
  switch (n(e)) {
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
function na(e) {
  return j(sa(e));
}
function ia(e) {
  switch (n(e)) {
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
function ra(e) {
  return j(ia(e));
}
function oa(e) {
  switch (n(e)) {
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
function _e(e) {
  return j(oa(e));
}
function la(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function ca(e) {
  return j(la(e));
}
function da(e, a, t) {
  const s = _(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function ma(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function ua(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${$(s.status)} state.`,
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
    const r = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: `${s.targetLocale.toUpperCase()} assignment ${$(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function ya(e) {
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
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${d(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${d(a.value)}</div>
        </div>
      `).join("");
}
function pa(e, a) {
  const t = _(a.contentBasePath || `${_(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${q}"
        data-family-create-locale="true"
        data-locale="${p(l)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${p(o ? i : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = e.localeVariants.map((l) => {
    const o = da(t, e, l), m = o ? `<a href="${p(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${na(l.status)}">${d($(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(H(l.updatedAt || l.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${m}</div>
      </li>
    `;
  });
  for (const l of s) c.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
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
    <section class="${T} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${c.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function fa(e) {
  return e.activeAssignments.length ? `
    <section class="${T} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = ma(a.dueDate), s = t === "none" ? "No due date" : $(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ra(a.status)}">${d($(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ca(t)}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(H(a.updatedAt || a.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="${T} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function ga(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${_e(t.blockerCode)}">${d($(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${T} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
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
function ba(e) {
  const a = ua(e);
  return `
    <section class="${T} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(H(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function D(e) {
  const a = [
    e.requestId ? `Request ${d(e.requestId)}` : "",
    e.traceId ? `Trace ${d(e.traceId)}` : "",
    e.errorCode ? `Code ${d(e.errorCode)}` : ""
  ].filter(Boolean);
  return a.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${a.map((t) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${t}</span>`).join("")}
    </div>
  ` : "";
}
function Ce(e) {
  return `
    <div class="${Te}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function G(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${De} p-8 text-center shadow-sm">
        <h2 class="${Ee}">${d(e)}</h2>
        <p class="${Ue} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function ha(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${q}"
        data-family-sync-action="true"
        data-family-sync-rpc="${p(s.rpcInvokePath)}"
        data-family-sync-command="${p(s.commandName)}"
        data-family-sync-family-id="${p(s.familyId)}"
        data-family-sync-environment="${p(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? d(t.syncMessage) : "";
  return `
    <div class="${me} p-6" role="alert">
      <h2 class="${ye}">${d(e)}</h2>
      <p class="${de} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${S}">
          Reload family detail
        </button>
        ${i}
      </div>
    </div>
  `;
}
function xa(e, a = {}) {
  if (e.status === "loading") return Ce("Loading translation family...");
  if (e.status === "empty") return `
      ${G("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${D(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${ha(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${D(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return G("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map($).join(", ") : "No blockers", r = !t.quickCreate.enabled, c = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${q}"
        data-family-create-locale="true"
        data-locale="${p(t.quickCreate.recommendedLocale)}"
        ${r ? 'disabled aria-disabled="true"' : ""}
        title="${p(r ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${p(t.familyId)}" data-readiness-state="${p(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${Ne}">Translation family</p>
            <h1 class="${Ae} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${J(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${ya(t)}
        </div>
        ${D(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${pa(t, a)}
          ${fa(t)}
        </div>
        <div class="space-y-6">
          ${ga(t)}
          ${ba(t)}
        </div>
      </div>
    </div>
  `;
}
async function ie(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : ce(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = Y(s.headers);
    if (!s.ok) {
      const l = await B(s), o = u(l.metadata?.sync_recovery), m = l.textCode === "NOT_FOUND" || b(o.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: l.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: l.textCode,
        syncRecovery: m ? je(o, { familyId: n(l.metadata?.family_id) }) : null
      };
    }
    const c = xe(u(await s.json()));
    return c.familyId ? {
      status: "ready",
      detail: c,
      requestId: i,
      traceId: r,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: i,
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
function U(e, a, t = {}) {
  e.innerHTML = xa(a, t);
}
var va = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function _a(e) {
  const a = e ?? new URLSearchParams();
  return O({
    channel: I(a, "channel") || "",
    contentType: I(a, "content_type") || "",
    readinessState: I(a, "readiness_state") || "",
    blockerCode: I(a, "blocker_code") || "",
    missingLocale: I(a, "missing_locale") || "",
    page: ae(a, "page") || 1,
    perPage: ae(a, "per_page") || 50
  });
}
function Ca(e = globalThis.location) {
  return _a(Re(e));
}
function La(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of va) t.delete(s);
  return fe(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function $a(e, a = "/admin") {
  const t = _(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${_(a || "/admin")}/api`;
}
function X(e = "/admin") {
  return `${_(e || "/admin")}/translations/families`;
}
function wa(e, a, t = "") {
  const s = _(e || X("/admin")), i = new URLSearchParams();
  return L(i, "channel", t), P(`${s}/${encodeURIComponent(n(a))}`, i);
}
function Le(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) L(s, i, r);
  return P(t, s);
}
function ka(e, a, t = {}) {
  return Le(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function Sa(e, a, t = {}) {
  return Le(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function qa(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function v(e, a, t) {
  return `<option value="${p(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function Ra(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-family-list-filters="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${p(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${v("", "Any", e.readinessState)}
            ${v("blocked", "Blocked", e.readinessState)}
            ${v("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${v("", "Any", e.blockerCode)}
            ${v("missing_locale", "Missing locale", e.blockerCode)}
            ${v("missing_field", "Missing field", e.blockerCode)}
            ${v("pending_review", "Pending review", e.blockerCode)}
            ${v("outdated_source", "Outdated source", e.blockerCode)}
            ${v("policy_denied", "Policy denied", e.blockerCode)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Missing locale</span>
          <input name="missing_locale" value="${p(e.missingLocale)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="fr">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Content type</span>
          <input name="content_type" value="${p(e.contentType)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="pages">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Per page</span>
          <select name="per_page" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${[
    "10",
    "25",
    "50",
    "100"
  ].map((t) => v(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${q} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${p(e.page)}">
    </form>
  `;
}
function re(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function Ia(e) {
  return e.blockerCodes.length ? e.blockerCodes.map((a) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${_e(a)}">${d($(a))}</span>`).join(" ") : '<span class="text-gray-400">No blockers</span>';
}
function z(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function Ta(e, a, t) {
  const s = t.familyBasePath || X(t.basePath || "/admin");
  return e.map((i) => {
    const r = wa(s, i.familyId, a.channel), c = t.matrixPath ? ka(t.matrixPath, i, a) : "", l = t.queuePath ? Sa(t.queuePath, i, a) : "", o = qa(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${p(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${p(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(o)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(i.contentType || "unknown")} · Source ${d(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${J(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${Ia(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${z(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${z(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${z(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${re(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${re(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${p(r)}" class="${q} text-center" data-family-primary-action="true">Open family</a>
            ${c ? `<a href="${p(c)}" class="${S} text-center">Matrix</a>` : ""}
            ${l ? `<a href="${p(l)}" class="${ue} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function Aa(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, i = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, c = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${d(s)}-${d(i)} of ${d(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${S}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${d(e.page)}</span>
          <button type="button" class="${S}" data-family-list-page="next" ${c ? "" : "disabled"}>Next</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Translation families with readiness, blockers, locale coverage, and row actions.</caption>
          <thead class="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th scope="col" class="px-4 py-3">Family</th>
              <th scope="col" class="px-4 py-3">Readiness</th>
              <th scope="col" class="px-4 py-3">Blockers</th>
              <th scope="col" class="px-4 py-3">Pressure</th>
              <th scope="col" class="px-4 py-3">Locales</th>
              <th scope="col" class="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            ${Ta(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Pa(e) {
  return `
    <div class="${me} mt-6 p-6" role="alert">
      <h2 class="${ye}">Families failed to load</h2>
      <p class="${de} mt-2">${d(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${d(e.requestURL)}</p>` : ""}
      ${D({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${S}">Retry</button>
    </div>
  `;
}
function Fa(e, a = {}) {
  const t = e.filters, s = Ra(t);
  if (e.status === "loading") return `${s}${Ce("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Pa(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${G("No translation families found", "No families match the current filters.")}` : `${s}${Aa(i, t, a)}`;
}
function oe(e, a, t = {}) {
  e.innerHTML = Fa(a, t);
}
async function Ea(e, a, t = {}) {
  const s = ge($a(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : ce(s, { headers: { Accept: "application/json" } })), c = n(r.headers.get("x-request-id")), l = Y(r.headers);
    if (!r.ok) {
      const m = await B(r);
      return {
        status: "error",
        filters: a,
        message: m.message,
        requestURL: s,
        requestId: c,
        traceId: l,
        statusCode: r.status,
        errorCode: m.textCode
      };
    }
    const o = he(u(await r.json()));
    return {
      status: o.items.length ? "ready" : "empty",
      filters: a,
      response: o,
      requestURL: s,
      requestId: c,
      traceId: l,
      statusCode: r.status
    };
  } catch (r) {
    return {
      status: "error",
      filters: a,
      message: r instanceof Error ? r.message : "Failed to load translation families.",
      requestURL: s
    };
  }
}
function le(e, a) {
  const t = new FormData(e), s = (r, c) => t.has(r) ? n(t.get(r)) : c, i = (r, c) => t.has(r) ? h(t.get(r), c) : c;
  return O({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: i("page", a.page),
    perPage: i("per_page", a.perPage)
  });
}
function Ua(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = La(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function at(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  s.familyBasePath || (s.familyBasePath = X(s.basePath));
  let i = Ca(), r = null;
  const c = async (l, o = !1) => {
    i = O(l), o && Ua(i), oe(e, {
      status: "loading",
      filters: i
    }, s);
    const m = await Ea(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = m, oe(e, m, s), Da(e, m, c), m;
  };
  return r = await c(i, !1), r;
}
function Da(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (i) => {
    i.preventDefault(), t({
      ...le(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((i) => {
    i.addEventListener("change", () => {
      t({
        ...le(s, a.filters),
        page: 1
      }, !0);
    });
  })), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
    t(a.filters, !1);
  }), e.querySelectorAll("[data-family-list-page]").forEach((i) => {
    i.addEventListener("click", () => {
      if (i.disabled) return;
      const r = i.dataset.familyListPage === "next" ? 1 : -1;
      t({
        ...a.filters,
        page: Math.max(1, a.filters.page + r)
      }, !0);
    });
  });
}
function C(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function Na(e, a) {
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
function Ba(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function ja(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Oa(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), c = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && c ? c : i && a[i] ? a[i] : c;
}
function $e(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    C("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = Ie, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${Pe}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
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
              ${t.missingLocales.map((x) => `
                <option value="${p(x)}" ${x === i ? "selected" : ""}>
                  ${d(x.toUpperCase())}${x === t.recommendedLocale ? " (recommended)" : ""}
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
              <input type="text" name="assignee_id" value="${p(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${[
    "low",
    "normal",
    "high",
    "urgent"
  ].map((x) => `
                  <option value="${x}" ${x === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${$(x)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${p(Ba(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${S}">Cancel</button>
          <button type="submit" class="${q}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r);
  const c = r.querySelector('[role="dialog"]'), l = r.querySelector("form"), o = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), y = r.querySelector('input[name="assignee_id"]'), g = r.querySelector('select[name="priority"]'), F = r.querySelector('input[name="due_date"]'), w = r.querySelector('[data-assignment-fields="true"]'), k = r.querySelector('[data-create-locale-feedback="true"]'), R = r.querySelector('button[type="submit"]'), E = () => {
    ke(), r.remove();
  }, W = () => {
    !w || !m || (w.hidden = !m.checked);
  }, ke = c ? Fe(c, E) : () => {
  };
  W(), m?.addEventListener("change", W), r.querySelectorAll('[data-close-modal="true"]').forEach((x) => {
    x.addEventListener("click", E);
  }), r.addEventListener("click", (x) => {
    x.target === r && E();
  }), l?.addEventListener("submit", async (x) => {
    if (x.preventDefault(), !o || !R) return;
    k && (k.hidden = !0, k.textContent = ""), R.disabled = !0, R.classList.add("opacity-60", "cursor-not-allowed");
    const Z = n(o.value).toLowerCase();
    try {
      const M = await e.onSubmit({
        locale: Z,
        autoCreateAssignment: m?.checked,
        assigneeId: y?.value,
        priority: g?.value,
        dueDate: ja(F?.value || "")
      });
      E(), await e.onSuccess?.(M);
    } catch (M) {
      const ee = Na(M, Z);
      k && (k.hidden = !1, k.textContent = ee), C("error", ee);
    } finally {
      R.disabled = !1, R.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Ma(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: Q(se(e.dataset.quickCreate, {}), {}),
    localeURLs: se(e.dataset.localeUrls, {})
  };
}
function tt(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Ma(a), s = we({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const c = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        $e({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: c,
          heading: `Create ${c.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(t.familyId, l),
          onSuccess: async (l) => {
            C("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = Oa(l, t.localeURLs, t.requestedLocale, o);
            if (m && typeof window < "u") {
              window.location.href = m;
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
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  U(e, { status: "loading" }, i);
  const r = await ie(s, { fetch: a.fetch });
  if (U(e, r, i), typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const o = we({
        basePath: `${_(i.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((m) => {
        m.dataset.translationCreateBound !== "true" && (m.dataset.translationCreateBound = "true", m.addEventListener("click", (y) => {
          y.preventDefault();
          const g = r.detail;
          if (!g) {
            C("error", "Translation family detail is unavailable.");
            return;
          }
          if (m.getAttribute("aria-disabled") === "true") {
            C("warning", g.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const F = n(m.dataset.locale).toLowerCase() || g.quickCreate.recommendedLocale || "";
          $e({
            familyId: g.familyId,
            quickCreate: g.quickCreate,
            initialLocale: F,
            heading: `Create ${F.toUpperCase()} locale`,
            onSubmit: (w) => o.createLocale(g.familyId, w),
            onSuccess: async (w) => {
              C("success", `${w.locale.toUpperCase()} locale created.`), await V(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
    }
    const c = () => {
      const o = e.querySelector(".ui-state-retry-btn");
      o && o.addEventListener("click", () => {
        V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      });
    };
    c();
    const l = e.querySelector('[data-family-sync-action="true"]');
    l && r.syncRecovery?.canSync && l.addEventListener("click", async (o) => {
      o.preventDefault(), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const m = r.syncRecovery;
        if (!m) return;
        await Ve(m, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const y = await ie(s, { fetch: a.fetch });
        if (y.status === "error" && (y.errorCode === "NOT_FOUND" || y.statusCode === 404)) {
          U(e, {
            ...y,
            syncRecovery: m,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), c();
          return;
        }
        if (y.status !== "ready") {
          const g = y.message || "Sync completed, but family detail reload failed.";
          U(e, {
            ...y,
            syncRecovery: m,
            syncStatus: "failed",
            syncMessage: g
          }, i), c(), C("error", g);
          return;
        }
        C("success", "Translation families synced."), await V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      } catch (m) {
        const y = m instanceof Error ? m.message : "Failed to sync translation families.", g = e.querySelector('[data-family-sync-feedback="true"]');
        g && (g.hidden = !1, g.textContent = y), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed"), C("error", y);
      }
    });
  }
  return r;
}
function we(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = _(e.basePath || "/admin/api");
  async function s(i) {
    return qe(i);
  }
  return {
    async list(i = {}) {
      return he(await s(await a(ge(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return xe(await s(await a(Ge(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const c = Xe({
        ...r,
        familyId: i,
        basePath: t
      }), l = await a(c.endpoint, {
        method: "POST",
        headers: c.headers,
        body: JSON.stringify(Ye(c.request))
      });
      if (!l.ok) throw await ta(l);
      return Je(await s(l));
    }
  };
}
export {
  Za as applyCreateLocaleToFamilyDetail,
  et as applyCreateLocaleToSummaryState,
  He as buildCreateLocaleURL,
  ua as buildFamilyActivityPreview,
  wa as buildFamilyDetailUIURL,
  Ge as buildFamilyDetailURL,
  La as buildFamilyListBrowserSearch,
  fe as buildFamilyListQuery,
  ge as buildFamilyListURL,
  ka as buildFamilyMatrixURL,
  Sa as buildFamilyQueueURL,
  Oe as buildTranslationFamilySyncRPCRequest,
  O as createFamilyFilters,
  Xe as createTranslationCreateLocaleActionModel,
  be as createTranslationCreateLocaleRequest,
  we as createTranslationFamilyClient,
  Ve as dispatchTranslationFamilySync,
  ie as fetchTranslationFamilyDetailState,
  Ea as fetchTranslationFamilyListState,
  aa as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  at as initTranslationFamilyListPage,
  tt as initTranslationSummaryCards,
  Je as normalizeCreateLocaleResult,
  xe as normalizeFamilyDetail,
  he as normalizeFamilyListResponse,
  We as normalizeFamilyListRow,
  Q as normalizeQuickCreateHints,
  je as normalizeTranslationFamilySyncRecoveryCapability,
  _a as parseFamilyListFiltersFromSearchParams,
  Ca as readFamilyListFiltersFromLocation,
  J as renderReadinessChip,
  U as renderTranslationFamilyDetailPage,
  xa as renderTranslationFamilyDetailState,
  oe as renderTranslationFamilyListPage,
  Fa as renderTranslationFamilyListState,
  Ye as serializeCreateLocaleRequest,
  Ba as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map