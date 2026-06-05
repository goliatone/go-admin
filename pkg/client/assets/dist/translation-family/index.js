import { escapeAttribute as f, escapeHTML as d } from "../shared/html.js";
import { appendCSRFHeader as H, httpRequest as G, readHTTPJSON as ne } from "../shared/transport/http-client.js";
import { extractStructuredError as j } from "../toast/error-helpers.js";
import { buildURL as F, getNumberSearchParam as he, getStringSearchParam as P, readLocationSearchParams as Ae, setNumberSearchParam as xe, setSearchParam as q } from "../shared/query-state/url-state.js";
import { trimTrailingSlash as $ } from "../shared/path-normalization.js";
import { parseJSONValue as ve } from "../shared/json-parse.js";
import { asLooseBoolean as v, asNumberish as _, asRecord as u, asString as n, asStringArray as h } from "../shared/coercion.js";
import { E as na, G as ia, K as ra, T as oa, _ as la, b as Te, f as R, g as ca, k as da, l as qe, m as N, nt as Y, ot as ma, u as E, v as ua, x as Re, y as Ie } from "../chunks/translation-shared-DxbdCW0D.js";
import { formatTranslationTimestampUTC as ie, sentenceCaseToken as S } from "../translation-shared/formatters.js";
import { normalizeStringRecord as ya } from "../shared/record-normalization.js";
function fa(e, a = {}) {
  const t = u(e), s = v(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), c = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !o ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: o,
    environment: c,
    familyId: i
  };
}
function pa(e, a = "") {
  const t = n(a), s = ga(e);
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
function ga(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function ba(e, a) {
  const t = u(e);
  return Object.keys(t).length === 0 || !v(t.accepted ?? t.Accepted) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function ha(e, a = {}) {
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
    body: JSON.stringify(pa(e, a.correlationId))
  };
  H(e.rpcInvokePath, i, s);
  const r = await t(e.rpcInvokePath, i);
  if (!r.ok) {
    const y = await j(r);
    throw new Error(y.message || "Failed to sync translation families.");
  }
  const o = u(await r.json().catch(() => ({}))), c = u(o.error);
  if (Object.keys(c).length > 0) throw new Error(n(c.message) || "Failed to sync translation families.");
  const l = u(o.data), m = ba(l.receipt, e.commandName);
  if (!m) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...l,
    receipt: m
  };
}
function Q(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function B(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Pe(e) {
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
    page: Math.max(1, _(e.page, 1)),
    perPage: Math.max(1, _(e.perPage, 50)),
    channel: a
  };
}
function Fe(e = {}) {
  const a = J(e), t = new URLSearchParams();
  return q(t, "content_type", a.contentType), q(t, "readiness_state", a.readinessState), q(t, "blocker_code", a.blockerCode), q(t, "missing_locale", a.missingLocale), q(t, "channel", a.channel), xe(t, "page", a.page, { min: 1 }), xe(t, "per_page", a.perPage, { min: 1 }), t;
}
function X(e, a = "", t = "") {
  const s = $(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function Ee(e, a = {}) {
  return F(X(e), Fe(a));
}
function xa(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a), s);
}
function Ue(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: v(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function va(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a, "/variants"), s);
}
function _a(e = {}) {
  const a = Ue(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0), a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.channel && (t.channel = a.channel), t;
}
function De(e = {}) {
  return {
    targetLocale: n(e.targetLocale).toLowerCase(),
    assigneeId: n(e.assigneeId),
    openPool: v(e.openPool),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    workScope: n(e.workScope),
    channel: n(e.channel),
    idempotencyKey: n(e.idempotencyKey)
  };
}
function wa(e, a, t = "") {
  const s = new URLSearchParams();
  return q(s, "channel", t), F(X(e, a, "/assignments"), s);
}
function La(e = {}) {
  const a = De(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function Ca(e) {
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
function $a(e) {
  return {
    autoCreateAssignment: v(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function re(e, a = {}) {
  const t = u(e.default_assignment), s = h(e.missing_locales ?? a.missingLocales), i = h(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? v(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: $a({
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
  const a = u(e.data), t = u(e.meta), s = u(t.family), i = u(t.refresh), r = u(a.navigation), o = re(u(s.quick_create), { missingLocales: h(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Ca(u(a.assignment)) : null,
    idempotencyHit: v(t.idempotency_hit),
    assignmentReused: v(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: B(s.readiness_state),
      missingRequiredLocaleCount: _(s.missing_required_locale_count),
      pendingReviewCount: _(s.pending_review_count),
      outdatedLocaleCount: _(s.outdated_locale_count),
      blockerCodes: h(s.blocker_codes),
      missingLocales: h(s.missing_locales),
      availableLocales: h(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: v(i.family_detail),
      familyList: v(i.family_list),
      contentSummary: v(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function Sa(e) {
  const a = n(e.familyId), t = Ue(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: va(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Aa(e) {
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
    readinessState: B(e.readiness_state),
    missingRequiredLocaleCount: _(e.missing_required_locale_count),
    pendingReviewCount: _(e.pending_review_count),
    outdatedLocaleCount: _(e.outdated_locale_count),
    blockerCodes: h(e.blocker_codes).map(Pe),
    blockerLabels: a,
    missingLocales: h(e.missing_locales),
    availableLocales: h(e.available_locales)
  };
}
function Ne(e) {
  const a = u(e.data), t = u(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => Aa(u(o))),
    total: _(i.total),
    page: _(i.page, 1),
    perPage: _(i.per_page, 50),
    channel: n(i.channel)
  };
}
function _e(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: v(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: ya(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Ta(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Pe(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: u(e.details)
  };
}
function M(e) {
  const a = u(e.link);
  return {
    enabled: v(e.enabled),
    permission: n(e.permission),
    endpoint: n(e.endpoint),
    href: n(e.href || a.href),
    label: n(e.label || a.label),
    reason: n(e.reason),
    reasonCode: n(e.reason_code ?? e.reasonCode),
    requiredFields: h(e.required_fields ?? e.requiredFields),
    payload: u(e.payload),
    assignmentId: n(e.assignment_id ?? e.assignmentId),
    expectedVersion: _(e.expected_version ?? e.expectedVersion)
  };
}
function oe(e) {
  return {
    assignToMe: M(u(e.assign_to_me ?? e.assignToMe)),
    assignToUser: M(u(e.assign_to_user ?? e.assignToUser)),
    claim: M(u(e.claim)),
    openEditor: M(u(e.open_editor ?? e.openEditor))
  };
}
function Be(e) {
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
    links: Ra(u(e.links)),
    actions: oe(u(e.actions))
  };
}
function qa(e) {
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
function Ra(e) {
  return { editor: qa(u(e.editor)) };
}
function Ia(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? Be(u(e.assignment)) : null,
    actions: oe(u(e.actions))
  };
}
function Pa(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const i = n(t).toLowerCase();
    i && (a[i] = Ia(u(s)));
  }
  return a;
}
function Oe(e) {
  const a = u(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? _e(u(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((g) => Ta(u(g))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((g) => _e(u(g))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((g) => Be(u(g))) : [], c = Pa(u(t.locale_assignments ?? t.localeAssignments)), l = u(t.publish_gate), m = u(t.readiness_summary), y = re(u(t.quick_create), {
    missingLocales: h(m.missing_locales),
    recommendedLocale: n(m.recommended_locale),
    requiredForPublish: h(m.required_for_publish ?? m.required_locales)
  });
  return {
    familyId: n(t.family_id),
    contentType: n(t.content_type),
    sourceLocale: n(t.source_locale),
    readinessState: B(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: i,
    activeAssignments: o,
    localeAssignments: c,
    publishGate: {
      allowed: v(l.allowed),
      overrideAllowed: v(l.override_allowed),
      blockedBy: h(l.blocked_by),
      reviewRequired: v(l.review_required)
    },
    readinessSummary: {
      state: B(m.state),
      requiredLocales: h(m.required_locales),
      missingLocales: h(m.missing_locales),
      availableLocales: h(m.available_locales),
      blockerCodes: h(m.blocker_codes),
      missingRequiredLocaleCount: _(m.missing_required_locale_count),
      pendingReviewCount: _(m.pending_review_count),
      outdatedLocaleCount: _(m.outdated_locale_count),
      publishReady: v(m.publish_ready)
    },
    quickCreate: y
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
function je(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function le(e) {
  return O(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function Fa(e) {
  return e.blockers.some(ue);
}
function ce(e, a) {
  const t = n(a).toLowerCase();
  return !t || Fa(e) ? !1 : le(e).includes(t);
}
function Me(e, a) {
  const t = le(e), s = n(a).toLowerCase(), i = ce(e, s);
  return {
    ...e.quickCreate,
    enabled: i,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: i ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: i ? "" : e.quickCreate.disabledReasonCode
  };
}
function Yt(e, a) {
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
  let i = e.activeAssignments.map((l) => ({ ...l }));
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
      actions: oe({})
    }, m = i.findIndex((y) => y.id === l.id || y.targetLocale === l.targetLocale);
    m >= 0 ? i[m] = l : i = [...i, l].sort((y, g) => y.targetLocale.localeCompare(g.targetLocale));
  }
  const r = e.blockers.map((l) => ({ ...l })).filter((l) => !(l.blockerCode === "missing_locale" && l.locale === t)), o = O(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), c = je(O(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function Qt(e, a) {
  const t = { ...e }, s = { ...u(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const c = O(h(t.available_locales), h(s.available_locales), a.family.availableLocales, [i]), l = je(O(h(t.missing_required_locales), h(s.missing_required_locales), a.family.missingLocales), i);
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
  }, t.translation_readiness = s, r && r === i && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = i), t;
}
function Ea(e) {
  const a = B(e);
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
function de(e) {
  const a = Ea(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label}</span>`;
}
async function Ua(e) {
  const a = await j(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = u(a.metadata), t;
}
async function me(e) {
  const a = await j(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = u(a.metadata), t;
}
async function ze(e, a = {}, t = {}) {
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
  const c = await (t.fetch ? t.fetch(s, o) : G(s, o));
  if (!c.ok) throw await me(c);
  return ne(c);
}
function Da(e) {
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
function Na(e) {
  const a = u(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), i = [];
  for (const r of t) {
    const o = Da(r);
    !o || s.has(o.value) || (s.add(o.value), i.push(o));
  }
  return i;
}
function Ba(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = a.map((i) => n(i)).find(Boolean);
  return s && t.set("assignee_id", s), F(`${$(e || "/admin/api")}/translations/options/assignees`, t);
}
async function Oa(e, a = [], t = {}) {
  const s = Ba(e, a), i = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : G(s, { headers: { Accept: "application/json" } }));
  if (!i.ok) throw await me(i);
  return Na(await ne(i));
}
function ja(e) {
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
function Ma(e) {
  return Y(ja(e));
}
function za(e) {
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
function Ve(e) {
  return Y(za(e));
}
function Va(e) {
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
function Ke(e) {
  return Y(Va(e));
}
function k(e, a) {
  return n(e[a]);
}
function ue(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = k(e.details, "reason").toLowerCase(), t = k(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(k(e.details, "content_type") || k(e.details, "environment")), i = !!(k(e.details, "message") || k(e.details, "policy_reason"));
  return s && !a && !i;
}
function Ka(e) {
  return ue(e) ? "Policy unavailable" : S(e.blockerCode);
}
function Ha(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", k(a, "content_type")],
    ["Environment", k(a, "environment")]
  ], s = k(a, "reason"), i = k(a, "message"), r = k(a, "remediation");
  return ue(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), i && i !== s && t.push(["Message", i]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function Ga(e) {
  const a = Ha(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${d(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${d(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function Ya(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function He(e) {
  return Y(Ya(e));
}
function Qa(e, a, t) {
  const s = $(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function Ge(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function Ye(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function Ja(e, a, t = "") {
  const s = n(a).toLowerCase();
  if (!s) return null;
  const i = Ye(s, t);
  if (e.localeAssignments[i]) return e.localeAssignments[i];
  for (const [r, o] of Object.entries(e.localeAssignments)) if (r.startsWith(`${s}:`)) return o;
  return null;
}
function Qe(e) {
  return e && (e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function Je(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function Xa(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function Wa(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${f(e.state)}">No active assignment.</p>`;
  const t = a.dueState || Ge(a.dueDate), s = t === "none" ? "No due date" : S(t);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${f(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Ve(a.status)}">${d(S(a.status))}</span>
      <span>${d(Qe(a))}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${d(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${He(t)}">${d(s)}</span>
    </div>
  `;
}
function Za(e) {
  if (!e || e.state === "source_locale") return "";
  const a = Ye(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled && s.push(`
      <button type="button" class="${R}" data-family-assign-to-me="true" data-locale-assignment-key="${f(a)}">
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-nowrap">
        ${ye({
    key: a,
    ariaLabel: "Assignee",
    className: `${We} min-w-0 flex-1 sm:w-80 sm:flex-none lg:w-96`
  })}
        <button type="button" class="${R}" data-family-assign-to-user="true" data-locale-assignment-key="${f(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${R}" data-family-claim-assignment="true" data-locale-assignment-key="${f(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${f(a)}"
        href="${f(t.openEditor.href)}"
      >${d(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end" data-family-locale-actions="true">${s.join("")}</div>`;
  const i = Je(e);
  return i ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${f(a)}">${d(i)}</p>` : "";
}
function et(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => Xa(a)).sort(([a], [t]) => a.localeCompare(t));
}
function at(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${f(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${f(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function ae(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${f(a || "Assignment action is unavailable.")}"`;
}
function we(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var Xe = "block h-12 w-full rounded-lg border border-gray-200 bg-white px-4 pr-9 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:focus:ring-gray-600", We = Xe;
function ye(e) {
  const a = n(e.key), t = n(e.initialValue), s = e.enabled !== !1, i = n(e.placeholder) || "Select assignee", r = n(e.reason), o = n(e.name), c = ae(s, r);
  return `
    <select
      ${o ? `name="${f(o)}"` : ""}
      class="${f(e.className || We)}"
      data-family-assignee-select="${f(a)}"
      data-initial-assignee-id="${f(t)}"
      data-endpoint-url="/api/translations/options/assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      aria-label="${f(e.ariaLabel || "Assignee")}"
      ${c}
    >
      <option value="">${d(s ? "Loading assignees..." : r || i)}</option>
      ${t ? `<option value="${f(t)}" selected>${d(t)}</option>` : ""}
    </select>
  `;
}
function tt(e, a = 5) {
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
function st(e) {
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
function nt(e, a) {
  const t = $(a.contentBasePath || `${$(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = (c) => {
    const l = !ce(e, c);
    return `
      <button
        type="button"
        class="${E}${l ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${f(c)}"
        ${l ? 'aria-disabled="true"' : ""}
        title="${f(l ? i : `Create ${c.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, o = e.localeVariants.map((c) => {
    const l = Qa(t, e, c), m = Ja(e, c.locale), y = l ? `<a href="${f(l)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', g = c.fields.title || c.fields.slug || `${e.contentType} ${c.locale.toUpperCase()}`;
    return `
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${d(c.locale.toUpperCase())}</span>
            ${c.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ma(c.status)}">${d(S(c.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${d(g)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${d(ie(c.updatedAt || c.createdAt)) || "n/a"}</p>
          ${Wa(m)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${Za(m)}
          ${y}
        </div>
      </li>
    `;
  });
  for (const c of s) o.push(`
      <li class="flex flex-col items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6 sm:flex-row">
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
function it(e) {
  if (!e.activeAssignments.length) {
    const a = et(e), t = a[0]?.[1] || null, s = a.some(([, r]) => r.actions.assignToMe.enabled), i = a.some(([, r]) => r.actions.assignToUser.enabled);
    return `
      <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto_auto] 2xl:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="${Xe}" data-family-assignment-locale-select="true">
                ${a.map(([r, o]) => `
                  <option value="${f(r)}" ${at(o)}>${d(o.locale.toUpperCase())} · ${d(o.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            ${i ? `
              <label class="grid gap-2">
                <span class="text-sm font-medium text-gray-900">Assignee</span>
                ${ye({
      key: "__empty_panel__",
      enabled: !!t?.actions.assignToUser.enabled,
      reason: t?.actions.assignToUser.reason,
      ariaLabel: "Assignee"
    })}
              </label>
            ` : "<div></div>"}
            ${s ? `
              <button type="button" class="${R} w-full 2xl:w-auto${we(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${ae(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${i ? `
              <button type="button" class="${E} w-full 2xl:w-auto${we(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${ae(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${d(Je(Object.values(e.localeAssignments).find((r) => r.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = Ge(a.dueDate), s = t === "none" ? "No due date" : S(t), i = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${d(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ve(a.status)}">${d(S(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${He(t)}">${d(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${d(Qe(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${d(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${d(ie(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${i ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${f(a.id)}"
                    href="${f(i.href)}"
                    title="${f(i.description || i.label)}"
                  >${d(i.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function rt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ke(t.blockerCode)}">${d(Ka(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${d(s)}</span>` : ""}
              </div>
              ${Ga(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${de(e.readinessState)}
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
function ot(e) {
  const a = tt(e);
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${d(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${d(ie(t.timestamp))}</span>
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
function Ze(e) {
  return `
    <div class="${da}" aria-busy="true" aria-label="Loading">
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
      <div class="max-w-md ${ca} p-8 text-center shadow-sm">
        <h2 class="${ua}">${d(e)}</h2>
        <p class="${la} mt-2">${d(a)}</p>
      </div>
    </div>
  `;
}
function lt(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${E}"
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
    <div class="${Ie} p-6" role="alert">
      <h2 class="${Re}">${d(e)}</h2>
      <p class="${Te} mt-2">${d(a)}</p>
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
function ct(e, a = {}) {
  if (e.status === "loading") return Ze("Loading translation family...");
  if (e.status === "empty") return `
      ${te("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${K(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${lt(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${K(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return te("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(S).join(", ") : "No blockers", r = le(t), o = t.quickCreate.recommendedLocale || r[0] || "", c = !ce(t, o), l = o ? `
      <button
        type="button"
        class="${E}${c ? " opacity-60 cursor-not-allowed" : ""}"
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
            <p class="${oa}">Translation family</p>
            <h1 class="${na} mt-2">${d(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${d(t.contentType)} · Source locale ${d(t.sourceLocale.toUpperCase())} · Family ${d(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${de(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${d(i)}</span>
            ${l}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${st(t)}
        </div>
        ${K(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${nt(t, a)}
          ${it(t)}
        </div>
        <div class="space-y-6">
          ${rt(t)}
          ${ot(t)}
        </div>
      </div>
    </div>
  `;
}
async function se(e, a = {}) {
  const t = n(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : G(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = Q(s.headers);
    if (!s.ok) {
      const c = await j(s), l = u(c.metadata?.sync_recovery), m = c.textCode === "NOT_FOUND" || v(l.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: c.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: c.textCode,
        syncRecovery: m ? fa(l, { familyId: n(c.metadata?.family_id) }) : null
      };
    }
    const o = Oe(u(await s.json()));
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
function ea(e) {
  const a = Ae(), t = a ? P(a, "channel") : "";
  if (t) return t;
  try {
    return P(new URL(n(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function z(e, a, t = {}) {
  e.innerHTML = ct(a, t);
}
var dt = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function mt(e) {
  const a = e ?? new URLSearchParams();
  return J({
    channel: P(a, "channel") || "",
    contentType: P(a, "content_type") || "",
    readinessState: P(a, "readiness_state") || "",
    blockerCode: P(a, "blocker_code") || "",
    missingLocale: P(a, "missing_locale") || "",
    page: he(a, "page") || 1,
    perPage: he(a, "per_page") || 50
  });
}
function Le(e = globalThis.location) {
  return mt(Ae(e));
}
function ut(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of dt) t.delete(s);
  return Fe(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function aa(e, a = "/admin") {
  const t = $(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${$(a || "/admin")}/api`;
}
function fe(e = "/admin") {
  return `${$(e || "/admin")}/translations/families`;
}
function yt(e, a, t = "") {
  const s = $(e || fe("/admin")), i = new URLSearchParams();
  return q(i, "channel", t), F(`${s}/${encodeURIComponent(n(a))}`, i);
}
function ta(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) q(s, i, r);
  return F(t, s);
}
function ft(e, a, t = {}) {
  return ta(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function pt(e, a, t = {}) {
  return ta(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function gt(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function T(e, a, t) {
  return `<option value="${f(e)}" ${e === t ? "selected" : ""}>${d(a)}</option>`;
}
function bt(e) {
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
  ].map((t) => T(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${E} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${f(e.page)}">
    </form>
  `;
}
function Ce(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-700">${d(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${d(a)}</span>`;
}
function ht(e) {
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
  return t.map(({ code: s, label: i }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ke(s)}">${d(i)}</span>`).join(" ");
}
function Z(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex min-w-[4.25rem] flex-col rounded-md bg-gray-50 px-2 py-1">
      <span class="text-sm font-semibold ${t}">${d(e)}</span>
      <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500">${d(a)}</span>
    </span>
  `;
}
function xt(e, a, t) {
  const s = t.familyBasePath || fe(t.basePath || "/admin");
  return e.map((i) => {
    const r = yt(s, i.familyId, a.channel), o = t.matrixPath ? ft(t.matrixPath, i, a) : "", c = t.queuePath ? pt(t.queuePath, i, a) : "", l = gt(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-family-id="${f(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${f(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${d(l)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${d(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${d(i.contentType || "unknown")} · Source ${d(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${de(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${ht(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-wrap gap-2">
            ${Z(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${Z(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${Z(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${Ce(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${Ce(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-col gap-2">
            <a href="${f(r)}" class="${E} text-center" data-family-primary-action="true">Open family</a>
            ${o ? `<a href="${f(o)}" class="${R} text-center">Matrix</a>` : ""}
            ${c ? `<a href="${f(c)}" class="${qe} text-center">Queue</a>` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}
function vt(e, a, t) {
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
            ${xt(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function _t(e) {
  return `
    <div class="${Ie} mt-6 p-6" role="alert">
      <h2 class="${Re}">Families failed to load</h2>
      <p class="${Te} mt-2">${d(e.message || "The translation families request failed.")}</p>
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
function wt(e, a = {}) {
  const t = e.filters, s = bt(t);
  if (e.status === "loading") return `${s}${Ze("Loading translation families...")}`;
  if (e.status === "error") return `${s}${_t(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${te("No translation families found", "No families match the current filters.")}` : `${s}${vt(i, t, a)}`;
}
function $e(e, a, t = {}) {
  e.innerHTML = wt(a, t);
}
async function Lt(e, a, t = {}) {
  const s = Ee(aa(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : G(s, { headers: { Accept: "application/json" } })), o = n(r.headers.get("x-request-id")), c = Q(r.headers);
    if (!r.ok) {
      const m = await j(r);
      return {
        status: "error",
        filters: a,
        message: m.message,
        requestURL: s,
        requestId: o,
        traceId: c,
        statusCode: r.status,
        errorCode: m.textCode
      };
    }
    const l = Ne(u(await r.json()));
    return {
      status: l.items.length ? "ready" : "empty",
      filters: a,
      response: l,
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
function ke(e, a) {
  const t = new FormData(e), s = (r, o) => t.has(r) ? n(t.get(r)) : o, i = (r, o) => t.has(r) ? _(t.get(r), o) : o;
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
function Ct(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = ut(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
async function Jt(e, a = {}) {
  if (!e) return null;
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  if (s.familyBasePath || (s.familyBasePath = fe(s.basePath)), t.ssrEnhanced === "true")
    return e.dataset.translationFamilyListEnhanced = "true", {
      status: "ready",
      filters: Le()
    };
  let i = Le(), r = null;
  const o = async (c, l = !1) => {
    i = J(c), l && Ct(i), $e(e, {
      status: "loading",
      filters: i
    }, s);
    const m = await Lt(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = m, $e(e, m, s), $t(e, m, o), m;
  };
  return r = await o(i, !1), r;
}
function $t(e, a, t) {
  const s = e.querySelector('[data-family-list-filters="true"]');
  s && (s.addEventListener("submit", (i) => {
    i.preventDefault(), t({
      ...ke(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((i) => {
    i.addEventListener("change", () => {
      t({
        ...ke(s, a.filters),
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
function St(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function At(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Tt(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && o ? o : i && a[i] ? a[i] : o;
}
function pe(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    b("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = n(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), i = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = ra, r.setAttribute("data-translation-create-locale-modal", "true"), r.innerHTML = `
    <div class="${ia}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${d(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${d(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${qe}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((x) => `
                <option value="${f(x)}" ${x === i ? "selected" : ""}>
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
              ${ye({
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
  ].map((x) => `
                  <option value="${x}" ${x === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${S(x)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${f(St(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
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
  `, a.body.appendChild(r), sa(r, e.assigneeOptionsBasePath || "/admin/api", { fetch: e.fetch });
  const o = r.querySelector('[role="dialog"]'), c = r.querySelector("form"), l = r.querySelector('select[name="locale"]'), m = r.querySelector('input[name="auto_create_assignment"]'), y = r.querySelector('select[name="assignee_id"]'), g = r.querySelector('select[name="priority"]'), p = r.querySelector('input[name="due_date"]'), L = r.querySelector('[data-assignment-fields="true"]'), w = r.querySelector('[data-create-locale-feedback="true"]'), C = r.querySelector('button[type="submit"]'), I = () => {
    U(), r.remove();
  }, A = () => {
    !L || !m || (L.hidden = !m.checked);
  }, U = o ? ma(o, I) : () => {
  };
  A(), m?.addEventListener("change", A), r.querySelectorAll('[data-close-modal="true"]').forEach((x) => {
    x.addEventListener("click", I);
  }), r.addEventListener("click", (x) => {
    x.target === r && I();
  }), c?.addEventListener("submit", async (x) => {
    if (x.preventDefault(), !l || !C) return;
    w && (w.hidden = !0, w.textContent = ""), C.disabled = !0, C.classList.add("opacity-60", "cursor-not-allowed");
    const D = n(l.value).toLowerCase();
    try {
      const W = await e.onSubmit({
        locale: D,
        autoCreateAssignment: m?.checked,
        assigneeId: y?.value,
        priority: g?.value,
        dueDate: At(p?.value || "")
      });
      I(), await e.onSuccess?.(W);
    } catch (W) {
      const be = kt(W, D);
      w && (w.hidden = !1, w.textContent = be), b("error", be);
    } finally {
      C.disabled = !1, C.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function qt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: re(ve(e.dataset.quickCreate, {}), {}),
    localeURLs: ve(e.dataset.localeUrls, {})
  };
}
function Xt(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = qt(a), s = ge({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const o = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        pe({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (c) => s.createLocale(t.familyId, c),
          onSuccess: async (c) => {
            b("success", `${c.locale.toUpperCase()} locale created.`);
            const l = typeof window < "u" && window.location.pathname.endsWith("/edit"), m = Tt(c, t.localeURLs, t.requestedLocale, l);
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
function Rt(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (n(a.dataset.localeAssignmentSource) === "empty-panel" ? n(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function It(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function Pt(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (n(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function Ft(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function Et(e, a) {
  const t = n(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", i = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, i.appendChild(r);
  let o = t === "";
  for (const c of a) {
    const l = e.ownerDocument.createElement("option");
    l.value = c.value, l.textContent = Ft(c), c.description && l.setAttribute("data-description", c.description), c.displayName && l.setAttribute("data-display-name", c.displayName), c.avatarURL && l.setAttribute("data-avatar-url", c.avatarURL), t && t === c.value && (l.selected = !0, o = !0), i.appendChild(l);
  }
  if (t && !o) {
    const c = e.ownerDocument.createElement("option");
    c.value = t, c.textContent = t, c.selected = !0, i.appendChild(c);
  }
  e.replaceChildren(i);
}
async function sa(e, a, t = {}) {
  const s = Array.from(e.querySelectorAll("[data-family-assignee-select]"));
  if (s.length === 0) return;
  const i = s.map((r) => n(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await Oa(a, i, t);
    for (const o of s) Et(o, r);
  } catch {
    for (const r of s) {
      const o = n(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const c = r.ownerDocument.createElement("option");
      c.value = o, c.textContent = o || "Assignees unavailable", c.selected = !0, r.appendChild(c), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function ee(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function Se(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = n(t?.dataset.assignToMeEnabled) === "true", i = n(t?.dataset.assignToUserEnabled) === "true", r = n(t?.dataset.assignToMeReason), o = n(t?.dataset.assignToUserReason);
  ee(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), ee(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), i, o), ee(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), i, o);
}
function Ut(e, a) {
  const t = n(e.dataset.assignmentId), s = n(e.dataset.familyAssignmentAction), i = _(e.dataset.rowVersion, 0);
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
async function Dt(e, a, t, s) {
  const i = aa(a, t.basePath || "/admin"), r = n(e.dataset.familyId), o = ea(a) || n(e.dataset.channel), c = ge({
    basePath: i,
    fetch: s.fetch
  });
  return e.querySelectorAll('[data-translation-create-locale-trigger="true"]').forEach((l) => {
    l.dataset.translationCreateBound !== "true" && (l.dataset.translationCreateBound = "true", l.addEventListener("click", async (m) => {
      if (m.preventDefault(), l.disabled || l.getAttribute("aria-disabled") === "true") {
        b("warning", l.getAttribute("title") || "Locale creation is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const y = await se(a, { fetch: s.fetch });
        if (y.status !== "ready" || !y.detail) {
          b("error", y.message || "Translation family detail is unavailable.");
          return;
        }
        const g = n(l.dataset.locale).toLowerCase() || y.detail.quickCreate.recommendedLocale || "";
        pe({
          familyId: y.detail.familyId || r,
          quickCreate: Me(y.detail, g),
          initialLocale: g,
          heading: `Create ${g.toUpperCase()} locale`,
          assigneeOptionsBasePath: i,
          fetch: s.fetch,
          onSubmit: (p) => c.createLocale(y.detail?.familyId || r, {
            ...p,
            channel: o
          }),
          onSuccess: async (p) => {
            b("success", `${p.locale.toUpperCase()} locale created.`), typeof window < "u" && window.location.reload();
          }
        });
      } catch (y) {
        b("error", y instanceof Error ? y.message : "Failed to open locale creation.");
      } finally {
        l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  }), e.querySelectorAll("[data-family-assignment-action]").forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", async (m) => {
      m.preventDefault();
      const y = Ut(l, i);
      if (!y.enabled) {
        b("warning", y.reason || "Assignment action is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        await ze(y, o && y.endpoint.includes("/release") ? { channel: o } : {}, { fetch: s.fetch }), b("success", y.label ? `${y.label} complete.` : "Assignment updated."), typeof window < "u" && window.location.reload();
      } catch (g) {
        b("error", g instanceof Error ? g.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
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
  if (t.ssrEnhanced === "true") return Dt(e, s, i, a);
  z(e, { status: "loading" }, i);
  const r = await se(s, { fetch: a.fetch });
  z(e, r, i);
  const o = ea(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const m = `${$(i.basePath || "/admin")}/api`, y = ge({
        basePath: m,
        fetch: a.fetch
      });
      await sa(e, m, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((p) => {
        p.dataset.translationCreateBound !== "true" && (p.dataset.translationCreateBound = "true", p.addEventListener("click", (L) => {
          L.preventDefault();
          const w = r.detail;
          if (!w) {
            b("error", "Translation family detail is unavailable.");
            return;
          }
          if (p.getAttribute("aria-disabled") === "true") {
            b("warning", w.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const C = n(p.dataset.locale).toLowerCase() || w.quickCreate.recommendedLocale || "", I = Me(w, C);
          pe({
            familyId: w.familyId,
            quickCreate: I,
            initialLocale: C,
            heading: `Create ${C.toUpperCase()} locale`,
            assigneeOptionsBasePath: m,
            fetch: a.fetch,
            onSubmit: (A) => y.createLocale(w.familyId, {
              ...A,
              channel: o
            }),
            onSuccess: async (A) => {
              b("success", `${A.locale.toUpperCase()} locale created.`), await V(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
      const g = async (p, L) => {
        const w = r.detail;
        if (!w) {
          b("error", "Translation family detail is unavailable.");
          return;
        }
        const C = Rt(e, p), I = C ? w.localeAssignments[C] : null;
        if (!I) {
          b("error", "Assignment action metadata is unavailable.");
          return;
        }
        const A = It(I, L);
        if (!A.enabled) {
          b("warning", A.reason || "Assignment action is unavailable.");
          return;
        }
        const U = {};
        if (L === "user") {
          const x = Pt(e, C, p), D = n(x?.value);
          if (!D) {
            b("warning", "Assignee is required."), x?.focus();
            return;
          }
          U.assignee_id = D;
        }
        L !== "claim" && o && (U.channel = o), p.disabled = !0, p.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await ze(A, U, { fetch: a.fetch }), b("success", L === "claim" ? "Assignment claimed." : "Assignment updated."), await V(e, {
            ...a,
            ...i,
            endpoint: s
          });
        } catch (x) {
          b("error", x instanceof Error ? x.message : "Failed to update assignment."), p.disabled = !1, p.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      Se(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        Se(e);
      }), e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((p) => {
        p.addEventListener("click", (L) => {
          L.preventDefault(), g(p, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((p) => {
        p.addEventListener("click", (L) => {
          L.preventDefault(), g(p, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((p) => {
        p.addEventListener("click", (L) => {
          L.preventDefault(), g(p, "claim");
        });
      });
    }
    const c = () => {
      const m = e.querySelector(".ui-state-retry-btn");
      m && m.addEventListener("click", () => {
        V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      });
    };
    c();
    const l = e.querySelector('[data-family-sync-action="true"]');
    l && r.syncRecovery?.canSync && l.addEventListener("click", async (m) => {
      m.preventDefault(), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const y = r.syncRecovery;
        if (!y) return;
        await ha(y, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const g = await se(s, { fetch: a.fetch });
        if (g.status === "error" && (g.errorCode === "NOT_FOUND" || g.statusCode === 404)) {
          z(e, {
            ...g,
            syncRecovery: y,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), c();
          return;
        }
        if (g.status !== "ready") {
          const p = g.message || "Sync completed, but family detail reload failed.";
          z(e, {
            ...g,
            syncRecovery: y,
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
      } catch (y) {
        const g = y instanceof Error ? y.message : "Failed to sync translation families.", p = e.querySelector('[data-family-sync-feedback="true"]');
        p && (p.hidden = !1, p.textContent = g), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed"), b("error", g);
      }
    });
  }
  return r;
}
function ge(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = $(e.basePath || "/admin/api");
  async function s(i) {
    return ne(i);
  }
  return {
    async list(i = {}) {
      return Ne(await s(await a(Ee(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return Oe(await s(await a(xa(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const o = Sa({
        ...r,
        familyId: i,
        basePath: t
      }), c = new Headers(o.headers), l = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(_a(o.request))
      };
      H(o.endpoint, l, c);
      const m = await a(o.endpoint, l);
      if (!m.ok) throw await Ua(m);
      return ka(await s(m));
    },
    async createAssignment(i, r = {}) {
      const o = De(r), c = wa(t, i, o.channel), l = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && l.set("X-Idempotency-Key", o.idempotencyKey);
      const m = {
        method: "POST",
        credentials: "same-origin",
        headers: l,
        body: JSON.stringify(La(o))
      };
      H(c, m, l);
      const y = await a(c, m);
      if (!y.ok) throw await me(y);
      return s(y);
    }
  };
}
export {
  Yt as applyCreateLocaleToFamilyDetail,
  Qt as applyCreateLocaleToSummaryState,
  va as buildCreateLocaleURL,
  tt as buildFamilyActivityPreview,
  wa as buildFamilyAssignmentURL,
  yt as buildFamilyDetailUIURL,
  xa as buildFamilyDetailURL,
  ut as buildFamilyListBrowserSearch,
  Fe as buildFamilyListQuery,
  Ee as buildFamilyListURL,
  ft as buildFamilyMatrixURL,
  pt as buildFamilyQueueURL,
  pa as buildTranslationFamilySyncRPCRequest,
  J as createFamilyFilters,
  Sa as createTranslationCreateLocaleActionModel,
  Ue as createTranslationCreateLocaleRequest,
  De as createTranslationFamilyAssignmentRequest,
  ge as createTranslationFamilyClient,
  ha as dispatchTranslationFamilySync,
  se as fetchTranslationFamilyDetailState,
  Lt as fetchTranslationFamilyListState,
  Ea as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  Jt as initTranslationFamilyListPage,
  Xt as initTranslationSummaryCards,
  ka as normalizeCreateLocaleResult,
  Oe as normalizeFamilyDetail,
  Ne as normalizeFamilyListResponse,
  Aa as normalizeFamilyListRow,
  re as normalizeQuickCreateHints,
  fa as normalizeTranslationFamilySyncRecoveryCapability,
  mt as parseFamilyListFiltersFromSearchParams,
  Le as readFamilyListFiltersFromLocation,
  de as renderReadinessChip,
  z as renderTranslationFamilyDetailPage,
  ct as renderTranslationFamilyDetailState,
  $e as renderTranslationFamilyListPage,
  wt as renderTranslationFamilyListState,
  _a as serializeCreateLocaleRequest,
  La as serializeFamilyAssignmentRequest,
  St as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map