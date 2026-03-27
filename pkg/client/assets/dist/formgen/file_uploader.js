import { onReady as y } from "../shared/dom-ready.js";
function h(e) {
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
  if (!Number.isFinite(e) || e <= 0) return "0 B";
  const t = ["B", "KB", "MB", "GB"];
  let r = e, i = 0;
  for (; r >= 1024 && i < t.length - 1; )
    r /= 1024, i += 1;
  const n = i === 0 ? 0 : 1;
  return `${r.toFixed(n)} ${t[i]}`;
}
function d(e, t) {
  e.errorEl.textContent = t, e.errorEl.classList.remove("hidden"), e.statusEl.textContent = "", e.statusEl.classList.add("hidden");
}
function w(e) {
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
  const n = document.createElement("p");
  return n.className = r, e.appendChild(n), n;
}
function v(e) {
  const t = e.querySelector("input[data-file-uploader-url]"), r = e.querySelector("input[data-file-uploader-file]");
  if (!t || !r) return null;
  const i = m(e, "[data-file-uploader-error]", "text-sm text-red-600 hidden");
  i.setAttribute("data-file-uploader-error", "true");
  const n = m(e, "[data-file-uploader-status]", "text-xs text-gray-500 hidden");
  n.setAttribute("data-file-uploader-status", "true");
  const l = e.querySelector("[data-file-uploader-preview]"), o = e.querySelector("[data-file-uploader-placeholder]");
  return {
    root: e,
    urlInput: t,
    fileInput: r,
    previewImg: l ?? void 0,
    placeholder: o ?? void 0,
    errorEl: i,
    statusEl: n
  };
}
async function x(e, t, r) {
  const i = new FormData();
  i.append("file", r, r.name);
  const n = await fetch(t, {
    method: "POST",
    body: i,
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!n.ok) {
    const o = await n.text();
    let a = `Upload failed (${n.status})`;
    try {
      const s = JSON.parse(o);
      s?.message && typeof s.message == "string" && (a = s.message), s?.error && typeof s.error == "string" && (a = s.error), s?.error?.message && typeof s.error.message == "string" && (a = s.error.message);
    } catch {
      o && (a = o);
    }
    throw new Error(a);
  }
  const l = await n.json();
  if (!l || typeof l.url != "string" || !l.url)
    throw new Error("Upload succeeded but response did not include a url");
  return l.url;
}
function E(e) {
  const t = v(e);
  if (!t) return;
  const r = h(e.getAttribute("data-component-config"));
  if (Array.isArray(r.allowedTypes) && r.allowedTypes.length > 0 && t.fileInput.setAttribute("accept", r.allowedTypes.join(",")), r.preview !== !1) {
    const i = t.urlInput.value?.trim();
    i && u(t, i);
  }
  t.fileInput.addEventListener("change", async () => {
    w(t), f(t);
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
    const n = (r.uploadEndpoint || "").trim();
    if (!n) {
      d(t, "Upload endpoint is not configured");
      return;
    }
    const l = t.fileInput.disabled;
    t.fileInput.disabled = !0;
    let o = null;
    try {
      r.preview !== !1 && (o = URL.createObjectURL(i), u(t, o)), p(t, "Uploading…");
      const a = await x(t, n, i);
      t.urlInput.value = a, r.preview !== !1 && u(t, a), p(t, "Uploaded"), window.setTimeout(() => f(t), 1500);
    } catch (a) {
      const s = a instanceof Error ? a.message : "Upload failed";
      if (d(t, s), r.preview !== !1) {
        const g = t.urlInput.value?.trim();
        u(t, g || null);
      }
    } finally {
      o && URL.revokeObjectURL(o), t.fileInput.disabled = l;
    }
  });
}
function I(e = document) {
  Array.from(e.querySelectorAll('[data-component="file_uploader"], [data-file-uploader]')).forEach((r) => E(r));
}
y(() => I());
export {
  I as initFileUploaders
};
//# sourceMappingURL=file_uploader.js.map
