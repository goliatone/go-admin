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
  const a = Math.max(0, e.attempted), n = Math.max(0, e.succeeded), m = Math.max(0, e.failed), f = e.failures.map((b) => l(b)).filter(Boolean).join(" ");
  return a === 0 || n === 0 && m === 0 ? {
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
    status: `${n} of ${a} uploads completed.`,
    error: f
  } : {
    status: `${n} of ${a} media items deleted.`,
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
  const a = t.querySelector(e);
  return a instanceof Element ? a : null;
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
  return t.capabilities.some((a) => a.trim().toLowerCase().replace(/-/g, "_") === e);
}
function be(t, e, a) {
  if (he(e, "poster")) return !0;
  const n = l(t.type).toLowerCase();
  return n === "image" || n === "vector" ? !0 : a.toLowerCase().startsWith("image/");
}
function z(t, e) {
  const a = L(t) ? t : {}, n = ye(a.metadata), m = l(a.mime_type), f = l(a.id), b = ge(a.delivery), o = l(a.asset_url) || l(a.assetUrl) || P(e?.asset || "", f) || l(a.url), x = l(a.stream_url) || l(a.streamUrl) || P(e?.stream || "", f), S = l(a.poster_url) || l(a.posterUrl) || (be(a, b, m) ? P(e?.poster || "", f) : ""), r = l(a.download_url) || l(a.downloadUrl) || P(e?.download || "", f) || o;
  return {
    id: f,
    name: l(a.name) || l(a.filename) || "Untitled asset",
    url: o,
    assetUrl: o,
    streamUrl: x,
    posterUrl: S,
    downloadUrl: r,
    thumbnail: S || l(a.thumbnail) || l(a.thumbnail_url),
    type: l(a.type) || ve(m),
    mimeType: m,
    size: X(a.size),
    status: l(a.status),
    workflowStatus: l(a.workflow_status),
    createdAt: l(a.created_at),
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
  const a = Z(t), n = we(e);
  return J.has(a) ? a : n && J.has(n) ? n : a === "document" || a === "text" ? a : n === "document" || n === "text" ? n : "asset";
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
function H(t) {
  if (!Number.isFinite(t) || t <= 0) return "0 B";
  const e = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let a = t, n = 0;
  for (; a >= 1024 && n < e.length - 1; )
    a /= 1024, n += 1;
  return `${a.toFixed(n === 0 ? 0 : 1)} ${e[n]}`;
}
function O(t) {
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
  const a = e ?? {}, n = new Headers(a.headers ?? {});
  n.has("Accept") || n.set("Accept", "application/json"), ce(t, a, n);
  const m = await fetch(t, {
    ...a,
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
      const a = R(e);
      if (a) return a;
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
    const a = R(t[e]);
    if (a) return a;
  }
  return "";
}
function De(t, e) {
  const a = document.createElement("div");
  a.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const n = document.createElement("i");
  return n.className = `${Ie(t)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, a.appendChild(n), a;
}
function A(t, e) {
  const a = document.createElement("div");
  a.className = e === "list" ? "w-12 h-12" : "w-full h-full";
  const n = ee(t.type, t.mimeType), m = n === "image" || n === "vector", f = xe(t, n), b = f || t.assetUrl;
  if (m && b) {
    const o = document.createElement("img");
    return o.src = b, o.alt = t.name, o.loading = "lazy", o.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", a.appendChild(o), a;
  }
  if (n === "video" && e !== "detail" && f) {
    const o = document.createElement("img");
    return o.src = f, o.alt = t.name, o.loading = "lazy", o.className = e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", a.appendChild(o), a;
  }
  if (e === "detail" && n === "video" && (t.streamUrl || t.assetUrl)) {
    const o = document.createElement("video");
    return o.src = t.streamUrl || t.assetUrl, o.controls = !0, o.preload = "metadata", o.playsInline = !0, o.className = "w-full h-full object-contain bg-black", o.setAttribute("aria-label", t.name || "Video preview"), f && (o.poster = f), a.appendChild(o), a;
  }
  if (e === "detail" && n === "audio" && (t.streamUrl || t.assetUrl)) {
    a.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-gray-600";
    const o = document.createElement("i");
    o.className = "iconoir-music-note text-5xl";
    const x = document.createElement("audio");
    return x.src = t.streamUrl || t.assetUrl, x.controls = !0, x.preload = "metadata", x.className = "w-full max-w-full", x.setAttribute("aria-label", t.name || "Audio preview"), a.appendChild(o), a.appendChild(x), a;
  }
  return De(n, e);
}
function Pe(t, e) {
  return A(z(t), e);
}
function Le(t, e, a) {
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
    a ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
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
      <span>${w(H(t.size))}</span>
      <span>${w(O(t.createdAt))}</span>
    </div>
  `, n.appendChild(m), n.appendChild(o), n;
}
function Te(t, e, a) {
  const n = document.createElement("tr");
  n.dataset.mediaItem = t.id, n.className = a ? "bg-gray-50" : "", n.innerHTML = `
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
    <td class="px-4 py-3 hidden lg:table-cell">${w(H(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${w(O(t.createdAt))}</td>
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
  let a = 0;
  return ((...n) => {
    globalThis.clearTimeout(a), a = globalThis.setTimeout(() => t(...n), e);
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
function D(t, e, a = "hidden") {
  t && (e ? t.classList.remove(a) : t.classList.add(a));
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
  const e = ke(t), a = l(t.dataset.mediaView) === "list" ? "list" : "grid", n = l(t.dataset.mediaLibraryPath), m = l(t.dataset.mediaItemPath), f = l(t.dataset.mediaUploadPath), b = l(t.dataset.mediaPresignPath), o = l(t.dataset.mediaConfirmPath), x = l(t.dataset.mediaCapabilitiesPath), S = {
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
    return r.activeID ? r.items.find((i) => i.id === r.activeID) ?? null : null;
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
    const i = _();
    if (D(e.detailEmpty, !i), D(e.detail, !!i), !i) {
      p(e.detailError, ""), p(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(A(i, "detail")), e.detailName && (e.detailName.textContent = i.name), e.detailURL && (e.detailURL.textContent = Q(i)), e.detailType && (e.detailType.textContent = i.type || i.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = Se(i)), e.detailSize && (e.detailSize.textContent = H(i.size)), e.detailDate && (e.detailDate.textContent = O(i.createdAt)), e.detailAltText && (e.detailAltText.value = l(i.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = l(i.metadata.caption)), e.detailTags && (e.detailTags.value = Ue(i.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !W()), e.detailDelete && (e.detailDelete.disabled = !F());
  }
  function C() {
    const i = r.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(i)), D(e.selectionBar, i > 0), e.bulkDelete && (e.bulkDelete.disabled = !F() || i === 0);
  }
  function E() {
    if (e.grid && (e.grid.replaceChildren(), a === "grid"))
      for (const i of r.items) {
        const s = Le(i, r.selectedIDs.has(i.id), r.activeID === i.id), y = d(s, `[data-media-select="${i.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? r.selectedIDs.add(i.id) : r.selectedIDs.delete(i.id), C(), E();
        }), s.addEventListener("click", () => {
          r.activeID = i.id, $(), E();
        }), e.grid.appendChild(s);
      }
    if (e.listBody && (e.listBody.replaceChildren(), a === "list"))
      for (const i of r.items) {
        const s = Te(i, r.selectedIDs.has(i.id), r.activeID === i.id);
        s.addEventListener("click", () => {
          r.activeID = i.id, $(), E();
        });
        const y = d(s, `[data-media-select="${i.id}"]`);
        y?.addEventListener("click", (u) => {
          u.stopPropagation();
        }), y?.addEventListener("change", () => {
          y.checked ? r.selectedIDs.add(i.id) : r.selectedIDs.delete(i.id), C(), E();
        }), d(s, `[data-media-open="${i.id}"]`)?.addEventListener("click", (u) => {
          u.stopPropagation(), r.activeID = i.id, $(), E();
        }), e.listBody.appendChild(s);
      }
    e.countLabel && (e.countLabel.textContent = `${r.items.length} of ${r.total || r.items.length} items`), e.selectAll && (e.selectAll.checked = r.items.length > 0 && r.items.every((i) => r.selectedIDs.has(i.id))), D(e.footer, r.items.length > 0), D(e.loadMore, r.items.length > 0 && r.items.length < r.total), C(), $();
  }
  function M() {
    const i = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), s = r.items.length > 0;
    D(e.loading, r.loading, "hidden"), D(e.empty, !r.loading && !s && !i), D(e.noResults, !r.loading && !s && i), D(e.grid, !r.loading && s && a === "grid"), D(e.listShell, !r.loading && s && a === "list");
  }
  function ae(i) {
    r.items = r.items.map((s) => s.id === i.id ? i : s), r.activeID || (r.activeID = i.id), E(), M();
  }
  async function ie() {
    if (x) {
      try {
        const i = await k(x);
        r.capabilities = L(i) ? i : null;
      } catch (i) {
        p(e.status, ""), p(e.error, i instanceof Error ? i.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !N()), e.uploadEmpty && (e.uploadEmpty.disabled = !N());
    }
  }
  async function T(i = !1) {
    if (!n) {
      p(e.error, "Media library endpoint is not configured.");
      return;
    }
    r.loading = !0, M(), p(e.error, "");
    const s = new URLSearchParams(), y = a === "list" ? me : ue, u = i ? r.items.length : 0;
    s.set("limit", String(y)), s.set("offset", String(u)), e.search?.value.trim() && s.set("search", e.search.value.trim());
    const h = Ee(e.typeFilter?.value || "");
    h && s.set(h.key, h.value), e.statusFilter?.value && s.set("status", e.statusFilter.value), e.sort?.value && s.set("sort", e.sort.value);
    try {
      const c = await k(`${n}?${s.toString()}`), g = L(c) ? c : {}, v = (Array.isArray(g.items) ? g.items : []).map((I) => z(I, S)).filter((I) => I.id);
      r.items = i ? [...r.items, ...v.filter((I) => !r.items.some((B) => B.id === I.id))] : v, r.total = Math.max(X(g.total), r.items.length), r.activeID && !r.items.some((I) => I.id === r.activeID) && (r.activeID = ""), !r.activeID && r.items.length > 0 && (r.activeID = r.items[0].id);
    } catch (c) {
      p(e.error, c instanceof Error ? c.message : "Failed to load media library.");
    } finally {
      r.loading = !1, E(), M();
    }
  }
  async function re() {
    const i = _();
    if (!i || !W()) return;
    if (!m) {
      p(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const s = { ...i.metadata }, y = e.detailAltText?.value.trim() || "", u = e.detailCaption?.value.trim() || "", h = j(e.detailTags?.value || "");
    y ? s.alt_text = y : delete s.alt_text, u ? s.caption = u : delete s.caption, h.length > 0 ? s.tags = h : delete s.tags;
    try {
      p(e.detailError, ""), p(e.detailFeedback, ""), ae(z(await k(Y(m, i.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: s })
      }), S)), p(e.detailFeedback, "Metadata saved.");
    } catch (c) {
      p(e.detailError, c instanceof Error ? c.message : "Failed to save metadata.");
    }
  }
  async function q(i, s) {
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
    const y = r.items.find((u) => u.id === i)?.name || "this media item";
    if (!s?.skipConfirm && !globalThis.confirm(`Delete ${y}?`)) return {
      deleted: !1,
      error: ""
    };
    try {
      return p(e.detailError, ""), await k(Y(m, i), { method: "DELETE" }), r.items = r.items.filter((u) => u.id !== i), r.selectedIDs.delete(i), r.activeID === i && (r.activeID = r.items[0]?.id || ""), r.total = Math.max(0, r.total - 1), E(), M(), s?.suppressStatus || p(e.status, "Media item deleted."), {
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
    const i = [...r.selectedIDs], s = /* @__PURE__ */ new Set(), y = [];
    let u = 0;
    p(e.error, ""), p(e.detailError, "");
    for (const c of i) {
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
      attempted: i.length,
      succeeded: u,
      failed: y.length,
      failures: y
    });
    p(e.status, h.status), p(e.error, h.error);
  }
  async function se() {
    const i = _(), s = i ? Q(i) : "";
    if (s)
      try {
        await globalThis.navigator.clipboard.writeText(s), p(e.detailFeedback, "URL copied.");
      } catch {
        p(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function de(i, s) {
    const y = l(i.upload_url);
    if (!y) throw new Error("Upload URL missing from presign response.");
    const u = L(i.fields) ? i.fields : null;
    if (u) {
      const g = new FormData();
      for (const [I, B] of Object.entries(u)) g.append(I, String(B));
      g.append("file", s);
      const v = await fetch(y, {
        method: l(i.method) || "POST",
        body: g
      });
      if (!v.ok) throw new Error(`Upload failed (${v.status}).`);
      return;
    }
    const h = new Headers();
    if (L(i.headers)) for (const [g, v] of Object.entries(i.headers)) h.set(g, String(v));
    const c = await fetch(y, {
      method: l(i.method) || "PUT",
      headers: h,
      body: s
    });
    if (!c.ok) throw new Error(`Upload failed (${c.status}).`);
  }
  async function le(i) {
    const s = Array.from(i);
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
    if (e.selectAll?.checked) for (const i of r.items) r.selectedIDs.add(i.id);
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
  }), e.detailForm?.addEventListener("submit", (i) => {
    i.preventDefault(), re();
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