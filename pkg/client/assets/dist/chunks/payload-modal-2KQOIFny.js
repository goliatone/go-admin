import { M as u, e as o } from "./modal-DXPBR0f5.js";
class c extends u {
  constructor(e, t, r) {
    super({ size: "md", initialFocus: "[data-payload-field]", lockBodyScroll: !1 }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = r;
  }
  /**
   * Show modal and return promise that resolves with values or null if cancelled
   */
  static prompt(e) {
    return new Promise((t) => {
      new c(
        e,
        (d) => t(d),
        () => t(null)
      ).show();
    });
  }
  renderContent() {
    const e = this.modalConfig.fields.map((t) => this.renderField(t)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${o(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${o(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${o(this.modalConfig.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), r = () => {
      this.clearErrors();
      const n = {};
      let a = null;
      for (const s of this.modalConfig.fields) {
        const l = this.container?.querySelector(
          `[data-payload-field="${s.name}"]`
        );
        if (!l)
          continue;
        const i = l.value.trim();
        n[s.name] = i, i || (a || (a = l), this.showFieldError(s.name, "This field is required."));
      }
      if (a) {
        a.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(n), this.hide();
    };
    e?.addEventListener("submit", (n) => {
      n.preventDefault(), r();
    }), t?.addEventListener("click", () => {
      this.hide();
    }), this.container?.querySelectorAll("[data-payload-radio-group]")?.forEach((n) => {
      const a = n.dataset.payloadRadioGroup;
      if (!a) return;
      const s = n.querySelectorAll(`[data-payload-radio="${a}"]`), l = n.querySelector(`[data-payload-field="${a}"]`);
      l && s.forEach((i) => {
        i.addEventListener("change", () => {
          i.checked && (l.value = i.value);
        });
      });
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${o(e.description)}</p>` : "", r = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${o(e.label)}
        </label>
        ${r}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    let t = e.value;
    const r = e.options || [];
    if (!t) {
      const a = r.find((s) => s.recommended);
      a && (t = a.value);
    }
    if (r.some((a) => a.description))
      return this.renderRadioGroup(e, r, t);
    const n = r.map((a) => {
      const s = a.value === t ? " selected" : "";
      return `<option value="${o(a.value)}"${s}>${o(a.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${n}
      </select>
    `;
  }
  renderRadioGroup(e, t, r) {
    const d = t.map((a, s) => {
      const l = a.value === r ? " checked" : "", i = a.description ? `<span class="text-xs text-gray-500 block ml-6 mt-0.5">${o(a.description)}</span>` : "";
      return `
          <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${a.recommended ? "bg-blue-50 border border-blue-200" : ""}">
            <input type="radio"
                   name="payload-radio-${e.name}"
                   value="${o(a.value)}"
                   data-payload-radio="${e.name}"
                   class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                   ${l} />
            <span class="flex-1">
              <span class="text-sm font-medium text-gray-900">${o(a.label)}</span>
              ${i}
            </span>
          </label>
        `;
    }).join(""), n = r || "";
    return `
      <div class="space-y-1" data-payload-radio-group="${e.name}">
        <input type="hidden"
               data-payload-field="${e.name}"
               value="${o(n)}" />
        ${d}
      </div>
    `;
  }
  renderInput(e) {
    const t = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300";
    if (e.type === "array" || e.type === "object")
      return `
        <textarea id="payload-field-${e.name}"
                  data-payload-field="${e.name}"
                  rows="4"
                  class="${t}"
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${o(e.value)}</textarea>
      `;
    const r = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${r}"
             data-payload-field="${e.name}"
             value="${o(e.value)}"
             class="${t}" />
    `;
  }
  clearErrors() {
    this.container?.querySelectorAll("[data-payload-error]")?.forEach((t) => {
      t.textContent = "", t.classList.add("hidden");
    });
  }
  showFieldError(e, t) {
    const r = this.container?.querySelector(`[data-payload-error="${e}"]`);
    r && (r.textContent = t, r.classList.remove("hidden"));
  }
}
export {
  c as PayloadInputModal
};
//# sourceMappingURL=payload-modal-2KQOIFny.js.map
