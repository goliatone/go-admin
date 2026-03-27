import { escapeHTML as O } from "../shared/html.js";
import { onReady as P } from "../shared/dom-ready.js";
import { initBlockEditor as j, registerBlockTemplate as H, refreshBlockTemplateRegistry as F, markRequiredFields as z } from "./block_editor.js";
function U(t) {
  if (!t) return {};
  try {
    const a = JSON.parse(t);
    if (a && typeof a == "object") return a;
  } catch {
  }
  return {};
}
function V(t, a) {
  if (!t) return a;
  try {
    return JSON.parse(t);
  } catch {
  }
  return a;
}
function I(t) {
  const a = t.trim().toLowerCase();
  return a ? Array.from(/* @__PURE__ */ new Set([
    a,
    a.replace(/-/g, "_"),
    a.replace(/_/g, "-")
  ])) : [];
}
function W(t) {
  const a = t.trim(), n = a.replace(/\/+$/, "");
  if (!n) {
    const f = a === "/" ? "/api" : "";
    return f ? {
      listBase: `${f}/panels/block_definitions`,
      templatesBase: `${f}/block_definitions_meta`
    } : { listBase: "", templatesBase: "" };
  }
  if (n.endsWith("/block_definitions_meta"))
    return {
      listBase: `${n.replace(/\/block_definitions_meta$/, "")}/panels/block_definitions`,
      templatesBase: n
    };
  if (n.endsWith("/panels/block_definitions"))
    return {
      listBase: n,
      templatesBase: n.replace(/\/panels\/block_definitions$/, "/block_definitions_meta")
    };
  if (n.endsWith("/block_definitions"))
    return { listBase: "", templatesBase: "" };
  const o = /\/api(\/|$)/.test(n) ? n : `${n}/api`;
  return {
    listBase: `${o}/panels/block_definitions`,
    templatesBase: `${o}/block_definitions_meta`
  };
}
function J(t, a) {
  const n = t.querySelector("[data-picker-load-error]");
  n && n.remove();
  const o = document.createElement("div");
  o.setAttribute("data-picker-load-error", "true"), o.className = "mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20", o.innerHTML = `
    <div class="flex items-start gap-2">
      <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <p class="text-xs text-red-700 dark:text-red-300">${O(a)}</p>
    </div>
    <button type="button" data-picker-retry
            class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
      Retry
    </button>
  `, o.querySelector("[data-picker-retry]")?.addEventListener("click", () => {
    o.remove(), D(t);
  }), t.prepend(o);
}
async function T(t) {
  const a = await fetch(t);
  if (!a.ok) throw new Error(`fetch ${t}: ${a.status}`);
  return a.json();
}
async function K(t, a) {
  const n = new URLSearchParams();
  a || n.set("filter_status", "active");
  const o = n.toString(), f = o ? `${t}?${o}` : t, i = await T(f);
  return Array.isArray(i.items) ? i.items.map((l) => {
    const b = typeof l.status == "string" ? l.status.trim() : "";
    return {
      slug: l.slug ?? "",
      label: l.name ?? l.label ?? l.slug ?? "",
      icon: l.icon,
      category: l.category,
      description: l.description,
      schema_version: l.schema_version,
      required_fields: l.required_fields,
      status: l.status,
      disabled: b.toLowerCase() !== "active"
    };
  }) : [];
}
async function R(t, a, n) {
  if (a.length === 0) return [];
  let o = `${t}/templates?slugs=${encodeURIComponent(a.join(","))}`;
  return n && (o += "&include_inactive=true"), (await T(o)).items ?? [];
}
async function G(t, a, n) {
  let o = `${t}/templates/${encodeURIComponent(a)}`;
  n && (o += "?include_inactive=true");
  try {
    return (await T(o)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function M(t, a) {
  H(t, {
    type: a.slug,
    label: a.label,
    icon: a.icon || void 0,
    schemaVersion: a.schema_version || void 0,
    requiredFields: a.required_fields ?? [],
    html: a.html
  }), F(t);
}
function Q(t, a) {
  const n = typeof t.schema_version == "string" ? t.schema_version.trim() : "";
  return n || (a ? a.replace("{type}", t.slug) : `${t.slug}@v1.0.0`);
}
function X(t, a, n) {
  const o = document.createElement("div");
  o.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", o.setAttribute("data-block-item", "true"), o.dataset.blockType = t.slug, a && o.setAttribute("draggable", "true");
  const f = document.createElement("div");
  f.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", f.setAttribute("data-block-header", "true");
  const i = document.createElement("div");
  i.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const l = document.createElement("span");
  l.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", l.textContent = t.icon || t.label.slice(0, 1).toUpperCase();
  const b = document.createElement("span");
  b.textContent = t.label;
  const x = document.createElement("span");
  x.className = "text-xs text-gray-500 dark:text-gray-400", x.textContent = t.slug;
  const v = Q(t, n), L = document.createElement("span");
  L.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", L.textContent = v, L.setAttribute("data-block-schema-badge", "true"), i.appendChild(l), i.appendChild(b), i.appendChild(x), i.appendChild(L);
  const k = document.createElement("div");
  if (k.className = "flex items-center gap-2", a) {
    const h = document.createElement("button");
    h.type = "button", h.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", h.textContent = "Up", h.setAttribute("data-block-move-up", "true"), k.appendChild(h);
    const C = document.createElement("button");
    C.type = "button", C.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", C.textContent = "Down", C.setAttribute("data-block-move-down", "true"), k.appendChild(C);
  }
  const d = document.createElement("button");
  d.type = "button", d.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", d.textContent = "Collapse", d.setAttribute("data-block-collapse", "true"), k.appendChild(d);
  const u = document.createElement("button");
  if (u.type = "button", u.className = "text-xs text-red-600 hover:text-red-700", u.textContent = "Remove", u.setAttribute("data-block-remove", "true"), k.appendChild(u), a) {
    const h = document.createElement("span");
    h.className = "text-xs text-gray-400 cursor-move", h.textContent = "Drag", h.setAttribute("data-block-drag-handle", "true"), k.appendChild(h);
  }
  f.appendChild(i), f.appendChild(k);
  const B = document.createElement("div");
  B.className = "p-4 space-y-4", B.setAttribute("data-block-body", "true"), B.innerHTML = t.html;
  const S = t.required_fields || [];
  S.length > 0 && z(B, S), o.appendChild(f), o.appendChild(B);
  const E = document.createElement("input");
  E.type = "hidden", E.name = "_type", E.value = t.slug, E.readOnly = !0, E.setAttribute("data-block-type-input", "true"), E.setAttribute("data-block-ignore", "true"), o.appendChild(E), o.dataset.blockSchema = v;
  const w = document.createElement("input");
  return w.type = "hidden", w.name = "_schema", w.value = v, w.setAttribute("data-block-schema-input", "true"), w.setAttribute("data-block-ignore", "true"), o.appendChild(w), o;
}
function Y(t, a, n) {
  const o = a.searchable !== !1, f = a.groupByCategory !== !1, i = document.createElement("div");
  i.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", i.style.display = "none", i.setAttribute("data-picker-popover", "true"), i.setAttribute("data-picker-dropdown", "true"), i.setAttribute("role", "dialog"), i.setAttribute("aria-label", "Add block");
  let l = null;
  if (o) {
    const r = document.createElement("div");
    r.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const c = document.createElement("div");
    c.className = "relative";
    const p = document.createElement("svg");
    p.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", p.setAttribute("fill", "none"), p.setAttribute("stroke", "currentColor"), p.setAttribute("viewBox", "0 0 24 24"), p.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', l = document.createElement("input"), l.type = "text", l.placeholder = "Search blocks…", l.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", l.setAttribute("data-picker-search", "true"), l.setAttribute("autocomplete", "off"), c.appendChild(p), c.appendChild(l), r.appendChild(c), i.appendChild(r);
  }
  const b = document.createElement("div");
  b.className = "max-h-72 overflow-y-auto py-1", b.setAttribute("data-picker-cards", "true"), b.setAttribute("role", "listbox"), i.appendChild(b);
  const x = document.createElement("div");
  x.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", x.setAttribute("data-picker-empty", "true"), x.style.display = "none";
  const v = document.createElement("svg");
  v.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", v.setAttribute("fill", "none"), v.setAttribute("stroke", "currentColor"), v.setAttribute("viewBox", "0 0 24 24"), v.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const L = document.createElement("p");
  L.setAttribute("data-picker-empty-text", "true"), L.textContent = "No block types available", x.appendChild(v), x.appendChild(L), i.appendChild(x);
  let k = !1, d = -1, u = [], B = [...t], S = /* @__PURE__ */ new Set();
  function E(r, c) {
    const p = c || !!r.disabled, e = document.createElement("button");
    e.type = "button", e.setAttribute("data-picker-item", r.slug), e.setAttribute("data-picker-card", r.slug), e.setAttribute("role", "option"), e.setAttribute("aria-selected", "false"), r.category && (e.dataset.category = r.category), e.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (p ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), p && (e.disabled = !0, e.setAttribute("aria-disabled", "true"), e.title = r.status && r.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const s = document.createElement("span");
    s.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (p ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), s.textContent = r.icon || r.label.slice(0, 2).toUpperCase();
    const g = document.createElement("div");
    g.className = "flex-1 min-w-0";
    const m = document.createElement("div");
    m.className = "font-medium truncate " + (p ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), m.textContent = r.label;
    const N = document.createElement("div");
    N.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const A = [r.description || r.slug];
    return r.status && r.status.toLowerCase() !== "active" && A.push(`(${r.status})`), N.textContent = A.join(" "), g.appendChild(m), g.appendChild(N), e.appendChild(s), e.appendChild(g), e;
  }
  function w(r = "") {
    b.innerHTML = "", u = [], d = -1;
    const c = r.toLowerCase().trim(), p = c ? B.filter(
      (e) => e.label.toLowerCase().includes(c) || e.slug.toLowerCase().includes(c) || (e.category || "").toLowerCase().includes(c) || (e.description || "").toLowerCase().includes(c)
    ) : B;
    if (p.length === 0) {
      x.style.display = "";
      const e = x.querySelector("[data-picker-empty-text]");
      e && (e.textContent = c ? "No blocks match your search" : "No block types available");
      return;
    }
    if (x.style.display = "none", f) {
      const e = /* @__PURE__ */ new Map();
      for (const s of p) {
        const g = s.category || "other";
        e.has(g) || e.set(g, []), e.get(g).push(s);
      }
      for (const [s, g] of e) {
        const m = document.createElement("div");
        m.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", m.setAttribute("data-picker-category", s), m.setAttribute("role", "presentation"), m.textContent = s, b.appendChild(m);
        for (const N of g) {
          const A = E(N, S.has(N.slug));
          b.appendChild(A), A.disabled || u.push(A);
        }
      }
    } else
      for (const e of p) {
        const s = E(e, S.has(e.slug));
        b.appendChild(s), s.disabled || u.push(s);
      }
  }
  w();
  function h(r) {
    if (d >= 0 && d < u.length) {
      const c = u[d];
      c.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), c.setAttribute("aria-selected", "false");
    }
    if (d = r, d >= 0 && d < u.length) {
      const c = u[d];
      c.classList.add("bg-blue-50", "dark:bg-blue-900/20"), c.setAttribute("aria-selected", "true"), typeof c.scrollIntoView == "function" && c.scrollIntoView({ block: "nearest" });
    }
  }
  l && l.addEventListener("input", () => {
    w(l.value);
  });
  function C(r) {
    switch (r.key) {
      case "ArrowDown":
        r.preventDefault(), u.length > 0 && h(d < u.length - 1 ? d + 1 : 0);
        break;
      case "ArrowUp":
        r.preventDefault(), u.length > 0 && h(d <= 0 ? u.length - 1 : d - 1);
        break;
      case "Enter":
        if (r.preventDefault(), d >= 0 && d < u.length) {
          const c = u[d].getAttribute("data-picker-item");
          c && n.onSelect(c);
        }
        break;
      case "Escape":
        r.preventDefault(), n.onClose();
        break;
      case "Tab":
        r.preventDefault(), l && document.activeElement !== l ? (l.focus(), d = -1) : u.length > 0 && h(0);
        break;
    }
  }
  b.addEventListener("click", (r) => {
    const c = r.target.closest("[data-picker-item]");
    if (!c || c.disabled) return;
    const p = c.getAttribute("data-picker-item");
    p && n.onSelect(p);
  });
  function _() {
    i.style.bottom = "", i.style.marginBottom = "", i.style.top = "", i.style.marginTop = "4px", requestAnimationFrame(() => {
      i.getBoundingClientRect().bottom > window.innerHeight - 8 && (i.style.bottom = "100%", i.style.top = "auto", i.style.marginBottom = "4px", i.style.marginTop = "0");
    });
  }
  function y() {
    i.style.display = "", k = !0, _(), l && (l.value = "", w(""), requestAnimationFrame(() => l.focus())), i.addEventListener("keydown", C);
  }
  function q() {
    i.style.display = "none", k = !1, d = -1, i.removeEventListener("keydown", C);
  }
  function $(r, c) {
    B = r, c && (S = c), w(l?.value || "");
  }
  return {
    element: i,
    open: y,
    close: q,
    isOpen: () => k,
    updateCards: $
  };
}
async function D(t) {
  const a = t.closest("[data-component-config]") || t, n = U(a.getAttribute("data-component-config")), o = t.dataset.apiBase || n.apiBase || "";
  if (!o) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const { listBase: f, templatesBase: i } = W(o);
  if (!f || !i) {
    console.warn("block-library-picker: invalid api base", o);
    return;
  }
  const l = V(t.dataset.allowedBlocks, n.allowedBlocks ?? []), b = parseInt(t.dataset.maxBlocks || "", 10) || n.maxBlocks || 0, x = n.lazyLoad !== !1, v = n.includeInactive === !0, L = n.sortable ?? t.dataset.blockSortable === "true", k = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Map();
  let u;
  try {
    u = await K(f, v);
  } catch (e) {
    console.error("block-library-picker: metadata fetch failed", e);
    const s = e instanceof Error ? e.message : "Failed to load block definitions.";
    J(t, `Failed to load block definitions: ${s}`);
    return;
  }
  if (l.length > 0) {
    const e = /* @__PURE__ */ new Set();
    for (const s of l)
      for (const g of I(s)) e.add(g);
    u = u.filter((s) => {
      for (const g of I(s.slug))
        if (e.has(g)) return !0;
      return !1;
    });
  }
  const B = t.querySelector("input[data-block-output]");
  let S = [];
  if (B?.value)
    try {
      const e = JSON.parse(B.value);
      Array.isArray(e) && (S = e);
    } catch {
    }
  const E = [
    ...new Set(
      S.map((e) => e && typeof e == "object" ? e._type : "").filter((e) => typeof e == "string" && e.length > 0)
    )
  ];
  if (E.length > 0)
    try {
      const e = await R(i, E, v);
      for (const s of e)
        M(t, s), k.add(s.slug), d.set(s.slug, s);
    } catch (e) {
      console.error("block-library-picker: template fetch failed", e);
    }
  if (!x) {
    const e = u.filter((s) => !k.has(s.slug)).map((s) => s.slug);
    if (e.length > 0)
      try {
        const s = await R(i, e, v);
        for (const g of s)
          M(t, g), k.add(g.slug), d.set(g.slug, g);
      } catch (s) {
        console.error("block-library-picker: prefetch failed", s);
      }
  }
  j(t);
  const w = t.querySelector("[data-block-add-select]"), h = t.querySelector("[data-block-add]"), C = document.createElement("div");
  C.className = "mt-3", C.setAttribute("data-picker-controls", "true");
  const _ = document.createElement("div");
  _.className = "relative inline-block";
  const y = document.createElement("button");
  y.type = "button", y.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", y.setAttribute("data-picker-add-btn", "true");
  const q = typeof n.addLabel == "string" && n.addLabel.trim() ? n.addLabel.trim() : "Add Block";
  y.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${q}</span>`;
  const $ = () => {
    if (b <= 0) return;
    const s = t.querySelectorAll("[data-block-item]").length >= b;
    y.disabled = s, y.classList.toggle("opacity-50", s), y.classList.toggle("cursor-not-allowed", s), y.title = s ? `Maximum of ${b} blocks reached` : "";
  }, r = Y(u, n, {
    onSelect: (e) => c(e),
    onClose: () => {
      r.close(), y.focus();
    }
  });
  async function c(e) {
    const s = u.find((m) => m.slug === e);
    if (!s || s.disabled) return;
    if (b > 0 && t.querySelectorAll("[data-block-item]").length >= b) {
      r.close();
      return;
    }
    if (w instanceof HTMLSelectElement && Array.from(w.options).some((m) => m.value === e))
      w.value = e, h?.click();
    else {
      let m = d.get(e);
      if (!m)
        try {
          const A = await G(i, e, v);
          A && (m = A, M(t, m), k.add(m.slug), d.set(m.slug, m));
        } catch (A) {
          console.error(`block-library-picker: fetch template ${e} failed`, A), r.close();
          return;
        }
      if (!m) {
        r.close();
        return;
      }
      const N = t.querySelector("[data-block-list]");
      if (N) {
        const A = X(m, L, n.schemaVersionPattern);
        N.appendChild(A), A.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
    r.close(), $();
  }
  if (y.addEventListener("click", (e) => {
    e.stopPropagation(), !y.disabled && (r.isOpen() ? r.close() : r.open());
  }), y.addEventListener("keydown", (e) => {
    e.key === "ArrowDown" && !r.isOpen() && !y.disabled && (e.preventDefault(), r.open());
  }), document.addEventListener("click", (e) => {
    r.isOpen() && !_.contains(e.target) && r.close();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && r.isOpen() && (r.close(), y.focus());
  }), b > 0) {
    const e = t.querySelector("[data-block-list]");
    e && new MutationObserver(() => $()).observe(e, { childList: !0 }), $();
  }
  _.appendChild(y), _.appendChild(r.element), C.appendChild(_);
  const p = t.querySelector("[data-block-list]");
  p && p.nextSibling ? p.parentElement?.insertBefore(C, p.nextSibling) : t.appendChild(C), t.setAttribute("data-picker-initialized", "true");
}
async function Z(t = document) {
  const n = Array.from(
    t.querySelectorAll('[data-block-library-picker="true"]')
  ).filter((o) => o.getAttribute("data-picker-initialized") !== "true").map((o) => D(o));
  await Promise.all(n);
}
P(() => {
  Z();
});
export {
  Z as initBlockLibraryPickers
};
//# sourceMappingURL=block_library_picker.js.map
