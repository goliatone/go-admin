import { A as g, E as v, S as x, U as b, c as C } from "../chunks/entity-renderer-Ck4g7jIm.js";
const o = {
  searchFields: ["label", "description"],
  caseSensitive: !1
};
class d {
  constructor(e) {
    this.config = { ...o, ...e }, this.items = e.items;
  }
  async search(e, s) {
    const i = this.config.caseSensitive ? e : e.toLowerCase();
    return this.items.filter((r) => this.config.searchFields.some((t) => {
      const c = r[t];
      if (c == null) return !1;
      const n = String(c);
      return (this.config.caseSensitive ? n : n.toLowerCase()).includes(i);
    }));
  }
  /**
   * Update the items to search
   */
  setItems(e) {
    this.items = e;
  }
  /**
   * Add items to the list
   */
  addItems(e) {
    this.items = [...this.items, ...e];
  }
  /**
   * Remove an item by ID
   */
  removeItem(e) {
    this.items = this.items.filter((s) => s.id !== e);
  }
  /**
   * Get all items
   */
  getItems() {
    return [...this.items];
  }
}
function m(a, e) {
  const s = e?.labelField || "name", i = e?.idField || "id", r = a.map((t) => ({
    id: String(t[i] || ""),
    label: String(t[s] || t.label || ""),
    description: e?.descriptionField ? String(t[e.descriptionField] || "") : void 0,
    data: t
  }));
  return new d({ items: r });
}
const h = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50"
};
class p {
  constructor(e = {}) {
    this.config = { ...h, ...e };
  }
  render(e, s) {
    const i = this.config.itemClass || "", r = s && this.config.selectedClass || "", t = `${i} ${r}`.trim(), c = this.config.showIcon && e.icon ? this.renderIcon(e.icon) : "", n = this.escapeHtml(e.label), l = this.config.showDescription && e.description ? `<p class="text-xs text-gray-500 mt-0.5">${this.escapeHtml(e.description)}</p>` : "";
    return `
      <div class="${t}">
        <div class="flex items-center gap-3">
          ${c}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${n}</p>
            ${l}
          </div>
        </div>
      </div>
    `;
  }
  renderIcon(e) {
    return e.startsWith("http") || e.startsWith("/") || e.startsWith("data:") ? `<img src="${this.escapeHtml(e)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />` : `<span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">${this.escapeHtml(e)}</span>`;
  }
  escapeHtml(e) {
    const s = document.createElement("div");
    return s.textContent = e, s.innerHTML;
  }
}
export {
  g as ApiResolver,
  v as EntityRenderer,
  x as SearchBox,
  p as SimpleRenderer,
  d as StaticResolver,
  b as UserRenderer,
  C as createCrudResolver,
  m as createStaticResolver
};
//# sourceMappingURL=index.js.map
