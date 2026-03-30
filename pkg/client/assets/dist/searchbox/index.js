import { A as x, E as b, S as F, U as S, c as C } from "../chunks/entity-renderer-DxPxigz0.js";
import { escapeHTML as a } from "../shared/html.js";
const d = {
  searchFields: ["label", "description"],
  caseSensitive: !1
};
class h {
  constructor(e) {
    this.config = { ...d, ...e }, this.items = e.items;
  }
  async search(e, t) {
    const i = this.config.caseSensitive ? e : e.toLowerCase();
    return this.items.filter((r) => this.config.searchFields.some((s) => {
      const c = r[s];
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
    this.items = this.items.filter((t) => t.id !== e);
  }
  /**
   * Get all items
   */
  getItems() {
    return [...this.items];
  }
}
function u(l, e) {
  const t = e?.labelField || "name", i = e?.idField || "id", r = l.map((s) => ({
    id: String(s[i] || ""),
    label: String(s[t] || s.label || ""),
    description: e?.descriptionField ? String(s[e.descriptionField] || "") : void 0,
    data: s
  }));
  return new h({ items: r });
}
const m = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50"
};
class p {
  constructor(e = {}) {
    this.config = { ...m, ...e };
  }
  render(e, t) {
    const i = this.config.itemClass || "", r = t && this.config.selectedClass || "", s = `${i} ${r}`.trim(), c = this.config.showIcon && e.icon ? this.renderIcon(e.icon) : "", n = a(e.label), o = this.config.showDescription && e.description ? `<p class="text-xs text-gray-500 mt-0.5">${a(e.description)}</p>` : "";
    return `
      <div class="${s}">
        <div class="flex items-center gap-3">
          ${c}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${n}</p>
            ${o}
          </div>
        </div>
      </div>
    `;
  }
  renderIcon(e) {
    return e.startsWith("http") || e.startsWith("/") || e.startsWith("data:") ? `<img src="${a(e)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />` : `<span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">${a(e)}</span>`;
  }
}
export {
  x as ApiResolver,
  b as EntityRenderer,
  F as SearchBox,
  p as SimpleRenderer,
  h as StaticResolver,
  S as UserRenderer,
  C as createCrudResolver,
  u as createStaticResolver
};
//# sourceMappingURL=index.js.map
