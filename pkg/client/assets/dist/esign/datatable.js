import { p as l } from "../chunks/date-utils-Ch6PxlHn.js";
import { b as c } from "../chunks/dom-helpers-Cd24RS2-.js";
class h {
  constructor(e) {
    this.env = e;
  }
  buildQuery(e, t) {
    const r = { page: e, per_page: t };
    return this.env && (r.env = this.env), r;
  }
  async onPageChange(e, t) {
    await t.refresh();
  }
}
class b {
  constructor(e) {
    this.env = e;
  }
  buildQuery(e) {
    const t = {}, r = e ? e.trim() : "";
    return r && (t.search = r), this.env && (t.env = this.env), t;
  }
  async onSearch(e, t) {
    t.resetPagination(), await t.refresh();
  }
}
function u(n) {
  switch ((n || "").toLowerCase()) {
    case "select":
    case "enum":
      return "select";
    case "number":
    case "integer":
      return "number";
    case "date":
    case "datetime":
    case "time":
      return "date";
    default:
      return "text";
  }
}
function f(n) {
  if (!Array.isArray(n)) return;
  const e = n.map((t) => {
    if (!t) return null;
    const r = t.value ?? "", a = t.label ?? String(r);
    return { label: String(a), value: String(r) };
  }).filter((t) => t !== null);
  return e.length > 0 ? e : void 0;
}
function d(n, e) {
  if (!Array.isArray(n) || n.length === 0) return;
  const t = n.map((i) => String(i || "").trim().toLowerCase()).filter(Boolean);
  if (t.length === 0) return;
  const r = Array.from(new Set(t)), a = e ? String(e).trim().toLowerCase() : "";
  return a && r.includes(a) ? [a, ...r.filter((i) => i !== a)] : r;
}
function g(n) {
  return n.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function y(n) {
  return n ? n.map((e) => ({
    name: e.name,
    label: e.label,
    type: u(e.type),
    options: f(e.options),
    operators: d(e.operators, e.default_operator)
  })) : [];
}
function S(n) {
  if (!n) return "-";
  const e = l(n);
  return e ? e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : String(n);
}
function v(n) {
  if (!n || Number(n) <= 0) return "-";
  const e = parseInt(String(n), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function x(n, e, t) {
  t && t.success(`${n} completed successfully`);
}
function C(n, e, t) {
  if (t) {
    const r = e?.fields ? Object.entries(e.fields).map(([o, s]) => `${o}: ${s}`).join("; ") : "", a = e?.textCode ? `${e.textCode}: ` : "", i = e?.message || `${n} failed`;
    t.error(r ? `${a}${i}: ${r}` : `${a}${i}`);
  }
}
function $(n, e) {
  const t = c(`#${n}`);
  t && t.addEventListener("click", async () => {
    t.disabled = !0, t.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      t.disabled = !1, t.classList.remove("opacity-50");
    }
  });
}
function A(n, e) {
  const t = n.refresh.bind(n);
  return async function() {
    await t();
    const r = n.getSchema();
    r?.actions && e(r.actions);
  };
}
const w = {
  searchInput: "#table-search",
  perPageSelect: "#table-per-page",
  filterRow: "[data-filter-column]",
  columnToggleBtn: "#column-toggle-btn",
  columnToggleMenu: "#column-toggle-menu",
  exportBtn: "#export-btn",
  exportMenu: "#export-menu",
  paginationContainer: "#table-pagination",
  tableInfoStart: "#table-info-start",
  tableInfoEnd: "#table-info-end",
  tableInfoTotal: "#table-info-total",
  selectAllCheckbox: "#table-checkbox-all",
  rowCheckboxes: ".table-checkbox",
  bulkActionsBar: "#bulk-actions-overlay",
  selectedCount: "#selected-count"
};
export {
  h as PanelPaginationBehavior,
  b as PanelSearchBehavior,
  w as STANDARD_GRID_SELECTORS,
  A as createSchemaActionCachingRefresh,
  S as dateTimeCellRenderer,
  C as defaultActionErrorHandler,
  x as defaultActionSuccessHandler,
  v as fileSizeCellRenderer,
  d as normalizeFilterOperators,
  f as normalizeFilterOptions,
  u as normalizeFilterType,
  y as prepareFilterFields,
  g as prepareGridColumns,
  $ as setupRefreshButton
};
//# sourceMappingURL=datatable.js.map
