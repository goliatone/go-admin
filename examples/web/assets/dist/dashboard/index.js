class c {
  constructor() {
    this.draggedElement = null, this.cleanupFunctions = [];
  }
  enable(e, t) {
    e.querySelectorAll("[data-widget]").forEach((s) => {
      s.draggable = !0;
      const r = () => {
        this.draggedElement = s, s.classList.add("dragging");
      }, n = () => {
        s.classList.remove("dragging"), this.draggedElement = null;
      };
      s.addEventListener("dragstart", r), s.addEventListener("dragend", n), this.cleanupFunctions.push(() => {
        s.removeEventListener("dragstart", r), s.removeEventListener("dragend", n);
      });
    }), e.querySelectorAll("[data-widgets-grid]").forEach((s) => {
      const r = (o) => {
        if (o.preventDefault(), !this.draggedElement) return;
        const d = this.getDragAfterElement(s, o.clientY);
        d == null ? s.appendChild(this.draggedElement) : d !== this.draggedElement && s.insertBefore(this.draggedElement, d);
      }, n = (o) => {
        o.preventDefault(), t();
      };
      s.addEventListener("dragover", r), s.addEventListener("drop", n), this.cleanupFunctions.push(() => {
        s.removeEventListener("dragover", r), s.removeEventListener("drop", n);
      });
    });
  }
  disable() {
    this.cleanupFunctions.forEach((e) => e()), this.cleanupFunctions = [], this.draggedElement = null;
  }
  getDragAfterElement(e, t) {
    return Array.from(
      e.querySelectorAll("[data-widget]:not(.dragging)")
    ).reduce(
      (i, s) => {
        const r = s.getBoundingClientRect(), n = t - r.top - r.height / 2;
        return n < 0 && n > i.offset ? { offset: n, element: s } : i;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }
}
class h {
  toggleWidth(e, t, a) {
    const i = t === a ? a / 2 : a;
    return this.applyWidth(e, i), i;
  }
  applyWidth(e, t) {
    e.dataset.span = t.toString(), e.style.setProperty("--span", t.toString());
  }
}
class u {
  toggle(e) {
    const a = !(e.dataset.hidden === "true");
    return this.applyVisibility(e, a), a;
  }
  applyVisibility(e, t) {
    t ? (e.dataset.hidden = "true", e.classList.add("is-hidden")) : (delete e.dataset.hidden, e.classList.remove("is-hidden"));
  }
}
class g {
  async save(e, t) {
    const a = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(t)
    });
    if (!a.ok)
      throw new Error(`Failed to save layout: ${a.statusText}`);
  }
  async load(e) {
    try {
      const t = await fetch(e);
      return t.ok ? await t.json() : null;
    } catch (t) {
      return console.warn("Failed to load layout preferences:", t), null;
    }
  }
}
class p {
  constructor(e) {
    this.container = null, this.saveTimer = null, this.statusElement = null, this.config = {
      apiEndpoint: e.apiEndpoint,
      preferencesEndpoint: e.preferencesEndpoint || `${e.apiEndpoint}/preferences`,
      areas: e.areas || [],
      defaultSpan: e.defaultSpan ?? 12,
      maxColumns: e.maxColumns ?? 12,
      saveDelay: e.saveDelay ?? 200,
      selectors: {
        areas: "[data-widgets-grid]",
        widgets: "[data-widget]",
        toolbar: "[data-widget-toolbar]",
        hideBtn: '[data-action="toggle-hide"]',
        resizeBtn: '[data-action="toggle-width"]',
        ...e.selectors
      },
      behaviors: e.behaviors || {},
      onSave: e.onSave || (() => {
      }),
      onError: e.onError || ((t) => console.error("WidgetGrid error:", t))
    }, this.behaviors = {
      dragDrop: e.behaviors?.dragDrop || new c(),
      resize: e.behaviors?.resize || new h(),
      visibility: e.behaviors?.visibility || new u(),
      persistence: e.behaviors?.persistence || new g()
    };
  }
  async init(e) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container)
      throw new Error("Widget grid container not found");
    this.attachEventListeners(), this.initializeDragDrop(), e && this.validateHydration(e);
  }
  validateHydration(e) {
    if (e.areas) {
      const t = this.container?.querySelectorAll("[data-area-code]");
      t && t.length !== e.areas.length && console.warn("Hydration mismatch: area count does not match", {
        server: e.areas.length,
        dom: t.length
      });
    }
  }
  initializeDragDrop() {
    this.container && this.behaviors.dragDrop.enable(this.container, () => {
      this.saveLayout();
    });
  }
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (e) => {
      const a = e.target.closest(this.config.selectors.hideBtn);
      if (a) {
        const i = a.closest("[data-widget]");
        i && (this.behaviors.visibility.toggle(i), this.saveLayout());
      }
    }), this.container.addEventListener("click", (e) => {
      const a = e.target.closest(this.config.selectors.resizeBtn);
      if (a) {
        const i = a.closest("[data-widget]");
        if (i) {
          const s = parseInt(i.dataset.span || `${this.config.defaultSpan}`, 10), n = this.behaviors.resize.toggleWidth(i, s, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", o = Array.from(a.childNodes).find((d) => d.nodeType === Node.TEXT_NODE);
          o && (o.textContent = n), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((e) => {
      const t = e.closest("[data-widget]");
      if (t) {
        const i = parseInt(t.dataset.span || `${this.config.defaultSpan}`, 10) === this.config.maxColumns ? "Half Width" : "Full Width", s = Array.from(e.childNodes).find((r) => r.nodeType === Node.TEXT_NODE);
        s && (s.textContent = i);
      }
    }));
  }
  saveLayout() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.updateStatus("Saving layout…"), this.saveTimer = window.setTimeout(async () => {
      try {
        const e = this.serializeLayout();
        await this.behaviors.persistence.save(this.config.preferencesEndpoint, e), this.updateStatus("Layout saved"), this.config.onSave(e);
      } catch (e) {
        this.updateStatus("Save failed"), this.config.onError(e);
      }
    }, this.config.saveDelay);
  }
  serializeLayout() {
    const e = {
      area_order: {},
      hidden_widget_ids: [],
      layout_rows: {}
    };
    if (!this.container) return e;
    this.container.querySelectorAll(this.config.selectors.areas).forEach((i) => {
      const s = i.dataset.areaGrid || i.dataset.areaCode;
      if (!s) return;
      const r = Array.from(
        i.querySelectorAll('[data-widget]:not([data-hidden="true"])')
      );
      e.area_order[s] = r.map((n) => n.dataset.widget), e.layout_rows[s] = this.serializeRows(r);
    });
    const a = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return e.hidden_widget_ids = Array.from(a).map((i) => i.dataset.widget), e;
  }
  serializeRows(e) {
    const t = [];
    let a = [], i = 0;
    return e.forEach((s) => {
      const r = s.dataset.widget, n = parseInt(s.dataset.span || `${this.config.defaultSpan}`, 10);
      i + n > this.config.maxColumns && i > 0 && (t.push({ widgets: a }), a = [], i = 0), a.push({ id: r, width: n }), i += n, i >= this.config.maxColumns && (t.push({ widgets: a }), a = [], i = 0);
    }), a.length > 0 && t.push({ widgets: a }), t;
  }
  updateStatus(e) {
    this.statusElement && (this.statusElement.textContent = e);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}
export {
  c as DefaultDragDropBehavior,
  g as DefaultPersistenceBehavior,
  h as DefaultResizeBehavior,
  u as DefaultVisibilityBehavior,
  p as WidgetGrid
};
//# sourceMappingURL=index.js.map
