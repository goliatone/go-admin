import { e as h, a as n } from "../chunks/html-Br-oQr7i.js";
import { h as A } from "../chunks/http-client-Dm229xuF.js";
import { extractStructuredError as L } from "../toast/error-helpers.js";
function r(e) {
  return typeof e == "string" ? e.trim() : "";
}
function c(e, t = 0) {
  if (typeof e == "number" && Number.isFinite(e)) return e;
  if (typeof e == "string" && e.trim() !== "") {
    const s = Number(e);
    if (Number.isFinite(s)) return s;
  }
  return t;
}
function b(e) {
  return e === !0 || e === "true" || e === "1";
}
function m(e) {
  return e && typeof e == "object" && !Array.isArray(e) ? e : {};
}
function T(e) {
  return r(
    e.get("x-trace-id") || e.get("x-correlation-id") || e.get("traceparent")
  );
}
function u(e) {
  return Array.isArray(e) ? e.map((t) => r(t)).filter((t) => t.length > 0) : [];
}
function y(e) {
  return r(e) === "ready" ? "ready" : "blocked";
}
function k(e) {
  const t = r(e);
  switch (t) {
    case "missing_locale":
    case "missing_field":
    case "pending_review":
    case "outdated_source":
    case "policy_denied":
      return t;
    default:
      return "policy_denied";
  }
}
function P(e) {
  const t = m(e), s = {};
  for (const [a, l] of Object.entries(t)) {
    const i = r(l);
    a.trim() !== "" && i !== "" && (s[a] = i);
  }
  return s;
}
function R(e = {}) {
  return {
    contentType: r(e.contentType),
    readinessState: r(e.readinessState),
    blockerCode: r(e.blockerCode),
    missingLocale: r(e.missingLocale),
    page: Math.max(1, c(e.page, 1)),
    perPage: Math.max(1, c(e.perPage, 50)),
    environment: r(e.environment)
  };
}
function I(e = {}) {
  const t = R(e), s = new URLSearchParams();
  return t.contentType && s.set("content_type", t.contentType), t.readinessState && s.set("readiness_state", t.readinessState), t.blockerCode && s.set("blocker_code", t.blockerCode), t.missingLocale && s.set("missing_locale", t.missingLocale), t.environment && s.set("environment", t.environment), s.set("page", String(t.page)), s.set("per_page", String(t.perPage)), s;
}
function q(e, t = {}) {
  const s = `${f(e)}/translations/families`, a = I(t).toString();
  return a ? `${s}?${a}` : s;
}
function F(e, t, s = "") {
  const a = encodeURIComponent(r(t)), l = `${f(e)}/translations/families/${a}`, i = new URLSearchParams();
  r(s) && i.set("environment", r(s));
  const o = i.toString();
  return o ? `${l}?${o}` : l;
}
function j(e) {
  return {
    familyId: r(e.family_id),
    tenantId: r(e.tenant_id),
    orgId: r(e.org_id),
    contentType: r(e.content_type),
    sourceLocale: r(e.source_locale),
    sourceVariantId: r(e.source_variant_id),
    sourceRecordId: r(e.source_record_id),
    sourceTitle: r(e.source_title),
    readinessState: y(e.readiness_state),
    missingRequiredLocaleCount: c(e.missing_required_locale_count),
    pendingReviewCount: c(e.pending_review_count),
    outdatedLocaleCount: c(e.outdated_locale_count),
    blockerCodes: u(e.blocker_codes).map(k),
    missingLocales: u(e.missing_locales),
    availableLocales: u(e.available_locales)
  };
}
function N(e) {
  return {
    items: (Array.isArray(e.items) ? e.items : []).map((s) => j(m(s))),
    total: c(e.total),
    page: c(e.page, 1),
    perPage: c(e.per_page, 50),
    environment: r(e.environment)
  };
}
function w(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    locale: r(e.locale),
    status: r(e.status),
    isSource: b(e.is_source),
    sourceRecordId: r(e.source_record_id),
    sourceHashAtLastSync: r(e.source_hash_at_last_sync),
    fields: P(e.fields),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at),
    publishedAt: r(e.published_at)
  };
}
function U(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    blockerCode: k(e.blocker_code),
    locale: r(e.locale),
    fieldPath: r(e.field_path),
    details: m(e.details)
  };
}
function D(e) {
  return {
    id: r(e.id),
    familyId: r(e.family_id),
    variantId: r(e.variant_id),
    sourceLocale: r(e.source_locale),
    targetLocale: r(e.target_locale),
    workScope: r(e.work_scope),
    status: r(e.status),
    assigneeId: r(e.assignee_id),
    reviewerId: r(e.reviewer_id),
    priority: r(e.priority),
    dueDate: r(e.due_date),
    createdAt: r(e.created_at),
    updatedAt: r(e.updated_at)
  };
}
function S(e) {
  const t = e.source_variant ? w(m(e.source_variant)) : null, s = Array.isArray(e.blockers) ? e.blockers.map((d) => U(m(d))) : [], a = Array.isArray(e.locale_variants) ? e.locale_variants.map((d) => w(m(d))) : [], l = Array.isArray(e.active_assignments) ? e.active_assignments.map((d) => D(m(d))) : [], i = m(e.publish_gate), o = m(e.readiness_summary);
  return {
    familyId: r(e.family_id),
    contentType: r(e.content_type),
    sourceLocale: r(e.source_locale),
    readinessState: y(e.readiness_state),
    sourceVariant: t,
    localeVariants: a,
    blockers: s,
    activeAssignments: l,
    publishGate: {
      allowed: b(i.allowed),
      overrideAllowed: b(i.override_allowed),
      blockedBy: u(i.blocked_by),
      reviewRequired: b(i.review_required)
    },
    readinessSummary: {
      state: y(o.state),
      requiredLocales: u(o.required_locales),
      missingLocales: u(o.missing_locales),
      availableLocales: u(o.available_locales),
      blockerCodes: u(o.blocker_codes),
      missingRequiredLocaleCount: c(o.missing_required_locale_count),
      pendingReviewCount: c(o.pending_review_count),
      outdatedLocaleCount: c(o.outdated_locale_count),
      publishReady: b(o.publish_ready)
    }
  };
}
function z(e) {
  const t = y(e);
  return t === "ready" ? { state: t, label: "Ready", tone: "success" } : { state: t, label: "Blocked", tone: "warning" };
}
function C(e) {
  const t = z(e);
  return `<span class="translation-family-chip translation-family-chip--${t.tone}" data-readiness-state="${t.state}">${t.label}</span>`;
}
function v(e) {
  const t = r(e);
  if (!t) return "";
  const s = new Date(t);
  return Number.isNaN(s.getTime()) ? t : s.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
function p(e) {
  const t = r(e).replace(/_/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function B(e) {
  switch (r(e)) {
    case "published":
    case "approved":
      return "bg-emerald-100 text-emerald-700";
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
      return "bg-sky-100 text-sky-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function G(e) {
  switch (r(e)) {
    case "in_review":
      return "bg-amber-100 text-amber-700";
    case "in_progress":
    case "assigned":
      return "bg-sky-100 text-sky-700";
    case "changes_requested":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function M(e) {
  switch (r(e)) {
    case "missing_locale":
      return "bg-rose-100 text-rose-700";
    case "missing_field":
      return "bg-amber-100 text-amber-700";
    case "pending_review":
      return "bg-sky-100 text-sky-700";
    case "outdated_source":
      return "bg-violet-100 text-violet-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
function V(e, t, s) {
  const a = f(e), l = r(s.sourceRecordId);
  return !a || !l || !t.contentType ? "" : `${a}/${encodeURIComponent(t.contentType)}/${encodeURIComponent(l)}?locale=${encodeURIComponent(s.locale)}`;
}
function E(e) {
  const t = r(e);
  if (!t) return "none";
  const s = new Date(t);
  if (Number.isNaN(s.getTime())) return "none";
  const a = s.getTime() - Date.now();
  return a < 0 ? "overdue" : a <= 48 * 60 * 60 * 1e3 ? "due_soon" : "on_track";
}
function O(e, t = 5) {
  const s = [];
  for (const a of e.localeVariants)
    a.createdAt && s.push({
      id: `variant-created-${a.id}`,
      timestamp: a.createdAt,
      title: `${a.locale.toUpperCase()} variant created`,
      detail: a.isSource ? "Source locale registered for this family." : `Variant entered ${p(a.status)} state.`,
      tone: a.isSource ? "neutral" : "success"
    }), a.publishedAt && s.push({
      id: `variant-published-${a.id}`,
      timestamp: a.publishedAt,
      title: `${a.locale.toUpperCase()} variant published`,
      detail: "Locale is published and available for delivery.",
      tone: "success"
    });
  for (const a of e.activeAssignments) {
    const l = a.updatedAt || a.createdAt;
    if (!l) continue;
    const i = a.assigneeId ? `Assigned to ${a.assigneeId}.` : "Currently unassigned.";
    s.push({
      id: `assignment-${a.id}`,
      timestamp: l,
      title: `${a.targetLocale.toUpperCase()} assignment ${p(a.status)}`,
      detail: `${i} Priority ${a.priority || "normal"}.`,
      tone: a.status === "changes_requested" ? "warning" : "neutral"
    });
  }
  return s.sort((a, l) => l.timestamp.localeCompare(a.timestamp)).slice(0, Math.max(1, t));
}
function H(e) {
  return [
    {
      label: "Required locales",
      value: e.readinessSummary.requiredLocales.length,
      tone: "text-slate-900"
    },
    {
      label: "Missing locales",
      value: e.readinessSummary.missingRequiredLocaleCount,
      tone: e.readinessSummary.missingRequiredLocaleCount > 0 ? "text-rose-700" : "text-slate-900"
    },
    {
      label: "Pending review",
      value: e.readinessSummary.pendingReviewCount,
      tone: e.readinessSummary.pendingReviewCount > 0 ? "text-amber-700" : "text-slate-900"
    },
    {
      label: "Outdated locales",
      value: e.readinessSummary.outdatedLocaleCount,
      tone: e.readinessSummary.outdatedLocaleCount > 0 ? "text-violet-700" : "text-slate-900"
    }
  ].map(
    (s) => `
        <div class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">${n(s.label)}</div>
          <div class="mt-2 text-2xl font-semibold ${s.tone}">${n(s.value)}</div>
        </div>
      `
  ).join("");
}
function Y(e, t) {
  const s = f(t.contentBasePath || `${f(t.basePath || "/admin")}/content`), a = e.readinessSummary.missingLocales, l = e.localeVariants.map((i) => {
    const o = V(s, e, i), d = o ? `<a href="${h(o)}" class="text-sm font-medium text-sky-700 hover:text-sky-800">Open locale</a>` : '<span class="text-sm text-slate-400">No content route</span>', g = i.fields.title || i.fields.slug || `${e.contentType} ${i.locale.toUpperCase()}`;
    return `
      <li class="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-semibold text-slate-900">${n(i.locale.toUpperCase())}</span>
            ${i.isSource ? '<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Source</span>' : ""}
            <span class="rounded-full px-2 py-0.5 text-xs font-medium ${B(i.status)}">${n(p(i.status))}</span>
          </div>
          <p class="mt-2 text-sm text-slate-600">${n(g)}</p>
          <p class="mt-1 text-xs text-slate-500">Updated ${n(v(i.updatedAt || i.createdAt)) || "n/a"}</p>
        </div>
        <div class="flex-shrink-0">${d}</div>
      </li>
    `;
  });
  for (const i of a)
    l.push(`
      <li class="flex items-start justify-between gap-4 rounded-xl border border-dashed border-rose-300 bg-rose-50 p-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-rose-900">${n(i.toUpperCase())}</span>
            <span class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">Missing required locale</span>
          </div>
          <p class="mt-2 text-sm text-rose-800">This locale is required by policy before the family is publish-ready.</p>
        </div>
        <div class="flex-shrink-0 text-xs font-medium uppercase tracking-wide text-rose-700">Phase 6 create flow</div>
      </li>
    `);
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-locales">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 id="translation-family-locales" class="text-lg font-semibold text-slate-900">Locale coverage</h2>
          <p class="mt-1 text-sm text-slate-500">Server-authored locale availability and variant state for this family.</p>
        </div>
      </div>
      <ul class="mt-5 space-y-3" role="list">
        ${l.join("") || '<li class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No locale variants available.</li>'}
      </ul>
    </section>
  `;
}
function Q(e) {
  return e.activeAssignments.length ? `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
      <h2 id="translation-family-assignments" class="text-lg font-semibold text-slate-900">Assignments</h2>
      <p class="mt-1 text-sm text-slate-500">Current cross-locale work in progress for this family.</p>
      <ul class="mt-5 space-y-3" role="list">
        ${e.activeAssignments.map((t) => {
    const s = E(t.dueDate), a = s === "none" ? "No due date" : p(s), l = s === "overdue" ? "bg-rose-100 text-rose-700" : s === "due_soon" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";
    return `
              <li class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-sm font-semibold text-slate-900">${n(t.targetLocale.toUpperCase())}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${G(t.status)}">${n(p(t.status))}</span>
                  <span class="rounded-full px-2 py-0.5 text-xs font-medium ${l}">${n(a)}</span>
                </div>
                <p class="mt-2 text-sm text-slate-600">
                  ${n(t.assigneeId || "Unassigned")}
                  <span class="text-slate-400">·</span>
                  Priority ${n(t.priority || "normal")}
                </p>
                <p class="mt-1 text-xs text-slate-500">Updated ${n(v(t.updatedAt || t.createdAt)) || "n/a"}</p>
              </li>
            `;
  }).join("")}
      </ul>
    </section>
  ` : `
      <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-assignments">
        <h2 id="translation-family-assignments" class="text-lg font-semibold text-slate-900">Assignments</h2>
        <p class="mt-1 text-sm text-slate-500">No active assignments are attached to this family.</p>
      </section>
    `;
}
function W(e) {
  const t = e.blockers.length ? e.blockers.map((s) => {
    const a = [s.locale && s.locale.toUpperCase(), s.fieldPath].filter(Boolean).join(" · ");
    return `
            <li class="flex flex-wrap items-center gap-2">
              <span class="rounded-full px-2 py-0.5 text-xs font-medium ${M(s.blockerCode)}">${n(p(s.blockerCode))}</span>
              ${a ? `<span class="text-sm text-slate-600">${n(a)}</span>` : ""}
            </li>
          `;
  }).join("") : '<li class="text-sm text-slate-500">No blockers recorded.</li>';
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-publish-gate">
      <h2 id="translation-family-publish-gate" class="text-lg font-semibold text-slate-900">Publish gate</h2>
      <div class="mt-4 rounded-xl ${e.publishGate.allowed ? "border border-emerald-200 bg-emerald-50" : "border border-amber-200 bg-amber-50"} p-4">
        <div class="flex flex-wrap items-center gap-3">
          ${C(e.readinessState)}
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
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Blockers</h3>
          <ul class="mt-3 space-y-2" role="list">${t}</ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Policy</h3>
          <ul class="mt-3 space-y-2 text-sm text-slate-600" role="list">
            <li>Review required: <strong class="text-slate-900">${e.publishGate.reviewRequired ? "Yes" : "No"}</strong></li>
            <li>Override allowed: <strong class="text-slate-900">${e.publishGate.overrideAllowed ? "Yes" : "No"}</strong></li>
            <li>Available locales: <strong class="text-slate-900">${n(e.readinessSummary.availableLocales.join(", ") || "None")}</strong></li>
          </ul>
        </div>
      </div>
    </section>
  `;
}
function J(e) {
  const t = O(e);
  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="translation-family-activity">
      <h2 id="translation-family-activity" class="text-lg font-semibold text-slate-900">Activity preview</h2>
      <p class="mt-1 text-sm text-slate-500">Recent server timestamps across variants and active assignments.</p>
      ${t.length ? `<ol class="mt-5 space-y-3" role="list">
              ${t.map(
    (s) => `
                    <li class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="text-sm font-semibold text-slate-900">${n(s.title)}</span>
                        <span class="rounded-full px-2 py-0.5 text-xs font-medium ${s.tone === "success" ? "bg-emerald-100 text-emerald-700" : s.tone === "warning" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}">${n(v(s.timestamp))}</span>
                      </div>
                      <p class="mt-2 text-sm text-slate-600">${n(s.detail)}</p>
                    </li>
                  `
  ).join("")}
            </ol>` : '<p class="mt-4 text-sm text-slate-500">No activity timestamps are available for this family yet.</p>'}
    </section>
  `;
}
function x(e) {
  const t = [
    e.requestId ? `Request ${n(e.requestId)}` : "",
    e.traceId ? `Trace ${n(e.traceId)}` : "",
    e.errorCode ? `Code ${n(e.errorCode)}` : ""
  ].filter(Boolean);
  return t.length ? `
    <div class="mt-4 flex flex-wrap gap-2" aria-label="Diagnostics">
      ${t.map(
    (s) => `<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">${s}</span>`
  ).join("")}
    </div>
  ` : "";
}
function K(e) {
  return `
    <div class="flex items-center justify-center py-16" aria-busy="true" aria-label="Loading">
      <div class="flex flex-col items-center gap-3 text-slate-500">
        <span class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-500"></span>
        <span class="text-sm">${n(e)}</span>
      </div>
    </div>
  `;
}
function _(e, t) {
  return `
    <div class="flex items-center justify-center py-16" role="status" aria-label="Empty">
      <div class="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">${n(e)}</h2>
        <p class="mt-2 text-sm text-slate-500">${n(t)}</p>
      </div>
    </div>
  `;
}
function X(e, t) {
  return `
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6" role="alert">
      <h2 class="text-lg font-semibold text-rose-900">${n(e)}</h2>
      <p class="mt-2 text-sm text-rose-700">${n(t)}</p>
      <button type="button" class="ui-state-retry-btn mt-4 inline-flex items-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm ring-1 ring-inset ring-rose-200 hover:bg-rose-100">
        Reload family detail
      </button>
    </div>
  `;
}
function Z(e, t = {}) {
  if (e.status === "loading")
    return K("Loading translation family...");
  if (e.status === "empty")
    return `
      ${_(
      "Family detail unavailable",
      e.message || "This family detail view does not have a backing payload yet."
    )}
      ${x(e)}
    `;
  if (e.status === "error" || e.status === "conflict") {
    const i = e.status === "conflict" ? "Family detail conflict" : "Family detail failed to load", o = e.message || (e.status === "conflict" ? "The family detail payload is out of date. Reload to fetch the latest state." : "The translation family detail request failed.");
    return `
      <div class="translation-family-detail-error">
        ${X(i, o)}
        ${x(e)}
      </div>
    `;
  }
  const s = e.detail;
  if (!s)
    return _("Family detail unavailable", "No family detail payload was returned.");
  const a = s.sourceVariant?.fields.title || s.sourceVariant?.fields.slug || `${s.contentType} family`, l = s.readinessSummary.blockerCodes.length ? s.readinessSummary.blockerCodes.map(p).join(", ") : "No blockers";
  return `
    <div class="translation-family-detail space-y-6" data-family-id="${h(s.familyId)}" data-readiness-state="${h(s.readinessState)}">
      <section class="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,white)] p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Translation family</p>
            <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950">${n(a)}</h1>
            <p class="mt-2 text-sm text-slate-600">${n(s.contentType)} · Source locale ${n(s.sourceLocale.toUpperCase())} · Family ${n(s.familyId)}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            ${C(s.readinessState)}
            <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">${n(l)}</span>
          </div>
        </div>
        <div class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          ${H(s)}
        </div>
        ${x(e)}
      </section>
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div class="space-y-6">
          ${Y(s, t)}
          ${Q(s)}
        </div>
        <div class="space-y-6">
          ${W(s)}
          ${J(s)}
        </div>
      </div>
    </div>
  `;
}
async function ee(e, t = {}) {
  const s = r(e);
  if (!s)
    return {
      status: "empty",
      message: "The family detail route is missing its backing API endpoint."
    };
  try {
    const a = await (t.fetch ? t.fetch(s, { headers: { Accept: "application/json" } }) : A(s, { headers: { Accept: "application/json" } })), l = r(a.headers.get("x-request-id")), i = T(a.headers);
    if (!a.ok) {
      const g = await L(a);
      return {
        status: a.status === 409 ? "conflict" : "error",
        message: g.message,
        requestId: l,
        traceId: i,
        statusCode: a.status,
        errorCode: g.textCode
      };
    }
    const o = m(await a.json()), d = S(o);
    return d.familyId ? {
      status: "ready",
      detail: d,
      requestId: l,
      traceId: i,
      statusCode: a.status
    } : {
      status: "empty",
      message: "The family detail payload did not include a family identifier.",
      requestId: l,
      traceId: i,
      statusCode: a.status
    };
  } catch (a) {
    return {
      status: "error",
      message: a instanceof Error ? a.message : "Failed to load translation family detail."
    };
  }
}
function $(e, t, s = {}) {
  e.innerHTML = Z(t, s);
}
async function te(e, t = {}) {
  if (!e) return null;
  const s = e.dataset || {}, a = r(t.endpoint || s.endpoint), l = {
    basePath: r(t.basePath || s.basePath || "/admin"),
    contentBasePath: r(t.contentBasePath || s.contentBasePath)
  };
  $(e, { status: "loading" }, l);
  const i = await ee(a, { fetch: t.fetch });
  if ($(e, i, l), typeof e.querySelector == "function") {
    const o = e.querySelector(".ui-state-retry-btn");
    o && o.addEventListener("click", () => {
      te(e, { ...t, ...l, endpoint: a });
    });
  }
  return i;
}
function ie(e = {}) {
  const t = e.fetch ?? globalThis.fetch?.bind(globalThis);
  if (!t)
    throw new Error("translation-family client requires fetch");
  const s = f(e.basePath || "/admin/api");
  return {
    async list(a = {}) {
      const i = await (await t(q(s, a), {
        headers: { Accept: "application/json" }
      })).json();
      return N(i);
    },
    async detail(a, l = "") {
      const o = await (await t(F(s, a, l), {
        headers: { Accept: "application/json" }
      })).json();
      return S(o);
    }
  };
}
function f(e) {
  const t = r(e);
  return t ? t.endsWith("/") ? t.slice(0, -1) : t : "";
}
export {
  O as buildFamilyActivityPreview,
  F as buildFamilyDetailURL,
  I as buildFamilyListQuery,
  q as buildFamilyListURL,
  R as createFamilyFilters,
  ie as createTranslationFamilyClient,
  ee as fetchTranslationFamilyDetailState,
  z as getReadinessChip,
  te as initTranslationFamilyDetailPage,
  S as normalizeFamilyDetail,
  N as normalizeFamilyListResponse,
  j as normalizeFamilyListRow,
  C as renderReadinessChip,
  $ as renderTranslationFamilyDetailPage,
  Z as renderTranslationFamilyDetailState
};
//# sourceMappingURL=index.js.map
