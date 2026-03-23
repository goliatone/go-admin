import { t as l } from "./date-utils-DMGK0YYp.js";
import { l as c } from "./dom-helpers-CDdChTSn.js";
var h = class {
  constructor(t) {
    this.env = t;
  }
  buildQuery(t, e) {
    const n = {
      page: t,
      per_page: e
    };
    return this.env && (n.env = this.env), n;
  }
  async onPageChange(t, e) {
    await e.refresh();
  }
}, g = class {
  constructor(t) {
    this.env = t;
  }
  buildQuery(t) {
    const e = {}, n = t ? t.trim() : "";
    return n && (e.search = n), this.env && (e.env = this.env), e;
  }
  async onSearch(t, e) {
    e.resetPagination(), await e.refresh();
  }
};
function u(t) {
  switch ((t || "").toLowerCase()) {
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
function f(t) {
  if (!Array.isArray(t)) return;
  const e = t.map((n) => {
    if (!n) return null;
    const a = n.value ?? "", r = n.label ?? String(a);
    return {
      label: String(r),
      value: String(a)
    };
  }).filter((n) => n !== null);
  return e.length > 0 ? e : void 0;
}
function d(t, e) {
  if (!Array.isArray(t) || t.length === 0) return;
  const n = t.map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
  if (n.length === 0) return;
  const a = Array.from(new Set(n)), r = e ? String(e).trim().toLowerCase() : "";
  return r && a.includes(r) ? [r, ...a.filter((s) => s !== r)] : a;
}
function b(t) {
  return t.map((e) => ({
    ...e,
    hidden: e.default === !1
  }));
}
function y(t) {
  return t ? t.map((e) => ({
    name: e.name,
    label: e.label,
    type: u(e.type),
    options: f(e.options),
    operators: d(e.operators, e.default_operator)
  })) : [];
}
function S(t) {
  if (!t) return "-";
  const e = l(t);
  return e ? e.toLocaleDateString() + " " + e.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  }) : String(t);
}
function v(t) {
  if (!t || Number(t) <= 0) return "-";
  const e = parseInt(String(t), 10);
  return e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function x(t, e, n) {
  n && n.success(`${t} completed successfully`);
}
function C(t, e, n) {
  if (n) {
    const a = e?.fields ? Object.entries(e.fields).map(([i, o]) => `${i}: ${o}`).join("; ") : "", r = e?.textCode ? `${e.textCode}: ` : "", s = e?.message || `${t} failed`;
    n.error(a ? `${r}${s}: ${a}` : `${r}${s}`);
  }
}
function $(t, e) {
  const n = c(`#${t}`);
  n && n.addEventListener("click", async () => {
    n.disabled = !0, n.classList.add("opacity-50");
    try {
      await e.refresh();
    } finally {
      n.disabled = !1, n.classList.remove("opacity-50");
    }
  });
}
function A(t, e) {
  const n = t.refresh.bind(t);
  return async function() {
    await n();
    const a = t.getSchema();
    a?.actions && e(a.actions);
  };
}
var w = {
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
  S as a,
  v as c,
  u as d,
  y as f,
  A as i,
  d as l,
  $ as m,
  g as n,
  C as o,
  b as p,
  w as r,
  x as s,
  h as t,
  f as u
};

//# sourceMappingURL=datatable-bootstrap-CnClgt49.js.map