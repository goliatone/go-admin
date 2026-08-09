var a = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  '[contenteditable="true"]',
  "[tabindex]"
].join(","), u = 100, d = 10;
function f(e) {
  const n = e.ownerDocument.defaultView;
  let t = e;
  for (; t; ) {
    if (t.hasAttribute("hidden") || t.getAttribute("aria-hidden") === "true" || t.hasAttribute("inert")) return !0;
    const o = n?.getComputedStyle(t);
    if (o?.display === "none" || o?.visibility === "hidden") return !0;
    t = t.parentElement;
  }
  return !1;
}
function i(e) {
  return !(!e.isConnected || f(e) || e.matches(":disabled"));
}
function c(e) {
  return Array.from(e.querySelectorAll(a)).filter((n) => n.tabIndex >= 0 && i(n));
}
function h(e, n) {
  if (!n) return null;
  if (typeof n != "string") return n.isConnected && e.contains(n) ? n : null;
  try {
    return e.querySelector(n);
  } catch {
    return null;
  }
}
function s(e, n = !1) {
  return !i(e) || (e.focus({ preventScroll: !0 }), e.ownerDocument.activeElement !== e) ? !1 : (n && e.tagName === "INPUT" && typeof e.select == "function" && e.select(), !0);
}
var b = class {
  constructor(e) {
    this.ownerDocument = e, this.layers = [], this.nextLayerIndex = 0, this.scrollLockCount = 0, this.bodyHadScrollLock = !1, this.handleKeyDown = (n) => {
      const t = this.topmost();
      if (t) {
        if (n.key === "Escape") {
          if (t.closing || !t.dismissOnEscape) return;
          n.preventDefault(), n.stopPropagation(), t.onEscape?.();
          return;
        }
        n.key === "Tab" && this.trapFocus(t, n);
      }
    };
  }
  register(e) {
    const n = e.zIndexTarget ?? e.container, t = {
      container: e.container,
      zIndexTarget: n,
      initialFocus: e.initialFocus ?? null,
      returnFocus: e.returnFocus ?? null,
      dismissOnEscape: e.dismissOnEscape ?? !0,
      onEscape: e.onEscape,
      lockBodyScroll: e.lockBodyScroll ?? !0,
      zIndex: u + ++this.nextLayerIndex * d,
      closing: !1,
      released: !1,
      addedFallbackTabIndex: !1,
      previousZIndex: n.style.zIndex,
      previousScrollLockMarker: n.getAttribute("data-go-admin-modal-scroll-lock")
    };
    return this.layers.length === 0 && this.ownerDocument.addEventListener("keydown", this.handleKeyDown, !0), this.layers.push(t), n.style.zIndex = String(t.zIndex), t.lockBodyScroll && this.lockBody(t), {
      zIndex: t.zIndex,
      isTopmost: () => this.topmost() === t,
      focusInitial: (o) => {
        this.topmost() !== t || t.released || this.focusInitial(t, o);
      },
      setClosing: (o) => {
        t.released || (t.closing = o);
      },
      release: (o = {}) => {
        this.release(t, o.restoreFocus ?? !0);
      }
    };
  }
  topmost() {
    return this.layers[this.layers.length - 1] ?? null;
  }
  focusInitial(e, n) {
    const t = n === void 0 ? e.initialFocus : n, o = h(e.container, t);
    if (o && s(o, !0)) return;
    const r = c(e.container)[0];
    r && s(r, !0) || (e.container.hasAttribute("tabindex") || (e.container.setAttribute("tabindex", "-1"), e.addedFallbackTabIndex = !0), s(e.container));
  }
  trapFocus(e, n) {
    const t = c(e.container);
    if (t.length === 0) {
      n.preventDefault(), this.focusInitial(e, null);
      return;
    }
    const o = this.ownerDocument.activeElement, r = t.indexOf(o);
    if (r === -1) {
      n.preventDefault(), s(n.shiftKey ? t[t.length - 1] : t[0]);
      return;
    }
    n.shiftKey && r === 0 ? (n.preventDefault(), s(t[t.length - 1])) : !n.shiftKey && r === t.length - 1 && (n.preventDefault(), s(t[0]));
  }
  lockBody(e) {
    this.scrollLockCount === 0 && (this.bodyHadScrollLock = this.ownerDocument.body.classList.contains("overflow-hidden"), this.ownerDocument.body.classList.add("overflow-hidden")), this.scrollLockCount += 1, e.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", "true");
  }
  unlockBody(e) {
    e.previousScrollLockMarker === null ? e.zIndexTarget.removeAttribute("data-go-admin-modal-scroll-lock") : e.zIndexTarget.setAttribute("data-go-admin-modal-scroll-lock", e.previousScrollLockMarker), this.scrollLockCount !== 0 && (this.scrollLockCount -= 1, this.scrollLockCount === 0 && !this.bodyHadScrollLock && this.ownerDocument.body.classList.remove("overflow-hidden"));
  }
  release(e, n) {
    if (e.released) return;
    const t = this.topmost() === e;
    e.released = !0;
    const o = this.layers.indexOf(e);
    if (o !== -1 && this.layers.splice(o, 1), e.lockBodyScroll && this.unlockBody(e), e.zIndexTarget.style.zIndex = e.previousZIndex, e.addedFallbackTabIndex && e.container.removeAttribute("tabindex"), this.layers.length === 0 && (this.ownerDocument.removeEventListener("keydown", this.handleKeyDown, !0), this.nextLayerIndex = 0), !n || !t) return;
    const r = this.topmost();
    e.returnFocus && i(e.returnFocus) && (!r || r.container.contains(e.returnFocus)) && s(e.returnFocus) || r && this.focusInitial(r);
  }
}, l = /* @__PURE__ */ new WeakMap();
function m(e) {
  const n = e.container.ownerDocument;
  let t = l.get(n);
  return t || (t = new b(n), l.set(n, t)), t.register(e);
}
export {
  m as t
};

//# sourceMappingURL=modal-coordinator-Ctk09F2l.js.map