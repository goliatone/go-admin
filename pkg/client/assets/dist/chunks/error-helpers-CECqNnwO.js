class f {
  constructor(t = {}) {
    this.toasts = /* @__PURE__ */ new Map(), this.position = t.position || "top-right", this.container = this.getOrCreateContainer(), this.applyContainerClasses(this.container);
  }
  getOrCreateContainer() {
    const t = document.getElementById("toast-container");
    if (t) return t;
    const e = document.createElement("div");
    return e.id = "toast-container", document.body.appendChild(e), e;
  }
  applyContainerClasses(t) {
    const e = [
      "toast-top-right",
      "toast-top-center",
      "toast-bottom-right",
      "toast-bottom-center"
    ];
    t.classList.add("toast-container"), e.forEach((s) => t.classList.remove(s)), t.classList.add(`toast-${this.position}`);
  }
  show(t) {
    const e = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, s = this.createToastElement(e, t);
    this.container.appendChild(s), this.toasts.set(e, s), requestAnimationFrame(() => {
      s.classList.add("toast-enter-active");
    });
    const a = t.duration !== void 0 ? t.duration : 5e3;
    a > 0 && setTimeout(() => this.dismiss(e), a);
  }
  success(t, e) {
    this.show({ message: t, type: "success", duration: e, dismissible: !0 });
  }
  error(t, e) {
    this.show({ message: t, type: "error", duration: e || 0, dismissible: !0 });
  }
  warning(t, e) {
    this.show({ message: t, type: "warning", duration: e, dismissible: !0 });
  }
  info(t, e) {
    this.show({ message: t, type: "info", duration: e, dismissible: !0 });
  }
  async confirm(t, e = {}) {
    return new Promise((s) => {
      const a = this.createConfirmModal(t, e, s);
      document.body.appendChild(a), requestAnimationFrame(() => {
        a.classList.add("confirm-modal-active");
      });
    });
  }
  createToastElement(t, e) {
    const s = document.createElement("div");
    s.className = `toast toast-${e.type}`, s.setAttribute("data-toast-id", t);
    const a = this.getIconForType(e.type);
    if (s.innerHTML = `
      <div class="toast-header">
        <div class="toast-header-left">
          <div class="toast-icon toast-icon-${e.type}">
            ${a}
          </div>
          <svg class="toast-pin-icon w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
          </svg>
          <div class="toast-title">${this.escapeHtml(e.title || this.getDefaultTitle(e.type))}</div>
        </div>
        ${e.dismissible !== !1 ? `
          <button class="toast-dismiss" aria-label="Dismiss">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ""}
      </div>
      <div class="toast-content">
        <div class="toast-message">${this.escapeHtml(e.message)}</div>
      </div>
    `, e.dismissible !== !1) {
      const i = s.querySelector(".toast-dismiss");
      i && i.addEventListener("click", () => this.dismiss(t));
    }
    return s;
  }
  createConfirmModal(t, e, s) {
    const a = document.createElement("div");
    a.className = "confirm-modal-overlay";
    const i = document.createElement("div");
    i.className = "confirm-modal", i.innerHTML = `
      <div class="confirm-modal-header">
        <h3 class="confirm-modal-title">${this.escapeHtml(e.title || "Confirm")}</h3>
      </div>
      <div class="confirm-modal-body">
        <p class="confirm-modal-message">${this.escapeHtml(t)}</p>
      </div>
      <div class="confirm-modal-footer">
        <button class="confirm-modal-btn confirm-modal-btn-cancel">
          ${this.escapeHtml(e.cancelText || "Cancel")}
        </button>
        <button class="confirm-modal-btn confirm-modal-btn-confirm">
          ${this.escapeHtml(e.confirmText || "Confirm")}
        </button>
      </div>
    `, a.appendChild(i);
    let c = !1;
    const u = () => {
      a.classList.add("confirm-modal-leaving"), setTimeout(() => {
        a.remove();
      }, 200);
    }, l = (r) => {
      r.key === "Escape" && o(!1);
    }, o = (r) => {
      c || (c = !0, document.removeEventListener("keydown", l), u(), s(r));
    }, d = i.querySelector(".confirm-modal-btn-cancel"), m = i.querySelector(".confirm-modal-btn-confirm");
    return d && d.addEventListener("click", () => {
      o(!1);
    }), m && m.addEventListener("click", () => {
      o(!0);
    }), a.addEventListener("click", (r) => {
      r.target === a && o(!1);
    }), document.addEventListener("keydown", l), a;
  }
  dismiss(t) {
    const e = this.toasts.get(t);
    e && (e.classList.remove("toast-enter-active"), e.classList.add("toast-leave-active"), setTimeout(() => {
      e.remove(), this.toasts.delete(t);
    }, 300));
  }
  getDefaultTitle(t) {
    return {
      success: "Success notification",
      error: "Error notification",
      warning: "Warning notification",
      info: "Informational notification"
    }[t] || "Notification";
  }
  getIconForType(t) {
    const e = {
      success: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>`,
      error: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>`,
      warning: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>`,
      info: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
      </svg>`
    };
    return e[t] || e.info;
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
class v {
  show(t) {
    const e = t.title ? `${t.title}: ` : "";
    alert(e + t.message);
  }
  success(t) {
    alert(t);
  }
  error(t) {
    alert("Error: " + t);
  }
  warning(t) {
    alert("Warning: " + t);
  }
  info(t) {
    alert(t);
  }
  async confirm(t, e) {
    const s = e?.title ? `${e.title}

` : "";
    return Promise.resolve(confirm(s + t));
  }
}
async function h(n) {
  const t = n.headers.get("content-type") || "", e = t.includes("application/json") || t.includes("application/problem+json"), s = await n.clone().text().catch(() => "");
  if (s) {
    if (e || s.trim().startsWith("{"))
      try {
        const i = JSON.parse(s);
        if (typeof i.error == "string" && i.error.trim()) return i.error.trim();
        if (typeof i.detail == "string" && i.detail.trim()) return i.detail.trim();
        if (typeof i.title == "string" && i.title.trim()) return i.title.trim();
        if (typeof i.message == "string" && i.message.trim()) return i.message.trim();
      } catch {
      }
    if (s.includes("go-users:")) {
      const i = s.match(/go-users:\s*([^|]+)/);
      if (i) return i[1].trim();
    }
    const a = s.match(/\|\s*([^|]+)$/);
    if (a) return a[1].trim();
    if (s.trim().length > 0 && s.length < 200) return s.trim();
  }
  return `Request failed (${n.status})`;
}
function g(n) {
  return n instanceof Error ? n.message : typeof n == "string" ? n : "An unexpected error occurred";
}
export {
  v as F,
  f as T,
  h as e,
  g
};
//# sourceMappingURL=error-helpers-CECqNnwO.js.map
