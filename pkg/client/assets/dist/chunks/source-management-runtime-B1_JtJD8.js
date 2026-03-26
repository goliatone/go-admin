import { S as k } from "./lineage-contracts-CFbDklQS.js";
import { c as re, p as ne, o as ie, j as oe, m as ae, l as q, i as ce, S as H, a as le, h as j, r as de } from "./source-management-pages-Bzq4f4fH.js";
import { f as ue } from "./dom-helpers-CMRVXsMj.js";
function N(t) {
  const s = document.getElementById(t)?.textContent?.trim();
  if (!s)
    return null;
  try {
    return JSON.parse(s);
  } catch (n) {
    return console.warn(`[SourceManagementRuntime] Failed to parse ${t}:`, n), null;
  }
}
function o(t) {
  return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function F(t) {
  const e = String(t ?? "").trim();
  if (!e)
    return "-";
  const s = new Date(e);
  return Number.isNaN(s.getTime()) ? o(e) : o(s.toLocaleString());
}
function me(t) {
  const e = String(t ?? "").trim();
  if (!e)
    return "";
  const s = new Date(e);
  if (Number.isNaN(s.getTime()))
    return "";
  const r = Date.now() - s.getTime(), i = Math.floor(r / 6e4), a = Math.floor(r / 36e5), l = Math.floor(r / 864e5);
  return i < 1 ? "just now" : i < 60 ? `${i}m ago` : a < 24 ? `${a}h ago` : l < 7 ? `${l}d ago` : s.toLocaleDateString();
}
function pe(t) {
  switch (t) {
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
function p(t, e = "-") {
  const s = String(t ?? "").trim();
  return s ? `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${pe(s)}">${o(s.replace(/_/g, " "))}</span>` : `<span class="text-gray-400">${o(e)}</span>`;
}
function _(t, e) {
  const s = String(t ?? "").trim(), n = String(e ?? "").trim();
  return !s || !n ? s : s.replace(/:source_document_id/g, encodeURIComponent(n)).replace(/:source_revision_id/g, encodeURIComponent(n)).replace(new RegExp(encodeURIComponent(":source_document_id"), "g"), encodeURIComponent(n)).replace(new RegExp(encodeURIComponent(":source_revision_id"), "g"), encodeURIComponent(n));
}
function B(t, e) {
  const s = String(t ?? "").trim(), n = String(e ?? "").trim().replace(/^\?+/, "");
  if (!s || !n)
    return s;
  try {
    const r = new URL(s, "https://runtime.invalid");
    return new URLSearchParams(n).forEach((a, l) => {
      r.searchParams.has(l) || r.searchParams.append(l, a);
    }), `${r.pathname}${r.search}${r.hash}`;
  } catch {
    return s.includes("?") ? `${s}&${n}` : `${s}?${n}`;
  }
}
function ge() {
  return typeof window > "u" || typeof window.location?.search != "string" ? "" : window.location.search.replace(/^\?+/, "").trim();
}
function C(t) {
  const e = String(t ?? "").trim();
  if (!e)
    return "";
  try {
    return new URL(e, "https://runtime.invalid").pathname;
  } catch {
    return e.split("?")[0] ?? "";
  }
}
function fe(t) {
  return t ? [
    t.source_browser,
    t.source_search,
    t.source_detail,
    t.source_workspace,
    t.source_revision,
    t.source_comment_inspector,
    t.source_artifact_inspector
  ].map((e) => C(String(e ?? ""))).filter((e) => e.length > 0) : [];
}
function he(t, e) {
  const s = C(t).split("/").filter(Boolean), n = C(e).split("/").filter(Boolean);
  return s.length !== n.length ? !1 : n.every((r, i) => r.startsWith(":") || r === s[i]);
}
function y(t, e) {
  const s = C(String(t ?? ""));
  return s ? fe(e).some(
    (n) => he(s, n)
  ) : !1;
}
function T(t, e, s) {
  const n = String(t ?? "").trim();
  if (!n)
    return "";
  try {
    const r = new URL(n, "https://runtime.invalid");
    return new URL(e, "https://runtime.invalid").searchParams.forEach((a, l) => {
      r.searchParams.has(l) || r.searchParams.append(l, a);
    }), B(`${r.pathname}${r.search}${r.hash}`, s);
  } catch {
    return B(n, s);
  }
}
function ve(t, e) {
  const s = String(t ?? "").trim(), n = String(e.api_base_path ?? "").trim().replace(/\/+$/, "");
  if (!s || !n)
    return "";
  const r = C(s);
  return r.startsWith(n) ? r.slice(n.length) : "";
}
function A(t, e, s = ge()) {
  const n = String(t ?? "").trim();
  if (!n)
    return "";
  const r = ve(n, e);
  if (!r)
    return y(n, e.routes) ? B(n, s) : n.startsWith("/") ? "" : n;
  const i = r.match(/^\/sources\/([^/]+)\/workspace$/), a = r.match(/^\/sources\/([^/]+)$/), l = r.match(/^\/source-revisions\/([^/]+)$/), d = r.match(/^\/source-revisions\/([^/]+)\/comments$/), m = r.match(/^\/source-revisions\/([^/]+)\/artifacts$/);
  if (r === "/sources")
    return B(String(e.routes?.source_browser ?? ""), s);
  if (r === "/source-search")
    return B(String(e.routes?.source_search ?? ""), s);
  if (i) {
    const u = decodeURIComponent(i[1] ?? ""), R = String(
      e.routes?.source_workspace ?? e.routes?.source_detail ?? ""
    ), $ = _(R, u);
    return y($, e.routes) ? T($, n, s) : "";
  }
  if (a) {
    const u = _(e.routes?.source_detail, decodeURIComponent(a[1] ?? ""));
    return y(u, e.routes) ? T(u, n, s) : "";
  }
  if (d) {
    const u = _(
      e.routes?.source_comment_inspector,
      decodeURIComponent(d[1] ?? "")
    );
    return y(u, e.routes) ? T(u, n, s) : "";
  }
  if (m) {
    const u = _(
      e.routes?.source_artifact_inspector,
      decodeURIComponent(m[1] ?? "")
    );
    return y(u, e.routes) ? T(u, n, s) : "";
  }
  if (l) {
    const u = _(
      e.routes?.source_revision,
      decodeURIComponent(l[1] ?? "")
    );
    return y(u, e.routes) ? T(u, n, s) : "";
  }
  return "";
}
function S(t, e, ...s) {
  for (const n of s) {
    const r = A(t?.[n], e);
    if (r)
      return r;
  }
  return "";
}
const Ae = [
  k.SOURCE_DOCUMENT,
  k.SOURCE_REVISION
];
function xe(t, e) {
  const s = S(t.links, e, "workspace", "anchor", "source", "self");
  if (s)
    return s;
  const n = _(e.routes?.source_workspace ?? e.routes?.source_detail, t.source?.id ?? "");
  return y(n, e.routes) ? n : "";
}
function be(t, e) {
  const s = A(t.drill_in?.href, e) || S(t.links, e, "anchor", "workspace", "comments", "artifacts", "source", "self");
  if (s)
    return s;
  if (t.result_kind === k.SOURCE_REVISION && t.revision?.id) {
    const n = _(e.routes?.source_revision, t.revision.id);
    return y(n, e.routes) ? n : "";
  }
  if (t.source?.id) {
    const n = _(
      e.routes?.source_workspace ?? e.routes?.source_detail,
      t.source.id
    );
    return y(n, e.routes) ? n : "";
  }
  return "";
}
function ye(t, e, s) {
  const n = Array.isArray(e) ? e : [];
  if (n.length === 0)
    return "";
  const r = String(t.revision?.id ?? "").trim(), i = String(t.source?.id ?? "").trim(), a = String(t.summary ?? t.source?.label ?? "").trim(), l = n.filter((d) => {
    const m = String(d?.href ?? "").trim();
    return m ? r && m.includes(r) || r && m.includes(encodeURIComponent(r)) || i && m.includes(i) || i && m.includes(encodeURIComponent(i)) || a && String(d?.label ?? "").trim() === a : !1;
  });
  for (const d of l) {
    const m = A(String(d?.href ?? "").trim(), s);
    if (m)
      return m;
  }
  return "";
}
function v(t, e, s = !1) {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="rounded-full bg-gray-100 p-3 mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900">${o(t)}</h3>
      <p class="mt-1 text-sm text-gray-500">${o(e)}</p>
      ${s ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ""}
    </div>
  `;
}
function M() {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
      <span class="ml-3 text-sm text-gray-500">Loading...</span>
    </div>
  `;
}
function L(t) {
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
          <p class="mt-1 text-sm text-red-700">${o(t.message)}</p>
          <button type="button" data-runtime-action="refresh" class="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Try again
          </button>
        </div>
      </div>
    </div>
  `;
}
const Y = "bg-white border border-gray-200 rounded-xl mb-4 p-4 shadow-sm", w = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", $e = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-500 bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", U = "h-10 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", X = "block w-full h-10 ps-9 pe-8 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-200", I = "block w-full h-10 rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", Z = "inline-flex items-center gap-2 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50", E = "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden", g = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", f = "px-6 py-4 align-top", _e = "rounded-lg border border-gray-200 bg-gray-50 p-4", we = "rounded-xl border border-gray-200 bg-white p-6";
function D(t = "refresh", e = "Refresh") {
  return `
    <button type="button" data-runtime-action="${o(t)}" class="${w}">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      ${o(e)}
    </button>
  `;
}
function b(t, e = "") {
  return `<div class="${_e}${e ? ` ${e}` : ""}">${t}</div>`;
}
function z(t, e = "") {
  return `<div class="${we}${e ? ` ${e}` : ""}">${t}</div>`;
}
function ee(t, e, s) {
  return `
    <button type="button" data-runtime-action="${o(t)}" class="${s ? $e : w}">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
      ${o(e)}${s ? " (Active)" : ""}
    </button>
  `;
}
function ke(t) {
  const e = t.applied_query ?? {}, s = !!(e.provider_kind || e.status || e.has_pending_candidates);
  return `
    <div class="${Y}">
      <form data-runtime-form="source-browser">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${ee("toggle-filters", "Filter", s)}
              <div class="relative flex-1">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="browser-search" name="q" value="${o(e.query ?? "")}" placeholder="Search sources..." class="${X}" />
              </div>
            </div>

            <div id="browser-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-provider">Provider</label>
                  <select id="browser-provider" name="provider_kind" class="${I}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${e.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${e.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-status">Status</label>
                  <select id="browser-status" name="status" class="${I}">
                    <option value="">All statuses</option>
                    <option value="active" ${e.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${e.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${e.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${Z}">
                    <input type="checkbox" name="has_pending_candidates" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${e.has_pending_candidates ? "checked" : ""} />
                    <span>Pending review</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${U}">
                  Apply Filters
                </button>
                <button type="button" data-runtime-action="clear-browser-filters" class="${w}">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="button" data-runtime-action="refresh" class="${w}">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}
function V(t, e, s) {
  const n = ke(t), r = t.items ?? [];
  if (r.length === 0) {
    const a = t.empty_state;
    return `
      ${n}
      <div class="${E}">
        ${v(
      a?.title ?? "No sources found",
      a?.description ?? "Try adjusting your filters or search terms.",
      !0
    )}
      </div>
    `;
  }
  const i = r.map((a) => {
    const l = a.source?.id ?? "", d = xe(a, {
      base_path: s.base_path,
      api_base_path: s.api_base_path,
      routes: e
    }), m = a.provider?.kind ?? "";
    return `
        <tr class="hover:bg-gray-50">
          <td class="${f}">
            <a href="${o(d)}" class="font-medium text-gray-900 hover:text-blue-600">${o(a.source?.label ?? "Untitled")}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${o(l.substring(0, 12))}...</p>
          </td>
          <td class="${f}">
            ${p(m)}
            <p class="mt-0.5 text-xs text-gray-500">${o(a.provider?.external_file_id ?? "-")}</p>
          </td>
          <td class="${f} text-sm text-gray-700">
            <p>${o(a.latest_revision?.provider_revision_hint ?? "-")}</p>
            <p class="mt-0.5 text-xs text-gray-500">${F(a.latest_revision?.modified_time)}</p>
          </td>
          <td class="${f}">${p(a.status)}</td>
          <td class="${f} text-sm">
            ${(a.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${a.pending_candidate_count} pending</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f} text-right">
            <a href="${o(d)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
          </td>
        </tr>
      `;
  }).join("");
  return `
    ${n}
    <div class="${E}">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="${g}">Source</th>
              <th scope="col" class="${g}">Provider</th>
              <th scope="col" class="${g}">Latest Revision</th>
              <th scope="col" class="${g}">Status</th>
              <th scope="col" class="${g}">Review</th>
              <th scope="col" class="${g} text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${i}</tbody>
        </table>
      </div>
    </div>
    ${O(t.page_info, "source-browser-page")}
  `;
}
function P(t, e, s, n) {
  const r = t === String(s ?? "").trim();
  return `
    <section id="workspace-panel-${o(t)}" class="rounded-xl border ${r ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"} p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">${o(e)}</h3>
        ${r ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Active</span>' : ""}
      </div>
      ${n}
    </section>
  `;
}
function Se(t, e) {
  const s = t.panels ?? [];
  if (s.length === 0)
    return "";
  const n = String(t.active_panel ?? "overview").trim();
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="flex flex-wrap gap-2">
        ${s.map((r) => {
    const i = S(r.links, e, "anchor", "workspace", "self"), a = r.id === n, l = r.item_count ?? 0, d = a ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50";
    return i ? `
              <a
                href="${o(i)}"
                data-runtime-workspace-link="panel"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${d}"
              >
                <span>${o(r.label)}</span>
                <span class="${a ? "text-blue-100" : "text-gray-400"}">${o(l)}</span>
              </a>
            ` : `
                <span class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${d}">
                  <span>${o(r.label)}</span>
                  <span class="${a ? "text-blue-100" : "text-gray-400"}">${o(l)}</span>
                </span>
              `;
  }).join("")}
      </div>
    </div>
  `;
}
function W(t, e, s) {
  if (t.empty_state?.kind && t.empty_state.kind !== "none")
    return v(
      t.empty_state.title ?? "Workspace unavailable",
      t.empty_state.description ?? "",
      !0
    );
  const n = String(t.active_panel ?? "overview").trim(), r = String(t.active_anchor ?? "").trim(), i = t.continuity, a = [...i.predecessors ?? [], ...i.successors ?? []], l = i.summary ? `<p class="text-sm text-gray-700">${o(i.summary)}</p>` : '<p class="text-sm text-gray-500">No continuity summary available.</p>', d = (t.timeline?.entries ?? []).length > 0 ? `<div class="space-y-3">
          ${t.timeline.entries.map((c) => {
    const h = A(c.drill_in?.href, s) || S(c.links, s, "anchor", "timeline", "workspace", "source", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${o(
      c.revision?.provider_revision_hint ?? c.revision?.id ?? "Revision"
    )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${o(c.continuity_summary ?? "Continuity details available from backend workspace timeline.")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${c.is_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Latest</span>' : ""}
                      ${c.is_repeated_handle ? '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Repeated Handle</span>' : ""}
                      ${h ? `<a href="${o(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${o(c.comment_count ?? 0)} comments</span>
                    <span>${o(c.agreement_count ?? 0)} agreements</span>
                    <span>${o(c.artifact_count ?? 0)} artifacts</span>
                    <span>${o(c.handle?.external_file_id ?? c.handle?.id ?? "No active handle")}</span>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(
    t.timeline?.empty_state?.title ?? "No revision timeline",
    t.timeline?.empty_state?.description ?? "No revisions are available in this workspace."
  ), m = (t.agreements?.items ?? []).length > 0 ? `<div class="space-y-3">
          ${t.agreements.items.map((c) => {
    const h = S(c.links, s, "anchor", "workspace", "agreement", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${o(
      c.agreement?.label ?? c.agreement?.id ?? "Agreement"
    )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${o(
      c.document?.label ?? c.document?.id ?? "Linked document"
    )}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${p(c.status)}
                      ${c.is_pinned_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Pinned Latest</span>' : ""}
                      ${h ? `<a href="${o(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(
    t.agreements?.empty_state?.title ?? "No related agreements",
    t.agreements?.empty_state?.description ?? "No agreements are pinned to this source."
  ), u = (t.artifacts?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${t.artifacts.items.map((c) => {
    const h = A(c.drill_in?.href, s) || S(c.links, s, "anchor", "workspace", "artifacts", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${o(
      c.artifact?.artifact_kind ?? "Artifact"
    )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${o(
      c.revision?.provider_revision_hint ?? c.revision?.id ?? ""
    )}</p>
                    </div>
                    ${h ? `<a href="${o(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${o(c.provider?.kind ?? "provider")}</span>
                    <span>${o(c.artifact?.page_count ?? 0)} pages</span>
                    <span class="font-mono">${o(c.artifact?.id ?? "-")}</span>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(
    t.artifacts?.empty_state?.title ?? "No artifacts",
    t.artifacts?.empty_state?.description ?? "No artifacts are available in this workspace."
  ), R = (t.comments?.items ?? []).length > 0 ? `<div class="space-y-3">${t.comments.items.map(te).join("")}</div>` : v(
    t.comments?.empty_state?.title ?? "No comments",
    t.comments?.empty_state?.description ?? "No comment threads are available in this workspace."
  ), $ = (t.handles?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${t.handles.items.map((c) => {
    const h = S(c.links, s, "workspace", "source", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${o(
      c.external_file_id ?? c.id
    )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${o(
      c.provider_kind ?? "provider"
    )}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      ${p(c.handle_status)}
                      ${h ? `<a href="${o(h)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(
    t.handles?.empty_state?.title ?? "No handles",
    t.handles?.empty_state?.description ?? "No handles are available in this workspace."
  );
  return `
    <div class="p-6 space-y-6">
      ${z(`
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">${o(
    t.source?.label ?? "Source Workspace"
  )}</h2>
            <p class="mt-1 font-mono text-xs text-gray-500">${o(
    t.source?.id ?? "-"
  )}</p>
          </div>
          ${D()}
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${p(t.status)}
          ${t.lineage_confidence ? `<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Confidence: ${o(t.lineage_confidence)}</span>` : ""}
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${o(t.revision_count ?? 0)} revisions</span>
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${o(t.handle_count ?? 0)} handles</span>
          ${r ? `<span class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Anchor: ${o(r)}</span>` : ""}
        </div>
      `)}

      ${Se(t, s)}

      ${P(
    "overview",
    "Overview",
    n,
    `
          <div class="grid gap-4 md:grid-cols-2">
            ${b(`
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${o(t.provider?.label ?? t.provider?.kind ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${o(t.provider?.external_file_id ?? "-")}</p>
            `)}
            ${b(`
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Latest Revision</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${o(t.latest_revision?.provider_revision_hint ?? t.latest_revision?.id ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${F(t.latest_revision?.modified_time)}</p>
            `)}
          </div>
          ${b(`
            <div class="mb-2 flex items-center justify-between gap-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Continuity</h4>
              ${p(i.status)}
            </div>
            ${l}
            ${i.continuation ? `<p class="mt-3 text-xs text-gray-500">Continuation: ${o(i.continuation.label ?? i.continuation.id ?? "-")}</p>` : ""}
            ${a.length > 0 ? `<p class="mt-2 text-xs text-gray-500">Linked sources: ${a.map((c) => o(c.label ?? c.id ?? "-")).join(", ")}</p>` : ""}
          `, "mt-4")}
        `
  )}

      ${P("timeline", "Revision Timeline", n, d)}
      ${P("agreements", "Related Agreements", n, m)}
      ${P("artifacts", "Related Artifacts", n, u)}
      ${P(
    "comments",
    "Related Comments",
    n,
    `${t.comments?.sync_status ? `<div class="mb-3">${p(t.comments.sync_status)}</div>` : ""}${R}`
  )}
      ${P("handles", "Active Handles", n, $)}
    </div>
  `;
}
function Q(t) {
  return t.empty_state?.kind && t.empty_state.kind !== "none" ? v(t.empty_state.title ?? "Revision unavailable", t.empty_state.description ?? "", !0) : `
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${o(t.revision?.provider_revision_hint ?? "Revision")}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${o(t.revision?.id ?? "-")}</p>
        </div>
        ${D()}
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        ${b(`
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint Status</h3>
          <div class="mt-2">${p(t.fingerprint_status?.status)}</div>
          ${t.fingerprint_status?.error_message ? `<p class="mt-2 text-sm text-red-600">${o(t.fingerprint_status.error_message)}</p>` : ""}
        `)}
        ${b(`
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</h3>
          <div class="mt-2">${p(t.fingerprint_processing?.state)}</div>
          ${t.fingerprint_processing?.status_label ? `<p class="mt-2 text-sm text-gray-600">${o(t.fingerprint_processing.status_label)}</p>` : ""}
        `)}
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</h3>
          <p class="mt-1 text-sm text-gray-900">${o(t.source?.label ?? t.source?.id ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</h3>
          <p class="mt-1 text-sm text-gray-900">${o(t.provider?.label ?? t.provider?.kind ?? "-")}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Modified</h3>
          <p class="mt-1 text-sm text-gray-900">${F(t.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${t.fingerprint_status?.evidence_available ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  `;
}
function G(t) {
  const e = t.items ?? [];
  if (e.length === 0)
    return v(t.empty_state?.title ?? "No artifacts", t.empty_state?.description ?? "No artifacts have been generated for this revision.", !0);
  const s = e.map((n) => `
        ${z(`
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${p(n.artifact_kind)}
              ${p(n.compatibility_tier)}
            </div>
            ${p(n.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-gray-500">Object Key</dt>
              <dd class="mt-0.5 font-medium text-gray-900 font-mono text-xs truncate">${o(n.object_key ?? "-")}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Pages</dt>
              <dd class="mt-0.5 font-medium text-gray-900">${o(n.page_count ?? "-")}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-gray-500">SHA256</dt>
              <dd class="mt-0.5 font-mono text-xs text-gray-700 truncate">${o(n.sha256 ?? "-")}</dd>
            </div>
          </dl>
        `, "p-4")}
      `).join("");
  return `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Artifacts</h2>
          <p class="mt-1 text-sm text-gray-500">${e.length} artifact${e.length !== 1 ? "s" : ""}</p>
        </div>
        ${D()}
      </div>
      <div class="grid gap-4">${s}</div>
    </div>
  `;
}
function te(t) {
  return `
    ${z(`
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${p(t.status)}
          ${t.sync_status ? p(t.sync_status) : ""}
        </div>
        <span class="text-xs text-gray-500">${me(t.last_synced_at)}</span>
      </div>
      <p class="mt-3 text-sm font-medium text-gray-900">${o(t.anchor?.label ?? "Comment Thread")}</p>
      <p class="mt-1 text-sm text-gray-600 line-clamp-2">${o(t.body_preview ?? "")}</p>
      <div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ${o(t.author_name ?? "Unknown")}
        </span>
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          ${t.message_count ?? 0} messages
        </span>
        ${(t.reply_count ?? 0) > 0 ? `<span>${t.reply_count} replies</span>` : ""}
      </div>
    `, "p-4")}
  `;
}
function K(t) {
  const e = t.items ?? [];
  return e.length === 0 ? v(t.empty_state?.title ?? "No comments", t.empty_state?.description ?? "No comments have been synced for this revision.", !0) : `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Comments</h2>
          ${p(t.sync_status ?? "unknown")}
        </div>
        ${D()}
      </div>
      <div class="space-y-3">${e.map(te).join("")}</div>
      ${O(t.page_info, "source-comment-page")}
    </div>
  `;
}
function Ce(t) {
  const e = t.applied_query ?? {}, s = !!(e.provider_kind || e.status || e.result_kind || e.relationship_state || e.comment_sync_status || e.revision_hint || e.has_comments);
  return `
    <div class="${Y}">
      <form data-runtime-form="source-search">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${ee("toggle-search-filters", "Filter", s)}
              <div class="relative flex-1">
                <label class="sr-only" for="search-query">Search</label>
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="search-query" name="q" value="${o(e.query ?? "")}" placeholder="Search sources, revisions, comments..." class="${X}" />
              </div>
            </div>
            <div id="search-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-provider-kind">Provider</label>
                  <select id="search-provider-kind" name="provider_kind" class="${I}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${e.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${e.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-status">Status</label>
                  <select id="search-status" name="status" class="${I}">
                    <option value="">All statuses</option>
                    <option value="active" ${e.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${e.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${e.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-result-kind">Type</label>
                  <select id="search-result-kind" name="result_kind" class="${I}">
                    <option value="">All types</option>
                    <option value="${k.SOURCE_DOCUMENT}" ${e.result_kind === k.SOURCE_DOCUMENT ? "selected" : ""}>Sources</option>
                    <option value="${k.SOURCE_REVISION}" ${e.result_kind === k.SOURCE_REVISION ? "selected" : ""}>Revisions</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${Z}">
                    <input type="checkbox" name="has_comments" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${e.has_comments ? "checked" : ""} />
                    <span>Has comments</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${U}">
                  Apply Filters
                </button>
                <button type="button" data-runtime-action="clear-search-filters" class="${w}">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="submit" class="${U}">
              Search
            </button>
            <button type="button" data-runtime-action="refresh" class="${w}">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  `;
}
function Re(t, e, s, n) {
  const r = t.map((i) => {
    const a = ye(i, n, {
      base_path: s.base_path,
      api_base_path: s.api_base_path,
      routes: e
    }) || be(i, {
      base_path: s.base_path,
      api_base_path: s.api_base_path,
      routes: e
    }), l = i.matched_fields ?? [], d = String(i.source?.id ?? "").trim(), m = String(i.revision?.id ?? "").trim(), u = Number(i.comment_count ?? 0), R = [d, m].filter(($) => $.length > 0);
    return `
        <tr class="hover:bg-gray-50">
          <td class="${f}">
            <a href="${o(a)}" class="font-medium text-gray-900 hover:text-blue-600">${o(i.summary ?? i.source?.label ?? "Result")}</a>
            ${R.length > 0 ? `<p class="mt-0.5 text-xs text-gray-500 font-mono">${o(R.join(" / "))}</p>` : ""}
          </td>
          <td class="${f}">
            ${p(i.result_kind)}
          </td>
          <td class="${f}">
            ${p(i.provider?.kind)}
          </td>
          <td class="${f}">
            ${l.length > 0 ? `<div class="flex flex-wrap gap-1">${l.map(($) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${o($)}</span>`).join("")}</div>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f}">
            ${u > 0 ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">${u} comment${u !== 1 ? "s" : ""}</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f} text-right">
            <a href="${o(a)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>
          </td>
        </tr>
      `;
  }).join("");
  return `
    <div class="${E}">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="${g}">Result</th>
              <th scope="col" class="${g}">Type</th>
              <th scope="col" class="${g}">Provider</th>
              <th scope="col" class="${g}">Matched</th>
              <th scope="col" class="${g}">Comments</th>
              <th scope="col" class="${g} text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${r}</tbody>
        </table>
      </div>
    </div>
  `;
}
function J(t, e, s, n) {
  const r = Ce(t), i = t.items ?? [];
  if (i.length === 0) {
    const a = t.empty_state;
    return `
      ${r}
      <div class="${E}">
        ${v(
      a?.title ?? "No results found",
      a?.description ?? "Try adjusting your search terms or filters.",
      !1
    )}
      </div>
    `;
  }
  return `
    ${r}
    ${Re(i, e, s, n)}
    ${O(t.page_info, "source-search-page")}
  `;
}
function O(t, e) {
  const s = Number(t?.page ?? 1), n = Number(t?.total_count ?? 0), r = Number(t?.page_size ?? 20);
  if (n <= 0 || n <= r)
    return "";
  const i = r > 0 ? Math.ceil(n / r) : 1, a = (s - 1) * r + 1, l = Math.min(s * r, n);
  return `
    <div class="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: Info text -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-600">
            Showing <span class="font-medium">${a}</span> to
            <span class="font-medium">${l}</span> of
            <span class="font-medium">${n}</span>
          </p>
        </div>

        <!-- Center: Pagination buttons -->
        <div class="flex-1 flex justify-center">
          <nav class="flex items-center gap-x-1" aria-label="Pagination">
            <button
              type="button"
              data-runtime-action="${o(e)}"
              data-page="${s - 1}"
              class="${w} disabled:opacity-50 disabled:pointer-events-none"
              ${s <= 1 ? "disabled" : ""}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span class="sr-only sm:not-sr-only">Previous</span>
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">
              Page ${s} of ${i}
            </span>
            <button
              type="button"
              data-runtime-action="${o(e)}"
              data-page="${s + 1}"
              class="${w} disabled:opacity-50 disabled:pointer-events-none"
              ${s >= i ? "disabled" : ""}
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
            data-runtime-action="${o(e)}-page-size"
            class="py-2 px-3 pe-9 block border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="10" ${r === 10 ? "selected" : ""}>10</option>
            <option value="20" ${r === 20 ? "selected" : ""}>20</option>
            <option value="50" ${r === 50 ? "selected" : ""}>50</option>
            <option value="100" ${r === 100 ? "selected" : ""}>100</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
class Me {
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
    this.root.addEventListener(
      "click",
      (e) => {
        const s = e.target instanceof Element ? e.target.closest("[data-runtime-action]") : null;
        if (!s)
          return;
        const n = s.dataset.runtimeAction ?? "";
        if (n === "refresh") {
          e.preventDefault(), this.refresh();
          return;
        }
        if (n === "clear-browser-filters") {
          e.preventDefault(), this.clearBrowserFilters();
          return;
        }
        if (n === "toggle-filters") {
          e.preventDefault();
          const i = this.root.querySelector("#browser-filter-panel");
          i && i.classList.toggle("hidden");
          return;
        }
        if (n === "toggle-search-filters") {
          e.preventDefault();
          const i = this.root.querySelector("#search-filter-panel");
          i && i.classList.toggle("hidden");
          return;
        }
        if (n === "clear-search-filters") {
          e.preventDefault(), this.clearSearchFilters();
          return;
        }
        if (n === "source-browser-page" || n === "source-comment-page" || n === "source-search-page") {
          e.preventDefault();
          const i = Number.parseInt(s.dataset.page ?? "1", 10);
          if (!Number.isFinite(i) || i <= 0)
            return;
          this.goToPage(n, i);
        }
        const r = e.target instanceof Element ? e.target.closest("[data-runtime-workspace-link]") : null;
        if (r && this.liveController instanceof re) {
          const i = String(r.getAttribute("href") ?? "").trim();
          if (i) {
            const a = C(window.location.href), l = C(i);
            a === l && (e.preventDefault(), this.liveController.navigateToHref(i));
          }
        }
      },
      { signal: this.abortController.signal }
    ), this.root.addEventListener(
      "submit",
      (e) => {
        const s = e.target;
        if (!(s instanceof HTMLFormElement))
          return;
        const n = s.dataset.runtimeForm ?? "";
        if (n === "source-browser") {
          e.preventDefault();
          const r = new FormData(s);
          this.applyBrowserFilters({
            query: x(r.get("q")),
            provider_kind: x(r.get("provider_kind")),
            status: x(r.get("status")),
            has_pending_candidates: r.get("has_pending_candidates") ? !0 : void 0
          });
        }
        if (n === "source-search") {
          e.preventDefault();
          const r = new FormData(s);
          this.applySearchFilters({
            query: x(r.get("q")),
            provider_kind: x(r.get("provider_kind")),
            status: x(r.get("status")),
            result_kind: x(r.get("result_kind")),
            has_comments: r.get("has_comments") ? !0 : void 0
          });
        }
      },
      { signal: this.abortController.signal }
    ), this.root.addEventListener(
      "change",
      (e) => {
        const s = e.target;
        if (!(s instanceof HTMLSelectElement))
          return;
        const n = s.dataset.runtimeAction ?? "";
        if (n === "source-browser-page-page-size") {
          const r = Number.parseInt(s.value, 10);
          Number.isFinite(r) && r > 0 && this.changePageSize("source-browser", r);
        }
        if (n === "source-search-page-page-size") {
          const r = Number.parseInt(s.value, 10);
          Number.isFinite(r) && r > 0 && this.changePageSize("source-search", r);
        }
      },
      { signal: this.abortController.signal }
    );
  }
  bootstrapLiveController() {
    const e = String(this.config.api_base_path ?? "").trim(), s = x(this.config.context?.source_document_id), n = x(this.config.context?.source_revision_id), r = (i, a = this.page) => {
      this.liveController = i, de(a, i);
    };
    switch (this.page) {
      case "admin.sources.browser":
        r(
          ce({
            apiBasePath: e,
            onStateChange: (i) => this.renderBrowserState(i)
          })
        );
        break;
      case "admin.sources.detail":
        if (!s)
          return;
        r(
          q({
            apiBasePath: e,
            sourceId: s,
            onStateChange: (i) => this.renderWorkspaceState(i)
          })
        );
        break;
      case "admin.sources.workspace":
        if (!s)
          return;
        r(
          q({
            apiBasePath: e,
            sourceId: s,
            onStateChange: (i) => this.renderWorkspaceState(i)
          })
        );
        break;
      case "admin.sources.revision_inspector":
        if (!n)
          return;
        r(
          ae({
            apiBasePath: e,
            sourceRevisionId: n,
            onStateChange: (i) => this.renderRevisionState(i)
          })
        );
        break;
      case "admin.sources.comment_inspector":
        if (!n)
          return;
        r(
          oe({
            apiBasePath: e,
            sourceRevisionId: n,
            onStateChange: (i) => this.renderCommentState(i)
          })
        );
        break;
      case "admin.sources.artifact_inspector":
        if (!n)
          return;
        r(
          ie({
            apiBasePath: e,
            sourceRevisionId: n,
            onStateChange: (i) => this.renderArtifactState(i)
          })
        );
        break;
      case "admin.sources.search":
        r(
          ne({
            apiBasePath: e,
            onStateChange: (i) => this.renderSearchState(i)
          })
        );
        break;
    }
  }
  renderFromModel() {
    const e = this.model.contract;
    switch (this.page) {
      case "admin.sources.browser":
        this.root.innerHTML = V(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.detail":
      case "admin.sources.workspace":
        this.root.innerHTML = W(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.revision_inspector":
        this.root.innerHTML = Q(e);
        return;
      case "admin.sources.comment_inspector":
        this.root.innerHTML = K(e);
        return;
      case "admin.sources.artifact_inspector":
        this.root.innerHTML = G(e);
        return;
      case "admin.sources.search":
        this.root.innerHTML = J(
          e,
          this.config.routes ?? {},
          this.config,
          this.model.result_links
        );
        return;
    }
  }
  renderBrowserState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.listSources && (this.hasLiveContract = !0, this.root.innerHTML = V(e.contracts.listSources, this.config.routes ?? {}, this.config));
    }
  }
  renderWorkspaceState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.workspace && (this.hasLiveContract = !0, this.root.innerHTML = W(e.contracts.workspace, this.config.routes ?? {}, this.config));
    }
  }
  renderRevisionState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.revisionDetail && (this.hasLiveContract = !0, this.root.innerHTML = Q(e.contracts.revisionDetail));
    }
  }
  renderCommentState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.commentPage && (this.hasLiveContract = !0, this.root.innerHTML = K(e.contracts.commentPage));
    }
  }
  renderArtifactState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.artifactPage && (this.hasLiveContract = !0, this.root.innerHTML = G(e.contracts.artifactPage));
    }
  }
  renderSearchState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = M();
        return;
      }
      if (e.error) {
        this.root.innerHTML = L(e.error);
        return;
      }
      e.contracts?.searchResults && (this.hasLiveContract = !0, this.root.innerHTML = J(
        e.contracts.searchResults,
        this.config.routes ?? {},
        this.config,
        this.model.result_links
      ));
    }
  }
  async refresh() {
    if (this.liveController) {
      if ("refresh" in this.liveController && typeof this.liveController.refresh == "function") {
        await this.liveController.refresh();
        return;
      }
      if ("fetchSources" in this.liveController && typeof this.liveController.fetchSources == "function") {
        const s = this.liveController.getState().contracts?.query ?? {};
        await this.liveController.fetchSources(s);
      }
    }
  }
  async goToPage(e, s) {
    e === "source-browser-page" && this.liveController instanceof H && await this.liveController.goToPage(s), e === "source-comment-page" && this.liveController instanceof le && await this.liveController.goToPage(s), e === "source-search-page" && this.liveController instanceof j && await this.liveController.goToPage(s);
  }
  /**
   * Clear all browser filters - explicitly sets all filter values to undefined
   * to ensure they are removed from the URL and reset.
   */
  async clearBrowserFilters() {
    this.liveController instanceof H && await this.liveController.applyFilters({
      query: void 0,
      provider_kind: void 0,
      status: void 0,
      has_pending_candidates: void 0,
      sort: void 0
    });
  }
  /**
   * Clear all search filters - explicitly sets all filter values to undefined
   * to ensure they are removed from the URL and reset.
   */
  async clearSearchFilters() {
    this.liveController instanceof j && await this.liveController.applyFilters({
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
    this.liveController instanceof H && await this.liveController.applyFilters(e);
  }
  async applySearchFilters(e) {
    this.liveController instanceof j && await this.liveController.applyFilters(e);
  }
  async changePageSize(e, s) {
    e === "source-browser" && this.liveController instanceof H && await this.liveController.applyFilters({ page_size: s, page: 1 }), e === "source-search" && this.liveController instanceof j && await this.liveController.applyFilters({ page_size: s, page: 1 });
  }
}
function x(t) {
  const e = String(t ?? "").trim();
  return e || void 0;
}
function Le(t = document) {
  const e = Array.from(t.querySelectorAll("[data-admin-action-menu]"));
  if (e.length === 0)
    return;
  const s = (r) => {
    const i = r.querySelector("[data-admin-action-menu-trigger]");
    r.querySelector("[data-admin-action-menu-content]")?.classList.add("hidden"), i?.setAttribute("aria-expanded", "false");
  }, n = (r) => {
    for (const i of e)
      r && i === r || s(i);
  };
  for (const r of e) {
    if (r.dataset.adminActionMenuInit === "true")
      continue;
    r.dataset.adminActionMenuInit = "true";
    const i = r.querySelector("[data-admin-action-menu-trigger]"), a = r.querySelector("[data-admin-action-menu-content]");
    !i || !a || (i.addEventListener("click", (l) => {
      l.preventDefault(), l.stopPropagation();
      const d = i.getAttribute("aria-expanded") === "true";
      if (n(r), d) {
        s(r);
        return;
      }
      a.classList.remove("hidden"), i.setAttribute("aria-expanded", "true");
    }), r.addEventListener("keydown", (l) => {
      l.key === "Escape" && (s(r), i.focus());
    }));
  }
  typeof document < "u" && document.body?.dataset.adminActionMenusInit !== "true" && (document.body.dataset.adminActionMenusInit = "true", document.addEventListener("click", (r) => {
    const i = r.target instanceof Node ? r.target : null;
    if (!i) {
      n();
      return;
    }
    for (const a of e)
      if (a.contains(i))
        return;
    n();
  }));
}
function se() {
  const t = document.querySelector('[data-esign-page^="admin.sources."]'), e = document.querySelector("[data-source-management-runtime-root]");
  if (!t || !e)
    return null;
  Le(document);
  const s = N("esign-page-config"), n = N("source-management-page-model"), r = String(s?.page ?? t.dataset.esignPage ?? "").trim();
  if (!r)
    return null;
  const i = new Me({
    page: r,
    config: s ?? {},
    model: n ?? {},
    marker: t,
    root: e
  });
  return i.init(), i;
}
function Pe() {
  const t = {
    success: !1,
    page: null,
    surface: null,
    hasBackendConfig: !1,
    hasBackendPageModel: !1,
    hasBackendRoutes: !1,
    controllerMounted: !1,
    issues: []
  }, e = document.querySelector('[data-esign-page^="admin.sources."]'), s = document.querySelector("[data-source-management-runtime-root]");
  if (!e)
    return t.issues.push("Missing page marker element [data-esign-page]"), t;
  if (!s)
    return t.issues.push("Missing runtime root element [data-source-management-runtime-root]"), t;
  const n = N("esign-page-config"), r = N("source-management-page-model");
  t.hasBackendConfig = n !== null && typeof n.api_base_path == "string", t.hasBackendConfig || t.issues.push("Backend config missing or invalid - no api_base_path"), t.hasBackendPageModel = r !== null && typeof r.surface == "string", t.hasBackendPageModel || t.issues.push("Backend page model missing or invalid - no surface"), t.hasBackendRoutes = n?.routes !== void 0 && typeof n.routes == "object", t.hasBackendRoutes || t.issues.push("Backend routes missing from config");
  const i = String(n?.page ?? e.dataset.esignPage ?? "").trim();
  if (t.page = i || null, t.surface = r?.surface ?? e.dataset.sourceManagementSurface ?? null, !i)
    return t.issues.push("Page identifier not found in config or marker"), t;
  const a = [
    "_clientBootstrap",
    "_fallbackConfig",
    "_synthesizedRoutes",
    "_generatedApiPath"
  ];
  for (const d of a)
    n && d in n && t.issues.push(`Forbidden client-side bootstrap shim detected: ${d}`), r && d in r && t.issues.push(`Forbidden client-side bootstrap shim detected: ${d}`);
  const l = se();
  return t.controllerMounted = l !== null, t.controllerMounted || t.issues.push("Runtime controller failed to mount"), t.success = t.hasBackendConfig && t.hasBackendPageModel && t.hasBackendRoutes && t.controllerMounted && t.issues.length === 0, t;
}
function He() {
  const t = Pe();
  if (!t.success)
    throw new Error(`V2 runtime initialization failed: ${t.issues.join("; ")}`);
}
function je(t) {
  if (console.group("V2 Source-Management Runtime Initialization"), console.log(`Success: ${t.success ? "YES" : "NO"}`), console.log(`Page: ${t.page ?? "unknown"}`), console.log(`Surface: ${t.surface ?? "unknown"}`), console.log(`Backend Config: ${t.hasBackendConfig ? "✓" : "✗"}`), console.log(`Backend Page Model: ${t.hasBackendPageModel ? "✓" : "✗"}`), console.log(`Backend Routes: ${t.hasBackendRoutes ? "✓" : "✗"}`), console.log(`Controller Mounted: ${t.controllerMounted ? "✓" : "✗"}`), t.issues.length > 0) {
    console.group("Issues");
    for (const e of t.issues)
      console.log(`- ${e}`);
    console.groupEnd();
  }
  console.groupEnd();
}
typeof document < "u" && ue(() => {
  document.querySelector('[data-esign-page^="admin.sources."]') && se();
});
export {
  Me as S,
  y as a,
  be as b,
  Ae as c,
  Pe as d,
  He as e,
  se as i,
  je as l,
  xe as r,
  A as t
};
//# sourceMappingURL=source-management-runtime-B1_JtJD8.js.map
