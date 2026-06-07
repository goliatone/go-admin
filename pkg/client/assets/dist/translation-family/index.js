import { escapeAttribute as g, escapeHTML as m } from "../shared/html.js";
import { appendCSRFHeader as H, httpRequest as Y, readHTTPJSON as re } from "../shared/transport/http-client.js";
import { extractStructuredError as j } from "../toast/error-helpers.js";
import { buildURL as E, getNumberSearchParam as _e, getStringSearchParam as P, readLocationSearchParams as Te, setNumberSearchParam as we, setSearchParam as T } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as $ } from "../shared/path-normalization.js";
import { parseJSONValue as Le } from "../shared/json-parse.js";
import { asLooseBoolean as L, asNumberish as w, asRecord as y, asString as n, asStringArray as x } from "../shared/coercion.js";
import { A as Ie, C as B, D as ra, E as oa, F as la, O as Re, P as ca, R as da, T as ma, dt as Q, et as ua, ht as fa, k as Pe, tt as ya, v as Ee, x as I, y as F } from "../chunks/translation-shared-CdZJJA93.js";
import { formatTranslationTimestampUTC as oe, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as ga } from "../shared/record-normalization.js";
function pa(e, a = {}) {
  const t = y(e), s = L(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), c = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !o ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: o,
    environment: c,
    familyId: i
  };
}
function ba(e, a = "") {
  const t = n(a), s = ha(e);
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
function ha(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function xa(e, a) {
  const t = y(e);
  return Object.keys(t).length === 0 || !L(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function va(e, a = {}) {
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
    body: JSON.stringify(ba(e, a.correlationId))
  };
  H(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const f = await j(r);
    throw new Error(f.message || "Failed to sync translation families.");
  }
  const o = y(await r.json().catch(() => ({}))), c = y(o.error);
  if (Object.keys(c).length > 0) throw new Error(n(c.message) || "Failed to sync translation families.");
  const d = y(o.data), l = xa(d.receipt, e.commandName);
  if (!l) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...d,
    receipt: l
  };
}
function J(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function N(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Fe(e) {
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
function W(e = {}) {
  const a = n(e.channel);
  return {
    contentType: n(e.contentType),
    readinessState: n(e.readinessState),
    blockerCode: n(e.blockerCode),
    missingLocale: n(e.missingLocale),
    page: Math.max(1, w(e.page, 1)),
    perPage: Math.max(1, w(e.perPage, 50)),
    channel: a
  };
}
function Ue(e = {}) {
  const a = W(e), t = new URLSearchParams();
  return T(t, "content_type", a.contentType), T(t, "readiness_state", a.readinessState), T(t, "blocker_code", a.blockerCode), T(t, "missing_locale", a.missingLocale), T(t, "channel", a.channel), we(t, "page", a.page, { min: 1 }), we(t, "per_page", a.perPage, { min: 1 }), t;
}
function X(e, a = "", t = "") {
  const s = $(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function De(e, a = {}) {
  return E(X(e), Ue(a));
}
function _a(e, a, t = "") {
  const s = new URLSearchParams();
  return T(s, "channel", t), E(X(e, a), s);
}
function Be(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: L(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function wa(e, a, t = "") {
  const s = new URLSearchParams();
  return T(s, "channel", t), E(X(e, a, "/variants"), s);
}
function La(e = {}) {
  const a = Be(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Ne(e = {}) {
  return {
    targetLocale: n(e.targetLocale).toLowerCase(),
    assigneeId: n(e.assigneeId),
    openPool: L(e.openPool),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    workScope: n(e.workScope),
    channel: n(e.channel),
    idempotencyKey: n(e.idempotencyKey)
  };
}
function Ca(e, a, t = "") {
  const s = new URLSearchParams();
  return T(s, "channel", t), E(X(e, a, "/assignments"), s);
}
function $a(e = {}) {
  const a = Ne(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function Aa(e) {
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
function Sa(e) {
  return {
    autoCreateAssignment: L(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function le(e, a = {}) {
  const t = y(e.default_assignment), s = x(e.missing_locales ?? a.missingLocales), i = x(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? L(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: Sa({
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
function ka(e) {
  const a = y(e.data), t = y(e.meta), s = y(t.family), i = y(t.refresh), r = y(a.navigation), o = le(y(s.quick_create), { missingLocales: x(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Aa(y(a.assignment)) : null,
    idempotencyHit: L(t.idempotency_hit),
    assignmentReused: L(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: N(s.readiness_state),
      missingRequiredLocaleCount: w(s.missing_required_locale_count),
      pendingReviewCount: w(s.pending_review_count),
      outdatedLocaleCount: w(s.outdated_locale_count),
      blockerCodes: x(s.blocker_codes),
      missingLocales: x(s.missing_locales),
      availableLocales: x(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: L(i.family_detail),
      familyList: L(i.family_list),
      contentSummary: L(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function qa(e) {
  const a = n(e.familyId), t = Be(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: wa(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Ta(e) {
  const a = {};
  for (const [t, s] of Object.entries(y(e.blocker_labels))) {
    const i = n(t), r = n(s);
    i && r && (a[i] = r);
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
    missingRequiredLocaleCount: w(e.missing_required_locale_count),
    pendingReviewCount: w(e.pending_review_count),
    outdatedLocaleCount: w(e.outdated_locale_count),
    blockerCodes: x(e.blocker_codes).map(Fe),
    blockerLabels: a,
    missingLocales: x(e.missing_locales),
    availableLocales: x(e.available_locales)
  };
}
function Oe(e) {
  const a = y(e.data), t = y(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => Ta(y(o))),
    total: w(i.total),
    page: w(i.page, 1),
    perPage: w(i.per_page, 50),
    channel: n(i.channel)
  };
}
function Ce(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: L(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: ga(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Ia(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Fe(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: y(e.details)
  };
}
function M(e) {
  const a = y(e.link);
  return {
    enabled: L(e.enabled),
    permission: n(e.permission),
    endpoint: n(e.endpoint),
    href: n(e.href || a.href),
    label: n(e.label || a.label),
    reason: n(e.reason),
    reasonCode: n(e.reason_code ?? e.reasonCode),
    requiredFields: x(e.required_fields ?? e.requiredFields),
    payload: y(e.payload),
    assignmentId: n(e.assignment_id ?? e.assignmentId),
    expectedVersion: w(e.expected_version ?? e.expectedVersion)
  };
}
function ce(e) {
  return {
    assignToMe: M(y(e.assign_to_me ?? e.assignToMe)),
    assignToUser: M(y(e.assign_to_user ?? e.assignToUser)),
    claim: M(y(e.claim)),
    openEditor: M(y(e.open_editor ?? e.openEditor))
  };
}
function je(e) {
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
    rowVersion: w(e.row_version ?? e.version),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    links: Pa(y(e.links)),
    actions: ce(y(e.actions))
  };
}
function Ra(e) {
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
function Pa(e) {
  return { editor: Ra(y(e.editor)) };
}
function Ea(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? je(y(e.assignment)) : null,
    actions: ce(y(e.actions))
  };
}
function Fa(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const i = n(t).toLowerCase();
    i && (a[i] = Ea(y(s)));
  }
  return a;
}
function Me(e) {
  const a = y(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? Ce(y(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((u) => Ia(y(u))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((u) => Ce(y(u))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((u) => je(y(u))) : [], c = Fa(y(t.locale_assignments ?? t.localeAssignments)), d = y(t.publish_gate), l = y(t.readiness_summary), f = le(y(t.quick_create), {
    missingLocales: x(l.missing_locales),
    recommendedLocale: n(l.recommended_locale),
    requiredForPublish: x(l.required_for_publish ?? l.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: N(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: i,
    activeAssignments: o,
    localeAssignments: c,
    publishGate: {
      allowed: L(d.allowed),
      overrideAllowed: L(d.override_allowed),
      blockedBy: x(d.blocked_by),
      reviewRequired: L(d.review_required)
    },
    readinessSummary: {
      state: N(l.state),
      requiredLocales: x(l.required_locales),
      missingLocales: x(l.missing_locales),
      availableLocales: x(l.available_locales),
      blockerCodes: x(l.blocker_codes),
      missingRequiredLocaleCount: w(l.missing_required_locale_count),
      pendingReviewCount: w(l.pending_review_count),
      outdatedLocaleCount: w(l.outdated_locale_count),
      publishReady: L(l.publish_ready)
    },
    quickCreate: f
  };
}
function O(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = n(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function ze(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function de(e) {
  return O(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function Ua(e) {
  return e.blockers.some(ye);
}
function me(e, a) {
  const t = n(a).toLowerCase();
  return !t || Ua(e) ? !1 : de(e).includes(t);
}
function Ve(e, a) {
  const t = de(e), s = n(a).toLowerCase(), i = me(e, s);
  return {
    ...e.quickCreate,
    enabled: i,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: i ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: i ? "" : e.quickCreate.disabledReasonCode
  };
}
function Jt(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = n(a.locale).toLowerCase(), s = e.localeVariants.some((d) => d.locale === t) ? e.localeVariants.map((d) => d.locale === t ? {
    ...d,
    id: d.id || a.variantId,
    status: a.status || d.status
  } : { ...d }) : [...e.localeVariants.map((d) => ({ ...d })), {
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
  }].sort((d, l) => d.locale.localeCompare(l.locale));
  let i = e.activeAssignments.map((d) => ({ ...d }));
  if (a.assignment) {
    const d = {
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
      actions: ce({})
    }, l = i.findIndex((f) => f.id === d.id || f.targetLocale === d.targetLocale);
    l >= 0 ? i[l] = d : i = [...i, d].sort((f, u) => f.targetLocale.localeCompare(u.targetLocale));
  }
  const r = e.blockers.map((d) => ({ ...d })).filter((d) => !(d.blockerCode === "missing_locale" && d.locale === t)), o = O(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = ze(O(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function Wt(e, a) {
  const t = { ...e }, s = { ...y(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const c = O(x(t.available_locales), x(s.available_locales), a.family.availableLocales, [i]), d = ze(O(x(t.missing_required_locales), x(s.missing_required_locales), a.family.missingLocales), i);
  return t.available_locales = c, t.missing_required_locales = d, t.translation_family_id = o || a.familyId, s.family_id = o || a.familyId, s.state = a.family.readinessState, s.available_locales = c, s.missing_required_locales = d, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
function Da(e) {
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
function ue(e) {
  const a = Da(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ba(e) {
  const a = await j(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = J(e.headers), t.metadata = y(a.metadata), t;
}
async function fe(e) {
  const a = await j(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = J(e.headers), t.metadata = y(a.metadata), t;
}
async function te(e, a = {}, t = {}) {
  const s = n(e.endpoint);
  if (!s) throw new Error("Assignment action endpoint is unavailable.");
  const i = {
    ...e.payload,
    ...a
  };
  e.expectedVersion > 0 && i.expected_version == null && i.expectedVersion == null && (i.expected_version = e.expectedVersion);
  const r = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), o = {
    method: "POST",
    credentials: "same-origin",
    headers: r,
    body: JSON.stringify(i)
  };
  H(s, o, r);
  const c = await (t.fetch ? t.fetch(s, o) : Y(s, o));
  if (!c.ok) throw await fe(c);
  return re(c);
}
function Na(e) {
  const a = y(e), t = n(a.value || a.id || a.user_id);
  if (!t) return null;
  const s = n(a.label || a.display_name || a.username || a.email || t);
  return {
    value: t,
    label: s,
    description: n(a.description || a.email || a.username),
    displayName: n(a.display_name || a.displayName || s),
    avatarURL: n(a.avatar_url || a.avatarURL)
  };
}
function Oa(e) {
  const a = y(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), i = [];
  for (const r of t) {
    const o = Na(r);
    !o || s.has(o.value) || (s.add(o.value), i.push(o));
  }
  return i;
}
function ja(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = a.map((i) => n(i)).find(Boolean);
  return s && t.set("assignee_id", s), E(`${$(e || "/admin/api")}/translations/options/assignees`, t);
}
async function Ma(e, a = [], t = {}) {
  const s = ja(e, a), i = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : Y(s, { headers: { Accept: "application/json" } }));
  if (!i.ok) throw await fe(i);
  return Oa(await re(i));
}
function za(e) {
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
function Va(e) {
  return Q(za(e));
}
function Ka(e) {
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
function Ke(e) {
  return Q(Ka(e));
}
function Ha(e) {
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
function He(e) {
  return Q(Ha(e));
}
function A(e, a) {
  return n(e[a]);
}
function ye(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = A(e.details, "reason").toLowerCase(), t = A(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(A(e.details, "content_type") || A(e.details, "environment")), i = !!(A(e.details, "message") || A(e.details, "policy_reason"));
  return s && !a && !i;
}
function Ga(e) {
  return ye(e) ? "Policy unavailable" : S(e.blockerCode);
}
function Ya(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", A(a, "content_type")],
    ["Environment", A(a, "environment")]
  ], s = A(a, "reason"), i = A(a, "message"), r = A(a, "remediation");
  return ye(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), i && i !== s && t.push(["Message", i]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function Qa(e) {
  const a = Ya(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${m(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${m(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function Ja(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function Ge(e) {
  return Q(Ja(e));
}
function Wa(e, a, t) {
  const s = $(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function Ye(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Qe(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function Xa(e, a, t = "") {
  const s = n(a).toLowerCase();
  if (!s) return null;
  const i = Qe(s, t);
  if (e.localeAssignments[i]) return e.localeAssignments[i];
  for (const [r, o] of Object.entries(e.localeAssignments)) if (r.startsWith(`${s}:`)) return o;
  return null;
}
function Je(e) {
  return e && (e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function We(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function Za(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function et(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${g(e.state)}">No active assignment.</p>`;
  const t = a.dueState || Ye(a.dueDate), s = t === "none" ? "No due date" : S(t);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${g(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Ke(a.status)}">${m(S(a.status))}</span>
      <span>${m(Je(a))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${m(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${Ge(t)}">${m(s)}</span>
    </div>
  `;
}
function at(e) {
  if (!e || e.state === "source_locale") return "";
  const a = Qe(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled && s.push(`
      <button type="button" class="${I}" data-family-assign-to-me="true" data-locale-assignment-key="${g(a)}">
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-nowrap">
        ${ge({
    key: a,
    ariaLabel: "Assignee",
    className: `${Ze} min-w-0 flex-1 sm:w-80 sm:flex-none lg:w-96`
  })}
        <button type="button" class="${I}" data-family-assign-to-user="true" data-locale-assignment-key="${g(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${I}" data-family-claim-assignment="true" data-locale-assignment-key="${g(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${g(a)}"
        href="${g(t.openEditor.href)}"
      >${m(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end" data-family-locale-actions="true">${s.join("")}</div>`;
  const i = We(e);
  return i ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${g(a)}">${m(i)}</p>` : "";
}
function tt(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => Za(a)).sort(([a], [t]) => a.localeCompare(t));
}
function st(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${g(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${g(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function se(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${g(a || "Assignment action is unavailable.")}"`;
}
function $e(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var Xe = "block h-12 w-full rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:focus:ring-gray-600", Ze = Xe;
function ge(e) {
  const a = n(e.key), t = n(e.initialValue), s = e.enabled !== !1, i = n(e.placeholder) || "Select assignee", r = n(e.reason), o = n(e.name), c = se(s, r);
  return `
    <select
      ${o ? `name="${g(o)}"` : ""}
      class="${g(e.className || Ze)}"
      data-family-assignee-select="${g(a)}"
      data-initial-assignee-id="${g(t)}"
      data-formgen-relationship="true"
      data-endpoint-url="/api/translations/options/assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      aria-label="${g(e.ariaLabel || "Assignee")}"
      ${c}
    >
      <option value="">${m(s ? "Loading assignees..." : r || i)}</option>
      ${t ? `<option value="${g(t)}" selected>${m(t)}</option>` : ""}
    </select>
  `;
}
function nt(e, a = 5) {
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
    const i = s.updatedAt || s.createdAt;
    if (!i) continue;
    const r = s.assigneeId ? `Assigned to ${s.assigneeId}.` : "Currently unassigned.";
    t.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: `${s.targetLocale.toUpperCase()} assignment ${S(s.status)}`,
      detail: `${r} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function it(e) {
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
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">${m(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${m(a.value)}</div>
        </div>
      `).join("");
}
function rt(e, a) {
  const t = $(a.contentBasePath || `${$(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (c) => {
    const d = !me(e, c);
    return `
      <button
        type="button"
        class="${F}${d ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${g(c)}"
        ${d ? 'aria-disabled="true"' : ""}
        title="${g(d ? i : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, o = e.localeVariants.map((c) => {
    const d = Wa(t, e, c), l = Xa(e, c.locale), f = d ? `<a href="${g(d)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', u = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Va(c.status)}">${m(S(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(u)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${m(oe(c.updatedAt || c.createdAt)) || "n/a"}</p>
          ${et(l)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${at(l)}
          ${f}
        </div>
      </li>
    `;
  });
  for (const c of s) o.push(`
      <li class="flex flex-col items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6 sm:flex-row">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${m(c.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${r(c)}</div>
      </li>
    `);
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function ot(e) {
  if (!e.activeAssignments.length) {
    const a = tt(e), t = a[0]?.[1] || null, s = a.some(([, r]) => r.actions.assignToMe.enabled), i = a.some(([, r]) => r.actions.assignToUser.enabled);
    return `
      <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto_auto] 2xl:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="${Xe}" data-family-assignment-locale-select="true">
                ${a.map(([r, o]) => `
                  <option value="${g(r)}" ${st(o)}>${m(o.locale.toUpperCase())} · ${m(o.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            ${i ? `
              <label class="grid gap-2">
                <span class="text-sm font-medium text-gray-900">Assignee</span>
                ${ge({
      key: "__empty_panel__",
      enabled: !!t?.actions.assignToUser.enabled,
      reason: t?.actions.assignToUser.reason,
      ariaLabel: "Assignee"
    })}
              </label>
            ` : "<div></div>"}
            ${s ? `
              <button type="button" class="${I} w-full 2xl:w-auto${$e(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${se(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${i ? `
              <button type="button" class="${F} w-full 2xl:w-auto${$e(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${se(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${m(We(Object.values(e.localeAssignments).find((r) => r.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Ye(a.dueDate), s = t === "none" ? "No due date" : S(t), i = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${m(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ke(a.status)}">${m(S(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ge(t)}">${m(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${m(Je(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${m(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${m(oe(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${i ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${g(a.id)}"
                    href="${g(i.href)}"
                    title="${g(i.description || i.label)}"
                  >${m(i.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function lt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${He(t.blockerCode)}">${m(Ga(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${m(s)}</span>` : ""}
              </div>
              ${Qa(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${ue(e.readinessState)}
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
            <li>Available locales: <strong class="text-gray-900">${m(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
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
function ct(e) {
  const a = nt(e);
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${m(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${m(oe(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${m(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function K(e) {
  const a = [
    e.requestId ? `Request ${m(e.requestId)}` : "",
    e.traceId ? `Trace ${m(e.traceId)}` : "",
    e.errorCode ? `Code ${m(e.errorCode)}` : ""
  ].filter(Boolean);
  return a.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${a.map((t) => `<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">${t}</span>`).join("")}
    </div>
  ` : "";
}
function ea(e) {
  return `
    <div class="${da}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${m(e)}</span>
      </div>
    </div>
  `;
}
function ne(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${ma} p-8 text-center shadow-sm">
        <h2 class="${ra}">${m(e)}</h2>
        <p class="${oa} mt-2">${m(a)}</p>
      </div>
    </div>
  `;
}
function dt(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${F}"
        data-family-sync-action="true"
        data-family-sync-rpc="${g(s.rpcInvokePath)}"
        data-family-sync-command="${g(s.commandName)}"
        data-family-sync-family-id="${g(s.familyId)}"
        data-family-sync-environment="${g(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? m(t.syncMessage) : "";
  return `
    <div class="${Re} p-6" role="alert">
      <h2 class="${Ie}">${m(e)}</h2>
      <p class="${Pe} mt-2">${m(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${I}">
          Reload family detail
        </button>
        ${i}
      </div>
    </div>
  `;
}
function mt(e, a = {}) {
  if (e.status === "loading") return ea("Loading translation family...");
  if (e.status === "empty") return `
      ${ne("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${K(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${dt(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${K(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return ne("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(S).join(", ") : "No blockers", r = de(t), o = t.quickCreate.recommendedLocale || r[0] || "", c = !me(t, o), d = o ? `
      <button
        type="button"
        class="${F}${c ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${g(o)}"
        ${c ? 'aria-disabled="true"' : ""}
        title="${g(c ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${o.toUpperCase()} locale`)}"
      >
        Create ${m(o.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${g(t.familyId)}" data-readiness-state="${g(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${ca}">Translation family</p>
            <h1 class="${la} mt-2">${m(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${m(t.contentType)} · Source locale ${m(t.sourceLocale.toUpperCase())} · Family ${m(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${ue(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${m(i)}</span>
            ${d}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${it(t)}
        </div>
        ${K(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${rt(t, a)}
          ${ot(t)}
        </div>
        <div class="space-y-6">
          ${lt(t)}
          ${ct(t)}
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
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : Y(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = J(s.headers);
    if (!s.ok) {
      const c = await j(s), d = y(c.metadata?.sync_recovery), l = c.textCode === "NOT_FOUND" || L(d.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: c.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: c.textCode,
        syncRecovery: l ? pa(d, { familyId: n(c.metadata?.family_id) }) : null
      };
    }
    const o = Me(y(await s.json()));
    return o.familyId ? {
      status: "ready",
      detail: o,
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
function aa(e) {
  const a = Te(), t = a ? P(a, "channel") : "";
  if (t) return t;
  try {
    return P(new URL(n(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function z(e, a, t = {}) {
  e.innerHTML = mt(a, t);
}
var ut = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function ft(e) {
  const a = e ?? new URLSearchParams();
  return W({
    channel: P(a, "channel") || "",
    contentType: P(a, "content_type") || "",
    readinessState: P(a, "readiness_state") || "",
    blockerCode: P(a, "blocker_code") || "",
    missingLocale: P(a, "missing_locale") || "",
    page: _e(a, "page") || 1,
    perPage: _e(a, "per_page") || 50
  });
}
function Ae(e = globalThis.location) {
  return ft(Te(e));
}
function yt(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of ut) t.delete(s);
  return Ue(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function ta(e, a = "/admin") {
  const t = $(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${$(a || "/admin")}/api`;
}
function pe(e = "/admin") {
  return `${$(e || "/admin")}/translations/families`;
}
function gt(e, a, t = "") {
  const s = $(e || pe("/admin")), i = new URLSearchParams();
  return T(i, "channel", t), E(`${s}/${encodeURIComponent(n(a))}`, i);
}
function sa(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) T(s, i, r);
  return E(t, s);
}
function pt(e, a, t = {}) {
  return sa(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function bt(e, a, t = {}) {
  return sa(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function ht(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function q(e, a, t) {
  return `<option value="${g(e)}" ${e === t ? "selected" : ""}>${m(a)}</option>`;
}
function xt(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-family-list-filters="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${g(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${q("", "Any", e.readinessState)}
            ${q("blocked", "Blocked", e.readinessState)}
            ${q("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${q("", "Any", e.blockerCode)}
            ${q("missing_locale", "Missing locale", e.blockerCode)}
            ${q("missing_field", "Missing field", e.blockerCode)}
            ${q("pending_review", "Pending review", e.blockerCode)}
            ${q("outdated_source", "Outdated source", e.blockerCode)}
            ${q("policy_denied", "Policy issue", e.blockerCode)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Missing locale</span>
          <input name="missing_locale" value="${g(e.missingLocale)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="fr">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Content type</span>
          <input name="content_type" value="${g(e.contentType)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="pages">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Per page</span>
          <select name="per_page" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${[
    "10",
    "25",
    "50",
    "100"
  ].map((t) => q(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${F} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${g(e.page)}">
    </form>
  `;
}
function Se(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${m(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${m(a)}</span>`;
}
function vt(e) {
  if (!e.blockerCodes.length) return '<span class="text-gray-400">No blockers</span>';
  const a = /* @__PURE__ */ new Set(), t = e.blockerCodes.map((s) => {
    const i = e.blockerLabels[s] || S(s);
    return a.add(i.toLowerCase()), {
      code: s,
      label: i
    };
  });
  for (const [s, i] of Object.entries(e.blockerLabels)) {
    const r = i.toLowerCase();
    e.blockerCodes.includes(s) || a.has(r) || (a.add(r), t.push({
      code: n(s),
      label: i
    }));
  }
  return t.map(({ code: s, label: i }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${He(s)}">${m(i)}</span>`).join(" ");
}
function ee(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${m(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${m(a)}</span>
    </span>
  `;
}
function _t(e, a, t) {
  const s = t.familyBasePath || pe(t.basePath || "/admin");
  return e.map((i) => {
    const r = gt(s, i.familyId, a.channel), o = t.matrixPath ? pt(t.matrixPath, i, a) : "", c = t.queuePath ? bt(t.queuePath, i, a) : "", d = ht(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${g(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${g(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${m(d)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${m(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${m(i.contentType || "unknown")} · Source ${m(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${ue(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${vt(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${ee(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${ee(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${ee(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${Se(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${Se(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${g(r)}" class="${F} text-center" data-family-primary-action="true">Open family</a>
            ${o ? `<a href="${g(o)}" class="${I} text-center">Matrix</a>` : ""}
            ${c ? `<a href="${g(c)}" class="${Ee} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function wt(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, i = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, o = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${m(s)}-${m(i)} of ${m(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${I}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${m(e.page)}</span>
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
            ${_t(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Lt(e) {
  return `
    <div class="${Re} mt-6 p-6" role="alert">
      <h2 class="${Ie}">Families failed to load</h2>
      <p class="${Pe} mt-2">${m(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${m(e.requestURL)}</p>` : ""}
      ${K({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${I}">Retry</button>
    </div>
  `;
}
function Ct(e, a = {}) {
  const t = e.filters, s = xt(t);
  if (e.status === "loading") return `${s}${ea("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Lt(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${ne("No translation families found", "No families match the current filters.")}` : `${s}${wt(i, t, a)}`;
}
function ke(e, a, t = {}) {
  e.innerHTML = Ct(a, t);
}
async function $t(e, a, t = {}) {
  const s = De(ta(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : Y(s, { headers: { Accept: "application/json" } })), o = n(r.headers.get("x-request-id")), c = J(r.headers);
    if (!r.ok) {
      const l = await j(r);
      return {
        status: "error",
        filters: a,
        message: l.message,
        requestURL: s,
        requestId: o,
        traceId: c,
        statusCode: r.status,
        errorCode: l.textCode
      };
    }
    const d = Oe(y(await r.json()));
    return {
      status: d.items.length ? "ready" : "empty",
      filters: a,
      response: d,
      requestURL: s,
      requestId: o,
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
function qe(e, a) {
  const t = new FormData(e), s = (r, o) => t.has(r) ? n(t.get(r)) : o, i = (r, o) => t.has(r) ? w(t.get(r), o) : o;
  return W({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: i("page", a.page),
    perPage: i("per_page", a.perPage)
  });
}
function At(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = yt(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function Xt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  if (s.familyBasePath || (s.familyBasePath = pe(s.basePath)), t.ssrEnhanced === "true")
    return e.dataset.translationFamilyListEnhanced = "true", {
      status: "ready",
      filters: Ae()
    };
  let i = Ae(), r = null;
  const o = async (c, d = !1) => {
    i = W(c), d && At(i), ke(e, {
      status: "loading",
      filters: i
    }, s);
    const l = await $t(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = l, ke(e, l, s), St(e, l, o), l;
  };
  return r = await o(i, !1), r;
}
function St(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (i) => {
    i.preventDefault(), t({
      ...qe(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((i) => {
    i.addEventListener("change", () => {
      t({
        ...qe(s, a.filters),
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
function b(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function kt(e, a) {
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
function qt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Tt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function It(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && o ? o : i && a[i] ? a[i] : o;
}
function be(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    b("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = ya, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${ua}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${m(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${m(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${Ee}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((v) => `
                <option value="${g(v)}" ${v === i ? "selected" : ""}>
                  ${m(v.toUpperCase())}${v === t.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${m(t.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${m(t.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${m(t.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-6 py-4">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${t.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-6">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              ${ge({
    key: "create-locale",
    name: "assignee_id",
    initialValue: t.defaultAssignment.assigneeId,
    ariaLabel: "Assignee"
  })}
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
              <input type="datetime-local" name="due_date" value="${g(qt(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${I}">Cancel</button>
          <button type="submit" class="${F}">${m(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r), he(r, e.assigneeOptionsBasePath || "/admin/api", { fetch: e.fetch });
  const o = r.querySelector('[role="dialog"]'), c = r.querySelector("form"), d = r.querySelector('select[name="locale"]'), l = r.querySelector('input[name="auto_create_assignment"]'), f = r.querySelector('select[name="assignee_id"]'), u = r.querySelector('select[name="priority"]'), p = r.querySelector('input[name="due_date"]'), h = r.querySelector('[data-assignment-fields="true"]'), _ = r.querySelector('[data-create-locale-feedback="true"]'), C = r.querySelector('button[type="submit"]'), R = () => {
    U(), r.remove();
  }, k = () => {
    !h || !l || (h.hidden = !l.checked);
  }, U = o ? fa(o, R) : () => {
  };
  k(), l?.addEventListener("change", k), r.querySelectorAll('[data-close-modal="true"]').forEach((v) => {
    v.addEventListener("click", R);
  }), r.addEventListener("click", (v) => {
    v.target === r && R();
  }), c?.addEventListener("submit", async (v) => {
    if (v.preventDefault(), !d || !C) return;
    _ && (_.hidden = !0, _.textContent = ""), C.disabled = !0, C.classList.add("opacity-60", "cursor-not-allowed");
    const D = n(d.value).toLowerCase();
    try {
      const Z = await e.onSubmit({
        locale: D,
        autoCreateAssignment: l?.checked,
        assigneeId: f?.value,
        priority: u?.value,
        dueDate: Tt(p?.value || "")
      });
      R(), await e.onSuccess?.(Z);
    } catch (Z) {
      const ve = kt(Z, D);
      _ && (_.hidden = !1, _.textContent = ve), b("error", ve);
    } finally {
      C.disabled = !1, C.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Rt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: le(Le(e.dataset.quickCreate, {}), {}),
    localeURLs: Le(e.dataset.localeUrls, {})
  };
}
function Zt(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Rt(a), s = xe({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const o = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        be({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            b("success", `${c.locale.toUpperCase()} locale created.`);
            const d = typeof window < "u" && window.location.pathname.endsWith("/edit"), l = It(c, t.localeURLs, t.requestedLocale, d);
            if (l && typeof window < "u") {
              window.location.href = l;
              return;
            }
            typeof window < "u" && window.location.reload();
          }
        });
      });
    });
  });
}
function na(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (n(a.dataset.localeAssignmentSource) === "empty-panel" ? n(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function Pt(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function ia(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (n(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function Et(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function Ft(e, a) {
  const t = n(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", i = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, i.appendChild(r);
  let o = t === "";
  for (const c of a) {
    const d = e.ownerDocument.createElement("option");
    d.value = c.value, d.textContent = Et(c), c.description && d.setAttribute("data-description", c.description), c.displayName && d.setAttribute("data-display-name", c.displayName), c.avatarURL && d.setAttribute("data-avatar-url", c.avatarURL), t && t === c.value && (d.selected = !0, o = !0), i.appendChild(d);
  }
  if (t && !o) {
    const c = e.ownerDocument.createElement("option");
    c.value = t, c.textContent = t, c.selected = !0, i.appendChild(c);
  }
  e.replaceChildren(i);
}
async function he(e, a, t = {}) {
  const s = Array.from(e.querySelectorAll("[data-family-assignee-select]"));
  if (s.length === 0) return;
  const i = s.map((r) => n(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await Ma(a, i, t);
    for (const o of s) Ft(o, r);
  } catch {
    for (const r of s) {
      const o = n(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const c = r.ownerDocument.createElement("option");
      c.value = o, c.textContent = o || "Assignees unavailable", c.selected = !0, r.appendChild(c), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function ae(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function G(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = n(t?.dataset.assignToMeEnabled) === "true", i = n(t?.dataset.assignToUserEnabled) === "true", r = n(t?.dataset.assignToMeReason), o = n(t?.dataset.assignToUserReason);
  ae(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), ae(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), i, o), ae(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), i, o);
}
function Ut(e, a) {
  const t = n(e.dataset.assignmentId), s = n(e.dataset.familyAssignmentAction), i = w(e.dataset.rowVersion, 0);
  return {
    enabled: !e.disabled && e.getAttribute("aria-disabled") !== "true",
    permission: "",
    endpoint: t && s ? `${$(a)}/translations/assignments/${encodeURIComponent(t)}/actions/${encodeURIComponent(s)}` : "",
    href: "",
    label: e.textContent?.trim() || s,
    reason: e.getAttribute("title") || "",
    reasonCode: "",
    requiredFields: [],
    payload: {},
    assignmentId: t,
    expectedVersion: i
  };
}
function Dt(e, a) {
  return n(a.dataset.localeAssignmentSource) !== "empty-panel" ? null : e.querySelector('[data-family-assignment-locale-select="true"]')?.selectedOptions[0] ?? null;
}
function Bt(e, a, t) {
  const s = Dt(e, a), i = n(a.dataset.assignmentTargetLocale || s?.dataset.assignmentTargetLocale), r = n(a.dataset.assignmentWorkScope || s?.dataset.assignmentWorkScope), o = t === "self" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToMeEndpoint || s?.dataset.assignmentEndpoint) : t === "user" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToUserEndpoint || s?.dataset.assignmentEndpoint) : n(a.dataset.assignmentEndpoint), c = n(a.dataset.assignmentId), d = w(a.dataset.rowVersion, 0), l = {};
  if (i && (l.target_locale = i), r && (l.work_scope = r), t === "self") {
    const u = n(a.dataset.assignmentAssigneeId || s?.dataset.assignToMeAssigneeId);
    u && (l.assignee_id = u);
  }
  let f = a.getAttribute("title") || "";
  return o ? (t === "self" || t === "user") && !i ? f = f || "Assignment target locale is unavailable." : t === "self" && !n(l.assignee_id) && (f = f || "Self-assignment payload is unavailable.") : f = f || "Assignment action endpoint is unavailable.", {
    enabled: !a.disabled && a.getAttribute("aria-disabled") !== "true" && !f,
    permission: "",
    endpoint: o,
    href: "",
    label: a.textContent?.trim() || t,
    reason: f,
    reasonCode: "",
    requiredFields: [],
    payload: l,
    assignmentId: c,
    expectedVersion: d
  };
}
async function Nt(e, a, t, s) {
  const i = ta(a, t.basePath || "/admin"), r = n(e.dataset.familyId), o = aa(a) || n(e.dataset.channel), c = xe({
    basePath: i,
    fetch: s.fetch
  });
  await he(e, i, { fetch: s.fetch }), G(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
    G(e);
  }), e.querySelectorAll('[data-translation-create-locale-trigger="true"]').forEach((l) => {
    l.dataset.translationCreateBound !== "true" && (l.dataset.translationCreateBound = "true", l.addEventListener("click", async (f) => {
      if (f.preventDefault(), l.disabled || l.getAttribute("aria-disabled") === "true") {
        b("warning", l.getAttribute("title") || "Locale creation is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const u = await ie(a, { fetch: s.fetch });
        if (u.status !== "ready" || !u.detail) {
          b("error", u.message || "Translation family detail is unavailable.");
          return;
        }
        const p = n(l.dataset.locale).toLowerCase() || u.detail.quickCreate.recommendedLocale || "";
        be({
          familyId: u.detail.familyId || r,
          quickCreate: Ve(u.detail, p),
          initialLocale: p,
          heading: `Create ${p.toUpperCase()} locale`,
          assigneeOptionsBasePath: i,
          fetch: s.fetch,
          onSubmit: (h) => c.createLocale(u.detail?.familyId || r, {
            ...h,
            channel: o
          }),
          onSuccess: async (h) => {
            b("success", `${h.locale.toUpperCase()} locale created.`), typeof window < "u" && window.location.reload();
          }
        });
      } catch (u) {
        b("error", u instanceof Error ? u.message : "Failed to open locale creation.");
      } finally {
        l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  });
  const d = async (l, f) => {
    const u = Bt(e, l, f);
    if (!u.enabled) {
      b("warning", u.reason || "Assignment action is unavailable.");
      return;
    }
    const p = {};
    if (f === "user") {
      const h = ia(e, na(e, l), l), _ = n(h?.value);
      if (!_) {
        b("warning", "Assignee is required."), h?.focus();
        return;
      }
      p.assignee_id = _;
    }
    o && (p.channel = o), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
    try {
      await te(u, p, { fetch: s.fetch }), b("success", f === "claim" ? "Assignment claimed." : "Assignment updated."), typeof window < "u" && window.location.reload();
    } catch (h) {
      b("error", h instanceof Error ? h.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
    }
  };
  return e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (f) => {
      f.preventDefault(), d(l, "self");
    }));
  }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (f) => {
      f.preventDefault(), d(l, "user");
    }));
  }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (f) => {
      f.preventDefault(), d(l, "claim");
    }));
  }), e.querySelectorAll("[data-family-assignment-action]").forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", async (f) => {
      f.preventDefault();
      const u = Ut(l, i);
      if (!u.enabled) {
        b("warning", u.reason || "Assignment action is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        await te(u, o ? { channel: o } : {}, { fetch: s.fetch }), b("success", u.label ? `${u.label} complete.` : "Assignment updated."), typeof window < "u" && window.location.reload();
      } catch (p) {
        b("error", p instanceof Error ? p.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  }), { status: "ready" };
}
async function V(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  if (t.ssrEnhanced === "true") return Nt(e, s, i, a);
  z(e, { status: "loading" }, i);
  const r = await ie(s, { fetch: a.fetch });
  z(e, r, i);
  const o = aa(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const l = `${$(i.basePath || "/admin")}/api`, f = xe({
        basePath: l,
        fetch: a.fetch
      });
      await he(e, l, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((p) => {
        p.dataset.translationCreateBound !== "true" && (p.dataset.translationCreateBound = "true", p.addEventListener("click", (h) => {
          h.preventDefault();
          const _ = r.detail;
          if (!_) {
            b("error", "Translation family detail is unavailable.");
            return;
          }
          if (p.getAttribute("aria-disabled") === "true") {
            b("warning", _.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const C = n(p.dataset.locale).toLowerCase() || _.quickCreate.recommendedLocale || "", R = Ve(_, C);
          be({
            familyId: _.familyId,
            quickCreate: R,
            initialLocale: C,
            heading: `Create ${C.toUpperCase()} locale`,
            assigneeOptionsBasePath: l,
            fetch: a.fetch,
            onSubmit: (k) => f.createLocale(_.familyId, {
              ...k,
              channel: o
            }),
            onSuccess: async (k) => {
              b("success", `${k.locale.toUpperCase()} locale created.`), await V(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
      const u = async (p, h) => {
        const _ = r.detail;
        if (!_) {
          b("error", "Translation family detail is unavailable.");
          return;
        }
        const C = na(e, p), R = C ? _.localeAssignments[C] : null;
        if (!R) {
          b("error", "Assignment action metadata is unavailable.");
          return;
        }
        const k = Pt(R, h);
        if (!k.enabled) {
          b("warning", k.reason || "Assignment action is unavailable.");
          return;
        }
        const U = {};
        if (h === "user") {
          const v = ia(e, C, p), D = n(v?.value);
          if (!D) {
            b("warning", "Assignee is required."), v?.focus();
            return;
          }
          U.assignee_id = D;
        }
        o && (U.channel = o), p.disabled = !0, p.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await te(k, U, { fetch: a.fetch }), b("success", h === "claim" ? "Assignment claimed." : "Assignment updated."), await V(e, {
            ...a,
            ...i,
            endpoint: s
          });
        } catch (v) {
          b("error", v instanceof Error ? v.message : "Failed to update assignment."), p.disabled = !1, p.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      G(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        G(e);
      }), e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((p) => {
        p.addEventListener("click", (h) => {
          h.preventDefault(), u(p, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((p) => {
        p.addEventListener("click", (h) => {
          h.preventDefault(), u(p, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((p) => {
        p.addEventListener("click", (h) => {
          h.preventDefault(), u(p, "claim");
        });
      });
    }
    const c = () => {
      const l = e.querySelector(".ui-state-retry-btn");
      l && l.addEventListener("click", () => {
        V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      });
    };
    c();
    const d = e.querySelector('[data-family-sync-action="true"]');
    d && r.syncRecovery?.canSync && d.addEventListener("click", async (l) => {
      l.preventDefault(), d.disabled = !0, d.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const f = r.syncRecovery;
        if (!f) return;
        await va(f, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const u = await ie(s, { fetch: a.fetch });
        if (u.status === "error" && (u.errorCode === "NOT_FOUND" || u.statusCode === 404)) {
          z(e, {
            ...u,
            syncRecovery: f,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), c();
          return;
        }
        if (u.status !== "ready") {
          const p = u.message || "Sync completed, but family detail reload failed.";
          z(e, {
            ...u,
            syncRecovery: f,
            syncStatus: "failed",
            syncMessage: p
          }, i), c(), b("error", p);
          return;
        }
        b("success", "Translation families synced."), await V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      } catch (f) {
        const u = f instanceof Error ? f.message : "Failed to sync translation families.", p = e.querySelector('[data-family-sync-feedback="true"]');
        p && (p.hidden = !1, p.textContent = u), d.disabled = !1, d.classList.remove("opacity-60", "cursor-not-allowed"), b("error", u);
      }
    });
  }
  return r;
}
function xe(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = $(e.basePath || "/admin/api");
  async function s(i) {
    return re(i);
  }
  return {
    async list(i = {}) {
      return Oe(await s(await a(De(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return Me(await s(await a(_a(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const o = qa({
        ...r,
        familyId: i,
        basePath: t
      }), c = new Headers(o.headers), d = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(La(o.request))
      };
      H(o.endpoint, d, c);
      const l = await a(o.endpoint, d);
      if (!l.ok) throw await Ba(l);
      return ka(await s(l));
    },
    async createAssignment(i, r = {}) {
      const o = Ne(r), c = Ca(t, i, o.channel), d = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && d.set("X-Idempotency-Key", o.idempotencyKey);
      const l = {
        method: "POST",
        credentials: "same-origin",
        headers: d,
        body: JSON.stringify($a(o))
      };
      H(c, l, d);
      const f = await a(c, l);
      if (!f.ok) throw await fe(f);
      return s(f);
    }
  };
}
export {
  Jt as applyCreateLocaleToFamilyDetail,
  Wt as applyCreateLocaleToSummaryState,
  wa as buildCreateLocaleURL,
  nt as buildFamilyActivityPreview,
  Ca as buildFamilyAssignmentURL,
  gt as buildFamilyDetailUIURL,
  _a as buildFamilyDetailURL,
  yt as buildFamilyListBrowserSearch,
  Ue as buildFamilyListQuery,
  De as buildFamilyListURL,
  pt as buildFamilyMatrixURL,
  bt as buildFamilyQueueURL,
  ba as buildTranslationFamilySyncRPCRequest,
  W as createFamilyFilters,
  qa as createTranslationCreateLocaleActionModel,
  Be as createTranslationCreateLocaleRequest,
  Ne as createTranslationFamilyAssignmentRequest,
  xe as createTranslationFamilyClient,
  va as dispatchTranslationFamilySync,
  ie as fetchTranslationFamilyDetailState,
  $t as fetchTranslationFamilyListState,
  Da as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  Xt as initTranslationFamilyListPage,
  Zt as initTranslationSummaryCards,
  ka as normalizeCreateLocaleResult,
  Me as normalizeFamilyDetail,
  Oe as normalizeFamilyListResponse,
  Ta as normalizeFamilyListRow,
  le as normalizeQuickCreateHints,
  pa as normalizeTranslationFamilySyncRecoveryCapability,
  ft as parseFamilyListFiltersFromSearchParams,
  Ae as readFamilyListFiltersFromLocation,
  ue as renderReadinessChip,
  z as renderTranslationFamilyDetailPage,
  mt as renderTranslationFamilyDetailState,
  ke as renderTranslationFamilyListPage,
  Ct as renderTranslationFamilyListState,
  La as serializeCreateLocaleRequest,
  $a as serializeFamilyAssignmentRequest,
  qt as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map