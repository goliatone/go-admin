import { createLogger as f } from "../shared/logger.js";
import { onReady as B } from "../shared/dom-ready.js";
var v = f("ContentTypeBuilderBootstrap");
function y(t) {
  let r = null;
  return {
    load() {
      return r || (r = t().catch((n) => {
        throw r = null, n;
      })), r;
    },
    reset() {
      r = null;
    }
  };
}
var L = y(() => import("./content-editor-runtime.js")), h = y(() => import("./block-library-runtime.js"));
function E(t) {
  const r = {
    root: t,
    previousBusy: t.getAttribute("aria-busy"),
    previousLoadState: t.getAttribute("data-content-builder-load-state"),
    previousBootstrapOwner: t.getAttribute("data-content-builder-bootstrap"),
    status: null
  };
  return t.dataset.contentBuilderBootstrap = "true", r;
}
function d(t, r, n) {
  n === null ? t.removeAttribute(r) : t.setAttribute(r, n);
}
function u(t) {
  t.status?.remove(), t.status = null;
}
function A(t) {
  u(t), t.root.setAttribute("aria-busy", "true"), t.root.dataset.contentBuilderLoadState = "loading";
}
function k(t) {
  u(t), d(t.root, "aria-busy", t.previousBusy), d(t.root, "data-content-builder-load-state", t.previousLoadState);
}
function S(t, r, n) {
  d(t.root, "aria-busy", t.previousBusy), t.root.dataset.contentBuilderLoadState = "error", u(t);
  const i = document.createElement("div");
  i.dataset.contentBuilderLoadError = "", i.setAttribute("role", "alert"), i.className = "mb-3 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";
  const l = document.createElement("span");
  l.textContent = r;
  const a = document.createElement("button");
  a.type = "button", a.dataset.contentBuilderRetry = "", a.className = "shrink-0 rounded border border-red-300 px-3 py-1 font-medium hover:bg-red-100", a.textContent = "Retry", a.addEventListener("click", n, { once: !0 }), i.append(l, a), t.root.insertAdjacentElement("beforebegin", i), t.status = i;
}
function p(t, r) {
  return Array.from(t.querySelectorAll(r)).filter((n) => n.dataset.contentBuilderBootstrap !== "true").map(E);
}
function x(t = document, r = {}) {
  let n = 0, i = !1;
  const l = r.loadErrorMessage ?? "Unable to load the builder. Try again.", a = [{
    kind: "content-editor",
    roots: p(t, "[data-content-type-editor-root]"),
    loader: r.contentEditorLoader ?? L,
    initialize: (e, o) => e.initContentTypeEditorRuntime(o),
    pending: null,
    initialized: !1
  }, {
    kind: "block-library",
    roots: p(t, "[data-block-library-ide]"),
    loader: r.blockLibraryLoader ?? h,
    initialize: (e, o) => e.initBlockLibraryRuntime(o),
    pending: null,
    initialized: !1
  }], c = (e) => {
    if (i || e.initialized || e.roots.length === 0) return Promise.resolve();
    if (e.pending) return e.pending;
    const o = n;
    return e.roots.forEach(A), e.pending = e.loader.load().then((s) => {
      i || o !== n || (e.initialize(s, t), e.initialized = !0, e.roots.forEach(k));
    }).catch((s) => {
      if (!i && o === n) {
        const m = () => {
          c(e).catch(() => {
          });
        };
        e.roots.forEach((g) => S(g, l, m));
      }
      throw s;
    }).finally(() => {
      e.pending = null;
    }), e.pending;
  }, b = {
    async start() {
      await Promise.all(a.map(c));
    },
    destroy() {
      if (!i) {
        i = !0, n += 1;
        for (const e of a) for (const o of e.roots)
          u(o), d(o.root, "aria-busy", o.previousBusy), d(o.root, "data-content-builder-load-state", o.previousLoadState), d(o.root, "data-content-builder-bootstrap", o.previousBootstrapOwner);
      }
    }
  };
  return b.start().catch((e) => {
    v.error("Content type builder runtime failed to load:", e);
  }), b;
}
B(() => {
  x();
});
export {
  x as bootstrapContentTypeBuilder,
  y as createContentTypeBuilderRuntimeLoader
};

//# sourceMappingURL=bootstrap.js.map