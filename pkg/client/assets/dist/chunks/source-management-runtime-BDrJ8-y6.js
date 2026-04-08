import { escapeHTML as i } from "../shared/html.js";
import { onReady as ne } from "../shared/dom-ready.js";
import { readJSONScriptValue as j } from "../shared/json-parse.js";
import { c as J, s as ie } from "./ui-states-CskzQjWR.js";
import { o as k } from "./lineage-contracts-Ix6WeIZs.js";
import { d as U, f as ae } from "./formatters-oZ3pO-Hk.js";
import { c as oe, d as le, g as O, h as ce, l as de, n as I, p as ue, r as me, s as A, u as pe, y as ge } from "./source-management-pages-DQyM2WtD.js";
function fe(e) {
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
function p(e, t = "-") {
  const n = String(e ?? "").trim();
  return n ? `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${fe(n)}">${i(n.replace(/_/g, " "))}</span>` : `<span class="text-gray-400">${i(t)}</span>`;
}
function _(e, t) {
  const n = String(e ?? "").trim(), r = String(t ?? "").trim();
  return !n || !r ? n : n.replace(/:source_document_id/g, encodeURIComponent(r)).replace(/:source_revision_id/g, encodeURIComponent(r)).replace(new RegExp(encodeURIComponent(":source_document_id"), "g"), encodeURIComponent(r)).replace(new RegExp(encodeURIComponent(":source_revision_id"), "g"), encodeURIComponent(r));
}
function T(e, t) {
  const n = String(e ?? "").trim(), r = String(t ?? "").trim().replace(/^\?+/, "");
  if (!n || !r) return n;
  try {
    const s = new URL(n, "https://runtime.invalid");
    return new URLSearchParams(r).forEach((a, o) => {
      s.searchParams.has(o) || s.searchParams.append(o, a);
    }), `${s.pathname}${s.search}${s.hash}`;
  } catch {
    return n.includes("?") ? `${n}&${r}` : `${n}?${r}`;
  }
}
function he() {
  return typeof window > "u" || typeof window.location?.search != "string" ? "" : window.location.search.replace(/^\?+/, "").trim();
}
function S(e) {
  const t = String(e ?? "").trim();
  if (!t) return "";
  try {
    return new URL(t, "https://runtime.invalid").pathname;
  } catch {
    return t.split("?")[0] ?? "";
  }
}
function ve(e) {
  return e ? [
    e.source_browser,
    e.source_search,
    e.source_detail,
    e.source_workspace,
    e.source_revision,
    e.source_comment_inspector,
    e.source_artifact_inspector
  ].map((t) => S(String(t ?? ""))).filter((t) => t.length > 0) : [];
}
function xe(e, t) {
  const n = S(e).split("/").filter(Boolean), r = S(t).split("/").filter(Boolean);
  return n.length !== r.length ? !1 : r.every((s, a) => s.startsWith(":") || s === n[a]);
}
function y(e, t) {
  const n = S(String(e ?? ""));
  return n ? ve(t).some((r) => xe(n, r)) : !1;
}
function L(e, t, n) {
  const r = String(e ?? "").trim();
  if (!r) return "";
  try {
    const s = new URL(r, "https://runtime.invalid");
    return new URL(t, "https://runtime.invalid").searchParams.forEach((a, o) => {
      s.searchParams.has(o) || s.searchParams.append(o, a);
    }), T(`${s.pathname}${s.search}${s.hash}`, n);
  } catch {
    return T(r, n);
  }
}
function be(e, t) {
  const n = String(e ?? "").trim(), r = String(t.api_base_path ?? "").trim().replace(/\/+$/, "");
  if (!n || !r) return "";
  const s = S(n);
  return s.startsWith(r) ? s.slice(r.length) : "";
}
function B(e, t, n = he()) {
  const r = String(e ?? "").trim();
  if (!r) return "";
  const s = be(r, t);
  if (!s) return y(r, t.routes) ? T(r, n) : r.startsWith("/") ? "" : r;
  const a = s.match(/^\/sources\/([^/]+)\/workspace$/), o = s.match(/^\/sources\/([^/]+)$/), c = s.match(/^\/source-revisions\/([^/]+)$/), d = s.match(/^\/source-revisions\/([^/]+)\/comments$/), m = s.match(/^\/source-revisions\/([^/]+)\/artifacts$/);
  if (s === "/sources") return T(String(t.routes?.source_browser ?? ""), n);
  if (s === "/source-search") return T(String(t.routes?.source_search ?? ""), n);
  if (a) {
    const u = decodeURIComponent(a[1] ?? ""), $ = _(String(t.routes?.source_workspace ?? t.routes?.source_detail ?? ""), u);
    return y($, t.routes) ? L($, r, n) : "";
  }
  if (o) {
    const u = _(t.routes?.source_detail, decodeURIComponent(o[1] ?? ""));
    return y(u, t.routes) ? L(u, r, n) : "";
  }
  if (d) {
    const u = _(t.routes?.source_comment_inspector, decodeURIComponent(d[1] ?? ""));
    return y(u, t.routes) ? L(u, r, n) : "";
  }
  if (m) {
    const u = _(t.routes?.source_artifact_inspector, decodeURIComponent(m[1] ?? ""));
    return y(u, t.routes) ? L(u, r, n) : "";
  }
  if (c) {
    const u = _(t.routes?.source_revision, decodeURIComponent(c[1] ?? ""));
    return y(u, t.routes) ? L(u, r, n) : "";
  }
  return "";
}
function C(e, t, ...n) {
  for (const r of n) {
    const s = B(e?.[r], t);
    if (s) return s;
  }
  return "";
}
var Ue = [k.SOURCE_DOCUMENT, k.SOURCE_REVISION];
function ye(e, t) {
  const n = C(e.links, t, "workspace", "anchor", "source", "self");
  if (n) return n;
  const r = _(t.routes?.source_workspace ?? t.routes?.source_detail, e.source?.id ?? "");
  return y(r, t.routes) ? r : "";
}
function $e(e, t) {
  const n = B(e.drill_in?.href, t) || C(e.links, t, "anchor", "workspace", "comments", "artifacts", "source", "self");
  if (n) return n;
  if (e.result_kind === k.SOURCE_REVISION && e.revision?.id) {
    const r = _(t.routes?.source_revision, e.revision.id);
    return y(r, t.routes) ? r : "";
  }
  if (e.source?.id) {
    const r = _(t.routes?.source_workspace ?? t.routes?.source_detail, e.source.id);
    return y(r, t.routes) ? r : "";
  }
  return "";
}
function _e(e, t, n) {
  const r = Array.isArray(t) ? t : [];
  if (r.length === 0) return "";
  const s = String(e.revision?.id ?? "").trim(), a = String(e.source?.id ?? "").trim(), o = String(e.summary ?? e.source?.label ?? "").trim(), c = r.filter((d) => {
    const m = String(d?.href ?? "").trim();
    return m ? s && m.includes(s) || s && m.includes(encodeURIComponent(s)) || a && m.includes(a) || a && m.includes(encodeURIComponent(a)) || o && String(d?.label ?? "").trim() === o : !1;
  });
  for (const d of c) {
    const m = B(String(d?.href ?? "").trim(), n);
    if (m) return m;
  }
  return "";
}
function v(e, t, n = !1) {
  return J({
    containerClass: "py-12",
    bodyClass: "flex flex-col items-center justify-center text-center",
    contentClass: "",
    iconHtml: `
      <div class="rounded-full bg-gray-100 p-3 mb-4" aria-hidden="true">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
    `,
    title: e,
    titleTag: "h3",
    titleClass: "text-sm font-medium text-gray-900",
    message: t,
    messageClass: "mt-1 text-sm text-gray-500",
    actionsHtml: n ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ""
  });
}
function R() {
  return ie({
    containerClass: "py-12",
    bodyClass: "flex items-center justify-center",
    spinnerClass: "animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600",
    text: "Loading...",
    textClass: "ml-3 text-sm text-gray-500"
  });
}
function M(e) {
  return J({
    containerClass: "rounded-lg border border-red-200 bg-red-50 p-4",
    bodyClass: "flex items-start",
    contentClass: "ml-3",
    iconHtml: `
      <div class="flex-shrink-0" aria-hidden="true">
        <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
        </svg>
      </div>
    `,
    title: "Something went wrong",
    titleTag: "h3",
    titleClass: "text-sm font-medium text-red-800",
    message: e.message,
    messageClass: "mt-1 text-sm text-red-700",
    actionsHtml: `
      <button type="button" data-runtime-action="refresh" class="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
        Try again
      </button>
    `,
    role: "alert"
  });
}
var Y = "bg-white border border-gray-200 rounded-xl mb-4 p-4 shadow-sm", w = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", we = "h-10 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-500 bg-blue-50 text-blue-600 shadow-sm hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", F = "h-10 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-blue-600 bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors", X = "block w-full h-10 ps-9 pe-8 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-gray-200", H = "block w-full h-10 rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500", Z = "inline-flex items-center gap-2 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50", E = "bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden", g = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", f = "px-6 py-4 align-top", ke = "rounded-lg border border-gray-200 bg-gray-50 p-4", Ce = "rounded-xl border border-gray-200 bg-white p-6";
function N(e = "refresh", t = "Refresh") {
  return `
    <button type="button" data-runtime-action="${i(e)}" class="${w}">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
      ${i(t)}
    </button>
  `;
}
function b(e, t = "") {
  return `<div class="${ke}${t ? ` ${t}` : ""}">${e}</div>`;
}
function z(e, t = "") {
  return `<div class="${Ce}${t ? ` ${t}` : ""}">${e}</div>`;
}
function ee(e, t, n) {
  return `
    <button type="button" data-runtime-action="${i(e)}" class="${n ? we : w}">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
      ${i(t)}${n ? " (Active)" : ""}
    </button>
  `;
}
function Se(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="${Y}">
      <form data-runtime-form="source-browser">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${ee("toggle-filters", "Filter", !!(t.provider_kind || t.status || t.has_pending_candidates))}
              <div class="relative flex-1">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="browser-search" name="q" value="${i(t.query ?? "")}" placeholder="Search sources..." class="${X}" />
              </div>
            </div>

            <div id="browser-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-provider">Provider</label>
                  <select id="browser-provider" name="provider_kind" class="${H}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="browser-status">Status</label>
                  <select id="browser-status" name="status" class="${H}">
                    <option value="">All statuses</option>
                    <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${Z}">
                    <input type="checkbox" name="has_pending_candidates" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_pending_candidates ? "checked" : ""} />
                    <span>Pending review</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${F}">
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
function q(e, t, n) {
  const r = Se(e), s = e.items ?? [];
  if (s.length === 0) {
    const a = e.empty_state;
    return `
      ${r}
      <div class="${E}">
        ${v(a?.title ?? "No sources found", a?.description ?? "Try adjusting your filters or search terms.", !0)}
      </div>
    `;
  }
  return `
    ${r}
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
          <tbody class="bg-white divide-y divide-gray-200">${s.map((a) => {
    const o = a.source?.id ?? "", c = ye(a, {
      base_path: n.base_path,
      api_base_path: n.api_base_path,
      routes: t
    }), d = a.provider?.kind ?? "";
    return `
        <tr class="hover:bg-gray-50">
          <td class="${f}">
            <a href="${i(c)}" class="font-medium text-gray-900 hover:text-blue-600">${i(a.source?.label ?? "Untitled")}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${i(o.substring(0, 12))}...</p>
          </td>
          <td class="${f}">
            ${p(d)}
            <p class="mt-0.5 text-xs text-gray-500">${i(a.provider?.external_file_id ?? "-")}</p>
          </td>
          <td class="${f} text-sm text-gray-700">
            <p>${i(a.latest_revision?.provider_revision_hint ?? "-")}</p>
            <p class="mt-0.5 text-xs text-gray-500">${U(a.latest_revision?.modified_time)}</p>
          </td>
          <td class="${f}">${p(a.status)}</td>
          <td class="${f} text-sm">
            ${(a.pending_candidate_count ?? 0) > 0 ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${a.pending_candidate_count} pending</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f} text-right">
            <a href="${i(c)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
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
function P(e, t, n, r) {
  const s = e === String(n ?? "").trim();
  return `
    <section id="workspace-panel-${i(e)}" class="rounded-xl border ${s ? "border-blue-300 bg-blue-50/40" : "border-gray-200 bg-white"} p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">${i(t)}</h3>
        ${s ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Active</span>' : ""}
      </div>
      ${r}
    </section>
  `;
}
function Re(e, t) {
  const n = e.panels ?? [];
  if (n.length === 0) return "";
  const r = String(e.active_panel ?? "overview").trim();
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="flex flex-wrap gap-2">
        ${n.map((s) => {
    const a = C(s.links, t, "anchor", "workspace", "self"), o = s.id === r, c = s.item_count ?? 0, d = o ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50";
    return a ? `
              <a
                href="${i(a)}"
                data-runtime-workspace-link="panel"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${d}"
              >
                <span>${i(s.label)}</span>
                <span class="${o ? "text-blue-100" : "text-gray-400"}">${i(c)}</span>
              </a>
            ` : `
                <span class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${d}">
                  <span>${i(s.label)}</span>
                  <span class="${o ? "text-blue-100" : "text-gray-400"}">${i(c)}</span>
                </span>
              `;
  }).join("")}
      </div>
    </div>
  `;
}
function V(e, t, n) {
  if (e.empty_state?.kind && e.empty_state.kind !== "none") return v(e.empty_state.title ?? "Workspace unavailable", e.empty_state.description ?? "", !0);
  const r = String(e.active_panel ?? "overview").trim(), s = String(e.active_anchor ?? "").trim(), a = e.continuity, o = [...a.predecessors ?? [], ...a.successors ?? []], c = a.summary ? `<p class="text-sm text-gray-700">${i(a.summary)}</p>` : '<p class="text-sm text-gray-500">No continuity summary available.</p>', d = (e.timeline?.entries ?? []).length > 0 ? `<div class="space-y-3">
          ${e.timeline.entries.map((l) => {
    const h = B(l.drill_in?.href, n) || C(l.links, n, "anchor", "timeline", "workspace", "source", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(l.revision?.provider_revision_hint ?? l.revision?.id ?? "Revision")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(l.continuity_summary ?? "Continuity details available from backend workspace timeline.")}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${l.is_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Latest</span>' : ""}
                      ${l.is_repeated_handle ? '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Repeated Handle</span>' : ""}
                      ${h ? `<a href="${i(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${i(l.comment_count ?? 0)} comments</span>
                    <span>${i(l.agreement_count ?? 0)} agreements</span>
                    <span>${i(l.artifact_count ?? 0)} artifacts</span>
                    <span>${i(l.handle?.external_file_id ?? l.handle?.id ?? "No active handle")}</span>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(e.timeline?.empty_state?.title ?? "No revision timeline", e.timeline?.empty_state?.description ?? "No revisions are available in this workspace."), m = (e.agreements?.items ?? []).length > 0 ? `<div class="space-y-3">
          ${e.agreements.items.map((l) => {
    const h = C(l.links, n, "anchor", "workspace", "agreement", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(l.agreement?.label ?? l.agreement?.id ?? "Agreement")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(l.document?.label ?? l.document?.id ?? "Linked document")}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${p(l.status)}
                      ${l.is_pinned_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Pinned Latest</span>' : ""}
                      ${h ? `<a href="${i(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(e.agreements?.empty_state?.title ?? "No related agreements", e.agreements?.empty_state?.description ?? "No agreements are pinned to this source."), u = (e.artifacts?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.artifacts.items.map((l) => {
    const h = B(l.drill_in?.href, n) || C(l.links, n, "anchor", "workspace", "artifacts", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(l.artifact?.artifact_kind ?? "Artifact")}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(l.revision?.provider_revision_hint ?? l.revision?.id ?? "")}</p>
                    </div>
                    ${h ? `<a href="${i(h)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${i(l.provider?.kind ?? "provider")}</span>
                    <span>${i(l.artifact?.page_count ?? 0)} pages</span>
                    <span class="font-mono">${i(l.artifact?.id ?? "-")}</span>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(e.artifacts?.empty_state?.title ?? "No artifacts", e.artifacts?.empty_state?.description ?? "No artifacts are available in this workspace."), $ = (e.comments?.items ?? []).length > 0 ? `<div class="space-y-3">${e.comments.items.map(te).join("")}</div>` : v(e.comments?.empty_state?.title ?? "No comments", e.comments?.empty_state?.description ?? "No comment threads are available in this workspace."), re = (e.handles?.items ?? []).length > 0 ? `<div class="grid gap-3">
          ${e.handles.items.map((l) => {
    const h = C(l.links, n, "workspace", "source", "self");
    return `
                ${b(`
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${i(l.external_file_id ?? l.id)}</h4>
                      <p class="mt-1 text-xs text-gray-500">${i(l.provider_kind ?? "provider")}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      ${p(l.handle_status)}
                      ${h ? `<a href="${i(h)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ""}
                    </div>
                  </div>
                `)}
              `;
  }).join("")}
        </div>` : v(e.handles?.empty_state?.title ?? "No handles", e.handles?.empty_state?.description ?? "No handles are available in this workspace.");
  return `
    <div class="p-6 space-y-6">
      ${z(`
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">${i(e.source?.label ?? "Source Workspace")}</h2>
            <p class="mt-1 font-mono text-xs text-gray-500">${i(e.source?.id ?? "-")}</p>
          </div>
          ${N()}
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${p(e.status)}
          ${e.lineage_confidence ? `<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Confidence: ${i(e.lineage_confidence)}</span>` : ""}
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${i(e.revision_count ?? 0)} revisions</span>
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${i(e.handle_count ?? 0)} handles</span>
          ${s ? `<span class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Anchor: ${i(s)}</span>` : ""}
        </div>
      `)}

      ${Re(e, n)}

      ${P("overview", "Overview", r, `
          <div class="grid gap-4 md:grid-cols-2">
            ${b(`
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.provider?.label ?? e.provider?.kind ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${i(e.provider?.external_file_id ?? "-")}</p>
            `)}
            ${b(`
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Latest Revision</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${i(e.latest_revision?.provider_revision_hint ?? e.latest_revision?.id ?? "-")}</p>
              <p class="mt-1 text-xs text-gray-500">${U(e.latest_revision?.modified_time)}</p>
            `)}
          </div>
          ${b(`
            <div class="mb-2 flex items-center justify-between gap-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Continuity</h4>
              ${p(a.status)}
            </div>
            ${c}
            ${a.continuation ? `<p class="mt-3 text-xs text-gray-500">Continuation: ${i(a.continuation.label ?? a.continuation.id ?? "-")}</p>` : ""}
            ${o.length > 0 ? `<p class="mt-2 text-xs text-gray-500">Linked sources: ${o.map((l) => i(l.label ?? l.id ?? "-")).join(", ")}</p>` : ""}
          `, "mt-4")}
        `)}

      ${P("timeline", "Revision Timeline", r, d)}
      ${P("agreements", "Related Agreements", r, m)}
      ${P("artifacts", "Related Artifacts", r, u)}
      ${P("comments", "Related Comments", r, `${e.comments?.sync_status ? `<div class="mb-3">${p(e.comments.sync_status)}</div>` : ""}${$}`)}
      ${P("handles", "Active Handles", r, re)}
    </div>
  `;
}
function W(e) {
  return e.empty_state?.kind && e.empty_state.kind !== "none" ? v(e.empty_state.title ?? "Revision unavailable", e.empty_state.description ?? "", !0) : `
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${i(e.revision?.provider_revision_hint ?? "Revision")}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${i(e.revision?.id ?? "-")}</p>
        </div>
        ${N()}
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        ${b(`
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint Status</h3>
          <div class="mt-2">${p(e.fingerprint_status?.status)}</div>
          ${e.fingerprint_status?.error_message ? `<p class="mt-2 text-sm text-red-600">${i(e.fingerprint_status.error_message)}</p>` : ""}
        `)}
        ${b(`
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</h3>
          <div class="mt-2">${p(e.fingerprint_processing?.state)}</div>
          ${e.fingerprint_processing?.status_label ? `<p class="mt-2 text-sm text-gray-600">${i(e.fingerprint_processing.status_label)}</p>` : ""}
        `)}
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
          <p class="mt-1 text-sm text-gray-900">${U(e.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${e.fingerprint_status?.evidence_available ? "Available" : "Not available"}</p>
        </div>
      </div>
    </div>
  `;
}
function Q(e) {
  const t = e.items ?? [];
  if (t.length === 0) return v(e.empty_state?.title ?? "No artifacts", e.empty_state?.description ?? "No artifacts have been generated for this revision.", !0);
  const n = t.map((r) => `
        ${z(`
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${p(r.artifact_kind)}
              ${p(r.compatibility_tier)}
            </div>
            ${p(r.normalization_status)}
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
        `, "p-4")}
      `).join("");
  return `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Artifacts</h2>
          <p class="mt-1 text-sm text-gray-500">${t.length} artifact${t.length !== 1 ? "s" : ""}</p>
        </div>
        ${N()}
      </div>
      <div class="grid gap-4">${n}</div>
    </div>
  `;
}
function te(e) {
  return `
    ${z(`
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${p(e.status)}
          ${e.sync_status ? p(e.sync_status) : ""}
        </div>
        <span class="text-xs text-gray-500">${ae(e.last_synced_at)}</span>
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
    `, "p-4")}
  `;
}
function G(e) {
  const t = e.items ?? [];
  return t.length === 0 ? v(e.empty_state?.title ?? "No comments", e.empty_state?.description ?? "No comments have been synced for this revision.", !0) : `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Comments</h2>
          ${p(e.sync_status ?? "unknown")}
        </div>
        ${N()}
      </div>
      <div class="space-y-3">${t.map(te).join("")}</div>
      ${D(e.page_info, "source-comment-page")}
    </div>
  `;
}
function Me(e) {
  const t = e.applied_query ?? {};
  return `
    <div class="${Y}">
      <form data-runtime-form="source-search">
        <div class="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div class="relative max-w-2xl w-full flex flex-col gap-2">
            <div class="flex gap-2">
              ${ee("toggle-search-filters", "Filter", !!(t.provider_kind || t.status || t.result_kind || t.relationship_state || t.comment_sync_status || t.revision_hint || t.has_comments))}
              <div class="relative flex-1">
                <label class="sr-only" for="search-query">Search</label>
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                </div>
                <input type="search" id="search-query" name="q" value="${i(t.query ?? "")}" placeholder="Search sources, revisions, comments..." class="${X}" />
              </div>
            </div>
            <div id="search-filter-panel" class="hidden border border-gray-200 rounded-lg bg-gray-50 p-4 space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-provider-kind">Provider</label>
                  <select id="search-provider-kind" name="provider_kind" class="${H}">
                    <option value="">All providers</option>
                    <option value="google_docs" ${t.provider_kind === "google_docs" ? "selected" : ""}>Google Docs</option>
                    <option value="google_drive" ${t.provider_kind === "google_drive" ? "selected" : ""}>Google Drive</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-status">Status</label>
                  <select id="search-status" name="status" class="${H}">
                    <option value="">All statuses</option>
                    <option value="active" ${t.status === "active" ? "selected" : ""}>Active</option>
                    <option value="pending" ${t.status === "pending" ? "selected" : ""}>Pending</option>
                    <option value="archived" ${t.status === "archived" ? "selected" : ""}>Archived</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-medium text-gray-500 mb-1" for="search-result-kind">Type</label>
                  <select id="search-result-kind" name="result_kind" class="${H}">
                    <option value="">All types</option>
                    <option value="${k.SOURCE_DOCUMENT}" ${t.result_kind === k.SOURCE_DOCUMENT ? "selected" : ""}>Sources</option>
                    <option value="${k.SOURCE_REVISION}" ${t.result_kind === k.SOURCE_REVISION ? "selected" : ""}>Revisions</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="${Z}">
                    <input type="checkbox" name="has_comments" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${t.has_comments ? "checked" : ""} />
                    <span>Has comments</span>
                  </label>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-200">
                <button type="submit" class="${F}">
                  Apply Filters
                </button>
                <button type="button" data-runtime-action="clear-search-filters" class="${w}">
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <button type="submit" class="${F}">
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
function Pe(e, t, n, r) {
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
          <tbody class="bg-white divide-y divide-gray-200">${e.map((s) => {
    const a = _e(s, r, {
      base_path: n.base_path,
      api_base_path: n.api_base_path,
      routes: t
    }) || $e(s, {
      base_path: n.base_path,
      api_base_path: n.api_base_path,
      routes: t
    }), o = s.matched_fields ?? [], c = String(s.source?.id ?? "").trim(), d = String(s.revision?.id ?? "").trim(), m = Number(s.comment_count ?? 0), u = [c, d].filter(($) => $.length > 0);
    return `
        <tr class="hover:bg-gray-50">
          <td class="${f}">
            <a href="${i(a)}" class="font-medium text-gray-900 hover:text-blue-600">${i(s.summary ?? s.source?.label ?? "Result")}</a>
            ${u.length > 0 ? `<p class="mt-0.5 text-xs text-gray-500 font-mono">${i(u.join(" / "))}</p>` : ""}
          </td>
          <td class="${f}">
            ${p(s.result_kind)}
          </td>
          <td class="${f}">
            ${p(s.provider?.kind)}
          </td>
          <td class="${f}">
            ${o.length > 0 ? `<div class="flex flex-wrap gap-1">${o.map(($) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${i($)}</span>`).join("")}</div>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f}">
            ${m > 0 ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">${m} comment${m !== 1 ? "s" : ""}</span>` : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="${f} text-right">
            <a href="${i(a)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>
          </td>
        </tr>
      `;
  }).join("")}</tbody>
        </table>
      </div>
    </div>
  `;
}
function K(e, t, n, r) {
  const s = Me(e), a = e.items ?? [];
  if (a.length === 0) {
    const o = e.empty_state;
    return `
      ${s}
      <div class="${E}">
        ${v(o?.title ?? "No results found", o?.description ?? "Try adjusting your search terms or filters.", !1)}
      </div>
    `;
  }
  return `
    ${s}
    ${Pe(a, t, n, r)}
    ${D(e.page_info, "source-search-page")}
  `;
}
function D(e, t) {
  const n = Number(e?.page ?? 1), r = Number(e?.total_count ?? 0), s = Number(e?.page_size ?? 20);
  if (r <= 0 || r <= s) return "";
  const a = s > 0 ? Math.ceil(r / s) : 1;
  return `
    <div class="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div class="flex items-center justify-between gap-4">
        <!-- Left: Info text -->
        <div class="flex-shrink-0">
          <p class="text-sm text-gray-600">
            Showing <span class="font-medium">${(n - 1) * s + 1}</span> to
            <span class="font-medium">${Math.min(n * s, r)}</span> of
            <span class="font-medium">${r}</span>
          </p>
        </div>

        <!-- Center: Pagination buttons -->
        <div class="flex-1 flex justify-center">
          <nav class="flex items-center gap-x-1" aria-label="Pagination">
            <button
              type="button"
              data-runtime-action="${i(t)}"
              data-page="${n - 1}"
              class="${w} disabled:opacity-50 disabled:pointer-events-none"
              ${n <= 1 ? "disabled" : ""}
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              <span class="sr-only sm:not-sr-only">Previous</span>
            </button>
            <span class="px-4 py-2 text-sm font-medium text-gray-700">
              Page ${n} of ${a}
            </span>
            <button
              type="button"
              data-runtime-action="${i(t)}"
              data-page="${n + 1}"
              class="${w} disabled:opacity-50 disabled:pointer-events-none"
              ${n >= a ? "disabled" : ""}
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
            <option value="10" ${s === 10 ? "selected" : ""}>10</option>
            <option value="20" ${s === 20 ? "selected" : ""}>20</option>
            <option value="50" ${s === 50 ? "selected" : ""}>50</option>
            <option value="100" ${s === 100 ? "selected" : ""}>100</option>
          </select>
        </div>
      </div>
    </div>
  `;
}
var Le = class {
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
      const n = t.dataset.runtimeAction ?? "";
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
        const s = this.root.querySelector("#browser-filter-panel");
        s && s.classList.toggle("hidden");
        return;
      }
      if (n === "toggle-search-filters") {
        e.preventDefault();
        const s = this.root.querySelector("#search-filter-panel");
        s && s.classList.toggle("hidden");
        return;
      }
      if (n === "clear-search-filters") {
        e.preventDefault(), this.clearSearchFilters();
        return;
      }
      if (n === "source-browser-page" || n === "source-comment-page" || n === "source-search-page") {
        e.preventDefault();
        const s = Number.parseInt(t.dataset.page ?? "1", 10);
        if (!Number.isFinite(s) || s <= 0) return;
        this.goToPage(n, s);
      }
      const r = e.target instanceof Element ? e.target.closest("[data-runtime-workspace-link]") : null;
      if (r && this.liveController instanceof oe) {
        const s = String(r.getAttribute("href") ?? "").trim();
        s && S(window.location.href) === S(s) && (e.preventDefault(), this.liveController.navigateToHref(s));
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("submit", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLFormElement)) return;
      const n = t.dataset.runtimeForm ?? "";
      if (n === "source-browser") {
        e.preventDefault();
        const r = new FormData(t);
        this.applyBrowserFilters({
          query: x(r.get("q")),
          provider_kind: x(r.get("provider_kind")),
          status: x(r.get("status")),
          has_pending_candidates: r.get("has_pending_candidates") ? !0 : void 0
        });
      }
      if (n === "source-search") {
        e.preventDefault();
        const r = new FormData(t);
        this.applySearchFilters({
          query: x(r.get("q")),
          provider_kind: x(r.get("provider_kind")),
          status: x(r.get("status")),
          result_kind: x(r.get("result_kind")),
          has_comments: r.get("has_comments") ? !0 : void 0
        });
      }
    }, { signal: this.abortController.signal }), this.root.addEventListener("change", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLSelectElement)) return;
      const n = t.dataset.runtimeAction ?? "";
      if (n === "source-browser-page-page-size") {
        const r = Number.parseInt(t.value, 10);
        Number.isFinite(r) && r > 0 && this.changePageSize("source-browser", r);
      }
      if (n === "source-search-page-page-size") {
        const r = Number.parseInt(t.value, 10);
        Number.isFinite(r) && r > 0 && this.changePageSize("source-search", r);
      }
    }, { signal: this.abortController.signal });
  }
  bootstrapLiveController() {
    const e = String(this.config.api_base_path ?? "").trim(), t = x(this.config.context?.source_document_id), n = x(this.config.context?.source_revision_id), r = (s, a = this.page) => {
      this.liveController = s, ge(a, s);
    };
    switch (this.page) {
      case "admin.sources.browser":
        r(pe({
          apiBasePath: e,
          onStateChange: (s) => this.renderBrowserState(s)
        }));
        break;
      case "admin.sources.detail":
        if (!t) return;
        r(O({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (s) => this.renderWorkspaceState(s)
        }));
        break;
      case "admin.sources.workspace":
        if (!t) return;
        r(O({
          apiBasePath: e,
          sourceId: t,
          onStateChange: (s) => this.renderWorkspaceState(s)
        }));
        break;
      case "admin.sources.revision_inspector":
        if (!n) return;
        r(ue({
          apiBasePath: e,
          sourceRevisionId: n,
          onStateChange: (s) => this.renderRevisionState(s)
        }));
        break;
      case "admin.sources.comment_inspector":
        if (!n) return;
        r(le({
          apiBasePath: e,
          sourceRevisionId: n,
          onStateChange: (s) => this.renderCommentState(s)
        }));
        break;
      case "admin.sources.artifact_inspector":
        if (!n) return;
        r(de({
          apiBasePath: e,
          sourceRevisionId: n,
          onStateChange: (s) => this.renderArtifactState(s)
        }));
        break;
      case "admin.sources.search":
        r(ce({
          apiBasePath: e,
          onStateChange: (s) => this.renderSearchState(s)
        }));
        break;
    }
  }
  renderFromModel() {
    const e = this.model.contract;
    switch (this.page) {
      case "admin.sources.browser":
        this.root.innerHTML = q(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.detail":
      case "admin.sources.workspace":
        this.root.innerHTML = V(e, this.config.routes ?? {}, this.config);
        return;
      case "admin.sources.revision_inspector":
        this.root.innerHTML = W(e);
        return;
      case "admin.sources.comment_inspector":
        this.root.innerHTML = G(e);
        return;
      case "admin.sources.artifact_inspector":
        this.root.innerHTML = Q(e);
        return;
      case "admin.sources.search":
        this.root.innerHTML = K(e, this.config.routes ?? {}, this.config, this.model.result_links);
        return;
    }
  }
  renderBrowserState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.listSources && (this.hasLiveContract = !0, this.root.innerHTML = q(e.contracts.listSources, this.config.routes ?? {}, this.config));
    }
  }
  renderWorkspaceState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.workspace && (this.hasLiveContract = !0, this.root.innerHTML = V(e.contracts.workspace, this.config.routes ?? {}, this.config));
    }
  }
  renderRevisionState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.revisionDetail && (this.hasLiveContract = !0, this.root.innerHTML = W(e.contracts.revisionDetail));
    }
  }
  renderCommentState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.commentPage && (this.hasLiveContract = !0, this.root.innerHTML = G(e.contracts.commentPage));
    }
  }
  renderArtifactState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.artifactPage && (this.hasLiveContract = !0, this.root.innerHTML = Q(e.contracts.artifactPage));
    }
  }
  renderSearchState(e) {
    if (!(e.loading && !this.hasLiveContract && this.model.contract)) {
      if (e.loading) {
        this.root.innerHTML = R();
        return;
      }
      if (e.error) {
        this.root.innerHTML = M(e.error);
        return;
      }
      e.contracts?.searchResults && (this.hasLiveContract = !0, this.root.innerHTML = K(e.contracts.searchResults, this.config.routes ?? {}, this.config, this.model.result_links));
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
    e === "source-browser-page" && this.liveController instanceof I && await this.liveController.goToPage(t), e === "source-comment-page" && this.liveController instanceof me && await this.liveController.goToPage(t), e === "source-search-page" && this.liveController instanceof A && await this.liveController.goToPage(t);
  }
  async clearBrowserFilters() {
    this.liveController instanceof I && await this.liveController.applyFilters({
      query: void 0,
      provider_kind: void 0,
      status: void 0,
      has_pending_candidates: void 0,
      sort: void 0
    });
  }
  async clearSearchFilters() {
    this.liveController instanceof A && await this.liveController.applyFilters({
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
    this.liveController instanceof I && await this.liveController.applyFilters(e);
  }
  async applySearchFilters(e) {
    this.liveController instanceof A && await this.liveController.applyFilters(e);
  }
  async changePageSize(e, t) {
    e === "source-browser" && this.liveController instanceof I && await this.liveController.applyFilters({
      page_size: t,
      page: 1
    }), e === "source-search" && this.liveController instanceof A && await this.liveController.applyFilters({
      page_size: t,
      page: 1
    });
  }
};
function x(e) {
  const t = String(e ?? "").trim();
  return t || void 0;
}
function Te(e = document) {
  const t = Array.from(e.querySelectorAll("[data-admin-action-menu]"));
  if (t.length === 0) return;
  const n = (s) => {
    const a = s.querySelector("[data-admin-action-menu-trigger]");
    s.querySelector("[data-admin-action-menu-content]")?.classList.add("hidden"), a?.setAttribute("aria-expanded", "false");
  }, r = (s) => {
    for (const a of t)
      s && a === s || n(a);
  };
  for (const s of t) {
    if (s.dataset.adminActionMenuInit === "true") continue;
    s.dataset.adminActionMenuInit = "true";
    const a = s.querySelector("[data-admin-action-menu-trigger]"), o = s.querySelector("[data-admin-action-menu-content]");
    !a || !o || (a.addEventListener("click", (c) => {
      c.preventDefault(), c.stopPropagation();
      const d = a.getAttribute("aria-expanded") === "true";
      if (r(s), d) {
        n(s);
        return;
      }
      o.classList.remove("hidden"), a.setAttribute("aria-expanded", "true");
    }), s.addEventListener("keydown", (c) => {
      c.key === "Escape" && (n(s), a.focus());
    }));
  }
  typeof document < "u" && document.body?.dataset.adminActionMenusInit !== "true" && (document.body.dataset.adminActionMenusInit = "true", document.addEventListener("click", (s) => {
    const a = s.target instanceof Node ? s.target : null;
    if (!a) {
      r();
      return;
    }
    for (const o of t) if (o.contains(a)) return;
    r();
  }));
}
function se() {
  const e = document.querySelector('[data-esign-page^="admin.sources."]'), t = document.querySelector("[data-source-management-runtime-root]");
  if (!e || !t) return null;
  Te(document);
  const n = j("esign-page-config", null, { onError: (o) => console.warn("[SourceManagementRuntime] Failed to parse esign-page-config:", o) }), r = j("source-management-page-model", null, { onError: (o) => console.warn("[SourceManagementRuntime] Failed to parse source-management-page-model:", o) }), s = String(n?.page ?? e.dataset.esignPage ?? "").trim();
  if (!s) return null;
  const a = new Le({
    page: s,
    config: n ?? {},
    model: r ?? {},
    marker: e,
    root: t
  });
  return a.init(), a;
}
function He() {
  const e = {
    success: !1,
    page: null,
    surface: null,
    hasBackendConfig: !1,
    hasBackendPageModel: !1,
    hasBackendRoutes: !1,
    controllerMounted: !1,
    issues: []
  }, t = document.querySelector('[data-esign-page^="admin.sources."]'), n = document.querySelector("[data-source-management-runtime-root]");
  if (!t)
    return e.issues.push("Missing page marker element [data-esign-page]"), e;
  if (!n)
    return e.issues.push("Missing runtime root element [data-source-management-runtime-root]"), e;
  const r = j("esign-page-config", null, { onError: (o) => console.warn("[SourceManagementRuntime] Failed to parse esign-page-config:", o) }), s = j("source-management-page-model", null, { onError: (o) => console.warn("[SourceManagementRuntime] Failed to parse source-management-page-model:", o) });
  e.hasBackendConfig = r !== null && typeof r.api_base_path == "string", e.hasBackendConfig || e.issues.push("Backend config missing or invalid - no api_base_path"), e.hasBackendPageModel = s !== null && typeof s.surface == "string", e.hasBackendPageModel || e.issues.push("Backend page model missing or invalid - no surface"), e.hasBackendRoutes = r?.routes !== void 0 && typeof r.routes == "object", e.hasBackendRoutes || e.issues.push("Backend routes missing from config");
  const a = String(r?.page ?? t.dataset.esignPage ?? "").trim();
  if (e.page = a || null, e.surface = s?.surface ?? t.dataset.sourceManagementSurface ?? null, !a)
    return e.issues.push("Page identifier not found in config or marker"), e;
  for (const o of [
    "_clientBootstrap",
    "_fallbackConfig",
    "_synthesizedRoutes",
    "_generatedApiPath"
  ])
    r && o in r && e.issues.push(`Forbidden client-side bootstrap shim detected: ${o}`), s && o in s && e.issues.push(`Forbidden client-side bootstrap shim detected: ${o}`);
  return e.controllerMounted = se() !== null, e.controllerMounted || e.issues.push("Runtime controller failed to mount"), e.success = e.hasBackendConfig && e.hasBackendPageModel && e.hasBackendRoutes && e.controllerMounted && e.issues.length === 0, e;
}
function ze() {
  const e = He();
  if (!e.success) throw new Error(`V2 runtime initialization failed: ${e.issues.join("; ")}`);
}
function De(e) {
  if (console.group("V2 Source-Management Runtime Initialization"), console.log(`Success: ${e.success ? "YES" : "NO"}`), console.log(`Page: ${e.page ?? "unknown"}`), console.log(`Surface: ${e.surface ?? "unknown"}`), console.log(`Backend Config: ${e.hasBackendConfig ? "✓" : "✗"}`), console.log(`Backend Page Model: ${e.hasBackendPageModel ? "✓" : "✗"}`), console.log(`Backend Routes: ${e.hasBackendRoutes ? "✓" : "✗"}`), console.log(`Controller Mounted: ${e.controllerMounted ? "✓" : "✗"}`), e.issues.length > 0) {
    console.group("Issues");
    for (const t of e.issues) console.log(`- ${t}`);
    console.groupEnd();
  }
  console.groupEnd();
}
typeof document < "u" && ne(() => {
  document.querySelector('[data-esign-page^="admin.sources."]') && se();
});
export {
  He as a,
  ye as c,
  se as i,
  $e as l,
  Le as n,
  y as o,
  ze as r,
  De as s,
  Ue as t,
  B as u
};

//# sourceMappingURL=source-management-runtime-BDrJ8-y6.js.map