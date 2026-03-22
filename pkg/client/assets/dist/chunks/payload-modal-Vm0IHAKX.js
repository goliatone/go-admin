import { i as n, n as u } from "./modal-Bj9YWM2D.js";
var m = class i extends u {
  constructor(e, t, a) {
    super({
      size: "md",
      initialFocus: "[data-payload-field]",
      lockBodyScroll: !1
    }), this.resolved = !1, this.modalConfig = e, this.onConfirm = t, this.onCancel = a;
  }
  static prompt(e) {
    return new Promise((t) => {
      new i(e, (a) => t(a), () => t(null)).show();
    });
  }
  renderContent() {
    const e = this.modalConfig.fields.map((t) => this.renderField(t)).join("");
    return `
      <form class="flex flex-col" data-payload-form>
        <div class="px-6 py-4 border-b border-gray-200">
          <h3 class="text-lg font-semibold text-gray-900">${n(this.modalConfig.title)}</h3>
          <p class="text-sm text-gray-500 mt-1">Complete required fields to continue.</p>
        </div>
        <div class="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          ${e}
        </div>
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button type="button"
                  data-payload-cancel
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            ${n(this.modalConfig.cancelLabel ?? "Cancel")}
          </button>
          <button type="submit"
                  data-payload-confirm
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer">
            ${n(this.modalConfig.confirmLabel ?? "Continue")}
          </button>
        </div>
      </form>
    `;
  }
  bindContentEvents() {
    const e = this.container?.querySelector("[data-payload-form]"), t = this.container?.querySelector("[data-payload-cancel]"), a = () => {
      this.clearErrors();
      const s = {};
      let r = null;
      for (const o of this.modalConfig.fields) {
        const d = this.container?.querySelector(`[data-payload-field="${o.name}"]`);
        if (!d) continue;
        const l = d.value.trim();
        s[o.name] = l, l || (r || (r = d), this.showFieldError(o.name, "This field is required."));
      }
      if (r) {
        r.focus();
        return;
      }
      this.resolved = !0, this.onConfirm(s), this.hide();
    };
    e?.addEventListener("submit", (s) => {
      s.preventDefault(), a();
    }), t?.addEventListener("click", () => {
      this.hide();
    }), this.container?.querySelectorAll("[data-payload-radio-group]")?.forEach((s) => {
      const r = s.dataset.payloadRadioGroup;
      if (!r) return;
      const o = s.querySelectorAll(`[data-payload-radio="${r}"]`), d = s.querySelector(`[data-payload-field="${r}"]`);
      d && o.forEach((l) => {
        l.addEventListener("change", () => {
          l.checked && (d.value = l.value);
        });
      });
    });
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.onCancel()), !0;
  }
  renderField(e) {
    const t = e.description ? `<p class="text-xs text-gray-500 mt-1">${n(e.description)}</p>` : "", a = e.options && e.options.length > 0 ? this.renderSelect(e) : this.renderInput(e);
    return `
      <div>
        <label class="block text-sm font-medium text-gray-800 mb-1.5" for="payload-field-${e.name}">
          ${n(e.label)}
        </label>
        ${a}
        ${t}
        <p class="hidden text-xs text-red-600 mt-1" data-payload-error="${e.name}"></p>
      </div>
    `;
  }
  renderSelect(e) {
    let t = e.value;
    const a = e.options || [];
    if (!t) {
      const r = a.find((o) => o.recommended);
      r && (t = r.value);
    }
    if (a.some((r) => r.description)) return this.renderRadioGroup(e, a, t);
    const s = a.map((r) => {
      const o = r.value === t ? " selected" : "";
      return `<option value="${n(r.value)}"${o}>${n(r.label)}</option>`;
    }).join("");
    return `
      <select id="payload-field-${e.name}"
              data-payload-field="${e.name}"
              class="w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300">
        <option value="">Select an option</option>
        ${s}
      </select>
    `;
  }
  renderRadioGroup(e, t, a) {
    const s = t.map((o, d) => {
      const l = o.value === a ? " checked" : "", c = o.description ? `<span class="text-xs text-gray-500 block ml-6 mt-0.5">${n(o.description)}</span>` : "";
      return `
          <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer ${o.recommended ? "bg-blue-50 border border-blue-200" : ""}">
            <input type="radio"
                   name="payload-radio-${e.name}"
                   value="${n(o.value)}"
                   data-payload-radio="${e.name}"
                   class="mt-0.5 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                   ${l} />
            <span class="flex-1">
              <span class="text-sm font-medium text-gray-900">${n(o.label)}</span>
              ${c}
            </span>
          </label>
        `;
    }).join(""), r = a || "";
    return `
      <div class="space-y-1" data-payload-radio-group="${e.name}">
        <input type="hidden"
               data-payload-field="${e.name}"
               value="${n(r)}" />
        ${s}
      </div>
    `;
  }
  renderInput(e) {
    const t = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent px-3 py-2 text-sm border-gray-300";
    if (e.type === "array" || e.type === "object") return `
        <textarea id="payload-field-${e.name}"
                  data-payload-field="${e.name}"
                  rows="4"
                  class="${t}"
                  placeholder="${e.type === "array" ? "[...]" : "{...}"}">${n(e.value)}</textarea>
      `;
    const a = e.type === "integer" || e.type === "number" ? "number" : "text";
    return `
      <input id="payload-field-${e.name}"
             type="${a}"
             data-payload-field="${e.name}"
             value="${n(e.value)}"
             class="${t}" />
    `;
  }
  clearErrors() {
    this.container?.querySelectorAll("[data-payload-error]")?.forEach((e) => {
      e.textContent = "", e.classList.add("hidden");
    });
  }
  showFieldError(e, t) {
    const a = this.container?.querySelector(`[data-payload-error="${e}"]`);
    a && (a.textContent = t, a.classList.remove("hidden"));
  }
};
export {
  m as PayloadInputModal
};

//# sourceMappingURL=payload-modal-Vm0IHAKX.js.map