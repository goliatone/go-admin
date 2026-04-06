import { httpRequest as y, readHTTPError as w } from "../shared/transport/http-client.js";
import { onReady as h } from "../shared/dom-ready.js";
import { formatByteSize as v } from "../shared/size-formatters.js";
import { parseJSONValue as g } from "../shared/json-parse.js";
function E(t) {
  const e = g(t, null);
  return e && typeof e == "object" ? e : {};
}
function u(t) {
  return v(t, {
    emptyFallback: "0 B",
    zeroFallback: "0 B",
    invalidFallback: "0 B",
    precisionByUnit: [
      0,
      1,
      1,
      1
    ]
  });
}
function s(t, e) {
  t.errorEl.textContent = e, t.errorEl.classList.remove("hidden"), t.statusEl.textContent = "", t.statusEl.classList.add("hidden");
}
function b(t) {
  t.errorEl.textContent = "", t.errorEl.classList.add("hidden");
}
function p(t, e) {
  t.statusEl.textContent = e, t.statusEl.classList.remove("hidden");
}
function c(t) {
  t.statusEl.textContent = "", t.statusEl.classList.add("hidden");
}
function d(t, e) {
  !t.previewImg || !t.placeholder || (e ? (t.previewImg.src = e, t.previewImg.classList.remove("hidden"), t.placeholder.classList.add("hidden")) : (t.previewImg.removeAttribute("src"), t.previewImg.classList.add("hidden"), t.placeholder.classList.remove("hidden")));
}
function f(t, e, r) {
  const i = t.querySelector(e);
  if (i) return i;
  const a = document.createElement("p");
  return a.className = r, t.appendChild(a), a;
}
function x(t) {
  const e = t.querySelector("input[data-file-uploader-url]"), r = t.querySelector("input[data-file-uploader-file]");
  if (!e || !r) return null;
  const i = f(t, "[data-file-uploader-error]", "text-sm text-red-600 hidden");
  i.setAttribute("data-file-uploader-error", "true");
  const a = f(t, "[data-file-uploader-status]", "text-xs text-gray-500 hidden");
  a.setAttribute("data-file-uploader-status", "true");
  const n = t.querySelector("[data-file-uploader-preview]"), l = t.querySelector("[data-file-uploader-placeholder]");
  return {
    root: t,
    urlInput: e,
    fileInput: r,
    previewImg: n ?? void 0,
    placeholder: l ?? void 0,
    errorEl: i,
    statusEl: a
  };
}
async function I(t, e, r) {
  const i = new FormData();
  i.append("file", r, r.name);
  const a = await y(e, {
    method: "POST",
    body: i,
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!a.ok) {
    const l = await w(a, `Upload failed (${a.status})`, { appendStatusToFallback: !1 });
    throw new Error(l);
  }
  const n = await a.json();
  if (!n || typeof n.url != "string" || !n.url) throw new Error("Upload succeeded but response did not include a url");
  return n.url;
}
function S(t) {
  const e = x(t);
  if (!e) return;
  const r = E(t.getAttribute("data-component-config"));
  if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && e.fileInput.setAttribute("accept", r.allowedTypes.join(",")), r.preview !== !1) {
    const i = e.urlInput.value?.trim();
    i && d(e, i);
  }
  e.fileInput.addEventListener("change", async () => {
    b(e), c(e);
    const i = e.fileInput.files?.[0];
    if (!i) return;
    if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && !r.allowedTypes.includes(i.type)) {
      s(e, `Unsupported file type: ${i.type || "unknown"}`);
      return;
    }
    if (typeof r.maxSize == "number" && Number.isFinite(r.maxSize) && r.maxSize > 0 && i.size > r.maxSize) {
      s(e, `File too large: ${u(i.size)} (max ${u(r.maxSize)})`);
      return;
    }
    const a = (r.uploadEndpoint || "").trim();
    if (!a) {
      s(e, "Upload endpoint is not configured");
      return;
    }
    const n = e.fileInput.disabled;
    e.fileInput.disabled = !0;
    let l = null;
    try {
      r.preview !== !1 && (l = URL.createObjectURL(i), d(e, l)), p(e, "Uploading…");
      const o = await I(e, a, i);
      e.urlInput.value = o, r.preview !== !1 && d(e, o), p(e, "Uploaded"), window.setTimeout(() => c(e), 1500);
    } catch (o) {
      if (s(e, o instanceof Error ? o.message : "Upload failed"), r.preview !== !1) {
        const m = e.urlInput.value?.trim();
        d(e, m || null);
      }
    } finally {
      l && URL.revokeObjectURL(l), e.fileInput.disabled = n;
    }
  });
}
function L(t = document) {
  Array.from(t.querySelectorAll('[data-component="file_uploader"], [data-file-uploader]')).forEach((e) => S(e));
}
h(() => L());
export {
  L as initFileUploaders
};

//# sourceMappingURL=file_uploader.js.map