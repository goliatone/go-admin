import { escapeAttribute as g, escapeHTML as m } from "../shared/html.js";
import { appendCSRFHeader as Y, httpRequest as W, readHTTPJSON as le } from "../shared/transport/http-client.js";
import { extractStructuredError as O } from "../toast/error-helpers.js";
import { buildURL as E, getNumberSearchParam as Ce, getStringSearchParam as P, readLocationSearchParams as Fe, setNumberSearchParam as $e, setSearchParam as q } from "../shared/query-state/url-state.js";
import { initActionMenus as ga } from "../shared/action-menu.js";
import { trimTrailingSlash as C } from "../shared/path-normalization.js";
import { parseJSONValue as Ae } from "../shared/json-parse.js";
import { asLooseBoolean as L, asNumberish as w, asRecord as y, asString as n, asStringArray as v } from "../shared/coercion.js";
import { A as Ue, C as B, D as ya, E as pa, F as ba, O as De, P as ha, R as va, T as xa, dt as J, et as _a, ht as wa, k as Be, tt as La, v as Ca, x as R, y as F } from "../chunks/translation-shared-CdZJJA93.js";
import { formatTranslationTimestampUTC as ce, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as $a } from "../shared/record-normalization.js";
var Se = /* @__PURE__ */ new WeakMap();
function Aa(e, a = {}) {
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
function Sa(e, a = "") {
  const t = n(a), s = ka(e);
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
function ka(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function Ta(e, a) {
  const t = y(e);
  return Object.keys(t).length === 0 || !L(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function qa(e, a = {}) {
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
    body: JSON.stringify(Sa(e, a.correlationId))
  };
  Y(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const f = await O(r);
    throw new Error(f.message || "Failed to sync translation families.");
  }
  const o = y(await r.json().catch(() => ({}))), c = y(o.error);
  if (Object.keys(c).length > 0) throw new Error(n(c.message) || "Failed to sync translation families.");
  const d = y(o.data), l = Ta(d.receipt, e.commandName);
  if (!l) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...d,
    receipt: l
  };
}
function X(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function N(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Ne(e) {
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
function Z(e = {}) {
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
function Me(e = {}) {
  const a = Z(e), t = new URLSearchParams();
  return q(t, "content_type", a.contentType), q(t, "readiness_state", a.readinessState), q(t, "blocker_code", a.blockerCode), q(t, "missing_locale", a.missingLocale), q(t, "channel", a.channel), $e(t, "page", a.page, { min: 1 }), $e(t, "per_page", a.perPage, { min: 1 }), t;
}
function ee(e, a = "", t = "") {
  const s = C(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function Oe(e, a = {}) {
  return E(ee(e), Me(a));
}
function Ia(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), E(ee(e, a), s);
}
function je(e = {}) {
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
function Ra(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), E(ee(e, a, "/variants"), s);
}
function Pa(e = {}) {
  const a = je(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0, a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate)), a.channel && (t.channel = a.channel), t;
}
function Ve(e = {}) {
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
function Ea(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), E(ee(e, a, "/assignments"), s);
}
function Fa(e = {}) {
  const a = Ve(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function Ua(e) {
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
function Da(e) {
  return {
    autoCreateAssignment: L(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function de(e, a = {}) {
  const t = y(e.default_assignment), s = v(e.missing_locales ?? a.missingLocales), i = v(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? L(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: Da({
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
function Ba(e) {
  const a = y(e.data), t = y(e.meta), s = y(t.family), i = y(t.refresh), r = y(a.navigation), o = de(y(s.quick_create), { missingLocales: v(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Ua(y(a.assignment)) : null,
    idempotencyHit: L(t.idempotency_hit),
    assignmentReused: L(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: N(s.readiness_state),
      missingRequiredLocaleCount: w(s.missing_required_locale_count),
      pendingReviewCount: w(s.pending_review_count),
      outdatedLocaleCount: w(s.outdated_locale_count),
      blockerCodes: v(s.blocker_codes),
      missingLocales: v(s.missing_locales),
      availableLocales: v(s.available_locales),
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
function Na(e) {
  const a = n(e.familyId), t = je(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Ra(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Ma(e) {
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
    blockerCodes: v(e.blocker_codes).map(Ne),
    blockerLabels: a,
    missingLocales: v(e.missing_locales),
    availableLocales: v(e.available_locales)
  };
}
function ze(e) {
  const a = y(e.data), t = y(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => Ma(y(o))),
    total: w(i.total),
    page: w(i.page, 1),
    perPage: w(i.per_page, 50),
    channel: n(i.channel)
  };
}
function ke(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: L(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: $a(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Oa(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Ne(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: y(e.details)
  };
}
function z(e) {
  const a = y(e.link);
  return {
    enabled: L(e.enabled),
    permission: n(e.permission),
    endpoint: n(e.endpoint),
    href: n(e.href || a.href),
    label: n(e.label || a.label),
    reason: n(e.reason),
    reasonCode: n(e.reason_code ?? e.reasonCode),
    requiredFields: v(e.required_fields ?? e.requiredFields),
    payload: y(e.payload),
    assignmentId: n(e.assignment_id ?? e.assignmentId),
    expectedVersion: w(e.expected_version ?? e.expectedVersion)
  };
}
function me(e) {
  return {
    assignToMe: z(y(e.assign_to_me ?? e.assignToMe)),
    assignToUser: z(y(e.assign_to_user ?? e.assignToUser)),
    claim: z(y(e.claim)),
    openEditor: z(y(e.open_editor ?? e.openEditor))
  };
}
function He(e) {
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
    links: Va(y(e.links)),
    actions: me(y(e.actions))
  };
}
function ja(e) {
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
function Va(e) {
  return { editor: ja(y(e.editor)) };
}
function za(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? He(y(e.assignment)) : null,
    actions: me(y(e.actions))
  };
}
function Ha(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const i = n(t).toLowerCase();
    i && (a[i] = za(y(s)));
  }
  return a;
}
function Ke(e) {
  const a = y(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? ke(y(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((u) => Oa(y(u))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((u) => ke(y(u))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((u) => He(y(u))) : [], c = Ha(y(t.locale_assignments ?? t.localeAssignments)), d = y(t.publish_gate), l = y(t.readiness_summary), f = de(y(t.quick_create), {
    missingLocales: v(l.missing_locales),
    recommendedLocale: n(l.recommended_locale),
    requiredForPublish: v(l.required_for_publish ?? l.required_locales)
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
      blockedBy: v(d.blocked_by),
      reviewRequired: L(d.review_required)
    },
    readinessSummary: {
      state: N(l.state),
      requiredLocales: v(l.required_locales),
      missingLocales: v(l.missing_locales),
      availableLocales: v(l.available_locales),
      blockerCodes: v(l.blocker_codes),
      missingRequiredLocaleCount: w(l.missing_required_locale_count),
      pendingReviewCount: w(l.pending_review_count),
      outdatedLocaleCount: w(l.outdated_locale_count),
      publishReady: L(l.publish_ready)
    },
    quickCreate: f
  };
}
function M(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const i = n(s).toLowerCase();
    i && a.add(i);
  }
  return Array.from(a).sort();
}
function Ge(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function ue(e) {
  return M(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function Ka(e) {
  return e.blockers.some(pe);
}
function fe(e, a) {
  const t = n(a).toLowerCase();
  return !t || Ka(e) ? !1 : ue(e).includes(t);
}
function Ye(e, a) {
  const t = ue(e), s = n(a).toLowerCase(), i = fe(e, s);
  return {
    ...e.quickCreate,
    enabled: i,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: i ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: i ? "" : e.quickCreate.disabledReasonCode
  };
}
function ys(e, a) {
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
      actions: me({})
    }, l = i.findIndex((f) => f.id === d.id || f.targetLocale === d.targetLocale);
    l >= 0 ? i[l] = d : i = [...i, d].sort((f, u) => f.targetLocale.localeCompare(u.targetLocale));
  }
  const r = e.blockers.map((d) => ({ ...d })).filter((d) => !(d.blockerCode === "missing_locale" && d.locale === t)), o = M(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = Ge(M(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function ps(e, a) {
  const t = { ...e }, s = { ...y(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const c = M(v(t.available_locales), v(s.available_locales), a.family.availableLocales, [i]), d = Ge(M(v(t.missing_required_locales), v(s.missing_required_locales), a.family.missingLocales), i);
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
function Ga(e) {
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
function ge(e) {
  const a = Ga(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label.toUpperCase()}</span>`;
}
async function Ya(e) {
  const a = await O(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = X(e.headers), t.metadata = y(a.metadata), t;
}
async function ye(e) {
  const a = await O(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = X(e.headers), t.metadata = y(a.metadata), t;
}
async function ne(e, a = {}, t = {}) {
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
  Y(s, o, r);
  const c = await (t.fetch ? t.fetch(s, o) : W(s, o));
  if (!c.ok) throw await ye(c);
  return le(c);
}
function Qa(e) {
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
function Wa(e) {
  const a = y(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), i = [];
  for (const r of t) {
    const o = Qa(r);
    !o || s.has(o.value) || (s.add(o.value), i.push(o));
  }
  return i;
}
function Ja(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = a.map((i) => n(i)).find(Boolean);
  return s && t.set("assignee_id", s), E(`${C(e || "/admin/api")}/translations/options/assignees`, t);
}
async function Xa(e, a = [], t = {}) {
  const s = Ja(e, a), i = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : W(s, { headers: { Accept: "application/json" } }));
  if (!i.ok) throw await ye(i);
  return Wa(await le(i));
}
function Za(e) {
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
function et(e) {
  return J(Za(e));
}
function at(e) {
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
function Qe(e) {
  return J(at(e));
}
function tt(e) {
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
function We(e) {
  return J(tt(e));
}
function A(e, a) {
  return n(e[a]);
}
function pe(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = A(e.details, "reason").toLowerCase(), t = A(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(A(e.details, "content_type") || A(e.details, "environment")), i = !!(A(e.details, "message") || A(e.details, "policy_reason"));
  return s && !a && !i;
}
function st(e) {
  return pe(e) ? "Policy unavailable" : S(e.blockerCode);
}
function nt(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", A(a, "content_type")],
    ["Environment", A(a, "environment")]
  ], s = A(a, "reason"), i = A(a, "message"), r = A(a, "remediation");
  return pe(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), i && i !== s && t.push(["Message", i]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function it(e) {
  const a = nt(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${m(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${m(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function rt(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function Je(e) {
  return J(rt(e));
}
function ot(e, a, t) {
  const s = C(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function Xe(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Ze(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function lt(e, a, t = "") {
  const s = n(a).toLowerCase();
  if (!s) return null;
  const i = Ze(s, t);
  if (e.localeAssignments[i]) return e.localeAssignments[i];
  for (const [r, o] of Object.entries(e.localeAssignments)) if (r.startsWith(`${s}:`)) return o;
  return null;
}
function ea(e) {
  return e && (e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function aa(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function ct(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function dt(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${g(e.state)}">No active assignment.</p>`;
  const t = a.dueState || Xe(a.dueDate), s = t === "none" ? "No due date" : S(t);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${g(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Qe(a.status)}">${m(S(a.status))}</span>
      <span>${m(ea(a))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${m(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${Je(t)}">${m(s)}</span>
    </div>
  `;
}
function mt(e) {
  if (!e || e.state === "source_locale") return "";
  const a = Ze(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled && s.push(`
      <button type="button" class="${R}" data-family-assign-to-me="true" data-locale-assignment-key="${g(a)}">
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-nowrap">
        ${be({
    key: a,
    ariaLabel: "Assignee",
    className: `${sa} min-w-0 flex-1 sm:w-80 sm:flex-none lg:w-96`
  })}
        <button type="button" class="${R}" data-family-assign-to-user="true" data-locale-assignment-key="${g(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${R}" data-family-claim-assignment="true" data-locale-assignment-key="${g(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${g(a)}"
        href="${g(t.openEditor.href)}"
      >${m(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end" data-family-locale-actions="true">${s.join("")}</div>`;
  const i = aa(e);
  return i ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${g(a)}">${m(i)}</p>` : "";
}
function ut(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => ct(a)).sort(([a], [t]) => a.localeCompare(t));
}
function ft(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${g(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${g(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function ie(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${g(a || "Assignment action is unavailable.")}"`;
}
function Te(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var ta = "block h-12 w-full rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:focus:ring-gray-600", sa = ta, gt = "/api/translations/options/assignees?per_page=200";
function be(e) {
  const a = n(e.key), t = n(e.initialValue), s = e.enabled !== !1, i = n(e.placeholder) || "Select assignee", r = n(e.reason), o = n(e.name), c = ie(s, r);
  return `
    <select
      ${o ? `name="${g(o)}"` : ""}
      class="${g(e.className || sa)}"
      data-family-assignee-select="${g(a)}"
      data-initial-assignee-id="${g(t)}"
      data-formgen-managed="true"
      data-formgen-relationship="true"
      data-endpoint-url="${gt}"
      data-endpoint-method="GET"
      data-endpoint-renderer="typeahead"
      data-endpoint-search-param="q"
      data-endpoint-value-field="value"
      data-endpoint-label-field="label"
      data-endpoint-placeholder="${g(i)}"
      data-endpoint-search-placeholder="Search assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      ${t ? `data-relationship-current="${g(t)}"` : ""}
      aria-label="${g(e.ariaLabel || "Assignee")}"
      ${c}
    >
      <option value="">${m(s ? i : r || i)}</option>
      ${t ? `<option value="${g(t)}" selected>${m(t)}</option>` : ""}
    </select>
  `;
}
function yt(e, a = 5) {
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
function pt(e) {
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
function bt(e, a) {
  const t = C(a.contentBasePath || `${C(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (c) => {
    const d = !fe(e, c);
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
    const d = ot(t, e, c), l = lt(e, c.locale), f = d ? `<a href="${g(d)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', u = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${et(c.status)}">${m(S(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(u)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${m(ce(c.updatedAt || c.createdAt)) || "n/a"}</p>
          ${dt(l)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${mt(l)}
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
function ht(e) {
  if (!e.activeAssignments.length) {
    const a = ut(e), t = a[0]?.[1] || null, s = a.some(([, r]) => r.actions.assignToMe.enabled), i = a.some(([, r]) => r.actions.assignToUser.enabled);
    return `
      <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto_auto] 2xl:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="${ta}" data-family-assignment-locale-select="true">
                ${a.map(([r, o]) => `
                  <option value="${g(r)}" ${ft(o)}>${m(o.locale.toUpperCase())} · ${m(o.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            ${i ? `
              <label class="grid gap-2">
                <span class="text-sm font-medium text-gray-900">Assignee</span>
                ${be({
      key: "__empty_panel__",
      enabled: !!t?.actions.assignToUser.enabled,
      reason: t?.actions.assignToUser.reason,
      ariaLabel: "Assignee"
    })}
              </label>
            ` : "<div></div>"}
            ${s ? `
              <button type="button" class="${R} w-full 2xl:w-auto${Te(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${ie(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${i ? `
              <button type="button" class="${F} w-full 2xl:w-auto${Te(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${ie(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${m(aa(Object.values(e.localeAssignments).find((r) => r.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Xe(a.dueDate), s = t === "none" ? "No due date" : S(t), i = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${m(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Qe(a.status)}">${m(S(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Je(t)}">${m(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${m(ea(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${m(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${m(ce(a.updatedAt || a.createdAt)) || "n/a"}</p>
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
function vt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${We(t.blockerCode)}">${m(st(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${m(s)}</span>` : ""}
              </div>
              ${it(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${ge(e.readinessState)}
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
function xt(e) {
  const a = yt(e);
  return `
    <section class="${B} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${m(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${m(ce(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${m(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function G(e) {
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
function na(e) {
  return `
    <div class="${va}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${m(e)}</span>
      </div>
    </div>
  `;
}
function re(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${xa} p-8 text-center shadow-sm">
        <h2 class="${ya}">${m(e)}</h2>
        <p class="${pa} mt-2">${m(a)}</p>
      </div>
    </div>
  `;
}
function _t(e, a, t) {
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
    <div class="${De} p-6" role="alert">
      <h2 class="${Ue}">${m(e)}</h2>
      <p class="${Be} mt-2">${m(a)}</p>
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
function wt(e, a = {}) {
  if (e.status === "loading") return na("Loading translation family...");
  if (e.status === "empty") return `
      ${re("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${G(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${_t(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${G(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return re("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(S).join(", ") : "No blockers", r = ue(t), o = t.quickCreate.recommendedLocale || r[0] || "", c = !fe(t, o), d = o ? `
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
            <p class="${ha}">Translation family</p>
            <h1 class="${ba} mt-2">${m(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${m(t.contentType)} · Source locale ${m(t.sourceLocale.toUpperCase())} · Family ${m(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${ge(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${m(i)}</span>
            ${d}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${pt(t)}
        </div>
        ${G(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${bt(t, a)}
          ${ht(t)}
        </div>
        <div class="space-y-6">
          ${vt(t)}
          ${xt(t)}
        </div>
      </div>
    </div>
  `;
}
async function oe(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : W(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = X(s.headers);
    if (!s.ok) {
      const c = await O(s), d = y(c.metadata?.sync_recovery), l = c.textCode === "NOT_FOUND" || L(d.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: c.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: c.textCode,
        syncRecovery: l ? Aa(d, { familyId: n(c.metadata?.family_id) }) : null
      };
    }
    const o = Ke(y(await s.json()));
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
function ia(e) {
  const a = Fe(), t = a ? P(a, "channel") : "";
  if (t) return t;
  try {
    return P(new URL(n(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function H(e, a, t = {}) {
  e.innerHTML = wt(a, t);
}
var Lt = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function Ct(e) {
  const a = e ?? new URLSearchParams();
  return Z({
    channel: P(a, "channel") || "",
    contentType: P(a, "content_type") || "",
    readinessState: P(a, "readiness_state") || "",
    blockerCode: P(a, "blocker_code") || "",
    missingLocale: P(a, "missing_locale") || "",
    page: Ce(a, "page") || 1,
    perPage: Ce(a, "per_page") || 50
  });
}
function qe(e = globalThis.location) {
  return Ct(Fe(e));
}
function $t(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of Lt) t.delete(s);
  return Me(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function ra(e, a = "/admin") {
  const t = C(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${C(a || "/admin")}/api`;
}
function he(e = "/admin") {
  return `${C(e || "/admin")}/translations/families`;
}
function At(e, a, t = "") {
  const s = C(e || he("/admin")), i = new URLSearchParams();
  return q(i, "channel", t), E(`${s}/${encodeURIComponent(n(a))}`, i);
}
function ve(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) q(s, i, r);
  return E(t, s);
}
function St(e, a, t = {}) {
  return ve(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function kt(e, a, t = {}) {
  return ve(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function oa(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function T(e, a, t) {
  return `<option value="${g(e)}" ${e === t ? "selected" : ""}>${m(a)}</option>`;
}
function Tt(e) {
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
  ].map((t) => T(t, t, a)).join("")}
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
function Ie(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase text-gray-700">${m(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${m(a)}</span>`;
}
function qt(e) {
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
  return t.map(({ code: s, label: i }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${We(s)}">${m(i.toUpperCase())}</span>`).join(" ");
}
function te(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-50 px-2 py-1 text-xs">
      <span class="font-semibold ${t}">${m(e)}</span>
      <span class="font-semibold uppercase tracking-wide text-gray-500">${m(a.toUpperCase())}</span>
    </span>
  `;
}
function It(e, a, t, s) {
  return `
    <div class="relative flex justify-end" data-action-menu>
      <button type="button"
              class="actions-menu-trigger rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100"
              data-action-menu-trigger
              aria-label="Actions for ${g(oa(e))}"
              aria-haspopup="true"
              aria-expanded="false">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>
      <div class="actions-menu hidden absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
           data-action-menu-content
           role="menu"
           aria-orientation="vertical">
        <a class="action-item flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
           data-action-menu-item
           role="menuitem"
           href="${g(a)}">Open family</a>
        ${t ? `<a class="action-item flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" data-action-menu-item role="menuitem" href="${g(t)}">Matrix</a>` : ""}
        ${s ? `<a class="action-item flex w-full items-center px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" data-action-menu-item role="menuitem" href="${g(s)}">Queue</a>` : ""}
      </div>
    </div>
  `;
}
function Re(e, a) {
  return ve(e, {
    channel: n(a.channel),
    content_type: n(a.contentType),
    readiness_state: n(a.readinessState),
    blocker_code: n(a.blockerCode),
    missing_locale: n(a.missingLocale)
  });
}
function Rt(e, a, t) {
  const s = t.familyBasePath || he(t.basePath || "/admin");
  return e.map((i) => {
    const r = At(s, i.familyId, a.channel), o = t.matrixPath ? St(t.matrixPath, i, a) : "", c = t.queuePath ? kt(t.queuePath, i, a) : "", d = oa(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${g(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${g(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${m(d)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${m(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${m(i.contentType || "unknown")} · Source ${m(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${ge(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${qt(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-nowrap gap-1.5">
            ${te(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${te(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${te(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${Ie(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${Ie(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          ${It(i, r, o, c)}
        </td>
      </tr>
    `;
  }).join("");
}
function Pt(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, i = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, o = e.page * e.perPage < e.total, c = t.matrixPath || t.queuePath ? `
      <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1" aria-label="Translation family views">
        ${t.matrixPath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${g(Re(t.matrixPath, a))}">Matrix</a>` : ""}
        ${t.queuePath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${g(Re(t.queuePath, a))}">Queue</a>` : ""}
      </div>
    ` : "";
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${m(s)}-${m(i)} of ${m(e.total)} families</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${c}
          <button type="button" class="${R}" data-family-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${m(e.page)}</span>
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
            ${Rt(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Et(e) {
  return `
    <div class="${De} mt-6 p-6" role="alert">
      <h2 class="${Ue}">Families failed to load</h2>
      <p class="${Be} mt-2">${m(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${m(e.requestURL)}</p>` : ""}
      ${G({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${R}">Retry</button>
    </div>
  `;
}
function Ft(e, a = {}) {
  const t = e.filters, s = Tt(t);
  if (e.status === "loading") return `${s}${na("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Et(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${re("No translation families found", "No families match the current filters.")}` : `${s}${Pt(i, t, a)}`;
}
function Pe(e, a, t = {}) {
  e.innerHTML = Ft(a, t);
}
async function Ut(e, a, t = {}) {
  const s = Oe(ra(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : W(s, { headers: { Accept: "application/json" } })), o = n(r.headers.get("x-request-id")), c = X(r.headers);
    if (!r.ok) {
      const l = await O(r);
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
    const d = ze(y(await r.json()));
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
function Ee(e, a) {
  const t = new FormData(e), s = (r, o) => t.has(r) ? n(t.get(r)) : o, i = (r, o) => t.has(r) ? w(t.get(r), o) : o;
  return Z({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: i("page", a.page),
    perPage: i("per_page", a.perPage)
  });
}
function Dt(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = $t(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function bs(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  if (s.familyBasePath || (s.familyBasePath = he(s.basePath)), t.ssrEnhanced === "true")
    return e.dataset.translationFamilyListEnhanced = "true", la(e), {
      status: "ready",
      filters: qe()
    };
  let i = qe(), r = null;
  const o = async (c, d = !1) => {
    i = Z(c), d && Dt(i), Pe(e, {
      status: "loading",
      filters: i
    }, s);
    const l = await Ut(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = l, Pe(e, l, s), Bt(e, l, o), l;
  };
  return r = await o(i, !1), r;
}
function Bt(e, a, t) {
  la(e);
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (i) => {
    i.preventDefault(), t({
      ...Ee(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((i) => {
    i.addEventListener("change", () => {
      t({
        ...Ee(s, a.filters),
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
function la(e) {
  e.dataset.translationFamilyListActionMenusStandalone !== "true" && (Se.get(e)?.destroy(), Se.set(e, ga(e, {
    containerSelector: "[data-action-menu]",
    triggerSelector: "[data-action-menu-trigger]",
    menuSelector: "[data-action-menu-content]",
    itemSelector: '[data-action-menu-item], [role="menuitem"], .action-item'
  })));
}
function b(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function Nt(e, a) {
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
function Mt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Ot(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function jt(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && o ? o : i && a[i] ? a[i] : o;
}
function xe(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    b("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = La, r.setAttribute("data-translation-create-locale-modal", "true"), r.setAttribute("data-formgen-auto-init", "true"), r.innerHTML = `
    <div class="${_a}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${m(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${m(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${Ca}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((_) => `
                <option value="${g(_)}" ${_ === i ? "selected" : ""}>
                  ${m(_.toUpperCase())}${_ === t.recommendedLocale ? " (recommended)" : ""}
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
              ${be({
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
  ].map((_) => `
                  <option value="${_}" ${_ === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${S(_)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${g(Mt(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${R}">Cancel</button>
          <button type="submit" class="${F}">${m(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r), we(r, e.assigneeOptionsBasePath || "/admin/api", { fetch: e.fetch });
  const o = r.querySelector('[role="dialog"]'), c = r.querySelector("form"), d = r.querySelector('select[name="locale"]'), l = r.querySelector('input[name="auto_create_assignment"]'), f = r.querySelector('select[name="assignee_id"]'), u = r.querySelector('select[name="priority"]'), p = r.querySelector('input[name="due_date"]'), h = r.querySelector('[data-assignment-fields="true"]'), x = r.querySelector('[data-create-locale-feedback="true"]'), $ = r.querySelector('button[type="submit"]'), I = () => {
    U(), r.remove();
  }, k = () => {
    !h || !l || (h.hidden = !l.checked);
  }, U = o ? wa(o, I) : () => {
  };
  k(), l?.addEventListener("change", k), r.querySelectorAll('[data-close-modal="true"]').forEach((_) => {
    _.addEventListener("click", I);
  }), r.addEventListener("click", (_) => {
    _.target === r && I();
  }), c?.addEventListener("submit", async (_) => {
    if (_.preventDefault(), !d || !$) return;
    x && (x.hidden = !0, x.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const D = n(d.value).toLowerCase();
    try {
      const j = !!l?.checked, V = j ? {
        assigneeId: f?.value,
        priority: u?.value,
        dueDate: Ot(p?.value || "")
      } : {}, fa = await e.onSubmit({
        locale: D,
        autoCreateAssignment: j,
        ...V
      });
      I(), await e.onSuccess?.(fa);
    } catch (j) {
      const V = Nt(j, D);
      x && (x.hidden = !1, x.textContent = V), b("error", V);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function Vt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: de(Ae(e.dataset.quickCreate, {}), {}),
    localeURLs: Ae(e.dataset.localeUrls, {})
  };
}
function hs(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Vt(a), s = Le({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const o = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        xe({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            b("success", `${c.locale.toUpperCase()} locale created.`);
            const d = typeof window < "u" && window.location.pathname.endsWith("/edit"), l = jt(c, t.localeURLs, t.requestedLocale, d);
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
function ca(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (n(a.dataset.localeAssignmentSource) === "empty-panel" ? n(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function zt(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function Ht(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (n(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function Kt(e) {
  if (!ae(e)) return "";
  const a = e.previousElementSibling;
  if (!(a instanceof HTMLElement)) return "";
  const t = [
    a.dataset.value,
    a.dataset.selectedValue,
    a.dataset.selectedId,
    a.dataset.relationshipValue
  ].map(n).find(Boolean);
  if (t) return t;
  const s = a.querySelector("input");
  return [
    s?.dataset.value,
    s?.dataset.selectedValue,
    s?.dataset.selectedId,
    s?.dataset.relationshipValue,
    s?.getAttribute("data-value"),
    s?.getAttribute("data-selected-value"),
    s?.getAttribute("data-selected-id"),
    s?.getAttribute("data-relationship-value")
  ].map(n).find(Boolean) || "";
}
function da(e, a, t) {
  const s = Ht(e, a, t);
  if (!s) return {
    select: s,
    assigneeID: ""
  };
  const i = n(s.selectedOptions[0]?.value);
  return {
    select: s,
    assigneeID: [
      s.value,
      i,
      s.dataset.value,
      s.dataset.selectedValue,
      s.dataset.initialAssigneeId,
      Kt(s)
    ].map(n).find(Boolean) || ""
  };
}
function ma(e) {
  if (!e) return;
  const a = e.previousElementSibling;
  ((ae(e) && a instanceof HTMLElement ? a.querySelector("input") : null) || e).focus();
}
function Gt(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function Yt(e, a) {
  const t = n(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", i = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, i.appendChild(r);
  let o = t === "";
  for (const c of a) {
    const d = e.ownerDocument.createElement("option");
    d.value = c.value, d.textContent = Gt(c), c.description && d.setAttribute("data-description", c.description), c.displayName && d.setAttribute("data-display-name", c.displayName), c.avatarURL && d.setAttribute("data-avatar-url", c.avatarURL), t && t === c.value && (d.selected = !0, o = !0), i.appendChild(d);
  }
  if (t && !o) {
    const c = e.ownerDocument.createElement("option");
    c.value = t, c.textContent = t, c.selected = !0, i.appendChild(c);
  }
  e.replaceChildren(i);
}
function ua(e) {
  return Array.from(e.querySelectorAll("[data-family-assignee-select]"));
}
function _e(e) {
  return ua(e).filter((a) => a.dataset.formgenManaged === "true");
}
function ae(e) {
  const a = e.previousElementSibling;
  return a instanceof HTMLElement && a.getAttribute("data-fg-typeahead-root") === "true";
}
function Qt(e) {
  return e.dataset.familyAssigneeFormgenReady === "true";
}
function Wt(e) {
  for (const a of _e(e)) ae(a) && (a.dataset.familyAssigneeFormgenReady = "true");
}
function Jt(e) {
  for (const a of e)
    delete a.dataset.familyAssigneeFormgenReady, ae(a) && a.previousElementSibling?.remove();
}
function Xt(e, a) {
  const t = C(a || "/admin/api"), s = t.endsWith("/api") ? t.slice(0, -4) || "/admin" : C(t);
  for (const i of _e(e)) {
    const r = n(i.dataset.endpointUrl);
    if (!(!r || /^https?:\/\//i.test(r))) {
      if (r === "/api") {
        i.dataset.endpointUrl = `${s}/api`;
        continue;
      }
      r.startsWith("/api/") && (i.dataset.endpointUrl = `${s}${r}`);
    }
  }
}
async function we(e, a, t = {}) {
  const s = _e(e);
  if (s.length > 0 && typeof window < "u") {
    Xt(e, a);
    const i = window.FormgenRelationships;
    if (i && typeof i.initRelationships == "function") {
      const r = e instanceof HTMLElement ? e : null, o = r?.hasAttribute("data-formgen-auto-init") ?? !1;
      r && !o && r.setAttribute("data-formgen-auto-init", "true");
      try {
        await i.initRelationships(), Wt(e);
      } catch {
        Jt(s);
      } finally {
        r && !o && r.removeAttribute("data-formgen-auto-init");
      }
    }
  }
  await Zt(e, a, t);
}
async function Zt(e, a, t = {}) {
  const s = ua(e).filter((r) => !Qt(r));
  if (s.length === 0) return;
  const i = s.map((r) => n(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await Xa(a, i, t);
    for (const o of s) Yt(o, r);
  } catch {
    for (const r of s) {
      const o = n(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const c = r.ownerDocument.createElement("option");
      c.value = o, c.textContent = o || "Assignees unavailable", c.selected = !0, r.appendChild(c), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function se(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function Q(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = n(t?.dataset.assignToMeEnabled) === "true", i = n(t?.dataset.assignToUserEnabled) === "true", r = n(t?.dataset.assignToMeReason), o = n(t?.dataset.assignToUserReason);
  se(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), se(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), i, o), se(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), i, o);
}
function es(e, a) {
  const t = n(e.dataset.assignmentId), s = n(e.dataset.familyAssignmentAction), i = w(e.dataset.rowVersion, 0);
  return {
    enabled: !e.disabled && e.getAttribute("aria-disabled") !== "true",
    permission: "",
    endpoint: t && s ? `${C(a)}/translations/assignments/${encodeURIComponent(t)}/actions/${encodeURIComponent(s)}` : "",
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
function as(e, a) {
  return n(a.dataset.localeAssignmentSource) !== "empty-panel" ? null : e.querySelector('[data-family-assignment-locale-select="true"]')?.selectedOptions[0] ?? null;
}
function ts(e, a, t) {
  const s = as(e, a), i = n(a.dataset.assignmentTargetLocale || s?.dataset.assignmentTargetLocale), r = n(a.dataset.assignmentWorkScope || s?.dataset.assignmentWorkScope), o = t === "self" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToMeEndpoint || s?.dataset.assignmentEndpoint) : t === "user" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToUserEndpoint || s?.dataset.assignmentEndpoint) : n(a.dataset.assignmentEndpoint), c = n(a.dataset.assignmentId), d = w(a.dataset.rowVersion, 0), l = {};
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
async function ss(e, a, t, s) {
  const i = ra(a, t.basePath || "/admin"), r = n(e.dataset.familyId), o = ia(a) || n(e.dataset.channel), c = Le({
    basePath: i,
    fetch: s.fetch
  });
  await we(e, i, { fetch: s.fetch }), Q(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
    Q(e);
  }), e.querySelectorAll('[data-translation-create-locale-trigger="true"]').forEach((l) => {
    l.dataset.translationCreateBound !== "true" && (l.dataset.translationCreateBound = "true", l.addEventListener("click", async (f) => {
      if (f.preventDefault(), l.disabled || l.getAttribute("aria-disabled") === "true") {
        b("warning", l.getAttribute("title") || "Locale creation is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const u = await oe(a, { fetch: s.fetch });
        if (u.status !== "ready" || !u.detail) {
          b("error", u.message || "Translation family detail is unavailable.");
          return;
        }
        const p = n(l.dataset.locale).toLowerCase() || u.detail.quickCreate.recommendedLocale || "";
        xe({
          familyId: u.detail.familyId || r,
          quickCreate: Ye(u.detail, p),
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
    const u = ts(e, l, f);
    if (!u.enabled) {
      b("warning", u.reason || "Assignment action is unavailable.");
      return;
    }
    const p = {};
    if (f === "user") {
      const { select: h, assigneeID: x } = da(e, ca(e, l), l);
      if (!x) {
        b("warning", "Assignee is required."), ma(h);
        return;
      }
      p.assignee_id = x;
    }
    o && (p.channel = o), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
    try {
      await ne(u, p, { fetch: s.fetch }), b("success", f === "claim" ? "Assignment claimed." : "Assignment updated."), typeof window < "u" && window.location.reload();
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
      const u = es(l, i);
      if (!u.enabled) {
        b("warning", u.reason || "Assignment action is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        await ne(u, o ? { channel: o } : {}, { fetch: s.fetch }), b("success", u.label ? `${u.label} complete.` : "Assignment updated."), typeof window < "u" && window.location.reload();
      } catch (p) {
        b("error", p instanceof Error ? p.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  }), { status: "ready" };
}
async function K(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  if (t.ssrEnhanced === "true") return ss(e, s, i, a);
  H(e, { status: "loading" }, i);
  const r = await oe(s, { fetch: a.fetch });
  H(e, r, i);
  const o = ia(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const l = `${C(i.basePath || "/admin")}/api`, f = Le({
        basePath: l,
        fetch: a.fetch
      });
      await we(e, l, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((p) => {
        p.dataset.translationCreateBound !== "true" && (p.dataset.translationCreateBound = "true", p.addEventListener("click", (h) => {
          h.preventDefault();
          const x = r.detail;
          if (!x) {
            b("error", "Translation family detail is unavailable.");
            return;
          }
          if (p.getAttribute("aria-disabled") === "true") {
            b("warning", x.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const $ = n(p.dataset.locale).toLowerCase() || x.quickCreate.recommendedLocale || "", I = Ye(x, $);
          xe({
            familyId: x.familyId,
            quickCreate: I,
            initialLocale: $,
            heading: `Create ${$.toUpperCase()} locale`,
            assigneeOptionsBasePath: l,
            fetch: a.fetch,
            onSubmit: (k) => f.createLocale(x.familyId, {
              ...k,
              channel: o
            }),
            onSuccess: async (k) => {
              b("success", `${k.locale.toUpperCase()} locale created.`), await K(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
      const u = async (p, h) => {
        const x = r.detail;
        if (!x) {
          b("error", "Translation family detail is unavailable.");
          return;
        }
        const $ = ca(e, p), I = $ ? x.localeAssignments[$] : null;
        if (!I) {
          b("error", "Assignment action metadata is unavailable.");
          return;
        }
        const k = zt(I, h);
        if (!k.enabled) {
          b("warning", k.reason || "Assignment action is unavailable.");
          return;
        }
        const U = {};
        if (h === "user") {
          const { select: _, assigneeID: D } = da(e, $, p);
          if (!D) {
            b("warning", "Assignee is required."), ma(_);
            return;
          }
          U.assignee_id = D;
        }
        o && (U.channel = o), p.disabled = !0, p.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await ne(k, U, { fetch: a.fetch }), b("success", h === "claim" ? "Assignment claimed." : "Assignment updated."), await K(e, {
            ...a,
            ...i,
            endpoint: s
          });
        } catch (_) {
          b("error", _ instanceof Error ? _.message : "Failed to update assignment."), p.disabled = !1, p.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      Q(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        Q(e);
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
        K(e, {
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
        await qa(f, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const u = await oe(s, { fetch: a.fetch });
        if (u.status === "error" && (u.errorCode === "NOT_FOUND" || u.statusCode === 404)) {
          H(e, {
            ...u,
            syncRecovery: f,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), c();
          return;
        }
        if (u.status !== "ready") {
          const p = u.message || "Sync completed, but family detail reload failed.";
          H(e, {
            ...u,
            syncRecovery: f,
            syncStatus: "failed",
            syncMessage: p
          }, i), c(), b("error", p);
          return;
        }
        b("success", "Translation families synced."), await K(e, {
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
function Le(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = C(e.basePath || "/admin/api");
  async function s(i) {
    return le(i);
  }
  return {
    async list(i = {}) {
      return ze(await s(await a(Oe(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return Ke(await s(await a(Ia(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const o = Na({
        ...r,
        familyId: i,
        basePath: t
      }), c = new Headers(o.headers), d = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(Pa(o.request))
      };
      Y(o.endpoint, d, c);
      const l = await a(o.endpoint, d);
      if (!l.ok) throw await Ya(l);
      return Ba(await s(l));
    },
    async createAssignment(i, r = {}) {
      const o = Ve(r), c = Ea(t, i, o.channel), d = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && d.set("X-Idempotency-Key", o.idempotencyKey);
      const l = {
        method: "POST",
        credentials: "same-origin",
        headers: d,
        body: JSON.stringify(Fa(o))
      };
      Y(c, l, d);
      const f = await a(c, l);
      if (!f.ok) throw await ye(f);
      return s(f);
    }
  };
}
export {
  ys as applyCreateLocaleToFamilyDetail,
  ps as applyCreateLocaleToSummaryState,
  Ra as buildCreateLocaleURL,
  yt as buildFamilyActivityPreview,
  Ea as buildFamilyAssignmentURL,
  At as buildFamilyDetailUIURL,
  Ia as buildFamilyDetailURL,
  $t as buildFamilyListBrowserSearch,
  Me as buildFamilyListQuery,
  Oe as buildFamilyListURL,
  St as buildFamilyMatrixURL,
  kt as buildFamilyQueueURL,
  Sa as buildTranslationFamilySyncRPCRequest,
  Z as createFamilyFilters,
  Na as createTranslationCreateLocaleActionModel,
  je as createTranslationCreateLocaleRequest,
  Ve as createTranslationFamilyAssignmentRequest,
  Le as createTranslationFamilyClient,
  qa as dispatchTranslationFamilySync,
  oe as fetchTranslationFamilyDetailState,
  Ut as fetchTranslationFamilyListState,
  Ga as getReadinessChip,
  K as initTranslationFamilyDetailPage,
  bs as initTranslationFamilyListPage,
  hs as initTranslationSummaryCards,
  Ba as normalizeCreateLocaleResult,
  Ke as normalizeFamilyDetail,
  ze as normalizeFamilyListResponse,
  Ma as normalizeFamilyListRow,
  de as normalizeQuickCreateHints,
  Aa as normalizeTranslationFamilySyncRecoveryCapability,
  Ct as parseFamilyListFiltersFromSearchParams,
  qe as readFamilyListFiltersFromLocation,
  ge as renderReadinessChip,
  H as renderTranslationFamilyDetailPage,
  wt as renderTranslationFamilyDetailState,
  Pe as renderTranslationFamilyListPage,
  Ft as renderTranslationFamilyListState,
  Pa as serializeCreateLocaleRequest,
  Fa as serializeFamilyAssignmentRequest,
  Mt as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map