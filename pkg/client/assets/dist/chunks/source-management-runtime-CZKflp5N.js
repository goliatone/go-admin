import { o as d } from "./lineage-contracts-RFw4HNlm.js";
import { c as j } from "./dom-helpers-CDdChTSn.js";
import { _ as D, c as E, d as N, f as A, l as F, m as U, n as b, r as q, s as x, u as O } from "./source-management-pages-BO2sJj9C.js";
function v(e) {
  const t = document.getElementById(e)?.textContent?.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (r) {
    return console.warn(`[SourceManagementRuntime] Failed to parse ${e}:`, r), null;
  }
}
function n(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function R(e) {
  const t = String(e ?? "").trim();
  if (!t) return "-";
  const r = new Date(t);
  return Number.isNaN(r.getTime()) ? n(t) : n(r.toLocaleString());
}
function L(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  const r = new Date(t);
  if (Number.isNaN(r.getTime())) return "";
  const s = Date.now() - r.getTime(), o = Math.floor(s / 6e4), i = Math.floor(s / 36e5), a = Math.floor(s / 864e5);
  return o < 1 ? "just now" : o < 60 ? `${o}m ago` : i < 24 ? `${i}h ago` : a < 7 ? `${a}d ago` : r.toLocaleDateString();
}
function z(e) {
  switch (e) {
    case "active":
    case "ready":
    case "synced":
    case "high":
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "pending":
    case "pending_review":
    case "stale":
    case "medium":
    case "processing":
      return "bg-amber-100 text-amber-800";
    case "failed":
    case "archived":
    case "rejected":
    case "low":
    case "error":
      return "bg-red-100 text-red-800";
    case "google_docs":
    case "google_drive":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}
function c(e, t = "-") {
  const r = String(e ?? "").trim();
  return r ? `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${z(r)}">${n(r.replace(/_/g, " "))}</span>` : `<span class="text-gray-400">${n(t)}</span>`;
}
function y(e, t) {
  const r = String(e ?? "").trim(), s = String(t ?? "").trim();
  return !r || !s ? r : r.replace(/:source_document_id/g, encodeURIComponent(s)).replace(/:source_revision_id/g, encodeURIComponent(s)).replace(new RegExp(encodeURIComponent(":source_document_id"), "g"), encodeURIComponent(s)).replace(new RegExp(encodeURIComponent(":source_revision_id"), "g"), encodeURIComponent(s));
}
function V(e, t) {
  const r = String(e ?? "").trim(), s = String(t ?? "").trim().replace(/^\?+/, "");
  return !r || !s ? r : r.includes("?") ? `${r}&${s}` : `${r}?${s}`;
}
function Q() {
  return typeof window > "u" || typeof window.location?.search != "string" ? "" : window.location.search.replace(/^\?+/, "").trim();
}
function G(e) {
  return `${String(e.base_path ?? "").trim().replace(/\/+$/, "") || ""}/esign`;
}
function T(e, t, r = Q()) {
  const s = String(e ?? "").trim(), o = String(t.api_base_path ?? "").trim().replace(/\/+$/, "");
  return s ? !o || !s.startsWith(o) ? s : V(`${G(t)}${s.slice(o.length)}`, r) : "";
}
function B(e, t, ...r) {
  for (const s of r) {
    const o = T(e?.[s], t);
    if (o) return o;
  }
  return "";
}
var oe = [d.SOURCE_DOCUMENT, d.SOURCE_REVISION];
function K(e, t) {
  const r = B(e.links, t, "workspace", "anchor", "source", "self");
  return r || y(t.routes?.source_detail, e.source?.id ?? "");
}
function J(e, t) {
  const r = T(e.drill_in?.href, t) || B(e.links, t, "anchor", "workspace", "comments", "artifacts", "source", "self");
  return r || (e.result_kind === d.SOURCE_REVISION && e.revision?.id ? y(t.routes?.source_revision, e.revision.id) : e.source?.id ? y(t.routes?.source_detail, e.source.id) : "");
}
function p(e, t, r = !1) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="rounded-full bg-gray-100 p-3 mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900">${n(e)}</h3>
      <p class="mt-1 text-sm text-gray-500">${n(t)}</p>
      ${r ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ""}
    </div>
  `;
}
function u() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
      <span class="ml-3 text-sm text-gray-500">Loading...</span>
    </div>
  `;
}
function g(e) {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Something went wrong</h3>
          <p class="mt-1 text-sm text-red-700">${n(e.message)}</p>
          <button type="button" data-runtime-action="refresh" class="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Try again
          </button>
        </div>
      </div>
    </div>
  `;
}
function W(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <form data-runtime-form="source-browser" class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="sr-only" for="browser-search">Search</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input type="search" id="browser-search" name="q" value="${n(t.query ?? "")}" placeholder="Search sources..." class="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div class="w-40">
            <label class="sr-only" for="browser-provider">Provider</label>
            <select id="browser-provider" name="provider_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All providers</option>
              <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
              <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
            </select>
          </div>
          <div class="w-36">
            <label class="sr-only" for="browser-status">Status</label>
            <select id="browser-status" name="status" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All statuses</option>
              <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
              <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
            </select>
          </div>
          <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" name="has_pending_candidates" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_pending_candidates ? "checked" : ""} />
            <span>Pending review</span>
          </label>
        </div>
        <div class="flex items-center gap-2">
          <button type="submit" class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            Apply
          </button>
          <button type="button" data-runtime-action="clear-browser-filters" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </form>
    </div>
  `;
}
function _(e, t, r) {
  const s = W(e), o = e.items ?? [];
  if (o.length === 0) {
    const i = e.empty_state;
    return `
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        ${s}
        ${p(i?.title ?? "No sources found", i?.description ?? "Try adjusting your filters or search terms.", !0)}
      </div>
    `;
  }
  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      ${s}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Revision</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
              <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${o.map((i) => {
    const a = i.source?.id ?? "", m = K(i, {
      base_path: r.base_path,
      api_base_path: r.api_base_path,
      routes: t
    }), f = i.provider?.kind ?? "";
    return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">
            <a href="${n(m)}" class="font-medium text-gray-900 hover:text-blue-600">${n(i.source?.label ?? "Untitled")}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${n(a.substring(0, 12))}...</p>
          </td>
          <td class="px-4 py-3">
            ${c(f)}
            <p class="mt-0.5 text-xs text-gray-500">${n(i.provider?.external_file_id ?? "-")}</p>
          </td>
          <td class="px-4 py-3 text-sm text-gray-700">
            <p>${n(i.latest_revision?.provider_revision_hint ?? "-")}</p>
            <p class="mt-0.5 text-xs text-gray-500">${L(i.latest_revision?.modified_time)}</p>
          </td>
          <td class="px-4 py-3">${c(i.status)}</td>
          <td class="px-4 py-3 text-sm">
            ${(i.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${i.pending_candidate_count} pending</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="px-4 py-3 text-right">
            <a href="${n(m)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
          </td>
        </tr>
      `;
  }).join("")}</tbody>
        </table>
      </div>
      ${w(e.page_info, "source-browser-page")}
    </div>
  `;
}
function k(e) {
  return e.empty_state?.kind && e.empty_state.kind !== "none" ? p(e.empty_state.title ?? "Source unavailable", e.empty_state.description ?? "", !0) : `
    <div class="space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${n(e.source?.label ?? "Source")}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${n(e.source?.id ?? "-")}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <div class="flex flex-wrap gap-2">
        ${c(e.status)}
        ${e.lineage_confidence ? `<span class="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">Confidence: ${n(e.lineage_confidence)}</span>` : ""}
        <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${e.revision_count ?? 0} revisions</span>
        ${(e.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${e.pending_candidate_count} pending</span>` : ""}
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</h3>
          <p class="mt-2 text-sm font-medium text-gray-900">${n(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
          <p class="mt-1 text-xs text-gray-500">${n(e.provider?.external_file_id ?? "-")}</p>
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Latest Revision</h3>
          <p class="mt-2 text-sm font-medium text-gray-900">${n(e.latest_revision?.provider_revision_hint ?? e.latest_revision?.id ?? "-")}</p>
          <p class="mt-1 text-xs text-gray-500">${R(e.latest_revision?.modified_time)}</p>
        </div>
      </div>
    </div>
  `;
}
function $(e) {
  return e.empty_state?.kind && e.empty_state.kind !== "none" ? p(e.empty_state.title ?? "Revision unavailable", e.empty_state.description ?? "", !0) : `
    <div class="space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${n(e.revision?.provider_revision_hint ?? "Revision")}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${n(e.revision?.id ?? "-")}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint Status</h3>
          <div class="mt-2">${c(e.fingerprint_status?.status)}</div>
          ${e.fingerprint_status?.error_message ? `<p class="mt-2 text-sm text-red-600">${n(e.fingerprint_status.error_message)}</p>` : ""}
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</h3>
          <div class="mt-2">${c(e.fingerprint_processing?.state)}</div>
          ${e.fingerprint_processing?.status_label ? `<p class="mt-2 text-sm text-gray-600">${n(e.fingerprint_processing.status_label)}</p>` : ""}
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</h3>
          <p class="mt-1 text-sm text-gray-900">${n(e.source?.label ?? e.source?.id ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</h3>
          <p class="mt-1 text-sm text-gray-900">${n(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Modified</h3>
          <p class="mt-1 text-sm text-gray-900">${R(e.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${e.fingerprint_status?.evidence_available ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  `;
}
function S(e) {
  const t = e.items ?? [];
  if (t.length === 0) return p(e.empty_state?.title ?? "No artifacts", e.empty_state?.description ?? "No artifacts have been generated for this revision.", !0);
  const r = t.map((s) => `
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${c(s.artifact_kind)}
              ${c(s.compatibility_tier)}
            </div>
            ${c(s.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-gray-500">Object Key</dt>
              <dd class="mt-0.5 font-medium text-gray-900 font-mono text-xs truncate">${n(s.object_key ?? "-")}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Pages</dt>
              <dd class="mt-0.5 font-medium text-gray-900">${n(s.page_count ?? "-")}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-gray-500">SHA256</dt>
              <dd class="mt-0.5 font-mono text-xs text-gray-700 truncate">${n(s.sha256 ?? "-")}</dd>
            </div>
          </dl>
        </div>
      `).join("");
  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Artifacts</h2>
          <p class="mt-1 text-sm text-gray-500">${t.length} artifact${t.length !== 1 ? "s" : ""}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="grid gap-4">${r}</div>
    </div>
  `;
}
function Y(e) {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${c(e.status)}
          ${e.sync_status ? c(e.sync_status) : ""}
        </div>
        <span class="text-xs text-gray-500">${L(e.last_synced_at)}</span>
      </div>
      <p class="mt-3 text-sm font-medium text-gray-900">${n(e.anchor?.label ?? "Comment Thread")}</p>
      <p class="mt-1 text-sm text-gray-600 line-clamp-2">${n(e.body_preview ?? "")}</p>
      <div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ${n(e.author_name ?? "Unknown")}
        </span>
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          ${e.message_count ?? 0} messages
        </span>
        ${(e.reply_count ?? 0) > 0 ? `<span>${e.reply_count} replies</span>` : ""}
      </div>
    </div>
  `;
}
function C(e) {
  const t = e.items ?? [];
  return t.length === 0 ? p(e.empty_state?.title ?? "No comments", e.empty_state?.description ?? "No comments have been synced for this revision.", !0) : `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Comments</h2>
          ${c(e.sync_status ?? "unknown")}
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="space-y-3">${t.map(Y).join("")}</div>
      ${w(e.page_info, "source-comment-page")}
    </div>
  `;
}
function X(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
      <form data-runtime-form="source-search" class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <div class="flex-1 min-w-[240px]">
            <label class="sr-only" for="search-query">Search</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input type="search" id="search-query" name="q" value="${n(t.query ?? "")}" placeholder="Search sources, revisions, comments..." class="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" class="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Search
          </button>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="w-40">
            <select name="provider_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All providers</option>
              <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
              <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
            </select>
          </div>
          <div class="w-32">
            <select name="status" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All statuses</option>
              <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
              <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
              <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
            </select>
          </div>
          <div class="w-36">
            <select name="result_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All types</option>
              <option value="${d.SOURCE_DOCUMENT}" ${t.result_kind === d.SOURCE_DOCUMENT ? "selected" : ""}>Sources</option>
              <option value="${d.SOURCE_REVISION}" ${t.result_kind === d.SOURCE_REVISION ? "selected" : ""}>Revisions</option>
            </select>
          </div>
          <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" name="has_comments" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_comments ? "checked" : ""} />
            <span>Has comments</span>
          </label>
          <button type="button" data-runtime-action="clear-search-filters" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </form>
    </div>
  `;
}
function M(e, t, r) {
  const s = X(e), o = e.items ?? [];
  if (o.length === 0) {
    const a = e.empty_state;
    return `
      ${s}
      ${p(a?.title ?? "No results found", a?.description ?? "Try adjusting your search terms or filters.", !1)}
    `;
  }
  const i = o.map((a) => {
    const m = J(a, {
      base_path: r.base_path,
      api_base_path: r.api_base_path,
      routes: t
    }), f = a.matched_fields ?? [], h = a.comment_count, P = h !== void 0 && h > 0;
    return `
        <a href="${n(m)}" class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${c(a.result_kind)}
              ${c(a.provider?.kind)}
            </div>
            ${P ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">${h} comment${h !== 1 ? "s" : ""}</span>` : ""}
          </div>
          <h3 class="mt-2 text-sm font-medium text-gray-900">${n(a.summary ?? a.source?.label ?? "Result")}</h3>
          <p class="mt-1 text-sm text-gray-500">${n(a.source?.id ?? "")}</p>
          ${f.length > 0 ? `
            <div class="mt-2 flex flex-wrap gap-1">
              ${f.map((I) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${n(I)}</span>`).join("")}
            </div>
          ` : ""}
        </a>
      `;
  }).join("");
  return `
    ${s}
    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm text-gray-500">${e.page_info?.total_count ?? o.length} result${(e.page_info?.total_count ?? o.length) !== 1 ? "s" : ""}</p>
    </div>
    <div class="grid gap-3">${i}</div>
    ${w(e.page_info, "source-search-page")}
  `;
}
function w(e, t) {
  const r = Number(e?.page ?? 1), s = Number(e?.total_count ?? 0), o = Number(e?.page_size ?? 20);
  if (s <= 0 || s <= o) return "";
  const i = o > 0 ? Math.ceil(s / o) : 1;
  return `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4 rounded-b-xl">
      <div class="text-sm text-gray-500">
        Showing <span class="font-medium">${(r - 1) * o + 1}</span> to <span class="font-medium">${Math.min(r * o, s)}</span> of <span class="font-medium">${s}</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          data-runtime-action="${n(t)}"
          data-page="${r - 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${r <= 1 ? "disabled" : ""}
        >
          Previous
        </button>
        <span class="inline-flex items-center px-3 py-1.5 text-sm text-gray-500">
          Page ${r} of ${i}
        </span>
        <button
          type="button"
          data-runtime-action="${n(t)}"
          data-page="${r + 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${r >= i ? "disabled" : ""}
        >
          Next
        </button>
      </div>
    </div>
  `;
}
var Z = class {
  constructor(e) {
    this.liveController = null, this.hasLiveContract = !1, this.abortController = new AbortController(), this.page = e.page, this.config = e.config, this.model = e.model, this.marker = e.marker, this.root = e.root;
  }
  async init() {
    this.renderFromModel(), this.bindEvents(), this.bootstrapLiveController();
  }
  destroy() {
    this.abortController.abort();
  }
  bindEvents() {
    this.root.addEventListener("click", (e) => {
      const t = e.target instanceof Element ? e.target.closest("[data-runtime-action]") : null;
      if (!t) return;
      const r = t.dataset.runtimeAction ?? "";
      if (r === "refresh") {
        e.preventDefault(), this.refresh();
        return;
      }
      if (r === "clear-browser-filters") {
        e.preventDefault(), this.clearBrowserFilters();
        return;
      }
      if (r === "clear-search-filters") {
        e.preventDefault(), this.clearSearchFilters();
        return;
      }
      if (r === "source-browser-page" || r === "source-comment-page" || r === "source-search-page") {
        e.preventDefault();
        const s = Number.parseInt(t.dataset.page ?? "1", 10);
        if (!Number.isFinite(s) || s <= 0) return;
        this.goToPage(r, s);
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("submit", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLFormElement)) return;
      const r = t.dataset.runtimeForm ?? "";
      if (r === "source-browser") {
        e.preventDefault();
        const s = new FormData(t);
        this.applyBrowserFilters({
          query: l(s.get("q")),
          provider_kind: l(s.get("provider_kind")),
          status: l(s.get("status")),
          has_pending_candidates: s.get("has_pending_candidates") ? !0 : void 0
        });
      }
      if (r === "source-search") {
        e.preventDefault();
        const s = new FormData(t);
        this.applySearchFilters({
          query: l(s.get("q")),
          provider_kind: l(s.get("provider_kind")),
          status: l(s.get("status")),
          result_kind: l(s.get("result_kind")),
          has_comments: s.get("has_comments") ? !0 : void 0
        });
      }
    }, { signal: this.abortController.signal });
  }
  bootstrapLiveController() {
    const e = String(this.config.api_base_path ?? "").trim(), t = l(this.config.context?.source_document_id), r = l(this.config.context?.source_revision_id), s = (o, i = this.page) => {
      this.liveController = o, D(i, o);
    };
    switch (this.page) {
      case "admin.sources.browser":
        s(F({
          apiBasePath: e,
          onStateChange: (o) => this.renderBrowserState(o)
        }));
        break;
      case "admin.sources.detail":
        if (!t) return;
        s(N({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (o) => this.renderDetailState(o)
        }));
        break;
      case "admin.sources.revision_inspector":
        if (!r) return;
        s(A({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (o) => this.renderRevisionState(o)
        }));
        break;
      case "admin.sources.comment_inspector":
        if (!r) return;
        s(O({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (o) => this.renderCommentState(o)
        }));
        break;
      case "admin.sources.artifact_inspector":
        if (!r) return;
        s(E({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (o) => this.renderArtifactState(o)
        }));
        break;
      case "admin.sources.search":
        s(U({
          apiBasePath: e,
          onStateChange: (o) => this.renderSearchState(o)
        }));
        break;
    }
  }
  renderFromModel() {
    const e = this.model.contract;
    switch (this.page) {
      case "admin.sources.browser":
        this.root.innerHTML = _(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.detail":
        this.root.innerHTML = k(e);
        return;
      case "admin.sources.revision_inspector":
        this.root.innerHTML = $(e);
        return;
      case "admin.sources.comment_inspector":
        this.root.innerHTML = C(e);
        return;
      case "admin.sources.artifact_inspector":
        this.root.innerHTML = S(e);
        return;
      case "admin.sources.search":
        this.root.innerHTML = M(e, this.config.routes ?? {}, this.config);
        return;
    }
  }
  renderBrowserState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.listSources && (this.hasLiveContract = !0, this.root.innerHTML = _(e.contracts.listSources, this.config.routes ?? {}, this.config));
    }
  }
  renderDetailState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.sourceDetail && (this.hasLiveContract = !0, this.root.innerHTML = k(e.contracts.sourceDetail));
    }
  }
  renderRevisionState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.revisionDetail && (this.hasLiveContract = !0, this.root.innerHTML = $(e.contracts.revisionDetail));
    }
  }
  renderCommentState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.commentPage && (this.hasLiveContract = !0, this.root.innerHTML = C(e.contracts.commentPage));
    }
  }
  renderArtifactState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.artifactPage && (this.hasLiveContract = !0, this.root.innerHTML = S(e.contracts.artifactPage));
    }
  }
  renderSearchState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = u();
        return;
      }
      if (e.error) {
        this.root.innerHTML = g(e.error);
        return;
      }
      e.contracts?.searchResults && (this.hasLiveContract = !0, this.root.innerHTML = M(e.contracts.searchResults, this.config.routes ?? {}, this.config));
    }
  }
  async refresh() {
    if (this.liveController) {
      if ("refresh" in this.liveController && typeof this.liveController.refresh == "function") {
        await this.liveController.refresh();
        return;
      }
      if ("fetchSources" in this.liveController && typeof this.liveController.fetchSources == "function") {
        const e = this.liveController.getState().contracts?.query ?? {};
        await this.liveController.fetchSources(e);
      }
    }
  }
  async goToPage(e, t) {
    e === "source-browser-page" && this.liveController instanceof b && await this.liveController.goToPage(t), e === "source-comment-page" && this.liveController instanceof q && await this.liveController.goToPage(t), e === "source-search-page" && this.liveController instanceof x && await this.liveController.goToPage(t);
  }
  async clearBrowserFilters() {
    this.liveController instanceof b && await this.liveController.applyFilters({
      query: void 0,
      provider_kind: void 0,
      status: void 0,
      has_pending_candidates: void 0,
      sort: void 0
    });
  }
  async clearSearchFilters() {
    this.liveController instanceof x && await this.liveController.applyFilters({
      query: void 0,
      provider_kind: void 0,
      status: void 0,
      result_kind: void 0,
      relationship_state: void 0,
      comment_sync_status: void 0,
      revision_hint: void 0,
      has_comments: void 0,
      sort: void 0
    });
  }
  async applyBrowserFilters(e) {
    this.liveController instanceof b && await this.liveController.applyFilters(e);
  }
  async applySearchFilters(e) {
    this.liveController instanceof x && await this.liveController.applyFilters(e);
  }
};
function l(e) {
  const t = String(e ?? "").trim();
  return t || void 0;
}
function H() {
  const e = document.querySelector('[data-esign-page^="admin.sources."]'), t = document.querySelector("[data-source-management-runtime-root]");
  if (!e || !t) return null;
  const r = v("esign-page-config"), s = v("source-management-page-model"), o = String(r?.page ?? e.dataset.esignPage ?? "").trim();
  if (!o) return null;
  const i = new Z({
    page: o,
    config: r ?? {},
    model: s ?? {},
    marker: e,
    root: t
  });
  return i.init(), i;
}
function ee() {
  const e = {
    success: !1,
    page: null,
    surface: null,
    hasBackendConfig: !1,
    hasBackendPageModel: !1,
    hasBackendRoutes: !1,
    controllerMounted: !1,
    issues: []
  }, t = document.querySelector('[data-esign-page^="admin.sources."]'), r = document.querySelector("[data-source-management-runtime-root]");
  if (!t)
    return e.issues.push("Missing page marker element [data-esign-page]"), e;
  if (!r)
    return e.issues.push("Missing runtime root element [data-source-management-runtime-root]"), e;
  const s = v("esign-page-config"), o = v("source-management-page-model");
  e.hasBackendConfig = s !== null && typeof s.api_base_path == "string", e.hasBackendConfig || e.issues.push("Backend config missing or invalid - no api_base_path"), e.hasBackendPageModel = o !== null && typeof o.surface == "string", e.hasBackendPageModel || e.issues.push("Backend page model missing or invalid - no surface"), e.hasBackendRoutes = s?.routes !== void 0 && typeof s.routes == "object", e.hasBackendRoutes || e.issues.push("Backend routes missing from config");
  const i = String(s?.page ?? t.dataset.esignPage ?? "").trim();
  if (e.page = i || null, e.surface = o?.surface ?? t.dataset.sourceManagementSurface ?? null, !i)
    return e.issues.push("Page identifier not found in config or marker"), e;
  for (const a of [
    "_clientBootstrap",
    "_fallbackConfig",
    "_synthesizedRoutes",
    "_generatedApiPath"
  ])
    s && a in s && e.issues.push(`Forbidden client-side bootstrap shim detected: ${a}`), o && a in o && e.issues.push(`Forbidden client-side bootstrap shim detected: ${a}`);
  return e.controllerMounted = H() !== null, e.controllerMounted || e.issues.push("Runtime controller failed to mount"), e.success = e.hasBackendConfig && e.hasBackendPageModel && e.hasBackendRoutes && e.controllerMounted && e.issues.length === 0, e;
}
function ne() {
  const e = ee();
  if (!e.success) throw new Error(`V2 runtime initialization failed: ${e.issues.join("; ")}`);
}
function ie(e) {
  if (console.group("V2 Source-Management Runtime Initialization"), console.log(`Success: ${e.success ? "YES" : "NO"}`), console.log(`Page: ${e.page ?? "unknown"}`), console.log(`Surface: ${e.surface ?? "unknown"}`), console.log(`Backend Config: ${e.hasBackendConfig ? "✓" : "✗"}`), console.log(`Backend Page Model: ${e.hasBackendPageModel ? "✓" : "✗"}`), console.log(`Backend Routes: ${e.hasBackendRoutes ? "✓" : "✗"}`), console.log(`Controller Mounted: ${e.controllerMounted ? "✓" : "✗"}`), e.issues.length > 0) {
    console.group("Issues");
    for (const t of e.issues) console.log(`- ${t}`);
    console.groupEnd();
  }
  console.groupEnd();
}
typeof document < "u" && j(() => {
  document.querySelector('[data-esign-page^="admin.sources."]') && H();
});
export {
  ee as a,
  J as c,
  H as i,
  T as l,
  Z as n,
  ie as o,
  ne as r,
  K as s,
  oe as t
};

//# sourceMappingURL=source-management-runtime-CZKflp5N.js.map