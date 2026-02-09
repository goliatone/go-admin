import { initBlockEditor as I, registerBlockTemplate as O, refreshBlockTemplateRegistry as P, markRequiredFields as R } from "./block_editor.js";
function j(e) {
  if (!e) return {};
  try {
    const r = JSON.parse(e);
    if (r && typeof r == "object") return r;
  } catch {
  }
  return {};
}
function H(e, r) {
  if (!e) return r;
  try {
    return JSON.parse(e);
  } catch {
  }
  return r;
}
function X(e) {
  const r = e.trim().toLowerCase();
  return r ? Array.from(new Set([
    r,
    r.replace(/-/g, "_"),
    r.replace(/_/g, "-")
  ])) : [];
}
function F(e) {
  const r = e.trim(), n = r.replace(/\/+$/, "");
  if (!n) {
    const f = r === "/" ? "/api" : "";
    return f ? {
      listBase: `${f}/block_definitions`,
      templatesBase: `${f}/block_definitions_meta`
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
  const l = /\/api(\/|$)/.test(n) ? n : `${n}/api`;
  return {
    listBase: `${l}/block_definitions`,
    templatesBase: `${l}/block_definitions_meta`
  };
}
async function T(e) {
  const r = await fetch(e);
  if (!r.ok) throw new Error(`fetch ${e}: ${r.status}`);
  return r.json();
}
async function U(e, r) {
  const n = new URLSearchParams();
  r || n.set("filter_status", "active");
  const l = n.toString(), f = l ? `${e}?${l}` : e, s = await T(f);
  return Array.isArray(s.items) ? s.items.map((o) => {
    const m = typeof o.status == "string" ? o.status.trim() : "";
    return {
      slug: o.slug ?? "",
      label: o.name ?? o.label ?? o.slug ?? "",
      icon: o.icon,
      category: o.category,
      description: o.description,
      schema_version: o.schema_version,
      required_fields: o.required_fields,
      status: o.status,
      disabled: m.toLowerCase() !== "active"
    };
  }) : [];
}
async function D(e, r, n) {
  if (r.length === 0) return [];
  let l = `${e}/templates?slugs=${encodeURIComponent(r.join(","))}`;
  return n && (l += "&include_inactive=true"), (await T(l)).items ?? [];
}
async function z(e, r, n) {
  let l = `${e}/templates/${encodeURIComponent(r)}`;
  n && (l += "?include_inactive=true");
  try {
    return (await T(l)).items?.[0] ?? null;
  } catch {
    return null;
  }
}
function M(e, r) {
  O(e, {
    type: r.slug,
    label: r.label,
    icon: r.icon || void 0,
    schemaVersion: r.schema_version || void 0,
    requiredFields: r.required_fields ?? [],
    html: r.html
  }), P(e);
}
function V(e, r) {
  const n = typeof e.schema_version == "string" ? e.schema_version.trim() : "";
  return n || (r ? r.replace("{type}", e.slug) : `${e.slug}@v1.0.0`);
}
function J(e, r, n) {
  const l = document.createElement("div");
  l.className = "border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700", l.setAttribute("data-block-item", "true"), l.dataset.blockType = e.slug, r && l.setAttribute("draggable", "true");
  const f = document.createElement("div");
  f.className = "flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700", f.setAttribute("data-block-header", "true");
  const s = document.createElement("div");
  s.className = "flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white";
  const o = document.createElement("span");
  o.className = "inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200", o.textContent = e.icon || e.label.slice(0, 1).toUpperCase();
  const m = document.createElement("span");
  m.textContent = e.label;
  const x = document.createElement("span");
  x.className = "text-xs text-gray-500 dark:text-gray-400", x.textContent = e.slug;
  const v = V(e, n), S = document.createElement("span");
  S.className = "block-schema-badge inline-flex items-center text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded dark:bg-blue-900/20 dark:text-blue-400", S.textContent = v, S.setAttribute("data-block-schema-badge", "true"), s.appendChild(o), s.appendChild(m), s.appendChild(x), s.appendChild(S);
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
  f.appendChild(s), f.appendChild(h);
  const B = document.createElement("div");
  B.className = "p-4 space-y-4", B.setAttribute("data-block-body", "true"), B.innerHTML = e.html;
  const N = e.required_fields || [];
  N.length > 0 && R(B, N), l.appendChild(f), l.appendChild(B);
  const E = document.createElement("input");
  E.type = "hidden", E.name = "_type", E.value = e.slug, E.readOnly = !0, E.setAttribute("data-block-type-input", "true"), E.setAttribute("data-block-ignore", "true"), l.appendChild(E), l.dataset.blockSchema = v;
  const w = document.createElement("input");
  return w.type = "hidden", w.name = "_schema", w.value = v, w.setAttribute("data-block-schema-input", "true"), w.setAttribute("data-block-ignore", "true"), l.appendChild(w), l;
}
function W(e, r, n) {
  const l = r.searchable !== !1, f = r.groupByCategory !== !1, s = document.createElement("div");
  s.className = "absolute left-0 z-50 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-xl overflow-hidden picker-popover dark:bg-slate-900 dark:border-gray-700", s.style.display = "none", s.setAttribute("data-picker-popover", "true"), s.setAttribute("data-picker-dropdown", "true"), s.setAttribute("role", "dialog"), s.setAttribute("aria-label", "Add block");
  let o = null;
  if (l) {
    const i = document.createElement("div");
    i.className = "sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-gray-700 p-2 z-10";
    const c = document.createElement("div");
    c.className = "relative";
    const t = document.createElement("svg");
    t.className = "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none", t.setAttribute("fill", "none"), t.setAttribute("stroke", "currentColor"), t.setAttribute("viewBox", "0 0 24 24"), t.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>', o = document.createElement("input"), o.type = "text", o.placeholder = "Search blocks…", o.className = "w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-gray-200 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500", o.setAttribute("data-picker-search", "true"), o.setAttribute("autocomplete", "off"), c.appendChild(t), c.appendChild(o), i.appendChild(c), s.appendChild(i);
  }
  const m = document.createElement("div");
  m.className = "max-h-72 overflow-y-auto py-1", m.setAttribute("data-picker-cards", "true"), m.setAttribute("role", "listbox"), s.appendChild(m);
  const x = document.createElement("div");
  x.className = "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400", x.setAttribute("data-picker-empty", "true"), x.style.display = "none";
  const v = document.createElement("svg");
  v.className = "mx-auto mb-2 w-8 h-8 text-gray-300 dark:text-gray-600", v.setAttribute("fill", "none"), v.setAttribute("stroke", "currentColor"), v.setAttribute("viewBox", "0 0 24 24"), v.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>';
  const S = document.createElement("p");
  S.setAttribute("data-picker-empty-text", "true"), S.textContent = "No block types available", x.appendChild(v), x.appendChild(S), s.appendChild(x);
  let h = !1, d = -1, u = [], B = [...e], N = /* @__PURE__ */ new Set();
  function E(i, c) {
    const t = c || !!i.disabled, a = document.createElement("button");
    a.type = "button", a.setAttribute("data-picker-item", i.slug), a.setAttribute("data-picker-card", i.slug), a.setAttribute("role", "option"), a.setAttribute("aria-selected", "false"), i.category && (a.dataset.category = i.category), a.className = "w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors " + (t ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50 dark:hover:bg-slate-800 focus:outline-none"), t && (a.disabled = !0, a.setAttribute("aria-disabled", "true"), a.title = i.status && i.status.toLowerCase() !== "active" ? "This block type is inactive" : "This block type is not available");
    const b = document.createElement("span");
    b.className = "inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-xs font-semibold " + (t ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-gray-500" : "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"), b.textContent = i.icon || i.label.slice(0, 2).toUpperCase();
    const p = document.createElement("div");
    p.className = "flex-1 min-w-0";
    const L = document.createElement("div");
    L.className = "font-medium truncate " + (t ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"), L.textContent = i.label;
    const A = document.createElement("div");
    A.className = "text-xs text-gray-500 dark:text-gray-400 truncate";
    const $ = [i.description || i.slug];
    return i.status && i.status.toLowerCase() !== "active" && $.push(`(${i.status})`), A.textContent = $.join(" "), p.appendChild(L), p.appendChild(A), a.appendChild(b), a.appendChild(p), a;
  }
  function w(i = "") {
    m.innerHTML = "", u = [], d = -1;
    const c = i.toLowerCase().trim(), t = c ? B.filter(
      (a) => a.label.toLowerCase().includes(c) || a.slug.toLowerCase().includes(c) || (a.category || "").toLowerCase().includes(c) || (a.description || "").toLowerCase().includes(c)
    ) : B;
    if (t.length === 0) {
      x.style.display = "";
      const a = x.querySelector("[data-picker-empty-text]");
      a && (a.textContent = c ? "No blocks match your search" : "No block types available");
      return;
    }
    if (x.style.display = "none", f) {
      const a = /* @__PURE__ */ new Map();
      for (const b of t) {
        const p = b.category || "other";
        a.has(p) || a.set(p, []), a.get(p).push(b);
      }
      for (const [b, p] of a) {
        const L = document.createElement("div");
        L.className = "px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-0 bg-white dark:bg-slate-900", L.setAttribute("data-picker-category", b), L.setAttribute("role", "presentation"), L.textContent = b, m.appendChild(L);
        for (const A of p) {
          const $ = E(A, N.has(A.slug));
          m.appendChild($), $.disabled || u.push($);
        }
      }
    } else
      for (const a of t) {
        const b = E(a, N.has(a.slug));
        m.appendChild(b), b.disabled || u.push(b);
      }
  }
  w();
  function k(i) {
    if (d >= 0 && d < u.length) {
      const c = u[d];
      c.classList.remove("bg-blue-50", "dark:bg-blue-900/20"), c.setAttribute("aria-selected", "false");
    }
    if (d = i, d >= 0 && d < u.length) {
      const c = u[d];
      c.classList.add("bg-blue-50", "dark:bg-blue-900/20"), c.setAttribute("aria-selected", "true"), typeof c.scrollIntoView == "function" && c.scrollIntoView({ block: "nearest" });
    }
  }
  o && o.addEventListener("input", () => {
    w(o.value);
  });
  function C(i) {
    switch (i.key) {
      case "ArrowDown":
        i.preventDefault(), u.length > 0 && k(d < u.length - 1 ? d + 1 : 0);
        break;
      case "ArrowUp":
        i.preventDefault(), u.length > 0 && k(d <= 0 ? u.length - 1 : d - 1);
        break;
      case "Enter":
        if (i.preventDefault(), d >= 0 && d < u.length) {
          const c = u[d].getAttribute("data-picker-item");
          c && n.onSelect(c);
        }
        break;
      case "Escape":
        i.preventDefault(), n.onClose();
        break;
      case "Tab":
        i.preventDefault(), o && document.activeElement !== o ? (o.focus(), d = -1) : u.length > 0 && k(0);
        break;
    }
  }
  m.addEventListener("click", (i) => {
    const c = i.target.closest("[data-picker-item]");
    if (!c || c.disabled) return;
    const t = c.getAttribute("data-picker-item");
    t && n.onSelect(t);
  });
  function _() {
    s.style.bottom = "", s.style.marginBottom = "", s.style.top = "", s.style.marginTop = "4px", requestAnimationFrame(() => {
      s.getBoundingClientRect().bottom > window.innerHeight - 8 && (s.style.bottom = "100%", s.style.top = "auto", s.style.marginBottom = "4px", s.style.marginTop = "0");
    });
  }
  function g() {
    s.style.display = "", h = !0, _(), o && (o.value = "", w(""), requestAnimationFrame(() => o.focus())), s.addEventListener("keydown", C);
  }
  function q() {
    s.style.display = "none", h = !1, d = -1, s.removeEventListener("keydown", C);
  }
  function y(i, c) {
    B = i, c && (N = c), w(o?.value || "");
  }
  return {
    element: s,
    open: g,
    close: q,
    isOpen: () => h,
    updateCards: y
  };
}
async function K(e) {
  const r = e.closest("[data-component-config]") || e, n = j(r.getAttribute("data-component-config")), l = e.dataset.apiBase || n.apiBase || "";
  if (!l) {
    console.warn("block-library-picker: missing data-api-base");
    return;
  }
  const { listBase: f, templatesBase: s } = F(l);
  if (!f || !s) {
    console.warn("block-library-picker: invalid api base", l);
    return;
  }
  const o = H(e.dataset.allowedBlocks, n.allowedBlocks ?? []), m = parseInt(e.dataset.maxBlocks || "", 10) || n.maxBlocks || 0, x = n.lazyLoad !== !1, v = n.includeInactive === !0, S = n.sortable ?? e.dataset.blockSortable === "true", h = /* @__PURE__ */ new Set(), d = /* @__PURE__ */ new Map();
  let u;
  try {
    u = await U(f, v);
  } catch (t) {
    console.error("block-library-picker: metadata fetch failed", t);
    return;
  }
  if (o.length > 0) {
    const t = new Set();
    for (const a of o)
      for (const b of X(a))
        t.add(b);
    u = u.filter((a) => {
      for (const b of X(a.slug))
        if (t.has(b))
          return !0;
      return !1;
    });
  }
  const B = e.querySelector("input[data-block-output]");
  let N = [];
  if (B?.value)
    try {
      const t = JSON.parse(B.value);
      Array.isArray(t) && (N = t);
    } catch {
    }
  const E = [
    ...new Set(
      N.map((t) => t && typeof t == "object" ? t._type : "").filter((t) => typeof t == "string" && t.length > 0)
    )
  ];
  if (E.length > 0)
    try {
      const t = await D(s, E, v);
      for (const a of t)
        M(e, a), h.add(a.slug), d.set(a.slug, a);
    } catch (t) {
      console.error("block-library-picker: template fetch failed", t);
    }
  if (!x) {
    const t = u.filter((a) => !h.has(a.slug)).map((a) => a.slug);
    if (t.length > 0)
      try {
        const a = await D(s, t, v);
        for (const b of a)
          M(e, b), h.add(b.slug), d.set(b.slug, b);
      } catch (a) {
        console.error("block-library-picker: prefetch failed", a);
      }
  }
  I(e);
  const w = e.querySelector("[data-block-add-select]"), k = e.querySelector("[data-block-add]"), C = document.createElement("div");
  C.className = "mt-3", C.setAttribute("data-picker-controls", "true");
  const _ = document.createElement("div");
  _.className = "relative inline-block";
  const g = document.createElement("button");
  const q = typeof n.addLabel == "string" && n.addLabel.trim() ? n.addLabel.trim() : "Add Block";
  g.type = "button", g.className = "inline-flex items-center gap-1.5 py-2 px-4 rounded-md border border-dashed border-gray-300 text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-800", g.setAttribute("data-picker-add-btn", "true"), g.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg><span>${q}</span>`;
  const y = () => {
    if (m <= 0) return;
    const a = e.querySelectorAll("[data-block-item]").length >= m;
    g.disabled = a, g.classList.toggle("opacity-50", a), g.classList.toggle("cursor-not-allowed", a), g.title = a ? `Maximum of ${m} blocks reached` : "";
  }, i = W(u, n, {
    onSelect: (t) => addSelectedBlock(t),
    onClose: () => {
      i.close(), g.focus();
    }
  });
  async function addSelectedBlock(t) {
    const a = u.find((p) => p.slug === t);
    if (!a || a.disabled) return;
    if (m > 0 && e.querySelectorAll("[data-block-item]").length >= m) {
      i.close();
      return;
    }
    if (w instanceof HTMLSelectElement && Array.from(w.options).some((p) => p.value === t))
      w.value = t, k?.click();
    else {
      let p = d.get(t);
      if (!p)
        try {
          const A = await z(s, t, v);
          A && (p = A, M(e, p), h.add(p.slug), d.set(p.slug, p));
        } catch (A) {
          console.error(`block-library-picker: fetch template ${t} failed`, A), i.close();
          return;
        }
      if (!p) {
        i.close();
        return;
      }
      const L = e.querySelector("[data-block-list]");
      if (L) {
        const A = J(p, S, n.schemaVersionPattern);
        L.appendChild(A), A.dispatchEvent(new Event("input", { bubbles: !0 }));
      }
    }
    i.close(), y();
  }
  if (g.addEventListener("click", (t) => {
    t.stopPropagation(), !g.disabled && (i.isOpen() ? i.close() : i.open());
  }), g.addEventListener("keydown", (t) => {
    t.key === "ArrowDown" && !i.isOpen() && !g.disabled && (t.preventDefault(), i.open());
  }), document.addEventListener("click", (t) => {
    i.isOpen() && !_.contains(t.target) && i.close();
  }), document.addEventListener("keydown", (t) => {
    t.key === "Escape" && i.isOpen() && (i.close(), g.focus());
  }), m > 0) {
    const t = e.querySelector("[data-block-list]");
    t && new MutationObserver(() => y()).observe(t, { childList: !0 }), y();
  }
  _.appendChild(g), _.appendChild(i.element), C.appendChild(_);
  const c = e.querySelector("[data-block-list]");
  c && c.nextSibling ? c.parentElement?.insertBefore(C, c.nextSibling) : e.appendChild(C), e.setAttribute("data-picker-initialized", "true");
}
async function G(e = document) {
  const n = Array.from(
    e.querySelectorAll('[data-block-library-picker="true"]')
  ).filter((l) => l.getAttribute("data-picker-initialized") !== "true").map((l) => K(l));
  await Promise.all(n);
}
function Q(e) {
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", e, { once: !0 }) : e();
}
Q(() => {
  G();
});
export {
  G as initBlockLibraryPickers
};
//# sourceMappingURL=block_library_picker.js.map
