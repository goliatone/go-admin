import { onReady as w } from "../shared/dom-ready.js";
import { formatByteSize as h } from "../shared/size-formatters.js";
import { parseJSONValue as v } from "../shared/json-parse.js";
import { httpRequest as g, readHTTPError as E } from "../shared/transport/http-client.js";
function b(e) {
  const t = v(e, null);
  return t && typeof t == "object" ? t : {};
}
function u(e) {
  return h(e, {
    emptyFallback: "0 B",
    zeroFallback: "0 B",
    invalidFallback: "0 B",
    precisionByUnit: [0, 1, 1, 1]
  });
}
function s(e, t) {
  e.errorEl.textContent = t, e.errorEl.classList.remove("hidden"), e.statusEl.textContent = "", e.statusEl.classList.add("hidden");
}
function x(e) {
  e.errorEl.textContent = "", e.errorEl.classList.add("hidden");
}
function c(e, t) {
  e.statusEl.textContent = t, e.statusEl.classList.remove("hidden");
}
function p(e) {
  e.statusEl.textContent = "", e.statusEl.classList.add("hidden");
}
function d(e, t) {
  !e.previewImg || !e.placeholder || (t ? (e.previewImg.src = t, e.previewImg.classList.remove("hidden"), e.placeholder.classList.add("hidden")) : (e.previewImg.removeAttribute("src"), e.previewImg.classList.add("hidden"), e.placeholder.classList.remove("hidden")));
}
function f(e, t, r) {
  const i = e.querySelector(t);
  if (i) return i;
  const a = document.createElement("p");
  return a.className = r, e.appendChild(a), a;
}
function I(e) {
  const t = e.querySelector("input[data-file-uploader-url]"), r = e.querySelector("input[data-file-uploader-file]");
  if (!t || !r) return null;
  const i = f(e, "[data-file-uploader-error]", "text-sm text-red-600 hidden");
  i.setAttribute("data-file-uploader-error", "true");
  const a = f(e, "[data-file-uploader-status]", "text-xs text-gray-500 hidden");
  a.setAttribute("data-file-uploader-status", "true");
  const n = e.querySelector("[data-file-uploader-preview]"), l = e.querySelector("[data-file-uploader-placeholder]");
  return {
    root: e,
    urlInput: t,
    fileInput: r,
    previewImg: n ?? void 0,
    placeholder: l ?? void 0,
    errorEl: i,
    statusEl: a
  };
}
async function S(e, t, r) {
  const i = new FormData();
  i.append("file", r, r.name);
  const a = await g(t, {
    method: "POST",
    body: i,
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!a.ok) {
    const l = await E(a, `Upload failed (${a.status})`, {
      appendStatusToFallback: !1
    });
    throw new Error(l);
  }
  const n = await a.json();
  if (!n || typeof n.url != "string" || !n.url)
    throw new Error("Upload succeeded but response did not include a url");
  return n.url;
}
function L(e) {
  const t = I(e);
  if (!t) return;
  const r = b(e.getAttribute("data-component-config"));
  if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && t.fileInput.setAttribute("accept", r.allowedTypes.join(",")), r.preview !== !1) {
    const i = t.urlInput.value?.trim();
    i && d(t, i);
  }
  t.fileInput.addEventListener("change", async () => {
    x(t), p(t);
    const i = t.fileInput.files?.[0];
    if (!i) return;
    if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && !r.allowedTypes.includes(i.type)) {
      s(t, `Unsupported file type: ${i.type || "unknown"}`);
      return;
    }
    if (typeof r.maxSize == "number" && Number.isFinite(r.maxSize) && r.maxSize > 0 && i.size > r.maxSize) {
      s(t, `File too large: ${u(i.size)} (max ${u(r.maxSize)})`);
      return;
    }
    const a = (r.uploadEndpoint || "").trim();
    if (!a) {
      s(t, "Upload endpoint is not configured");
      return;
    }
    const n = t.fileInput.disabled;
    t.fileInput.disabled = !0;
    let l = null;
    try {
      r.preview !== !1 && (l = URL.createObjectURL(i), d(t, l)), c(t, "Uploading…");
      const o = await S(t, a, i);
      t.urlInput.value = o, r.preview !== !1 && d(t, o), c(t, "Uploaded"), window.setTimeout(() => p(t), 1500);
    } catch (o) {
      const m = o instanceof Error ? o.message : "Upload failed";
      if (s(t, m), r.preview !== !1) {
        const y = t.urlInput.value?.trim();
        d(t, y || null);
      }
    } finally {
      l && URL.revokeObjectURL(l), t.fileInput.disabled = n;
    }
  });
}
function U(e = document) {
  Array.from(e.querySelectorAll('[data-component="file_uploader"], [data-file-uploader]')).forEach((r) => L(r));
}
w(() => U());
export {
  U as initFileUploaders
};
//# sourceMappingURL=file_uploader.js.map
