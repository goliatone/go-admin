import { escapeAttribute as i, escapeHTML as n } from "../shared/html.js";
import { r as m } from "./modal-Cg0_ZVPf.js";
import { t as f } from "./rich-C-60Te1B.js";
var h = 0;
function l(e) {
  return typeof e == "number" && Number.isFinite(e) ? String(e) : typeof e == "string" ? e.trim() : "";
}
function c(e, o) {
  const s = l(e);
  return s ? o === "mono" || o === "copy" ? `<code class="console-kv__mono">${n(s)}</code>` : n(s) : '<span class="console-muted">—</span>';
}
var u = class extends m {
  constructor(e, o) {
    const s = h += 1, r = `console-confirm-${s}-title`, a = `console-confirm-${s}-message`;
    super({
      size: "md",
      flexColumn: !0,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0,
      lockBodyScroll: !0,
      initialFocus: "[data-modal-cancel]",
      labelledBy: r,
      describedBy: a,
      containerClass: "console-modal",
      backdropDataAttr: "data-console-modal"
    }), this.settled = !1, this.request = e, this.resolve = o, this.titleID = r, this.messageID = a;
  }
  renderContent() {
    const { title: e, message: o, note: s } = this.request, r = f(this.request.tone) || "warning", a = (Array.isArray(this.request.changes) ? this.request.changes : []).map((t) => ({
      label: l(t?.label),
      before: t?.before,
      after: t?.after,
      format: l(t?.format).toLowerCase()
    })).filter((t) => t.label).slice(0, 12), d = a.length === 0 ? "" : `<table class="console-modal__changes"><thead><tr><th scope="col">Value</th><th scope="col">Before</th><th scope="col">After</th></tr></thead><tbody>${a.map((t) => `<tr><th scope="row">${n(t.label)}</th><td>${c(t.before, t.format)}</td><td>${c(t.after, t.format)}</td></tr>`).join("")}</tbody></table>`;
    return `
      <div class="go-admin-modal__header console-modal__header">
        <h2 class="console-modal__title" id="${i(this.titleID)}">${n(e)}</h2>
      </div>
      <div class="go-admin-modal__body console-modal__body">
        <div class="console-callout" data-tone="${r}"><p id="${i(this.messageID)}">${n(o)}</p></div>
        ${d}
        ${s ? `<p class="console-modal__note">${n(s)}</p>` : ""}
      </div>
      <div class="go-admin-modal__footer console-modal__footer">
        <button type="button" class="console-btn" data-modal-cancel>Cancel</button>
        <button type="button" class="console-btn console-btn--primary${r === "error" ? " console-btn--danger" : ""}" data-modal-confirm>${n(this.request.confirmLabel || "Confirm")}</button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-modal-cancel]")?.addEventListener("click", () => this.finish(!1)), this.container?.querySelector("[data-modal-confirm]")?.addEventListener("click", () => this.finish(!0));
  }
  onBeforeHide() {
    return this.settled || (this.settled = !0, this.resolve(!1)), !0;
  }
  finish(e) {
    this.settled || (this.settled = !0, this.resolve(e), this.hide());
  }
};
function y(e) {
  return new Promise((o) => {
    new u(e, o).show().catch(() => o(!1));
  });
}
export {
  y as confirmConsoleAction
};

//# sourceMappingURL=confirm-C_6eUg1X.js.map