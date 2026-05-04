import { appendCSRFHeader as ie } from "../shared/transport/http-client.js";
var ne = 24, de = 50;
function O(t, e) {
  const d = Math.max(0, e.attempted), s = Math.max(0, e.succeeded), f = Math.max(0, e.failed), y = e.failures.map((b) => c(b)).filter(Boolean).join(" ");
  return d === 0 || s === 0 && f === 0 ? {
    status: "",
    error: y
  } : f === 0 ? t === "upload" ? {
    status: s === 1 ? "Upload complete." : `${s} uploads completed.`,
    error: ""
  } : {
    status: s === 1 ? "Media item deleted." : `${s} media items deleted.`,
    error: ""
  } : s === 0 ? {
    status: "",
    error: y
  } : t === "upload" ? {
    status: `${s} of ${d} uploads completed.`,
    error: y
  } : {
    status: `${s} of ${d} media items deleted.`,
    error: y
  };
}
function E(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function re(t) {
  const e = globalThis.HTMLElement;
  return typeof e < "u" && t instanceof e;
}
function r(t, e) {
  const d = t.querySelector(e);
  return d instanceof Element ? d : null;
}
function T(t, e) {
  return r(t, e) ?? r(t.ownerDocument, e);
}
function c(t) {
  return typeof t == "string" ? t.trim() : "";
}
function W(t) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const e = Number.parseFloat(t.trim());
    return Number.isFinite(e) ? e : 0;
  }
  return 0;
}
function J(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
}
function se(t) {
  return E(t) ? { ...t } : {};
}
function H(t) {
  const e = E(t) ? t : {}, d = se(e.metadata);
  return {
    id: c(e.id),
    name: c(e.name) || c(e.filename) || "Untitled asset",
    url: c(e.url),
    thumbnail: c(e.thumbnail) || c(e.thumbnail_url) || c(e.url),
    type: c(e.type) || le(c(e.mime_type)),
    mimeType: c(e.mime_type),
    size: W(e.size),
    status: c(e.status),
    workflowStatus: c(e.workflow_status),
    createdAt: c(e.created_at),
    metadata: d
  };
}
function le(t) {
  const e = t.toLowerCase();
  return e.startsWith("image/") ? "image" : e.startsWith("video/") ? "video" : e.startsWith("audio/") ? "audio" : e.includes("pdf") || e.includes("document") || e.includes("text/") ? "document" : "";
}
function U(t) {
  if (!Number.isFinite(t) || t <= 0) return "0 B";
  const e = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let d = t, s = 0;
  for (; d >= 1024 && s < e.length - 1; )
    d /= 1024, s += 1;
  return `${d.toFixed(s === 0 ? 0 : 1)} ${e[s]}`;
}
function B(t) {
  if (!t) return "Unknown";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function v(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function oe(t) {
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
function V(t) {
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
function q(t, e) {
  return t.replace(":id", encodeURIComponent(e));
}
async function I(t, e) {
  const d = e ?? {}, s = new Headers(d.headers ?? {});
  s.has("Accept") || s.set("Accept", "application/json"), ie(t, d, s);
  const f = await fetch(t, {
    ...d,
    credentials: "same-origin",
    headers: s
  }), y = String(f.headers.get("content-type") || "").toLowerCase(), b = y.includes("application/json") || y.includes("+json") ? await f.json().catch(() => null) : await f.text().catch(() => "");
  if (!f.ok) throw new Error(A(b) || `Request failed (${f.status})`);
  return b;
}
function A(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const d = A(e);
      if (d) return d;
    }
    return "";
  }
  if (!E(t)) return "";
  for (const e of [
    "error",
    "message",
    "detail",
    "reason"
  ]) {
    const d = A(t[e]);
    if (d) return d;
  }
  return "";
}
function N(t, e) {
  const d = document.createElement("div"), s = t.type === "image" || t.type === "vector", f = t.thumbnail || t.url;
  if (s && f) {
    const b = document.createElement("img");
    return b.src = f, b.alt = t.name, b.loading = "lazy", b.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", d.appendChild(b), d;
  }
  d.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const y = document.createElement("i");
  return y.className = `${oe(t.type)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, d.appendChild(y), d;
}
function ce(t, e, d) {
  const s = document.createElement("button");
  s.type = "button", s.dataset.mediaItem = t.id, s.className = [
    "group",
    "text-left",
    "bg-white",
    "border",
    "rounded-2xl",
    "overflow-hidden",
    "shadow-sm",
    "transition",
    d ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
  ].join(" ");
  const f = document.createElement("div");
  f.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", f.appendChild(N(t, "card"));
  const y = document.createElement("input");
  y.type = "checkbox", y.checked = e, y.dataset.mediaSelect = t.id, y.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", f.appendChild(y);
  const b = document.createElement("span");
  b.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${V(t.workflowStatus || t.status)}`, b.textContent = t.workflowStatus || t.status || "unknown", f.appendChild(b);
  const k = document.createElement("div");
  return k.className = "p-4", k.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${v(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${v(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${v(U(t.size))}</span>
      <span>${v(B(t.createdAt))}</span>
    </div>
  `, s.appendChild(f), s.appendChild(k), s;
}
function ue(t, e, d) {
  const s = document.createElement("tr");
  s.dataset.mediaItem = t.id, s.className = d ? "bg-gray-50" : "", s.innerHTML = `
    <td class="px-4 py-3">
      <input type="checkbox" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" data-media-select="${v(t.id)}" ${e ? "checked" : ""}>
    </td>
    <td class="px-4 py-3" data-media-preview-cell></td>
    <td class="px-4 py-3 min-w-[240px]">
      <div class="font-medium text-gray-900">${v(t.name)}</div>
      <div class="text-xs text-gray-500 break-all mt-1">${v(t.url || "")}</div>
    </td>
    <td class="px-4 py-3 hidden md:table-cell">${v(t.type || "asset")}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${V(t.workflowStatus || t.status)}">
        ${v(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${v(U(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${v(B(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${v(t.id)}">Inspect</button>
    </td>
  `;
  const f = r(s, "[data-media-preview-cell]");
  return f && f.appendChild(N(t, "list")), s;
}
function me(t) {
  return {
    root: t,
    search: r(t, "[data-media-search]"),
    typeFilter: r(t, "[data-media-type-filter]"),
    statusFilter: r(t, "[data-media-status-filter]"),
    sort: r(t, "[data-media-sort]"),
    grid: r(t, "[data-media-grid]"),
    listShell: r(t, "[data-media-list]"),
    listBody: r(t, "[data-media-list-body]"),
    loadMore: r(t, "[data-media-load-more]"),
    countLabel: r(t, "[data-media-count-label]"),
    footer: r(t, "[data-media-footer]"),
    empty: r(t, "[data-media-empty]"),
    noResults: r(t, "[data-media-no-results]"),
    loading: r(t, "[data-media-loading]"),
    error: r(t, "[data-media-error]"),
    status: r(t, "[data-media-status]"),
    uploadInput: T(t, "[data-media-upload-input]"),
    uploadTrigger: T(t, "[data-media-upload-trigger]"),
    uploadEmpty: r(t, "[data-media-upload-empty]"),
    selectAll: r(t, "[data-media-select-all]"),
    selectionBar: T(t, "[data-media-selection-bar]"),
    selectionCount: T(t, "[data-media-selected-count]"),
    clearSelection: T(t, "[data-media-clear-selection]"),
    bulkDelete: T(t, "[data-media-bulk-delete]"),
    detailEmpty: r(t, "[data-media-detail-empty]"),
    detail: r(t, "[data-media-detail]"),
    detailPreview: r(t, "[data-media-detail-preview]"),
    detailName: r(t, "[data-media-detail-name]"),
    detailURL: r(t, "[data-media-detail-url]"),
    detailType: r(t, "[data-media-detail-type]"),
    detailStatus: r(t, "[data-media-detail-status-label]"),
    detailSize: r(t, "[data-media-detail-size]"),
    detailDate: r(t, "[data-media-detail-date]"),
    detailForm: r(t, "[data-media-detail-form]"),
    detailAltText: r(t, "#media-alt-text"),
    detailCaption: r(t, "#media-caption"),
    detailTags: r(t, "#media-tags"),
    detailError: r(t, "[data-media-detail-error]"),
    detailFeedback: r(t, "[data-media-detail-feedback]"),
    detailSaveButton: r(t, "[data-media-save-button]"),
    detailCopyURL: r(t, "[data-media-copy-url]"),
    detailDelete: r(t, "[data-media-delete]")
  };
}
function fe(t, e) {
  let d = 0;
  return ((...s) => {
    globalThis.clearTimeout(d), d = globalThis.setTimeout(() => t(...s), e);
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
function x(t, e, d = "hidden") {
  t && (e ? t.classList.remove(d) : t.classList.add(d));
}
function pe(t) {
  return J(t.tags).join(", ");
}
async function ge(t) {
  const e = me(t), d = c(t.dataset.mediaView) === "list" ? "list" : "grid", s = c(t.dataset.mediaLibraryPath), f = c(t.dataset.mediaItemPath), y = c(t.dataset.mediaUploadPath), b = c(t.dataset.mediaPresignPath), k = c(t.dataset.mediaConfirmPath), _ = c(t.dataset.mediaCapabilitiesPath), i = {
    items: [],
    total: 0,
    selectedIDs: /* @__PURE__ */ new Set(),
    activeID: "",
    loading: !1,
    capabilities: null
  };
  function M() {
    return i.activeID ? i.items.find((a) => a.id === i.activeID) ?? null : null;
  }
  function P() {
    return !!(i.capabilities?.operations?.upload || i.capabilities?.operations?.presign || i.capabilities?.upload?.direct_upload || i.capabilities?.upload?.presign);
  }
  function z() {
    return !!i.capabilities?.operations?.update;
  }
  function S() {
    return !!i.capabilities?.operations?.delete;
  }
  function $() {
    const a = M();
    if (x(e.detailEmpty, !a), x(e.detail, !!a), !a) {
      u(e.detailError, ""), u(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(N(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = a.url), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = a.workflowStatus || a.status || "unknown"), e.detailSize && (e.detailSize.textContent = U(a.size)), e.detailDate && (e.detailDate.textContent = B(a.createdAt)), e.detailAltText && (e.detailAltText.value = c(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = c(a.metadata.caption)), e.detailTags && (e.detailTags.value = pe(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !z()), e.detailDelete && (e.detailDelete.disabled = !S());
  }
  function L() {
    const a = i.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), x(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !S() || a === 0);
  }
  function w() {
    if (e.grid && (e.grid.replaceChildren(), d === "grid"))
      for (const a of i.items) {
        const n = ce(a, i.selectedIDs.has(a.id), i.activeID === a.id), m = r(n, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (o) => {
          o.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), w();
        }), n.addEventListener("click", () => {
          i.activeID = a.id, $(), w();
        }), e.grid.appendChild(n);
      }
    if (e.listBody && (e.listBody.replaceChildren(), d === "list"))
      for (const a of i.items) {
        const n = ue(a, i.selectedIDs.has(a.id), i.activeID === a.id);
        n.addEventListener("click", () => {
          i.activeID = a.id, $(), w();
        });
        const m = r(n, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (o) => {
          o.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), w();
        }), r(n, `[data-media-open="${a.id}"]`)?.addEventListener("click", (o) => {
          o.stopPropagation(), i.activeID = a.id, $(), w();
        }), e.listBody.appendChild(n);
      }
    e.countLabel && (e.countLabel.textContent = `${i.items.length} of ${i.total || i.items.length} items`), e.selectAll && (e.selectAll.checked = i.items.length > 0 && i.items.every((a) => i.selectedIDs.has(a.id))), x(e.footer, i.items.length > 0), x(e.loadMore, i.items.length > 0 && i.items.length < i.total), L(), $();
  }
  function F() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), n = i.items.length > 0;
    x(e.loading, i.loading, "hidden"), x(e.empty, !i.loading && !n && !a), x(e.noResults, !i.loading && !n && a), x(e.grid, !i.loading && n && d === "grid"), x(e.listShell, !i.loading && n && d === "list");
  }
  function G(a) {
    i.items = i.items.map((n) => n.id === a.id ? a : n), i.activeID || (i.activeID = a.id), w(), F();
  }
  async function K() {
    if (_) {
      try {
        const a = await I(_);
        i.capabilities = E(a) ? a : null;
      } catch (a) {
        u(e.status, ""), u(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !P()), e.uploadEmpty && (e.uploadEmpty.disabled = !P());
    }
  }
  async function D(a = !1) {
    if (!s) {
      u(e.error, "Media library endpoint is not configured.");
      return;
    }
    i.loading = !0, F(), u(e.error, "");
    const n = new URLSearchParams(), m = d === "list" ? de : ne, o = a ? i.items.length : 0;
    n.set("limit", String(m)), n.set("offset", String(o)), e.search?.value.trim() && n.set("search", e.search.value.trim()), e.typeFilter?.value && n.set("type", e.typeFilter.value), e.statusFilter?.value && n.set("status", e.statusFilter.value), e.sort?.value && n.set("sort", e.sort.value);
    try {
      const g = await I(`${s}?${n.toString()}`), l = E(g) ? g : {}, p = (Array.isArray(l.items) ? l.items : []).map((h) => H(h)).filter((h) => h.id);
      i.items = a ? [...i.items, ...p.filter((h) => !i.items.some((C) => C.id === h.id))] : p, i.total = Math.max(W(l.total), i.items.length), i.activeID && !i.items.some((h) => h.id === i.activeID) && (i.activeID = ""), !i.activeID && i.items.length > 0 && (i.activeID = i.items[0].id);
    } catch (g) {
      u(e.error, g instanceof Error ? g.message : "Failed to load media library.");
    } finally {
      i.loading = !1, w(), F();
    }
  }
  async function Q() {
    const a = M();
    if (!a || !z()) return;
    if (!f) {
      u(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const n = { ...a.metadata }, m = e.detailAltText?.value.trim() || "", o = e.detailCaption?.value.trim() || "", g = J(e.detailTags?.value || "");
    m ? n.alt_text = m : delete n.alt_text, o ? n.caption = o : delete n.caption, g.length > 0 ? n.tags = g : delete n.tags;
    try {
      u(e.detailError, ""), u(e.detailFeedback, ""), G(H(await I(q(f, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: n })
      }))), u(e.detailFeedback, "Metadata saved.");
    } catch (l) {
      u(e.detailError, l instanceof Error ? l.message : "Failed to save metadata.");
    }
  }
  async function j(a, n) {
    if (!S()) return {
      deleted: !1,
      error: ""
    };
    if (!f) {
      const o = "Media item endpoint is not configured.";
      return n?.reportDetailError !== !1 && u(e.detailError, o), {
        deleted: !1,
        error: o
      };
    }
    const m = i.items.find((o) => o.id === a)?.name || "this media item";
    if (!n?.skipConfirm && !globalThis.confirm(`Delete ${m}?`)) return {
      deleted: !1,
      error: ""
    };
    try {
      return u(e.detailError, ""), await I(q(f, a), { method: "DELETE" }), i.items = i.items.filter((o) => o.id !== a), i.selectedIDs.delete(a), i.activeID === a && (i.activeID = i.items[0]?.id || ""), i.total = Math.max(0, i.total - 1), w(), F(), n?.suppressStatus || u(e.status, "Media item deleted."), {
        deleted: !0,
        error: ""
      };
    } catch (o) {
      const g = o instanceof Error ? o.message : "Failed to delete media item.";
      return n?.reportDetailError !== !1 && u(e.detailError, g), {
        deleted: !1,
        error: g
      };
    }
  }
  async function X() {
    if (!S() || i.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${i.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...i.selectedIDs], n = /* @__PURE__ */ new Set(), m = [];
    let o = 0;
    u(e.error, ""), u(e.detailError, "");
    for (const l of a) {
      const p = i.items.find((C) => C.id === l), h = await j(l, {
        skipConfirm: !0,
        suppressStatus: !0,
        reportDetailError: !1
      });
      if (h.deleted) {
        o += 1;
        continue;
      }
      n.add(l), h.error && m.push(`Failed to delete ${p?.name || l}: ${h.error}`);
    }
    i.selectedIDs = n, L(), w();
    const g = O("delete", {
      attempted: a.length,
      succeeded: o,
      failed: m.length,
      failures: m
    });
    u(e.status, g.status), u(e.error, g.error);
  }
  async function Y() {
    const a = M();
    if (a?.url)
      try {
        await globalThis.navigator.clipboard.writeText(a.url), u(e.detailFeedback, "URL copied.");
      } catch {
        u(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function Z(a, n) {
    const m = c(a.upload_url);
    if (!m) throw new Error("Upload URL missing from presign response.");
    const o = E(a.fields) ? a.fields : null;
    if (o) {
      const p = new FormData();
      for (const [C, ae] of Object.entries(o)) p.append(C, String(ae));
      p.append("file", n);
      const h = await fetch(m, {
        method: c(a.method) || "POST",
        body: p
      });
      if (!h.ok) throw new Error(`Upload failed (${h.status}).`);
      return;
    }
    const g = new Headers();
    if (E(a.headers)) for (const [p, h] of Object.entries(a.headers)) g.set(p, String(h));
    const l = await fetch(m, {
      method: c(a.method) || "PUT",
      headers: g,
      body: n
    });
    if (!l.ok) throw new Error(`Upload failed (${l.status}).`);
  }
  async function ee(a) {
    const n = Array.from(a);
    if (n.length === 0) return;
    if (!P()) {
      u(e.error, "Uploads are not available for this request.");
      return;
    }
    u(e.error, "");
    let m = 0;
    const o = [];
    for (const l of n) {
      u(e.status, `Uploading ${l.name}…`);
      try {
        if (i.capabilities?.upload?.direct_upload && y) {
          const p = new FormData();
          p.append("file", l), p.append("name", l.name), p.append("file_name", l.name), p.append("content_type", l.type), await I(y, {
            method: "POST",
            body: p
          });
        } else if (i.capabilities?.upload?.presign && b && k) {
          const p = await I(b, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
          if (!E(p)) throw new Error("Invalid presign response.");
          await Z(p, l), await I(k, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_id: c(p.upload_id),
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
        } else throw new Error("No supported upload mode is configured.");
        m += 1;
      } catch (p) {
        const h = p instanceof Error ? p.message : `Failed to upload ${l.name}.`;
        o.push(`Failed to upload ${l.name}: ${h}`);
      }
    }
    const g = O("upload", {
      attempted: n.length,
      succeeded: m,
      failed: o.length,
      failures: o
    });
    u(e.status, g.status), u(e.error, g.error), m > 0 && await D(!1);
  }
  const te = fe(() => {
    D(!1);
  }, 250);
  e.search?.addEventListener("input", te), e.typeFilter?.addEventListener("change", () => {
    D(!1);
  }), e.statusFilter?.addEventListener("change", () => {
    D(!1);
  }), e.sort?.addEventListener("change", () => {
    D(!1);
  }), e.loadMore?.addEventListener("click", () => {
    D(!0);
  }), e.selectAll?.addEventListener("change", () => {
    if (e.selectAll?.checked) for (const a of i.items) i.selectedIDs.add(a.id);
    else i.selectedIDs.clear();
    L(), w();
  });
  const R = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", R), e.uploadEmpty?.addEventListener("click", R), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (ee(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    i.selectedIDs.clear(), L(), w();
  }), e.bulkDelete?.addEventListener("click", () => {
    X();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), Q();
  }), e.detailCopyURL?.addEventListener("click", () => {
    Y();
  }), e.detailDelete?.addEventListener("click", () => {
    i.activeID && j(i.activeID);
  }), await K(), await D(!1);
}
async function ye() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    re(e) && await ge(e);
}
typeof document < "u" && ye();
export {
  ye as initMediaPages,
  O as summarizeBatchMutation
};

//# sourceMappingURL=index.js.map