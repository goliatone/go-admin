import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as K, httpRequest as Z, readHTTPJSON as he } from "../shared/transport/http-client.js";
import { extractStructuredError as O } from "../toast/error-helpers.js";
import { buildURL as D, getNumberSearchParam as de, getStringSearchParam as P, readLocationSearchParams as xe, setNumberSearchParam as me, setSearchParam as q } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as R } from "../shared/path-normalization.js";
import { parseJSONValue as ue } from "../shared/json-parse.js";
import { asLooseBoolean as h, asNumberish as _, asRecord as u, asString as n, asStringArray as b } from "../shared/coercion.js";
import { E as Ke, G as He, K as Ge, T as Ye, _ as Qe, b as _e, f as I, g as Je, k as Xe, l as ve, m as U, nt as H, ot as We, u as F, v as Ze, x as Le, y as we } from "../chunks/translation-shared-DxbdCW0D.js";
import { formatTranslationTimestampUTC as ee, sentenceCaseToken as k } from "../translation-shared/formatters.js";
import { normalizeStringRecord as ea } from "../shared/record-normalization.js";
function aa(e, a = {}) {
  const t = u(e), s = h(t.can_sync ?? t.canSync), r = n(t.family_id ?? t.familyId ?? a.familyId), i = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), c = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !r || !i || !o ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: i,
    rpcInvokePath: o,
    environment: c,
    familyId: r
  };
}
function ta(e, a = "") {
  const t = n(a), s = sa(e);
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
function sa(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function na(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !h(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function ra(e, a = {}) {
  const t = a.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t) throw new Error("translation family sync requires fetch");
  if (!e.canSync) throw new Error("translation family sync is not available for this request");
  const s = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), r = {
    method: "POST",
    credentials: "same-origin",
    headers: s,
    body: JSON.stringify(ta(e, a.correlationId))
  };
  K(e.rpcInvokePath, r, s);
  const i = await t(e.rpcInvokePath, r);
  if (!i.ok) {
    const p = await O(i);
    throw new Error(p.message || "Failed to sync translation families.");
  }
  const o = u(await i.json().catch(() => ({}))), c = u(o.error);
  if (Object.keys(c).length > 0) throw new Error(n(c.message) || "Failed to sync translation families.");
  const l = u(o.data), m = na(l.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...l,
    receipt: m
  };
}
function G(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function N(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Ce(e) {
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
function Y(e = {}) {
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
function $e(e = {}) {
  const a = Y(e), t = new URLSearchParams();
  return q(t, "content_type", a.contentType), q(t, "readiness_state", a.readinessState), q(t, "blocker_code", a.blockerCode), q(t, "missing_locale", a.missingLocale), q(t, "channel", a.channel), me(t, "page", a.page, { min: 1 }), me(t, "per_page", a.perPage, { min: 1 }), t;
}
function Q(e, a = "", t = "") {
  const s = R(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function ke(e, a = {}) {
  return D(Q(e), $e(a));
}
function ia(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), D(Q(e, a), s);
}
function Se(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: h(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function oa(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), D(Q(e, a, "/variants"), s);
}
function la(e = {}) {
  const a = Se(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Ae(e = {}) {
  return {
    targetLocale: n(e.targetLocale).toLowerCase(),
    assigneeId: n(e.assigneeId),
    openPool: h(e.openPool),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    workScope: n(e.workScope),
    channel: n(e.channel),
    idempotencyKey: n(e.idempotencyKey)
  };
}
function ca(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), D(Q(e, a, "/assignments"), s);
}
function da(e = {}) {
  const a = Ae(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function ma(e) {
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
function ua(e) {
  return {
    autoCreateAssignment: h(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function ae(e, a = {}) {
  const t = u(e.default_assignment), s = b(e.missing_locales ?? a.missingLocales), r = b(e.required_for_publish ?? a.requiredForPublish), i = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? h(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: i,
    requiredForPublish: r,
    defaultAssignment: ua({
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
function ya(e) {
  const a = u(e.data), t = u(e.meta), s = u(t.family), r = u(t.refresh), i = u(a.navigation), o = ae(u(s.quick_create), { missingLocales: b(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? ma(u(a.assignment)) : null,
    idempotencyHit: h(t.idempotency_hit),
    assignmentReused: h(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: N(s.readiness_state),
      missingRequiredLocaleCount: _(s.missing_required_locale_count),
      pendingReviewCount: _(s.pending_review_count),
      outdatedLocaleCount: _(s.outdated_locale_count),
      blockerCodes: b(s.blocker_codes),
      missingLocales: b(s.missing_locales),
      availableLocales: b(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: h(r.family_detail),
      familyList: h(r.family_list),
      contentSummary: h(r.content_summary)
    },
    navigation: {
      contentDetailURL: n(i.content_detail_url),
      contentEditURL: n(i.content_edit_url)
    }
  };
}
function fa(e) {
  const a = n(e.familyId), t = Se(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: oa(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function pa(e) {
  const a = {};
  for (const [t, s] of Object.entries(u(e.blocker_labels))) {
    const r = n(t), i = n(s);
    r && i && (a[r] = i);
  }
  return {
    familyId: n(e.family_id),
    tenantId: n(e.tenant_id),
    orgId: n(e.org_id),
    contentType: n(e.content_type),
    sourceLocale: n(e.source_locale),
    sourceVariantId: n(e.source_variant_id),
    sourceRecordId: n(e.source_record_id),
    sourceTitle: n(e.source_title),
    readinessState: N(e.readiness_state),
    missingRequiredLocaleCount: _(e.missing_required_locale_count),
    pendingReviewCount: _(e.pending_review_count),
    outdatedLocaleCount: _(e.outdated_locale_count),
    blockerCodes: b(e.blocker_codes).map(Ce),
    blockerLabels: a,
    missingLocales: b(e.missing_locales),
    availableLocales: b(e.available_locales)
  };
}
function qe(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, r = Object.keys(t).length ? t : e, i = s.items ?? s.families;
  return {
    items: (Array.isArray(i) ? i : []).map((o) => pa(u(o))),
    total: _(r.total),
    page: _(r.page, 1),
    perPage: _(r.per_page, 50),
    channel: n(r.channel)
  };
}
function ye(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: h(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: ea(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function ga(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Ce(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: u(e.details)
  };
}
function B(e) {
  const a = u(e.link);
  return {
    enabled: h(e.enabled),
    permission: n(e.permission),
    endpoint: n(e.endpoint),
    href: n(e.href || a.href),
    label: n(e.label || a.label),
    reason: n(e.reason),
    reasonCode: n(e.reason_code ?? e.reasonCode),
    requiredFields: b(e.required_fields ?? e.requiredFields),
    payload: u(e.payload),
    assignmentId: n(e.assignment_id ?? e.assignmentId),
    expectedVersion: _(e.expected_version ?? e.expectedVersion)
  };
}
function te(e) {
  return {
    assignToMe: B(u(e.assign_to_me ?? e.assignToMe)),
    assignToUser: B(u(e.assign_to_user ?? e.assignToUser)),
    claim: B(u(e.claim)),
    openEditor: B(u(e.open_editor ?? e.openEditor))
  };
}
function Ie(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    variantId: n(e.variant_id),
    targetRecordId: n(e.target_record_id),
    sourceLocale: n(e.source_locale),
    targetLocale: n(e.target_locale),
    workScope: n(e.work_scope),
    assignmentType: n(e.assignment_type),
    status: n(e.status) || n(e.queue_state),
    assigneeId: n(e.assignee_id),
    assigneeLabel: n(e.assignee_label),
    reviewerId: n(e.reviewer_id),
    reviewerLabel: n(e.reviewer_label),
    priority: n(e.priority),
    dueDate: n(e.due_date),
    dueState: n(e.due_state),
    rowVersion: _(e.row_version ?? e.version),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    links: ha(u(e.links)),
    actions: te(u(e.actions))
  };
}
function ba(e) {
  const a = n(e.href);
  return a ? {
    href: a,
    label: n(e.label) || "Open editor",
    description: n(e.description),
    relation: n(e.relation),
    entityType: n(e.entity_type),
    entityId: n(e.entity_id)
  } : null;
}
function ha(e) {
  return { editor: ba(u(e.editor)) };
}
function xa(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? Ie(u(e.assignment)) : null,
    actions: te(u(e.actions))
  };
}
function _a(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const r = n(t).toLowerCase();
    r && (a[r] = xa(u(s)));
  }
  return a;
}
function Re(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? ye(u(t.source_variant)) : null, r = Array.isArray(t.blockers) ? t.blockers.map((y) => ga(u(y))) : [], i = Array.isArray(t.locale_variants) ? t.locale_variants.map((y) => ye(u(y))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((y) => Ie(u(y))) : [], c = _a(u(t.locale_assignments ?? t.localeAssignments)), l = u(t.publish_gate), m = u(t.readiness_summary), p = ae(u(t.quick_create), {
    missingLocales: b(m.missing_locales),
    recommendedLocale: n(m.recommended_locale),
    requiredForPublish: b(m.required_for_publish ?? m.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: N(t.readiness_state),
    sourceVariant: s,
    localeVariants: i,
    blockers: r,
    activeAssignments: o,
    localeAssignments: c,
    publishGate: {
      allowed: h(l.allowed),
      overrideAllowed: h(l.override_allowed),
      blockedBy: b(l.blocked_by),
      reviewRequired: h(l.review_required)
    },
    readinessSummary: {
      state: N(m.state),
      requiredLocales: b(m.required_locales),
      missingLocales: b(m.missing_locales),
      availableLocales: b(m.available_locales),
      blockerCodes: b(m.blocker_codes),
      missingRequiredLocaleCount: _(m.missing_required_locale_count),
      pendingReviewCount: _(m.pending_review_count),
      outdatedLocaleCount: _(m.outdated_locale_count),
      publishReady: h(m.publish_ready)
    },
    quickCreate: p
  };
}
function j(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const r = n(s).toLowerCase();
    r && a.add(r);
  }
  return Array.from(a).sort();
}
function Te(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function se(e) {
  return j(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function va(e) {
  return e.blockers.some(ie);
}
function ne(e, a) {
  const t = n(a).toLowerCase();
  return !t || va(e) ? !1 : se(e).includes(t);
}
function La(e, a) {
  const t = se(e), s = n(a).toLowerCase(), r = ne(e, s);
  return {
    ...e.quickCreate,
    enabled: r,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: r ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: r ? "" : e.quickCreate.disabledReasonCode
  };
}
function Rt(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = n(a.locale).toLowerCase(), s = e.localeVariants.some((l) => l.locale === t) ? e.localeVariants.map((l) => l.locale === t ? {
    ...l,
    id: l.id || a.variantId,
    status: a.status || l.status
  } : { ...l }) : [...e.localeVariants.map((l) => ({ ...l })), {
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
  }].sort((l, m) => l.locale.localeCompare(m.locale));
  let r = e.activeAssignments.map((l) => ({ ...l }));
  if (a.assignment) {
    const l = {
      id: a.assignment.assignmentId,
      familyId: e.familyId,
      variantId: a.variantId,
      targetRecordId: "",
      sourceLocale: e.sourceLocale,
      targetLocale: a.assignment.targetLocale || t,
      workScope: a.assignment.workScope || e.quickCreate.defaultAssignment.workScope,
      assignmentType: "",
      status: a.assignment.status,
      assigneeId: a.assignment.assigneeId,
      assigneeLabel: a.assignment.assigneeId,
      reviewerId: "",
      reviewerLabel: "",
      priority: a.assignment.priority,
      dueDate: a.assignment.dueDate,
      dueState: "",
      rowVersion: 0,
      createdAt: "",
      updatedAt: "",
      links: { editor: null },
      actions: te({})
    }, m = r.findIndex((p) => p.id === l.id || p.targetLocale === l.targetLocale);
    m >= 0 ? r[m] = l : r = [...r, l].sort((p, y) => p.targetLocale.localeCompare(y.targetLocale));
  }
  const i = e.blockers.map((l) => ({ ...l })).filter((l) => !(l.blockerCode === "missing_locale" && l.locale === t)), o = j(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = Te(j(e.readinessSummary.missingLocales, a.family.missingLocales), t);
  return {
    ...e,
    readinessState: a.family.readinessState,
    localeVariants: s,
    blockers: i,
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
      availableLocales: o,
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
function Tt(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, r = n(a.locale).toLowerCase(), i = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const c = j(b(t.available_locales), b(s.available_locales), a.family.availableLocales, [r]), l = Te(j(b(t.missing_required_locales), b(s.missing_required_locales), a.family.missingLocales), r);
  return t.available_locales = c, t.missing_required_locales = l, t.translation_family_id = o || a.familyId, s.family_id = o || a.familyId, s.state = a.family.readinessState, s.available_locales = c, s.missing_required_locales = l, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
  }, t.translation_readiness = s, i && i === r && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = r), t;
}
function wa(e) {
  const a = N(e);
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
function re(e) {
  const a = wa(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ca(e) {
  const a = await O(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = G(e.headers), t.metadata = u(a.metadata), t;
}
async function Pe(e) {
  const a = await O(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = G(e.headers), t.metadata = u(a.metadata), t;
}
async function $a(e, a = {}, t = {}) {
  const s = n(e.endpoint);
  if (!s) throw new Error("Assignment action endpoint is unavailable.");
  const r = {
    ...e.payload,
    ...a
  };
  e.expectedVersion > 0 && r.expected_version == null && r.expectedVersion == null && (r.expected_version = e.expectedVersion);
  const i = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), o = {
    method: "POST",
    credentials: "same-origin",
    headers: i,
    body: JSON.stringify(r)
  };
  K(s, o, i);
  const c = await (t.fetch ? t.fetch(s, o) : Z(s, o));
  if (!c.ok) throw await Pe(c);
  return he(c);
}
function ka(e) {
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
function Sa(e) {
  return H(ka(e));
}
function Aa(e) {
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
function Fe(e) {
  return H(Aa(e));
}
function qa(e) {
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
function Ee(e) {
  return H(qa(e));
}
function $(e, a) {
  return n(e[a]);
}
function ie(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = $(e.details, "reason").toLowerCase(), t = $(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!($(e.details, "content_type") || $(e.details, "environment")), r = !!($(e.details, "message") || $(e.details, "policy_reason"));
  return s && !a && !r;
}
function Ia(e) {
  return ie(e) ? "Policy unavailable" : k(e.blockerCode);
}
function Ra(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", $(a, "content_type")],
    ["Environment", $(a, "environment")]
  ], s = $(a, "reason"), r = $(a, "message"), i = $(a, "remediation");
  return ie(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), r && r !== s && t.push(["Message", r]), i && t.push(["Remediation", i]), t.filter(([, o]) => o.trim() !== "");
}
function Ta(e) {
  const a = Ra(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${d(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${d(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function Pa(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function De(e) {
  return H(Pa(e));
}
function Fa(e, a, t) {
  const s = R(e), r = n(t.sourceRecordId);
  return !s || !r || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(r)}?locale=${encodeURIComponent(t.locale)}`;
}
function Ue(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Ne(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function Ea(e, a, t = "") {
  const s = n(a).toLowerCase();
  if (!s) return null;
  const r = Ne(s, t);
  if (e.localeAssignments[r]) return e.localeAssignments[r];
  for (const [i, o] of Object.entries(e.localeAssignments)) if (i.startsWith(`${s}:`)) return o;
  return null;
}
function je(e) {
  return e && (e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function Oe(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function Da(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function Ua(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${f(e.state)}">No active assignment.</p>`;
  const t = a.dueState || Ue(a.dueDate), s = t === "none" ? "No due date" : k(t);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${f(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Fe(a.status)}">${d(k(a.status))}</span>
      <span>${d(je(a))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${d(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${De(t)}">${d(s)}</span>
    </div>
  `;
}
function Na(e) {
  if (!e || e.state === "source_locale") return "";
  const a = Ne(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled && s.push(`
      <button type="button" class="${I}" data-family-assign-to-me="true" data-locale-assignment-key="${f(a)}">
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex min-w-[16rem] flex-wrap items-center gap-2">
        <input
          type="text"
          class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
          data-family-assignee-input="${f(a)}"
          placeholder="Assignee ID"
          aria-label="Assignee ID"
        >
        <button type="button" class="${I}" data-family-assign-to-user="true" data-locale-assignment-key="${f(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${I}" data-family-claim-assignment="true" data-locale-assignment-key="${f(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${f(a)}"
        href="${f(t.openEditor.href)}"
      >${d(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex flex-wrap items-center justify-end gap-2">${s.join("")}</div>`;
  const r = Oe(e);
  return r ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${f(a)}">${d(r)}</p>` : "";
}
function ja(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => Da(a)).sort(([a], [t]) => a.localeCompare(t));
}
function Oa(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${k(s.status)} state.`,
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
    const i = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: r,
      title: `${s.targetLocale.toUpperCase()} assignment ${k(s.status)}`,
      detail: `${i} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, r) => r.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function Ba(e) {
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
function Ma(e, a) {
  const t = R(a.contentBasePath || `${R(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, r = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", i = (c) => {
    const l = !ne(e, c);
    return `
      <button
        type="button"
        class="${F}${l ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${f(c)}"
        ${l ? 'aria-disabled="true"' : ""}
        title="${f(l ? r : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, o = e.localeVariants.map((c) => {
    const l = Fa(t, e, c), m = Ea(e, c.locale), p = l ? `<a href="${f(l)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', y = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Sa(c.status)}">${d(k(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(y)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(ee(c.updatedAt || c.createdAt)) || "n/a"}</p>
          ${Ua(m)}
        </div>
        <div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          ${Na(m)}
          ${p}
        </div>
      </li>
    `;
  });
  for (const c of s) o.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6">
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
    <section class="${U} p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-gray-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-gray-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${o.join("") || '<li class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function za(e) {
  if (!e.activeAssignments.length) {
    const a = ja(e);
    return `
      <section class="${U} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto_auto] lg:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" data-family-assignment-locale-select="true">
                ${a.map(([t, s]) => `
                  <option value="${f(t)}">${d(s.locale.toUpperCase())} · ${d(s.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              <input type="text" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" data-family-assignee-input="__empty_panel__" placeholder="Assignee ID">
            </label>
            <button type="button" class="${I}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel">
              Assign to me
            </button>
            <button type="button" class="${F}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel">
              Assign
            </button>
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${d(Oe(Object.values(e.localeAssignments).find((t) => t.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${U} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Ue(a.dueDate), s = t === "none" ? "No due date" : k(t), r = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Fe(a.status)}">${d(k(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${De(t)}">${d(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${d(je(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${d(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${d(ee(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${r ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${f(a.id)}"
                    href="${f(r.href)}"
                    title="${f(r.description || r.label)}"
                  >${d(r.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function Va(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ee(t.blockerCode)}">${d(Ia(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
              </div>
              ${Ta(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${U} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${re(e.readinessState)}
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
function Ka(e) {
  const a = Oa(e);
  return `
    <section class="${U} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(ee(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function V(e) {
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
function Be(e) {
  return `
    <div class="${Xe}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function W(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${Je} p-8 text-center shadow-sm">
        <h2 class="${Ze}">${d(e)}</h2>
        <p class="${Qe} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function Ha(e, a, t) {
  const s = t.syncRecovery, r = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${F}"
        data-family-sync-action="true"
        data-family-sync-rpc="${f(s.rpcInvokePath)}"
        data-family-sync-command="${f(s.commandName)}"
        data-family-sync-family-id="${f(s.familyId)}"
        data-family-sync-environment="${f(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", i = t.syncMessage ? d(t.syncMessage) : "";
  return `
    <div class="${we} p-6" role="alert">
      <h2 class="${Le}">${d(e)}</h2>
      <p class="${_e} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${i ? "" : "hidden"}
      >${i}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${I}">
          Reload family detail
        </button>
        ${r}
      </div>
    </div>
  `;
}
function Ga(e, a = {}) {
  if (e.status === "loading") return Be("Loading translation family...");
  if (e.status === "empty") return `
      ${W("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${V(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${Ha(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${V(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return W("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, r = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(k).join(", ") : "No blockers", i = se(t), o = t.quickCreate.recommendedLocale || i[0] || "", c = !ne(t, o), l = o ? `
      <button
        type="button"
        class="${F}${c ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${f(o)}"
        ${c ? 'aria-disabled="true"' : ""}
        title="${f(c ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${o.toUpperCase()} locale`)}"
      >
        Create ${d(o.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${f(t.familyId)}" data-readiness-state="${f(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${Ye}">Translation family</p>
            <h1 class="${Ke} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${re(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(r)}</span>
            ${l}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Ba(t)}
        </div>
        ${V(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Ma(t, a)}
          ${za(t)}
        </div>
        <div class="space-y-6">
          ${Va(t)}
          ${Ka(t)}
        </div>
      </div>
    </div>
  `;
}
async function fe(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : Z(t, { headers: { Accept: "application/json" } })), r = n(s.headers.get("x-request-id")), i = G(s.headers);
    if (!s.ok) {
      const c = await O(s), l = u(c.metadata?.sync_recovery), m = c.textCode === "NOT_FOUND" || h(l.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: c.message,
        requestId: r,
        traceId: i,
        statusCode: s.status,
        errorCode: c.textCode,
        syncRecovery: m ? aa(l, { familyId: n(c.metadata?.family_id) }) : null
      };
    }
    const o = Re(u(await s.json()));
    return o.familyId ? {
      status: "ready",
      detail: o,
      requestId: r,
      traceId: i,
      statusCode: s.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: r,
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
function Ya(e) {
  const a = xe(), t = a ? P(a, "channel") : "";
  if (t) return t;
  try {
    return P(new URL(n(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function M(e, a, t = {}) {
  e.innerHTML = Ga(a, t);
}
var Qa = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function Ja(e) {
  const a = e ?? new URLSearchParams();
  return Y({
    channel: P(a, "channel") || "",
    contentType: P(a, "content_type") || "",
    readinessState: P(a, "readiness_state") || "",
    blockerCode: P(a, "blocker_code") || "",
    missingLocale: P(a, "missing_locale") || "",
    page: de(a, "page") || 1,
    perPage: de(a, "per_page") || 50
  });
}
function Xa(e = globalThis.location) {
  return Ja(xe(e));
}
function Wa(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of Qa) t.delete(s);
  return $e(a).forEach((s, r) => t.set(r, s)), t.toString();
}
function Za(e, a = "/admin") {
  const t = R(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${R(a || "/admin")}/api`;
}
function oe(e = "/admin") {
  return `${R(e || "/admin")}/translations/families`;
}
function et(e, a, t = "") {
  const s = R(e || oe("/admin")), r = new URLSearchParams();
  return q(r, "channel", t), D(`${s}/${encodeURIComponent(n(a))}`, r);
}
function Me(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [r, i] of Object.entries(a)) q(s, r, i);
  return D(t, s);
}
function at(e, a, t = {}) {
  return Me(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function tt(e, a, t = {}) {
  return Me(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function st(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function A(e, a, t) {
  return `<option value="${f(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function nt(e) {
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
            ${A("", "Any", e.readinessState)}
            ${A("blocked", "Blocked", e.readinessState)}
            ${A("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${A("", "Any", e.blockerCode)}
            ${A("missing_locale", "Missing locale", e.blockerCode)}
            ${A("missing_field", "Missing field", e.blockerCode)}
            ${A("pending_review", "Pending review", e.blockerCode)}
            ${A("outdated_source", "Outdated source", e.blockerCode)}
            ${A("policy_denied", "Policy issue", e.blockerCode)}
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
  ].map((t) => A(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${F} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${f(e.page)}">
    </form>
  `;
}
function pe(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function rt(e) {
  if (!e.blockerCodes.length) return '<span class="text-gray-400">No blockers</span>';
  const a = /* @__PURE__ */ new Set(), t = e.blockerCodes.map((s) => {
    const r = e.blockerLabels[s] || k(s);
    return a.add(r.toLowerCase()), {
      code: s,
      label: r
    };
  });
  for (const [s, r] of Object.entries(e.blockerLabels)) {
    const i = r.toLowerCase();
    e.blockerCodes.includes(s) || a.has(i) || (a.add(i), t.push({
      code: n(s),
      label: r
    }));
  }
  return t.map(({ code: s, label: r }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ee(s)}">${d(r)}</span>`).join(" ");
}
function X(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function it(e, a, t) {
  const s = t.familyBasePath || oe(t.basePath || "/admin");
  return e.map((r) => {
    const i = et(s, r.familyId, a.channel), o = t.matrixPath ? at(t.matrixPath, r, a) : "", c = t.queuePath ? tt(t.queuePath, r, a) : "", l = st(r);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${f(r.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${f(i)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(l)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(r.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(r.contentType || "unknown")} · Source ${d(r.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${re(r.readinessState)}</td>
        <td class="px-4 py-4 align-top">${rt(r)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${X(r.missingRequiredLocaleCount, "Missing", r.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${X(r.pendingReviewCount, "Review", r.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${X(r.outdatedLocaleCount, "Outdated", r.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${pe(r.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${pe(r.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${f(i)}" class="${F} text-center" data-family-primary-action="true">Open family</a>
            ${o ? `<a href="${f(o)}" class="${I} text-center">Matrix</a>` : ""}
            ${c ? `<a href="${f(c)}" class="${ve} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function ot(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, r = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), i = e.page > 1, o = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${d(s)}-${d(r)} of ${d(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${I}" data-family-list-page="prev" ${i ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${d(e.page)}</span>
          <button type="button" class="${I}" data-family-list-page="next" ${o ? "" : "disabled"}>Next</button>
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
            ${it(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function lt(e) {
  return `
    <div class="${we} mt-6 p-6" role="alert">
      <h2 class="${Le}">Families failed to load</h2>
      <p class="${_e} mt-2">${d(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${d(e.requestURL)}</p>` : ""}
      ${V({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${I}">Retry</button>
    </div>
  `;
}
function ct(e, a = {}) {
  const t = e.filters, s = nt(t);
  if (e.status === "loading") return `${s}${Be("Loading translation families...")}`;
  if (e.status === "error") return `${s}${lt(e)}`;
  const r = e.response;
  return !r || e.status === "empty" || r.items.length === 0 ? `${s}${W("No translation families found", "No families match the current filters.")}` : `${s}${ot(r, t, a)}`;
}
function ge(e, a, t = {}) {
  e.innerHTML = ct(a, t);
}
async function dt(e, a, t = {}) {
  const s = ke(Za(e, t.basePath), a), r = t.fetch;
  try {
    const i = await (r ? r(s, { headers: { Accept: "application/json" } }) : Z(s, { headers: { Accept: "application/json" } })), o = n(i.headers.get("x-request-id")), c = G(i.headers);
    if (!i.ok) {
      const m = await O(i);
      return {
        status: "error",
        filters: a,
        message: m.message,
        requestURL: s,
        requestId: o,
        traceId: c,
        statusCode: i.status,
        errorCode: m.textCode
      };
    }
    const l = qe(u(await i.json()));
    return {
      status: l.items.length ? "ready" : "empty",
      filters: a,
      response: l,
      requestURL: s,
      requestId: o,
      traceId: c,
      statusCode: i.status
    };
  } catch (i) {
    return {
      status: "error",
      filters: a,
      message: i instanceof Error ? i.message : "Failed to load translation families.",
      requestURL: s
    };
  }
}
function be(e, a) {
  const t = new FormData(e), s = (i, o) => t.has(i) ? n(t.get(i)) : o, r = (i, o) => t.has(i) ? _(t.get(i), o) : o;
  return Y({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: r("page", a.page),
    perPage: r("per_page", a.perPage)
  });
}
function mt(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = Wa(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function Pt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  s.familyBasePath || (s.familyBasePath = oe(s.basePath));
  let r = Xa(), i = null;
  const o = async (c, l = !1) => {
    r = Y(c), l && mt(r), ge(e, {
      status: "loading",
      filters: r
    }, s);
    const m = await dt(n(s.endpoint), r, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return i = m, ge(e, m, s), ut(e, m, o), m;
  };
  return i = await o(r, !1), i;
}
function ut(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (r) => {
    r.preventDefault(), t({
      ...be(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((r) => {
    r.addEventListener("change", () => {
      t({
        ...be(s, a.filters),
        page: 1
      }, !0);
    });
  })), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
    t(a.filters, !1);
  }), e.querySelectorAll("[data-family-list-page]").forEach((r) => {
    r.addEventListener("click", () => {
      if (r.disabled) return;
      const i = r.dataset.familyListPage === "next" ? 1 : -1;
      t({
        ...a.filters,
        page: Math.max(1, a.filters.page + i)
      }, !0);
    });
  });
}
function v(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function yt(e, a) {
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
function ft(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function pt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function gt(e, a, t, s) {
  const r = n(e.locale).toLowerCase(), i = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return i && i === r && o ? o : r && a[r] ? a[r] : o;
}
function ze(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    v("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), r = t.missingLocales.includes(s) ? s : t.missingLocales[0], i = a.createElement("div");
  i.className = Ge, i.setAttribute("data-translation-create-locale-modal", "true"), i.innerHTML = `
    <div class="${He}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${ve}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((x) => `
                <option value="${f(x)}" ${x === r ? "selected" : ""}>
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
  ].map((x) => `
                  <option value="${x}" ${x === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${k(x)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${f(ft(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${I}">Cancel</button>
          <button type="submit" class="${F}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(i);
  const o = i.querySelector('[role="dialog"]'), c = i.querySelector("form"), l = i.querySelector('select[name="locale"]'), m = i.querySelector('input[name="auto_create_assignment"]'), p = i.querySelector('input[name="assignee_id"]'), y = i.querySelector('select[name="priority"]'), g = i.querySelector('input[name="due_date"]'), w = i.querySelector('[data-assignment-fields="true"]'), L = i.querySelector('[data-create-locale-feedback="true"]'), S = i.querySelector('button[type="submit"]'), C = () => {
    T(), i.remove();
  }, E = () => {
    !w || !m || (w.hidden = !m.checked);
  }, T = o ? We(o, C) : () => {
  };
  E(), m?.addEventListener("change", E), i.querySelectorAll('[data-close-modal="true"]').forEach((x) => {
    x.addEventListener("click", C);
  }), i.addEventListener("click", (x) => {
    x.target === i && C();
  }), c?.addEventListener("submit", async (x) => {
    if (x.preventDefault(), !l || !S) return;
    L && (L.hidden = !0, L.textContent = ""), S.disabled = !0, S.classList.add("opacity-60", "cursor-not-allowed");
    const le = n(l.value).toLowerCase();
    try {
      const J = await e.onSubmit({
        locale: le,
        autoCreateAssignment: m?.checked,
        assigneeId: p?.value,
        priority: y?.value,
        dueDate: pt(g?.value || "")
      });
      C(), await e.onSuccess?.(J);
    } catch (J) {
      const ce = yt(J, le);
      L && (L.hidden = !1, L.textContent = ce), v("error", ce);
    } finally {
      S.disabled = !1, S.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function bt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: ae(ue(e.dataset.quickCreate, {}), {}),
    localeURLs: ue(e.dataset.localeUrls, {})
  };
}
function Ft(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = bt(a), s = Ve({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((r) => {
      r.addEventListener("click", (i) => {
        i.preventDefault();
        const o = n(r.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        ze({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            v("success", `${c.locale.toUpperCase()} locale created.`);
            const l = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = gt(c, t.localeURLs, t.requestedLocale, l);
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
function ht(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (n(a.dataset.localeAssignmentSource) === "empty-panel" ? n(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function xt(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function _t(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-input="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-input]"))) if (n(s.dataset.familyAssigneeInput).toLowerCase() === a) return s;
  return null;
}
async function z(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), r = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  M(e, { status: "loading" }, r);
  const i = await fe(s, { fetch: a.fetch });
  M(e, i, r);
  const o = Ya(s);
  if (typeof e.querySelector == "function") {
    if (i.status === "ready" && i.detail) {
      const m = Ve({
        basePath: `${R(r.basePath || "/admin")}/api`,
        fetch: a.fetch
      });
      e.querySelectorAll('[data-family-create-locale="true"]').forEach((y) => {
        y.dataset.translationCreateBound !== "true" && (y.dataset.translationCreateBound = "true", y.addEventListener("click", (g) => {
          g.preventDefault();
          const w = i.detail;
          if (!w) {
            v("error", "Translation family detail is unavailable.");
            return;
          }
          if (y.getAttribute("aria-disabled") === "true") {
            v("warning", w.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const L = n(y.dataset.locale).toLowerCase() || w.quickCreate.recommendedLocale || "", S = La(w, L);
          ze({
            familyId: w.familyId,
            quickCreate: S,
            initialLocale: L,
            heading: `Create ${L.toUpperCase()} locale`,
            onSubmit: (C) => m.createLocale(w.familyId, {
              ...C,
              channel: o
            }),
            onSuccess: async (C) => {
              v("success", `${C.locale.toUpperCase()} locale created.`), await z(e, {
                ...a,
                ...r,
                endpoint: s
              });
            }
          });
        }));
      });
      const p = async (y, g) => {
        const w = i.detail;
        if (!w) {
          v("error", "Translation family detail is unavailable.");
          return;
        }
        const L = ht(e, y), S = L ? w.localeAssignments[L] : null;
        if (!S) {
          v("error", "Assignment action metadata is unavailable.");
          return;
        }
        const C = xt(S, g);
        if (!C.enabled) {
          v("warning", C.reason || "Assignment action is unavailable.");
          return;
        }
        const E = {};
        if (g === "user") {
          const T = _t(e, L, y), x = n(T?.value);
          if (!x) {
            v("warning", "Assignee ID is required."), T?.focus();
            return;
          }
          E.assignee_id = x;
        }
        g !== "claim" && o && (E.channel = o), y.disabled = !0, y.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await $a(C, E, { fetch: a.fetch }), v("success", g === "claim" ? "Assignment claimed." : "Assignment updated."), await z(e, {
            ...a,
            ...r,
            endpoint: s
          });
        } catch (T) {
          v("error", T instanceof Error ? T.message : "Failed to update assignment."), y.disabled = !1, y.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((y) => {
        y.addEventListener("click", (g) => {
          g.preventDefault(), p(y, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((y) => {
        y.addEventListener("click", (g) => {
          g.preventDefault(), p(y, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((y) => {
        y.addEventListener("click", (g) => {
          g.preventDefault(), p(y, "claim");
        });
      });
    }
    const c = () => {
      const m = e.querySelector(".ui-state-retry-btn");
      m && m.addEventListener("click", () => {
        z(e, {
          ...a,
          ...r,
          endpoint: s
        });
      });
    };
    c();
    const l = e.querySelector('[data-family-sync-action="true"]');
    l && i.syncRecovery?.canSync && l.addEventListener("click", async (m) => {
      m.preventDefault(), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const p = i.syncRecovery;
        if (!p) return;
        await ra(p, {
          fetch: a.fetch,
          correlationId: i.requestId || ""
        });
        const y = await fe(s, { fetch: a.fetch });
        if (y.status === "error" && (y.errorCode === "NOT_FOUND" || y.statusCode === 404)) {
          M(e, {
            ...y,
            syncRecovery: p,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, r), c();
          return;
        }
        if (y.status !== "ready") {
          const g = y.message || "Sync completed, but family detail reload failed.";
          M(e, {
            ...y,
            syncRecovery: p,
            syncStatus: "failed",
            syncMessage: g
          }, r), c(), v("error", g);
          return;
        }
        v("success", "Translation families synced."), await z(e, {
          ...a,
          ...r,
          endpoint: s
        });
      } catch (p) {
        const y = p instanceof Error ? p.message : "Failed to sync translation families.", g = e.querySelector('[data-family-sync-feedback="true"]');
        g && (g.hidden = !1, g.textContent = y), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed"), v("error", y);
      }
    });
  }
  return i;
}
function Ve(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = R(e.basePath || "/admin/api");
  async function s(r) {
    return he(r);
  }
  return {
    async list(r = {}) {
      return qe(await s(await a(ke(t, r), { headers: { Accept: "application/json" } })));
    },
    async detail(r, i = "") {
      return Re(await s(await a(ia(t, r, i), { headers: { Accept: "application/json" } })));
    },
    async createLocale(r, i = {}) {
      const o = fa({
        ...i,
        familyId: r,
        basePath: t
      }), c = new Headers(o.headers), l = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(la(o.request))
      };
      K(o.endpoint, l, c);
      const m = await a(o.endpoint, l);
      if (!m.ok) throw await Ca(m);
      return ya(await s(m));
    },
    async createAssignment(r, i = {}) {
      const o = Ae(i), c = ca(t, r, o.channel), l = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && l.set("X-Idempotency-Key", o.idempotencyKey);
      const m = {
        method: "POST",
        credentials: "same-origin",
        headers: l,
        body: JSON.stringify(da(o))
      };
      K(c, m, l);
      const p = await a(c, m);
      if (!p.ok) throw await Pe(p);
      return s(p);
    }
  };
}
export {
  Rt as applyCreateLocaleToFamilyDetail,
  Tt as applyCreateLocaleToSummaryState,
  oa as buildCreateLocaleURL,
  Oa as buildFamilyActivityPreview,
  ca as buildFamilyAssignmentURL,
  et as buildFamilyDetailUIURL,
  ia as buildFamilyDetailURL,
  Wa as buildFamilyListBrowserSearch,
  $e as buildFamilyListQuery,
  ke as buildFamilyListURL,
  at as buildFamilyMatrixURL,
  tt as buildFamilyQueueURL,
  ta as buildTranslationFamilySyncRPCRequest,
  Y as createFamilyFilters,
  fa as createTranslationCreateLocaleActionModel,
  Se as createTranslationCreateLocaleRequest,
  Ae as createTranslationFamilyAssignmentRequest,
  Ve as createTranslationFamilyClient,
  ra as dispatchTranslationFamilySync,
  fe as fetchTranslationFamilyDetailState,
  dt as fetchTranslationFamilyListState,
  wa as getReadinessChip,
  z as initTranslationFamilyDetailPage,
  Pt as initTranslationFamilyListPage,
  Ft as initTranslationSummaryCards,
  ya as normalizeCreateLocaleResult,
  Re as normalizeFamilyDetail,
  qe as normalizeFamilyListResponse,
  pa as normalizeFamilyListRow,
  ae as normalizeQuickCreateHints,
  aa as normalizeTranslationFamilySyncRecoveryCapability,
  Ja as parseFamilyListFiltersFromSearchParams,
  Xa as readFamilyListFiltersFromLocation,
  re as renderReadinessChip,
  M as renderTranslationFamilyDetailPage,
  Ga as renderTranslationFamilyDetailState,
  ge as renderTranslationFamilyListPage,
  ct as renderTranslationFamilyListState,
  la as serializeCreateLocaleRequest,
  da as serializeFamilyAssignmentRequest,
  ft as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map