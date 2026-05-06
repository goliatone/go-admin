import { appendCSRFHeader as se } from "../shared/transport/http-client.js";
var le = 24, oe = 50, W = /* @__PURE__ */ new Set([
  "image",
  "vector",
  "video",
  "audio"
]), ce = /* @__PURE__ */ new Set([
  "image",
  "vector",
  "video",
  "audio"
]);
function q(t, e) {
  const n = Math.max(0, e.attempted), r = Math.max(0, e.succeeded), p = Math.max(0, e.failed), h = e.failures.map((b) => f(b)).filter(Boolean).join(" ");
  return n === 0 || r === 0 && p === 0 ? {
    status: "",
    error: h
  } : p === 0 ? t === "upload" ? {
    status: r === 1 ? "Upload complete." : `${r} uploads completed.`,
    error: ""
  } : {
    status: r === 1 ? "Media item deleted." : `${r} media items deleted.`,
    error: ""
  } : r === 0 ? {
    status: "",
    error: h
  } : t === "upload" ? {
    status: `${r} of ${n} uploads completed.`,
    error: h
  } : {
    status: `${r} of ${n} media items deleted.`,
    error: h
  };
}
function k(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function ue(t) {
  const e = globalThis.HTMLElement;
  return typeof e < "u" && t instanceof e;
}
function s(t, e) {
  const n = t.querySelector(e);
  return n instanceof Element ? n : null;
}
function S(t, e) {
  return s(t, e) ?? s(t.ownerDocument, e);
}
function f(t) {
  return typeof t == "string" ? t.trim() : "";
}
function G(t) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const e = Number.parseFloat(t.trim());
    return Number.isFinite(e) ? e : 0;
  }
  return 0;
}
function K(t) {
  return Array.isArray(t) ? t.map((e) => f(e)).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
}
function me(t) {
  return k(t) ? { ...t } : {};
}
function B(t) {
  const e = k(t) ? t : {}, n = me(e.metadata), r = f(e.mime_type);
  return {
    id: f(e.id),
    name: f(e.name) || f(e.filename) || "Untitled asset",
    url: f(e.url),
    thumbnail: f(e.thumbnail) || f(e.thumbnail_url),
    type: f(e.type) || fe(r),
    mimeType: r,
    size: G(e.size),
    status: f(e.status),
    workflowStatus: f(e.workflow_status),
    createdAt: f(e.created_at),
    metadata: n
  };
}
function V(t, e) {
  return !!(t && e && t === e);
}
function fe(t) {
  const e = Q("", t);
  return e === "asset" ? "" : e;
}
function Y(t) {
  return t.trim().toLowerCase();
}
function pe(t) {
  const e = t.split(";", 1)[0].trim().toLowerCase();
  return e ? e === "image/svg+xml" ? "vector" : e.startsWith("image/") ? "image" : e.startsWith("video/") ? "video" : e.startsWith("audio/") ? "audio" : e.startsWith("text/") ? "text" : e.includes("pdf") || e.includes("document") ? "document" : "" : "";
}
function Q(t, e = "") {
  const n = Y(t), r = pe(e);
  return W.has(n) ? n : r && W.has(r) ? r : n === "document" || n === "text" ? n : r === "document" || r === "text" ? r : "asset";
}
function ge(t, e) {
  return t.thumbnail ? (e === "image" || e === "vector") && V(t.thumbnail, t.url) ? t.thumbnail : V(t.thumbnail, t.url) ? "" : t.thumbnail : "";
}
function he(t) {
  const e = Y(t);
  return e ? ce.has(e) ? {
    key: "mime_family",
    value: e
  } : {
    key: "type",
    value: e
  } : null;
}
function z(t) {
  if (!Number.isFinite(t) || t <= 0) return "0 B";
  const e = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let n = t, r = 0;
  for (; n >= 1024 && r < e.length - 1; )
    n /= 1024, r += 1;
  return `${n.toFixed(r === 0 ? 0 : 1)} ${e[r]}`;
}
function R(t) {
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
function ye(t) {
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
function X(t) {
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
function J(t, e) {
  return t.replace(":id", encodeURIComponent(e));
}
async function T(t, e) {
  const n = e ?? {}, r = new Headers(n.headers ?? {});
  r.has("Accept") || r.set("Accept", "application/json"), se(t, n, r);
  const p = await fetch(t, {
    ...n,
    credentials: "same-origin",
    headers: r
  }), h = String(p.headers.get("content-type") || "").toLowerCase(), b = h.includes("application/json") || h.includes("+json") ? await p.json().catch(() => null) : await p.text().catch(() => "");
  if (!p.ok) throw new Error(_(b) || `Request failed (${p.status})`);
  return b;
}
function _(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const n = _(e);
      if (n) return n;
    }
    return "";
  }
  if (!k(t)) return "";
  for (const e of [
    "error",
    "message",
    "detail",
    "reason"
  ]) {
    const n = _(t[e]);
    if (n) return n;
  }
  return "";
}
function be(t, e) {
  const n = document.createElement("div");
  n.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const r = document.createElement("i");
  return r.className = `${ye(t)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, n.appendChild(r), n;
}
function P(t, e) {
  const n = document.createElement("div");
  n.className = e === "list" ? "w-12 h-12" : "w-full h-full";
  const r = Q(t.type, t.mimeType), p = r === "image" || r === "vector", h = ge(t, r), b = h || t.url;
  if (p && b) {
    const o = document.createElement("img");
    return o.src = b, o.alt = t.name, o.loading = "lazy", o.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", n.appendChild(o), n;
  }
  if (r === "video" && e !== "detail" && h) {
    const o = document.createElement("img");
    return o.src = h, o.alt = t.name, o.loading = "lazy", o.className = e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", n.appendChild(o), n;
  }
  if (e === "detail" && r === "video" && t.url) {
    const o = document.createElement("video");
    return o.src = t.url, o.controls = !0, o.preload = "metadata", o.playsInline = !0, o.className = "w-full h-full object-contain bg-black", o.setAttribute("aria-label", t.name || "Video preview"), h && (o.poster = h), n.appendChild(o), n;
  }
  if (e === "detail" && r === "audio" && t.url) {
    n.className = "w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-4 px-4 text-gray-600";
    const o = document.createElement("i");
    o.className = "iconoir-music-note text-5xl";
    const D = document.createElement("audio");
    return D.src = t.url, D.controls = !0, D.preload = "metadata", D.className = "w-full max-w-full", D.setAttribute("aria-label", t.name || "Audio preview"), n.appendChild(o), n.appendChild(D), n;
  }
  return be(r, e);
}
function Te(t, e) {
  return P(B(t), e);
}
function ve(t, e, n) {
  const r = document.createElement("button");
  r.type = "button", r.dataset.mediaItem = t.id, r.className = [
    "group",
    "text-left",
    "bg-white",
    "border",
    "rounded-2xl",
    "overflow-hidden",
    "shadow-sm",
    "transition",
    n ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
  ].join(" ");
  const p = document.createElement("div");
  p.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", p.appendChild(P(t, "card"));
  const h = document.createElement("input");
  h.type = "checkbox", h.checked = e, h.dataset.mediaSelect = t.id, h.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", p.appendChild(h);
  const b = document.createElement("span");
  b.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${X(t.workflowStatus || t.status)}`, b.textContent = t.workflowStatus || t.status || "unknown", p.appendChild(b);
  const o = document.createElement("div");
  return o.className = "p-4", o.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${w(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${w(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${w(z(t.size))}</span>
      <span>${w(R(t.createdAt))}</span>
    </div>
  `, r.appendChild(p), r.appendChild(o), r;
}
function we(t, e, n) {
  const r = document.createElement("tr");
  r.dataset.mediaItem = t.id, r.className = n ? "bg-gray-50" : "", r.innerHTML = `
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
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${X(t.workflowStatus || t.status)}">
        ${w(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${w(z(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${w(R(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${w(t.id)}">Inspect</button>
    </td>
  `;
  const p = s(r, "[data-media-preview-cell]");
  return p && p.appendChild(P(t, "list")), r;
}
function xe(t) {
  return {
    root: t,
    search: s(t, "[data-media-search]"),
    typeFilter: s(t, "[data-media-type-filter]"),
    statusFilter: s(t, "[data-media-status-filter]"),
    sort: s(t, "[data-media-sort]"),
    grid: s(t, "[data-media-grid]"),
    listShell: s(t, "[data-media-list]"),
    listBody: s(t, "[data-media-list-body]"),
    loadMore: s(t, "[data-media-load-more]"),
    countLabel: s(t, "[data-media-count-label]"),
    footer: s(t, "[data-media-footer]"),
    empty: s(t, "[data-media-empty]"),
    noResults: s(t, "[data-media-no-results]"),
    loading: s(t, "[data-media-loading]"),
    error: s(t, "[data-media-error]"),
    status: s(t, "[data-media-status]"),
    uploadInput: S(t, "[data-media-upload-input]"),
    uploadTrigger: S(t, "[data-media-upload-trigger]"),
    uploadEmpty: s(t, "[data-media-upload-empty]"),
    selectAll: s(t, "[data-media-select-all]"),
    selectionBar: S(t, "[data-media-selection-bar]"),
    selectionCount: S(t, "[data-media-selected-count]"),
    clearSelection: S(t, "[data-media-clear-selection]"),
    bulkDelete: S(t, "[data-media-bulk-delete]"),
    detailEmpty: s(t, "[data-media-detail-empty]"),
    detail: s(t, "[data-media-detail]"),
    detailPreview: s(t, "[data-media-detail-preview]"),
    detailName: s(t, "[data-media-detail-name]"),
    detailURL: s(t, "[data-media-detail-url]"),
    detailType: s(t, "[data-media-detail-type]"),
    detailStatus: s(t, "[data-media-detail-status-label]"),
    detailSize: s(t, "[data-media-detail-size]"),
    detailDate: s(t, "[data-media-detail-date]"),
    detailForm: s(t, "[data-media-detail-form]"),
    detailAltText: s(t, "#media-alt-text"),
    detailCaption: s(t, "#media-caption"),
    detailTags: s(t, "#media-tags"),
    detailError: s(t, "[data-media-detail-error]"),
    detailFeedback: s(t, "[data-media-detail-feedback]"),
    detailSaveButton: s(t, "[data-media-save-button]"),
    detailCopyURL: s(t, "[data-media-copy-url]"),
    detailDelete: s(t, "[data-media-delete]")
  };
}
function Ee(t, e) {
  let n = 0;
  return ((...r) => {
    globalThis.clearTimeout(n), n = globalThis.setTimeout(() => t(...r), e);
  });
}
function u(t, e) {
  if (t) {
    if (!e) {
      t.textContent = "", t.classList.add("hidden");
      return;
    }
    t.textContent = e, t.classList.remove("hidden");
  }
}
function I(t, e, n = "hidden") {
  t && (e ? t.classList.remove(n) : t.classList.add(n));
}
function Ie(t) {
  return K(t.tags).join(", ");
}
async function De(t) {
  const e = xe(t), n = f(t.dataset.mediaView) === "list" ? "list" : "grid", r = f(t.dataset.mediaLibraryPath), p = f(t.dataset.mediaItemPath), h = f(t.dataset.mediaUploadPath), b = f(t.dataset.mediaPresignPath), o = f(t.dataset.mediaConfirmPath), D = f(t.dataset.mediaCapabilitiesPath), i = {
    items: [],
    total: 0,
    selectedIDs: /* @__PURE__ */ new Set(),
    activeID: "",
    loading: !1,
    capabilities: null
  };
  function A() {
    return i.activeID ? i.items.find((a) => a.id === i.activeID) ?? null : null;
  }
  function U() {
    return !!(i.capabilities?.operations?.upload || i.capabilities?.operations?.presign || i.capabilities?.upload?.direct_upload || i.capabilities?.upload?.presign);
  }
  function j() {
    return !!i.capabilities?.operations?.update;
  }
  function F() {
    return !!i.capabilities?.operations?.delete;
  }
  function M() {
    const a = A();
    if (I(e.detailEmpty, !a), I(e.detail, !!a), !a) {
      u(e.detailError, ""), u(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(P(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = a.url), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = a.workflowStatus || a.status || "unknown"), e.detailSize && (e.detailSize.textContent = z(a.size)), e.detailDate && (e.detailDate.textContent = R(a.createdAt)), e.detailAltText && (e.detailAltText.value = f(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = f(a.metadata.caption)), e.detailTags && (e.detailTags.value = Ie(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !j()), e.detailDelete && (e.detailDelete.disabled = !F());
  }
  function C() {
    const a = i.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), I(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !F() || a === 0);
  }
  function x() {
    if (e.grid && (e.grid.replaceChildren(), n === "grid"))
      for (const a of i.items) {
        const d = ve(a, i.selectedIDs.has(a.id), i.activeID === a.id), m = s(d, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (c) => {
          c.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), C(), x();
        }), d.addEventListener("click", () => {
          i.activeID = a.id, M(), x();
        }), e.grid.appendChild(d);
      }
    if (e.listBody && (e.listBody.replaceChildren(), n === "list"))
      for (const a of i.items) {
        const d = we(a, i.selectedIDs.has(a.id), i.activeID === a.id);
        d.addEventListener("click", () => {
          i.activeID = a.id, M(), x();
        });
        const m = s(d, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (c) => {
          c.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), C(), x();
        }), s(d, `[data-media-open="${a.id}"]`)?.addEventListener("click", (c) => {
          c.stopPropagation(), i.activeID = a.id, M(), x();
        }), e.listBody.appendChild(d);
      }
    e.countLabel && (e.countLabel.textContent = `${i.items.length} of ${i.total || i.items.length} items`), e.selectAll && (e.selectAll.checked = i.items.length > 0 && i.items.every((a) => i.selectedIDs.has(a.id))), I(e.footer, i.items.length > 0), I(e.loadMore, i.items.length > 0 && i.items.length < i.total), C(), M();
  }
  function $() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), d = i.items.length > 0;
    I(e.loading, i.loading, "hidden"), I(e.empty, !i.loading && !d && !a), I(e.noResults, !i.loading && !d && a), I(e.grid, !i.loading && d && n === "grid"), I(e.listShell, !i.loading && d && n === "list");
  }
  function Z(a) {
    i.items = i.items.map((d) => d.id === a.id ? a : d), i.activeID || (i.activeID = a.id), x(), $();
  }
  async function ee() {
    if (D) {
      try {
        const a = await T(D);
        i.capabilities = k(a) ? a : null;
      } catch (a) {
        u(e.status, ""), u(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !U()), e.uploadEmpty && (e.uploadEmpty.disabled = !U());
    }
  }
  async function L(a = !1) {
    if (!r) {
      u(e.error, "Media library endpoint is not configured.");
      return;
    }
    i.loading = !0, $(), u(e.error, "");
    const d = new URLSearchParams(), m = n === "list" ? oe : le, c = a ? i.items.length : 0;
    d.set("limit", String(m)), d.set("offset", String(c)), e.search?.value.trim() && d.set("search", e.search.value.trim());
    const y = he(e.typeFilter?.value || "");
    y && d.set(y.key, y.value), e.statusFilter?.value && d.set("status", e.statusFilter.value), e.sort?.value && d.set("sort", e.sort.value);
    try {
      const l = await T(`${r}?${d.toString()}`), g = k(l) ? l : {}, v = (Array.isArray(g.items) ? g.items : []).map((E) => B(E)).filter((E) => E.id);
      i.items = a ? [...i.items, ...v.filter((E) => !i.items.some((N) => N.id === E.id))] : v, i.total = Math.max(G(g.total), i.items.length), i.activeID && !i.items.some((E) => E.id === i.activeID) && (i.activeID = ""), !i.activeID && i.items.length > 0 && (i.activeID = i.items[0].id);
    } catch (l) {
      u(e.error, l instanceof Error ? l.message : "Failed to load media library.");
    } finally {
      i.loading = !1, x(), $();
    }
  }
  async function te() {
    const a = A();
    if (!a || !j()) return;
    if (!p) {
      u(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const d = { ...a.metadata }, m = e.detailAltText?.value.trim() || "", c = e.detailCaption?.value.trim() || "", y = K(e.detailTags?.value || "");
    m ? d.alt_text = m : delete d.alt_text, c ? d.caption = c : delete d.caption, y.length > 0 ? d.tags = y : delete d.tags;
    try {
      u(e.detailError, ""), u(e.detailFeedback, ""), Z(B(await T(J(p, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: d })
      }))), u(e.detailFeedback, "Metadata saved.");
    } catch (l) {
      u(e.detailError, l instanceof Error ? l.message : "Failed to save metadata.");
    }
  }
  async function O(a, d) {
    if (!F()) return {
      deleted: !1,
      error: ""
    };
    if (!p) {
      const c = "Media item endpoint is not configured.";
      return d?.reportDetailError !== !1 && u(e.detailError, c), {
        deleted: !1,
        error: c
      };
    }
    const m = i.items.find((c) => c.id === a)?.name || "this media item";
    if (!d?.skipConfirm && !globalThis.confirm(`Delete ${m}?`)) return {
      deleted: !1,
      error: ""
    };
    try {
      return u(e.detailError, ""), await T(J(p, a), { method: "DELETE" }), i.items = i.items.filter((c) => c.id !== a), i.selectedIDs.delete(a), i.activeID === a && (i.activeID = i.items[0]?.id || ""), i.total = Math.max(0, i.total - 1), x(), $(), d?.suppressStatus || u(e.status, "Media item deleted."), {
        deleted: !0,
        error: ""
      };
    } catch (c) {
      const y = c instanceof Error ? c.message : "Failed to delete media item.";
      return d?.reportDetailError !== !1 && u(e.detailError, y), {
        deleted: !1,
        error: y
      };
    }
  }
  async function ae() {
    if (!F() || i.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${i.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...i.selectedIDs], d = /* @__PURE__ */ new Set(), m = [];
    let c = 0;
    u(e.error, ""), u(e.detailError, "");
    for (const l of a) {
      const g = i.items.find((E) => E.id === l), v = await O(l, {
        skipConfirm: !0,
        suppressStatus: !0,
        reportDetailError: !1
      });
      if (v.deleted) {
        c += 1;
        continue;
      }
      d.add(l), v.error && m.push(`Failed to delete ${g?.name || l}: ${v.error}`);
    }
    i.selectedIDs = d, C(), x();
    const y = q("delete", {
      attempted: a.length,
      succeeded: c,
      failed: m.length,
      failures: m
    });
    u(e.status, y.status), u(e.error, y.error);
  }
  async function ie() {
    const a = A();
    if (a?.url)
      try {
        await globalThis.navigator.clipboard.writeText(a.url), u(e.detailFeedback, "URL copied.");
      } catch {
        u(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function ne(a, d) {
    const m = f(a.upload_url);
    if (!m) throw new Error("Upload URL missing from presign response.");
    const c = k(a.fields) ? a.fields : null;
    if (c) {
      const g = new FormData();
      for (const [E, N] of Object.entries(c)) g.append(E, String(N));
      g.append("file", d);
      const v = await fetch(m, {
        method: f(a.method) || "POST",
        body: g
      });
      if (!v.ok) throw new Error(`Upload failed (${v.status}).`);
      return;
    }
    const y = new Headers();
    if (k(a.headers)) for (const [g, v] of Object.entries(a.headers)) y.set(g, String(v));
    const l = await fetch(m, {
      method: f(a.method) || "PUT",
      headers: y,
      body: d
    });
    if (!l.ok) throw new Error(`Upload failed (${l.status}).`);
  }
  async function re(a) {
    const d = Array.from(a);
    if (d.length === 0) return;
    if (!U()) {
      u(e.error, "Uploads are not available for this request.");
      return;
    }
    u(e.error, "");
    let m = 0;
    const c = [];
    for (const l of d) {
      u(e.status, `Uploading ${l.name}…`);
      try {
        if (i.capabilities?.upload?.direct_upload && h) {
          const g = new FormData();
          g.append("file", l), g.append("name", l.name), g.append("file_name", l.name), g.append("content_type", l.type), await T(h, {
            method: "POST",
            body: g
          });
        } else if (i.capabilities?.upload?.presign && b && o) {
          const g = await T(b, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
          if (!k(g)) throw new Error("Invalid presign response.");
          await ne(g, l), await T(o, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_id: f(g.upload_id),
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
        } else throw new Error("No supported upload mode is configured.");
        m += 1;
      } catch (g) {
        const v = g instanceof Error ? g.message : `Failed to upload ${l.name}.`;
        c.push(`Failed to upload ${l.name}: ${v}`);
      }
    }
    const y = q("upload", {
      attempted: d.length,
      succeeded: m,
      failed: c.length,
      failures: c
    });
    u(e.status, y.status), u(e.error, y.error), m > 0 && await L(!1);
  }
  const de = Ee(() => {
    L(!1);
  }, 250);
  e.search?.addEventListener("input", de), e.typeFilter?.addEventListener("change", () => {
    L(!1);
  }), e.statusFilter?.addEventListener("change", () => {
    L(!1);
  }), e.sort?.addEventListener("change", () => {
    L(!1);
  }), e.loadMore?.addEventListener("click", () => {
    L(!0);
  }), e.selectAll?.addEventListener("change", () => {
    if (e.selectAll?.checked) for (const a of i.items) i.selectedIDs.add(a.id);
    else i.selectedIDs.clear();
    C(), x();
  });
  const H = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", H), e.uploadEmpty?.addEventListener("click", H), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (re(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    i.selectedIDs.clear(), C(), x();
  }), e.bulkDelete?.addEventListener("click", () => {
    ae();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), te();
  }), e.detailCopyURL?.addEventListener("click", () => {
    ie();
  }), e.detailDelete?.addEventListener("click", () => {
    i.activeID && O(i.activeID);
  }), await ee(), await L(!1);
}
async function ke() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    ue(e) && await De(e);
}
typeof document < "u" && ke();
export {
  Te as buildMediaPreview,
  Q as inferMediaFamily,
  ke as initMediaPages,
  he as mediaTypeFilterParam,
  q as summarizeBatchMutation
};

//# sourceMappingURL=index.js.map