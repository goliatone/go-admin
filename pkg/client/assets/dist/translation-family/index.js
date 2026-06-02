import { escapeAttribute as p, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as Re, httpRequest as me, readHTTPJSON as Ie } from "../shared/transport/http-client.js";
import { extractStructuredError as j } from "../toast/error-helpers.js";
import { buildURL as F, getNumberSearchParam as se, getStringSearchParam as T, readLocationSearchParams as Te, setNumberSearchParam as ne, setSearchParam as $ } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as C } from "../shared/path-normalization.js";
import { parseJSONValue as ie } from "../shared/json-parse.js";
import { asLooseBoolean as b, asNumberish as h, asRecord as u, asString as i, asStringArray as f } from "../shared/coercion.js";
import { $ as O, C as Ae, E as Pe, H as Fe, S as Ee, U as Ue, _ as ue, d as A, g as ye, h as De, l as q, m as Ne, o as pe, p as Be, rt as je, s as R, v as fe } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationTimestampUTC as K, sentenceCaseToken as w } from "../translation-shared/formatters.js";
import { normalizeStringRecord as Oe } from "../shared/record-normalization.js";
function Me(e, a = {}) {
  const t = u(e), s = b(t.can_sync ?? t.canSync), n = i(t.family_id ?? t.familyId ?? a.familyId), r = i((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), c = i(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), l = i((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !n || !r || !c ? null : {
    canSync: s,
    permission: i((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: c,
    environment: l,
    familyId: n
  };
}
function ze(e, a = "") {
  const t = i(a), s = Ve(e);
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
function Ve(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(i(a).trim() || "default")).join(":");
}
function He(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !b(t.accepted ?? t.Accepted) || i(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function Ge(e, a = {}) {
  const t = a.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t) throw new Error("translation family sync requires fetch");
  if (!e.canSync) throw new Error("translation family sync is not available for this request");
  const s = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), n = {
    method: "POST",
    credentials: "same-origin",
    headers: s,
    body: JSON.stringify(ze(e, a.correlationId))
  };
  Re(e.rpcInvokePath, n, s);
  const r = await t(e.rpcInvokePath, n);
  if (!r.ok) {
    const y = await j(r);
    throw new Error(y.message || "Failed to sync translation families.");
  }
  const c = u(await r.json().catch(() => ({}))), l = u(c.error);
  if (Object.keys(l).length > 0) throw new Error(i(l.message) || "Failed to sync translation families.");
  const o = u(c.data), m = He(o.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...o,
    receipt: m
  };
}
function Q(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function P(e) {
  return i(e) === "ready" ? "ready" : "blocked";
}
function G(e) {
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
function M(e = {}) {
  const a = i(e.channel);
  return {
    contentType: i(e.contentType),
    readinessState: i(e.readinessState),
    blockerCode: i(e.blockerCode),
    missingLocale: i(e.missingLocale),
    page: Math.max(1, h(e.page, 1)),
    perPage: Math.max(1, h(e.perPage, 50)),
    channel: a
  };
}
function ge(e = {}) {
  const a = M(e), t = new URLSearchParams();
  return $(t, "content_type", a.contentType), $(t, "readiness_state", a.readinessState), $(t, "blocker_code", a.blockerCode), $(t, "missing_locale", a.missingLocale), $(t, "channel", a.channel), ne(t, "page", a.page, { min: 1 }), ne(t, "per_page", a.perPage, { min: 1 }), t;
}
function J(e, a = "", t = "") {
  const s = C(e);
  return a ? `${s}/translations/families/${encodeURIComponent(i(a))}${t}` : `${s}/translations/families`;
}
function be(e, a = {}) {
  return F(J(e), ge(a));
}
function Ye(e, a, t = "") {
  const s = new URLSearchParams();
  return $(s, "channel", t), F(J(e, a), s);
}
function he(e = {}) {
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
function Ke(e, a, t = "") {
  const s = new URLSearchParams();
  return $(s, "channel", t), F(J(e, a, "/variants"), s);
}
function Qe(e = {}) {
  const a = he(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Je(e) {
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
function Xe(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: i(e.work_scope),
    priority: i(e.priority) || "normal",
    assigneeId: i(e.assignee_id),
    dueDate: i(e.due_date)
  };
}
function X(e, a = {}) {
  const t = u(e.default_assignment), s = f(e.missing_locales ?? a.missingLocales), n = f(e.required_for_publish ?? a.requiredForPublish), r = i(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: n,
    defaultAssignment: Xe({
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
function We(e) {
  const a = u(e.data), t = u(e.meta), s = u(t.family), n = u(t.refresh), r = u(a.navigation), c = X(u(s.quick_create), { missingLocales: f(s.missing_locales) });
  return {
    variantId: i(a.variant_id),
    familyId: i(a.family_id) || i(s.family_id),
    locale: i(a.locale).toLowerCase(),
    status: i(a.status),
    recordId: i(a.record_id),
    contentType: i(a.content_type),
    assignment: a.assignment ? Je(u(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: i(s.family_id),
      readinessState: P(s.readiness_state),
      missingRequiredLocaleCount: h(s.missing_required_locale_count),
      pendingReviewCount: h(s.pending_review_count),
      outdatedLocaleCount: h(s.outdated_locale_count),
      blockerCodes: f(s.blocker_codes),
      missingLocales: f(s.missing_locales),
      availableLocales: f(s.available_locales),
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
function Ze(e) {
  const a = i(e.familyId), t = he(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Ke(i(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function ea(e) {
  const a = {};
  for (const [t, s] of Object.entries(u(e.blocker_labels))) {
    const n = G(t), r = i(s);
    n && r && (a[n] = r);
  }
  return {
    familyId: i(e.family_id),
    tenantId: i(e.tenant_id),
    orgId: i(e.org_id),
    contentType: i(e.content_type),
    sourceLocale: i(e.source_locale),
    sourceVariantId: i(e.source_variant_id),
    sourceRecordId: i(e.source_record_id),
    sourceTitle: i(e.source_title),
    readinessState: P(e.readiness_state),
    missingRequiredLocaleCount: h(e.missing_required_locale_count),
    pendingReviewCount: h(e.pending_review_count),
    outdatedLocaleCount: h(e.outdated_locale_count),
    blockerCodes: f(e.blocker_codes).map(G),
    blockerLabels: a,
    missingLocales: f(e.missing_locales),
    availableLocales: f(e.available_locales)
  };
}
function xe(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, n = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((c) => ea(u(c))),
    total: h(n.total),
    page: h(n.page, 1),
    perPage: h(n.per_page, 50),
    channel: i(n.channel)
  };
}
function re(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    locale: i(e.locale),
    status: i(e.status),
    isSource: b(e.is_source),
    sourceRecordId: i(e.source_record_id),
    sourceHashAtLastSync: i(e.source_hash_at_last_sync),
    fields: Oe(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    publishedAt: i(e.published_at)
  };
}
function aa(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    blockerCode: G(e.blocker_code),
    locale: i(e.locale),
    fieldPath: i(e.field_path),
    details: u(e.details)
  };
}
function ta(e) {
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
function ve(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? re(u(t.source_variant)) : null, n = Array.isArray(t.blockers) ? t.blockers.map((y) => aa(u(y))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => re(u(y))) : [], c = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => ta(u(y))) : [], l = u(t.publish_gate), o = u(t.readiness_summary), m = X(u(t.quick_create), {
    missingLocales: f(o.missing_locales),
    recommendedLocale: i(o.recommended_locale),
    requiredForPublish: f(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: i(t.family_id),
    contentType: i(t.content_type),
    sourceLocale: i(t.source_locale),
    readinessState: P(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: n,
    activeAssignments: c,
    publishGate: {
      allowed: b(l.allowed),
      overrideAllowed: b(l.override_allowed),
      blockedBy: f(l.blocked_by),
      reviewRequired: b(l.review_required)
    },
    readinessSummary: {
      state: P(o.state),
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
function B(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const n = i(s).toLowerCase();
    n && a.add(n);
  }
  return Array.from(a).sort();
}
function _e(e, a) {
  const t = i(a).toLowerCase();
  return e.map((s) => i(s).toLowerCase()).filter((s) => s && s !== t);
}
function nt(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = i(a.locale).toLowerCase(), s = e.localeVariants.some((o) => o.locale === t) ? e.localeVariants.map((o) => o.locale === t ? {
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
    }, m = n.findIndex((y) => y.id === o.id || y.targetLocale === o.targetLocale);
    m >= 0 ? n[m] = o : n = [...n, o].sort((y, g) => y.targetLocale.localeCompare(g.targetLocale));
  }
  const r = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), c = B(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), l = _e(B(e.readinessSummary.missingLocales, a.family.missingLocales), t);
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: r,
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
function it(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, n = i(a.locale).toLowerCase(), r = i(t.requested_locale).toLowerCase(), c = i(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (c && c !== a.familyId) return t;
  const l = B(f(t.available_locales), f(s.available_locales), a.family.availableLocales, [n]), o = _e(B(f(t.missing_required_locales), f(s.missing_required_locales), a.family.missingLocales), n);
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
  }, t.translation_readiness = s, r && r === n && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = n), t;
}
function sa(e) {
  const a = P(e);
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
function W(e) {
  const a = sa(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function na(e) {
  const a = await j(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = i(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = u(a.metadata), t;
}
function ia(e) {
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
function ra(e) {
  return O(ia(e));
}
function oa(e) {
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
function la(e) {
  return O(oa(e));
}
function ca(e) {
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
function Ce(e) {
  return O(ca(e));
}
function v(e, a) {
  return i(e[a]);
}
function Le(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = v(e.details, "reason").toLowerCase(), t = v(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(v(e.details, "content_type") || v(e.details, "environment")), n = !!(v(e.details, "message") || v(e.details, "policy_reason"));
  return s && !a && !n;
}
function da(e) {
  return Le(e) ? "Policy unavailable" : w(e.blockerCode);
}
function ma(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", v(a, "content_type")],
    ["Environment", v(a, "environment")]
  ], s = v(a, "reason"), n = v(a, "message"), r = v(a, "remediation");
  return Le(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), n && n !== s && t.push(["Message", n]), r && t.push(["Remediation", r]), t.filter(([, c]) => c.trim() !== "");
}
function ua(e) {
  const a = ma(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${d(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${d(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function ya(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function pa(e) {
  return O(ya(e));
}
function fa(e, a, t) {
  const s = C(e), n = i(t.sourceRecordId);
  return !s || !n || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(n)}?locale=${encodeURIComponent(t.locale)}`;
}
function ga(e) {
  const a = i(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function ba(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${w(s.status)} state.`,
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
    const r = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: n,
      title: `${s.targetLocale.toUpperCase()} assignment ${w(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, n) => n.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function ha(e) {
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
function xa(e, a) {
  const t = C(a.contentBasePath || `${C(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, n = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (l) => {
    const o = !e.quickCreate.enabled;
    return `
      <button
        type="button"
        class="${R}"
        data-family-create-locale="true"
        data-locale="${p(l)}"
        ${o ? 'disabled aria-disabled="true"' : ""}
        title="${p(o ? n : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = e.localeVariants.map((l) => {
    const o = fa(t, e, l), m = o ? `<a href="${p(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ra(l.status)}">${d(w(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(K(l.updatedAt || l.createdAt)) || "n/a"}</p>
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
    <section class="${A} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function va(e) {
  return e.activeAssignments.length ? `
    <section class="${A} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = ga(a.dueDate), s = t === "none" ? "No due date" : w(t);
    return `
              <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${la(a.status)}">${d(w(a.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${pa(t)}">${d(s)}</span>
                </div>
                <p class="mt-2 text-sm text-gray-600">
                  ${d(a.assigneeId || "Unassigned")}
                  <span class="text-gray-400">·</span>
                  Priority ${d(a.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-gray-500">Updated ${d(K(a.updatedAt || a.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="${A} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function _a(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ce(t.blockerCode)}">${d(da(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
              </div>
              ${ua(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${A} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
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
function Ca(e) {
  const a = ba(e);
  return `
    <section class="${A} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(K(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function N(e) {
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
function $e(e) {
  return `
    <div class="${Pe}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function Y(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${Be} p-8 text-center shadow-sm">
        <h2 class="${De}">${d(e)}</h2>
        <p class="${Ne} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function La(e, a, t) {
  const s = t.syncRecovery, n = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${R}"
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
    <div class="${ye} p-6" role="alert">
      <h2 class="${fe}">${d(e)}</h2>
      <p class="${ue} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${q}">
          Reload family detail
        </button>
        ${n}
      </div>
    </div>
  `;
}
function $a(e, a = {}) {
  if (e.status === "loading") return $e("Loading translation family...");
  if (e.status === "empty") return `
      ${Y("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${N(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${La(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${N(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return Y("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, n = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(w).join(", ") : "No blockers", r = !t.quickCreate.enabled, c = t.quickCreate.recommendedLocale ? `
      <button
        type="button"
        class="${R}"
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
            <p class="${Ee}">Translation family</p>
            <h1 class="${Ae} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${W(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(n)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${ha(t)}
        </div>
        ${N(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${xa(t, a)}
          ${va(t)}
        </div>
        <div class="space-y-6">
          ${_a(t)}
          ${Ca(t)}
        </div>
      </div>
    </div>
  `;
}
async function oe(e, a = {}) {
  const t = i(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : me(t, { headers: { Accept: "application/json" } })), n = i(s.headers.get("x-request-id")), r = Q(s.headers);
    if (!s.ok) {
      const l = await j(s), o = u(l.metadata?.sync_recovery), m = l.textCode === "NOT_FOUND" || b(o.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: l.message,
        requestId: n,
        traceId: r,
        statusCode: s.status,
        errorCode: l.textCode,
        syncRecovery: m ? Me(o, { familyId: i(l.metadata?.family_id) }) : null
      };
    }
    const c = ve(u(await s.json()));
    return c.familyId ? {
      status: "ready",
      detail: c,
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
function D(e, a, t = {}) {
  e.innerHTML = $a(a, t);
}
var wa = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function ka(e) {
  const a = e ?? new URLSearchParams();
  return M({
    channel: T(a, "channel") || "",
    contentType: T(a, "content_type") || "",
    readinessState: T(a, "readiness_state") || "",
    blockerCode: T(a, "blocker_code") || "",
    missingLocale: T(a, "missing_locale") || "",
    page: se(a, "page") || 1,
    perPage: se(a, "per_page") || 50
  });
}
function Sa(e = globalThis.location) {
  return ka(Te(e));
}
function qa(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of wa) t.delete(s);
  return ge(a).forEach((s, n) => t.set(n, s)), t.toString();
}
function Ra(e, a = "/admin") {
  const t = C(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${C(a || "/admin")}/api`;
}
function Z(e = "/admin") {
  return `${C(e || "/admin")}/translations/families`;
}
function Ia(e, a, t = "") {
  const s = C(e || Z("/admin")), n = new URLSearchParams();
  return $(n, "channel", t), F(`${s}/${encodeURIComponent(i(a))}`, n);
}
function we(e, a) {
  const t = i(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [n, r] of Object.entries(a)) $(s, n, r);
  return F(t, s);
}
function Ta(e, a, t = {}) {
  return we(e, {
    family_id: a.familyId,
    channel: i(t.channel),
    content_type: a.contentType || i(t.contentType),
    readiness_state: a.readinessState || i(t.readinessState),
    blocker_code: i(t.blockerCode),
    missing_locale: i(t.missingLocale)
  });
}
function Aa(e, a, t = {}) {
  return we(e, {
    family_id: a.familyId,
    channel: i(t.channel)
  });
}
function Pa(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function _(e, a, t) {
  return `<option value="${p(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function Fa(e) {
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
            ${_("", "Any", e.readinessState)}
            ${_("blocked", "Blocked", e.readinessState)}
            ${_("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${_("", "Any", e.blockerCode)}
            ${_("missing_locale", "Missing locale", e.blockerCode)}
            ${_("missing_field", "Missing field", e.blockerCode)}
            ${_("pending_review", "Pending review", e.blockerCode)}
            ${_("outdated_source", "Outdated source", e.blockerCode)}
            ${_("policy_denied", "Policy issue", e.blockerCode)}
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
  ].map((t) => _(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${R} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${p(e.page)}">
    </form>
  `;
}
function le(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function Ea(e) {
  return e.blockerCodes.length ? e.blockerCodes.map((a) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ce(a)}">${d(e.blockerLabels[a] || w(a))}</span>`).join(" ") : '<span class="text-gray-400">No blockers</span>';
}
function V(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function Ua(e, a, t) {
  const s = t.familyBasePath || Z(t.basePath || "/admin");
  return e.map((n) => {
    const r = Ia(s, n.familyId, a.channel), c = t.matrixPath ? Ta(t.matrixPath, n, a) : "", l = t.queuePath ? Aa(t.queuePath, n, a) : "", o = Pa(n);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${p(n.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${p(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(o)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(n.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(n.contentType || "unknown")} · Source ${d(n.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${W(n.readinessState)}</td>
        <td class="px-4 py-4 align-top">${Ea(n)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${V(n.missingRequiredLocaleCount, "Missing", n.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${V(n.pendingReviewCount, "Review", n.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${V(n.outdatedLocaleCount, "Outdated", n.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${le(n.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${le(n.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${p(r)}" class="${R} text-center" data-family-primary-action="true">Open family</a>
            ${c ? `<a href="${p(c)}" class="${q} text-center">Matrix</a>` : ""}
            ${l ? `<a href="${p(l)}" class="${pe} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function Da(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, n = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, c = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${d(s)}-${d(n)} of ${d(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${q}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${d(e.page)}</span>
          <button type="button" class="${q}" data-family-list-page="next" ${c ? "" : "disabled"}>Next</button>
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
            ${Ua(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Na(e) {
  return `
    <div class="${ye} mt-6 p-6" role="alert">
      <h2 class="${fe}">Families failed to load</h2>
      <p class="${ue} mt-2">${d(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${d(e.requestURL)}</p>` : ""}
      ${N({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${q}">Retry</button>
    </div>
  `;
}
function Ba(e, a = {}) {
  const t = e.filters, s = Fa(t);
  if (e.status === "loading") return `${s}${$e("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Na(e)}`;
  const n = e.response;
  return !n || e.status === "empty" || n.items.length === 0 ? `${s}${Y("No translation families found", "No families match the current filters.")}` : `${s}${Da(n, t, a)}`;
}
function ce(e, a, t = {}) {
  e.innerHTML = Ba(a, t);
}
async function ja(e, a, t = {}) {
  const s = be(Ra(e, t.basePath), a), n = t.fetch;
  try {
    const r = await (n ? n(s, { headers: { Accept: "application/json" } }) : me(s, { headers: { Accept: "application/json" } })), c = i(r.headers.get("x-request-id")), l = Q(r.headers);
    if (!r.ok) {
      const m = await j(r);
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
    const o = xe(u(await r.json()));
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
function de(e, a) {
  const t = new FormData(e), s = (r, c) => t.has(r) ? i(t.get(r)) : c, n = (r, c) => t.has(r) ? h(t.get(r), c) : c;
  return M({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: n("page", a.page),
    perPage: n("per_page", a.perPage)
  });
}
function Oa(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = qa(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function rt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: i(a.endpoint || t.endpoint),
    basePath: i(a.basePath || t.basePath || "/admin"),
    familyBasePath: i(a.familyBasePath || t.familyBasePath),
    matrixPath: i(a.matrixPath || t.matrixPath),
    queuePath: i(a.queuePath || t.queuePath)
  };
  s.familyBasePath || (s.familyBasePath = Z(s.basePath));
  let n = Sa(), r = null;
  const c = async (l, o = !1) => {
    n = M(l), o && Oa(n), ce(e, {
      status: "loading",
      filters: n
    }, s);
    const m = await ja(i(s.endpoint), n, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = m, ce(e, m, s), Ma(e, m, c), m;
  };
  return r = await c(n, !1), r;
}
function Ma(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (n) => {
    n.preventDefault(), t({
      ...de(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((n) => {
    n.addEventListener("change", () => {
      t({
        ...de(s, a.filters),
        page: 1
      }, !0);
    });
  })), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
    t(a.filters, !1);
  }), e.querySelectorAll("[data-family-list-page]").forEach((n) => {
    n.addEventListener("click", () => {
      if (n.disabled) return;
      const r = n.dataset.familyListPage === "next" ? 1 : -1;
      t({
        ...a.filters,
        page: Math.max(1, a.filters.page + r)
      }, !0);
    });
  });
}
function L(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function za(e, a) {
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
function Va(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Ha(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Ga(e, a, t, s) {
  const n = i(e.locale).toLowerCase(), r = i(t).toLowerCase(), c = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === n && c ? c : n && a[n] ? a[n] : c;
}
function ke(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    L("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = i(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), n = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = Ue, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${Fe}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${pe}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((x) => `
                <option value="${p(x)}" ${x === n ? "selected" : ""}>
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
                  <option value="${x}" ${x === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${w(x)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${p(Va(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${q}">Cancel</button>
          <button type="submit" class="${R}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r);
  const c = r.querySelector('[role="dialog"]'), l = r.querySelector("form"), o = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), y = r.querySelector('input[name="assignee_id"]'), g = r.querySelector('select[name="priority"]'), E = r.querySelector('input[name="due_date"]'), k = r.querySelector('[data-assignment-fields="true"]'), S = r.querySelector('[data-create-locale-feedback="true"]'), I = r.querySelector('button[type="submit"]'), U = () => {
    qe(), r.remove();
  }, ee = () => {
    !k || !m || (k.hidden = !m.checked);
  }, qe = c ? je(c, U) : () => {
  };
  ee(), m?.addEventListener("change", ee), r.querySelectorAll('[data-close-modal="true"]').forEach((x) => {
    x.addEventListener("click", U);
  }), r.addEventListener("click", (x) => {
    x.target === r && U();
  }), l?.addEventListener("submit", async (x) => {
    if (x.preventDefault(), !o || !I) return;
    S && (S.hidden = !0, S.textContent = ""), I.disabled = !0, I.classList.add("opacity-60", "cursor-not-allowed");
    const ae = i(o.value).toLowerCase();
    try {
      const z = await e.onSubmit({
        locale: ae,
        autoCreateAssignment: m?.checked,
        assigneeId: y?.value,
        priority: g?.value,
        dueDate: Ha(E?.value || "")
      });
      U(), await e.onSuccess?.(z);
    } catch (z) {
      const te = za(z, ae);
      S && (S.hidden = !1, S.textContent = te), L("error", te);
    } finally {
      I.disabled = !1, I.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Ya(e) {
  return {
    familyId: i(e.dataset.familyId),
    requestedLocale: i(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: i(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: i(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: X(ie(e.dataset.quickCreate, {}), {}),
    localeURLs: ie(e.dataset.localeUrls, {})
  };
}
function ot(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Ya(a), s = Se({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((n) => {
      n.addEventListener("click", (r) => {
        r.preventDefault();
        const c = i(n.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        ke({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: c,
          heading: `Create ${c.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (l) => s.createLocale(t.familyId, l),
          onSuccess: async (l) => {
            L("success", `${l.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = Ga(l, t.localeURLs, t.requestedLocale, o);
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
async function H(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = i(a.endpoint || t.endpoint), n = {
    basePath: i(a.basePath || t.basePath || "/admin"),
    contentBasePath: i(a.contentBasePath || t.contentBasePath)
  };
  D(e, { status: "loading" }, n);
  const r = await oe(s, { fetch: a.fetch });
  if (D(e, r, n), typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const o = Se({
        basePath: `${C(n.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((m) => {
        m.dataset.translationCreateBound !== "true" && (m.dataset.translationCreateBound = "true", m.addEventListener("click", (y) => {
          y.preventDefault();
          const g = r.detail;
          if (!g) {
            L("error", "Translation family detail is unavailable.");
            return;
          }
          if (m.getAttribute("aria-disabled") === "true") {
            L("warning", g.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const E = i(m.dataset.locale).toLowerCase() || g.quickCreate.recommendedLocale || "";
          ke({
            familyId: g.familyId,
            quickCreate: g.quickCreate,
            initialLocale: E,
            heading: `Create ${E.toUpperCase()} locale`,
            onSubmit: (k) => o.createLocale(g.familyId, k),
            onSuccess: async (k) => {
              L("success", `${k.locale.toUpperCase()} locale created.`), await H(e, {
                ...a,
                ...n,
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
        H(e, {
          ...a,
          ...n,
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
        await Ge(m, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const y = await oe(s, { fetch: a.fetch });
        if (y.status === "error" && (y.errorCode === "NOT_FOUND" || y.statusCode === 404)) {
          D(e, {
            ...y,
            syncRecovery: m,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, n), c();
          return;
        }
        if (y.status !== "ready") {
          const g = y.message || "Sync completed, but family detail reload failed.";
          D(e, {
            ...y,
            syncRecovery: m,
            syncStatus: "failed",
            syncMessage: g
          }, n), c(), L("error", g);
          return;
        }
        L("success", "Translation families synced."), await H(e, {
          ...a,
          ...n,
          endpoint: s
        });
      } catch (m) {
        const y = m instanceof Error ? m.message : "Failed to sync translation families.", g = e.querySelector('[data-family-sync-feedback="true"]');
        g && (g.hidden = !1, g.textContent = y), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed"), L("error", y);
      }
    });
  }
  return r;
}
function Se(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = C(e.basePath || "/admin/api");
  async function s(n) {
    return Ie(n);
  }
  return {
    async list(n = {}) {
      return xe(await s(await a(be(t, n), { headers: { Accept: "application/json" } })));
    },
    async detail(n, r = "") {
      return ve(await s(await a(Ye(t, n, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(n, r = {}) {
      const c = Ze({
        ...r,
        familyId: n,
        basePath: t
      }), l = await a(c.endpoint, {
        method: "POST",
        headers: c.headers,
        body: JSON.stringify(Qe(c.request))
      });
      if (!l.ok) throw await na(l);
      return We(await s(l));
    }
  };
}
export {
  nt as applyCreateLocaleToFamilyDetail,
  it as applyCreateLocaleToSummaryState,
  Ke as buildCreateLocaleURL,
  ba as buildFamilyActivityPreview,
  Ia as buildFamilyDetailUIURL,
  Ye as buildFamilyDetailURL,
  qa as buildFamilyListBrowserSearch,
  ge as buildFamilyListQuery,
  be as buildFamilyListURL,
  Ta as buildFamilyMatrixURL,
  Aa as buildFamilyQueueURL,
  ze as buildTranslationFamilySyncRPCRequest,
  M as createFamilyFilters,
  Ze as createTranslationCreateLocaleActionModel,
  he as createTranslationCreateLocaleRequest,
  Se as createTranslationFamilyClient,
  Ge as dispatchTranslationFamilySync,
  oe as fetchTranslationFamilyDetailState,
  ja as fetchTranslationFamilyListState,
  sa as getReadinessChip,
  H as initTranslationFamilyDetailPage,
  rt as initTranslationFamilyListPage,
  ot as initTranslationSummaryCards,
  We as normalizeCreateLocaleResult,
  ve as normalizeFamilyDetail,
  xe as normalizeFamilyListResponse,
  ea as normalizeFamilyListRow,
  X as normalizeQuickCreateHints,
  Me as normalizeTranslationFamilySyncRecoveryCapability,
  ka as parseFamilyListFiltersFromSearchParams,
  Sa as readFamilyListFiltersFromLocation,
  W as renderReadinessChip,
  D as renderTranslationFamilyDetailPage,
  $a as renderTranslationFamilyDetailState,
  ce as renderTranslationFamilyListPage,
  Ba as renderTranslationFamilyListState,
  Qe as serializeCreateLocaleRequest,
  Va as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map