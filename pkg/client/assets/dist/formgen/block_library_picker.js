import { initBlockEditor as O, registerBlockTemplate as P, refreshBlockTemplateRegistry as R, markRequiredFields as j } from "./block_editor.js";
function H(t) {
  if (!t) return {};
  try {
    const r = JSON.parse(t);
    if (r && typeof r == "object") return r;
  } catch {
  }
  return {};
}
function F(t, r) {
  if (!t) return r;
  try {
    return JSON.parse(t);
  } catch {
  }
  return r;
}
function D(t) {
  const r = t.trim().toLowerCase();
  return r ? Array.from(/* @__PURE__ */ new Set([
    r,
    r.replace(/-/g, "_"),
    r.replace(/_/g, "-")
  ])) : [];
}
function U(t) {
  const r = t.trim(), n = r.replace(/\/+$/, "");
  if (!n) {
    const g = r === "/" ? "/api" : "";
    return g ? {
      listBase: `${g}/block_definitions`,
      templatesBase: `${g}/block_definitions_meta`
    } : { listBase: "", templatesBase: "" };
  }
  if (n.endsWith("/block_definitions_meta"))
    return {
      listBase: n.replace(/_meta$/, ""),
      templatesBase: n
    };
  if (n.endsWith("/block_definitions"))
    return {
      listBase: n,
      templatesBase: n.replace(/block_definitions$/, "block_definitions_meta")
    };
  const c = /\/api(\/|$)/.test(n) ? n : `${n}/api`;
  return {
    listBase: `${c}/block_definitions`,
    templatesBase: `${c}/block_definitions_meta`
  };
}
async function T(t) {
  const r = await fetch(t);
  if (!r.ok) throw new Error(`fetch ${t}: ${r.status}`);
  return r.json();
}
async function z(t, r) {
  const n = new URLSearchParams();
  r || n.set("filter_status", "active");
  const c = n.toString(), g = c ? `${t}?${c}` : t, s = await T(g);
  return Array.isArray(s.items) ? s.items.map((i) => {
    const b = typeof i.status == "string" ? i.status.trim() : "";
    return {
      slug: i.slug ?? "",
      label: i.name ?? i.label ?? i.slug ?? "",
      icon: i.icon,
      category: i.category,
      description: i.description,
      schema_version: i.schema_version,
      required_fields: i.required_fields,
      status: i.status,
      disabled: b.toLowerCase() !== "active"
    };
  }) : [];
}
async function I(t, r, n) {
  if (r.length === 0) return [];
  let c = `${t}/templates?slugs=${encodeURIComponent(r.join(","))}`;
  return n && (c += "&include_inactive=true"), (await T(c)).items ?? [];
}
async function V(t, r, n) {
  let c = `${t}/templates/${encodeURIComponent(r)}`;
  n && (c += "?include_inactive=true");
  try {
    return (await T(c)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function M(t, r) {
  P(t, {
    type: r.slug,
    label: r.label,
    icon: r.icon || void 0,
    schemaVersion: r.schema_version || void 0,
    requiredFields: r.required_fields ?? [],
    html: r.html
  }), R(t);
}
function J(t, r) {
  const n = typeof t.schema_version == "string" ? t.schema_version.trim() : "";
  return n || (r ? r.replace("{type}", t.slug) : `${t.slug}@v1.0.0`);
}
function W(t, r, n) {
  const c = document.createElement("div");
  c.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", c.setAttribute("data-block-item", "true"), c.dataset.blockType = t.slug, r && c.setAttribute("draggable", "true");
  const g = document.createElement("div");
  g.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", g.setAttribute("data-block-header", "true");
  const s = document.createElement("div");
  s.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const i = document.createElement("span");
  i.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", i.textContent = t.icon || t.label.slice(0, 1).toUpperCase();
  const b = document.createElement("span");
  b.textContent = t.label;
  const x = document.createElement("span");
  x.className = "text-xs text-gray-500 dark:text-gray-400", x.textContent = t.slug;
  const v = J(t, n), L = document.createElement("span");
  L.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", L.textContent = v, L.setAttribute("data-block-schema-badge", "true"), s.appendChild(i), s.appendChild(b), s.appendChild(x), s.appendChild(L);
  const h = document.createElement("div");
  if (h.className = "flex items-center gap-2", r) {
    const k = document.createElement("button");
    k.type = "button", k.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", k.textContent = "Up", k.setAttribute("data-block-move-up", "true"), h.appendChild(k);
    const C = document.createElement("button");
    C.type = "button", C.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", C.textContent = "Down", C.setAttribute("data-block-move-down", "true"), h.appendChild(C);
  }
  const d = document.createElement("button");
  d.type = "button", d.className = "text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white", d.textContent = "Collapse", d.setAttribute("data-block-collapse", "true"), h.appendChild(d);
  const u = document.createElement("button");
  if (u.type = "button", u.className = "text-xs text-red-600 hover:text-red-700", u.textContent = "Remove", u.setAttribute("data-block-remove", "true"), h.appendChild(u), r) {
    const k = document.createElement("span");
    k.className = "text-xs text-gray-400 cursor-move", k.textContent = "Drag", k.setAttribute("data-block-drag-handle", "true"), h.appendChild(k);
  }
  g.appendChild(s), g.appendChild(h);
  const B = document.createElement("div");
  B.className = "p-4 space-y-4", B.setAttribute("data-block-body", "true"), B.innerHTML = t.html;
  const S = t.required_fields || [];
  S.length > 0 && j(B, S), c.appendChild(g), c.appendChild(B);
  const E = document.createElement("input");
  E.type = "hidden", E.name = "_type", E.value = t.slug, E.readOnly = !0, E.setAttribute("data-block-type-input", "true"), E.setAttribute("data-block-ignore", "true"), c.appendChild(E), c.dataset.blockSchema = v;
  const w = document.createElement("input");
  return w.type = "hidden", w.name = "_schema", w.value = v, w.setAttribute("data-block-schema-input", "true"), w.setAttribute("data-block-ignore", "true"), c.appendChild(w), c;
}
function K(t, r, n) {
  const c = r.searchable !== !1, g = r.groupByCategory !== !1, s = document.createElement("div");
  s.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", s.style.display = "none", s.setAttribute("data-picker-popover", "true"), s.setAttribute("data-picker-dropdown", "true"), s.setAttribute("role", "dialog"), s.setAttribute("aria-label", "Add block");
  let i = null;
  if (c) {
    const a = document.createElement("div");
    a.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const l = document.createElement("div");
    l.className = "relative";
    const p = document.createElement("svg");
    p.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", p.setAttribute("fill", "none"), p.setAttribute("stroke", "currentColor"), p.setAttribute("viewBox", "0 0 24 24"), p.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', i = document.createElement("input"), i.type = "text", i.placeholder = "Search blocks…", i.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", i.setAttribute("data-picker-search", "true"), i.setAttribute("autocomplete", "off"), l.appendChild(p), l.appendChild(i), a.appendChild(l), s.appendChild(a);
  }
  const b = document.createElement("div");
  b.className = "max-h-72 overflow-y-auto py-1", b.setAttribute("data-picker-cards", "true"), b.setAttribute("role", "listbox"), s.appendChild(b);
  const x = document.createElement("div");
  x.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", x.setAttribute("data-picker-empty", "true"), x.style.display = "none";
  const v = document.createElement("svg");
  v.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", v.setAttribute("fill", "none"), v.setAttribute("stroke", "currentColor"), v.setAttribute("viewBox", "0 0 24 24"), v.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const L = document.createElement("p");
  L.setAttribute("data-picker-empty-text", "true"), L.textContent = "No block types available", x.appendChild(v), x.appendChild(L), s.appendChild(x);
  let h = !1, d = -1, u = [], B = [...t], S = /* @__PURE__ */ new Set();
  function E(a, l) {
    const p = l || !!a.disabled, e = document.createElement("button");
    e.type = "button", e.setAttribute("data-picker-item", a.slug), e.setAttribute("data-picker-card", a.slug), e.setAttribute("role", "option"), e.setAttribute("aria-selected", "false"), a.category && (e.dataset.category = a.category), e.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (p ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), p && (e.disabled = !0, e.setAttribute("aria-disabled", "true"), e.title = a.status && a.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const o = document.createElement("span");
    o.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (p ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), o.textContent = a.icon || a.label.slice(0, 2).toUpperCase();
    const f = document.createElement("div");
    f.className = "flex-1 min-w-0";
    const m = document.createElement("div");
    m.className = "font-medium truncate " + (p ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), m.textContent = a.label;
    const N = document.createElement("div");
    N.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const A = [a.description || a.slug];
    return a.status && a.status.toLowerCase() !== "active" && A.push(`(${a.status})`), N.textContent = A.join(" "), f.appendChild(m), f.appendChild(N), e.appendChild(o), e.appendChild(f), e;
  }
  function w(a = "") {
    b.innerHTML = "", u = [], d = -1;
    const l = a.toLowerCase().trim(), p = l ? B.filter(
      (e) => e.label.toLowerCase().includes(l) || e.slug.toLowerCase().includes(l) || (e.category || "").toLowerCase().includes(l) || (e.description || "").toLowerCase().includes(l)
    ) : B;
    if (p.length === 0) {
      x.style.display = "";
      const e = x.querySelector("[data-picker-empty-text]");
      e && (e.textContent = l ? "No blocks match your search" : "No block types available");
      return;
    }
    if (x.style.display = "none", g) {
      const e = /* @__PURE__ */ new Map();
      for (const o of p) {
        const f = o.category || "other";
        e.has(f) || e.set(f, []), e.get(f).push(o);
      }
      for (const [o, f] of e) {
        const m = document.createElement("div");
        m.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", m.setAttribute("data-picker-category", o), m.setAttribute("role", "presentation"), m.textContent = o, b.appendChild(m);
        for (const N of f) {
          const A = E(N, S.has(N.slug));
          b.appendChild(A), A.disabled || u.push(A);
        }
      }
    } else
      for (const e of p) {
        const o = E(e, S.has(e.slug));
        b.appendChild(o), o.disabled || u.push(o);
      }
  }
  w();
  function k(a) {
    if (d >= 0 && d < u.length) {
      const l = u[d];
      l.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), l.setAttribute("aria-selected", "false");
    }
    if (d = a, d >= 0 && d < u.length) {
      const l = u[d];
      l.classList.add("bg-blue-50", "dark:bg-blue-900/20"), l.setAttribute("aria-selected", "true"), typeof l.scrollIntoView == "function" && l.scrollIntoView({ block: "nearest" });
    }
  }
  i && i.addEventListener("input", () => {
    w(i.value);
  });
  function C(a) {
    switch (a.key) {
      case "ArrowDown":
        a.preventDefault(), u.length > 0 && k(d < u.length - 1 ? d + 1 : 0);
        break;
      case "ArrowUp":
        a.preventDefault(), u.length > 0 && k(d <= 0 ? u.length - 1 : d - 1);
        break;
      case "Enter":
        if (a.preventDefault(), d >= 0 && d < u.length) {
          const l = u[d].getAttribute("data-picker-item");
          l && n.onSelect(l);
        }
        break;
      case "Escape":
        a.preventDefault(), n.onClose();
        break;
      case "Tab":
        a.preventDefault(), i && document.activeElement !== i ? (i.focus(), d = -1) : u.length > 0 && k(0);
        break;
    }
  }
  b.addEventListener("click", (a) => {
    const l = a.target.closest("[data-picker-item]");
    if (!l || l.disabled) return;
    const p = l.getAttribute("data-picker-item");
    p && n.onSelect(p);
  });
  function _() {
    s.style.bottom = "", s.style.marginBottom = "", s.style.top = "", s.style.marginTop = "4px", requestAnimationFrame(() => {
      s.getBoundingClientRect().bottom > window.innerHeight - 8 && (s.style.bottom = "100%", s.style.top = "auto", s.style.marginBottom = "4px", s.style.marginTop = "0");
    });
  }
  function y() {
    s.style.display = "", h = !0, _(), i && (i.value = "", w(""), requestAnimationFrame(() => i.focus())), s.addEventListener("keydown", C);
  }
  function q() {
    s.style.display = "none", h = !1, d = -1, s.removeEventListener("keydown", C);
  }
  function $(a, l) {
    B = a, l && (S = l), w(i?.value || "");
  }
  return {
    element: s,
    open: y,
    close: q,
    isOpen: () => h,
    updateCards: $
  };
}
async function G(t) {
  const r = t.closest("[data-component-config]") || t, n = H(r.getAttribute("data-component-config")), c = t.dataset.apiBase || n.apiBase || "";
  if (!c) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const { listBase: g, templatesBase: s } = U(c);
  if (!g || !s) {
    console.warn("block-library-picker: invalid api base", c);
    return;
  }
  const i = F(t.dataset.allowedBlocks, n.allowedBlocks ?? []), b = parseInt(t.dataset.maxBlocks || "", 10) || n.maxBlocks || 0, x = n.lazyLoad !== !1, v = n.includeInactive === !0, L = n.sortable ?? t.dataset.blockSortable === "true", h = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Map();
  let u;
  try {
    u = await z(g, v);
  } catch (e) {
    console.error("block-library-picker: metadata fetch failed", e);
    return;
  }
  if (i.length > 0) {
    const e = /* @__PURE__ */ new Set();
    for (const o of i)
      for (const f of D(o)) e.add(f);
    u = u.filter((o) => {
      for (const f of D(o.slug))
        if (e.has(f)) return !0;
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
      const e = await I(s, E, v);
      for (const o of e)
        M(t, o), h.add(o.slug), d.set(o.slug, o);
    } catch (e) {
      console.error("block-library-picker: template fetch failed", e);
    }
  if (!x) {
    const e = u.filter((o) => !h.has(o.slug)).map((o) => o.slug);
    if (e.length > 0)
      try {
        const o = await I(s, e, v);
        for (const f of o)
          M(t, f), h.add(f.slug), d.set(f.slug, f);
      } catch (o) {
        console.error("block-library-picker: prefetch failed", o);
      }
  }
  O(t);
  const w = t.querySelector("[data-block-add-select]"), k = t.querySelector("[data-block-add]"), C = document.createElement("div");
  C.className = "mt-3", C.setAttribute("data-picker-controls", "true");
  const _ = document.createElement("div");
  _.className = "relative inline-block";
  const y = document.createElement("button");
  y.type = "button", y.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", y.setAttribute("data-picker-add-btn", "true");
  const q = typeof n.addLabel == "string" && n.addLabel.trim() ? n.addLabel.trim() : "Add Block";
  y.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${q}</span>`;
  const $ = () => {
    if (b <= 0) return;
    const o = t.querySelectorAll("[data-block-item]").length >= b;
    y.disabled = o, y.classList.toggle("opacity-50", o), y.classList.toggle("cursor-not-allowed", o), y.title = o ? `Maximum of ${b} blocks reached` : "";
  }, a = K(u, n, {
    onSelect: (e) => l(e),
    onClose: () => {
      a.close(), y.focus();
    }
  });
  async function l(e) {
    const o = u.find((m) => m.slug === e);
    if (!o || o.disabled) return;
    if (b > 0 && t.querySelectorAll("[data-block-item]").length >= b) {
      a.close();
      return;
    }
    if (w instanceof HTMLSelectElement && Array.from(w.options).some((m) => m.value === e))
      w.value = e, k?.click();
    else {
      let m = d.get(e);
      if (!m)
        try {
          const A = await V(s, e, v);
          A && (m = A, M(t, m), h.add(m.slug), d.set(m.slug, m));
        } catch (A) {
          console.error(`block-library-picker: fetch template ${e} failed`, A), a.close();
          return;
        }
      if (!m) {
        a.close();
        return;
      }
      const N = t.querySelector("[data-block-list]");
      if (N) {
        const A = W(m, L, n.schemaVersionPattern);
        N.appendChild(A), A.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
    a.close(), $();
  }
  if (y.addEventListener("click", (e) => {
    e.stopPropagation(), !y.disabled && (a.isOpen() ? a.close() : a.open());
  }), y.addEventListener("keydown", (e) => {
    e.key === "ArrowDown" && !a.isOpen() && !y.disabled && (e.preventDefault(), a.open());
  }), document.addEventListener("click", (e) => {
    a.isOpen() && !_.contains(e.target) && a.close();
  }), document.addEventListener("keydown", (e) => {
    e.key === "Escape" && a.isOpen() && (a.close(), y.focus());
  }), b > 0) {
    const e = t.querySelector("[data-block-list]");
    e && new MutationObserver(() => $()).observe(e, { childList: !0 }), $();
  }
  _.appendChild(y), _.appendChild(a.element), C.appendChild(_);
  const p = t.querySelector("[data-block-list]");
  p && p.nextSibling ? p.parentElement?.insertBefore(C, p.nextSibling) : t.appendChild(C), t.setAttribute("data-picker-initialized", "true");
}
async function Q(t = document) {
  const n = Array.from(
    t.querySelectorAll('[data-block-library-picker="true"]')
  ).filter((c) => c.getAttribute("data-picker-initialized") !== "true").map((c) => G(c));
  await Promise.all(n);
}
function X(t) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", t, { once: !0 }) : t();
}
X(() => {
  Q();
});
export {
  Q as initBlockLibraryPickers
};
//# sourceMappingURL=block_library_picker.js.map
