import { escapeHTML as i } from "../shared/html.js";
import { a as f, i as g, n as u, r as v, t as p } from "../chunks/entity-renderer-GXMu3Nhg.js";
var l = {
  searchFields: ["label", "description"],
  caseSensitive: !1
}, o = class {
  constructor(e) {
    this.config = {
      ...l,
      ...e
    }, this.items = e.items;
  }
  async search(e, s) {
    const r = this.config.caseSensitive ? e : e.toLowerCase();
    return this.items.filter((a) => this.config.searchFields.some((t) => {
      const n = a[t];
      if (n == null) return !1;
      const c = String(n);
      return (this.config.caseSensitive ? c : c.toLowerCase()).includes(r);
    }));
  }
  setItems(e) {
    this.items = e;
  }
  addItems(e) {
    this.items = [...this.items, ...e];
  }
  removeItem(e) {
    this.items = this.items.filter((s) => s.id !== e);
  }
  getItems() {
    return [...this.items];
  }
};
function x(e, s) {
  const r = s?.labelField || "name", a = s?.idField || "id";
  return new o({ items: e.map((t) => ({
    id: String(t[a] || ""),
    label: String(t[r] || t.label || ""),
    description: s?.descriptionField ? String(t[s.descriptionField] || "") : void 0,
    data: t
  })) });
}
var d = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50"
}, F = class {
  constructor(e = {}) {
    this.config = {
      ...d,
      ...e
    };
  }
  render(e, s) {
    return `
      <div class="${`${this.config.itemClass || ""} ${s && this.config.selectedClass || ""}`.trim()}">
        <div class="flex items-center gap-3">
          ${this.config.showIcon && e.icon ? this.renderIcon(e.icon) : ""}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${i(e.label)}</p>
            ${this.config.showDescription && e.description ? `<p class="text-xs text-gray-500 mt-0.5">${i(e.description)}</p>` : ""}
          </div>
        </div>
      </div>
    `;
  }
  renderIcon(e) {
    return e.startsWith("http") || e.startsWith("/") || e.startsWith("data:") ? `<img src="${i(e)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />` : `<span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">${i(e)}</span>`;
  }
};
export {
  v as ApiResolver,
  p as EntityRenderer,
  f as SearchBox,
  F as SimpleRenderer,
  o as StaticResolver,
  u as UserRenderer,
  g as createCrudResolver,
  x as createStaticResolver
};

//# sourceMappingURL=index.js.map