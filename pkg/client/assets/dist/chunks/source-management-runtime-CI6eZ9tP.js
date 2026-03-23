import { o as b } from "./lineage-contracts-Clh6Zaep.js";
import { c as q } from "./dom-helpers-CDdChTSn.js";
import { c as W, d as Q, g as T, h as G, l as K, n as P, p as J, r as Y, s as H, u as X, y as Z } from "./source-management-pages-Cz6zy9go.js";
function M(e) {
  const t = document.getElementById(e)?.textContent?.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (s) {
    return console.warn(`[SourceManagementRuntime] Failed to parse ${e}:`, s), null;
  }
}
function i(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function D(e) {
  const t = String(e ?? "").trim();
  if (!t) return "-";
  const s = new Date(t);
  return Number.isNaN(s.getTime()) ? i(t) : i(s.toLocaleString());
}
function O(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  const s = new Date(t);
  if (Number.isNaN(s.getTime())) return "";
  const r = Date.now() - s.getTime(), n = Math.floor(r / 6e4), o = Math.floor(r / 36e5), l = Math.floor(r / 864e5);
  return n < 1 ? "just now" : n < 60 ? `${n}m ago` : o < 24 ? `${o}h ago` : l < 7 ? `${l}d ago` : s.toLocaleDateString();
}
function ee(e) {
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
function d(e, t = "-") {
  const s = String(e ?? "").trim();
  return s ? `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${ee(s)}">${i(s.replace(/_/g, " "))}</span>` : `<span class="text-gray-400">${i(t)}</span>`;
}
function x(e, t) {
  const s = String(e ?? "").trim(), r = String(t ?? "").trim();
  return !s || !r ? s : s.replace(/:source_document_id/g, encodeURIComponent(r)).replace(/:source_revision_id/g, encodeURIComponent(r)).replace(new RegExp(encodeURIComponent(":source_document_id"), "g"), encodeURIComponent(r)).replace(new RegExp(encodeURIComponent(":source_revision_id"), "g"), encodeURIComponent(r));
}
function R(e, t) {
  const s = String(e ?? "").trim(), r = String(t ?? "").trim().replace(/^\?+/, "");
  if (!s || !r) return s;
  try {
    const n = new URL(s, "https://runtime.invalid");
    return new URLSearchParams(r).forEach((o, l) => {
      n.searchParams.has(l) || n.searchParams.append(l, o);
    }), `${n.pathname}${n.search}${n.hash}`;
  } catch {
    return s.includes("?") ? `${s}&${r}` : `${s}?${r}`;
  }
}
function te() {
  return typeof window > "u" || typeof window.location?.search != "string" ? "" : window.location.search.replace(/^\?+/, "").trim();
}
function _(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  try {
    return new URL(t, "https://runtime.invalid").pathname;
  } catch {
    return t.split("?")[0] ?? "";
  }
}
function re(e) {
  return e ? [
    e.source_browser,
    e.source_search,
    e.source_detail,
    e.source_workspace,
    e.source_revision,
    e.source_comment_inspector,
    e.source_artifact_inspector
  ].map((t) => _(String(t ?? ""))).filter((t) => t.length > 0) : [];
}
function se(e, t) {
  const s = _(e).split("/").filter(Boolean), r = _(t).split("/").filter(Boolean);
  return s.length !== r.length ? !1 : r.every((n, o) => n.startsWith(":") || n === s[o]);
}
function v(e, t) {
  const s = _(String(e ?? ""));
  return s ? re(t).some((r) => se(s, r)) : !1;
}
function C(e, t, s) {
  const r = String(e ?? "").trim();
  if (!r) return "";
  try {
    const n = new URL(r, "https://runtime.invalid");
    return new URL(t, "https://runtime.invalid").searchParams.forEach((o, l) => {
      n.searchParams.has(l) || n.searchParams.append(l, o);
    }), R(`${n.pathname}${n.search}${n.hash}`, s);
  } catch {
    return R(r, s);
  }
}
function ne(e, t) {
  const s = String(e ?? "").trim(), r = String(t.api_base_path ?? "").trim().replace(/\/+$/, "");
  if (!s || !r) return "";
  const n = _(s);
  return n.startsWith(r) ? n.slice(r.length) : "";
}
function L(e, t, s = te()) {
  const r = String(e ?? "").trim();
  if (!r) return "";
  const n = ne(r, t);
  if (!n) return v(r, t.routes) ? R(r, s) : r.startsWith("/") ? "" : r;
  const o = n.match(/^\/sources\/([^/]+)\/workspace$/), l = n.match(/^\/sources\/([^/]+)$/), u = n.match(/^\/source-revisions\/([^/]+)$/), p = n.match(/^\/source-revisions\/([^/]+)\/comments$/), f = n.match(/^\/source-revisions\/([^/]+)\/artifacts$/);
  if (n === "/sources") return R(String(t.routes?.source_browser ?? ""), s);
  if (n === "/source-search") return R(String(t.routes?.source_search ?? ""), s);
  if (o) {
    const c = decodeURIComponent(o[1] ?? ""), w = x(String(t.routes?.source_workspace ?? t.routes?.source_detail ?? ""), c);
    return v(w, t.routes) ? C(w, r, s) : "";
  }
  if (l) {
    const c = x(t.routes?.source_detail, decodeURIComponent(l[1] ?? ""));
    return v(c, t.routes) ? C(c, r, s) : "";
  }
  if (p) {
    const c = x(t.routes?.source_comment_inspector, decodeURIComponent(p[1] ?? ""));
    return v(c, t.routes) ? C(c, r, s) : "";
  }
  if (f) {
    const c = x(t.routes?.source_artifact_inspector, decodeURIComponent(f[1] ?? ""));
    return v(c, t.routes) ? C(c, r, s) : "";
  }
  if (u) {
    const c = x(t.routes?.source_revision, decodeURIComponent(u[1] ?? ""));
    return v(c, t.routes) ? C(c, r, s) : "";
  }
  return "";
}
function y(e, t, ...s) {
  for (const r of s) {
    const n = L(e?.[r], t);
    if (n) return n;
  }
  return "";
}
var fe = [b.SOURCE_DOCUMENT, b.SOURCE_REVISION];
function ie(e, t) {
  const s = y(e.links, t, "workspace", "anchor", "source", "self");
  if (s) return s;
  const r = x(t.routes?.source_workspace ?? t.routes?.source_detail, e.source?.id ?? "");
  return v(r, t.routes) ? r : "";
}
function oe(e, t) {
  const s = L(e.drill_in?.href, t) || y(e.links, t, "anchor", "workspace", "comments", "artifacts", "source", "self");
  if (s) return s;
  if (e.result_kind === b.SOURCE_REVISION && e.revision?.id) {
    const r = x(t.routes?.source_revision, e.revision.id);
    return v(r, t.routes) ? r : "";
  }
  if (e.source?.id) {
    const r = x(t.routes?.source_workspace ?? t.routes?.source_detail, e.source.id);
    return v(r, t.routes) ? r : "";
  }
  return "";
}
function g(e, t, s = !1) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="rounded-full bg-gray-100 p-3 mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900">${i(e)}</h3>
      <p class="mt-1 text-sm text-gray-500">${i(t)}</p>
      ${s ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ""}
    </div>
  `;
}
function $() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
      <span class="ml-3 text-sm text-gray-500">Loading...</span>
    </div>
  `;
}
function k(e) {
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
          <p class="mt-1 text-sm text-red-700">${i(e.message)}</p>
          <button type="button" data-runtime-action="refresh" class="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Try again
          </button>
        </div>
      </div>
    </div>
  `;
}
function ae(e) {
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
              <input type="search" id="browser-search" name="q" value="${i(t.query ?? "")}" placeholder="Search sources..." class="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
function j(e, t, s) {
  const r = ae(e), n = e.items ?? [];
  if (n.length === 0) {
    const o = e.empty_state;
    return `
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        ${r}
        ${g(o?.title ?? "No sources found", o?.description ?? "Try adjusting your filters or search terms.", !0)}
      </div>
    `;
  }
  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      ${r}
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
          <tbody class="bg-white divide-y divide-gray-200">${n.map((o) => {
    const l = o.source?.id ?? "", u = ie(o, {
      base_path: s.base_path,
      api_base_path: s.api_base_path,
      routes: t
    }), p = o.provider?.kind ?? "";
    return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">
            <a href="${i(u)}" class="font-medium text-gray-900 hover:text-blue-600">${i(o.source?.label ?? "Untitled")}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${i(l.substring(0, 12))}...</p>
          </td>
          <td class="px-4 py-3">
            ${d(p)}
            <p class="mt-0.5 text-xs text-gray-500">${i(o.provider?.external_file_id ?? "-")}</p>
          </td>
          <td class="px-4 py-3 text-sm text-gray-700">
            <p>${i(o.latest_revision?.provider_revision_hint ?? "-")}</p>
            <p class="mt-0.5 text-xs text-gray-500">${O(o.latest_revision?.modified_time)}</p>
          </td>
          <td class="px-4 py-3">${d(o.status)}</td>
          <td class="px-4 py-3 text-sm">
            ${(o.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${o.pending_candidate_count} pending</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="px-4 py-3 text-right">
            <a href="${i(u)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
          </td>
        </tr>
      `;
  }).join("")}</tbody>
        </table>
      </div>
      ${B(e.page_info, "source-browser-page")}
    </div>
  `;
}
function S(e, t, s, r) {
  const n = e === String(s ?? "").trim();
  return `
    <section id="workspace-panel-${i(e)}" class="rounded-xl border ${n ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"} p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">${i(t)}</h3>
        ${n ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Active</span>' : ""}
      </div>
      ${r}
    </section>
  `;
}
function le(e, t) {
  const s = e.panels ?? [];
  if (s.length === 0) return "";
  const r = String(e.active_panel ?? "overview").trim();
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="flex flex-wrap gap-2">
        ${s.map((n) => {
    const o = y(n.links, t, "anchor", "workspace", "self"), l = n.id === r, u = n.item_count ?? 0, p = l ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50";
    return o ? `
              <a
                href="${i(o)}"
                data-runtime-workspace-link="panel"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${p}"
              >
                <span>${i(n.label)}</span>
                <span class="${l ? "text-blue-100" : "text-gray-400"}">${i(u)}</span>
              </a>
            ` : `
                <span class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${p}">
                  <span>${i(n.label)}</span>
                  <span class="${l ? "text-blue-100" : "text-gray-400"}">${i(u)}</span>
                </span>
              `;
  }).join("")}
      </div>
    </div>
  `;
}
function N(e, t, s) {
  if (e.empty_state?.kind && e.empty_state.kind !== "none") return g(e.empty_state.title ?? "Workspace unavailable", e.empty_state.description ?? "", !0);
  const r = String(e.active_panel ?? "overview").trim(), n = String(e.active_anchor ?? "").trim(), o = e.continuity, l = [...o.predecessors ?? [], ...o.successors ?? []], u = o.summary ? `<p class="text-sm text-gray-700">${i(o.summary)}</p>` : '<p class="text-sm text-gray-500">No continuity summary available.</p>', p = (e.timeline?.entries ?? []).length > 0 ? `<div class="space-y-3">
          ${e.timeline.entries.map((a) => {
    const m = L(a.drill_in?.href, s) || y(a.links, s, "anchor", "timeline", "workspace", "source", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.revision?.provider_revision_hint ?? a.revision?.id ?? "Revision")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.continuity_summary ?? "Continuity details available from backend workspace timeline.")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${a.is_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Latest</span>' : ""}
                      ${a.is_repeated_handle ? '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Repeated Handle</span>' : ""}
                      ${m ? `<a href="${i(m)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${i(a.comment_count ?? 0)} comments</span>
                    <span>${i(a.agreement_count ?? 0)} agreements</span>
                    <span>${i(a.artifact_count ?? 0)} artifacts</span>
                    <span>${i(a.handle?.external_file_id ?? a.handle?.id ?? "No active handle")}</span>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : g(e.timeline?.empty_state?.title ?? "No revision timeline", e.timeline?.empty_state?.description ?? "No revisions are available in this workspace."), f = (e.agreements?.items ?? []).length > 0 ? `<div class="space-y-3">
          ${e.agreements.items.map((a) => {
    const m = y(a.links, s, "anchor", "workspace", "agreement", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.agreement?.label ?? a.agreement?.id ?? "Agreement")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.document?.label ?? a.document?.id ?? "Linked document")}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${d(a.status)}
                      ${a.is_pinned_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Pinned Latest</span>' : ""}
                      ${m ? `<a href="${i(m)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : g(e.agreements?.empty_state?.title ?? "No related agreements", e.agreements?.empty_state?.description ?? "No agreements are pinned to this source."), c = (e.artifacts?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.artifacts.items.map((a) => {
    const m = L(a.drill_in?.href, s) || y(a.links, s, "anchor", "workspace", "artifacts", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.artifact?.artifact_kind ?? "Artifact")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.revision?.provider_revision_hint ?? a.revision?.id ?? "")}</p>
                    </div>
                    ${m ? `<a href="${i(m)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${i(a.provider?.kind ?? "provider")}</span>
                    <span>${i(a.artifact?.page_count ?? 0)} pages</span>
                    <span class="font-mono">${i(a.artifact?.id ?? "-")}</span>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : g(e.artifacts?.empty_state?.title ?? "No artifacts", e.artifacts?.empty_state?.description ?? "No artifacts are available in this workspace."), w = (e.comments?.items ?? []).length > 0 ? `<div class="space-y-3">${e.comments.items.map(z).join("")}</div>` : g(e.comments?.empty_state?.title ?? "No comments", e.comments?.empty_state?.description ?? "No comment threads are available in this workspace."), V = (e.handles?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.handles.items.map((a) => {
    const m = y(a.links, s, "workspace", "source", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.external_file_id ?? a.id)}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.provider_kind ?? "provider")}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      ${d(a.handle_status)}
                      ${m ? `<a href="${i(m)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : g(e.handles?.empty_state?.title ?? "No handles", e.handles?.empty_state?.description ?? "No handles are available in this workspace.");
  return `
    <div class="p-6 space-y-6">
      <div class="rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">${i(e.source?.label ?? "Source Workspace")}</h2>
            <p class="mt-1 font-mono text-xs text-gray-500">${i(e.source?.id ?? "-")}</p>
          </div>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${d(e.status)}
          ${e.lineage_confidence ? `<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Confidence: ${i(e.lineage_confidence)}</span>` : ""}
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${i(e.revision_count ?? 0)} revisions</span>
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${i(e.handle_count ?? 0)} handles</span>
          ${n ? `<span class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Anchor: ${i(n)}</span>` : ""}
        </div>
      </div>

      ${le(e, s)}

      ${S("overview", "Overview", r, `
          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${i(e.provider?.external_file_id ?? "-")}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Latest Revision</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.latest_revision?.provider_revision_hint ?? e.latest_revision?.id ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${D(e.latest_revision?.modified_time)}</p>
            </div>
          </div>
          <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div class="mb-2 flex items-center justify-between gap-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Continuity</h4>
              ${d(o.status)}
            </div>
            ${u}
            ${o.continuation ? `<p class="mt-3 text-xs text-gray-500">Continuation: ${i(o.continuation.label ?? o.continuation.id ?? "-")}</p>` : ""}
            ${l.length > 0 ? `<p class="mt-2 text-xs text-gray-500">Linked sources: ${l.map((a) => i(a.label ?? a.id ?? "-")).join(", ")}</p>` : ""}
          </div>
        `)}

      ${S("timeline", "Revision Timeline", r, p)}
      ${S("agreements", "Related Agreements", r, f)}
      ${S("artifacts", "Related Artifacts", r, c)}
      ${S("comments", "Related Comments", r, `${e.comments?.sync_status ? `<div class="mb-3">${d(e.comments.sync_status)}</div>` : ""}${w}`)}
      ${S("handles", "Active Handles", r, V)}
    </div>
  `;
}
function I(e) {
  return e.empty_state?.kind && e.empty_state.kind !== "none" ? g(e.empty_state.title ?? "Revision unavailable", e.empty_state.description ?? "", !0) : `
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${i(e.revision?.provider_revision_hint ?? "Revision")}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${i(e.revision?.id ?? "-")}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint Status</h3>
          <div class="mt-2">${d(e.fingerprint_status?.status)}</div>
          ${e.fingerprint_status?.error_message ? `<p class="mt-2 text-sm text-red-600">${i(e.fingerprint_status.error_message)}</p>` : ""}
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</h3>
          <div class="mt-2">${d(e.fingerprint_processing?.state)}</div>
          ${e.fingerprint_processing?.status_label ? `<p class="mt-2 text-sm text-gray-600">${i(e.fingerprint_processing.status_label)}</p>` : ""}
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</h3>
          <p class="mt-1 text-sm text-gray-900">${i(e.source?.label ?? e.source?.id ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</h3>
          <p class="mt-1 text-sm text-gray-900">${i(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Modified</h3>
          <p class="mt-1 text-sm text-gray-900">${D(e.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${e.fingerprint_status?.evidence_available ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  `;
}
function A(e) {
  const t = e.items ?? [];
  if (t.length === 0) return g(e.empty_state?.title ?? "No artifacts", e.empty_state?.description ?? "No artifacts have been generated for this revision.", !0);
  const s = t.map((r) => `
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${d(r.artifact_kind)}
              ${d(r.compatibility_tier)}
            </div>
            ${d(r.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-gray-500">Object Key</dt>
              <dd class="mt-0.5 font-medium text-gray-900 font-mono text-xs truncate">${i(r.object_key ?? "-")}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Pages</dt>
              <dd class="mt-0.5 font-medium text-gray-900">${i(r.page_count ?? "-")}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-gray-500">SHA256</dt>
              <dd class="mt-0.5 font-mono text-xs text-gray-700 truncate">${i(r.sha256 ?? "-")}</dd>
            </div>
          </dl>
        </div>
      `).join("");
  return `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Artifacts</h2>
          <p class="mt-1 text-sm text-gray-500">${t.length} artifact${t.length !== 1 ? "s" : ""}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="grid gap-4">${s}</div>
    </div>
  `;
}
function z(e) {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${d(e.status)}
          ${e.sync_status ? d(e.sync_status) : ""}
        </div>
        <span class="text-xs text-gray-500">${O(e.last_synced_at)}</span>
      </div>
      <p class="mt-3 text-sm font-medium text-gray-900">${i(e.anchor?.label ?? "Comment Thread")}</p>
      <p class="mt-1 text-sm text-gray-600 line-clamp-2">${i(e.body_preview ?? "")}</p>
      <div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ${i(e.author_name ?? "Unknown")}
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
function E(e) {
  const t = e.items ?? [];
  return t.length === 0 ? g(e.empty_state?.title ?? "No comments", e.empty_state?.description ?? "No comments have been synced for this revision.", !0) : `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Comments</h2>
          ${d(e.sync_status ?? "unknown")}
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="space-y-3">${t.map(z).join("")}</div>
      ${B(e.page_info, "source-comment-page")}
    </div>
  `;
}
function ce(e) {
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
              <input type="search" id="search-query" name="q" value="${i(t.query ?? "")}" placeholder="Search sources, revisions, comments..." class="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
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
              <option value="${b.SOURCE_DOCUMENT}" ${t.result_kind === b.SOURCE_DOCUMENT ? "selected" : ""}>Sources</option>
              <option value="${b.SOURCE_REVISION}" ${t.result_kind === b.SOURCE_REVISION ? "selected" : ""}>Revisions</option>
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
function U(e, t, s) {
  const r = ce(e), n = e.items ?? [];
  if (n.length === 0) {
    const l = e.empty_state;
    return `
      ${r}
      ${g(l?.title ?? "No results found", l?.description ?? "Try adjusting your search terms or filters.", !1)}
    `;
  }
  const o = n.map((l) => {
    const u = oe(l, {
      base_path: s.base_path,
      api_base_path: s.api_base_path,
      routes: t
    }), p = l.matched_fields ?? [], f = l.comment_count, c = f !== void 0 && f > 0;
    return `
        <a href="${i(u)}" class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${d(l.result_kind)}
              ${d(l.provider?.kind)}
            </div>
            ${c ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">${f} comment${f !== 1 ? "s" : ""}</span>` : ""}
          </div>
          <h3 class="mt-2 text-sm font-medium text-gray-900">${i(l.summary ?? l.source?.label ?? "Result")}</h3>
          <p class="mt-1 text-sm text-gray-500">${i(l.source?.id ?? "")}</p>
          ${p.length > 0 ? `
            <div class="mt-2 flex flex-wrap gap-1">
              ${p.map((w) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${i(w)}</span>`).join("")}
            </div>
          ` : ""}
        </a>
      `;
  }).join("");
  return `
    ${r}
    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm text-gray-500">${e.page_info?.total_count ?? n.length} result${(e.page_info?.total_count ?? n.length) !== 1 ? "s" : ""}</p>
    </div>
    <div class="grid gap-3">${o}</div>
    ${B(e.page_info, "source-search-page")}
  `;
}
function B(e, t) {
  const s = Number(e?.page ?? 1), r = Number(e?.total_count ?? 0), n = Number(e?.page_size ?? 20);
  if (r <= 0 || r <= n) return "";
  const o = n > 0 ? Math.ceil(r / n) : 1;
  return `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4 rounded-b-xl">
      <div class="text-sm text-gray-500">
        Showing <span class="font-medium">${(s - 1) * n + 1}</span> to <span class="font-medium">${Math.min(s * n, r)}</span> of <span class="font-medium">${r}</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          data-runtime-action="${i(t)}"
          data-page="${s - 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${s <= 1 ? "disabled" : ""}
        >
          Previous
        </button>
        <span class="inline-flex items-center px-3 py-1.5 text-sm text-gray-500">
          Page ${s} of ${o}
        </span>
        <button
          type="button"
          data-runtime-action="${i(t)}"
          data-page="${s + 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${s >= o ? "disabled" : ""}
        >
          Next
        </button>
      </div>
    </div>
  `;
}
var de = class {
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
      const s = t.dataset.runtimeAction ?? "";
      if (s === "refresh") {
        e.preventDefault(), this.refresh();
        return;
      }
      if (s === "clear-browser-filters") {
        e.preventDefault(), this.clearBrowserFilters();
        return;
      }
      if (s === "clear-search-filters") {
        e.preventDefault(), this.clearSearchFilters();
        return;
      }
      if (s === "source-browser-page" || s === "source-comment-page" || s === "source-search-page") {
        e.preventDefault();
        const n = Number.parseInt(t.dataset.page ?? "1", 10);
        if (!Number.isFinite(n) || n <= 0) return;
        this.goToPage(s, n);
      }
      const r = e.target instanceof Element ? e.target.closest("[data-runtime-workspace-link]") : null;
      if (r && this.liveController instanceof W) {
        const n = String(r.getAttribute("href") ?? "").trim();
        n && _(window.location.href) === _(n) && (e.preventDefault(), this.liveController.navigateToHref(n));
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("submit", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLFormElement)) return;
      const s = t.dataset.runtimeForm ?? "";
      if (s === "source-browser") {
        e.preventDefault();
        const r = new FormData(t);
        this.applyBrowserFilters({
          query: h(r.get("q")),
          provider_kind: h(r.get("provider_kind")),
          status: h(r.get("status")),
          has_pending_candidates: r.get("has_pending_candidates") ? !0 : void 0
        });
      }
      if (s === "source-search") {
        e.preventDefault();
        const r = new FormData(t);
        this.applySearchFilters({
          query: h(r.get("q")),
          provider_kind: h(r.get("provider_kind")),
          status: h(r.get("status")),
          result_kind: h(r.get("result_kind")),
          has_comments: r.get("has_comments") ? !0 : void 0
        });
      }
    }, { signal: this.abortController.signal });
  }
  bootstrapLiveController() {
    const e = String(this.config.api_base_path ?? "").trim(), t = h(this.config.context?.source_document_id), s = h(this.config.context?.source_revision_id), r = (n, o = this.page) => {
      this.liveController = n, Z(o, n);
    };
    switch (this.page) {
      case "admin.sources.browser":
        r(X({
          apiBasePath: e,
          onStateChange: (n) => this.renderBrowserState(n)
        }));
        break;
      case "admin.sources.detail":
        if (!t) return;
        r(T({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (n) => this.renderWorkspaceState(n)
        }));
        break;
      case "admin.sources.workspace":
        if (!t) return;
        r(T({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (n) => this.renderWorkspaceState(n)
        }));
        break;
      case "admin.sources.revision_inspector":
        if (!s) return;
        r(J({
          apiBasePath: e,
          sourceRevisionId: s,
          onStateChange: (n) => this.renderRevisionState(n)
        }));
        break;
      case "admin.sources.comment_inspector":
        if (!s) return;
        r(Q({
          apiBasePath: e,
          sourceRevisionId: s,
          onStateChange: (n) => this.renderCommentState(n)
        }));
        break;
      case "admin.sources.artifact_inspector":
        if (!s) return;
        r(K({
          apiBasePath: e,
          sourceRevisionId: s,
          onStateChange: (n) => this.renderArtifactState(n)
        }));
        break;
      case "admin.sources.search":
        r(G({
          apiBasePath: e,
          onStateChange: (n) => this.renderSearchState(n)
        }));
        break;
    }
  }
  renderFromModel() {
    const e = this.model.contract;
    switch (this.page) {
      case "admin.sources.browser":
        this.root.innerHTML = j(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.detail":
      case "admin.sources.workspace":
        this.root.innerHTML = N(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.revision_inspector":
        this.root.innerHTML = I(e);
        return;
      case "admin.sources.comment_inspector":
        this.root.innerHTML = E(e);
        return;
      case "admin.sources.artifact_inspector":
        this.root.innerHTML = A(e);
        return;
      case "admin.sources.search":
        this.root.innerHTML = U(e, this.config.routes ?? {}, this.config);
        return;
    }
  }
  renderBrowserState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.listSources && (this.hasLiveContract = !0, this.root.innerHTML = j(e.contracts.listSources, this.config.routes ?? {}, this.config));
    }
  }
  renderWorkspaceState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.workspace && (this.hasLiveContract = !0, this.root.innerHTML = N(e.contracts.workspace, this.config.routes ?? {}, this.config));
    }
  }
  renderRevisionState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.revisionDetail && (this.hasLiveContract = !0, this.root.innerHTML = I(e.contracts.revisionDetail));
    }
  }
  renderCommentState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.commentPage && (this.hasLiveContract = !0, this.root.innerHTML = E(e.contracts.commentPage));
    }
  }
  renderArtifactState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.artifactPage && (this.hasLiveContract = !0, this.root.innerHTML = A(e.contracts.artifactPage));
    }
  }
  renderSearchState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = $();
        return;
      }
      if (e.error) {
        this.root.innerHTML = k(e.error);
        return;
      }
      e.contracts?.searchResults && (this.hasLiveContract = !0, this.root.innerHTML = U(e.contracts.searchResults, this.config.routes ?? {}, this.config));
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
    e === "source-browser-page" && this.liveController instanceof P && await this.liveController.goToPage(t), e === "source-comment-page" && this.liveController instanceof Y && await this.liveController.goToPage(t), e === "source-search-page" && this.liveController instanceof H && await this.liveController.goToPage(t);
  }
  async clearBrowserFilters() {
    this.liveController instanceof P && await this.liveController.applyFilters({
      query: void 0,
      provider_kind: void 0,
      status: void 0,
      has_pending_candidates: void 0,
      sort: void 0
    });
  }
  async clearSearchFilters() {
    this.liveController instanceof H && await this.liveController.applyFilters({
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
    this.liveController instanceof P && await this.liveController.applyFilters(e);
  }
  async applySearchFilters(e) {
    this.liveController instanceof H && await this.liveController.applyFilters(e);
  }
};
function h(e) {
  const t = String(e ?? "").trim();
  return t || void 0;
}
function F() {
  const e = document.querySelector('[data-esign-page^="admin.sources."]'), t = document.querySelector("[data-source-management-runtime-root]");
  if (!e || !t) return null;
  const s = M("esign-page-config"), r = M("source-management-page-model"), n = String(s?.page ?? e.dataset.esignPage ?? "").trim();
  if (!n) return null;
  const o = new de({
    page: n,
    config: s ?? {},
    model: r ?? {},
    marker: e,
    root: t
  });
  return o.init(), o;
}
function ue() {
  const e = {
    success: !1,
    page: null,
    surface: null,
    hasBackendConfig: !1,
    hasBackendPageModel: !1,
    hasBackendRoutes: !1,
    controllerMounted: !1,
    issues: []
  }, t = document.querySelector('[data-esign-page^="admin.sources."]'), s = document.querySelector("[data-source-management-runtime-root]");
  if (!t)
    return e.issues.push("Missing page marker element [data-esign-page]"), e;
  if (!s)
    return e.issues.push("Missing runtime root element [data-source-management-runtime-root]"), e;
  const r = M("esign-page-config"), n = M("source-management-page-model");
  e.hasBackendConfig = r !== null && typeof r.api_base_path == "string", e.hasBackendConfig || e.issues.push("Backend config missing or invalid - no api_base_path"), e.hasBackendPageModel = n !== null && typeof n.surface == "string", e.hasBackendPageModel || e.issues.push("Backend page model missing or invalid - no surface"), e.hasBackendRoutes = r?.routes !== void 0 && typeof r.routes == "object", e.hasBackendRoutes || e.issues.push("Backend routes missing from config");
  const o = String(r?.page ?? t.dataset.esignPage ?? "").trim();
  if (e.page = o || null, e.surface = n?.surface ?? t.dataset.sourceManagementSurface ?? null, !o)
    return e.issues.push("Page identifier not found in config or marker"), e;
  for (const l of [
    "_clientBootstrap",
    "_fallbackConfig",
    "_synthesizedRoutes",
    "_generatedApiPath"
  ])
    r && l in r && e.issues.push(`Forbidden client-side bootstrap shim detected: ${l}`), n && l in n && e.issues.push(`Forbidden client-side bootstrap shim detected: ${l}`);
  return e.controllerMounted = F() !== null, e.controllerMounted || e.issues.push("Runtime controller failed to mount"), e.success = e.hasBackendConfig && e.hasBackendPageModel && e.hasBackendRoutes && e.controllerMounted && e.issues.length === 0, e;
}
function he() {
  const e = ue();
  if (!e.success) throw new Error(`V2 runtime initialization failed: ${e.issues.join("; ")}`);
}
function ve(e) {
  if (console.group("V2 Source-Management Runtime Initialization"), console.log(`Success: ${e.success ? "YES" : "NO"}`), console.log(`Page: ${e.page ?? "unknown"}`), console.log(`Surface: ${e.surface ?? "unknown"}`), console.log(`Backend Config: ${e.hasBackendConfig ? "✓" : "✗"}`), console.log(`Backend Page Model: ${e.hasBackendPageModel ? "✓" : "✗"}`), console.log(`Backend Routes: ${e.hasBackendRoutes ? "✓" : "✗"}`), console.log(`Controller Mounted: ${e.controllerMounted ? "✓" : "✗"}`), e.issues.length > 0) {
    console.group("Issues");
    for (const t of e.issues) console.log(`- ${t}`);
    console.groupEnd();
  }
  console.groupEnd();
}
typeof document < "u" && q(() => {
  document.querySelector('[data-esign-page^="admin.sources."]') && F();
});
export {
  ue as a,
  ie as c,
  F as i,
  oe as l,
  de as n,
  v as o,
  he as r,
  ve as s,
  fe as t,
  L as u
};

//# sourceMappingURL=source-management-runtime-CI6eZ9tP.js.map