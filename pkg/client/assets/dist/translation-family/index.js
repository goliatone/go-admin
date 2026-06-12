import { escapeAttribute as y, escapeHTML as m } from "../shared/html.js";
import { appendCSRFHeader as W, httpRequest as J, readHTTPJSON as ue } from "../shared/transport/http-client.js";
import { extractStructuredError as j } from "../toast/error-helpers.js";
import "../chunks/status-vocabulary-HmIBabRF.js";
import { buildURL as F, getNumberSearchParam as Ce, getStringSearchParam as E, readLocationSearchParams as Ne, setNumberSearchParam as Ae, setSearchParam as I } from "../shared/query-state/url-state.js";
import { initActionMenus as va } from "../shared/action-menu.js";
import { trimTrailingSlash as C } from "../shared/path-normalization.js";
import { parseJSONValue as Se } from "../shared/json-parse.js";
import { asLooseBoolean as w, asNumberish as L, asRecord as p, asString as i, asStringArray as _ } from "../shared/coercion.js";
import { A as Me, C as N, D as xa, E as _a, F as wa, O as Oe, P as La, R as $a, T as Ca, et as Aa, k as je, mt as Sa, tt as ka, ut as X, v as Ta, x as R, y as U } from "../chunks/translation-shared-Ba5eIyeA.js";
import { formatTranslationTimestampUTC as me, sentenceCaseToken as T } from "../translation-shared/formatters.js";
import { normalizeStringRecord as qa } from "../shared/record-normalization.js";
import { initEnhancedActions as Ia } from "../shared/enhanced-action.js";
var ke = /* @__PURE__ */ new WeakMap();
function Ra(e, a = {}) {
  const t = p(e), s = w(t.can_sync ?? t.canSync), n = i(t.family_id ?? t.familyId ?? a.familyId), r = i((t.command_name ?? t.commandName ?? a.commandName) || "translation.families.sync"), o = i(t.rpc_invoke_path ?? t.rpcInvokePath ?? a.rpcInvokePath), d = i((t.environment ?? t.channel ?? a.environment) || "default");
  return !s || !n || !r || !o ? null : {
    canSync: s,
    permission: i((t.permission ?? a.permission) || "admin.translations.sync"),
    commandName: r,
    rpcInvokePath: o,
    environment: d,
    familyId: n
  };
}
function Pa(e, a = "") {
  const t = i(a), s = Ea(e);
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
function Ea(e) {
  return [
    e.commandName || "translation.families.sync",
    e.environment || "default",
    e.familyId || "all"
  ].map((a) => encodeURIComponent(i(a).trim() || "default")).join(":");
}
function Fa(e, a) {
  const t = p(e);
  return Object.keys(t).length === 0 || !w(t.accepted ?? t.Accepted) || i(t.command_id ?? t.commandId ?? t.CommandID ?? t.command_name ?? t.commandName) !== a ? null : t;
}
async function Ua(e, a = {}) {
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
    body: JSON.stringify(Pa(e, a.correlationId))
  };
  W(e.rpcInvokePath, n, s);
  const r = await t(e.rpcInvokePath, n);
  if (!r.ok) {
    const u = await j(r);
    throw new Error(u.message || "Failed to sync translation families.");
  }
  const o = p(await r.json().catch(() => ({}))), d = p(o.error);
  if (Object.keys(d).length > 0) throw new Error(i(d.message) || "Failed to sync translation families.");
  const c = p(o.data), l = Fa(c.receipt, e.commandName);
  if (!l) throw new Error("Translation family sync did not return a valid dispatch receipt.");
  return {
    ...c,
    receipt: l
  };
}
function Z(e) {
  return i(e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent"));
}
function M(e) {
  return i(e) === "ready" ? "ready" : "blocked";
}
function ze(e) {
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
function ee(e = {}) {
  const a = i(e.channel);
  return {
    contentType: i(e.contentType),
    readinessState: i(e.readinessState),
    blockerCode: i(e.blockerCode),
    missingLocale: i(e.missingLocale),
    page: Math.max(1, L(e.page, 1)),
    perPage: Math.max(1, L(e.perPage, 50)),
    channel: a
  };
}
function Ve(e = {}) {
  const a = ee(e), t = new URLSearchParams();
  return I(t, "content_type", a.contentType), I(t, "readiness_state", a.readinessState), I(t, "blocker_code", a.blockerCode), I(t, "missing_locale", a.missingLocale), I(t, "channel", a.channel), Ae(t, "page", a.page, { min: 1 }), Ae(t, "per_page", a.perPage, { min: 1 }), t;
}
function ae(e, a = "", t = "") {
  const s = C(e);
  return a ? `${s}/translations/families/${encodeURIComponent(i(a))}${t}` : `${s}/translations/families`;
}
function He(e, a = {}) {
  return F(ae(e), Ve(a));
}
function Da(e, a, t = "") {
  const s = new URLSearchParams();
  return I(s, "channel", t), F(ae(e, a), s);
}
function Ge(e = {}) {
  const a = i(e.channel);
  return {
    locale: i(e.locale).toLowerCase(),
    autoCreateAssignment: w(e.autoCreateAssignment),
    assigneeId: i(e.assigneeId),
    priority: i(e.priority).toLowerCase(),
    dueDate: i(e.dueDate),
    channel: a,
    idempotencyKey: i(e.idempotencyKey)
  };
}
function Ba(e, a, t = "") {
  const s = new URLSearchParams();
  return I(s, "channel", t), F(ae(e, a, "/variants"), s);
}
function Na(e = {}) {
  const a = Ge(e), t = { locale: a.locale };
  return a.autoCreateAssignment && (t.auto_create_assignment = !0, a.assigneeId && (t.assignee_id = a.assigneeId), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate)), a.channel && (t.channel = a.channel), t;
}
function Ke(e = {}) {
  return {
    targetLocale: i(e.targetLocale).toLowerCase(),
    assigneeId: i(e.assigneeId),
    openPool: w(e.openPool),
    priority: i(e.priority).toLowerCase(),
    dueDate: i(e.dueDate),
    workScope: i(e.workScope),
    channel: i(e.channel),
    idempotencyKey: i(e.idempotencyKey)
  };
}
function Ma(e, a, t = "") {
  const s = new URLSearchParams();
  return I(s, "channel", t), F(ae(e, a, "/assignments"), s);
}
function Oa(e = {}) {
  const a = Ke(e), t = { target_locale: a.targetLocale };
  return a.assigneeId && (t.assignee_id = a.assigneeId), a.openPool && (t.open_pool = !0), a.priority && (t.priority = a.priority), a.dueDate && (t.due_date = a.dueDate), a.workScope && (t.work_scope = a.workScope), a.channel && (t.channel = a.channel), t;
}
function ja(e) {
  return {
    assignmentId: i(e.assignment_id),
    status: i(e.status),
    targetLocale: i(e.target_locale),
    workScope: i(e.work_scope),
    assigneeId: i(e.assignee_id),
    priority: i(e.priority),
    dueDate: i(e.due_date),
    assignedAt: i(e.assigned_at)
  };
}
function za(e) {
  return {
    autoCreateAssignment: w(e.auto_create_assignment),
    workScope: i(e.work_scope),
    priority: i(e.priority) || "normal",
    assigneeId: i(e.assignee_id),
    dueDate: i(e.due_date)
  };
}
function fe(e, a = {}) {
  const t = p(e.default_assignment), s = _(e.missing_locales ?? a.missingLocales), n = _(e.required_for_publish ?? a.requiredForPublish), r = i(e.recommended_locale || a.recommendedLocale);
  return {
    enabled: typeof e.enabled == "boolean" ? w(e.enabled) : s.length > 0,
    missingLocales: s,
    recommendedLocale: r,
    requiredForPublish: n,
    defaultAssignment: za({
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
function Va(e) {
  const a = p(e.data), t = p(e.meta), s = p(t.family), n = p(t.refresh), r = p(a.navigation), o = fe(p(s.quick_create), { missingLocales: _(s.missing_locales) });
  return {
    variantId: i(a.variant_id),
    familyId: i(a.family_id) || i(s.family_id),
    locale: i(a.locale).toLowerCase(),
    status: i(a.status),
    recordId: i(a.record_id),
    contentType: i(a.content_type),
    assignment: a.assignment ? ja(p(a.assignment)) : null,
    idempotencyHit: w(t.idempotency_hit),
    assignmentReused: w(t.assignment_reused),
    family: {
      familyId: i(s.family_id),
      readinessState: M(s.readiness_state),
      missingRequiredLocaleCount: L(s.missing_required_locale_count),
      pendingReviewCount: L(s.pending_review_count),
      outdatedLocaleCount: L(s.outdated_locale_count),
      blockerCodes: _(s.blocker_codes),
      missingLocales: _(s.missing_locales),
      availableLocales: _(s.available_locales),
      quickCreate: o
    },
    refresh: {
      familyDetail: w(n.family_detail),
      familyList: w(n.family_list),
      contentSummary: w(n.content_summary)
    },
    navigation: {
      contentDetailURL: i(r.content_detail_url),
      contentEditURL: i(r.content_edit_url)
    }
  };
}
function Ha(e) {
  const a = i(e.familyId), t = Ge(e), s = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  return t.idempotencyKey && (s["X-Idempotency-Key"] = t.idempotencyKey), {
    familyId: a,
    endpoint: Ba(i(e.basePath) || "/admin/api", a, t.channel),
    headers: s,
    request: t
  };
}
function Ga(e) {
  const a = {};
  for (const [t, s] of Object.entries(p(e.blocker_labels))) {
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
    readinessState: M(e.readiness_state),
    missingRequiredLocaleCount: L(e.missing_required_locale_count),
    pendingReviewCount: L(e.pending_review_count),
    outdatedLocaleCount: L(e.outdated_locale_count),
    blockerCodes: _(e.blocker_codes).map(ze),
    blockerLabels: a,
    missingLocales: _(e.missing_locales),
    availableLocales: _(e.available_locales)
  };
}
function Ye(e) {
  const a = p(e.data), t = p(e.meta), s = Object.keys(a).length ? a : e, n = Object.keys(t).length ? t : e, r = s.items ?? s.families;
  return {
    items: (Array.isArray(r) ? r : []).map((o) => Ga(p(o))),
    total: L(n.total),
    page: L(n.page, 1),
    perPage: L(n.per_page, 50),
    channel: i(n.channel)
  };
}
function Te(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    locale: i(e.locale),
    status: i(e.status),
    isSource: w(e.is_source),
    sourceRecordId: i(e.source_record_id),
    sourceHashAtLastSync: i(e.source_hash_at_last_sync),
    fields: qa(e.fields, {
      omitBlankKeys: !0,
      omitEmptyValues: !0
    }),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    publishedAt: i(e.published_at)
  };
}
function Ka(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    blockerCode: ze(e.blocker_code),
    locale: i(e.locale),
    fieldPath: i(e.field_path),
    details: p(e.details)
  };
}
function H(e) {
  const a = p(e.link);
  return {
    enabled: w(e.enabled),
    permission: i(e.permission),
    endpoint: i(e.endpoint),
    href: i(e.href || a.href),
    label: i(e.label || a.label),
    reason: i(e.reason),
    reasonCode: i(e.reason_code ?? e.reasonCode),
    requiredFields: _(e.required_fields ?? e.requiredFields),
    payload: p(e.payload),
    assignmentId: i(e.assignment_id ?? e.assignmentId),
    expectedVersion: L(e.expected_version ?? e.expectedVersion)
  };
}
function te(e) {
  return {
    assignToMe: H(p(e.assign_to_me ?? e.assignToMe)),
    assignToUser: H(p(e.assign_to_user ?? e.assignToUser)),
    claim: H(p(e.claim)),
    openEditor: H(p(e.open_editor ?? e.openEditor))
  };
}
function We(e) {
  return {
    id: i(e.id),
    familyId: i(e.family_id),
    variantId: i(e.variant_id),
    targetRecordId: i(e.target_record_id),
    sourceLocale: i(e.source_locale),
    targetLocale: i(e.target_locale),
    workScope: i(e.work_scope),
    assignmentType: i(e.assignment_type),
    status: i(e.status) || i(e.queue_state),
    assigneeId: i(e.assignee_id),
    assigneeLabel: i(e.assignee_label),
    displayAssignee: i(e.display_assignee),
    assignerId: i(e.assigner_id ?? e.assignerId),
    displayAssigner: i(e.display_assigner ?? e.displayAssigner),
    reviewerId: i(e.reviewer_id),
    reviewerLabel: i(e.reviewer_label),
    priority: i(e.priority),
    dueDate: i(e.due_date),
    assignedAt: i(e.assigned_at ?? e.assignedAt),
    displayAssignedAt: i(e.display_assigned_at ?? e.displayAssignedAt),
    assignedAtLegacyFallback: w(e.assigned_at_legacy_fallback ?? e.assignedAtLegacyFallback),
    activitySentence: i(e.activity_sentence ?? e.activitySentence),
    dueState: i(e.due_state),
    rowVersion: L(e.row_version ?? e.version),
    createdAt: i(e.created_at),
    updatedAt: i(e.updated_at),
    links: Wa(p(e.links)),
    actions: te(p(e.actions))
  };
}
function Ya(e) {
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
function Wa(e) {
  return { editor: Ya(p(e.editor)) };
}
function Qa(e) {
  return {
    locale: i(e.locale).toLowerCase(),
    workScope: i(e.work_scope),
    state: i(e.state),
    assignment: e.assignment ? We(p(e.assignment)) : null,
    actions: te(p(e.actions))
  };
}
function Ja(e) {
  const a = {};
  for (const [t, s] of Object.entries(e)) {
    const n = i(t).toLowerCase();
    n && (a[n] = Qa(p(s)));
  }
  return a;
}
function Xa(e, a) {
  if (!a.length) return e;
  const t = { ...e };
  for (const s of a) {
    const n = i(s.targetLocale).toLowerCase();
    if (!n) continue;
    const r = i(s.workScope) || "localization", [o, d] = Za(t, sa(n, r), n, r), c = d ? { ...d } : {
      locale: n,
      workScope: r,
      state: "",
      assignment: null,
      actions: te({})
    };
    c.assignment || (c.assignment = s), (!c.state || c.state === "unassigned") && (c.state = at(s)), c.locale || (c.locale = n), c.workScope || (c.workScope = r), t[o] = c;
  }
  return t;
}
function Za(e, a, t, s) {
  if (e[a]) return [a, e[a]];
  const n = `${t}:`, r = i(s).toLowerCase() || "localization", o = et(r);
  for (const [d, c] of Object.entries(e))
    if (d.startsWith(n)) {
      if (o) return [d, c];
      if (!c.assignment && (i(c.workScope) || d.slice(n.length) || "localization").toLowerCase() === r)
        return [d, c];
    }
  return [a, null];
}
function et(e) {
  const a = i(e).toLowerCase();
  return !a || a === "__all__";
}
function at(e) {
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
function Qe(e) {
  const a = p(e.data), t = Object.keys(a).length ? a : e, s = t.source_variant ? Te(p(t.source_variant)) : null, n = Array.isArray(t.blockers) ? t.blockers.map((f) => Ka(p(f))) : [], r = Array.isArray(t.locale_variants) ? t.locale_variants.map((f) => Te(p(f))) : [], o = Array.isArray(t.active_assignments) ? t.active_assignments.map((f) => We(p(f))) : [], d = Xa(Ja(p(t.locale_assignments ?? t.localeAssignments)), o), c = p(t.publish_gate), l = p(t.readiness_summary), u = fe(p(t.quick_create), {
    missingLocales: _(l.missing_locales),
    recommendedLocale: i(l.recommended_locale),
    requiredForPublish: _(l.required_for_publish ?? l.required_locales)
  });
  return {
    familyId: i(t.family_id),
    contentType: i(t.content_type),
    sourceLocale: i(t.source_locale),
    readinessState: M(t.readiness_state),
    sourceVariant: s,
    localeVariants: r,
    blockers: n,
    activeAssignments: o,
    localeAssignments: d,
    publishGate: {
      allowed: w(c.allowed),
      overrideAllowed: w(c.override_allowed),
      blockedBy: _(c.blocked_by),
      reviewRequired: w(c.review_required)
    },
    readinessSummary: {
      state: M(l.state),
      requiredLocales: _(l.required_locales),
      missingLocales: _(l.missing_locales),
      availableLocales: _(l.available_locales),
      blockerCodes: _(l.blocker_codes),
      missingRequiredLocaleCount: L(l.missing_required_locale_count),
      pendingReviewCount: L(l.pending_review_count),
      outdatedLocaleCount: L(l.outdated_locale_count),
      publishReady: w(l.publish_ready)
    },
    quickCreate: u
  };
}
function O(...e) {
  const a = /* @__PURE__ */ new Set();
  for (const t of e) for (const s of t) {
    const n = i(s).toLowerCase();
    n && a.add(n);
  }
  return Array.from(a).sort();
}
function Je(e, a) {
  const t = i(a).toLowerCase();
  return e.map((s) => i(s).toLowerCase()).filter((s) => s && s !== t);
}
function ge(e) {
  return O(e.quickCreate.missingLocales, e.readinessSummary.missingLocales);
}
function tt(e) {
  return e.blockers.some(he);
}
function ye(e, a) {
  const t = i(a).toLowerCase();
  return !t || tt(e) ? !1 : ge(e).includes(t);
}
function Xe(e, a) {
  const t = ge(e), s = i(a).toLowerCase(), n = ye(e, s);
  return {
    ...e.quickCreate,
    enabled: n,
    missingLocales: t,
    recommendedLocale: t.includes(s) ? s : e.quickCreate.recommendedLocale,
    disabledReason: n ? "" : e.quickCreate.disabledReason,
    disabledReasonCode: n ? "" : e.quickCreate.disabledReasonCode
  };
}
function ks(e, a) {
  if (!e || !a || !a.familyId || e.familyId !== a.familyId) return e;
  const t = i(a.locale).toLowerCase(), s = e.localeVariants.some((c) => c.locale === t) ? e.localeVariants.map((c) => c.locale === t ? {
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
  let n = e.activeAssignments.map((c) => ({ ...c }));
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
      actions: te({})
    }, l = n.findIndex((u) => u.id === c.id || u.targetLocale === c.targetLocale);
    l >= 0 ? n[l] = c : n = [...n, c].sort((u, f) => u.targetLocale.localeCompare(f.targetLocale));
  }
  const r = e.blockers.map((c) => ({ ...c })).filter((c) => !(c.blockerCode === "missing_locale" && c.locale === t)), o = O(e.readinessSummary.availableLocales, a.family.availableLocales, [t]), d = Je(O(e.readinessSummary.missingLocales, a.family.missingLocales), t);
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
function Ts(e, a) {
  const t = { ...e }, s = { ...p(t.translation_readiness) }, n = i(a.locale).toLowerCase(), r = i(t.requested_locale).toLowerCase(), o = i(t.translation_family_id || t.family_id || s.family_id || s.family_id);
  if (o && o !== a.familyId) return t;
  const d = O(_(t.available_locales), _(s.available_locales), a.family.availableLocales, [n]), c = Je(O(_(t.missing_required_locales), _(s.missing_required_locales), a.family.missingLocales), n);
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
  }, t.translation_readiness = s, r && r === n && (t.missing_requested_locale = !1, t.fallback_used = !1, t.resolved_locale = n), t;
}
function st(e) {
  const a = M(e);
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
function pe(e) {
  const a = st(e);
  return `<span class="translation-family-chip translation-family-chip--${a.tone}" data-readiness-state="${a.state}">${a.label.toUpperCase()}</span>`;
}
async function nt(e) {
  const a = await j(e), t = new Error(a.message || "Failed to create locale.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = i(e.headers.get("x-request-id")), t.traceId = Z(e.headers), t.metadata = p(a.metadata), t;
}
async function be(e) {
  const a = await j(e), t = new Error(a.message || "Failed to update assignment.");
  return t.statusCode = e.status, t.textCode = a.textCode, t.requestId = i(e.headers.get("x-request-id")), t.traceId = Z(e.headers), t.metadata = p(a.metadata), t;
}
async function re(e, a = {}, t = {}) {
  const s = i(e.endpoint);
  if (!s) throw new Error("Assignment action endpoint is unavailable.");
  const n = {
    ...e.payload,
    ...a
  };
  e.expectedVersion > 0 && n.expected_version == null && n.expectedVersion == null && (n.expected_version = e.expectedVersion);
  const r = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json"
  }), o = {
    method: "POST",
    credentials: "same-origin",
    headers: r,
    body: JSON.stringify(n)
  };
  W(s, o, r);
  const d = await (t.fetch ? t.fetch(s, o) : J(s, o));
  if (!d.ok) throw await be(d);
  return ue(d);
}
function it(e) {
  const a = p(e), t = i(a.value || a.id || a.user_id);
  if (!t) return null;
  const s = i(a.label || a.display_name || a.username || a.email || t);
  return {
    value: t,
    label: s,
    description: i(a.description || a.email || a.username),
    displayName: i(a.display_name || a.displayName || s),
    avatarURL: i(a.avatar_url || a.avatarURL)
  };
}
function rt(e) {
  const a = p(e), t = Array.isArray(e) ? e : Array.isArray(a.data) ? a.data : Array.isArray(a.options) ? a.options : Array.isArray(a.items) ? a.items : [], s = /* @__PURE__ */ new Set(), n = [];
  for (const r of t) {
    const o = it(r);
    !o || s.has(o.value) || (s.add(o.value), n.push(o));
  }
  return n;
}
function ot(e, a = []) {
  const t = new URLSearchParams();
  t.set("per_page", "200");
  const s = a.map((n) => i(n)).find(Boolean);
  return s && t.set("assignee_id", s), F(`${C(e || "/admin/api")}/translations/options/assignees`, t);
}
async function lt(e, a = [], t = {}) {
  const s = ot(e, a), n = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : J(s, { headers: { Accept: "application/json" } }));
  if (!n.ok) throw await be(n);
  return rt(await ue(n));
}
function ct(e) {
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
function dt(e) {
  return X(ct(e));
}
function ut(e) {
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
function Ze(e) {
  return X(ut(e));
}
function mt(e) {
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
function ea(e) {
  return X(mt(e));
}
function k(e, a) {
  return i(e[a]);
}
function he(e) {
  if (e.blockerCode !== "policy_denied") return !1;
  const a = k(e.details, "reason").toLowerCase(), t = k(e.details, "reason_code").toLowerCase();
  if (a === "policy_unavailable" || t === "policy_unavailable") return !0;
  if (a === "host_policy" || t === "host_policy") return !1;
  const s = !!(k(e.details, "content_type") || k(e.details, "environment")), n = !!(k(e.details, "message") || k(e.details, "policy_reason"));
  return s && !a && !n;
}
function ft(e) {
  return he(e) ? "Policy unavailable" : T(e.blockerCode);
}
function gt(e) {
  const a = e.details || {}, t = [
    ["Code", e.blockerCode],
    ["Locale", e.locale.toUpperCase()],
    ["Field", e.fieldPath],
    ["Content type", k(a, "content_type")],
    ["Environment", k(a, "environment")]
  ], s = k(a, "reason"), n = k(a, "message"), r = k(a, "remediation");
  return he(e) ? t.push(["Reason", "Policy unavailable"]) : s && t.push(["Reason", s]), n && n !== s && t.push(["Message", n]), r && t.push(["Remediation", r]), t.filter(([, o]) => o.trim() !== "");
}
function yt(e) {
  const a = gt(e);
  return a.length ? `
    <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-[7rem_minmax(0,1fr)]">
      ${a.map(([t, s]) => `
          <dt class="font-medium text-gray-500">${m(t)}</dt>
          <dd class="min-w-0 break-words text-gray-700">${m(s)}</dd>
        `).join("")}
    </dl>
  ` : "";
}
function pt(e) {
  switch (e) {
    case "overdue":
      return "error";
    case "due_soon":
      return "warning";
    default:
      return "neutral";
  }
}
function aa(e) {
  return X(pt(e));
}
function bt(e, a, t) {
  const s = C(e), n = i(t.sourceRecordId);
  return !s || !n || !a.contentType ? "" : `${s}/${encodeURIComponent(a.contentType)}/${encodeURIComponent(n)}?locale=${encodeURIComponent(t.locale)}`;
}
function ta(e) {
  const a = i(e);
  if (!a) return "none";
  const t = new Date(a);
  if (Number.isNaN(t.getTime())) return "none";
  const s = t.getTime() - Date.now();
  return s < 0 ? "overdue" : s <= 2880 * 60 * 1e3 ? "due_soon" : "on_track";
}
function sa(e, a = "") {
  return `${i(e).toLowerCase()}:${i(a) || "__all__"}`;
}
function ht(e, a) {
  const t = i(a).toLowerCase();
  return t ? Object.entries(e.localeAssignments).filter(([s, n]) => (i(n.locale).toLowerCase() || s.split(":")[0]) === t).sort(([s, n], [r, o]) => {
    const d = qe(n), c = qe(o);
    if (d !== c) return d - c;
    const l = i(n.workScope).toLowerCase(), u = i(o.workScope).toLowerCase();
    return l !== u ? l.localeCompare(u) : s.localeCompare(r);
  }) : [];
}
function qe(e) {
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
function na(e) {
  return e && (e.displayAssignee || e.assigneeLabel || e.assigneeId) || "Unassigned";
}
function ia(e) {
  if (!e) return "";
  const a = e.actions;
  return a.assignToMe.reason || a.assignToUser.reason || a.claim.reason || a.openEditor.reason || "";
}
function vt(e) {
  if (!e) return !1;
  const a = e.actions;
  return a.assignToMe.enabled || a.assignToUser.enabled || a.claim.enabled || a.openEditor.enabled;
}
function Ie(e) {
  if (!e || e.state === "source_locale") return "";
  const a = e.assignment;
  if (!a) return `<p class="mt-1 text-xs text-gray-500" data-family-locale-assignment-state="${y(e.state)}">No active assignment.</p>`;
  const t = a.dueState || ta(a.dueDate), s = t === "none" ? "No due date" : T(t), n = e.state === "assigned_to_me" ? "me" : na(a);
  return `
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500" data-family-locale-assignment-state="${y(e.state)}">
      <span class="rounded-full px-2 py-0.5 font-medium ${Ze(a.status)}">${m(T(a.status))}</span>
      <span>${m(n)}</span>
      <span class="text-gray-300">·</span>
      <span>Priority ${m(a.priority || "normal")}</span>
      <span class="rounded-full px-2 py-0.5 font-medium ${aa(t)}">${m(s)}</span>
    </div>
  `;
}
function Re(e) {
  if (!e || e.state === "source_locale") return "";
  const a = sa(e.locale, e.workScope), t = e.actions, s = [];
  if (t.assignToMe.enabled ? s.push(`
      <button type="button" class="${R}" data-family-assign-to-me="true" data-locale-assignment-key="${y(a)}">
        Assign to me
      </button>
    `) : t.assignToMe.reasonCode === "already_assigned" && s.push(`
      <button
        type="button"
        class="${R}${le(!1)}"
        disabled
        aria-disabled="true"
        title="${y(t.assignToMe.reason || "Assignment already belongs to you")}"
      >
        Assign to me
      </button>
    `), t.assignToUser.enabled && s.push(`
      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:min-w-[22rem] sm:flex-nowrap">
        ${ve({
    key: a,
    ariaLabel: "Assignee",
    className: `${oa} min-w-0 flex-1 sm:w-80 sm:flex-none lg:w-96`
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
      >${m(t.openEditor.label || "Open editor")}</a>
    `), s.length > 0) return `<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end" data-family-locale-actions="true">${s.join("")}</div>`;
  const n = ia(e);
  return n ? `<p class="max-w-xs text-right text-xs text-gray-500" data-family-assignment-action-reason="${y(a)}">${m(n)}</p>` : "";
}
function xt(e) {
  return Object.entries(e.localeAssignments).filter(([, a]) => a.state !== "source_locale").filter(([, a]) => vt(a)).sort(([a], [t]) => a.localeCompare(t));
}
function _t(e) {
  return [
    `data-assign-to-me-enabled="${e.actions.assignToMe.enabled ? "true" : "false"}"`,
    `data-assign-to-me-reason="${y(e.actions.assignToMe.reason)}"`,
    `data-assign-to-user-enabled="${e.actions.assignToUser.enabled ? "true" : "false"}"`,
    `data-assign-to-user-reason="${y(e.actions.assignToUser.reason)}"`
  ].join(" ");
}
function oe(e, a = "") {
  return e ? "" : ` disabled aria-disabled="true" title="${y(a || "Assignment action is unavailable.")}"`;
}
function le(e) {
  return e ? "" : " opacity-60 cursor-not-allowed";
}
var ra = "block h-12 w-full rounded-lg border border-gray-300 bg-white px-3 pr-9 text-sm text-gray-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-slate-900 dark:text-gray-400 dark:focus:ring-gray-600", oa = ra, wt = "/api/translations/options/assignees?per_page=200";
function ve(e) {
  const a = i(e.key), t = i(e.initialValue), s = e.enabled !== !1, n = i(e.placeholder) || "Select assignee", r = i(e.reason), o = i(e.name), d = oe(s, r);
  return `
    <select
      ${o ? `name="${y(o)}"` : ""}
      class="${y(e.className || oa)}"
      data-family-assignee-select="${y(a)}"
      data-initial-assignee-id="${y(t)}"
      data-formgen-managed="true"
      data-formgen-relationship="true"
      data-endpoint-url="${wt}"
      data-endpoint-method="GET"
      data-endpoint-renderer="typeahead"
      data-endpoint-search-param="q"
      data-endpoint-value-field="value"
      data-endpoint-label-field="label"
      data-endpoint-placeholder="${y(n)}"
      data-endpoint-search-placeholder="Search assignees"
      data-relationship-type="belongsTo"
      data-relationship-target="#/components/schemas/User"
      data-relationship-cardinality="one"
      ${t ? `data-relationship-current="${y(t)}"` : ""}
      aria-label="${y(e.ariaLabel || "Assignee")}"
      ${d}
    >
      <option value="">${m(s ? n : r || n)}</option>
      ${t ? `<option value="${y(t)}" selected>${m(t)}</option>` : ""}
    </select>
  `;
}
function Lt(e, a = 5) {
  const t = [];
  for (const s of e.localeVariants)
    s.createdAt && t.push({
      id: `variant-created-${s.id}`,
      timestamp: s.createdAt,
      title: `${s.locale.toUpperCase()} variant created`,
      detail: s.isSource ? "Source locale registered for this family." : `Variant entered ${T(s.status)} state.`,
      tone: s.isSource ? "neutral" : "success"
    }), s.publishedAt && t.push({
      id: `variant-published-${s.id}`,
      timestamp: s.publishedAt,
      title: `${s.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const s of e.activeAssignments) {
    const n = s.assignedAt || s.updatedAt || s.createdAt;
    if (!n) continue;
    const r = Ct(s);
    t.push({
      id: `assignment-${s.id}`,
      timestamp: n,
      title: r || `${s.targetLocale.toUpperCase()} assignment ${T(s.status)}`,
      detail: r ? `Priority ${s.priority || "normal"}.` : `${$t(s)} Priority ${s.priority || "normal"}.`,
      tone: s.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return t.sort((s, n) => n.timestamp.localeCompare(s.timestamp)).slice(0, Math.max(1, a));
}
function $t(e) {
  return e.assigneeId ? `Assigned to ${e.displayAssignee || e.assigneeLabel || e.assigneeId}.` : "Currently unassigned.";
}
function Ct(e) {
  if (e.activitySentence) return e.activitySentence;
  const a = e.displayAssigner || Pe(e.assignerId, "System"), t = (e.targetLocale || "").toUpperCase(), s = e.displayAssignee || e.assigneeLabel || Pe(e.assigneeId, "Unassigned");
  if (!a || !t || !s) return "";
  const n = e.displayAssignedAt || At(e.assignedAt);
  return n ? e.assignedAtLegacyFallback ? `${a} assigned ${t} to ${s}; created ${n}` : `${a} assigned ${t} to ${s} on ${n}` : `${a} assigned ${t} to ${s}`;
}
function Pe(e, a) {
  const t = i(e);
  return !t || t === "__me__" || t === "__missing_actor__" ? a : t.length > 12 ? `${t.slice(0, 8)}...` : t;
}
function At(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? a : new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(t);
}
function St(e) {
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
function kt(e, a) {
  const t = C(a.contentBasePath || `${C(a.basePath || "/admin")}/content`), s = e.readinessSummary.missingLocales, n = e.quickCreate.disabledReason || "Locale creation is unavailable for this family.", r = /* @__PURE__ */ new Set(), o = /* @__PURE__ */ new Set(), d = (u) => {
    const f = !ye(e, u);
    return `
      <button
        type="button"
        class="${U}${f ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${y(u)}"
        ${f ? 'aria-disabled="true"' : ""}
        title="${y(f ? n : `Create ${u.toUpperCase()} locale`)}"
      >
        Create locale
      </button>
    `;
  }, c = (u, f) => {
    const g = u.locale || f.split(":")[0] || "", b = u.workScope || f.split(":")[1] || "__all__", v = `${e.contentType || "translation"} ${g.toUpperCase()}`;
    return `
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start" data-family-locale-assignment-key="${y(f)}">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(g.toUpperCase())}</span>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">${m(b)}</span>
            <span class="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">Assignment</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(v)}</p>
          <p class="mt-1 text-xs text-gray-500">Additional work scope</p>
          ${Ie(u)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${Re(u)}
        </div>
      </li>
    `;
  }, l = e.localeVariants.flatMap((u) => {
    const f = i(u.locale).toLowerCase();
    f && o.add(f);
    const g = bt(t, e, u), b = ht(e, u.locale), [v, $] = b[0] || ["", null];
    v && r.add(v);
    const S = g ? `<a href="${y(g)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-gray-400">No content route</span>', A = u.fields.title || u.fields.slug || `${e.contentType} ${u.locale.toUpperCase()}`;
    return [`
      <li class="grid gap-4 rounded-xl border border-gray-200 bg-white p-6 lg:grid-cols-[minmax(18rem,1fr)_minmax(0,44rem)] lg:items-start">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-gray-900">${m(u.locale.toUpperCase())}</span>
            ${u.isSource ? '<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${dt(u.status)}">${m(T(u.status))}</span>
          </div>
          <p class="mt-2 text-sm text-gray-600">${m(A)}</p>
          <p class="mt-1 text-xs text-gray-500">Updated ${m(me(u.updatedAt || u.createdAt)) || "n/a"}</p>
          ${Ie($)}
        </div>
        <div class="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          ${Re($)}
          ${S}
        </div>
      </li>
    `, ...b.slice(1).map(([P, x]) => (r.add(P), c(x, P)))];
  });
  for (const [u, f] of Object.entries(e.localeAssignments).sort(([g], [b]) => g.localeCompare(b))) {
    if (r.has(u) || f.state === "source_locale") continue;
    l.push(c(f, u)), r.add(u);
    const g = i(f.locale).toLowerCase() || u.split(":")[0];
    g && o.add(g);
  }
  for (const u of s) {
    const f = i(u).toLowerCase();
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
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-locales">
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
function Tt(e) {
  if (!e.activeAssignments.length) {
    const a = xt(e), t = a[0]?.[1] || null, s = a.some(([, r]) => r.actions.assignToMe.enabled), n = a.some(([, r]) => r.actions.assignToUser.enabled);
    return `
      <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
        <p class="mt-1 text-sm text-gray-500">No active assignments are attached to this family.</p>
        ${a.length ? `
        <div class="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4" data-family-empty-assignment-controls="true">
          <div class="grid gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(10rem,0.8fr)_minmax(16rem,1fr)_auto_auto] 2xl:items-end">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Locale</span>
              <select class="${ra}" data-family-assignment-locale-select="true">
                ${a.map(([r, o]) => `
                  <option value="${y(r)}" ${_t(o)}>${m(o.locale.toUpperCase())} · ${m(o.workScope || "__all__")}</option>
                `).join("")}
              </select>
            </label>
            ${n ? `
              <label class="grid gap-2">
                <span class="text-sm font-medium text-gray-900">Assignee</span>
                ${ve({
      key: "__empty_panel__",
      enabled: !!t?.actions.assignToUser.enabled,
      reason: t?.actions.assignToUser.reason,
      ariaLabel: "Assignee"
    })}
              </label>
            ` : "<div></div>"}
            ${s ? `
              <button type="button" class="${R} w-full 2xl:w-auto${le(!!t?.actions.assignToMe.enabled)}" data-family-assign-to-me="true" data-locale-assignment-source="empty-panel"${oe(!!t?.actions.assignToMe.enabled, t?.actions.assignToMe.reason)}>
                Assign to me
              </button>
            ` : "<div></div>"}
            ${n ? `
              <button type="button" class="${U} w-full 2xl:w-auto${le(!!t?.actions.assignToUser.enabled)}" data-family-assign-to-user="true" data-locale-assignment-source="empty-panel"${oe(!!t?.actions.assignToUser.enabled, t?.actions.assignToUser.reason)}>
                Assign
              </button>
            ` : "<div></div>"}
          </div>
        </div>
      ` : `<p class="mt-4 text-sm text-gray-500" data-family-assignment-action-reason="empty">${m(ia(Object.values(e.localeAssignments).find((r) => r.state !== "source_locale") || null) || "No assignable locale is available for this family.")}</p>`}
      </section>
    `;
  }
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-gray-900">Assignments</h2>
      <p class="mt-1 text-sm text-gray-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((a) => {
    const t = ta(a.dueDate), s = t === "none" ? "No due date" : T(t), n = a.links.editor;
    return `
              <li class="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-gray-900">${m(a.targetLocale.toUpperCase())}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${Ze(a.status)}">${m(T(a.status))}</span>
                    <span class="rounded-full px-2 py-0.5 text-xs font-medium ${aa(t)}">${m(s)}</span>
                  </div>
                  <p class="mt-2 text-sm text-gray-600">
                    ${m(na(a))}
                    <span class="text-gray-400">·</span>
                    Priority ${m(a.priority || "normal")}
                  </p>
                  <p class="mt-1 text-xs text-gray-500">Updated ${m(me(a.updatedAt || a.createdAt)) || "n/a"}</p>
                </div>
                ${n ? `
                  <a
                    class="inline-flex flex-shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-sky-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
                    data-family-assignment-editor-link="${y(a.id)}"
                    href="${y(n.href)}"
                    title="${y(n.description || n.label)}"
                  >${m(n.label || "Open editor")}</a>
                ` : ""}
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  `;
}
function qt(e) {
  const a = e.blockers.length ? e.blockers.map((t) => {
    const s = [t.locale && t.locale.toUpperCase(), t.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="rounded-lg border border-gray-200 bg-white p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium ${ea(t.blockerCode)}">${m(ft(t))}</span>
                ${s ? `<span class="text-sm text-gray-600">${m(s)}</span>` : ""}
              </div>
              ${yt(t)}
            </li>
          `;
  }).join("") : '<li class="text-sm text-gray-500">No blockers recorded.</li>';
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-gray-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-6">
        <div class="flex flex-wrap items-center gap-3">
          ${pe(e.readinessState)}
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
function It(e) {
  const a = Lt(e);
  return `
    <section class="${N} p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-gray-900">Activity preview</h2>
      <p class="mt-1 text-sm text-gray-500">Recent server timestamps across variants and active assignments.</p>
      ${a.length ? `<ol class="mt-5 space-y-3" role="list">
              ${a.map((t) => `
                    <li class="rounded-xl border border-gray-200 bg-gray-50 p-6">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-gray-900">${m(t.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === "success" ? "bg-emerald-100 text-emerald-700" : t.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}">${m(me(t.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-gray-600">${m(t.detail)}</p>
                    </li>
                  `).join("")}
            </ol>` : '<p class="mt-4 text-sm text-gray-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function Y(e) {
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
function la(e) {
  return `
    <div class="${$a}" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-gray-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-500"></span>
        <span class="text-sm">${m(e)}</span>
      </div>
    </div>
  `;
}
function ce(e, a) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md ${Ca} p-8 text-center shadow-sm">
        <h2 class="${xa}">${m(e)}</h2>
        <p class="${_a} mt-2">${m(a)}</p>
      </div>
    </div>
  `;
}
function Rt(e, a, t) {
  const s = t.syncRecovery, n = s?.canSync && t.syncStatus !== "completed" ? `
      <button
        type="button"
        class="mt-4 ${U}"
        data-family-sync-action="true"
        data-family-sync-rpc="${y(s.rpcInvokePath)}"
        data-family-sync-command="${y(s.commandName)}"
        data-family-sync-family-id="${y(s.familyId)}"
        data-family-sync-environment="${y(s.environment)}"
      >
        Sync translation families
      </button>
    ` : "", r = t.syncMessage ? m(t.syncMessage) : "";
  return `
    <div class="${Oe} p-6" role="alert">
      <h2 class="${Me}">${m(e)}</h2>
      <p class="${je} mt-2">${m(a)}</p>
      <p
        data-family-sync-feedback="true"
        class="mt-3 text-sm ${t.syncStatus === "failed" ? "text-rose-700" : "text-amber-700"}"
        ${r ? "" : "hidden"}
      >${r}</p>
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" class="ui-state-retry-btn ${R}">
          Reload family detail
        </button>
        ${n}
      </div>
    </div>
  `;
}
function Pt(e, a = {}) {
  if (e.status === "loading") return la("Loading translation family...");
  if (e.status === "empty") return `
      ${ce("Family detail unavailable", e.message || "This family detail view does not have a backing payload yet.")}
      ${Y(e)}
    `;
  if (e.status === "error" || e.status === "conflict") return `
      <div class="translation-family-detail-error">
        ${Rt(e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed."), e)}
        ${Y(e)}
      </div>
    `;
  const t = e.detail;
  if (!t) return ce("Family detail unavailable", "No family detail payload was returned.");
  const s = t.sourceVariant?.fields.title || t.sourceVariant?.fields.slug || `${t.contentType} family`, n = t.readinessSummary.blockerCodes.length ? t.readinessSummary.blockerCodes.map(T).join(", ") : "No blockers", r = ge(t), o = t.quickCreate.recommendedLocale || r[0] || "", d = !ye(t, o), c = o ? `
      <button
        type="button"
        class="${U}${d ? " opacity-60 cursor-not-allowed" : ""}"
        data-family-create-locale="true"
        data-locale="${y(o)}"
        ${d ? 'aria-disabled="true"' : ""}
        title="${y(d ? t.quickCreate.disabledReason || "Locale creation is unavailable." : `Create ${o.toUpperCase()} locale`)}"
      >
        Create ${m(o.toUpperCase())}
      </button>
    ` : "";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${y(t.familyId)}" data-readiness-state="${y(t.readinessState)}">
      <section class="rounded-[28px] border border-gray-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="${La}">Translation family</p>
            <h1 class="${wa} mt-2">${m(s)}</h1>
            <p class="mt-2 text-sm text-gray-600">${m(t.contentType)} · Source locale ${m(t.sourceLocale.toUpperCase())} · Family ${m(t.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${pe(t.readinessState)}
            <span class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">${m(n)}</span>
            ${c}
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${St(t)}
        </div>
        ${Y(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${kt(t, a)}
          ${Tt(t)}
        </div>
        <div class="space-y-6">
          ${qt(t)}
          ${It(t)}
        </div>
      </div>
    </div>
  `;
}
async function de(e, a = {}) {
  const t = i(e);
  if (!t) return {
    status: "empty",
    message: "The family detail route is missing its backing API endpoint."
  };
  try {
    const s = await (a.fetch ? a.fetch(t, { headers: { Accept: "application/json" } }) : J(t, { headers: { Accept: "application/json" } })), n = i(s.headers.get("x-request-id")), r = Z(s.headers);
    if (!s.ok) {
      const d = await j(s), c = p(d.metadata?.sync_recovery), l = d.textCode === "NOT_FOUND" || w(c.syncable);
      return {
        status: s.status === 409 ? "conflict" : "error",
        message: d.message,
        requestId: n,
        traceId: r,
        statusCode: s.status,
        errorCode: d.textCode,
        syncRecovery: l ? Ra(c, { familyId: i(d.metadata?.family_id) }) : null
      };
    }
    const o = Qe(p(await s.json()));
    return o.familyId ? {
      status: "ready",
      detail: o,
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
function ca(e) {
  const a = Ne(), t = a ? E(a, "channel") : "";
  if (t) return t;
  try {
    return E(new URL(i(e), "http://localhost").searchParams, "channel") || "";
  } catch {
    return "";
  }
}
function G(e, a, t = {}) {
  e.innerHTML = Pt(a, t);
}
var Et = [
  "channel",
  "content_type",
  "readiness_state",
  "blocker_code",
  "missing_locale",
  "page",
  "per_page"
];
function Ft(e) {
  const a = e ?? new URLSearchParams();
  return ee({
    channel: E(a, "channel") || "",
    contentType: E(a, "content_type") || "",
    readinessState: E(a, "readiness_state") || "",
    blockerCode: E(a, "blocker_code") || "",
    missingLocale: E(a, "missing_locale") || "",
    page: Ce(a, "page") || 1,
    perPage: Ce(a, "per_page") || 50
  });
}
function Ee(e = globalThis.location) {
  return Ft(Ne(e));
}
function Ut(e, a) {
  const t = new URLSearchParams(e ?? void 0);
  for (const s of Et) t.delete(s);
  return Ve(a).forEach((s, n) => t.set(n, s)), t.toString();
}
function da(e, a = "/admin") {
  const t = C(e);
  return t.endsWith("/translations/families") ? t.slice(0, -22) || "/" : `${C(a || "/admin")}/api`;
}
function xe(e = "/admin") {
  return `${C(e || "/admin")}/translations/families`;
}
function Dt(e, a, t = "") {
  const s = C(e || xe("/admin")), n = new URLSearchParams();
  return I(n, "channel", t), F(`${s}/${encodeURIComponent(i(a))}`, n);
}
function _e(e, a) {
  const t = i(e);
  if (!t) return "";
  const s = new URLSearchParams();
  for (const [n, r] of Object.entries(a)) I(s, n, r);
  return F(t, s);
}
function Bt(e, a, t = {}) {
  return _e(e, {
    family_id: a.familyId,
    channel: i(t.channel),
    content_type: a.contentType || i(t.contentType),
    readiness_state: a.readinessState || i(t.readinessState),
    blocker_code: i(t.blockerCode),
    missing_locale: i(t.missingLocale)
  });
}
function Nt(e, a, t = {}) {
  return _e(e, {
    family_id: a.familyId,
    channel: i(t.channel)
  });
}
function ua(e) {
  return e.sourceTitle || e.sourceRecordId || e.familyId || "Translation family";
}
function q(e, a, t) {
  return `<option value="${y(e)}" ${e === t ? "selected" : ""}>${m(a)}</option>`;
}
function Mt(e) {
  const a = String(e.perPage || 50);
  return `
    <form class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm" data-translation-filter-form="true">
      <div class="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
        <label class="block text-sm font-medium text-gray-700">
          <span>Channel</span>
          <input name="channel" value="${y(e.channel)}" class="mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-sky-500 focus:ring-sky-500" placeholder="default">
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
  ].map((t) => q(t, t, a)).join("")}
          </select>
        </label>
        <div class="flex items-end gap-2">
          <button type="submit" class="${U} w-full">Apply</button>
        </div>
      </div>
      <input type="hidden" name="page" value="${y(e.page)}">
    </form>
  `;
}
function Fe(e, a = "None") {
  return e.length ? `
    <span class="flex flex-wrap gap-1">
      ${e.map((t) => `<span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase text-gray-700">${m(t.toUpperCase())}</span>`).join("")}
    </span>
  ` : `<span class="text-gray-400">${m(a)}</span>`;
}
function Ot(e) {
  if (!e.blockerCodes.length) return '<span class="text-gray-400">No blockers</span>';
  const a = /* @__PURE__ */ new Set(), t = e.blockerCodes.map((s) => {
    const n = e.blockerLabels[s] || T(s);
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
  return t.map(({ code: s, label: n }) => `<span class="rounded-full px-2 py-0.5 text-xs font-medium ${ea(s)}">${m(n.toUpperCase())}</span>`).join(" ");
}
function ne(e, a, t = "text-gray-900") {
  return `
    <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-gray-50 px-2 py-1 text-xs">
      <span class="font-semibold ${t}">${m(e)}</span>
      <span class="font-semibold uppercase tracking-wide text-gray-500">${m(a.toUpperCase())}</span>
    </span>
  `;
}
function jt(e, a, t, s) {
  const n = ua(e);
  return `
    <div class="action-menu relative flex justify-end" data-action-menu data-row-id="${y(e.familyId)}">
      <button type="button"
              class="action-menu__trigger rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              data-action-menu-trigger
              aria-label="Actions for ${y(n)}"
              aria-haspopup="true"
              aria-expanded="false">
        <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>
      <div class="action-menu__content hidden absolute right-0 z-20 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
           data-action-menu-content
           role="menu"
           aria-orientation="vertical">
        <a class="action-menu__item flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
           data-action-menu-item
           data-action="open"
           role="menuitem"
           href="${y(a)}">
          <i class="iconoir-folder w-4 h-4 flex-shrink-0" aria-hidden="true"></i>
          <span>Open family</span>
        </a>
        ${t ? `<a class="action-menu__item flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none" data-action-menu-item data-action="matrix" role="menuitem" href="${y(t)}"><i class="iconoir-table-2-columns w-4 h-4 flex-shrink-0" aria-hidden="true"></i><span>Matrix</span></a>` : ""}
        ${s ? `<a class="action-menu__item flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none" data-action-menu-item data-action="queue" role="menuitem" href="${y(s)}"><i class="iconoir-list w-4 h-4 flex-shrink-0" aria-hidden="true"></i><span>Queue</span></a>` : ""}
      </div>
    </div>
  `;
}
function Ue(e, a) {
  return _e(e, {
    channel: i(a.channel),
    content_type: i(a.contentType),
    readiness_state: i(a.readinessState),
    blocker_code: i(a.blockerCode),
    missing_locale: i(a.missingLocale)
  });
}
function zt(e, a, t) {
  const s = t.familyBasePath || xe(t.basePath || "/admin");
  return e.map((n) => {
    const r = Dt(s, n.familyId, a.channel), o = t.matrixPath ? Bt(t.matrixPath, n, a) : "", d = t.queuePath ? Nt(t.queuePath, n, a) : "", c = ua(n);
    return `
      <tr class="border-b border-gray-200 last:border-0" data-translation-row data-translation-row-id="${y(n.familyId)}">
        <td class="max-w-[22rem] px-4 py-4 align-top">
          <div class="min-w-0">
            <a href="${y(r)}" class="font-semibold text-gray-900 hover:text-sky-700">${m(c)}</a>
            <p class="mt-1 break-all text-xs text-gray-500">${m(n.familyId)}</p>
            <p class="mt-2 text-xs text-gray-500">${m(n.contentType || "unknown")} · Source ${m(n.sourceLocale.toUpperCase() || "n/a")}</p>
          </div>
        </td>
        <td class="px-4 py-4 align-top">${pe(n.readinessState)}</td>
        <td class="px-4 py-4 align-top">${Ot(n)}</td>
        <td class="px-4 py-4 align-top">
          <div class="flex flex-nowrap gap-1.5">
            ${ne(n.missingRequiredLocaleCount, "Missing", n.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-gray-900")}
            ${ne(n.pendingReviewCount, "Review", n.pendingReviewCount > 0 ? "text-amber-700" : "text-gray-900")}
            ${ne(n.outdatedLocaleCount, "Outdated", n.outdatedLocaleCount > 0 ? "text-violet-700" : "text-gray-900")}
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          <div class="space-y-2 text-sm">
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Available</span>${Fe(n.availableLocales)}</div>
            <div><span class="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</span>${Fe(n.missingLocales)}</div>
          </div>
        </td>
        <td class="px-4 py-4 align-top">
          ${jt(n, r, o, d)}
        </td>
      </tr>
    `;
  }).join("");
}
function Vt(e, a, t) {
  const s = e.items.length ? (e.page - 1) * e.perPage + 1 : 0, n = Math.min(e.total, (e.page - 1) * e.perPage + e.items.length), r = e.page > 1, o = e.page * e.perPage < e.total, d = t.matrixPath || t.queuePath ? `
      <div class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1" aria-label="Translation family views">
        ${t.matrixPath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${y(Ue(t.matrixPath, a))}">Matrix</a>` : ""}
        ${t.queuePath ? `<a class="rounded px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1" href="${y(Ue(t.queuePath, a))}">Queue</a>` : ""}
      </div>
    ` : "";
  return `
    <section class="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm" aria-labelledby="translation-family-list-results">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 id="translation-family-list-results" class="text-base font-semibold text-gray-900">Families</h2>
          <p class="text-sm text-gray-500">${m(s)}-${m(n)} of ${m(e.total)} families</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${d}
          <button type="button" class="${R}" data-translation-list-page="prev" ${r ? "" : "disabled"}>Previous</button>
          <span class="text-sm text-gray-500">Page ${m(e.page)}</span>
          <button type="button" class="${R}" data-translation-list-page="next" ${o ? "" : "disabled"}>Next</button>
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
            ${zt(e.items, a, t)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}
function Ht(e) {
  return `
    <div class="${Oe} mt-6 p-6" role="alert">
      <h2 class="${Me}">Families failed to load</h2>
      <p class="${je} mt-2">${m(e.message || "The translation families request failed.")}</p>
      ${e.requestURL ? `<p class="mt-3 break-all text-xs text-gray-500">Request ${m(e.requestURL)}</p>` : ""}
      ${Y({
    status: "error",
    requestId: e.requestId,
    traceId: e.traceId,
    errorCode: e.errorCode
  })}
      <button type="button" class="ui-state-retry-btn mt-4 ${R}">Retry</button>
    </div>
  `;
}
function Gt(e, a = {}) {
  const t = e.filters, s = Mt(t);
  if (e.status === "loading") return `${s}${la("Loading translation families...")}`;
  if (e.status === "error") return `${s}${Ht(e)}`;
  const n = e.response;
  return !n || e.status === "empty" || n.items.length === 0 ? `${s}${ce("No translation families found", "No families match the current filters.")}` : `${s}${Vt(n, t, a)}`;
}
function De(e, a, t = {}) {
  e.innerHTML = Gt(a, t);
}
async function Kt(e, a, t = {}) {
  const s = He(da(e, t.basePath), a), n = t.fetch;
  try {
    const r = await (n ? n(s, { headers: { Accept: "application/json" } }) : J(s, { headers: { Accept: "application/json" } })), o = i(r.headers.get("x-request-id")), d = Z(r.headers);
    if (!r.ok) {
      const l = await j(r);
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
    const c = Ye(p(await r.json()));
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
function Be(e, a) {
  const t = new FormData(e), s = (r, o) => t.has(r) ? i(t.get(r)) : o, n = (r, o) => t.has(r) ? L(t.get(r), o) : o;
  return ee({
    channel: s("channel", a.channel),
    contentType: s("content_type", a.contentType),
    readinessState: s("readiness_state", a.readinessState),
    blockerCode: s("blocker_code", a.blockerCode),
    missingLocale: s("missing_locale", a.missingLocale),
    page: n("page", a.page),
    perPage: n("per_page", a.perPage)
  });
}
function Yt(e) {
  if (typeof window > "u" || !window.history || !window.location) return;
  const a = Ut(new URLSearchParams(window.location.search), e), t = `${window.location.pathname}${a ? `?${a}` : ""}${window.location.hash || ""}`;
  window.history.pushState({}, "", t);
}
function ma(e) {
  e.dataset.translationCopyIdBound !== "true" && (e.dataset.translationCopyIdBound = "true", e.addEventListener("click", (a) => {
    const t = a.target;
    if (!(t instanceof HTMLElement)) return;
    const s = t.closest("[data-copy-id]");
    if (!s) return;
    const n = s.dataset.copyId || "";
    n && globalThis.navigator?.clipboard?.writeText && globalThis.navigator.clipboard.writeText(n);
  }));
}
async function qs(e, a = {}) {
  if (!e) return null;
  ma(e);
  const t = e.dataset || {}, s = {
    endpoint: i(a.endpoint || t.endpoint),
    basePath: i(a.basePath || t.basePath || "/admin"),
    familyBasePath: i(a.familyBasePath || t.familyBasePath),
    matrixPath: i(a.matrixPath || t.matrixPath),
    queuePath: i(a.queuePath || t.queuePath)
  };
  if (s.familyBasePath || (s.familyBasePath = xe(s.basePath)), t.ssrEnhanced === "true")
    return e.dataset.translationFamilyListEnhanced = "true", fa(e), {
      status: "ready",
      filters: Ee()
    };
  let n = Ee(), r = null;
  const o = async (d, c = !1) => {
    n = ee(d), c && Yt(n), De(e, {
      status: "loading",
      filters: n
    }, s);
    const l = await Kt(i(s.endpoint), n, {
      fetch: a.fetch,
      basePath: s.basePath
    });
    return r = l, De(e, l, s), Wt(e, l, o), l;
  };
  return r = await o(n, !1), r;
}
function Wt(e, a, t) {
  fa(e);
  const s = e.querySelector('[data-translation-filter-form="true"]');
  s && (s.addEventListener("submit", (n) => {
    n.preventDefault(), t({
      ...Be(s, a.filters),
      page: 1
    }, !0);
  }), s.querySelectorAll("select").forEach((n) => {
    n.addEventListener("change", () => {
      t({
        ...Be(s, a.filters),
        page: 1
      }, !0);
    });
  })), e.querySelector(".ui-state-retry-btn")?.addEventListener("click", () => {
    t(a.filters, !1);
  }), e.querySelectorAll("[data-translation-list-page]").forEach((n) => {
    n.addEventListener("click", () => {
      if (n.disabled) return;
      const r = n.dataset.translationListPage === "next" ? 1 : -1;
      t({
        ...a.filters,
        page: Math.max(1, a.filters.page + r)
      }, !0);
    });
  });
}
function fa(e) {
  e.dataset.translationFamilyListActionMenusStandalone !== "true" && (ke.get(e)?.destroy(), ke.set(e, va(e, {
    containerSelector: "[data-action-menu]",
    triggerSelector: "[data-action-menu-trigger]",
    menuSelector: "[data-action-menu-content]",
    itemSelector: '[data-action-menu-item], [role="menuitem"], .action-item'
  })));
}
function h(e, a) {
  const t = globalThis.toastManager, s = t?.[e];
  typeof s == "function" && s.call(t, a);
}
function Qt(e, a) {
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
function Jt(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}T${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
}
function Xt(e) {
  const a = i(e);
  if (!a) return "";
  const t = new Date(a);
  return Number.isNaN(t.getTime()) ? "" : t.toISOString();
}
function Zt(e, a, t, s) {
  const n = i(e.locale).toLowerCase(), r = i(t).toLowerCase(), o = s ? e.navigation.contentEditURL || e.navigation.contentDetailURL : e.navigation.contentDetailURL || e.navigation.contentEditURL;
  return r && r === n && o ? o : n && a[n] ? a[n] : o;
}
function we(e) {
  const a = typeof document < "u" ? document : null;
  if (!a) return;
  const t = e.quickCreate;
  if (!t.enabled || t.missingLocales.length === 0) {
    h("warning", t.disabledReason || "Locale creation is unavailable.");
    return;
  }
  const s = i(e.initialLocale || t.recommendedLocale || t.missingLocales[0]).toLowerCase(), n = t.missingLocales.includes(s) ? s : t.missingLocales[0], r = a.createElement("div");
  r.className = ka, r.setAttribute("data-translation-create-locale-modal", "true"), r.setAttribute("data-formgen-auto-init", "true"), r.innerHTML = `
    <div class="${Aa}" role="dialog" aria-modal="true" aria-labelledby="translation-create-locale-title">
      <form class="p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Create locale</p>
            <h2 id="translation-create-locale-title" class="mt-2 text-2xl font-semibold text-gray-900">${m(e.heading)}</h2>
            <p class="mt-2 text-sm text-gray-600">Server-authored recommendations and publish requirements for family ${m(e.familyId)}.</p>
          </div>
          <button type="button" data-close-modal="true" class="${Ta}">Close</button>
        </div>
        <div class="mt-6 grid gap-4">
          <label class="grid gap-2">
            <span class="text-sm font-medium text-gray-900">Locale</span>
            <select name="locale" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
              ${t.missingLocales.map((x) => `
                <option value="${y(x)}" ${x === n ? "selected" : ""}>
                  ${m(x.toUpperCase())}${x === t.recommendedLocale ? " (recommended)" : ""}
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
              ${ve({
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
                  <option value="${x}" ${x === (t.defaultAssignment.priority || "normal") ? "selected" : ""}>${T(x)}</option>
                `).join("")}
              </select>
            </label>
            <label class="grid gap-2">
              <span class="text-sm font-medium text-gray-900">Due date</span>
              <input type="datetime-local" name="due_date" value="${y(Jt(t.defaultAssignment.dueDate))}" class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900">
            </label>
          </div>
        </div>
        <div data-create-locale-feedback="true" class="mt-4 hidden rounded-xl border border-rose-200 bg-rose-50 px-6 py-4 text-sm text-rose-700"></div>
        <div class="mt-6 flex items-center justify-end gap-3">
          <button type="button" data-close-modal="true" class="${R}">Cancel</button>
          <button type="submit" class="${U}">${m(e.submitLabel || "Create locale")}</button>
        </div>
      </form>
    </div>
  `, a.body.appendChild(r), Q(r, e.assigneeOptionsBasePath || "/admin/api", { fetch: e.fetch });
  const o = r.querySelector('[role="dialog"]'), d = r.querySelector("form"), c = r.querySelector('select[name="locale"]'), l = r.querySelector('input[name="auto_create_assignment"]'), u = r.querySelector('select[name="assignee_id"]'), f = r.querySelector('select[name="priority"]'), g = r.querySelector('input[name="due_date"]'), b = r.querySelector('[data-assignment-fields="true"]'), v = r.querySelector('[data-create-locale-feedback="true"]'), $ = r.querySelector('button[type="submit"]'), S = () => {
    P(), r.remove();
  }, A = () => {
    !b || !l || (b.hidden = !l.checked);
  }, P = o ? Sa(o, S) : () => {
  };
  A(), l?.addEventListener("change", A), r.querySelectorAll('[data-close-modal="true"]').forEach((x) => {
    x.addEventListener("click", S);
  }), r.addEventListener("click", (x) => {
    x.target === r && S();
  }), d?.addEventListener("submit", async (x) => {
    if (x.preventDefault(), !c || !$) return;
    v && (v.hidden = !0, v.textContent = ""), $.disabled = !0, $.classList.add("opacity-60", "cursor-not-allowed");
    const D = i(c.value).toLowerCase();
    try {
      const z = !!l?.checked, V = z ? {
        assigneeId: u?.value,
        priority: f?.value,
        dueDate: Xt(g?.value || "")
      } : {}, ha = await e.onSubmit({
        locale: D,
        autoCreateAssignment: z,
        ...V
      });
      S(), await e.onSuccess?.(ha);
    } catch (z) {
      const V = Qt(z, D);
      v && (v.hidden = !1, v.textContent = V), h("error", V);
    } finally {
      $.disabled = !1, $.classList.remove("opacity-60", "cursor-not-allowed");
    }
  });
}
function es(e) {
  return {
    familyId: i(e.dataset.familyId),
    requestedLocale: i(e.dataset.requestedLocale).toLowerCase(),
    resolvedLocale: i(e.dataset.resolvedLocale).toLowerCase(),
    apiBasePath: i(e.dataset.apiBasePath || "/admin/api"),
    quickCreate: fe(Se(e.dataset.quickCreate, {}), {}),
    localeURLs: Se(e.dataset.localeUrls, {})
  };
}
function Is(e = document) {
  typeof document > "u" || e.querySelectorAll('[data-translation-summary-card="true"]').forEach((a) => {
    if (a.dataset.translationCreateBound === "true") return;
    a.dataset.translationCreateBound = "true";
    const t = es(a), s = $e({ basePath: t.apiBasePath });
    a.querySelectorAll('[data-action="create-locale"]').forEach((n) => {
      n.addEventListener("click", (r) => {
        r.preventDefault();
        const o = i(n.dataset.locale).toLowerCase() || t.quickCreate.recommendedLocale;
        we({
          familyId: t.familyId,
          quickCreate: t.quickCreate,
          initialLocale: o,
          heading: `Create ${o.toUpperCase() || t.quickCreate.recommendedLocale.toUpperCase()} locale`,
          assigneeOptionsBasePath: t.apiBasePath,
          onSubmit: (d) => s.createLocale(t.familyId, d),
          onSuccess: async (d) => {
            h("success", `${d.locale.toUpperCase()} locale created.`);
            const c = typeof window < "u" && window.location.pathname.endsWith("/edit"), l = Zt(d, t.localeURLs, t.requestedLocale, c);
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
function ga(e, a) {
  const t = i(a.dataset.localeAssignmentKey).toLowerCase();
  return t || (i(a.dataset.localeAssignmentSource) === "empty-panel" ? i(e.querySelector('[data-family-assignment-locale-select="true"]')?.value).toLowerCase() : "");
}
function as(e, a) {
  switch (a) {
    case "self":
      return e.actions.assignToMe;
    case "user":
      return e.actions.assignToUser;
    case "claim":
      return e.actions.claim;
  }
}
function ts(e, a, t) {
  if (i(t.dataset.localeAssignmentSource) === "empty-panel") return e.querySelector('[data-family-assignee-select="__empty_panel__"]');
  for (const s of Array.from(e.querySelectorAll("[data-family-assignee-select]"))) if (i(s.dataset.familyAssigneeSelect).toLowerCase() === a) return s;
  return null;
}
function ss(e) {
  if (!se(e)) return "";
  const a = e.previousElementSibling;
  if (!(a instanceof HTMLElement)) return "";
  const t = [
    a.dataset.value,
    a.dataset.selectedValue,
    a.dataset.selectedId,
    a.dataset.relationshipValue
  ].map(i).find(Boolean);
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
  ].map(i).find(Boolean) || "";
}
function ya(e, a, t) {
  const s = ts(e, a, t);
  if (!s) return {
    select: s,
    assigneeID: ""
  };
  const n = i(s.selectedOptions[0]?.value);
  return {
    select: s,
    assigneeID: [
      s.value,
      n,
      s.dataset.value,
      s.dataset.selectedValue,
      s.dataset.initialAssigneeId,
      ss(s)
    ].map(i).find(Boolean) || ""
  };
}
function pa(e) {
  if (!e) return;
  const a = e.previousElementSibling;
  ((se(e) && a instanceof HTMLElement ? a.querySelector("input") : null) || e).focus();
}
function ns(e) {
  return e.description && e.description !== e.label ? `${e.label} - ${e.description}` : e.label;
}
function is(e, a) {
  const t = i(e.value || e.dataset.initialAssigneeId), s = e.getAttribute("aria-label") || "Assignee", n = e.ownerDocument.createDocumentFragment(), r = e.ownerDocument.createElement("option");
  r.value = "", r.textContent = `Select ${s.toLowerCase()}`, n.appendChild(r);
  let o = t === "";
  for (const d of a) {
    const c = e.ownerDocument.createElement("option");
    c.value = d.value, c.textContent = ns(d), d.description && c.setAttribute("data-description", d.description), d.displayName && c.setAttribute("data-display-name", d.displayName), d.avatarURL && c.setAttribute("data-avatar-url", d.avatarURL), t && t === d.value && (c.selected = !0, o = !0), n.appendChild(c);
  }
  if (t && !o) {
    const d = e.ownerDocument.createElement("option");
    d.value = t, d.textContent = t, d.selected = !0, n.appendChild(d);
  }
  e.replaceChildren(n);
}
function ba(e) {
  return Array.from(e.querySelectorAll("[data-family-assignee-select]"));
}
function Le(e) {
  return ba(e).filter((a) => a.dataset.formgenManaged === "true");
}
function se(e) {
  const a = e.previousElementSibling;
  return a instanceof HTMLElement && a.getAttribute("data-fg-typeahead-root") === "true";
}
function rs(e) {
  return e.dataset.familyAssigneeFormgenReady === "true";
}
function os(e) {
  for (const a of Le(e)) se(a) && (a.dataset.familyAssigneeFormgenReady = "true");
}
function ls(e) {
  for (const a of e)
    delete a.dataset.familyAssigneeFormgenReady, se(a) && a.previousElementSibling?.remove();
}
function cs(e, a) {
  const t = C(a || "/admin/api"), s = t.endsWith("/api") ? t.slice(0, -4) || "/admin" : C(t);
  for (const n of Le(e)) {
    const r = i(n.dataset.endpointUrl);
    if (!(!r || /^https?:\/\//i.test(r))) {
      if (r === "/api") {
        n.dataset.endpointUrl = `${s}/api`;
        continue;
      }
      r.startsWith("/api/") && (n.dataset.endpointUrl = `${s}${r}`);
    }
  }
}
async function Q(e, a, t = {}) {
  const s = Le(e);
  if (s.length > 0 && typeof window < "u") {
    cs(e, a);
    const n = window.FormgenRelationships;
    if (n && typeof n.initRelationships == "function") {
      const r = e instanceof HTMLElement ? e : null, o = r?.hasAttribute("data-formgen-auto-init") ?? !1;
      r && !o && r.setAttribute("data-formgen-auto-init", "true");
      try {
        await n.initRelationships(), os(e);
      } catch {
        ls(s);
      } finally {
        r && !o && r.removeAttribute("data-formgen-auto-init");
      }
    }
  }
  await ds(e, a, t);
}
async function ds(e, a, t = {}) {
  const s = ba(e).filter((r) => !rs(r));
  if (s.length === 0) return;
  const n = s.map((r) => i(r.dataset.initialAssigneeId || r.value)).filter(Boolean);
  try {
    const r = await lt(a, n, t);
    for (const o of s) is(o, r);
  } catch {
    for (const r of s) {
      const o = i(r.dataset.initialAssigneeId || r.value);
      r.replaceChildren();
      const d = r.ownerDocument.createElement("option");
      d.value = o, d.textContent = o || "Assignees unavailable", d.selected = !0, r.appendChild(d), o || (r.disabled = !0), r.setAttribute("title", "Assignee options are unavailable.");
    }
  }
}
function ie(e, a, t = "") {
  e && ("disabled" in e && (e.disabled = !a), e.classList.toggle("opacity-60", !a), e.classList.toggle("cursor-not-allowed", !a), a ? (e.removeAttribute("aria-disabled"), e.removeAttribute("title")) : (e.setAttribute("aria-disabled", "true"), e.setAttribute("title", t || "Assignment action is unavailable.")));
}
function B(e) {
  const a = e.querySelector('[data-family-assignment-locale-select="true"]');
  if (!a) return;
  const t = a.selectedOptions[0], s = i(t?.dataset.assignToMeEnabled) === "true", n = i(t?.dataset.assignToUserEnabled) === "true", r = i(t?.dataset.assignToMeReason), o = i(t?.dataset.assignToUserReason);
  ie(e.querySelector('[data-family-assign-to-me="true"][data-locale-assignment-source="empty-panel"]'), s, r), ie(e.querySelector('[data-family-assign-to-user="true"][data-locale-assignment-source="empty-panel"]'), n, o), ie(e.querySelector('[data-family-assignee-select="__empty_panel__"]'), n, o);
}
function us(e, a) {
  const t = i(e.dataset.assignmentId), s = i(e.dataset.familyAssignmentAction), n = L(e.dataset.rowVersion, 0);
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
    expectedVersion: n
  };
}
function ms(e, a) {
  return i(a.dataset.localeAssignmentSource) !== "empty-panel" ? null : e.querySelector('[data-family-assignment-locale-select="true"]')?.selectedOptions[0] ?? null;
}
function fs(e, a, t) {
  const s = ms(e, a), n = i(a.dataset.assignmentTargetLocale || s?.dataset.assignmentTargetLocale), r = i(a.dataset.assignmentWorkScope || s?.dataset.assignmentWorkScope), o = t === "self" ? i(a.dataset.assignmentEndpoint || s?.dataset.assignToMeEndpoint || s?.dataset.assignmentEndpoint) : t === "user" ? i(a.dataset.assignmentEndpoint || s?.dataset.assignToUserEndpoint || s?.dataset.assignmentEndpoint) : i(a.dataset.assignmentEndpoint), d = i(a.dataset.assignmentId), c = L(a.dataset.rowVersion, 0), l = {};
  if (n && (l.target_locale = n), r && (l.work_scope = r), t === "self") {
    const f = i(a.dataset.assignmentAssigneeId || s?.dataset.assignToMeAssigneeId);
    f && (l.assignee_id = f);
  }
  let u = a.getAttribute("title") || "";
  return o ? (t === "self" || t === "user") && !n ? u = u || "Assignment target locale is unavailable." : t === "self" && !i(l.assignee_id) && (u = u || "Self-assignment payload is unavailable.") : u = u || "Assignment action endpoint is unavailable.", {
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
async function gs(e, a, t, s) {
  const n = da(a, t.basePath || "/admin"), r = i(e.dataset.familyId), o = ca(a) || i(e.dataset.channel), d = $e({
    basePath: n,
    fetch: s.fetch
  });
  await Q(e, n, { fetch: s.fetch }), e.dataset.translationEnhancedActionsBound !== "true" && (e.dataset.translationEnhancedActionsBound = "true", Ia(e, {
    fetch: s.fetch,
    ...s.enhancedAction,
    onFragmentsApplied: async () => {
      await Q(e, n, { fetch: s.fetch }), B(e);
    }
  })), B(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
    B(e);
  }), e.querySelectorAll('[data-translation-create-locale-trigger="true"]').forEach((l) => {
    l.dataset.translationCreateBound !== "true" && (l.dataset.translationCreateBound = "true", l.addEventListener("click", async (u) => {
      if (u.preventDefault(), l.disabled || l.getAttribute("aria-disabled") === "true") {
        h("warning", l.getAttribute("title") || "Locale creation is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        const f = await de(a, { fetch: s.fetch });
        if (f.status !== "ready" || !f.detail) {
          h("error", f.message || "Translation family detail is unavailable.");
          return;
        }
        const g = i(l.dataset.locale).toLowerCase() || f.detail.quickCreate.recommendedLocale || "";
        we({
          familyId: f.detail.familyId || r,
          quickCreate: Xe(f.detail, g),
          initialLocale: g,
          heading: `Create ${g.toUpperCase()} locale`,
          assigneeOptionsBasePath: n,
          fetch: s.fetch,
          onSubmit: (b) => d.createLocale(f.detail?.familyId || r, {
            ...b,
            channel: o
          }),
          onSuccess: async (b) => {
            h("success", `${b.locale.toUpperCase()} locale created.`), typeof window < "u" && window.location.reload();
          }
        });
      } catch (f) {
        h("error", f instanceof Error ? f.message : "Failed to open locale creation.");
      } finally {
        l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  });
  const c = async (l, u) => {
    const f = fs(e, l, u);
    if (!f.enabled) {
      h("warning", f.reason || "Assignment action is unavailable.");
      return;
    }
    const g = {};
    if (u === "user") {
      const { select: b, assigneeID: v } = ya(e, ga(e, l), l);
      if (!v) {
        h("warning", "Assignee is required."), pa(b);
        return;
      }
      g.assignee_id = v;
    }
    o && (g.channel = o), l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
    try {
      await re(f, g, { fetch: s.fetch }), h("success", u === "claim" ? "Assignment claimed." : "Assignment updated."), typeof window < "u" && window.location.reload();
    } catch (b) {
      h("error", b instanceof Error ? b.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
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
      const f = us(l, n);
      if (!f.enabled) {
        h("warning", f.reason || "Assignment action is unavailable.");
        return;
      }
      l.disabled = !0, l.classList.add("opacity-60", "cursor-not-allowed");
      try {
        await re(f, o ? { channel: o } : {}, { fetch: s.fetch }), h("success", f.label ? `${f.label} complete.` : "Assignment updated."), typeof window < "u" && window.location.reload();
      } catch (g) {
        h("error", g instanceof Error ? g.message : "Failed to update assignment."), l.disabled = !1, l.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }));
  }), { status: "ready" };
}
async function K(e, a = {}) {
  if (!e) return null;
  ma(e);
  const t = e.dataset || {}, s = i(a.endpoint || t.endpoint), n = {
    basePath: i(a.basePath || t.basePath || "/admin"),
    contentBasePath: i(a.contentBasePath || t.contentBasePath)
  };
  if (t.ssrEnhanced === "true") return gs(e, s, n, a);
  G(e, { status: "loading" }, n);
  const r = await de(s, { fetch: a.fetch });
  G(e, r, n);
  const o = ca(s);
  if (typeof e.querySelector == "function") {
    if (r.status === "ready" && r.detail) {
      const l = `${C(n.basePath || "/admin")}/api`, u = $e({
        basePath: l,
        fetch: a.fetch
      });
      await Q(e, l, { fetch: a.fetch }), e.querySelectorAll('[data-family-create-locale="true"]').forEach((g) => {
        g.dataset.translationCreateBound !== "true" && (g.dataset.translationCreateBound = "true", g.addEventListener("click", (b) => {
          b.preventDefault();
          const v = r.detail;
          if (!v) {
            h("error", "Translation family detail is unavailable.");
            return;
          }
          if (g.getAttribute("aria-disabled") === "true") {
            h("warning", v.quickCreate.disabledReason || "Locale creation is unavailable.");
            return;
          }
          const $ = i(g.dataset.locale).toLowerCase() || v.quickCreate.recommendedLocale || "", S = Xe(v, $);
          we({
            familyId: v.familyId,
            quickCreate: S,
            initialLocale: $,
            heading: `Create ${$.toUpperCase()} locale`,
            assigneeOptionsBasePath: l,
            fetch: a.fetch,
            onSubmit: (A) => u.createLocale(v.familyId, {
              ...A,
              channel: o
            }),
            onSuccess: async (A) => {
              h("success", `${A.locale.toUpperCase()} locale created.`), await K(e, {
                ...a,
                ...n,
                endpoint: s
              });
            }
          });
        }));
      });
      const f = async (g, b) => {
        const v = r.detail;
        if (!v) {
          h("error", "Translation family detail is unavailable.");
          return;
        }
        const $ = ga(e, g), S = $ ? v.localeAssignments[$] : null;
        if (!S) {
          h("error", "Assignment action metadata is unavailable.");
          return;
        }
        const A = as(S, b);
        if (!A.enabled) {
          h("warning", A.reason || "Assignment action is unavailable.");
          return;
        }
        const P = {};
        if (b === "user") {
          const { select: x, assigneeID: D } = ya(e, $, g);
          if (!D) {
            h("warning", "Assignee is required."), pa(x);
            return;
          }
          P.assignee_id = D;
        }
        o && (P.channel = o), g.disabled = !0, g.classList.add("opacity-60", "cursor-not-allowed");
        try {
          await re(A, P, { fetch: a.fetch }), h("success", b === "claim" ? "Assignment claimed." : "Assignment updated."), await K(e, {
            ...a,
            ...n,
            endpoint: s
          });
        } catch (x) {
          h("error", x instanceof Error ? x.message : "Failed to update assignment."), g.disabled = !1, g.classList.remove("opacity-60", "cursor-not-allowed");
        }
      };
      B(e), e.querySelector('[data-family-assignment-locale-select="true"]')?.addEventListener("change", () => {
        B(e);
      }), e.querySelectorAll('[data-family-assign-to-me="true"]').forEach((g) => {
        g.addEventListener("click", (b) => {
          b.preventDefault(), f(g, "self");
        });
      }), e.querySelectorAll('[data-family-assign-to-user="true"]').forEach((g) => {
        g.addEventListener("click", (b) => {
          b.preventDefault(), f(g, "user");
        });
      }), e.querySelectorAll('[data-family-claim-assignment="true"]').forEach((g) => {
        g.addEventListener("click", (b) => {
          b.preventDefault(), f(g, "claim");
        });
      });
    }
    const d = () => {
      const l = e.querySelector(".ui-state-retry-btn");
      l && l.addEventListener("click", () => {
        K(e, {
          ...a,
          ...n,
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
        await Ua(u, {
          fetch: a.fetch,
          correlationId: r.requestId || ""
        });
        const f = await de(s, { fetch: a.fetch });
        if (f.status === "error" && (f.errorCode === "NOT_FOUND" || f.statusCode === 404)) {
          G(e, {
            ...f,
            syncRecovery: u,
            syncStatus: "completed",
            syncMessage: "Sync completed; family detail still returned NOT_FOUND."
          }, n), d();
          return;
        }
        if (f.status !== "ready") {
          const g = f.message || "Sync completed, but family detail reload failed.";
          G(e, {
            ...f,
            syncRecovery: u,
            syncStatus: "failed",
            syncMessage: g
          }, n), d(), h("error", g);
          return;
        }
        h("success", "Translation families synced."), await K(e, {
          ...a,
          ...n,
          endpoint: s
        });
      } catch (u) {
        const f = u instanceof Error ? u.message : "Failed to sync translation families.", g = e.querySelector('[data-family-sync-feedback="true"]');
        g && (g.hidden = !1, g.textContent = f), c.disabled = !1, c.classList.remove("opacity-60", "cursor-not-allowed"), h("error", f);
      }
    });
  }
  return r;
}
function $e(e = {}) {
  const a = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!a) throw new Error("translation-family client requires fetch");
  const t = C(e.basePath || "/admin/api");
  async function s(n) {
    return ue(n);
  }
  return {
    async list(n = {}) {
      return Ye(await s(await a(He(t, n), { headers: { Accept: "application/json" } })));
    },
    async detail(n, r = "") {
      return Qe(await s(await a(Da(t, n, r), { headers: { Accept: "application/json" } })));
    },
    async createLocale(n, r = {}) {
      const o = Ha({
        ...r,
        familyId: n,
        basePath: t
      }), d = new Headers(o.headers), c = {
        method: "POST",
        credentials: "same-origin",
        headers: d,
        body: JSON.stringify(Na(o.request))
      };
      W(o.endpoint, c, d);
      const l = await a(o.endpoint, c);
      if (!l.ok) throw await nt(l);
      return Va(await s(l));
    },
    async createAssignment(n, r = {}) {
      const o = Ke(r), d = Ma(t, n, o.channel), c = new Headers({
        Accept: "application/json",
        "Content-Type": "application/json"
      });
      o.idempotencyKey && c.set("X-Idempotency-Key", o.idempotencyKey);
      const l = {
        method: "POST",
        credentials: "same-origin",
        headers: c,
        body: JSON.stringify(Oa(o))
      };
      W(d, l, c);
      const u = await a(d, l);
      if (!u.ok) throw await be(u);
      return s(u);
    }
  };
}
export {
  ks as applyCreateLocaleToFamilyDetail,
  Ts as applyCreateLocaleToSummaryState,
  ma as bindCopyIdAffordance,
  Ba as buildCreateLocaleURL,
  Lt as buildFamilyActivityPreview,
  Ma as buildFamilyAssignmentURL,
  Dt as buildFamilyDetailUIURL,
  Da as buildFamilyDetailURL,
  Ut as buildFamilyListBrowserSearch,
  Ve as buildFamilyListQuery,
  He as buildFamilyListURL,
  Bt as buildFamilyMatrixURL,
  Nt as buildFamilyQueueURL,
  Pa as buildTranslationFamilySyncRPCRequest,
  ee as createFamilyFilters,
  Ha as createTranslationCreateLocaleActionModel,
  Ge as createTranslationCreateLocaleRequest,
  Ke as createTranslationFamilyAssignmentRequest,
  $e as createTranslationFamilyClient,
  Ua as dispatchTranslationFamilySync,
  de as fetchTranslationFamilyDetailState,
  Kt as fetchTranslationFamilyListState,
  st as getReadinessChip,
  K as initTranslationFamilyDetailPage,
  qs as initTranslationFamilyListPage,
  Is as initTranslationSummaryCards,
  Va as normalizeCreateLocaleResult,
  Qe as normalizeFamilyDetail,
  Ye as normalizeFamilyListResponse,
  Ga as normalizeFamilyListRow,
  fe as normalizeQuickCreateHints,
  Ra as normalizeTranslationFamilySyncRecoveryCapability,
  Ft as parseFamilyListFiltersFromSearchParams,
  Ee as readFamilyListFiltersFromLocation,
  pe as renderReadinessChip,
  G as renderTranslationFamilyDetailPage,
  Pt as renderTranslationFamilyDetailState,
  De as renderTranslationFamilyListPage,
  Gt as renderTranslationFamilyListState,
  Na as serializeCreateLocaleRequest,
  Oa as serializeFamilyAssignmentRequest,
  Jt as toDateTimeLocalInputValue
};

//# sourceMappingURL=index.js.map