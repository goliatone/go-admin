var ae = 24, ie = 50;
function R(t, e) {
  const d = Math.max(0, e.attempted), s = Math.max(0, e.succeeded), p = Math.max(0, e.failed), h = e.failures.map((b) => c(b)).filter(Boolean).join(" ");
  return d === 0 || s === 0 && p === 0 ? {
    status: "",
    error: h
  } : p === 0 ? t === "upload" ? {
    status: s === 1 ? "Upload complete." : `${s} uploads completed.`,
    error: ""
  } : {
    status: s === 1 ? "Media item deleted." : `${s} media items deleted.`,
    error: ""
  } : s === 0 ? {
    status: "",
    error: h
  } : t === "upload" ? {
    status: `${s} of ${d} uploads completed.`,
    error: h
  } : {
    status: `${s} of ${d} media items deleted.`,
    error: h
  };
}
function E(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function ne(t) {
  const e = globalThis.HTMLElement;
  return typeof e < "u" && t instanceof e;
}
function r(t, e) {
  const d = t.querySelector(e);
  return d instanceof Element ? d : null;
}
function c(t) {
  return typeof t == "string" ? t.trim() : "";
}
function q(t) {
  if (typeof t == "number" && Number.isFinite(t)) return t;
  if (typeof t == "string") {
    const e = Number.parseFloat(t.trim());
    return Number.isFinite(e) ? e : 0;
  }
  return 0;
}
function W(t) {
  return Array.isArray(t) ? t.map((e) => c(e)).filter(Boolean) : typeof t == "string" ? t.split(",").map((e) => e.trim()).filter(Boolean) : [];
}
function de(t) {
  return E(t) ? { ...t } : {};
}
function O(t) {
  const e = E(t) ? t : {}, d = de(e.metadata);
  return {
    id: c(e.id),
    name: c(e.name) || c(e.filename) || "Untitled asset",
    url: c(e.url),
    thumbnail: c(e.thumbnail) || c(e.thumbnail_url) || c(e.url),
    type: c(e.type) || re(c(e.mime_type)),
    mimeType: c(e.mime_type),
    size: q(e.size),
    status: c(e.status),
    workflowStatus: c(e.workflow_status),
    createdAt: c(e.created_at),
    metadata: d
  };
}
function re(t) {
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
function A(t) {
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
function J(t) {
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
function H(t, e) {
  return t.replace(":id", encodeURIComponent(e));
}
async function I(t, e) {
  const d = await fetch(t, {
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...e?.headers ?? {}
    },
    ...e
  }), s = String(d.headers.get("content-type") || "").toLowerCase(), p = s.includes("application/json") || s.includes("+json") ? await d.json().catch(() => null) : await d.text().catch(() => "");
  if (!d.ok) throw new Error(P(p) || `Request failed (${d.status})`);
  return p;
}
function P(t) {
  if (typeof t == "string") {
    const e = t.trim();
    return e.startsWith("<!doctype") || e.startsWith("<html") ? "" : e;
  }
  if (Array.isArray(t)) {
    for (const e of t) {
      const d = P(e);
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
    const d = P(t[e]);
    if (d) return d;
  }
  return "";
}
function B(t, e) {
  const d = document.createElement("div"), s = t.type === "image" || t.type === "vector", p = t.thumbnail || t.url;
  if (s && p) {
    const b = document.createElement("img");
    return b.src = p, b.alt = t.name, b.loading = "lazy", b.className = e === "detail" ? "w-full h-full object-contain" : e === "list" ? "w-12 h-12 rounded-xl object-cover" : "w-full h-full object-cover", d.appendChild(b), d;
  }
  d.className = e === "list" ? "w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500" : "w-full h-full bg-gray-100 flex items-center justify-center text-gray-500";
  const h = document.createElement("i");
  return h.className = `${se(t.type)} ${e === "detail" ? "text-5xl" : "text-2xl"}`, d.appendChild(h), d;
}
function le(t, e, d) {
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
  const p = document.createElement("div");
  p.className = "relative aspect-[4/3] bg-gray-100 overflow-hidden", p.appendChild(B(t, "card"));
  const h = document.createElement("input");
  h.type = "checkbox", h.checked = e, h.dataset.mediaSelect = t.id, h.className = "absolute top-3 left-3 rounded border-gray-300 text-gray-900 focus:ring-gray-900", p.appendChild(h);
  const b = document.createElement("span");
  b.className = `absolute top-3 right-3 inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${J(t.workflowStatus || t.status)}`, b.textContent = t.workflowStatus || t.status || "unknown", p.appendChild(b);
  const k = document.createElement("div");
  return k.className = "p-4", k.innerHTML = `
    <div class="font-medium text-gray-900 truncate">${v(t.name)}</div>
    <div class="mt-1 text-sm text-gray-500">${v(t.type || "asset")}</div>
    <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
      <span>${v(U(t.size))}</span>
      <span>${v(A(t.createdAt))}</span>
    </div>
  `, s.appendChild(p), s.appendChild(k), s;
}
function oe(t, e, d) {
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
      <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium ${J(t.workflowStatus || t.status)}">
        ${v(t.workflowStatus || t.status || "unknown")}
      </span>
    </td>
    <td class="px-4 py-3 hidden lg:table-cell">${v(U(t.size))}</td>
    <td class="px-4 py-3 hidden lg:table-cell">${v(A(t.createdAt))}</td>
    <td class="px-4 py-3 text-right">
      <button type="button" class="text-sm font-medium text-gray-700 hover:text-gray-900" data-media-open="${v(t.id)}">Inspect</button>
    </td>
  `;
  const p = r(s, "[data-media-preview-cell]");
  return p && p.appendChild(B(t, "list")), s;
}
function ce(t) {
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
    uploadInput: r(t, "[data-media-upload-input]"),
    uploadTrigger: r(t, "[data-media-upload-trigger]"),
    uploadEmpty: r(t, "[data-media-upload-empty]"),
    selectAll: r(t, "[data-media-select-all]"),
    selectionBar: r(t, "[data-media-selection-bar]"),
    selectionCount: r(t, "[data-media-selected-count]"),
    clearSelection: r(t, "[data-media-clear-selection]"),
    bulkDelete: r(t, "[data-media-bulk-delete]"),
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
function ue(t, e) {
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
function me(t) {
  return W(t.tags).join(", ");
}
async function fe(t) {
  const e = ce(t), d = c(t.dataset.mediaView) === "list" ? "list" : "grid", s = c(t.dataset.mediaLibraryPath), p = c(t.dataset.mediaItemPath), h = c(t.dataset.mediaUploadPath), b = c(t.dataset.mediaPresignPath), k = c(t.dataset.mediaConfirmPath), N = c(t.dataset.mediaCapabilitiesPath), i = {
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
  function M() {
    return !!(i.capabilities?.operations?.upload || i.capabilities?.operations?.presign || i.capabilities?.upload?.direct_upload || i.capabilities?.upload?.presign);
  }
  function _() {
    return !!i.capabilities?.operations?.update;
  }
  function C() {
    return !!i.capabilities?.operations?.delete;
  }
  function S() {
    const a = F();
    if (x(e.detailEmpty, !a), x(e.detail, !!a), !a) {
      u(e.detailError, ""), u(e.detailFeedback, "");
      return;
    }
    e.detailPreview && e.detailPreview.replaceChildren(B(a, "detail")), e.detailName && (e.detailName.textContent = a.name), e.detailURL && (e.detailURL.textContent = a.url), e.detailType && (e.detailType.textContent = a.type || a.mimeType || "asset"), e.detailStatus && (e.detailStatus.textContent = a.workflowStatus || a.status || "unknown"), e.detailSize && (e.detailSize.textContent = U(a.size)), e.detailDate && (e.detailDate.textContent = A(a.createdAt)), e.detailAltText && (e.detailAltText.value = c(a.metadata.alt_text)), e.detailCaption && (e.detailCaption.value = c(a.metadata.caption)), e.detailTags && (e.detailTags.value = me(a.metadata)), e.detailSaveButton && (e.detailSaveButton.disabled = !_()), e.detailDelete && (e.detailDelete.disabled = !C());
  }
  function L() {
    const a = i.selectedIDs.size;
    e.selectionCount && (e.selectionCount.textContent = String(a)), x(e.selectionBar, a > 0), e.bulkDelete && (e.bulkDelete.disabled = !C() || a === 0);
  }
  function w() {
    if (e.grid && (e.grid.replaceChildren(), d === "grid"))
      for (const a of i.items) {
        const n = le(a, i.selectedIDs.has(a.id), i.activeID === a.id), m = r(n, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (o) => {
          o.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), w();
        }), n.addEventListener("click", () => {
          i.activeID = a.id, S(), w();
        }), e.grid.appendChild(n);
      }
    if (e.listBody && (e.listBody.replaceChildren(), d === "list"))
      for (const a of i.items) {
        const n = oe(a, i.selectedIDs.has(a.id), i.activeID === a.id);
        n.addEventListener("click", () => {
          i.activeID = a.id, S(), w();
        });
        const m = r(n, `[data-media-select="${a.id}"]`);
        m?.addEventListener("click", (o) => {
          o.stopPropagation();
        }), m?.addEventListener("change", () => {
          m.checked ? i.selectedIDs.add(a.id) : i.selectedIDs.delete(a.id), L(), w();
        }), r(n, `[data-media-open="${a.id}"]`)?.addEventListener("click", (o) => {
          o.stopPropagation(), i.activeID = a.id, S(), w();
        }), e.listBody.appendChild(n);
      }
    e.countLabel && (e.countLabel.textContent = `${i.items.length} of ${i.total || i.items.length} items`), e.selectAll && (e.selectAll.checked = i.items.length > 0 && i.items.every((a) => i.selectedIDs.has(a.id))), x(e.footer, i.items.length > 0), x(e.loadMore, i.items.length > 0 && i.items.length < i.total), L(), S();
  }
  function $() {
    const a = !!(e.search?.value || e.typeFilter?.value || e.statusFilter?.value), n = i.items.length > 0;
    x(e.loading, i.loading, "hidden"), x(e.empty, !i.loading && !n && !a), x(e.noResults, !i.loading && !n && a), x(e.grid, !i.loading && n && d === "grid"), x(e.listShell, !i.loading && n && d === "list");
  }
  function V(a) {
    i.items = i.items.map((n) => n.id === a.id ? a : n), i.activeID || (i.activeID = a.id), w(), $();
  }
  async function G() {
    if (N) {
      try {
        const a = await I(N);
        i.capabilities = E(a) ? a : null;
      } catch (a) {
        u(e.status, ""), u(e.error, a instanceof Error ? a.message : "Failed to load media capabilities.");
      }
      e.uploadTrigger && (e.uploadTrigger.disabled = !M()), e.uploadEmpty && (e.uploadEmpty.disabled = !M());
    }
  }
  async function D(a = !1) {
    if (!s) {
      u(e.error, "Media library endpoint is not configured.");
      return;
    }
    i.loading = !0, $(), u(e.error, "");
    const n = new URLSearchParams(), m = d === "list" ? ie : ae, o = a ? i.items.length : 0;
    n.set("limit", String(m)), n.set("offset", String(o)), e.search?.value.trim() && n.set("search", e.search.value.trim()), e.typeFilter?.value && n.set("type", e.typeFilter.value), e.statusFilter?.value && n.set("status", e.statusFilter.value), e.sort?.value && n.set("sort", e.sort.value);
    try {
      const g = await I(`${s}?${n.toString()}`), l = E(g) ? g : {}, f = (Array.isArray(l.items) ? l.items : []).map((y) => O(y)).filter((y) => y.id);
      i.items = a ? [...i.items, ...f.filter((y) => !i.items.some((T) => T.id === y.id))] : f, i.total = Math.max(q(l.total), i.items.length), i.activeID && !i.items.some((y) => y.id === i.activeID) && (i.activeID = ""), !i.activeID && i.items.length > 0 && (i.activeID = i.items[0].id);
    } catch (g) {
      u(e.error, g instanceof Error ? g.message : "Failed to load media library.");
    } finally {
      i.loading = !1, w(), $();
    }
  }
  async function K() {
    const a = F();
    if (!a || !_()) return;
    if (!p) {
      u(e.detailError, "Media item endpoint is not configured.");
      return;
    }
    const n = { ...a.metadata }, m = e.detailAltText?.value.trim() || "", o = e.detailCaption?.value.trim() || "", g = W(e.detailTags?.value || "");
    m ? n.alt_text = m : delete n.alt_text, o ? n.caption = o : delete n.caption, g.length > 0 ? n.tags = g : delete n.tags;
    try {
      u(e.detailError, ""), u(e.detailFeedback, ""), V(O(await I(H(p, a.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: n })
      }))), u(e.detailFeedback, "Metadata saved.");
    } catch (l) {
      u(e.detailError, l instanceof Error ? l.message : "Failed to save metadata.");
    }
  }
  async function z(a, n) {
    if (!C()) return {
      deleted: !1,
      error: ""
    };
    if (!p) {
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
      return u(e.detailError, ""), await I(H(p, a), { method: "DELETE" }), i.items = i.items.filter((o) => o.id !== a), i.selectedIDs.delete(a), i.activeID === a && (i.activeID = i.items[0]?.id || ""), i.total = Math.max(0, i.total - 1), w(), $(), n?.suppressStatus || u(e.status, "Media item deleted."), {
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
  async function Q() {
    if (!C() || i.selectedIDs.size === 0 || !globalThis.confirm(`Delete ${i.selectedIDs.size} selected media item(s)?`)) return;
    const a = [...i.selectedIDs], n = /* @__PURE__ */ new Set(), m = [];
    let o = 0;
    u(e.error, ""), u(e.detailError, "");
    for (const l of a) {
      const f = i.items.find((T) => T.id === l), y = await z(l, {
        skipConfirm: !0,
        suppressStatus: !0,
        reportDetailError: !1
      });
      if (y.deleted) {
        o += 1;
        continue;
      }
      n.add(l), y.error && m.push(`Failed to delete ${f?.name || l}: ${y.error}`);
    }
    i.selectedIDs = n, L(), w();
    const g = R("delete", {
      attempted: a.length,
      succeeded: o,
      failed: m.length,
      failures: m
    });
    u(e.status, g.status), u(e.error, g.error);
  }
  async function X() {
    const a = F();
    if (a?.url)
      try {
        await globalThis.navigator.clipboard.writeText(a.url), u(e.detailFeedback, "URL copied.");
      } catch {
        u(e.detailError, "Clipboard access is unavailable.");
      }
  }
  async function Y(a, n) {
    const m = c(a.upload_url);
    if (!m) throw new Error("Upload URL missing from presign response.");
    const o = E(a.fields) ? a.fields : null;
    if (o) {
      const f = new FormData();
      for (const [T, te] of Object.entries(o)) f.append(T, String(te));
      f.append("file", n);
      const y = await fetch(m, {
        method: c(a.method) || "POST",
        body: f
      });
      if (!y.ok) throw new Error(`Upload failed (${y.status}).`);
      return;
    }
    const g = new Headers();
    if (E(a.headers)) for (const [f, y] of Object.entries(a.headers)) g.set(f, String(y));
    const l = await fetch(m, {
      method: c(a.method) || "PUT",
      headers: g,
      body: n
    });
    if (!l.ok) throw new Error(`Upload failed (${l.status}).`);
  }
  async function Z(a) {
    const n = Array.from(a);
    if (n.length === 0) return;
    if (!M()) {
      u(e.error, "Uploads are not available for this request.");
      return;
    }
    u(e.error, "");
    let m = 0;
    const o = [];
    for (const l of n) {
      u(e.status, `Uploading ${l.name}…`);
      try {
        if (i.capabilities?.upload?.direct_upload && h) {
          const f = new FormData();
          f.append("file", l), f.append("name", l.name), f.append("file_name", l.name), f.append("content_type", l.type), await I(h, {
            method: "POST",
            body: f
          });
        } else if (i.capabilities?.upload?.presign && b && k) {
          const f = await I(b, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
          if (!E(f)) throw new Error("Invalid presign response.");
          await Y(f, l), await I(k, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              upload_id: c(f.upload_id),
              name: l.name,
              file_name: l.name,
              content_type: l.type,
              size: l.size
            })
          });
        } else throw new Error("No supported upload mode is configured.");
        m += 1;
      } catch (f) {
        const y = f instanceof Error ? f.message : `Failed to upload ${l.name}.`;
        o.push(`Failed to upload ${l.name}: ${y}`);
      }
    }
    const g = R("upload", {
      attempted: n.length,
      succeeded: m,
      failed: o.length,
      failures: o
    });
    u(e.status, g.status), u(e.error, g.error), m > 0 && await D(!1);
  }
  const ee = ue(() => {
    D(!1);
  }, 250);
  e.search?.addEventListener("input", ee), e.typeFilter?.addEventListener("change", () => {
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
  const j = () => {
    e.uploadInput?.click();
  };
  e.uploadTrigger?.addEventListener("click", j), e.uploadEmpty?.addEventListener("click", j), e.uploadInput?.addEventListener("change", () => {
    e.uploadInput?.files && (Z(e.uploadInput.files), e.uploadInput.value = "");
  }), e.clearSelection?.addEventListener("click", () => {
    i.selectedIDs.clear(), L(), w();
  }), e.bulkDelete?.addEventListener("click", () => {
    Q();
  }), e.detailForm?.addEventListener("submit", (a) => {
    a.preventDefault(), K();
  }), e.detailCopyURL?.addEventListener("click", () => {
    X();
  }), e.detailDelete?.addEventListener("click", () => {
    i.activeID && z(i.activeID);
  }), await G(), await D(!1);
}
async function pe() {
  if (typeof document > "u") return;
  const t = Array.from(document.querySelectorAll("[data-media-page-root]"));
  for (const e of t)
    ne(e) && await fe(e);
}
typeof document < "u" && pe();
export {
  pe as initMediaPages,
  R as summarizeBatchMutation
};

//# sourceMappingURL=index.js.map