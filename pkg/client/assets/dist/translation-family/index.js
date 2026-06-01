import { escapeAttribute as h, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as oe, httpRequest as le, readHTTPJSON as ce } from "../shared/transport/http-client.js";
import { extractStructuredError as U } from "../toast/error-helpers.js";
import { buildURL as O, setNumberSearchParam as H, setSearchParam as C } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as $ } from "../shared/path-normalization.js";
import { parseJSONValue as K } from "../shared/json-parse.js";
import { asLooseBoolean as g, asNumberish as _, asRecord as y, asString as n, asStringArray as f } from "../shared/coercion.js";
import { G as de, O as me, T as ue, W as ye, _ as fe, at as pe, d as k, g as ge, h as be, l as X, m as he, o as _e, p as ve, s as P, tt as E, v as xe, w as Ce } from "../chunks/translation-shared-CQJ98SgC.js";
import { formatTranslationTimestampUTC as j, sentenceCaseToken as x } from "../translation-shared/formatters.js";
import { normalizeStringRecord as we } from "../shared/record-normalization.js";
function Le(e, a = {}) {
  const t = y(e), s = g(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), c = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), l = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !c ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: c,
    environment: l,
    familyId: i
  };
}
function $e(e, a = "") {
  const t = n(a), s = Se(e);
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
function Se(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function ke(e, a) {
  const t = y(e);
  return Object.keys(t).length === 0 || !g(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function qe(e, a = {}) {
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
    body: JSON.stringify($e(e, a.correlationId))
  };
  oe(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const u = await U(r);
    throw new Error(u.message || "Failed to sync translation families.");
  }
  const c = y(await r.json().catch(() => ({}))), l = y(c.error);
  if (Object.keys(l).length > 0) throw new Error(n(l.message) || "Failed to sync translation families.");
  const o = y(c.data), m = ke(o.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...o,
    receipt: m
  };
}
function W(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function q(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Z(e) {
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
function Ae(e = {}) {
  const a = n(e.channel);
  return {
    contentType: n(e.contentType),
    readinessState: n(e.readinessState),
    blockerCode: n(e.blockerCode),
    missingLocale: n(e.missingLocale),
    page: Math.max(1, _(e.page, 1)),
    perPage: Math.max(1, _(e.perPage, 50)),
    channel: a
  };
}
function Ie(e = {}) {
  const a = Ae(e), t = new URLSearchParams();
  return C(t, "content_type", a.contentType), C(t, "readiness_state", a.readinessState), C(t, "blocker_code", a.blockerCode), C(t, "missing_locale", a.missingLocale), C(t, "channel", a.channel), H(t, "page", a.page, { min: 1 }), H(t, "per_page", a.perPage, { min: 1 }), t;
}
function B(e, a = "", t = "") {
  const s = $(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function Te(e, a = {}) {
  return O(B(e), Ie(a));
}
function Re(e, a, t = "") {
  const s = new URLSearchParams();
  return C(s, "channel", t), O(B(e, a), s);
}
function ee(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: g(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function Pe(e, a, t = "") {
  const s = new URLSearchParams();
  return C(s, "channel", t), O(B(e, a, "/variants"), s);
}
function Ee(e = {}) {
  const a = ee(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Fe(e) {
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
function De(e) {
  return {
    autoCreateAssignment: g(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function M(e, a = {}) {
  const t = y(e.default_assignment), s = f(e.missing_locales ?? a.missingLocales), i = f(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? g(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: De({
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
function Ne(e) {
  const a = y(e.data), t = y(e.meta), s = y(t.family), i = y(t.refresh), r = y(a.navigation), c = M(y(s.quick_create), { missingLocales: f(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Fe(y(a.assignment)) : null,
    idempotencyHit: g(t.idempotency_hit),
    assignmentReused: g(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: q(s.readiness_state),
      missingRequiredLocaleCount: _(s.missing_required_locale_count),
      pendingReviewCount: _(s.pending_review_count),
      outdatedLocaleCount: _(s.outdated_locale_count),
      blockerCodes: f(s.blocker_codes),
      missingLocales: f(s.missing_locales),
      availableLocales: f(s.available_locales),
      quickCreate: c
    },
    refresh: {
      familyDetail: g(i.family_detail),
      familyList: g(i.family_list),
      contentSummary: g(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function Ue(e) {
  const a = n(e.familyId), t = ee(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Pe(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Oe(e) {
  return {
    familyId: n(e.family_id),
    tenantId: n(e.tenant_id),
    orgId: n(e.org_id),
    contentType: n(e.content_type),
    sourceLocale: n(e.source_locale),
    sourceVariantId: n(e.source_variant_id),
    sourceRecordId: n(e.source_record_id),
    sourceTitle: n(e.source_title),
    readinessState: q(e.readiness_state),
    missingRequiredLocaleCount: _(e.missing_required_locale_count),
    pendingReviewCount: _(e.pending_review_count),
    outdatedLocaleCount: _(e.outdated_locale_count),
    blockerCodes: f(e.blocker_codes).map(Z),
    missingLocales: f(e.missing_locales),
    availableLocales: f(e.available_locales)
  };
}
function je(e) {
  const a = y(e.data), t = y(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((c) => Oe(y(c))),
    total: _(i.total),
    page: _(i.page, 1),
    perPage: _(i.per_page, 50),
    channel: n(i.channel)
  };
}
function Y(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: g(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: we(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Be(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Z(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: y(e.details)
  };
}
function Me(e) {
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
function ae(e) {
  const a = y(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? Y(y(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((u) => Be(y(u))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((u) => Y(y(u))) : [], c = Array.isArray(t.active_assignments) ? t.active_assignments.map((u) => Me(y(u))) : [], l = y(t.publish_gate), o = y(t.readiness_summary), m = M(y(t.quick_create), {
    missingLocales: f(o.missing_locales),
    recommendedLocale: n(o.recommended_locale),
    requiredForPublish: f(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: q(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: i,
    activeAssignments: c,
    publishGate: {
      allowed: g(l.allowed),
      overrideAllowed: g(l.override_allowed),
      blockedBy: f(l.blocked_by),
      reviewRequired: g(l.review_required)
    },
    readinessSummary: {
      state: q(o.state),
      requiredLocales: f(o.required_locales),
      missingLocales: f(o.missing_locales),
      availableLocales: f(o.available_locales),
      blockerCodes: f(o.blocker_codes),
      missingRequiredLocaleCount: _(o.missing_required_locale_count),
      pendingReviewCount: _(o.pending_review_count),
      outdatedLocaleCount: _(o.outdated_locale_count),
      publishReady: g(o.publish_ready)
    },
    quickCreate: m
  };
}
function R(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = n(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function te(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function $a(e, a) {
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
    }, m = i.findIndex((u) => u.id === o.id || u.targetLocale === o.targetLocale);
    m >= 0 ? i[m] = o : i = [...i, o].sort((u, p) => u.targetLocale.localeCompare(p.targetLocale));
  }
  const r = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), c = R(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), l = te(R(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function Sa(e, a) {
  const t = { ...e }, s = { ...y(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), c = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (c && c !== a.familyId) return t;
  const l = R(f(t.available_locales), f(s.available_locales), a.family.availableLocales, [i]), o = te(R(f(t.missing_required_locales), f(s.missing_required_locales), a.family.missingLocales), i);
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
function ze(e) {
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
function se(e) {
  const a = ze(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ve(e) {
  const a = await U(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = W(e.headers), t.metadata = y(a.metadata), t;
}
function Ge(e) {
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
function He(e) {
  return E(Ge(e));
}
function Ke(e) {
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
function Ye(e) {
  return E(Ke(e));
}
function Je(e) {
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
function Qe(e) {
  return E(Je(e));
}
function Xe(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function We(e) {
  return E(Xe(e));
}
function Ze(e, a, t) {
  const s = $(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function ea(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function aa(e, a = 5) {
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
    const i = s.updatedAt || s.createdAt;
    if (!i) continue;
    const r = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: `${s.targetLocale.toUpperCase()} assignment ${x(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function ta(e) {
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
function sa(e, a) {
  const t = $(a.contentBasePath || `${$(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${P}"
        data-family-create-locale="true"
        data-locale="${h(l)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${h(o ? i : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = e.localeVariants.map((l) => {
    const o = Ze(t, e, l), m = o ? `<a href="${h(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', u = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${He(l.status)}">${d(x(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(u)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(j(l.updatedAt || l.createdAt)) || "n/a"}</p>
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
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function na(e) {
  return e.activeAssignments.length ? `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = ea(a.dueDate), s = t === "none" ? "No due date" : x(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ye(a.status)}">${d(x(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${We(t)}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(j(a.updatedAt || a.createdAt)) || "n/a"}</p>
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
function ia(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Qe(t.blockerCode)}">${d(x(t.blockerCode))}</span>
              ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${se(e.readinessState)}
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
function ra(e) {
  const a = aa(e);
  return `
    <section class="${k} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(j(t.timestamp))}</span>
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
function oa(e) {
  return `
    <div class="${me}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function J(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${ve} p-8 text-center shadow-sm">
        <h2 class="${be}">${d(e)}</h2>
        <p class="${he} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function la(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${P}"
        data-family-sync-action="true"
        data-family-sync-rpc="${h(s.rpcInvokePath)}"
        data-family-sync-command="${h(s.commandName)}"
        data-family-sync-family-id="${h(s.familyId)}"
        data-family-sync-environment="${h(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? d(t.syncMessage) : "";
  return `
    <div class="${ge} p-6" role="alert">
      <h2 class="${xe}">${d(e)}</h2>
      <p class="${fe} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${X}">
          Reload family detail
        </button>
        ${i}
      </div>
    </div>
  `;
}
function ca(e, a = {}) {
  if (e.status === "loading") return oa("Loading translation family...");
  if (e.status === "empty") return `
      ${J("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${D(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${la(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${D(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return J("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(x).join(", ") : "No blockers", r = !t.quickCreate.enabled, c = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${P}"
        data-family-create-locale="true"
        data-locale="${h(t.quickCreate.recommendedLocale)}"
        ${r ? 'disabled aria-disabled="true"' : ""}
        title="${h(r ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${t.quickCreate.recommendedLocale.toUpperCase()} locale`)}"
      >
        Create ${d(t.quickCreate.recommendedLocale.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${h(t.familyId)}" data-readiness-state="${h(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${Ce}">Translation family</p>
            <h1 class="${ue} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${se(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${ta(t)}
        </div>
        ${D(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${sa(t, a)}
          ${na(t)}
        </div>
        <div class="space-y-6">
          ${ia(t)}
          ${ra(t)}
        </div>
      </div>
    </div>
  `;
}
async function Q(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : le(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = W(s.headers);
    if (!s.ok) {
      const l = await U(s), o = y(l.metadata?.sync_recovery), m = l.textCode === "NOT_FOUND" || g(o.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: l.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: l.textCode,
        syncRecovery: m ? Le(o, { familyId: n(l.metadata?.family_id) }) : null
      };
    }
    const c = ae(y(await s.json()));
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
function T(e, a, t = {}) {
  e.innerHTML = ca(a, t);
}
function v(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function da(e, a) {
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
function ma(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function ua(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function ya(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), c = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && c ? c : i && a[i] ? a[i] : c;
}
function ne(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    v("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = de, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${ye}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${_e}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((b) => `
                <option value="${h(b)}" ${b === i ? "selected" : ""}>
                  ${d(b.toUpperCase())}${b === t.recommendedLocale ? " (recommended)" : ""}
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
                ${[
    "low",
    "normal",
    "high",
    "urgent"
  ].map((b) => `
                  <option value="${b}" ${b === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${x(b)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${h(ma(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${X}">Cancel</button>
          <button type="submit" class="${P}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r);
  const c = r.querySelector('[role="dialog"]'), l = r.querySelector("form"), o = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), u = r.querySelector('input[name="assignee_id"]'), p = r.querySelector('select[name="priority"]'), A = r.querySelector('input[name="due_date"]'), w = r.querySelector('[data-assignment-fields="true"]'), L = r.querySelector('[data-create-locale-feedback="true"]'), S = r.querySelector('button[type="submit"]'), I = () => {
    re(), r.remove();
  }, z = () => {
    !w || !m || (w.hidden = !m.checked);
  }, re = c ? pe(c, I) : () => {
  };
  z(), m?.addEventListener("change", z), r.querySelectorAll('[data-close-modal="true"]').forEach((b) => {
    b.addEventListener("click", I);
  }), r.addEventListener("click", (b) => {
    b.target === r && I();
  }), l?.addEventListener("submit", async (b) => {
    if (b.preventDefault(), !o || !S) return;
    L && (L.hidden = !0, L.textContent = ""), S.disabled = !0, S.classList.add("opacity-60", "cursor-not-allowed");
    const V = n(o.value).toLowerCase();
    try {
      const F = await e.onSubmit({
        locale: V,
        autoCreateAssignment: m?.checked,
        assigneeId: u?.value,
        priority: p?.value,
        dueDate: ua(A?.value || "")
      });
      I(), await e.onSuccess?.(F);
    } catch (F) {
      const G = da(F, V);
      L && (L.hidden = !1, L.textContent = G), v("error", G);
    } finally {
      S.disabled = !1, S.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function fa(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: M(K(e.dataset.quickCreate, {}), {}),
    localeURLs: K(e.dataset.localeUrls, {})
  };
}
function ka(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = fa(a), s = ie({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const c = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        ne({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: c,
          heading: `Create ${c.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(t.familyId, l),
          onSuccess: async (l) => {
            v("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = ya(l, t.localeURLs, t.requestedLocale, o);
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
async function N(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  T(e, { status: "loading" }, i);
  const r = await Q(s, { fetch: a.fetch });
  if (T(e, r, i), typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const o = ie({
        basePath: `${$(i.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((m) => {
        m.dataset.translationCreateBound !== "true" && (m.dataset.translationCreateBound = "true", m.addEventListener("click", (u) => {
          u.preventDefault();
          const p = r.detail;
          if (!p) {
            v("error", "Translation family detail is unavailable.");
            return;
          }
          if (m.getAttribute("aria-disabled") === "true") {
            v("warning", p.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const A = n(m.dataset.locale).toLowerCase() || p.quickCreate.recommendedLocale || "";
          ne({
            familyId: p.familyId,
            quickCreate: p.quickCreate,
            initialLocale: A,
            heading: `Create ${A.toUpperCase()} locale`,
            onSubmit: (w) => o.createLocale(p.familyId, w),
            onSuccess: async (w) => {
              v("success", `${w.locale.toUpperCase()} locale created.`), await N(e, {
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
        N(e, {
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
        await qe(m, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const u = await Q(s, { fetch: a.fetch });
        if (u.status === "error" && (u.errorCode === "NOT_FOUND" || u.statusCode === 404)) {
          T(e, {
            ...u,
            syncRecovery: m,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), c();
          return;
        }
        if (u.status !== "ready") {
          const p = u.message || "Sync completed, but family detail reload failed.";
          T(e, {
            ...u,
            syncRecovery: m,
            syncStatus: "failed",
            syncMessage: p
          }, i), c(), v("error", p);
          return;
        }
        v("success", "Translation families synced."), await N(e, {
          ...a,
          ...i,
          endpoint: s
        });
      } catch (m) {
        const u = m instanceof Error ? m.message : "Failed to sync translation families.", p = e.querySelector('[data-family-sync-feedback="true"]');
        p && (p.hidden = !1, p.textContent = u), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed"), v("error", u);
      }
    });
  }
  return r;
}
function ie(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = $(e.basePath || "/admin/api");
  async function s(i) {
    return ce(i);
  }
  return {
    async list(i = {}) {
      return je(await s(await a(Te(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return ae(await s(await a(Re(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const c = Ue({
        ...r,
        familyId: i,
        basePath: t
      }), l = await a(c.endpoint, {
        method: "POST",
        headers: c.headers,
        body: JSON.stringify(Ee(c.request))
      });
      if (!l.ok) throw await Ve(l);
      return Ne(await s(l));
    }
  };
}
export {
  $a as applyCreateLocaleToFamilyDetail,
  Sa as applyCreateLocaleToSummaryState,
  Pe as buildCreateLocaleURL,
  aa as buildFamilyActivityPreview,
  Re as buildFamilyDetailURL,
  Ie as buildFamilyListQuery,
  Te as buildFamilyListURL,
  $e as buildTranslationFamilySyncRPCRequest,
  Ae as createFamilyFilters,
  Ue as createTranslationCreateLocaleActionModel,
  ee as createTranslationCreateLocaleRequest,
  ie as createTranslationFamilyClient,
  qe as dispatchTranslationFamilySync,
  Q as fetchTranslationFamilyDetailState,
  ze as getReadinessChip,
  N as initTranslationFamilyDetailPage,
  ka as initTranslationSummaryCards,
  Ne as normalizeCreateLocaleResult,
  ae as normalizeFamilyDetail,
  je as normalizeFamilyListResponse,
  Oe as normalizeFamilyListRow,
  M as normalizeQuickCreateHints,
  Le as normalizeTranslationFamilySyncRecoveryCapability,
  se as renderReadinessChip,
  T as renderTranslationFamilyDetailPage,
  ca as renderTranslationFamilyDetailState,
  Ee as serializeCreateLocaleRequest,
  ma as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map