import { escapeAttribute as p, escapeHTML as m } from "../shared/html.js";
import { r as ba } from "../chunks/modal-ClEsOn-S.js";
import { httpRequest as Y, httpRequestWith as G, readHTTPJSON as le } from "../shared/transport/http-client.js";
import { extractStructuredError as N } from "../toast/error-helpers.js";
import { initActionMenus as va } from "../shared/action-menu.js";
import { buildURL as R, getNumberSearchParam as _e, getStringSearchParam as I, readLocationSearchParams as Fe, setNumberSearchParam as we, setSearchParam as k } from "../shared/query-state/url-state.js";
import { parseJSONValue as Le } from "../shared/json-parse.js";
import { trimTrailingSlash as L } from "../shared/path-normalization.js";
import { asLooseBoolean as _, asNumberish as w, asRecord as y, asString as n, asStringArray as x } from "../shared/coercion.js";
import { A as Ue, C as D, D as xa, E as _a, F as wa, O as De, P as La, R as Ca, T as $a, k as Be, ut as W, v as Aa, x as T, y as O } from "../chunks/translation-shared-Dy-TBOmE.js";
import { formatTranslationTimestampUTC as ce, sentenceCaseToken as A } from "../translation-shared/formatters.js";
import { normalizeStringRecord as Sa } from "../shared/record-normalization.js";
import { initEnhancedActions as ka } from "../shared/enhanced-action.js";
var Ce = /* @__PURE__ */ new WeakMap();
function Ta(e, a = {}) {
  const t = y(e), s = _(t.can_sync ?? t.canSync), i = n(t.family_id ?? t.familyId ?? a.familyId), r = n((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = n(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), d = n((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !i || !r || !o ? null : {
    canSync: s,
    permission: n((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: o,
    environment: d,
    familyId: i
  };
}
function qa(e, a = "") {
  const t = n(a), s = Ia(e);
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
function Ia(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(n(a).trim() || "default")).join(":");
}
function Ra(e, a) {
  const t = y(e);
  if (Object.keys(t).length === 0) return null;
  const s = t.accepted ?? t.Accepted;
  return !_(s) || n(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function Pa(e, a = {}) {
  const t = a.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t) throw new Error("translation family sync requires fetch");
  if (!e.canSync) throw new Error("translation family sync is not available for this request");
  const s = {
    method: "POST",
    credentials: "same-origin",
    headers: new Headers({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(qa(e, a.correlationId))
  }, i = await G(t, e.rpcInvokePath, s);
  if (!i.ok) {
    const l = await N(i);
    throw new Error(l.message || "Failed to sync translation families.");
  }
  const r = y(await i.json().catch(() => ({}))), o = y(r.error);
  if (Object.keys(o).length > 0) throw new Error(n(o.message) || "Failed to sync translation families.");
  const d = y(r.data), c = Ra(d.receipt, e.commandName);
  if (!c) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...d,
    receipt: c
  };
}
function Q(e) {
  return n(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function B(e) {
  return n(e) === "ready" ? "ready" : "blocked";
}
function Me(e) {
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
    page: Math.max(1, w(e.page, 1)),
    perPage: Math.max(1, w(e.perPage, 50)),
    channel: a
  };
}
function Ne(e = {}) {
  const a = J(e), t = new URLSearchParams();
  return k(t, "content_type", a.contentType), k(t, "readiness_state", a.readinessState), k(t, "blocker_code", a.blockerCode), k(t, "missing_locale", a.missingLocale), k(t, "channel", a.channel), we(t, "page", a.page, { min: 1 }), we(t, "per_page", a.perPage, { min: 1 }), t;
}
function X(e, a = "", t = "") {
  const s = L(e);
  return a ? `${s}/translations/families/${encodeURIComponent(n(a))}${t}` : `${s}/translations/families`;
}
function Oe(e, a = {}) {
  return R(X(e), Ne(a));
}
function Ea(e, a, t = "") {
  const s = new URLSearchParams();
  return k(s, "channel", t), R(X(e, a), s);
}
function je(e = {}) {
  const a = n(e.channel);
  return {
    locale: n(e.locale).toLowerCase(),
    autoCreateAssignment: _(e.autoCreateAssignment),
    assigneeId: n(e.assigneeId),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    channel: a,
    idempotencyKey: n(e.idempotencyKey)
  };
}
function Fa(e, a, t = "") {
  const s = new URLSearchParams();
  return k(s, "channel", t), R(X(e, a, "/variants"), s);
}
function Ua(e = {}) {
  const a = je(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0, a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate)), a.channel && (t.channel = a.channel), t;
}
function ze(e = {}) {
  return {
    targetLocale: n(e.targetLocale).toLowerCase(),
    assigneeId: n(e.assigneeId),
    openPool: _(e.openPool),
    priority: n(e.priority).toLowerCase(),
    dueDate: n(e.dueDate),
    workScope: n(e.workScope),
    channel: n(e.channel),
    idempotencyKey: n(e.idempotencyKey)
  };
}
function Da(e, a, t = "") {
  const s = new URLSearchParams();
  return k(s, "channel", t), R(X(e, a, "/assignments"), s);
}
function Ba(e = {}) {
  const a = ze(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function Ma(e) {
  return {
    assignmentId: n(e.assignment_id),
    status: n(e.status),
    targetLocale: n(e.target_locale),
    workScope: n(e.work_scope),
    assigneeId: n(e.assignee_id),
    priority: n(e.priority),
    dueDate: n(e.due_date),
    assignedAt: n(e.assigned_at)
  };
}
function Na(e) {
  return {
    autoCreateAssignment: _(e.auto_create_assignment),
    workScope: n(e.work_scope),
    priority: n(e.priority) || "normal",
    assigneeId: n(e.assignee_id),
    dueDate: n(e.due_date)
  };
}
function de(e, a = {}) {
  const t = y(e.default_assignment), s = x(e.missing_locales ?? a.missingLocales), i = x(e.required_for_publish ?? a.requiredForPublish), r = n(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? _(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: i,
    defaultAssignment: Na({
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
function Oa(e) {
  const a = y(e.data), t = y(e.meta), s = y(t.family), i = y(t.refresh), r = y(a.navigation), o = de(y(s.quick_create), { missingLocales: x(s.missing_locales) });
  return {
    variantId: n(a.variant_id),
    familyId: n(a.family_id) || n(s.family_id),
    locale: n(a.locale).toLowerCase(),
    status: n(a.status),
    recordId: n(a.record_id),
    contentType: n(a.content_type),
    assignment: a.assignment ? Ma(y(a.assignment)) : null,
    idempotencyHit: _(t.idempotency_hit),
    assignmentReused: _(t.assignment_reused),
    family: {
      familyId: n(s.family_id),
      readinessState: B(s.readiness_state),
      missingRequiredLocaleCount: w(s.missing_required_locale_count),
      pendingReviewCount: w(s.pending_review_count),
      outdatedLocaleCount: w(s.outdated_locale_count),
      blockerCodes: x(s.blocker_codes),
      missingLocales: x(s.missing_locales),
      availableLocales: x(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: _(i.family_detail),
      familyList: _(i.family_list),
      contentSummary: _(i.content_summary)
    },
    navigation: {
      contentDetailURL: n(r.content_detail_url),
      contentEditURL: n(r.content_edit_url)
    }
  };
}
function ja(e) {
  const a = n(e.familyId), t = je(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Fa(n(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function za(e) {
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
    readinessState: B(e.readiness_state),
    missingRequiredLocaleCount: w(e.missing_required_locale_count),
    pendingReviewCount: w(e.pending_review_count),
    outdatedLocaleCount: w(e.outdated_locale_count),
    blockerCodes: x(e.blocker_codes).map(Me),
    blockerLabels: a,
    missingLocales: x(e.missing_locales),
    availableLocales: x(e.available_locales)
  };
}
function Ve(e) {
  const a = y(e.data), t = y(e.meta), s = Object.keys(a).length ? a : e, i = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => za(y(o))),
    total: w(i.total),
    page: w(i.page, 1),
    perPage: w(i.per_page, 50),
    channel: n(i.channel)
  };
}
function $e(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    locale: n(e.locale),
    status: n(e.status),
    isSource: _(e.is_source),
    sourceRecordId: n(e.source_record_id),
    sourceHashAtLastSync: n(e.source_hash_at_last_sync),
    fields: Sa(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    publishedAt: n(e.published_at)
  };
}
function Va(e) {
  return {
    id: n(e.id),
    familyId: n(e.family_id),
    blockerCode: Me(e.blocker_code),
    locale: n(e.locale),
    fieldPath: n(e.field_path),
    details: y(e.details)
  };
}
function j(e) {
  const a = y(e.link);
  return {
    enabled: _(e.enabled),
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
function Z(e) {
  return {
    assignToMe: j(y(e.assign_to_me ?? e.assignToMe)),
    assignToUser: j(y(e.assign_to_user ?? e.assignToUser)),
    claim: j(y(e.claim)),
    openEditor: j(y(e.open_editor ?? e.openEditor))
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
    displayAssignee: n(e.display_assignee),
    assignerId: n(e.assigner_id ?? e.assignerId),
    displayAssigner: n(e.display_assigner ?? e.displayAssigner),
    reviewerId: n(e.reviewer_id),
    reviewerLabel: n(e.reviewer_label),
    priority: n(e.priority),
    dueDate: n(e.due_date),
    assignedAt: n(e.assigned_at ?? e.assignedAt),
    displayAssignedAt: n(e.display_assigned_at ?? e.displayAssignedAt),
    assignedAtLegacyFallback: _(e.assigned_at_legacy_fallback ?? e.assignedAtLegacyFallback),
    activitySentence: n(e.activity_sentence ?? e.activitySentence),
    dueState: n(e.due_state),
    rowVersion: w(e.row_version ?? e.version),
    createdAt: n(e.created_at),
    updatedAt: n(e.updated_at),
    links: Ga(y(e.links)),
    actions: Z(y(e.actions))
  };
}
function Ha(e) {
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
function Ga(e) {
  return { editor: Ha(y(e.editor)) };
}
function Ka(e) {
  return {
    locale: n(e.locale).toLowerCase(),
    workScope: n(e.work_scope),
    state: n(e.state),
    assignment: e.assignment ? He(y(e.assignment)) : null,
    actions: Z(y(e.actions))
  };
}
function Ya(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const i = n(t).toLowerCase();
    i && (a[i] = Ka(y(s)));
  }
  return a;
}
function Wa(e, a) {
  if (!a.length) return e;
  const t = { ...e };
  for (const s of a) {
    const i = n(s.targetLocale).toLowerCase();
    if (!i) continue;
    const r = n(s.workScope) || "localization", [o, d] = Qa(t, aa(i, r), i, r), c = d ? { ...d } : {
      locale: i,
      workScope: r,
      state: "",
      assignment: null,
      actions: Z({})
    };
    c.assignment || (c.assignment = s), (!c.state || c.state === "unassigned") && (c.state = Xa(s)), c.locale || (c.locale = i), c.workScope || (c.workScope = r), t[o] = c;
  }
  return t;
}
function Qa(e, a, t, s) {
  if (e[a]) return [a, e[a]];
  const i = `${t}:`, r = n(s).toLowerCase() || "localization", o = Ja(r);
  for (const [d, c] of Object.entries(e))
    if (d.startsWith(i)) {
      if (o) return [d, c];
      if (!c.assignment && (n(c.workScope) || d.slice(i.length) || "localization").toLowerCase() === r)
        return [d, c];
    }
  return [a, null];
}
function Ja(e) {
  const a = n(e).toLowerCase();
  return !a || a === "__all__";
}
function Xa(e) {
  switch (e.status) {
    case "open":
      return "open_pool";
    case "assigned":
    case "changes_requested":
      return "assigned_to_other";
    case "in_progress":
      return "in_progress";
    case "in_review":
      return "in_review";
    default:
      return "terminal";
  }
}
function Ge(e) {
  const a = y(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? $e(y(t.source_variant)) : null, i = Array.isArray(t.blockers) ? t.blockers.map((f) => Va(y(f))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((f) => $e(y(f))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((f) => He(y(f))) : [], d = Wa(Ya(y(t.locale_assignments ?? t.localeAssignments)), o), c = y(t.publish_gate), l = y(t.readiness_summary), u = de(y(t.quick_create), {
    missingLocales: x(l.missing_locales),
    recommendedLocale: n(l.recommended_locale),
    requiredForPublish: x(l.required_for_publish ?? l.required_locales)
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
    localeAssignments: d,
    publishGate: {
      allowed: _(c.allowed),
      overrideAllowed: _(c.override_allowed),
      blockedBy: x(c.blocked_by),
      reviewRequired: _(c.review_required)
    },
    readinessSummary: {
      state: B(l.state),
      requiredLocales: x(l.required_locales),
      missingLocales: x(l.missing_locales),
      availableLocales: x(l.available_locales),
      blockerCodes: x(l.blocker_codes),
      missingRequiredLocaleCount: w(l.missing_required_locale_count),
      pendingReviewCount: w(l.pending_review_count),
      outdatedLocaleCount: w(l.outdated_locale_count),
      publishReady: _(l.publish_ready)
    },
    quickCreate: u
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
function Ke(e, a) {
  const t = n(a).toLowerCase();
  return e.map((s) => n(s).toLowerCase()).filter((s) => s && s !== t);
}
function Ye(e) {
  return M(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function Za(e) {
  return e.blockers.some(fe);
}
function We(e, a) {
  const t = n(a).toLowerCase();
  return !t || Za(e) ? !1 : Ye(e).includes(t);
}
function Qe(e, a) {
  const t = Ye(e), s = n(a).toLowerCase(), i = We(e, s);
  return {
    ...e.quickCreate,
    enabled: i,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: i ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: i ? "" : e.quickCreate.disabledReasonCode
  };
}
function Ss(e, a) {
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
  }].sort((c, l) => c.locale.localeCompare(l.locale));
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
      displayAssignee: a.assignment.assigneeId,
      assignerId: "",
      displayAssigner: "",
      reviewerId: "",
      reviewerLabel: "",
      priority: a.assignment.priority,
      dueDate: a.assignment.dueDate,
      assignedAt: a.assignment.assignedAt || "",
      displayAssignedAt: "",
      assignedAtLegacyFallback: !1,
      activitySentence: "",
      dueState: "",
      rowVersion: 0,
      createdAt: "",
      updatedAt: "",
      links: { editor: null },
      actions: Z({})
    }, l = i.findIndex((u) => u.id === c.id || u.targetLocale === c.targetLocale);
    l >= 0 ? i[l] = c : i = [...i, c].sort((u, f) => u.targetLocale.localeCompare(f.targetLocale));
  }
  const r = e.blockers.map((c) => ({ ...c })).filter((c) => !(c.blockerCode === "missing_locale" && c.locale === t)), o = M(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), d = Ke(M(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
      missingLocales: d,
      blockerCodes: [...a.family.blockerCodes],
      missingRequiredLocaleCount: a.family.missingRequiredLocaleCount,
      pendingReviewCount: a.family.pendingReviewCount,
      outdatedLocaleCount: a.family.outdatedLocaleCount,
      publishReady: a.family.readinessState === "ready"
    },
    quickCreate: { ...a.family.quickCreate }
  };
}
function ks(e, a) {
  const t = { ...e }, s = { ...y(t.translation_readiness) }, i = n(a.locale).toLowerCase(), r = n(t.requested_locale).toLowerCase(), o = n(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const d = M(x(t.available_locales), x(s.available_locales), a.family.availableLocales, [i]), c = Ke(M(x(t.missing_required_locales), x(s.missing_required_locales), a.family.missingLocales), i);
  return t.available_locales = d, t.missing_required_locales = c, t.translation_family_id = o || a.familyId, s.family_id = o || a.familyId, s.state = a.family.readinessState, s.available_locales = d, s.missing_required_locales = c, s.blocker_codes = [...a.family.blockerCodes], s.missing_required_locale_count = a.family.missingRequiredLocaleCount, s.pending_review_count = a.family.pendingReviewCount, s.outdated_locale_count = a.family.outdatedLocaleCount, s.missing_locales = [...a.family.quickCreate.missingLocales], s.recommended_locale = a.family.quickCreate.recommendedLocale, s.required_for_publish = [...a.family.quickCreate.requiredForPublish], s.default_assignment = {
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
function et(e) {
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
function ue(e) {
  const a = et(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label.toUpperCase()}</span>`;
}
async function at(e) {
  const a = await N(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = y(a.metadata), t;
}
async function me(e) {
  const a = await N(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = n(e.headers.get("x-request-id")), t.traceId = Q(e.headers), t.metadata = y(a.metadata), t;
}
async function se(e, a = {}, t = {}) {
  const s = n(e.endpoint);
  if (!s) throw new Error("Assignment action endpoint is unavailable.");
  const i = {
    ...e.payload,
    ...a
  };
  e.expectedVersion > 0 && i.expected_version == null && i.expectedVersion == null && (i.expected_version = e.expectedVersion);
  const r = {
    method: "POST",
    credentials: "same-origin",
    headers: new Headers({
      Accept: "application/json",
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(i)
  }, o = await (t.fetch ? G(t.fetch, s, r) : Y(s, r));
  if (!o.ok) throw await me(o);
  return le(o);
}
function tt(e) {
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
function st(e) {
  const a = y(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), i = [];
  for (const r of t) {
    const o = tt(r);
    !o || s.has(o.value) || (s.add(o.value), i.push(o));
  }
  return i;
}
function nt(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = Array.from(new Set(a.map((i) => n(i)).filter(Boolean)));
  return s.length > 0 && t.set("assignee_id", s.join(",")), R(`${L(e || "/admin/api")}/translations/options/assignees`, t);
}
async function it(e, a = [], t = {}) {
  const s = nt(e, a), i = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : Y(s, { headers: { Accept: "application/json" } }));
  if (!i.ok) throw await me(i);
  return st(await le(i));
}
function rt(e) {
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
function ot(e) {
  return W(rt(e));
}
function lt(e) {
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
function Je(e) {
  return W(lt(e));
}
function ct(e) {
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
function Xe(e) {
  return W(ct(e));
}
function $(e, a) {
  return n(e[a]);
}
function fe(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = $(e.details, "reason").toLowerCase(), t = $(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!($(e.details, "content_type") || $(e.details, "environment")), i = !!($(e.details, "message") || $(e.details, "policy_reason"));
  return s && !a && !i;
}
function dt(e) {
  return fe(e) ? "Policy unavailable" : A(e.blockerCode);
}
function ut(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", $(a, "content_type")],
    ["Environment", $(a, "environment")]
  ], s = $(a, "reason"), i = $(a, "message"), r = $(a, "remediation");
  return fe(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), i && i !== s && t.push(["Message", i]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function mt(e) {
  const a = ut(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${m(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${m(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function ft(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function Ze(e) {
  return W(ft(e));
}
function gt(e, a, t) {
  const s = L(e), i = n(t.sourceRecordId);
  return !s || !i || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(i)}?locale=${encodeURIComponent(t.locale)}`;
}
function ea(e) {
  const a = n(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 1728e5 ? "due_soon" : "on_track";
}
function aa(e, a = "") {
  return `${n(e).toLowerCase()}:${n(a) || "__all__"}`;
}
function pt(e, a) {
  const t = n(a).toLowerCase();
  return t ? Object.entries(e.localeAssignments).filter(([s, i]) => (n(i.locale).toLowerCase() || s.split(":")[0]) === t).sort(([s, i], [r, o]) => {
    const d = Ae(i), c = Ae(o);
    if (d !== c) return d - c;
    const l = n(i.workScope).toLowerCase(), u = n(o.workScope).toLowerCase();
    return l !== u ? l.localeCompare(u) : s.localeCompare(r);
  }) : [];
}
function Ae(e) {
  switch (e.state) {
    case "assigned_to_me":
      return 0;
    case "assigned_to_other":
    case "in_progress":
    case "in_review":
      return 1;
    case "open_pool":
      return 2;
    case "unassigned":
    case "":
      return 3;
    case "source_locale":
      return 5;
    default:
      return 4;
  }
}
function ta(e) {
  return e && (e.displayAssignee || e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function sa(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function yt(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function Se(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${p(e.state)}">No active assignment.</p>`;
  const t = a.dueState || ea(a.dueDate), s = t === "none" ? "No due date" : A(t), i = e.state === "assigned_to_me" ? "me" : ta(a);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${p(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Je(a.status)}">${m(A(a.status))}</span>
      <span>${m(i)}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${m(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${Ze(t)}">${m(s)}</span>
    </div>
  `;
}
function ke(e) {
  if (!e || e.state === "source_locale") return "";
  const a = aa(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled ? s.push(`
      <button type="button" class="${T}" data-family-assign-to-me="true" data-locale-assignment-key="${p(a)}">
        Assign to me
      </button>
    `) : t.assignToMe.reasonCode === "already_assigned" && s.push(`
      <button
        type="button"
        class="${T}${ie(!1)}"
        disabled
        aria-disabled="true"
        title="${p(t.assignToMe.reason || "Assignment already belongs to you")}"
      >
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-nowrap">
        ${ge({
    key: a,
    ariaLabel: "Assignee",
    className: `${vt} min-w-0 flex-1 sm:w-80 sm:flex-none lg:w-96`
  })}
        <button type="button" class="${T}" data-family-assign-to-user="true" data-locale-assignment-key="${p(a)}">
          Assign
        </button>
      </div>
    `), t.claim.enabled && s.push(`
      <button type="button" class="${T}" data-family-claim-assignment="true" data-locale-assignment-key="${p(a)}">
        Claim
      </button>
    `), t.openEditor.enabled && t.openEditor.href && s.push(`
      <a
        class="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
        data-family-locale-editor-link="${p(a)}"
        href="${p(t.openEditor.href)}"
      >${m(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end" data-family-locale-actions="true">${s.join("")}</div>`;
  const i = sa(e);
  return i ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${p(a)}">${m(i)}</p>` : "";
}
function ht(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => yt(a)).sort(([a], [t]) => a.localeCompare(t));
}
function bt(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${p(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${p(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function ne(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${p(a || "Assignment action is unavailable.")}"`;
}
function ie(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var na = "block h-12 w-full rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:focus:ring-gray-600", ia = na, vt = ia.replace("h-12", "h-10"), xt = "/api/translations/options/assignees?per_page=200";
function ge(e) {
  const a = n(e.key), t = n(e.initialValue), s = e.enabled !== !1, i = n(e.placeholder) || "Select assignee", r = n(e.reason), o = n(e.name), d = ne(s, r);
  return `
    <select
      ${o ? `name="${p(o)}"` : ""}
      class="${p(e.className || ia)}"
      data-family-assignee-select="${p(a)}"
      data-initial-assignee-id="${p(t)}"
      data-formgen-managed="true"
      data-formgen-relationship="true"
      data-endpoint-url="${xt}"
      data-endpoint-method="GET"
      data-endpoint-renderer="typeahead"
      data-endpoint-search-param="q"
      data-endpoint-value-field="value"
      data-endpoint-label-field="label"
      data-endpoint-placeholder="${p(i)}"
      data-endpoint-search-placeholder="Search assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      ${t ? `data-relationship-current="${p(t)}"` : ""}
      aria-label="${p(e.ariaLabel || "Assignee")}"
      ${d}
    >
      <option value="">${m(s ? i : r || i)}</option>
      ${t ? `<option value="${p(t)}" selected>${m(t)}</option>` : ""}
    </select>
  `;
}
function _t(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${A(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && t.push({
      id: `variant-published-${s.id}`,
      timestamp: s.publishedAt,
      title: `${s.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const s of e.activeAssignments) {
    const i = s.assignedAt || s.updatedAt || s.createdAt;
    if (!i) continue;
    const r = Lt(s);
    t.push({
      id: `assignment-${s.id}`,
      timestamp: i,
      title: r || `${s.targetLocale.toUpperCase()} assignment ${A(s.status)}`,
      detail: r ? `Priority ${s.priority || "normal"}.` : `${wt(s)} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, i) => i.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function wt(e) {
  return e.assigneeId ? `Assigned to ${e.displayAssignee || e.assigneeLabel || e.assigneeId}.` : "Currently unassigned.";
}
function Lt(e) {
  if (e.activitySentence) return e.activitySentence;
  const a = e.displayAssigner || Te(e.assignerId, "System"), t = (e.targetLocale || "").toUpperCase(), s = e.displayAssignee || e.assigneeLabel || Te(e.assigneeId, "Unassigned");
  if (!a || !t || !s) return "";
  const i = e.displayAssignedAt || Ct(e.assignedAt);
  return i ? e.assignedAtLegacyFallback ? `${a} assigned ${t} to ${s}; created ${i}` : `${a} assigned ${t} to ${s} on ${i}` : `${a} assigned ${t} to ${s}`;
}
function Te(e, a) {
  const t = n(e);
  return !t || t === "__me__" || t === "__missing_actor__" ? a : t.length > 12 ? `${t.slice(0, 8)}...` : t;
}
function Ct(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? a : new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(t);
}
function $t(e) {
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
          <div class="text-xs font-semibold uppercase tracking-wider text-gray-500">${m(a.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${a.tone}">${m(a.value)}</div>
        </div>
      `).join("");
}
function At(e, a) {
  const t = L(a.contentBasePath || `${L(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, i = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), d = (u) => {
    const f = !We(e, u);
    return `
      <button
        type="button"
        class="${O}${f ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${p(u)}"
        ${f ? 'aria-disabled="true"' : ""}
        title="${p(f ? i : `Create ${u.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = (u, f) => {
    const g = u.locale || f.split(":")[0] || "", h = u.workScope || f.split(":")[1] || "__all__", v = `${e.contentType || "translation"} ${g.toUpperCase()}`;
    return `
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start" data-family-locale-assignment-key="${p(f)}">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(g.toUpperCase())}</span>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">${m(h)}</span>
            <span class="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Assignment</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(v)}</p>
          <p class="mt-1 text-xs text-gray-500">Additional work scope</p>
          ${Se(u)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${ke(u)}
        </div>
      </li>
    `;
  }, l = e.localeVariants.flatMap((u) => {
    const f = n(u.locale).toLowerCase();
    f && o.add(f);
    const g = gt(t, e, u), h = pt(e, u.locale), [v, C] = h[0] || ["", null];
    v && r.add(v);
    const P = g ? `<a href="${p(g)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', q = u.fields.title || u.fields.slug || `${e.contentType} ${u.locale.toUpperCase()}`;
    return [`
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(u.locale.toUpperCase())}</span>
            ${u.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ot(u.status)}">${m(A(u.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(q)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${m(ce(u.updatedAt || u.createdAt)) || "n/a"}</p>
          ${Se(C)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${ke(C)}
          ${P}
        </div>
      </li>
    `, ...h.slice(1).map(([E, F]) => (r.add(E), c(F, E)))];
  });
  for (const [u, f] of Object.entries(e.localeAssignments).sort(([g], [h]) => g.localeCompare(h))) {
    if (r.has(u) || f.state === "source_locale") continue;
    l.push(c(f, u)), r.add(u);
    const g = n(f.locale).toLowerCase() || u.split(":")[0];
    g && o.add(g);
  }
  for (const u of s) {
    const f = n(u).toLowerCase();
    o.has(f) || l.push(`
      <li class="flex flex-col items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-6 sm:flex-row">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${m(u.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0">${d(u)}</div>
      </li>
    `);
  }
  return `
    <section class="${D} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function St(e) {
  if (!e.activeAssignments.length) {
    const a = ht(e), t = a[0]?.[1] || null, s = a.some(([, o]) => o.actions.assignToMe.enabled), i = a.some(([, o]) => o.actions.assignToUser.enabled), r = a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto_auto] 2xl:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="${na}" data-family-assignment-locale-select="true">
                ${a.map(([o, d]) => `
                  <option value="${p(o)}" ${bt(d)}>${m(d.locale.toUpperCase())} · ${m(d.workScope || "__all__")}</option>
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
              <button type="button" class="${T} w-full 2xl:w-auto${ie(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${ne(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${i ? `
              <button type="button" class="${O} w-full 2xl:w-auto${ie(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${ne(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : (() => {
      const o = sa(Object.values(e.localeAssignments).find((d) => d.state !== "source_locale") || null) || "No assignable locale is available for this family.";
      return `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${m(o)}</p>`;
    })();
    return `
      <section class="${D} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${r}
      </section>
    `;
  }
  return `
    <section class="${D} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = ea(a.dueDate), s = t === "none" ? "No due date" : A(t), i = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${m(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Je(a.status)}">${m(A(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ze(t)}">${m(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${m(ta(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${m(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${m(ce(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${i ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${p(a.id)}"
                    href="${p(i.href)}"
                    title="${p(i.description || i.label)}"
                  >${m(i.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function kt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Xe(t.blockerCode)}">${m(dt(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${m(s)}</span>` : ""}
              </div>
              ${mt(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${D} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
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
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-gray-600" role="list">
            <li>Review required: <strong class="text-gray-900">${e.publishGate.reviewRequired ? "Yes" : "No"}</strong></li>
            <li>Override allowed: <strong class="text-gray-900">${e.publishGate.overrideAllowed ? "Yes" : "No"}</strong></li>
            <li>Available locales: <strong class="text-gray-900">${m(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${a}</ul>
        </div>
      </div>
    </section>
  `;
}
function Tt(e) {
  const a = _t(e);
  return `
    <section class="${D} p-6 shadow-sm" aria-labelledby="translation-family-activity">
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
function H(e) {
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
function ra(e) {
  return `
    <div class="${Ca}" aria-busy="true" aria-label="Loading">
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
      <div class="max-w-md ${$a} p-8 text-center shadow-sm">
        <h2 class="${xa}">${m(e)}</h2>
        <p class="${_a} mt-2">${m(a)}</p>
      </div>
    </div>
  `;
}
function qt(e, a, t) {
  const s = t.syncRecovery, i = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${O}"
        data-family-sync-action="true"
        data-family-sync-rpc="${p(s.rpcInvokePath)}"
        data-family-sync-command="${p(s.commandName)}"
        data-family-sync-family-id="${p(s.familyId)}"
        data-family-sync-environment="${p(s.environment)}"
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
        <button type="button" class="ui-state-retry-btn ${T}">
          Reload family detail
        </button>
        ${i}
      </div>
    </div>
  `;
}
function It(e, a = {}) {
  if (e.status === "loading") return ra("Loading translation family...");
  if (e.status === "empty") return `
      ${re("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${H(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${qt(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${H(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return re("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, i = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(A).join(", ") : "No blockers";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${p(t.familyId)}" data-readiness-state="${p(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${La}">Translation family</p>
            <h1 class="${wa} mt-2">${m(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${m(t.contentType)} · Source locale ${m(t.sourceLocale.toUpperCase())} · Family ${m(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${ue(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${m(i)}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${$t(t)}
        </div>
        ${H(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${At(t, a)}
          ${St(t)}
        </div>
        <div class="space-y-6">
          ${kt(t)}
          ${Tt(t)}
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
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : Y(t, { headers: { Accept: "application/json" } })), i = n(s.headers.get("x-request-id")), r = Q(s.headers);
    if (!s.ok) {
      const d = await N(s), c = y(d.metadata?.sync_recovery), l = d.textCode === "NOT_FOUND" || _(c.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: d.message,
        requestId: i,
        traceId: r,
        statusCode: s.status,
        errorCode: d.textCode,
        syncRecovery: l ? Ta(c, { familyId: n(d.metadata?.family_id) }) : null
      };
    }
    const o = Ge(y(await s.json()));
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
function oa(e) {
  const a = Fe(), t = a ? I(a, "channel") : "";
  if (t) return t;
  try {
    const s = new URL(n(e), "http://localhost");
    return I(s.searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function z(e, a, t = {}) {
  e.innerHTML = It(a, t);
}
var Rt = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function Pt(e) {
  const a = e ?? new URLSearchParams();
  return J({
    channel: I(a, "channel") || "",
    contentType: I(a, "content_type") || "",
    readinessState: I(a, "readiness_state") || "",
    blockerCode: I(a, "blocker_code") || "",
    missingLocale: I(a, "missing_locale") || "",
    page: _e(a, "page") || 1,
    perPage: _e(a, "per_page") || 50
  });
}
function qe(e = globalThis.location) {
  return Pt(Fe(e));
}
function Et(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of Rt) t.delete(s);
  return Ne(a).forEach((s, i) => t.set(i, s)), t.toString();
}
function la(e, a = "/admin") {
  const t = L(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${L(a || "/admin")}/api`;
}
function pe(e = "/admin") {
  return `${L(e || "/admin")}/translations/families`;
}
function Ft(e, a, t = "") {
  const s = L(e || pe("/admin")), i = new URLSearchParams();
  return k(i, "channel", t), R(`${s}/${encodeURIComponent(n(a))}`, i);
}
function ye(e, a) {
  const t = n(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [i, r] of Object.entries(a)) k(s, i, r);
  return R(t, s);
}
function Ut(e, a, t = {}) {
  return ye(e, {
    family_id: a.familyId,
    channel: n(t.channel),
    content_type: a.contentType || n(t.contentType),
    readiness_state: a.readinessState || n(t.readinessState),
    blocker_code: n(t.blockerCode),
    missing_locale: n(t.missingLocale)
  });
}
function Dt(e, a, t = {}) {
  return ye(e, {
    family_id: a.familyId,
    channel: n(t.channel)
  });
}
function ca(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function S(e, a, t) {
  return `<option value="${p(e)}" ${e === t ? "selected" : ""}>${m(a)}</option>`;
}
function Bt(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-translation-filter-form="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${p(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Readiness</span>
          <select name="readiness_state" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${S("", "Any", e.readinessState)}
            ${S("blocked", "Blocked", e.readinessState)}
            ${S("ready", "Ready", e.readinessState)}
          </select>
        </label>
        <label class="block text-sm font-medium text-gray-700">
          <span>Blocker</span>
          <select name="blocker_code" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500">
            ${S("", "Any", e.blockerCode)}
            ${S("missing_locale", "Missing locale", e.blockerCode)}
            ${S("missing_field", "Missing field", e.blockerCode)}
            ${S("pending_review", "Pending review", e.blockerCode)}
            ${S("outdated_source", "Outdated source", e.blockerCode)}
            ${S("policy_denied", "Policy issue", e.blockerCode)}
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
  ].map((t) => S(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${O} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${p(e.page)}">
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
function Mt(e) {
  if (!e.blockerCodes.length) return '<span class="text-gray-400">No blockers</span>';
  const a = /* @__PURE__ */ new Set(), t = e.blockerCodes.map((s) => {
    const i = e.blockerLabels[s] || A(s);
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
  return t.map(({ code: s, label: i }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${Xe(s)}">${m(i.toUpperCase())}</span>`).join(" ");
}
function ae(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-50 px-2 py-1 text-xs">
      <span class="font-semibold ${t}">${m(e)}</span>
      <span class="font-semibold uppercase tracking-wide text-gray-500">${m(a.toUpperCase())}</span>
    </span>
  `;
}
function Nt(e, a, t, s) {
  const i = ca(e);
  return `
    <div class="action-menu action-menu--right" data-action-menu data-row-id="${p(e.familyId)}">
      <button type="button"
              class="action-menu__trigger"
              data-action-menu-trigger
              aria-label="Actions for ${p(i)}"
              aria-haspopup="true"
              aria-expanded="false">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>
      <div class="action-menu__content hidden"
           data-action-menu-content
           role="menu"
           aria-orientation="vertical">
        <a class="action-menu__item"
           data-action-menu-item
           data-action="open"
           role="menuitem"
           href="${p(a)}">
          <i class="iconoir-folder w-4 h-4 flex-shrink-0" aria-hidden="true"></i>
          <span>Open family</span>
        </a>
        ${t ? `<a class="action-menu__item" data-action-menu-item data-action="matrix" role="menuitem" href="${p(t)}"><i class="iconoir-table-2-columns w-4 h-4 flex-shrink-0" aria-hidden="true"></i><span>Matrix</span></a>` : ""}
        ${s ? `<a class="action-menu__item" data-action-menu-item data-action="queue" role="menuitem" href="${p(s)}"><i class="iconoir-list w-4 h-4 flex-shrink-0" aria-hidden="true"></i><span>Queue</span></a>` : ""}
      </div>
    </div>
  `;
}
function Re(e, a) {
  return ye(e, {
    channel: n(a.channel),
    content_type: n(a.contentType),
    readiness_state: n(a.readinessState),
    blocker_code: n(a.blockerCode),
    missing_locale: n(a.missingLocale)
  });
}
function Ot(e, a, t) {
  const s = t.familyBasePath || pe(t.basePath || "/admin");
  return e.map((i) => {
    const r = Ft(s, i.familyId, a.channel), o = t.matrixPath ? Ut(t.matrixPath, i, a) : "", d = t.queuePath ? Dt(t.queuePath, i, a) : "", c = ca(i);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-translation-row data-translation-row-id="${p(i.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${p(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${m(c)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${m(i.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${m(i.contentType || "unknown")} · Source ${m(i.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${ue(i.readinessState)}</td>
        <td class="px-4 py-4 align-top">${Mt(i)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-nowrap gap-1.5">
            ${ae(i.missingRequiredLocaleCount, "Missing", i.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${ae(i.pendingReviewCount, "Review", i.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${ae(i.outdatedLocaleCount, "Outdated", i.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${Ie(i.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${Ie(i.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          ${Nt(i, r, o, d)}
        </td>
      </tr>
    `;
  }).join("");
}
function jt(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, i = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, o = e.page * e.perPage < e.total, d = t.matrixPath || t.queuePath ? `
      <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1" aria-label="Translation family views">
        ${t.matrixPath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${p(Re(t.matrixPath, a))}">Matrix</a>` : ""}
        ${t.queuePath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${p(Re(t.queuePath, a))}">Queue</a>` : ""}
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
          ${d}
          <button type="button" class="${T}" data-translation-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${m(e.page)}</span>
          <button type="button" class="${T}" data-translation-list-page="next" ${o ? "" : "disabled"}>Next</button>
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
            ${Ot(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function zt(e) {
  return `
    <div class="${De} mt-6 p-6" role="alert">
      <h2 class="${Ue}">Families failed to load</h2>
      <p class="${Be} mt-2">${m(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${m(e.requestURL)}</p>` : ""}
      ${H({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${T}">Retry</button>
    </div>
  `;
}
function Vt(e, a = {}) {
  const t = e.filters, s = Bt(t);
  if (e.status === "loading") return `${s}${ra("Loading translation families...")}`;
  if (e.status === "error") return `${s}${zt(e)}`;
  const i = e.response;
  return !i || e.status === "empty" || i.items.length === 0 ? `${s}${re("No translation families found", "No families match the current filters.")}` : `${s}${jt(i, t, a)}`;
}
function Pe(e, a, t = {}) {
  e.innerHTML = Vt(a, t);
}
async function Ht(e, a, t = {}) {
  const s = Oe(la(e, t.basePath), a), i = t.fetch;
  try {
    const r = await (i ? i(s, { headers: { Accept: "application/json" } }) : Y(s, { headers: { Accept: "application/json" } })), o = n(r.headers.get("x-request-id")), d = Q(r.headers);
    if (!r.ok) {
      const l = await N(r);
      return {
        status: "error",
        filters: a,
        message: l.message,
        requestURL: s,
        requestId: o,
        traceId: d,
        statusCode: r.status,
        errorCode: l.textCode
      };
    }
    const c = Ve(y(await r.json()));
    return {
      status: c.items.length ? "ready" : "empty",
      filters: a,
      response: c,
      requestURL: s,
      requestId: o,
      traceId: d,
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
function Gt(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = Et(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
function da(e) {
  e.dataset.translationCopyIdBound !== "true" && (e.dataset.translationCopyIdBound = "true", e.addEventListener("click", (a) => {
    const t = a.target;
    if (!(t instanceof HTMLElement)) return;
    const s = t.closest("[data-copy-id]");
    if (!s) return;
    const i = s.dataset.copyId || "";
    i && globalThis.navigator?.clipboard?.writeText && globalThis.navigator.clipboard.writeText(i);
  }));
}
async function Ts(e, a = {}) {
  if (!e) return null;
  da(e);
  const t = e.dataset || {}, s = {
    endpoint: n(a.endpoint || t.endpoint),
    basePath: n(a.basePath || t.basePath || "/admin"),
    familyBasePath: n(a.familyBasePath || t.familyBasePath),
    matrixPath: n(a.matrixPath || t.matrixPath),
    queuePath: n(a.queuePath || t.queuePath)
  };
  if (s.familyBasePath || (s.familyBasePath = pe(s.basePath)), t.ssrEnhanced === "true")
    return e.dataset.translationFamilyListEnhanced = "true", ua(e), {
      status: "ready",
      filters: qe()
    };
  let i = qe(), r = null;
  const o = async (d, c = !1) => {
    i = J(d), c && Gt(i), Pe(e, {
      status: "loading",
      filters: i
    }, s);
    const l = await Ht(n(s.endpoint), i, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = l, Pe(e, l, s), Kt(e, l, o), l;
  };
  return r = await o(i, !1), r;
}
function Kt(e, a, t) {
  ua(e);
  const s = e.querySelector('[data-translation-filter-form="true"]');
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
  }), e.querySelectorAll("[data-translation-list-page]").forEach((i) => {
    i.addEventListener("click", () => {
      if (i.disabled) return;
      const r = i.dataset.translationListPage === "next" ? 1 : -1;
      t({
        ...a.filters,
        page: Math.max(1, a.filters.page + r)
      }, !0);
    });
  });
}
function ua(e) {
  e.dataset.translationFamilyListActionMenusStandalone !== "true" && (Ce.get(e)?.destroy(), Ce.set(e, va(e, {
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
function Yt(e, a) {
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
function Wt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Qt(e) {
  const a = n(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Jt(e, a, t, s) {
  const i = n(e.locale).toLowerCase(), r = n(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === i && o ? o : i && a[i] ? a[i] : o;
}
var Xt = class extends ba {
  constructor(e) {
    super({
      size: "xl",
      animationDuration: 0,
      labelledBy: "translation-create-locale-title",
      initialFocus: 'select[name="locale"]',
      containerClass: "border border-gray-200",
      backdropDataAttr: "data-translation-create-locale-modal"
    }), this.config = e, this.quickCreate = e.quickCreate;
    const a = n(e.initialLocale || this.quickCreate.recommendedLocale || this.quickCreate.missingLocales[0]).toLowerCase();
    this.selectedLocale = this.quickCreate.missingLocales.includes(a) ? a : this.quickCreate.missingLocales[0];
  }
  async onAfterShow() {
    this.backdrop?.setAttribute("data-formgen-auto-init", "true"), this.container && await K(this.container, this.config.assigneeOptionsBasePath || "/admin/api", { fetch: this.config.fetch });
  }
  renderContent() {
    const { config: e, quickCreate: a, selectedLocale: t } = this;
    return `
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${m(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${m(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${Aa}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${a.missingLocales.map((s) => `
                <option value="${p(s)}" ${s === t ? "selected" : ""}>
                  ${m(s.toUpperCase())}${s === a.recommendedLocale ? " (recommended)" : ""}
                </option>
              `).join("")}
            </select>
          </label>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-700">
            <p><strong>Required for publish:</strong> ${m(a.requiredForPublish.join(", ") || "None")}</p>
            <p class="mt-2"><strong>Recommended locale:</strong> ${m(a.recommendedLocale.toUpperCase() || "N/A")}</p>
            <p class="mt-2"><strong>Default work scope:</strong> ${m(a.defaultAssignment.workScope || "__all__")}</p>
          </div>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 px-6 py-4">
            <input type="checkbox" name="auto_create_assignment" class="h-4 w-4 rounded border-gray-300 text-sky-600" ${a.defaultAssignment.autoCreateAssignment ? "checked" : ""}>
            <span class="text-sm text-gray-800">Seed an assignment now</span>
          </label>
          <div data-assignment-fields="true" class="grid gap-4 rounded-xl border border-gray-200 p-6">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Assignee</span>
              ${ge({
      key: "create-locale",
      name: "assignee_id",
      initialValue: a.defaultAssignment.assigneeId,
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
    ].map((s) => `
                  <option value="${s}" ${s === (a.defaultAssignment.priority || "normal") ? "selected" : ""}>${A(s)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${p(Wt(a.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${T}">Cancel</button>
          <button type="submit" class="${O}">${m(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container;
    if (!e) return;
    const a = e.querySelector("form"), t = e.querySelector('select[name="locale"]'), s = e.querySelector('input[name="auto_create_assignment"]'), i = e.querySelector('select[name="assignee_id"]'), r = e.querySelector('select[name="priority"]'), o = e.querySelector('input[name="due_date"]'), d = e.querySelector('[data-assignment-fields="true"]'), c = e.querySelector('[data-create-locale-feedback="true"]'), l = e.querySelector('button[type="submit"]'), u = () => {
      d && s && (d.hidden = !s.checked);
    };
    u(), s?.addEventListener("change", u), e.querySelectorAll('[data-close-modal="true"]').forEach((f) => {
      f.addEventListener("click", () => this.requestClose());
    }), a?.addEventListener("submit", async (f) => {
      if (f.preventDefault(), !t || !l) return;
      c && (c.hidden = !0, c.textContent = ""), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      const g = n(t.value).toLowerCase();
      try {
        const h = !!s?.checked, v = h ? {
          assigneeId: i?.value,
          priority: r?.value,
          dueDate: Qt(o?.value || "")
        } : {}, C = await this.config.onSubmit({
          locale: g,
          autoCreateAssignment: h,
          ...v
        });
        this.requestClose(), await this.config.onSuccess?.(C);
      } catch (h) {
        const v = Yt(h, g);
        c && (c.hidden = !1, c.textContent = v), b("error", v);
      } finally {
        l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    });
  }
};
function he(e) {
  if (typeof document > "u") return;
  const a = e.quickCreate;
  if (!a.enabled || a.missingLocales.length === 0) {
    b("warning", a.disabledReason || "Locale creation is unavailable.");
    return;
  }
  new Xt(e).show();
}
function Zt(e) {
  return {
    familyId: n(e.dataset.familyId),
    requestedLocale: n(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: n(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: n(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: de(Le(e.dataset.quickCreate, {}), {}),
    localeURLs: Le(e.dataset.localeUrls, {})
  };
}
function qs(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = Zt(a), s = ve({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((i) => {
      i.addEventListener("click", (r) => {
        r.preventDefault();
        const o = n(i.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        he({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (d) => s.createLocale(t.familyId, d),
          onSuccess: async (d) => {
            b("success", `${d.locale.toUpperCase()} locale created.`);
            const c = typeof window < "u" && window.location.pathname.endsWith("/edit"), l = Jt(d, t.localeURLs, t.requestedLocale, c);
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
function ma(e, a) {
  const t = n(a.dataset.localeAssignmentKey).toLowerCase();
  if (t) return t;
  if (n(a.dataset.localeAssignmentSource) === "empty-panel") {
    const s = e.querySelector('[data-family-assignment-locale-select="true"]');
    return n(s?.value).toLowerCase();
  }
  return "";
}
function es(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function as(e, a, t) {
  if (n(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (n(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function fa(e) {
  if (!ee(e)) return "";
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
function ga(e, a, t) {
  const s = as(e, a, t);
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
      fa(s)
    ].map(n).find(Boolean) || ""
  };
}
function pa(e) {
  if (!e) return;
  const a = e.previousElementSibling;
  ((ee(e) && a instanceof HTMLElement ? a.querySelector("input") : null) || e).focus();
}
function ts(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function ss(e, a) {
  const t = n(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", i = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, i.appendChild(r);
  let o = t === "";
  for (const d of a) {
    const c = e.ownerDocument.createElement("option");
    c.value = d.value, c.textContent = ts(d), d.description && c.setAttribute("data-description", d.description), d.displayName && c.setAttribute("data-display-name", d.displayName), d.avatarURL && c.setAttribute("data-avatar-url", d.avatarURL), t && t === d.value && (c.selected = !0, o = !0), i.appendChild(c);
  }
  if (t && !o) {
    const d = e.ownerDocument.createElement("option");
    d.value = t, d.textContent = t, d.selected = !0, i.appendChild(d);
  }
  e.replaceChildren(i);
}
function ya(e) {
  return Array.from(e.querySelectorAll("[data-family-assignee-select]"));
}
function be(e) {
  return ya(e).filter((a) => a.dataset.formgenManaged === "true");
}
function ee(e) {
  const a = e.previousElementSibling;
  return a instanceof HTMLElement && a.getAttribute("data-fg-typeahead-root") === "true";
}
function ns(e) {
  if (!ee(e)) return !1;
  if (fa(e)) return !0;
  const a = e.previousElementSibling;
  if (!(a instanceof HTMLElement)) return !1;
  const t = a.querySelector("input"), s = n(t?.value);
  return s && s !== n(e.dataset.initialAssigneeId || e.value) ? !0 : !!a.querySelector("[data-fg-typeahead-option]");
}
function is(e) {
  return e.dataset.familyAssigneeFormgenReady === "true";
}
function rs(e) {
  for (const a of be(e)) ns(a) && (a.dataset.familyAssigneeFormgenReady = "true");
}
function ha(e) {
  delete e.dataset.familyAssigneeFormgenReady, ee(e) && e.previousElementSibling?.remove();
}
function os(e) {
  for (const a of e) ha(a);
}
function ls(e, a) {
  const t = L(a || "/admin/api"), s = t.endsWith("/api") ? t.slice(0, -4) || "/admin" : L(t);
  for (const i of be(e)) {
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
async function K(e, a, t = {}) {
  const s = be(e);
  if (s.length > 0 && typeof window < "u") {
    ls(e, a);
    const i = window.FormgenRelationships;
    if (i && typeof i.initRelationships == "function") {
      const r = e instanceof HTMLElement ? e : null, o = r?.hasAttribute("data-formgen-auto-init") ?? !1;
      r && !o && r.setAttribute("data-formgen-auto-init", "true");
      try {
        await i.initRelationships(), rs(e);
      } catch {
        os(s);
      } finally {
        r && !o && r.removeAttribute("data-formgen-auto-init");
      }
    }
  }
  await cs(e, a, t);
}
async function cs(e, a, t = {}) {
  const s = ya(e).filter((r) => !is(r));
  if (s.length === 0) return;
  for (const r of s) ha(r);
  const i = s.map((r) => n(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await it(a, i, t);
    for (const o of s) ss(o, r);
  } catch {
    for (const r of s) {
      const o = n(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const d = r.ownerDocument.createElement("option");
      d.value = o, d.textContent = o || "Assignees unavailable", d.selected = !0, r.appendChild(d), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function te(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function U(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = n(t?.dataset.assignToMeEnabled) === "true", i = n(t?.dataset.assignToUserEnabled) === "true", r = n(t?.dataset.assignToMeReason), o = n(t?.dataset.assignToUserReason);
  te(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), te(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), i, o), te(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), i, o);
}
function ds(e, a) {
  const t = n(e.dataset.assignmentId), s = n(e.dataset.familyAssignmentAction), i = w(e.dataset.rowVersion, 0);
  return {
    enabled: !e.disabled && e.getAttribute("aria-disabled") !== "true",
    permission: "",
    endpoint: t && s ? `${L(a)}/translations/assignments/${encodeURIComponent(t)}/actions/${encodeURIComponent(s)}` : "",
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
function us(e, a) {
  return n(a.dataset.localeAssignmentSource) !== "empty-panel" ? null : e.querySelector('[data-family-assignment-locale-select="true"]')?.selectedOptions[0] ?? null;
}
function ms(e, a, t) {
  const s = us(e, a), i = n(a.dataset.assignmentTargetLocale || s?.dataset.assignmentTargetLocale), r = n(a.dataset.assignmentWorkScope || s?.dataset.assignmentWorkScope), o = t === "self" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToMeEndpoint || s?.dataset.assignmentEndpoint) : t === "user" ? n(a.dataset.assignmentEndpoint || s?.dataset.assignToUserEndpoint || s?.dataset.assignmentEndpoint) : n(a.dataset.assignmentEndpoint), d = n(a.dataset.assignmentId), c = w(a.dataset.rowVersion, 0), l = {};
  if (i && (l.target_locale = i), r && (l.work_scope = r), t === "self") {
    const f = n(a.dataset.assignmentAssigneeId || s?.dataset.assignToMeAssigneeId);
    f && (l.assignee_id = f);
  }
  let u = a.getAttribute("title") || "";
  return o ? (t === "self" || t === "user") && !i ? u = u || "Assignment target locale is unavailable." : t === "self" && !n(l.assignee_id) && (u = u || "Self-assignment payload is unavailable.") : u = u || "Assignment action endpoint is unavailable.", {
    enabled: !a.disabled && a.getAttribute("aria-disabled") !== "true" && !u,
    permission: "",
    endpoint: o,
    href: "",
    label: a.textContent?.trim() || t,
    reason: u,
    reasonCode: "",
    requiredFields: [],
    payload: l,
    assignmentId: d,
    expectedVersion: c
  };
}
async function fs(e, a, t, s) {
  const i = la(a, t.basePath || "/admin"), r = n(e.dataset.familyId), o = oa(a) || n(e.dataset.channel), d = ve({
    basePath: i,
    fetch: s.fetch
  });
  await K(e, i, { fetch: s.fetch }), e.dataset.translationEnhancedActionsBound !== "true" && (e.dataset.translationEnhancedActionsBound = "true", ka(e, {
    fetch: s.fetch,
    ...s.enhancedAction,
    onFragmentsApplied: async () => {
      await K(e, i, { fetch: s.fetch }), U(e);
    }
  })), U(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
    U(e);
  }), e.querySelectorAll('[data-translation-create-locale-trigger="true"]').forEach((l) => {
    l.dataset.translationCreateBound !== "true" && (l.dataset.translationCreateBound = "true", l.addEventListener("click", async (u) => {
      if (u.preventDefault(), l.disabled || l.getAttribute("aria-disabled") === "true") {
        b("warning", l.getAttribute("title") || "Locale creation is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const f = await oe(a, { fetch: s.fetch });
        if (f.status !== "ready" || !f.detail) {
          b("error", f.message || "Translation family detail is unavailable.");
          return;
        }
        const g = n(l.dataset.locale).toLowerCase() || f.detail.quickCreate.recommendedLocale || "";
        he({
          familyId: f.detail.familyId || r,
          quickCreate: Qe(f.detail, g),
          initialLocale: g,
          heading: `Create ${g.toUpperCase()} locale`,
          assigneeOptionsBasePath: i,
          fetch: s.fetch,
          onSubmit: (h) => d.createLocale(f.detail?.familyId || r, {
            ...h,
            channel: o
          }),
          onSuccess: async (h) => {
            b("success", `${h.locale.toUpperCase()} locale created.`), typeof window < "u" && window.location.reload();
          }
        });
      } catch (f) {
        b("error", f instanceof Error ? f.message : "Failed to open locale creation.");
      } finally {
        l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  });
  const c = async (l, u) => {
    const f = ms(e, l, u);
    if (!f.enabled) {
      b("warning", f.reason || "Assignment action is unavailable.");
      return;
    }
    const g = {};
    if (u === "user") {
      const { select: h, assigneeID: v } = ga(e, ma(e, l), l);
      if (!v) {
        b("warning", "Assignee is required."), pa(h);
        return;
      }
      g.assignee_id = v;
    }
    o && (g.channel = o), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
    try {
      await se(f, g, { fetch: s.fetch }), b("success", u === "claim" ? "Assignment claimed." : "Assignment updated."), typeof window < "u" && window.location.reload();
    } catch (h) {
      b("error", h instanceof Error ? h.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
    }
  };
  return e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (u) => {
      u.preventDefault(), c(l, "self");
    }));
  }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (u) => {
      u.preventDefault(), c(l, "user");
    }));
  }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", (u) => {
      u.preventDefault(), c(l, "claim");
    }));
  }), e.querySelectorAll("[data-family-assignment-action]").forEach((l) => {
    l.dataset.translationAssignmentBound !== "true" && (l.dataset.translationAssignmentBound = "true", l.addEventListener("click", async (u) => {
      u.preventDefault();
      const f = ds(l, i);
      if (!f.enabled) {
        b("warning", f.reason || "Assignment action is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        await se(f, o ? { channel: o } : {}, { fetch: s.fetch }), b("success", f.label ? `${f.label} complete.` : "Assignment updated."), typeof window < "u" && window.location.reload();
      } catch (g) {
        b("error", g instanceof Error ? g.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  }), { status: "ready" };
}
async function V(e, a = {}) {
  if (!e) return null;
  da(e);
  const t = e.dataset || {}, s = n(a.endpoint || t.endpoint), i = {
    basePath: n(a.basePath || t.basePath || "/admin"),
    contentBasePath: n(a.contentBasePath || t.contentBasePath)
  };
  if (t.ssrEnhanced === "true") return fs(e, s, i, a);
  z(e, { status: "loading" }, i);
  const r = await oe(s, { fetch: a.fetch });
  z(e, r, i);
  const o = oa(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const l = `${L(i.basePath || "/admin")}/api`, u = ve({
        basePath: l,
        fetch: a.fetch
      });
      await K(e, l, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((g) => {
        g.dataset.translationCreateBound !== "true" && (g.dataset.translationCreateBound = "true", g.addEventListener("click", (h) => {
          h.preventDefault();
          const v = r.detail;
          if (!v) {
            b("error", "Translation family detail is unavailable.");
            return;
          }
          if (g.getAttribute("aria-disabled") === "true") {
            b("warning", v.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const C = n(g.dataset.locale).toLowerCase() || v.quickCreate.recommendedLocale || "", P = Qe(v, C);
          he({
            familyId: v.familyId,
            quickCreate: P,
            initialLocale: C,
            heading: `Create ${C.toUpperCase()} locale`,
            assigneeOptionsBasePath: l,
            fetch: a.fetch,
            onSubmit: (q) => u.createLocale(v.familyId, {
              ...q,
              channel: o
            }),
            onSuccess: async (q) => {
              b("success", `${q.locale.toUpperCase()} locale created.`), await V(e, {
                ...a,
                ...i,
                endpoint: s
              });
            }
          });
        }));
      });
      const f = async (g, h) => {
        const v = r.detail;
        if (!v) {
          b("error", "Translation family detail is unavailable.");
          return;
        }
        const C = ma(e, g), P = C ? v.localeAssignments[C] : null;
        if (!P) {
          b("error", "Assignment action metadata is unavailable.");
          return;
        }
        const q = es(P, h);
        if (!q.enabled) {
          b("warning", q.reason || "Assignment action is unavailable.");
          return;
        }
        const E = {};
        if (h === "user") {
          const { select: F, assigneeID: xe } = ga(e, C, g);
          if (!xe) {
            b("warning", "Assignee is required."), pa(F);
            return;
          }
          E.assignee_id = xe;
        }
        o && (E.channel = o), g.disabled = !0, g.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await se(q, E, { fetch: a.fetch }), b("success", h === "claim" ? "Assignment claimed." : "Assignment updated."), await V(e, {
            ...a,
            ...i,
            endpoint: s
          });
        } catch (F) {
          b("error", F instanceof Error ? F.message : "Failed to update assignment."), g.disabled = !1, g.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      U(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        U(e);
      }), e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((g) => {
        g.addEventListener("click", (h) => {
          h.preventDefault(), f(g, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((g) => {
        g.addEventListener("click", (h) => {
          h.preventDefault(), f(g, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((g) => {
        g.addEventListener("click", (h) => {
          h.preventDefault(), f(g, "claim");
        });
      });
    }
    const d = () => {
      const l = e.querySelector(".ui-state-retry-btn");
      l && l.addEventListener("click", () => {
        V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      });
    };
    d();
    const c = e.querySelector('[data-family-sync-action="true"]');
    c && r.syncRecovery?.canSync && c.addEventListener("click", async (l) => {
      l.preventDefault(), c.disabled = !0, c.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const u = r.syncRecovery;
        if (!u) return;
        await Pa(u, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const f = await oe(s, { fetch: a.fetch });
        if (f.status === "error" && (f.errorCode === "NOT_FOUND" || f.statusCode === 404)) {
          z(e, {
            ...f,
            syncRecovery: u,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, i), d();
          return;
        }
        if (f.status !== "ready") {
          const g = f.message || "Sync completed, but family detail reload failed.";
          z(e, {
            ...f,
            syncRecovery: u,
            syncStatus: "failed",
            syncMessage: g
          }, i), d(), b("error", g);
          return;
        }
        b("success", "Translation families synced."), await V(e, {
          ...a,
          ...i,
          endpoint: s
        });
      } catch (u) {
        const f = u instanceof Error ? u.message : "Failed to sync translation families.", g = e.querySelector('[data-family-sync-feedback="true"]');
        g && (g.hidden = !1, g.textContent = f), c.disabled = !1, c.classList.remove("opacity-60", "cursor-not-allowed"), b("error", f);
      }
    });
  }
  return r;
}
function ve(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = L(e.basePath || "/admin/api");
  async function s(i) {
    return le(i);
  }
  return {
    async list(i = {}) {
      return Ve(await s(await a(Oe(t, i), { headers: { Accept: "application/json" } })));
    },
    async detail(i, r = "") {
      return Ge(await s(await a(Ea(t, i, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(i, r = {}) {
      const o = ja({
        ...r,
        familyId: i,
        basePath: t
      }), d = {
        method: "POST",
        credentials: "same-origin",
        headers: new Headers(o.headers),
        body: JSON.stringify(Ua(o.request))
      }, c = await G(a, o.endpoint, d);
      if (!c.ok) throw await at(c);
      return Oa(await s(c));
    },
    async createAssignment(i, r = {}) {
      const o = ze(r), d = Da(t, i, o.channel), c = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && c.set("X-Idempotency-Key", o.idempotencyKey);
      const l = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(Ba(o))
      }, u = await G(a, d, l);
      if (!u.ok) throw await me(u);
      return s(u);
    }
  };
}
export {
  Ss as applyCreateLocaleToFamilyDetail,
  ks as applyCreateLocaleToSummaryState,
  da as bindCopyIdAffordance,
  Fa as buildCreateLocaleURL,
  _t as buildFamilyActivityPreview,
  Da as buildFamilyAssignmentURL,
  Ft as buildFamilyDetailUIURL,
  Ea as buildFamilyDetailURL,
  Et as buildFamilyListBrowserSearch,
  Ne as buildFamilyListQuery,
  Oe as buildFamilyListURL,
  Ut as buildFamilyMatrixURL,
  Dt as buildFamilyQueueURL,
  qa as buildTranslationFamilySyncRPCRequest,
  J as createFamilyFilters,
  ja as createTranslationCreateLocaleActionModel,
  je as createTranslationCreateLocaleRequest,
  ze as createTranslationFamilyAssignmentRequest,
  ve as createTranslationFamilyClient,
  Pa as dispatchTranslationFamilySync,
  oe as fetchTranslationFamilyDetailState,
  Ht as fetchTranslationFamilyListState,
  et as getReadinessChip,
  V as initTranslationFamilyDetailPage,
  Ts as initTranslationFamilyListPage,
  qs as initTranslationSummaryCards,
  Oa as normalizeCreateLocaleResult,
  Ge as normalizeFamilyDetail,
  Ve as normalizeFamilyListResponse,
  za as normalizeFamilyListRow,
  de as normalizeQuickCreateHints,
  Ta as normalizeTranslationFamilySyncRecoveryCapability,
  Pt as parseFamilyListFiltersFromSearchParams,
  qe as readFamilyListFiltersFromLocation,
  ue as renderReadinessChip,
  z as renderTranslationFamilyDetailPage,
  It as renderTranslationFamilyDetailState,
  Pe as renderTranslationFamilyListPage,
  Vt as renderTranslationFamilyListState,
  Ua as serializeCreateLocaleRequest,
  Ba as serializeFamilyAssignmentRequest,
  Wt as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map