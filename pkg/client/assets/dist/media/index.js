import { httpRequest as ce } from "../shared/transport/http-client.js";
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
  const i = Math.max(0, e.attempted), n = Math.max(0, e.succeeded), m = Math.max(0, e.failed), f = e.failures.map((b) => l(b)).filter(Boolean).join(" ");
  return i === 0 || n === 0 && m === 0 ? {
    status: "",
    error: f
  } : m === 0 ? t === "upload" ? {
    status: n === 1 ? "Upload complete." : `${n} uploads completed.`,
    error: ""
  } : {
    status: n === 1 ? "Media item deleted." : `${n} media items deleted.`,
    error: ""
  } : n === 0 ? {
    status: "",
    error: f
  } : t === "upload" ? {
    status: `${n} of ${i} uploads completed.`,
    error: f
  } : {
    status: `${n} of ${i} media items deleted.`,
    error: f
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
  const i = t.querySelector(e);
  return i instanceof Element ? i : null;
}
function U(t, e) {
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
function he(t, e) {
  return t.capabilities.some((i) => i.trim().toLowerCase().replace(/-/g, "_") === e);
}
function be(t, e, i) {
  if (he(e, "poster")) return !0;
  const n = l(t.type).toLowerCase();
  return n === "image" || n === "vector" ? !0 : i.toLowerCase().startsWith("image/");
}
function z(t, e) {
  const i = L(t) ? t : {}, n = ye(i.metadata), m = l(i.mime_type), f = l(i.id), b = ge(i.delivery), o = l(i.asset_url) || l(i.assetUrl) || P(e?.asset || "", f) || l(i.url), x = l(i.stream_url) || l(i.streamUrl) || P(e?.stream || "", f), S = l(i.poster_url) || l(i.posterUrl) || (be(i, b, m) ? P(e?.poster || "", f) : ""), r = l(i.download_url) || l(i.downloadUrl) || P(e?.download || "", f) || o;
  return {
    id: f,
    name: l(i.name) || l(i.filename) || "Untitled asset",
    url: o,
    assetUrl: o,
    streamUrl: x,
    posterUrl: S,
    downloadUrl: r,
    thumbnail: S || l(i.thumbnail) || l(i.thumbnail_url),
    type: l(i.type) || ve(m),
    mimeType: m,
    size: X(i.size),
    status: l(i.status),
    workflowStatus: l(i.workflow_status),
    createdAt: l(i.created_at),
    delivery: b,
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
function ve(t) {
  const e = ee("", t);
  return e === "asset" ? "" : e;
}
function Z(t) {
  return t.trim().toLowerCase();
}
function we(t) {
  const e = t.split(";", 1)[0].trim().toLowerCase();
  return e ? e === "image/svg+xml" ? "vector" : e.startsWith("image/") ? "image" : e.startsWith("video/") ? "video" : e.startsWith("audio/") ? "audio" : e.startsWith("text/") ? "text" : e.includes("pdf") || e.includes("document") ? "document" : "" : "";
}
function ee(t, e = "") {
  const i = Z(t), n = we(e);
  return J.has(i) ? i : n && J.has(n) ? n : i === "document" || i === "text" ? i : n === "document" || n === "text" ? n : "asset";
}
function xe(t, e) {
  return t.thumbnail ? (e === "image" || e === "vector") && K(t.thumbnail, t) ? t.thumbnail : K(t.thumbnail, t) ? "" : t.thumbnail : "";
}
function Ee(t) {
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
  let i = t, n = 0;
  for (; i >= 1024 && n < e.length - 1; )
    i /= 1024, n += 1;
  return `${i.toFixed(n === 0 ? 0 : 1)} ${e[n]}`;
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
function w(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Ie(t) {
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
async function k(t, e) {
  const i = e ?? {}, n = new Headers(i.headers ?? {});
  n.has("Accept") || n.set("Accept", "application/json");
  const m = await ce(t, {
    ...i,
    credentials: "same-origin",
    headers: n
  }), f = String(m.headers.get("content-type") || "").toLowerCase(), b = f.includes("application/json") || f.includes("+json") ? await m.json().catch(() => null) : await m.text().catch(() => "");
  if (!m.ok) throw new Error(R(b) || `Request failed (${m.status})`);
  return b;
}
function R(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const i = R(e);
      if (i) return i;
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
    const i = R(t[e]);
    if (i) return i;
  }
  return "";
}
function De(t, e) {
  const i = document.createElement("div");
  i.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const n = document.createElement("i");
  return n.className = `${Ie(t)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, i.appendChild(n), i;
}
function A(t, e) {
  const i = document.createElement("div");
  i.className = e === "list" ? "w-12 h-12" : "w-full h-full";
  const n = ee(t.type, t.mimeType), m = n === "image" || n === "vector", f = xe(t, n), b = f || t.assetUrl;
  if (m && b) {
    const o = document.createElement("img");
    return o.src = b, o.alt = t.name, o.loading = "lazy", o.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", i.appendChild(o), i;
  }
  if (n === "video" && e !== "detail" && f) {
    const o = document.createElement("img");
    return o.src = f, o.alt = t.name, o.loading = "lazy", o.className = e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", i.appendChild(o), i;
  }
  if (e === "detail" && n === "video" && (t.streamUrl || t.assetUrl)) {
    const o = document.createElement("video");
    return o.src = t.streamUrl || t.assetUrl, o.controls = !0, o.preload = "metadata", o.playsInline = !0, o.className = "w-full h-full object-contain bg-black", o.setAttribute("aria-label", t.name || "Video preview"), f && (o.poster = f), i.appendChild(o), i;
  }
  if (e === "detail" && n === "audio" && (t.streamUrl || t.assetUrl)) {
    i.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-gray-600";
    const o = document.createElement("i");
    o.className = "iconoir-music-note text-5xl";
    const x = document.createElement("audio");
    return x.src = t.streamUrl || t.assetUrl, x.controls = !0, x.preload = "metadata", x.className = "w-full max-w-full", x.setAttribute("aria-label", t.name || "Audio preview"), i.appendChild(o), i.appendChild(x), i;
  }
  return De(n, e);
}
function Pe(t, e) {
  return A(z(t), e);
}
function Le(t, e, i) {
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
    i ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
  ].join(" ");
  const m = document.createElement("div");
  m.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", m.appendChild(A(t, "card"));
  const f = document.createElement("input");
  f.type = "checkbox", f.checked = e, f.dataset.mediaSelect = t.id, f.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", m.appendChild(f);
  const b = document.createElement("span");
  b.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${te(t.workflowStatus || t.status)}`, b.textContent = t.workflowStatus || t.status || "unknown", m.appendChild(b);
  const o = document.createElement("div");
  return o.className = "p-4", o.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${w(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${w(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${w(O(t.size))}</span>
      <span>${w(H(t.createdAt))}</span>
    </div>
  `, n.appendChild(m), n.appendChild(o), n;
}
function Te(t, e, i) {
  const n = document.createElement("tr");
  n.dataset.mediaItem = t.id, n.className = i ? "bg-gray-50" : "", n.innerHTML = `
    <td class="px-4 py-3">
      <input type="checkbox" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" data-media-select="${w(t.id)}" ${e ? "checked" : ""}>
    </td>
    <td class="px-4 py-3" data-media-preview-cell></td>
    <td class="px-4 py-3 min-w-[240px]">
      <div class="font-medium text-gray-900">${w(t.name)}</div>
      <div class="text-xs text-gray-500 break-all mt-1">${w(t.url || "")}</div>
    </td>
    <td class="px-4 py-3 hidden md:table-cell">${w(t.type || "asset")}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${te(t.workflowStatus || t.status)}">
        ${w(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${w(O(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${w(H(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${w(t.id)}">Inspect</button>
    </td>
  `;
  const m = d(n, "[data-media-preview-cell]");
  return m && m.appendChild(A(t, "list")), n;
}
function ke(t) {
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
    uploadInput: U(t, "[data-media-upload-input]"),
    uploadTrigger: U(t, "[data-media-upload-trigger]"),
    uploadEmpty: d(t, "[data-media-upload-empty]"),
    selectAll: d(t, "[data-media-select-all]"),
    selectionBar: U(t, "[data-media-selection-bar]"),
    selectionCount: U(t, "[data-media-selected-count]"),
    clearSelection: U(t, "[data-media-clear-selection]"),
    bulkDelete: U(t, "[data-media-bulk-delete]"),
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
function Ce(t, e) {
  let i = 0;
  return ((...n) => {
    globalThis.clearTimeout(i), i = globalThis.setTimeout(() => t(...n), e);
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
function D(t, e, i = "hidden") {
  t && (e ? t.classList.remove(i) : t.classList.add(i));
}
function Ue(t) {
  return j(t.tags).join(", ");
}
function Se(t) {
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
async function Fe(t) {
  const e = ke(t), i = l(t.dataset.mediaView) === "list" ? "list" : "grid", n = l(t.dataset.mediaLibraryPath), m = l(t.dataset.mediaItemPath), f = l(t.dataset.mediaUploadPath), b = l(t.dataset.mediaPresignPath), o = l(t.dataset.mediaConfirmPath), x = l(t.dataset.mediaCapabilitiesPath), S = {
    asset: l(t.dataset.mediaAssetUrlTemplate),
    stream: l(t.dataset.mediaStreamUrlTemplate),
    poster: l(t.dataset.mediaPosterUrlTemplate),
    download: l(t.dataset.mediaDownloadUrlTemplate)
  }, r = {
    items: [],
    total: 0,
    selectedIDs: /* @__PURE__ */ new Set(),
    activeID: "",
    loading: !1,
    capabilities: null
  };
  function _() {
    return r.activeID ? r.items.find((a) => a.id === r.activeID) ?? null : null;
  }
  function N() {
    return !!(r.capabilities?.operations?.upload || r.capabilities?.operations?.presign || r.capabilities?.upload?.direct_upload || r.capabilities?.upload?.presign);
  }
  function W() {
    return !!r.capabilities?.operations?.update;
  }
  function F() {
    return !!r.capabilities?.operations?.delete;
  }
  function $() {
    const a = _();
    if (D(e.detailEmpty, !a), D(e.detail, !!a), !a) {
      p(e.detailError, ""), p(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(A(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = Q(a)), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = Se(a)), e.detailSize && (e.detailSize.textContent = O(a.size)), e.detailDate && (e.detailDate.textContent = H(a.createdAt)), e.detailAltText && (e.detailAltText.value = l(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = l(a.metadata.caption)), e.detailTags && (e.detailTags.value = Ue(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !W()), e.detailDelete && (e.detailDelete.disabled = !F());
  }
  function C() {
    const a = r.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), D(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !F() || a === 0);
  }
  function E() {
    if (e.grid && (e.grid.replaceChildren(), i === "grid"))
      for (const a of r.items) {
        const s = Le(a, r.selectedIDs.has(a.id), r.activeID === a.id), y = d(s, `[data-media-select="${a.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? r.selectedIDs.add(a.id) : r.selectedIDs.delete(a.id), C(), E();
        }), s.addEventListener("click", () => {
          r.activeID = a.id, $(), E();
        }), e.grid.appendChild(s);
      }
    if (e.listBody && (e.listBody.replaceChildren(), i === "list"))
      for (const a of r.items) {
        const s = Te(a, r.selectedIDs.has(a.id), r.activeID === a.id);
        s.addEventListener("click", () => {
          r.activeID = a.id, $(), E();
        });
        const y = d(s, `[data-media-select="${a.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? r.selectedIDs.add(a.id) : r.selectedIDs.delete(a.id), C(), E();
        }), d(s, `[data-media-open="${a.id}"]`)?.addEventListener("click", (u) => {
          u.stopPropagation(), r.activeID = a.id, $(), E();
        }), e.listBody.appendChild(s);
      }
    e.countLabel && (e.countLabel.textContent = `${r.items.length} of ${r.total || r.items.length} items`), e.selectAll && (e.selectAll.checked = r.items.length > 0 && r.items.every((a) => r.selectedIDs.has(a.id))), D(e.footer, r.items.length > 0), D(e.loadMore, r.items.length > 0 && r.items.length < r.total), C(), $();
  }
  function M() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), s = r.items.length > 0;
    D(e.loading, r.loading, "hidden"), D(e.empty, !r.loading && !s && !a), D(e.noResults, !r.loading && !s && a), D(e.grid, !r.loading && s && i === "grid"), D(e.listShell, !r.loading && s && i === "list");
  }
  function ae(a) {
    r.items = r.items.map((s) => s.id === a.id ? a : s), r.activeID || (r.activeID = a.id), E(), M();
  }
  async function ie() {
    if (x) {
      try {
        const a = await k(x);
        r.capabilities = L(a) ? a : null;
      } catch (a) {
        p(e.status, ""), p(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !N()), e.uploadEmpty && (e.uploadEmpty.disabled = !N());
    }
  }
  async function T(a = !1) {
    if (!n) {
      p(e.error, "Media library endpoint is not configured.");
      return;
    }
    r.loading = !0, M(), p(e.error, "");
    const s = new URLSearchParams(), y = i === "list" ? me : ue, u = a ? r.items.length : 0;
    s.set("limit", String(y)), s.set("offset", String(u)), e.search?.value.trim() && s.set("search", e.search.value.trim());
    const h = Ee(e.typeFilter?.value || "");
    h && s.set(h.key, h.value), e.statusFilter?.value && s.set("status", e.statusFilter.value), e.sort?.value && s.set("sort", e.sort.value);
    try {
      const c = await k(`${n}?${s.toString()}`), g = L(c) ? c : {}, v = (Array.isArray(g.items) ? g.items : []).map((I) => z(I, S)).filter((I) => I.id);
      r.items = a ? [...r.items, ...v.filter((I) => !r.items.some((B) => B.id === I.id))] : v, r.total = Math.max(X(g.total), r.items.length), r.activeID && !r.items.some((I) => I.id === r.activeID) && (r.activeID = ""), !r.activeID && r.items.length > 0 && (r.activeID = r.items[0].id);
    } catch (c) {
      p(e.error, c instanceof Error ? c.message : "Failed to load media library.");
    } finally {
      r.loading = !1, E(), M();
    }
  }
  async function re() {
    const a = _();
    if (!a || !W()) return;
    if (!m) {
      p(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const s = { ...a.metadata }, y = e.detailAltText?.value.trim() || "", u = e.detailCaption?.value.trim() || "", h = j(e.detailTags?.value || "");
    y ? s.alt_text = y : delete s.alt_text, u ? s.caption = u : delete s.caption, h.length > 0 ? s.tags = h : delete s.tags;
    try {
      p(e.detailError, ""), p(e.detailFeedback, ""), ae(z(await k(Y(m, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: s })
      }), S)), p(e.detailFeedback, "Metadata saved.");
    } catch (c) {
      p(e.detailError, c instanceof Error ? c.message : "Failed to save metadata.");
    }
  }
  async function q(a, s) {
    if (!F()) return {
      deleted: !1,
      error: ""
    };
    if (!m) {
      const u = "Media item endpoint is not configured.";
      return s?.reportDetailError !== !1 && p(e.detailError, u), {
        deleted: !1,
        error: u
      };
    }
    const y = r.items.find((u) => u.id === a)?.name || "this media item";
    if (!s?.skipConfirm && !globalThis.confirm(`Delete ${y}?`)) return {
      deleted: !1,
      error: ""
    };
    try {
      return p(e.detailError, ""), await k(Y(m, a), { method: "DELETE" }), r.items = r.items.filter((u) => u.id !== a), r.selectedIDs.delete(a), r.activeID === a && (r.activeID = r.items[0]?.id || ""), r.total = Math.max(0, r.total - 1), E(), M(), s?.suppressStatus || p(e.status, "Media item deleted."), {
        deleted: !0,
        error: ""
      };
    } catch (u) {
      const h = u instanceof Error ? u.message : "Failed to delete media item.";
      return s?.reportDetailError !== !1 && p(e.detailError, h), {
        deleted: !1,
        error: h
      };
    }
  }
  async function ne() {
    if (!F() || r.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${r.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...r.selectedIDs], s = /* @__PURE__ */ new Set(), y = [];
    let u = 0;
    p(e.error, ""), p(e.detailError, "");
    for (const c of a) {
      const g = r.items.find((I) => I.id === c), v = await q(c, {
        skipConfirm: !0,
        suppressStatus: !0,
        reportDetailError: !1
      });
      if (v.deleted) {
        u += 1;
        continue;
      }
      s.add(c), v.error && y.push(`Failed to delete ${g?.name || c}: ${v.error}`);
    }
    r.selectedIDs = s, C(), E();
    const h = G("delete", {
      attempted: a.length,
      succeeded: u,
      failed: y.length,
      failures: y
    });
    p(e.status, h.status), p(e.error, h.error);
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
    const h = new Headers();
    if (L(a.headers)) for (const [g, v] of Object.entries(a.headers)) h.set(g, String(v));
    const c = await fetch(y, {
      method: l(a.method) || "PUT",
      headers: h,
      body: s
    });
    if (!c.ok) throw new Error(`Upload failed (${c.status}).`);
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
    for (const c of s) {
      p(e.status, `Uploading ${c.name}…`);
      try {
        if (r.capabilities?.upload?.direct_upload && f) {
          const g = new FormData();
          g.append("file", c), g.append("name", c.name), g.append("file_name", c.name), g.append("content_type", c.type), await k(f, {
            method: "POST",
            body: g
          });
        } else if (r.capabilities?.upload?.presign && b && o) {
          const g = await k(b, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: c.name,
              file_name: c.name,
              content_type: c.type,
              size: c.size
            })
          });
          if (!L(g)) throw new Error("Invalid presign response.");
          await de(g, c), await k(o, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_id: l(g.upload_id),
              name: c.name,
              file_name: c.name,
              content_type: c.type,
              size: c.size
            })
          });
        } else throw new Error("No supported upload mode is configured.");
        y += 1;
      } catch (g) {
        const v = g instanceof Error ? g.message : `Failed to upload ${c.name}.`;
        u.push(`Failed to upload ${c.name}: ${v}`);
      }
    }
    const h = G("upload", {
      attempted: s.length,
      succeeded: y,
      failed: u.length,
      failures: u
    });
    p(e.status, h.status), p(e.error, h.error), y > 0 && await T(!1);
  }
  const oe = Ce(() => {
    T(!1);
  }, 250);
  e.search?.addEventListener("input", oe), e.typeFilter?.addEventListener("change", () => {
    T(!1);
  }), e.statusFilter?.addEventListener("change", () => {
    T(!1);
  }), e.sort?.addEventListener("change", () => {
    T(!1);
  }), e.loadMore?.addEventListener("click", () => {
    T(!0);
  }), e.selectAll?.addEventListener("change", () => {
    if (e.selectAll?.checked) for (const a of r.items) r.selectedIDs.add(a.id);
    else r.selectedIDs.clear();
    C(), E();
  });
  const V = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", V), e.uploadEmpty?.addEventListener("click", V), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (le(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    r.selectedIDs.clear(), C(), E();
  }), e.bulkDelete?.addEventListener("click", () => {
    ne();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), re();
  }), e.detailCopyURL?.addEventListener("click", () => {
    se();
  }), e.detailDelete?.addEventListener("click", () => {
    r.activeID && q(r.activeID);
  }), await ie(), await T(!1);
}
async function $e() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    pe(e) && await Fe(e);
}
typeof document < "u" && $e();
export {
  Pe as buildMediaPreview,
  ee as inferMediaFamily,
  $e as initMediaPages,
  Ee as mediaTypeFilterParam,
  G as summarizeBatchMutation
};

//# sourceMappingURL=index.js.map