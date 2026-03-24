import { o as $ } from "./lineage-contracts-Clh6Zaep.js";
import { c as ee } from "./dom-helpers-CDdChTSn.js";
import { c as te, d as se, g as z, h as re, l as ne, n as B, p as ie, r as oe, s as H, u as ae, y as le } from "./source-management-pages-Cz6zy9go.js";
function j(e) {
  const t = document.getElementById(e)?.textContent?.trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (r) {
    return console.warn(`[SourceManagementRuntime] Failed to parse ${e}:`, r), null;
  }
}
function i(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function E(e) {
  const t = String(e ?? "").trim();
  if (!t) return "-";
  const r = new Date(t);
  return Number.isNaN(r.getTime()) ? i(t) : i(r.toLocaleString());
}
function ce(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  const r = new Date(t);
  if (Number.isNaN(r.getTime())) return "";
  const s = Date.now() - r.getTime(), n = Math.floor(s / 6e4), o = Math.floor(s / 36e5), l = Math.floor(s / 864e5);
  return n < 1 ? "just now" : n < 60 ? `${n}m ago` : o < 24 ? `${o}h ago` : l < 7 ? `${l}d ago` : r.toLocaleDateString();
}
function de(e) {
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
  const r = String(e ?? "").trim();
  return r ? `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${de(r)}">${i(r.replace(/_/g, " "))}</span>` : `<span class="text-gray-400">${i(t)}</span>`;
}
function x(e, t) {
  const r = String(e ?? "").trim(), s = String(t ?? "").trim();
  return !r || !s ? r : r.replace(/:source_document_id/g, encodeURIComponent(s)).replace(/:source_revision_id/g, encodeURIComponent(s)).replace(new RegExp(encodeURIComponent(":source_document_id"), "g"), encodeURIComponent(s)).replace(new RegExp(encodeURIComponent(":source_revision_id"), "g"), encodeURIComponent(s));
}
function P(e, t) {
  const r = String(e ?? "").trim(), s = String(t ?? "").trim().replace(/^\?+/, "");
  if (!r || !s) return r;
  try {
    const n = new URL(r, "https://runtime.invalid");
    return new URLSearchParams(s).forEach((o, l) => {
      n.searchParams.has(l) || n.searchParams.append(l, o);
    }), `${n.pathname}${n.search}${n.hash}`;
  } catch {
    return r.includes("?") ? `${r}&${s}` : `${r}?${s}`;
  }
}
function ue() {
  return typeof window > "u" || typeof window.location?.search != "string" ? "" : window.location.search.replace(/^\?+/, "").trim();
}
function w(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  try {
    return new URL(t, "https://runtime.invalid").pathname;
  } catch {
    return t.split("?")[0] ?? "";
  }
}
function me(e) {
  return e ? [
    e.source_browser,
    e.source_search,
    e.source_detail,
    e.source_workspace,
    e.source_revision,
    e.source_comment_inspector,
    e.source_artifact_inspector
  ].map((t) => w(String(t ?? ""))).filter((t) => t.length > 0) : [];
}
function pe(e, t) {
  const r = w(e).split("/").filter(Boolean), s = w(t).split("/").filter(Boolean);
  return r.length !== s.length ? !1 : s.every((n, o) => n.startsWith(":") || n === r[o]);
}
function b(e, t) {
  const r = w(String(e ?? ""));
  return r ? me(t).some((s) => pe(r, s)) : !1;
}
function M(e, t, r) {
  const s = String(e ?? "").trim();
  if (!s) return "";
  try {
    const n = new URL(s, "https://runtime.invalid");
    return new URL(t, "https://runtime.invalid").searchParams.forEach((o, l) => {
      n.searchParams.has(l) || n.searchParams.append(l, o);
    }), P(`${n.pathname}${n.search}${n.hash}`, r);
  } catch {
    return P(s, r);
  }
}
function ge(e, t) {
  const r = String(e ?? "").trim(), s = String(t.api_base_path ?? "").trim().replace(/\/+$/, "");
  if (!r || !s) return "";
  const n = w(r);
  return n.startsWith(s) ? n.slice(s.length) : "";
}
function I(e, t, r = ue()) {
  const s = String(e ?? "").trim();
  if (!s) return "";
  const n = ge(s, t);
  if (!n) return b(s, t.routes) ? P(s, r) : s.startsWith("/") ? "" : s;
  const o = n.match(/^\/sources\/([^/]+)\/workspace$/), l = n.match(/^\/sources\/([^/]+)$/), m = n.match(/^\/source-revisions\/([^/]+)$/), u = n.match(/^\/source-revisions\/([^/]+)\/comments$/), y = n.match(/^\/source-revisions\/([^/]+)\/artifacts$/);
  if (n === "/sources") return P(String(t.routes?.source_browser ?? ""), r);
  if (n === "/source-search") return P(String(t.routes?.source_search ?? ""), r);
  if (o) {
    const c = decodeURIComponent(o[1] ?? ""), T = x(String(t.routes?.source_workspace ?? t.routes?.source_detail ?? ""), c);
    return b(T, t.routes) ? M(T, s, r) : "";
  }
  if (l) {
    const c = x(t.routes?.source_detail, decodeURIComponent(l[1] ?? ""));
    return b(c, t.routes) ? M(c, s, r) : "";
  }
  if (u) {
    const c = x(t.routes?.source_comment_inspector, decodeURIComponent(u[1] ?? ""));
    return b(c, t.routes) ? M(c, s, r) : "";
  }
  if (y) {
    const c = x(t.routes?.source_artifact_inspector, decodeURIComponent(y[1] ?? ""));
    return b(c, t.routes) ? M(c, s, r) : "";
  }
  if (m) {
    const c = x(t.routes?.source_revision, decodeURIComponent(m[1] ?? ""));
    return b(c, t.routes) ? M(c, s, r) : "";
  }
  return "";
}
function _(e, t, ...r) {
  for (const s of r) {
    const n = I(e?.[s], t);
    if (n) return n;
  }
  return "";
}
var Re = [$.SOURCE_DOCUMENT, $.SOURCE_REVISION];
function fe(e, t) {
  const r = _(e.links, t, "workspace", "anchor", "source", "self");
  if (r) return r;
  const s = x(t.routes?.source_workspace ?? t.routes?.source_detail, e.source?.id ?? "");
  return b(s, t.routes) ? s : "";
}
function he(e, t) {
  const r = I(e.drill_in?.href, t) || _(e.links, t, "anchor", "workspace", "comments", "artifacts", "source", "self");
  if (r) return r;
  if (e.result_kind === $.SOURCE_REVISION && e.revision?.id) {
    const s = x(t.routes?.source_revision, e.revision.id);
    return b(s, t.routes) ? s : "";
  }
  if (e.source?.id) {
    const s = x(t.routes?.source_workspace ?? t.routes?.source_detail, e.source.id);
    return b(s, t.routes) ? s : "";
  }
  return "";
}
function h(e, t, r = !1) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="rounded-full bg-gray-100 p-3 mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900">${i(e)}</h3>
      <p class="mt-1 text-sm text-gray-500">${i(t)}</p>
      ${r ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ""}
    </div>
  `;
}
function C() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
      <span class="ml-3 text-sm text-gray-500">Loading...</span>
    </div>
  `;
}
function S(e) {
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
var Q = "bg-white border border-gray-200 rounded-xl mb-4 p-4 shadow-sm", k = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", ve = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-500 bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", A = "h-10 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", G = "block w-full h-10 ps-9 pe-8 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-200", L = "block w-full h-10 rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", K = "inline-flex items-center gap-2 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50", N = "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden", p = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", g = "px-6 py-4 align-top";
function J(e, t, r) {
  return `
    <button type="button" data-runtime-action="${i(e)}" class="${r ? ve : k}">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
      ${i(t)}${r ? " (Active)" : ""}
    </button>
  `;
}
function be(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="${Q}">
      <form data-runtime-form="source-browser">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${J("toggle-filters", "Filter", !!(t.provider_kind || t.status || t.has_pending_candidates))}
              <div class="relative flex-1">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="browser-search" name="q" value="${i(t.query ?? "")}" placeholder="Search sources..." class="${G}" />
              </div>
            </div>

            <div id="browser-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-provider">Provider</label>
                  <select id="browser-provider" name="provider_kind" class="${L}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-status">Status</label>
                  <select id="browser-status" name="status" class="${L}">
                    <option value="">All statuses</option>
                    <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${K}">
                    <input type="checkbox" name="has_pending_candidates" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_pending_candidates ? "checked" : ""} />
                    <span>Pending review</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${A}">
                  Apply Filters
                </button>
                <button type="button" data-runtime-action="clear-browser-filters" class="${k}">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="button" data-runtime-action="refresh" class="${k}">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}
function F(e, t, r) {
  const s = be(e), n = e.items ?? [];
  if (n.length === 0) {
    const o = e.empty_state;
    return `
      ${s}
      <div class="${N}">
        ${h(o?.title ?? "No sources found", o?.description ?? "Try adjusting your filters or search terms.", !0)}
      </div>
    `;
  }
  return `
    ${s}
    <div class="${N}">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="${p}">Source</th>
              <th scope="col" class="${p}">Provider</th>
              <th scope="col" class="${p}">Latest Revision</th>
              <th scope="col" class="${p}">Status</th>
              <th scope="col" class="${p}">Review</th>
              <th scope="col" class="${p} text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${n.map((o) => {
    const l = o.source?.id ?? "", m = fe(o, {
      base_path: r.base_path,
      api_base_path: r.api_base_path,
      routes: t
    }), u = o.provider?.kind ?? "";
    return `
        <tr class="hover:bg-gray-50">
          <td class="${g}">
            <a href="${i(m)}" class="font-medium text-gray-900 hover:text-blue-600">${i(o.source?.label ?? "Untitled")}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${i(l.substring(0, 12))}...</p>
          </td>
          <td class="${g}">
            ${d(u)}
            <p class="mt-0.5 text-xs text-gray-500">${i(o.provider?.external_file_id ?? "-")}</p>
          </td>
          <td class="${g} text-sm text-gray-700">
            <p>${i(o.latest_revision?.provider_revision_hint ?? "-")}</p>
            <p class="mt-0.5 text-xs text-gray-500">${E(o.latest_revision?.modified_time)}</p>
          </td>
          <td class="${g}">${d(o.status)}</td>
          <td class="${g} text-sm">
            ${(o.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${o.pending_candidate_count} pending</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${g} text-right">
            <a href="${i(m)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
          </td>
        </tr>
      `;
  }).join("")}</tbody>
        </table>
      </div>
    </div>
    ${D(e.page_info, "source-browser-page")}
  `;
}
function R(e, t, r, s) {
  const n = e === String(r ?? "").trim();
  return `
    <section id="workspace-panel-${i(e)}" class="rounded-xl border ${n ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"} p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">${i(t)}</h3>
        ${n ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Active</span>' : ""}
      </div>
      ${s}
    </section>
  `;
}
function xe(e, t) {
  const r = e.panels ?? [];
  if (r.length === 0) return "";
  const s = String(e.active_panel ?? "overview").trim();
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="flex flex-wrap gap-2">
        ${r.map((n) => {
    const o = _(n.links, t, "anchor", "workspace", "self"), l = n.id === s, m = n.item_count ?? 0, u = l ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50";
    return o ? `
              <a
                href="${i(o)}"
                data-runtime-workspace-link="panel"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${u}"
              >
                <span>${i(n.label)}</span>
                <span class="${l ? "text-blue-100" : "text-gray-400"}">${i(m)}</span>
              </a>
            ` : `
                <span class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${u}">
                  <span>${i(n.label)}</span>
                  <span class="${l ? "text-blue-100" : "text-gray-400"}">${i(m)}</span>
                </span>
              `;
  }).join("")}
      </div>
    </div>
  `;
}
function U(e, t, r) {
  if (e.empty_state?.kind && e.empty_state.kind !== "none") return h(e.empty_state.title ?? "Workspace unavailable", e.empty_state.description ?? "", !0);
  const s = String(e.active_panel ?? "overview").trim(), n = String(e.active_anchor ?? "").trim(), o = e.continuity, l = [...o.predecessors ?? [], ...o.successors ?? []], m = o.summary ? `<p class="text-sm text-gray-700">${i(o.summary)}</p>` : '<p class="text-sm text-gray-500">No continuity summary available.</p>', u = (e.timeline?.entries ?? []).length > 0 ? `<div class="space-y-3">
          ${e.timeline.entries.map((a) => {
    const f = I(a.drill_in?.href, r) || _(a.links, r, "anchor", "timeline", "workspace", "source", "self");
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
                      ${f ? `<a href="${i(f)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
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
        </div>` : h(e.timeline?.empty_state?.title ?? "No revision timeline", e.timeline?.empty_state?.description ?? "No revisions are available in this workspace."), y = (e.agreements?.items ?? []).length > 0 ? `<div class="space-y-3">
          ${e.agreements.items.map((a) => {
    const f = _(a.links, r, "anchor", "workspace", "agreement", "self");
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
                      ${f ? `<a href="${i(f)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : h(e.agreements?.empty_state?.title ?? "No related agreements", e.agreements?.empty_state?.description ?? "No agreements are pinned to this source."), c = (e.artifacts?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.artifacts.items.map((a) => {
    const f = I(a.drill_in?.href, r) || _(a.links, r, "anchor", "workspace", "artifacts", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.artifact?.artifact_kind ?? "Artifact")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.revision?.provider_revision_hint ?? a.revision?.id ?? "")}</p>
                    </div>
                    ${f ? `<a href="${i(f)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${i(a.provider?.kind ?? "provider")}</span>
                    <span>${i(a.artifact?.page_count ?? 0)} pages</span>
                    <span class="font-mono">${i(a.artifact?.id ?? "-")}</span>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : h(e.artifacts?.empty_state?.title ?? "No artifacts", e.artifacts?.empty_state?.description ?? "No artifacts are available in this workspace."), T = (e.comments?.items ?? []).length > 0 ? `<div class="space-y-3">${e.comments.items.map(Y).join("")}</div>` : h(e.comments?.empty_state?.title ?? "No comments", e.comments?.empty_state?.description ?? "No comment threads are available in this workspace."), Z = (e.handles?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.handles.items.map((a) => {
    const f = _(a.links, r, "workspace", "source", "self");
    return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(a.external_file_id ?? a.id)}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(a.provider_kind ?? "provider")}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      ${d(a.handle_status)}
                      ${f ? `<a href="${i(f)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                </div>
              `;
  }).join("")}
        </div>` : h(e.handles?.empty_state?.title ?? "No handles", e.handles?.empty_state?.description ?? "No handles are available in this workspace.");
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

      ${xe(e, r)}

      ${R("overview", "Overview", s, `
          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${i(e.provider?.external_file_id ?? "-")}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Latest Revision</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.latest_revision?.provider_revision_hint ?? e.latest_revision?.id ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${E(e.latest_revision?.modified_time)}</p>
            </div>
          </div>
          <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div class="mb-2 flex items-center justify-between gap-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Continuity</h4>
              ${d(o.status)}
            </div>
            ${m}
            ${o.continuation ? `<p class="mt-3 text-xs text-gray-500">Continuation: ${i(o.continuation.label ?? o.continuation.id ?? "-")}</p>` : ""}
            ${l.length > 0 ? `<p class="mt-2 text-xs text-gray-500">Linked sources: ${l.map((a) => i(a.label ?? a.id ?? "-")).join(", ")}</p>` : ""}
          </div>
        `)}

      ${R("timeline", "Revision Timeline", s, u)}
      ${R("agreements", "Related Agreements", s, y)}
      ${R("artifacts", "Related Artifacts", s, c)}
      ${R("comments", "Related Comments", s, `${e.comments?.sync_status ? `<div class="mb-3">${d(e.comments.sync_status)}</div>` : ""}${T}`)}
      ${R("handles", "Active Handles", s, Z)}
    </div>
  `;
}
function O(e) {
  return e.empty_state?.kind && e.empty_state.kind !== "none" ? h(e.empty_state.title ?? "Revision unavailable", e.empty_state.description ?? "", !0) : `
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
          <p class="mt-1 text-sm text-gray-900">${E(e.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${e.fingerprint_status?.evidence_available ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  `;
}
function q(e) {
  const t = e.items ?? [];
  if (t.length === 0) return h(e.empty_state?.title ?? "No artifacts", e.empty_state?.description ?? "No artifacts have been generated for this revision.", !0);
  const r = t.map((s) => `
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${d(s.artifact_kind)}
              ${d(s.compatibility_tier)}
            </div>
            ${d(s.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-gray-500">Object Key</dt>
              <dd class="mt-0.5 font-medium text-gray-900 font-mono text-xs truncate">${i(s.object_key ?? "-")}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Pages</dt>
              <dd class="mt-0.5 font-medium text-gray-900">${i(s.page_count ?? "-")}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-gray-500">SHA256</dt>
              <dd class="mt-0.5 font-mono text-xs text-gray-700 truncate">${i(s.sha256 ?? "-")}</dd>
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
      <div class="grid gap-4">${r}</div>
    </div>
  `;
}
function Y(e) {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${d(e.status)}
          ${e.sync_status ? d(e.sync_status) : ""}
        </div>
        <span class="text-xs text-gray-500">${ce(e.last_synced_at)}</span>
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
function V(e) {
  const t = e.items ?? [];
  return t.length === 0 ? h(e.empty_state?.title ?? "No comments", e.empty_state?.description ?? "No comments have been synced for this revision.", !0) : `
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
      <div class="space-y-3">${t.map(Y).join("")}</div>
      ${D(e.page_info, "source-comment-page")}
    </div>
  `;
}
function ye(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="${Q}">
      <form data-runtime-form="source-search">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${J("toggle-search-filters", "Filter", !!(t.provider_kind || t.status || t.result_kind || t.relationship_state || t.comment_sync_status || t.revision_hint || t.has_comments))}
              <div class="relative flex-1">
                <label class="sr-only" for="search-query">Search</label>
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="search-query" name="q" value="${i(t.query ?? "")}" placeholder="Search sources, revisions, comments..." class="${G}" />
              </div>
            </div>
            <div id="search-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-provider-kind">Provider</label>
                  <select id="search-provider-kind" name="provider_kind" class="${L}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-status">Status</label>
                  <select id="search-status" name="status" class="${L}">
                    <option value="">All statuses</option>
                    <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-result-kind">Type</label>
                  <select id="search-result-kind" name="result_kind" class="${L}">
                    <option value="">All types</option>
                    <option value="${$.SOURCE_DOCUMENT}" ${t.result_kind === $.SOURCE_DOCUMENT ? "selected" : ""}>Sources</option>
                    <option value="${$.SOURCE_REVISION}" ${t.result_kind === $.SOURCE_REVISION ? "selected" : ""}>Revisions</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${K}">
                    <input type="checkbox" name="has_comments" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_comments ? "checked" : ""} />
                    <span>Has comments</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${A}">
                  Apply Filters
                </button>
                <button type="button" data-runtime-action="clear-search-filters" class="${k}">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="submit" class="${A}">
              Search
            </button>
            <button type="button" data-runtime-action="refresh" class="${k}">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}
function $e(e, t, r) {
  return `
    <div class="${N}">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="${p}">Result</th>
              <th scope="col" class="${p}">Type</th>
              <th scope="col" class="${p}">Provider</th>
              <th scope="col" class="${p}">Matched</th>
              <th scope="col" class="${p}">Comments</th>
              <th scope="col" class="${p} text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${e.map((s) => {
    const n = he(s, {
      base_path: r.base_path,
      api_base_path: r.api_base_path,
      routes: t
    }), o = s.matched_fields ?? [], l = String(s.source?.id ?? "").trim(), m = String(s.revision?.id ?? "").trim(), u = Number(s.comment_count ?? 0), y = [l, m].filter((c) => c.length > 0);
    return `
        <tr class="hover:bg-gray-50">
          <td class="${g}">
            <a href="${i(n)}" class="font-medium text-gray-900 hover:text-blue-600">${i(s.summary ?? s.source?.label ?? "Result")}</a>
            ${y.length > 0 ? `<p class="mt-0.5 text-xs text-gray-500 font-mono">${i(y.join(" / "))}</p>` : ""}
          </td>
          <td class="${g}">
            ${d(s.result_kind)}
          </td>
          <td class="${g}">
            ${d(s.provider?.kind)}
          </td>
          <td class="${g}">
            ${o.length > 0 ? `<div class="flex flex-wrap gap-1">${o.map((c) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${i(c)}</span>`).join("")}</div>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${g}">
            ${u > 0 ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">${u} comment${u !== 1 ? "s" : ""}</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${g} text-right">
            <a href="${i(n)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>
          </td>
        </tr>
      `;
  }).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}
function W(e, t, r) {
  const s = ye(e), n = e.items ?? [];
  if (n.length === 0) {
    const o = e.empty_state;
    return `
      ${s}
      <div class="${N}">
        ${h(o?.title ?? "No results found", o?.description ?? "Try adjusting your search terms or filters.", !1)}
      </div>
    `;
  }
  return `
    ${s}
    ${$e(n, t, r)}
    ${D(e.page_info, "source-search-page")}
  `;
}
function D(e, t) {
  const r = Number(e?.page ?? 1), s = Number(e?.total_count ?? 0), n = Number(e?.page_size ?? 20);
  if (s <= 0 || s <= n) return "";
  const o = n > 0 ? Math.ceil(s / n) : 1;
  return `
    <div class="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: Info text -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-600">
            Showing <span class="font-medium">${(r - 1) * n + 1}</span> to
            <span class="font-medium">${Math.min(r * n, s)}</span> of
            <span class="font-medium">${s}</span>
          </p>
        </div>

        <!-- Center: Pagination buttons -->
        <div class="flex-1 flex justify-center">
          <nav class="flex items-center gap-x-1" aria-label="Pagination">
            <button
              type="button"
              data-runtime-action="${i(t)}"
              data-page="${r - 1}"
              class="${k} disabled:opacity-50 disabled:pointer-events-none"
              ${r <= 1 ? "disabled" : ""}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span class="sr-only sm:not-sr-only">Previous</span>
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">
              Page ${r} of ${o}
            </span>
            <button
              type="button"
              data-runtime-action="${i(t)}"
              data-page="${r + 1}"
              class="${k} disabled:opacity-50 disabled:pointer-events-none"
              ${r >= o ? "disabled" : ""}
            >
              <span class="sr-only sm:not-sr-only">Next</span>
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </nav>
        </div>

        <!-- Right: Per Page selector -->
        <div class="flex items-center gap-x-2 flex-shrink-0">
          <span class="text-sm text-gray-600 whitespace-nowrap">Per page:</span>
          <select
            data-runtime-action="${i(t)}-page-size"
            class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="10" ${n === 10 ? "selected" : ""}>10</option>
            <option value="20" ${n === 20 ? "selected" : ""}>20</option>
            <option value="50" ${n === 50 ? "selected" : ""}>50</option>
            <option value="100" ${n === 100 ? "selected" : ""}>100</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
var _e = class {
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
      if (r === "toggle-filters") {
        e.preventDefault();
        const n = this.root.querySelector("#browser-filter-panel");
        n && n.classList.toggle("hidden");
        return;
      }
      if (r === "toggle-search-filters") {
        e.preventDefault();
        const n = this.root.querySelector("#search-filter-panel");
        n && n.classList.toggle("hidden");
        return;
      }
      if (r === "clear-search-filters") {
        e.preventDefault(), this.clearSearchFilters();
        return;
      }
      if (r === "source-browser-page" || r === "source-comment-page" || r === "source-search-page") {
        e.preventDefault();
        const n = Number.parseInt(t.dataset.page ?? "1", 10);
        if (!Number.isFinite(n) || n <= 0) return;
        this.goToPage(r, n);
      }
      const s = e.target instanceof Element ? e.target.closest("[data-runtime-workspace-link]") : null;
      if (s && this.liveController instanceof te) {
        const n = String(s.getAttribute("href") ?? "").trim();
        n && w(window.location.href) === w(n) && (e.preventDefault(), this.liveController.navigateToHref(n));
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("submit", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLFormElement)) return;
      const r = t.dataset.runtimeForm ?? "";
      if (r === "source-browser") {
        e.preventDefault();
        const s = new FormData(t);
        this.applyBrowserFilters({
          query: v(s.get("q")),
          provider_kind: v(s.get("provider_kind")),
          status: v(s.get("status")),
          has_pending_candidates: s.get("has_pending_candidates") ? !0 : void 0
        });
      }
      if (r === "source-search") {
        e.preventDefault();
        const s = new FormData(t);
        this.applySearchFilters({
          query: v(s.get("q")),
          provider_kind: v(s.get("provider_kind")),
          status: v(s.get("status")),
          result_kind: v(s.get("result_kind")),
          has_comments: s.get("has_comments") ? !0 : void 0
        });
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLSelectElement)) return;
      const r = t.dataset.runtimeAction ?? "";
      if (r === "source-browser-page-page-size") {
        const s = Number.parseInt(t.value, 10);
        Number.isFinite(s) && s > 0 && this.changePageSize("source-browser", s);
      }
      if (r === "source-search-page-page-size") {
        const s = Number.parseInt(t.value, 10);
        Number.isFinite(s) && s > 0 && this.changePageSize("source-search", s);
      }
    }, { signal: this.abortController.signal });
  }
  bootstrapLiveController() {
    const e = String(this.config.api_base_path ?? "").trim(), t = v(this.config.context?.source_document_id), r = v(this.config.context?.source_revision_id), s = (n, o = this.page) => {
      this.liveController = n, le(o, n);
    };
    switch (this.page) {
      case "admin.sources.browser":
        s(ae({
          apiBasePath: e,
          onStateChange: (n) => this.renderBrowserState(n)
        }));
        break;
      case "admin.sources.detail":
        if (!t) return;
        s(z({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (n) => this.renderWorkspaceState(n)
        }));
        break;
      case "admin.sources.workspace":
        if (!t) return;
        s(z({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (n) => this.renderWorkspaceState(n)
        }));
        break;
      case "admin.sources.revision_inspector":
        if (!r) return;
        s(ie({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (n) => this.renderRevisionState(n)
        }));
        break;
      case "admin.sources.comment_inspector":
        if (!r) return;
        s(se({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (n) => this.renderCommentState(n)
        }));
        break;
      case "admin.sources.artifact_inspector":
        if (!r) return;
        s(ne({
          apiBasePath: e,
          sourceRevisionId: r,
          onStateChange: (n) => this.renderArtifactState(n)
        }));
        break;
      case "admin.sources.search":
        s(re({
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
        this.root.innerHTML = F(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.detail":
      case "admin.sources.workspace":
        this.root.innerHTML = U(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.revision_inspector":
        this.root.innerHTML = O(e);
        return;
      case "admin.sources.comment_inspector":
        this.root.innerHTML = V(e);
        return;
      case "admin.sources.artifact_inspector":
        this.root.innerHTML = q(e);
        return;
      case "admin.sources.search":
        this.root.innerHTML = W(e, this.config.routes ?? {}, this.config);
        return;
    }
  }
  renderBrowserState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.listSources && (this.hasLiveContract = !0, this.root.innerHTML = F(e.contracts.listSources, this.config.routes ?? {}, this.config));
    }
  }
  renderWorkspaceState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.workspace && (this.hasLiveContract = !0, this.root.innerHTML = U(e.contracts.workspace, this.config.routes ?? {}, this.config));
    }
  }
  renderRevisionState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.revisionDetail && (this.hasLiveContract = !0, this.root.innerHTML = O(e.contracts.revisionDetail));
    }
  }
  renderCommentState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.commentPage && (this.hasLiveContract = !0, this.root.innerHTML = V(e.contracts.commentPage));
    }
  }
  renderArtifactState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.artifactPage && (this.hasLiveContract = !0, this.root.innerHTML = q(e.contracts.artifactPage));
    }
  }
  renderSearchState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = C();
        return;
      }
      if (e.error) {
        this.root.innerHTML = S(e.error);
        return;
      }
      e.contracts?.searchResults && (this.hasLiveContract = !0, this.root.innerHTML = W(e.contracts.searchResults, this.config.routes ?? {}, this.config));
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
    e === "source-browser-page" && this.liveController instanceof B && await this.liveController.goToPage(t), e === "source-comment-page" && this.liveController instanceof oe && await this.liveController.goToPage(t), e === "source-search-page" && this.liveController instanceof H && await this.liveController.goToPage(t);
  }
  async clearBrowserFilters() {
    this.liveController instanceof B && await this.liveController.applyFilters({
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
    this.liveController instanceof B && await this.liveController.applyFilters(e);
  }
  async applySearchFilters(e) {
    this.liveController instanceof H && await this.liveController.applyFilters(e);
  }
  async changePageSize(e, t) {
    e === "source-browser" && this.liveController instanceof B && await this.liveController.applyFilters({
      page_size: t,
      page: 1
    }), e === "source-search" && this.liveController instanceof H && await this.liveController.applyFilters({
      page_size: t,
      page: 1
    });
  }
};
function v(e) {
  const t = String(e ?? "").trim();
  return t || void 0;
}
function X() {
  const e = document.querySelector('[data-esign-page^="admin.sources."]'), t = document.querySelector("[data-source-management-runtime-root]");
  if (!e || !t) return null;
  const r = j("esign-page-config"), s = j("source-management-page-model"), n = String(r?.page ?? e.dataset.esignPage ?? "").trim();
  if (!n) return null;
  const o = new _e({
    page: n,
    config: r ?? {},
    model: s ?? {},
    marker: e,
    root: t
  });
  return o.init(), o;
}
function we() {
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
  const s = j("esign-page-config"), n = j("source-management-page-model");
  e.hasBackendConfig = s !== null && typeof s.api_base_path == "string", e.hasBackendConfig || e.issues.push("Backend config missing or invalid - no api_base_path"), e.hasBackendPageModel = n !== null && typeof n.surface == "string", e.hasBackendPageModel || e.issues.push("Backend page model missing or invalid - no surface"), e.hasBackendRoutes = s?.routes !== void 0 && typeof s.routes == "object", e.hasBackendRoutes || e.issues.push("Backend routes missing from config");
  const o = String(s?.page ?? t.dataset.esignPage ?? "").trim();
  if (e.page = o || null, e.surface = n?.surface ?? t.dataset.sourceManagementSurface ?? null, !o)
    return e.issues.push("Page identifier not found in config or marker"), e;
  for (const l of [
    "_clientBootstrap",
    "_fallbackConfig",
    "_synthesizedRoutes",
    "_generatedApiPath"
  ])
    s && l in s && e.issues.push(`Forbidden client-side bootstrap shim detected: ${l}`), n && l in n && e.issues.push(`Forbidden client-side bootstrap shim detected: ${l}`);
  return e.controllerMounted = X() !== null, e.controllerMounted || e.issues.push("Runtime controller failed to mount"), e.success = e.hasBackendConfig && e.hasBackendPageModel && e.hasBackendRoutes && e.controllerMounted && e.issues.length === 0, e;
}
function Me() {
  const e = we();
  if (!e.success) throw new Error(`V2 runtime initialization failed: ${e.issues.join("; ")}`);
}
function Pe(e) {
  if (console.group("V2 Source-Management Runtime Initialization"), console.log(`Success: ${e.success ? "YES" : "NO"}`), console.log(`Page: ${e.page ?? "unknown"}`), console.log(`Surface: ${e.surface ?? "unknown"}`), console.log(`Backend Config: ${e.hasBackendConfig ? "✓" : "✗"}`), console.log(`Backend Page Model: ${e.hasBackendPageModel ? "✓" : "✗"}`), console.log(`Backend Routes: ${e.hasBackendRoutes ? "✓" : "✗"}`), console.log(`Controller Mounted: ${e.controllerMounted ? "✓" : "✗"}`), e.issues.length > 0) {
    console.group("Issues");
    for (const t of e.issues) console.log(`- ${t}`);
    console.groupEnd();
  }
  console.groupEnd();
}
typeof document < "u" && ee(() => {
  document.querySelector('[data-esign-page^="admin.sources."]') && X();
});
export {
  we as a,
  fe as c,
  X as i,
  he as l,
  _e as n,
  b as o,
  Me as r,
  Pe as s,
  Re as t,
  I as u
};

//# sourceMappingURL=source-management-runtime-RH7yy6pH.js.map