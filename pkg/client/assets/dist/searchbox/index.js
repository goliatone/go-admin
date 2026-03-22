import { a as h, i as m, n as f, r as p, t as u } from "../chunks/entity-renderer-BnkXZh8v.js";
var c = {
  searchFields: ["label", "description"],
  caseSensitive: !1
}, l = class {
  constructor(e) {
    this.config = {
      ...c,
      ...e
    }, this.items = e.items;
  }
  async search(e, t) {
    const i = this.config.caseSensitive ? e : e.toLowerCase();
    return this.items.filter((r) => this.config.searchFields.some((s) => {
      const a = r[s];
      if (a == null) return !1;
      const n = String(a);
      return (this.config.caseSensitive ? n : n.toLowerCase()).includes(i);
    }));
  }
  setItems(e) {
    this.items = e;
  }
  addItems(e) {
    this.items = [...this.items, ...e];
  }
  removeItem(e) {
    this.items = this.items.filter((t) => t.id !== e);
  }
  getItems() {
    return [...this.items];
  }
};
function v(e, t) {
  const i = t?.labelField || "name", r = t?.idField || "id";
  return new l({ items: e.map((s) => ({
    id: String(s[r] || ""),
    label: String(s[i] || s.label || ""),
    description: t?.descriptionField ? String(s[t.descriptionField] || "") : void 0,
    data: s
  })) });
}
var o = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50"
}, g = class {
  constructor(e = {}) {
    this.config = {
      ...o,
      ...e
    };
  }
  render(e, t) {
    return `
      <div class="${`${this.config.itemClass || ""} ${t && this.config.selectedClass || ""}`.trim()}">
        <div class="flex items-center gap-3">
          ${this.config.showIcon && e.icon ? this.renderIcon(e.icon) : ""}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(e.label)}</p>
            ${this.config.showDescription && e.description ? `<p class="text-xs text-gray-500 mt-0.5">${this.escapeHtml(e.description)}</p>` : ""}
          </div>
        </div>
      </div>
    `;
  }
  renderIcon(e) {
    return e.startsWith("http") || e.startsWith("/") || e.startsWith("data:") ? `<img src="${this.escapeHtml(e)}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />` : `<span class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">${this.escapeHtml(e)}</span>`;
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
};
export {
  p as ApiResolver,
  u as EntityRenderer,
  h as SearchBox,
  g as SimpleRenderer,
  l as StaticResolver,
  f as UserRenderer,
  m as createCrudResolver,
  v as createStaticResolver
};

//# sourceMappingURL=index.js.map