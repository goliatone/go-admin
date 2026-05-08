import { appendCSRFHeader as ce } from "../shared/transport/http-client.js";
var ue = 24, me = 50, J = /* @__PURE__ */ new Set([
  "image",
  "vector",
  "video",
  "audio"
]), fe = /* @__PURE__ */ new Set([
  "image",
  "vector",
  "video",
  "audio"
]);
function G(t, e) {
  const r = Math.max(0, e.attempted), n = Math.max(0, e.succeeded), f = Math.max(0, e.failed), m = e.failures.map((h) => l(h)).filter(Boolean).join(" ");
  return r === 0 || n === 0 && f === 0 ? {
    status: "",
    error: m
  } : f === 0 ? t === "upload" ? {
    status: n === 1 ? "Upload complete." : `${n} uploads completed.`,
    error: ""
  } : {
    status: n === 1 ? "Media item deleted." : `${n} media items deleted.`,
    error: ""
  } : n === 0 ? {
    status: "",
    error: m
  } : t === "upload" ? {
    status: `${n} of ${r} uploads completed.`,
    error: m
  } : {
    status: `${n} of ${r} media items deleted.`,
    error: m
  };
}
function L(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function pe(t) {
  const e = globalThis.HTMLElement;
  return typeof e < "u" && t instanceof e;
}
function d(t, e) {
  const r = t.querySelector(e);
  return r instanceof Element ? r : null;
}
function C(t, e) {
  return d(t, e) ?? d(t.ownerDocument, e);
}
function l(t) {
  return typeof t == "string" ? t.trim() : "";
}
function X(t) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const e = Number.parseFloat(t.trim());
    return Number.isFinite(e) ? e : 0;
  }
  return 0;
}
function j(t) {
  return Array.isArray(t) ? t.map((e) => l(e)).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
}
function ye(t) {
  return L(t) ? { ...t } : {};
}
function ge(t) {
  const e = L(t) ? t : {};
  return {
    state: l(e.state),
    reason: l(e.reason),
    capabilities: j(e.capabilities)
  };
}
function P(t, e) {
  return !t || !e ? "" : t.replace(":id", encodeURIComponent(e));
}
function z(t, e) {
  const r = L(t) ? t : {}, n = ye(r.metadata), f = l(r.mime_type), m = l(r.id), h = l(r.asset_url) || l(r.assetUrl) || P(e?.asset || "", m) || l(r.url), c = l(r.stream_url) || l(r.streamUrl) || P(e?.stream || "", m), w = l(r.poster_url) || l(r.posterUrl) || P(e?.poster || "", m), S = l(r.download_url) || l(r.downloadUrl) || P(e?.download || "", m) || h;
  return {
    id: m,
    name: l(r.name) || l(r.filename) || "Untitled asset",
    url: h,
    assetUrl: h,
    streamUrl: c,
    posterUrl: w,
    downloadUrl: S,
    thumbnail: w || l(r.thumbnail) || l(r.thumbnail_url),
    type: l(r.type) || he(f),
    mimeType: f,
    size: X(r.size),
    status: l(r.status),
    workflowStatus: l(r.workflow_status),
    createdAt: l(r.created_at),
    delivery: ge(r.delivery),
    metadata: n
  };
}
function K(t, e) {
  return !!(t && [
    e.url,
    e.assetUrl,
    e.streamUrl
  ].filter(Boolean).includes(t));
}
function he(t) {
  const e = ee("", t);
  return e === "asset" ? "" : e;
}
function Z(t) {
  return t.trim().toLowerCase();
}
function be(t) {
  const e = t.split(";", 1)[0].trim().toLowerCase();
  return e ? e === "image/svg+xml" ? "vector" : e.startsWith("image/") ? "image" : e.startsWith("video/") ? "video" : e.startsWith("audio/") ? "audio" : e.startsWith("text/") ? "text" : e.includes("pdf") || e.includes("document") ? "document" : "" : "";
}
function ee(t, e = "") {
  const r = Z(t), n = be(e);
  return J.has(r) ? r : n && J.has(n) ? n : r === "document" || r === "text" ? r : n === "document" || n === "text" ? n : "asset";
}
function ve(t, e) {
  return t.thumbnail ? (e === "image" || e === "vector") && K(t.thumbnail, t) ? t.thumbnail : K(t.thumbnail, t) ? "" : t.thumbnail : "";
}
function we(t) {
  const e = Z(t);
  return e ? fe.has(e) ? {
    key: "mime_family",
    value: e
  } : {
    key: "type",
    value: e
  } : null;
}
function O(t) {
  if (!Number.isFinite(t) || t <= 0) return "0 B";
  const e = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let r = t, n = 0;
  for (; r >= 1024 && n < e.length - 1; )
    r /= 1024, n += 1;
  return `${r.toFixed(n === 0 ? 0 : 1)} ${e[n]}`;
}
function H(t) {
  if (!t) return "Unknown";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function x(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function xe(t) {
  switch (t) {
    case "image":
    case "vector":
      return "iconoir-media-image";
    case "video":
      return "iconoir-video-camera";
    case "audio":
      return "iconoir-music-note";
    case "document":
    case "text":
      return "iconoir-page";
    default:
      return "iconoir-attachment";
  }
}
function te(t) {
  switch (t) {
    case "ready":
      return "bg-emerald-100 text-emerald-700";
    case "processing":
      return "bg-amber-100 text-amber-700";
    case "uploaded":
      return "bg-sky-100 text-sky-700";
    case "failed":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
}
function Y(t, e) {
  return t.replace(":id", encodeURIComponent(e));
}
async function T(t, e) {
  const r = e ?? {}, n = new Headers(r.headers ?? {});
  n.has("Accept") || n.set("Accept", "application/json"), ce(t, r, n);
  const f = await fetch(t, {
    ...r,
    credentials: "same-origin",
    headers: n
  }), m = String(f.headers.get("content-type") || "").toLowerCase(), h = m.includes("application/json") || m.includes("+json") ? await f.json().catch(() => null) : await f.text().catch(() => "");
  if (!f.ok) throw new Error(R(h) || `Request failed (${f.status})`);
  return h;
}
function R(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const r = R(e);
      if (r) return r;
    }
    return "";
  }
  if (!L(t)) return "";
  for (const e of [
    "error",
    "message",
    "detail",
    "reason"
  ]) {
    const r = R(t[e]);
    if (r) return r;
  }
  return "";
}
function Ee(t, e) {
  const r = document.createElement("div");
  r.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const n = document.createElement("i");
  return n.className = `${xe(t)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, r.appendChild(n), r;
}
function A(t, e) {
  const r = document.createElement("div");
  r.className = e === "list" ? "w-12 h-12" : "w-full h-full";
  const n = ee(t.type, t.mimeType), f = n === "image" || n === "vector", m = ve(t, n), h = m || t.assetUrl;
  if (f && h) {
    const c = document.createElement("img");
    return c.src = h, c.alt = t.name, c.loading = "lazy", c.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", r.appendChild(c), r;
  }
  if (n === "video" && e !== "detail" && m) {
    const c = document.createElement("img");
    return c.src = m, c.alt = t.name, c.loading = "lazy", c.className = e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", r.appendChild(c), r;
  }
  if (e === "detail" && n === "video" && (t.streamUrl || t.assetUrl)) {
    const c = document.createElement("video");
    return c.src = t.streamUrl || t.assetUrl, c.controls = !0, c.preload = "metadata", c.playsInline = !0, c.className = "w-full h-full object-contain bg-black", c.setAttribute("aria-label", t.name || "Video preview"), m && (c.poster = m), r.appendChild(c), r;
  }
  if (e === "detail" && n === "audio" && (t.streamUrl || t.assetUrl)) {
    r.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-gray-600";
    const c = document.createElement("i");
    c.className = "iconoir-music-note text-5xl";
    const w = document.createElement("audio");
    return w.src = t.streamUrl || t.assetUrl, w.controls = !0, w.preload = "metadata", w.className = "w-full max-w-full", w.setAttribute("aria-label", t.name || "Audio preview"), r.appendChild(c), r.appendChild(w), r;
  }
  return Ee(n, e);
}
function $e(t, e) {
  return A(z(t), e);
}
function Ie(t, e, r) {
  const n = document.createElement("button");
  n.type = "button", n.dataset.mediaItem = t.id, n.className = [
    "group",
    "text-left",
    "bg-white",
    "border",
    "rounded-2xl",
    "overflow-hidden",
    "shadow-sm",
    "transition",
    r ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
  ].join(" ");
  const f = document.createElement("div");
  f.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", f.appendChild(A(t, "card"));
  const m = document.createElement("input");
  m.type = "checkbox", m.checked = e, m.dataset.mediaSelect = t.id, m.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", f.appendChild(m);
  const h = document.createElement("span");
  h.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${te(t.workflowStatus || t.status)}`, h.textContent = t.workflowStatus || t.status || "unknown", f.appendChild(h);
  const c = document.createElement("div");
  return c.className = "p-4", c.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${x(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${x(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${x(O(t.size))}</span>
      <span>${x(H(t.createdAt))}</span>
    </div>
  `, n.appendChild(f), n.appendChild(c), n;
}
function De(t, e, r) {
  const n = document.createElement("tr");
  n.dataset.mediaItem = t.id, n.className = r ? "bg-gray-50" : "", n.innerHTML = `
    <td class="px-4 py-3">
      <input type="checkbox" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" data-media-select="${x(t.id)}" ${e ? "checked" : ""}>
    </td>
    <td class="px-4 py-3" data-media-preview-cell></td>
    <td class="px-4 py-3 min-w-[240px]">
      <div class="font-medium text-gray-900">${x(t.name)}</div>
      <div class="text-xs text-gray-500 break-all mt-1">${x(t.url || "")}</div>
    </td>
    <td class="px-4 py-3 hidden md:table-cell">${x(t.type || "asset")}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${te(t.workflowStatus || t.status)}">
        ${x(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${x(O(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${x(H(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${x(t.id)}">Inspect</button>
    </td>
  `;
  const f = d(n, "[data-media-preview-cell]");
  return f && f.appendChild(A(t, "list")), n;
}
function Le(t) {
  return {
    root: t,
    search: d(t, "[data-media-search]"),
    typeFilter: d(t, "[data-media-type-filter]"),
    statusFilter: d(t, "[data-media-status-filter]"),
    sort: d(t, "[data-media-sort]"),
    grid: d(t, "[data-media-grid]"),
    listShell: d(t, "[data-media-list]"),
    listBody: d(t, "[data-media-list-body]"),
    loadMore: d(t, "[data-media-load-more]"),
    countLabel: d(t, "[data-media-count-label]"),
    footer: d(t, "[data-media-footer]"),
    empty: d(t, "[data-media-empty]"),
    noResults: d(t, "[data-media-no-results]"),
    loading: d(t, "[data-media-loading]"),
    error: d(t, "[data-media-error]"),
    status: d(t, "[data-media-status]"),
    uploadInput: C(t, "[data-media-upload-input]"),
    uploadTrigger: C(t, "[data-media-upload-trigger]"),
    uploadEmpty: d(t, "[data-media-upload-empty]"),
    selectAll: d(t, "[data-media-select-all]"),
    selectionBar: C(t, "[data-media-selection-bar]"),
    selectionCount: C(t, "[data-media-selected-count]"),
    clearSelection: C(t, "[data-media-clear-selection]"),
    bulkDelete: C(t, "[data-media-bulk-delete]"),
    detailEmpty: d(t, "[data-media-detail-empty]"),
    detail: d(t, "[data-media-detail]"),
    detailPreview: d(t, "[data-media-detail-preview]"),
    detailName: d(t, "[data-media-detail-name]"),
    detailURL: d(t, "[data-media-detail-url]"),
    detailType: d(t, "[data-media-detail-type]"),
    detailStatus: d(t, "[data-media-detail-status-label]"),
    detailSize: d(t, "[data-media-detail-size]"),
    detailDate: d(t, "[data-media-detail-date]"),
    detailForm: d(t, "[data-media-detail-form]"),
    detailAltText: d(t, "#media-alt-text"),
    detailCaption: d(t, "#media-caption"),
    detailTags: d(t, "#media-tags"),
    detailError: d(t, "[data-media-detail-error]"),
    detailFeedback: d(t, "[data-media-detail-feedback]"),
    detailSaveButton: d(t, "[data-media-save-button]"),
    detailCopyURL: d(t, "[data-media-copy-url]"),
    detailDelete: d(t, "[data-media-delete]")
  };
}
function ke(t, e) {
  let r = 0;
  return ((...n) => {
    globalThis.clearTimeout(r), r = globalThis.setTimeout(() => t(...n), e);
  });
}
function p(t, e) {
  if (t) {
    if (!e) {
      t.textContent = "", t.classList.add("hidden");
      return;
    }
    t.textContent = e, t.classList.remove("hidden");
  }
}
function D(t, e, r = "hidden") {
  t && (e ? t.classList.remove(r) : t.classList.add(r));
}
function Te(t) {
  return j(t.tags).join(", ");
}
function Ue(t) {
  const e = t.delivery.state || t.workflowStatus || t.status || "unknown";
  return [
    "unavailable",
    "needs_import",
    "not_playable",
    "failed"
  ].includes(e) && t.delivery.reason ? `${e}: ${t.delivery.reason}` : e;
}
function Q(t) {
  return t.downloadUrl || t.assetUrl || t.url;
}
async function Ce(t) {
  const e = Le(t), r = l(t.dataset.mediaView) === "list" ? "list" : "grid", n = l(t.dataset.mediaLibraryPath), f = l(t.dataset.mediaItemPath), m = l(t.dataset.mediaUploadPath), h = l(t.dataset.mediaPresignPath), c = l(t.dataset.mediaConfirmPath), w = l(t.dataset.mediaCapabilitiesPath), S = {
    asset: l(t.dataset.mediaAssetUrlTemplate),
    stream: l(t.dataset.mediaStreamUrlTemplate),
    poster: l(t.dataset.mediaPosterUrlTemplate),
    download: l(t.dataset.mediaDownloadUrlTemplate)
  }, i = {
    items: [],
    total: 0,
    selectedIDs: /* @__PURE__ */ new Set(),
    activeID: "",
    loading: !1,
    capabilities: null
  };
  function _() {
    return i.activeID ? i.items.find((a) => a.id === i.activeID) ?? null : null;
  }
  function N() {
    return !!(i.capabilities?.operations?.upload || i.capabilities?.operations?.presign || i.capabilities?.upload?.direct_upload || i.capabilities?.upload?.presign);
  }
  function W() {
    return !!i.capabilities?.operations?.update;
  }
  function F() {
    return !!i.capabilities?.operations?.delete;
  }
  function $() {
    const a = _();
    if (D(e.detailEmpty, !a), D(e.detail, !!a), !a) {
      p(e.detailError, ""), p(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(A(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = Q(a)), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = Ue(a)), e.detailSize && (e.detailSize.textContent = O(a.size)), e.detailDate && (e.detailDate.textContent = H(a.createdAt)), e.detailAltText && (e.detailAltText.value = l(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = l(a.metadata.caption)), e.detailTags && (e.detailTags.value = Te(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !W()), e.detailDelete && (e.detailDelete.disabled = !F());
  }
  function U() {
    const a = i.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), D(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !F() || a === 0);
  }
  function E() {
    if (e.grid && (e.grid.replaceChildren(), r === "grid"))
      for (const a of i.items) {
        const s = Ie(a, i.selectedIDs.has(a.id), i.activeID === a.id), y = d(s, `[data-media-select="${a.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), U(), E();
        }), s.addEventListener("click", () => {
          i.activeID = a.id, $(), E();
        }), e.grid.appendChild(s);
      }
    if (e.listBody && (e.listBody.replaceChildren(), r === "list"))
      for (const a of i.items) {
        const s = De(a, i.selectedIDs.has(a.id), i.activeID === a.id);
        s.addEventListener("click", () => {
          i.activeID = a.id, $(), E();
        });
        const y = d(s, `[data-media-select="${a.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), U(), E();
        }), d(s, `[data-media-open="${a.id}"]`)?.addEventListener("click", (u) => {
          u.stopPropagation(), i.activeID = a.id, $(), E();
        }), e.listBody.appendChild(s);
      }
    e.countLabel && (e.countLabel.textContent = `${i.items.length} of ${i.total || i.items.length} items`), e.selectAll && (e.selectAll.checked = i.items.length > 0 && i.items.every((a) => i.selectedIDs.has(a.id))), D(e.footer, i.items.length > 0), D(e.loadMore, i.items.length > 0 && i.items.length < i.total), U(), $();
  }
  function M() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), s = i.items.length > 0;
    D(e.loading, i.loading, "hidden"), D(e.empty, !i.loading && !s && !a), D(e.noResults, !i.loading && !s && a), D(e.grid, !i.loading && s && r === "grid"), D(e.listShell, !i.loading && s && r === "list");
  }
  function ae(a) {
    i.items = i.items.map((s) => s.id === a.id ? a : s), i.activeID || (i.activeID = a.id), E(), M();
  }
  async function ie() {
    if (w) {
      try {
        const a = await T(w);
        i.capabilities = L(a) ? a : null;
      } catch (a) {
        p(e.status, ""), p(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !N()), e.uploadEmpty && (e.uploadEmpty.disabled = !N());
    }
  }
  async function k(a = !1) {
    if (!n) {
      p(e.error, "Media library endpoint is not configured.");
      return;
    }
    i.loading = !0, M(), p(e.error, "");
    const s = new URLSearchParams(), y = r === "list" ? me : ue, u = a ? i.items.length : 0;
    s.set("limit", String(y)), s.set("offset", String(u)), e.search?.value.trim() && s.set("search", e.search.value.trim());
    const b = we(e.typeFilter?.value || "");
    b && s.set(b.key, b.value), e.statusFilter?.value && s.set("status", e.statusFilter.value), e.sort?.value && s.set("sort", e.sort.value);
    try {
      const o = await T(`${n}?${s.toString()}`), g = L(o) ? o : {}, v = (Array.isArray(g.items) ? g.items : []).map((I) => z(I, S)).filter((I) => I.id);
      i.items = a ? [...i.items, ...v.filter((I) => !i.items.some((B) => B.id === I.id))] : v, i.total = Math.max(X(g.total), i.items.length), i.activeID && !i.items.some((I) => I.id === i.activeID) && (i.activeID = ""), !i.activeID && i.items.length > 0 && (i.activeID = i.items[0].id);
    } catch (o) {
      p(e.error, o instanceof Error ? o.message : "Failed to load media library.");
    } finally {
      i.loading = !1, E(), M();
    }
  }
  async function re() {
    const a = _();
    if (!a || !W()) return;
    if (!f) {
      p(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const s = { ...a.metadata }, y = e.detailAltText?.value.trim() || "", u = e.detailCaption?.value.trim() || "", b = j(e.detailTags?.value || "");
    y ? s.alt_text = y : delete s.alt_text, u ? s.caption = u : delete s.caption, b.length > 0 ? s.tags = b : delete s.tags;
    try {
      p(e.detailError, ""), p(e.detailFeedback, ""), ae(z(await T(Y(f, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: s })
      }), S)), p(e.detailFeedback, "Metadata saved.");
    } catch (o) {
      p(e.detailError, o instanceof Error ? o.message : "Failed to save metadata.");
    }
  }
  async function q(a, s) {
    if (!F()) return {
      deleted: !1,
      error: ""
    };
    if (!f) {
      const u = "Media item endpoint is not configured.";
      return s?.reportDetailError !== !1 && p(e.detailError, u), {
        deleted: !1,
        error: u
      };
    }
    const y = i.items.find((u) => u.id === a)?.name || "this media item";
    if (!s?.skipConfirm && !globalThis.confirm(`Delete ${y}?`)) return {
      deleted: !1,
      error: ""
    };
    try {
      return p(e.detailError, ""), await T(Y(f, a), { method: "DELETE" }), i.items = i.items.filter((u) => u.id !== a), i.selectedIDs.delete(a), i.activeID === a && (i.activeID = i.items[0]?.id || ""), i.total = Math.max(0, i.total - 1), E(), M(), s?.suppressStatus || p(e.status, "Media item deleted."), {
        deleted: !0,
        error: ""
      };
    } catch (u) {
      const b = u instanceof Error ? u.message : "Failed to delete media item.";
      return s?.reportDetailError !== !1 && p(e.detailError, b), {
        deleted: !1,
        error: b
      };
    }
  }
  async function ne() {
    if (!F() || i.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${i.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...i.selectedIDs], s = /* @__PURE__ */ new Set(), y = [];
    let u = 0;
    p(e.error, ""), p(e.detailError, "");
    for (const o of a) {
      const g = i.items.find((I) => I.id === o), v = await q(o, {
        skipConfirm: !0,
        suppressStatus: !0,
        reportDetailError: !1
      });
      if (v.deleted) {
        u += 1;
        continue;
      }
      s.add(o), v.error && y.push(`Failed to delete ${g?.name || o}: ${v.error}`);
    }
    i.selectedIDs = s, U(), E();
    const b = G("delete", {
      attempted: a.length,
      succeeded: u,
      failed: y.length,
      failures: y
    });
    p(e.status, b.status), p(e.error, b.error);
  }
  async function se() {
    const a = _(), s = a ? Q(a) : "";
    if (s)
      try {
        await globalThis.navigator.clipboard.writeText(s), p(e.detailFeedback, "URL copied.");
      } catch {
        p(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function de(a, s) {
    const y = l(a.upload_url);
    if (!y) throw new Error("Upload URL missing from presign response.");
    const u = L(a.fields) ? a.fields : null;
    if (u) {
      const g = new FormData();
      for (const [I, B] of Object.entries(u)) g.append(I, String(B));
      g.append("file", s);
      const v = await fetch(y, {
        method: l(a.method) || "POST",
        body: g
      });
      if (!v.ok) throw new Error(`Upload failed (${v.status}).`);
      return;
    }
    const b = new Headers();
    if (L(a.headers)) for (const [g, v] of Object.entries(a.headers)) b.set(g, String(v));
    const o = await fetch(y, {
      method: l(a.method) || "PUT",
      headers: b,
      body: s
    });
    if (!o.ok) throw new Error(`Upload failed (${o.status}).`);
  }
  async function le(a) {
    const s = Array.from(a);
    if (s.length === 0) return;
    if (!N()) {
      p(e.error, "Uploads are not available for this request.");
      return;
    }
    p(e.error, "");
    let y = 0;
    const u = [];
    for (const o of s) {
      p(e.status, `Uploading ${o.name}…`);
      try {
        if (i.capabilities?.upload?.direct_upload && m) {
          const g = new FormData();
          g.append("file", o), g.append("name", o.name), g.append("file_name", o.name), g.append("content_type", o.type), await T(m, {
            method: "POST",
            body: g
          });
        } else if (i.capabilities?.upload?.presign && h && c) {
          const g = await T(h, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: o.name,
              file_name: o.name,
              content_type: o.type,
              size: o.size
            })
          });
          if (!L(g)) throw new Error("Invalid presign response.");
          await de(g, o), await T(c, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_id: l(g.upload_id),
              name: o.name,
              file_name: o.name,
              content_type: o.type,
              size: o.size
            })
          });
        } else throw new Error("No supported upload mode is configured.");
        y += 1;
      } catch (g) {
        const v = g instanceof Error ? g.message : `Failed to upload ${o.name}.`;
        u.push(`Failed to upload ${o.name}: ${v}`);
      }
    }
    const b = G("upload", {
      attempted: s.length,
      succeeded: y,
      failed: u.length,
      failures: u
    });
    p(e.status, b.status), p(e.error, b.error), y > 0 && await k(!1);
  }
  const oe = ke(() => {
    k(!1);
  }, 250);
  e.search?.addEventListener("input", oe), e.typeFilter?.addEventListener("change", () => {
    k(!1);
  }), e.statusFilter?.addEventListener("change", () => {
    k(!1);
  }), e.sort?.addEventListener("change", () => {
    k(!1);
  }), e.loadMore?.addEventListener("click", () => {
    k(!0);
  }), e.selectAll?.addEventListener("change", () => {
    if (e.selectAll?.checked) for (const a of i.items) i.selectedIDs.add(a.id);
    else i.selectedIDs.clear();
    U(), E();
  });
  const V = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", V), e.uploadEmpty?.addEventListener("click", V), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (le(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    i.selectedIDs.clear(), U(), E();
  }), e.bulkDelete?.addEventListener("click", () => {
    ne();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), re();
  }), e.detailCopyURL?.addEventListener("click", () => {
    se();
  }), e.detailDelete?.addEventListener("click", () => {
    i.activeID && q(i.activeID);
  }), await ie(), await k(!1);
}
async function Se() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    pe(e) && await Ce(e);
}
typeof document < "u" && Se();
export {
  $e as buildMediaPreview,
  ee as inferMediaFamily,
  Se as initMediaPages,
  we as mediaTypeFilterParam,
  G as summarizeBatchMutation
};

//# sourceMappingURL=index.js.map