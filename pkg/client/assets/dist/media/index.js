var te = 24, ae = 50;
function E(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function ie(t) {
  const e = globalThis.HTMLElement;
  return typeof e < "u" && t instanceof e;
}
function n(t, e) {
  const s = t.querySelector(e);
  return s instanceof Element ? s : null;
}
function c(t) {
  return typeof t == "string" ? t.trim() : "";
}
function H(t) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const e = Number.parseFloat(t.trim());
    return Number.isFinite(e) ? e : 0;
  }
  return 0;
}
function q(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
}
function ne(t) {
  return E(t) ? { ...t } : {};
}
function R(t) {
  const e = E(t) ? t : {}, s = ne(e.metadata);
  return {
    id: c(e.id),
    name: c(e.name) || c(e.filename) || "Untitled asset",
    url: c(e.url),
    thumbnail: c(e.thumbnail) || c(e.thumbnail_url) || c(e.url),
    type: c(e.type) || de(c(e.mime_type)),
    mimeType: c(e.mime_type),
    size: H(e.size),
    status: c(e.status),
    workflowStatus: c(e.workflow_status),
    createdAt: c(e.created_at),
    metadata: s
  };
}
function de(t) {
  const e = t.toLowerCase();
  return e.startsWith("image/") ? "image" : e.startsWith("video/") ? "video" : e.startsWith("audio/") ? "audio" : e.includes("pdf") || e.includes("document") || e.includes("text/") ? "document" : "";
}
function A(t) {
  if (!Number.isFinite(t) || t <= 0) return "0 B";
  const e = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB"
  ];
  let s = t, o = 0;
  for (; s >= 1024 && o < e.length - 1; )
    s /= 1024, o += 1;
  return `${s.toFixed(o === 0 ? 0 : 1)} ${e[o]}`;
}
function M(t) {
  if (!t) return "Unknown";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleDateString(void 0, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
function y(t) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function se(t) {
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
function W(t) {
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
function O(t, e) {
  return t.replace(":id", encodeURIComponent(e));
}
async function I(t, e) {
  const s = await fetch(t, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...e?.headers ?? {}
    },
    ...e
  }), o = String(s.headers.get("content-type") || "").toLowerCase(), m = o.includes("application/json") || o.includes("+json") ? await s.json().catch(() => null) : await s.text().catch(() => "");
  if (!s.ok) throw new Error(U(m) || `Request failed (${s.status})`);
  return m;
}
function U(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const s = U(e);
      if (s) return s;
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
    const s = U(t[e]);
    if (s) return s;
  }
  return "";
}
function N(t, e) {
  const s = document.createElement("div"), o = t.type === "image" || t.type === "vector", m = t.thumbnail || t.url;
  if (o && m) {
    const p = document.createElement("img");
    return p.src = m, p.alt = t.name, p.loading = "lazy", p.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", s.appendChild(p), s;
  }
  s.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const g = document.createElement("i");
  return g.className = `${se(t.type)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, s.appendChild(g), s;
}
function re(t, e, s) {
  const o = document.createElement("button");
  o.type = "button", o.dataset.mediaItem = t.id, o.className = [
    "group",
    "text-left",
    "bg-white",
    "border",
    "rounded-2xl",
    "overflow-hidden",
    "shadow-sm",
    "transition",
    s ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300 hover:shadow-md"
  ].join(" ");
  const m = document.createElement("div");
  m.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", m.appendChild(N(t, "card"));
  const g = document.createElement("input");
  g.type = "checkbox", g.checked = e, g.dataset.mediaSelect = t.id, g.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", m.appendChild(g);
  const p = document.createElement("span");
  p.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${W(t.workflowStatus || t.status)}`, p.textContent = t.workflowStatus || t.status || "unknown", m.appendChild(p);
  const k = document.createElement("div");
  return k.className = "p-4", k.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${y(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${y(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${y(A(t.size))}</span>
      <span>${y(M(t.createdAt))}</span>
    </div>
  `, o.appendChild(m), o.appendChild(k), o;
}
function le(t, e, s) {
  const o = document.createElement("tr");
  o.dataset.mediaItem = t.id, o.className = s ? "bg-gray-50" : "", o.innerHTML = `
    <td class="px-4 py-3">
      <input type="checkbox" class="rounded border-gray-300 text-gray-900 focus:ring-gray-900" data-media-select="${y(t.id)}" ${e ? "checked" : ""}>
    </td>
    <td class="px-4 py-3" data-media-preview-cell></td>
    <td class="px-4 py-3 min-w-[240px]">
      <div class="font-medium text-gray-900">${y(t.name)}</div>
      <div class="text-xs text-gray-500 break-all mt-1">${y(t.url || "")}</div>
    </td>
    <td class="px-4 py-3 hidden md:table-cell">${y(t.type || "asset")}</td>
    <td class="px-4 py-3 hidden md:table-cell">
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${W(t.workflowStatus || t.status)}">
        ${y(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${y(A(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${y(M(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${y(t.id)}">Inspect</button>
    </td>
  `;
  const m = n(o, "[data-media-preview-cell]");
  return m && m.appendChild(N(t, "list")), o;
}
function oe(t) {
  return {
    root: t,
    search: n(t, "[data-media-search]"),
    typeFilter: n(t, "[data-media-type-filter]"),
    statusFilter: n(t, "[data-media-status-filter]"),
    sort: n(t, "[data-media-sort]"),
    grid: n(t, "[data-media-grid]"),
    listShell: n(t, "[data-media-list]"),
    listBody: n(t, "[data-media-list-body]"),
    loadMore: n(t, "[data-media-load-more]"),
    countLabel: n(t, "[data-media-count-label]"),
    footer: n(t, "[data-media-footer]"),
    empty: n(t, "[data-media-empty]"),
    noResults: n(t, "[data-media-no-results]"),
    loading: n(t, "[data-media-loading]"),
    error: n(t, "[data-media-error]"),
    status: n(t, "[data-media-status]"),
    uploadInput: n(t, "[data-media-upload-input]"),
    uploadTrigger: n(t, "[data-media-upload-trigger]"),
    uploadEmpty: n(t, "[data-media-upload-empty]"),
    selectAll: n(t, "[data-media-select-all]"),
    selectionBar: n(t, "[data-media-selection-bar]"),
    selectionCount: n(t, "[data-media-selected-count]"),
    clearSelection: n(t, "[data-media-clear-selection]"),
    bulkDelete: n(t, "[data-media-bulk-delete]"),
    detailEmpty: n(t, "[data-media-detail-empty]"),
    detail: n(t, "[data-media-detail]"),
    detailPreview: n(t, "[data-media-detail-preview]"),
    detailName: n(t, "[data-media-detail-name]"),
    detailURL: n(t, "[data-media-detail-url]"),
    detailType: n(t, "[data-media-detail-type]"),
    detailStatus: n(t, "[data-media-detail-status-label]"),
    detailSize: n(t, "[data-media-detail-size]"),
    detailDate: n(t, "[data-media-detail-date]"),
    detailForm: n(t, "[data-media-detail-form]"),
    detailAltText: n(t, "#media-alt-text"),
    detailCaption: n(t, "#media-caption"),
    detailTags: n(t, "#media-tags"),
    detailError: n(t, "[data-media-detail-error]"),
    detailFeedback: n(t, "[data-media-detail-feedback]"),
    detailSaveButton: n(t, "[data-media-save-button]"),
    detailCopyURL: n(t, "[data-media-copy-url]"),
    detailDelete: n(t, "[data-media-delete]")
  };
}
function ce(t, e) {
  let s = 0;
  return ((...o) => {
    globalThis.clearTimeout(s), s = globalThis.setTimeout(() => t(...o), e);
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
function v(t, e, s = "hidden") {
  t && (e ? t.classList.remove(s) : t.classList.add(s));
}
function ue(t) {
  return q(t.tags).join(", ");
}
async function me(t) {
  const e = oe(t), s = c(t.dataset.mediaView) === "list" ? "list" : "grid", o = c(t.dataset.mediaLibraryPath), m = c(t.dataset.mediaItemPath), g = c(t.dataset.mediaUploadPath), p = c(t.dataset.mediaPresignPath), k = c(t.dataset.mediaConfirmPath), B = c(t.dataset.mediaCapabilitiesPath), i = {
    items: [],
    total: 0,
    selectedIDs: /* @__PURE__ */ new Set(),
    activeID: "",
    loading: !1,
    capabilities: null
  };
  function F() {
    return i.activeID ? i.items.find((a) => a.id === i.activeID) ?? null : null;
  }
  function $() {
    return !!(i.capabilities?.operations?.upload || i.capabilities?.operations?.presign || i.capabilities?.upload?.direct_upload || i.capabilities?.upload?.presign);
  }
  function _() {
    return !!i.capabilities?.operations?.update;
  }
  function T() {
    return !!i.capabilities?.operations?.delete;
  }
  function C() {
    const a = F();
    if (v(e.detailEmpty, !a), v(e.detail, !!a), !a) {
      u(e.detailError, ""), u(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(N(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = a.url), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = a.workflowStatus || a.status || "unknown"), e.detailSize && (e.detailSize.textContent = A(a.size)), e.detailDate && (e.detailDate.textContent = M(a.createdAt)), e.detailAltText && (e.detailAltText.value = c(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = c(a.metadata.caption)), e.detailTags && (e.detailTags.value = ue(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !_()), e.detailDelete && (e.detailDelete.disabled = !T());
  }
  function L() {
    const a = i.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), v(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !T() || a === 0);
  }
  function b() {
    if (e.grid && (e.grid.replaceChildren(), s === "grid"))
      for (const a of i.items) {
        const d = re(a, i.selectedIDs.has(a.id), i.activeID === a.id), r = n(d, `[data-media-select="${a.id}"]`);
        r?.addEventListener("click", (l) => {
          l.stopPropagation();
        }), r?.addEventListener("change", () => {
          r.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), b();
        }), d.addEventListener("click", () => {
          i.activeID = a.id, C(), b();
        }), e.grid.appendChild(d);
      }
    if (e.listBody && (e.listBody.replaceChildren(), s === "list"))
      for (const a of i.items) {
        const d = le(a, i.selectedIDs.has(a.id), i.activeID === a.id);
        d.addEventListener("click", () => {
          i.activeID = a.id, C(), b();
        });
        const r = n(d, `[data-media-select="${a.id}"]`);
        r?.addEventListener("click", (l) => {
          l.stopPropagation();
        }), r?.addEventListener("change", () => {
          r.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), b();
        }), n(d, `[data-media-open="${a.id}"]`)?.addEventListener("click", (l) => {
          l.stopPropagation(), i.activeID = a.id, C(), b();
        }), e.listBody.appendChild(d);
      }
    e.countLabel && (e.countLabel.textContent = `${i.items.length} of ${i.total || i.items.length} items`), e.selectAll && (e.selectAll.checked = i.items.length > 0 && i.items.every((a) => i.selectedIDs.has(a.id))), v(e.footer, i.items.length > 0), v(e.loadMore, i.items.length > 0 && i.items.length < i.total), L(), C();
  }
  function S() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), d = i.items.length > 0;
    v(e.loading, i.loading, "hidden"), v(e.empty, !i.loading && !d && !a), v(e.noResults, !i.loading && !d && a), v(e.grid, !i.loading && d && s === "grid"), v(e.listShell, !i.loading && d && s === "list");
  }
  function J(a) {
    i.items = i.items.map((d) => d.id === a.id ? a : d), i.activeID || (i.activeID = a.id), b(), S();
  }
  async function V() {
    if (B) {
      try {
        const a = await I(B);
        i.capabilities = E(a) ? a : null;
      } catch (a) {
        u(e.status, ""), u(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !$()), e.uploadEmpty && (e.uploadEmpty.disabled = !$());
    }
  }
  async function D(a = !1) {
    if (!o) {
      u(e.error, "Media library endpoint is not configured.");
      return;
    }
    i.loading = !0, S(), u(e.error, "");
    const d = new URLSearchParams(), r = s === "list" ? ae : te, l = a ? i.items.length : 0;
    d.set("limit", String(r)), d.set("offset", String(l)), e.search?.value.trim() && d.set("search", e.search.value.trim()), e.typeFilter?.value && d.set("type", e.typeFilter.value), e.statusFilter?.value && d.set("status", e.statusFilter.value), e.sort?.value && d.set("sort", e.sort.value);
    try {
      const h = await I(`${o}?${d.toString()}`), w = E(h) ? h : {}, x = (Array.isArray(w.items) ? w.items : []).map((f) => R(f)).filter((f) => f.id);
      i.items = a ? [...i.items, ...x.filter((f) => !i.items.some((P) => P.id === f.id))] : x, i.total = Math.max(H(w.total), i.items.length), i.activeID && !i.items.some((f) => f.id === i.activeID) && (i.activeID = ""), !i.activeID && i.items.length > 0 && (i.activeID = i.items[0].id);
    } catch (h) {
      u(e.error, h instanceof Error ? h.message : "Failed to load media library.");
    } finally {
      i.loading = !1, b(), S();
    }
  }
  async function G() {
    const a = F();
    if (!a || !_()) return;
    if (!m) {
      u(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const d = { ...a.metadata }, r = e.detailAltText?.value.trim() || "", l = e.detailCaption?.value.trim() || "", h = q(e.detailTags?.value || "");
    r ? d.alt_text = r : delete d.alt_text, l ? d.caption = l : delete d.caption, h.length > 0 ? d.tags = h : delete d.tags;
    try {
      u(e.detailError, ""), u(e.detailFeedback, ""), J(R(await I(O(m, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: d })
      }))), u(e.detailFeedback, "Metadata saved.");
    } catch (w) {
      u(e.detailError, w instanceof Error ? w.message : "Failed to save metadata.");
    }
  }
  async function z(a, d) {
    if (!T()) return;
    if (!m) {
      u(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const r = i.items.find((l) => l.id === a)?.name || "this media item";
    if (!(!d?.skipConfirm && !globalThis.confirm(`Delete ${r}?`)))
      try {
        await I(O(m, a), { method: "DELETE" }), i.items = i.items.filter((l) => l.id !== a), i.selectedIDs.delete(a), i.activeID === a && (i.activeID = i.items[0]?.id || ""), i.total = Math.max(0, i.total - 1), b(), S(), d?.suppressStatus || u(e.status, "Media item deleted.");
      } catch (l) {
        u(e.detailError, l instanceof Error ? l.message : "Failed to delete media item.");
      }
  }
  async function K() {
    if (!T() || i.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${i.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...i.selectedIDs];
    for (const d of a) await z(d, {
      skipConfirm: !0,
      suppressStatus: !0
    });
    i.selectedIDs.clear(), L(), u(e.status, "Selected media items deleted.");
  }
  async function Q() {
    const a = F();
    if (a?.url)
      try {
        await globalThis.navigator.clipboard.writeText(a.url), u(e.detailFeedback, "URL copied.");
      } catch {
        u(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function X(a, d) {
    const r = c(a.upload_url);
    if (!r) throw new Error("Upload URL missing from presign response.");
    const l = E(a.fields) ? a.fields : null;
    if (l) {
      const x = new FormData();
      for (const [P, ee] of Object.entries(l)) x.append(P, String(ee));
      x.append("file", d);
      const f = await fetch(r, {
        method: c(a.method) || "POST",
        body: x
      });
      if (!f.ok) throw new Error(`Upload failed (${f.status}).`);
      return;
    }
    const h = new Headers();
    if (E(a.headers)) for (const [x, f] of Object.entries(a.headers)) h.set(x, String(f));
    const w = await fetch(r, {
      method: c(a.method) || "PUT",
      headers: h,
      body: d
    });
    if (!w.ok) throw new Error(`Upload failed (${w.status}).`);
  }
  async function Y(a) {
    const d = Array.from(a);
    if (d.length !== 0) {
      if (!$()) {
        u(e.error, "Uploads are not available for this request.");
        return;
      }
      u(e.error, "");
      for (const r of d) {
        u(e.status, `Uploading ${r.name}…`);
        try {
          if (i.capabilities?.upload?.direct_upload && g) {
            const l = new FormData();
            l.append("file", r), l.append("name", r.name), l.append("file_name", r.name), l.append("content_type", r.type), await I(g, {
              method: "POST",
              body: l
            });
          } else if (i.capabilities?.upload?.presign && p && k) {
            const l = await I(p, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: r.name,
                file_name: r.name,
                content_type: r.type,
                size: r.size
              })
            });
            if (!E(l)) throw new Error("Invalid presign response.");
            await X(l, r), await I(k, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                upload_id: c(l.upload_id),
                name: r.name,
                file_name: r.name,
                content_type: r.type,
                size: r.size
              })
            });
          } else throw new Error("No supported upload mode is configured.");
        } catch (l) {
          u(e.error, l instanceof Error ? l.message : `Failed to upload ${r.name}.`);
        }
      }
      u(e.status, "Upload complete."), await D(!1);
    }
  }
  const Z = ce(() => {
    D(!1);
  }, 250);
  e.search?.addEventListener("input", Z), e.typeFilter?.addEventListener("change", () => {
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
    L(), b();
  });
  const j = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", j), e.uploadEmpty?.addEventListener("click", j), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (Y(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    i.selectedIDs.clear(), L(), b();
  }), e.bulkDelete?.addEventListener("click", () => {
    K();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), G();
  }), e.detailCopyURL?.addEventListener("click", () => {
    Q();
  }), e.detailDelete?.addEventListener("click", () => {
    i.activeID && z(i.activeID);
  }), await V(), await D(!1);
}
async function pe() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    ie(e) && await me(e);
}
typeof document < "u" && pe();
export {
  pe as initMediaPages
};

//# sourceMappingURL=index.js.map