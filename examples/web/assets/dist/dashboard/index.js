class h {
  constructor() {
    this.draggedElement = null, this.cleanupFunctions = [];
  }
  enable(e, t) {
    e.querySelectorAll("[data-widget]").forEach((a) => {
      a.draggable = !0;
      const r = () => {
        this.draggedElement = a, a.classList.add("dragging");
      }, n = () => {
        a.classList.remove("dragging"), this.draggedElement = null;
      };
      a.addEventListener("dragstart", r), a.addEventListener("dragend", n), this.cleanupFunctions.push(() => {
        a.removeEventListener("dragstart", r), a.removeEventListener("dragend", n);
      });
    }), e.querySelectorAll("[data-widgets-grid]").forEach((a) => {
      const r = (o) => {
        if (o.preventDefault(), !this.draggedElement) return;
        const d = this.getDragAfterElement(a, o.clientY);
        d == null ? a.appendChild(this.draggedElement) : d !== this.draggedElement && a.insertBefore(this.draggedElement, d);
      }, n = (o) => {
        o.preventDefault(), t();
      };
      a.addEventListener("dragover", r), a.addEventListener("drop", n), this.cleanupFunctions.push(() => {
        a.removeEventListener("dragover", r), a.removeEventListener("drop", n);
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
      (i, a) => {
        const r = a.getBoundingClientRect(), n = t - r.top - r.height / 2;
        return n < 0 && n > i.offset ? { offset: n, element: a } : i;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }
}
class c {
  toggleWidth(e, t, s) {
    const i = t === s ? s / 2 : s;
    return this.applyWidth(e, i), i;
  }
  applyWidth(e, t) {
    e.dataset.span = t.toString(), e.style.setProperty("--span", t.toString());
  }
}
class u {
  toggle(e) {
    const s = !(e.dataset.hidden === "true");
    return this.applyVisibility(e, s), s;
  }
  applyVisibility(e, t) {
    t ? (e.dataset.hidden = "true", e.classList.add("is-hidden")) : (delete e.dataset.hidden, e.classList.remove("is-hidden"));
  }
}
class g {
  async save(e, t) {
    const s = await fetch(e, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(t)
    });
    if (!s.ok)
      throw new Error(`Failed to save layout: ${s.statusText}`);
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
    this.container = null, this.saveTimer = null, this.statusElement = null, this.panelSchema = null, this.panelTabs = [], this.config = {
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
      dragDrop: e.behaviors?.dragDrop || new h(),
      resize: e.behaviors?.resize || new c(),
      visibility: e.behaviors?.visibility || new u(),
      persistence: e.behaviors?.persistence || new g()
    };
  }
  async init(e) {
    if (this.container = document.querySelector("[data-widget-grid]"), this.statusElement = document.getElementById("save-status"), !this.container)
      throw new Error("Widget grid container not found");
    const t = this.normalizePanelDetailState(e);
    t.schema && (this.panelSchema = t.schema, this.panelTabs = t.schema.tabs || []), this.attachEventListeners(), this.initializeDragDrop(), t.data && this.validateHydration(t.data);
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
  getSchema() {
    return this.panelSchema;
  }
  getTabs() {
    return this.panelTabs;
  }
  normalizePanelDetailState(e) {
    if (!e)
      return {};
    if (e && typeof e == "object" && "data" in e) {
      const t = e;
      return {
        data: t.data,
        schema: t.schema
      };
    }
    return { data: e };
  }
  initializeDragDrop() {
    this.container && this.behaviors.dragDrop.enable(this.container, () => {
      this.saveLayout();
    });
  }
  attachEventListeners() {
    this.container && (this.container.addEventListener("click", (e) => {
      const s = e.target.closest(this.config.selectors.hideBtn);
      if (s) {
        const i = s.closest("[data-widget]");
        i && (this.behaviors.visibility.toggle(i), this.saveLayout());
      }
    }), this.container.addEventListener("click", (e) => {
      const s = e.target.closest(this.config.selectors.resizeBtn);
      if (s) {
        const i = s.closest("[data-widget]");
        if (i) {
          const a = parseInt(i.dataset.span || `${this.config.defaultSpan}`, 10), n = this.behaviors.resize.toggleWidth(i, a, this.config.maxColumns) === this.config.maxColumns ? "Half Width" : "Full Width", o = Array.from(s.childNodes).find((d) => d.nodeType === Node.TEXT_NODE);
          o && (o.textContent = n), this.saveLayout();
        }
      }
    }), this.container.querySelectorAll(this.config.selectors.resizeBtn).forEach((e) => {
      const t = e.closest("[data-widget]");
      if (t) {
        const i = parseInt(t.dataset.span || `${this.config.defaultSpan}`, 10) === this.config.maxColumns ? "Half Width" : "Full Width", a = Array.from(e.childNodes).find((r) => r.nodeType === Node.TEXT_NODE);
        a && (a.textContent = i);
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
      const a = i.dataset.areaGrid || i.dataset.areaCode;
      if (!a) return;
      const r = Array.from(
        i.querySelectorAll('[data-widget]:not([data-hidden="true"])')
      );
      e.area_order[a] = r.map((n) => n.dataset.widget), e.layout_rows[a] = this.serializeRows(r);
    });
    const s = this.container.querySelectorAll('[data-widget][data-hidden="true"]');
    return e.hidden_widget_ids = Array.from(s).map((i) => i.dataset.widget), e;
  }
  serializeRows(e) {
    const t = [];
    let s = [], i = 0;
    return e.forEach((a) => {
      const r = a.dataset.widget, n = parseInt(a.dataset.span || `${this.config.defaultSpan}`, 10);
      i + n > this.config.maxColumns && i > 0 && (t.push({ widgets: s }), s = [], i = 0), s.push({ id: r, width: n }), i += n, i >= this.config.maxColumns && (t.push({ widgets: s }), s = [], i = 0);
    }), s.length > 0 && t.push({ widgets: s }), t;
  }
  updateStatus(e) {
    this.statusElement && (this.statusElement.textContent = e);
  }
  destroy() {
    this.saveTimer !== null && clearTimeout(this.saveTimer), this.behaviors.dragDrop.disable();
  }
}
export {
  h as DefaultDragDropBehavior,
  g as DefaultPersistenceBehavior,
  c as DefaultResizeBehavior,
  u as DefaultVisibilityBehavior,
  p as WidgetGrid
};
//# sourceMappingURL=index.js.map
