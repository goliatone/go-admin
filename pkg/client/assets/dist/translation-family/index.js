import { escapeAttribute as y, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as H, httpRequest as G, readHTTPJSON as se } from "../shared/transport/http-client.js";
import { extractStructuredError as B } from "../toast/error-helpers.js";
import { buildURL as F, getNumberSearchParam as pe, getStringSearchParam as P, readLocationSearchParams as Ce, setNumberSearchParam as ge, setSearchParam as q } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as k } from "../shared/path-normalization.js";
import { parseJSONValue as be } from "../shared/json-parse.js";
import { asLooseBoolean as x, asNumberish as v, asRecord as u, asString as n, asStringArray as b } from "../shared/coercion.js";
import { E as We, G as Ze, K as ea, T as aa, _ as ta, b as ke, f as R, g as sa, k as na, l as Se, m as N, nt as Y, ot as ia, u as E, v as ra, x as Ae, y as Te } from "../chunks/translation-shared-DxbdCW0D.js";
import { formatTranslationTimestampUTC as ne, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as oa } from "../shared/record-normalization.js";
function la(e, a = {}) {
  const t = u(e), s = x(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), l = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !o ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: o,
    environment: l,
    familyId: i
  };
}
function ca(e, a = "") {
  const t = n(a), s = da(e);
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
function da(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function ma(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !x(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function ua(e, a = {}) {
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
    body: JSON.stringify(ca(e, a.correlationId))
  };
  H(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const p = await B(r);
    throw new Error(p.message || "Failed to sync translation families.");
  }
  const o = u(await r.json().catch(() => ({}))), l = u(o.error);
  if (Object.keys(l).length > 0) throw new Error(n(l.message) || "Failed to sync translation families.");
  const c = u(o.data), m = ma(c.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...c,
    receipt: m
  };
}
function Q(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function O(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function qe(e) {
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
function J(e = {}) {
  const a = n(e.channel);
  return {
    contentType: n(e.contentType),
    readinessState: n(e.readinessState),
    blockerCode: n(e.blockerCode),
    missingLocale: n(e.missingLocale),
    page: Math.max(1, v(e.page, 1)),
    perPage: Math.max(1, v(e.perPage, 50)),
    channel: a
  };
}
function Re(e = {}) {
  const a = J(e), t = new URLSearchParams();
  return q(t, "content_type", a.contentType), q(t, "readiness_state", a.readinessState), q(t, "blocker_code", a.blockerCode), q(t, "missing_locale", a.missingLocale), q(t, "channel", a.channel), ge(t, "page", a.page, { min: 1 }), ge(t, "per_page", a.perPage, { min: 1 }), t;
}
function X(e, a = "", t = "") {
  const s = k(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function Ie(e, a = {}) {
  return F(X(e), Re(a));
}
function ya(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a), s);
}
function Pe(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: x(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function fa(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a, "/variants"), s);
}
function pa(e = {}) {
  const a = Pe(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function Fe(e = {}) {
  return {
    targetLocale: n(e.targetLocale).toLowerCase(),
    assigneeId: n(e.assigneeId),
    openPool: x(e.openPool),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    workScope: n(e.workScope),
    channel: n(e.channel),
    idempotencyKey: n(e.idempotencyKey)
  };
}
function ga(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a, "/assignments"), s);
}
function ba(e = {}) {
  const a = Fe(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function ha(e) {
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
function xa(e) {
  return {
    autoCreateAssignment: x(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function ie(e, a = {}) {
  const t = u(e.default_assignment), s = b(e.missing_locales ?? a.missingLocales), i = b(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? x(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: xa({
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
function va(e) {
  const a = u(e.data), t = u(e.meta), s = u(t.family), i = u(t.refresh), r = u(a.navigation), o = ie(u(s.quick_create), { missingLocales: b(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? ha(u(a.assignment)) : null,
    idempotencyHit: x(t.idempotency_hit),
    assignmentReused: x(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: O(s.readiness_state),
      missingRequiredLocaleCount: v(s.missing_required_locale_count),
      pendingReviewCount: v(s.pending_review_count),
      outdatedLocaleCount: v(s.outdated_locale_count),
      blockerCodes: b(s.blocker_codes),
      missingLocales: b(s.missing_locales),
      availableLocales: b(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: x(i.family_detail),
      familyList: x(i.family_list),
      contentSummary: x(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function _a(e) {
  const a = n(e.familyId), t = Pe(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: fa(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function La(e) {
  const a = {};
  for (const [t, s] of Object.entries(u(e.blocker_labels))) {
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
    readinessState: O(e.readiness_state),
    missingRequiredLocaleCount: v(e.missing_required_locale_count),
    pendingReviewCount: v(e.pending_review_count),
    outdatedLocaleCount: v(e.outdated_locale_count),
    blockerCodes: b(e.blocker_codes).map(qe),
    blockerLabels: a,
    missingLocales: b(e.missing_locales),
    availableLocales: b(e.available_locales)
  };
}
function Ee(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => La(u(o))),
    total: v(i.total),
    page: v(i.page, 1),
    perPage: v(i.per_page, 50),
    channel: n(i.channel)
  };
}
function he(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: x(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: oa(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function wa(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: qe(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: u(e.details)
  };
}
function M(e) {
  const a = u(e.link);
  return {
    enabled: x(e.enabled),
    permission: n(e.permission),
    endpoint: n(e.endpoint),
    href: n(e.href || a.href),
    label: n(e.label || a.label),
    reason: n(e.reason),
    reasonCode: n(e.reason_code ?? e.reasonCode),
    requiredFields: b(e.required_fields ?? e.requiredFields),
    payload: u(e.payload),
    assignmentId: n(e.assignment_id ?? e.assignmentId),
    expectedVersion: v(e.expected_version ?? e.expectedVersion)
  };
}
function re(e) {
  return {
    assignToMe: M(u(e.assign_to_me ?? e.assignToMe)),
    assignToUser: M(u(e.assign_to_user ?? e.assignToUser)),
    claim: M(u(e.claim)),
    openEditor: M(u(e.open_editor ?? e.openEditor))
  };
}
function Ue(e) {
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
    rowVersion: v(e.row_version ?? e.version),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    links: Ca(u(e.links)),
    actions: re(u(e.actions))
  };
}
function $a(e) {
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
function Ca(e) {
  return { editor: $a(u(e.editor)) };
}
function ka(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? Ue(u(e.assignment)) : null,
    actions: re(u(e.actions))
  };
}
function Sa(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const i = n(t).toLowerCase();
    i && (a[i] = ka(u(s)));
  }
  return a;
}
function De(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? he(u(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((g) => wa(u(g))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((g) => he(u(g))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((g) => Ue(u(g))) : [], l = Sa(u(t.locale_assignments ?? t.localeAssignments)), c = u(t.publish_gate), m = u(t.readiness_summary), p = ie(u(t.quick_create), {
    missingLocales: b(m.missing_locales),
    recommendedLocale: n(m.recommended_locale),
    requiredForPublish: b(m.required_for_publish ?? m.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: O(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: i,
    activeAssignments: o,
    localeAssignments: l,
    publishGate: {
      allowed: x(c.allowed),
      overrideAllowed: x(c.override_allowed),
      blockedBy: b(c.blocked_by),
      reviewRequired: x(c.review_required)
    },
    readinessSummary: {
      state: O(m.state),
      requiredLocales: b(m.required_locales),
      missingLocales: b(m.missing_locales),
      availableLocales: b(m.available_locales),
      blockerCodes: b(m.blocker_codes),
      missingRequiredLocaleCount: v(m.missing_required_locale_count),
      pendingReviewCount: v(m.pending_review_count),
      outdatedLocaleCount: v(m.outdated_locale_count),
      publishReady: x(m.publish_ready)
    },
    quickCreate: p
  };
}
function j(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = n(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function Ne(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function oe(e) {
  return j(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function Aa(e) {
  return e.blockers.some(me);
}
function le(e, a) {
  const t = n(a).toLowerCase();
  return !t || Aa(e) ? !1 : oe(e).includes(t);
}
function Ta(e, a) {
  const t = oe(e), s = n(a).toLowerCase(), i = le(e, s);
  return {
    ...e.quickCreate,
    enabled: i,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: i ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: i ? "" : e.quickCreate.disabledReasonCode
  };
}
function Kt(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = n(a.locale).toLowerCase(), s = e.localeVariants.some((c) => c.locale === t) ? e.localeVariants.map((c) => c.locale === t ? {
    ...c,
    id: c.id || a.variantId,
    status: a.status || c.status
  } : { ...c }) : [...e.localeVariants.map((c) => ({ ...c })), {
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
  }].sort((c, m) => c.locale.localeCompare(m.locale));
  let i = e.activeAssignments.map((c) => ({ ...c }));
  if (a.assignment) {
    const c = {
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
      actions: re({})
    }, m = i.findIndex((p) => p.id === c.id || p.targetLocale === c.targetLocale);
    m >= 0 ? i[m] = c : i = [...i, c].sort((p, g) => p.targetLocale.localeCompare(g.targetLocale));
  }
  const r = e.blockers.map((c) => ({ ...c })).filter((c) => !(c.blockerCode === "missing_locale" && c.locale === t)), o = j(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), l = Ne(j(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function Ht(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const l = j(b(t.available_locales), b(s.available_locales), a.family.availableLocales, [i]), c = Ne(j(b(t.missing_required_locales), b(s.missing_required_locales), a.family.missingLocales), i);
  return t.available_locales = l, t.missing_required_locales = c, t.translation_family_id = o || a.familyId, s.family_id = o || a.familyId, s.state = a.family.readinessState, s.available_locales = l, s.missing_required_locales = c, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
function qa(e) {
  const a = O(e);
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
function ce(e) {
  const a = qa(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ra(e) {
  const a = await B(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = u(a.metadata), t;
}
async function de(e) {
  const a = await B(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = u(a.metadata), t;
}
async function Ia(e, a = {}, t = {}) {
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
  const l = await (t.fetch ? t.fetch(s, o) : G(s, o));
  if (!l.ok) throw await de(l);
  return se(l);
}
function Pa(e) {
  const a = u(e), t = n(a.value || a.id || a.user_id);
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
function Fa(e) {
  const a = u(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), i = [];
  for (const r of t) {
    const o = Pa(r);
    !o || s.has(o.value) || (s.add(o.value), i.push(o));
  }
  return i;
}
function Ea(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = a.map((i) => n(i)).find(Boolean);
  return s && t.set("assignee_id", s), F(`${k(e || "/admin/api")}/translations/options/assignees`, t);
}
async function Ua(e, a = [], t = {}) {
  const s = Ea(e, a), i = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : G(s, { headers: { Accept: "application/json" } }));
  if (!i.ok) throw await de(i);
  return Fa(await se(i));
}
function Da(e) {
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
function Na(e) {
  return Y(Da(e));
}
function Oa(e) {
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
function Oe(e) {
  return Y(Oa(e));
}
function ja(e) {
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
function je(e) {
  return Y(ja(e));
}
function C(e, a) {
  return n(e[a]);
}
function me(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = C(e.details, "reason").toLowerCase(), t = C(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(C(e.details, "content_type") || C(e.details, "environment")), i = !!(C(e.details, "message") || C(e.details, "policy_reason"));
  return s && !a && !i;
}
function Ba(e) {
  return me(e) ? "Policy unavailable" : S(e.blockerCode);
}
function Ma(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", C(a, "content_type")],
    ["Environment", C(a, "environment")]
  ], s = C(a, "reason"), i = C(a, "message"), r = C(a, "remediation");
  return me(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), i && i !== s && t.push(["Message", i]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function za(e) {
  const a = Ma(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${d(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${d(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function Va(e) {
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
  return Y(Va(e));
}
function Ka(e, a, t) {
  const s = k(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function Me(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function ze(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function Ha(e, a, t = "") {
  const s = n(a).toLowerCase();
  if (!s) return null;
  const i = ze(s, t);
  if (e.localeAssignments[i]) return e.localeAssignments[i];
  for (const [r, o] of Object.entries(e.localeAssignments)) if (r.startsWith(`${s}:`)) return o;
  return null;
}
function Ve(e) {
  return e && (e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function Ke(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function Ga(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function Ya(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${y(e.state)}">No active assignment.</p>`;
  const t = a.dueState || Me(a.dueDate), s = t === "none" ? "No due date" : S(t);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${y(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Oe(a.status)}">${d(S(a.status))}</span>
      <span>${d(Ve(a))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${d(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${Be(t)}">${d(s)}</span>
    </div>
  `;
}
function Qa(e) {
  if (!e || e.state === "source_locale") return "";
  const a = ze(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled && s.push(`
      <button type="button" class="${R}" data-family-assign-to-me="true" data-locale-assignment-key="${y(a)}">
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex min-w-[16rem] flex-wrap items-center gap-2">
        ${ue({
    key: a,
    ariaLabel: "Assignee",
    className: `${He} min-w-0 flex-1`
  })}
        <button type="button" class="${R}" data-family-assign-to-user="true" data-locale-assignment-key="${y(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${R}" data-family-claim-assignment="true" data-locale-assignment-key="${y(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${y(a)}"
        href="${y(t.openEditor.href)}"
      >${d(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex flex-wrap items-center justify-end gap-2">${s.join("")}</div>`;
  const i = Ke(e);
  return i ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${y(a)}">${d(i)}</p>` : "";
}
function Ja(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => Ga(a)).sort(([a], [t]) => a.localeCompare(t));
}
function Xa(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${y(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${y(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function ae(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${y(a || "Assignment action is unavailable.")}"`;
}
function xe(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var He = "py-3 px-4 pe-9 block w-full border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:text-gray-400 dark:border-gray-700 dark:focus:ring-gray-600";
function ue(e) {
  const a = n(e.key), t = n(e.initialValue), s = e.enabled !== !1, i = n(e.placeholder) || "Select assignee", r = n(e.reason), o = n(e.name), l = ae(s, r);
  return `
    <select
      ${o ? `name="${y(o)}"` : ""}
      class="${y(e.className || He)}"
      data-family-assignee-select="${y(a)}"
      data-initial-assignee-id="${y(t)}"
      data-endpoint-url="/api/translations/options/assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      aria-label="${y(e.ariaLabel || "Assignee")}"
      ${l}
    >
      <option value="">${d(s ? "Loading assignees..." : r || i)}</option>
      ${t ? `<option value="${y(t)}" selected>${d(t)}</option>` : ""}
    </select>
  `;
}
function Wa(e, a = 5) {
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
function Za(e) {
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
function et(e, a) {
  const t = k(a.contentBasePath || `${k(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (l) => {
    const c = !le(e, l);
    return `
      <button
        type="button"
        class="${E}${c ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${y(l)}"
        ${c ? 'aria-disabled="true"' : ""}
        title="${y(c ? i : `Create ${l.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, o = e.localeVariants.map((l) => {
    const c = Ka(t, e, l), m = Ha(e, l.locale), p = c ? `<a href="${y(c)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', g = l.fields.title || l.fields.slug || `${e.contentType} ${l.locale.toUpperCase()}`;
    return `
      <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(l.locale.toUpperCase())}</span>
            ${l.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Na(l.status)}">${d(S(l.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(g)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(ne(l.updatedAt || l.createdAt)) || "n/a"}</p>
          ${Ya(m)}
        </div>
        <div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2">
          ${Qa(m)}
          ${p}
        </div>
      </li>
    `;
  });
  for (const l of s) o.push(`
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
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function at(e) {
  if (!e.activeAssignments.length) {
    const a = Ja(e), t = a[0]?.[1] || null, s = a.some(([, r]) => r.actions.assignToMe.enabled), i = a.some(([, r]) => r.actions.assignToUser.enabled);
    return `
      <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 lg:grid-cols-[minmax(10rem,0.8fr)_minmax(12rem,1fr)_auto_auto] lg:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" data-family-assignment-locale-select="true">
                ${a.map(([r, o]) => `
                  <option value="${y(r)}" ${Xa(o)}>${d(o.locale.toUpperCase())} · ${d(o.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            ${i ? `
              <label class="grid gap-2">
                <span class="text-sm font-medium text-gray-900">Assignee</span>
                ${ue({
      key: "__empty_panel__",
      enabled: !!t?.actions.assignToUser.enabled,
      reason: t?.actions.assignToUser.reason,
      ariaLabel: "Assignee"
    })}
              </label>
            ` : "<div></div>"}
            ${s ? `
              <button type="button" class="${R}${xe(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${ae(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${i ? `
              <button type="button" class="${E}${xe(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${ae(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${d(Ke(Object.values(e.localeAssignments).find((r) => r.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Me(a.dueDate), s = t === "none" ? "No due date" : S(t), i = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Oe(a.status)}">${d(S(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Be(t)}">${d(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${d(Ve(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${d(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${d(ne(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${i ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${y(a.id)}"
                    href="${y(i.href)}"
                    title="${y(i.description || i.label)}"
                  >${d(i.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function tt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${je(t.blockerCode)}">${d(Ba(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
              </div>
              ${za(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${ce(e.readinessState)}
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
function st(e) {
  const a = Wa(e);
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(ne(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${d(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function K(e) {
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
function Ge(e) {
  return `
    <div class="${na}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${d(e)}</span>
      </div>
    </div>
  `;
}
function te(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${sa} p-8 text-center shadow-sm">
        <h2 class="${ra}">${d(e)}</h2>
        <p class="${ta} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function nt(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${E}"
        data-family-sync-action="true"
        data-family-sync-rpc="${y(s.rpcInvokePath)}"
        data-family-sync-command="${y(s.commandName)}"
        data-family-sync-family-id="${y(s.familyId)}"
        data-family-sync-environment="${y(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? d(t.syncMessage) : "";
  return `
    <div class="${Te} p-6" role="alert">
      <h2 class="${Ae}">${d(e)}</h2>
      <p class="${ke} mt-2">${d(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${R}">
          Reload family detail
        </button>
        ${i}
      </div>
    </div>
  `;
}
function it(e, a = {}) {
  if (e.status === "loading") return Ge("Loading translation family...");
  if (e.status === "empty") return `
      ${te("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${K(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${nt(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${K(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return te("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(S).join(", ") : "No blockers", r = oe(t), o = t.quickCreate.recommendedLocale || r[0] || "", l = !le(t, o), c = o ? `
      <button
        type="button"
        class="${E}${l ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${y(o)}"
        ${l ? 'aria-disabled="true"' : ""}
        title="${y(l ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${o.toUpperCase()} locale`)}"
      >
        Create ${d(o.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${y(t.familyId)}" data-readiness-state="${y(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${aa}">Translation family</p>
            <h1 class="${We} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${ce(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${Za(t)}
        </div>
        ${K(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${et(t, a)}
          ${at(t)}
        </div>
        <div class="space-y-6">
          ${tt(t)}
          ${st(t)}
        </div>
      </div>
    </div>
  `;
}
async function ve(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : G(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = Q(s.headers);
    if (!s.ok) {
      const l = await B(s), c = u(l.metadata?.sync_recovery), m = l.textCode === "NOT_FOUND" || x(c.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: l.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: l.textCode,
        syncRecovery: m ? la(c, { familyId: n(l.metadata?.family_id) }) : null
      };
    }
    const o = De(u(await s.json()));
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
function rt(e) {
  const a = Ce(), t = a ? P(a, "channel") : "";
  if (t) return t;
  try {
    return P(new URL(n(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function z(e, a, t = {}) {
  e.innerHTML = it(a, t);
}
var ot = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function lt(e) {
  const a = e ?? new URLSearchParams();
  return J({
    channel: P(a, "channel") || "",
    contentType: P(a, "content_type") || "",
    readinessState: P(a, "readiness_state") || "",
    blockerCode: P(a, "blocker_code") || "",
    missingLocale: P(a, "missing_locale") || "",
    page: pe(a, "page") || 1,
    perPage: pe(a, "per_page") || 50
  });
}
function ct(e = globalThis.location) {
  return lt(Ce(e));
}
function dt(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of ot) t.delete(s);
  return Re(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function mt(e, a = "/admin") {
  const t = k(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${k(a || "/admin")}/api`;
}
function ye(e = "/admin") {
  return `${k(e || "/admin")}/translations/families`;
}
function ut(e, a, t = "") {
  const s = k(e || ye("/admin")), i = new URLSearchParams();
  return q(i, "channel", t), F(`${s}/${encodeURIComponent(n(a))}`, i);
}
function Ye(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) q(s, i, r);
  return F(t, s);
}
function yt(e, a, t = {}) {
  return Ye(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function ft(e, a, t = {}) {
  return Ye(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function pt(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function T(e, a, t) {
  return `<option value="${y(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function gt(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-family-list-filters="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${y(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${T("", "Any", e.readinessState)}
            ${T("blocked", "Blocked", e.readinessState)}
            ${T("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${T("", "Any", e.blockerCode)}
            ${T("missing_locale", "Missing locale", e.blockerCode)}
            ${T("missing_field", "Missing field", e.blockerCode)}
            ${T("pending_review", "Pending review", e.blockerCode)}
            ${T("outdated_source", "Outdated source", e.blockerCode)}
            ${T("policy_denied", "Policy issue", e.blockerCode)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Missing locale</span>
          <input name="missing_locale" value="${y(e.missingLocale)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="fr">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Content type</span>
          <input name="content_type" value="${y(e.contentType)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="pages">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Per page</span>
          <select name="per_page" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${[
    "10",
    "25",
    "50",
    "100"
  ].map((t) => T(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${E} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${y(e.page)}">
    </form>
  `;
}
function _e(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function bt(e) {
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
  return t.map(({ code: s, label: i }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${je(s)}">${d(i)}</span>`).join(" ");
}
function Z(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function ht(e, a, t) {
  const s = t.familyBasePath || ye(t.basePath || "/admin");
  return e.map((i) => {
    const r = ut(s, i.familyId, a.channel), o = t.matrixPath ? yt(t.matrixPath, i, a) : "", l = t.queuePath ? ft(t.queuePath, i, a) : "", c = pt(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${y(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${y(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(c)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(i.contentType || "unknown")} · Source ${d(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${ce(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${bt(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${Z(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${Z(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${Z(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${_e(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${_e(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${y(r)}" class="${E} text-center" data-family-primary-action="true">Open family</a>
            ${o ? `<a href="${y(o)}" class="${R} text-center">Matrix</a>` : ""}
            ${l ? `<a href="${y(l)}" class="${Se} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function xt(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, i = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, o = e.page * e.perPage < e.total;
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${d(s)}-${d(i)} of ${d(e.total)} families</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="${R}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${d(e.page)}</span>
          <button type="button" class="${R}" data-family-list-page="next" ${o ? "" : "disabled"}>Next</button>
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
            ${ht(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function vt(e) {
  return `
    <div class="${Te} mt-6 p-6" role="alert">
      <h2 class="${Ae}">Families failed to load</h2>
      <p class="${ke} mt-2">${d(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${d(e.requestURL)}</p>` : ""}
      ${K({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${R}">Retry</button>
    </div>
  `;
}
function _t(e, a = {}) {
  const t = e.filters, s = gt(t);
  if (e.status === "loading") return `${s}${Ge("Loading translation families...")}`;
  if (e.status === "error") return `${s}${vt(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${te("No translation families found", "No families match the current filters.")}` : `${s}${xt(i, t, a)}`;
}
function Le(e, a, t = {}) {
  e.innerHTML = _t(a, t);
}
async function Lt(e, a, t = {}) {
  const s = Ie(mt(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : G(s, { headers: { Accept: "application/json" } })), o = n(r.headers.get("x-request-id")), l = Q(r.headers);
    if (!r.ok) {
      const m = await B(r);
      return {
        status: "error",
        filters: a,
        message: m.message,
        requestURL: s,
        requestId: o,
        traceId: l,
        statusCode: r.status,
        errorCode: m.textCode
      };
    }
    const c = Ee(u(await r.json()));
    return {
      status: c.items.length ? "ready" : "empty",
      filters: a,
      response: c,
      requestURL: s,
      requestId: o,
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
function we(e, a) {
  const t = new FormData(e), s = (r, o) => t.has(r) ? n(t.get(r)) : o, i = (r, o) => t.has(r) ? v(t.get(r), o) : o;
  return J({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: i("page", a.page),
    perPage: i("per_page", a.perPage)
  });
}
function wt(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = dt(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function Gt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  s.familyBasePath || (s.familyBasePath = ye(s.basePath));
  let i = ct(), r = null;
  const o = async (l, c = !1) => {
    i = J(l), c && wt(i), Le(e, {
      status: "loading",
      filters: i
    }, s);
    const m = await Lt(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = m, Le(e, m, s), $t(e, m, o), m;
  };
  return r = await o(i, !1), r;
}
function $t(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (i) => {
    i.preventDefault(), t({
      ...we(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((i) => {
    i.addEventListener("change", () => {
      t({
        ...we(s, a.filters),
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
function w(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function Ct(e, a) {
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
function kt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function St(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function At(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && o ? o : i && a[i] ? a[i] : o;
}
function Qe(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    w("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = ea, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${Ze}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${Se}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((h) => `
                <option value="${y(h)}" ${h === i ? "selected" : ""}>
                  ${d(h.toUpperCase())}${h === t.recommendedLocale ? " (recommended)" : ""}
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
              ${ue({
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
  ].map((h) => `
                  <option value="${h}" ${h === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${S(h)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${y(kt(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${R}">Cancel</button>
          <button type="submit" class="${E}">${d(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r), Je(r, e.assigneeOptionsBasePath || "/admin/api", { fetch: e.fetch });
  const o = r.querySelector('[role="dialog"]'), l = r.querySelector("form"), c = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), p = r.querySelector('select[name="assignee_id"]'), g = r.querySelector('select[name="priority"]'), f = r.querySelector('input[name="due_date"]'), L = r.querySelector('[data-assignment-fields="true"]'), _ = r.querySelector('[data-create-locale-feedback="true"]'), $ = r.querySelector('button[type="submit"]'), I = () => {
    U(), r.remove();
  }, A = () => {
    !L || !m || (L.hidden = !m.checked);
  }, U = o ? ia(o, I) : () => {
  };
  A(), m?.addEventListener("change", A), r.querySelectorAll('[data-close-modal="true"]').forEach((h) => {
    h.addEventListener("click", I);
  }), r.addEventListener("click", (h) => {
    h.target === r && I();
  }), l?.addEventListener("submit", async (h) => {
    if (h.preventDefault(), !c || !$) return;
    _ && (_.hidden = !0, _.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const D = n(c.value).toLowerCase();
    try {
      const W = await e.onSubmit({
        locale: D,
        autoCreateAssignment: m?.checked,
        assigneeId: p?.value,
        priority: g?.value,
        dueDate: St(f?.value || "")
      });
      I(), await e.onSuccess?.(W);
    } catch (W) {
      const fe = Ct(W, D);
      _ && (_.hidden = !1, _.textContent = fe), w("error", fe);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Tt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: ie(be(e.dataset.quickCreate, {}), {}),
    localeURLs: be(e.dataset.localeUrls, {})
  };
}
function Yt(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Tt(a), s = Xe({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const o = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        Qe({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (l) => s.createLocale(t.familyId, l),
          onSuccess: async (l) => {
            w("success", `${l.locale.toUpperCase()} locale created.`);
            const c = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = At(l, t.localeURLs, t.requestedLocale, c);
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
function qt(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (n(a.dataset.localeAssignmentSource) === "empty-panel" ? n(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function Rt(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function It(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (n(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function Pt(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function Ft(e, a) {
  const t = n(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", i = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, i.appendChild(r);
  let o = t === "";
  for (const l of a) {
    const c = e.ownerDocument.createElement("option");
    c.value = l.value, c.textContent = Pt(l), l.description && c.setAttribute("data-description", l.description), l.displayName && c.setAttribute("data-display-name", l.displayName), l.avatarURL && c.setAttribute("data-avatar-url", l.avatarURL), t && t === l.value && (c.selected = !0, o = !0), i.appendChild(c);
  }
  if (t && !o) {
    const l = e.ownerDocument.createElement("option");
    l.value = t, l.textContent = t, l.selected = !0, i.appendChild(l);
  }
  e.replaceChildren(i);
}
async function Je(e, a, t = {}) {
  const s = Array.from(e.querySelectorAll("[data-family-assignee-select]"));
  if (s.length === 0) return;
  const i = s.map((r) => n(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await Ua(a, i, t);
    for (const o of s) Ft(o, r);
  } catch {
    for (const r of s) {
      const o = n(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const l = r.ownerDocument.createElement("option");
      l.value = o, l.textContent = o || "Assignees unavailable", l.selected = !0, r.appendChild(l), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function ee(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function $e(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = n(t?.dataset.assignToMeEnabled) === "true", i = n(t?.dataset.assignToUserEnabled) === "true", r = n(t?.dataset.assignToMeReason), o = n(t?.dataset.assignToUserReason);
  ee(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), ee(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), i, o), ee(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), i, o);
}
async function V(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  z(e, { status: "loading" }, i);
  const r = await ve(s, { fetch: a.fetch });
  z(e, r, i);
  const o = rt(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const m = `${k(i.basePath || "/admin")}/api`, p = Xe({
        basePath: m,
        fetch: a.fetch
      });
      await Je(e, m, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((f) => {
        f.dataset.translationCreateBound !== "true" && (f.dataset.translationCreateBound = "true", f.addEventListener("click", (L) => {
          L.preventDefault();
          const _ = r.detail;
          if (!_) {
            w("error", "Translation family detail is unavailable.");
            return;
          }
          if (f.getAttribute("aria-disabled") === "true") {
            w("warning", _.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const $ = n(f.dataset.locale).toLowerCase() || _.quickCreate.recommendedLocale || "", I = Ta(_, $);
          Qe({
            familyId: _.familyId,
            quickCreate: I,
            initialLocale: $,
            heading: `Create ${$.toUpperCase()} locale`,
            assigneeOptionsBasePath: m,
            fetch: a.fetch,
            onSubmit: (A) => p.createLocale(_.familyId, {
              ...A,
              channel: o
            }),
            onSuccess: async (A) => {
              w("success", `${A.locale.toUpperCase()} locale created.`), await V(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
      const g = async (f, L) => {
        const _ = r.detail;
        if (!_) {
          w("error", "Translation family detail is unavailable.");
          return;
        }
        const $ = qt(e, f), I = $ ? _.localeAssignments[$] : null;
        if (!I) {
          w("error", "Assignment action metadata is unavailable.");
          return;
        }
        const A = Rt(I, L);
        if (!A.enabled) {
          w("warning", A.reason || "Assignment action is unavailable.");
          return;
        }
        const U = {};
        if (L === "user") {
          const h = It(e, $, f), D = n(h?.value);
          if (!D) {
            w("warning", "Assignee is required."), h?.focus();
            return;
          }
          U.assignee_id = D;
        }
        L !== "claim" && o && (U.channel = o), f.disabled = !0, f.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await Ia(A, U, { fetch: a.fetch }), w("success", L === "claim" ? "Assignment claimed." : "Assignment updated."), await V(e, {
            ...a,
            ...i,
            endpoint: s
          });
        } catch (h) {
          w("error", h instanceof Error ? h.message : "Failed to update assignment."), f.disabled = !1, f.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      $e(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        $e(e);
      }), e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((f) => {
        f.addEventListener("click", (L) => {
          L.preventDefault(), g(f, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((f) => {
        f.addEventListener("click", (L) => {
          L.preventDefault(), g(f, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((f) => {
        f.addEventListener("click", (L) => {
          L.preventDefault(), g(f, "claim");
        });
      });
    }
    const l = () => {
      const m = e.querySelector(".ui-state-retry-btn");
      m && m.addEventListener("click", () => {
        V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      });
    };
    l();
    const c = e.querySelector('[data-family-sync-action="true"]');
    c && r.syncRecovery?.canSync && c.addEventListener("click", async (m) => {
      m.preventDefault(), c.disabled = !0, c.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const p = r.syncRecovery;
        if (!p) return;
        await ua(p, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const g = await ve(s, { fetch: a.fetch });
        if (g.status === "error" && (g.errorCode === "NOT_FOUND" || g.statusCode === 404)) {
          z(e, {
            ...g,
            syncRecovery: p,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), l();
          return;
        }
        if (g.status !== "ready") {
          const f = g.message || "Sync completed, but family detail reload failed.";
          z(e, {
            ...g,
            syncRecovery: p,
            syncStatus: "failed",
            syncMessage: f
          }, i), l(), w("error", f);
          return;
        }
        w("success", "Translation families synced."), await V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      } catch (p) {
        const g = p instanceof Error ? p.message : "Failed to sync translation families.", f = e.querySelector('[data-family-sync-feedback="true"]');
        f && (f.hidden = !1, f.textContent = g), c.disabled = !1, c.classList.remove("opacity-60", "cursor-not-allowed"), w("error", g);
      }
    });
  }
  return r;
}
function Xe(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = k(e.basePath || "/admin/api");
  async function s(i) {
    return se(i);
  }
  return {
    async list(i = {}) {
      return Ee(await s(await a(Ie(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return De(await s(await a(ya(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const o = _a({
        ...r,
        familyId: i,
        basePath: t
      }), l = new Headers(o.headers), c = {
        method: "POST",
        credentials: "same-origin",
        headers: l,
        body: JSON.stringify(pa(o.request))
      };
      H(o.endpoint, c, l);
      const m = await a(o.endpoint, c);
      if (!m.ok) throw await Ra(m);
      return va(await s(m));
    },
    async createAssignment(i, r = {}) {
      const o = Fe(r), l = ga(t, i, o.channel), c = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && c.set("X-Idempotency-Key", o.idempotencyKey);
      const m = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(ba(o))
      };
      H(l, m, c);
      const p = await a(l, m);
      if (!p.ok) throw await de(p);
      return s(p);
    }
  };
}
export {
  Kt as applyCreateLocaleToFamilyDetail,
  Ht as applyCreateLocaleToSummaryState,
  fa as buildCreateLocaleURL,
  Wa as buildFamilyActivityPreview,
  ga as buildFamilyAssignmentURL,
  ut as buildFamilyDetailUIURL,
  ya as buildFamilyDetailURL,
  dt as buildFamilyListBrowserSearch,
  Re as buildFamilyListQuery,
  Ie as buildFamilyListURL,
  yt as buildFamilyMatrixURL,
  ft as buildFamilyQueueURL,
  ca as buildTranslationFamilySyncRPCRequest,
  J as createFamilyFilters,
  _a as createTranslationCreateLocaleActionModel,
  Pe as createTranslationCreateLocaleRequest,
  Fe as createTranslationFamilyAssignmentRequest,
  Xe as createTranslationFamilyClient,
  ua as dispatchTranslationFamilySync,
  ve as fetchTranslationFamilyDetailState,
  Lt as fetchTranslationFamilyListState,
  qa as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  Gt as initTranslationFamilyListPage,
  Yt as initTranslationSummaryCards,
  va as normalizeCreateLocaleResult,
  De as normalizeFamilyDetail,
  Ee as normalizeFamilyListResponse,
  La as normalizeFamilyListRow,
  ie as normalizeQuickCreateHints,
  la as normalizeTranslationFamilySyncRecoveryCapability,
  lt as parseFamilyListFiltersFromSearchParams,
  ct as readFamilyListFiltersFromLocation,
  ce as renderReadinessChip,
  z as renderTranslationFamilyDetailPage,
  it as renderTranslationFamilyDetailState,
  Le as renderTranslationFamilyListPage,
  _t as renderTranslationFamilyListState,
  pa as serializeCreateLocaleRequest,
  ba as serializeFamilyAssignmentRequest,
  kt as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map