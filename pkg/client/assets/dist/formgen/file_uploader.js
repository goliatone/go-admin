import { onReady as g } from "../shared/dom-ready.js";
import { formatByteSize as h } from "../shared/size-formatters.js";
function w(e) {
  if (!e) return {};
  try {
    const t = JSON.parse(e);
    if (t && typeof t == "object")
      return t;
  } catch {
  }
  return {};
}
function c(e) {
  return h(e, {
    emptyFallback: "0 B",
    zeroFallback: "0 B",
    invalidFallback: "0 B",
    precisionByUnit: [0, 1, 1, 1]
  });
}
function d(e, t) {
  e.errorEl.textContent = t, e.errorEl.classList.remove("hidden"), e.statusEl.textContent = "", e.statusEl.classList.add("hidden");
}
function v(e) {
  e.errorEl.textContent = "", e.errorEl.classList.add("hidden");
}
function p(e, t) {
  e.statusEl.textContent = t, e.statusEl.classList.remove("hidden");
}
function f(e) {
  e.statusEl.textContent = "", e.statusEl.classList.add("hidden");
}
function u(e, t) {
  !e.previewImg || !e.placeholder || (t ? (e.previewImg.src = t, e.previewImg.classList.remove("hidden"), e.placeholder.classList.add("hidden")) : (e.previewImg.removeAttribute("src"), e.previewImg.classList.add("hidden"), e.placeholder.classList.remove("hidden")));
}
function m(e, t, r) {
  const i = e.querySelector(t);
  if (i) return i;
  const a = document.createElement("p");
  return a.className = r, e.appendChild(a), a;
}
function E(e) {
  const t = e.querySelector("input[data-file-uploader-url]"), r = e.querySelector("input[data-file-uploader-file]");
  if (!t || !r) return null;
  const i = m(e, "[data-file-uploader-error]", "text-sm text-red-600 hidden");
  i.setAttribute("data-file-uploader-error", "true");
  const a = m(e, "[data-file-uploader-status]", "text-xs text-gray-500 hidden");
  a.setAttribute("data-file-uploader-status", "true");
  const l = e.querySelector("[data-file-uploader-preview]"), s = e.querySelector("[data-file-uploader-placeholder]");
  return {
    root: e,
    urlInput: t,
    fileInput: r,
    previewImg: l ?? void 0,
    placeholder: s ?? void 0,
    errorEl: i,
    statusEl: a
  };
}
async function x(e, t, r) {
  const i = new FormData();
  i.append("file", r, r.name);
  const a = await fetch(t, {
    method: "POST",
    body: i,
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!a.ok) {
    const s = await a.text();
    let n = `Upload failed (${a.status})`;
    try {
      const o = JSON.parse(s);
      o?.message && typeof o.message == "string" && (n = o.message), o?.error && typeof o.error == "string" && (n = o.error), o?.error?.message && typeof o.error.message == "string" && (n = o.error.message);
    } catch {
      s && (n = s);
    }
    throw new Error(n);
  }
  const l = await a.json();
  if (!l || typeof l.url != "string" || !l.url)
    throw new Error("Upload succeeded but response did not include a url");
  return l.url;
}
function b(e) {
  const t = E(e);
  if (!t) return;
  const r = w(e.getAttribute("data-component-config"));
  if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && t.fileInput.setAttribute("accept", r.allowedTypes.join(",")), r.preview !== !1) {
    const i = t.urlInput.value?.trim();
    i && u(t, i);
  }
  t.fileInput.addEventListener("change", async () => {
    v(t), f(t);
    const i = t.fileInput.files?.[0];
    if (!i) return;
    if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && !r.allowedTypes.includes(i.type)) {
      d(t, `Unsupported file type: ${i.type || "unknown"}`);
      return;
    }
    if (typeof r.maxSize == "number" && Number.isFinite(r.maxSize) && r.maxSize > 0 && i.size > r.maxSize) {
      d(t, `File too large: ${c(i.size)} (max ${c(r.maxSize)})`);
      return;
    }
    const a = (r.uploadEndpoint || "").trim();
    if (!a) {
      d(t, "Upload endpoint is not configured");
      return;
    }
    const l = t.fileInput.disabled;
    t.fileInput.disabled = !0;
    let s = null;
    try {
      r.preview !== !1 && (s = URL.createObjectURL(i), u(t, s)), p(t, "Uploading…");
      const n = await x(t, a, i);
      t.urlInput.value = n, r.preview !== !1 && u(t, n), p(t, "Uploaded"), window.setTimeout(() => f(t), 1500);
    } catch (n) {
      const o = n instanceof Error ? n.message : "Upload failed";
      if (d(t, o), r.preview !== !1) {
        const y = t.urlInput.value?.trim();
        u(t, y || null);
      }
    } finally {
      s && URL.revokeObjectURL(s), t.fileInput.disabled = l;
    }
  });
}
function I(e = document) {
  Array.from(e.querySelectorAll('[data-component="file_uploader"], [data-file-uploader]')).forEach((r) => b(r));
}
g(() => I());
export {
  I as initFileUploaders
};
//# sourceMappingURL=file_uploader.js.map
