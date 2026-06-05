import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as ye, httpRequest as fe, readHTTPJSON as Pe } from "../shared/transport/http-client.js";
import { extractStructuredError as j } from "../toast/error-helpers.js";
import { buildURL as U, getNumberSearchParam as ie, getStringSearchParam as R, readLocationSearchParams as pe, setNumberSearchParam as re, setSearchParam as k } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as L } from "../shared/path-normalization.js";
import { parseJSONValue as oe } from "../shared/json-parse.js";
import { asLooseBoolean as b, asNumberish as x, asRecord as u, asString as i, asStringArray as p } from "../shared/coercion.js";
import { E as Fe, G as Ee, K as Ue, T as De, _ as Ne, b as ge, f as T, g as Be, k as je, l as be, m as P, nt as O, ot as Oe, u as A, v as Me, x as he, y as xe } from "../chunks/translation-shared-DxbdCW0D.js";
import { formatTranslationTimestampUTC as Y, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as ze } from "../shared/record-normalization.js";
function Ve(e, a = {}) {
  const t = u(e), s = b(t.can_sync ?? t.canSync), n = i(t.family_id ?? t.familyId ?? a.familyId), r = i((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), l = i(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), c = i((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !n || !r || !l ? null : {
    canSync: s,
    permission: i((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: l,
    environment: c,
    familyId: n
  };
}
function He(e, a = "") {
  const t = i(a), s = Ge(e);
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
function Ge(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(i(a).trim() || "default")).join(":");
}
function Ye(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !b(t.accepted ?? t.Accepted) || i(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function Ke(e, a = {}) {
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
    body: JSON.stringify(He(e, a.correlationId))
  };
  ye(e.rpcInvokePath, n, s);
  const r = await t(e.rpcInvokePath, n);
  if (!r.ok) {
    const y = await j(r);
    throw new Error(y.message || "Failed to sync translation families.");
  }
  const l = u(await r.json().catch(() => ({}))), c = u(l.error);
  if (Object.keys(c).length > 0) throw new Error(i(c.message) || "Failed to sync translation families.");
  const o = u(l.data), m = Ye(o.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...o,
    receipt: m
  };
}
function K(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function F(e) {
  return i(e) === "ready" ? "ready" : "blocked";
}
function ve(e) {
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
    page: Math.max(1, x(e.page, 1)),
    perPage: Math.max(1, x(e.perPage, 50)),
    channel: a
  };
}
function _e(e = {}) {
  const a = M(e), t = new URLSearchParams();
  return k(t, "content_type", a.contentType), k(t, "readiness_state", a.readinessState), k(t, "blocker_code", a.blockerCode), k(t, "missing_locale", a.missingLocale), k(t, "channel", a.channel), re(t, "page", a.page, { min: 1 }), re(t, "per_page", a.perPage, { min: 1 }), t;
}
function Q(e, a = "", t = "") {
  const s = L(e);
  return a ? `${s}/translations/families/${encodeURIComponent(i(a))}${t}` : `${s}/translations/families`;
}
function Ce(e, a = {}) {
  return U(Q(e), _e(a));
}
function Qe(e, a, t = "") {
  const s = new URLSearchParams();
  return k(s, "channel", t), U(Q(e, a), s);
}
function Le(e = {}) {
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
function Je(e, a, t = "") {
  const s = new URLSearchParams();
  return k(s, "channel", t), U(Q(e, a, "/variants"), s);
}
function Xe(e = {}) {
  const a = Le(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function We(e) {
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
function Ze(e) {
  return {
    autoCreateAssignment: b(e.auto_create_assignment),
    workScope: i(e.work_scope),
    priority: i(e.priority) || "normal",
    assigneeId: i(e.assignee_id),
    dueDate: i(e.due_date)
  };
}
function J(e, a = {}) {
  const t = u(e.default_assignment), s = p(e.missing_locales ?? a.missingLocales), n = p(e.required_for_publish ?? a.requiredForPublish), r = i(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? b(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: n,
    defaultAssignment: Ze({
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
function ea(e) {
  const a = u(e.data), t = u(e.meta), s = u(t.family), n = u(t.refresh), r = u(a.navigation), l = J(u(s.quick_create), { missingLocales: p(s.missing_locales) });
  return {
    variantId: i(a.variant_id),
    familyId: i(a.family_id) || i(s.family_id),
    locale: i(a.locale).toLowerCase(),
    status: i(a.status),
    recordId: i(a.record_id),
    contentType: i(a.content_type),
    assignment: a.assignment ? We(u(a.assignment)) : null,
    idempotencyHit: b(t.idempotency_hit),
    assignmentReused: b(t.assignment_reused),
    family: {
      familyId: i(s.family_id),
      readinessState: F(s.readiness_state),
      missingRequiredLocaleCount: x(s.missing_required_locale_count),
      pendingReviewCount: x(s.pending_review_count),
      outdatedLocaleCount: x(s.outdated_locale_count),
      blockerCodes: p(s.blocker_codes),
      missingLocales: p(s.missing_locales),
      availableLocales: p(s.available_locales),
      quickCreate: l
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
function aa(e) {
  const a = i(e.familyId), t = Le(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Je(i(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function ta(e) {
  const a = {};
  for (const [t, s] of Object.entries(u(e.blocker_labels))) {
    const n = i(t), r = i(s);
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
    readinessState: F(e.readiness_state),
    missingRequiredLocaleCount: x(e.missing_required_locale_count),
    pendingReviewCount: x(e.pending_review_count),
    outdatedLocaleCount: x(e.outdated_locale_count),
    blockerCodes: p(e.blocker_codes).map(ve),
    blockerLabels: a,
    missingLocales: p(e.missing_locales),
    availableLocales: p(e.available_locales)
  };
}
function we(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, n = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((l) => ta(u(l))),
    total: x(n.total),
    page: x(n.page, 1),
    perPage: x(n.per_page, 50),
    channel: i(n.channel)
  };
}
function le(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    locale: i(e.locale),
    status: i(e.status),
    isSource: b(e.is_source),
    sourceRecordId: i(e.source_record_id),
    sourceHashAtLastSync: i(e.source_hash_at_last_sync),
    fields: ze(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    publishedAt: i(e.published_at)
  };
}
function sa(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    blockerCode: ve(e.blocker_code),
    locale: i(e.locale),
    fieldPath: i(e.field_path),
    details: u(e.details)
  };
}
function na(e) {
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
    updatedAt: i(e.updated_at),
    links: ra(u(e.links))
  };
}
function ia(e) {
  const a = i(e.href);
  return a ? {
    href: a,
    label: i(e.label) || "Open editor",
    description: i(e.description),
    relation: i(e.relation),
    entityType: i(e.entity_type),
    entityId: i(e.entity_id)
  } : null;
}
function ra(e) {
  return { editor: ia(u(e.editor)) };
}
function $e(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? le(u(t.source_variant)) : null, n = Array.isArray(t.blockers) ? t.blockers.map((y) => sa(u(y))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => le(u(y))) : [], l = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => na(u(y))) : [], c = u(t.publish_gate), o = u(t.readiness_summary), m = J(u(t.quick_create), {
    missingLocales: p(o.missing_locales),
    recommendedLocale: i(o.recommended_locale),
    requiredForPublish: p(o.required_for_publish ?? o.required_locales)
  });
  return {
    familyId: i(t.family_id),
    contentType: i(t.content_type),
    sourceLocale: i(t.source_locale),
    readinessState: F(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: n,
    activeAssignments: l,
    publishGate: {
      allowed: b(c.allowed),
      overrideAllowed: b(c.override_allowed),
      blockedBy: p(c.blocked_by),
      reviewRequired: b(c.review_required)
    },
    readinessSummary: {
      state: F(o.state),
      requiredLocales: p(o.required_locales),
      missingLocales: p(o.missing_locales),
      availableLocales: p(o.available_locales),
      blockerCodes: p(o.blocker_codes),
      missingRequiredLocaleCount: x(o.missing_required_locale_count),
      pendingReviewCount: x(o.pending_review_count),
      outdatedLocaleCount: x(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    },
    quickCreate: m
  };
}
function E(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const n = i(s).toLowerCase();
    n && a.add(n);
  }
  return Array.from(a).sort();
}
function ke(e, a) {
  const t = i(a).toLowerCase();
  return e.map((s) => i(s).toLowerCase()).filter((s) => s && s !== t);
}
function X(e) {
  return E(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function oa(e) {
  return e.blockers.some(ee);
}
function W(e, a) {
  const t = i(a).toLowerCase();
  return !t || oa(e) ? !1 : X(e).includes(t);
}
function la(e, a) {
  const t = X(e), s = i(a).toLowerCase(), n = W(e, s);
  return {
    ...e.quickCreate,
    enabled: n,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: n ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: n ? "" : e.quickCreate.disabledReasonCode
  };
}
function mt(e, a) {
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
      updatedAt: "",
      links: { editor: null }
    }, m = n.findIndex((y) => y.id === o.id || y.targetLocale === o.targetLocale);
    m >= 0 ? n[m] = o : n = [...n, o].sort((y, g) => y.targetLocale.localeCompare(g.targetLocale));
  }
  const r = e.blockers.map((o) => ({ ...o })).filter((o) => !(o.blockerCode === "missing_locale" && o.locale === t)), l = E(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = ke(E(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function ut(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, n = i(a.locale).toLowerCase(), r = i(t.requested_locale).toLowerCase(), l = i(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (l && l !== a.familyId) return t;
  const c = E(p(t.available_locales), p(s.available_locales), a.family.availableLocales, [n]), o = ke(E(p(t.missing_required_locales), p(s.missing_required_locales), a.family.missingLocales), n);
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
  }, t.translation_readiness = s, r && r === n && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = n), t;
}
function ca(e) {
  const a = F(e);
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
function Z(e) {
  const a = ca(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function da(e) {
  const a = await j(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = i(e.headers.get("x-request-id")), t.traceId = K(e.headers), t.metadata = u(a.metadata), t;
}
function ma(e) {
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
function ua(e) {
  return O(ma(e));
}
function ya(e) {
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
function fa(e) {
  return O(ya(e));
}
function pa(e) {
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
function Se(e) {
  return O(pa(e));
}
function _(e, a) {
  return i(e[a]);
}
function ee(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = _(e.details, "reason").toLowerCase(), t = _(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(_(e.details, "content_type") || _(e.details, "environment")), n = !!(_(e.details, "message") || _(e.details, "policy_reason"));
  return s && !a && !n;
}
function ga(e) {
  return ee(e) ? "Policy unavailable" : S(e.blockerCode);
}
function ba(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", _(a, "content_type")],
    ["Environment", _(a, "environment")]
  ], s = _(a, "reason"), n = _(a, "message"), r = _(a, "remediation");
  return ee(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), n && n !== s && t.push(["Message", n]), r && t.push(["Remediation", r]), t.filter(([, l]) => l.trim() !== "");
}
function ha(e) {
  const a = ba(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${d(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${d(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function xa(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function va(e) {
  return O(xa(e));
}
function _a(e, a, t) {
  const s = L(e), n = i(t.sourceRecordId);
  return !s || !n || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(n)}?locale=${encodeURIComponent(t.locale)}`;
}
function Ca(e) {
  const a = i(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function La(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${S(s.status)} state.`,
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
      title: `${s.targetLocale.toUpperCase()} assignment ${S(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, n) => n.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function wa(e) {
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
function $a(e, a) {
  const t = L(a.contentBasePath || `${L(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, n = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (c) => {
    const o = !W(e, c);
    return `
      <button
        type="button"
        class="${A}${o ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${f(c)}"
        ${o ? 'aria-disabled="true"' : ""}
        title="${f(o ? n : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, l = e.localeVariants.map((c) => {
    const o = _a(t, e, c), m = o ? `<a href="${f(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ua(c.status)}">${d(S(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(Y(c.updatedAt || c.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${m}</div>
      </li>
    `;
  });
  for (const c of s) l.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${d(c.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${r(c)}</div>
      </li>
    `);
  return `
    <section class="${P} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function ka(e) {
  return e.activeAssignments.length ? `
    <section class="${P} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Ca(a.dueDate), s = t === "none" ? "No due date" : S(t), n = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${fa(a.status)}">${d(S(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${va(t)}">${d(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${d(a.assigneeId || "Unassigned")}
                    <span class="text-gray-400">·</span>
                    Priority ${d(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${d(Y(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${n ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${f(a.id)}"
                    href="${f(n.href)}"
                    title="${f(n.description || n.label)}"
                  >${d(n.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="${P} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function Sa(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Se(t.blockerCode)}">${d(ga(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
              </div>
              ${ha(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${P} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${Z(e.readinessState)}
          <span class="text-sm font-medium ${e.publishGate.allowed ? "text-emerald-800" : "text-amber-800"}">
            ${e.publishGate.allowed ? "Eligible to publish." : "Publishing is blocked until blockers are cleared."}
          </span>
        </div>
        <p class="mt-2 text-sm ${e.publishGate.allowed ? "text-emerald-700" : "text-amber-700"}">
          ${e.publishGate.overrideAllowed ? "Policy allows an explicit publish override once the review owner supplies a rationale." : "No override path is available for this family."}
        </p>
      </div>
      <div class="mt-5 grid gap-5">
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-gray-600" role="list">
            <li>Review required: <strong class="text-gray-900">${e.publishGate.reviewRequired ? "Yes" : "No"}</strong></li>
            <li>Override allowed: <strong class="text-gray-900">${e.publishGate.overrideAllowed ? "Yes" : "No"}</strong></li>
            <li>Available locales: <strong class="text-gray-900">${d(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${a}</ul>
        </div>
      </div>
    </section>
  `;
}
function qa(e) {
  const a = La(e);
  return `
    <section class="${P} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(Y(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function B(e) {
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
function qe(e) {
  return `
    <div class="${je}" aria-busy="true" aria-label="Loading">
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
      <div class="max-w-md ${Be} p-8 text-center shadow-sm">
        <h2 class="${Me}">${d(e)}</h2>
        <p class="${Ne} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function Ra(e, a, t) {
  const s = t.syncRecovery, n = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${A}"
        data-family-sync-action="true"
        data-family-sync-rpc="${f(s.rpcInvokePath)}"
        data-family-sync-command="${f(s.commandName)}"
        data-family-sync-family-id="${f(s.familyId)}"
        data-family-sync-environment="${f(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? d(t.syncMessage) : "";
  return `
    <div class="${xe} p-6" role="alert">
      <h2 class="${he}">${d(e)}</h2>
      <p class="${ge} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${T}">
          Reload family detail
        </button>
        ${n}
      </div>
    </div>
  `;
}
function Ia(e, a = {}) {
  if (e.status === "loading") return qe("Loading translation family...");
  if (e.status === "empty") return `
      ${G("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${B(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${Ra(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${B(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return G("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, n = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(S).join(", ") : "No blockers", r = X(t), l = t.quickCreate.recommendedLocale || r[0] || "", c = !W(t, l), o = l ? `
      <button
        type="button"
        class="${A}${c ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${f(l)}"
        ${c ? 'aria-disabled="true"' : ""}
        title="${f(c ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${l.toUpperCase()} locale`)}"
      >
        Create ${d(l.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${f(t.familyId)}" data-readiness-state="${f(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${De}">Translation family</p>
            <h1 class="${Fe} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${Z(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(n)}</span>
            ${o}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${wa(t)}
        </div>
        ${B(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${$a(t, a)}
          ${ka(t)}
        </div>
        <div class="space-y-6">
          ${Sa(t)}
          ${qa(t)}
        </div>
      </div>
    </div>
  `;
}
async function ce(e, a = {}) {
  const t = i(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : fe(t, { headers: { Accept: "application/json" } })), n = i(s.headers.get("x-request-id")), r = K(s.headers);
    if (!s.ok) {
      const c = await j(s), o = u(c.metadata?.sync_recovery), m = c.textCode === "NOT_FOUND" || b(o.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: c.message,
        requestId: n,
        traceId: r,
        statusCode: s.status,
        errorCode: c.textCode,
        syncRecovery: m ? Ve(o, { familyId: i(c.metadata?.family_id) }) : null
      };
    }
    const l = $e(u(await s.json()));
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
function Ta(e) {
  const a = pe(), t = a ? R(a, "channel") : "";
  if (t) return t;
  try {
    return R(new URL(i(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function N(e, a, t = {}) {
  e.innerHTML = Ia(a, t);
}
var Aa = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function Pa(e) {
  const a = e ?? new URLSearchParams();
  return M({
    channel: R(a, "channel") || "",
    contentType: R(a, "content_type") || "",
    readinessState: R(a, "readiness_state") || "",
    blockerCode: R(a, "blocker_code") || "",
    missingLocale: R(a, "missing_locale") || "",
    page: ie(a, "page") || 1,
    perPage: ie(a, "per_page") || 50
  });
}
function Fa(e = globalThis.location) {
  return Pa(pe(e));
}
function Ea(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of Aa) t.delete(s);
  return _e(a).forEach((s, n) => t.set(n, s)), t.toString();
}
function Ua(e, a = "/admin") {
  const t = L(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${L(a || "/admin")}/api`;
}
function ae(e = "/admin") {
  return `${L(e || "/admin")}/translations/families`;
}
function Da(e, a, t = "") {
  const s = L(e || ae("/admin")), n = new URLSearchParams();
  return k(n, "channel", t), U(`${s}/${encodeURIComponent(i(a))}`, n);
}
function Re(e, a) {
  const t = i(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [n, r] of Object.entries(a)) k(s, n, r);
  return U(t, s);
}
function Na(e, a, t = {}) {
  return Re(e, {
    family_id: a.familyId,
    channel: i(t.channel),
    content_type: a.contentType || i(t.contentType),
    readiness_state: a.readinessState || i(t.readinessState),
    blocker_code: i(t.blockerCode),
    missing_locale: i(t.missingLocale)
  });
}
function Ba(e, a, t = {}) {
  return Re(e, {
    family_id: a.familyId,
    channel: i(t.channel)
  });
}
function ja(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function C(e, a, t) {
  return `<option value="${f(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function Oa(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-family-list-filters="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${f(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${C("", "Any", e.readinessState)}
            ${C("blocked", "Blocked", e.readinessState)}
            ${C("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${C("", "Any", e.blockerCode)}
            ${C("missing_locale", "Missing locale", e.blockerCode)}
            ${C("missing_field", "Missing field", e.blockerCode)}
            ${C("pending_review", "Pending review", e.blockerCode)}
            ${C("outdated_source", "Outdated source", e.blockerCode)}
            ${C("policy_denied", "Policy issue", e.blockerCode)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Missing locale</span>
          <input name="missing_locale" value="${f(e.missingLocale)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="fr">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Content type</span>
          <input name="content_type" value="${f(e.contentType)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="pages">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Per page</span>
          <select name="per_page" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${[
    "10",
    "25",
    "50",
    "100"
  ].map((t) => C(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${A} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${f(e.page)}">
    </form>
  `;
}
function de(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function Ma(e) {
  if (!e.blockerCodes.length) return '<span class="text-gray-400">No blockers</span>';
  const a = /* @__PURE__ */ new Set(), t = e.blockerCodes.map((s) => {
    const n = e.blockerLabels[s] || S(s);
    return a.add(n.toLowerCase()), {
      code: s,
      label: n
    };
  });
  for (const [s, n] of Object.entries(e.blockerLabels)) {
    const r = n.toLowerCase();
    e.blockerCodes.includes(s) || a.has(r) || (a.add(r), t.push({
      code: i(s),
      label: n
    }));
  }
  return t.map(({ code: s, label: n }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${Se(s)}">${d(n)}</span>`).join(" ");
}
function V(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function za(e, a, t) {
  const s = t.familyBasePath || ae(t.basePath || "/admin");
  return e.map((n) => {
    const r = Da(s, n.familyId, a.channel), l = t.matrixPath ? Na(t.matrixPath, n, a) : "", c = t.queuePath ? Ba(t.queuePath, n, a) : "", o = ja(n);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${f(n.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${f(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(o)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(n.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(n.contentType || "unknown")} · Source ${d(n.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${Z(n.readinessState)}</td>
        <td class="px-4 py-4 align-top">${Ma(n)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${V(n.missingRequiredLocaleCount, "Missing", n.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${V(n.pendingReviewCount, "Review", n.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${V(n.outdatedLocaleCount, "Outdated", n.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${de(n.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${de(n.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${f(r)}" class="${A} text-center" data-family-primary-action="true">Open family</a>
            ${l ? `<a href="${f(l)}" class="${T} text-center">Matrix</a>` : ""}
            ${c ? `<a href="${f(c)}" class="${be} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function Va(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, n = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, l = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${d(s)}-${d(n)} of ${d(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${T}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${d(e.page)}</span>
          <button type="button" class="${T}" data-family-list-page="next" ${l ? "" : "disabled"}>Next</button>
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
            ${za(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Ha(e) {
  return `
    <div class="${xe} mt-6 p-6" role="alert">
      <h2 class="${he}">Families failed to load</h2>
      <p class="${ge} mt-2">${d(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${d(e.requestURL)}</p>` : ""}
      ${B({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${T}">Retry</button>
    </div>
  `;
}
function Ga(e, a = {}) {
  const t = e.filters, s = Oa(t);
  if (e.status === "loading") return `${s}${qe("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Ha(e)}`;
  const n = e.response;
  return !n || e.status === "empty" || n.items.length === 0 ? `${s}${G("No translation families found", "No families match the current filters.")}` : `${s}${Va(n, t, a)}`;
}
function me(e, a, t = {}) {
  e.innerHTML = Ga(a, t);
}
async function Ya(e, a, t = {}) {
  const s = Ce(Ua(e, t.basePath), a), n = t.fetch;
  try {
    const r = await (n ? n(s, { headers: { Accept: "application/json" } }) : fe(s, { headers: { Accept: "application/json" } })), l = i(r.headers.get("x-request-id")), c = K(r.headers);
    if (!r.ok) {
      const m = await j(r);
      return {
        status: "error",
        filters: a,
        message: m.message,
        requestURL: s,
        requestId: l,
        traceId: c,
        statusCode: r.status,
        errorCode: m.textCode
      };
    }
    const o = we(u(await r.json()));
    return {
      status: o.items.length ? "ready" : "empty",
      filters: a,
      response: o,
      requestURL: s,
      requestId: l,
      traceId: c,
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
function ue(e, a) {
  const t = new FormData(e), s = (r, l) => t.has(r) ? i(t.get(r)) : l, n = (r, l) => t.has(r) ? x(t.get(r), l) : l;
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
function Ka(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = Ea(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function yt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: i(a.endpoint || t.endpoint),
    basePath: i(a.basePath || t.basePath || "/admin"),
    familyBasePath: i(a.familyBasePath || t.familyBasePath),
    matrixPath: i(a.matrixPath || t.matrixPath),
    queuePath: i(a.queuePath || t.queuePath)
  };
  s.familyBasePath || (s.familyBasePath = ae(s.basePath));
  let n = Fa(), r = null;
  const l = async (c, o = !1) => {
    n = M(c), o && Ka(n), me(e, {
      status: "loading",
      filters: n
    }, s);
    const m = await Ya(i(s.endpoint), n, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = m, me(e, m, s), Qa(e, m, l), m;
  };
  return r = await l(n, !1), r;
}
function Qa(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (n) => {
    n.preventDefault(), t({
      ...ue(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((n) => {
    n.addEventListener("change", () => {
      t({
        ...ue(s, a.filters),
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
function $(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function Ja(e, a) {
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
function Xa(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Wa(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Za(e, a, t, s) {
  const n = i(e.locale).toLowerCase(), r = i(t).toLowerCase(), l = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === n && l ? l : n && a[n] ? a[n] : l;
}
function Ie(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    $("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = i(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), n = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = Ue, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${Ee}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${be}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((v) => `
                <option value="${f(v)}" ${v === n ? "selected" : ""}>
                  ${d(v.toUpperCase())}${v === t.recommendedLocale ? " (recommended)" : ""}
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
              <input type="text" name="assignee_id" value="${f(t.defaultAssignment.assigneeId)}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Priority</span>
              <select name="priority" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
                ${[
    "low",
    "normal",
    "high",
    "urgent"
  ].map((v) => `
                  <option value="${v}" ${v === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${S(v)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${f(Xa(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${T}">Cancel</button>
          <button type="submit" class="${A}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r);
  const l = r.querySelector('[role="dialog"]'), c = r.querySelector("form"), o = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), y = r.querySelector('input[name="assignee_id"]'), g = r.querySelector('select[name="priority"]'), h = r.querySelector('input[name="due_date"]'), I = r.querySelector('[data-assignment-fields="true"]'), q = r.querySelector('[data-create-locale-feedback="true"]'), w = r.querySelector('button[type="submit"]'), D = () => {
    Ae(), r.remove();
  }, te = () => {
    !I || !m || (I.hidden = !m.checked);
  }, Ae = l ? Oe(l, D) : () => {
  };
  te(), m?.addEventListener("change", te), r.querySelectorAll('[data-close-modal="true"]').forEach((v) => {
    v.addEventListener("click", D);
  }), r.addEventListener("click", (v) => {
    v.target === r && D();
  }), c?.addEventListener("submit", async (v) => {
    if (v.preventDefault(), !o || !w) return;
    q && (q.hidden = !0, q.textContent = ""), w.disabled = !0, w.classList.add("opacity-60", "cursor-not-allowed");
    const se = i(o.value).toLowerCase();
    try {
      const z = await e.onSubmit({
        locale: se,
        autoCreateAssignment: m?.checked,
        assigneeId: y?.value,
        priority: g?.value,
        dueDate: Wa(h?.value || "")
      });
      D(), await e.onSuccess?.(z);
    } catch (z) {
      const ne = Ja(z, se);
      q && (q.hidden = !1, q.textContent = ne), $("error", ne);
    } finally {
      w.disabled = !1, w.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function et(e) {
  return {
    familyId: i(e.dataset.familyId),
    requestedLocale: i(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: i(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: i(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: J(oe(e.dataset.quickCreate, {}), {}),
    localeURLs: oe(e.dataset.localeUrls, {})
  };
}
function ft(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = et(a), s = Te({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((n) => {
      n.addEventListener("click", (r) => {
        r.preventDefault();
        const l = i(n.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        Ie({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: l,
          heading: `Create ${l.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            $("success", `${c.locale.toUpperCase()} locale created.`);
            const o = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = Za(c, t.localeURLs, t.requestedLocale, o);
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
  N(e, { status: "loading" }, n);
  const r = await ce(s, { fetch: a.fetch });
  N(e, r, n);
  const l = Ta(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const m = Te({
        basePath: `${L(n.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((y) => {
        y.dataset.translationCreateBound !== "true" && (y.dataset.translationCreateBound = "true", y.addEventListener("click", (g) => {
          g.preventDefault();
          const h = r.detail;
          if (!h) {
            $("error", "Translation family detail is unavailable.");
            return;
          }
          if (y.getAttribute("aria-disabled") === "true") {
            $("warning", h.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const I = i(y.dataset.locale).toLowerCase() || h.quickCreate.recommendedLocale || "", q = la(h, I);
          Ie({
            familyId: h.familyId,
            quickCreate: q,
            initialLocale: I,
            heading: `Create ${I.toUpperCase()} locale`,
            onSubmit: (w) => m.createLocale(h.familyId, {
              ...w,
              channel: l
            }),
            onSuccess: async (w) => {
              $("success", `${w.locale.toUpperCase()} locale created.`), await H(e, {
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
      const m = e.querySelector(".ui-state-retry-btn");
      m && m.addEventListener("click", () => {
        H(e, {
          ...a,
          ...n,
          endpoint: s
        });
      });
    };
    c();
    const o = e.querySelector('[data-family-sync-action="true"]');
    o && r.syncRecovery?.canSync && o.addEventListener("click", async (m) => {
      m.preventDefault(), o.disabled = !0, o.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const y = r.syncRecovery;
        if (!y) return;
        await Ke(y, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const g = await ce(s, { fetch: a.fetch });
        if (g.status === "error" && (g.errorCode === "NOT_FOUND" || g.statusCode === 404)) {
          N(e, {
            ...g,
            syncRecovery: y,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, n), c();
          return;
        }
        if (g.status !== "ready") {
          const h = g.message || "Sync completed, but family detail reload failed.";
          N(e, {
            ...g,
            syncRecovery: y,
            syncStatus: "failed",
            syncMessage: h
          }, n), c(), $("error", h);
          return;
        }
        $("success", "Translation families synced."), await H(e, {
          ...a,
          ...n,
          endpoint: s
        });
      } catch (y) {
        const g = y instanceof Error ? y.message : "Failed to sync translation families.", h = e.querySelector('[data-family-sync-feedback="true"]');
        h && (h.hidden = !1, h.textContent = g), o.disabled = !1, o.classList.remove("opacity-60", "cursor-not-allowed"), $("error", g);
      }
    });
  }
  return r;
}
function Te(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = L(e.basePath || "/admin/api");
  async function s(n) {
    return Pe(n);
  }
  return {
    async list(n = {}) {
      return we(await s(await a(Ce(t, n), { headers: { Accept: "application/json" } })));
    },
    async detail(n, r = "") {
      return $e(await s(await a(Qe(t, n, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(n, r = {}) {
      const l = aa({
        ...r,
        familyId: n,
        basePath: t
      }), c = new Headers(l.headers), o = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(Xe(l.request))
      };
      ye(l.endpoint, o, c);
      const m = await a(l.endpoint, o);
      if (!m.ok) throw await da(m);
      return ea(await s(m));
    }
  };
}
export {
  mt as applyCreateLocaleToFamilyDetail,
  ut as applyCreateLocaleToSummaryState,
  Je as buildCreateLocaleURL,
  La as buildFamilyActivityPreview,
  Da as buildFamilyDetailUIURL,
  Qe as buildFamilyDetailURL,
  Ea as buildFamilyListBrowserSearch,
  _e as buildFamilyListQuery,
  Ce as buildFamilyListURL,
  Na as buildFamilyMatrixURL,
  Ba as buildFamilyQueueURL,
  He as buildTranslationFamilySyncRPCRequest,
  M as createFamilyFilters,
  aa as createTranslationCreateLocaleActionModel,
  Le as createTranslationCreateLocaleRequest,
  Te as createTranslationFamilyClient,
  Ke as dispatchTranslationFamilySync,
  ce as fetchTranslationFamilyDetailState,
  Ya as fetchTranslationFamilyListState,
  ca as getReadinessChip,
  H as initTranslationFamilyDetailPage,
  yt as initTranslationFamilyListPage,
  ft as initTranslationSummaryCards,
  ea as normalizeCreateLocaleResult,
  $e as normalizeFamilyDetail,
  we as normalizeFamilyListResponse,
  ta as normalizeFamilyListRow,
  J as normalizeQuickCreateHints,
  Ve as normalizeTranslationFamilySyncRecoveryCapability,
  Pa as parseFamilyListFiltersFromSearchParams,
  Fa as readFamilyListFiltersFromLocation,
  Z as renderReadinessChip,
  N as renderTranslationFamilyDetailPage,
  Ia as renderTranslationFamilyDetailState,
  me as renderTranslationFamilyListPage,
  Ga as renderTranslationFamilyListState,
  Xe as serializeCreateLocaleRequest,
  Xa as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map